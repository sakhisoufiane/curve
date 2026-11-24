process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
// const chai = require('chai');
// const sinon = require('sinon');
// const ingestCwr = require('../../../libs/cwr/ingestCwr');

// const { expect } = chai;

describe('Use ingestCwr.ingest to fully ingest a CWR file', function () {
  logger.info('>>>file>>>> int/libs/ingestCwr .....................');
  it('should create all the works contained in the file under the passed clientId');
  it('should set territories based on the passed set of territories');
  describe('when defaults states contracts', function () {
    it('should add the specified contracts to the work');
  });
  describe('when defaults states addition to IP chain', function () {
    it('should add the specified value to each of the IP chains');
  });
});
