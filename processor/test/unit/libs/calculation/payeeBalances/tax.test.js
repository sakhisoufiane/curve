const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/payeeBalances/tax.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Payee = require('../../../../../models/payee');
const Contract = require('../../../../../models/contract');
const Statement = require('../../../../../models/statement');
const PayeeTransaction = require('../../../../../models/payeeTransaction');

const PayeeController = require('../../../../../controllers/payee');

describe('PayeeBalanceTax Unit Tests', () => {
  let PayeeBalanceTax;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PayeeBalanceTax = rewire('../../../../../libs/calculation/payeeBalances/libs/tax.js');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    let clientId; let period; let contract; let statement; let payee;
    let openingBalance; let closingBalance; let taxBasis; let taxAmount; let isWithholding;
    beforeEach((done) => {
      // Vars
      clientId = randomId();
      openingBalance = randomInt();
      closingBalance = randomInt();
      taxBasis = randomInt();
      taxAmount = randomInt();
      isWithholding = false;
      period = { clientId, _id: randomId(), startDate: new Date(), endDate: new Date() };
      payee = {
        clientId,
        _id: randomId(),
        minPayout: 0,
        payeeBalanceCurrency: randomString(),
        name: randomString(),
        selfBillingTaxRate: randomInt(),
      };
      contract = { clientId, _id: randomId(), payees: [{ payeeId: payee._id, percentage: 100 }], name: randomString() };
      statement = { clientId, _id: randomId(), contractId: contract._id, periodId: period._id };

      // Stubs
      sinon.stub(PayeeBalanceTax, 'setTax').resolves();
      sinon.stub(PayeeController, 'balanceAtDate').resolves(openingBalance);
      sinon.stub(Contract, 'findOne').returns({ select: sinon.stub().resolves(contract) });
      sinon.stub(Statement, 'findOne').returns({ select: sinon.stub().resolves(statement) });
      sinon.stub(Payee, 'find').returns({
        select: sinon.stub().returns({
          sort: sinon.stub().returns({
            limit: sinon.stub().resolves([payee]),
          }),
        }),
      });
      done();
    });
    it('should call Payee.find', async () => {
      // Act
      await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
      // Assert
      expect(Payee.find.called).to.equal(true);
    });
    it('should call Payee.find with the correct parameters', async () => {
      // Act
      await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
      // Assert
      expect(Payee.find.calledWith({
        clientId,
        payeeBalanceCurrency: { $exists: true },
        $or: [
          { selfBilling: true, selfBillingTaxRate: { $exists: true } },
          { withholdingTaxRate: { $exists: true } },
        ],
      })).to.equal(true);
    });
    describe('When lastId is passed', () => {
      it('should call Payee.find with the correct parameters', async () => {
        // Arrange
        const lastId = randomId();
        // Act
        await PayeeBalanceTax.create({ clientId, period, lastId, statement, isWithholding });
        // Assert
        expect(Payee.find.calledWith({
          clientId,
          payeeBalanceCurrency: { $exists: true },
          $or: [
            { selfBilling: true, selfBillingTaxRate: { $exists: true } },
            { withholdingTaxRate: { $exists: true } },
          ],
          _id: { $gt: lastId },
        })).to.equal(true);
      });
    });
    describe('When Contract is passed', () => {
      it('should call Payee.find with the correct parameters', async () => {
        // Act
        await PayeeBalanceTax.create({ clientId, period, contract, statement, isWithholding });
        // Assert
        expect(Payee.find.calledWith({
          clientId,
          payeeBalanceCurrency: { $exists: true },
          $or: [
            { selfBilling: true, selfBillingTaxRate: { $exists: true } },
            { withholdingTaxRate: { $exists: true } },
          ],
          _id: { $in: [payee._id] },
        })).to.equal(true);
      });
    });
    describe('when Payee.find returns no payees', () => {
      it('should return', async () => {
        // Arrange
        Payee.find.returns({ select: sinon.stub().returns({ sort: sinon.stub().returns({ limit: sinon.stub().resolves([]) }) }) });
        // Act
        await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
        // Assert
        expect(PayeeBalanceTax.setTax.called).to.equal(false);
      });
    });
    describe('When Payee.find returns payees', () => {
      it('Should call Contract.findOne', async () => {
        // Act
        await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
        // Assert
        expect(Contract.findOne.called).to.equal(true);
      });
      describe('When Contract.findOne returns no contract', () => {
        it('should not call Statement.findOne', async () => {
          // Arrange
          Contract.findOne.returns({ select: sinon.stub().resolves() });
          // Act
          await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
          // Assert
          expect(Statement.findOne.called).to.equal(false);
        });
        it('should not call PayeeBalanceTax.setTax', async () => {
          // Arrange
          Contract.findOne.returns({ select: sinon.stub().resolves() });
          // Act
          await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
          // Assert
          expect(PayeeBalanceTax.setTax.called).to.equal(false);
        });
      });
      it('should call Statement.findOne', async () => {
        // Act
        await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
        // Assert
        expect(Statement.findOne.called).to.equal(true);
      });
      describe('When Statement.findOne returns no statement', () => {
        it('should not call PayeeBalanceTax.setTax', async () => {
          // Arrange
          Statement.findOne.returns({ select: sinon.stub().resolves() });
          // Act
          await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
          // Assert
          expect(PayeeBalanceTax.setTax.called).to.equal(false);
        });
      });
      it('should call PayeeBalanceTax.setTax', async () => {
        // Act
        await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
        // Assert
        expect(PayeeBalanceTax.setTax.called).to.be.true;
      });
      describe('When Payee has Withholding Tax Set', () => {
        it('should call PayeeBalanceTax.setTax twice', async () => {
          // Arrange
          payee.withholdingTaxRate = randomInt();
          // Act
          await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
          // Assert
          expect(PayeeBalanceTax.setTax.calledTwice).to.be.true;
        });
        it('should call PayeeBalanceTax.setTax with isWithholding = true', async () => {
          // Arrange
          payee.withholdingTaxRate = randomInt();
          // Act
          await PayeeBalanceTax.create({ clientId, period, statement, isWithholding });
          // Assert
          expect(PayeeBalanceTax.setTax.calledWith({ payee, period, isWithholding: true })).to.be.true;
        });
      });
    });
  });

  describe('#setTax', () => {
    let clientId; let payee; let period; let contract;
    beforeEach((done) => {
      // Vars
      clientId = randomId();
      payee = { clientId, _id: randomId(), minPayout: 0, payeeBalanceCurrency: randomString(), name: randomString(), selfBillingTaxRate: randomInt() };
      period = { clientId, _id: randomId(), startDate: new Date(), endDate: new Date() };

      // Stubs
      sinon.stub(PayeeController, 'balanceAtDate').resolves(randomInt());
      sinon.stub(PayeeTransaction.prototype, 'save').resolves({});
      done();
    });
    it('Should call PayeeController.balanceAtDate twice', async () => {
      // Act
      await PayeeBalanceTax.setTax({ payee, period });
      // Assert
      expect(PayeeController.balanceAtDate.calledTwice).to.be.true;
    });
    describe('When Payee Closing Balance is below Payee.minPayout', () => {
      it('Should not call PayeeTransaction.prototype.save', async () => {
        // Arrange
        payee.minPayout = randomInt();
        PayeeController.balanceAtDate.resolves(payee.minPayout - 50);
        // Act
        await PayeeBalanceTax.setTax({ payee, period });
        // Assert
        expect(PayeeTransaction.prototype.save.called).to.be.false;
      });
    });
    describe('When Payee Closing Balance is above Payee.minPayout', () => {
      it('Should call PayeeTransaction.prototype.save', async () => {
        // Arrange
        payee.minPayout = randomInt();
        PayeeController.balanceAtDate.resolves(payee.minPayout + 50);
        // Act
        await PayeeBalanceTax.setTax({ payee, period });
        // Assert
        expect(PayeeTransaction.prototype.save.called).to.be.true;
      });
      it('Should call PayeeTransaction.prototype.save with the correct parameters', async () => {
        // Arrange
        payee.minPayout = randomInt();
        // First Call Resolves 100
        PayeeController.balanceAtDate.resolves(100);
        // Second Call Resolves 150
        PayeeController.balanceAtDate.onSecondCall().resolves(150);

        const taxBasis = 150 - 100;
        const taxAmount = taxBasis * (payee.selfBillingTaxRate / 100);

        // Act
        await PayeeBalanceTax.setTax({ payee, period });
        // Assert
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.type).to.equal('Tax');
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.userCreated).to.equal(false);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.clientId).to.equal(clientId);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.payeeId).to.equal(payee._id.toString());
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.periodId).to.equal(period._id.toString());
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.amountInPayeeCurrency).to.equal(taxAmount);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.amountInOriginalCurrency).to.equal(taxAmount);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.currency).to.equal(payee.payeeBalanceCurrency);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.originalCurrency).to.equal(payee.payeeBalanceCurrency);
        expect(moment.utc(PayeeTransaction.prototype.save.firstCall.thisValue.date).format()).to.equal(moment.utc(period.endDate).format());
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.name).to.equal(`${payee.name} - ${period.name} Tax (${payee.selfBillingTaxRate}%)`);
      });
      describe('When isWithholding is true', () => {
        it('Should call PayeeTransaction.prototype.save with the correct parameters', async () => {
          // Arrange
          payee.withholdingTaxRate = randomInt();
          // First Call Resolves 100
          PayeeController.balanceAtDate.resolves(100);
          // Second Call Resolves 150
          PayeeController.balanceAtDate.onSecondCall().resolves(150);

          const taxBasis = 150 - 100;
          const taxAmount = taxBasis * (payee.withholdingTaxRate / 100);

          // Act
          await PayeeBalanceTax.setTax({ payee, period, isWithholding: true });
          // Assert
          expect(PayeeTransaction.prototype.save.firstCall.thisValue.amountInPayeeCurrency).to.equal(-taxAmount);
          expect(PayeeTransaction.prototype.save.firstCall.thisValue.amountInOriginalCurrency).to.equal(-taxAmount);
          expect(PayeeTransaction.prototype.save.firstCall.thisValue.name).to.equal(`${payee.name} - ${period.name} Withholding Tax (${payee.withholdingTaxRate}%)`);
        });
      });
    });
    describe('When Payee Closing Balance is equal to Payee.minPayout', () => {
      it('Should call PayeeTransaction.prototype.save', async () => {
        // Arrange
        payee.minPayout = randomInt();
        PayeeController.balanceAtDate.resolves(payee.minPayout);
        // Act
        await PayeeBalanceTax.setTax({ payee, period });
        // Assert
        expect(PayeeTransaction.prototype.save.called).to.be.true;
      });
    });
  });
});
