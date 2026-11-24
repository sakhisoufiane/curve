import { Schema } from 'mongoose';

export type PaymentProvidersSchema = {
  curvePay: {
    apiKey: string;
  };
  selectedPaymentProvider: string;
  tipalti: {
    apiKey: string;
    payerName: string;
    incomeType: string;
    lastStatusesCheck: unknown;
    crossPayeeDetails: boolean;
    payeeId: string;
    payeePayable: boolean;
    payeeNotPayableReason: string;
  };
  wise: {
    apiKey: string;
    profileId: string;
    autoPayment: boolean;
    feesPaidBy: string;
    paymentMethod: string;
    paymentMethodRequirements: unknown;
    paymentFields: unknown;
  };
};

const paymentProvidersSchema = new Schema<PaymentProvidersSchema>(
  {
    // @ts-expect-error No ID generated so not included in type
    _id: false,
    curvePay: { apiKey: String },
    selectedPaymentProvider: String,
    tipalti: {
      apiKey: String,
      payerName: String,
      incomeType: String,
      lastStatusesCheck: Date,
      crossPayeeDetails: { type: Boolean, default: false },
      payeeId: String,
      payeePayable: Boolean,
      payeeNotPayableReason: String,
    },
    wise: {
      apiKey: String,
      profileId: String,
      autoPayment: Boolean,
      feesPaidBy: { type: String, default: 'client' },
      paymentMethod: String,
      paymentMethodRequirements: Object,
      paymentFields: { type: Object, default: {} },
    },
  },
  { minimize: false },
);

export default {
  name: 'PaymentProvidersSchema',
  schema: paymentProvidersSchema,
};
