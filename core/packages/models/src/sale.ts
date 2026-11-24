import { Schema } from 'mongoose';

export type Sale = {
  barcode: string;
  catNo: string;
  catType: string;
  configuration: string;
  distributionChannel: string;
  exchangeRate: number;
  grossAmount: number;
  homeCurrency: string;
  identifier: string;
  isrc: string;
  netAmmount: number;
  originalCurrency: string;
  originalTitle: string;
  priceCategory: string;
  releaseArtist: string;
  releaseID: string;
  releaseTitle: string;
  saleDate: Date;
  salePrice: number;
  source: string;
  status: string;
  territory: string;
  trackArtist: string;
  trackID: string;
  trackTitle: string;
  workId: string;
  workTitle: string;
  transactionDate: Date;
  type: string;
  units: string;
  workID: string;
};

const sale = new Schema<Sale>(
  {
    barcode: String,
    catNo: String,
    catType: String,
    configuration: String,
    distributionChannel: String,
    exchangeRate: Number,
    grossAmount: Number,
    homeCurrency: String,
    identifier: String,
    isrc: String,
    netAmmount: Number,
    originalCurrency: String,
    originalTitle: String,
    priceCategory: String,
    releaseArtist: String,
    releaseID: String,
    releaseTitle: String,
    saleDate: Date,
    salePrice: Number,
    source: String,
    status: String,
    territory: String,
    trackArtist: String,
    trackID: String,
    trackTitle: String,
    workId: String,
    workTitle: String,
    transactionDate: Date,
    type: String,
    units: String,
    workID: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'Sale', schema: sale };
