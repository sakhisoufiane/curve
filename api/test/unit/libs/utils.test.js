process.env.NODE_ENV = 'test';
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { Utils } = require('@curveroyaltysystems/curve-shared-logic');
const { expect } = require('chai');

describe('Utils Library Unit Tests', () => {
  logger.info('>>>utils>>>> unit/libs/utils .....................');
  describe('Utils.clearBlankStrings', () => {
    describe('when properties contains one property that does not exist on the document passed', () => {
      it('should not modify the passed document');
    });
    describe('when properties contains one property, which contains a blank string', () => {
      it('should change the value of this property to `null`');
    });
    describe('when properties contains one property, which contains a random string of at least 1 character length', () => {
      it('should not modify the passed document');
    });
    describe('when properties contains one property, which contains an array of 1 object', () => {
      describe('when this object contains a property `clientId` and this is a blank string', () => {
        it('should change the value of the `clientId` property to `null`');
      });
      describe('when this object contains a property `composerId` and this is a blank string', () => {
        it('should change the value of the `composerId` property to `null`');
      });
      describe('when this object contains a property `publisherId` and this is a blank string', () => {
        it('should change the value of the `publisherId` property to `null`');
      });
      describe('when this object contains a property `clientId` and this is a random string of at least 1 character length', () => {
        it('should not modify the passed document');
      });
      describe('when this object contains a property `composerId` and this is a random string of at least 1 character length', () => {
        it('should not modify the passed document');
      });
      describe('when this object contains a property `publisherId` and this is a random string of at least 1 character length', () => {
        it('should not modify the passed document');
      });
      describe('when this object does NOT contain a property `clientId`, `composerId` or `publisherId`', () => {
        it('should not modify the passed document');
      });
    });
  });

  describe('Utils.isBarcodeCorrupt', () => {
    describe('When barcode is a string and is in scientific notation (capital E)', () => {
      it('should return true', (done) => {
        // Arrange
        const param1 = '7.11E+11';
        const param2 = '2.23E+12';
        const param3 = '1.94997E+11';
        const param4 = '6.03E+11';
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        const checkBarcodeTest2 = Utils.isBarcodeCorrupt(param2);
        const checkBarcodeTest3 = Utils.isBarcodeCorrupt(param3);
        const checkBarcodeTest4 = Utils.isBarcodeCorrupt(param4);
        // Assert
        expect(checkBarcodeTest1).to.equal(true);
        expect(checkBarcodeTest2).to.equal(true);
        expect(checkBarcodeTest3).to.equal(true);
        expect(checkBarcodeTest4).to.equal(true);
        done();
      });
    });
    describe('When barcode is a string and is in scientific notation (lowercaps e)', () => {
      it('should return true', (done) => {
        // Arrange
        const param1 = '7.11e+11';
        const param2 = '2.23e+12';
        const param3 = '1.94997e+11';
        const param4 = '6.03e+11';
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        const checkBarcodeTest2 = Utils.isBarcodeCorrupt(param2);
        const checkBarcodeTest3 = Utils.isBarcodeCorrupt(param3);
        const checkBarcodeTest4 = Utils.isBarcodeCorrupt(param4);
        // Assert
        expect(checkBarcodeTest1).to.equal(true);
        expect(checkBarcodeTest2).to.equal(true);
        expect(checkBarcodeTest3).to.equal(true);
        expect(checkBarcodeTest4).to.equal(true);
        done();
      });
    });
    describe('When barcode is a string and is NOT scientific notation', () => {
      it('should return false', (done) => {
        // Arrange
        const param1 = '859718545934';
        const param2 = '8445281943585';
        const param3 = '767758600622';
        const param4 = '602577057311';
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        const checkBarcodeTest2 = Utils.isBarcodeCorrupt(param2);
        const checkBarcodeTest3 = Utils.isBarcodeCorrupt(param3);
        const checkBarcodeTest4 = Utils.isBarcodeCorrupt(param4);
        // Assert
        expect(checkBarcodeTest1).to.equal(false);
        expect(checkBarcodeTest2).to.equal(false);
        expect(checkBarcodeTest3).to.equal(false);
        expect(checkBarcodeTest4).to.equal(false);
        done();
      });
    });
    describe('When barcode is a string and is corrupted with 5 zeros or more', () => {
      it('should return true', (done) => {
        // Arrange
        const param1 = '85971900000';
        const param2 = '5060570000000';
        const param3 = '3610150000000';
        const param4 = '888916000000';
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        const checkBarcodeTest2 = Utils.isBarcodeCorrupt(param2);
        const checkBarcodeTest3 = Utils.isBarcodeCorrupt(param3);
        const checkBarcodeTest4 = Utils.isBarcodeCorrupt(param4);
        // Assert
        expect(checkBarcodeTest1).to.equal(true);
        expect(checkBarcodeTest2).to.equal(true);
        expect(checkBarcodeTest3).to.equal(true);
        expect(checkBarcodeTest4).to.equal(true);
        done();
      });
    });
    describe('When barcode is a number and has not been corrupted (with several 0s on the end)', () => {
      it('should return false', (done) => {
        // Arrange
        const param1 = 859718545934;
        const param2 = 194997017049;
        const param3 = 767758600622;
        const param4 = 194690388859;
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        const checkBarcodeTest2 = Utils.isBarcodeCorrupt(param2);
        const checkBarcodeTest3 = Utils.isBarcodeCorrupt(param3);
        const checkBarcodeTest4 = Utils.isBarcodeCorrupt(param4);
        // Assert
        expect(checkBarcodeTest1).to.equal(false);
        expect(checkBarcodeTest2).to.equal(false);
        expect(checkBarcodeTest3).to.equal(false);
        expect(checkBarcodeTest4).to.equal(false);
        done();
      });
    });
    describe('When barcode is a number and has been corrupted (with several 0s on the end)', () => {
      it('should return true', (done) => {
        // Arrange
        const param1 = 85971900000;
        const param2 = 5060570000000;
        const param3 = 3610150000000;
        const param4 = 888916000000;
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        const checkBarcodeTest2 = Utils.isBarcodeCorrupt(param2);
        const checkBarcodeTest3 = Utils.isBarcodeCorrupt(param3);
        const checkBarcodeTest4 = Utils.isBarcodeCorrupt(param4);
        // Assert
        expect(checkBarcodeTest1).to.equal(true);
        expect(checkBarcodeTest2).to.equal(true);
        expect(checkBarcodeTest3).to.equal(true);
        expect(checkBarcodeTest4).to.equal(true);
        done();
      });
    });
    describe('When barcode is a number and has only less than 5 zeros on the end', () => {
      it('should return false', (done) => {
        // Arrange
        const param1 = 859718545900;
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        // Assert
        expect(checkBarcodeTest1).to.equal(false);
        done();
      });
    });
    describe('When barcode is a number and includes an E', () => {
      it('should return true', (done) => {
        // Arrange
        const param1 = 8.59746494525234E+23;
        // Act
        const checkBarcodeTest1 = Utils.isBarcodeCorrupt(param1);
        // Assert
        expect(checkBarcodeTest1).to.equal(true);
        done();
      });
    });
  });

  describe('Utils.getDifference', () => {
    describe('When current array contains a difference', () => {
      it('Should return an array with the differing object (scenario 1)', (done) => {
        // Arrange
        const currentArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'abcd' }, { society: 'ASCAP', identifier: '123asdf' }];
        const originalArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'abcd' }];
        // Act
        const newAndModifiedIdentifiers = Utils.getDifference(currentArray, originalArray);
        const correctArray = [{ society: 'ASCAP', identifier: '123asdf' }];
        // Assert
        expect(newAndModifiedIdentifiers).to.deep.eq(correctArray);
        done();
      });
      it('Should return an array with the differing object (scenario 2)', (done) => {
        // Arrange
        const currentArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'defg' }];
        const originalArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'abcd' }];
        // Act
        const newAndModifiedIdentifiers = Utils.getDifference(currentArray, originalArray);
        const correctArray = [{ society: 'ASCAP', identifier: 'defg' }];
        // Assert
        expect(newAndModifiedIdentifiers).to.deep.eq(correctArray);
        done();
      });
      describe('When original array does not contain any identifiers but the current array has one', () => {
        it('should return the current array', (done) => {
          // Arrange
          const currentArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'defg' }];
          const originalArray = [];
          // Act
          const newAndModifiedIdentifiers = Utils.getDifference(currentArray, originalArray);
          const correctArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'defg' }];
          // Assert
          expect(newAndModifiedIdentifiers).to.deep.eq(correctArray);
          done();
        });
      });
    });

    describe('When current array contains NO difference', () => {
      it('Should return an empty array', (done) => {
        // Arrange
        const currentArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'abcd' }];
        const originalArray = [{ society: 'PRS', identifier: '1234' }, { society: 'ASCAP', identifier: 'abcd' }];
        // Act
        const newAndModifiedIdentifiers = Utils.getDifference(currentArray, originalArray);
        // Assert
        expect(newAndModifiedIdentifiers).to.deep.eq([]);
        done();
      });
    });
  });
});
