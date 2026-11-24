process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');

const { logger, testUtils, fileOpener } = require('@curveroyaltysystems/platform-shared-utils');

const facebookSpecifics = require('../../../../libs/salesIngestion/facebookSpecifics');

logger.debug('\n\n**** ./test/unit/libs/ingestSalesFile/facebookSpecifics.unit.test.js');

describe('facebookSpecifics Unit Tests', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
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

  describe('facebookSpecifics.getPerProductionRates', () => {
    // Arrange
    const localFile = testUtils.randomString();

    beforeEach((done) => {
      sinon.stub(facebookSpecifics, 'readFile').yields(null);
      done();
    });
    it('should call facebookSpecifics.readFile with the correct attributes', (done) => {
      // Act
      facebookSpecifics.getPerProductionRates(localFile, () => {
        expect(facebookSpecifics.readFile.calledOnce).to.be.true;
        expect(facebookSpecifics.readFile.calledWith(localFile)).to.be.true;
        done();
      });
    });
    describe('when an error is returned by facebookSpecifics.readFile', () => {
      it('should return an error', (done) => {
        // Arrange
        const stubError = testUtils.randomString();
        facebookSpecifics.readFile.yields(stubError);
        // Act
        facebookSpecifics.getPerProductionRates(localFile, (err) => {
          // Assert
          const expectedError = 'There was an error reading the financial file. Please check the attached financial file is valid.';
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when no data is returned by facebookSpecifics.readFile', () => {
      it('should return an error', (done) => {
        // Arrange
        const data = undefined;
        facebookSpecifics.readFile.yields(null, data);
        // Act
        facebookSpecifics.getPerProductionRates(localFile, (err) => {
          // Assert
          const expectedError = 'No data contained in financial file. Please check the attached financial file is valid.';
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when an empty data array is returned by facebookSpecifics.readFile', () => {
      it('should return an error', (done) => {
        // Arrange
        const data = [];
        facebookSpecifics.readFile.yields(null, data);
        // Act
        facebookSpecifics.getPerProductionRates(localFile, (err) => {
          // Assert
          const expectedError = 'No data contained in financial file. Please check the attached financial file is valid.';
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    it('should return an array of objects of { [country]: rate }, where country = value taken from countryIndex (obtained from 1st line) and rate = value taken from rateIndex (obtained from 1st line) for each data line', (done) => {
      // Arrange
      const data = [
        ['row1col1', 'row1col2', 'Country', 'row1col4', 'row1col5', 'Per Production Rate'],
        ['row2col1', 'row2col2', 'row2col3', 'row2col4', 'row2col5', 'row2col6'],
        ['row3col1', 'row3col2', 'row3col3', 'row3col4', 'row3col5', 'row3col6'],
      ];
      const dataCopy = [...data]; // copy data as this gets modified in called method
      facebookSpecifics.readFile.yields(null, dataCopy);
      // Act
      facebookSpecifics.getPerProductionRates(localFile, (err, output) => {
        // Assert
        const expectedOutput = {
          [data[1][2]]: data[1][5],
          [data[2][2]]: data[2][5],
        };
        expect(err).to.not.exist;
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('if a country value is missing', () => {
      it('should skip this row', (done) => {
        const data = [
          ['row1col1', 'row1col2', 'Country', 'row1col4', 'row1col5', 'Per Production Rate'],
          ['row2col1', 'row2col2', null, 'row2col4', 'row2col5', 'row2col6'],
          ['row3col1', 'row3col2', 'row3col3', 'row3col4', 'row3col5', 'row3col6'],
        ];
        const dataCopy = [...data]; // copy data as this gets modified in called method
        facebookSpecifics.readFile.yields(null, dataCopy);
        // Act
        facebookSpecifics.getPerProductionRates(localFile, (err, output) => {
          // Assert
          const expectedOutput = {
            [data[2][2]]: data[2][5],
          };
          expect(err).to.not.exist;
          expect(output).to.deep.eq(expectedOutput);
          done();
        });
      });
    });
    describe('if a rate value is missing', () => {
      it('should set the country property to undefined on that row', (done) => {
        const data = [
          ['row1col1', 'row1col2', 'Country', 'row1col4', 'row1col5', 'Per Production Rate'],
          ['row2col1', 'row2col2', 'row2col3', 'row2col4', 'row2col5'],
          ['row3col1', 'row3col2', 'row3col3', 'row3col4', 'row3col5', 'row3col6'],
        ];
        const dataCopy = [...data]; // copy data as this gets modified in called method
        facebookSpecifics.readFile.yields(null, dataCopy);
        // Act
        facebookSpecifics.getPerProductionRates(localFile, (err, output) => {
          // Assert
          const expectedOutput = {
            [data[1][2]]: undefined,
            [data[2][2]]: data[2][5],
          };
          expect(err).to.not.exist;
          expect(output).to.deep.eq(expectedOutput);
          done();
        });
      });
    });
  });

  describe('facebookSpecifics.readFile', () => {
    // Arrange
    const localFile = testUtils.randomString();
    let data;

    beforeEach((done) => {
      data = testUtils.randomArray(20);
      sinon.stub(fileOpener, 'extractData').yields(null, null, data);
      done();
    });
    it('should call fileOpener.extractData with the correct attributes', (done) => {
      // Act
      facebookSpecifics.readFile(localFile, () => {
        expect(fileOpener.extractData.calledOnce).to.be.true;
        expect(fileOpener.extractData.calledWith(localFile)).to.be.true;
        done();
      });
    });
    describe('when an error is returned by fileOpener.extractData', () => {
      it('should return the error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        fileOpener.extractData.yields(expectedError);
        // Act
        facebookSpecifics.readFile(localFile, (err) => {
          // Assert
          expect(err).to.exist;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
    it('should remove the first 6 lines from the array returned by FileOpener.extractData and return the remaining lines', (done) => {
      // Arrange
      const dataCopy = [...data]; // copy data as this gets modified in called method
      // Act
      facebookSpecifics.readFile(localFile, (err, output) => {
        // Assert
        expect(err).to.not.exist;
        expect(output).to.exist;
        const splicedData = dataCopy.slice(6);
        expect(output).to.deep.eq(splicedData);
        done();
      });
    });
  });
});
