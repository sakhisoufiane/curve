import { Schema, Types } from 'mongoose';

export type AccountingPeriod = {
  accountingDate: Date;
  accountingPeriod: string;
  adjustmentGrossAmount: number;
  adjustmentLines: number;
  adjustmentNetAmount: number;
  adjustmentSummaryCsv: string;
  adjustmentSummaryCsvPublicLink: string;
  allAdjustmentsCsv: string;
  allAdjustmentsCsvPublicLink: string;
  allCalculatedSalesCsv: string;
  allCalculatedSalesCsvPublicLink: string;
  analysis: unknown;
  calculationError: unknown;
  calculationStatus: string;
  clientId: string;
  createdBy: Types.ObjectId;
  deliveries: {
    filename: string;
    status: string;
    error: string;
    date: Date;
  }[];
  grossAmount: number;
  grossCosts: number;
  lastModifiedBy: Types.ObjectId;
  lines: number;
  locked: unknown;
  mappingsCsv: string;
  mappingsCsvPublicLink: string;
  name: string;
  netAmount: number;
  netCosts: number;
  outputType: string;
  outputZip: string;
  outputZipPublicLink: string;
  partitionNo: number;
  periodId: string;
  processEndTime: Date;
  processStartTime: Date;
  reportCsv: string;
  reportCsvPublicLink: string;
  runNo: number;
  salesFilesIds: unknown[];
  salesInputAmount: number;
  salesPartitionNos: unknown[];
  separatedFiles: unknown[];
  setupStage: string;
  status: string;
  suspenseGrossAmount: number;
  suspenseLines: number;
  suspenseNetAmount: number;
  suspenseSummaryCsv: string;
  suspenseSummaryCsvPublicLink: string;
  uniqueValues: {
    accountCodes: unknown[];
    contractIds: unknown[];
    territories: unknown[];
    sources: unknown[];
    fileOutputs: unknown[];
  };
  unreportedSalesCsv: string;
  unreportedSalesCsvPublicLink: string;
  year: number;
};

const accountingPeriod = new Schema<AccountingPeriod>(
  {
    accountingDate: Date,
    accountingPeriod: String,
    adjustmentGrossAmount: Number,
    adjustmentLines: Number,
    adjustmentNetAmount: Number,
    adjustmentSummaryCsv: String,
    adjustmentSummaryCsvPublicLink: String,
    allAdjustmentsCsv: String,
    allAdjustmentsCsvPublicLink: String,
    allCalculatedSalesCsv: String,
    allCalculatedSalesCsvPublicLink: String,
    analysis: Schema.Types.Mixed,
    calculationError: Schema.Types.Mixed,
    calculationStatus: String,
    clientId: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveries: [
      {
        _id: false,
        filename: String,
        status: String,
        error: String,
        date: Date,
      },
    ],
    grossAmount: Number,
    grossCosts: Number,
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lines: Number,
    locked: Boolean,
    mappingsCsv: String,
    mappingsCsvPublicLink: String,
    name: String,
    netAmount: Number,
    netCosts: Number,
    outputType: String,
    outputZip: String,
    outputZipPublicLink: String,
    partitionNo: Number,
    periodId: String,
    processEndTime: Date,
    processStartTime: Date,
    reportCsv: String,
    reportCsvPublicLink: String,
    runNo: { type: Number, default: 0 },
    salesFilesIds: Array,
    salesInputAmount: Number,
    salesPartitionNos: Array,
    separatedFiles: Array,
    setupStage: String,
    status: String,
    suspenseGrossAmount: Number,
    suspenseLines: Number,
    suspenseNetAmount: Number,
    suspenseSummaryCsv: String,
    suspenseSummaryCsvPublicLink: String,
    uniqueValues: {
      accountCodes: Array,
      contractIds: Array,
      territories: Array,
      sources: Array,
      fileOutputs: Array,
    },
    unreportedSalesCsv: String,
    unreportedSalesCsvPublicLink: String,
    year: Number,
  },
  {
    timestamps: true,
  },
);

export default { name: 'AccountingPeriod', schema: accountingPeriod };
