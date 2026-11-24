const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/payeeBalances/helpers.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

// Models
const Period = require('../../../../../models/period');
const Transaction = require('../../../../../models/transaction');
const PayeeTransaction = require('../../../../../models/payeeTransaction');

describe('PayeeBalanceHelpers Unit Tests', () => {
  let PayeeBalanceHelpers;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PayeeBalanceHelpers = rewire('../../../../../libs/calculation/payeeBalances/libs/helpers.js');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#createTransactions', () => {
    let clientId; let period; let payee; let params; let toCurrency; let fromCurrency; let homeCurrency; let contractCurrency;
    beforeEach((done) => {
      // Variables
      clientId = randomId();
      toCurrency = randomString();
      fromCurrency = randomString();
      homeCurrency = randomString();
      contractCurrency = randomString();

      period = {
        clientId,
        _id: randomId(),
        endDate: new Date(),
        currencyExchangeRates: [{ from: fromCurrency, to: toCurrency, rate: 0.5 }],
      };

      payee = { clientId, _id: randomId(), minPayout: 0, payeeBalanceCurrency: randomString(), name: randomString() };

      // Function Parameters
      params = {
        period,
        payee,
        contract: { _id: randomId(), clientId, name: randomString(), payees: [{ payeeId: randomId() }] },
        statement: { _id: randomId() },
        payeeBalance: randomInt(),
        contractCurrency,
        homeCurrency,
        endDate: new Date(),
        clientType: randomString(),
        closingBalance: randomInt(),
      };

      // Stubs
      sinon.stub(Transaction.prototype, 'save').resolves({});
      sinon.stub(PayeeTransaction.prototype, 'save').resolves({});
      sinon.stub(PayeeBalanceHelpers, 'addMissingCurrencyNote').resolves({});

      done();
    });
    it('should call PayeeBalanceHelpers.currencyConversion', async () => {
      // Arrange
      sinon.stub(PayeeBalanceHelpers, 'currencyConversion').returns(0);
      // Act
      await PayeeBalanceHelpers.createTransactions(params);
      // Assert
      expect(PayeeBalanceHelpers.currencyConversion.called).to.be.true;
    });
    describe('When Currency is not found', () => {
      it('should call PayeeBalanceHelpers.addMissingCurrencyNote', async () => {
        // Act
        await PayeeBalanceHelpers.createTransactions(params);
        // Assert
        expect(PayeeBalanceHelpers.addMissingCurrencyNote.calledOnce).to.equal(true);
      });
    });
    describe('When Currency is found', () => {
      it('should create a new PayeeTransaction', async () => {
        // Act
        await PayeeBalanceHelpers.createTransactions({ ...params, contractCurrency: payee.payeeBalanceCurrency });
        // Assert
        expect(PayeeTransaction.prototype.save.calledOnce).to.equal(true);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.clientId).to.equal(clientId);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.payeeId).to.equal(payee._id.toString());
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.name).to.equal(`${params.contract.name} - ${period.name}`);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.amountInPayeeCurrency).to.equal(Math.round(params.payeeBalance * 100) / 100);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.amountInOriginalCurrency).to.equal(Math.round(params.payeeBalance * 100) / 100);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.date).to.equal(params.endDate);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.statementId).to.equal(params.statement._id.toString());
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.periodId).to.equal(period._id.toString());
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.userCreated).to.equal(false);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.published).to.equal(false);
        expect(PayeeTransaction.prototype.save.firstCall.thisValue.type).to.equal('Period Transfer');
      });
      it('should create a new Transaction', async () => {
        // Act
        await PayeeBalanceHelpers.createTransactions({ ...params, contractCurrency: payee.payeeBalanceCurrency });
        // Assert
        expect(Transaction.prototype.save.calledOnce).to.equal(true);
      });
      describe('When isAdvance is true', () => {
        it('should set Payee Transaction type to "Advance"', async () => {
          // Act
          await PayeeBalanceHelpers.createTransactions({ ...params, contractCurrency: payee.payeeBalanceCurrency, isAdvance: true });
          // Assert
          expect(PayeeTransaction.prototype.save.firstCall.thisValue.type).to.equal('Advance');
        });
        it('should set transactionHeader to "Advance Payee Transfer"', async () => {
          // Arrange
          const transaction = {
            clientId,
            contractId: params.contract._id,
            statementId: params.statement._id.toString(),
            name: `Advance Payee Transfer: ${payee.name}`,
            payeeId: payee._id.toString(),
            date: params.endDate,
            amount: 0 - params.payeeBalance,
            userCreated: false,
          };

          // Act
          await PayeeBalanceHelpers.createTransactions({ ...params, contractCurrency: payee.payeeBalanceCurrency, isAdvance: true });
          const savedTransaction = { ...Transaction.prototype.save.firstCall.thisValue.toObject() };
          delete savedTransaction._id;

          // Assert
          expect(savedTransaction).to.deep.equal(transaction);
        });
      });
    });
  });
  describe('#currencyConversion', () => {
    let amount; let fromCurrency; let toCurrency; let period; let homeCurrency;
    beforeEach((done) => {
      // Variables
      amount = randomInt();
      fromCurrency = randomString();
      toCurrency = randomString();
      homeCurrency = randomString();
      period = {
        currencyExchangeRates: [{ from: fromCurrency, to: toCurrency, rate: randomFloat() }],
      };
      done();
    });
    describe('When fromCurrency is equal to toCurrency', () => {
      it('should return the amount', (done) => {
        // Act
        const result = PayeeBalanceHelpers.currencyConversion({ amount, fromCurrency, toCurrency: fromCurrency, period, homeCurrency });
        // Assert
        expect(result).to.equal(amount);
        done();
      });
    });
    describe('When fromCurrency is not equal to toCurrency', () => {
      it('should return the converted amount', (done) => {
        // Arrange
        const convertedAmount = amount * period.currencyExchangeRates[0].rate;
        // Act
        const result = PayeeBalanceHelpers.currencyConversion({ amount, fromCurrency, toCurrency, period, homeCurrency });
        // Assert
        expect(result).to.equal(convertedAmount);
        done();
      });
    });
    describe('When currency is not found', () => {
      it('should return null', (done) => {
        // Arrange
        period.currencyExchangeRates = [];
        // Act
        const result = PayeeBalanceHelpers.currencyConversion({ amount, fromCurrency, toCurrency, period, homeCurrency });
        // Assert
        expect(result).to.equal(null);
        done();
      });
    });
  });
  describe('#addMissingCurrencyNote', () => {
    let payee; let period;
    beforeEach((done) => {
      // Variables
      payee = { clientId: randomId(), _id: randomId(), name: randomString() };
      period = { _id: randomId(), clientId: payee.clientId };
      // Stubs
      sinon.stub(Period, 'findByIdAndUpdate').resolves({});
      done();
    });
    it('should call Period.findByIdAndUpdate', async () => {
      // Act
      await PayeeBalanceHelpers.addMissingCurrencyNote({ payee, period });
      // Assert
      expect(Period.findByIdAndUpdate.calledOnce).to.equal(true);
    });
    it('should call Period.findByIdAndUpdate with correct parameters', async () => {
      // Act
      await PayeeBalanceHelpers.addMissingCurrencyNote({ payee, period });
      // Assert
      expect(Period.findByIdAndUpdate.firstCall.args[0]).to.equal(period._id);
      expect(Period.findByIdAndUpdate.firstCall.args[1]).to.deep.equal({ $push: { calculationNotes: { type: 'Missing Currency', message: 'No Payee Balance Transaction Currency Set. Please check if there is a currency for this payee and if there is an exchange rate set against the period', runNo: period.runNo, documentType: 'Payee', documentId: payee._id.toString(), documentName: payee.name } } });
      expect(Period.findByIdAndUpdate.firstCall.args[2]).to.deep.equal({ safe: true, upsert: true });
    });
  });
});
// TODO to write distribution tests once matthias has finalized the edge cases
