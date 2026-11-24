jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('../salesGroupLines');

const { randomId, randomString, randomArray } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const SalesGroupLines = require('../salesGroupLines');
const SalesGroup = require('./salesGroup');

describe('SalesGroup Model Tests', () => {
  let mockLean;
  let clientId; let salesGroup;
  beforeEach(async () => {
    const salesLineIds = randomArray();
    mockLean = jest.fn().mockResolvedValue([{ salesLineIds }]);
    jest.spyOn(SalesGroupLines, 'find').mockReturnValue({
      lean: mockLean,
    });

    clientId = randomId();
    salesGroup = new SalesGroup({
      clientId,
      name: randomString(),
      type: 'suspense',
    });
    await salesGroup.save();
  });
  afterEach(jest.restoreAllMocks);

  describe('pre("save") hook', () => {
    let salesLineIds1; let salesLineIds2;
    beforeEach(async () => {
      salesLineIds1 = randomArray();
      salesLineIds2 = randomArray();
      mockLean.mockResolvedValue([{ salesLineIds: salesLineIds1 }, { salesLineIds: salesLineIds2 }]);

      clientId = randomId();
      salesGroup = new SalesGroup({
        clientId,
        name: randomString(),
        type: 'suspense',
      });
      await salesGroup.save();
    });
    it('should call SalesGroupLines.find with the correct parameters', async () => {
      // Assert
      expect(SalesGroupLines.find).toHaveBeenCalledTimes(2);
      expect(SalesGroupLines.find).toHaveBeenCalledWith({ clientId, salesGroupId: salesGroup._id }, { salesLineIds: 1 });
    });
    it('should add up the number of Sales Lines returned and add totalSalesLines to Sales Group', async () => {
      // Assert
      const salesGroupReturned = await SalesGroup.findById(salesGroup._id);
      expect(salesGroupReturned.totalSalesLines).toEqual(salesLineIds1.length + salesLineIds2.length);
    });
  });
});
