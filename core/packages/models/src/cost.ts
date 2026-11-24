import { Schema, Types } from 'mongoose';

export type Cost = {
  amount: number;
  archived: boolean;
  calculationContractIds: unknown[];
  clientId: string;
  contractIds: Types.ObjectId[];
  createdBy: Types.ObjectId;
  currency: string;
  date: Date;
  description: string;
  file: string;
  files: unknown[];
  invoiceNo: string;
  lastModifiedBy: Types.ObjectId;
  name: string;
  periodIds: unknown[];
  publicLink: string;
  releaseIds: Types.ObjectId[];
  reportedStatus: string;
  targetPeriod: string;
  territory: string;
  territoryName: string;
  trackIds: Types.ObjectId[];
  type: string;
  workIds: Types.ObjectId[];
};

const cost = new Schema<Cost>(
  {
    amount: Number,
    archived: { type: Boolean, default: false },
    calculationContractIds: Array,
    clientId: String,
    contractIds: [{ type: Schema.Types.ObjectId, ref: 'Contract' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    currency: { type: String, default: 'Home Currency' },
    date: Date,
    description: String,
    file: String,
    files: Array,
    invoiceNo: String,
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    periodIds: Array,
    publicLink: String,
    releaseIds: [{ type: Schema.Types.ObjectId, ref: 'Release' }],
    reportedStatus: { type: String, default: 'Unreported' },
    targetPeriod: String,
    territory: String,
    territoryName: String,
    trackIds: [{ type: Schema.Types.ObjectId, ref: 'Track' }],
    type: { type: String, required: true },
    workIds: [{ type: Schema.Types.ObjectId, ref: 'Work' }],
  },
  {
    timestamps: true,
  },
);

export default { name: 'Cost', schema: cost };
