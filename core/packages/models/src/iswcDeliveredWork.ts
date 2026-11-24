import { Schema, Types } from 'mongoose';

export type IswcDeliveredWork = {
  clientId: string;
  // The original Work ID that was delivered
  workId: Types.ObjectId;
  // If the Work was merged into another Work (removing duplicates), this references the new Work ID
  mergedIntoWorkId: Types.ObjectId;
  iswcAcknowledgementId: Types.ObjectId;
  originalFileCreationDateTime: Date;
  originalSubmissionId: number;
  processingDate: Date;
  transactionStatus: string;
  submissionId: number;
  originalTransactionType: string;
  originalTitle: string;
  agency: string;
  sourcedb: number;
  preferredIswc: string;
  interestedParties: unknown[];
  workcode: string;
  otherTitles: unknown[];
  errorMessages: unknown;
};

const iswcDeliveredWork = new Schema<IswcDeliveredWork>(
  {
    clientId: String,
    workId: { type: Schema.Types.ObjectId, ref: 'Work' },
    mergedIntoWorkId: { type: Schema.Types.ObjectId, ref: 'Work', default: null },
    iswcAcknowledgementId: {
      type: Schema.Types.ObjectId,
      ref: 'CwrAcknowledgement',
    },
    originalFileCreationDateTime: Date,
    originalSubmissionId: Number,
    processingDate: Date,
    transactionStatus: String,
    submissionId: Number,
    originalTransactionType: String,
    originalTitle: String,
    agency: String,
    sourcedb: Number,
    preferredIswc: String,
    interestedParties: Array,
    workcode: String,
    otherTitles: Array,
    errorMessages: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

export default { name: 'IswcDeliveredWork', schema: iswcDeliveredWork };
