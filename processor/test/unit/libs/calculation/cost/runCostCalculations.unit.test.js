const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/periodController.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Release = require('../../../../../models/release');
const Track = require('../../../../../models/track');
const Contract = require('../../../../../models/contract');

describe('runCostCalculation unit tests', () => {
  let RunCostCalculations;
  let cost; let db; let bigQuery; let client; let period; let catalogueData; let contract; let completedItemsUpdater;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    RunCostCalculations = rewire('../../../../../libs/calculation/cost/runCostCalculations');

    cost = { _id: randomId() };
    db = { type: randomString() };
    bigQuery = { type: randomString() };
    client = { _id: randomId(), periodCostsDatabaseTable: randomString() };
    period = { _id: randomId(), clientId: randomId(), salesFileIds: [randomId(), randomId()] };
    contract = { _id: randomId() };
    catalogueData = [{ _id: randomId() }, { _id: randomId() }];

    completedItemsUpdater = { increaseCount: sinon.stub() };

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('when no cost', () => {
    it('should return an error', (done) => {
      // Arrange
      cost = null;
      const expectedError = 'Cost, Client and Period must all be passed to runCostCalculations';
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(err.message).to.eq(expectedError);
        done();
      });
    });
  });

  describe('when no client', () => {
    it('should return an error', (done) => {
      // Arrange
      client = null;
      const expectedError = 'Cost, Client and Period must all be passed to runCostCalculations';
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(err.message).to.eq(expectedError);
        done();
      });
    });
  });

  describe('when no period', () => {
    it('should return an error', (done) => {
      // Arrange
      period = null;
      const expectedError = 'Cost, Client and Period must all be passed to runCostCalculations';
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(err.message).to.eq(expectedError);
        done();
      });
    });
  });

  describe('for each cost.releaseIds', () => {
    let release; let data;

    beforeEach((done) => {
      cost.releaseIds = [randomId()];

      release = { _id: randomId() };
      sinon.stub(Release, 'findById').resolves(release);

      data = [{ _id: randomId() }, { _id: randomId() }];
      RunCostCalculations.__set__('releaseContractsForCostsCalculation', sinon.stub());
      RunCostCalculations.__get__('releaseContractsForCostsCalculation').yields(null, data);

      RunCostCalculations.__set__('calculateCosts', sinon.stub());
      RunCostCalculations.__get__('calculateCosts').yields();

      done();
    });

    it('call Release.findById with the right args', (done) => {
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(Release.findById.calledWith(cost.releaseIds[0])).to.be.true;
        done();
      });
    });

    it('call releaseContractsForCostsCalculation with the right args', (done) => {
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(RunCostCalculations.__get__('releaseContractsForCostsCalculation').calledWith(release, period.accountingPeriodType, period.contractType, contract)).to.be.true;
        done();
      });
    });

    it('call calculateCosts with the right args', (done) => {
      // Arrange
      const expectObject = {
        costsDatabaseTable: 'costs',
        writeCostsDatabaseTable: client.periodCostsDatabaseTable,
        periodId: period._id.toString(),
        clientId: period.clientId,
        salesFileIds: period.salesFileIds,
        costIds: [cost._id],
        contracts: data,
        type: 'Release',
        id: release._id,
        periodEndDate: period.endDate,
        catalogueData,
        exchangeRates: period.currencyExchangeRates,
        db,
        bigQuery,
        costId: cost._id.toString(),
      };
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(RunCostCalculations.__get__('calculateCosts').calledWith(expectObject)).to.be.true;
        done();
      });
    });

    describe('when calculateCosts returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomString();
        RunCostCalculations.__get__('calculateCosts').yields(expectedError);
        // Act
        RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when completedItemsUpdater', () => {
      it('should call completedItemsUpdater.increaseCount', (done) => {
        // Act
        RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
          // Assert
          expect(completedItemsUpdater.increaseCount.called).to.be.true;
          done();
        });
      });
    });
  });

  describe('for each cost.trackIds', () => {
    let track; let data;

    beforeEach((done) => {
      cost.trackIds = [randomId()];

      track = { _id: randomId() };
      sinon.stub(Track, 'findById').resolves(track);

      data = [{ _id: randomId() }, { _id: randomId() }];
      RunCostCalculations.__set__('trackContractsForCostsCalculation', sinon.stub());
      RunCostCalculations.__get__('trackContractsForCostsCalculation').yields(null, data);

      RunCostCalculations.__set__('calculateCosts', sinon.stub());
      RunCostCalculations.__get__('calculateCosts').yields();

      done();
    });

    it('call Track.findById with the right args', (done) => {
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(Track.findById.calledWith(cost.trackIds[0])).to.be.true;
        done();
      });
    });

    it('call trackContractsForCostsCalculation with the right args', (done) => {
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(RunCostCalculations.__get__('trackContractsForCostsCalculation').calledWith(track, period.accountingPeriodType, period.contractType, contract)).to.be.true;
        done();
      });
    });

    it('call calculateCosts with the right args', (done) => {
      // Arrange
      const expectObject = {
        costsDatabaseTable: 'costs',
        writeCostsDatabaseTable: client.periodCostsDatabaseTable,
        periodId: period._id.toString(),
        clientId: period.clientId,
        salesFileIds: period.salesFileIds,
        costIds: [cost._id],
        contracts: data,
        type: 'Track',
        id: track._id,
        catalogueData,
        periodEndDate: period.endDate,
        exchangeRates: period.currencyExchangeRates,
        db,
        bigQuery,
      };
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(RunCostCalculations.__get__('calculateCosts').calledWith(expectObject)).to.be.true;
        done();
      });
    });

    describe('when calculateCosts returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomString();
        RunCostCalculations.__get__('calculateCosts').yields(expectedError);
        // Act
        RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when completedItemsUpdater', () => {
      it('should call completedItemsUpdater.increaseCount', (done) => {
        // Act
        RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
          // Assert
          expect(completedItemsUpdater.increaseCount.called).to.be.true;
          done();
        });
      });
    });
  });

  describe('for each cost.contractIds', () => {
    let contract; let data; let forCostsCalculation;

    beforeEach((done) => {
      cost.contractIds = [randomId()];

      contract = { _id: randomId() };
      sinon.stub(Contract, 'findById');
      Contract.findById.resolves(contract);

      data = [{ _id: randomId() }, { _id: randomId() }];

      forCostsCalculation = sinon.stub().yields(data);
      RunCostCalculations.__set__('ContractTerms', { forCostsCalculation });

      RunCostCalculations.__set__('calculateCosts', sinon.stub());
      RunCostCalculations.__get__('calculateCosts').yields();

      done();
    });

    it('call Contract.findById with the right args', (done) => {
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(Contract.findById.calledWith(cost.contractIds[0])).to.be.true;
        done();
      });
    });

    it('call ContractTerms.forCostsCalculation with the right args', (done) => {
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(forCostsCalculation.calledWith(contract, period.accountingPeriodType)).to.be.true;
        done();
      });
    });

    it('call calculateCosts with the right args', (done) => {
      // Arrange
      const expectObject = {
        costsDatabaseTable: 'costs',
        writeCostsDatabaseTable: client.periodCostsDatabaseTable,
        periodId: period._id.toString(),
        clientId: period.clientId,
        salesFileIds: period.salesFileIds,
        costIds: [cost._id],
        contracts: data,
        type: 'Contract',
        id: contract._id,
        catalogueData,
        periodEndDate: period.endDate,
        exchangeRates: period.currencyExchangeRates,
        db,
        bigQuery,
      };
      // Act
      RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
        // Assert
        expect(RunCostCalculations.__get__('calculateCosts').calledWith(expectObject)).to.be.true;
        done();
      });
    });

    describe('when calculateCosts returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = randomString();
        RunCostCalculations.__get__('calculateCosts').yields(expectedError);
        // Act
        RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when completedItemsUpdater', () => {
      it('should call completedItemsUpdater.increaseCount', (done) => {
        // Act
        RunCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, (err) => {
          // Assert
          expect(completedItemsUpdater.increaseCount.called).to.be.true;
          done();
        });
      });
    });
  });
});
