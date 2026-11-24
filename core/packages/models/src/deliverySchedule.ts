import { Schema, Types } from 'mongoose';
import lastRunSchema from './lastRunSchema';

export type DeliverySchedule = {
  active: boolean;
  additionalCustomFilters: boolean;
  clientId: string;
  deliveryPartnerId: Types.ObjectId;
  filter: unknown;
  filterType: string;
  lastDelivered: Date;
  lastRun: unknown;
  name: string;
  scheduleDay: number;
  scheduleType: string;
};

const deliverySchedule = new Schema<DeliverySchedule>(
  {
    active: Boolean,
    additionalCustomFilters: Boolean,
    clientId: String,
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    filter: { type: Schema.Types.Mixed, default: {} },
    filterType: String,
    lastDelivered: Date,
    lastRun: lastRunSchema.schema,
    name: String,
    scheduleDay: Number,
    scheduleType: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'DeliverySchedule', schema: deliverySchedule };
