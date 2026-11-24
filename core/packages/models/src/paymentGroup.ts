import { Schema, Types } from 'mongoose';

export type PaymentGroup = {
  clientId: string;
  periodId: string;
  status: string;
  name: string;
  totalPayments: number;
  totalPaid: number;
  totalRemaining: number;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const paymentGroup = new Schema<PaymentGroup>(
  {
    clientId: String,
    periodId: String,
    status: { type: String, default: 'Unpaid' },
    name: { type: String, required: true },
    totalPayments: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalRemaining: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'PaymentGroup', schema: paymentGroup };
