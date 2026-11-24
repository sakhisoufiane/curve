import { Schema } from 'mongoose';

export type SubClient = {
  clientId: string;
  name: string;
  subOrgId: string;
};

const subClient = new Schema<SubClient>(
  {
    clientId: String,
    name: String,
    subOrgId: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'SubClient', schema: subClient };
