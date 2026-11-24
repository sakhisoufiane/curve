import { Schema, Types } from 'mongoose';

export type Parent = {
  clientIds: unknown[];
  name: string;
  darkLogo: string;
  publicDarkLogo: string;
  lightLogo: string;
  publicLightLogo: string;
  favicon: string;
  publicFavicon: string;
  subdomain: string;
  customDomain: string;
  supportEmail: string;
  address: string;
  removeStatementLogo: boolean;
  whiteLabelCommunication: boolean;
  useLogoForClients: boolean;
  distributionChannels: unknown[];
  configurations: unknown[];
  priceCategories: unknown[];
  costTypes: unknown[];
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const parent = new Schema<Parent>(
  {
    clientIds: Array,
    name: { type: String, unique: true },
    darkLogo: String,
    publicDarkLogo: String,
    lightLogo: String,
    publicLightLogo: String,
    favicon: String,
    publicFavicon: String,
    subdomain: String,
    customDomain: String,
    supportEmail: String,
    address: String,
    removeStatementLogo: Boolean,
    whiteLabelCommunication: Boolean,
    useLogoForClients: Boolean,
    distributionChannels: Array,
    configurations: Array,
    priceCategories: Array,
    costTypes: Array,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'Parent', schema: parent };
