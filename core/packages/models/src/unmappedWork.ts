import { Schema } from 'mongoose';

export type UnmappedWork = {
  clientId: string;
  salesFileId: string;
  identifier: string;
  tunecode: string;
  iswc: string;
  songcode: string;
  source: string;
  title: string;
  party1: string;
  party2: string;
  party3: string;
  party4: string;
  party5: string;
  workId: string;
  netAmount: number;
  complete: boolean;
};

const unmappedWork = new Schema<UnmappedWork>(
  {
    clientId: String,
    salesFileId: String,
    identifier: String,
    tunecode: String,
    iswc: String,
    songcode: String,
    source: String,
    title: String,
    party1: String,
    party2: String,
    party3: String,
    party4: String,
    party5: String,
    workId: String,
    netAmount: Number,
    complete: Boolean,
  },
  {
    timestamps: true,
  },
);

export default { name: 'UnmappedWork', schema: unmappedWork };
