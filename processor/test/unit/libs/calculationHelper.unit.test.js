process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');

const calculationHelper = require('../../../libs/calculationHelper');

describe('calculationHelper', () => {
  describe('.contractSizeByLimit', () => {
    describe('when only passed a total', () => {
      it('should return the total', (done) => {
        const output = calculationHelper.contractSizeByLimit(10, null, null);
        expect(output).to.eq(10);
        done();
      });
    });
    describe('when batch is less than the total', () => {
      it('should return the limit amount', (done) => {
        const output = calculationHelper.contractSizeByLimit(100, 20, 10);
        expect(output).to.eq(20);
        done();
      });
    });
    describe('when total is greater than the limit and offset is 0', () => {
      it('should return the limit amount', (done) => {
        const output = calculationHelper.contractSizeByLimit(214256, 150000, 0);
        expect(output).to.eq(150000);
        done();
      });
    });
    describe('when total is less than the limit and offset is 0', () => {
      it('should return the limit amount', (done) => {
        const output = calculationHelper.contractSizeByLimit(114256, 150000, 0);
        expect(output).to.eq(114256);
        done();
      });
    });
    describe('when total is less than the limit and offset is 0', () => {
      it('should return the limit amount', (done) => {
        const output = calculationHelper.contractSizeByLimit(685930, 150000, 450000);
        expect(output).to.eq(150000);
        done();
      });
    });
    describe('when batch is greater than the total', () => {
      it('should return the total minus the limit + offset', (done) => {
        const output = calculationHelper.contractSizeByLimit(100, 20, 95);
        expect(output).to.eq(5);
        done();
      });
    });
  });
  describe('.sortAndLimit', () => {
    describe('when passed null for items', () => {
      it('should return null', (done) => {
        // Act
        const res = calculationHelper.sortAndLimit(null, null, null);
        // Assert
        expect(res).to.eq(null);
        done();
      });
    });
    describe('when passed an array of strings', () => {
      it('should return the array in the original format', (done) => {
        // Arrange
        const input = ['one', 'two'];
        // Act
        const res = calculationHelper.sortAndLimit(input, null, null);
        // Assert
        expect(res).to.deep.eq(input);
        done();
      });
    });
    describe('when passed an array of undefined values', () => {
      it('should return the array in the original format', (done) => {
        // Arrange
        const input = [undefined, null];
        // Act
        const res = calculationHelper.sortAndLimit(input, null, null);
        // Assert
        expect(res).to.deep.eq(input);
        done();
      });
    });
    describe('when passed an array of objects', () => {
      describe('and passed a sortValue of null', () => {
        it('should return the original array', (done) => {
          // Arrange
          const input = [{ a: 1, b: 1 }, { a: 3, b: 3 }, { a: 2, b: 2 }];
          // Act
          const res = calculationHelper.sortAndLimit(input, null, null);
          // Assert
          expect(res).to.deep.eq(input);
          done();
        });
      });
      describe('and passed a sortValue of a key that does not exist', () => {
        it('should return the original array', (done) => {
          // Arrange
          const input = [{ a: 1, b: 1 }, { a: 3, b: 3 }, { a: 2, b: 2 }];
          // Act
          const res = calculationHelper.sortAndLimit(input, 'c', null);
          // Assert
          expect(res).to.deep.eq(input);
          done();
        });
      });
      describe('and passed a sortValue of a key that does exist', () => {
        it('should sort the array by that value', (done) => {
          // Arrange
          const input = [{ a: 1, b: 1 }, { a: 3, b: 3 }, { a: 2, b: 2 }];
          // Act
          const res = calculationHelper.sortAndLimit(input, 'a', null);
          // Assert
          const output = res.map((value) => value.a);
          expect(output).to.deep.eq([3, 2, 1]);
          done();
        });
      });
      describe('when passed no limit value', () => {
        it('should return the full array', (done) => {
          // Arrange
          const input = [{ a: 1, b: 1 }, { a: 3, b: 3 }, { a: 2, b: 2 }];
          // Act
          const res = calculationHelper.sortAndLimit(input, 'b', null);
          // Assert
          expect(res.length).to.eq(input.length);
          done();
        });
      });
      describe('when passed a limit value greater than the length of the array', () => {
        it('should return the full array', (done) => {
          // Arrange
          const input = [{ a: 1, b: 1 }, { a: 3, b: 3 }, { a: 2, b: 2 }];
          // Act
          const res = calculationHelper.sortAndLimit(input, 'b', 10);
          // Assert
          expect(res.length).to.eq(input.length);
          done();
        });
      });
      describe('when passed a limit value less than the length of the array', () => {
        it('should return the number of values as set in the limit, minus 1', (done) => {
          // Arrange
          const input = [{ a: 1, b: 1 }, { a: 3, b: 3 }, { a: 2, b: 2 }];
          const limit = 2;
          // Act
          const res = calculationHelper.sortAndLimit(input, 'b', limit);
          // Assert
          expect(res.length).to.eq(limit - 1);
          done();
        });
      });
    });
  });
});
