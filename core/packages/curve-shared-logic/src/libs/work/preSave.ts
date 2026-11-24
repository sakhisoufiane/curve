import type { Model } from '@curveroyaltysystems/models/mongoose';
import type { DeliveredWork as DeliveredWorkSchema } from '@curveroyaltysystems/models/dist/deliveredWork';
import { Types } from '@curveroyaltysystems/models/mongoose';

import { clearBlankStrings } from '../utils';
import { generatePublisherFingerprint } from '../publisherFingerprint';
import { significantUpdateCheck, arePartnerChainsEqual, checkIswcEligibility } from '../../controllers/work';
import { combineDuplicatePublishers } from '../cwr/ipChain';
import { sumValueInIpChainChildren } from './rightsChain/rightsChain';
import DeliveredWorkController from '../../controllers/deliveredWork';
import RightsChainValidation from './rightsChain/validation';
import type {
  WorkInstance,
  WorkModel,
  ClientModel,
  ComposerModel,
  PublisherModel,
  TerritoryGroupModel,
} from '../../types/models';

// DeliveredWork model type is local — not needed outside this module
type DeliveredWorkModel = Model<DeliveredWorkSchema>;

export async function preSave({
  work,
  Work,
  Client,
  DeliveredWork,
  Composer,
  Publisher,
  TerritoryGroup,
}: {
  work: WorkInstance;
  Work: WorkModel;
  Client: ClientModel;
  DeliveredWork: DeliveredWorkModel;
  Composer: ComposerModel;
  Publisher: PublisherModel;
  TerritoryGroup: TerritoryGroupModel;
}) {
  // Remove duplicates
  uniqueSocietyIdentifiers(work);
  uniqueAliases(work);

  // Formatting
  formatIdentifier(work);
  calculateTotalParticipation(work);
  clearBlankFields(work);

  // Duplicate checks
  await checkCatalogueIDsAreUnique(work, Work);

  // Significant updates
  await checkPartnerChainsForSignificantUpdates(work, Work);

  // Chain merging
  combineDuplicateChainPublishers(work);

  // Deliveries
  await setDeliveries(work, DeliveredWork);

  // Composers string
  await buildComposersString(work, Composer);

  // Backfill caeNumber and name on chain Composer entries from the DB
  await addExtraChainData(work, Composer);

  // Clean publisher ID arrays before validation
  cleanPublishers(work);

  // Validate sales returns rights (includes duplicate publisher check)
  validateSalesReturns(work);

  // Generate/clear publisher fingerprints after validation passes
  generatePublisherFingerprints(work);

  // Check for duplicate contracts
  checkMultipleContracts(work);

  // Issue partyNo if needed
  await issuePartyNo(work, Work, DeliveredWork);

  // Coerce controlled field to boolean throughout all chains
  forceControlledBoolean(work);

  // Rebuild usedComposerIds and usedPublisherIds from chains
  collectComposerAndPublisherIDs(work);

  // Check all chain entities belong to this client
  await checkOtherClientCatalogue(work, Composer, Publisher, TerritoryGroup);

  // Run comprehensive validity check and throw on EmptyChain or invalidation of approved work
  await checksRightChainValidity(work, TerritoryGroup);

  // Auto-approve if client has autoApproveWorks enabled
  await autoApproveWork(work, Client);

  // Set approval status based on validity and whether work has been approved
  setApprovalStatus(work);

  // Calculate totalCollection from controlled children in rightsChain
  calculateTotalCollection(work);

  // Issue a sequential identifier if the client has issueIdentifier enabled
  await issueIdentifier(work, Work, Client);

  // Round all rights chain percentage fields to 2 decimal places
  roundRightsChainPercentages(work);

  // Set ISWC eligibility flags
  // @ts-expect-error Function is exported but module not typed
  await checkIswcEligibility({ work, Composer });
}

export function uniqueSocietyIdentifiers(work: WorkInstance) {
  const seen = new Set<string>();
  work.societyIdentifiers = work.societyIdentifiers.filter(({ society, identifier }) => {
    const key = society + identifier;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function uniqueAliases(work: WorkInstance) {
  work.aliases = [...new Set(work.aliases)];
}

export function formatIdentifier(work: WorkInstance) {
  if (work.identifier) {
    work.identifier = work.identifier.replace(/[^a-zA-Z0-9]/gi, '');
  }
}

export function calculateTotalParticipation(work: WorkInstance) {
  work.totalParticipation = 0;
  if (work.salesReturnsRights) {
    work.salesReturnsRights.forEach((line) => {
      let percentage = 0;
      if (line.percentage != null) {
        // Round to 4 decimal places
        percentage = Math.round((line.percentage + Number.EPSILON) * 10000) / 10000;
      }
      work.totalParticipation += percentage;
    });
  }
  // Round final number to 4 decimal places
  work.totalParticipation = Math.round((work.totalParticipation + Number.EPSILON) * 10000) / 10000;
  return work.totalParticipation;
}

function clearBlankFields(work: WorkInstance) {
  clearBlankStrings(work, [
    'salesReturnsRights',
    'salesReturnsRightsDisplay',
    'channelSpecificSalesReturnsRights',
    'usedComposerIds',
    'usedPublisherIds',
  ]);
}

function collectComposerIds(chain: unknown, ids: Set<string>) {
  if (!chain || typeof chain !== 'object') return;
  const node = chain as { type?: string; composerId?: string; children?: unknown[] };
  if (node.type === 'Composer' && node.composerId) {
    ids.add(node.composerId.toString());
  }
  if (node.children) {
    for (const child of node.children) {
      collectComposerIds(child, ids);
    }
  }
}

export async function buildComposersString(work: WorkInstance, Composer: ComposerModel) {
  if (!work.rightsChain || work.rightsChain.length === 0) return;

  const composerIds = new Set<string>();
  for (const chain of work.rightsChain) {
    collectComposerIds(chain, composerIds);
  }

  if (composerIds.size === 0) return;

  const composers = await Composer.find({ _id: { $in: [...composerIds] } })
    .select({ name: 1 })
    .lean();

  const uniqueNames = [...new Set(composers.map((c) => c.name).filter(Boolean))];
  if (uniqueNames.length > 0) {
    work.composer = uniqueNames.join(', ');
  }
}

export async function checkCatalogueIDsAreUnique(work: WorkInstance, Work: WorkModel) {
  const ignoreWorkIds = [work._id, ...(work._excludeIdsForValidation ?? [])];

  const checks = [];
  if (work.identifier && work._creationType !== 'unmapped') checks.push({ identifier: work.identifier });
  if (work.tunecode) checks.push({ tunecode: work.tunecode });
  if (work.iswc) checks.push({ iswc: work.iswc });

  // Only check societyIdentifiers if modified
  const modifiedFields = work.modifiedPaths?.() || [];
  const checkSocietyIdentifiers = modifiedFields.includes('societyIdentifiers') && work.societyIdentifiers?.length;

  // Only run query if there is something to check
  if (checks.length === 0 && !checkSocietyIdentifiers) return;

  const conflict = await Work.findOne({
    _id: { $nin: ignoreWorkIds },
    clientId: work.clientId,
    $or: checks,
  })
    .select({ identifier: 1, tunecode: 1, iswc: 1, societyIdentifiers: 1 })
    .lean();

  if (conflict) {
    // Determine which field conflicted
    if (work.identifier && conflict.identifier === work.identifier) {
      throw new Error('Identifier is required to be unique');
    }
    if (work.tunecode && conflict.tunecode === work.tunecode) {
      throw new Error('Tunecode is required to be unique');
    }
    if (work.iswc && conflict.iswc === work.iswc) {
      throw new Error('ISWC is required to be unique');
    }
  }

  if (checkSocietyIdentifiers) {
    const newStrings = work.societyIdentifiers.map((s) => s.society + s.identifier);

    // Query any works that have overlapping societyIdentifiers
    const societyConflicts = await Work.find({
      _id: { $nin: ignoreWorkIds },
      clientId: work.clientId,
      societyIdentifiers: { $exists: true, $not: { $size: 0 } },
    })
      .select({ societyIdentifiers: 1 })
      .lean();

    const conflict = societyConflicts.find((c) =>
      c.societyIdentifiers.some((s) => newStrings.includes(s.society + s.identifier))
    );

    if (conflict) {
      throw new Error('Society Identifiers are required to be unique');
    }
  }
}

export async function checkPartnerChainsForSignificantUpdates(work: WorkInstance, Work: WorkModel) {
  if (!work._id) return;

  const oldWork = await Work.findById(work._id).lean();

  // @ts-expect-error Function is exported but module not typed
  const significantUpdateChanges = significantUpdateCheck({ work, oldWork });
  if (significantUpdateChanges.length > 0) {
    work.significantUpdateDate = new Date();
  }
  const significantPartnerChainChanges = [
    ...new Set(
      // @ts-expect-error Function is exported but module not typed
      arePartnerChainsEqual(work?.partnerRightsChains, oldWork?.partnerRightsChains)?.map(
        (change) => change.deliveryPartnerId
      )
    ),
  ];
  if (significantPartnerChainChanges.length > 0) {
    significantPartnerChainChanges.map((updatedDeliveryPartnerId) => {
      const deliveryPartnerAlreadyExists = work.significantUpdateToPartnerChains.findIndex(
        (change) => change?.deliveryPartnerId?.toString() === updatedDeliveryPartnerId
      );
      if (deliveryPartnerAlreadyExists !== -1) {
        if (work.significantUpdateToPartnerChains[deliveryPartnerAlreadyExists]) {
          work.significantUpdateToPartnerChains[deliveryPartnerAlreadyExists].date = new Date();
        }
      } else {
        work.significantUpdateToPartnerChains.push({
          date: new Date(),
          deliveryPartnerId: updatedDeliveryPartnerId,
        });
      }
    });
  }
}

export function combineDuplicateChainPublishers(work: WorkInstance) {
  // Combine duplicate same level publishers
  const newChain = work.rightsChain
    .map((chain) => {
      if (chain?.children) {
        chain.children = chain?.children?.length > 0 ? combineDuplicatePublishers(chain.children) : chain.children;
        return chain;
      }
    })
    .filter((chain) => chain != null);
  // Clear original pre-merged chain
  work.rightsChain = [];
  // addToSet mongoose method required here otherwise array changes are not detected when saving in the db
  // @ts-expect-error Method added by mongoose, not in type definition
  work.rightsChain.addToSet(...newChain);

  // Do the same above but for each partner chain
  for (const [index, partnerChain] of work.partnerRightsChains.entries()) {
    const newChain = partnerChain?.rightsChain
      ?.map((chain) => {
        if (chain?.children) {
          chain.children = chain?.children?.length > 0 ? combineDuplicatePublishers(chain.children) : chain.children;
          return chain;
        }
      })
      .filter((chain) => chain != null);

    if (work.partnerRightsChains[index]) {
      work.partnerRightsChains[index].rightsChain = newChain;
    }
  }
}

export async function setDeliveries(work: WorkInstance, DeliveredWork: DeliveredWorkModel) {
  // @ts-expect-error Function is exported but module not typed
  const deliveries = await DeliveredWorkController.get({
    DeliveredWork,
    req: { clientId: work.clientId, workId: work._id },
    select: { deliveryPartnerId: 1, updatedAt: 1 },
  });
  work.deliveredTo = deliveries.map((delivery: { deliveryPartnerId: string; updatedAt: Date }) => ({
    deliveryPartnerId: delivery.deliveryPartnerId,
    deliveredAt: delivery.updatedAt,
  }));
}

export async function checkOtherClientCatalogue(
  work: WorkInstance,
  Composer: ComposerModel,
  Publisher: PublisherModel,
  TerritoryGroup: TerritoryGroupModel
) {
  if (work?.usedPublisherIds?.length > 0) {
    const publishers = await Publisher.find({
      _id: { $in: work.usedPublisherIds.map((id) => new Types.ObjectId(id as string)) },
    }).select({ clientId: 1, name: 1 });
    const invalidPublishers = publishers.filter(
      (publisher) => publisher.clientId?.toString() !== work.clientId?.toString()
    );
    if (invalidPublishers.length > 0) {
      throw new Error(
        `A work appears to include publisher from another Client: ${invalidPublishers.map((p) => p.name).join(', ')}`
      );
    }
  }

  if (work?.usedComposerIds?.length > 0) {
    const composers = await Composer.find({
      _id: { $in: work.usedComposerIds.map((id) => new Types.ObjectId(id as string)) },
    }).select({ clientId: 1, name: 1 });
    const invalidComposers = composers.filter(
      (composer) => composer.clientId?.toString() !== work.clientId?.toString()
    );
    if (invalidComposers.length > 0) {
      throw new Error(
        `A work appears to include composer from another Client: ${invalidComposers.map((c) => c.name).join(', ')}`
      );
    }
  }

  const allChainTerritories: string[] = [];
  if (work?.rightsChain?.length > 0) {
    const validTerritories = work.rightsChain
      .map((chain) => (chain as unknown as { territory: string }).territory)
      .filter((territory) => Types.ObjectId.isValid(territory));
    allChainTerritories.push(...validTerritories);
  }
  if (work?.partnerRightsChains?.length > 0) {
    const validTerritories = work.partnerRightsChains
      .flatMap((partnerChain) =>
        ((partnerChain as unknown as { rightsChain: { territory: string }[] })?.rightsChain ?? []).map(
          (chain) => chain.territory
        )
      )
      .filter((territory) => Types.ObjectId.isValid(territory));
    allChainTerritories.push(...validTerritories);
  }
  if (allChainTerritories.length > 0) {
    const territoryGroups = await TerritoryGroup.find({
      _id: { $in: allChainTerritories.map((id) => new Types.ObjectId(id)) },
    }).select({ clientId: 1, name: 1 });
    const invalidTerritoryGroups = territoryGroups.filter(
      (tg) => tg.clientId?.toString() !== work.clientId?.toString()
    );
    if (invalidTerritoryGroups.length > 0) {
      throw new Error(
        `A work appears to include territory groups from another Client: ${invalidTerritoryGroups.map((tg) => tg.name).join(', ')}`
      );
    }
  }
}

export async function checksRightChainValidity(work: WorkInstance, TerritoryGroup: TerritoryGroupModel) {
  const wasWorkValid = work.valid;
  work.validationErrors = await RightsChainValidation.checkValidationErrors({ work, TerritoryGroup });
  work.valid = work.validationErrors.length === 0;

  if (wasWorkValid && !work.valid && work.approvedDate) {
    throw new Error(
      `These changes will invalidate the work. Please check and try again.<br><br>${(work.validationErrors as string[]).join('<br>')}`
    );
  }

  // Surface EmptyChain as a hard error to stop the save
  const chainError = (work.validationErrors as string[]).find((err) => err.includes('A Chain is currently empty'));
  if (chainError) {
    throw new Error(chainError);
  }
}

export function forceControlledBoolean(work: WorkInstance) {
  type ChainNode = { controlled?: unknown; children?: ChainNode[] };

  function controlledToBooleanChain(chain: ChainNode) {
    if (chain.controlled === true || chain.controlled === 'true' || chain.controlled === '1') {
      chain.controlled = true;
    } else if (chain.controlled !== undefined) {
      chain.controlled = false;
    }
    if (chain.children?.length) {
      for (const child of chain.children) {
        controlledToBooleanChain(child);
      }
    }
  }

  for (const chain of work.rightsChain as unknown as ChainNode[]) {
    controlledToBooleanChain(chain);
  }
  for (const partnerChain of work.partnerRightsChains ?? []) {
    for (const chain of (partnerChain?.rightsChain ?? []) as unknown as ChainNode[]) {
      controlledToBooleanChain(chain);
    }
  }
}

export function collectComposerAndPublisherIDs(work: WorkInstance) {
  const composerIds: string[] = [];
  const publisherIds: string[] = [];

  type ChainNode = { type?: string; composerId?: string; publisherId?: string; children?: ChainNode[] };

  function getIDs(chain: ChainNode) {
    if (chain?.type === 'Composer') {
      if (!composerIds.includes(chain.composerId!) && chain.composerId !== '') {
        composerIds.push(chain.composerId!);
      }
    } else if (chain?.type === 'Publisher') {
      if (!publisherIds.includes(chain.publisherId!) && chain.publisherId !== '') {
        publisherIds.push(chain.publisherId!);
      }
    }
    if (chain?.children) {
      for (const child of chain.children) {
        getIDs(child);
      }
    }
  }

  for (const chain of work.rightsChain as unknown as ChainNode[]) {
    getIDs(chain);
  }
  for (const partnerChain of work.partnerRightsChains ?? []) {
    if (partnerChain?.rightsChain?.length) {
      for (const chain of partnerChain.rightsChain as unknown as ChainNode[]) {
        getIDs(chain);
      }
    }
  }

  work.usedComposerIds = composerIds;
  work.usedPublisherIds = publisherIds;
}

export async function issuePartyNo(work: WorkInstance, Work: WorkModel, DeliveredWork: DeliveredWorkModel) {
  let countOfWorkWithSamePartyNo = 0;

  if (work.partyNo) {
    countOfWorkWithSamePartyNo = await Work.countDocuments({
      _id: { $ne: work._id },
      clientId: work.clientId,
      partyNo: work.partyNo,
    });
  }

  // @ts-expect-error Function is exported but module not typed
  const countOfWorkDeliveries = await DeliveredWorkController.count({
    DeliveredWork,
    filter: { clientId: work.clientId, workId: work._id },
  });

  let issue: boolean;
  if (countOfWorkWithSamePartyNo > 0 && countOfWorkDeliveries === 0) {
    issue = true;
  } else if (countOfWorkWithSamePartyNo > 0 && countOfWorkDeliveries !== 0) {
    issue = false;
  } else if (countOfWorkWithSamePartyNo === 0 && work.partyNo) {
    issue = false;
  } else {
    issue = true;
  }

  if (issue) {
    const foundWorks = await Work.find({ clientId: work.clientId }, { partyNo: 1 }).sort({ partyNo: -1 }).limit(1);
    if (!foundWorks || foundWorks.length === 0) {
      work.partyNo = 1;
    } else {
      work.partyNo = (foundWorks[0]?.partyNo ?? 0) + 1;
    }
  }
}

export function checkMultipleContracts(work: WorkInstance) {
  const hasDuplicates = (array: unknown[]) => {
    const seen = new Set();
    return array.some((item) => {
      const id = (item as { contractId?: unknown })?.contractId;
      if (seen.has(id)) return true;
      seen.add(id);
      return false;
    });
  };

  if (hasDuplicates(work.salesReturnsRights ?? []) || hasDuplicates(work.costsRights ?? [])) {
    throw new Error(
      'A work can only have one instance of a contract attached to it. Please ensure a contract is only included once.'
    );
  }
}

export function cleanPublishers(work: WorkInstance) {
  if (!work.channelSpecificSalesReturnsRights) return;
  for (const right of work.channelSpecificSalesReturnsRights) {
    if (right.publishers) {
      right.publishers = right.publishers.filter((id) => id && String(id).trim().length > 0);
    }
  }
}

export function validateSalesReturns(work: WorkInstance) {
  const isInvalid = (entry: { contractId?: unknown; percentage?: unknown }) =>
    !entry.contractId || (entry.percentage !== 0 && !entry.percentage);

  if (work.salesReturnsRights?.some(isInvalid) || work.channelSpecificSalesReturnsRights?.some(isInvalid)) {
    throw new Error('A Contract needs to be linked to a Percentage when a Participation Right is assigned');
  }

  if (work.enablePublisherMapping && work.channelSpecificSalesReturnsRights) {
    for (const right of work.channelSpecificSalesReturnsRights) {
      if (right.publishers && right.publishers.length > 0) {
        const uniqueIds = new Set(right.publishers.map(String));
        if (uniqueIds.size !== right.publishers.length) {
          throw new Error('Duplicate Publishers detected');
        }
      }
    }
  }
}

export function generatePublisherFingerprints(work: WorkInstance) {
  if (!work.channelSpecificSalesReturnsRights) return;
  for (const right of work.channelSpecificSalesReturnsRights) {
    if (work.enablePublisherMapping) {
      if (right.publishers && right.publishers.length > 0) {
        right.publisherFingerprint = generatePublisherFingerprint(right.publishers);
      } else {
        // Clear stale fingerprint when mapping is enabled but there are no publishers
        right.publisherFingerprint = '';
      }
    } else {
      // Clear fingerprint when publisher mapping is disabled
      right.publisherFingerprint = '';
    }
  }
}

export function calculateTotalCollection(work: WorkInstance) {
  type ChainNode = { controlled?: boolean; children?: ChainNode[]; [key: string]: unknown };

  function hasControlledChild(chain: ChainNode): boolean {
    if (!chain.children?.length) return false;
    return chain.children.some((child) => child?.controlled);
  }

  work.totalCollection = { totalOwnedMechanical: 0, totalOwnedPerformance: 0 };
  let collectionCalculated = false;
  for (const chain of work.rightsChain as unknown as ChainNode[]) {
    if (hasControlledChild(chain) && !collectionCalculated) {
      work.totalCollection.totalOwnedMechanical =
        Math.round(sumValueInIpChainChildren(chain, 'mechanicalCollection', 0) * 100) / 100;
      work.totalCollection.totalOwnedPerformance =
        Math.round(sumValueInIpChainChildren(chain, 'performanceCollection', 0) * 100) / 100;
      collectionCalculated = true;
    }
  }
}

export async function issueIdentifier(work: WorkInstance, Work: WorkModel, Client: ClientModel, initial = 1) {
  if (work.identifier && work._creationType !== 'unmapped') return;

  let client;
  try {
    client = await Client.findById(work.clientId, 'issueIdentifier identifierPrefix identifierStartFrom');
  } catch {
    return;
  }

  if (!client?.issueIdentifier) return;

  let foundWork;
  try {
    foundWork = await Work.findOne({ clientId: work.clientId }, { identifierNo: 1 }).sort({ identifierNo: -1 }).lean();
  } catch {
    return;
  }

  let identifierToUse = foundWork?.identifierNo ? foundWork.identifierNo + initial : initial;
  if (client.identifierStartFrom && client.identifierStartFrom > identifierToUse) {
    identifierToUse = client.identifierStartFrom;
  }

  const candidateIdentifier = client.identifierPrefix
    ? `${client.identifierPrefix}${identifierToUse}`
    : String(identifierToUse);

  let existingWork;
  try {
    existingWork = await Work.findOne({ clientId: work.clientId, identifier: candidateIdentifier }).lean();
  } catch {
    work.identifierNo = identifierToUse;
    work.identifier = candidateIdentifier;
    return;
  }

  if (existingWork) {
    await issueIdentifier(work, Work, Client, initial + 1);
  } else {
    work.identifierNo = identifierToUse;
    work.identifier = candidateIdentifier;
  }
}

export function roundRightsChainPercentages(work: WorkInstance) {
  type ChainNode = { children?: ChainNode[]; [key: string]: unknown };

  const propertiesToRound = [
    'mechanicalOwnership',
    'mechanicalCollection',
    'performanceOwnership',
    'performanceCollection',
  ];

  function roundPropertyPercentages(chain: ChainNode) {
    for (const property of propertiesToRound) {
      if (Object.prototype.hasOwnProperty.call(chain, property)) {
        const value = Math.round(Number(chain[property]) * 100) / 100;
        chain[property] = value;
      }
    }
    if (chain.children?.length) {
      for (const child of chain.children) {
        if (child) roundPropertyPercentages(child);
      }
    }
  }

  for (const chain of (work.rightsChain as unknown as ChainNode[]) ?? []) {
    roundPropertyPercentages(chain);
  }
  for (const partnerChain of work.partnerRightsChains ?? []) {
    for (const chain of (partnerChain?.rightsChain ?? []) as unknown as ChainNode[]) {
      roundPropertyPercentages(chain);
    }
  }
}

export async function autoApproveWork(work: WorkInstance, Client: ClientModel) {
  if (!work.valid) return;
  try {
    const client = await Client.findById(work.clientId, 'autoApproveWorks');
    if (client?.autoApproveWorks) {
      work.approvedDate = new Date();
      work.approvalStatus = 'Approved';
    }
  } catch {
    // Non-fatal: error finding client should not block the save
  }
}

export function setApprovalStatus(work: WorkInstance) {
  if (work.valid && !work.approvedDate) {
    work.approvalStatus = 'Ready for Approval';
  }
  if (!work.valid) {
    work.approvalStatus = 'Invalid';
  }
}

export async function addExtraChainData(work: WorkInstance, Composer: ComposerModel) {
  const composerIds: string[] = [];

  type ChainNode = { type?: string; composerId?: string; children?: ChainNode[] };

  const findComposers = (chain: ChainNode[], fn: (node: ChainNode) => void) => {
    for (const item of chain) {
      if (item.children?.length) findComposers(item.children, fn);
      if (item.type === 'Composer' && item.composerId) fn(item);
    }
  };

  for (const chain of work.rightsChain as unknown as ChainNode[]) {
    if (chain?.children?.length) findComposers(chain.children, (node) => composerIds.push(node.composerId!));
  }
  for (const partnerChain of work.partnerRightsChains ?? []) {
    for (const chain of (partnerChain?.rightsChain ?? []) as unknown as ChainNode[]) {
      if (chain?.children?.length) findComposers(chain.children, (node) => composerIds.push(node.composerId!));
    }
  }

  if (composerIds.length === 0) return;

  const composers = await Composer.find({ _id: { $in: [...new Set(composerIds)] } })
    .select({ cae: 1, name: 1 })
    .lean();
  const composersById = new Map<string, { cae?: string; name?: string }>(composers.map((c) => [c._id.toString(), c]));

  const setExtraData = (node: ChainNode) => {
    const data = composersById.get(node.composerId!);
    if (!data) return;
    (node as Record<string, unknown>).caeNumber = data.cae;
    (node as Record<string, unknown>).name = data.name;
  };

  for (const chain of work.rightsChain as unknown as ChainNode[]) {
    if (chain?.children?.length) findComposers(chain.children, setExtraData);
  }
  for (const partnerChain of work.partnerRightsChains ?? []) {
    for (const chain of (partnerChain?.rightsChain ?? []) as unknown as ChainNode[]) {
      if (chain?.children?.length) findComposers(chain.children, setExtraData);
    }
  }
}

export default {
  preSave,
  cleanPublishers,
  validateSalesReturns,
  generatePublisherFingerprints,
};
