process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const chai = require('chai');

const { expect } = chai;

const { getErrorDescription, ErrorCodes } = require('../../../libs/curvePay');

describe('curvePay', function () {
  logger.info('>>>file>>>> unit/libs/curvePay.....................');

  it('should return default error', () => {
    const result = getErrorDescription(randomString());
    expect(result).to.eq('An unknown error occurred. Please contact support for further assistance.');
  });

  it('should return default error on null error code', () => {
    const result = getErrorDescription(null);
    expect(result).to.eq('An unknown error occurred. Please contact support for further assistance.');
  });

  it('should return default error on undefined error code', () => {
    const result = getErrorDescription();
    expect(result).to.eq('An unknown error occurred. Please contact support for further assistance.');
  });

  it('should return expected error description', () => {
    const result = getErrorDescription(Object.keys(ErrorCodes)[0]);
    expect(result).to.eq(ErrorCodes.PAYMENT_ACCOUNT_DISABLED);
  });
});
