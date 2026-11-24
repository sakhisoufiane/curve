import { Schema, Types } from 'mongoose';

export type McpsNegative = {
  clientId: string;
  periodId: string;
  year: number;
  accountingPeriod: string;
  releaseId: string;
  releaseTitle: string;
  releaseCatNo: string;
  territory: string;
  value: number;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const mcpsNegative = new Schema<McpsNegative>(
  {
    clientId: String,
    periodId: String,
    year: Number,
    accountingPeriod: String,
    releaseId: String,
    releaseTitle: String,
    releaseCatNo: String,
    territory: String,
    value: Number,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'McpsNegative', schema: mcpsNegative };
