const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Costs = require('./costs');
const Cost = require('../../models/cost');

describe('Costs', () => {
  const clientId = randomId();

  beforeEach(() => {
    jest.spyOn(Cost, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
  });

  describe('getFilterOptions', () => {
    it('should return empty array if no target periods found', async () => {
      const targetPeriods = await Costs.getFilterOptions({ clientId });
      expect(targetPeriods).toEqual({ targetPeriods: [] });
    });

    it('should return target periods array', async () => {
      const targetPeriodsList = [{ targetPeriod: randomString() }, { targetPeriod: randomString() }];
      Cost.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(targetPeriodsList),
        }),
      });
      const targetPeriods = await Costs.getFilterOptions({ clientId });
      expect(targetPeriods).toEqual({ targetPeriods: [targetPeriodsList[0].targetPeriod, targetPeriodsList[1].targetPeriod] });
    });

    it('should return unique target periods array', async () => {
      const targetPeriod = randomString();
      const targetPeriodsList = [{ targetPeriod }, { targetPeriod }];
      Cost.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(targetPeriodsList),
        }),
      });
      const targetPeriods = await Costs.getFilterOptions({ clientId });
      expect(targetPeriods).toEqual({ targetPeriods: [targetPeriodsList[0].targetPeriod] });
    });
  });
});
