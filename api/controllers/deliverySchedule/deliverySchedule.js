const { CwrDeliveryController, Page } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const Work = require('../../models/work');
const DeliverySchedule = require('../../models/deliverySchedule');
const DeliveryPartner = require('../../models/deliveryPartner');
const CwrDelivery = require('../../models/cwrDelivery');
const TerritoryGroup = require('../../models/territoryGroup');

const DeliveryScheduleController = this;

DeliveryScheduleController.getQueuedWorks = async ({ query, curveUser, deliveryPartnerId }) => {
  const { tableFilter, deliveryScheduleId } = query;

  const paginationParams = {
    page: Page.valueOrDefault(tableFilter.page, 1),
    limit: Page.valueOrDefault(tableFilter.limit, 25),
    sort: Page.sortOrDefault(tableFilter.orderBy, tableFilter.orderDir),
  };

  const queuedWorksFilter = {
    clientId: curveUser.clientId,
    inFutureDelivery: { $in: new ObjectId(deliveryScheduleId) },
  };

  const deliveryPartnerTerritories = await CwrDeliveryController.getPartnerTerritories({ DeliveryPartner, TerritoryGroup, deliveryPartnerId });
  if (deliveryPartnerTerritories && deliveryPartnerTerritories.length) {
    queuedWorksFilter.territories = { $in: deliveryPartnerTerritories };
  }
  const works = await Work.paginate(queuedWorksFilter, paginationParams);
  works.pages = works?.totalPages;
  works.total = works?.totalDocs;

  return works;
};

DeliveryScheduleController.queuedWorks = async ({ deliveryId, query, curveUser }) => {
  const deliverySchedule = await DeliverySchedule.findById(deliveryId);
  if (!deliverySchedule) throw new Error(`No Delivery Schedule found with ID: ${deliveryId}`);

  const result = await DeliveryScheduleController.getQueuedWorks({ query, curveUser, deliveryPartnerId: deliverySchedule.deliveryPartnerId });
  const filter = {
    clientId: curveUser.clientId,
  };

  const uncontrolledWorks = await CwrDeliveryController.getUncontrolledWorks({
    Work,
    DeliveryPartner,
    TerritoryGroup,
    DeliverySchedule,
    CwrDelivery,
    cwrDelivery: deliverySchedule,
    query: filter });
  const queuedWorks = {
    uncontrolledWorks,
    queuedWorks: result.docs,
    meta: {
      currentPage: result.page,
      totalPages: result.pages,
      total: result.total,
    },
  };

  return queuedWorks;
};

module.exports = DeliveryScheduleController;
