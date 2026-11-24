import { Schema } from 'mongoose';

export type ReleaseSpecificRightsSchema = {
  releaseId: string;
  contractId: string;
  percentage: number;
};

const releaseSpecificRightsSchema = new Schema<ReleaseSpecificRightsSchema>({
  releaseId: String,
  contractId: String,
  percentage: Number,
});

export default {
  name: 'ReleaseSpecificRightsSchema',
  schema: releaseSpecificRightsSchema,
};
