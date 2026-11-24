import { Schema } from 'mongoose';

export type PayeeTransaction = {
  clientId: string;
  name: string;
  payeeId: string;
  periodId: string;
  contractId: string;
  statementId: string;
  type: string;
  date: Date;
  amountInOriginalCurrency: number;
  amountInPayeeCurrency: number;
  originalCurrency: string;
  currency: string;
  userCreated: boolean;
  isPayment: boolean;
  published: boolean;
  invoiceNo: string;
  description: string;
};

const payeeTransaction = new Schema<PayeeTransaction>(
  {
    clientId: { type: String, required: true },
    name: { type: String, required: true },
    payeeId: { type: String, required: true },
    periodId: String,
    contractId: String,
    statementId: String,
    type: {
      type: String,
      enum: [
        'Payment',
        'Royalties',
        'Advance',
        'Other',
        'Period Transfer',
        'Tax',
      ],
    },
    date: { type: Date, required: true },
    amountInOriginalCurrency: { type: Number, default: 0 },
    amountInPayeeCurrency: { type: Number, default: 0 },
    originalCurrency: { type: String, required: true },
    currency: { type: String, required: true },
    userCreated: { type: Boolean, required: true },
    isPayment: Boolean,
    published: { type: Boolean, default: false },
    invoiceNo: String,
    description: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'PayeeTransaction', schema: payeeTransaction };
