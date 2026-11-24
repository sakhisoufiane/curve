import { Schema, Types } from 'mongoose';

export type DeliveryLog = {
  clientId: string;
  workId: Types.ObjectId;
  deliveryPartnerId: Types.ObjectId;
  log: {
    deliveredWorkId: Types.ObjectId;
    cwrDeliveryId: Types.ObjectId;
    acknowledgementId: Types.ObjectId;
    partnerId: string;
    iswc: string;
    messages: string[];
    status: string;
    action: string;
    date: Date;
  }[];
};

const deliveryLog = new Schema<DeliveryLog>(
  {
    clientId: String,
    workId: { type: Schema.Types.ObjectId, ref: 'Work' },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    log: [
      {
        deliveredWorkId: { type: Schema.Types.ObjectId, ref: 'DeliveredWork' },
        cwrDeliveryId: { type: Schema.Types.ObjectId, ref: 'CwrDelivery' },
        acknowledgementId: {
          type: Schema.Types.ObjectId,
          ref: 'CwrAcknowledgement',
        },
        partnerId: String,
        iswc: String,
        messages: [String],
        status: String,
        action: String,
        date: Date,
      },
    ],
  },
  {
    timestamps: true,
  },
);

export default { name: 'DeliveryLog', schema: deliveryLog };
