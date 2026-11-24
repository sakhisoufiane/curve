import { Schema } from 'mongoose';

export type ImportPartner = {
  name: string;
  clientId: string;
  transferringSystem: string;
  notes: string;
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
    territoryGroupId: string;
    territories: unknown[];
    claimingParty: {
      publisherId: string;
      contractType: string;
    };
    setMainIdentifier: boolean;
    setPublisherInterestedParty: boolean;
    setComposerInterestedParty: boolean;
    ingestionTerritory: string;
    contracts: unknown[];
    catalogueGroups: unknown[];
  };
};

const importPartner = new Schema<ImportPartner>(
  {
    name: String,
    clientId: String,
    transferringSystem: String,
    notes: String,
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
      territoryGroupId: String,
      territories: Array,
      claimingParty: {
        publisherId: String,
        contractType: String,
      },
      setMainIdentifier: Boolean,
      setPublisherInterestedParty: Boolean,
      setComposerInterestedParty: Boolean,
      ingestionTerritory: String,
      contracts: Array,
      catalogueGroups: Array,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'ImportPartner', schema: importPartner };
