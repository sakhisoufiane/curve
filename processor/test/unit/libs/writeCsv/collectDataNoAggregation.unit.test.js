process.env.NODE_ENV = 'test';
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomDate, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { expect } = require('chai');
const sinon = require('sinon');

const CollectDataNoAggregation = require('../../../../libs/writeCsv/collectDataNoAggregation');

logger.debug('\n\n**** .test/unit/libs/writeCsv/collectDataNoAggregation.unit.test.js');

describe('CollectDataNoAggregation Unit Tests', function () {
  let template;

  before(function (done) {
    sinon.restore();
    done();
  });

  beforeEach(function (done) {
    template = [
      { field: 'contractName', header: 'Contract Name', type: 'Selector' },
      { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
      { field: 'units', header: 'Units', type: 'Calculator' },
      { field: 'calculationOutput', header: 'Calculation Output', type: 'Calculator' },
    ];
    done();
  });
  afterEach(function (done) {
    sinon.restore();
    done();
  });

  after(function (done) {
    sinon.restore();
    done();
  });

  it('Should export all the functions', function (done) {
    expect(CollectDataNoAggregation.getData).to.exist;
    expect(CollectDataNoAggregation.getJoinedSalesData).to.exist;
    expect(CollectDataNoAggregation.getTotals).to.exist;
    expect(CollectDataNoAggregation.mapData).to.exist;
    expect(CollectDataNoAggregation.lineToTemplate).to.exist;
    expect(CollectDataNoAggregation.flattenLine).to.exist;
    expect(CollectDataNoAggregation.removeZeroValues).to.exist;
    expect(CollectDataNoAggregation.getTotalsSelectAndSumColumnArray).to.exist;
    expect(CollectDataNoAggregation.getSelectAndSumColumnArray).to.exist;
    done();
  });

  describe('CollectDataNoAggregation.getSelectAndSumColumnArray', function () {
    it('Should return an array of Select, Sum and GroupBy columns', function (done) {
      // Arrange
      const expectedQuery = {
        selectCols: ['contractName', 'saleDate', 'units', 'calculationOutput'],
        sumCols: [],
        groupCols: ['releaseId'],
      };
      // Act
      const query = CollectDataNoAggregation.getSelectAndSumColumnArray(template, { releaseId: randomId(), releaseDate: randomString() });
      // Assert
      expect(query).to.deep.eq(expectedQuery);
      done();
    });
  });

  describe('CollectDataNoAggregation.getTotalsSelectAndSumColumnArray', function () {
    it('Should return an array of Select, Sum and GroupBy columns', function (done) {
      // Arrange
      const expectedQuery = {
        selectCols: [{ column: 'contractName', displayAs: 'contractName', isSelector: true, isGroupBy: true }, { column: 'saleDate', displayAs: 'saleDate', isSelector: true, isGroupBy: true }],
        sumCols: [{ column: 'units', displayAs: 'units' }, { column: 'calculationOutput', displayAs: 'calculationOutput' }],
        groupCols: [{ column: 'releaseId', displayAs: 'releaseId', isSelector: false, isGroupBy: true }],
      };
      // Act
      const query = CollectDataNoAggregation.getTotalsSelectAndSumColumnArray(template, { releaseId: randomId(), releaseDate: randomString() });
      // Assert
      expect(query).to.deep.eq(expectedQuery);
      done();
    });
  });

  describe('CollectDataNoAggregation.getTotals', function () {
    let data; let filter; let table; let sort; let bigQuery; let writeCsv;

    beforeEach(function () {
      filter = { releaseId: randomId(), releaseDate: randomString() };
      table = randomString();
      sort = null;
      data = [
        { contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat(), calculationOutput: randomFloat() },
        { contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat(), calculationOutput: randomFloat() }];

      bigQuery = { getAggregate: sinon.stub().yields(null, data) };

      writeCsv = {
        addData: sinon.spy(function (mappedData, callback) {
          return callback(null, mappedData);
        }),
      };
    });

    it('Should get totals', function (done) {
      // Arrange
      const expectedResult = [
        ['Total', data[0].saleDate.value, data[0].units, data[0].calculationOutput],
        [data[1].contractName, data[1].saleDate.value, data[1].units, data[1].calculationOutput],
      ];
      // Act
      CollectDataNoAggregation.getTotals(bigQuery, table, filter, template, sort, writeCsv, null, function (err, result) {
        // Assert
        expect(err).to.be.null;
        expect(result).to.deep.eq(expectedResult);

        done();
      });
    });
  });

  describe('CollectData.getData', function () {
    let template; let table; let sort; let suppressZeroValue; let filter; let mappingData;
    let writeCsv;

    let createQueryStreamStub;
    let mockProcessYield;
    let mockProcess;
    let bigQuery;

    beforeEach(function () {
      template = [
        { field: 'contractName', header: 'Contract Name', type: 'Selector' },
        { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
        { field: 'units', header: 'Units', type: 'Calculator' },
        { field: 'calculationOutput', header: 'Calculation Output', type: 'Calculator' },
      ];
      table = randomString();
      sort = null;
      suppressZeroValue = false;
      filter = { releaseId: randomId(), releaseDate: randomString() };
      mappingData = [];

      mockProcessYield = { message: randomString(), contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat(), calculationOutput: randomFloat() };

      mockProcess = {
        on: sinon.spy(function (event, callback) {
          if (event !== 'error') callback(mockProcessYield);
          return mockProcess;
        }),
      };

      bigQuery = {
        client: { createQueryStream: sinon.stub().returns(mockProcess) },
        logQuery: sinon.stub().returns(),
        getDataQuery: sinon.stub().returns(),
      };

      writeCsv = { addRow: sinon.stub().returns() };
    });

    it('Should  build the query from the DB and then call the createQueryStream with the returned query', function (done) {
      // Act
      CollectDataNoAggregation.getData(bigQuery, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function (err) {
        // Assert
        expect(err).to.not.exist;
        expect(writeCsv.addRow.getCall(0).args[0]).to.deep.eq([mockProcessYield.contractName, mockProcessYield.saleDate.value, mockProcessYield.units, mockProcessYield.calculationOutput]);
        done();
      });
    });

    it('Should suppress zero values when suppressZeroValue = true', function (done) {
      // Arrange
      suppressZeroValue = true;
      mockProcessYield = { contractName: randomString(), saleDate: { value: randomDate() }, units: randomFloat(), calculationOutput: 0 };
      mockProcess = {
        on: sinon.spy(function (event, callback) {
          if (event !== 'error') callback(mockProcessYield);
          return mockProcess;
        }),
      };
      bigQuery.client.createQueryStream.returns(mockProcess);
      // Act
      CollectDataNoAggregation.getData(bigQuery, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function (err) {
        // Assert
        expect(err).to.not.exist;
        expect(writeCsv.addRow.called).to.be.false;
        done();
      });
    });
  });
});
