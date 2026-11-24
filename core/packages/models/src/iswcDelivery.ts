import { Schema } from 'mongoose';

export type IswcDelivery = {
  name: string;
  clientId: string;
  deliveredWorkIds: unknown[];
  deliveredDate: Date;
  delivered: boolean;
  deliveryPartnerId: string;
  filter: unknown;
  filterType: string;
  status: string;
};

const iswcDelivery = new Schema<IswcDelivery>(
  {
    name: String,
    clientId: String,
    deliveredWorkIds: Array,
    deliveredDate: Date,
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveryPartnerId: String,
    filter: { type: Schema.Types.Mixed, default: {} },
    filterType: {
      type: String,
      default: 'allValidWorks',
      enum: ['allValidWorks', 'custom', 'specific'],
    },
    status: {
      type: String,
      default: 'Pending',
      enum: ['Pending', 'Errored', 'Delivered'],
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'IswcDelivery', schema: iswcDelivery };
