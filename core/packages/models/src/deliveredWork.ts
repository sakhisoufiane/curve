import { Schema, Types } from 'mongoose';

export type DeliveredWork = {
  clientId: string;
  // The original Work ID that was delivered
  workId: Types.ObjectId;
  // If the Work was merged into another Work (removing duplicates), this references the new Work ID
  mergedIntoWorkId: Types.ObjectId;
  cwrDeliveryId: Types.ObjectId;
  cwrAcknowledgementId: Types.ObjectId;
  deliveryPartnerId: Types.ObjectId;
  partnerId: string;
  receivingParty: string;
  status: string;
  deliveryDate: Date;
  title: string;
  iswc: string;
  messages: string[];
  userCreated: boolean;
};

const deliveredWork = new Schema<DeliveredWork>(
  {
    clientId: String,
    workId: { type: Schema.Types.ObjectId, ref: 'Work' },
    mergedIntoWorkId: { type: Schema.Types.ObjectId, ref: 'Work', default: null },
    cwrDeliveryId: { type: Schema.Types.ObjectId, ref: 'CwrDelivery' },
    cwrAcknowledgementId: {
      type: Schema.Types.ObjectId,
      ref: 'CwrAcknowledgement',
    },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    partnerId: String,
    receivingParty: String,
    status: { type: String, default: 'Pending' },
    deliveryDate: Date,
    title: String,
    iswc: String,
    messages: [String],
    userCreated: Boolean,
  },
  {
    timestamps: true,
  }
);

deliveredWork.index({ clientId: 1, mergedIntoWorkId: 1 });
deliveredWork.index({ clientId: 1,  workId: 1 });

export default { name: 'DeliveredWork', schema: deliveredWork };
