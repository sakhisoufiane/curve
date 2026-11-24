const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');

logger.info('\n\n**** test/unit/libs/calculation/contract/balanceAtDate.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Transaction = require('../../../../../models/transaction');

describe('BalanceAtDate Unit Tests', () => {
  let BalanceAtDate; let date; let endOfDate; let afterDate; let beforeDate;
  let contract; let options; let leanStub;
  let excludeAdvanceFilter; let excludeReservesFilter;
  let excludeContractPaymentsFilterWithFilterType; let excludeContractPaymentsFilter;
  let excludeContractTransfersFilter; let excludeTransferringStatementFilter;
  let excludeStatementPaymentsFilter; let excludeContractTransfersFilterNoFilterType;
  let mockTransactionAfterDate; let mockTransactionBeforeDate;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    BalanceAtDate = rewire('../../../../../libs/calculation/contract/balanceAtDate');
    contract = { _id: randomId(), openingBalance: 0, clientId: randomId() };
    date = randomDate();
    endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
    afterDate = moment.utc(date).endOf('day').add(1, 'day').format();
    beforeDate = moment.utc(date).subtract(2, 'days').format();
    options = { excludeAdvance: true };
    options.statementId = true;

    // expected filters
    excludeAdvanceFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Advance', 'Advance Recoupment'] } };
    excludeReservesFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Advance', 'Advance Recoupment'] }, isReserveWithholding: { $ne: true }, isReserveRelease: { $ne: true } };
    excludeContractPaymentsFilterWithFilterType = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Advance', 'Advance Recoupment', 'Contract Payment'] } };
    excludeContractPaymentsFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $ne: 'Contract Payment' } };
    excludeContractTransfersFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Advance', 'Advance Recoupment', 'Transfer From', 'Transfer To'] } };
    excludeTransferringStatementFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Advance', 'Advance Recoupment'] }, transferringStatementId: { $ne: options.statementId } };
    excludeStatementPaymentsFilter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Advance', 'Advance Recoupment'] }, $or: [{ isPayment: { $ne: true } }, { statementId: { $ne: options.statementId } }] };
    excludeContractTransfersFilterNoFilterType = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate }, type: { $nin: ['Transfer From', 'Transfer To'] } };

    // mock transactions
    mockTransactionAfterDate = new Transaction({
      clientId: contract.clientId,
      contractId: contract._id,
      amount: 100,
      type: 'Payment',
      date: afterDate,
    });

    mockTransactionBeforeDate = new Transaction({
      clientId: contract.clientId,
      contractId: contract._id,
      amount: 500,
      date: beforeDate,
    });

    // execStub = sinon.stub().yields();
    leanStub = sinon.stub().resolves();
    sinon.stub(Transaction, 'find').returns({ lean: leanStub });
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('when contract has an opening balance', () => {
    it('should set the initial balance to contract.openingBalance', (done) => {
      // Arrange
      contract.openingBalance = randomInt();
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(balance).to.eq(contract.openingBalance);
        done();
      });
    });
  });

  describe('when contract has no opening balance', () => {
    it('should set the initial balance to 0', (done) => {
      // Arrange
      contract.openingBalance = undefined;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(balance).to.eq(0);
        done();
      });
    });
  });

  it('should set the date to utc, end of day the previous day', (done) => {
    // Act
    BalanceAtDate(contract, date, options, (err, balance) => {
      // Assert
      expect(Transaction.find.calledWith(excludeAdvanceFilter)).to.be.true;
      done();
    });
  });

  it('should set filter to the right args', (done) => {
    // Act
    BalanceAtDate(contract, date, options, (err, balance) => {
      // Assert
      expect(Transaction.find.calledWith(excludeAdvanceFilter)).to.be.true;
      done();
    });
  });

  describe('when options.excludeAdvance', () => {
    it('should set exclude advances from the filter', (done) => {
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeAdvanceFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when options.excludeReserves', () => {
    it('should set exclude reserves from the filter', (done) => {
      // Arrange
      options.excludeReserves = true;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeReservesFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when options.excludeContractPayments filter.type', () => {
    it('should add Contract Payment to filter.type.$nin', (done) => {
      // Arrange
      options.excludeContractPayments = true;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeContractPaymentsFilterWithFilterType)).to.be.true;
        done();
      });
    });
  });

  describe('when options.excludeContractPayments and no filter.type', () => {
    it('should set filter.type to the right args', (done) => {
      // Arrange
      options.excludeAdvance = false;
      options.excludeContractPayments = true;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeContractPaymentsFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when options.excludeContractTransfers filter.type', () => {
    it('should add Transfer From and Transfer To to filter.type.$nin', (done) => {
      // Arrange
      options.excludeContractTransfers = true;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeContractTransfersFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when options.excludeContractTransfers and no filter.type', () => {
    it('should set filter.type to the right args', (done) => {
      // Arrange
      options.excludeContractTransfers = true;
      options.excludeAdvance = false;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeContractTransfersFilterNoFilterType)).to.be.true;
        done();
      });
    });
  });

  describe('when options.excludeTransferringStatement', () => {
    it('should set filter.transferringStatementId to the right args', (done) => {
      // Arrange
      options.excludeTransferringStatement = true;
      options.statementId = true;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeTransferringStatementFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when options.excludeStatementPayments and options.statementId', () => {
    it('should set filter.$or to the right args', (done) => {
      // Arrange
      options.excludeStatementPayments = true;
      // Act
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert
        expect(Transaction.find.calledWith(excludeStatementPaymentsFilter)).to.be.true;
        done();
      });
    });
  });

  describe('when a transaction date is after the passed date', () => {
    it('should not add the transaction amount to the balance', (done) => {
      // Arrange - Mock the find function to return the created transaction
      Transaction.find.returns({ lean: sinon.stub().resolves([mockTransactionAfterDate]) });
      // Act Call the function under test
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert - Transaction amount was not added to the balance
        expect(err).to.not.exist;
        expect(balance).to.equal(contract.openingBalance);
        done();
      });
    });
  });

  describe('when a transaction date is before the passed date', () => {
    it('should add the transaction amount to the balance', (done) => {
      // Arrange - Stub Transaction.find() to return the transactions array
      Transaction.find.returns({ lean: sinon.stub().resolves([mockTransactionBeforeDate]) });
      // Act - Call the function under test
      BalanceAtDate(contract, date, options, (err, balance) => {
        // Assert - Transaction amount was added to the balance
        expect(err).to.not.exist;
        expect(balance).to.equal(contract.openingBalance + mockTransactionBeforeDate.amount);
        done();
      });
    });
  });
});
