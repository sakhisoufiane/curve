process.env.NODE_ENV = 'test';
// require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrDeliveryController, Page } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Work = require('../../../models/work');
const DeliverySchedule = require('../../../models/deliverySchedule');
const DeliveryPartner = require('../../../models/deliveryPartner');

// This test has been migrated to Jest (controllers/deliverySchedule/deliverySchedule.unit.test.js)
// and is being kept here for reference. It will be deleted at a later point.
describe.skip('Delivery Schedule Controller', () => {
  logger.info('\n\n**** .test/unit/controllers/deliverySchedule.controller.test.js');
  let DeliveryScheduleController;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    DeliveryScheduleController = rewire('../../../controllers/deliverySchedule');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('#getQueuedWorks', () => {
    let clientId; let deliveryScheduleId; let tableFilter; let deliveryPartnerId;
    beforeEach((done) => {
      // Vars
      clientId = randomId();
      deliveryScheduleId = randomId();
      tableFilter = { page: randomInt(), limit: randomInt(), orderBy: randomString(), orderDir: randomString() };
      deliveryPartnerId = randomId();
      // Stubs
      sinon.stub(Work, 'paginate');
      Work.paginate.resolves({});

      sinon.stub(DeliveryPartner, 'findById');
      DeliveryPartner.findById.resolves();
      done();
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
      expect(Work.paginate.called).to.be.true;
      expect(Work.paginate.calledWith(queuedWorksFilter, paginationParams)).to.be.true;
    });
    it('should call Page.valueOrDefault', async () => {
      // Arrange
      sinon.stub(Page, 'valueOrDefault').returns();
      // Act
      await DeliveryScheduleController.getQueuedWorks({ query: { tableFilter, deliveryScheduleId }, curveUser: { clientId } });
      // Assert
      expect(Page.valueOrDefault.called).to.be.true;
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

      Work.paginate.resolves(expectedWorksObj);
      // Act
      const works = await DeliveryScheduleController.getQueuedWorks({ query: { tableFilter, deliveryScheduleId }, curveUser: { clientId } });
      // Assert
      expect(works).to.deep.eq(expectedWorksObj);
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

        Work.paginate.resolves(expectedWorksObj);
        // Act
        const works = await DeliveryScheduleController.getQueuedWorks({ query: { tableFilter, deliveryScheduleId }, curveUser: { clientId } });
        // Assert
        expect(works).to.deep.eq(expectedWorksObj);
      });
    });
  });

  describe('#queuedWorks', () => {
    let expectedResult; let mockDeliveryPartnerId;
    beforeEach((done) => {
      mockDeliveryPartnerId = randomId();
      const uncontrolledWorks = [{ _id: randomId(), title: randomString() }];
      expectedResult = { uncontrolledWorks, docs: [{}], total: randomInt(), limit: randomInt(), page: randomInt(), pages: randomInt() };

      sinon.stub(DeliverySchedule, 'findById');
      DeliverySchedule.findById.resolves({ deliveryPartnerId: mockDeliveryPartnerId });

      sinon.stub(DeliveryScheduleController, 'getQueuedWorks');
      DeliveryScheduleController.getQueuedWorks.resolves(expectedResult);

      sinon.stub(CwrDeliveryController, 'getUncontrolledWorks');
      CwrDeliveryController.getUncontrolledWorks.resolves(uncontrolledWorks);
      done();
    });
    it('shoud call getQueuedWorks with the right params', async () => {
      // Act
      await DeliveryScheduleController.queuedWorks({ deliveryId: randomId(), query: {}, curveUser: {} });

      // Assert
      expect(DeliveryScheduleController.getQueuedWorks.calledWith({
        query: {},
        curveUser: {},
        deliveryPartnerId: mockDeliveryPartnerId,
      })).to.be.true;
    });
    it('shoud return Works', async () => {
      // Arrange
      DeliveryScheduleController.getQueuedWorks.resolves(expectedResult);
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
      expect(queuedWorks).to.deep.eq(expectedQueuedWorks);
    });
  });
});
