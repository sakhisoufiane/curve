import { Schema } from 'mongoose';

export type IswcFtpIngestionSchema = {
  active: boolean;
  directory: string;
  host: string;
  lastSuccessfulCheck: Date;
  name: string;
  password: string;
  port: number;
  protocol: string;
  username: string;
};

const iswcFtpIngestionSchema = new Schema<IswcFtpIngestionSchema>({
  active: Boolean,
  directory: { type: String, default: '/', required: true },
  host: String,
  lastSuccessfulCheck: Date,
  name: String,
  password: String,
  port: { type: Number, default: 21, required: true },
  protocol: { type: String, default: 'FTP', required: true },
  username: String,
});

export default {
  name: 'IswcFtpIngestionSchema',
  schema: iswcFtpIngestionSchema,
};
