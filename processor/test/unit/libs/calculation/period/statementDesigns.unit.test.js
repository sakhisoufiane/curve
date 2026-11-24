const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/statementDesigns.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const Contract = require('../../../../../models/contract');

describe('StatementDesigns Unit Tests', () => {
  let StatementDesigns;
  let period; let contract; let client;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    StatementDesigns = rewire('../../../../../libs/calculation/period/statementDesigns');

    period = { _id: randomId(), clientId: randomId(), recalculation: {}, accountingPeriodType: randomString() };

    client = { _id: randomId() };

    contract = { _id: randomId() };
    sinon.stub(Contract, 'find');

    Contract.find.resolves([contract]);

    StatementDesigns.__set__('setStatementDesign', sinon.stub().yields());
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#setContractStatementDesigns', () => {
    it('should call Contract.find with the right args', (done) => {
      // Arrange
      const expectedFilter = {
        clientId: client._id,
        accountingPeriod: period.accountingPeriodType,
      };
      // Act
      StatementDesigns.setContractStatementDesigns(period, client, () => {
        // Assert
        expect(Contract.find.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when recalculation.contractIds and no recalculation.salesFiles', () => {
    it('should set the _id on the filter', (done) => {
      // Arrange
      const contractIds = [randomId(), randomId()];
      period.recalculation = { contractIds };
      period.recalculation.salesFiles = null;
      const expectedFilter = {
        clientId: client._id,
        _id: { $in: period.recalculation.contractIds.map((id) => ObjectId.createFromHexString(id)) },
      };
      // Act
      StatementDesigns.setContractStatementDesigns(period, client, () => {
        // Assert
        expect(Contract.find.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when period.contractType is Mechanical', () => {
    it('should set filter.contractType to Mechanical', (done) => {
      // Arrange
      period.contractType = 'Mechanical';
      const expectedFilter = {
        clientId: client._id,
        accountingPeriod: period.accountingPeriodType,
        contractType: 'Mechanical',
      };
      // Act
      StatementDesigns.setContractStatementDesigns(period, client, () => {
        // Assert
        expect(Contract.find.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when Contract.find returns an error', () => {
    it('should return the error to the callback', () => {
      // Arrange
      const expectedError = randomString();
      Contract.find.rejects(expectedError);
      // Act
      StatementDesigns.setContractStatementDesigns(period, client, (err) => {
        // Assert
        expect(err).to.eq(expectedError);
      });
    });
  });

  it('should call setStatementDesign with right args', (done) => {
    // Act
    StatementDesigns.setContractStatementDesigns(period, client, () => {
      // Assert
      expect(StatementDesigns.__get__('setStatementDesign').calledWith(contract)).to.be.true;
      done();
    });
  });
  describe('when setStatementDesign returns an error', () => {
    it('should return the error to the callback', (done) => {
      // Arrange
      const expectedError = randomString();
      StatementDesigns.__get__('setStatementDesign').yields(expectedError);
      // Act
      StatementDesigns.setContractStatementDesigns(period, client, (err) => {
        // Assert
        expect(err).to.eq(expectedError);
        done();
      });
    });
  });
});
