const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const _ = require('lodash');

const DeliveredWorkController = this;

// Add query params to a filter for Works
const paramsToFilterFieldWork = (inputParams, user) => {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.composerIds && inputParams.composerIds.length > 0) { params.usedComposerIds = { $in: inputParams.composerIds }; }
  if (inputParams.publisherIds && inputParams.publisherIds.length > 0) { params.usedPublisherIds = { $in: inputParams.publisherIds }; }
  if (inputParams.status) { params.status = inputParams.status; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }
  return params;
};

// Add query params to a filter for deliveredWorks
const paramsToFilterField = (inputParams, user) => {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.workIds && inputParams.workIds.length > 0) { params.workId = { $in: inputParams.workIds }; }
  if (inputParams.deliveryPartnerId) { params.deliveryPartnerId = inputParams.deliveryPartnerId; }
  if (inputParams.deliveryStatus) { params.status = inputParams.deliveryStatus; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }
  return params;
};

// Store all the ACK delivery statuses here.
DeliveredWorkController.ackDeliveryStatuses = {
  Accepted: ['Accepted', 'Registration Accepted', 'Transaction Accepted', 'Registration Accepted with Changes'],
  Rejected: ['Rejected', 'Claim Rejected', 'Conflict'],
  Duplicate: ['Duplicate'],
  'No Participation': ['No Participation'],
};

// Create a new delivery
DeliveredWorkController.create = async ({ DeliveredWork, delivery }) => {
  logger.debug(`Creating new delivery for work ${delivery?.workId?.toString()} and cwrDelivery ${delivery?.cwrDeliveryId?.toString()}`);
  return new DeliveredWork(delivery).save();
};

// Get a single delivery
DeliveredWorkController.getSingle = async ({ DeliveredWork, filter, select }) => {
  logger.debug(`Getting single delivery matching ${JSON.stringify(filter)}, ${JSON.stringify(select)}`);
  return DeliveredWork.findOne(filter, select);
};

// Get multiple deliveries
DeliveredWorkController.get = async ({ DeliveredWork, req, select }) => {
  const filter = (req.query) ? paramsToFilterField(req.query, req.curveUser) : req;
  logger.debug(`Getting deliveries matching ${JSON.stringify(filter)}, ${JSON.stringify(select)}`);
  return DeliveredWork.find(filter, select);
};

// Count deliveries
DeliveredWorkController.count = async ({ DeliveredWork, filter, select }) => {
  logger.debug(`Counting deliveries matching ${JSON.stringify(filter)}, ${JSON.stringify(select)}`);
  return DeliveredWork.countDocuments(filter);
};

// Returns a list of work IDs base that match a deluivery status
DeliveredWorkController.getWorkIdsByStatus = async ({ DeliveredWork, clientId, cwrDeliveryId, cwrAcknowledgementId, status }) => {
  logger.debug(`Getting ${status} work ids for ${cwrDeliveryId ? 'cwrDelivery' : 'cwrAcknowledgement'}  ${cwrDeliveryId ? cwrDeliveryId?.toString() : cwrAcknowledgementId}`);

  const filter = { clientId };

  if (status && status !== 'All') { filter.status = { $in: DeliveredWorkController.ackDeliveryStatuses[status] }; }

  if (cwrDeliveryId) { filter.cwrDeliveryId = cwrDeliveryId; } else { filter.cwrAcknowledgementId = cwrAcknowledgementId; }

  const deliveries = await DeliveredWork.find(filter, 'workId');

  const workIds = deliveries.map((delivery) => delivery.workId);

  return workIds;
};

// Paginate through deliveries
DeliveredWorkController.paginate = async ({ DeliveredWork, Page, req }) => {
  if (!req.curveUser.clientId || req.curveUser.companyId) { return { status: 403, data: { message: 'Forbidden' } }; }

  // eslint-disable-next-line max-len
  const paginationParams = { page: Page.valueOrDefault(req.query.page, 1), limit: Page.valueOrDefault(req.query.limit, 25), sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir) };
  const result = await DeliveredWork.paginate(paramsToFilterField(req.query, req.curveUser), paginationParams);

  return { status: 200, data: { deliveries: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } } };
};

// get associated work data
DeliveredWorkController.getWorkData = async ({ Work, req, deliveries, select }) => {
  const works = await Work.find(paramsToFilterFieldWork(req.query, req.curveUser), select);
  const selectFields = select.split(' ');
  const combinedData = deliveries.map((deliveredWork) => {
    const foundWork = works.find((work) => work._id.equals(deliveredWork._doc.workId));
    if (foundWork) {
      selectFields.map((selectField) => {
        deliveredWork._doc[selectField] = foundWork[selectField];
      });
    }
    return deliveredWork;
  });
  return combinedData;
};

DeliveredWorkController.getAcknowledgementFileWorks = async ({ DeliveredWork, clientId, cwrAcknowledgementId, cwrDeliveryId, status, paginationParams }) => {
  const filter = {
    clientId,
  };
  if (cwrDeliveryId && ObjectId.isValid(cwrDeliveryId)) {
    filter.$or = [
      { cwrAcknowledgementId },
      { cwrDeliveryId: new ObjectId(cwrDeliveryId) },
    ];
  } else {
    filter.cwrAcknowledgementId = cwrAcknowledgementId;
  }
  if (status && status !== 'All') {
    filter.status = {
      $in: DeliveredWorkController.ackDeliveryStatuses[status],
    };
  }

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
      deliveredWorks: [{ $skip: (paginationParams.page - 1 < 0 ? 0 : paginationParams.page - 1) * paginationParams.limit }, { $limit: paginationParams.limit }],
      total: [{ $count: 'count' }],
    },
  });

  const results = await DeliveredWork.aggregate(aggregation);

  const mappedWorks = results[0].deliveredWorks.map((deliveredWork) => ({
    _id: deliveredWork.workId?._id,
    title: deliveredWork.workId?.title,
    composer: deliveredWork.workId?.composer,
    identifier: deliveredWork.workId?.identifier,
    partnerId: deliveredWork.partnerId,
    iswc: deliveredWork.iswc,
    status: deliveredWork.status,
    messages: deliveredWork?.messages,
  }));

  const total = results[0]?.total?.[0]?.count || 0;
  const pagination = {
    works: mappedWorks,
    meta: {
      currentPage: paginationParams.page,
      totalPages: Math.ceil(total / paginationParams.limit),
      total,
    },
  };

  return pagination;
};

module.exports = DeliveredWorkController;
