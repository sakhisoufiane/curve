import { Schema, Types } from 'mongoose';
import crossContractSchema from './crossContractSchema';
import payeeSchema from './payeeSchema';

export type Contract = {
  accountingPeriod: string;
  active: boolean;
  advance: number;
  aliases: string[];
  autoPayment: boolean;
  autoPaymentConditions: {
    contractId: string;
    condition: string;
  }[];
  clientId: string;
  collectionEndDate: Date;
  companyId: string;
  complete: boolean;
  contractCategories: string[];
  contractType: string;
  costs: unknown[];
  costsTerms: {
    contractName: string;
    territory: unknown;
    escalationTrackers: string[];
    type: string;
    rate: number;
    escalations: {
      conditions: {
        escalationTracker: string;
        thresholdType: string;
        when: string;
        threshold: unknown;
      }[];
      rate: number;
    }[];
  }[];
  createdBy: Types.ObjectId;
  crossContracts: unknown[];
  currency: string;
  currentBalance: number;
  deductWithholding: boolean;
  deductionsTerms: {
    contractName: string;
    catType: string;
    catalogueGroup: unknown;
    territory: unknown;
    channel: unknown;
    configuration: unknown;
    priceCategory: unknown;
    source: unknown;
    escalationTrackers: string[];
    deductionBasis: string;
    type: string;
    unitRate: number;
    rate: number;
    escalations: {
      conditions: {
        escalationTracker: string;
        thresholdType: string;
        when: string;
        threshold: unknown;
      }[];
      rate: number;
      type: string;
      multiplier: number;
      reductionRate: number;
      reserve: number;
    }[];
  }[];
  endDate: Date;
  escalationEquivalents: unknown[];
  escalationTrackers: unknown[];
  escalationTracking: unknown;
  feesInvoice: boolean;
  files: unknown[];
  foreignId: string;
  labels: string[];
  lastModifiedBy: Types.ObjectId;
  licenseNo: string;
  mechanicalContractTerms: {
    contractName: string;
    catType: string;
    catalogueGroup: unknown;
    territory: unknown;
    channel: unknown;
    configuration: unknown;
    priceCategory: unknown;
    source: unknown;
    escalationTrackers: string[];
    type: string;
    rateBasis: string;
    rate: number;
    unitRate: number;
    reserve: number;
    escalations: {
      conditions: {
        escalationTracker: string;
        thresholdType: string;
        when: string;
        threshold: unknown;
      }[];
      rate: number;
      rateBasis: string;
      type: string;
      multiplier: number;
      reductionRate: number;
      reserve: number;
    }[];
  }[];
  mechanicalTerms: {
    contractName: string;
    catType: string;
    catalogueGroup: unknown;
    territory: unknown;
    channel: unknown;
    configuration: unknown;
    priceCategory: unknown;
    source: unknown;
    deductionType: string;
    type: string;
    rateBasis: string;
    rate: number;
    unitRate: number;
    reserve: number;
    currency: string;
  }[];
  minPayout: number;
  name: string;
  notes: string;
  openingBalance: number;
  partitionNo: number;
  payeeBalanceCondition: string;
  payees: unknown[];
  primaryContract: boolean;
  profitSharePercentage: number;
  projectId: string;
  releases: unknown[];
  reserveBasis: string;
  reserves: {
    _id: unknown;
    contractName: string;
    rate: number;
  }[];
  retentionPeriodEndDate: Date;
  salesTerms: {
    contractName: string;
    catType: string;
    catalogueGroup: unknown;
    territory: unknown;
    channel: unknown;
    configuration: unknown;
    priceCategory: unknown;
    source: unknown;
    escalationTrackers: string[];
    type: string;
    rate: number;
    multiplier: number;
    reductionRate: number;
    unitRate: number;
    reserve: number;
    escalations: {
      conditions: {
        escalationTracker: string;
        thresholdType: string;
        when: string;
        threshold: unknown;
      }[];
      rate: number;
      type: string;
      unitRate: number;
      multiplier: number;
      reductionRate: number;
      reserve: number;
    }[];
  }[];
  selfBilling: boolean;
  startDate: Date;
  statementDesign: string;
  summaryContractTotals: boolean;
  tracks: unknown[];
  transactions: unknown[];
  type: string;
  valid: boolean;
  validationErrors: unknown[];
  withholdingTaxTerms: {
    contractName: string;
    catType: string;
    catalogueGroup: unknown;
    territory: unknown;
    channel: unknown;
    configuration: unknown;
    priceCategory: unknown;
    source: unknown;
    escalationTrackers: string[];
    deductionBasis: string;
    type: string;
    unitRate: number;
    rate: number;
    escalations: {
      conditions: {
        escalationTracker: string;
        thresholdType: string;
        when: string;
        threshold: unknown;
      }[];
      rate: number;
      type: string;
      multiplier: number;
      reductionRate: number;
      reserve: number;
    }[];
  }[];
  works: unknown[];
  subClientId: Types.ObjectId;
  isMainSubClientContract: boolean;
};

const contract = new Schema<Contract>(
  {
    accountingPeriod: String,
    active: { type: Boolean, default: true },
    advance: Number,
    aliases: [{ type: String }],
    autoPayment: Boolean,
    autoPaymentConditions: [{ contractId: String, condition: String }],
    clientId: String,
    collectionEndDate: Date,
    companyId: String,
    complete: Boolean,
    contractCategories: [{ type: String }],
    contractType: String,
    costs: Array,
    costsTerms: [
      {
        _id: false,
        contractName: String,
        territory: Schema.Types.Mixed,
        escalationTrackers: [{ type: String }],
        type: { type: String },
        rate: Number,
        escalations: [
          {
            _id: false,
            conditions: [
              {
                _id: false,
                escalationTracker: String,
                thresholdType: String,
                when: String,
                threshold: Schema.Types.Mixed,
              },
            ],
            rate: Number,
          },
        ],
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    crossContracts: [crossContractSchema.schema],
    currency: { type: String, default: 'Home Currency' },
    currentBalance: { type: Number, default: 0 },
    deductWithholding: Boolean,
    deductionsTerms: [
      {
        _id: false,
        contractName: String,
        catType: String,
        catalogueGroup: Schema.Types.Mixed,
        territory: Schema.Types.Mixed,
        channel: Schema.Types.Mixed,
        configuration: Schema.Types.Mixed,
        priceCategory: Schema.Types.Mixed,
        source: Schema.Types.Mixed,
        escalationTrackers: [{ type: String }],
        deductionBasis: String,
        type: { type: String },
        unitRate: Number,
        rate: Number,
        escalations: [
          {
            _id: false,
            conditions: [
              {
                _id: false,
                escalationTracker: String,
                thresholdType: String,
                when: String,
                threshold: Schema.Types.Mixed,
              },
            ],
            rate: Number,
            type: { type: String },
            multiplier: Number,
            reductionRate: Number,
            reserve: Number,
          },
        ],
      },
    ],
    endDate: Date,
    escalationEquivalents: Array,
    escalationTrackers: Array,
    escalationTracking: Object,
    feesInvoice: Boolean,
    files: Array,
    foreignId: String,
    labels: [{ type: String }],
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    licenseNo: String,
    mechanicalContractTerms: [
      {
        _id: false,
        contractName: String,
        catType: String,
        catalogueGroup: Schema.Types.Mixed,
        territory: Schema.Types.Mixed,
        channel: Schema.Types.Mixed,
        configuration: Schema.Types.Mixed,
        priceCategory: Schema.Types.Mixed,
        source: Schema.Types.Mixed,
        escalationTrackers: [{ type: String }],
        type: { type: String },
        rateBasis: { type: String, default: 'US' },
        rate: Number,
        unitRate: Number,
        reserve: Number,
        escalations: [
          {
            _id: false,
            conditions: [
              {
                _id: false,
                escalationTracker: String,
                thresholdType: String,
                when: String,
                threshold: Schema.Types.Mixed,
              },
            ],
            rate: Number,
            rateBasis: { type: String, default: 'US' },
            type: { type: String },
            multiplier: Number,
            reductionRate: Number,
            reserve: Number,
          },
        ],
      },
    ],
    mechanicalTerms: [
      {
        _id: false,
        contractName: String,
        catType: String,
        catalogueGroup: Schema.Types.Mixed,
        territory: Schema.Types.Mixed,
        channel: Schema.Types.Mixed,
        configuration: Schema.Types.Mixed,
        priceCategory: Schema.Types.Mixed,
        source: Schema.Types.Mixed,
        deductionType: String,
        type: { type: String },
        rateBasis: { type: String, default: 'US' },
        rate: Number,
        unitRate: Number,
        reserve: Number,
        currency: String,
      },
    ],
    minPayout: { type: Number, default: 0 },
    name: { type: String, required: true },
    notes: String,
    openingBalance: { type: Number, default: 0 },
    partitionNo: Number,
    payeeBalanceCondition: {
      type: String,
      enum: ['Always', 'When Positive', 'Never'],
      default: 'Never',
    },
    payees: [payeeSchema.schema],
    primaryContract: Boolean,
    profitSharePercentage: { type: Number, default: 0 },
    projectId: String,
    releases: Array,
    reserveBasis: { type: String, default: 'Post-Calculation' },
    reserves: [{ _id: false, contractName: String, rate: Number }],
    retentionPeriodEndDate: Date,
    salesTerms: [
      {
        _id: false,
        contractName: String,
        catType: String,
        catalogueGroup: Schema.Types.Mixed,
        territory: Schema.Types.Mixed,
        channel: Schema.Types.Mixed,
        configuration: Schema.Types.Mixed,
        priceCategory: Schema.Types.Mixed,
        source: Schema.Types.Mixed,
        escalationTrackers: [{ type: String }],
        type: { type: String },
        rate: Number,
        multiplier: Number,
        reductionRate: Number,
        unitRate: Number,
        reserve: Number,
        escalations: [
          {
            _id: false,
            conditions: [
              {
                _id: false,
                escalationTracker: String,
                thresholdType: String,
                when: String,
                threshold: Schema.Types.Mixed,
              },
            ],
            rate: Number,
            type: { type: String },
            unitRate: Number,
            multiplier: Number,
            reductionRate: Number,
            reserve: Number,
          },
        ],
      },
    ],
    selfBilling: Boolean,
    startDate: Date,
    statementDesign: String,
    summaryContractTotals: Boolean,
    tracks: Array,
    transactions: Array,
    type: { type: String, default: 'Royalty' },
    valid: { type: Boolean, default: false },
    validationErrors: Array,
    withholdingTaxTerms: [
      {
        _id: false,
        contractName: String,
        catType: String,
        catalogueGroup: Schema.Types.Mixed,
        territory: Schema.Types.Mixed,
        channel: Schema.Types.Mixed,
        configuration: Schema.Types.Mixed,
        priceCategory: Schema.Types.Mixed,
        source: Schema.Types.Mixed,
        escalationTrackers: [{ type: String }],
        deductionBasis: String,
        type: { type: String },
        unitRate: Number,
        rate: Number,
        escalations: [
          {
            _id: false,
            conditions: [
              {
                _id: false,
                escalationTracker: String,
                thresholdType: String,
                when: String,
                threshold: Schema.Types.Mixed,
              },
            ],
            rate: Number,
            type: { type: String },
            multiplier: Number,
            reductionRate: Number,
            reserve: Number,
          },
        ],
      },
    ],
    works: Array,
    subClientId: { type: Schema.Types.ObjectId, ref: 'SubClient' },
    isMainSubClientContract: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Contract', schema: contract };
