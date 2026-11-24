import { Schema } from 'mongoose';

export type AppSettings = {
  appleSalesAltCalculationMonths: string[];
  bqAutoScaler: {
    percentageBeforeAddingSlotsBasedOnOnePeriod: number;
    percentageBeforeAddingSlots: number;
    percentageBeforeRemovingSlots: number;
    minimumSlotsCapacity: number;
  };
  demoData: {
    user: string;
    labelClient: string;
    publisherClient: string;
  };
  features: {
    payments: boolean;
    demo: boolean;
  };
  fuga: {
    periodBlockedEmails: string[];
  };
  overrideAlwaysRunFull: boolean;
  state: {
    maintenance: boolean;
    deployment: boolean;
    scaleDown: boolean;
  };
  supportScripts: unknown[];
};

const appSettings = new Schema<AppSettings>(
  {
    appleSalesAltCalculationMonths: [String],
    bqAutoScaler: {
      percentageBeforeAddingSlotsBasedOnOnePeriod: {
        type: Number,
        default: 90,
      },
      percentageBeforeAddingSlots: { type: Number, default: 70 },
      percentageBeforeRemovingSlots: { type: Number, default: 50 },
      minimumSlotsCapacity: { type: Number, default: 200 },
    },
    demoData: { user: String, labelClient: String, publisherClient: String },
    features: {
      payments: { type: Boolean, default: false },
      demo: { type: Boolean, default: false },
    },
    fuga: { periodBlockedEmails: [String] },
    overrideAlwaysRunFull: { type: Boolean, default: false },
    state: {
      maintenance: { type: Boolean, default: false },
      deployment: { type: Boolean, default: false },
      scaleDown: { type: Boolean, default: false },
    },
    supportScripts: Array,
  },
  {
    timestamps: true,
  },
);

export default { name: 'AppSettings', schema: appSettings };
