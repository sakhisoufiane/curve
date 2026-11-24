const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/payeeBalances/autoPayments.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

// Models
const Payee = require('../../../../../models/payee');
const Contract = require('../../../../../models/contract');
const Statement = require('../../../../../models/statement');

// Methods
const PayeeController = require('../../../../../controllers/payee');
const PayeeTransaction = require('../../../../../models/payeeTransaction');

describe('PayeeBalanceAutoPayments Unit Tests', () => {
  let PayeeBalanceAutoPayment;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PayeeBalanceAutoPayment = rewire('../../../../../libs/calculation/payeeBalances/libs/autoPayments.js');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    let payee; let clientId; let contract; let statement;
    beforeEach((done) => {
      clientId = randomId();
      payee = { clientId, _id: randomId(), minPayout: 0, payeeBalanceCurrency: randomString(), name: randomString() };
      contract = { _id: randomId(), name: randomString(), payees: [{ payeeId: payee._id }] };
      statement = { _id: randomId() };

      // Mongo Stubs
      sinon.stub(Contract, 'findOne').returns({ select: sinon.stub().resolves(contract) });
      sinon.stub(Statement, 'findOne').returns({ select: sinon.stub().resolves(statement) });
      sinon.stub(Payee, 'find').returns({ select: sinon.stub().returns({ sort: sinon.stub().returns({ limit: sinon.stub().resolves([]) }) }) });

      // Method Stubs
      sinon.stub(PayeeController, 'balanceAtDate').resolves(0);
      sinon.stub(PayeeTransaction.prototype, 'save').resolves({});
      done();
    });
    it('should call Payee.find', async () => {
      // Arrange
      const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
      // Act
      await PayeeBalanceAutoPayment.create({ period });
      // Assert
      expect(Payee.find.called).to.be.true;
    });
    describe('When Contract is passed', () => {
      it('should call Payee.findOne with contract.payees.payeeId', async () => {
        // Arrange
        const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };

        const query = {
          clientId: period.clientId,
          autoPayment: true,
          payeeBalanceCurrency: { $exists: true },
          _id: { $in: contract.payees.map((payee) => payee.payeeId) },
        };

        // Act
        await PayeeBalanceAutoPayment.create({ period, contract, statement });

        // Assert
        expect(Payee.find.calledWith(query)).to.be.true;
      });
    });
    describe('when payees are not found', () => {
      it('should return', async () => {
        // Arrange
        const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
        // Act
        await PayeeBalanceAutoPayment.create({ period });
        // Assert
        expect(Contract.findOne.called).to.be.false;
      });
    });
    describe('when payees are found', () => {
      beforeEach((done) => {
        Payee.find.returns({ select: sinon.stub().returns({ sort: sinon.stub().returns({ limit: sinon.stub().resolves([payee]) }) }) });
        done();
      });

      it('should call Contract.findOne', async () => {
        // Arrange
        const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
        // Act
        await PayeeBalanceAutoPayment.create({ period });
        // Assert
        expect(Contract.findOne.called).to.be.true;
      });
      describe('when contract is NOT found', () => {
        it('should return', async () => {
          // Arrange
          const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
          Contract.findOne.returns({ select: sinon.stub().resolves() });
          // Act
          await PayeeBalanceAutoPayment.create({ period });
          // Assert
          expect(Statement.findOne.called).to.be.false;
        });
      });

      it('should call Statement.findOne', async () => {
        // Arrange
        const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
        // Act
        await PayeeBalanceAutoPayment.create({ period });
        // Assert
        expect(Statement.findOne.called).to.be.true;
      });
      describe('when statement is not found', () => {
        it('should return', async () => {
          // Arrange
          const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
          Statement.findOne.returns({ select: sinon.stub().resolves() });
          // Act
          await PayeeBalanceAutoPayment.create({ period });
          // Assert
          expect(PayeeController.balanceAtDate.called).to.be.false;
        });
      });
      it('should call PayeeController.balanceAtDate', async () => {
        // Arrange
        const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
        // Act
        await PayeeBalanceAutoPayment.create({ period });
        // Assert
        expect(PayeeController.balanceAtDate.called).to.be.true;
      });
      describe('when closing balance is less than minPayout', () => {
        it('should return', async () => {
          // Arrange
          const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
          Payee.find.returns({ select: sinon.stub().returns({ sort: sinon.stub().returns({ limit: sinon.stub().resolves([{ ...payee, minPayout: 100 }]) }) }) });
          PayeeController.balanceAtDate.resolves(0);
          // Act
          await PayeeBalanceAutoPayment.create({ period });
          // Assert
          expect(PayeeTransaction.prototype.save.called).to.be.false;
        });
      });
      it('should call PayeeTransaction.prototype.save', async () => {
        // Arrange
        const period = { clientId: randomId(), _id: randomId(), endDate: new Date() };
        Payee.find.returns({ select: sinon.stub().returns({ sort: sinon.stub().returns({ limit: sinon.stub().resolves([payee]) }) }) });
        PayeeController.balanceAtDate.resolves(100);

        const payeeTransaction = {
          clientId,
          name: `${payee.name} - ${period.name} Payment`,
          payeeId: payee._id.toString(),
          periodId: period._id.toString(),
          amountInOriginalCurrency: -100,
          amountInPayeeCurrency: -100,
          currency: payee.payeeBalanceCurrency,
          originalCurrency: payee.payeeBalanceCurrency,
          userCreated: false,
          published: false,
          type: 'Payment',
        };

        // Act
        await PayeeBalanceAutoPayment.create({ period });
        // Assert
        expect(PayeeTransaction.prototype.save.called).to.be.true;

        const savedTransaction = PayeeTransaction.prototype.save.getCall(0).thisValue.toObject();
        delete savedTransaction._id;
        delete savedTransaction.date;

        expect(savedTransaction).to.deep.equal(payeeTransaction);
      });
    });
  });
});
