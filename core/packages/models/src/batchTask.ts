import { Schema } from 'mongoose';

export type BatchTask = {
  clientId: string;
  complete: Date;
  error: unknown;
  limit: number;
  name: string;
  offset: number;
  periodId: string;
  processId: number;
  retryCount: number;
  runType: string;
  started: Date;
  status: string;
  value: unknown;
  batchWorkerId: string;
};

const batchTask = new Schema<BatchTask>(
  {
    clientId: String,
    complete: Date,
    error: Schema.Types.Mixed,
    limit: Number,
    name: String,
    offset: Number,
    periodId: String,
    processId: Number,
    retryCount: { type: Number, default: 0 },
    runType: String,
    started: Date,
    status: { type: String, default: 'Pending' },
    value: Schema.Types.Mixed,
    batchWorkerId: String,
  },
  {
    timestamps: true,
  }
);

export default { name: 'BatchTask', schema: batchTask };
