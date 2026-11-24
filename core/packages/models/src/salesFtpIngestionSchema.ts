import { Schema } from 'mongoose';

export type SalesFtpIngestionSchema = {
  active: boolean;
  directory: string;
  dsp: string;
  error: string;
  host: string;
  initialisedDate: Date;
  lastSuccessfulCheck: Date;
  name: string;
  password: string;
  port: number;
  protocol: string;
  recursive: boolean;
  retries: number;
  username: string;
};

const salesFtpIngestionSchema = new Schema<SalesFtpIngestionSchema>({
  // @ts-expect-error No ID generated so not included in type
  _id: false,
  active: Boolean,
  directory: { type: String, default: '/', required: true },
  dsp: String,
  error: String,
  host: String,
  initialisedDate: Date,
  lastSuccessfulCheck: Date,
  name: String,
  password: String,
  port: { type: Number, default: 21, required: true },
  protocol: { type: String, default: 'FTP', required: true },
  recursive: Boolean,
  retries: { type: Number, default: 0 },
  username: String,
});

export default {
  name: 'SalesFtpIngestionSchema',
  schema: salesFtpIngestionSchema,
};
