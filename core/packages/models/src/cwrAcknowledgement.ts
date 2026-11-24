import { Schema, Types } from 'mongoose';

export type CwrAcknowledgement = {
  acceptedTotal: number;
  acknowledgementType: string;
  archived: boolean;
  clientId: string;
  cwrDeliveryId: string;
  deliveryPartnerId: Types.ObjectId;
  file: string;
  ingestionError: string;
  name: string;
  otherTotal: number;
  publicLink: string;
  rejectedTotal: number;
  source: string;
  status: string;
  statusTotals: unknown[];
  workIds: unknown[];
};

const cwrAcknowledgement = new Schema<CwrAcknowledgement>(
  {
    acceptedTotal: Number,
    acknowledgementType: { type: String, default: 'CWR' },
    archived: { type: Boolean, default: false },
    clientId: String,
    cwrDeliveryId: String,
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    file: String,
    ingestionError: String,
    name: String,
    otherTotal: Number,
    publicLink: String,
    rejectedTotal: Number,
    source: String,
    status: { type: String, default: 'Pending' },
    statusTotals: Array,
    workIds: Array,
  },
  {
    timestamps: true,
  },
);

export default { name: 'CwrAcknowledgement', schema: cwrAcknowledgement };
