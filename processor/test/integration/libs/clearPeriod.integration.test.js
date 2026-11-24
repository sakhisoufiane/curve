process.env.NODE_ENV = 'test';
require('../../../models/db');

const { testUtils, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const rewire = require('rewire');
const { MongoClient } = require('mongodb');
const config = require('../../../config.json');
const Cost = require('../../../models/cost');
const McpsRetention = require('../../../models/mcpsRetention');
const McpsNegative = require('../../../models/mcpsNegative');

const ClearPeriod = rewire('../../../libs/clearPeriod');

const bqTestUtils = new BigQueryTestUtils();

// Connect to BigQuery
let bigQuery;

async function writeToDb(data, table) {
  await bigQuery.client
    .dataset(bigQuery.datasetName)
    .table(table)
    .insert(data);
}

async function deleteFromDb(table, query) {
  await new Promise((resolve, reject) => {
    bigQuery.deleteData(table, query, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

describe('clearPeriod Integration Tests', () => {
  let clientId;
  before(async () => {
    clientId = testUtils.randomId();
    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();
  });

  afterEach((done) => {
    testUtils.cleanUp(clientId, done);
  });

  after((done) => {
    bqTestUtils.stopTestContainer().then(() => {
      testUtils.cleanUp(clientId, done);
    });
  });

  describe('sales', () => {
    describe("When type is NOT 'Statement'", function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      const contractIds = [testUtils.randomId(), testUtils.randomId()];
      const contractId = testUtils.randomId();

      const output1 = { periodId: periodId1, contractId: contractIds[0], salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      const output2 = { periodId: periodId1, contractId, salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      const output3 = { periodId: periodId2, contractId: contractIds[0], salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      const output4 = { periodId: periodId2, contractId, salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      before(async () => {
        await writeToDb([output1, output2, output3, output4], bigQuery.outputTable);
      });

      after((done) => {
        done();
      });

      it('should clear the output table based on { periodId: event.periodId }', (done) => {
        // Arrange
        const event = {
          periodId: periodId1,
          contractIds,
          bigQuery,
        };
        // Act
        ClearPeriod.__get__('sales')(event, (err) => {
          bigQuery.getData(bigQuery.outputTable, '*', {}, {}, (err, data) => {
          // Assert
          // Should have deleted Output1 and Output2
            expect(data.length).to.eq(2);
            expect(data[0].periodId).to.eq(periodId2);
            expect(data[1].periodId).to.eq(periodId2);

            done(err);
          });
        });
      });
    });

    describe("When type is 'Statement'", function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      const contractIds = [testUtils.randomId(), testUtils.randomId()];
      const contractId = testUtils.randomId();

      const output1 = { periodId: periodId1, contractId: contractIds[0], salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      const output2 = { periodId: periodId1, contractId, salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      const output3 = { periodId: periodId2, contractId: contractIds[0], salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      const output4 = { periodId: periodId2, contractId, salesFileId: testUtils.randomId(), salesLineId: testUtils.randomId() };

      before(async () => {
        // Clean BigQuery table
        await deleteFromDb(bigQuery.outputTable, { periodId: { $exists: true } });
        await writeToDb([output1, output2, output3, output4], bigQuery.outputTable);
      });

      afterEach(async () => {
        await deleteFromDb(bigQuery.outputTable, { periodId: { $exists: true } });
      });

      after(async () => {
        await deleteFromDb(bigQuery.outputTable, { periodId: { $exists: true } });
      });

      it('should clear the output table based on { periodId: event.periodId, contractId: { $in: event.contractIds }', (done) => {
        // Arrange
        const event = {
          periodId: periodId1,
          contractIds,
          bigQuery,
          type: 'Statement',
        };
        // Act
        ClearPeriod.__get__('sales')(event, (err) => {
          bigQuery.getData(bigQuery.outputTable, '*', {}, {}, (err, data) => {
            // Assert
            // Should have deleted Output1
            expect(data.length).to.eq(3);
            expect(data[0]).to.satisfy((output) => !!((output.periodId === periodId2 || output.contractId === contractId)));
            expect(data[1]).to.satisfy((output) => !!((output.periodId === periodId2 || output.contractId === contractId)));
            expect(data[2]).to.satisfy((output) => !!((output.periodId === periodId2 || output.contractId === contractId)));

            done();
          });
        });
      });
    });
  });

  describe('outputCosts', () => {
    describe("When type is NOT 'Statement'", function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      const contractIds = [testUtils.randomId(), testUtils.randomId()];
      const contractId = testUtils.randomId();

      const cost1 = { periodId: periodId1, contractId: contractIds[0], costId: testUtils.randomId() };

      const cost2 = { periodId: periodId1, contractId, costId: testUtils.randomId() };

      const cost3 = { periodId: periodId2, contractId: contractIds[0], costId: testUtils.randomId() };

      const cost4 = { periodId: periodId2, contractId, costId: testUtils.randomId() };

      before(async () => {
        // Clean BigQuery table
        await deleteFromDb(bigQuery.costsTable, { periodId: { $exists: true } });
        await writeToDb([cost1, cost2, cost3, cost4], bigQuery.costsTable);
      });

      after(async () => {
        await deleteFromDb(bigQuery.costsTable, { periodId: { $exists: true } });
      });

      it('should clear the output table based on { periodId: event.periodId }', (done) => {
        // Arrange
        const event = {
          periodId: periodId1,
          contractIds,
          bigQuery,
        };
        // Act
        ClearPeriod.__get__('outputCosts')(event, (err) => {
          bigQuery.getData(bigQuery.costsTable, '*', {}, {}, (err, data) => {
            // Assert
            // Should have deleted Output1 and Output2
            expect(data.length).to.eq(2);
            expect(data[0].periodId).to.eq(periodId2);
            expect(data[1].periodId).to.eq(periodId2);

            done();
          });
        });
      });
    });

    describe("When type is 'Statement'", function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      const contractIds = [testUtils.randomId(), testUtils.randomId()];
      const contractId = testUtils.randomId();

      const cost1 = { periodId: periodId1, contractId: contractIds[0], costId: testUtils.randomId() };

      const cost2 = { periodId: periodId1, contractId, costId: testUtils.randomId() };

      const cost3 = { periodId: periodId2, contractId: contractIds[0], costId: testUtils.randomId() };

      const cost4 = { periodId: periodId2, contractId, costId: testUtils.randomId() };

      before(async () => {
        // Clean BigQuery table
        await deleteFromDb(bigQuery.costsTable, { periodId: { $exists: true } });
        await writeToDb([cost1, cost2, cost3, cost4], bigQuery.costsTable);
      });

      after(async () => {
        await deleteFromDb(bigQuery.costsTable, { periodId: { $exists: true } });
      });

      it('should clear the output table based on { periodId: event.periodId, contractId: { $in: event.contractIds }', (done) => {
        // Arrange
        const event = {
          periodId: periodId1,
          contractIds,
          bigQuery,
          type: 'Statement',
        };
        // Act
        ClearPeriod.__get__('outputCosts')(event, (err) => {
          bigQuery.getData(bigQuery.costsTable, '*', {}, {}, (err, data) => {
            // Assert
            // Should have deleted Output1
            expect(data.length).to.eq(3);
            expect(data[0]).to.satisfy((output) => !!((output.periodId === periodId2 || output.contractId === contractId)));
            expect(data[1]).to.satisfy((output) => !!((output.periodId === periodId2 || output.contractId === contractId)));
            expect(data[2]).to.satisfy((output) => !!((output.periodId === periodId2 || output.contractId === contractId)));

            done();
          });
        });
      });
    });
  });

  describe('inputCosts', function () {
    describe(' when event type is Statement', () => {
      const periodId1 = testUtils.randomId();
      const contractIds = [testUtils.randomId(), testUtils.randomId()];
      const contractId = testUtils.randomId();

      let cost1;
      let cost2;
      let db;

      before(async () => {
        // Save to Mongo DB
        cost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString(), clientId, periodIds: [periodId1], calculationContractIds: contractIds });
        await cost1.save();
        cost2 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString(), clientId, periodIds: [periodId1], calculationContractIds: [contractIds[0], contractId] });
        await cost2.save();
        const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
        db = mongoClient.db();
      });

      it('should clean costs table using the right filters', async () => {
        // Arrange
        const event = {
          clientId,
          contractIds,
          periodId: periodId1,
          costsDatabaseTable: 'costs',
          type: 'Statement',
          db,
        };
        // Act
        await ClearPeriod.__get__('inputCosts')(event);
        const costs = await Cost.find({ clientId });
        // Assert
        expect(costs[0]).to.satisfy((cost) => !!(((cost._id.toString() === cost1._id.toString() && cost.calculationContractIds.length === 0) || (cost._id.toString() === cost2._id.toString() && cost.calculationContractIds[0].toString() === contractId.toString()))));
        expect(costs[1]).to.satisfy((cost) => !!(((cost._id.toString() === cost1._id.toString() && cost.calculationContractIds.length === 0) || (cost._id.toString() === cost2._id.toString() && cost.calculationContractIds[0].toString() === contractId.toString()))));
      });
    });

    describe(' when event type is NOT Statement', () => {
      const contractIds = [testUtils.randomId(), testUtils.randomId()];
      const periodIds = [testUtils.randomId(), testUtils.randomId()];
      const periodId = testUtils.randomId();
      const contractId = testUtils.randomId();

      let cost1;
      let cost2;
      let db;

      before(async () => {
        // Save to Mongo DB
        cost1 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString(), clientId, periodIds, calculationContractIds: contractIds });
        await cost1.save();
        cost2 = new Cost({ name: testUtils.randomString(), type: testUtils.randomString(), clientId, periodIds: [periodIds[0], periodId], calculationContractIds: [contractIds[0], contractId] });
        await cost2.save();
        const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
        db = mongoClient.db();
      });

      it('should clean costs table using the right filters', async () => {
        // Arrange
        const event = {
          clientId,
          contractIds,
          periodId,
          costsDatabaseTable: 'costs',
          type: testUtils.randomString(),
          db,
        };
        // Act
        await ClearPeriod.__get__('inputCosts')(event);
        const costs = await Cost.find({ clientId });
        // Assert
        expect(costs[0]).to.satisfy((cost) => !!((
          (
            (cost._id.toString() === cost1._id.toString() && cost.calculationContractIds.length === 2)
            || (cost._id.toString() === cost2._id.toString() && cost.calculationContractIds[0].toString() === contractId.toString())
          )
          && (
            (cost._id.toString() === cost1._id.toString() && cost.calculationContractIds.length === 2)
            || (cost._id.toString() === cost2._id.toString() && cost.periodIds[0].toString() !== periodId.toString())
          )
        )));
        expect(costs[1]).to.satisfy((cost) => !!((
          (
            (cost._id.toString() === cost1._id.toString() && cost.calculationContractIds.length === 2)
            || (cost._id.toString() === cost2._id.toString() && cost.calculationContractIds[0].toString() === contractId.toString())
          )
          && (
            (cost._id.toString() === cost1._id.toString() && cost.calculationContractIds.length === 2)
            || (cost._id.toString() === cost2._id.toString() && cost.periodIds[0].toString() !== periodId.toString())
          )
        )));
      });
    });
  });

  describe('clearPeriod.mcpsRetentions', () => {
    describe('When type is NOT Statement', function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      let db;
      let retention1;
      let retention2;
      let retention3;

      before(async () => {
        // Save to Mongo DB
        retention1 = new McpsRetention({ clientId, periodId: periodId1 });
        await retention1.save();
        retention2 = new McpsRetention({ clientId, periodId: periodId1 });
        await retention2.save();
        retention3 = new McpsRetention({ clientId, periodId: periodId2 });
        await retention3.save();

        const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
        db = mongoClient.db();
      });

      it('should remove mcps retentions', async () => {
        // Arrange
        const event = {
          clientId,
          periodId: periodId1,
          type: testUtils.randomString(),
          db,
        };
        // Act
        await ClearPeriod.__get__('mcpsRetentions')(event);

        const retentions = await McpsRetention.find({ clientId });
        expect(retentions.length).to.eq(1);
        expect(retentions[0]._id.toString()).to.eq(retention3._id.toString());
      });
    });

    describe('When type is Statement', function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      let db;
      let retention1;
      let retention2;
      let retention3;

      before(async () => {
        // Save to Mongo DB
        retention1 = new McpsRetention({ clientId, periodId: periodId1 });
        await retention1.save();
        retention2 = new McpsRetention({ clientId, periodId: periodId1 });
        await retention2.save();
        retention3 = new McpsRetention({ clientId, periodId: periodId2 });
        await retention3.save();
        const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
        db = mongoClient.db();
      });

      it('should NOT remove mcps retentions', async () => {
        // Arrange
        const event = {
          clientId,
          periodId: periodId1,
          type: 'Statement',
          db,
        };
        // Act
        await ClearPeriod.__get__('mcpsRetentions')(event);
        const retentions = await McpsRetention.find({ clientId });
        expect(retentions.length).to.eq(3);
      });
    });
  });

  describe('clearPeriod.mcpsNegatives', () => {
    describe('When type is NOT Statement', function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      let db;
      let negative1;
      let negative2;
      let negative3;

      before(async () => {
        // Save to Mongo DB
        negative1 = new McpsNegative({ clientId, periodId: periodId1 });
        await negative1.save();
        negative2 = new McpsNegative({ clientId, periodId: periodId1 });
        await negative2.save();
        negative3 = new McpsNegative({ clientId, periodId: periodId2 });
        await negative3.save();

        const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
        db = mongoClient.db();
      });

      it('should remove mcps retentions', async () => {
        // Arrange
        const event = {
          clientId,
          periodId: periodId1,
          type: testUtils.randomString(),
          db,
        };
        // Act
        await ClearPeriod.__get__('mcpsNegatives')(event);
        const negatives = await McpsNegative.find({ clientId });
        expect(negatives.length).to.eq(1);
        expect(negatives[0]._id.toString()).to.eq(negative3._id.toString());
      });
    });

    describe('When type is Statement', function () {
      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();

      let db;
      let negative1;
      let negative2;
      let negative3;

      before(async () => {
        // Save to Mongo DB
        negative1 = new McpsNegative({ clientId, periodId: periodId1 });
        await negative1.save();
        negative2 = new McpsNegative({ clientId, periodId: periodId1 });
        await negative2.save();
        negative3 = new McpsNegative({ clientId, periodId: periodId2 });
        await negative3.save();

        const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
        db = mongoClient.db();
      });

      it('should NOT remove mcps retentions', async () => {
        // Arrange
        const event = {
          clientId,
          periodId: periodId1,
          type: 'Statement',
          db,
        };
        // Act
        await ClearPeriod.__get__('mcpsNegatives')(event);
        const negatives = await McpsNegative.find({ clientId });
        expect(negatives.length).to.eq(3);
      });
    });
  });
});
