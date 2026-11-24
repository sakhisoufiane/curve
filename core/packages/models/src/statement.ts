import { Schema, Types } from 'mongoose';

export type Statement = {
  clientId: string;
  periodId: string;
  contractId: string;
  partitionNo: number;
  name: string;
  date: Date;
  year: number;
  accountingPeriod: string;
  periodType: string;
  status: string;
  salesFilesIds: unknown[];
  costIds: unknown[];
  releaseIds: unknown[];
  trackIds: unknown[];
  workIds: unknown[];
  openingBalance: number;
  openingValue: number;
  units: number;
  grossAmount: number;
  proRataGrossAmount: number;

  netAmount: number;
  grossCosts: number;
  netCosts: number;
  reservesWithheld: number;
  reservesReleased: number;
  taxBasis: number;
  withholdingTax: number;
  netOutput: number;
  closingBalance: number;
  lines: number;
  valid: boolean;
  invalidLines: number;
  allFilesZip: string;
  allFilesZipPublicLink: string;
  salesCsv: string;
  salesCsvPublicLink: string;
  costsCsv: string;
  costsCsvPublicLink: string;
  pdf: string;
  pdfPublicLink: string;
  statementOfAccount: string;
  statementOfAccountPublicLink: string;
  selfBillingInvoice: string;
  selfBillingInvoicePublicLink: string;
  feesInvoice: string;
  feesInvoicePublicLink: string;
  customStatement: string;
  customStatementPublicLink: string;
  platoonRevenueReport: string;
  platoonRevenueReportPublicLink: string;
  contractType: string;
  profitShareRate: number;
  profitShareBalance: number;
  profitShareNetAmount: number;
  profitShareUnrecoupedAdvanceStart: number;
  profitShareAdvanceRecouped: number;
  analysis: unknown;
  selfBillingInvoiceNo: number;
  feesInvoiceNo: number;
  selfBillingTaxRate: number;
  selfBillingTaxAmount: number;
  feesInvoiceTaxRate: number;
  feesInvoiceTaxAmount: number;
  payments: number;
  sendings: unknown[];
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  calculationStatus: string;
  calculationError: unknown;
  completedCatalogueItems: number;
  completedCostCatalogueItems: number;
  currency: string;
  locked: boolean;
  mechanicalDeduction: number;
  displaySeparatedDeductions: boolean;
  customDeductionName: string;
  deductionAmount: number;
  otherTransactions: number;
  autoPaymentTriggered: boolean;
  autoPaymentNotTriggeredReason: string;
};

const statement = new Schema<Statement>(
  {
    clientId: String,
    periodId: String,
    contractId: String,
    partitionNo: Number,
    name: String,
    date: Date,
    year: Number,
    accountingPeriod: String,
    periodType: String,
    status: String,
    salesFilesIds: Array,
    costIds: Array,
    releaseIds: Array,
    trackIds: Array,
    workIds: Array,
    openingBalance: { default: 0, type: Number },
    openingValue: Number,
    units: { default: 0, type: Number },
    grossAmount: { default: 0, type: Number },
    proRataGrossAmount: { default: 0, type: Number },
    netAmount: { default: 0, type: Number },
    grossCosts: { default: 0, type: Number },
    netCosts: { default: 0, type: Number },
    reservesWithheld: { default: 0, type: Number },
    reservesReleased: { default: 0, type: Number },
    taxBasis: { default: 0, type: Number },
    withholdingTax: { default: 0, type: Number },
    netOutput: { default: 0, type: Number },
    closingBalance: { default: 0, type: Number },
    lines: { default: 0, type: Number },
    valid: Boolean,
    invalidLines: { default: 0, type: Number },
    allFilesZip: String,
    allFilesZipPublicLink: String,
    salesCsv: String,
    salesCsvPublicLink: String,
    costsCsv: String,
    costsCsvPublicLink: String,
    pdf: String,
    pdfPublicLink: String,
    statementOfAccount: String,
    statementOfAccountPublicLink: String,
    selfBillingInvoice: String,
    selfBillingInvoicePublicLink: String,
    feesInvoice: String,
    feesInvoicePublicLink: String,
    customStatement: String,
    customStatementPublicLink: String,
    platoonRevenueReport: String,
    platoonRevenueReportPublicLink: String,
    contractType: String,
    profitShareRate: { default: 0, type: Number },
    profitShareBalance: { default: 0, type: Number },
    profitShareNetAmount: { default: 0, type: Number },
    profitShareUnrecoupedAdvanceStart: { default: 0, type: Number },
    profitShareAdvanceRecouped: { default: 0, type: Number },
    analysis: { type: Object, default: { gross: {}, net: {} } },
    selfBillingInvoiceNo: Number,
    feesInvoiceNo: Number,
    selfBillingTaxRate: { default: 0, type: Number },
    selfBillingTaxAmount: { default: 0, type: Number },
    feesInvoiceTaxRate: { default: 0, type: Number },
    feesInvoiceTaxAmount: { default: 0, type: Number },
    payments: { default: 0, type: Number },
    sendings: Array,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    calculationStatus: String,
    calculationError: Schema.Types.Mixed,
    completedCatalogueItems: { type: Number, default: 0 },
    completedCostCatalogueItems: { type: Number, default: 0 },
    currency: String,
    locked: { type: Boolean, default: false },
    mechanicalDeduction: Number,
    displaySeparatedDeductions: Boolean,
    customDeductionName: String,
    deductionAmount: Number,
    otherTransactions: { default: 0, type: Number },
    autoPaymentTriggered: Boolean,
    autoPaymentNotTriggeredReason: String,
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Statement', schema: statement };
