import { Schema, Types } from 'mongoose';

export type Notification = {
  clientId: string;
  userId: string;
  name: string;
  description: string;
  notificationErrors: unknown[];
  link: string;
  urls: { name: string; url: string }[];
  read: boolean;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const notification = new Schema<Notification>(
  {
    clientId: String,
    userId: String,
    name: String,
    description: String,
    notificationErrors: Array,
    link: String,
    urls: [
      {
        _id: false,
        name: String,
        url: String,
      },
    ],
    read: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'Notification', schema: notification };
