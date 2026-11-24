process.env.NODE_ENV = 'test';
// Connect to MongoDB
process.env.NODE_ENV = 'test';
process.env.DB_PROTOCOL = 'mongodb://';
process.env.DB_URL = 'localhost';
process.env.DB_NAME = 'curve_test';
require('../../../../models/db');

const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomFloat, randomId, cleanUp } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const { expect } = require('chai');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const CSV = require('fast-csv');
const { MongoClient } = require('mongodb');

const Cost = require('../../../../models/cost');
const WriteCsv = require('../../../../libs/writeCsv/writeCsvObject');
const collectDataAggregationMongo = require('../../../../libs/writeCsv/collectDataAggregationMongo');

logger.debug('\n\n**** .test/integration/libs/writeCsv/collectDataAggregationMongo.integration.test.js');

describe('collectDataAggregationMongo Integration Tests', function () {
  let db;
  let template; let outputLocation; let writeCsv; let headers;
  let cost1; let cost2;
  let clientId;

  before(function (done) {
    clientId = randomId();
    cleanUp(clientId, done);
  });

  beforeEach(function (done) {
    template = [
      { field: 'name', header: 'Name', type: 'Selector' },
      { field: 'type', header: 'Type', type: 'Selector' },
      { field: 'amount', header: 'Amount', type: 'Calculator' },
    ];

    outputLocation = `${appRootDir}/tmp/${randomString()}`;
    headers = template.map(function (e) { return e.header; });

    writeCsv = new WriteCsv({ headers, outputLocation });

    cost1 = new Cost({
      clientId,
      name: randomString(),
      type: randomString(),
      amount: randomFloat(),
    });

    cost2 = new Cost({
      clientId,
      name: randomString(),
      type: randomString(),
      amount: randomFloat(),
    });
    async.waterfall([
      // Connect Mongo Client
      (cb) => {
        MongoClient.connect('mongodb://localhost/curve_test', databaseUtils.getMongoConnectOpts())
          .then((mongoClient) => {
            db = mongoClient.db('curve_test');
            cb();
          })
          .catch(cb);
      },
      // Create Costs Data
      (cb) => {
        cost1.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        cost2.save()
          .then(() => cb())
          .catch(cb);
      },
    ], done);
  });

  afterEach(function (done) {
    fs.unlinkSync(outputLocation);
    done();
  });

  after(function (done) {
    cleanUp(clientId, done);
  });

  describe('collectDataAggregationMongo.getData', function () {
    it('should get the totals when filter is NOT set', function (done) {
      // Arrange
      const filter = { clientId };
      const sort = null;
      const table = null;
      const suppressZeroValue = false;
      const mappingData = [];
      const data = [];
      // Act
      collectDataAggregationMongo.getData(db.collection('costs'), table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
          .on('data', function (row) { data.push(row); })
          .on('end', function () {
            // Assert
            expect(data[data.length - 2].Name).to.eq(cost1.name);
            expect(data[data.length - 2].Type).to.eq(cost1.type);
            expect(data[data.length - 2].Amount).to.eq(cost1.amount.toString());
            expect(data[data.length - 1].Name).to.eq(cost2.name);
            expect(data[data.length - 1].Type).to.eq(cost2.type);
            expect(data[data.length - 1].Amount).to.eq(cost2.amount.toString());

            done();
          });
      });
    });

    it('should get the totals when filter is set', function (done) {
      // Arrange
      const filter = { clientId, name: cost1.name };
      const sort = null;
      const table = null;
      const mappingData = [];
      const suppressZeroValue = false;
      const data = [];
      // Act
      collectDataAggregationMongo.getData(db.collection('costs'), table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
          .on('data', function (row) { data.push(row); })
          .on('end', function () {
            // Assert
            expect(data[data.length - 1].Name).to.eq(cost1.name);
            expect(data[data.length - 1].Type).to.eq(cost1.type);
            expect(data[data.length - 1].Amount).to.eq(cost1.amount.toString());

            done();
          });
      });
    });
  });
});
