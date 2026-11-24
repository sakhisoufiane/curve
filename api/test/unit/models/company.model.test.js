process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');

const Company = require('../../../models/company');

describe('Client', () => {
  logger.info('>>>file>>>> unit/models/company .....................');

  let model;
  const modelFields = {
    name: randomString(),
    feesInvoiceCustomText: randomString(),
  };

  beforeEach(async () => {
    model = new Company(modelFields);
  });

  afterEach(() => sinon.restore());

  it('should include model fields', () => {
    expect(model).to.deep.include(modelFields);
  });
});
