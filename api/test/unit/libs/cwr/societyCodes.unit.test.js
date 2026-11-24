const chai = require('chai');

const { expect } = chai;
const sinon = require('sinon');
const { SocietyCodes } = require('@curveroyaltysystems/curve-shared-logic');

describe('SocietyCodes', () => {
  describe('.listCodes', () => {
    it('should return an object of the code mappings', (done) => {
      // Act
      const codes = SocietyCodes.listCodes;
      // Assert
      expect(typeof codes).to.eq('object');
      expect(codes.PRS).to.eq(52);
      done();
    });
  });

  describe('.mapSocietyToCode', () => {
    describe('when value is one of the societies', () => {
      it('should return the mapped code', (done) => {
        // Act
        const output = SocietyCodes.mapSocietyToCode('PRS');
        // Assert
        expect(output).to.eq(52);
        done();
      });
    });
    describe('when value is not one of the societies', () => {
      it('should return undefined', (done) => {
        // Act
        const output = SocietyCodes.mapSocietyToCode('Anything Else');
        // Assert
        expect(output).to.eq(undefined);
        done();
      });
    });
    describe('when value is null', () => {
      it('should return undefined', (done) => {
        // Act
        const output = SocietyCodes.mapSocietyToCode(null);
        // Assert
        expect(output).to.eq(undefined);
        done();
      });
    });
  });
});
