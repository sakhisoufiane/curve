const { CwrDeliveryController, Page } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Work = require('../../models/work');
const DeliverySchedule = require('../../models/deliverySchedule');
const DeliveryPartner = require('../../models/deliveryPartner');

const DeliveryScheduleController = require('./deliverySchedule');

describe('Delivery Schedule Controller', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('#getQueuedWorks', () => {
    let clientId; let deliveryScheduleId; let tableFilter; let deliveryPartnerId;
    beforeEach(() => {
      // Vars
      clientId = randomId();
      deliveryScheduleId = randomId();
      tableFilter = { page: randomInt(), limit: randomInt(), orderBy: randomString(), orderDir: randomString() };
      deliveryPartnerId = randomId();
      // Stubs
      jest.spyOn(Work, 'paginate').mockResolvedValue({});
      jest.spyOn(DeliveryPartner, 'findById').mockResolvedValue(undefined);
    });
    it('shoud call Work.paginate with the correct params', async () => {
      // Arrange
      const paginationParams = {
        page: Page.valueOrDefault(tableFilter.page, 1),
        limit: Page.valueOrDefault(tableFilter.limit, 25),
        sort: Page.sortOrDefault(tableFilter.orderBy, tableFilter.orderDir),
      };

      const queuedWorksFilter = {
        clientId,
        inFutureDelivery: { $in: new ObjectId(deliveryScheduleId) },
      };

      // Act
      await DeliveryScheduleController.getQueuedWorks({ query: { tableFilter, deliveryScheduleId }, curveUser: { clientId }, deliveryPartnerId });
      // Assert
      expect(Work.paginate).toHaveBeenCalled();
      expect(Work.paginate).toHaveBeenCalledWith(queuedWorksFilter, paginationParams);
    });
    it('should call Page.valueOrDefault', async () => {
      // Arrange
      jest.spyOn(Page, 'valueOrDefault').mockReturnValue(undefined);
      // Act
      await DeliveryScheduleController.getQueuedWorks({ query: { tableFilter, deliveryScheduleId }, curveUser: { clientId } });
      // Assert
      expect(Page.valueOrDefault).toHaveBeenCalled();
    });
    it('shoud return Works', async () => {
      // Arrange
      const expectedWorksObj = {
        docs: [{}],
        total: randomInt(),
        limit: randomInt(),
        page: randomInt(),
        pages: randomInt(),
      };

      Work.paginate.mockResolvedValue(expectedWorksObj);
      // Act
      const works = await DeliveryScheduleController.getQueuedWorks({ query: { tableFilter, deliveryScheduleId }, curveUser: { clientId } });
      // Assert
      expect(works).toEqual(expectedWorksObj);
    });
    describe('if Work.Paginate does not find works', () => {
      it('should return an object where the doc field has an empty array', async () => {
        // Arrange
        const expectedWorksObj = {
          docs: [],
          total: randomInt(),
          limit: randomInt(),
          page: randomInt(),
          pages: randomInt(),
        };

        Work.paginate.mockResolvedValue(expectedWorksObj);
        // Act
        const works = await DeliveryScheduleController.getQueuedWorks({ query: { tableFilter, deliveryScheduleId }, curveUser: { clientId } });
        // Assert
        expect(works).toEqual(expectedWorksObj);
      });
    });
  });

  describe('#queuedWorks', () => {
    let expectedResult; let mockDeliveryPartnerId;
    beforeEach(() => {
      mockDeliveryPartnerId = randomId();
      const uncontrolledWorks = [{ _id: randomId(), title: randomString() }];
      expectedResult = { uncontrolledWorks, docs: [{}], total: randomInt(), limit: randomInt(), page: randomInt(), pages: randomInt() };

      jest.spyOn(DeliverySchedule, 'findById').mockResolvedValue({ deliveryPartnerId: mockDeliveryPartnerId });

      jest.spyOn(DeliveryScheduleController, 'getQueuedWorks').mockResolvedValue(expectedResult);

      jest.spyOn(CwrDeliveryController, 'getUncontrolledWorks').mockResolvedValue(uncontrolledWorks);
    });
    it('shoud call getQueuedWorks with the right params', async () => {
      // Act
      await DeliveryScheduleController.queuedWorks({ deliveryId: randomId(), query: {}, curveUser: {} });

      // Assert
      expect(DeliveryScheduleController.getQueuedWorks).toHaveBeenCalledWith({
        query: {},
        curveUser: {},
        deliveryPartnerId: mockDeliveryPartnerId,
      });
    });
    it('shoud return Works', async () => {
      // Arrange
      DeliveryScheduleController.getQueuedWorks.mockResolvedValue(expectedResult);
      const expectedQueuedWorks = {
        uncontrolledWorks: expectedResult.uncontrolledWorks,
        queuedWorks: [{}],
        meta: {
          currentPage: expectedResult.page,
          totalPages: expectedResult.pages,
          total: expectedResult.total,
        },
      };
      // Act
      const queuedWorks = await DeliveryScheduleController.queuedWorks({ query: {}, curveUser: {} });
      // Assert
      expect(queuedWorks).toEqual(expectedQueuedWorks);
    });
  });
});
