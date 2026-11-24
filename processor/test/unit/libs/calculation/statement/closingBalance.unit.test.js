const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/clear.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const Statement = require('../../../../../models/statement');

describe('ClosingBalance Unit Tests', () => {
  let ClosingBalance;
  let statement; let period; let contract;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    ClosingBalance = rewire('../../../../../libs/calculation/statement/closingBalance');

    period = { _id: randomId() };
    contract = { _id: randomId() };
    statement = new Statement({ _id: randomId(), periodId: period._id, contractId: contract._id });

    sinon.stub(Contract, 'findById');
    Contract.findById.resolves(contract);

    ClosingBalance.__set__('balanceAtDate', sinon.stub().yields());
    ClosingBalance.__get__('balanceAtDate').yields(null, randomInt());

    sinon.stub(Statement.prototype, 'save').resolves();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('when contractType is Profit Share', () => {
    it('should not call Contract.findById', (done) => {
      // Arrange
      statement.contractType = 'Profit Share';
      // Act
      ClosingBalance(statement, period, () => {
        // Assert
        expect(Contract.findById.notCalled).to.be.true;
        done();
      });
    });
  });

  describe('when contractType is Profit Share - Flexible', () => {
    it('should not call Contract.findById', (done) => {
      // Arrange
      statement.contractType = 'Profit Share - Flexible';
      // Act
      ClosingBalance(statement, period, () => {
        // Assert
        expect(Contract.findById.notCalled).to.be.true;
        done();
      });
    });
  });

  it('should call Contract.findById with the right args', (done) => {
    // Act
    ClosingBalance(statement, period, () => {
      // Assert
      expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
      done();
    });
  });

  describe('when no contract is returned', () => {
    it('should not call balanceAtDate', (done) => {
      // Arrange
      Contract.findById.resolves(null);
      // Act
      ClosingBalance(statement, period, () => {
        // Assert
        expect(ClosingBalance.__get__('balanceAtDate').called).to.be.false;
        done();
      });
    });
  });

  it('should call balanceAtDate with the right args', (done) => {
    // Act
    ClosingBalance(statement, period, () => {
      // Assert
      expect(ClosingBalance.__get__('balanceAtDate').called).to.be.true;
      done();
    });
  });

  it('should call statement.save', (done) => {
    // Act
    ClosingBalance(statement, period, () => {
      // Assert
      expect(statement.save.called).to.be.true;
      done();
    });
  });
});
