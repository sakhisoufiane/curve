const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const { randomId, randomString, randomInt, randomError } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/calculateCosts.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const Period = require('../../../../../models/period');
const Cost = require('../../../../../models/cost');
const Release = require('../../../../../models/release');
const Track = require('../../../../../models/track');

describe('CalculateCosts Unit Tests', () => {
  let CalculateCosts;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CalculateCosts = rewire('../../../../../libs/calculation/statement/calculateCosts');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('calculate', () => {
    let period; let contract; let statement; let db; let bigQuery; let client;
    let getCatalogueOverwritingDataStub;
    beforeEach((done) => {
      period = { _id: randomId(), costIds: [randomId(), randomId()] };
      contract = { _id: randomId() };
      client = { _id: randomId() };
      statement = { _id: randomId(), periodId: period._id, contractId: randomId() };

      db = { type: randomId() };

      bigQuery = {
        setupFile: sinon.stub().yields(),
        writeFileToDb: sinon.stub().yields(),
      };

      sinon.stub(Period, 'findById').resolves(period);
      sinon.stub(Contract, 'findById').resolves(contract);
      sinon.stub(Release, 'distinct').resolves();
      sinon.stub(Track, 'distinct').resolves();
      sinon.stub(Cost, 'find').resolves();
      getCatalogueOverwritingDataStub = sinon.stub().yields();
      CalculateCosts.__set__('CatalogueOverwritingData', { get: getCatalogueOverwritingDataStub });
      CalculateCosts.__set__('runCostCalculations', sinon.stub().yields());
      done();
    });

    it('should call Period.findById with the right args', (done) => {
      // Act
      CalculateCosts.calculate(statement, db, bigQuery, client, () => {
        // Assert
        expect(Period.findById.calledWith(statement.periodId)).to.be.true;
        done();
      });
    });

    describe('when Period.findById returns an error', () => {
      it('should return an error to the callback', () => {
        // Arrange
        const expectedError = new Error('Period could not be found when attempting to calculate costs');
        Period.findById.rejects(expectedError);
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
        });
      });
    });
    describe('when Period.findById doesnt return a period', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        const expectedError = new Error('Period could not be found when attempting to calculate costs');
        Period.findById.resolves(null);
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
          done();
        });
      });
    });

    it('should call Contract.findById with the right args', (done) => {
      // Act
      CalculateCosts.calculate(statement, db, bigQuery, client, () => {
        // Assert
        expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
        done();
      });
    });
    describe('when Contract.findById returns an error', () => {
      it('should return an error to the callback', () => {
        // Arrange
        const expectedError = new Error(`Contract with ID ${statement.contractId} could not be found when trying to calculate costs`);
        Contract.findById.rejects(expectedError);
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
        });
      });
    });
    describe('when Contract.findById doesnt return a contract', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        const expectedError = new Error(`Contract with ID ${statement.contractId} could not be found when trying to calculate costs`);
        Contract.findById.resolves(null);
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
          done();
        });
      });
    });

    describe('when period.costIds.length > 0', () => {
      let catalogueData;
      beforeEach((done) => {
        catalogueData = [{ _id: '123' }];
        getCatalogueOverwritingDataStub.yields(null, catalogueData);
        CalculateCosts.__get__('CatalogueOverwritingData', { get: getCatalogueOverwritingDataStub });
        done();
      });
      it('should call CatalogueOverwritingData.get with the right args', (done) => {
        // Arrange
        const expectedOptions = { joinArraysToString: true };
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.__get__('CatalogueOverwritingData.get').calledWith(client, expectedOptions)).to.be.true;
          done();
        });
      });
      it('should call bigQuery.setupFile', (done) => {
        // Arrange
        CalculateCosts.__set__('bigQuery', { setupFile: bigQuery.setupFile });
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.__get__('bigQuery.setupFile').called).to.be.true;
          done();
        });
      });
      it('should call Release.distinct with the right args', (done) => {
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(Release.distinct.calledWith('_id', { clientId: statement.clientId, 'costsRights.contractId': statement.contractId })).to.be.true;
          done();
        });
      });
      it('should call Track.distinct with the right args', (done) => {
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(Track.distinct.calledWith('_id', { clientId: statement.clientId, 'costsRights.contractId': statement.contractId })).to.be.true;
          done();
        });
      });
      it('should call Cost.find with the right args', (done) => {
        // Arrange
        statement.clientId = randomId();
        const trackId1 = randomId();
        const trackId2 = randomId();
        Track.distinct.resolves([trackId1, trackId2]);
        const releaseId1 = randomId();
        const releaseId2 = randomId();
        Release.distinct.resolves([releaseId1, releaseId2]);
        const distinctValues = { trackIds: [trackId1, trackId2], releaseIds: [releaseId1, releaseId2] };
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(Cost.find.calledWith({ clientId: statement.clientId, _id: { $in: period.costIds.map((id) => ObjectId.createFromHexString(id)) }, $or: [{ contractIds: statement.contractId }, { releaseIds: { $in: distinctValues.releaseIds } }, { trackIds: { $in: distinctValues.trackIds } }] })).to.be.true;
          done();
        });
      });
      it('should call runCostCalculations with the right args', (done) => {
        // Arrange
        const cost = { _id: randomId() };
        Cost.find.resolves([cost]);
        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.__get__('runCostCalculations').calledWith(cost, db, bigQuery, client, period, catalogueData, contract, null)).to.be.true;
          done();
        });
      });
      describe('when runCostCalculations returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomError();
          CalculateCosts.__set__('runCostCalculations', sinon.stub().yields(expectedError));
          const cost = { _id: randomId() };
          Cost.find.resolves([cost]);
          // Act
          CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
            // Assert
            expect(err.message).to.eq(expectedError.message);
            done();
          });
        });
      });
      it('should call bigQuery.writeFileToDb with the right args', (done) => {
        // Arrange
        const cost = { _id: randomId() };
        Cost.find.resolves([cost]);
        bigQuery.costsTable = randomString();

        // Act
        CalculateCosts.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(bigQuery.writeFileToDb.calledWith(bigQuery.costsTable)).to.be.true;
          done();
        });
      });
      describe('when bigQuery.writeFileToDb returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomError();
          bigQuery.writeFileToDb.yields(expectedError);
          const cost = { _id: randomId() };
          Cost.find.resolves([cost]);
          // Act
          CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
            // Assert
            expect(err.message).to.eq(expectedError.message);
            done();
          });
        });
      });
    });
  });
});
