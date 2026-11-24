import { Schema, Types } from 'mongoose';
import workSchema from './work';

export type RemovedDuplicateWork = {
  clientId: Types.ObjectId;
  mergedByUserId: Types.ObjectId;
  mergedIntoWorkId: Types.ObjectId;
  mergedWithWorkIds: Types.ObjectId[];
  originalWorkId: Types.ObjectId;
  originalWork: typeof workSchema.schema;
};

const removedDuplicateWork = new Schema<RemovedDuplicateWork>(
  {
    clientId: { type: Schema.Types.ObjectId, required: true, ref: 'Client' },
    mergedByUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    mergedIntoWorkId: { type: Schema.Types.ObjectId, required: true, ref: 'Work' },
    mergedWithWorkIds: [{ type: Schema.Types.ObjectId }],
    originalWorkId: { type: Schema.Types.ObjectId, required: true },
    originalWork: { type: workSchema.schema, required: true },
  },
  {
    timestamps: true,
  }
);

export default { name: 'RemovedDuplicateWork', schema: removedDuplicateWork };
