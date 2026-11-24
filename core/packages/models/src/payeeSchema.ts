import { Schema } from 'mongoose';

export type PayeeSchema = {
  payeeId: string;
  percentage: number;
};

const payeeSchema = new Schema<PayeeSchema>(
  {
    payeeId: String,
    percentage: { type: Number, default: 100 },
  },
  { _id: false },
);

export default { name: 'PayeeSchema', schema: payeeSchema };
