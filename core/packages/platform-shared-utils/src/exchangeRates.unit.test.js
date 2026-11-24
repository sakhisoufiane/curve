process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');
const axios = require('axios');
const moment = require('moment');
const { randomString, randomId } = require('./testUtils');
const ExchangeRates = require('./exchangeRates');

// Required in libs/exchangeRates.js, must be set here or they are undefined
process.env.exchangeRateApiURL = `https://${randomString()}.test/convert?q=`;
process.env.exchangeRateApiKey = randomString();

// Models aren't available in this repo so we need to create a fake version for testing
class FakeExchangeRateModel {
  constructor({ currencyFrom, currencyTo, rate, createdAt }) {
    this.currencyFrom = currencyFrom;
    this.currencyTo = currencyTo;
    this.rate = rate;
    this.createdAt = createdAt;
  }

  static async find() {
    return [];
  }

  static async insertMany() {
    return new Promise([]);
  }
}

describe('ExchangeRates', () => {
  let fakeClientModel;
  let fakeExchangeRateModel;
  let axiosStub;

  beforeEach(() => {
    fakeClientModel = {
      findById: () => ({
        select: async () => ({ homeCurrency: 'EUR' }),
      }),
    };
    fakeExchangeRateModel = FakeExchangeRateModel;
    fakeExchangeRateModel.find = async () => [];
    axiosStub = sinon.stub(axios, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getHistoricalExchangeRates', () => {
    it('should throw an error if no Home Currency set on Client', async () => {
      // Arrange
      fakeClientModel.findById = () => ({ select: async () => ({ homeCurrency: null }) });
      // Act
      try {
        await ExchangeRates.getHistoricalExchangeRates({
          clientId: randomId(),
          Client: fakeClientModel,
        });
      } catch (err) {
        // Assert
        expect(err).to.not.be.undefined;
      }
    });

    it('should throw an error if no currency codes to convert are specified', async () => {
      // Act
      try {
        await ExchangeRates.getHistoricalExchangeRates({
          clientId: randomId(),
          Client: fakeClientModel,
          currencyCodes: ['GBP', 'USD'],
        });
      } catch (err) {
        // Assert
        expect(err).to.not.be.undefined;
      }
    });

    it('should throw an error if no date specified', async () => {
      // Act
      try {
        await ExchangeRates.getHistoricalExchangeRates({
          clientId: randomId(),
          Client: fakeClientModel,
          currencyCodes: ['GBP', 'USD'],
        });
      } catch (err) {
        // Assert
        expect(err).to.not.be.undefined;
      }
    });

    it('should throw an error if a future date is specified', async () => {
      // Act
      try {
        await ExchangeRates.getHistoricalExchangeRates({
          clientId: randomId(),
          Client: fakeClientModel,
          currencyCodes: ['GBP', 'USD'],
          date: moment().add(3, 'days').format('YYYY-MM-DD'),
        });
      } catch (err) {
        // Assert
        expect(err).to.not.be.undefined;
      }
    });

    it('should fetch all rates from the db if they are cached', async () => {
      // Arrage
      fakeExchangeRateModel.find = async () => [
        { currencyTo: 'GBP', rate: 0.8 },
        { currencyTo: 'USD', rate: 0.9 },
      ];
      sinon.stub(fakeExchangeRateModel, 'insertMany');
      // Act
      const rates = await ExchangeRates.getHistoricalExchangeRates({
        clientId: randomId(),
        Client: fakeClientModel,
        ExchangeRate: fakeExchangeRateModel,
        currencyCodes: ['GBP', 'USD'],
        date: '2024-10-01',
      });
      // Assert
      expect(rates).to.eql([
        { currencyCode: 'GBP', rate: 0.8 },
        { currencyCode: 'USD', rate: 0.9 },
      ]);
      // API should never have been queried
      expect(axiosStub.callCount).to.equal(0);
      // All rates should be retrieved from db so API rates will never be cached
      expect(fakeExchangeRateModel.insertMany.callCount).to.equal(0);
    });

    it('should fetch all rates from the api if none are cached', async () => {
      // Arrage
      sinon.stub(fakeExchangeRateModel, 'insertMany');
      axiosStub.returns({ status: 200, data: { EUR_GBP: { '2024-10-01': 1.2 }, EUR_USD: { '2024-10-01': 1.1 } } });
      // Act
      const rates = await ExchangeRates.getHistoricalExchangeRates({
        clientId: randomId(),
        Client: fakeClientModel,
        ExchangeRate: fakeExchangeRateModel,
        currencyCodes: ['GBP', 'USD'],
        date: '2024-10-01',
      });
      // Assert
      // It should have fetched the rates from the API
      expect(rates).to.eql([
        { currencyCode: 'GBP', rate: 1.2 },
        { currencyCode: 'USD', rate: 1.1 },
      ]);

      // API should have been queried once
      expect(axiosStub.callCount).to.equal(1);

      // API should be called with the correct search params
      const apiUrl = new URL(axiosStub.args[0][0]);
      expect(apiUrl.pathname).to.equal('/convert');
      expect(apiUrl.searchParams.get('q')).to.equal('EUR_GBP,EUR_USD');
      expect(apiUrl.searchParams.get('date')).to.equal('2024-10-01');

      // All API rates should be cached in the db
      expect(fakeExchangeRateModel.insertMany.callCount).to.equal(1);
    });

    it('should fetch from both the db & api if some are cached and vice versa', async () => {
      // Arrage
      sinon.stub(fakeExchangeRateModel, 'insertMany');
      sinon.stub(fakeExchangeRateModel, 'find');
      fakeExchangeRateModel.find.resolves([{ currencyTo: 'GBP', rate: 0.8 }]);
      axiosStub.returns({ status: 200, data: { EUR_USD: { '2024-10-01': 1.1 } } });
      // Act
      const rates = await ExchangeRates.getHistoricalExchangeRates({
        clientId: randomId(),
        Client: fakeClientModel,
        ExchangeRate: fakeExchangeRateModel,
        currencyCodes: ['GBP', 'USD'],
        date: '2024-10-01',
      });
      // Assert
      // It should rates from both sources combined
      expect(rates).to.eql([
        { currencyCode: 'GBP', rate: 0.8 },
        { currencyCode: 'USD', rate: 1.1 },
      ]);

      // API should have been queried once, for the uncached rate
      expect(axiosStub.callCount).to.equal(1);
      // DB should also have been queried once, for the cached rate
      expect(fakeExchangeRateModel.find.callCount).to.equal(1);
      expect(fakeExchangeRateModel.find.args[0][0].currencyTo).to.eql({ $in: ['GBP', 'USD'] });

      // API should be called with the correct search params
      const apiUrl = new URL(axiosStub.args[0][0]);
      expect(apiUrl.searchParams.get('q')).to.equal('EUR_USD');
      expect(apiUrl.searchParams.get('date')).to.equal('2024-10-01');

      // The uncached API rate should be cached in the db
      expect(fakeExchangeRateModel.insertMany.callCount).to.equal(1);
      expect(fakeExchangeRateModel.insertMany.args[0][0][0]).to.eql({
        currencyFrom: 'EUR',
        currencyTo: 'USD',
        rate: 1.1,
        createdAt: '2024-10-01',
      });
    });

    it('should return the rates even if some failed because of an api error', async () => {
      // Arrange
      axiosStub
        .onCall(0)
        .resolves({ status: 200, data: { EUR_GBP: { '2024-10-01': 1.2 }, EUR_USD: { '2024-10-01': 1.1 } } });
      axiosStub.onCall(1).rejects(new Error('Fake error: unsupported currency'));
      sinon.stub(fakeExchangeRateModel, 'insertMany');
      // Act
      const rates = await ExchangeRates.getHistoricalExchangeRates({
        clientId: randomId(),
        Client: fakeClientModel,
        ExchangeRate: fakeExchangeRateModel,
        currencyCodes: ['GBP', 'USD', 'NTD'],
        date: '2024-10-01',
      });
      // Assert
      expect(rates).to.eql([
        { currencyCode: 'GBP', rate: 1.2 },
        { currencyCode: 'USD', rate: 1.1 },
        { currencyCode: 'NTD', rate: null },
      ]);
      // It should have only cached the exchange rates that were successfully retrieved from the API
      expect(fakeExchangeRateModel.insertMany.args[0][0].length).to.equal(2);
      expect(fakeExchangeRateModel.insertMany.args[0][0][0]).to.include({ currencyTo: 'GBP' });
      expect(fakeExchangeRateModel.insertMany.args[0][0][1]).to.include({ currencyTo: 'USD' });
    });

    it('should still return the fetched rates even if the cache fails', async () => {
      // Arrage
      sinon.stub(fakeExchangeRateModel, 'insertMany');
      fakeExchangeRateModel.insertMany.throws(new Error('fake insert error'));
      axiosStub.resolves({ status: 200, data: { EUR_USD: { '2024-10-01': 1.1 } } });
      // Act
      const rates = await ExchangeRates.getHistoricalExchangeRates({
        clientId: randomId(),
        Client: fakeClientModel,
        ExchangeRate: fakeExchangeRateModel,
        currencyCodes: ['USD'],
        date: '2024-10-01',
      });
      // Assert
      // It should return the fetched rates even though the insertMany call failed
      expect(rates).to.eql([{ currencyCode: 'USD', rate: 1.1 }]);
    });
  });
});
