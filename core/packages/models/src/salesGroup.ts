import { Schema } from 'mongoose';

export type SalesGroup = {
  clientId: string;
  type: 'suspense' | 'resolved';
  name: string;
  totalSalesLines: number,
};

const salesGroup = new Schema<SalesGroup>(
  {
    clientId: String,
    type: {
      type: String,
      enum: ['suspense', 'resolved'],
      required: true,
    },
    name: String,
    totalSalesLines: Number,
  },
  {
    timestamps: true,
  },
);

// Indexes
salesGroup.index({ clientId: 1, type: 1 });
salesGroup.index({ clientId: 1, name: 1 });
export default { name: 'SalesGroup', schema: salesGroup };
