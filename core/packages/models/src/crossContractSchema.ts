import { Schema } from 'mongoose';

export type CrossContractSchema = {
  condition: string;
  process: string;
  contractId: string;
  percentage: number;
  whenAutoPaymentTriggered: boolean;
};

const crossContractSchema = new Schema<CrossContractSchema>(
  {
    // @ts-expect-error No ID generated so not included in type
    _id: false,
    condition: String,
    process: String,
    contractId: String,
    percentage: Number,
    whenAutoPaymentTriggered: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export default { name: 'CrossContractSchema', schema: crossContractSchema };
