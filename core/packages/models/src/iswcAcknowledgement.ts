import { Schema, Types } from 'mongoose';

export type IswcAcknowledgement = {
  fileName: string;
  clientId: string;
  iswcDeliveryId: Types.ObjectId;
  deliveryPartnerId: Types.ObjectId;
  publicKeyS3: string;
  errors: unknown[];
  outputFormat: string;
};

const iswcAcknowledgement = new Schema<IswcAcknowledgement>(
  {
    fileName: String,
    clientId: String,
    iswcDeliveryId: { type: Schema.Types.ObjectId, ref: 'CwrDelivery' },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    publicKeyS3: String,
    errors: Array,
    outputFormat: {
      type: String,
      enum: ['ISWC Resolution (IRS)', 'ISWC Allocation (IAS)'],
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'IswcAcknowledgement', schema: iswcAcknowledgement };
