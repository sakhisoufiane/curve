import { Schema, Types } from 'mongoose';

export type McpsRetention = {
  clientId: string;
  periodId: string;
  year: number;
  accountingPeriod: string;
  releaseId: string;
  releaseTitle: string;
  releaseCatNo: string;
  territory: string;
  retention: number;
  tvRetention: number;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const mcpsRetention = new Schema<McpsRetention>(
  {
    clientId: String,
    periodId: String,
    year: Number,
    accountingPeriod: String,
    releaseId: String,
    releaseTitle: String,
    releaseCatNo: String,
    territory: String,
    retention: Number,
    tvRetention: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'McpsRetention', schema: mcpsRetention };
