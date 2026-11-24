import { Schema, Types } from 'mongoose';
import paymentProvidersSchema from './paymentProvidersSchema';

export type Payee = {
  clientId: string;
  name: string;
  alternateName: string;
  email: string;
  openingBalance: number;
  minPayout: number;
  selfBilling: boolean;
  autoPayment: boolean;
  payeeBalanceCurrency: string;
  payeeCategories: unknown[];
  foreignId: string;
  projectId: string;
  supplierCode: string;
  contactEmail: string;
  address: string;
  country: string;
  vatNo: string;
  bankName: string;
  bankAddress: string;
  accountNo: string;
  sortCode: string;
  iban: string;
  notes: string;
  duplicatedFrom: string;
  selfBillingTaxText: string;
  selfBillingTaxRate: number;
  feesInvoiceTaxRate: number;
  withholdingTaxRate: number;
  withholdingTaxWording: string;
  paymentEmail: string;
  paymentCurrency: string;
  swiftCode: string;
  paymentProviders: unknown;
  statements: unknown;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  valid: boolean;
  validationErrors: unknown[];
};

const payee = new Schema<Payee>(
  {
    clientId: String,
    name: { type: String, required: true },
    alternateName: String,
    email: String,
    openingBalance: { type: Number, default: 0 },
    minPayout: { type: Number, default: 0 },
    selfBilling: { type: Boolean, default: false },
    autoPayment: { type: Boolean, default: false },
    payeeBalanceCurrency: String,
    payeeCategories: Array,
    foreignId: String,
    projectId: String,
    supplierCode: String,
    contactEmail: String,
    address: String,
    country: String,
    vatNo: String,
    bankName: String,
    bankAddress: String,
    accountNo: String,
    sortCode: String,
    iban: String,
    notes: String,
    duplicatedFrom: String,
    selfBillingTaxText: String,
    selfBillingTaxRate: Number,
    feesInvoiceTaxRate: Number,
    withholdingTaxRate: Number,
    withholdingTaxWording: String,
    paymentEmail: String,
    paymentCurrency: String,
    swiftCode: String,
    paymentProviders: {
      type: paymentProvidersSchema.schema,
      default: { tipalti: {}, wise: {} },
    },
    statements: { type: Object, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    valid: { type: Boolean, default: false },
    validationErrors: Array,
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Payee', schema: payee };
