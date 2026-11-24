const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomError } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/deleteAssociations.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Period = require('../../../../../models/period');
const Transaction = require('../../../../../models/transaction');
const Payment = require('../../../../../models/payment');
const PaymentGroup = require('../../../../../models/paymentGroup');
const Contract = require('../../../../../models/contract');

describe('DeleteAssociations Unit Tests', () => {
  let DeleteAssociations;

  let statement;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    DeleteAssociations = rewire('../../../../../libs/calculation/statement/deleteAssociations');
    sinon.stub(Contract, 'findById').resolves();
    statement = { _id: randomId(), name: randomString(), periodId: randomId(), clientId: randomId() };

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#deleteAssociations', () => {
    beforeEach((done) => {
      sinon.stub(DeleteAssociations, 'deleteTransactions').yields();
      sinon.stub(DeleteAssociations, 'deleteFiles').yields();
      sinon.stub(DeleteAssociations, 'deletePayeeTransactions').resolves();

      done();
    });

    it('should call DeleteAssociations.deleteTransactions with the right args', (done) => {
      // Act
      DeleteAssociations.deleteAssociations(statement, () => {
        // Assert
        expect(DeleteAssociations.deleteTransactions.calledWith(statement)).to.be.true;
        done();
      });
    });
    it('should call DeleteAssociations.deleteFiles with the right args', (done) => {
      // Act
      DeleteAssociations.deleteAssociations(statement, () => {
        // Assert
        expect(DeleteAssociations.deleteFiles.calledWith(statement)).to.be.true;
        done();
      });
    });
  });

  describe('#deleteTransactions', () => {
    let transactions;

    beforeEach((done) => {
      transactions = [new Transaction({ _id: randomId(0) })];
      sinon.stub(Transaction, 'find').resolves(transactions);
      sinon.stub(Transaction.prototype, 'deleteOne').resolves();

      done();
    });
    afterEach(() => sinon.restore());

    afterEach(() => sinon.stub());

    it('should call Transaction.find with the right args', (done) => {
      // Arrange
      const expectedFilter = { clientId: statement.clientId, statementId: statement._id };
      // Act
      DeleteAssociations.deleteTransactions(statement, () => {
        // Assert
        expect(Transaction.find.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });

    it('should call transaction.deleteOne', (done) => {
      // Act
      DeleteAssociations.deleteTransactions(statement, () => {
        // Assert
        expect(Transaction.prototype.deleteOne.called).to.be.true;
        done();
      });
    });
    describe('when a transaction deleteOne errors', () => {
      it('should return an error to the callback', () => {
        // Arrange
        Transaction.prototype.deleteOne.rejects(randomString());
        const expectedError = 'Payments associated with this statement have already been paid out.';
        // Act
        DeleteAssociations.deleteTransactions(statement, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError);
        });
      });
    });
  });

  describe('#deletePayments', () => {
    let period; let paymentGroup; let payments;
    beforeEach((done) => {
      period = { _id: randomId() };
      paymentGroup = new PaymentGroup({ _id: randomId() });
      payments = [new Payment({ _id: randomId() })];

      sinon.stub(Period, 'findById').resolves(period);
      sinon.stub(PaymentGroup, 'findOne').resolves(paymentGroup);
      sinon.stub(PaymentGroup.prototype, 'deleteOne').resolves();
      sinon.stub(Payment, 'find').resolves(payments);
      sinon.stub(Payment, 'countDocuments').resolves(0);
      sinon.stub(Payment.prototype, 'deleteOne').resolves();
      done();
    });

    it('should call Period.findById with the right args', (done) => {
      // Act
      DeleteAssociations.deletePayments(statement, () => {
        // Assert
        expect(Period.findById.calledWith(statement.periodId)).to.be.true;
        done();
      });
    });

    it('should call PaymentGroup.findOne with the right args', (done) => {
      // Act
      DeleteAssociations.deletePayments(statement, () => {
        // Assert
        expect(PaymentGroup.findOne.calledWith({ clientId: statement.clientId, periodId: period._id.toString() })).to.be.true;
        done();
      });
    });

    describe('when no paymentGroup is returned', () => {
      it('should not call Payment.find', (done) => {
        // Arrange
        PaymentGroup.findOne.resolves(null);
        // Act
        DeleteAssociations.deletePayments(statement, () => {
          // Assert
          expect(Payment.find.called).to.be.false;
          done();
        });
      });
    });

    describe('when a paymentGroup is returned', () => {
      it('should call Payment.find with the right args', (done) => {
        // Act
        DeleteAssociations.deletePayments(statement, () => {
          // Assert
          expect(Payment.find.calledWith({ clientId: statement.clientId, paymentGroupId: paymentGroup._id.toString(), statementId: statement._id.toString() })).to.be.true;
          done();
        });
      });
      it('should call payment.deleteOne', (done) => {
        // Act
        DeleteAssociations.deletePayments(statement, () => {
          // Assert
          expect(Payment.prototype.deleteOne.called).to.be.true;
          done();
        });
      });
    });

    it('should call Payment.countDocuments with the right args', (done) => {
      // Act
      DeleteAssociations.deletePayments(statement, () => {
        // Assert
        expect(Payment.countDocuments.calledWith({ clientId: statement.clientId, paymentGroupId: paymentGroup._id.toString() })).to.be.true;
        done();
      });
    });

    describe('when Payment.countDocuments returns 0', () => {
      it('should call paymentGroup.deleteOne', (done) => {
        // Act
        DeleteAssociations.deletePayments(statement, () => {
          // Assert
          expect(PaymentGroup.prototype.deleteOne.called).to.be.true;
          done();
        });
      });
    });

    describe('when Payment.countDocuments returns > 0', () => {
      it('should not call paymentGroup.deleteOne', (done) => {
        // Arrange
        Payment.countDocuments.resolves(randomInt());
        // Act
        DeleteAssociations.deletePayments(statement, () => {
          // Assert
          expect(PaymentGroup.prototype.deleteOne.called).to.be.false;
          done();
        });
      });
    });
  });

  describe('#clearTransactionsForRerunningPeriod', () => {
    let transactions;

    beforeEach((done) => {
      transactions = [new Transaction({ _id: randomId(0) })];
      sinon.stub(Transaction, 'find').resolves(transactions);
      sinon.stub(Transaction.prototype, 'deleteOne').resolves();

      done();
    });

    afterEach(() => sinon.stub());

    it('should call Transaction.find with the right args', (done) => {
      // Arrange
      const expectedFilter = { clientId: statement.clientId, $or: [{ statementId: statement._id, type: { $nin: ['Transfer From', 'Contract Payment'] } }, { transferringStatementId: statement._id.toString() }, { name: statement.name, type: 'Contract Payment' }] };
      // Act
      DeleteAssociations.clearTransactionsForRerunningPeriod(statement, () => {
        // Assert
        expect(Transaction.find.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });
    it('should call transaction.deleteOne', (done) => {
      // Act
      DeleteAssociations.clearTransactionsForRerunningPeriod(statement, () => {
        // Assert
        expect(Transaction.prototype.deleteOne.called).to.be.true;
        done();
      });
    });
  });

  describe('#deleteFiles', () => {
    let deleteFromS3Stub;
    beforeEach((done) => {
      deleteFromS3Stub = sinon.stub().yields();
      DeleteAssociations.__set__('fileManager', { deleteFromS3: deleteFromS3Stub });
      done();
    });
    it('should call fileManager.deleteFromS3 for allFilesZip', (done) => {
      // Arrange
      statement.allFilesZip = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.allFilesZip)).to.be.true;
        done();
      });
    });
    it('should call fileManager.deleteFromS3 for salesCsv', (done) => {
      // Arrange
      statement.salesCsv = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.salesCsv)).to.be.true;
        done();
      });
    });
    it('should call fileManager.deleteFromS3 for costsCsv', (done) => {
      // Arrange
      statement.costsCsv = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.costsCsv)).to.be.true;
        done();
      });
    });
    it('should call fileManager.deleteFromS3 for pdf', (done) => {
      // Arrange
      statement.pdf = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.pdf)).to.be.true;
        done();
      });
    });
    it('should call fileManager.deleteFromS3 for statementOfAccount', (done) => {
      // Arrange
      statement.statementOfAccount = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.statementOfAccount)).to.be.true;
        done();
      });
    });
    it('should call fileManager.deleteFromS3 for selfBillingInvoice', (done) => {
      // Arrange
      statement.selfBillingInvoice = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.selfBillingInvoice)).to.be.true;
        done();
      });
    });
    it('should call fileManager.deleteFromS3 for feesInvoice', (done) => {
      // Arrange
      statement.feesInvoice = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.feesInvoice)).to.be.true;
        done();
      });
    });
    it('should call fileManager.deleteFromS3 for customStatement', (done) => {
      // Arrange
      statement.customStatement = randomString();
      // Act
      DeleteAssociations.deleteFiles(statement, () => {
        // Assert
        expect(DeleteAssociations.__get__('fileManager.deleteFromS3').calledWith(statement.customStatement)).to.be.true;
        done();
      });
    });
  });
});
