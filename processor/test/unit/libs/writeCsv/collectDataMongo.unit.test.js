process.env.NODE_ENV = 'test';
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const { randomInt, randomId, randomString, randomFloat, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

let CollectDataMongo;

logger.debug('\n\n**** .test/unit/libs/writeCsv/collectDataMongo.unit.test.js');

describe('CollectDataMongo Unit Tests', function () {
  let template;

  before(function (done) {
    sinon.restore();
    done();
  });

  beforeEach(function (done) {
    CollectDataMongo = rewire('../../../../libs/writeCsv/collectDataMongo');
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
    expect(CollectDataMongo.getData).to.exist;
    expect(CollectDataMongo.getTotals).to.exist;
    expect(CollectDataMongo.mapData).to.exist;
    expect(CollectDataMongo.lineToTemplate).to.exist;
    expect(CollectDataMongo.flattenLine).to.exist;
    expect(CollectDataMongo.removeZeroValues).to.exist;
    expect(CollectDataMongo.__get__('getGroup')).to.exist;
    expect(CollectDataMongo.__get__('getTotalGroup')).to.exist;
    done();
  });

  describe('CollectDataMongo.getTotalGroup', function () {
    it('Should return aggregate query', function (done) {
      // Arrange
      const expectedQuery = { units: { $sum: '$units' }, grossAmount: { $sum: '$grossAmount' }, _id: { releaseId: '$releaseId' } };
      // Act
      const query = CollectDataMongo.__get__('getTotalGroup')(template, { releaseId: randomId(), releaseDate: randomString() });
      // Assert
      expect(query).to.deep.eq(expectedQuery);
      done();
    });
  });

  describe('CollectDataMongo.getGroup', function () {
    it('Should return aggregate query', function (done) {
      // Arrange
      template = [
        { field: 'catalogueCatNo', header: 'Catalogue CatNo', type: 'Selector' },
        { field: 'catalogueIsrc', header: 'Catalogue Isrc', type: 'Selector' },
        { field: 'source', header: 'Source', type: 'Selector' },
        { field: 'contractName', header: 'Contract Name', type: 'Selector' },
        { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
        { field: 'units', header: 'Units', type: 'Calculator' },
        { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
      ];
      const expectedQuery = {
        catalogueCatNo: { $first: '$catalogueCatNo' },
        catalogueIsrc: { $first: '$catalogueIsrc' },
        source: { $first: '$source' },
        units: { $sum: '$units' },
        grossAmount: { $sum: '$grossAmount' },
        _id: { catalogueCatNo: '$catalogueCatNo', catalogueIsrc: '$catalogueIsrc', source: '$source', contractName: '$contractName', saleDate: '$saleDate' },
      };
      // Act
      const query = CollectDataMongo.__get__('getGroup')(template);
      // Assert
      expect(query).to.deep.eq(expectedQuery);
      done();
    });
  });

  describe('CollectDataMongo.removeZeroValues', function () {
    it('Should remove lines where calculationOutput == 0', function (done) {
      // Arrange
      const data = [
        { calculationOutput: 0, releaseId: randomString() },
        { calculationOutput: randomInt(), releaseId: randomString() },
        { calculationOutput: randomInt(), releaseId: randomString() },

      ];
      const expectedFilteredData = [data[1], data[2]];
      // Act
      const filteredData = CollectDataMongo.removeZeroValues(data);
      // Assert
      expect(filteredData).to.deep.eq(expectedFilteredData);
      done();
    });
  });

  describe('CollectDataMongo.flattenLine', function () {
    it('Should flatten the line', function (done) {
      // Arrange
      const line = { _id: { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } };
      const expectedFlattenedLine = { _id: line._id._id, contractName: line._id.contractName, saleDate: line._id.saleDate, units: line._id.units, grossAmount: line._id.grossAmount };
      // Act
      CollectDataMongo.flattenLine(line);
      // Assert
      expect(line).to.deep.eq(expectedFlattenedLine);
      done();
    });
  });

  describe('CollectDataMongo.lineToTemplate', function () {
    it('Should flatten the line', function (done) {
      // Arrange
      const line = { _id: { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } };
      const expectedMappedLine = [line._id.contractName, line._id.saleDate, line._id.units, line._id.grossAmount];
      // Act
      const mappedLine = CollectDataMongo.lineToTemplate(line, template);
      // Assert
      expect(mappedLine).to.deep.eq(expectedMappedLine);
      done();
    });
  });

  describe('CollectDataMongo.mapData', function () {
    it('Should map the data to the template', function (done) {
      // Arrange
      const data = [
        { _id: { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } },
        { _id: { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } },
      ];
      const expectedMappedData = [
        [data[0]._id.contractName, data[0]._id.saleDate, data[0]._id.units, data[0]._id.grossAmount],
        [data[1]._id.contractName, data[1]._id.saleDate, data[1]._id.units, data[1]._id.grossAmount],
      ];
      // Act
      const mappedData = CollectDataMongo.mapData(data, template);
      // Assert
      expect(mappedData).to.deep.eq(expectedMappedData);
      done();
    });
  });

  describe('CollectDataMongo.getTotals', function () {
    let db; let mongoClientAggregateSpy; let mongoClientToArraySpy; let aggregateResult; let writeCsv;
    let filter; let sort;

    before(function () {
      filter = { releaseId: randomId(), releaseDate: randomString() };
      sort = null;
      aggregateResult = [
        { _id: { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } },
        { _id: { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() } },
      ];

      const mongoPromise = new Promise((resolve, _) => {
        resolve(aggregateResult);
      });
      mongoClientToArraySpy = sinon.spy(() => mongoPromise);

      mongoClientAggregateSpy = sinon.spy(function () { return { toArray: mongoClientToArraySpy }; });

      db = { aggregate: mongoClientAggregateSpy };

      writeCsv = {
        addData: sinon.spy(function (mappedData, callback) {
          return callback(null, mappedData);
        }),
      };
    });

    it('Should get totals', function (done) {
      // Arrange
      const aggregateArgs = [{ $match: filter }, { $group: { units: { $sum: '$units' }, grossAmount: { $sum: '$grossAmount' }, _id: { releaseId: '$releaseId' } } }];
      const expectedResult = [
        ['Total', aggregateResult[0]._id.saleDate, aggregateResult[0]._id.units, aggregateResult[0]._id.grossAmount],
        [aggregateResult[1]._id.contractName, aggregateResult[1]._id.saleDate, aggregateResult[1]._id.units, aggregateResult[1]._id.grossAmount],
      ];
      // Act
      CollectDataMongo.getTotals(db, filter, template, sort, writeCsv, null, function (err, result) {
        // Assert
        expect(err).to.not.exist;
        expect(mongoClientAggregateSpy.getCall(0).args[0]).to.deep.equal(aggregateArgs);
        expect(mongoClientAggregateSpy.getCall(0).args[1]).to.deep.equal({ allowDiskUse: true });
        expect(result).to.deep.eq(expectedResult);

        done();
      });
    });
  });

  describe('CollectDataMongo.getData', function () {
    let collection; let mongoClientAggregateSpy; let mongoClientToArraySpy; let aggregateResult; let addDataSpy; let writeCsv;
    let filter; let sort; let table; let suppressZeroValue; let mappingData;

    before(function () {
      filter = { releaseId: randomId(), releaseDate: randomString() };
      sort = 'createdAt';
      table = randomString();
      suppressZeroValue = false;
      mappingData = [];

      aggregateResult = [{ _id: { _id: randomId(), contractName: randomString(), saleDate: randomDate(), units: randomFloat(), grossAmount: randomFloat() }, count: 100 }];

      const mongoPromise = new Promise((resolve, _) => {
        resolve(aggregateResult);
      });
      mongoClientToArraySpy = sinon.spy(() => mongoPromise);

      mongoClientAggregateSpy = sinon.spy(function () { return { toArray: mongoClientToArraySpy }; });

      collection = { aggregate: mongoClientAggregateSpy };

      addDataSpy = sinon.spy(function (mappedData, callback) {
        return callback(null, mappedData);
      });

      writeCsv = { addData: addDataSpy };
    });

    it('Should get totals', function (done) {
      // Arrange
      const aggregate1Args = [{ $match: filter }, { $group: { _id: { contractName: '$contractName', saleDate: '$saleDate' } } }, { $count: 'count' }];
      const aggregate2Args = [
        { $match: filter },
        { $group: { units: { $sum: '$units' }, grossAmount: { $sum: '$grossAmount' }, _id: { contractName: '$contractName', saleDate: '$saleDate' } } },
        { $sort: 'createdAt' },
        { $skip: 0 },
        { $limit: 200000 },
      ];
      // Act
      CollectDataMongo.getData(collection, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, null, '', function () {
        // Assert
        expect(mongoClientAggregateSpy.getCall(0).args[0]).to.deep.equal(aggregate1Args);
        expect(mongoClientAggregateSpy.getCall(0).args[1]).to.deep.equal({ allowDiskUse: true });
        expect(mongoClientAggregateSpy.getCall(1).args[0]).to.deep.equal(aggregate2Args);
        expect(mongoClientAggregateSpy.getCall(1).args[1]).to.deep.equal({ allowDiskUse: true });
        const expectedAddDataArg = [[aggregateResult[0].contractName, aggregateResult[0].saleDate, aggregateResult[0].units, aggregateResult[0].grossAmount]];
        expect(addDataSpy.getCall(0).args[0]).to.deep.eq(expectedAddDataArg);

        done();
      });
    });
  });
});
