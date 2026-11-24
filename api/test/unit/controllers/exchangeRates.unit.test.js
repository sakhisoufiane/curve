process.env.NODE_ENV = 'test';

const { logger, ExchangeRateLib } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const { randomString, randomId, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const { expect } = require('chai');

const ExchangeRate = require('../../../models/exchangeRate');
const Client = require('../../../models/client');
const ExchangeRatesController = require('../../../controllers/exchangeRates');

// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('PayeeController', () => {
  let clientId;

  beforeEach(() => {
    sinon.restore();
    sinon.stub(ExchangeRateLib, 'getHistoricalExchangeRates');
    clientId = randomId();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getHistoricalExchangeRates', () => {
    it('should return the reciprocal exchange rate', async () => {
      // Arrange
      ExchangeRateLib.getHistoricalExchangeRates.resolves([
        { currencyCode: 'YEN', rate: 100 },
        { currencyCode: 'GBP', rate: 10 },
        { currencyCode: 'USD', rate: 1 },
        { currencyCode: 'NDD', rate: 0.1 },
      ]);
      // Act
      const exchangeRates = await ExchangeRatesController.getHistoricalExchangeRates({
        curveUser: { clientId },
        Client,
        ExchangeRate,
        date: '2024-10-01',
        currencyCodes: ['YEN', 'GBP'],
      });
      // Assert
      expect(exchangeRates).to.eql([
        { currencyCode: 'YEN', rate: 0.01 },
        { currencyCode: 'GBP', rate: 0.1 },
        { currencyCode: 'USD', rate: 1 },
        { currencyCode: 'NDD', rate: 10 },
      ]);
    });

    it('should return zero if the rate was not retrieved, is invalid or zero (breaks the calculation)', async () => {
      // Arrange
      ExchangeRateLib.getHistoricalExchangeRates.resolves([
        { currencyCode: 'NTD', rate: null },
        { currencyCode: 'NTA', rate: undefined },
      ]);
      // Act
      const exchangeRates = await ExchangeRatesController.getHistoricalExchangeRates({
        curveUser: { clientId },
        Client,
        ExchangeRate,
        date: '2024-10-01',
        currencyCodes: ['NTD', 'NTA'],
      });
      // Assert
      expect(exchangeRates).to.eql([
        { currencyCode: 'NTD', rate: null },
        { currencyCode: 'NTA', rate: null },
      ]);
    });
  });
});
