import { curveApi } from './http';

export interface WorksParams {
  text?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  catalogueGroups?: string[];
  contractIds?: string[];
  composerIds?: string[];
  publisherIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  approvalStatus?: string;
  onHold?: boolean;
  identifiers?: string[];
  participation?: { symbol: string; value: number };
  ownership?: { symbol: string; value: number };
}

interface WorkPartyRef {
  _id: string;
  name: string;
  linkedContracts: string[];
}

interface WorkRightsChainNode {
  type: 'Publisher' | 'Composer' | string;
  contractType?: string;
  controlled?: boolean;
  mechanicalCollection?: number;
  mechanicalOwnership?: number;
  performanceCollection?: number;
  performanceOwnership?: number;
  children?: WorkRightsChainNode[];
  publisherId?: string;
  publisher?: WorkPartyRef;
  composerId?: string;
  caeNumber?: string;
  cae?: string;
  name?: string;
  composer?: WorkPartyRef;
}

interface WorkRightsChainTerritory {
  territory: string;
  children?: WorkRightsChainNode[];
  totalMechanicalOwnership?: number;
  totalPerformanceOwnership?: number;
  totalMechanicalCollection?: number;
  totalPerformanceCollection?: number;
  mechanicalOwnership?: number;
  performanceOwnership?: number;
  mechanicalCollection?: number;
  performanceCollection?: number;
}

interface WorkPartnerRightsChain {
  deliveryPartnerId: string;
  rightsChain: WorkRightsChainTerritory[];
}

interface WorkCompositeWork {
  _id: string;
  title: string;
  source: string;
}

export interface AlternateTitle {
  title: string;
  language: string | null;
}

export interface Performer {
  name: string;
}

interface WorkSignificantUpdate {
  _id: string;
  date: string;
  deliveryPartnerId: string;
}

export interface Work {
  _id: string;
  clientId?: string;
  title?: string;
  foreignId?: string;
  iswc?: string;
  composer?: string;
  partyNo?: number;
  projectId?: string;
  tunecode?: string;
  labelCopy?: string;
  notes?: string;
  priority?: boolean;
  productionLibrary?: boolean;
  compositeCount?: number;
  workLanguage?: string | null;
  cdIdentifier?: string;
  cutNo?: string | null;
  libraryTitle?: string;
  productionTitle?: string;
  workDescriptionCategory?: string;
  compositeType?: string;
  versionType?: string;
  arrangementType?: string;
  lyricAdaptionType?: string;
  originalWorkTitle?: string;
  originalIswc?: string;
  originalWorkSource?: string;
  originalWorkWriterLastName?: string;
  originalWorkWriterFirstName?: string;
  valid?: boolean;
  validationErrors?: string[];
  approvalStatus?: string;
  onHold?: boolean;
  enablePublisherMapping?: boolean;
  territories?: string[];
  trackIds?: string[];
  catalogueGroups?: string[];
  alternateTitles?: AlternateTitle[];
  performers?: Performer[];
  aliases?: unknown[];
  salesReturnsRights?: unknown[];
  salesReturnsRightsDisplay?: unknown[];
  channelSpecificSalesReturnsRights?: unknown[];
  costsRights?: unknown[];
  societyIdentifiers?: unknown[];
  compositeWorks?: WorkCompositeWork[];
  rightsChain?: WorkRightsChainTerritory[];
  partnerRightsChains?: WorkPartnerRightsChain[];
  coreChain?: unknown[];
  significantUpdateToPartnerChains?: WorkSignificantUpdate[];
  source?: unknown[];
  deliveredTo?: unknown[];
  lastModifiedBy?: { _id: string; email: string };
  copyrightDate?: string;
  createdAt?: string;
  updatedAt?: string;
  // List API aggregate fields
  identifier?: string;
  totalCollection?: { totalOwnedMechanical: number };
  totalParticipation?: number;
}

export interface WorksMeta {
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface WorksResponse {
  works: Work[];
  meta: WorksMeta;
}

export type WorkFormData = {
  // Core identifiers
  title: string;
  composer?: string;
  foreignId?: string;
  projectId?: string;
  identifier?: string;
  iswc?: string;
  tunecode?: string;
  copyrightDate?: string;
  labelCopy?: string;
  notes?: string;
  alternateTitles?: AlternateTitle[];

  performers?: Performer[];
  // Configuration
  priority?: boolean;
  productionLibrary?: boolean;
  workLanguage?: string;
  workDescriptionCategory?: string;
  compositeType?: string;
  compositeWorks?: Array<{ title: string; source: string }>;
  // Library (shown when productionLibrary is true)
  libraryTitle?: string;
  productionTitle?: string;
  cdIdentifier?: string;
  cutNo?: string;
  // Modification
  versionType?: string;
  arrangementType?: string;
  lyricAdaptionType?: string;
  originalWorkTitle?: string;
  originalIswc?: string;
  originalWorkSource?: string;
  originalWorkWriterLastName?: string;
  originalWorkWriterFirstName?: string;
  // Rights
  enablePublisherMapping?: boolean;
  // Complex fields — managed via setValue() by their respective tab components
  territories?: string[];
  rightsChain?: Work['rightsChain'];
};

const getWorks = async (params: WorksParams = {}): Promise<WorksResponse> => {
  const response = await curveApi.post('/works/get_works', params);
  return response.data;
};

const getWork = async (id: string): Promise<Work> => {
  const response = await curveApi.get(`/works/${id}`);
  return response.data;
};

const createWork = async (data: WorkFormData): Promise<Work> => {
  const response = await curveApi.post('/works', data);
  return response.data;
};

const updateWork = async (id: string, data: Partial<WorkFormData>): Promise<Work> => {
  const response = await curveApi.put(`/works/${id}`, data);
  return response.data;
};

// TODO: wire up real endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const deleteWork = async (_id: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
};

export const worksApi = {
  getWorks,
  getWork,
  createWork,
  updateWork,
  deleteWork,
};
