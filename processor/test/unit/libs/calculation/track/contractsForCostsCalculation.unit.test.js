const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/track/contractsForCostsCalculation.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');

describe('contractsForCostsCalculation unit tests', () => {
  let ContractsForCostsCalculation;
  let track; let accountingPeriod; let contractType; let contract;
  let getSeparatedCostsTerms;
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    ContractsForCostsCalculation = rewire('../../../../../libs/calculation/track/contractsForCostsCalculation');

    track = { _id: randomId(), clientId: randomId(), costsRights: [{ }] };
    contract = { _id: randomId(), name: randomString(), currency: randomString(), partitionNo: randomInt() };
    accountingPeriod = randomString();
    contractType = randomString();

    getSeparatedCostsTerms = sinon.stub().yields();
    ContractsForCostsCalculation.__set__('SeparatedCostsTerms', { get: getSeparatedCostsTerms });

    sinon.stub(Contract, 'findOne');
    Contract.findOne.resolves();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('for each track.costsRights', () => {
    describe('when no contract', () => {
      it('should not call SeparatedCostsTerms.get', (done) => {
        // Arrange
        contract = null;
        // Act
        ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
          expect(getSeparatedCostsTerms.called).to.be.false;
          done();
        });
      });
    });

    describe('when no contract._id', () => {
      it('should not call SeparatedCostsTerms.get', (done) => {
        // Arrange
        delete contract._id;
        // Act
        ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
          expect(getSeparatedCostsTerms.called).to.be.false;
          done();
        });
      });
    });

    describe('when the contract isn\'t active', () => {
      it('should not call SeparatedCostsTerms.get', (done) => {
        // Arrange
        contract.active = false;
        // Act
        ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
          expect(getSeparatedCostsTerms.called).to.be.false;
          done();
        });
      });
    });

    describe('when contract._id !== releaseContract.contractId', () => {
      it('should not call SeparatedCostsTerms.get', (done) => {
        // Arrange
        contract = null;
        // Act
        ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
          expect(getSeparatedCostsTerms.called).to.be.false;
          done();
        });
      });
    });

    describe('when passed a contract that doesn\'t match the row', () => {
      it('should not call SeparatedCostsTerms.get', (done) => {
        // Arrange
        track.costsRights[0].contractId = randomId();
        // Act
        ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
          expect(getSeparatedCostsTerms.called).to.be.false;
          done();
        });
      });
    });

    describe('when passed an active contract that matches the row', () => {
      it('should call SeparatedCostsTerms.get with the right args', (done) => {
        // Arrange
        contract.active = true;
        track.costsRights[0].contractId = contract._id;
        // Act
        ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
          expect(getSeparatedCostsTerms.calledWith(contract)).to.be.true;
          done();
        });
      });

      it('should add the right object to the data array', (done) => {
        // Arrange
        contract.active = true;
        track.costsRights[0].contractId = contract._id;
        const expectedCostsTerms = { type: randomString() };
        getSeparatedCostsTerms.yields(null, expectedCostsTerms);
        const expectedObject = {
          objectPercentage: track.costsRights[0].percentage,
          contractId: track.costsRights[0].contractId,
          name: contract.name,
          contractCurrency: contract.currency,
          partitionNo: contract.partitionNo,
          terms: expectedCostsTerms,
        };

        // Act
        ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
          expect(data).to.deep.eq([expectedObject]);
          done();
        });
      });
    });

    describe('when not passed a contract', () => {
      describe('when the contractType is Mechanical', () => {
        it('should set contractFilter to the right args', (done) => {
          // Arrange
          contractType = 'Mechanical';
          contract = null;
          const expectedFilter = {
            clientId: track.clientId,
            _id: track.costsRights[0].contractId,
            accountingPeriod,
            active: true,
            contractType: 'Mechanical',
          };
          // Act
          ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
            // Assert
            expect(Contract.findOne.calledWith(expectedFilter)).to.be.true;
            done();
          });
        });
      });

      describe('when the contractType is not Mechanical', () => {
        it('should set contractFilter to the right args', (done) => {
          // Arrange
          contractType = randomString();
          contract = null;
          const expectedFilter = {
            clientId: track.clientId,
            _id: track.costsRights[0].contractId,
            accountingPeriod,
            active: true,
            contractType: { $ne: 'Mechanical' },
          };
          // Act
          ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
            // Assert
            expect(Contract.findOne.calledWith(expectedFilter)).to.be.true;
            done();
          });
        });
      });

      describe('when no contract is returned', () => {
        it('should not call SeparatedCostsTerms.get', (done) => {
          // Arrange
          contract = null;
          Contract.findOne.resolves();
          // Act
          ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
            // Assert
            expect(getSeparatedCostsTerms.called).to.be.false;
            done();
          });
        });
      });

      describe('when a contract is returned', () => {
        it('should call SeparatedCostsTerms.get with the right args', (done) => {
          // Arrange
          contract = null;
          const foundContract = { _id: randomId() };
          Contract.findOne.resolves(foundContract);
          // Act
          ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
            // Assert
            expect(getSeparatedCostsTerms.called).to.be.true;
            done();
          });
        });

        it('should add the right object to the data array', (done) => {
        // Arrange
          contract = null;
          const foundContract = { _id: randomId(), name: randomString(), currency: randomString(), partitionNo: randomInt() };
          Contract.findOne.resolves(foundContract);
          const expectedCostsTerms = { type: randomString() };
          getSeparatedCostsTerms.yields(null, expectedCostsTerms);
          const expectedObject = {
            objectPercentage: track.costsRights[0].percentage,
            contractId: track.costsRights[0].contractId,
            name: foundContract.name,
            contractCurrency: foundContract.currency,
            partitionNo: foundContract.partitionNo,
            terms: expectedCostsTerms,
          };

          // Act
          ContractsForCostsCalculation(track, accountingPeriod, contractType, contract, (err, data) => {
          // Assert
            expect(data).to.deep.eq([expectedObject]);
            done();
          });
        });
      });
    });
  });
});
