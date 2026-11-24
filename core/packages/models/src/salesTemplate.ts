import { Schema, Types } from 'mongoose';

export type SalesTemplate = {
  clientId: string;
  name: string;
  fileType: string;
  identification: {
    totalTabs: number;
    a1: string;
    topRows: string[];
    salesFileId: string;
    salesFileName: string;
    usedOnMultipleFiles: boolean;
  }[];
  libraryTemplateId: string;
  source: string;
  salesAccountName: string;
  headerRow: number;
  startingLine: number;
  startingLeft: number;
  tab: number;
  delimiter: string;
  encoding: string;
  file: string;
  exampleLines: unknown[];
  overwriteFields: {
    source: string;
    subSource: string;
    originalTerritory: string;
    originalDistributionChannel: string;
    originalConfiguration: string;
    originalPriceCategory: string;
    originalCurrency: string;
    exchangeRate: number;
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
  fields: unknown[];
  territories: unknown[];
  distributionChannels: unknown[];
  configurations: unknown[];
  priceCategories: unknown[];
  positiveNegatives: unknown[];
  sources: unknown[];
  subSources: unknown[];
  currencies: unknown[];
  saleTypes: unknown[];
  copyFields: unknown[];
  calculation: unknown[];
  ignoreMainIdentifiers: boolean;
  archived: boolean;
  priorityIngestion: boolean;
  priorityIngestionSuffix: string;
  enablePublisherMapping: boolean;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const salesTemplate = new Schema<SalesTemplate>(
  {
    clientId: String,
    name: String,
    fileType: { type: String, default: 'Standard' },
    identification: [
      {
        _id: false,
        totalTabs: Number,
        a1: String,
        topRows: [{ type: String }],
        salesFileId: String,
        salesFileName: String,
        usedOnMultipleFiles: { type: Boolean, default: false },
      },
    ],
    libraryTemplateId: String,
    source: String,
    salesAccountName: String,
    headerRow: { type: Number, default: 1 },
    startingLine: Number,
    startingLeft: { type: Number, default: 1 },
    tab: Number,
    delimiter: String,
    encoding: String,
    file: String,
    exampleLines: Array,
    overwriteFields: {
      source: String,
      subSource: String,
      originalTerritory: String,
      originalDistributionChannel: String,
      originalConfiguration: String,
      originalPriceCategory: String,
      originalCurrency: String,
      exchangeRate: Number,
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
    fields: Array,
    territories: Array,
    distributionChannels: Array,
    configurations: Array,
    priceCategories: Array,
    saleTypes: Array,
    positiveNegatives: Array,
    sources: Array,
    subSources: Array,
    currencies: Array,
    copyFields: Array,
    calculation: Array,
    ignoreMainIdentifiers: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    priorityIngestion: { type: Boolean, default: false },
    priorityIngestionSuffix: { type: String },
    enablePublisherMapping: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'SalesTemplate', schema: salesTemplate };
