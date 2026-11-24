import { Schema, Types } from 'mongoose';

export type LibraryTemplate = {
  published: boolean;
  name: string;
  fileType: string;
  identification: {
    totalTabs: number;
    a1: string;
    topRows: string[];
    salesFileId: string;
    salesFileName: string;
  }[];
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
  copyFields: unknown[];
  calculation: unknown[];
  clientType: string;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const libraryTemplate = new Schema<LibraryTemplate>(
  {
    published: { type: Boolean, default: true },
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
      },
    ],
    source: String,
    salesAccountName: String,
    headerRow: { type: Number, default: 1 },
    startingLine: Number,
    startingLeft: Number,
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
    positiveNegatives: Array,
    sources: Array,
    subSources: Array,
    currencies: Array,
    copyFields: Array,
    calculation: Array,
    clientType: { type: String, default: 'Label' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'LibraryTemplate', schema: libraryTemplate };
