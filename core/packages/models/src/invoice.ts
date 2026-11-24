import { Schema } from 'mongoose';

export type Invoice = {
  clientId: string;
  name: string;
  billingInfo: unknown;
  usage: unknown;
  date: Date;
  file: string;
  publicLink: string;
};

const invoice = new Schema<Invoice>(
  {
    clientId: String,
    name: String,
    billingInfo: Object,
    usage: Object,
    date: Date,
    file: String,
    publicLink: String,
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Invoice', schema: invoice };
