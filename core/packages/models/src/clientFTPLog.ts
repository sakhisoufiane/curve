import { Schema } from 'mongoose';

export type ClientFTPLog = {
  clientId: string;
  ignoredFiles: unknown[];
};

const clientFTPLog = new Schema<ClientFTPLog>(
  {
    clientId: String,
    ignoredFiles: Array,
  },
  {
    timestamps: true,
  },
);

export default { name: 'ClientFTPLog', schema: clientFTPLog };
