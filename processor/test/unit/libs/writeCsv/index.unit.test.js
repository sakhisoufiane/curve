process.env.NODE_ENV = 'test';

const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

let WriteCsv;

logger.debug('\n\n**** .test/unit/libs/writeCsv/index.unit.test.js');

describe('WriteCsv Unit Tests', function () {
  let template; let writeCsvStub; let eventDb; let bigQuery; let createQueryStreamOnSpy;
  let collectDataStub; let collectDataNoAggregationStub; let collectDataAggregationMongoStub; let collectDataMongoStub;
  let returnedLine; let event; let uploadToS3;

  before(function (done) {
    sinon.restore();
    done();
  });

  beforeEach(function (done) {
    WriteCsv = rewire('../../../../libs/writeCsv');

    template = [
      { field: 'contractName', header: 'Contract Name', type: 'Selector' },
      { field: 'saleDate', format: 'Date', header: 'Sale Date', type: 'Selector' },
      { field: 'units', header: 'Units', type: 'Calculator' },
      { field: 'grossAmount', header: 'Gross Amount in Currency', type: 'Calculator' },
    ];

    uploadToS3 = sinon.stub().yields();
    WriteCsv.__set__('fileManager', { uploadToS3 });

    // WriteCsv
    writeCsvStub = {
      addRow: sinon.stub().returns(),
      addData: sinon.stub().yields(),
      write: sinon.stub().yields(),
    };
    WriteCsv.__set__('WriteCsv', sinon.stub().returns(writeCsvStub));

    // CollectData
    collectDataStub = {
      name: 'collectData',
      getJoinedSalesData: sinon.stub().yields(),
      getData: sinon.stub().yields(),
      getTotals: sinon.stub().yields(),
    };
    WriteCsv.__set__('CollectData', collectDataStub);

    // CollectDataNoAggregation
    collectDataNoAggregationStub = {
      name: 'collectDataNoAggregation',
      getJoinedSalesData: sinon.stub().yields(),
      getData: sinon.stub().yields(),
      getTotals: sinon.stub().yields(),
    };
    WriteCsv.__set__('CollectDataNoAggregation', collectDataNoAggregationStub);

    // collectDataAggregationMongo
    collectDataAggregationMongoStub = {
      name: 'collectDataAggregationMongo',
      getData: sinon.stub().yields(),
      getTotals: sinon.stub().yields(),
    };
    WriteCsv.__set__('collectDataAggregationMongo', collectDataAggregationMongoStub);

    // CollectDataMongo
    collectDataMongoStub = {
      name: 'CollectDataMongo',
      getData: sinon.stub().yields(),
    };
    WriteCsv.__set__('CollectDataMongo', collectDataMongoStub);

    // getJoinedSalesData
    WriteCsv.__set__('getJoinedSalesData', sinon.stub().yields());

    // Event DB
    eventDb = { collection: sinon.stub().returns() };
    // BigQuery DB
    returnedLine = { _id: randomId() };
    createQueryStreamOnSpy = { on: sinon.spy((event, callback) => {
      if (event !== 'error') callback(returnedLine);
      return createQueryStreamOnSpy;
    }) };
    bigQuery = {
      getSchema: sinon.stub().yields(null, { fields: [randomString(), randomString()] }),
      getDataQuery: sinon.stub().returns(),
      logQuery: sinon.stub().returns(),
      getAggregate: sinon.stub().yields(),
      client: {
        createQueryStream: sinon.stub().returns(createQueryStreamOnSpy),
      },
    };

    event = {
      s3WriteKey: randomString(),
      databaseTable: randomString(),
      noConsolidation: true,
      template,
      filter: { type: randomString() },
      bigQuery,
    };
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
    expect(WriteCsv.__set__('collectData')).to.exist;
    expect(WriteCsv.__set__('CollectDataNoAggregation')).to.exist;
    expect(WriteCsv.__set__('CollectDataMongo')).to.exist;
    expect(WriteCsv.__set__('CollectDataAggregationMongo')).to.exist;
    expect(WriteCsv.__set__('WriteCsv')).to.exist;
    done();
  });

  describe('Initiating collectDataLib', function () {
    it("Should use CollectDataNoAggregation when table != 'costs' and noConsolidation == true", function (done) {
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(WriteCsv.collectDataLib).to.eq(WriteCsv.CollectDataNoAggregation);
        done();
      });
    });

    it("Should use CollectData when table != 'costs' and noConsolidation == false", function (done) {
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(WriteCsv.collectDataLib).to.eq(WriteCsv.CollectData);
        done();
      });
    });

    it("Should use collectDataAggregationMongo when table == 'costs' and noConsolidation == false", function (done) {
      // Arrange
      event.db = eventDb;
      event.databaseTable = 'costs';
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(WriteCsv.__get__('collectDataAggregationMongo').getData.called).to.be.false;
        done();
      });
    });

    it("Should use CollectDataMongo when table == 'costs' and noConsolidation == true", function (done) {
      // Arrange
      event.db = eventDb;
      event.databaseTable = 'costs';
      event.noConsolidation = true;
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(WriteCsv.__get__('CollectDataMongo').getData.called).to.be.true;
        done();
      });
    });
  });

  describe('Handling the event.filter object', function () {
    it("Should set filter to 'true' if no filter", function (done) {
      // Arrange
      event.filter = null;
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(event.filter).to.eq('true');
        done();
      });
    });

    it("Should set filter to 'true' if filter is empty", function (done) {
      // Arrange
      event.filter = {};
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(event.filter).to.eq('true');
        done();
      });
    });

    it("Should keep filter the same if it's not empty", function (done) {
      // Arrange
      const filter = { field: randomString() };
      event.filter = filter;
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(event.filter).to.deep.eq(filter);
        done();
      });
    });
  });

  describe('Getting totals', function () {
    it('Should get totals if totalsRow == true', function (done) {
      // Arrange
      event.totalsRow = true;
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(WriteCsv.__get__('CollectDataNoAggregation').getTotals.called).to.be.true;
        done();
      });
    });

    it('Should NOT get totals if totalsRow == false', function (done) {
      // Arrange
      event.totalsRow = false;
      // Act
      WriteCsv(event, function () {
        // Act
        expect(WriteCsv.__get__('CollectDataNoAggregation').getTotals.called).to.be.false;
        done();
      });
    });
  });

  describe('Getting Data', function () {
    it('Should write data if event.data', function (done) {
      // Arrange
      event.data = [randomString()];
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(writeCsvStub.addData.called).to.be.true;
        expect(WriteCsv.__get__('CollectDataNoAggregation').getData.called).to.be.false;
        expect(WriteCsv.__get__('getJoinedSalesData').called).to.be.false;
        done();
      });
    });

    it('Should NOT write data if !event.data', function (done) {
      // Arrange
      event.data = null;
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(writeCsvStub.addData.called).to.be.false;
        expect(WriteCsv.__get__('CollectDataNoAggregation').getData.called).to.be.true;
        done();
      });
    });

    it('Should get Joind Sales Data if event.joinedSalesData', function (done) {
      // Arrange
      event.joinedSalesData = true;
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(writeCsvStub.addData.called).to.be.false;
        expect(WriteCsv.__get__('CollectDataNoAggregation').getData.called).to.be.false;
        expect(WriteCsv.__get__('getJoinedSalesData').called).to.be.true;
        done();
      });
    });
  });

  describe('Uploading to S3', function () {
    it('Should write file before uploading', function (done) {
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(writeCsvStub.write.called).to.be.true;
        done();
      });
    });

    it('Should upload file to S3', function (done) {
      // Arrange
      event.s3WriteKey = randomString();
      // Act
      WriteCsv(event, function () {
        // Assert
        expect(uploadToS3.calledWith(event.s3WriteKey)).to.be.true;
        done();
      });
    });

    it('Should return the S3 key', function (done) {
      // Arrange
      event.s3WriteKey = randomString();
      // Act
      WriteCsv(event, function (err, key) {
        // Assert
        expect(key).to.eq(event.s3WriteKey);
        done();
      });
    });
  });

  describe('Handeling Errors', function () {
    it('Should return an error on getJoinedSalesData', function (done) {
      // Arrange
      event.joinedSalesData = true;
      const expectedError = randomString();
      WriteCsv.__set__('getJoinedSalesData', sinon.stub().yields(expectedError));
      // Act
      WriteCsv(event, function (err) {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });

    it('Should return an error on getData', function (done) {
      // Arrange
      const expectedError = randomString();
      WriteCsv.__get__('CollectDataNoAggregation').getData.yields(expectedError);
      // Act
      WriteCsv(event, function (err) {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });

    it('Should return an error on writeCsv.addData', function (done) {
      // Arrange
      event.data = [randomString()];
      const expectedError = randomString();
      writeCsvStub.addData.yields(expectedError);
      // Act
      WriteCsv(event, function (err) {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });

    it('Should return an error on getTotals', function (done) {
      // Arrange
      event.noConsolidation = false;
      event.totalsRow = true;
      const expectedError = randomString();
      WriteCsv.__get__('CollectData').getTotals.yields(expectedError);
      // Act
      WriteCsv(event, function (err) {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });

    it('Should return an error on writeCsv.write', function (done) {
      // Arrange
      event.noConsolidation = false;
      const expectedError = randomString();
      writeCsvStub.write.yields(expectedError);
      // Act
      WriteCsv(event, function (err) {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });

    it('Should return an error on writeCsv.uploadToS3', function (done) {
      // Arrange
      const expectedError = randomString();
      uploadToS3.yields(expectedError);
      // Act
      WriteCsv(event, function (err) {
        // Assert
        expect(err).to.exist;
        expect(err).to.eq(expectedError);
        done();
      });
    });
  });
});
