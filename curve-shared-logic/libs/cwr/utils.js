/* eslint-disable eqeqeq */
/* eslint-disable no-shadow */
/* eslint-disable consistent-return */
const { ObjectId } = require('mongoose').Types;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { mergeWith, cloneDeep } = require('lodash');
const DeliveredWorkController = require('../../controllers/deliveredWork');
const TerritoryHelper = require('../territoryHelper');
const CwrDeliveryController = require('../../controllers/cwrDelivery');
const { CISAC_APPROVED_TERRITORIES } = require('./territories');

const CwrUtils = this;
/**
   * Grabs the relevant publisher/composer agreement no. based on the receiving party
   *
   * @param {Object} params PublisherAgreements = [], PublisherID = String, CWR Parameters (Including Delivery Partner Object) = {}
   * @returns {Object} Specific agreement object
   */
CwrUtils.getAgreement = async ({ DeliveryPartner, publisherAgreements = [], publisherId, params = {}, allPublisherAgreements = null }) => {
  // When ICE is the receiving party, we must follow certain parameters to return the correct agreement
  if (params.receivingParty === 'ICE') {
    // When ICE agreement exists automatically return the ICE agreement
    const getIceAgreement = publisherAgreements.find((agreement) => agreement.society === 'ICE' && agreement.publisherId == publisherId);
    if (getIceAgreement) { return getIceAgreement; }

    if (!params.deliveryPartner?.subPartners?.length) { return; }

    // If no ICE agreement found, scan through all sub partners
    const subPartnersIds = params.deliveryPartner.subPartners.map((subPartner) => subPartner.partner._id);
    const deliveryPartners = await DeliveryPartner.find({ _id: { $in: subPartnersIds } }, '_id receivingParty').catch(logger.error);
    if (!deliveryPartners.length) { return; }

    const receivingParties = deliveryPartners.map((deliveryPartner) => deliveryPartner.receivingParty);

    // If there is a PRS agreement, we must always default to this agreement first
    const prsAgreement = publisherAgreements.find((agreement) => agreement.society === 'PRS' && agreement.publisherId == publisherId);
    if (receivingParties.includes('PRS') && prsAgreement) {
      return prsAgreement;
    }

    // When a PRS agreement is not set, we should choose any relevant party
    return publisherAgreements.find((agreement) => receivingParties?.includes(agreement.society) && agreement.publisherId == publisherId);
  }

  // When Receiving Party is not ICE, we default to scanning through agreements associated with the Receiving Party
  const agreement = (allPublisherAgreements || publisherAgreements).map((agreement) => {
    if (agreement && agreement.publisherId == publisherId && agreement.society == params.receivingParty) {
      return agreement;
    }
  }).filter(Boolean)[0];

  return agreement;
};

CwrUtils.getWorksMatchingFilter = async ({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, filterType, deliveryFilter, paginationParams, workIds, onlyReturnFilter }) => {
  if (workIds) { return paginationParams?.page ? Work.paginate({ _id: { $in: workIds } }, paginationParams) : Work.find({ _id: { $in: workIds } }); }
  if (filterType === 'newAndUpdated') { return CwrUtils.getNewAndUpdatedWorks({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, paginationParams, onlyReturnFilter, deliveryFilter }); }
  if (filterType === 'manuallyAdded') { return CwrUtils.getManuallyAddedWorks({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, paginationParams, onlyReturnFilter, deliveryFilter }); }
  if (filterType === 'custom') { return CwrUtils.getCustomFilterWorks({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, deliveryFilter, paginationParams, onlyReturnFilter }); }
  if (filterType === 'specific') { return CwrUtils.getSpecificFilterWorks({ Work, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, deliveryFilter, paginationParams, onlyReturnFilter }); }
};

CwrUtils.getNewAndUpdatedWorks = async ({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, paginationParams, onlyReturnFilter, deliveryFilter }) => {
  const deliveryPartnerTerritories = await CwrDeliveryController.getPartnerTerritories({ DeliveryPartner, TerritoryGroup, deliveryPartnerId });
  const aggregationFilter = { clientId, approvalStatus: 'Approved', onHold: { $ne: true }, holdRedelivery: { $ne: new ObjectId(deliveryPartnerId) } };

  if (deliveryPartnerTerritories && deliveryPartnerTerritories.length) {
    aggregationFilter.territories = { $in: deliveryPartnerTerritories };
  }

  const customFieldsAreAllEmpty = CwrUtils.checkIfFilterHasAllNullFields(deliveryFilter);
  if (!customFieldsAreAllEmpty) {
    const customWorksData = await CwrUtils.getCustomFilterWorks({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, deliveryFilter, paginationParams, workIds: null, onlyReturnFilter: false });
    const customWorksArray = Array.isArray(customWorksData) ? customWorksData : customWorksData.docs;
    const customWorkIds = customWorksArray.map((work) => work._id);
    aggregationFilter._id = { $in: customWorkIds };
  }
  const aggregation = [
    { $match: aggregationFilter },
    {
      $project: {
        approvedDate: '$approvedDate',
        significantUpdateDate: '$significantUpdateDate',
        deliveredTo: '$deliveredTo',
        forceRedelivery: '$forceRedelivery',
        originalArraySize: { $size: '$deliveredTo' },
        significantUpdateToPartnerChains: '$significantUpdateToPartnerChains',
      },
    },
    { $unwind: { path: '$deliveredTo', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$significantUpdateToPartnerChains', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        approvedDate: '$approvedDate',
        deliveryPartnerId: '$deliveredTo.deliveryPartnerId',
        deliveredAt: '$deliveredTo.deliveredAt',
        significantUpdateDate: '$significantUpdateDate',
        forceRedelivery: '$forceRedelivery',
        originalArraySize: '$originalArraySize',
        significantUpdatePartnerId: '$significantUpdateToPartnerChains.deliveryPartnerId',
        significantUpdateDateChain: '$significantUpdateToPartnerChains.date',
      },
    },
    {
      $match: {
        $or: [
          // Works that haven't been delivered to this partner - Only approved after launch date of publishing
          {
            $and: [
              { deliveryPartnerId: { $ne: new ObjectId(deliveryPartnerId) } },
              { $expr: { $gte: ['$approvedDate', new Date('2023-08-07')] } },
            ],
          },
          // Works that have been delivered to this partner, but the delivery date is before the significantUpdateDate, and significantUpdateDate After launch date of publishing
          // significantUpdateDate check probably not required as this could only be set after launch, but belts and braces.
          {
            $and: [
              { deliveryPartnerId: new ObjectId(deliveryPartnerId) },
              {
                $or: [
                  // Delivered before significantUpdateDate
                  {
                    $and: [
                      { $expr: { $lte: ['$deliveredAt', '$significantUpdateDate'] } },
                      { $expr: { $gte: ['$significantUpdateDate', new Date('2023-08-07')] } },
                    ],
                  },
                  // Significant updates in significantUpdateToPartnerChains
                  {
                    $and: [
                      { $expr: { $eq: ['$significantUpdatePartnerId', new ObjectId(deliveryPartnerId)] } },
                      { $expr: { $gt: ['$significantUpdateDateChain', '$deliveredAt'] } },
                    ],
                  },
                ],
              },
            ],
          },
          // Works queued for delivery to this partner
          { forceRedelivery: new ObjectId(deliveryPartnerId) },
        ],
      },
    },
    {
      $group: {
        _id: '$_id',
        count: { $sum: 1 },
        originalArraySize: { $first: '$originalArraySize' },
      },
    },
    {
      $match: {
        $or: [
          { originalArraySize: 0 },
          { $expr: { $eq: ['$count', '$originalArraySize'] } },
        ],
      },
    },
  ];

  const worksIds = (await Work.aggregate(aggregation)).map((work) => work._id);

  const filter = { _id: { $in: worksIds } };

  // If onlyReturnFilter is true, return filter and exit, otherwise return works
  if (onlyReturnFilter) return filter;

  let works;
  if (paginationParams?.page) {
    works = await Work.paginate(filter, paginationParams);
  } else {
    works = await Work.find(filter).select({ _id: 1 });
  }

  return works;
};

CwrUtils.getManuallyAddedWorks = async ({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, paginationParams, onlyReturnFilter, deliveryFilter }) => {
  // Build filter;
  const filter = {
    clientId,
    // Get approved works not on hold
    approvalStatus: 'Approved',
    onHold: { $ne: true },
    holdRedelivery: { $ne: new ObjectId(deliveryPartnerId) },
    // Works queued for delivery to this partner
    forceRedelivery: new ObjectId(deliveryPartnerId),
  };

  const customFieldsAreAllEmpty = CwrUtils.checkIfFilterHasAllNullFields(deliveryFilter);
  if (!customFieldsAreAllEmpty) {
    const customWorksData = await CwrUtils.getCustomFilterWorks({ Work, DeliverySchedule, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, deliveryFilter, paginationParams, workIds: null, onlyReturnFilter: false });
    const customWorksArray = Array.isArray(customWorksData) ? customWorksData : customWorksData.docs;
    const customWorkIds = customWorksArray.map((work) => work._id);
    filter._id = { $in: customWorkIds };
  }

  const deliveryPartnerTerritories = await CwrDeliveryController.getPartnerTerritories({ DeliveryPartner, TerritoryGroup, deliveryPartnerId });
  if (deliveryPartnerTerritories && deliveryPartnerTerritories.length) {
    filter.territories = { $in: deliveryPartnerTerritories };
  }
  // If onlyReturnFilter is true, return filter and exit, otherwise return works
  if (onlyReturnFilter) return filter;

  let works;
  if (paginationParams?.page) {
    works = await Work.paginate(filter, paginationParams);
  } else {
    works = await Work.find(filter).select({ _id: 1 });
  }

  return works;
};

CwrUtils.getSpecificFilterWorks = async ({ Work, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, deliveryFilter, paginationParams, onlyReturnFilter }) => {
  // Build filter;
  const filter = {
    clientId,
    // Get approved works not on hold
    approvalStatus: 'Approved',
    onHold: { $ne: true },
    holdRedelivery: { $ne: new ObjectId(deliveryPartnerId) },
    // Works queued for delivery to this partner
  };

  const deliveryPartnerTerritories = await CwrDeliveryController.getPartnerTerritories({ DeliveryPartner, TerritoryGroup, deliveryPartnerId });

  if (deliveryPartnerTerritories && deliveryPartnerTerritories.length) {
    filter.territories = { $in: deliveryPartnerTerritories };
  }
  const objectIds = deliveryFilter?.workIds?.map((id) => new ObjectId(id));
  if (objectIds?.length) {
    filter._id = { $in: objectIds };
  }

  // If onlyReturnFilter is true, return filter and exit, otherwise return works
  if (onlyReturnFilter) return filter;

  const works = await Work.paginate(filter, paginationParams);
  return works;
};

CwrUtils.getCustomFilterWorks = async ({ DeliverySchedule, Work, CwrDelivery, DeliveryPartner, TerritoryGroup, clientId, deliveryPartnerId, deliveryFilter, filter, paginationParams, workIds, onlyReturnFilter }) => {
  // Build filter
  let { worksFilter, deliveredWorksFilter } = filter || await CwrUtils.formWorkFilters({ DeliverySchedule, CwrDelivery, filter: deliveryFilter || {}, clientId, deliveryPartnerId, workIds });

  // If onlyReturnFilter is true, return filter and exit, otherwise return works
  if (onlyReturnFilter) return worksFilter;

  if (!worksFilter) { worksFilter = { clientId }; }
  if (!deliveredWorksFilter) { deliveredWorksFilter = { clientId }; }

  const deliveryPartnerTerritories = await CwrDeliveryController.getPartnerTerritories({ DeliveryPartner, TerritoryGroup, deliveryPartnerId });

  if (deliveryPartnerTerritories && deliveryPartnerTerritories.length) {
    worksFilter.territories = { $in: deliveryPartnerTerritories };
  }
  // Aggregation that joins results from the works and deliveredWorks collections
  const aggregation = [
    // Get the works matching the filter
    {
      $match: worksFilter,
    },
    // Get the deliveredWorks matching the filter and add them to the works
    {
      $lookup:
      {
        from: 'deliveredworks',
        localField: '_id',
        foreignField: 'workId',
        as: 'deliveredWorks',
        pipeline: [
          {
            $match: deliveredWorksFilter,
          },
        ],
      },
    },
    // Create a new document contaning the sum of deliveredWorks matching the deliveredWorks filter for each individual work matching the works filter
    {
      $project: {
        _id: '$_id',
        clientId: '$clientId',
        title: '$title',
        composer: '$composer',
        identifier: '$identifier',
        valid: '$valid',
        validationErrors: '$validationErrors',
        deliveredTo: '$deliveredTo',
        inFutureDelivery: '$inFutureDelivery',
        forceRedelivery: '$forceRedelivery',
        holdRedelivery: '$holdRedelivery',
        deliveredWorks: '$deliveredWorks',
        totalMatchingDeliveries: { $size: '$deliveredWorks' },
      },
    },
  ];

  if (deliveryFilter?.tab === 'deliveryStatuses' && ['Accepted', 'Rejected', 'Delivered'].includes(deliveryFilter?.deliveryStatus)) {
    // Only return the works with at least one deliveredWork matching the deliveredWorks filter, when the deliveredWorks has a status, otherwise return all
    aggregation.push({
      $match: { totalMatchingDeliveries: { $gte: 1 } },
    });
  } else if (deliveryFilter?.tab === 'deliveryStatuses' && ['Queued'].includes(deliveryFilter?.deliveryStatus)) {
    // return all
    const deliverySchedules = await DeliverySchedule.find({ clientId, deliveryPartnerId });
    aggregation.push({
      $match: {
        $or: [
          { inFutureDelivery: { $in: deliverySchedules.map((deliverySchedule) => deliverySchedule._id) } },
          { forceRedelivery: new ObjectId(deliveryPartnerId) },
        ],
      },
    });
  } else {
    // return all
    aggregation.push({
      $match: {
        totalMatchingDeliveries: { $gte: deliveredWorksFilter.status ? 1 : 0 },
      },
    });
  }

  // Handle sorting works by field
  if (deliveryFilter?.orderBy && deliveryFilter?.orderDir) {
    aggregation.push({
      $sort: { [deliveryFilter.orderBy]: deliveryFilter.orderDir === 'desc' ? -1 : 1 },
    });
  }

  // Handle Pagination
  if (paginationParams?.page) {
    paginationParams.limit = paginationParams.limit || 25;
    aggregation.push({
      $facet: {
        works: [{ $skip: (paginationParams.page - 1 < 0 ? 0 : paginationParams.page - 1) * paginationParams.limit }, { $limit: paginationParams.limit }],
        total: [{ $count: 'count' }],
      },
    });
  }

  let results = await Work.aggregate(aggregation);
  if (!paginationParams?.page) {
    results = [{ works: results }];
  }

  const allResults = (deliveryFilter?.tab === 'deliveryStatuses') ? await CwrUtils.statusResults({ DeliverySchedule, results, deliveryPartnerId, clientId }) : results;

  // if a page is supplied to the function, return a pagination object similar to the one used by the paginate plugin
  if (paginationParams?.page) {
    const total = allResults[0]?.total?.[0]?.count || 0;
    const pagination = {
      docs: allResults[0]?.works || [],
      pages: Math.ceil(total / paginationParams.limit),
      total,
    };
    return pagination;
  }
  // If no pagination, result is an array of works
  return allResults[0]?.works || [];
};

// check if all filter fields are null
CwrUtils.checkIfFilterHasAllNullFields = (filter) => Object.values(filter).every((field) => field === null
  || field === undefined
  || (Array.isArray(field) && field.length === 0)
  || (typeof field === 'string' && field.trim() === '')
  || (typeof field === 'object' && Object.keys(field).length === 0));

CwrUtils.formWorkFilters = async ({ DeliverySchedule, CwrDelivery, filter, clientId, deliveryPartnerId, workIds }) => {
  const allFilterFieldsAreNull = CwrUtils.checkIfFilterHasAllNullFields(filter);
  let worksFilter = {};
  const orWorksFilter = [];
  const deliveredWorksFilter = {};
  deliveredWorksFilter.clientId = clientId;

  worksFilter.clientId = clientId;

  // if all filter fields are null, exclude all works
  if (allFilterFieldsAreNull) {
    worksFilter.approvalStatus = { $in: [] };
  } else if (filter?.tab !== 'deliveryStatuses') {
    worksFilter.approvalStatus = 'Approved';
    worksFilter.onHold = { $ne: true };
  } else {
    worksFilter.approvalStatus = 'Approved';
  }

  if (filter?.tab === 'deliveryStatuses' && filter?.deliveryStatus === 'On Hold') {
    orWorksFilter.push({ holdRedelivery: { $in: [new ObjectId(deliveryPartnerId)] } });
    orWorksFilter.push({ onHold: true });
    deliveredWorksFilter.deliveryPartnerId = new ObjectId(deliveryPartnerId);
  } else {
    worksFilter.holdRedelivery = { $ne: new ObjectId(deliveryPartnerId) };
    deliveredWorksFilter.deliveryPartnerId = new ObjectId(deliveryPartnerId);
  }

  if (filter?.territory) {
    if (filter.territory === 'WW') {
      worksFilter.territories = { $in: TerritoryHelper.allTerritories };
    } else if (filter.territory === 'Africa') {
      worksFilter.territories = { $in: TerritoryHelper.africa };
    } else if (filter.territory === 'Americas') {
      worksFilter.territories = { $in: TerritoryHelper.americas };
    } else if (filter.territory === 'Asia') {
      worksFilter.territories = { $in: TerritoryHelper.asia };
    } else if (filter.territory === 'Europe') {
      worksFilter.territories = { $in: TerritoryHelper.europe };
    } else if (filter.territory === 'Oceania') {
      worksFilter.territories = { $in: TerritoryHelper.oceania };
    } else {
      worksFilter.territories = { $in: [filter.territory] };
    }
  }

  if (filter?.includeProductionLibrary === 'true' || filter?.includeProductionLibrary === true) {
    worksFilter.productionLibrary = true;
  }
  if (filter?.excludeProductionLibrary === 'true' || filter?.excludeProductionLibrary === true) {
    worksFilter.productionLibrary = { $ne: true };
  }

  if (filter?.catalogueGroups?.length > 0) {
    worksFilter.catalogueGroups = { $in: filter.catalogueGroups };
  }
  if (filter?.excludeCatalogueGroups?.length > 0) {
    worksFilter.catalogueGroups = { ...worksFilter?.catalogueGroups, $nin: filter.excludeCatalogueGroups };
  }

  if (filter?.composerIds?.length > 0) {
    worksFilter.usedComposerIds = { $in: filter.composerIds };
  }
  if (filter?.excludeComposers?.length > 0) {
    worksFilter.usedComposerIds = { ...worksFilter?.usedComposerIds, $nin: filter.excludeComposers };
  }

  if (filter?.publisherIds?.length > 0) {
    worksFilter.usedPublisherIds = { $in: filter.publisherIds };
  }
  if (filter?.excludePublishers?.length > 0) {
    worksFilter.usedPublisherIds = { ...worksFilter?.usedPublisherIds, $nin: filter.excludePublishers };
  }

  worksFilter.createdAt = {};
  if (filter?.createdAfter) {
    worksFilter.createdAt.$gte = new Date(filter.createdAfter);
  }
  if (filter?.createdBefore) {
    worksFilter.createdAt.$lte = new Date(filter.createdBefore);
  }
  if (Number(filter?.workCreatedNo)) {
    if (filter.workCreatedPeriod === 'Months') {
      const date = new Date();
      date.setMonth(new Date().getMonth() - Number(filter.workCreatedNo));
      worksFilter.createdAt.$gte = date;
    } else {
      const date = new Date();
      date.setDate(new Date().getDate() - Number(filter.workCreatedNo));
      worksFilter.createdAt.$gte = date;
    }
  }
  if (Object.keys(worksFilter.createdAt).length === 0) {
    delete worksFilter.createdAt;
  }

  worksFilter.updatedAt = {};
  if (filter?.modifiedAfter) {
    worksFilter.updatedAt.$gte = new Date(filter.modifiedAfter);
  }
  if (filter?.modifiedBefore) {
    worksFilter.updatedAt.$lte = new Date(filter.modifiedBefore);
  }
  if (Number(filter?.modifiedInLast)) {
    if (filter.modifiedInLastPeriod === 'Months') {
      const date = new Date();
      date.setMonth(new Date().getMonth() - Number(filter.modifiedInLast));
      worksFilter.updatedAt.$gte = date;
    } else {
      const date = new Date();
      date.setDate(new Date().getDate() - Number(filter.modifiedInLast));
      worksFilter.updatedAt.$gte = date;
    }
  }
  if (Object.keys(worksFilter.updatedAt).length === 0) {
    delete worksFilter.updatedAt;
  }

  worksFilter.approvedDate = {};
  if (filter?.approvedAfter) {
    worksFilter.approvedDate.$gte = new Date(filter.approvedAfter);
  }
  if (filter?.approvedBefore) {
    worksFilter.approvedDate.$lte = new Date(filter.approvedBefore);
  }
  if (Number(filter?.approvedInLast)) {
    if (filter.approvedInLastPeriod === 'Months') {
      const date = new Date();
      date.setMonth(new Date().getMonth() - Number(filter.approvedInLast));
      worksFilter.approvedDate.$gte = date;
    } else {
      const date = new Date();
      date.setDate(new Date().getDate() - Number(filter.approvedInLast));
      worksFilter.approvedDate.$gte = date;
    }
  }
  if (Object.keys(worksFilter.approvedDate).length === 0) {
    delete worksFilter.approvedDate;
  }

  if (filter?.deliveryStatus) {
    // get delivery schedule for partner to see if work could be queued for this partner
    const deliverySchedules = await DeliverySchedule.find({ clientId, deliveryPartnerId });
    if (filter.deliveryStatus === 'Undelivered') {
      worksFilter['deliveredTo.deliveryPartnerId'] = {
        $ne: new ObjectId(deliveryPartnerId),
      };
      // Undelivered in deliveredTo but also check that its not queued to go to the partner
      worksFilter.$nor = [
        { inFutureDelivery: { $in: deliverySchedules.map((deliverySchedule) => deliverySchedule._id) } },
        { forceRedelivery: { $eq: new ObjectId(deliveryPartnerId) } },
      ];
    } else if (filter.deliveryStatus === 'Delivered') {
      worksFilter['deliveredTo.deliveryPartnerId'] = new ObjectId(deliveryPartnerId);
      // Delivered in deliveredTo but also check that its not queued to go to the partner
      worksFilter.$nor = [
        { inFutureDelivery: { $in: deliverySchedules.map((deliverySchedule) => deliverySchedule._id) } },
        { forceRedelivery: { $eq: new ObjectId(deliveryPartnerId) } },
      ];
      deliveredWorksFilter.deliveryPartnerId = new ObjectId(deliveryPartnerId);
      deliveredWorksFilter.status = 'Delivered';
    } else if (filter.deliveryStatus === 'Queued') {
      orWorksFilter.push({ inFutureDelivery: { $in: deliverySchedules.map((deliverySchedule) => deliverySchedule._id) } });
      orWorksFilter.push({ forceRedelivery: { $in: [new ObjectId(deliveryPartnerId)] } });
    } else if (filter.deliveryStatus === 'Accepted') {
      // Check deliveredWorks status for this partner but also check that its not queued to go to the partner
      worksFilter.$nor = [
        { inFutureDelivery: { $in: deliverySchedules.map((deliverySchedule) => deliverySchedule._id) } },
        { forceRedelivery: { $eq: new ObjectId(deliveryPartnerId) } },
      ];
      deliveredWorksFilter.deliveryPartnerId = new ObjectId(deliveryPartnerId);
      deliveredWorksFilter.status = { $in: DeliveredWorkController.ackDeliveryStatuses.Accepted };
    } else if (filter.deliveryStatus === 'Rejected') {
      // Check deliveredWorks status for this partner but also check that its not queued to go to the partner
      worksFilter.$nor = [
        { inFutureDelivery: { $in: deliverySchedules.map((deliverySchedule) => deliverySchedule._id) } },
        { forceRedelivery: { $eq: new ObjectId(deliveryPartnerId) } },
      ];
      deliveredWorksFilter.deliveryPartnerId = new ObjectId(deliveryPartnerId);
      deliveredWorksFilter.status = { $in: DeliveredWorkController.ackDeliveryStatuses.Rejected };
    } else if (filter.deliveryStatus === 'Other') {
      worksFilter['deliveredTo.deliveryPartnerId'] = new ObjectId(deliveryPartnerId);
      deliveredWorksFilter.deliveryPartnerId = new ObjectId(deliveryPartnerId);
      deliveredWorksFilter.status = { $nin: [...DeliveredWorkController.ackDeliveryStatuses.Accepted, ...DeliveredWorkController.ackDeliveryStatuses.Rejected, 'Delivered'] };
    }
  }

  // Add $or stage if required
  if (orWorksFilter.length) { worksFilter.$or = orWorksFilter; }

  if (workIds?.length) {
    if (filter?.tab === 'deliveryStatuses') {
      worksFilter._id = { $in: workIds.map((id) => new ObjectId(id)) };
    } else {
      worksFilter = { $or: [worksFilter, { _id: { $in: workIds.map((id) => new ObjectId(id)) } }] };
    }
  }

  if (filter?.deliveryId) {
    const delivery = await CwrDelivery.findOne({ _id: new ObjectId(filter.deliveryId), clientId });
    const workIdsFromDelivery = [];
    delivery?.workIds?.map((workId) => {
      if (workIdsFromDelivery.indexOf(workId) === -1) {
        workIdsFromDelivery.push(workId);
      }
    });

    const workIdObjects = workIdsFromDelivery.map((workId) => new ObjectId(workId));
    if (workIdObjects?.length > 0) {
      worksFilter = { $and: [worksFilter, { _id: { $in: workIdObjects } }] };
    }
  }

  return { worksFilter, deliveredWorksFilter };
};

CwrUtils.foundIdInArray = ({ searchObject, searchArray, id }) => {
  if (Array.isArray(searchObject[searchArray])) {
    return searchObject[searchArray].reduce((found, objectId) => {
      if (found) {
        return true;
      }
      if (objectId.toString() === id) {
        return true;
      }
      return false;
    }, false);
  }
  return false;
};

CwrUtils.scheduledDeliveryQueued = ({ deliverySchedules, queuedArray }) => {
  const idSet = new Set(deliverySchedules.map((deliverySchedule) => deliverySchedule._id.toString()));
  return queuedArray?.some((id) => idSet.has(id.toString()));
};

CwrUtils.statusResults = async ({ DeliverySchedule, results, deliveryPartnerId, clientId }) => {
  const deliverySchedules = await DeliverySchedule.find({ clientId, deliveryPartnerId });
  results.map((result) => {
    const modifiedWorks = result?.works?.map((work) => {
      const modifiedDeliveredWorks = work.deliveredWorks.map((deliveredWork) => {
        deliveredWork.lastUpdate = deliveredWork.updatedAt;
        deliveredWork.originalDelivery = deliveredWork.createdAt;
        deliveredWork.identifier = deliveredWork.iswc;
        if (!deliveredWork.status || deliveredWork.status === 'Delivered') {
          work.deliveredWorkStatus = 'Delivered';
        } else {
          deliveredWork.lastAcknowledgment = deliveredWork.updatedAt;
          deliveredWork.messages = deliveredWork.messages?.length ? deliveredWork.messages.join('. ') : null;
          if (DeliveredWorkController.ackDeliveryStatuses.Accepted.includes(deliveredWork.status)) {
            work.deliveredWorkStatus = 'Accepted';
          } else if (DeliveredWorkController.ackDeliveryStatuses.Rejected.includes(deliveredWork.status)) {
            work.deliveredWorkStatus = 'Rejected';
          } else {
            work.deliveredWorkStatus = 'Other';
          }
        }
        return deliveredWork;
      });
      // Override the delivery status when the delivery is Queued/On Hold
      if (CwrUtils.foundIdInArray({ searchObject: work, searchArray: 'forceRedelivery', id: deliveryPartnerId })) {
        work.deliveredWorkStatus = 'Queued';
      }

      if (CwrUtils.scheduledDeliveryQueued({ deliverySchedules, queuedArray: work.inFutureDelivery })) {
        work.deliveredWorkStatus = 'Queued';
      }

      if (CwrUtils.foundIdInArray({ searchObject: work, searchArray: 'holdRedelivery', id: deliveryPartnerId })) {
        work.deliveredWorkStatus = 'On Hold';
      }

      work.deliveredWorks = modifiedDeliveredWorks;
      return work;
    });
    result.works = modifiedWorks;
    return result;
  });
  return results;
};

CwrUtils.reverseTerritoryMappings = {
  4: 'AF',
  8: 'AL',
  12: 'DZ',
  20: 'AD',
  24: 'AO',
  28: 'AG',
  31: 'AZ',
  32: 'AR',
  36: 'AU',
  40: 'AT',
  44: 'BS',
  48: 'BH',
  50: 'BD',
  51: 'AM',
  52: 'BB',
  56: 'BE',
  64: 'BT',
  68: 'BO',
  70: 'BA',
  72: 'BW',
  76: 'BR',
  84: 'BZ',
  90: 'SB',
  96: 'BN',
  100: 'BG',
  104: 'MM',
  108: 'BI',
  112: 'BY',
  116: 'KH',
  120: 'CM',
  124: 'CA',
  132: 'CV',
  140: 'CF',
  144: 'LK',
  148: 'TD',
  152: 'CL',
  156: 'CN',
  158: 'TW',
  170: 'CO',
  174: 'KM',
  178: 'CG',
  180: 'CD',
  188: 'CR',
  191: 'HR',
  192: 'CU',
  196: 'CY',
  203: 'CZ',
  204: 'BJ',
  208: 'DK',
  212: 'DM',
  214: 'DO',
  218: 'EC',
  222: 'SV',
  226: 'GQ',
  231: 'ET',
  232: 'ER',
  233: 'EE',
  242: 'FJ',
  246: 'FI',
  250: 'FR',
  258: 'PF',
  262: 'DJ',
  266: 'GA',
  268: 'GE',
  270: 'GM',
  276: 'DE',
  288: 'GH',
  296: 'KI',
  300: 'GR',
  308: 'GD',
  320: 'GT',
  324: 'GN',
  328: 'GY',
  332: 'HT',
  336: 'VA',
  340: 'HN',
  344: 'HK',
  348: 'HU',
  352: 'IS',
  356: 'IN',
  360: 'ID',
  364: 'IR',
  368: 'IQ',
  372: 'IE',
  376: 'IL',
  380: 'IT',
  384: 'CI',
  388: 'JM',
  392: 'JP',
  398: 'KZ',
  400: 'JO',
  404: 'KE',
  408: 'KP',
  410: 'KR',
  414: 'KW',
  417: 'KG',
  418: 'LA',
  422: 'LB',
  426: 'LS',
  428: 'LV',
  430: 'LR',
  434: 'LY',
  438: 'LI',
  440: 'LT',
  442: 'LU',
  446: 'MO',
  450: 'MG',
  454: 'MW',
  458: 'MY',
  462: 'MV',
  466: 'ML',
  470: 'MT',
  478: 'MR',
  480: 'MU',
  484: 'MX',
  492: 'MC',
  496: 'MN',
  498: 'MD',
  499: 'ME',
  504: 'MA',
  508: 'MZ',
  512: 'OM',
  516: 'NA',
  520: 'NR',
  524: 'NP',
  528: 'NL',
  540: 'NC',
  548: 'VU',
  554: 'NZ',
  558: 'NI',
  562: 'NE',
  566: 'NG',
  578: 'NO',
  583: 'FM',
  584: 'MH',
  585: 'PW',
  586: 'PK',
  591: 'PA',
  598: 'PG',
  600: 'PY',
  604: 'PE',
  608: 'PH',
  616: 'PL',
  620: 'PT',
  624: 'GW',
  626: 'TL',
  630: 'PR',
  634: 'QA',
  642: 'RO',
  643: 'RU',
  646: 'RW',
  659: 'KN',
  662: 'LC',
  670: 'VC',
  674: 'SM',
  678: 'ST',
  682: 'SA',
  686: 'SN',
  688: 'RS',
  690: 'SC',
  694: 'SL',
  702: 'SG',
  703: 'SK',
  704: 'VN',
  705: 'SI',
  706: 'SO',
  710: 'ZA',
  716: 'ZW',
  724: 'ES',
  728: 'SS',
  729: 'SD',
  732: 'EH',
  740: 'SR',
  748: 'SZ',
  752: 'SE',
  756: 'CH',
  760: 'SY',
  762: 'TJ',
  764: 'TH',
  768: 'TG',
  776: 'TO',
  780: 'TT',
  784: 'AE',
  788: 'TN',
  792: 'TR',
  795: 'TM',
  798: 'TV',
  800: 'UG',
  804: 'UA',
  807: 'MK',
  818: 'EG',
  826: 'GB',
  834: 'TZ',
  840: 'US',
  854: 'BF',
  858: 'UY',
  860: 'UZ',
  862: 'VE',
  882: 'WS',
  887: 'YE',
  894: 'ZM',
  2136: 'WW',
};

// Remove unsupported territories from an array of territory codes
CwrUtils.removeUnsupportedTerritories = ({ territories }) => {
  const territoryMappingValues = Object.values(CISAC_APPROVED_TERRITORIES);
  return territories.filter((code) => territoryMappingValues.includes(code));
};

// Custom lodash _.merge that concatenates territories arrays (to prevent values being overwritten by the default Lodash merge strategy)
CwrUtils.mergeChainLayers = (chain1, chain2) => mergeWith(chain1, chain2, (objValue, srcValue, key) => {
  if ((key === 'territory' || key === 'totalTerritories') && Array.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
});

CwrUtils.consolidateGroups = (territoryGroups) => {
  const clonedGroups = cloneDeep(territoryGroups);
  Object.entries(clonedGroups).forEach(([key, territories]) => {
    territories.forEach((territory) => {
      Object.entries(clonedGroups).forEach(([otherKey, otherTerritories]) => {
        // If a duplicate territory is found in a group, pick the most specific one
        if (key !== otherKey && otherTerritories.includes(territory) && otherTerritories.length > territories.length) {
          // Remove the duplicate territory from the key & value
          const newKey = otherTerritories.filter((t) => t !== territory).join('');
          clonedGroups[newKey] = otherTerritories.filter((item) => item !== territory);
          delete clonedGroups[otherKey];
        }
      });
    });
  });
  return clonedGroups;
};

CwrUtils.consolidatePublisherTerritories = (publisherTerritories, groupedTerritories) => {
  const publisherTerritoriesClone = cloneDeep(publisherTerritories);
  // Loop over original publisher territory chains (from the CWR file)
  for (const [territories] of Object.values(publisherTerritoriesClone)) {
    const [publisherKey] = Object.keys(territories);
    const publisherTerritory = territories[publisherKey];

    // Loop over de-duplicated and grouped territory chains
    for (const territoryGroup of Object.values(groupedTerritories)) {
      const publisherTerritoryCodes = publisherTerritory.map((pt) => TerritoryHelper.parseTerritoryString(pt.territories));

      const [territory] = territoryGroup;
      // If specific territory AND included in publisher territories AND not the same specific territory
      if (territoryGroup.length === 1 && publisherTerritoryCodes.includes(territory) && publisherTerritoryCodes[0] !== territory) {
        const updatedPublisherTerritories = publisherTerritory.filter((pt) => TerritoryHelper.parseTerritoryString(pt.territories) !== territory);
        territories[publisherKey] = updatedPublisherTerritories;
      }
    }
  }

  return publisherTerritoriesClone;
};
