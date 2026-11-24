const { Page } = require('@curveroyaltysystems/curve-shared-logic');
const DeliveryLog = require('../models/deliveryLog');

const DeliveryLogs = this;

const paramsToFilterField = ({ workId, deliveryPartnerId }, user) => {
  const params = {};
  if (user.clientId) {
    params.clientId = user.clientId;
  }
  if (workId) params.workId = workId;
  if (deliveryPartnerId) params.deliveryPartnerId = deliveryPartnerId;

  return params;
};

const renamePopulateFields = (logs) => {
  const results = logs.map((log) => {
    const logObject = log.toObject();
    const logs = logObject.log.map((log) => {
      if (log.deliveredWorkId) {
        log.deliveredWork = { ...log.deliveredWorkId };
        delete log.deliveredWorkId;
      }
      if (log.cwrDeliveryId) {
        log.cwrDelivery = { ...log.cwrDeliveryId };
        delete log.cwrDeliveryId;
      }
      if (log.acknowledgementId) {
        log.acknowledgement = { ...log.acknowledgementId };
        delete log.acknowledgementId;
      }
      return log;
    });
    logObject.log = logs;
    return logObject;
  });

  return results;
};

DeliveryLogs.get = async ({ req }) => {
  const paginationParams = {
    page: Page.valueOrDefault(req.query.page, 1),
    limit: Page.valueOrDefault(req.query.limit, 25),
    sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
    select: req.query.select || null,
  };

  const deliveryPartners = await DeliveryLog.paginate(
    paramsToFilterField(req.query, req.curveUser),
    {
      ...paginationParams,
      populate: [
        'log.deliveredWorkId',
        'log.cwrDeliveryId',
        'log.acknowledgementId',
      ],
    },
  );

  const { docs } = deliveryPartners;
  const results = renamePopulateFields(docs);
  return results;
};

DeliveryLogs.getUsingPartnerIds = async ({
  deliveryPartnerIds,
  work,
  user,
}) => {
  const queryParams = {
    clientId: user?.clientId,
    workId: work._id,
    deliveryPartnerId: { $in: deliveryPartnerIds },
  };
  const deliveryPartners = await DeliveryLog.find(queryParams, null, {
    populate: [
      'log.deliveredWorkId',
      'log.cwrDeliveryId',
      'log.acknowledgementId',
    ],
  });

  const results = renamePopulateFields(deliveryPartners);
  return results;
};
