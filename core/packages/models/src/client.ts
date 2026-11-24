import { Schema, Types } from 'mongoose';
import ackFtpIngestionSchema from './ackFtpIngestionSchema';
import iswcFtpIngestionSchema from './iswcFtpIngestionSchema';
import paymentProvidersSchema from './paymentProvidersSchema';
import salesFtpIngestionSchema from './salesFtpIngestionSchema';

export type Client = {
  accountingPeriodMappings: {
    distributionChannels: unknown[];
    distributionFees: unknown[];
    configurations: unknown[];
    priceCategories: unknown[];
    sources: unknown[];
    subSources: unknown[];
    costs: unknown[];
    accounts: unknown[];
  };
  accountingPeriodTypes: unknown[];
  accountingSystem: string;
  ackFtpIngestions: unknown[];
  address: string;
  allowPeriodFilters: boolean;
  autoApproveWorks: boolean;
  batchWorkers: number;
  bigQueryAccountingPeriodSales: string;
  bigQueryBackupsDataset: string;
  bigQueryDataset: string;
  bigQueryOldPeriodSales: string;
  bigQueryOldSalesTable: string;
  bigQueryPeriodCosts: string;
  bigQueryPeriodSales: string;
  bigQuerySalesTable: string;
  bigQueryTransferCostBq: number;
  bigQueryTransferCostMongo: number;
  bigQueryTransferInputBq: number;
  bigQueryTransferInputMongo: number;
  bigQueryTransferOutputBq: number;
  bigQueryTransferOutputMongo: number;
  bigQueryTransferred: boolean;
  billing: {
    companyName: string;
    billingType: string;
    amount: number;
    stripeCustomerId: string;
    stripePaymentMethod: string;
    address1: string;
    address2: string;
    city: string;
    postcode: string;
    country: string;
    vatNo: string;
    dayOfMonth: number;
    lastPaymentDate: Date;
    lastPaymentFailure: string;
    currency: string;
    additionalCharge: number;
  };
  billingFrequency: string;
  bulkTemplatesComplete: boolean;
  caStatRates: unknown;
  calculationFrequency: string;
  cancelledSubscription: boolean;
  catalogueCap: number;
  catalogueGroups: unknown[];
  catalogueOverages: number;
  ccCommunicationEmail: string;
  clientType: string;
  companyName: string;
  concurrentCalculations: number;
  concurrentStatementCreations: number;
  configurations: unknown[];
  contractCap: number;
  contractCategories: unknown[];
  contractOverages: number;
  copiedAt: Date;
  costTypes: unknown[];
  costsReportTemplate: string;
  createdBigQueryBackups: boolean;
  createdBigQueryTables: boolean;
  createdBy: Types.ObjectId;
  currency: string;
  currency2: string;
  currency3: string;
  currency4: string;
  currencySymbol: string;
  customDeductionName: string;
  customFeesInvoiceTitle: string;
  customSupportEmail: string;
  cwrPartyId: string;
  cwrPartyName: string;
  cypressClient: boolean;
  dateFormat: string;
  ddexIngestionClientId: string;
  defaultMechanicalBasis: string;
  defaultReportMechanicals: boolean;
  deliveryEmails: unknown[];
  displaySeparatedDeductions: boolean;
  distributionChannels: unknown[];
  duplicateReleases: unknown[];
  duplicateTracks: unknown[];
  duplicateWorks: unknown[];
  email: string;
  encryptionKey: string;
  eventTriggeredNotifications: {
    contractEndDate: unknown[];
    collectionEndDate: unknown[];
    retentionPeriodEndDate: unknown[];
    payeePaymentDetailsAdded: unknown[];
    payeePaymentDetailsUpdated: unknown[];
    paymentFailed: unknown[];
    fundsAdded: unknown[];
  };
  features: {
    accounting: boolean;
    apiUser: boolean;
    fugaApiUser: boolean;
    companies: boolean;
    complexCrossContracts: boolean;
    complexSalesTerms: boolean;
    crossContracts: boolean;
    deductionTerms: boolean;
    deliveries: boolean;
    demo: boolean;
    dmp: boolean;
    escalations: boolean;
    enableLinkedContractsInIpChain: boolean;
    ftpIngestion: boolean;
    mcps: boolean;
    mechanicals: boolean;
    multicurrency: boolean;
    payments: boolean;
    paymentSetup: boolean;
    profitShareClassic: boolean;
    selfBilling: boolean;
    settingsConfigurationArea: boolean;
    summaryStatements: boolean;
    termGroups: boolean;
    withholdingTax: boolean;
    userSso: boolean;
    fixedReports: boolean;
    iswcDeliveries: boolean;
    showFugaSyncExtras: boolean;
    platformSalesIngestion: boolean;
    distributorFeedDdex: boolean;
    updateIPI: boolean;
    payeeBalances: boolean;
    includeSummaryStatementSalesFTP: boolean;
    paymentDetails: boolean;
    partnerChains: boolean;
    unreportedFileV2: boolean;
    enableAutoPaymentTaxBasisFix: boolean;
    releaseAnalyticsForTrackSales: boolean;
    suspense: boolean;
    refactoredSalesCalculation: boolean;
    coreChains: boolean;
    useAlternativeId: boolean;
    fugaPublishStatementsToCloudStorage: boolean;
    largeCatalogueHandling: boolean;
    enhancedParticipationRates: boolean;
  };
  operations: {
    hypercare: boolean;
    salesOutputTempTable: boolean;
  };
  fees: number;
  feesInvoiceCustomText: string;
  ftpHost: string;
  ftpImportDefaultDistributionChannel: string;
  ftpNoDdexBatches: boolean;
  ftpPassword: string;
  ftpRootDir: string;
  ftpUsername: string;
  ftpProtocol: 'FTP' | 'SFTP';
  ftpPort: number;
  ftpAuthenticationType: 'Password' | 'Key File';
  ftpFileKey: string;
  fugaIntegration: {
    fugaOrgId: string;
    fugaAutoSyncEnabled: boolean;
    fugaAutoIngestSales: boolean;
    fugaCurrentlySyncing: boolean;
    fugaLastSync: Date;
    fugaClientType: string;
    fugaClientName: string;
    fugaNotifyEmails: string[];
    defaultDistributionChannel: string;
    matchContractsOnImport: boolean;
    setDefaultReleaseIdOnImport: boolean;
    ingestForeignIdsFromDelivery: boolean;
    setCatNoFromBarcodeOnImport: boolean;
    statementNotifications: string;
  };
  fugaSplitType: string;
  glAccounts: unknown[];
  homeCurrency: string;
  howToIngestOtherIdsOnImport: string;
  identifierPrefix: string;
  identifierStartFrom: number;
  ingestForeignIds: boolean;
  ingestedSalesFiles: unknown[];
  inheritCatalogueFrom: unknown[];
  inheritPayees: boolean;
  inviteEmailCustomText: string;
  ipiNo: string;
  issueIdentifier: boolean;
  iswcFtpIngestions: unknown[];
  lastModifiedBy: Types.ObjectId;
  lockedForNonPayment: boolean;
  logo: string;
  matchContractOnImport: boolean;
  mcpsConsignmentTargets: unknown[];
  mcpsExcludedCatGroups: unknown[];
  mcpsFreeGoodsTargets: unknown[];
  mcpsId: string;
  mcpsInternationalBasis: string;
  mcpsMinPerUnitRate: number;
  mcpsReturnsNegativeSales: boolean;
  mcpsReturnsTargets: unknown[];
  mcpsTargets: unknown[];
  monthlyPrice: number;
  name: string;
  notes: string;
  overagesCount: string;
  overagesFee: string;
  parentId: string;
  payeeCategories: unknown[];
  payeeIds: unknown[];
  payeeSummaryText: string;
  paymentProviders: unknown;
  paymentTier: string;
  periodCostsDatabaseTable: string;
  periodSalesDatabaseTable: string;
  phone: string;
  preventDeletion: boolean;
  priceCategories: unknown[];
  primaryEmail: string;
  publicLogo: string;
  qaClient: boolean;
  releaseMappings: unknown;
  restricted: boolean;
  salesDatabaseTable: string;
  salesFtpIngestions: unknown[];
  salesReportTemplate: string;
  selfBillingTaxCustomText: string;
  selfBillingTaxText: string;
  setDefaultReleaseIdOnImport: boolean;
  sortCalculations: boolean;
  sources: unknown[];
  statementCustomText: string;
  statementDesign: string;
  statementEmailCustomText: string;
  statementHeaderType: string;
  statementIncludeTotalsRow: boolean;
  statementOfAccountCustomText: string;
  suppressStatementOfAccount: boolean;
  suppressZeroTaxLine: boolean;
  suppressZeroValueInExport: boolean;
  trackMappings: unknown;
  trialDays: number;
  tsAndCsAcceptedBy: string;
  tsAndCsAcceptedDate: Date;
  usStatRates: unknown;
  useBarcodeAsCatNoOnImport: boolean;
  ddexDoNotUpdateExistingLabel: boolean;
  vatNo: string;
  workMappings: unknown;
  coreChains?: {
    defaults?: {
      category: string;
      performanceOwnership: number;
      mechanicalOwnership: number;
      mechanicalCollection: number;
      performanceCollection: number;
    };
  };
};

const client = new Schema<Client>(
  {
    accountingPeriodMappings: {
      distributionChannels: Array,
      distributionFees: Array,
      configurations: Array,
      priceCategories: Array,
      sources: Array,
      subSources: Array,
      costs: Array,
      accounts: Array,
    },
    accountingPeriodTypes: {
      type: Array,
      default: ['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly'],
    },
    accountingSystem: String,
    ackFtpIngestions: [ackFtpIngestionSchema.schema],
    address: String,
    allowPeriodFilters: { type: Boolean, default: true },
    autoApproveWorks: Boolean,
    batchWorkers: { type: Number, default: 0 },
    bigQueryAccountingPeriodSales: String,
    bigQueryBackupsDataset: String,
    bigQueryDataset: String,
    bigQueryOldPeriodSales: String,
    bigQueryOldSalesTable: String,
    bigQueryPeriodCosts: String,
    bigQueryPeriodSales: String,
    bigQuerySalesTable: String,
    bigQueryTransferCostBq: Number,
    bigQueryTransferCostMongo: Number,
    bigQueryTransferInputBq: Number,
    bigQueryTransferInputMongo: Number,
    bigQueryTransferOutputBq: Number,
    bigQueryTransferOutputMongo: Number,
    bigQueryTransferred: Boolean,
    billing: {
      companyName: String,
      billingType: String,
      amount: Number,
      stripeCustomerId: String,
      stripePaymentMethod: String,
      address1: String,
      address2: String,
      city: String,
      postcode: String,
      country: String,
      vatNo: String,
      dayOfMonth: { type: Number, default: 1 },
      lastPaymentDate: Date,
      lastPaymentFailure: String,
      currency: String,
      additionalCharge: Number,
    },
    billingFrequency: String,
    bulkTemplatesComplete: { type: Boolean, default: false },
    caStatRates: {
      type: [
        {
          _id: false,
          startDate: Date,
          minAmount: Number,
          perMinuteRate: Number,
        },
      ],
      default: [
        {
          startDate: '2009-03-01T00:00:00.000+00:00',
          minAmount: 0.083,
          perMinuteRate: 0.0166,
        },
      ],
    },
    calculationFrequency: String,
    cancelledSubscription: { type: Boolean, default: false },
    catalogueCap: Number,
    catalogueGroups: Array,
    catalogueOverages: Number,
    ccCommunicationEmail: String,
    clientType: String,
    companyName: String,
    concurrentCalculations: { type: Number, default: 1 },
    concurrentStatementCreations: { type: Number, default: 3 },
    configurations: Array,
    contractCap: Number,
    contractCategories: Array,
    contractOverages: Number,
    copiedAt: Date,
    costTypes: Array,
    costsReportTemplate: String,
    createdBigQueryBackups: Boolean,
    createdBigQueryTables: Boolean,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    currency: String,
    currency2: String,
    currency3: String,
    currency4: String,
    currencySymbol: String,
    customDeductionName: String,
    customFeesInvoiceTitle: String,
    customSupportEmail: String,
    cwrPartyId: String,
    cwrPartyName: String,
    cypressClient: { type: Boolean, default: false },
    dateFormat: { type: String, default: 'dd/MM/yyyy' },
    ddexIngestionClientId: String,
    defaultMechanicalBasis: { type: String, default: 'Sale Date' },
    defaultReportMechanicals: { type: Boolean, default: true },
    deliveryEmails: Array,
    displaySeparatedDeductions: Boolean,
    distributionChannels: Array,
    duplicateReleases: Array,
    duplicateTracks: Array,
    duplicateWorks: Array,
    email: String,
    encryptionKey: String,
    eventTriggeredNotifications: {
      contractEndDate: Array,
      collectionEndDate: Array,
      retentionPeriodEndDate: Array,
      payeePaymentDetailsAdded: Array,
      payeePaymentDetailsUpdated: Array,
      paymentFailed: Array,
      fundsAdded: Array,
    },
    features: {
      accounting: { type: Boolean, default: false },
      apiUser: { type: Boolean, default: false },
      fugaApiUser: { type: Boolean, default: false },
      companies: { type: Boolean, default: true },
      complexCrossContracts: { type: Boolean, default: false },
      complexSalesTerms: { type: Boolean, default: true },
      crossContracts: { type: Boolean, default: true },
      deductionTerms: { type: Boolean, default: true },
      deliveries: { type: Boolean, default: true },
      demo: { type: Boolean, default: true },
      dmp: { type: Boolean, default: false },
      escalations: { type: Boolean, default: true },
      enableLinkedContractsInIpChain: { type: Boolean, default: false },
      ftpIngestion: { type: Boolean, default: true },
      mcps: { type: Boolean, default: true },
      mechanicals: { type: Boolean, default: true },
      multicurrency: { type: Boolean, default: true },
      payments: { type: Boolean, default: false },
      paymentSetup: { type: Boolean, default: false },
      profitShareClassic: { type: Boolean, default: false },
      selfBilling: { type: Boolean, default: true },
      settingsConfigurationArea: { type: Boolean, default: true },
      summaryStatements: { type: Boolean, default: true },
      termGroups: { type: Boolean, default: true },
      withholdingTax: { type: Boolean, default: true },
      userSso: { type: Boolean, default: false },
      fixedReports: { type: Boolean, default: false },
      iswcDeliveries: { type: Boolean, default: false },
      showFugaSyncExtras: { type: Boolean, default: false },
      platformSalesIngestion: { type: Boolean, default: false },
      distributorFeedDdex: { type: Boolean, default: false },
      updateIPI: { type: Boolean, default: false },
      payeeBalances: { type: Boolean, default: false },
      includeSummaryStatementSalesFTP: { type: Boolean, default: false },
      paymentDetails: { type: Boolean, default: false },
      partnerChains: { type: Boolean, default: true },
      enableAutoPaymentTaxBasisFix: { type: Boolean, default: false },
      unreportedFileV2: { type: Boolean, default: false },
      releaseAnalyticsForTrackSales: { type: Boolean, default: false },
      suspense: { type: Boolean, default: false },
      refactoredSalesCalculation: { type: Boolean, default: false },
      coreChains: { type: Boolean, default: false },
      useAlternativeId: { type: Boolean, default: false },
      fugaPublishStatementsToCloudStorage: { type: Boolean, default: false },
      largeCatalogueHandling: { type: Boolean, default: false },
      enhancedParticipationRates: { type: Boolean, default: false },
    },
    operations: {
      // Where Clients require special attention and monitoring, this flag is set to true so we can get notified on Slack when running a period
      hypercare: { type: Boolean, default: false },
      // Use Sales Output Temp Table, this is the new optimal way to calculate sales during the period process
      salesOutputTempTable: { type: Boolean, default: false },
    },
    fees: Number,
    feesInvoiceCustomText: String,
    ftpHost: String,
    ftpImportDefaultDistributionChannel: String,
    ftpNoDdexBatches: Boolean,
    ftpPassword: String,
    ftpRootDir: String,
    ftpUsername: String,
    ftpProtocol: { type: String, default: 'FTP' },
    ftpPort: { type: Number, default: 21 },
    ftpAuthenticationType: { type: String, default: 'Password' },
    ftpFileKey: String,
    fugaIntegration: {
      fugaOrgId: String,
      fugaAutoSyncEnabled: { type: Boolean, default: false },
      fugaAutoIngestSales: { type: Boolean, default: false },
      fugaCurrentlySyncing: { type: Boolean, default: false },
      fugaLastSync: Date,
      fugaClientType: String,
      fugaClientName: String,
      fugaNotifyEmails: [String],
      defaultDistributionChannel: String,
      matchContractsOnImport: { type: Boolean, default: false },
      setDefaultReleaseIdOnImport: { type: Boolean, default: false },
      ingestForeignIdsFromDelivery: { type: Boolean, default: false },
      setCatNoFromBarcodeOnImport: { type: Boolean, default: false },
      statementNotifications: String,
    },
    fugaSplitType: String,
    glAccounts: Array,
    homeCurrency: String,
    howToIngestOtherIdsOnImport: {
      type: String,
      enum: {
        Never: '',
        CreateNewAlias: 'Create new alias',
        CreateNewTrack: 'Create new track',
      },
    },
    identifierPrefix: String,
    identifierStartFrom: { type: Number, default: 1 },
    ingestForeignIds: Boolean,
    ingestedSalesFiles: Array,
    inheritCatalogueFrom: Array,
    inheritPayees: Boolean,
    inviteEmailCustomText: String,
    ipiNo: String,
    issueIdentifier: Boolean,
    iswcFtpIngestions: [iswcFtpIngestionSchema.schema],
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedForNonPayment: { type: Boolean, default: false },
    logo: String,
    matchContractOnImport: Boolean,
    mcpsConsignmentTargets: Array,
    mcpsExcludedCatGroups: Array,
    mcpsFreeGoodsTargets: Array,
    mcpsId: String,
    mcpsInternationalBasis: { type: String, default: 'PPD' },
    mcpsMinPerUnitRate: Number,
    mcpsReturnsNegativeSales: Boolean,
    mcpsReturnsTargets: Array,
    mcpsTargets: Array,
    monthlyPrice: Number,
    name: { type: String, unique: true, required: true },
    notes: String,
    overagesCount: String,
    overagesFee: String,
    parentId: String,
    payeeCategories: Array,
    payeeIds: Array,
    payeeSummaryText: String,
    paymentProviders: {
      type: paymentProvidersSchema.schema,
      default: {
        selectedPaymentProvider: 'Standard CSV',
        tipalti: {},
        wise: {},
        curvePay: {},
      },
    },
    paymentTier: String,
    periodCostsDatabaseTable: String,
    periodSalesDatabaseTable: String,
    phone: String,
    preventDeletion: { type: Boolean, default: false },
    priceCategories: Array,
    primaryEmail: String,
    publicLogo: String,
    qaClient: { type: Boolean, default: false },
    releaseMappings: Schema.Types.Mixed,
    restricted: Boolean,
    salesDatabaseTable: String,
    salesFtpIngestions: [salesFtpIngestionSchema.schema],
    salesReportTemplate: String,
    selfBillingTaxCustomText: String,
    selfBillingTaxText: String,
    setDefaultReleaseIdOnImport: Boolean,
    sortCalculations: { type: Boolean, default: false },
    sources: Array,
    statementCustomText: String,
    statementDesign: String,
    statementEmailCustomText: String,
    statementHeaderType: { type: String, default: 'Standard' },
    statementIncludeTotalsRow: Boolean,
    statementOfAccountCustomText: String,
    suppressStatementOfAccount: Boolean,
    suppressZeroTaxLine: Boolean,
    suppressZeroValueInExport: Boolean,
    trackMappings: Schema.Types.Mixed,
    trialDays: { type: Number, default: 14 },
    tsAndCsAcceptedBy: String,
    tsAndCsAcceptedDate: Date,
    usStatRates: {
      type: [
        {
          _id: false,
          startDate: Date,
          minAmount: Number,
          perMinuteRate: Number,
        },
      ],
      default: [
        {
          startDate: '2009-03-01T00:00:00.000+00:00',
          minAmount: 0.091,
          perMinuteRate: 0.0175,
        },
        {
          startDate: '2023-01-01T00:00:00.000+00:00',
          minAmount: 0.12,
          perMinuteRate: 0.0231,
        },
        {
          startDate: '2024-01-01T00:00:00.000+00:00',
          minAmount: 0.124,
          perMinuteRate: 0.0238,
        },
        {
          startDate: '2025-01-01T00:00:00.000+00:00',
          minAmount: 0.127,
          perMinuteRate: 0.0245,
        },
        {
          startDate: '2026-01-01T00:00:00.000+00:00',
          minAmount: 0.131,
          perMinuteRate: 0.0252,
        },
      ],
    },
    useBarcodeAsCatNoOnImport: Boolean,
    ddexDoNotUpdateExistingLabel: Boolean,
    vatNo: String,
    workMappings: Schema.Types.Mixed,
    coreChains: {
      defaults: {
        category: {
          type: String,
        },
        performanceOwnership: {
          type: Number,
          default: 0,
        },
        mechanicalOwnership: {
          type: Number,
          default: 0,
        },
        mechanicalCollection: {
          type: Number,
          default: 0,
        },
        performanceCollection: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

export default { name: 'Client', schema: client };
