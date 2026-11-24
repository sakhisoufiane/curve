import { Schema } from 'mongoose';

export type Transaction = {
  clientId: string;
  contractId: string;
  payeeId: string;
  statementId: string;
  name: string;
  type: string;
  description: string;
  date: Date;
  amount: number;
  userCreated: boolean;
  isReserveRelease: boolean;
  isReserveWithholding: boolean;
  isPayment: boolean;
  invoiceNo: string;
  transferringStatementId: string;
  sourceContractId?: string;
  destinationContractId?: string;
};

const transaction = new Schema<Transaction>(
  {
    clientId: { type: String, required: true },
    contractId: { type: String, required: true },
    payeeId: String,
    statementId: String,
    name: { type: String, required: true },
    type: String,
    description: String,
    date: { type: Date, required: true },
    amount: { type: Number, default: 0 },
    userCreated: { type: Boolean, required: true },
    isReserveRelease: Boolean,
    isReserveWithholding: Boolean,
    isPayment: Boolean,
    invoiceNo: String,
    transferringStatementId: String,
    sourceContractId: String,
    destinationContractId: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'Transaction', schema: transaction };
