import { Schema } from 'mongoose';

export type TerritoryGroup = {
  clientId: string;
  name: string;
  territories: unknown[];
};

const territoryGroup = new Schema<TerritoryGroup>(
  {
    clientId: String,
    name: String,
    territories: Array,
  },
  {
    timestamps: true,
  },
);

export default { name: 'TerritoryGroup', schema: territoryGroup };
