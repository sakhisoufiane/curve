import { Schema, Types } from 'mongoose';
import alternateTitlesSchema from './alternateTitlesSchema';
import rightsSchema from './rightsSchema';
import societyIdentifierSchema from './societyIdentifierSchema';

type RightsChain = {
  territory: string;
  children?: RightsChainChild[];
  totalMechanicalOwnership: number;
  totalPerformanceOwnership: number;
  totalMechanicalCollection: number;
  totalPerformanceCollection: number;
  mechanicalOwnership: number;
  performanceOwnership: number;
  mechanicalCollection: number;
  performanceCollection: number;
};

type RightsChainChild = {
  type: 'Publisher' | 'Composer';
  publisherId?: string;
  composerId?: string;
  contractType: string;
  controlled: boolean;
  mechanicalOwnership: number;
  performanceOwnership: number;
  mechanicalCollection: number;
  performanceCollection: number;
  children?: RightsChainChild[];
};

type PartnerRightsChain = {
  deliveryPartnerId: string;
  rightsChain: RightsChain[];
};

export type Work = {
  clientId: string;
  campaignIds: unknown[];
  title: string;
  alternateTitles: unknown[];
  composer: string;
  foreignId: string;
  projectId: string;
  identifier: string;
  partyNo: number;
  tunecode: string;
  iswc: string;
  notes: string;
  trackIds: unknown[];
  salesReturnsRights: (unknown & { percentage: number })[];
  salesReturnsRightsDisplay: unknown[];
  channelSpecificSalesReturnsRights: {
    contractId: string;
    distributionChannel: string;
    source: string;
    territory: string;
    percentage: number;
    publishers: string[];
    publisherFingerprint: string;
  }[];
  costsRights: unknown[];
  aliases: string[];
  societyIdentifiers: { society: string; identifier: string }[];
  contractValidation: string;
  duplicatedFrom: string;
  territories: unknown[];
  rightsChain: RightsChain[];
  partnerRightsChains: PartnerRightsChain[];
  usedComposerIds: unknown[];
  usedPublisherIds: unknown[];
  catalogueGroups: string[];
  grandRights: boolean;
  priority: boolean;
  enablePublisherMapping: boolean;
  productionLibrary: boolean;
  productionTitle: string;
  cdIdentifier: string;
  cutNo: number;
  libraryTitle: string;
  workLanguage: string;
  workDescriptionCategory: string;
  duration: number;
  compositeType: string;
  compositeCount: number;
  compositeWorks: {
    title: string;
    source: string;
  }[];
  versionType: string;
  arrangementType: string;
  lyricAdaptionType: string;
  originalWorkTitle: string;
  originalIswc: string;
  originalWorkWriterLastName: string;
  originalWorkWriterFirstName: string;
  originalWorkSource: string;
  performers: unknown[];
  deliveries: unknown;
  recordings: unknown[];
  submitterWorkNos: unknown;
  valid: boolean;
  validationErrors: unknown[];
  approvalStatus: string;
  approvedDate: Date;
  onHold: boolean;
  totalCollection: {
    totalOwnedMechanical: number;
    totalOwnedPerformance: number;
  };
  totalParticipation: number;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  identifierNo: number;
  copyrightDate: Date;
  labelCopy: string;
  significantUpdateDate: Date;
  significantUpdateToPartnerChains: {
    date: Date;
    deliveryPartnerId: Types.ObjectId;
  }[];
  deliveredTo: {
    deliveryPartnerId: Types.ObjectId;
    deliveredAt: Date;
  }[];
  forceRedelivery: Types.ObjectId[];
  holdRedelivery: Types.ObjectId[];
  inFutureDelivery: Types.ObjectId[];
  isIswcIrsEligible: boolean;
  isIswcIasEligible: boolean;
  source: {
    importId: Types.ObjectId;
    importPartnerId: Types.ObjectId;
    action: string;
    date: Date;
  }[];
  potentialDuplicates: { workId: Types.ObjectId }[];
  potentialDuplicatesCount: number;
  blacklistedDuplicateIds: string[];
  coreChain: [
    {
      composerId: string;
      contribution: number;
      category: string;
      publisherId: string;
      controlled: boolean;
    },
  ];
};

const work = new Schema<Work>(
  {
    clientId: String,
    campaignIds: Array,
    title: { type: String, required: true },
    alternateTitles: [alternateTitlesSchema.schema],
    composer: String,
    foreignId: String,
    projectId: String,
    identifier: String,
    partyNo: Number,
    tunecode: String,
    iswc: String,
    notes: String,
    trackIds: Array,
    salesReturnsRights: [rightsSchema.schema],
    salesReturnsRightsDisplay: Array, // [{ contractId: id, percentage: 75, children: [{ contractId: anotherId, percentage: 100 }] }]
    channelSpecificSalesReturnsRights: [
      {
        contractId: String,
        distributionChannel: String,
        source: String,
        territory: String,
        percentage: Number,
        publishers: [String],
        publisherFingerprint: String,
      },
    ],
    costsRights: [rightsSchema.schema],
    aliases: [String],
    societyIdentifiers: [societyIdentifierSchema.schema],
    contractValidation: String,
    duplicatedFrom: String,
    territories: Array,
    rightsChain: Array,
    partnerRightsChains: Array,
    usedComposerIds: Array,
    usedPublisherIds: Array,
    catalogueGroups: [String],
    grandRights: Boolean,
    priority: Boolean,
    enablePublisherMapping: { type: Boolean, default: false },
    productionLibrary: Boolean,
    productionTitle: String,
    cdIdentifier: String,
    cutNo: Number,
    libraryTitle: String,
    workLanguage: String,
    workDescriptionCategory: { type: String, default: 'Pop' },
    duration: Number,
    compositeType: { type: String, default: 'None' },
    compositeCount: Number,
    compositeWorks: [{ title: String, source: String }],
    versionType: { type: String, default: 'Original Work' },
    arrangementType: { type: String, default: 'Original' },
    lyricAdaptionType: { type: String, default: 'None' },
    originalWorkTitle: String,
    originalIswc: String,
    originalWorkWriterLastName: String,
    originalWorkWriterFirstName: String,
    originalWorkSource: String,
    performers: Array,
    deliveries: Object,
    recordings: Array, // Just for CWR Output
    submitterWorkNos: Object, // For CWR Input
    valid: { type: Boolean, default: false },
    validationErrors: Array,
    approvalStatus: { type: String, default: 'Invalid' },
    approvedDate: Date,
    onHold: { type: Boolean, default: false },
    totalCollection: {
      totalOwnedMechanical: { type: Number, default: 0 },
      totalOwnedPerformance: { type: Number, default: 0 },
    },
    totalParticipation: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    identifierNo: Number,
    copyrightDate: Date,
    labelCopy: String,
    significantUpdateDate: Date,
    significantUpdateToPartnerChains: [
      {
        date: Date,
        deliveryPartnerId: {
          type: Schema.Types.ObjectId,
          ref: 'DeliveryPartner',
        },
      },
    ],
    deliveredTo: [
      {
        deliveryPartnerId: {
          type: Schema.Types.ObjectId,
          ref: 'DeliveryPartner',
        },
        deliveredAt: Date,
      },
    ],
    forceRedelivery: [{ type: Schema.Types.ObjectId, ref: 'DeliveryPartner' }],
    holdRedelivery: [{ type: Schema.Types.ObjectId, ref: 'DeliveryPartner' }],
    inFutureDelivery: [{ type: Schema.Types.ObjectId, ref: 'DeliverySchedule' }],
    isIswcIrsEligible: { type: Boolean, default: false },
    isIswcIasEligible: { type: Boolean, default: false },
    source: [
      {
        importId: { type: Schema.Types.ObjectId, ref: 'Import' },
        importPartnerId: { type: Schema.Types.ObjectId, ref: 'ImportPartner' },
        action: String,
        date: Date,
      },
    ],
    potentialDuplicates: [
      {
        _id: false,
        workId: { type: Schema.Types.ObjectId, ref: 'Work' },
      },
    ],
    potentialDuplicatesCount: Number,
    blacklistedDuplicateIds: [String],
    coreChain: [
      {
        _id: false,
        composerId: String,
        contribution: Number,
        category: String,
        publisherId: String,
        controlled: Boolean,
      },
    ],
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// Indexes

// Used for catalogue management (duplicates) feature
work.index({ clientId: 1, potentialDuplicatesCount: -1, name: 1 });

// Filters used in work index
work.index({ clientId: 1, title: 1 });
work.index({ clientId: 1, catalogueGroups: 1 });
work.index({ clientId: 1, 'salesReturnsRights.contractId': 1 });
work.index({ clientId: 1, createdAt: 1 });
work.index({ clientId: 1, usedComposerlds: 1 });
work.index({ clientId: 1, usedPublisherlds: 1 });
work.index({ clientId: 1, approvalStatus: 1 });
work.index({ clientId: 1, onHold: 1 });
work.index({ clientId: 1, totalParticipation: 1 });
work.index({ clientId: 1, 'totalCollection.totalOwnedMechanical': 1 });

export default { name: 'Work', schema: work };
