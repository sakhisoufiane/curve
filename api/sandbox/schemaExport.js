const mongoose = require('@curveroyaltysystems/models/mongoose');

const { Schema } = mongoose;
const String = 'String';
const Number = 'Number';
const Date = 'Date';
const Array = 'Array';
const Boolean = 'Boolean';
Schema.Types.Mixed = 'Schema.Types.Mixed';
Schema.Types.ObjectId = 'Schema.Types.ObjectId';

// api
const schema1 = {
  clientId: String,
  name: String,
  setupStage: String,
  year: Number,
  accountingPeriod: String,
  accountingPeriodType: String,
  startDate: Date,
  endDate: Date,
  accountingDate: Date,
  forceFull: { type: Boolean, default: false },
  recalculation: Object, // @todo efine object schema
  calculationLog: Array, // @todo efine object schema
  exchangeRates: { type: Object, default: {} }, // This is to be removed over time, left in for previous periods that may have used it
  // currencyExchangeRates: [new Schema({ from: String, to: String, rate: Number })],
  status: String,
  contractType: { type: String, default: 'Standard' },
  calculationStatus: String,
  calculationError: Schema.Types.Mixed,
  processStartTime: Date,
  processEndTime: Date,
  salesFilesIds: Array,
  costIds: Array,
  usedReleaseIds: Array,
  usedTrackIds: Array,
  usedWorkIds: Array,
  totalContractsForCalculation: Number,
  units: Number,
  grossAmount: Number,
  netAmount: Number,
  grossCosts: Number,
  netCosts: Number,
  lines: Number,
  valid: Boolean,
  invalidLines: Number,
  completedCatalogueItems: { type: Number, default: 0 },
  completedCostCatalogueItems: { type: Number, default: 0 },
  allCalculatedSalesCsv: String,
  allCalculatedSalesCsvPublicLink: String,
  allCalculatedCostsCsv: String,
  allCalculatedCostsCsvPublicLink: String,
  unreportedSalesCsv: String,
  unreportedSalesCsvPublicLink: String,
  unreportedCostsCsv: String,
  unreportedCostsCsvPublicLink: String,
  suspenseCsv: String,
  suspenseCsvPublicLink: String,
  escalationStartingFigures: Array,
  generalLedgerSummary: String,
  generalLedgerSummaryPublicLink: String,
  customStatement: String,
  customStatementPublicLink: String,
  statementsZip: String,
  statementsZipPublicLink: String,
  analysis: Schema.Types.Mixed,
  runNo: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  skipDateValidation: Boolean,
  // calculationNotes: [calculationNotesSchema],
  platoon: {
    fileNumberLast: { type: Number, default: 0 },
    summaryNumber: { type: Number, default: 1 },
    files: Array,
    unreportedFileUsed: String,
    unreportedAddedToFile: { type: Boolean, default: false },
    unreportedFileOutput: String,
    unreportedFileCreated: Date,
  },
  sqsBatchQueue: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  fuga: {
    blockedStatus: { type: Boolean, default: false },
  },
  salesPartitionNos: Array,
  usedContractIds: Array,
};

// processor
const schema2 = {
  clientId: String,
  name: String,
  setupStage: String,
  year: Number,
  accountingPeriod: String,
  accountingPeriodType: String,
  startDate: Date,
  endDate: Date,
  accountingDate: Date,
  forceFull: { type: Boolean, default: false },
  recalculation: Object, // @todo define object schema
  calculationLog: Array, // @todo define object schema
  exchangeRates: { type: Object, default: {} },
  // currencyExchangeRates: Array,
  status: String,
  contractType: { type: String, default: 'Standard' },
  calculationStatus: String,
  calculationError: Schema.Types.Mixed,
  processStartTime: Date,
  processEndTime: Date,
  salesFilesIds: Array,
  salesPartitionNos: Array,
  costIds: Array,
  usedContractIds: Array,
  totalContractsForCalculation: Number,
  units: Number,
  grossAmount: Number,
  netAmount: Number,
  grossCosts: Number,
  netCosts: Number,
  lines: Number,
  valid: Boolean,
  invalidLines: Number,
  completedCatalogueItems: { type: Number, default: 0 },
  completedCostCatalogueItems: { type: Number, default: 0 },
  allCalculatedSalesCsv: String,
  allCalculatedSalesCsvPublicLink: String,
  allCalculatedCostsCsv: String,
  allCalculatedCostsCsvPublicLink: String,
  unreportedSalesCsv: String,
  unreportedSalesCsvPublicLink: String,
  unreportedCostsCsv: String,
  unreportedCostsCsvPublicLink: String,
  suspenseCsv: String,
  suspenseCsvPublicLink: String,
  generalLedgerSummary: String,
  generalLedgerSummaryPublicLink: String,
  customStatement: String,
  customStatementPublicLink: String,
  statementsZip: String,
  statementsZipPublicLink: String,
  analysis: Schema.Types.Mixed,
  escalationStartingFigures: Array,
  runNo: { type: Number, default: 0 },
  // calculationNotes: [calculationNotesSchema],
  sqsBatchQueue: String,
  platoon: {
    fileNumberLast: { type: Number, default: 0 },
    summaryNumber: { type: Number, default: 1 },
    files: Array,
    unreportedFileUsed: String,
    unreportedAddedToFile: { type: Boolean, default: false },
    unreportedFileOutput: String,
    unreportedFileCreated: Date,
  },
  fuga: {
    blockedStatus: { type: Boolean, default: false },
  },
};

(() => {
  const fields = [];

  for (const field in schema1) { if (!fields.includes(field)) { fields.push(field); } }

  for (const field in schema2) { if (!fields.includes(field)) { fields.push(field); } }

  fields.sort();
  console.log(fields);

  const schema = {};

  const conflictingFields = [];
  for (const field of fields) {
    if (schema1[field] && schema2[field] && schema1[field].toString() !== schema2[field].toString()) {
      conflictingFields.push({
        field,
        api: schema1[field],
        processor: schema2[field],
      });
    } else {
      schema[field] = schema1[field] || schema2[field];
    }
  }

  if (JSON.stringify(schema1) === JSON.stringify(schema2)) {
    console.log('-- Identical schemas --');
    return;
  }

  if (conflictingFields.length) {
    console.log('!!! ============ Conflicting Schema ============ !!!');
    console.log(conflictingFields);
  } else {
    console.log(schema);
    console.log(`Schema 1 has ${Object.keys(schema1).length} fields`);
    console.log(`Schema 2 has ${Object.keys(schema2).length} fields`);
    console.log(`Output Schema has ${Object.keys(schema).length} fields`);
    console.log('Differing fields:', getDifference(Object.keys(schema1), Object.keys(schema2)));
  }
})();

function getDifference(array1, array2) {
  const difference1 = array1.filter((item) => !array2.includes(item)).map((f) => `${f} (api)`);
  const difference2 = array2.filter((item) => !array1.includes(item)).map((f) => `${f} (processor)`);
  return [...difference1, ...difference2];
}
