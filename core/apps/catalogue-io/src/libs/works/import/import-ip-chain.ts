// @ts-expect-error — no type declarations for platform-shared-utils
import { LowerCaseString, Utils } from '@curveroyaltysystems/curve-shared-logic';
import { groupBy } from 'lodash';
import { Composer, Publisher, DeliveryPartner } from '../../../models';
import IpChainUtils, { type ChainNode } from '../utils/ipchain';
import { allTerritories } from './import.constants';
import { isObjectPopulated, getItemsFromIndexedObject, removeLeadingZeros, padLeadingZeros } from './import-utils';
import type { ImportRow, IndexedObject, IndexedComposersPublishers, ChainTerritory, ComposerPublisherMaps } from './import.types';

export function formatIpChainComposerNames(ipChain: ImportRow[]): ImportRow[] {
  const row = ipChain[0];
  if (!row) return ipChain;

  type ParticipantProfile = { name: unknown; firstName: unknown; middleName: unknown; surname: unknown };
  const participants: Array<{ index: number; caeNumber: unknown; name: unknown; firstName: unknown; middleName: unknown; surname: unknown; type: unknown }> = [];
  const firstProfilesByCae: Record<string, ParticipantProfile> = {};

  for (let i = 1; i <= 10; i += 1) {
    const participant = {
      index: i,
      caeNumber: row[`participant${i}CaeNumber`],
      name: row[`participant${i}Name`],
      firstName: row[`participant${i}FirstName`],
      middleName: row[`participant${i}MiddleName`],
      surname: row[`participant${i}Surname`],
      type: row[`participant${i}Type`],
    };
    participants.push(participant);

    if (participant.type === 'Composer' && participant.caeNumber !== null && participant.caeNumber !== '00000000000' && participant.caeNumber !== '') {
      const caeKey = String(participant.caeNumber);
      if (!firstProfilesByCae[caeKey]) {
        firstProfilesByCae[caeKey] = {
          name: participant.name,
          firstName: participant.firstName,
          middleName: participant.middleName,
          surname: participant.surname,
        };
      }
    }
  }

  participants.forEach((participant) => {
    if (participant.type === 'Composer' && participant.caeNumber !== null && participant.caeNumber !== '00000000000' && participant.caeNumber !== '') {
      const caeKey = String(participant.caeNumber);
      const firstProfile = firstProfilesByCae[caeKey];
      if (firstProfile) {
        row[`participant${participant.index}Name`] = firstProfile.name;
        row[`participant${participant.index}FirstName`] = firstProfile.firstName;
        row[`participant${participant.index}MiddleName`] = firstProfile.middleName;
        row[`participant${participant.index}Surname`] = firstProfile.surname;
      }
    }
  });

  return ipChain;
}

export function buildComposerPublisherMaps(
  publisherDocs: Record<string, unknown>[],
  composerDocs: Record<string, unknown>[],
): ComposerPublisherMaps {
  const publisherByCaeAndName = new Map<string, Record<string, unknown>>();
  const publisherByCae = new Map<string, Record<string, unknown>>();
  const publisherByName = new Map<string, Record<string, unknown>>();
  const composerByCae = new Map<string, Record<string, unknown>>();
  const composerByNameNoCae = new Map<string, Record<string, unknown>>();

  for (const pub of publisherDocs) {
    const lowerName = (pub.lowerCaseName as string) || LowerCaseString(pub.name as string);
    const normCae = removeLeadingZeros(pub.cae as string | undefined);
    if (normCae) {
      publisherByCaeAndName.set(`${normCae}::${lowerName}`, pub);
      publisherByCae.set(normCae, pub);
    }
    if (lowerName) publisherByName.set(lowerName, pub);
  }

  for (const comp of composerDocs) {
    const lowerName = (comp.lowerCaseName as string) || LowerCaseString(comp.name as string);
    const normCae = removeLeadingZeros(comp.cae as string | undefined);
    if (normCae) {
      composerByCae.set(normCae, comp);
    } else if (lowerName) {
      composerByNameNoCae.set(lowerName, comp);
    }
  }

  return { publisherByCaeAndName, publisherByCae, publisherByName, composerByCae, composerByNameNoCae };
}

export async function getComposersPublishersFromChain(
  chains: ImportRow[],
  clientId: string,
  maps: ComposerPublisherMaps,
): Promise<{ errors: string[]; indexed: IndexedComposersPublishers }> {
  const excelTotalParticipants = 10;
  const indexed: IndexedComposersPublishers = {};
  let line = 3;

  chains.forEach((chain) => {
    for (let i = 1; i < excelTotalParticipants + 1; i += 1) {
      if (chain[`participant${i}Type`] && chain[`participant${i}Name`]) {
        let index;
        if (`${chain[`participant${i}Type`]}` === 'Publisher') {
          index = `${chain[`participant${i}Type`]}_${LowerCaseString(chain[`participant${i}Name`])}`;
        }
        if (`${chain[`participant${i}Type`]}` === 'Composer') {
          index = `${chain[`participant${i}Type`]}_${LowerCaseString(chain[`participant${i}Name`])}_${chain[`participant${i}CaeNumber`]}`;
        }
        if (index !== undefined && !indexed[index]) {
          indexed[index] = {
            type: chain[`participant${i}Type`] as string,
            name: chain[`participant${i}Name`] as string,
            firstName: chain[`participant${i}FirstName`] as string | undefined,
            middleName: chain[`participant${i}MiddleName`] as string | undefined,
            surname: chain[`participant${i}Surname`] as string | undefined,
            caeNumber: chain[`participant${i}CaeNumber`] as string | undefined,
            controlled: Utils.convertStringToBoolean(chain[`participant${i}Controlled`] as string | undefined),
            line,
          };
        }
      }
    }
    line += 1;
  });

  const errors: string[] = [];
  for (const index of Object.values(indexed)) {
    if (index.type === 'Publisher') {
      try {
        const publisher = await getPublisher(clientId, index.name, index.caeNumber, index.controlled, maps);
        index.publisher = publisher;
      } catch (err) {
        errors.push(`Line ${index.line}: ${err}`);
      }
    } else if (index.type === 'Composer') {
      try {
        const composer = await getComposer(clientId, index.name, index.firstName, index.middleName, index.surname, index.caeNumber, index.controlled, maps);
        index.composer = composer as Record<string, unknown>;
        index.name = composer.name ?? index.name;
        index.firstName = composer.firstName;
        index.middleName = composer.middleName;
        index.surname = composer.surname;
      } catch (err) {
        errors.push(`Line ${index.line}: ${err}`);
      }
    }
  }

  return { errors, indexed };
}

export async function saveChainComposersPublishers(
  indexed: IndexedComposersPublishers | undefined,
  partialImportErrors: string[],
): Promise<void> {
  for (const index of Object.values(indexed ?? {})) {
    if (index.type === 'Publisher' && index.publisher && index.publisher.saveLater) {
      const publisher = new Publisher(index.publisher);
      try {
        await publisher.save();
      } catch (err) {
        if (err && (err as Error)?.message?.indexOf('CAE is required to be unique') > -1) {
          partialImportErrors.push(`Publisher ${publisher.name}${publisher.cae ? `, CAE: ${publisher.cae},` : ''} did not import due to duplicated CAE`);
        } else if (err) {
          partialImportErrors.push(`Publisher ${publisher.name}${publisher.cae ? `, CAE: ${publisher.cae},` : ''} did not import`);
        }
      }
    } else if (index.type === 'Composer' && index.composer && index.composer.saveLater) {
      const composer = new Composer(index.composer);
      try {
        await composer.save();
      } catch (err) {
        if (err && (err as Error)?.message?.indexOf('CAE is required to be unique') > -1) {
          partialImportErrors.push(`Composer ${composer.name}${composer.cae ? `, CAE: ${composer.cae},` : ''} did not import due to duplicated CAE`);
        } else if (err) {
          partialImportErrors.push(`Composer ${composer.name}${composer.cae ? `, CAE: ${composer.cae},` : ''} did not import`);
        }
      }
    }
  }
}

export async function addIpChains(
  work: Record<string, unknown>,
  indexedIpChains: IndexedObject,
  indexedComposersPublishers: IndexedComposersPublishers,
  clientId: string,
  overwriteBlanks: boolean,
  territoryByName: Map<string, { _id: unknown; territories: string[] }>,
): Promise<string[]> {
  let workIpChains: ImportRow[] = [];
  if (overwriteBlanks) { work.rightsChain = []; }

  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const ipChains = getItemsFromIndexedObject(work, indexedIpChains, identifiers);
  const { chains, errors } = importTerritoryChains(ipChains);
  workIpChains = workIpChains.concat(chains);

  if (errors.length > 0 || workIpChains.length === 0) {
    return errors;
  }

  work.rightsChain = [];
  const rc = work.rightsChain as ChainTerritory[];

  for (const chain of workIpChains) {
    let formattedChainTerritoryIndex = 0;
    let formattedChainTerritoryChildIndex = 0;
    let isTerritoryAlreadyAdded = false;

    rc.forEach((formattedChain: ChainTerritory, index: number) => {
      if ((formattedChain.territory !== 'specific' && formattedChain.territory === chain.territory) || (formattedChain.territory === 'specific' && formattedChain?.territoryCodes?.name === (chain.territoryCodes as { name?: string })?.name)) {
        formattedChain.children.push({
          type: chain.participant1Type as string | undefined,
          name: chain.participant1Name as string | undefined,
          firstName: chain.participant1FirstName as string | undefined,
          middleName: chain.participant1MiddleName as string | undefined,
          surname: chain.participant1Surname as string | undefined,
          caeNumber: chain.participant1CaeNumber as string | undefined,
          controlled: chain.participant1Controlled as boolean | string | undefined,
          mechanicalOwnership: chain.participant1MechanicalOwned as number | string | undefined,
          mechanicalCollection: chain.participant1MechanicalCollected as number | string | undefined,
          performanceOwnership: chain.participant1PerformanceOwned as number | string | undefined,
          performanceCollection: chain.participant1PerformanceCollected as number | string | undefined,
          contractType: chain.participant1Capacity as string | undefined,
          children: [],
          index: chain.index,
        });
        isTerritoryAlreadyAdded = true;
        formattedChainTerritoryIndex = index;
        formattedChainTerritoryChildIndex = formattedChain.children.length - 1;
      }
    });

    if (!isTerritoryAlreadyAdded) {
      rc.push({
        territory: chain.territory as string,
        territoryCodes: chain.territoryCodes as { name: string; codes: string[] } | undefined,
        children: [{
          type: chain.participant1Type as string | undefined,
          name: chain.participant1Name as string | undefined,
          firstName: chain.participant1FirstName as string | undefined,
          middleName: chain.participant1MiddleName as string | undefined,
          surname: chain.participant1Surname as string | undefined,
          caeNumber: chain.participant1CaeNumber as string | undefined,
          controlled: chain.participant1Controlled as boolean | string | undefined,
          mechanicalOwnership: chain.participant1MechanicalOwned as number | string | undefined,
          mechanicalCollection: chain.participant1MechanicalCollected as number | string | undefined,
          performanceOwnership: chain.participant1PerformanceOwned as number | string | undefined,
          performanceCollection: chain.participant1PerformanceCollected as number | string | undefined,
          contractType: chain.participant1Capacity as string | undefined,
          children: [],
          index: chain.index,
        }],
      });
      formattedChainTerritoryIndex = rc.length - 1;
      formattedChainTerritoryChildIndex = 0;
    }

    rc[formattedChainTerritoryIndex]!.children[formattedChainTerritoryChildIndex]!.children = getParentsChildren(2, chain);
    (rc[formattedChainTerritoryIndex] as ChainTerritory & { line?: number }).line = chain.line;
  }

  if (rc.length > 0) {
    rc.forEach((chain: ChainTerritory) => {
      chain.children = chain?.children?.length > 0 ? IpChainUtils.combineDuplicatePublishers(chain.children) : chain.children;
    });

    rc.forEach((chain: ChainTerritory & { line?: number }) => {
      combineChildComposers(chain, chain.line, errors);
    });

    rc.forEach((chain: ChainTerritory & { line?: number }) => {
      if (chain.line || chain.line === 0) { delete chain.line; }
    });

    for (const formattedChain of rc) {
      if (!allTerritories.includes(formattedChain.territory)) {
        if (formattedChain.territory === 'specific') {
          const everyExists = formattedChain.territoryCodes?.codes?.every((territory: string) => allTerritories.includes(territory));
          if (!everyExists) throw new Error('IP Chain Territory not recognised');
        } else {
          const tg = territoryByName.get(formattedChain.territory);
          if (tg) {
            formattedChain.territory = String(tg._id);
          } else {
            throw new Error(`IP Chain Territory not recognised: "${formattedChain.territory}"`);
          }
        }
      }
    }

    rc.forEach((chain: ChainTerritory) => {
      mapToPublisherOrComposer(chain, indexedComposersPublishers, clientId);
    });

    rc.forEach((chain: ChainTerritory) => {
      roundIpChainShares(chain);
    });
  }

  return errors;
}

export async function addPartnerIpChains(
  work: Record<string, unknown>,
  indexedIpChains: IndexedObject,
  indexedComposersPublishers: IndexedComposersPublishers | undefined,
  clientId: string,
  overwriteBlanks: boolean,
  territoryByName: Map<string, { _id: unknown; territories: string[] }>,
): Promise<string[]> {
  if (overwriteBlanks || !work.partnerRightsChains) work.partnerRightsChains = [];
  let importErrors: string[] = [];

  const identifiers = ['_id', 'identifier', 'tunecode', 'title', 'partnerName'];
  const ipChains = getItemsFromIndexedObject(work, indexedIpChains, identifiers);
  const chainsByPartner = groupBy(ipChains, (chain: ImportRow) => chain.partnerName);

  for (const [partnerName, partnerIpChains] of Object.entries(chainsByPartner)) {
    const partnerChain: { deliveryPartnerId: string | null; rightsChain: ChainTerritory[] } = { deliveryPartnerId: null, rightsChain: [] };
    const { chains, errors } = importTerritoryChains(partnerIpChains as ImportRow[]);
    importErrors = importErrors.concat(errors);

    if (importErrors.length > 0) break;
    // eslint-disable-next-line no-continue
    if (chains.length === 0) continue;

    let formattedChainTerritoryIndex = 0;
    let formattedChainTerritoryChildIndex = 0;

    for (const chain of chains) {
      let isTerritoryAlreadyAdded = false;
      // eslint-disable-next-line no-loop-func
      partnerChain.rightsChain.map((formattedChain, index) => {
        if ((formattedChain.territory !== 'specific' && formattedChain.territory === chain.territory) || (formattedChain.territory === 'specific' && formattedChain?.territoryCodes?.name === chain.territoryCodes?.name)) {
          formattedChain.children.push({
            type: chain.participant1Type as string | undefined,
            name: chain.participant1Name as string | undefined,
            firstName: chain.participant1FirstName as string | undefined,
            middleName: chain.participant1MiddleName as string | undefined,
            surname: chain.participant1Surname as string | undefined,
            caeNumber: chain.participant1CaeNumber as string | undefined,
            controlled: chain.participant1Controlled as boolean | string | undefined,
            mechanicalOwnership: chain.participant1MechanicalOwned as number | string | undefined,
            mechanicalCollection: chain.participant1MechanicalCollected as number | string | undefined,
            performanceOwnership: chain.participant1PerformanceOwned as number | string | undefined,
            performanceCollection: chain.participant1PerformanceCollected as number | string | undefined,
            contractType: chain.participant1Capacity as string | undefined,
            children: [],
            index: chain.index,
          });
          isTerritoryAlreadyAdded = true;
          formattedChainTerritoryIndex = index;
          formattedChainTerritoryChildIndex = formattedChain.children.length - 1;
        }
      });

      if (!isTerritoryAlreadyAdded) {
        partnerChain.rightsChain.push({
          territory: chain.territory as string,
          territoryCodes: chain.territoryCodes as { name: string; codes: string[] } | undefined,
          children: [{
            type: chain.participant1Type as string | undefined,
            name: chain.participant1Name as string | undefined,
            firstName: chain.participant1FirstName as string | undefined,
            middleName: chain.participant1MiddleName as string | undefined,
            surname: chain.participant1Surname as string | undefined,
            caeNumber: chain.participant1CaeNumber as string | undefined,
            controlled: chain.participant1Controlled as boolean | string | undefined,
            mechanicalOwnership: chain.participant1MechanicalOwned as number | string | undefined,
            mechanicalCollection: chain.participant1MechanicalCollected as number | string | undefined,
            performanceOwnership: chain.participant1PerformanceOwned as number | string | undefined,
            performanceCollection: chain.participant1PerformanceCollected as number | string | undefined,
            contractType: chain.participant1Capacity as string | undefined,
            children: [],
            index: chain.index,
          }],
        });
        formattedChainTerritoryIndex = partnerChain.rightsChain.length - 1;
        formattedChainTerritoryChildIndex = 0;
      }

      partnerChain.rightsChain[formattedChainTerritoryIndex]!.children[formattedChainTerritoryChildIndex]!.children = getParentsChildren(2, chain);
      (partnerChain.rightsChain[formattedChainTerritoryIndex] as ChainTerritory & { line?: number }).line = chain.line;
    }

    partnerChain.rightsChain.map((chain) => {
      chain.children = chain?.children?.length > 0 ? IpChainUtils.combineDuplicatePublishers(chain.children) : chain.children;
    });

    // eslint-disable-next-line no-loop-func
    partnerChain.rightsChain.map((chain: ChainTerritory & { line?: number }) => {
      const composerErrors: string[] = [];
      combineChildComposers(chain, chain.line, composerErrors);
      importErrors = importErrors.concat(composerErrors);
    });

    partnerChain.rightsChain.forEach((chain: ChainTerritory & { line?: number }) => {
      if (chain.line || chain.line === 0) delete chain.line;
    });

    for (const chain of partnerChain.rightsChain) {
      if (!allTerritories.includes(chain.territory)) {
        if (chain.territory === 'specific') {
          const everyExists = chain.territoryCodes?.codes?.every((territory) => allTerritories.includes(territory));
          if (!everyExists) throw new Error('IP Chain Territory not recognised');
        } else {
          const tg = territoryByName.get(chain.territory);
          if (tg) {
            chain.territory = String(tg._id);
          } else {
            throw new Error('IP Chain Territory not recognised');
          }
        }
      }
    }

    if (indexedComposersPublishers) {
      partnerChain.rightsChain.forEach((chain) => mapToPublisherOrComposer(chain, indexedComposersPublishers, clientId));
    }

    partnerChain.rightsChain.forEach((chain) => roundIpChainShares(chain));

    const partner = await DeliveryPartner.findOne({ clientId, name: partnerName }, ['_id']);
    if (!partner) throw new Error(`Partner "${partnerName}" not found in Curve`);
    partnerChain.deliveryPartnerId = partner._id.toString();

    type PartnerRightsEntry = { deliveryPartnerId: string | null; rightsChain: ChainTerritory[] };
    const prc = work.partnerRightsChains as PartnerRightsEntry[];
    const index = prc.findIndex((obj) => obj.deliveryPartnerId === partnerChain.deliveryPartnerId);
    if (index >= 0 && prc[index]) {
      prc[index]!.rightsChain = partnerChain.rightsChain;
    } else {
      prc.push(partnerChain);
    }
  }

  return importErrors;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function importTerritoryChains(importedChains: ImportRow[]): { chains: ImportRow[]; errors: string[] } {
  const newChains: ImportRow[] = [];
  let errors: string[] = [];
  importedChains.forEach((chain: ImportRow, index: number) => {
    chain.index = index;
    if (isObjectPopulated(chain)) {
      if (!chain.territory) {
        errors.push(`Line ${chain.line} Error: Territory required for IP Chain`);
      } else {
        const territoriesArray = chain.territory.split(';');
        const everyTerritoryExists = territoriesArray.every((territory: string) => allTerritories.includes(territory));
        if (everyTerritoryExists) {
          if (territoriesArray.includes('WW') || territoriesArray.includes('World')) {
            chain.territory = 'WW';
          } else {
            chain.territory = 'specific';
            chain.territoryCodes = { name: territoriesArray.join(','), codes: territoriesArray };
          }
        }
        newChains.push(chain);
        errors = errors.concat(validateChainRequiredFields(chain));
      }
    }
  });
  return { chains: newChains, errors };
}

function validateChainRequiredFields(chain: ImportRow): string[] {
  const errors: string[] = [];
  const excelTotalParticipants = 10;
  if (isObjectPopulated(chain)) {
    for (let i = 1; i < excelTotalParticipants + 1; i += 1) {
      if (chain[`participant${i}Type`]
        || chain[`participant${i}Name`]
        || chain[`participant${i}FirstName`]
        || chain[`participant${i}MiddleName`]
        || chain[`participant${i}Surname`]
        || chain[`participant${i}CaeNumber`]
        || chain[`participant${i}Controlled`]
        || chain[`participant${i}MechanicalOwned`]
        || chain[`participant${i}MechanicalCollected`]
        || chain[`participant${i}PerformanceOwned`]
        || chain[`participant${i}PerformanceCollected`]
        || chain[`participant${i}Capacity`]) {
        if (!chain[`participant${i}Name`]) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} name is required`);
        }
        if (!['Publisher', 'Composer'].includes(String(chain[`participant${i}Type`] ?? '')) || !chain[`participant${i}Type`]) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} type doesn't match list`);
        }
        if (chain[`participant${i}Type`] === 'Publisher' && !['Admin', 'Sub Publisher', 'Original Publisher', 'Acquirer', 'Income Participant'].includes(String(chain[`participant${i}Capacity`] ?? ''))) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} capacity doesn't match publisher capacities list`);
        } else if (chain[`participant${i}Type`] === 'Composer' && !['Lyrics and Music', 'Lyrics', 'Music', 'Arranger', 'Sub Arranger', 'Adapter', 'Sub Author', 'Translator'].includes(String(chain[`participant${i}Capacity`] ?? ''))) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} capacity doesn't match composer capacities list`);
        }
      }
    }
  }
  return errors;
}

function combineChildComposers(chain: { children: ChainNode[] }, lineNumber: number | undefined, errors: string[]): void {
  chain.children.map((child: ChainNode) => {
    if (child.type === 'Composer' && child.children.length > 0) {
      child.children.map((subchild: ChainNode) => {
        if (subchild.type === 'Publisher') {
          errors.push(`IP Chains Line ${lineNumber}: Publishers should not follow Composers in the chain`);
        }
      });
      combineChildComposers(child, lineNumber, errors);
      chain.children = chain.children.concat(child.children);
      child.children = [];
    }
  });

  chain.children.map((child: ChainNode) => {
    combineChildComposers(child, lineNumber, errors);
  });
}

function mapToPublisherOrComposer(chain: { children?: ChainNode[] }, indexedComposersPublishers: IndexedComposersPublishers, clientId: string): void {
  if (chain.children) {
    chain.children.forEach((child: ChainNode) => {
      const pubKey = `Publisher_${LowerCaseString(child.name)}`;
      const comKey = `Composer_${LowerCaseString(child.name)}_${child.caeNumber}`;
      if (child.type === 'Publisher' && indexedComposersPublishers && indexedComposersPublishers[pubKey]?.publisher) {
        const publisherId = (indexedComposersPublishers[pubKey]?.publisher as Record<string, unknown>)?._id?.toString()
          || ((indexedComposersPublishers[pubKey]?.publisher as Record<string, unknown>)?.publisher as Record<string, unknown>)?._id?.toString();
        child.publisherId = publisherId as string | undefined;
      } else if (child.type === 'Composer' && indexedComposersPublishers && indexedComposersPublishers[comKey]?.composer) {
        const composerId = (indexedComposersPublishers[comKey]?.composer as Record<string, unknown>)?._id?.toString()
          || ((indexedComposersPublishers[comKey]?.composer as Record<string, unknown>)?.composer as Record<string, unknown>)?._id?.toString();
        child.composerId = composerId as string | undefined;
      }

      if (child.children) {
        mapToPublisherOrComposer(child, indexedComposersPublishers, clientId);
      }
    });
  }
}

function roundIpChainShares(chain: { children?: ChainNode[] }): void {
  if (chain.children) {
    chain.children.forEach((child: ChainNode) => {
      child.mechanicalOwnership = roundSingleIpChainShare(child.mechanicalOwnership);
      child.mechanicalCollection = roundSingleIpChainShare(child.mechanicalCollection);
      child.performanceOwnership = roundSingleIpChainShare(child.performanceOwnership);
      child.performanceCollection = roundSingleIpChainShare(child.performanceCollection);
      roundIpChainShares(child);
    });
  }
}

function roundSingleIpChainShare(share: number | string | undefined): number | string | undefined {
  if (!share) { return share; }
  return Math.round(Number(share) * 100) / 100;
}

function getParentsChildren(startIndex: number, chain: ImportRow): ChainNode[] {
  if (chain[`participant${startIndex}Type`]
    || chain[`participant${startIndex}Name`]
    || chain[`participant${startIndex}FirstName`]
    || chain[`participant${startIndex}MiddleName`]
    || chain[`participant${startIndex}Surname`]
    || chain[`participant${startIndex}CaeNumber`]
    || chain[`participant${startIndex}Controlled`]
    || chain[`participant${startIndex}MechanicalOwned`]
    || chain[`participant${startIndex}MechanicalCollected`]
    || chain[`participant${startIndex}PerformanceOwned`]
    || chain[`participant${startIndex}PerformanceCollected`]
    || chain[`participant${startIndex}Capacity`]) {
    return [{
      type: chain[`participant${startIndex}Type`] as string | undefined,
      name: chain[`participant${startIndex}Name`] as string | undefined,
      firstName: chain[`participant${startIndex}FirstName`] as string | undefined,
      middleName: chain[`participant${startIndex}MiddleName`] as string | undefined,
      surname: chain[`participant${startIndex}Surname`] as string | undefined,
      caeNumber: chain[`participant${startIndex}CaeNumber`] as string | undefined,
      controlled: chain[`participant${startIndex}Controlled`] as boolean | string | undefined,
      mechanicalOwnership: chain[`participant${startIndex}MechanicalOwned`] as number | string | undefined,
      mechanicalCollection: chain[`participant${startIndex}MechanicalCollected`] as number | string | undefined,
      performanceOwnership: chain[`participant${startIndex}PerformanceOwned`] as number | string | undefined,
      performanceCollection: chain[`participant${startIndex}PerformanceCollected`] as number | string | undefined,
      contractType: chain[`participant${startIndex}Capacity`] as string | undefined,
      children: getParentsChildren(startIndex + 1, chain),
      index: chain.index,
    }];
  }
  return [];
}

async function getPublisher(
  clientId: string,
  name: string | undefined,
  cae: string | undefined,
  controlled: boolean | undefined,
  maps: ComposerPublisherMaps,
): Promise<Record<string, unknown>> {
  const lowerName = LowerCaseString(name);
  const normCae = removeLeadingZeros(cae);
  let publisher: Record<string, unknown> | undefined;

  if (normCae) {
    publisher = maps.publisherByCaeAndName.get(`${normCae}::${lowerName}`)
      ?? maps.publisherByCae.get(normCae);
  }
  if (!publisher) {
    publisher = maps.publisherByName.get(lowerName);
  }

  if (publisher) return publisher;

  if (name) {
    const publisherDoc = new Publisher({ clientId, name, cae: padLeadingZeros(cae, 11), controlled });
    await publisherDoc.validate();
    const publisherObj = JSON.parse(JSON.stringify(publisherDoc)) as Record<string, unknown>;
    publisherObj.saveLater = true;
    if (normCae) {
      maps.publisherByCaeAndName.set(`${normCae}::${lowerName}`, publisherObj);
      maps.publisherByCae.set(normCae, publisherObj);
    }
    maps.publisherByName.set(lowerName, publisherObj);
    return publisherObj;
  }

  throw new Error('Publisher requires name');
}

async function getComposer(
  clientId: string,
  name: string | undefined,
  firstName: string | undefined,
  middleNames: string | undefined,
  surname: string | undefined,
  cae: string | undefined,
  controlled: boolean | undefined,
  maps: ComposerPublisherMaps,
): Promise<{ name?: string; firstName?: string; middleName?: string; surname?: string; [key: string]: unknown }> {
  const lowerName = LowerCaseString(name);
  const normCae = removeLeadingZeros(cae);
  let composer: Record<string, unknown> | undefined;

  if (normCae) {
    composer = maps.composerByCae.get(normCae);
  } else {
    // Only match no-CAE composers by name when the request also has no CAE,
    // mirroring the original DB query that filtered cae = null/''/00000000000.
    composer = maps.composerByNameNoCae.get(lowerName);
  }

  if (composer) {
    return composer as { name?: string; firstName?: string; middleName?: string; surname?: string; [key: string]: unknown };
  }

  if (name) {
    const composerDoc = new Composer({ clientId, name, cae: padLeadingZeros(cae, 11), firstName, middleNames, surname, controlled });
    await composerDoc.validate();
    const composerObj = JSON.parse(JSON.stringify(composerDoc)) as { name?: string; firstName?: string; middleName?: string; surname?: string; [key: string]: unknown };
    composerObj.saveLater = true;
    if (normCae) {
      maps.composerByCae.set(normCae, composerObj as Record<string, unknown>);
    } else {
      maps.composerByNameNoCae.set(lowerName, composerObj as Record<string, unknown>);
    }
    return composerObj;
  }

  throw new Error('Composer requires name');
}
