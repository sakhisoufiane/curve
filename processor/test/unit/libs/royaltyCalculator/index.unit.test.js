process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

let SalesCalculation;

logger.debug('\n\n**** .test/unit/libs/royaltyCalculator/index.unit.test.js');

describe('Sales Calculator Index Unit Tests', function () {
  let event;
  before((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    SalesCalculation = rewire('../../../../libs/calculateSales');
    event = { type: randomString() };
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  it('should set the passed event type on the filter', function (done) {
    // Arrange
    event.type = randomString();
    // Act
    const salesCalculation = new SalesCalculation(event);
    // Assert
    expect(salesCalculation.filter.catType).to.eq(event.type);
    done();
  });

  it('should set the passed salesFileIds on the filter', function (done) {
    // Arrange
    event.salesFileIds = [randomId(), randomId()];
    // Act
    const salesCalculation = new SalesCalculation(event);
    // Assert
    expect(salesCalculation.filter.salesFileId).to.deep.eq({ $in: event.salesFileIds });
    done();
  });

  describe('when type is Release', function () {
    describe('and when releaseIds are passed', function () {
      it('should set the filter releaseId param on the filter to the releaseIds', function (done) {
        // Arrange
        event.type = 'Release';
        event.releaseIds = [randomId(), randomId()];
        // Act
        const salesCalculation = new SalesCalculation(event);
        // Assert
        expect(salesCalculation.filter.releaseId).to.deep.eq({ $in: event.releaseIds });
        done();
      });
    });

    describe('and when releaseIds are NOT passed', function () {
      it('should set the filter releaseId param on the filter to the passed id', function (done) {
        // Arrange
        event.type = 'Release';
        event.id = randomId();
        // Act
        const salesCalculation = new SalesCalculation(event);
        // Assert
        expect(salesCalculation.filter.releaseId).to.eq(event.id);
        done();
      });
    });
  });

  describe('when type is Track', function () {
    describe('and when trackIds are passed', function () {
      it('should set the filter trackId param on the filter to the trackIds', function (done) {
        // Arrange
        event.type = 'Track';
        event.trackIds = [randomId(), randomId()];
        // Act
        const salesCalculation = new SalesCalculation(event);
        // Assert
        expect(salesCalculation.filter.trackId).to.deep.eq({ $in: event.trackIds });
        done();
      });
    });

    describe('and when trackIds are NOT passed', function () {
      it('should set the filter trackId param on the filter to the passed id', function (done) {
        // Arrange
        event.type = 'Track';
        event.id = randomId();
        // Act
        const salesCalculation = new SalesCalculation(event);
        // Assert
        expect(salesCalculation.filter.trackId).to.eq(event.id);
        done();
      });
    });
  });

  describe('when type is Work', function () {
    describe('and when workIds are passed', function () {
      it('should set the filter workId param on the filter to the workIds', function (done) {
        // Arrange
        event.type = 'Work';
        event.workIds = [randomId(), randomId()];
        // Act
        const salesCalculation = new SalesCalculation(event);
        // Assert
        expect(salesCalculation.filter.workId).to.deep.eq({ $in: event.workIds });
        done();
      });
    });

    describe('and when workIds are NOT passed', function () {
      it('should set the filter workId param on the filter to the passed id', function (done) {
        // Arrange
        event.type = 'Work';
        event.id = randomId();
        // Act
        const salesCalculation = new SalesCalculation(event);
        // Assert
        expect(salesCalculation.filter.workId).to.eq(event.id);
        done();
      });
    });
  });

  describe('#calculate', function () {
    let byContractStub;
    beforeEach(() => {
      byContractStub = sinon.stub().yields();
      SalesCalculation.__set__('RoyaltyCalculator', sinon.stub().returns({ byContract: byContractStub }));
    });

    describe('when contracts are passed', function () {
      it('should loop through each of the contract passed', function (done) {
        // Arrange
        event.contracts = [{ contractId: randomId() }, { contractId: randomId() }];
        // Act
        const salesCalculation = new SalesCalculation(event);
        // Assert
        salesCalculation.calculate(function () {
          expect(SalesCalculation.__get__('RoyaltyCalculator').calledWith(event.contracts[0])).to.be.true;
          expect(SalesCalculation.__get__('RoyaltyCalculator').calledWith(event.contracts[1])).to.be.true;
          done();
        });
      });

      it('should create a new instance of RoyaltyCalculator with the passed params', function (done) {
        // Arrange
        event = {
          type: 'Release',
          releaseIds: [randomId(), randomId()],
          id: randomId(),
          contracts: [{ contractId: randomId() }, { contractId: randomId() }],
          db: { type: 'mongoDB' },
          bigQuery: { type: 'bigQuery' },
          salesDatabaseTable: randomString(),
          periodId: randomId(),
          writeSalesDatabaseTable: randomString(),
          contractQuery: { contractId: randomId() },
          periodEndDate: randomDate(),
          periodType: randomId(),
          clientCurrencies: { homeCurrency: randomString(), currency: randomString() },
          exchangeRates: [{ rate: randomInt() }, { rate: randomInt() }],
          mechanicalAmounts: [{ amount: randomInt() }, { amount: randomInt() }],
          calculationType: randomString(),
          participationRates: [{ rate: randomInt() }, { rate: randomInt() }],
          salesData: { _id: randomId() },
          ppds: [{ rate: randomInt() }, { rate: randomInt() }],
          specificDealerPrices: [{ rate: randomInt() }, { rate: randomInt() }],
          totalLines: randomInt(),
          releaseRestrictions: [{ restrinction: randomInt() }, { restriction: randomInt() }],
          catalogueData: { _id: randomId() },
          escalationEquivalents: [{ escalation: randomInt() }, { escalation: randomInt() }],
          statRates: [{ rate: randomInt() }, { rate: randomInt() }],
        };
        const expectedFilter = { catType: event.type, status: 'Complete', salesFileId: { $in: event.salesFileIds }, releaseId: { $in: event.releaseIds } };
        // Act
        const salesCalculation = new SalesCalculation(event);
        salesCalculation.calculate(function () {
          // Assert
          expect(SalesCalculation.__get__('RoyaltyCalculator').calledWith(event.contracts[0], event.db, event.bigQuery, event.salesDatabaseTable, event.periodId, event.writeSalesDatabaseTable, expectedFilter, event.contractQuery, event.periodEndDate, event.periodType, event.clientCurrencies, event.exchangeRates, event.mechanicalAmounts, event.calculationType, event.participationRates, event.salesData, event.type, event.ppds, event.specificDealerPrices, event.totalLines, event.releaseRestrictions, event.catalogueData, event.escalationEquivalents, event.statRates)).to.be.true;
          done();
        });
      });

      it('should call byContract on the royaltyCalculator', function (done) {
        // Arrange
        event = { contracts: [{ contractId: randomId() }] };
        // Act
        const salesCalculation = new SalesCalculation(event);
        salesCalculation.calculate(function () {
          // Assert
          expect(byContractStub.called).to.be.true;
          done();
        });
      });

      describe('when byContract returns an error', function () {
        it('should return the error to the callback', function (done) {
          // Arrange
          event = { contracts: [{ contractId: randomId() }] };
          const expectedError = randomString();
          byContractStub.yields(expectedError);
          // Act
          const salesCalculation = new SalesCalculation(event);
          salesCalculation.calculate(function (err) {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      describe('when byContract does not return an error', function () {
        it('should return the originalSalesData from the royaltyCalculator to the callback', function (done) {
          // Arrange
          event = { contracts: [{ contractId: randomId() }] };
          const expectedOriginalSalesData = { _id: randomId() };
          SalesCalculation.__get__('RoyaltyCalculator').returns({
            byContract: byContractStub,
            originalSalesData: expectedOriginalSalesData,
          });
          // Act
          const salesCalculation = new SalesCalculation(event);
          salesCalculation.calculate(function (err, result) {
            // Assert
            expect(result).to.deep.eq(expectedOriginalSalesData);
            done();
          });
        });
      });
    });

    describe('when contracts are NOT passed', function () {
      it('should return an empty callback', function (done) {
        // Arrange
        event = {};
        // Act
        const salesCalculation = new SalesCalculation(event);
        salesCalculation.calculate(function (err, result) {
          // Assert
          expect(err).to.be.null;
          expect(result).to.be.undefined;
          done();
        });
      });
    });
  });
});
