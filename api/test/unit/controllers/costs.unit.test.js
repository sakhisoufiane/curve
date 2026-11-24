process.env.NODE_ENV = 'test';

require('../../../models/db');

const sinon = require('sinon');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const chai = require('chai');
const Costs = require('../../../controllers/costs');
const Cost = require('../../../models/cost');

chai.use(require('sinon-chai'));

const { expect } = chai;

// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('Costs', () => {
  logger.info('\n\n**** .test/unit/controllers/costs.unit.test.js');
  const clientId = randomId();

  beforeEach(() => {
    sinon.stub(Cost, 'find').returns({ select: sinon.stub().returns({ lean: sinon.stub().resolves(null) }) });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getFilterOptions', () => {
    it('should return empty array if no target periods found', async () => {
      const targetPeriods = await Costs.getFilterOptions({ clientId });
      expect(targetPeriods).to.deep.eq({ targetPeriods: [] });
    });

    it('should return target periods array', async () => {
      const targetPeriodsList = [{ targetPeriod: randomString() }, { targetPeriod: randomString() }];
      Cost.find.returns({ select: sinon.stub().returns({ lean: sinon.stub().resolves(targetPeriodsList) }) });
      const targetPeriods = await Costs.getFilterOptions({ clientId });
      expect(targetPeriods).to.deep.eq({ targetPeriods: [targetPeriodsList[0].targetPeriod, targetPeriodsList[1].targetPeriod] });
    });

    it('should return unique target periods array', async () => {
      const targetPeriod = randomString();
      const targetPeriodsList = [{ targetPeriod }, { targetPeriod }];
      Cost.find.returns({ select: sinon.stub().returns({ lean: sinon.stub().resolves(targetPeriodsList) }) });
      const targetPeriods = await Costs.getFilterOptions({ clientId });
      expect(targetPeriods).to.deep.eq({ targetPeriods: [targetPeriodsList[0].targetPeriod] });
    });
  });
});
