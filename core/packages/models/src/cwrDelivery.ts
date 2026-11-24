import { Schema, Types } from 'mongoose';

export type CwrDelivery = {
  name: string;
  clientId: string;
  deliveryPartnerId: string;
  deliveryPartnerType: string;
  cwrVersion: string;
  outputFormat: string;
  deliveryProfileId: string;
  filter: unknown;
  filterType: string;
  additionalCustomFilters: boolean;
  receivingParty: string;
  sequenceNo: number;
  territory: string;
  workIds: unknown[];
  fileName: string;
  status: string;
  fromScheduledDelivery: boolean;
  deliveryScheduleId: Types.ObjectId;
  errorMessage: string;
  songlistExportFileKey: string;
};

const cwrDelivery = new Schema<CwrDelivery>(
  {
    name: String,
    clientId: String,
    deliveryPartnerId: String,
    deliveryPartnerType: String,
    cwrVersion: { type: String, default: '2.2' },
    outputFormat: { type: String, default: 'CWR' },
    deliveryProfileId: String,
    filter: { type: Schema.Types.Mixed, default: {} },
    filterType: {
      type: String,
      default: 'newAndUpdated',
      enum: ['newAndUpdated', 'manuallyAdded', 'custom', 'specific'],
    },
    additionalCustomFilters: Boolean,
    receivingParty: String,
    sequenceNo: Number,
    territory: { type: String, required: true },
    workIds: Array,
    fileName: String,
    status: {
      type: String,
      default: 'Pending',
      enum: ['Pending', 'In Progress', 'Errored', 'Delivered'],
    },
    fromScheduledDelivery: { type: Boolean, default: false },
    deliveryScheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliverySchedule',
    },
    errorMessage: String,
    songlistExportFileKey: String,
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'CwrDelivery', schema: cwrDelivery };
