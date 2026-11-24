import { Schema, Types } from 'mongoose';
import { ALL_TERRITORIES } from './constants/territories';

export type Composer = {
  cae: string;
  caeWithoutLeadingZeros: string;
  catalogueGroups: string[];
  clientId: string;
  controlled: boolean;
  createdBy: Types.ObjectId;
  duplicatedFrom: string;
  firstName: string;
  foreignId: string;
  interestedPartyId: string;
  lastModifiedBy: Types.ObjectId;
  linkedContracts: unknown[];
  lowerCaseName: string;
  mainPro: string;
  mainProIdentifier: string;
  mechanicalPro: string;
  mechanicalProIdentifier: string;
  middleNames: string;
  name: string;
  notes: string;
  partyNo: number;
  performancePro: string;
  performanceProIdentifier: string;
  publisherAgreements: unknown[];
  publisherId: string;
  societies: unknown[];
  surname: string;
  syncPro: string;
  syncProIdentifier: string;
  territories: unknown[];
  potentialDuplicates: {
    composerId: Types.ObjectId;
    score: number;
  }[];
  potentialDuplicatesCount: number;
  blacklistedDuplicateIds: string[];
  coreChain?: {
    defaults?: {
      publisherId: string;
      category: string;
      controlled: boolean | null;
    };
  };
};

const composer = new Schema<Composer>(
  {
    cae: String,
    caeWithoutLeadingZeros: String,
    catalogueGroups: [String],
    clientId: String,
    controlled: Boolean,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    duplicatedFrom: String,
    firstName: String,
    foreignId: String,
    interestedPartyId: String,
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    linkedContracts: Array,
    lowerCaseName: String,
    mainPro: String,
    mainProIdentifier: String,
    mechanicalPro: String,
    mechanicalProIdentifier: String,
    middleNames: String,
    name: { type: String, required: true },
    notes: String,
    partyNo: Number,
    performancePro: String,
    performanceProIdentifier: String,
    publisherAgreements: Array,
    publisherId: String,
    societies: Array,
    surname: String,
    syncPro: String,
    syncProIdentifier: String,
    territories: { type: Array, default: ALL_TERRITORIES },
    potentialDuplicates: [
      {
        composerId: { type: Schema.Types.ObjectId, ref: 'Composer' },
        score: Number,
      },
    ],
    potentialDuplicatesCount: Number,
    blacklistedDuplicateIds: [String],
    coreChain: {
      defaults: {
        publisherId: {
          type: String,
          default: null,
        },
        category: {
          type: String,
          default: null,
        },
        controlled: {
          type: Boolean,
          default: null,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Used for catalogue management (duplicates) feature
composer.index({ clientId: 1, potentialDuplicatesCount: -1, name: 1 });

export default { name: 'Composer', schema: composer };
