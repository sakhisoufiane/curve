import type { ChainNode } from '../utils/ipchain';

export interface CurveUser {
  id: string;
  clientId: string;
  email: string;
}

export interface ImportFile {
  path: string;
  originalname: string;
}

export interface TemplateEntry {
  key: string;
  type?: 'Boolean' | 'Array' | 'Date' | 'Number';
  separator?: string;
  ignore?: boolean;
}

/** A row parsed from any import CSV sheet. */
export interface ImportRow {
  line?: number;
  _id?: string;
  title?: string;
  identifier?: string;
  tunecode?: string;
  index?: number;
  // Works fields
  composer?: string;
  foreignId?: string;
  projectId?: string;
  iswc?: string;
  copyrightDate?: Date | string;
  labelCopy?: string;
  priority?: boolean;
  productionLibrary?: boolean;
  compositeCount?: string;
  workDescriptionCategory?: string;
  workLanguage?: string;
  compositeType?: string;
  versionType?: string;
  arrangementType?: string;
  lyricAdaptionType?: string;
  notes?: string;
  // Array fields
  performers?: string[];
  trackIsrcs?: string[];
  territories?: string[];
  catalogueGroups?: string[];
  aliases?: string[];
  // Alternate titles
  altTitle?: string;
  language?: string;
  // Participators / specific rates
  contractName?: string;
  percentage?: number | string;
  distributionChannel?: string;
  source?: string;
  territory?: string;
  territoryCodes?: { name: string; codes: string[] };
  // Society identifiers
  society?: string;
  societyIdentifier?: string;
  // Partner chains
  partnerName?: string;
  // Dynamic fields (e.g. participant1Type … participant10Capacity)
  [key: string]: unknown;
}

/** Lookup map produced by turnArrayIntoIndexedObject. */
export type IndexedObject = Record<string, ImportRow[]>;

/** A single composer or publisher extracted from the IP-chain sheet. */
export interface IndexedParticipant {
  type: string;
  name: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  caeNumber?: string;
  controlled?: boolean;
  line: number;
  publisher?: Record<string, unknown>;
  composer?: Record<string, unknown>;
}

export type IndexedComposersPublishers = Record<string, IndexedParticipant>;

/** A territory entry in work.rightsChain. */
export interface ChainTerritory {
  territory: string;
  territoryCodes?: { name: string; codes: string[] };
  children: ChainNode[];
  line?: number;
}

/**
 * Pre-loaded Maps for Composer/Publisher lookup — one bulk DB query per
 * collection replaces per-participant findOne calls during chain processing.
 */
export interface ComposerPublisherMaps {
  publisherByCaeAndName: Map<string, Record<string, unknown>>;
  publisherByCae: Map<string, Record<string, unknown>>;
  publisherByName: Map<string, Record<string, unknown>>;
  composerByCae: Map<string, Record<string, unknown>>;
  composerByNameNoCae: Map<string, Record<string, unknown>>;
}

export interface WorkDataAccumulator {
  works?: string;
  alternateTitlesFile?: string;
  participatorsFile?: string;
  specificRightsFile?: string;
  societyIdentifiersFile?: string;
  ipChainFile?: string;
  partnerRightsChainsFile?: string;
  indexedComposersPublishers?: IndexedComposersPublishers;
  indexedPartnerComposersPublishers?: IndexedComposersPublishers;
}
