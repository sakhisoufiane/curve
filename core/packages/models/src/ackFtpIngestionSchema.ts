import { Schema } from 'mongoose';

export type AckFtpIngestionSchema = {
  active: boolean;
  authenticationType: string;
  directory: string;
  error: string;
  fileKey: string;
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

const ackFtpIngestionSchema = new Schema<AckFtpIngestionSchema>({
  // @ts-expect-error No ID generated so not included in type
  _id: false,
  active: Boolean,
  authenticationType: String,
  directory: { type: String, default: '/', required: true },
  error: String,
  fileKey: String,
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

export default { name: 'AckFtpIngestionSchema', schema: ackFtpIngestionSchema };
