const { ExchangeRateLib } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const ExchangeRate = require('../../models/exchangeRate');
const Client = require('../../models/client');
const ExchangeRatesController = require('./exchangeRates');

describe('PayeeController', () => {
  let clientId;
  let mockGetHistoricalExchangeRates;

  beforeEach(() => {
    mockGetHistoricalExchangeRates = jest.spyOn(ExchangeRateLib, 'getHistoricalExchangeRates');
    clientId = randomId();
  });

  describe('getHistoricalExchangeRates', () => {
    it('should return the reciprocal exchange rate', async () => {
      // Arrange
      mockGetHistoricalExchangeRates.mockResolvedValue([
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
      expect(exchangeRates).toEqual([
        { currencyCode: 'YEN', rate: 0.01 },
        { currencyCode: 'GBP', rate: 0.1 },
        { currencyCode: 'USD', rate: 1 },
        { currencyCode: 'NDD', rate: 10 },
      ]);
    });

    it('should return zero if the rate was not retrieved, is invalid or zero (breaks the calculation)', async () => {
      // Arrange
      mockGetHistoricalExchangeRates.mockResolvedValue([
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
      expect(exchangeRates).toEqual([
        { currencyCode: 'NTD', rate: null },
        { currencyCode: 'NTA', rate: null },
      ]);
    });
  });
});
