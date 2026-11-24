const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Contract = require('../../../models/contract');
const Catalogue = require('./catalogue');

describe('loadContracts', () => {
  it('should recursively load contracts with pagination', async () => {
    // Arrange
    const clientId = randomId();
    const period = { _id: randomId() };
    const periodFile = true;

    const contracts = [];
    for (let i = 0; i < 1500; i += 1) {
      contracts.push({ _id: randomId() });
    }

    jest.spyOn(Contract, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn()
              .mockResolvedValueOnce(contracts.slice(0, 1000))
              .mockResolvedValueOnce(contracts.slice(1000)),
          }),
        }),
      }),
    });
    jest.spyOn(Catalogue, 'loadContracts');

    // Act
    await Catalogue.loadContracts({ clientId, period, periodFile });

    // Assert
    expect(Catalogue.loadContracts).toHaveBeenCalledTimes(2);
    // 1st call should include original params
    expect(Catalogue.loadContracts).toHaveBeenNthCalledWith(1, { clientId, period, periodFile });
    // 2nd call should include original params + recursive pagination params
    expect(Catalogue.loadContracts).toHaveBeenNthCalledWith(2, {
      clientId,
      period,
      periodFile,
      count: 1000,
      lastId: contracts[999]._id,
    });

    expect(Contract.find).toHaveBeenCalledTimes(2);
    // 1st call should not include _id filter
    expect(Contract.find).toHaveBeenNthCalledWith(1, {
      clientId,
      accountingPeriod: period.accountingPeriodType,
    });
    // 2nd call should include _id filter for pagination
    expect(Contract.find).toHaveBeenNthCalledWith(2, {
      clientId,
      accountingPeriod: period.accountingPeriodType,
      _id: { $gt: contracts[999]._id },
    });
  });

  it('should only query active contracts when periodFile is false', async () => {
    // Arrange
    const clientId = randomId();
    const period = { _id: randomId() };
    const periodFile = false;

    jest.spyOn(Contract, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    // Act
    await Catalogue.loadContracts({ clientId, period, periodFile });

    // Assert
    expect(Contract.find).toHaveBeenCalledWith({
      clientId,
      accountingPeriod: period.accountingPeriodType,
      active: true,
    });
  });
});
