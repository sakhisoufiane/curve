import { Schema, Types } from 'mongoose';
import calculationNotesSchema from './calculationNotesSchema';

export type Period = {
  clientId: string;
  name: string;
  setupStage: string;
  year: number;
  accountingPeriod: string;
  accountingPeriodType: string;
  startDate: Date;
  endDate: Date;
  accountingDate: Date;
  forceFull: boolean;
  recalculation: unknown;
  calculationLog: unknown[];
  exchangeRates: unknown;
  currencyExchangeRates: unknown[];
  status: string;
  contractType: string;
  calculationStatus: string;
  calculationError: unknown;
  processStartTime: Date;
  processEndTime: Date;
  salesFilesIds: unknown[];
  resolvedGroupIds: string[];
  resolvedGroupSalesFileIds: string[];
  resolvedGroupSalesPartitionNos: number[];
  costIds: unknown[];
  usedReleaseIds: unknown[];
  usedTrackIds: unknown[];
  usedWorkIds: unknown[];
  totalContractsForCalculation: number;
  units: number;
  grossAmount: number;
  netAmount: number;
  grossCosts: number;
  netCosts: number;
  lines: number;
  valid: boolean;
  invalidLines: number;
  completedCatalogueItems: number;
  completedCostCatalogueItems: number;
  allCalculatedSalesCsv: string;
  allCalculatedSalesCsvPublicLink: string;
  allCalculatedCostsCsv: string;
  allCalculatedCostsCsvPublicLink: string;
  unreportedSalesCsvLastRun: Date;
  unreportedCostsCsvLastRun: Date;
  unreportedSalesCsv: string;
  unreportedSalesCsvPublicLink: string;
  unreportedCostsCsv: string;
  unreportedCostsCsvPublicLink: string;
  suspenseCsv: string;
  suspenseCsvPublicLink: string;
  escalationStartingFigures: unknown[];
  generalLedgerSummary: string;
  generalLedgerSummaryPublicLink: string;
  customStatement: string;
  customStatementPublicLink: string;
  statementsZip: string;
  statementsZipPublicLink: string;
  analysis: unknown;
  runNo: number;
  locked: boolean;
  skipDateValidation: boolean;
  calculationNotes: unknown[];
  platoon: {
    fileNumberLast: number;
    summaryNumber: number;
    files: unknown[];
    unreportedFileUsed: string;
    unreportedAddedToFile: boolean;
    unreportedFileOutput: string;
    unreportedFileCreated: Date;
  };
  dmpIngestData: string;
  sqsBatchQueue: string;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  fuga: {
    blockedStatus: boolean;
  };
  salesPartitionNos: unknown[];
  usedContractIds: unknown[];
  // All Sales Exports
  salesExportFileKeys: string[];
  salesExportZipsPublicLinks: string[];
  statementSalesExportFileKeys: string[];
  statementSalesExportZipsPublicLinks: string[];
  // Output Table
  salesOutputTable: string;
};

const period = new Schema<Period>(
  {
    clientId: String,
    name: String,
    setupStage: String,
    year: Number,
    accountingPeriod: String,
    accountingPeriodType: String,
    startDate: Date,
    endDate: Date,
    accountingDate: Date,
    forceFull: { type: Boolean, default: false },
    recalculation: Object,
    calculationLog: Array,
    exchangeRates: { type: Object, default: {} }, // This is to be removed over time, left in for previous periods that may have used it
    currencyExchangeRates: [
      new Schema({ from: String, to: String, rate: Number }),
    ],
    status: String,
    contractType: { type: String, default: 'Standard' },
    calculationStatus: String,
    calculationError: Schema.Types.Mixed,
    processStartTime: Date,
    processEndTime: Date,
    salesFilesIds: Array,
    resolvedGroupIds: [String],
    resolvedGroupSalesFileIds: [String],
    resolvedGroupSalesPartitionNos: [Number],
    costIds: Array,
    usedReleaseIds: Array,
    usedTrackIds: Array,
    usedWorkIds: Array,
    totalContractsForCalculation: Number,
    units: Number,
    grossAmount: Number,
    netAmount: Number,
    grossCosts: Number,
    netCosts: Number,
    lines: Number,
    valid: Boolean,
    invalidLines: Number,
    completedCatalogueItems: { type: Number, default: 0 },
    completedCostCatalogueItems: { type: Number, default: 0 },
    allCalculatedSalesCsv: String,
    allCalculatedSalesCsvPublicLink: String,
    allCalculatedCostsCsv: String,
    allCalculatedCostsCsvPublicLink: String,
    unreportedSalesCsv: String,
    unreportedSalesCsvPublicLink: String,
    unreportedCostsCsv: String,
    unreportedCostsCsvPublicLink: String,
    unreportedSalesCsvLastRun: Date,
    unreportedCostsCsvLastRun: Date,
    suspenseCsv: String,
    suspenseCsvPublicLink: String,
    escalationStartingFigures: Array,
    generalLedgerSummary: String,
    generalLedgerSummaryPublicLink: String,
    customStatement: String,
    customStatementPublicLink: String,
    statementsZip: String,
    statementsZipPublicLink: String,
    analysis: Schema.Types.Mixed,
    runNo: { type: Number, default: 0 },
    locked: { type: Boolean, default: false },
    skipDateValidation: Boolean,
    calculationNotes: [calculationNotesSchema.schema],
    platoon: {
      fileNumberLast: { type: Number, default: 0 },
      summaryNumber: { type: Number, default: 1 },
      files: Array,
      unreportedFileUsed: String,
      unreportedAddedToFile: { type: Boolean, default: false },
      unreportedFileOutput: String,
      unreportedFileCreated: Date,
    },
    dmpIngestData: String,
    sqsBatchQueue: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    fuga: {
      blockedStatus: { type: Boolean, default: false },
    },
    salesPartitionNos: Array,
    usedContractIds: Array,
    // All Sales Exports
    // Zipped combined CSV exports that contain all Sales Lines, not grouped by Statement
    salesExportFileKeys: [String],
    // Public link version of salesExportFileKeys (7 day expiry from generated date)
    salesExportZipsPublicLinks: [String],
    // Zipped CSV exports of Sales Lines grouped by Statement (CSV per Statement)
    statementSalesExportFileKeys: [String],
    // Public link version of statementSalesExportFileKeys (7 day expiry from generated date)
    statementSalesExportZipsPublicLinks: [String],
    // Output Table
    salesOutputTable: String,
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  },
);

export default { name: 'Period', schema: period };
