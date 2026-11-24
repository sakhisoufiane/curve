process.env.NODE_ENV = 'test';
// Connect to MongoDB
process.env.DB_PROTOCOL = 'mongodb://';
process.env.DB_URL = 'localhost';
process.env.DB_NAME = 'curve_test';
require('../../../../models/db');

const { logger, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomFloat, randomDate, cleanUp, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const { expect } = require('chai');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const CSV = require('fast-csv');

const CollectData = require('../../../../libs/writeCsv/collectData');
const WriteCsv = require('../../../../libs/writeCsv/writeCsvObject');

logger.debug('\n\n**** .test/integration/libs/writeCsv/collectData.integration.test.js');

const bqTestUtils = new BigQueryTestUtils();

describe('CollectData Integration Tests', function () {
  this.timeout(100000);

  let bigQuery;
  let template; let outputLocation; let headers; let writeCsv;
  let periodIds; let contractIds; let salesFileIds; let salesLineIds;
  let output1; let output2; let input1; let input2;
  let clientId;
  before(function (done) {
    clientId = randomId();
    bqTestUtils.init().then(() => {
      cleanUp(clientId, done);
    });
  });

  beforeEach(async () => {
    template = [
      { field: 'catalogueReleaseTitle', header: 'Release Title', type: 'Selector' },
      { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
      { field: 'units', header: 'Units', type: 'Calculator' },
      { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
    ];

    outputLocation = `${appRootDir}/tmp/${randomString()}`;

    headers = template.map(function (e) { return e.header; });

    writeCsv = new WriteCsv({ headers, outputLocation });

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

  afterEach(function (done) {
    // Delete BigQuery File
    if (bigQuery.fileLocation && fs.existsSync(bigQuery.fileLocation)) {
      fs.unlinkSync(bigQuery.fileLocation);
    }
    cleanUp(clientId, done);
  });

  after(function (done) {
    bqTestUtils.stopTestContainer().then(() => {
      cleanUp(clientId, done);
    });
  });

  describe('CollectData.getTotals', function () {
    it('should get the totals when filter is NOT set', function (done) {
      // Arrange
      const filter = {};
      const sort = null;
      const data = [];
      // Act
      CollectData.getTotals(bigQuery, bigQuery.inputTable, filter, template, sort, writeCsv, null, function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
          .on('data', function (row) { data.push(row); })
          .on('end', function () {
            // Assert
            expect(data[data.length - 1]['Sale Date']).to.eq('Total');
            expect(data[data.length - 1].Units).to.eq((input1.units + input2.units).toString());
            expect(data[data.length - 1]['Gross Amount in Currency']).to.eq((input1.grossAmount + input2.grossAmount).toString());
            done();
          });
      });
    });

    it('should get the totals when filter is set', function (done) {
      // Arrange
      const filter = { catalogueReleaseTitle: input1.catalogueReleaseTitle };
      const sort = null;
      const data = [];
      // Act
      CollectData.getTotals(bigQuery, bigQuery.inputTable, filter, template, sort, writeCsv, null, function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
          .on('data', function (row) { data.push(row); })
          .on('end', function () {
            // Assert
            expect(data[data.length - 1]['Sale Date']).to.eq('Total');
            expect(data[data.length - 1].Units).to.eq(input1.units.toString());
            expect(data[data.length - 1]['Gross Amount in Currency']).to.eq(input1.grossAmount.toString());
            done();
          });
      });
    });
  });

  describe('CollectData.getJoinedSalesData', function () {
    it('should get joined sales data when filter is NOT set', function (done) {
      // Arrange
      const filter = {};
      const salesInputColumns = ['catalogueReleaseTitle', 'saleDate', 'units', 'grossAmount'];
      const salesOutputColumns = ['salesLineId', 'contractId'];
      const data = [];
      // Act
      CollectData.getJoinedSalesData(bigQuery, filter, template, salesInputColumns, salesOutputColumns, [randomString()], [randomString()], writeCsv, null, '', function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
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

    it('should get joined sales data when filter is set', function (done) {
      // Arrange
      const filter = { catalogueReleaseTitle: input2.catalogueReleaseTitle };
      const salesInputColumns = ['catalogueReleaseTitle', 'saleDate', 'units', 'grossAmount'];
      const salesOutputColumns = ['salesLineId', 'contractId'];
      const data = [];
      // Act
      CollectData.getJoinedSalesData(bigQuery, filter, template, salesInputColumns, salesOutputColumns, [randomString()], [randomString()], writeCsv, null, '', function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
          .on('data', function (row) { data.push(row); })
          .on('end', function () {
            // Assert
            expect(data[data.length - 1]['Release Title']).to.eq(input2.catalogueReleaseTitle);
            expect(moment(data[data.length - 1]['Sale Date']).format('YYYY-MM-DD')).to.eq(input2.saleDate);
            expect(data[data.length - 1].Units).to.eq(input2.units.toString());
            expect(data[data.length - 1]['Gross Amount in Currency']).to.eq(input2.grossAmount.toString());
            done();
          });
      });
    });
  });

  describe('CollectData.getDataBatch', function () {
    it('should get data batch when filter is NOT set', function (done) {
      // Arrange
      const filter = {};
      const sort = null;
      const suppressZeroValue = false;
      const mappingData = [];
      const data = [];
      // Act
      CollectData.getDataBatch(bigQuery, bigQuery.inputTable, filter, template, sort, suppressZeroValue, writeCsv, mappingData, function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
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

    it('should get data batch when filter is set', function (done) {
      // Arrange
      const filter = { catalogueReleaseTitle: input2.catalogueReleaseTitle };
      const sort = null;
      const suppressZeroValue = false;
      const mappingData = [];
      const data = [];
      // Act
      CollectData.getDataBatch(bigQuery, bigQuery.inputTable, filter, template, sort, suppressZeroValue, writeCsv, mappingData, function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
          .on('data', function (row) { data.push(row); })
          .on('end', function () {
            // Assert
            expect(data[data.length - 1]['Release Title']).to.eq(input2.catalogueReleaseTitle);
            expect(moment(data[data.length - 1]['Sale Date']).format('YYYY-MM-DD')).to.eq(input2.saleDate);
            expect(data[data.length - 1].Units).to.eq(input2.units.toString());
            expect(data[data.length - 1]['Gross Amount in Currency']).to.eq(input2.grossAmount.toString());

            done();
          });
      });
    });
  });

  describe('CollectData.getData', function () {
    it('should get data when filter is NOT set', function (done) {
      // Arrange
      const filter = {};
      const sort = null;
      const suppressZeroValue = false;
      const mappingData = [];
      const data = [];
      // Act
      CollectData.getData(bigQuery, bigQuery.inputTable, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function () {
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
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

    it('should get data when filter is set', function (done) {
      // Arrange
      const filter = { catalogueReleaseTitle: input2.catalogueReleaseTitle };
      const sort = null;
      const suppressZeroValue = false;
      const mappingData = [];
      const data = [];
      // Act
      CollectData.getData(bigQuery, bigQuery.inputTable, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function (err, result) {
        expect(err).to.not.exist;
        fs.createReadStream(outputLocation).pipe(CSV.parse({ headers: true }))
          .on('data', function (row) { data.push(row); })
          .on('end', function () {
            // Assert
            expect(data[data.length - 1]['Release Title']).to.eq(input2.catalogueReleaseTitle);
            expect(moment(data[data.length - 1]['Sale Date']).format('YYYY-MM-DD')).to.eq(input2.saleDate);
            expect(data[data.length - 1].Units).to.eq(input2.units.toString());
            expect(data[data.length - 1]['Gross Amount in Currency']).to.eq(input2.grossAmount.toString());

            done();
          });
      });
    });
  });
});
