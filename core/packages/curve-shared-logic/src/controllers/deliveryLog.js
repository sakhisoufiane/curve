const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const { ObjectId } = require('mongodb');

const DeliveryLogController = this;

// Adds a DeliveryLog entry with available data.
DeliveryLogController.addLog = async ({ DeliveryLog, clientId, deliveryPartnerId, workId, deliveredWorkId, cwrDeliveryId, cwrAcknowledgementId, status, action }) => {
  const log = await DeliveryLog.updateOne(
    { clientId, deliveryPartnerId, workId },
    {
      $push: {
        log: {
          deliveredWorkId,
          cwrDeliveryId,
          cwrAcknowledgementId,
          status,
          action,
          date: moment().format(),
        },
      },
      $setOnInsert: { clientId, deliveryPartnerId, workId },
    },
    { upsert: true },
  );

  return log;
};

// Returns a list of work IDs base that match a delivery status
DeliveryLogController.getWorkIdsByStatus = async ({ DeliveryLog, clientId, cwrDeliveryId, cwrAcknowledgementId, deliveryPartnerId, status }) => {
  logger.debug(`Getting ${status} work ids for ${cwrDeliveryId ? 'cwrDelivery' : 'cwrAcknowledgement'}  ${cwrDeliveryId ? cwrDeliveryId?.toString() : cwrAcknowledgementId}`);

  const $elemMatch = {
    acknowledgementId: cwrAcknowledgementId,
  };

  if (status && status !== 'All') {
    $elemMatch.status = { $in: DeliveryLogController.ackDeliveryStatuses[status] };
  }

  const filter = {
    clientId,
    deliveryPartnerId,
    log: { $elemMatch },
  };

  const results = await DeliveryLog.find(filter);

  const workIds = results.map((delivery) => delivery.workId);

  return workIds;
};

DeliveryLogController.getAcknowledgementFileWorks = async ({ DeliveryLog, clientId, cwrAcknowledgementId, deliveryPartnerId, cwrDeliveryId, status, paginationParams }) => {
  // find log matching this acknowledgement
  const logQuery = { $elemMatch: { acknowledgementId: new ObjectId(cwrAcknowledgementId) } };
  // if querying on status, the log entry must match BOTH acknowledgement and status
  if (status && status !== 'All') {
    logQuery.$elemMatch.status = { $in: DeliveryLogController.ackDeliveryStatuses[status] };
  }
  const filter = {
    clientId,
    deliveryPartnerId: new ObjectId(deliveryPartnerId),
    log: logQuery,
  };

  const aggregation = [
    {
      $match: filter,
    },
    {
      $lookup:
        {
          from: 'works',
          localField: 'workId',
          foreignField: '_id',
          as: 'workId',
          pipeline: [{
            $project: {
              title: 1,
              composer: 1,
              identifier: 1,
            },
          }],
        },
    },
    {
      $unwind: '$workId',
    },
  ];

  if (paginationParams?.orderBy && paginationParams?.orderDir) {
    aggregation.push({
      $sort: { [paginationParams.orderBy]: paginationParams.orderDir === 'desc' ? -1 : 1 },
    });
  }

  paginationParams.limit = paginationParams.limit || 25;
  aggregation.push({
    $facet: {
      deliveryLogs: [{ $skip: (paginationParams.page - 1 < 0 ? 0 : paginationParams.page - 1) * paginationParams.limit }, { $limit: paginationParams.limit }],
      total: [{ $count: 'count' }],
    },
  });

  const results = await DeliveryLog.aggregate(aggregation);

  const total = results[0]?.total?.[0]?.count || 0;
  const pagination = {
    deliveryLogs: results[0]?.deliveryLogs,
    meta: {
      currentPage: paginationParams.page,
      totalPages: Math.ceil(total / paginationParams.limit),
      total,
    },
  };

  return pagination;
};

// Store all the ACK delivery statuses here.
DeliveryLogController.ackDeliveryStatuses = {
  Accepted: ['Accepted', 'Registration Accepted', 'Transaction Accepted', 'Registration Accepted with Changes'],
  Rejected: ['Rejected', 'Claim Rejected', 'Conflict'],
  Duplicate: ['Duplicate'],
  'No Participation': ['No Participation'],
};

module.exports = DeliveryLogController;
