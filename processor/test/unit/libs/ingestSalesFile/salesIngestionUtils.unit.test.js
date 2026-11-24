process.env.NODE_ENV = 'test';

const { expect } = require('chai');

const { testUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');

const { randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const salesIngestionUtils = require('../../../../libs/salesIngestion/salesIngestionUtils');

logger.debug('\n\n**** ./test/unit/libs/ingestSalesFile/salesIngestionUtils.unit.test.js');

describe('salesIngestionUtils Unit Tests', () => {
  let dirtyString = '';
  for (let i = 0; i < 65535; i += 1) {
    dirtyString += String.fromCharCode(i);
  }
  describe('salesIngestionUtils.fieldToFormat', () => {
    describe('when fieldName is "isrc"', () => {
      const fieldName = 'isrc';
      const format = '';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = testUtils.randomInt();
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(value.toString());
        done();
      });
      it('should trim it and remove any invalid characters', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = dirtyString.replace(/[^0-9a-zA-Z(),_'#"]/gi, '');
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });

    describe('when fieldName is "catNo"', () => {
      const fieldName = 'catNo';
      const format = '';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = 123;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq('123');
        done();
      });
      it('should trim it and remove any invalid characters', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });
    describe('when fieldName is "barcode"', () => {
      const fieldName = 'barcode';
      const format = '';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = 123;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq('123');
        done();
      });
      it('should trim it and remove any invalid characters', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });
    describe('when fieldName is "identifier"', () => {
      const fieldName = 'identifier';
      const format = '';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = 123;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq('123');
        done();
      });
      it('should trim it and remove any invalid characters', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });
    describe('when fieldName is "iswc"', () => {
      const fieldName = 'iswc';
      const format = '';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = 123;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq('123');
        done();
      });
      it('should trim it and remove any invalid characters', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });
    describe('when fieldName is "tunecode"', () => {
      const fieldName = 'tunecode';
      const format = '';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = 123;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq('123');
        done();
      });
      it('should trim it and remove any invalid characters', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });
    describe('when fieldName is "contractIdentifier"', () => {
      const fieldName = 'contractIdentifier';
      const format = '';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = 123;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq('123');
        done();
      });
      it('should trim it and remove any invalid characters', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });

    // String
    describe('when fieldName is defined and format is "String"', () => {
      const fieldName = 'something else';
      const format = 'String';
      it('should convert a number to a string', (done) => {
        // Arrange
        const value = 123;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq('123');
        done();
      });
      it('should trim it', (done) => {
        // Arrange
        const value = `  ${dirtyString}  `;
        const cleanString = `${dirtyString}`;
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(typeof output).to.eq('string');
        expect(output).to.eq(cleanString);
        done();
      });
    });

    // Numbers
    describe('Numbers', () => {
      const fieldName = 'something else';
      const format = 'Number';
      describe('when fieldName is defined, format is "Number" and value is a number', () => {
        it('should return the unmodified value', (done) => {
          // Arrange
          const value = 123;
          // Act
          const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
          // Assert
          expect(typeof output).to.eq('number');
          expect(output).to.eq(value);
          done();
        });
      });
      describe('when fieldName is defined, format is "Number" and value is a number formatted as a string', () => {
        it('should return the number contained in the value string', (done) => {
          // Arrange
          const value = '123';
          // Act
          const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
          // Assert
          expect(typeof output).to.eq('number');
          expect(output).to.eq(123);
          done();
        });
      });
      describe('when fieldName is defined, format is "Number" and value is a string which does not contain a valid number', () => {
        it('should return null', (done) => {
          // Arrange
          const value = 'Hello World';
          // Act
          const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
          // Assert
          expect(output).to.eq(null);
          done();
        });
      });
    });

    describe('when fieldName is defined, format is "Number Comma Decimal" and value is a string which contains a number with a comma decimal', () => {
      it('should return the number contained in the value string, replacing the comma with a dot', (done) => {
        // Arrange
        const fieldName = 'something else';
        const format = 'Number Comma Decimal';
        const value = '12,34';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.eq(12.34);
        done();
      });
    });
    describe('when fieldName is defined, format is "Number Comma Decimal" and value is a string which does not contain a valid number', () => {
      it('should return null', (done) => {
        // Arrange
        const fieldName = 'something else';
        const format = 'Number Comma Decimal';
        const value = 'Hello World';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.eq(null);
        done();
      });
    });

    describe('when fieldName is defined, format is "Number 2 Decimal Places" and value is a string which contains a number', () => {
      it('should return the number contained in the value string, divided by 100', (done) => {
        // Arrange
        const fieldName = 'something else';
        const format = 'Number 2 Decimal Places';
        const value = '1234';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.eq(12.34);
        done();
      });
    });
    describe('when fieldName is defined, format is "Number 2 Decimal Places" and value is a string which does not contain a valid number', () => {
      it('should return null', (done) => {
        // Arrange
        const fieldName = 'something else';
        const format = 'Number 2 Decimal Places';
        const value = 'Hello World';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.eq(null);
        done();
      });
    });

    describe('when fieldName is defined, format is "Number 5 Decimal Places" and value is a string which contains a number', () => {
      it('should return the number contained in the value string, divided by 100,000', (done) => {
        // Arrange
        const fieldName = 'something else';
        const format = 'Number 5 Decimal Places';
        const value = '12345678';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.eq(123.45678);
        done();
      });
    });
    describe('when fieldName is defined, format is "Number 5 Decimal Places" and value is a string which does not contain a valid number', () => {
      it('should return null', (done) => {
        // Arrange
        const fieldName = 'something else';
        const format = 'Number 5 Decimal Places';
        const value = 'Hello World';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.eq(null);
        done();
      });
    });

    // Dates
    describe('when fieldName is defined, format is "Date" and value is a number representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = testUtils.randomFloat();
        const fieldName = testUtils.randomString();
        const format = 'Date';
        const expectedOutput = new Date((value - (25567 + 2)) * 86400 * 1000);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date" and value is a string representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022-04-27';
        const fieldName = testUtils.randomString();
        const format = 'Date';
        const expectedOutput = new Date(value);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });

    describe('when fieldName is "saleDate", format is undefined and value is a number representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = testUtils.randomFloat();
        const fieldName = 'saleDate';
        const format = null;
        const expectedOutput = new Date((value - (25567 + 2)) * 86400 * 1000);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is "saleDate", format is undefined and value is a string representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022-04-27';
        const fieldName = 'saleDate';
        const format = null;
        const expectedOutput = new Date(value);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });

    describe('when fieldName is "transactionDate", format is undefined and value is a number representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = testUtils.randomFloat();
        const fieldName = 'transactionDate';
        const format = null;
        const expectedOutput = new Date((value - (25567 + 2)) * 86400 * 1000);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is "transactionDate", format is undefined and value is a string representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022-04-27';
        const fieldName = 'transactionDate';
        const format = null;
        const expectedOutput = new Date(value);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });

    describe('when fieldName is "dateFrom", format is undefined and value is a number representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = testUtils.randomFloat();
        const fieldName = 'dateFrom';
        const format = null;
        const expectedOutput = new Date((value - (25567 + 2)) * 86400 * 1000);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is "dateFrom", format is undefined and value is a string representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022-04-27';
        const fieldName = 'dateFrom';
        const format = null;
        const expectedOutput = new Date(value);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });

    describe('when fieldName is "dateTo", format is undefined and value is a number representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = testUtils.randomFloat();
        const fieldName = 'dateTo';
        const format = null;
        const expectedOutput = new Date((value - (25567 + 2)) * 86400 * 1000);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is "dateTo", format is undefined and value is a string representing a date', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022-04-27';
        const fieldName = 'dateTo';
        const format = null;
        const expectedOutput = new Date(value);
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });

    describe('when fieldName is defined, format is "Date: DD/MM/YYYY" and value contains a date formatted as DD/MM/YYYY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '27/04/2022';
        const fieldName = testUtils.randomString();
        const format = 'Date: DD/MM/YYYY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: DD/MM/YYYY" and value contains a date NOT formatted as DD/MM/YYYY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: DD/MM/YYYY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MM/DD/YYYY" and value contains a date formatted as MM/DD/YYYY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '04/27/2022';
        const fieldName = testUtils.randomString();
        const format = 'Date: MM/DD/YYYY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MM/DD/YYYY" and value contains a date NOT formatted as MM/DD/YYYY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: MM/DD/YYYY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: DD-MM-YYYY" and value contains a date formatted as DD-MM-YYYY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '27-04-2022';
        const fieldName = testUtils.randomString();
        const format = 'Date: DD-MM-YYYY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: DD-MM-YYYY" and value contains a date NOT formatted as DD-MM-YYYY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: DD-MM-YYYY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MM-DD-YYYY" and value contains a date formatted as MM-DD-YYYY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '04-27-2022';
        const fieldName = testUtils.randomString();
        const format = 'Date: MM-DD-YYYY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MM-DD-YYYY" and value contains a date NOT formatted as MM-DD-YYYY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: MM-DD-YYYY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY/MM/DD" and value contains a date formatted as YYYY/MM/DD', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022/04/27';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY/MM/DD';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY/MM/DD" and value contains a date NOT formatted as YYYY/MM/DD', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY/MM/DD';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY/DD/MM" and value contains a date formatted as YYYY/DD/MM', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022/27/04';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY/DD/MM';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY/DD/MM" and value contains a date NOT formatted as YYYY/DD/MM', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY/DD/MM';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY-MM-DD" and value contains a date formatted as YYYY-MM-DD', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022-04-27';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY-MM-DD';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY-MM-DD" and value contains a date NOT formatted as YYYY-MM-DD', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY-MM-DD';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY-DD-MM" and value contains a date formatted as YYYY-DD-MM', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022-27-04';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY-DD-MM';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY-DD-MM" and value contains a date NOT formatted as YYYY-DD-MM', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY-DD-MM';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYMM" and value contains a date formatted as YYYYMM', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '202204';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYYMM';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYMM" and value contains a date NOT formatted as YYYYMM', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYYMM';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYMM" and value contains a date formatted as YYMM', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2204';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYMM';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYMM" and value contains a date NOT formatted as YYMM', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYMM';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYMMYYMM" and value contains a date formatted as YYMMYYMM', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '23052204';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYMMYYMM';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYMMYYMM" and value contains a date NOT formatted as YYMMYYMM', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYMMYYMM';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MMYY" and value contains a date formatted as MMYY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '0422';
        const fieldName = testUtils.randomString();
        const format = 'Date: MMYY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MMYY" and value contains a date NOT formatted as MMYY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: MMYY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MM_YYYY" and value contains a date formatted as MM_YYYY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '04_2022';
        const fieldName = testUtils.randomString();
        const format = 'Date: MM_YYYY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MM_YYYY" and value contains a date NOT formatted as MM_YYYY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: MM_YYYY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MMYYMMYY" and value contains a date formatted as MMYYMMYY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '05230422';
        const fieldName = testUtils.randomString();
        const format = 'Date: MMYYMMYY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MMYYMMYY" and value contains a date NOT formatted as MMYYMMYY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: MMYYMMYY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYMMDD" and value contains a date formatted as YYYYMMDD', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '20220427';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYYMMDD';
        const expectedOutput = new Date(Date.UTC(2022, 3, 27));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYMMDD" and value contains a date NOT formatted as YYYYMMDD', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYYMMDD';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY_H" and value contains a date formatted as YYYY_H', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022_1';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY_H';
        const expectedOutput = new Date(Date.UTC(2022, 0, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY_H" and value contains a date NOT formatted as YYYY_H', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY_H';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYH" and value contains a date formatted as YYYYH', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '20221';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYYH';
        const expectedOutput = new Date(Date.UTC(2022, 0, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYH" and value contains a date NOT formatted as YYYYH', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYYH';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY_Q" and value contains a date formatted as YYYY_Q', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022_2';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY_Q';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY_Q" and value contains a date NOT formatted as YYYY_Q', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY_Q';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYQ" and value contains a date formatted as YYYYQ', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '20222';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYYQ';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYYQ" and value contains a date NOT formatted as YYYYQ', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY_Q';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY_MM" and value contains a date formatted as YYYY_MM', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = '2022_04';
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY_MM';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: YYYY_MM" and value contains a date NOT formatted as YYYY_MM', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: YYYY_MM';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MMM YY" and value contains a date formatted as MMM YY', () => {
      it('should return the date as a Javascript date', (done) => {
        // Arrange
        const value = 'APR 22';
        const fieldName = testUtils.randomString();
        const format = 'Date: MMM YY';
        const expectedOutput = new Date(Date.UTC(2022, 3, 1));
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(expectedOutput);
        done();
      });
    });
    describe('when fieldName is defined, format is "Date: MMM YY" and value contains a date NOT formatted as MMM YY', () => {
      it('should return null', (done) => {
        // Arrange
        const value = testUtils.randomString();
        const fieldName = testUtils.randomString();
        const format = 'Date: MMM YY';
        // Act
        const output = salesIngestionUtils.fieldToFormat(value, fieldName, format);
        // Assert
        expect(output).to.deep.eq(null);
        done();
      });
    });
  });

  describe('salesIngestionUtils.yearFromCharacters', () => {
    describe('when year is "2018"', () => {
      it('should return the passed year value', (done) => {
        // Arrange
        const value = '2018';
        // Act
        const output = salesIngestionUtils.yearFromCharacters(value);
        // Assert
        expect(output).to.eq(value);
        done();
      });
    });
    describe('when year is "2018 "', () => {
      it('should return "2018"', (done) => {
        // Arrange
        const value = '2018 ';
        // Act
        const output = salesIngestionUtils.yearFromCharacters(value);
        // Assert
        expect(output).to.eq('2018');
        done();
      });
    });
    describe('when year is "12"', () => {
      it('should return "2012"', (done) => {
        // Arrange
        const value = '12';
        // Act
        const output = salesIngestionUtils.yearFromCharacters(value);
        // Assert
        expect(output).to.eq('2012');
        done();
      });
    });
    describe('when year is undefined', () => {
      it('should return the current year', (done) => {
        // Arrange
        const value = undefined;
        // Act
        const output = salesIngestionUtils.yearFromCharacters(value);
        // Assert
        expect(output).to.eq(new Date().getFullYear());
        done();
      });
    });
    describe('when year is null', () => {
      it('should return the current year', (done) => {
        // Arrange
        const value = null;
        // Act
        const output = salesIngestionUtils.yearFromCharacters(value);
        // Assert
        expect(output).to.eq(new Date().getFullYear());
        done();
      });
    });
  });

  describe('salesIngestionUtils.ApplyMultiplier', () => {
    it('should initialise with the right params', () => {
      // Arrange
      const multiplier = randomFloat();
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.multiplier).to.eq(multiplier);
    });
    it('ApplyMultiplier.apply should multiply value by multiplier if both have a value assigned', () => {
      // Arrange
      const multiplier = randomFloat();
      const val = randomFloat();
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.apply(val)).to.eq(multiplier * val);
    });
    it('ApplyMultiplier.apply should return value if multiplier is undefined', () => {
      // Arrange
      const multiplier = undefined;
      const val = randomFloat();
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.apply(val)).to.eq(val);
    });
    it('ApplyMultiplier.applyToObjectByKeys should return a copy of the supplied object if keys is undefined ', () => {
      // Arrange
      const multiplier = randomFloat();
      const object = { key1: randomFloat(), key2: randomFloat(), key3: randomFloat() };
      const keys = undefined;
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.applyToObjectByKeys({ object, keys })).to.deep.eq(object);
    });
    it('ApplyMultiplier.applyToObjectByKeys should return a copy of the supplied object if keys is empty array ', () => {
      // Arrange
      const multiplier = randomFloat();
      const object = { key1: randomFloat(), key2: randomFloat(), key3: randomFloat() };
      const keys = [];
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.applyToObjectByKeys({ object, keys })).to.deep.eq(object);
    });
    it('ApplyMultiplier.applyToObjectByKeys should return a copy of the supplied object if keys array does not contain any of the names of properties in object', () => {
      // Arrange
      const multiplier = randomFloat();
      const object = { key1: randomFloat(), key2: randomFloat(), key3: randomFloat() };
      const keys = ['key4'];
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.applyToObjectByKeys({ object, keys })).to.deep.eq(object);
    });
    it('ApplyMultiplier.applyToObjectByKeys should return a copy of the supplied object with the value of object property contained within keys array having been multiplied by multiplier', () => {
      // Arrange
      const multiplier = randomFloat();
      const object = { key1: randomFloat(), key2: randomFloat(), key3: randomFloat() };
      const keys = ['key1'];
      const expectedOutput = { key1: object.key1 * multiplier, key2: object.key2, key3: object.key3 };
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.applyToObjectByKeys({ object, keys })).to.deep.eq(expectedOutput);
    });
    it('ApplyMultiplier.applyToObjectByKeys should return a copy of the supplied object with the values of object properties contained within keys array having been multiplied by multiplier', () => {
      // Arrange
      const multiplier = randomFloat();
      const object = { key1: randomFloat(), key2: randomFloat(), key3: randomFloat() };
      const keys = ['key1', 'key3'];
      const expectedOutput = { key1: object.key1 * multiplier, key2: object.key2, key3: object.key3 * multiplier };
      // Act
      const applyMultiplier = new salesIngestionUtils.ApplyMultiplier(multiplier);
      // Assert
      expect(applyMultiplier.applyToObjectByKeys({ object, keys })).to.deep.eq(expectedOutput);
    });
  });
});
