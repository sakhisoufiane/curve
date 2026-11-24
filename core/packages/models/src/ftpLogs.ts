import { Schema } from 'mongoose';

export type FtpLogs = {
  clientId: string;
  type: string;
  files: {
    filename: string;
    dateIngested: Date;
    dateUploadedToServer: Date;
    server: string;
    documentId: string;
    firstPass: boolean;
  }[];
};

const ftpLogs = new Schema<FtpLogs>(
  {
    clientId: { type: String, required: true },
    type: {
      type: String,
      enum: ['ACK', 'Sales', 'Catalogue', 'Server Sales'],
      required: true,
    }, // Ingestion type
    files: [
      {
        _id: false,
        filename: { type: String, required: true },
        dateIngested: { type: Date, required: true },
        dateUploadedToServer: { type: Date, required: true },
        server: { type: String, required: true }, // username@host of the ftp server
        documentId: String,
        firstPass: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export default { name: 'FTPLogs', schema: ftpLogs };
