const chai = require('chai');

const { expect } = chai;
const { throwError } = require('../../../libs/errors');

describe('throwError', () => {
  it('should throw error', () => {
    try {
      throwError({ code: 400, message: 'Error', cause: 'Bad Request' });
    } catch (err) {
      expect(err.code).to.eq(400);
      expect(err.message).to.eq('Error');
      expect(err.cause).to.eq('Bad Request');
    }
  });

  it('should throw error with code only', () => {
    try {
      throwError({ code: 500 });
    } catch (err) {
      expect(err.code).to.eq(500);
    }
  });

  it('should throw error with code and message', () => {
    try {
      throwError({ code: 500, message: 'Internal Server Error' });
    } catch (err) {
      expect(err.code).to.eq(500);
      expect(err.message).to.eq('Internal Server Error');
    }
  });

  it('should throw error with code and cause', () => {
    try {
      throwError({ code: 500, cause: 'Internal' });
    } catch (err) {
      expect(err.code).to.eq(500);
      expect(err.cause).to.eq('Internal');
    }
  });
});
