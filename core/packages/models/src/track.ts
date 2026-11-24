import { Schema, Types } from 'mongoose';
import rightsSchema from './rightsSchema';
import releaseSpecificRightsSchema from './releaseSpecificRightsSchema';

export type Track = {
  clientId: string;
  campaignIds: unknown[];
  title: string;
  version: string;
  artist: string;
  foreignId: string;
  projectId: string;
  isrc: string;
  label: string;
  pLine: string;
  salesReturnsRights: unknown[];
  releaseSpecificSalesReturnsRights: unknown[];
  costsRights: unknown[];
  aliases: string[];
  fugaId: string;
  releaseIds: unknown[];
  workIds: unknown[];
  duration: number;
  defaultReleaseId: string;
  contractValidation: string;
  duplicatedFrom: string;
  catalogueGroups: string[];
  statutoryRate: number;
  canadianStatutoryRate: number;
  mechanicalLicenses: unknown[];
  mechanicalContractIds: unknown[];
  releaseSpecificForeignIds: unknown;
  reportMechanicals: boolean;
  totalParticipation: number;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  valid: boolean;
  validationErrors: unknown[];
  mechanicalCalculationBasis: string;
  externalIngestionId: string;
  spotifyId: string;
  tags: string[];
  skipPostSaveHook: boolean;
  skipPreSaveHook: boolean;
  useAlternativeId: boolean;
  alternativeId: string;
  linkedIsrc: string;
};

const track = new Schema<Track>(
  {
    clientId: String,
    campaignIds: Array,
    title: String,
    version: String,
    artist: String,
    foreignId: String,
    projectId: String,
    isrc: String,
    label: String,
    pLine: String,
    salesReturnsRights: [rightsSchema.schema],
    releaseSpecificSalesReturnsRights: [releaseSpecificRightsSchema.schema],
    costsRights: [rightsSchema.schema],
    aliases: [String],
    fugaId: String,
    releaseIds: Array,
    workIds: Array,
    duration: Number,
    defaultReleaseId: String,
    contractValidation: String,
    duplicatedFrom: String,
    catalogueGroups: [String],
    statutoryRate: Number,
    canadianStatutoryRate: Number,
    mechanicalLicenses: Array,
    mechanicalContractIds: Array,
    releaseSpecificForeignIds: { type: Object, default: {} },
    reportMechanicals: { type: Boolean, default: true },
    totalParticipation: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    valid: { type: Boolean, default: false },
    validationErrors: Array,
    mechanicalCalculationBasis: { type: String, default: 'Custom' },
    externalIngestionId: String,
    spotifyId: String,
    tags: [String],
    useAlternativeId: { type: Boolean, default: false },
    alternativeId: String,
    linkedIsrc: String,
    skipPostSaveHook: { type: Boolean, default: false },
    skipPreSaveHook: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    minimize: false,
  },
);
track.index(
  { clientId: 1, alternativeId: 1 },
  { partialFilterExpression: { useAlternativeId: true, alternativeId: { $type: 'string' } }, unique: true },
);

export default { name: 'Track', schema: track };
