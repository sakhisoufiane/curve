import { Schema } from 'mongoose';

export type ExchangeRate = {
  currencyFrom: string;
  currencyTo: string;
  rate: number;
};

const exchangeRate = new Schema<ExchangeRate>(
  {
    currencyFrom: String,
    currencyTo: String,
    rate: Number,
  },
  {
    timestamps: true,
  },
);

export default { name: 'ExchangeRate', schema: exchangeRate };
