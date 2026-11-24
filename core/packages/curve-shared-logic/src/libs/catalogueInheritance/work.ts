import type { Client as ClientSchema } from '@curveroyaltysystems/models/dist/client';
import { Types } from '@curveroyaltysystems/models/mongoose';
import type { HydratedDocument } from '@curveroyaltysystems/models/mongoose';
import type {
  WorkInstance,
  WorkModel,
  ClientModel,
  TrackModel,
  ComposerModel,
  PublisherModel,
  TerritoryGroupModel,
} from '../../types/models';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Utils = require('../utils');

type ClientInstance = HydratedDocument<ClientSchema>;

type InheritCatalogueEntry = {
  clientId?: string;
  transferWorks?: boolean;
  catalogueGroup?: string;
};

type SocietyIdentifier = { society: string; identifier: string };

type TrackWithCopyValues = {
  copyValues: (track: unknown, clientId: unknown, cb: () => void) => void;
};

type RightsChainItem = {
  territory?: string;
  children?: RightsChainItem[];
  type?: string;
  publisherId?: string;
  composerId?: string;
  [key: string]: unknown;
};

export async function propagateWork({
  work,
  Work,
  Client,
  Track,
  Composer,
  Publisher,
  TerritoryGroup,
}: {
  work: WorkInstance;
  Work: WorkModel;
  Client: ClientModel;
  Track: TrackModel;
  Composer: ComposerModel;
  Publisher: PublisherModel;
  TerritoryGroup: TerritoryGroupModel;
}): Promise<void> {
  const parentClient = await Client.findById(work.clientId);
  if (!parentClient) return;

  const childClients = await Client.find({ 'inheritCatalogueFrom.clientId': parentClient._id.toString() });

  const matchingClients = childClients.filter((client) =>
    (client.inheritCatalogueFrom as InheritCatalogueEntry[]).some((inheritance) => {
      if (!inheritance?.transferWorks) return false;
      if (inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
        return work.catalogueGroups.includes(inheritance.catalogueGroup);
      }
      return true;
    })
  );

  for (const client of matchingClients) {
    await propagateWorkToClient({ work, client, Work, Track, Composer, Publisher, TerritoryGroup });
  }
}

async function propagateWorkToClient({
  work,
  client,
  Work,
  Track,
  Composer,
  Publisher,
  TerritoryGroup,
}: {
  work: WorkInstance;
  client: ClientInstance;
  Work: WorkModel;
  Track: TrackModel;
  Composer: ComposerModel;
  Publisher: PublisherModel;
  TerritoryGroup: TerritoryGroupModel;
}): Promise<void> {
  let childWork = await Work.findOne({
    clientId: client._id.toString(),
    duplicatedFrom: work._id.toString(),
  });

  if (!childWork) {
    childWork = new Work();
  }

  await copyValues({ childWork, sourceWork: work, clientId: client._id });

  // Copy tracks
  await copyTracks({ childWork, sourceWork: work, Track });

  // Copy IP chain — deep clone so mutations to IDs don't affect the original
  const sourceWorkPlain = JSON.parse(JSON.stringify(work));
  await copyIpChain({ childWork, sourceWork: sourceWorkPlain, Composer, Publisher, TerritoryGroup });

  try {
    await childWork.save();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    (work.validationErrors as string[]).push(`Failed syncing to ${client.name}: ${message}`);
    try {
      await Work.updateOne({ _id: work._id }, { $set: { validationErrors: work.validationErrors } });
    } catch {
      // Intentionally ignored — mirrors original behaviour where updateOne errors are swallowed
    }
  }
}

async function copyValues({
  childWork,
  sourceWork,
  clientId,
}: {
  childWork: WorkInstance;
  sourceWork: WorkInstance;
  clientId: unknown;
}): Promise<void> {
  childWork.clientId = clientId as string;
  childWork.title = sourceWork.title;
  childWork.alternateTitles = sourceWork.alternateTitles;
  childWork.composer = sourceWork.composer;
  childWork.identifier = sourceWork.identifier;
  childWork.iswc = sourceWork.iswc;
  childWork.tunecode = sourceWork.tunecode;
  childWork.copyrightDate = sourceWork.copyrightDate;
  childWork.labelCopy = sourceWork.labelCopy;
  childWork.grandRights = sourceWork.grandRights;
  childWork.priority = sourceWork.priority;
  childWork.productionLibrary = sourceWork.productionLibrary;
  childWork.workLanguage = sourceWork.workLanguage;
  childWork.workDescriptionCategory = sourceWork.workDescriptionCategory;
  childWork.compositeType = sourceWork.compositeType;
  childWork.compositeCount = sourceWork.compositeCount;
  childWork.versionType = sourceWork.versionType;
  childWork.arrangementType = sourceWork.arrangementType;
  childWork.lyricAdaptionType = sourceWork.lyricAdaptionType;
  childWork.originalWorkTitle = sourceWork.originalWorkTitle;
  childWork.originalIswc = sourceWork.originalIswc;
  childWork.originalWorkWriterLastName = sourceWork.originalWorkWriterLastName;
  childWork.originalWorkWriterFirstName = sourceWork.originalWorkWriterFirstName;
  childWork.originalWorkSource = sourceWork.originalWorkSource;
  childWork.performers = sourceWork.performers;

  const aliasesToAdd = (sourceWork.aliases as string[]).filter(
    (alias) => !(childWork.aliases as string[]).includes(alias)
  );
  childWork.aliases = [...(childWork.aliases as string[]), ...aliasesToAdd] as typeof childWork.aliases;

  const identifiersToAdd = (sourceWork.societyIdentifiers as SocietyIdentifier[]).filter(
    (id) => !(childWork.societyIdentifiers as SocietyIdentifier[]).includes(id)
  );
  childWork.societyIdentifiers = [
    ...(childWork.societyIdentifiers as SocietyIdentifier[]),
    ...identifiersToAdd,
  ] as typeof childWork.societyIdentifiers;

  childWork.territories = sourceWork.territories;
  childWork.projectId = sourceWork.projectId;
  childWork.duplicatedFrom = sourceWork._id as unknown as string;
}

async function copyTracks({
  childWork,
  sourceWork,
  Track,
}: {
  childWork: WorkInstance;
  sourceWork: WorkInstance;
  Track: TrackModel;
}): Promise<void> {
  const tracks = await Track.find({ _id: { $in: sourceWork.trackIds } });

  for (const track of tracks) {
    const foundTrack = await Track.findOne(
      {
        $or: [
          { clientId: childWork.clientId, isrc: track.isrc },
          { clientId: childWork.clientId, duplicatedFrom: track._id.toString() },
        ],
      },
      '_id title version artist isrc duration foreignId'
    );

    if (foundTrack) {
      if (!(childWork.trackIds as string[]).includes(foundTrack._id.toString())) {
        (childWork.trackIds as string[]).push(foundTrack._id.toString());
      }
    } else {
      const newTrack = new Track();
      await new Promise<void>((resolve) => {
        (newTrack as unknown as TrackWithCopyValues).copyValues(track, childWork.clientId, () => resolve());
      });
      try {
        const savedTrack = await newTrack.save();
        (childWork.trackIds as string[]).push(savedTrack._id.toString());
      } catch {
        // Intentionally ignored — mirrors original behaviour where track save errors are swallowed
      }
    }
  }
}

async function copyIpChain({
  childWork,
  sourceWork,
  Composer,
  Publisher,
  TerritoryGroup,
}: {
  childWork: WorkInstance;
  sourceWork: { rightsChain?: RightsChainItem[]; clientId: string };
  Composer: ComposerModel;
  Publisher: PublisherModel;
  TerritoryGroup: TerritoryGroupModel;
}): Promise<void> {
  if (!sourceWork.rightsChain) return;

  childWork.rightsChain = [] as typeof childWork.rightsChain;

  for (const rightsChain of sourceWork.rightsChain) {
    const returnedChain = await copyIpChainLayer(rightsChain, sourceWork.clientId, childWork.clientId as string, {
      Composer,
      Publisher,
    });
    const territory = await copyChainTerritory(returnedChain.territory, childWork.clientId as string, {
      TerritoryGroup,
    });
    returnedChain.territory = territory;
    (childWork.rightsChain as unknown as RightsChainItem[]).push(returnedChain);
  }
}

async function copyIpChainLayer(
  item: RightsChainItem,
  originalClientId: string,
  copyToClientId: string,
  models: { Composer: ComposerModel; Publisher: PublisherModel }
): Promise<RightsChainItem> {
  if (!item?.children) return item;

  for (const child of item.children) {
    if (child?.type === 'Publisher') {
      const publisherId = await copyPublisherToClient(child.publisherId, copyToClientId, {
        Publisher: models.Publisher,
      });
      if (publisherId) {
        child.publisherId = publisherId;
      }
    }

    if (child?.type === 'Composer') {
      const composerId = await copyComposerToClient(child.composerId, copyToClientId, {
        Composer: models.Composer,
      });
      if (composerId) {
        child.composerId = composerId;
      }
    }

    if (child?.children) {
      await copyIpChainLayer(child, originalClientId, copyToClientId, models);
    }
  }

  return item;
}

async function copyChainTerritory(
  territory: string | undefined,
  copyToClientId: string,
  models: { TerritoryGroup: TerritoryGroupModel }
): Promise<string | undefined> {
  if (!territory) {
    throw new Error('Territory must be passed to copyChainTerritory');
  }

  // Not a Territory Group — return the standard territory code as-is
  if (territory.length !== 24 || !Types.ObjectId.isValid(territory)) {
    return territory;
  }

  const territoryGroup = await models.TerritoryGroup.findById(territory);
  if (!territoryGroup) {
    throw new Error(`Territory Group with ID ${territory} doesn't exist`);
  }

  const existingGroup = await models.TerritoryGroup.findOne({ clientId: copyToClientId, name: territoryGroup.name });
  if (existingGroup) {
    return existingGroup._id.toString();
  }

  const newTerritoryGroup = new models.TerritoryGroup({
    clientId: copyToClientId,
    name: territoryGroup.name,
    territories: territoryGroup.territories,
  });
  const savedGroup = await newTerritoryGroup.save();
  return savedGroup._id.toString();
}

async function copyPublisherToClient(
  publisherId: string | undefined,
  copyToClientId: string,
  models: { Publisher: PublisherModel }
): Promise<string | undefined> {
  if (!publisherId) return undefined;

  // Check if already copied to target client (error swallowed — mirrors original)
  try {
    const duplicated = await models.Publisher.findOne({ clientId: copyToClientId, duplicatedFrom: publisherId });
    if (duplicated) return duplicated._id.toString();
  } catch {}

  // Load original publisher (error propagates)
  const original = await models.Publisher.findById(publisherId);
  if (!original) return undefined;

  // Check if publisher with same name already exists in target client (error swallowed — mirrors original)
  try {
    const byName = await models.Publisher.findOne({ clientId: copyToClientId, name: original.name });
    if (byName) return byName._id.toString();
  } catch {}

  // Create new publisher in target client (error propagates)
  const newPublisher = new models.Publisher({
    clientId: copyToClientId,
    name: original.name,
    cae: Utils.padLeadingZeros(original.cae as string | undefined, 11),
    mainPro: original.mainPro,
    mechanicalPro: original.mechanicalPro,
    performancePro: original.performancePro,
    syncPro: original.syncPro,
    mainProIdentifier: original.mainProIdentifier,
    mechanicalProIdentifier: original.mechanicalProIdentifier,
    performanceProIdentifier: original.performanceProIdentifier,
    syncProIdentifier: original.syncProIdentifier,
    controlled: original.controlled,
    notes: original.notes,
    duplicatedFrom: original._id,
  });
  const saved = await newPublisher.save();
  return saved._id.toString();
}

async function copyComposerToClient(
  composerId: string | undefined,
  copyToClientId: string,
  models: { Composer: ComposerModel }
): Promise<string | undefined> {
  if (!composerId) return undefined;

  // Check if already copied to target client (error swallowed — mirrors original)
  try {
    const duplicated = await models.Composer.findOne({ clientId: copyToClientId, duplicatedFrom: composerId });
    if (duplicated) return duplicated._id.toString();
  } catch {}

  // Load original composer (error propagates)
  const original = await models.Composer.findById(composerId);
  if (!original) return undefined;

  const originalCae = original.cae as string | undefined;
  const caeStripped = Utils.removeLeadingZeros(originalCae);
  let foundComposerId: string | undefined;

  if (originalCae && caeStripped) {
    // Match by CAE
    const orCondition: object[] = [{ cae: originalCae }];
    const storedStripped = (original as unknown as Record<string, unknown>).caeWithoutLeadingZeros as
      | string
      | undefined;
    if (storedStripped) orCondition.push({ cae: storedStripped });
    orCondition.push({ caeWithoutLeadingZeros: caeStripped });

    const byCae = await models.Composer.findOne({ clientId: copyToClientId, $or: orCondition });
    if (byCae) foundComposerId = byCae._id.toString();
  } else if (original.name) {
    // Match by name when no valid CAE
    const byName = await models.Composer.findOne({
      clientId: copyToClientId,
      name: original.name,
      $or: [{ cae: { $eq: null } }, { cae: { $eq: '' } }, { cae: { $eq: '00000000000' } }],
    });
    if (byName && Utils.removeLeadingZeros(byName.cae as string | undefined) === caeStripped) {
      foundComposerId = byName._id.toString();
    }
  }

  if (foundComposerId) return foundComposerId;

  // Create new composer in target client (error propagates)
  const newComposer = new models.Composer({
    clientId: copyToClientId,
    name: original.name,
    cae: Utils.padLeadingZeros(originalCae),
    mainPro: original.mainPro,
    mechanicalPro: original.mechanicalPro,
    performancePro: original.performancePro,
    syncPro: original.syncPro,
    mainProIdentifier: original.mainProIdentifier,
    mechanicalProIdentifier: original.mechanicalProIdentifier,
    performanceProIdentifier: original.performanceProIdentifier,
    syncProIdentifier: original.syncProIdentifier,
    controlled: original.controlled,
    notes: original.notes,
    duplicatedFrom: original._id,
  });
  const saved = await newComposer.save();
  return saved._id.toString();
}
