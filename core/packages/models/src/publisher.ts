import { Schema, Types } from 'mongoose';
import { ALL_TERRITORIES } from './constants/territories';

export type Publisher = {
  clientId: string;
  foreignId: string;
  partyNo: number;
  name: string;
  lowerCaseName: string;
  aliases: string[];
  cwrName: string;
  cae: string;
  caeWithoutLeadingZeros: string;
  mainPro: string;
  mechanicalPro: string;
  performancePro: string;
  syncPro: string;
  mainProIdentifier: string;
  mechanicalProIdentifier: string;
  performanceProIdentifier: string;
  syncProIdentifier: string;
  controlled: boolean;
  catalogueGroups: string[];
  notes: string;
  societies: unknown[];
  publisherAgreements: unknown[];
  linkedContracts: unknown[];
  territories: unknown[];
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  duplicatedFrom: string;
  interestedPartyId: string;
  potentialDuplicates: {
    publisherId: Types.ObjectId;
    score: number;
  }[];
  potentialDuplicatesCount: number;
  blacklistedDuplicateIds: string[];
  coreChain?: {
    defaults?: {
      controlled: boolean;
    };
    linkedPublishers?: LinkedPublisher[];
    composerShare?: ComposerShare[];
  };
};

type LinkedPublisher = {
  if: {
    partner: string;
    territory: string;
    deliveryPartnerId: string;
  };
  then: {
    publisherId: string;
    contractType: string;
  };
};

export type ComposerShare = {
  if: {
    composerMainSociety: string;
    territory: string;
    partner: string;
    deliveryPartnerId: string;
  };
  then: {
    performanceOwnership: number;
    mechanicalOwnership: number;
    mechanicalCollection: number;
    performanceCollection: number;
  };
};

const publisher = new Schema<Publisher>(
  {
    clientId: String,
    foreignId: String,
    partyNo: Number,
    name: { type: String, required: true },
    lowerCaseName: String,
    aliases: [String],
    cwrName: String,
    cae: String,
    caeWithoutLeadingZeros: String,
    mainPro: String,
    mechanicalPro: String,
    performancePro: String,
    syncPro: String,
    mainProIdentifier: String,
    mechanicalProIdentifier: String,
    performanceProIdentifier: String,
    syncProIdentifier: String,
    controlled: Boolean,
    catalogueGroups: [String],
    notes: String,
    societies: Array,
    publisherAgreements: Array,
    linkedContracts: Array,
    territories: { type: Array, default: ALL_TERRITORIES },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    duplicatedFrom: String,
    interestedPartyId: String,
    potentialDuplicates: [
      {
        publisherId: { type: Schema.Types.ObjectId, ref: 'Publisher' },
        score: Number,
      },
    ],
    potentialDuplicatesCount: Number,
    blacklistedDuplicateIds: [String],
    coreChain: {
      defaults: {
        controlled: Boolean,
      },
      linkedPublishers: [
        {
          _id: false,
          if: {
            partner: {
              type: String,
              default: 'All',
            },
            deliveryPartnerId: {
              type: String,
              default: null,
            },
            territory: {
              type: String,
              default: 'WW',
            },
          },
          then: {
            publisherId: String,
            contractType: String,
          },
        },
      ],
      composerShare: [
        {
          _id: false,
          if: {
            deliveryPartnerId: {
              type: String,
              default: null,
            },
            composerMainSociety: {
              type: String,
              default: 'All',
            },
            territory: {
              type: String,
              default: 'WW',
            },
            partner: {
              type: String,
              default: 'All',
            },
          },
          then: {
            performanceOwnership: {
              type: Number,
              default: 0,
            },
            mechanicalOwnership: {
              type: Number,
              default: 0,
            },
            mechanicalCollection: {
              type: Number,
              default: 0,
            },
            performanceCollection: {
              type: Number,
              default: 0,
            },
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Used for catalogue management (duplicates) feature
publisher.index({ clientId: 1, potentialDuplicatesCount: -1, name: 1 });

export default { name: 'Publisher', schema: publisher };
