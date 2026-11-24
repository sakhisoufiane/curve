const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/getTransactionExchangeRateData.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Contract = require('../../../../../models/contract');
const Statement = require('../../../../../models/statement');

describe('ClosingBalance Unit Tests', () => {
  let GetTransactionExchangeRateData;
  let client; let period; let statement; let contract; let contractToCrossTo; let amount;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    GetTransactionExchangeRateData = rewire('../../../../../libs/calculation/statement/getTransactionExchangeRateData');

    client = { _id: randomId() };
    period = { _id: randomId(), year: randomString(), accountingPeriod: randomString(), currencyExchangeRates: [{ to: randomString(), from: randomString(), rate: randomInt() }] };
    contract = { _id: randomId(), name: randomString(), currency: randomString() };
    contractToCrossTo = { _id: randomId(), name: randomString(), currency: randomString() };
    statement = { _id: randomId(), name: randomString(), periodId: period._id, contractId: contract._id };

    amount = randomInt();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('when contract.currency = contractToCrossTo.currency', () => {
    it('should return the original amount', (done) => {
      // Arrange
      contractToCrossTo.currency = contract.currency;
      // Act
      const exchangeRateData = GetTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
      // Assert
      expect(exchangeRateData.amount).to.eq(amount);
      done();
    });

    it('should construct the correct name with long contract names (>=80 characters)', (done) => {
      // Arrange
      contractToCrossTo.currency = contract.currency;
      contract.name = 'A'.repeat(80);
      contractToCrossTo.name = 'B'.repeat(80);
      // Act
      const exchangeRateData = GetTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
      // Assert
      expect(exchangeRateData.name).to.eq(`${period.year} ${period.accountingPeriod} - ${'A'.repeat(80)} to ${'B'.repeat(80)}`);
      done();
    });
  });

  describe('when contract.currency != contractToCrossTo.currency', () => {
    describe('when no exchange rate found', () => {
      it('should return return 0 and add No exchange rate set to the name', (done) => {
        // Arrange
        const expectExchangeRateData = {
          name: `${period.year} ${period.accountingPeriod} - ${contract.name} to ${contractToCrossTo.name}: ${amount.toFixed(2)}${contract.currency} @ 0.00 - No exchange rate set.`,
          amount: 0,
        };
        // Act
        const exchangeRateData = GetTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
        // Assert
        expect(exchangeRateData).to.deep.eq(expectExchangeRateData);
        done();
      });
    });

    describe('when displayCurrency is Home Currency', () => {
      describe('when client.homeCurrency is set', () => {
        it('should set displayCurrency to client.homeCurrency', (done) => {
          // Arrange
          contract.currency = 'Home Currency';
          client.homeCurrency = randomString();
          const expectExchangeRateData = {
            name: `${period.year} ${period.accountingPeriod} - ${contract.name} to ${contractToCrossTo.name}: ${amount.toFixed(2)}${client.homeCurrency} @ 0.00 - No exchange rate set.`,
            amount: 0,
          };
          // Act
          const exchangeRateData = GetTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
          // Assert
          expect(exchangeRateData).to.deep.eq(expectExchangeRateData);
          done();
        });
      });
      describe('when client.homeCurrency is not set', () => {
        it('should set displayCurrency to an empty string', (done) => {
          // Arrange
          contract.currency = 'Home Currency';
          const expectExchangeRateData = {
            name: `${period.year} ${period.accountingPeriod} - ${contract.name} to ${contractToCrossTo.name}: ${amount.toFixed(2)} @ 0.00 - No exchange rate set.`,
            amount: 0,
          };
          // Act
          const exchangeRateData = GetTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
          // Assert
          expect(exchangeRateData).to.deep.eq(expectExchangeRateData);
          done();
        });
      });
    });

    it('should add the display currency to the name', (done) => {
      // Arrange
      const expectExchangeRateData = {
        name: `${period.year} ${period.accountingPeriod} - ${contract.name} to ${contractToCrossTo.name}: ${amount.toFixed(2)}${contract.currency} @ 0.00 - No exchange rate set.`,
        amount: 0,
      };
      // Act
      const exchangeRateData = GetTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
      // Assert
      expect(exchangeRateData).to.deep.eq(expectExchangeRateData);
      done();
    });

    it('should get the correct exchange rate from the period currencyExchangeRates', (done) => {
      // Arrange
      period.currencyExchangeRates[0].to = contractToCrossTo.currency;
      period.currencyExchangeRates[0].from = contract.currency;
      const expectExchangeRateData = {
        name: `${period.year} ${period.accountingPeriod} - ${contract.name} to ${contractToCrossTo.name}: ${amount.toFixed(2)}${contract.currency} @ ${period.currencyExchangeRates[0].rate.toFixed(2)}`,
        amount: period.currencyExchangeRates[0].rate * amount,
      };
      // Act
      const exchangeRateData = GetTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
      // Assert
      expect(exchangeRateData).to.deep.eq(expectExchangeRateData);
      done();
    });
  });
});
