export interface HDR {
  transactionSequence: string;
  recordSequence: string;
  senderType: string;
  senderId: string;
  senderName: string;
  standardVersionNumber: string;
  creationDate: string;
  creationTime: string;
  transmissionDate: string;
  characterSet: string;
  originalFile: string;
  senderIpNameNumber: string;
};

interface MDS {
  transactionSequence: string;
  recordSequence: string;
  mdsIdentifier: string;
  typeOfShareStructure: string;
  paymentRuleIndicator: string;
  workStatusStartDate: string;
  workStatusEndDate: string;
};
export interface MDRRecord {
  transactionSequence: string;
  recordSequence: string;
  rightCode: string;
  typeOfRightCategory: string;
};
interface MDTRecord {
  transactionSequence: string;
  recordSequence: string;
  interestTerritoryTisn: string;
  interestTerritoryTisnValidFromDate: string;
  interestTerritoryTisan: string;
  interestTerritoryTisanValidFromDate: string;
  includeExclude: string;
};
interface MIPRecord {
  transactionSequence: string;
  recordSequence: string;
  interestedPartyNumber: string;
  ipSociety: string;
  ipRole: string;
  shareNumerator: string;
  shareDenominator: string;
  sharePercentage: string;
  nationalAgreementNumber: string;
  nationalAdministratorNumber: string;
  contractIndicator: string;
};
export interface ADJRecord {
  transactionSequence: string;
  recordSequence: string;
  referenceIdentifier: string;
  originalReferenceIdentifier: string;
  originalDistributionIdentifier: string;
  originalInterestedPartyNumber: string;
  originalIpName: string;
  originalIpFirstName: string;
  incorrectShareNumerator: string;
  incorrectShareDenominator: string;
  incorrectSharePercentage: string;
  correctShareNumerator: string;
  correctShareDenominator: string;
  correctSharePercentage: string;
  adjustmentReasonCode: string;
  adjustmentReasonCommentary: string;
  adjustmentReferenceNumber: string;
  adjustmentAmount: string;
  adjustmentAmountSign: string;
  originalDistributionCategoryType: string;
  originalContainerIdentifier: string;
  adjustmentCurrency: string;
};

interface RoyaltyRecordBase {
  transactionSequence: string;
  recordSequence: string;
  referenceIdentifier: string;
  distributionCategoryType: string;
  exploitationSourceIdentifier: string;
  quantity: string;
  aggregationPeriodType: string;
  nationalGroupingIdentifier: string;
  currency: string;
  grossRoyaltyAmount: string;
  taxRate: string;
  taxAmount: string;
  commissionAmount: string;
  sourceSociety: string;
  sourceSocietyTaxAmount: string;
  sourceSocietyCommissionAmount: string;
  remittedRoyaltyAmount: string;
};

// Shared fields between WEP and WEA
interface WepWeaBase extends RoyaltyRecordBase {
  exploitationTime: string;
  surveyType: string;
  dayOfWeekCode: string;
  basisOfRateCalculation: string;
  exploitationDate: string;
};

export interface WEP extends WepWeaBase {
  type: 'WEP';
  performingArtistLastName: string;
  performingArtistFirstName: string;
  minuteSecondPointValue: string;
  bonusLevelPerformanceIndicator: string;
  isrc: string;
};

export interface WEA extends WepWeaBase {
  type: 'WEA';
  societyAvWorkIdentifier: string;
  origin: string;
  cueSequence: string;
  duration: string;
  productCatalogueNumber: string;
};

export interface WER extends RoyaltyRecordBase {
  type: 'WER';
  recordedProductNumber: string;
  countryOfLicensingTerritoryCode: string;
  countryOfLicensingTerritoryCodeValidFromDate: string;
  countryOfLicensingTerritoryAbbreviatedName: string;
  countryOfLicensingTerritoryAbbreviatedNameValidFromDate: string;
  basePriceType: string;
  saleType: string;
  salesPeriodEnd: string;
  royaltyBasisPrice: string;
  trackCountryOfOriginTerritoryCode: string;
  trackCountryOfOriginTerritoryCodeValidFromDate: string;
  trackCountryOfOriginTerritoryAbbreviatedName: string;
  trackCountryOfOriginTerritoryAbbreviated: string;
  duration: string;
  trackSharePercentage: string;
  commissionRate: string;
  salesPeriodStart: string;
  isrc: string;
};

type RoyaltyRecord = WEP | WEA | WER;

export interface WorkDistRecord {
  MDS?: MDS;
  MDR?: MDRRecord[];
  MDT?: MDTRecord[];
  MIP?: MIPRecord[];
  ADJ?: ADJRecord[];
  royalties?: Record<string, RoyaltyRecord>;
};

interface OIPRecord {
  transactionSequence: string;
  recordSequence: string;
  otherIpName: string;
  otherIpFirstName: string;
  otherIpDescription: string;
};

export interface MWNRecord {
  transactionSequence?: string;
  recordSequence?: string;
  societyWorkIdentifier?: string;
  originalWorkTitle?: string;
  localWorkTitle?: string;
  iswc?: string;
  compositeWorkIndicator?: string;
  compositeWorkIdentifier?: string;
  compositeWorkTitle?: string;
  workPercentageOfComposite?: string;
  instrumentalOrVocalUse?: string;
  musicalWorkDistributionCategoryGenre?: string;
  opusNumber?: string;
  songCodeOfPublisher?: string;
  workDist?: Array<WorkDistRecord>;
  OIP?: Array<OIPRecord>;
};

interface ESIRecord {
  transactionSequence: string;
  recordSequence: string;
  exploitationSourceIdentifier: string;
  exploitationSourceName: string;
  exploitationSourceType: string;
  exploitationTerritoryCode: string;
  exploitationTerritoryCodeValidFromDate: string;
  exploitationTerritoryAbbreviatedName: string;
  exploitationTerritoryAbbreviatedNameValidFromDate: string;
};
interface IPIRecord {
  transactionSequence: string;
  recordSequence: string;
  interestedPartyNumber: string;
  genericTypeOfIp: string;
  ipNameNumber: string;
  ipName: string;
  ipFirstName: string;
};
interface APIRecord {
  transactionSequence: string;
  recordSequence: string;
  societyAvWorkIdentifier: string;
  avIndexNumber: string;
  type: string;
  avWorkCategory: string;
  avWorkTitle: string;
  localAvWorkTitle: string;
  originalEpisodeTitle: string;
  localEpisodeTitle: string;
  originalEpisodeNumber: string;
  localEpisodeNumber: string;
  producerName: string;
  directorName: string;
  actorName: string;
  totalDuration: string;
  musicDuration: string;
  protectedMusicDuration: string;
  countryOfOriginTerritoryCode: string;
  countryOfOriginTerritoryCodeValidFromDate: string;
  countryOfOriginTerritoryAbbreviatedName: string;
  countryOfOriginTerritoryAbbreviatedNameValidFromDate: string;
  yearOfProduction: string;
  isanIdentifier: string;
};
export interface RPIRecord {
  transactionSequence: string;
  recordSequence: string;
  recordedProductIdentifier: string;
  eanUpcCode: string;
  productCatalogueNumber: string;
  soundCarrierType: string;
  soundCarrierTitle: string;
  soundCarrierCountryOfOriginTerritoryCode: string;
  soundCarrierCountryOfOriginTerritoryCodeValidFromDate: string;
  soundCarrierCountryOfOriginTerritoryAbbreviatedName: string;
  soundCarrierCountryOfOriginTerritoryAbbreviatedNameValidFromDate: string;
  productTracks: string;
  packQuantity: string;
  itemTracks: string;
  trackProrateBasis: string;
  productTotalDuration: string;
  productMusicDuration: string;
  releaseDate: string;
};

export interface SDN {
  transactionSequence?: string;
  recordSequence?: string;
  remittingSocietyDistributionIdentifier?: string;
  typeOfRightCategory?: string;
  accountingPeriodStart?: string;
  accountingPeriodEnd?: string;
  recipientSocietyPublisherCode?: string;
  nameOfRecipient?: string;
  bankPaymentDate?: string;
  amountDecimalPlaces?: number;
  percentageDecimalPlaces?: string;
  versionNumber?: string;
  remittanceCurrency?: string;
  ESI?: Record<string, ESIRecord>;
  IPI?: Record<string, IPIRecord>;
  API?: Record<string, APIRecord>;
  RPI?: Record<string, RPIRecord>;
};

export interface CrdData {
  HDR?: HDR;
  MWN: Record<string, MWNRecord>;
  SDN: SDN;
};
