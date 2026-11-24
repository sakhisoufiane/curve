process.env.NODE_ENV = 'test';
// Connect to MongoDB
process.env.DB_PROTOCOL = 'mongodb://';
process.env.DB_URL = 'localhost';
process.env.DB_NAME = 'curve_test';
require('../../../../models/db');

const { logger, fileManager, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomFloat, randomId, randomDate, cleanUp } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { expect } = require('chai');
const moment = require('moment');
const fs = require('fs');
const CSV = require('fast-csv');
const { MongoClient } = require('mongodb');
const config = require('../../../../config.json');

const WriteCsv = require('../../../../libs/writeCsv');
const Cost = require('../../../../models/cost');

logger.debug('\n\n**** .test/integration/libs/writeCsv/index.integration.test.js');

const bqTestUtils = new BigQueryTestUtils();

describe('Index Integration Tests', function () {
  this.timeout(100000);

  let db;
  let bigQuery;
  let periodIds; let contractIds; let salesFileIds; let salesLineIds;
  let output1; let output2; let input1; let input2; let cost1; let cost2;
  let localS3File;
  let clientId;

  before(function (done) {
    clientId = randomId();
    cleanUp(clientId, done);
  });

  afterEach(function (done) {
    // Delete S3 file
    if (fs.existsSync(localS3File)) {
      fs.unlinkSync(localS3File);
    }
    cleanUp(clientId, done);
  });

  after(function (done) {
    cleanUp(clientId, done);
  });

  describe('When using BigQuery', () => {
    before(async () => {
      await bqTestUtils.init();
    });
    beforeEach(async () => {
      periodIds = [randomId(), randomId()];
      contractIds = [randomId(), randomId()];
      salesFileIds = [randomId(), randomId()];
      salesLineIds = [randomId(), randomId()];

      output1 = {
        periodId: periodIds[0],
        contractId: contractIds[1],
        salesFileId: salesFileIds[0],
        salesLineId: salesLineIds[0],
        units: randomFloat(),
        grossAmount: randomFloat(),
      };

      output2 = {
        periodId: periodIds[0],
        contractId: contractIds[0],
        salesFileId: salesFileIds[1],
        salesLineId: salesLineIds[1],
        units: randomFloat(),
        grossAmount: randomFloat(),
      };

      input1 = {
        id: salesLineIds[0],
        catalogueReleaseTitle: randomString(),
        saleDate: randomDate(),
        units: randomFloat(),
        grossAmount: randomFloat(),
      };

      input2 = {
        id: salesLineIds[1],
        catalogueReleaseTitle: randomString(),
        saleDate: randomDate(),
        units: randomFloat(),
        grossAmount: randomFloat(),
      };

      bigQuery = await bqTestUtils.getBigQuery();

      await bigQuery.client
        .dataset(bigQuery.datasetName)
        .table(bigQuery.inputTable)
        .insert([input1, input2]);

      await bigQuery.client
        .dataset(bigQuery.datasetName)
        .table(bigQuery.outputTable)
        .insert([output1, output2]);
    });
    afterEach(() => {
      // Delete BigQuery File
      if (bigQuery?.fileLocation && fs.existsSync(bigQuery.fileLocation)) {
        fs.unlinkSync(bigQuery.fileLocation);
      }
    });
    after(async () => {
      await bqTestUtils.stopTestContainer();
    });

    describe('When BigQuery Input Table and noConsolidation === false', function () {
      it('should get the data and upload to S3', function (done) {
        // Arrange
        const template = [
          { field: 'catalogueReleaseTitle', header: 'Release Title', type: 'Selector' },
          { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
          { field: 'units', header: 'Units', type: 'Calculator' },
          { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
        ];

        const event = {
          databaseTable: bigQuery.inputTable,
          bigQuery,
          filter: {},
          noConsolidation: false,
          template,
          s3WriteKey: `testData/${randomString()}`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Bucket: process.env.S3_bucket,
          s3Region: process.env.S3_region,
        };
        const data = [];
        // Act
        WriteCsv(event, function (err, s3Key) {
          fileManager.downloadFromS3(s3Key, event.s3Bucket, function (err, localFile) {
            localS3File = localFile;
            fs.createReadStream(localS3File).pipe(CSV.parse({ headers: true }))
              .on('data', function (row) { data.push(row); })
              .on('end', function () {
                // Assert
                expect(data[data.length - 2]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });
                expect(data[data.length - 1]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });

                expect(moment(data[data.length - 2]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });
                expect(moment(data[data.length - 1]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });

                expect(data[data.length - 2].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });
                expect(data[data.length - 1].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });

                expect(data[data.length - 2]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });
                expect(data[data.length - 1]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });

                done();
              });
          });
        });
      });
    });

    describe('When BigQuery Input Table and noConsolidation === true', function () {
      it('should get the data and upload to S3', function (done) {
        // Arrange
        const template = [
          { field: 'catalogueReleaseTitle', header: 'Release Title', type: 'Selector' },
          { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
          { field: 'units', header: 'Units', type: 'Calculator' },
          { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
        ];

        const event = {
          db,
          databaseTable: bigQuery.inputTable,
          bigQuery,
          filter: {},
          noConsolidation: true,
          template,
          s3WriteKey: `testData/${randomString()}`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Bucket: process.env.S3_bucket,
          s3Region: process.env.S3_region,
        };
        const data = [];
        // Act
        WriteCsv(event, function (err, s3Key) {
          fileManager.downloadFromS3(s3Key, event.s3Bucket, function (err, localFile) {
            localS3File = localFile;
            fs.createReadStream(localS3File).pipe(CSV.parse({ headers: true }))
              .on('data', function (row) { data.push(row); })
              .on('end', function () {
                // Assert
                expect(data[data.length - 2]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });
                expect(data[data.length - 1]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });

                expect(moment(data[data.length - 2]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });
                expect(moment(data[data.length - 1]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });

                expect(data[data.length - 2].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });
                expect(data[data.length - 1].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });

                expect(data[data.length - 2]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });
                expect(data[data.length - 1]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });

                done();
              });
          });
        });
      });
    });

    describe('When BigQuery Input Table, noConsolidation === true and joinedSalesData === true', function () {
      it('should get the data and upload to S3', function (done) {
        // Arrange
        const template = [
          { field: 'catalogueReleaseTitle', header: 'Release Title', type: 'Selector' },
          { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
          { field: 'units', header: 'Units', type: 'Calculator' },
          { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
        ];

        const event = {
          salesInputColumns: ['catalogueReleaseTitle', 'saleDate', 'units', 'grossAmount'],
          salesOutputColumns: ['salesLineId'],
          contractIds: [randomId(), randomId()],
          excludeContractIds: [randomId()],
          joinedSalesData: true,
          db,
          databaseTable: bigQuery.inputTable,
          bigQuery,
          filter: {},
          noConsolidation: true,
          template,
          s3WriteKey: `testData/${randomString()}`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Bucket: process.env.S3_bucket,
          s3Region: process.env.S3_region,
        };
        const data = [];
        // Act
        WriteCsv(event, function (err, s3Key) {
          fileManager.downloadFromS3(s3Key, event.s3Bucket, function (err, localFile) {
            localS3File = localFile;
            fs.createReadStream(localS3File).pipe(CSV.parse({ headers: true }))
              .on('data', function (row) { data.push(row); })
              .on('end', function () {
                // Assert
                expect(data[data.length - 2]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });
                expect(data[data.length - 1]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });

                expect(moment(data[data.length - 2]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });
                expect(moment(data[data.length - 1]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });

                expect(data[data.length - 2].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });
                expect(data[data.length - 1].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });

                expect(data[data.length - 2]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });
                expect(data[data.length - 1]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });

                done();
              });
          });
        });
      });
    });

    describe('When BigQuery Input Table, noConsolidation === true and totalsRow === true', function () {
      it('should get the data and upload to S3', function (done) {
        // Arrange
        const template = [
          { field: 'catalogueReleaseTitle', header: 'Release Title', type: 'Selector' },
          { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
          { field: 'units', header: 'Units', type: 'Calculator' },
          { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
        ];

        const event = {
          totalsRow: true,
          db,
          databaseTable: bigQuery.inputTable,
          bigQuery,
          filter: {},
          noConsolidation: true,
          template,
          s3WriteKey: `testData/${randomString()}`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Bucket: process.env.S3_bucket,
          s3Region: process.env.S3_region,
        };
        const data = [];
        // Act
        WriteCsv(event, function (err, s3Key) {
          fileManager.downloadFromS3(s3Key, event.s3Bucket, function (err, localFile) {
            localS3File = localFile;
            fs.createReadStream(localS3File).pipe(CSV.parse({ headers: true }))
              .on('data', function (row) { data.push(row); })
              .on('end', function () {
                // Assert
                expect(data[data.length - 3]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });
                expect(data[data.length - 2]['Release Title']).to.satisfy(function (value) { return !!((value === input1.catalogueReleaseTitle || value === input2.catalogueReleaseTitle)); });

                expect(moment(data[data.length - 3]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });
                expect(moment(data[data.length - 2]['Sale Date']).format('YYYY-MM-DD')).to.satisfy(function (value) { return !!((value === input1.saleDate || value === input2.saleDate)); });

                expect(data[data.length - 3].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });
                expect(data[data.length - 2].Units).to.satisfy(function (value) { return !!((value === input1.units.toString() || value === input2.units.toString())); });

                expect(data[data.length - 3]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });
                expect(data[data.length - 2]['Gross Amount in Currency']).to.satisfy(function (value) { return !!((value === input1.grossAmount.toString() || value === input2.grossAmount.toString())); });

                expect(data[data.length - 1]['Release Title']).to.eq('');
                expect(data[data.length - 1]['Sale Date']).to.eq('Total');
                expect(data[data.length - 1].Units).to.eq((input1.units + input2.units).toString());
                expect(data[data.length - 1]['Gross Amount in Currency']).to.eq((input1.grossAmount + input2.grossAmount).toString());

                done();
              });
          });
        });
      });
    });
  });

  describe('When using Mongo', () => {
    beforeEach(async () => {
      // Create Costs Data
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

      await cost1.save();
      await cost2.save();
      // Connect Mongo Client
      const mongoClient = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);
      db = mongoClient.db();
    });

    describe('When Mongo Table and noConsolidation === false', function () {
      it('should get the data and upload to S3', function (done) {
        // Arrange
        const template = [
          { field: 'name', header: 'Name', type: 'Selector' },
          { field: 'type', header: 'Type', type: 'Selector' },
          { field: 'amount', header: 'Amount', type: 'Calculator' },
        ];

        const event = {
          db,
          databaseTable: 'costs',
          bigQuery,
          filter: { _id: { $exists: true }, clientId },
          noConsolidation: false,
          template,
          s3WriteKey: `testData/${randomString()}`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Bucket: process.env.S3_bucket,
          s3Region: process.env.S3_region,
        };
        const data = [];
        // Act
        WriteCsv(event, function (err, s3Key) {
          fileManager.downloadFromS3(s3Key, event.s3Bucket, function (err, localFile) {
            localS3File = localFile;
            fs.createReadStream(localS3File).pipe(CSV.parse({ headers: true }))
              .on('data', function (row) { data.push(row); })
              .on('end', function () {
                // Assert
                expect(data[data.length - 2].Name).to.satisfy(function (value) { return !!((value === cost1.name || value === cost2.name)); });
                expect(data[data.length - 1].Name).to.satisfy(function (value) { return !!((value === cost1.name || value === cost2.name)); });

                expect(data[data.length - 2].Type).to.satisfy(function (value) { return !!((value === cost1.type || value === cost2.type)); });
                expect(data[data.length - 1].Type).to.satisfy(function (value) { return !!((value === cost1.type || value === cost2.type)); });

                expect(data[data.length - 2].Amount).to.satisfy(function (value) { return !!((value === cost1.amount.toString() || value === cost2.amount.toString())); });
                expect(data[data.length - 1].Amount).to.satisfy(function (value) { return !!((value === cost1.amount.toString() || value === cost2.amount.toString())); });

                done();
              });
          });
        });
      });
    });

    describe('When Mongo Table and noConsolidation === true', function () {
      it('should get the data and upload to S3', function (done) {
        // Arrange
        const template = [
          { field: 'name', header: 'Name', type: 'Selector' },
          { field: 'type', header: 'Type', type: 'Selector' },
          { field: 'amount', header: 'Amount', type: 'Calculator' },
        ];

        const event = {
          db,
          databaseTable: 'costs',
          bigQuery,
          filter: { _id: { $exists: true }, clientId },
          noConsolidation: true,
          template,
          s3WriteKey: `testData/${randomString()}`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Bucket: process.env.S3_bucket,
          s3Region: process.env.S3_region,
        };
        const data = [];
        // Act
        WriteCsv(event, function (err, s3Key) {
          fileManager.downloadFromS3(s3Key, event.s3Bucket, function (err, localFile) {
            localS3File = localFile;
            fs.createReadStream(localS3File).pipe(CSV.parse({ headers: true }))
              .on('data', function (row) { data.push(row); })
              .on('end', function () {
                // Assert
                expect(data[data.length - 2].Name).to.satisfy(function (value) { return !!((value === cost1.name || value === cost2.name)); });
                expect(data[data.length - 1].Name).to.satisfy(function (value) { return !!((value === cost1.name || value === cost2.name)); });

                expect(data[data.length - 2].Type).to.satisfy(function (value) { return !!((value === cost1.type || value === cost2.type)); });
                expect(data[data.length - 1].Type).to.satisfy(function (value) { return !!((value === cost1.type || value === cost2.type)); });

                expect(data[data.length - 2].Amount).to.satisfy(function (value) { return !!((value === cost1.amount.toString() || value === cost2.amount.toString())); });
                expect(data[data.length - 1].Amount).to.satisfy(function (value) { return !!((value === cost1.amount.toString() || value === cost2.amount.toString())); });

                done();
              });
          });
        });
      });
    });

    describe('When Mongo Table and noConsolidation === false when passed event.data', function () {
      it('should get the data and upload to S3', function (done) {
        // Arrange
        const template = [
          { field: 'name', header: 'Name', type: 'Selector' },
          { field: 'type', header: 'Type', type: 'Selector' },
          { field: 'amount', header: 'Amount', type: 'Calculator' },
        ];
        const eventData = [
          [randomString(), randomString(), randomString()],
          [randomString(), randomString(), randomString()],
          [randomString(), randomString(), randomString()],
        ];
        const expectedData = [
          {
            Name: eventData[0][0],
            Type: eventData[0][1],
            Amount: eventData[0][2],
          },
          {
            Name: eventData[1][0],
            Type: eventData[1][1],
            Amount: eventData[1][2],
          },
          {
            Name: eventData[2][0],
            Type: eventData[2][1],
            Amount: eventData[2][2],
          },
        ];
        const event = {
          data: eventData,
          db,
          databaseTable: 'costs',
          bigQuery,
          filter: { clientId },
          noConsolidation: false,
          template,
          s3WriteKey: `testData/${randomString()}`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Bucket: process.env.S3_bucket,
          s3Region: process.env.S3_region,
        };
        const data = [];
        // Act
        WriteCsv(event, function (err, s3Key) {
          fileManager.downloadFromS3(s3Key, event.s3Bucket, function (err, localFile) {
            localS3File = localFile;
            fs.createReadStream(localS3File).pipe(CSV.parse({ headers: true }))
              .on('data', function (row) { data.push(row); })
              .on('end', function () {
                // Assert
                expect(data).to.deep.eq(expectedData);
                done();
              });
          });
        });
      });
    });
  });
});
