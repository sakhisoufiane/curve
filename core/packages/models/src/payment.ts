import { Schema, Types } from 'mongoose';

export type Payment = {
  clientId: string;
  paymentGroupId: string;
  statementId: string;
  contractId: string;
  payeeId: string;
  transactionId: string;
  status: string;
  paidAdditionalInfo: string;
  missingInfoReason: string;
  error: string;
  amount: number;
  paymentDate: string;
  name: string;
  paymentDetails: unknown;
  currency: string;
  refCode: string;
  uuid: string;
  errorLogs: unknown[];
  usRevenuePercentage: number;
  warnings: unknown[];
  exchanged: boolean;
  deleteTransactions: boolean;
  curvePayBatchId: string;
  withholdingTaxAmount: number;
  withholdingTaxCurrency: string;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const payment = new Schema<Payment>(
  {
    clientId: String,
    paymentGroupId: String,
    statementId: String,
    contractId: String,
    payeeId: String,
    transactionId: String,
    status: String,
    paidAdditionalInfo: String,
    missingInfoReason: String,
    error: String,
    amount: Number,
    paymentDate: String,
    name: String,
    paymentDetails: Object,
    currency: String,
    refCode: String,
    uuid: String,
    errorLogs: Array,
    usRevenuePercentage: { type: Number, min: 0, max: 100 },
    warnings: Array,
    exchanged: { type: Boolean, default: false },
    deleteTransactions: Boolean, // This is only for the pre remove validation
    curvePayBatchId: String,
    withholdingTaxAmount: { default: 0, type: Number },
    withholdingTaxCurrency: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

export default { name: 'Payment', schema: payment };
