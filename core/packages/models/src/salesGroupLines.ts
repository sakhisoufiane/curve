import { Schema, Types } from 'mongoose';

export type SalesGroupLines = {
  clientId: string;
  type: 'suspense' | 'resolved';
  salesGroupId: Types.ObjectId;
  salesFileId: Types.ObjectId;
  salesLineIds: string[];
 }

const salesGroupLines = new Schema<SalesGroupLines>(
  {
    clientId: String,
    type: {
      type: String,
      enum: ['suspense', 'resolved'],
      required: true,
    },
    salesGroupId: { type: Schema.Types.ObjectId, ref: 'SalesGroup' },
    salesFileId: { type: Schema.Types.ObjectId, ref: 'SalesFile' },
    salesLineIds: [{ type: String }],    
  },
  {
    timestamps: true,
  },
);
// Indexes
salesGroupLines.index({ clientId: 1, salesGroupId: 1, type: 1, salesFileId: 1 });
salesGroupLines.index({ clientId: 1, salesFileId: 1, type: 1 });
export default { name: 'SalesGroupLines', schema: salesGroupLines };
