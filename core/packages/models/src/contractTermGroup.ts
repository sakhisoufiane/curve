import { Schema } from 'mongoose';

export type ContractTermGroup = {
  clientId: string;
  name: string;
  type: string;
  items: unknown[];
};

const contractTermGroup = new Schema<ContractTermGroup>(
  {
    clientId: String,
    name: String,
    type: String,
    items: Array,
  },
  {
    timestamps: true,
  },
);

export default { name: 'ContractTermGroup', schema: contractTermGroup };
