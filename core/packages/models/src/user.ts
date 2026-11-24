import { Schema, Types } from 'mongoose';

export type User = {
  qaInternal: boolean;
  superInternal: boolean;
  monitoring: boolean;
  internal: boolean;
  parentId: string;
  clientId: string;
  payeeId: string;
  clientIds: unknown[];
  payeeIds: unknown[];
  email: string;
  status: string;
  password: string;
  type: string;
  rights: unknown;
  adminType: string;
  adminClientIds: unknown[];
  forgotPasswordToken: string;
  forgotPasswordDate: Date;
  multiFactorAuthentication: boolean;
  multiFactorAuthenticationType: string;
  multiFactorAuthenticationSecret: string;
  multiFactorAuthenticationEmailCode: string;
  emailCatalogueIngestions: boolean;
  emailSalesIngestions: boolean;
  emailPeriodCompletion: boolean;
  userCreationToken: string;
  userCreationDate: Date;
  sendings: unknown[];
  notifications: string;
  apiKey: string;
  apiSecretKey: string;
  createdBy: Types.ObjectId;
  lastLogin: Date;
  cypressUser: boolean;
  authenticationType: string;
  lastModifiedBy: Types.ObjectId;
  passwordRotationDate: Date;
};

const user = new Schema<User>(
  {
    qaInternal: Boolean,
    superInternal: Boolean,
    // MONITORING: This Allows access to the monitoring suite without allowing access to ALL Client Data.
    // To use, create a user on a dummy client then set monitoring to true.
    // User will have access to that Dummy Client as well monitoring suite
    monitoring: Boolean,
    internal: Boolean,
    parentId: String,
    clientId: String,
    payeeId: String,
    clientIds: Array,
    payeeIds: Array,
    email: { type: String, require: true, unique: true },
    status: String,
    password: String,
    type: String,
    rights: Schema.Types.Mixed,
    adminType: String,
    adminClientIds: Array,
    forgotPasswordToken: String,
    forgotPasswordDate: Date,
    multiFactorAuthentication: Boolean,
    multiFactorAuthenticationType: { type: String, default: 'Email' },
    multiFactorAuthenticationSecret: String,
    multiFactorAuthenticationEmailCode: String,
    emailCatalogueIngestions: Boolean,
    emailSalesIngestions: Boolean,
    emailPeriodCompletion: Boolean,
    userCreationToken: String,
    userCreationDate: Date,
    sendings: Array,
    notifications: { type: String, default: 'Both' },
    apiKey: String,
    apiSecretKey: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastLogin: Date,
    cypressUser: { type: Boolean, default: false },
    authenticationType: { type: String, default: 'Email' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    passwordRotationDate: { type: Date, default: new Date() },
  },
  {
    timestamps: true,
  },
);

export default { name: 'User', schema: user };
