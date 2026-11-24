import { Schema, Types } from 'mongoose';

export type SalesFile = {
  clientId: string;
  name: string;
  partitionNo: number;
  invoiceNo: string;
  targetPeriod: string;
  fileType: string;
  salesAccountName: string;
  salesTemplateName: string;
  salesTemplateId: string;
  status: string;
  file: string;
  customAdditionalFile: string;
  publicLink: string;
  customAdditionalFilePublicLink: string;
  exampleLines: unknown[];
  overwriteFields: {
    source: string;
    subSource: string;
    originalTerritory: string;
    originalDistributionChannel: string;
    originalConfiguration: string;
    originalPriceCategory: string;
    originalSaleType: string[];
    originalCurrency: string;
    exchangeRate: number;
    saleDate: Date;
    transactionDate: Date;
    multiplier: number;
    overwriteConfigWithCatalogue: boolean;
    overwriteDistributionChannelWithCatalogue: boolean;
    overwritePriceCategoryWithCatalogue: boolean;
    overwriteTrackPriceCategoryWithCatalogue: boolean;
  };
  overwriteFieldTargetCells: {
    field: string;
    type: string;
    cell: string;
  }[];
  error: unknown;
  completeMessage: unknown;
  units: number;
  validationUnits: number;
  netAmount: number;
  grossAmount: number;
  validationNetAmount: number;
  homeCurrencyNetAmount: number;
  homeCurrencyGrossAmount: number;
  lines: number;
  validationLines: number;
  valid: boolean;
  invalidLines: number;
  invalidFields: {
    distributionChannels: unknown[];
    configurations: unknown[];
    priceCategories: unknown[];
    saleTypes: unknown[];
    territories: unknown[];
    sources: unknown[];
    subSources: unknown[];
    currencies: unknown[];
    currencyCodes: unknown[];
    releases: unknown[];
    tracks: unknown[];
    contracts: unknown[];
    releasesWarning: unknown;
    tracksWarning: unknown;
    worksWarning: unknown;
    works: unknown[];
    saleDate: boolean;
    transactionDate: boolean;
    customAdditionalFile: boolean;
  };
  usedReleaseIds: unknown[];
  usedTrackIds: unknown[];
  usedWorkIds: unknown[];
  reportedStatus: string;
  reportedLines: number;
  proRataAmount: number;
  exchangeRates: unknown[];
  archived: boolean;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  viewed: boolean;
  locked: boolean;
  lastIngested: unknown;
  lastRevalidated: unknown;
  duplicateSalesFileId: string;
  foreignId: string;
};

const salesFile = new Schema<SalesFile>(
  {
    clientId: String,
    name: String,
    partitionNo: Number,
    invoiceNo: String,
    targetPeriod: String,
    fileType: { type: String, default: 'Standard' },
    salesAccountName: String,
    salesTemplateName: String,
    salesTemplateId: String,
    status: String,
    file: String,
    customAdditionalFile: String,
    publicLink: String,
    customAdditionalFilePublicLink: String,
    exampleLines: Array,
    overwriteFields: {
      source: String,
      subSource: String,
      originalTerritory: String,
      originalDistributionChannel: String,
      originalConfiguration: String,
      originalPriceCategory: String,
      originalSaleType: Array,
      originalCurrency: String,
      exchangeRate: Number,
      saleDate: Date,
      transactionDate: Date,
      multiplier: Number,
      overwriteConfigWithCatalogue: Boolean,
      overwriteDistributionChannelWithCatalogue: Boolean,
      overwritePriceCategoryWithCatalogue: Boolean,
      overwriteTrackPriceCategoryWithCatalogue: Boolean,
    },
    overwriteFieldTargetCells: [
      {
        _id: false,
        field: String,
        type: { type: String },
        cell: String,
      },
    ],
    error: Schema.Types.Mixed,
    completeMessage: Schema.Types.Mixed,
    units: Number,
    validationUnits: Number,
    netAmount: Number,
    grossAmount: Number,
    validationNetAmount: Number,
    homeCurrencyNetAmount: Number,
    homeCurrencyGrossAmount: Number,
    lines: Number,
    validationLines: Number,
    valid: Boolean,
    invalidLines: Number,
    invalidFields: {
      distributionChannels: Array,
      configurations: Array,
      priceCategories: Array,
      saleTypes: Array,
      territories: Array,
      sources: Array,
      subSources: Array,
      currencies: Array,
      currencyCodes: Array,
      releases: Array,
      tracks: Array,
      contracts: Array,
      releasesWarning: Object,
      tracksWarning: Object,
      worksWarning: Object,
      works: Array,
      saleDate: { type: Boolean, default: false },
      transactionDate: { type: Boolean, default: false },
      customAdditionalFile: { type: Boolean, default: false },
    },
    usedReleaseIds: Array,
    usedTrackIds: Array,
    usedWorkIds: Array,
    reportedStatus: { type: String, default: 'Unreported' },
    reportedLines: Number,
    proRataAmount: Number,
    exchangeRates: Array,
    archived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    viewed: { type: Boolean, default: false },
    locked: Boolean,
    lastIngested: Schema.Types.Mixed,
    lastRevalidated: Schema.Types.Mixed,
    duplicateSalesFileId: String,
    foreignId: String,
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'SalesFile', schema: salesFile };
