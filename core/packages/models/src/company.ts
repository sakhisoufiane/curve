import { Schema, Types } from 'mongoose';

export type Company = {
  address: string;
  clientId: string;
  companyName: string;
  costsReportTemplate: string;
  createdBy: Types.ObjectId;
  customDeductionName: string;
  displaySeparatedDeductions: boolean;
  email: string;
  foreignId: string;
  feesInvoiceCustomText: string;
  lastModifiedBy: Types.ObjectId;
  logo: string;
  name: string;
  phone: string;
  publicLogo: string;
  salesReportTemplate: string;
  selfBillingTaxCustomText: string;
  selfBillingTaxText: string;
  statementCustomText: string;
  statementDesign: string;
  statementHeaderType: string;
  statementIncludeTotalsRow: boolean;
  statementOfAccountCustomText: string;
  suppressStatementOfAccount: boolean;
  suppressZeroValueInExport: boolean;
  vatNo: string;
};

const company = new Schema<Company>(
  {
    address: String,
    clientId: String,
    companyName: String,
    costsReportTemplate: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    customDeductionName: String,
    displaySeparatedDeductions: Boolean,
    email: String,
    foreignId: String,
    feesInvoiceCustomText: String,
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    logo: String,
    name: { type: String, required: true },
    phone: String,
    publicLogo: String,
    salesReportTemplate: String,
    selfBillingTaxCustomText: String,
    selfBillingTaxText: String,
    statementCustomText: String,
    statementDesign: String,
    statementHeaderType: { type: String, default: 'Standard' },
    statementIncludeTotalsRow: Boolean,
    statementOfAccountCustomText: String,
    suppressStatementOfAccount: Boolean,
    suppressZeroValueInExport: Boolean,
    vatNo: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'Company', schema: company };
