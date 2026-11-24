process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');

const Client = require('../../../models/client');

describe('Client', () => {
  logger.info('>>>file>>>> unit/models/client .....................');

  let model;
  const modelFields = {
    name: randomString(),
    suppressZeroTaxLine: false,
    feesInvoiceCustomText: randomString(),
    customFeesInvoiceTitle: randomString(),
  };

  beforeEach(async () => {
    model = new Client(modelFields);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should include model fields', () => {
    expect(model).to.deep.include(modelFields);
  });
});
