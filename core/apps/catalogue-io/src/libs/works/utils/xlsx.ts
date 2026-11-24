/* eslint-disable no-continue */
import moment from 'moment';
// @ts-expect-error — no type declarations for curve-shared-logic
import { TerritoryHelper } from '@curveroyaltysystems/curve-shared-logic';
import { Types } from '@curveroyaltysystems/models/mongoose';
import fixUtf8 from 'fix-utf8';

import {
  mapChainTerritories,
  deconstructChain,
  combineComposerChains,
  splitIpChainValues,
  populateComposersPublishers,
  formatChains,
} from './rightsChain';

type CsvRow = (string | number | boolean | null | undefined)[];

interface WorkDoc {
  _id: { toString(): string };
  title?: string;
  composer?: string;
  foreignId?: string;
  projectId?: string;
  partyNo?: string;
  identifier?: string;
  iswc?: string;
  tunecode?: string;
  copyrightDate?: Date | string;
  labelCopy?: unknown;
  priority?: unknown;
  productionLibrary?: unknown;
  workDescriptionCategory?: unknown;
  workLanguage?: unknown;
  compositeType?: unknown;
  compositeCount?: unknown;
  versionType?: unknown;
  arrangementType?: unknown;
  lyricAdaptionType?: unknown;
  performers?: string[];
  trackIds?: string[];
  territories?: string[];
  catalogueGroups?: string[];
  aliases?: string[];
  notes?: string;
  alternateTitles?: { title?: string; language?: string }[];
  salesReturnsRights?: { contractId?: string; percentage?: number }[];
  channelSpecificSalesReturnsRights?: {
    contractId?: string;
    distributionChannel?: string;
    source?: string;
    territory?: string;
    percentage?: number;
  }[];
  societyIdentifiers?: { society?: string; identifier?: string }[];
  rightsChain?: unknown[];
  partnerRightsChains?: { rightsChain?: unknown[]; deliveryPartnerId?: string }[];
}

interface ClientDoc {
  paymentTier?: string;
  dateFormat?: string;
  features?: Record<string, boolean>;
}

interface ContractDoc {
  name?: string;
}

interface TerritoryGroupDoc {
  name?: string;
}

interface ComposerDoc {
  name?: string;
  firstName?: string;
  middleNames?: string;
  surname?: string;
  cae?: string;
}

interface PublisherDoc {
  name?: string;
  cae?: string;
}

interface DeliveryPartnerDoc {
  name?: string;
}

export interface ConvertWorksParams {
  client: ClientDoc;
  works: WorkDoc[];
  contractsById: Record<string, ContractDoc>;
  territoryGroupsById: Record<string, TerritoryGroupDoc>;
  composersById: Record<string, ComposerDoc>;
  publishersById: Record<string, PublisherDoc>;
  deliveryPartnersById: Record<string, DeliveryPartnerDoc>;
  trackIsrcsById: Record<string, string>;
}

type WorkExportTuple = [
  works: CsvRow[],
  alternateTitles: CsvRow[],
  participators: CsvRow[],
  specificParticipationRates: CsvRow[],
  societyIdentifiers: CsvRow[],
  ipChains: CsvRow[],
  partnerIpChains: CsvRow[],
];

export function convertWorks({
  client,
  works,
  contractsById,
  territoryGroupsById,
  composersById,
  publishersById,
  deliveryPartnersById,
  trackIsrcsById,
}: ConvertWorksParams): WorkExportTuple {
  const convertedWorks: CsvRow[] = [];
  const convertedAlternateTitles: CsvRow[] = [];
  const convertedParticipators: CsvRow[] = [];
  const convertedSpecificParticipationRates: CsvRow[] = [];
  const convertedSocietyIdentifiers: CsvRow[] = [];
  const convertedIpChains: CsvRow[] = [];
  const convertedPartnerIpChains: CsvRow[] = [];

  const dateFormat = client.dateFormat ? client.dateFormat.toUpperCase() : '';

  for (const work of works) {
    convertedWorks.push(formatTrackData({ client, work, trackIsrcsById, dateFormat }));
    convertedAlternateTitles.push(...formatAlternateTitles({ work }));
    convertedParticipators.push(...formatParticipators({ work, contractsById }));
    convertedSpecificParticipationRates.push(...formatSpecificParticipationRates({ work, contractsById, territoryGroupsById }));
    convertedSocietyIdentifiers.push(...formatSocietyIdentifiers({ work }));
    convertedIpChains.push(...formatRightsChains({ work, territoryGroupsById, composersById, publishersById }));

    if (client.features?.partnerChains) {
      convertedPartnerIpChains.push(...formatPartnerChains({ work, territoryGroupsById, composersById, publishersById, deliveryPartnersById }));
    }
  }

  return [
    convertedWorks,
    convertedAlternateTitles,
    convertedParticipators,
    convertedSpecificParticipationRates,
    convertedSocietyIdentifiers,
    convertedIpChains,
    convertedPartnerIpChains,
  ];
}

function formatTrackData({
  client,
  work,
  trackIsrcsById,
  dateFormat,
}: {
  client: ClientDoc;
  work: WorkDoc;
  trackIsrcsById: Record<string, string>;
  dateFormat: string;
}): CsvRow {
  const aliases = (work.aliases ?? []).join(';');
  const isrcs = (work.trackIds ?? [])
    .map((id) => trackIsrcsById[id])
    .filter(Boolean)
    .join(';');
  const territories =
    (work.territories ?? []).length >= TerritoryHelper.allTerritories.length
      ? 'WW'
      : (work.territories ?? []).join(';');

  return client.paymentTier === 'Lite'
    ? [
        work._id.toString(),
        fixEncoding(work.title),
        fixEncoding(work.composer),
        fixEncoding(work.foreignId),
        fixEncoding(work.projectId),
        fixEncoding(work.partyNo),
        fixEncoding(work.identifier),
        fixEncoding(work.iswc),
        fixEncoding(work.tunecode),
        work.copyrightDate ? moment(work.copyrightDate).format(dateFormat) : null,
        work.labelCopy as string,
        fixEncoding(work.performers?.join(';')),
        isrcs,
        territories,
        (work.catalogueGroups ?? []).join(';'),
        aliases,
        work.notes?.replace(/[\r\n]+/g, ' '),
      ]
    : [
        work._id.toString(),
        fixEncoding(work.title),
        fixEncoding(work.composer),
        fixEncoding(work.foreignId),
        fixEncoding(work.projectId),
        fixEncoding(work.partyNo),
        fixEncoding(work.identifier),
        fixEncoding(work.iswc),
        fixEncoding(work.tunecode),
        work.copyrightDate ? moment(work.copyrightDate).format(dateFormat) : null,
        work.labelCopy as string,
        work.priority as string,
        work.productionLibrary as string,
        work.workDescriptionCategory as string,
        work.workLanguage as string,
        work.compositeType as string,
        work.compositeCount as string,
        work.versionType as string,
        work.arrangementType as string,
        work.lyricAdaptionType as string,
        fixEncoding(work.performers?.join(';')),
        isrcs,
        territories,
        (work.catalogueGroups ?? []).join(';'),
        aliases,
        work.notes?.replace(/[\r\n]+/g, ' '),
      ];
}

function formatAlternateTitles({ work }: { work: WorkDoc }): CsvRow[] {
  return (work.alternateTitles ?? []).map((title) => [
    work._id.toString(),
    fixEncoding(work.title),
    fixEncoding(work.identifier),
    fixEncoding(work.tunecode),
    title.title,
    title.language,
  ]);
}

function formatParticipators({
  work,
  contractsById,
}: {
  work: WorkDoc;
  contractsById: Record<string, ContractDoc>;
}): CsvRow[] {
  if (!work.salesReturnsRights?.length) return [];

  const rights: CsvRow[] = [];
  for (const right of work.salesReturnsRights) {
    if (!right.contractId) continue;
    const contract = contractsById[right.contractId];
    if (!contract) throw new Error(`Contract with ID ${right.contractId} not found in salesReturnsRights`);
    rights.push([
      work._id.toString(),
      fixEncoding(work.title),
      fixEncoding(work.identifier),
      fixEncoding(work.tunecode),
      fixEncoding(contract.name),
      right.percentage,
    ]);
  }
  return rights;
}

function formatSpecificParticipationRates({
  work,
  contractsById,
  territoryGroupsById,
}: {
  work: WorkDoc;
  contractsById: Record<string, ContractDoc>;
  territoryGroupsById: Record<string, TerritoryGroupDoc>;
}): CsvRow[] {
  if (!work.channelSpecificSalesReturnsRights?.length) return [];

  const rights: CsvRow[] = [];
  for (const right of work.channelSpecificSalesReturnsRights) {
    if (!right.contractId) continue;
    const contract = contractsById[right.contractId];
    if (!contract) throw new Error(`Contract with ID ${right.contractId} not found in channelSpecificSalesReturnsRights`);
    const territoryGroup = Types.ObjectId.isValid(right.territory)
      ? territoryGroupsById[right.territory!]
      : null;
    rights.push([
      work._id.toString(),
      fixEncoding(work.title),
      fixEncoding(work.identifier),
      fixEncoding(work.tunecode),
      fixEncoding(contract.name),
      right.distributionChannel,
      right.source,
      territoryGroup ? territoryGroup.name : right.territory,
      right.percentage,
    ]);
  }
  return rights;
}

function formatSocietyIdentifiers({ work }: { work: WorkDoc }): CsvRow[] {
  return (work.societyIdentifiers ?? []).map((identifier) => [
    work._id.toString(),
    fixEncoding(work.title),
    fixEncoding(work.identifier),
    fixEncoding(work.tunecode),
    identifier.society,
    identifier.identifier,
  ]);
}

function formatRightsChains({
  work,
  territoryGroupsById,
  composersById,
  publishersById,
}: {
  work: WorkDoc;
  territoryGroupsById: Record<string, TerritoryGroupDoc>;
  composersById: Record<string, ComposerDoc>;
  publishersById: Record<string, PublisherDoc>;
}): CsvRow[] {
  if (!work.rightsChain?.length) return [];

  const chains: CsvRow[] = [];
  for (const chain of work.rightsChain as Parameters<typeof mapChainTerritories>[0]['chain'][]) {
    const mappedTerritory = mapChainTerritories({ chain, territoryGroupsById });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any).territory = mappedTerritory;

    let exportChains = deconstructChain(1, {}, chain);
    exportChains = combineComposerChains(exportChains);
    splitIpChainValues(exportChains);
    populateComposersPublishers(exportChains, composersById, publishersById);
    chains.push(...formatChains(work as Record<string, unknown>, exportChains));
  }
  return chains;
}

function formatPartnerChains({
  work,
  territoryGroupsById,
  composersById,
  publishersById,
  deliveryPartnersById,
}: {
  work: WorkDoc;
  territoryGroupsById: Record<string, TerritoryGroupDoc>;
  composersById: Record<string, ComposerDoc>;
  publishersById: Record<string, PublisherDoc>;
  deliveryPartnersById: Record<string, DeliveryPartnerDoc>;
}): CsvRow[] {
  if (!work.partnerRightsChains?.length) return [];

  const chains: CsvRow[] = [];
  for (const { rightsChain, deliveryPartnerId } of work.partnerRightsChains) {
    if (!rightsChain) continue;
    for (const chain of rightsChain as Parameters<typeof mapChainTerritories>[0]['chain'][]) {
      const mappedTerritory = mapChainTerritories({ chain, territoryGroupsById });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chain as any).territory = mappedTerritory;

      let exportChains = deconstructChain(1, {}, chain);
      exportChains = combineComposerChains(exportChains);
      splitIpChainValues(exportChains);
      populateComposersPublishers(exportChains, composersById, publishersById);

      const partnerName = deliveryPartnerId && deliveryPartnersById[deliveryPartnerId]
        ? deliveryPartnersById[deliveryPartnerId].name ?? 'Unknown Partner'
        : 'Unknown Partner';

      const formattedChain = formatChains(work as Record<string, unknown>, exportChains);
      formattedChain.forEach((row) => row.splice(5, 0, partnerName));
      chains.push(...formattedChain);
    }
  }
  return chains;
}

function fixEncoding(str: string | undefined): string | undefined {
  if (typeof str !== 'string' || str.length === 0) return str;
  if (/[-￿]/.test(str)) {
    try {
      return fixUtf8(str) as string;
    } catch {
      return str;
    }
  }
  return str;
}
