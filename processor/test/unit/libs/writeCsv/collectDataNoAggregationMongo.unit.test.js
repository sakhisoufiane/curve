process.env.NODE_ENV = 'test';
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const { expect } = require('chai');
const sinon = require('sinon');

const { randomId, randomString, randomDate, randomFloat, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const collectDataAggregationMongo = require('../../../../libs/writeCsv/collectDataAggregationMongo');

logger.debug('\n\n**** .test/unit/libs/writeCsv/collectDataAggregationMongo.unit.test.js');

describe('collectDataAggregationMongo Unit Tests', function () {
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
      { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
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
    // Assert
    expect(collectDataAggregationMongo.getData).to.exist;
    expect(collectDataAggregationMongo.mapData).to.exist;
    expect(collectDataAggregationMongo.lineToTemplate).to.exist;
    expect(collectDataAggregationMongo.flattenLine).to.exist;
    expect(collectDataAggregationMongo.removeZeroValues).to.exist;
    done();
  });

  describe('collectDataAggregationMongo.removeZeroValues', function () {
    it('Should remove lines where calculationOutput == 0', function (done) {
      // Arrange
      const data = [
        { calculationOutput: 0, releaseId: randomString() },
        { calculationOutput: randomInt(), releaseId: randomString() },
        { calculationOutput: randomInt(), releaseId: randomString() },

      ];
      const expectedFilteredData = [data[1], data[2]];
      // Act
      const filteredData = collectDataAggregationMongo.removeZeroValues(data);
      // Assert
      expect(filteredData).to.deep.eq(expectedFilteredData);
      done();
    });
  });

  describe('collectDataAggregationMongo.flattenLine', function () {
    it('Should flatten the line based', function (done) {
      // Arrange
      const line = { _id: { contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } };
      const expectedFlattenedLine = { contractName: line._id.contractName, saleDate: line._id.saleDate, units: line._id.units, grossAmount: line._id.grossAmount, ...line };
      // Act
      collectDataAggregationMongo.flattenLine(line);
      // Assert
      expect(line).to.deep.eq(expectedFlattenedLine);
      done();
    });
  });

  describe('collectDataAggregationMongo.lineToTemplate', function () {
    it('Should flatten the line on the template', function (done) {
    // Arrange
      const line = { _id: { randomProperty: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } };
      const expectedMappedLine = [line._id.contractName, line._id.saleDate, line._id.units, line._id.grossAmount];
      // Act
      const mappedLine = collectDataAggregationMongo.lineToTemplate(line, template);
      // Assert
      expect(mappedLine).to.deep.eq(expectedMappedLine);
      done();
    });
  });

  describe('collectDataAggregationMongo.mapData', function () {
    it('Should map the data to the template', function (done) {
      // Arrange
      const data = [
        { _id: { randomProperty: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } },
        { _id: { randomProperty: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } },
      ];
      const expectedMappedData = [
        [data[0]._id.contractName, data[0]._id.saleDate, data[0]._id.units, data[0]._id.grossAmount],
        [data[1]._id.contractName, data[1]._id.saleDate, data[1]._id.units, data[1]._id.grossAmount],
      ];
      // Act
      const mappedData = collectDataAggregationMongo.mapData(data, template);
      // Assert
      expect(mappedData).to.deep.eq(expectedMappedData);
      done();
    });
  });

  describe('collectDataAggregationMongo.getData', function () {
    let findResult; let filter; let sort; let table; let suppressZeroValue; let mappingData;
    let mongoClientCollectionSpy;
    let mongoClientCountSpy;
    let mongoClientFindSpy;
    let mongoClientToArraySpy;
    let mongoClientLimitSpy;
    let mongoClientSkipSpy;
    let writeCsv;

    beforeEach(function () {
      findResult = [
        { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat(), calculationOutput: randomFloat() },
        { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat(), calculationOutput: 0 },
      ];
      filter = { releaseId: randomId(), releaseDate: randomString() };
      sort = randomString();
      table = randomString();
      suppressZeroValue = false;

      const mongoPromise = new Promise((resolve) => { resolve(findResult); });
      mongoClientToArraySpy = sinon.spy(() => mongoPromise);

      mongoClientSkipSpy = sinon.spy(function () {
        return { toArray: mongoClientToArraySpy };
      });

      mongoClientLimitSpy = sinon.spy(function () {
        return { skip: mongoClientSkipSpy };
      });

      mongoClientFindSpy = sinon.spy(function () {
        return { limit: mongoClientLimitSpy };
      });

      const mongoCountPromise = new Promise((resolve) => { resolve(100); });
      mongoClientCountSpy = sinon.spy(function (filter) {
        return mongoCountPromise;
      });

      const aggregate = {
        toArray: () => Promise.resolve(findResult),
      };
      const aggregateStub = sinon.stub().returns(aggregate);
      mongoClientCollectionSpy = { countDocuments: mongoClientCountSpy, find: mongoClientFindSpy, aggregate: aggregateStub };

      writeCsv = { addData: sinon.stub().callsFake((mappedData, cb) => {
        cb(null, mappedData);
      }) };
    });

    // TODO - fix unstubbed aggregation
    it.skip('Should get data', function (done) {
      // Arrange
      const expectedAddDataArg = [
        [findResult[0].contractName, findResult[0].saleDate, findResult[0].units, findResult[0].grossAmount],
        [findResult[1].contractName, findResult[1].saleDate, findResult[1].units, findResult[1].grossAmount],
      ];
      // Act
      collectDataAggregationMongo.getData(mongoClientCollectionSpy, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function () {
        // Assert
        expect(mongoClientCountSpy.calledWith(filter)).to.be.true;
        expect(mongoClientFindSpy.calledWith(filter)).to.be.true;
        expect(mongoClientLimitSpy.calledWith(200000)).to.be.true;
        expect(mongoClientSkipSpy.calledWith(0)).to.be.true;
        expect(writeCsv.addData.calledWith(expectedAddDataArg)).to.be.true;
      });
    });

    // TODO - fix unstubbed aggregation
    it.skip('Should get data when suppressZeroValue == true', function (done) {
      // Arrange
      suppressZeroValue = true;
      const expectedAddDataArg = [[findResult[0].contractName, findResult[0].saleDate, findResult[0].units, findResult[0].grossAmount]];
      // Act
      collectDataAggregationMongo.getData(mongoClientCollectionSpy, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function () {
        // Assert
        expect(mongoClientCountSpy.getCall(0).args[0]).to.deep.equal(filter);
        expect(mongoClientFindSpy.getCall(0).args[0]).to.deep.equal(filter);
        expect(mongoClientLimitSpy.getCall(0).args[0]).to.deep.equal(200000);
        expect(mongoClientSkipSpy.getCall(0).args[0]).to.deep.equal(0);
        expect(writeCsv.addData.calledWith(expectedAddDataArg)).to.be.true;
      });
    });
  });
});
