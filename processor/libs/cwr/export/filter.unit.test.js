const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Filter = require('./filter');

describe('buildWorksFilter', () => {
  it('should call the legacy CwrDeliveryController.buildWorksFilter with the correct parameters', async () => {
    // Arrange
    const delivery = { clientId: randomId() };
    jest.spyOn(CwrDeliveryController, 'buildWorksFilter').mockResolvedValue({});
    jest.spyOn(CwrDeliveryController, 'getUncontrolledWorks').mockResolvedValue([]);

    // Act
    const filter = await Filter.buildWorksFilter({ delivery });

    // Assert
    expect(filter).toBeDefined();
    expect(CwrDeliveryController.buildWorksFilter).toHaveBeenCalledWith({
      status: 'All',
      delivery,
      DeliveryPartner: expect.any(Function),
      Work: expect.any(Function),
      DeliverySchedule: expect.any(Function),
      CwrDelivery: expect.any(Function),
      TerritoryGroup: expect.any(Function),
      DeliveredWork: expect.any(Function),
    });
  });

  it('should exclude uncontrolled works from the filter results', async () => {
    // Arrange
    const delivery = { clientId: randomId() };
    const uncontrolledWorks = [{ _id: randomId() }, { _id: randomId() }];
    jest.spyOn(CwrDeliveryController, 'buildWorksFilter').mockResolvedValue({ title: 'Test Work' });
    jest.spyOn(CwrDeliveryController, 'getUncontrolledWorks').mockResolvedValue(uncontrolledWorks);

    // Act
    const filter = await Filter.buildWorksFilter({ delivery });

    // Assert
    expect(filter).toBeDefined();
    expect(filter).toEqual({
      title: 'Test Work',
      _id: { $nin: uncontrolledWorks.map((work) => work._id) },
    });
  });
});
