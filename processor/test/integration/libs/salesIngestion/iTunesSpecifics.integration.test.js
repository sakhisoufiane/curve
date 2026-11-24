process.env.NODE_ENV = 'test';
const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const AppSettings = require('../../../../models/appSettings');

const iTunesSpecifics = rewire('../../../../libs/salesIngestion/iTunesSpecifics');

logger.debug('\n\n**** ./test/integration/libs/salesIngestion/iTunesSpecifics.integration.test.js');

describe('iTunesSpecifics Integration Tests', () => {
  let csvData;

  before(() => {
    csvData = [
      ['iTunes Connect - Payments and Financial Reports\t(March, 2024)'],
      [],
      ['Country or Region (Currency)', 'Units Sold', 'Earned', 'Pre-Tax Subtotal', 'Input Tax', 'Adjustments', 'Withholding Tax', 'Total Owed', 'Exchange Rate', 'Proceeds', 'Bank Account Currency'],
      ['United Arab Emirates (AED)', '1', '11.06', '11.06', '0', '33.34', '0', '44.40', '0.25450', '11.30', 'EUR'],
      ['Australia (AUD)', '46', '89.74', '89.74', '0', '257.95', '-34.60', '313.09', '0.60117', '188.22', 'EUR'],
      ['Bulgaria (BGN)', '0', '0.03', '0.03', '0', '6.71', '0', '6.74', '0.51187', '3.45', 'EUR'],
      ['Brazil (BRL)', '9', '31.37', '31.37', '0', '0', '120.46', '151.83', '0.17829', '27.07', 'EUR'],
      ['Canada (CAD)', '66', '77.15', '77.15', '0', '216.42', '-54.11', '239.46', '0.68061', '162.98', 'EUR'],
      ['Switzerland (CHF)', '29', '63.24', '63.24', '0', '99.17', '0', '162.41', '1.03042', '167.35', 'EUR'],
      ['Chile (CLP)', '4', '1418.00', '1418.00', '0', '8863.00', '0', '10281.00', '0.00097', '9.94', 'EUR'],
      ['China mainland (CNY)', '0', '0.00', '0.00', '0', '91.61', '0', '91.61', '0.12903', '11.82', 'EUR'],
      ['Colombia (COP)', '1', '5872.00', '5872.00', '0', '37134.57', '0', '43006.57', '0.00024', '10.28', 'EUR'],
      ['Czech Republic (CZK)', '3', '54.24', '54.24', '0', '907.66', '0', '961.90', '0.03960', '38.09', 'EUR'],
      ['Denmark (DKK)', '21', '168.54', '168.54', '0', '229.05', '0', '397.59', '0.13373', '53.17', 'EUR'],
      ['Egypt (EGP)', '1', '2.43', '2.43', '0', '26.54', '0', '28.97', '0.01968', '0.57', 'EUR'],
      ['Euro-Zone (EUR)', '948', '961.80', '961.80', '0', '1984.85', '0', '2946.65', '1.00000', '2946.65', 'EUR'],
      ['United Kingdom (GBP)', '435', '365.08', '365.08', '0', '1566.80', '0', '1931.88', '1.16581', '2252.21', 'EUR'],
    ];
  });

  beforeEach(() => {
    sinon.stub(iTunesSpecifics, 'readFile').callsFake((localFile, callback) => {
      const monthAndYear = csvData[0][0].split('(')[1].slice(0, -1);
      const data = csvData.slice(2);
      callback(null, { data, monthAndYear });
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should calculate exchange rates correctly using alternate calculation if month is in appleSalesAltCalculationMonths', async () => {
    const localFile = 'dummy_path';
    const exchangeRates = [];
    sinon.stub(AppSettings, 'findOne').resolves({
      appleSalesAltCalculationMonths: ['March, 2024'],
    });

    const { err, result, bankAccountCurrencies } = await new Promise((resolve, reject) => {
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, (err, result, bankAccountCurrencies) => {
        if (err) {
          reject(err);
        } else {
          resolve({ err, result, bankAccountCurrencies });
        }
      });
    });

    expect(err).to.not.exist;
    expect(result).to.exist;
    expect(bankAccountCurrencies).to.exist;

    // Test cases for alternate calculation: Proceeds / (Total Owed - Withholding Tax)
    expect(result.AED).to.be.closeTo(11.30 / (44.40 - 0), 0.0001);
    expect(result.AUD).to.be.closeTo(188.22 / (313.09 + 34.60), 0.0001);
    expect(result.BGN).to.be.closeTo(3.45 / (6.74 - 0), 0.0001);
    expect(result.BRL).to.be.closeTo(27.07 / (151.83), 0.0001);
    expect(result.CAD).to.be.closeTo(162.98 / (239.46 + 54.11), 0.0001);
    expect(result.CHF).to.be.closeTo(167.35 / (162.41 - 0), 0.0001);
    expect(result.CLP).to.be.closeTo(9.94 / (10281.00 - 0), 0.0001);
    expect(result.CNY).to.be.closeTo(11.82 / (91.61 - 0), 0.0001);
    expect(result.COP).to.be.closeTo(10.28 / (43006.57 - 0), 0.0001);
    expect(result.CZK).to.be.closeTo(38.09 / (961.90 - 0), 0.0001);
    expect(result.DKK).to.be.closeTo(53.17 / (397.59 - 0), 0.0001);
    expect(result.EGP).to.be.closeTo(0.57 / (28.97 - 0), 0.0001);
    expect(result.EUR).to.be.closeTo(2946.65 / (2946.65 - 0), 0.0001);
    expect(result.GBP).to.be.closeTo(2252.21 / (1931.88 - 0), 0.0001);

    // Verify that all exchange rates are calculated
    expect(Object.keys(result).length).to.equal(csvData.length - 3);

    // Verify that all bank account currencies are EUR
    expect(bankAccountCurrencies.every((currency) => currency === 'EUR')).to.be.true;
  });

  it('should calculate exchange rates correctly using standard calculation if month is not in appleSalesAltCalculationMonths', async () => {
    const localFile = 'dummy_path';
    const exchangeRates = [];
    sinon.stub(AppSettings, 'findOne').resolves({
      appleSalesAltCalculationMonths: [],
    });

    const { err, result, bankAccountCurrencies } = await new Promise((resolve, reject) => {
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, (err, result, bankAccountCurrencies) => {
        if (err) {
          reject(err);
        } else {
          resolve({ err, result, bankAccountCurrencies });
        }
      });
    });

    expect(err).to.not.exist;
    expect(result).to.exist;
    expect(bankAccountCurrencies).to.exist;

    // Test cases for standard calculation: Proceeds / Pre-Tax Subtotal
    expect(result.AED).to.be.closeTo(11.30 / 11.06, 0.0001);
    expect(result.AUD).to.be.closeTo(188.22 / 89.74, 0.0001);
    expect(result.BGN).to.be.closeTo(3.45 / 0.03, 0.0001);
    expect(result.BRL).to.be.closeTo(27.07 / 31.37, 0.0001);
    expect(result.CAD).to.be.closeTo(162.98 / 77.15, 0.0001);
    expect(result.CHF).to.be.closeTo(167.35 / 63.24, 0.0001);
    expect(result.CLP).to.be.closeTo(9.94 / 1418.00, 0.0001);
    expect(result.COP).to.be.closeTo(10.28 / 5872.00, 0.0001);
    expect(result.CZK).to.be.closeTo(38.09 / 54.24, 0.0001);
    expect(result.DKK).to.be.closeTo(53.17 / 168.54, 0.0001);
    expect(result.EGP).to.be.closeTo(0.57 / 2.43, 0.0001);
    expect(result.EUR).to.be.closeTo(2946.65 / 961.80, 0.0001);
    expect(result.GBP).to.be.closeTo(2252.21 / 365.08, 0.0001);

    // Verify that all exchange rates are calculated
    expect(Object.keys(result).length).to.equal(csvData.length - 3);

    // Verify that all bank account currencies are EUR
    expect(bankAccountCurrencies.every((currency) => currency === 'EUR')).to.be.true;
  });
});
