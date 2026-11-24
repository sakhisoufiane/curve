import { Schema, Types } from 'mongoose';

export type DeliveryProfile = {
  name: string;
  clientId: string;
  territory: string;
  notDeliveredTo: string;
  workCreatedNo: number;
  workCreatedPeriod: string;
  workCreatedStart: Date;
  workCreatedEnd: Date;
  composerIds: unknown[];
  publisherIds: unknown[];
  catalogueGroups: unknown[];
  workIds: unknown[];
  excludeCatalogueGroups: unknown[];
  excludeWorkIds: unknown[];
  deliveryStatus: string;
  deliveryStatusPRO: string;
  modifiedBefore: Date;
  modifiedAfter: Date;
  modifiedInLast: number;
  modifiedInLastPeriod: string;
  createdBefore: Date;
  createdAfter: Date;
  approvedBefore: Date;
  approvedAfter: Date;
  approvedInLast: number;
  approvedInLastPeriod: string;
  excludePublishers: unknown[];
  excludeComposers: unknown[];
  includeProductionLibrary: boolean;
  excludeProductionLibrary: boolean;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const deliveryProfile = new Schema<DeliveryProfile>(
  {
    name: { type: String, required: true },
    clientId: String,
    territory: String,
    notDeliveredTo: String,
    workCreatedNo: Number,
    workCreatedPeriod: String,
    workCreatedStart: Date,
    workCreatedEnd: Date,
    composerIds: Array,
    publisherIds: Array,
    catalogueGroups: Array,
    workIds: Array,
    excludeCatalogueGroups: Array,
    excludeWorkIds: Array,
    deliveryStatus: String,
    deliveryStatusPRO: String,
    modifiedBefore: Date,
    modifiedAfter: Date,
    modifiedInLast: Number,
    modifiedInLastPeriod: String,
    createdBefore: Date,
    createdAfter: Date,
    approvedBefore: Date,
    approvedAfter: Date,
    approvedInLast: Number,
    approvedInLastPeriod: String,
    excludePublishers: Array,
    excludeComposers: Array,
    includeProductionLibrary: Boolean,
    excludeProductionLibrary: Boolean,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'DeliveryProfile', schema: deliveryProfile };
