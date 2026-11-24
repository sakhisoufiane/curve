import { Schema } from 'mongoose';

export type BulkSplits = {
  name: string;
  clientId: string;
  organisationId: string;
  status: 'Pending' | 'In Progress' | 'Complete' | 'Errored';
  filter: unknown;
  count: number;
  updatedCount: number;
  type: 'import' | 'export';
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  fugaUserEmail?: string;
  file?: string;
  fileKey?: string;
  errorFile?: string;
  errorFileKey?: string;
  errorMessage?: string;
};

const bulkSplits = new Schema<BulkSplits>(
  {
    name: { type: String, required: true },
    clientId: { type: String, required: true },
    organisationId: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['Pending', 'In Progress', 'Complete', 'Errored'],
      default: 'Pending'
    },
    filter: { type: Schema.Types.Mixed, default: {} },
    count: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    type: { 
      type: String, 
      enum: ['import', 'export'],
      required: true
    },
    updatedBy: { type: String, required: true },
    fugaUserEmail: String,
    file: String,
    fileKey: String,
    errorFile: String,
    errorFileKey: String,
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

export default { name: 'BulkSplits', schema: bulkSplits };