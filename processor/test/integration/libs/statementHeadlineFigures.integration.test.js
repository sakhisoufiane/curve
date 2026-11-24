// @TODO: take to jest. It's easy

process.env.NODE_ENV = 'test';
require('../../../models/db');

const { testUtils, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');

let bigQuery;

const StatementHeadlineFigures = require('../../../libs/statementHeadlineFigures');

let event;

async function writeToDb(data, table) {
  await bigQuery.client
    .dataset(bigQuery.datasetName)
    .table(table)
    .insert(data);
}

const bqTestUtils = new BigQueryTestUtils();

describe('StatementHeadlineFigures', () => {
  const periodIds = [testUtils.randomId(), testUtils.randomId()];
  const contractIds = [testUtils.randomId(), testUtils.randomId()];
  const salesFileIds = [testUtils.randomId(), testUtils.randomId()];
  const costIds = [testUtils.randomId(), testUtils.randomId()];

  const output1 = {
    periodId: periodIds[0],
    contractId: contractIds[0],
    salesFileId: salesFileIds[0],
    units: testUtils.randomFloat(),
    homeCurrencyNetAmount: testUtils.randomFloat(),
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
    contractCurrencyReserve: testUtils.randomFloat(),
    contractCurrencyWithholdingTax: testUtils.randomFloat(),
    contractCurrencyProRataAmount: testUtils.randomFloat(),
    contractCurrencyNetAmount: testUtils.randomFloat(),
    contractCurrencyMechanicalDeduction: testUtils.randomFloat(),
    contractCurrencyDeduction: testUtils.randomFloat(),
  };

  const output2 = {
    periodId: periodIds[1],
    contractId: contractIds[1],
    salesFileId: salesFileIds[1],
    units: testUtils.randomFloat(),
    homeCurrencyNetAmount: testUtils.randomFloat(),
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
    contractCurrencyReserve: testUtils.randomFloat(),
    contractCurrencyWithholdingTax: testUtils.randomFloat(),
    contractCurrencyProRataAmount: testUtils.randomFloat(),
    contractCurrencyNetAmount: testUtils.randomFloat(),
    contractCurrencyMechanicalDeduction: testUtils.randomFloat(),
    contractCurrencyDeduction: testUtils.randomFloat(),
  };

  const cost1 = {
    periodId: periodIds[0],
    contractId: contractIds[0],
    costId: costIds[0],
    amount: testUtils.randomFloat(),
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
    contractCurrencyAmount: testUtils.randomFloat(),

  };

  const cost2 = {
    periodId: periodIds[1],
    contractId: contractIds[1],
    costId: costIds[1],
    amount: testUtils.randomFloat(),
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
    contractCurrencyAmount: testUtils.randomFloat(),

  };

  let clientId;

  before(async () => {
    clientId = testUtils.randomId();
    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();
  });

  beforeEach(async () => {
    event = {
      clientId,
      bigQuery,
      outputFilter: {},
      salesOutputFilter: {},
    };

    await writeToDb([output1, output2], bigQuery.outputTable);
    await writeToDb([cost1, cost2], bigQuery.costsTable);
  });

  afterEach(function (done) {
    testUtils.cleanUp(clientId, done);
  });

  after(function (done) {
    bqTestUtils.stopTestContainer().then(() => {
      testUtils.cleanUp(clientId, done);
    });
  });

  it('should get the result', (done) => {
    // Arrange
    const statementHeadlineFiguresResult = {};
    statementHeadlineFiguresResult[contractIds[0]] = {
      units: output1.units,
      grossAmount: output1.contractCurrencyNetAmount,
      proRataGrossAmount: output1.contractCurrencyProRataAmount,
      netAmount: output1.contractCurrencyCalculationOutput,
      reservesWithheld: output1.contractCurrencyReserve,
      withholdingTax: output1.contractCurrencyWithholdingTax,
      mechanicalDeduction: output1.contractCurrencyMechanicalDeduction,
      deduction: output1.contractCurrencyDeduction,
      salesFilesIds: [salesFileIds[0]],
      grossCosts: cost1.contractCurrencyAmount,
      netCosts: cost1.contractCurrencyCalculationOutput,
      costIds: [costIds[0]],
      netOutput: output1.contractCurrencyCalculationOutput - cost1.contractCurrencyCalculationOutput,
    };
    statementHeadlineFiguresResult[contractIds[1]] = {
      units: output2.units,
      grossAmount: output2.contractCurrencyNetAmount,
      proRataGrossAmount: output2.contractCurrencyProRataAmount,
      netAmount: output2.contractCurrencyCalculationOutput,
      reservesWithheld: output2.contractCurrencyReserve,
      withholdingTax: output2.contractCurrencyWithholdingTax,
      mechanicalDeduction: output2.contractCurrencyMechanicalDeduction,
      deduction: output2.contractCurrencyDeduction,
      salesFilesIds: [salesFileIds[1]],
      grossCosts: cost2.contractCurrencyAmount,
      netCosts: cost2.contractCurrencyCalculationOutput,
      costIds: [costIds[1]],
      netOutput: output2.contractCurrencyCalculationOutput - cost2.contractCurrencyCalculationOutput,
    };
    // Act
    StatementHeadlineFigures(event, (err, result) => {
      // Assert
      expect(result[contractIds[0]]).to.deep.eq(statementHeadlineFiguresResult[contractIds[0]]);
      expect(result[contractIds[1]]).to.deep.eq(statementHeadlineFiguresResult[contractIds[1]]);
      done(err);
    });
  });
});
