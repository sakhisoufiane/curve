process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt, randomJsDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');

const Cost = require('../../../models/cost');

describe('Cost', () => {
  logger.info('>>>file>>>> unit/models/cost .....................');

  let model;
  const modelFields = {
    clientId: randomId(),
    name: randomString(),
    date: randomJsDate(),
    type: randomString(),
    invoiceNo: randomString(),
    targetPeriod: randomString(),
    description: randomString(),
    file: randomString(),
    files: [],
    publicLink: randomString(),
    amount: randomInt(),
    currency: 'Home Currency',
    territory: randomString(),
    territoryName: randomString(),
    calculationContractIds: [],
    reportedStatus: 'Unreported',
    releaseIds: [],
    trackIds: [],
    contractIds: [],
    archived: false,
  };

  beforeEach(async () => {
    model = new Cost(modelFields);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should include model fields', () => {
    expect(model).to.deep.include(modelFields);
  });

  describe('importCost', () => {
    it('should swap currency for home currency if matching', () => {
      const cost = { currency: 'GBP', amount: 100 };
      const client = { homeCurrency: 'GBP' };
      const clientId = randomId();
      const callback = sinon.stub();
      sinon.stub(Cost.prototype, 'validate').resolves();

      Cost.importCost(cost, client, clientId, callback);

      expect(cost.currency).to.equal('Home Currency');
    });

    it('should import currency if not matching home currency', () => {
      const cost = { currency: 'USD', amount: 100 };
      const client = { homeCurrency: 'GBP' };
      const clientId = randomId();
      const callback = sinon.stub();
      sinon.stub(Cost.prototype, 'validate').resolves();

      Cost.importCost(cost, client, clientId, callback);

      expect(cost.currency).to.equal('USD');
    });
  });
});
