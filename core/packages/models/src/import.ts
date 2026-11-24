import { Schema, Types } from 'mongoose';

export type Import = {
  name: string;
  clientId: string;
  setupStage: string;
  transferringSystem: string;
  transferringParty: string;
  contractId: string;
  catalogueGroups: unknown[];
  errors: unknown[];
  status: string;
  counterpointFiles: {
    royaltorsFile: string;
    royaltorRatesFile: string;
    royaltorProductsFile: string;
    soundRecordingsFile: string;
    productManagerFile: string;
    productAKAsFile: string;
    publishingCatalogueExport: string;
    publishingRatesExport: string;
    publishingComposers: string;
    publishingPublishers: string;
    publishingBalances: string;
    publishingTerritoryManager: string;
  };
  valuesForMapping: {
    territories: unknown[];
    distributionChannels: unknown[];
    configurations: unknown[];
    priceCategories: unknown[];
    capacities: unknown[];
    societies: unknown[];
    publishingRates: unknown[];
  };
  mappings: {
    territories: unknown;
    distributionChannels: unknown;
    configurations: unknown;
    priceCategories: unknown;
    societies: unknown;
    capacities: unknown;
    publishingRates: unknown;
  };
  defaults: {
    costContractTerms: unknown[];
    reserveContractTerms: unknown[];
    accountingPeriod: string;
    contracts: unknown[];
    catalogueGroups: unknown[];
    territoryGroupId: string;
    territories: unknown[];
    claimingParty: unknown;
    setMainIdentifier: boolean;
    setPublisherInterestedParty: boolean;
    setComposerInterestedParty: boolean;
    ingestionTerritory: string;
  };
  ingestedPayees: number;
  ingestedContracts: number;
  ingestedReleases: number;
  ingestedTracks: number;
  ingestedWorks: number;
  ingestedComposers: number;
  ingestedPublishers: number;
  errorMessage: string;
  importPartnerId: Types.ObjectId;
};

const importSchema = new Schema<Import>(
  {
    name: String,
    clientId: String,
    setupStage: String,
    transferringSystem: String,
    transferringParty: String,
    contractId: String,
    catalogueGroups: Array,
    errors: Array,
    status: { type: String, default: 'Setup' },
    counterpointFiles: {
      royaltorsFile: String,
      royaltorRatesFile: String,
      royaltorProductsFile: String,
      soundRecordingsFile: String,
      productManagerFile: String,
      productAKAsFile: String,
      publishingCatalogueExport: String,
      publishingRatesExport: String,
      publishingComposers: String,
      publishingPublishers: String,
      publishingBalances: String,
      publishingTerritoryManager: String,
    },
    valuesForMapping: {
      territories: Array,
      distributionChannels: Array,
      configurations: Array,
      priceCategories: Array,
      capacities: Array,
      societies: Array,
      publishingRates: Array,
    },
    mappings: {
      territories: Object,
      distributionChannels: Object,
      configurations: Object,
      priceCategories: Object,
      societies: Object,
      capacities: Object,
      publishingRates: Object,
    },
    defaults: {
      costContractTerms: Array,
      reserveContractTerms: Array,
      accountingPeriod: String,
      contracts: Array,
      catalogueGroups: Array,
      territoryGroupId: String,
      territories: Array,
      claimingParty: Object,
      setMainIdentifier: Boolean,
      setPublisherInterestedParty: Boolean,
      setComposerInterestedParty: Boolean,
      ingestionTerritory: String,
    },
    ingestedPayees: Number,
    ingestedContracts: Number,
    ingestedReleases: Number,
    ingestedTracks: Number,
    ingestedWorks: Number,
    ingestedComposers: Number,
    ingestedPublishers: Number,
    errorMessage: String,
    importPartnerId: { type: Schema.Types.ObjectId, ref: 'ImportPartner' },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Import', schema: importSchema };
