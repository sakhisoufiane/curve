process.env.NODE_ENV = 'test';
require('../../../models/db');

const { testUtils, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const { MongoClient } = require('mongodb');
const config = require('../../../config.json');
const Cost = require('../../../models/cost');
const PeriodHeadlineFigures = require('../../../libs/periodHeadlineFigures');

let bigQuery;

let periodIds; let contractIds; let salesFileIds; let salesLineIds; let costIds;

let bigQueryOutput1; let bigQueryOutput2;

let bigQueryInput1; let bigQueryInput2;

let bigQueryCost1; let bigQueryCost2;

let mongoCost1; let mongoCost2;

let event;
let db;
let clientId;

async function writeToDb(data, table) {
  await bigQuery.client
    .dataset(bigQuery.datasetName)
    .table(table)
    .insert(data);
}

const bqTestUtils = new BigQueryTestUtils();

describe('PeriodHeadlineFigures', () => {
  before(async () => {
    clientId = testUtils.randomId();
    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();
  });

  beforeEach(async () => {
    periodIds = [testUtils.randomId(), testUtils.randomId()];
    contractIds = [testUtils.randomId(), testUtils.randomId()];
    salesFileIds = [testUtils.randomId(), testUtils.randomId()];
    salesLineIds = [testUtils.randomId(), testUtils.randomId()];
    costIds = [testUtils.randomId(), testUtils.randomId()];

    bigQueryOutput1 = { periodId: periodIds[0], contractId: contractIds[1], salesFileId: salesFileIds[0], salesLineId: salesLineIds[0], units: testUtils.randomFloat(), homeCurrencyNetAmount: testUtils.randomFloat(), calculationOutput: testUtils.randomFloat(), reserve: testUtils.randomFloat(), withholdingTax: testUtils.randomFloat() };
    bigQueryOutput2 = { periodId: periodIds[0], contractId: contractIds[0], salesFileId: salesFileIds[1], salesLineId: salesLineIds[1], units: testUtils.randomFloat(), homeCurrencyNetAmount: testUtils.randomFloat(), calculationOutput: testUtils.randomFloat(), reserve: testUtils.randomFloat(), withholdingTax: testUtils.randomFloat() };

    bigQueryInput1 = { id: salesLineIds[0], units: testUtils.randomFloat(), homeCurrencyNetAmount: testUtils.randomFloat() };
    bigQueryInput2 = { id: salesLineIds[1], units: testUtils.randomFloat(), homeCurrencyNetAmount: testUtils.randomFloat() };

    bigQueryCost1 = { periodId: periodIds[0], contractId: contractIds[0], costId: costIds[0], amount: testUtils.randomFloat(), calculationInput: testUtils.randomFloat(), calculationOutput: testUtils.randomFloat() };
    bigQueryCost2 = { periodId: periodIds[0], contractId: contractIds[0], costId: costIds[1], amount: testUtils.randomFloat(), calculationInput: testUtils.randomFloat(), calculationOutput: testUtils.randomFloat() };

    await writeToDb([bigQueryOutput1, bigQueryOutput2], bigQuery.outputTable);
    await writeToDb([bigQueryInput1, bigQueryInput2], bigQuery.inputTable);
    await writeToDb([bigQueryCost1, bigQueryCost2], bigQuery.costsTable);

    mongoCost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString(), clientId, periodId: periodIds[0], contractId: contractIds[0], costId: costIds[0], amount: testUtils.randomFloat(), currency: 'Home Currency' });
    await mongoCost1.save();
    mongoCost2 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString(), clientId, periodId: periodIds[0], contractId: contractIds[0], costId: costIds[1], amount: testUtils.randomFloat(), currency: 'Home Currency' });
    await mongoCost2.save();

    db = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);

    event = {
      clientId,
      bigQuery,
      db,
      outputFilter: {},
      salesOutputFilter: {},
      salesInputDatabaseUrl: config.databaseUrl.test,
      costsInputDatabaseTable: 'costs',
      inputFilter: {},
    };
  });

  afterEach((done) => {
    testUtils.cleanUp(clientId, done);
  });

  after(async () => {
    await bqTestUtils.stopTestContainer();
  });

  it('should get the result', (done) => {
    // Arrange
    const expectedGrossCosts = bigQueryCost1.calculationInput + bigQueryCost2.calculationInput;
    const expectedUnits = bigQueryInput1.units + bigQueryInput2.units;
    const expectedGrossRevenue = bigQueryInput1.homeCurrencyNetAmount + bigQueryInput2.homeCurrencyNetAmount;
    const expectedLines = 2;
    const expectedNetPayout = bigQueryOutput1.calculationOutput + bigQueryOutput2.calculationOutput;
    const expectedReservesWithheld = bigQueryOutput1.reserve + bigQueryOutput2.reserve;
    const expectedWithholdingTax = bigQueryOutput1.withholdingTax + bigQueryOutput2.withholdingTax;
    const expectedNetCosts = bigQueryCost1.calculationOutput + bigQueryCost2.calculationOutput;
    const expectedSalesFileIds = salesFileIds;
    const expectedCostIds = costIds;
    // Act
    PeriodHeadlineFigures(event, (err, result) => {
      // Assert
      expect(result.grossCosts).to.deep.eq(expectedGrossCosts);
      expect(result.units).to.deep.eq(expectedUnits);
      expect(result.grossRevenue).to.deep.eq(expectedGrossRevenue);
      expect(result.lines).to.deep.eq(expectedLines);
      expect(result.netPayout).to.deep.eq(expectedNetPayout);
      expect(result.reservesWithheld).to.deep.eq(expectedReservesWithheld);
      expect(result.withholdingTax).to.deep.eq(expectedWithholdingTax);
      expect(result.netCosts).to.deep.eq(expectedNetCosts);
      expect(result.salesFileIds.sort()).to.deep.eq(expectedSalesFileIds.sort());
      expect(result.costIds.sort()).to.deep.eq(expectedCostIds.sort());
      done(err);
    });
  });
});
