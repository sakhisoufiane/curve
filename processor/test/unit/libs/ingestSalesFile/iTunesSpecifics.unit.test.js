process.env.NODE_ENV = 'test';

const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const AppSettings = require('../../../../models/appSettings');

logger.debug('\n\n**** ./test/unit/libs/ingestSalesFile/iTunesSpecifics.unit.test.js');

describe('iTunesSpecifics Unit Tests', () => {
  let iTunesSpecifics;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    iTunesSpecifics = rewire('../../../../libs/salesIngestion/iTunesSpecifics');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('iTunesSpecifics.getExchangeRates', () => {
    // Arrange
    const localFile = testUtils.randomString();
    let exchangeRates;

    beforeEach((done) => {
      exchangeRates = testUtils.randomArray();
      sinon.stub(iTunesSpecifics, 'prepareExchangeRates').returns({});
      sinon.stub(iTunesSpecifics, 'readFile').yields();
      sinon.stub(AppSettings, 'findOne').resolves({ appleSalesAltCalculationMonths: [] });
      sinon.stub(iTunesSpecifics, 'getCurrency');
      done();
    });

    it('should call iTunesSpecifics.prepareExchangeRates with the correct attributes', (done) => {
      // Act
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, () => {
        expect(iTunesSpecifics.prepareExchangeRates.calledOnce).to.be.true;
        expect(iTunesSpecifics.prepareExchangeRates.calledWith(exchangeRates)).to.be.true;
        done();
      });
    });

    it('should call iTunesSpecifics.readFile with the correct attributes', (done) => {
      // Act
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, () => {
        expect(iTunesSpecifics.readFile.calledOnce).to.be.true;
        expect(iTunesSpecifics.readFile.calledWith(localFile)).to.be.true;
        done();
      });
    });

    it('should call AppSettings.findOne', (done) => {
      const data = [
        testUtils.randomArray(3),
        testUtils.randomArray(3),
        testUtils.randomArray(3),
      ];
      iTunesSpecifics.readFile.yields(null, { data });

      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, () => {
        expect(AppSettings.findOne.calledOnce).to.be.true;
        done();
      });
    });

    it('should throw an error if no AppSettings found', (done) => {
      const data = [
        testUtils.randomArray(3),
        testUtils.randomArray(3),
        testUtils.randomArray(3),
      ];
      AppSettings.findOne.rejects();
      iTunesSpecifics.readFile.yields(null, { data });

      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, (err) => {
        expect(AppSettings.findOne.calledOnce).to.be.true;
        expect(err.message).to.eq('Failed to load AppSettings.');
        done();
      });
    });

    it('should throw error if readFile fails', (done) => {
      // Arrange
      const stubError = testUtils.randomString();
      iTunesSpecifics.readFile.yields(stubError);
      // Act
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, (err) => {
        // Assert
        const expectedError = 'There was an error reading the financial file. Please check the attached financial file is valid.';
        expect(err).to.exist;
        expect(err.message).to.eq(expectedError);
        done();
      });
    });

    it('should throw error if no data returned by readFile', (done) => {
      // Arrange
      const data = undefined;
      iTunesSpecifics.readFile.yields(null, data);
      // Act
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, (err) => {
        // Assert
        const expectedError = 'No data contained in financial file. Please check the attached financial file is valid.';
        expect(err).to.exist;
        expect(err.message).to.eq(expectedError);
        done();
      });
    });

    it('should throw error if empty data array returned by readFile', (done) => {
      // Arrange
      const data = [];
      iTunesSpecifics.readFile.yields(null, data);
      // Act
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, (err) => {
        // Assert
        const expectedError = 'No data contained in financial file. Please check the attached financial file is valid.';
        expect(err).to.exist;
        expect(err.message).to.eq(expectedError);
        done();
      });
    });

    it('should call iTunesSpecifics.getCurrency with the correct attributes for each data line', (done) => {
      // Arrange
      const data = [
        testUtils.randomArray(3),
        testUtils.randomArray(3),
        testUtils.randomArray(3),
      ];
      const dataCopy = [...data]; // copy data as this gets modified in called method
      iTunesSpecifics.readFile.yields(null, { data: dataCopy });
      // Act
      iTunesSpecifics.getExchangeRates(localFile, exchangeRates, () => {
        // Assert
        expect(iTunesSpecifics.getCurrency.calledTwice).to.be.true;
        expect(iTunesSpecifics.getCurrency.firstCall.calledWith(data[1][0])).to.be.true;
        expect(iTunesSpecifics.getCurrency.secondCall.calledWith(data[2][0])).to.be.true;
        done();
      });
    });
    it('should return bankAccountCurrencies at bankAccountIndex (obtained from 1st line), omitting any duplicates and removing any currencies passed via exchangeRates attribute');
    it('should return bankAccountCurrencies with any currencies passed via exchangeRates attribute removed');

    it('should omit lines where 1st column is undefined');
    it('should omit lines where 1st column is null');
    it('should omit lines where 1st column is ""');
    it('should omit lines where 1st column is "Territory (Currency)"');
    it('should omit lines where 1st column is "Country or Region (Currency)"');

    describe('when "Pre-Tax Subtotal" column exists', () => {
      it('should return exchange rate as "Proceeds" divided by "Pre-Tax Subtotal"');
    });
    describe('when "Pre-Tax Subtotal" does NOT exist', () => {
      it('should return exchange rate as "Proceeds" divided by "Earned"');
    });
    describe('when currency at bankAccountIndex exists in exchangeRates object', () => {
      it('should apply this to the calculated exchange rate');
    });
  });

  describe('iTunesSpecifics.readFile', () => {
    // Arrange
    let localFile; let data; let extractData;

    beforeEach((done) => {
      localFile = testUtils.randomString();
      data = testUtils.randomArray(20);

      extractData = sinon.stub().yields(null, null, data);
      iTunesSpecifics.__set__('fileOpener', { extractData });

      done();
    });

    it('should call fileOpener.extractData with the correct attributes', (done) => {
      // Act
      iTunesSpecifics.readFile(localFile, () => {
        expect(extractData.calledWith(localFile)).to.be.true;
        done();
      });
    });
    describe('when an error is returned by fileOpener.extractData', () => {
      it('should return the error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        extractData.yields(expectedError);
        // Act
        iTunesSpecifics.readFile(localFile, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
    it('should remove the first 2 lines from the array returned by FileOpener.extractData and return the remaining lines', (done) => {
      // Arrange
      const dataCopy = [...data]; // copy data as this gets modified in called method
      // Act
      iTunesSpecifics.readFile(localFile, (err, output) => {
        // Assert
        expect(err).to.not.exist;
        expect(output).to.exist;
        const splicedData = dataCopy.slice(2);
        expect(output.data).to.deep.eq(splicedData);
        done();
      });
    });
  });

  describe('iTunesSpecifics.getCurrency', () => {
    describe('when passed "Rest of World (USD)"', () => {
      it('should return "ROW USD"', (done) => {
        // Arrange
        const result = iTunesSpecifics.getCurrency('Rest of World (USD)');
        expect(result).to.eq('ROW USD');
        done();
      });
    });
    describe('when passed "Americas (USD)"', () => {
      it('should return "Americas USD"', (done) => {
        // Arrange
        const result = iTunesSpecifics.getCurrency('Americas (USD)');
        expect(result).to.eq('Americas USD');
        done();
      });
    });
    describe('when passed "Latin America and the Caribbean (USD)"', () => {
      it('should return "Latam Caribbean USD"', (done) => {
        // Arrange
        const result = iTunesSpecifics.getCurrency('Latin America and the Caribbean (USD)');
        expect(result).to.eq('Latam Caribbean USD');
        done();
      });
    });
  });

  describe('iTunesSpecifics.getRevenueTotalsByTerritory', () => {
    it('should return an object of revenue totals assigned to the territory');
    // where properties are taken from the 1st column and their value taken from the 11th column in the supplied array
    // should only use the data rows starting from the line after the one matching "Country Of Sale" (in 1st column) if present
    describe('when passed an array of 5 where the 1st column on line 3 matches "Country Of Sale"', () => {
      it('should return an object with 2 properties', (done) => {
        // Arrange
        const data = [
          testUtils.randomArray(3),
          testUtils.randomArray(3),
          testUtils.randomArray(3),
          testUtils.randomArray(3),
          testUtils.randomArray(3),
        ];
        data[2][0] = 'Country Of Sale';
        // Act
        iTunesSpecifics.getRevenueTotalsByTerritory(data, (err, result) => {
          // Assert
          expect(Object.keys(result).length).to.eq(2);
          done();
        });
      });
    });
    describe('when passed an array of 5 where the 1st column on none of the lines matches "Country Of Sale"', () => {
      it('should return an object with 4 properties', (done) => {
        // Arrange
        const data = [
          testUtils.randomArray(3),
          testUtils.randomArray(3),
          testUtils.randomArray(3),
          testUtils.randomArray(3),
          testUtils.randomArray(3),
        ];
        // Act
        iTunesSpecifics.getRevenueTotalsByTerritory(data, (err, result) => {
          // Assert
          expect(Object.keys(result).length).to.eq(4);
          done();
        });
      });
    });
    describe('when passed an array of 2 where the 1st column on line 2 matches "Country Of Sale"', () => {
      it('should return an empty object', (done) => {
        // Arrange
        const data = [
          testUtils.randomArray(3),
          testUtils.randomArray(3),
        ];
        data[1][0] = 'Country Of Sale';
        // Act
        iTunesSpecifics.getRevenueTotalsByTerritory(data, (err, result) => {
          // Assert
          expect(Object.keys(result).length).to.eq(0);
          done();
        });
      });
    });
  });

  describe('iTunesSpecifics.prepareExchangeRates', () => {
    // should return an object of exchange rates assigned to the currency code for exchange rates to "Home Currency" only
    describe('when passed an array of 2 with the `to` property matching "Home Currency" for both lines', () => {
      it('should return an object with 2 properties', (done) => {
        // Arrange
        const exchangeRates = [
          {
            from: testUtils.randomString(),
            to: 'Home Currency',
            rate: testUtils.randomFloat(),
          },
          {
            from: testUtils.randomString(),
            to: 'Home Currency',
            rate: testUtils.randomFloat(),
          },
        ];
        // Act
        const result = iTunesSpecifics.prepareExchangeRates(exchangeRates);
        // Assert
        expect(Object.keys(result).length).to.eq(2);
        done();
      });
    });
    describe('when passed an array of 2 with the `to` property matching "Home Currency" for only one line', () => {
      it('should return an object with 1 properties', (done) => {
        // Arrange
        const exchangeRates = [
          {
            from: testUtils.randomString(),
            to: 'Home Currency',
            rate: testUtils.randomFloat(),
          },
          {
            from: testUtils.randomString(),
            to: testUtils.randomString(),
            rate: testUtils.randomFloat(),
          },
        ];
        // Act
        const result = iTunesSpecifics.prepareExchangeRates(exchangeRates);
        // Assert
        expect(Object.keys(result).length).to.eq(1);
        done();
      });
    });
    describe('when passed an array of 3 with the `to` property matching "Home Currency" for NONE of the lines', () => {
      it('should return an empty object', (done) => {
        // Arrange
        const exchangeRates = [
          {
            from: testUtils.randomString(),
            to: testUtils.randomString(),
            rate: testUtils.randomFloat(),
          },
          {
            from: testUtils.randomString(),
            to: testUtils.randomString(),
            rate: testUtils.randomFloat(),
          },
          {
            from: testUtils.randomString(),
            to: testUtils.randomString(),
            rate: testUtils.randomFloat(),
          },
        ];
        // Act
        const result = iTunesSpecifics.prepareExchangeRates(exchangeRates);
        // Assert
        expect(Object.keys(result).length).to.eq(0);
        done();
      });
    });
    describe('when passed an empty array', () => {
      it('should return an empty object', (done) => {
        // Arrange
        const exchangeRates = [];
        // Act
        const result = iTunesSpecifics.prepareExchangeRates(exchangeRates);
        // Assert
        expect(Object.keys(result).length).to.eq(0);
        done();
      });
    });
    describe('when the passed array is not defined', () => {
      it('should return an empty object', (done) => {
        // Arrange
        const exchangeRates = undefined;
        // Act
        const result = iTunesSpecifics.prepareExchangeRates(exchangeRates);
        // Assert
        expect(Object.keys(result).length).to.eq(0);
        done();
      });
    });
  });
});
