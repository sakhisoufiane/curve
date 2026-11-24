import { Schema } from 'mongoose';

export type InsertionTerritorySchema = {
  territory: string;
  publisherId: string;
  category: string;
};

const insertionTerritorySchema = new Schema<InsertionTerritorySchema>(
  {
    territory: String,
    publisherId: String,
    category: String,
  },
  { _id: false },
);

export default {
  name: 'InsertionTerritorySchema',
  schema: insertionTerritorySchema,
};
