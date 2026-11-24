import { Schema, Types } from 'mongoose';
import rightsSchema from './rightsSchema';

export type Release = {
  clientId: string;
  campaignIds: unknown[];
  title: string;
  version: string;
  artist: string;
  foreignId: string;
  projectId: string;
  catNo: string;
  barcode: string;
  label: string;
  releaseDate: Date;
  distributionChannel: string;
  format: string;
  priceCategory: string;
  dealerPrice: number;
  priceCategoryDealerPrices: unknown[];
  mcpsId: string;
  mcpsTvAdvertised: boolean;
  salesReturnsRights: unknown[];
  costsRights: unknown[];
  aliases: string[];
  fugaId: string;
  trackIds: unknown[];
  allTracksContracts: boolean;
  contractValidation: string;
  duplicatedFrom: string;
  catalogueGroups: string[];
  mechanicalTrackCap: number;
  controlledCompositionClause: boolean;
  mechanicalBasisPercentage: number;
  mechanicalLicenses: unknown;
  mechanicalAmount: unknown;
  totalMechanicalAmount: number;
  mechanicalBreakdown: unknown[];
  mechanicalContractIds: unknown[];
  mechanicalComposerIds: unknown[];
  mechanicalPublisherIds: unknown[];
  totalParticipation: number;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  valid: boolean;
  validationErrors: unknown[];
  externalIngestionId: string;
  spotifyId: string;
  skipPostSaveHook: boolean;
  skipPreSaveHook: boolean;
};

const release = new Schema<Release>(
  {
    clientId: String,
    campaignIds: Array,
    title: String,
    version: String,
    artist: String,
    foreignId: String,
    projectId: String,
    catNo: String,
    barcode: String,
    label: String,
    releaseDate: Date,
    distributionChannel: String,
    format: String,
    priceCategory: String,
    dealerPrice: Number,
    priceCategoryDealerPrices: Array,
    mcpsId: String,
    mcpsTvAdvertised: Boolean,
    salesReturnsRights: [rightsSchema.schema],
    costsRights: [rightsSchema.schema],
    aliases: [String],
    fugaId: String,
    trackIds: Array,
    allTracksContracts: Boolean,
    contractValidation: String,
    duplicatedFrom: String,
    catalogueGroups: [String],
    mechanicalTrackCap: Number,
    controlledCompositionClause: Boolean,
    mechanicalBasisPercentage: { type: Number, default: 100 },
    mechanicalLicenses: { type: Object, default: {} },
    // Used to store release mechanical amount before calculation start
    mechanicalAmount: Object,
    totalMechanicalAmount: Number,
    mechanicalBreakdown: Array,
    mechanicalContractIds: Array,
    mechanicalComposerIds: Array,
    mechanicalPublisherIds: Array,
    totalParticipation: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    valid: { type: Boolean, default: false },
    validationErrors: Array,
    externalIngestionId: String,
    spotifyId: String,
    skipPostSaveHook: { type: Boolean, default: false },
    skipPreSaveHook: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Release', schema: release };
