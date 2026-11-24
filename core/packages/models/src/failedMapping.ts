import { Schema } from 'mongoose';

export type FailedMapping = {
  clientId: string;
  salesFileId: string;
};

const failedMapping = new Schema<FailedMapping>(
  {
    clientId: String,
    salesFileId: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'FailedMapping', schema: failedMapping };
