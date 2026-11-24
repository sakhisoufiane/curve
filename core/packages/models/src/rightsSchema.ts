import { Schema } from 'mongoose';

export type RightsSchema = {
  contractId: string;
  percentage: number;
  displayPercentage: number;
};

const rightsSchema = new Schema<RightsSchema>({
  contractId: String,
  percentage: Number,
  displayPercentage: Number,
});

export default { name: 'RightsSchema', schema: rightsSchema };
