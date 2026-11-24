import { Schema } from 'mongoose';

export type UnmappedRelease = {
  clientId: string;
  salesFileId: string;
  title: string;
  version: string;
  artist: string;
  catNo: string;
  barcode: string;
  releaseId: string;
  complete: boolean;
};

const unmappedRelease = new Schema<UnmappedRelease>(
  {
    clientId: String,
    salesFileId: String,
    title: String,
    version: String,
    artist: String,
    catNo: String,
    barcode: String,
    releaseId: String,
    complete: Boolean,
  },
  {
    timestamps: true,
  },
);

export default { name: 'UnmappedRelease', schema: unmappedRelease };
