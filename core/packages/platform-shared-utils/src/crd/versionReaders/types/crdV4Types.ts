interface Hdr {
  transactionSequenceNumber: string;
  recordType: 'HDR';
  codeOfRemittingSociety: string;
  nameOfRemittingSociety: string;
  codeOfReceivingCompany: string;
  nameOfReceivingCompany: string;
  creationDate: string;
  creationTime: string;
  transmissionDate: string;
  decimalPlacesAmountField: number;
  decimalPlacesRoyaltyFeeField: number;
  currency: string;
  versionNumber: string;
};

interface BaseRow {
  transactionSequenceNumber: string;
  distributionIdentificationCode: string;
  distributionCategory: string;
  IP1: string;
  IP2: string;
  IP3: string;
  IP4: string;
  IPINumber: string;
  signIndicator: string;
};

interface MchPrfAviBaseRow extends BaseRow {
  labelBroadcastChannel: string;
  originalTitle: string;
  subTitle: string;
  compositeWorkIndicator: string;
  indicatorForInstrumentalVocalUse: string;
  iswc: string;
  workCode: string;
  periodOfAccount: string;
  codeOfTerritory: string;
  territoryName: string;
  nameOfRightOwner: string;
  nationalNumberOfRightOwner: string;
  societyCodeOfRightOwner: string;
  categoryOfRightOwner: string;
  codeOfTypeOfShareStructure: string;
  shareNumerator: string;
  shareDenominator: string;
  sharePercentage: string;
  songCodeOfPublisher: string;
  shareAmountGross: string;
  sourceCollectingSocietyForeignIncome: string;
  commissionSourceCollectionSociety: string;
  commissionRemittingSociety: string;
  tax: string;
  shareAmountNet: string;
  percentageReceivedByTheRemittingSocietyForFeesPaidInError: string;
};

interface MchPrfBaseRow extends MchPrfAviBaseRow {
  isrc: string;
  // v4.01 only below
  invoiceNumber: string | null;
  originalInvoiceNumber: string | null;
  serviceType: string | null;
  licenseeNumber: string | null;
  usageCategory: string | null;
  uniqueSupplierID: string | null;
  productType: string | null;
  usageGroupCode: string | null;
};

interface MchRow extends MchPrfBaseRow {
  recordType: 'MCH';
  codeNameLicensee: string;
  EANUPCBarCode: string;
  catalogueNumber: string;
  configuration: string;
  titleOfSoundCarrier: string;
  artistName: string;
  releaseDate: string;
  numberOfTracks: string;
  numberOfSides: string;
  numberOfTracksPerSide: string;
  trackCalculationType: string;
  durationOfWork: string;
  durationOfProductMusicalworksOnly: string;
  durationOfProductInclNonMusicalWorks: string;
  shareTrackInPercent: string;
  quantity: string;
  basisPriceForLicensing: string;
  salesType: string;
  licensingRatePercent: string;
  royaltiesAvailableForDistribution: string;
  romeRuleIndicator: string;
  royaltyFee: string;
  totalGrossAmountPerSale: string;
  referenceNumberDistributionRecord: string;
  sourceType: string;
  sourceDescription: string;
};

interface PrfRow extends MchPrfBaseRow {
  recordType: 'PRF';
  numberOfPerformancesBroadcasts: string;
  broadcastStationCount: string;
  surveyType: string;
  timeOfDay: string;
  dayOfWeek: string;
  usageIndicator: string;
  bonusLevelPerformanceIndicator: string;
  royaltiesAvailableForDistributionForTheWork: string;
  basisOfRateOfCalculation: string;
  ratePerBroadcast: string;
  warsawRuleIndicator: string;
  referenceNumber: string;
  // v4.01 only below
  titleOfProductProduction: string | null;
  catalogueNumber: string | null;
  artist: string | null;
  venue: string | null;
  performanceDate: string | null;
};

interface AviRow extends MchPrfAviBaseRow {
  recordType: 'AVI';
  airDate: string;
  audioVisualWorkCode: string;
  isan: string;
  audioVisualWorkType: string;
  audioVisualWorkCategory: string;
  nameOfProducer: string;
  yearOfProductionOrRelease: string;
  nameOfDirector: string;
  leadingActor: string;
  countryOfOriginOfTheAVWork: string;
  originalTitleOfTheAVWork: string;
  localTitleOfTheAVWork: string;
  originalTitleOfTheEpisode: string;
  localTitleOfTheEpisode: string;
  producerEpisodeNumber: string;
  societyEpisodeNumber: string;
  totalDurationOfTheAVWork: string;
  totalDurationOfTheMusic: string;
  totalDurationOfTheProtectedMusic: string;
  totalMusicDuration: string;
  originOfWorkOrCue: string;
  sequenceNumberOfWorkOrCue: string;
  durationOfWorkOrCue: string;
  numberOfPerformancesBroadcasts: string;
  broadcastStationCount: string;
  surveyType: string;
  timeOfDayAired: string;
  dayOfWeekFactor: string;
  usageIndicator: string;
  bonusLevelPerformanceIndicator: string;
  royaltiesAvailableForDistributionForTheWork: string;
  basisOfRateOfCalculation: string;
  ratePerBroadcast: string;
  warsawRuleIndicator: string;
  totalGrossAmountPerBroadcast: string;
  referenceNumber: string;
};

interface AdjRow extends BaseRow {
  recordType: 'ADJ';
  adjustmentType: string;
  originalReferenceNumber: string;
  workTitle: string;
  workNo: string;
  usageCode: string;
  usageDescription: string;
  productionCatalogueNo: string;
  periodStartDate: string;
  periodEndDate: string;
  noOfPerformances: string;
  totalDuration: string;
  oldShareNumerator: string;
  oldShareDenominator: string;
  oldSharePercentage: string;
  newShareNumerator: string;
  newShareDenominator: string;
  newSharePercentage: string;
  netAdjustmentValue: string;
  adjustmentReason: string;
  invoiceRefNo: string;
  adjustmentRefNo: string;
};

export interface CrdData4 {
  hdr?: Hdr;
  rows: Array<MchRow | PrfRow | AviRow | AdjRow>;
};
