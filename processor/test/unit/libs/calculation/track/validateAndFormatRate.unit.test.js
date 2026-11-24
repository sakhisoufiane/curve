const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/track/validateAndFormatRate.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

describe('contractsForCostsCalculation unit tests', () => {
  let ValidateAndFormatRate;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    ValidateAndFormatRate = rewire('../../../../../libs/calculation/track/validateAndFormatRate');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('when no rate', () => {
    it('should return 100', (done) => {
      // Arrange
      const rate = null;
      // Act
      const result = ValidateAndFormatRate(rate);
      // Assert
      expect(result).to.eq(100);
      done();
    });
  });

  describe('when rate is a string', () => {
    describe('when rate is not a number', () => {
      it('should return 100', (done) => {
        // Arrange
        const rate = randomString();
        // Act
        const result = ValidateAndFormatRate(rate);
        // Assert
        expect(result).to.eq(100);
        done();
      });
    });

    describe('when rate is a number', () => {
      it('should parse the rate to a float', (done) => {
        // Arrange
        const rate = `${randomInt()}`;
        // Act
        const result = ValidateAndFormatRate(rate);
        // Assert
        expect(result).to.eq(parseFloat(rate));
        done();
      });
    });
  });

  describe('when rate is a number', () => {
    it('should return the rate', (done) => {
      // Arrange
      const rate = randomInt();
      // Act
      const result = ValidateAndFormatRate(rate);
      // Assert
      expect(result).to.eq(rate);
      done();
    });
  });

  describe('when rate is a 0', () => {
    it('should return 0', (done) => {
      // Arrange
      const rate = 0;
      // Act
      const result = ValidateAndFormatRate(rate);
      // Assert
      expect(result).to.eq(0);
      done();
    });
  });
});
