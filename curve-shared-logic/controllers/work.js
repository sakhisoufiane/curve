/* eslint-disable consistent-return */
const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit, eachSeries } = require('async');
const moment = require('moment');
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const appRootDir = require('app-root-dir').get();
const DeliveredWorkController = require('./deliveredWork');

const utils = require('../libs/utils');
const Exports = require('../libs/exports');
const WriteCsv = require('../libs/writeCsv');

const Page = require('../libs/page');
const Projection = require('../libs/modelProjection');
const CwrUtils = require('../libs/cwr/utils');
const TerritoryHelper = require('../libs/territoryHelper');

const DeliveryLogController = require('./deliveryLog');

const WorkController = this;

WorkController.workSearchParams = {
  searchIndex: 'workSearch',
  filterItems: [
    { name: 'contractIds', field: 'salesReturnsRights.contractId', type: 'text' },
    { name: 'catalogueGroups', field: 'catalogueGroups', type: 'text' },
    { name: 'createdAfter', field: 'createdAt', type: 'after' },
    { name: 'createdBefore', field: 'createdAt', type: 'before' },
    { name: 'composerIds', field: 'usedComposerIds', type: 'text' },
    { name: 'publisherIds', field: 'usedPublisherIds', type: 'text' },
    { name: 'onHold', field: 'onHold', type: 'boolean' },
    { name: 'approvalStatus', field: 'approvalStatus', type: 'text' },
    { name: 'participation', field: 'totalParticipation', type: 'equalLessGreaterThan' },
    { name: 'ownership', field: 'totalCollection.totalOwnedMechanical', type: 'equalLessGreaterThan' },
    { name: 'ids', field: '_id', type: 'objectIds' },
    { name: 'identifiers', field: 'identifier', type: 'text' },
  ],
  payeeFilterFields: ['salesReturnsRights.contractId'],
  textSearchFields: ['title', 'composer', 'identifier', 'iswc', 'tunecode', 'aliases', 'societyIdentifiers.identifier', 'foreignId', 'projectId'],
};

WorkController.checkIswcIasEligibility = async ({ work, Composer }) => {
  if (work.iswc) { return false; }
  if (!work.title) { return false; }
  if (!work.identifier) { return false; }

  let foundFaultyComposer = false;
  let foundValidComposer = false;
  const searchChildren = async (children) => {
    if (children && children.length > 0 && !foundFaultyComposer) {
      for (let i = 0; i < children.length; i += 1) {
        if (children[i]) {
          if (children[i].type === 'Composer') {
            // eslint-disable-next-line no-await-in-loop
            const composer = await Composer.findOne({ _id: new ObjectId(children[i].composerId), clientId: work.clientId });
            if (composer?.cae && composer?.cae !== '00000000000') {
              foundValidComposer = true;
            } else {
              foundFaultyComposer = true;
              break;
            }
          }
          // eslint-disable-next-line no-await-in-loop
          await searchChildren(children[i].children);
        }
      }
    }
  };
  await searchChildren(work.rightsChain);

  if (!(!foundFaultyComposer && foundValidComposer)) {
    return false;
  }

  return true;
};

WorkController.checkIswcIrsEligibility = async ({ work, Composer }) => {
  if (work.iswc) { return false; }
  if (!work.title) { return false; }
  if (!work.identifier) { return false; }

  let allWritersHaveIpi = true;
  let controlledWriterWithIpi = false;

  const searchChildren = async (children) => {
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i += 1) {
        if (children[i]) {
          if (children[i].type === 'Composer' && children[i].controlled) {
            // eslint-disable-next-line no-await-in-loop
            const composer = await Composer.findOne({ _id: new ObjectId(children[i].composerId), clientId: work.clientId });
            if (composer?.cae && composer?.cae !== '00000000000') {
              controlledWriterWithIpi = true;
            } else {
              allWritersHaveIpi = false;
            }
          } else if (children[i].type === 'Composer' && !children[i].controlled) {
            // eslint-disable-next-line no-await-in-loop
            const composer = await Composer.findOne({ _id: new ObjectId(children[i].composerId), clientId: work.clientId });
            if (!composer?.cae && composer?.cae !== '00000000000') {
              allWritersHaveIpi = false;
            }
          }
          // eslint-disable-next-line no-await-in-loop
          await searchChildren(children[i].children);
        }
      }
    }
  };
  await searchChildren(work.rightsChain);

  if (allWritersHaveIpi || (controlledWriterWithIpi && work.societyIdentifiers.length > 0)) {
    return true;
  }

  return false;
};

WorkController.checkIswcEligibility = async ({ work, Composer }) => {
  work.isIswcIrsEligible = await WorkController.checkIswcIrsEligibility({ work, Composer });
  work.isIswcIasEligible = await WorkController.checkIswcIasEligibility({ work, Composer });
};

WorkController.significantUpdateCheck = ({ work, oldWork }) => {
  const rightsChainObjectSort = (item) => {
    const sortByIds = (a, b) => {
      if ((a.publisherId || a.composerId) < (b.publisherId || b.composerId)) {
        return -1;
      }
      return 1;
    };

    for (const child in item) {
      if (!item[child]) { delete item[child]; }
    }
    if (item?.children?.length > 0) {
      item.children.sort(sortByIds);
      for (let i = 0; i < item.children.length; i += 1) {
        rightsChainObjectSort(item.children[i]);
      }
    }
  };

  const rightsChainSort = (arrOrg = []) => {
    const arr = JSON.parse(JSON.stringify(arrOrg));

    for (let i = 0; i < arr.length; i += 1) {
      rightsChainObjectSort(arr[i]);
    }

    return arr;
  };

  const compareArrays = (arr1 = [], arr2 = []) => {
    if (arr1.length !== arr2.length) {
      return false; // If the arrays have different lengths, they are not equal
    }
    const sortedArr1 = arr1.slice().sort(); // sorted copy of arr1
    const sortedArr2 = arr2.slice().sort(); // sorted copy of arr2
    return sortedArr1.every((value, index) => value === sortedArr2[index]);
  };

  const removeValuesFunction = (value = {}) => {
    const removalValues = ['totalMechanicalOwnership', 'totalPerformanceOwnership', 'totalMechanicalCollection', 'totalPerformanceCollection'];
    // Remove values based on the keys
    removalValues.forEach((key) => {
      delete value[key];
    });
    // Turn children into strings for a more fixed comparison
    value.children = childrenToStrings(value.children);
    return value;
  };

  const childrenToStrings = (array = []) => {
    const outputStrings = array.map((child) => (child ? childToString(child) : null)).filter(Boolean);
    return outputStrings;
  };

  const childToString = (input = {}) => {
    let output = '';
    // Only include the defined list of values that are important, and always include in the same order
    ['type', 'composerId', 'publisherId', 'controlled', 'mechanicalOwnership', 'mechanicalCollection', 'performanceOwnership', 'performanceCollection', 'contractType'].forEach((key) => {
      if (input[key]) {
        // Force value to string
        output += `${input[key]}`;
      }
    });
    // If children, run on the array, and then join to the main string
    if (input.children) {
      const childStrings = childrenToStrings(input.children);
      output += childStrings;
    }
    return output;
  };

  const compareObjectArrays = (arrOrg1 = [], arrOrg2 = []) => {
    let arr1 = JSON.parse(JSON.stringify(arrOrg1));
    let arr2 = JSON.parse(JSON.stringify(arrOrg2));

    // Restructure the outputs
    arr1 = arr1.map(removeValuesFunction);
    arr2 = arr2.map(removeValuesFunction);

    for (let a = 0; a < arr1.length; a += 1) {
      let objectFound = false;
      let indexEliminate;

      for (let b = 0; b < arr1.length; b += 1) {
        if (JSON.stringify(arr1[a]) === JSON.stringify(arr2[b])) {
          objectFound = true;
          indexEliminate = b;
          break;
        }
      }

      if (!objectFound) {
        return false;
      }
      arr2.splice(indexEliminate, 1);
    }

    if (arr2.length === 0) {
      return true;
    }

    return false;
  };

  const oldRightsChainSorted = rightsChainSort(oldWork?.rightsChain || []);
  const newRightsChainSorted = rightsChainSort(work?.rightsChain || []);
  const significantUpdateChanges = [];

  if (oldWork?.title !== work?.title) {
    significantUpdateChanges.push('title');
  }
  if (!compareObjectArrays(oldRightsChainSorted, newRightsChainSorted)) {
    significantUpdateChanges.push('rightsChain');
  }
  // Removing for now but keeping here as we may decide to add this back
  // for (let i = 0; i < oldWork?.partnerRightsChains?.length; i += 1) {
  //   const oldChain = oldWork?.partnerRightsChains[i] ?? [];
  //   const newChain = work?.partnerRightsChains[i] ?? [];
  //   if (!compareObjectArrays(oldChain.rightsChain, newChain.rightsChain)) {
  //     significantUpdateChanges.push('partnerRightsChains');
  //     break;
  //   }
  // }
  if (oldWork?.territories) {
    // Filter out any invalid territories so the comparison for detecting changes is correct (can be removed eventually)
    const validOldTerritories = oldWork.territories.filter((t) => TerritoryHelper.allTerritories.includes(t));
    const validNewTerritories = work.territories.filter((t) => TerritoryHelper.allTerritories.includes(t));
    if (!compareArrays(validOldTerritories, validNewTerritories)) {
      significantUpdateChanges.push('territories');
    }
  }
  return significantUpdateChanges;
};

WorkController.getSingleWorkDeliveries = async ({ DeliveryPartner, DeliveredWork, DeliverySchedule, work }) => {
  if (!work) throw (Error('A work is required to get the list of deliveries'));

  const deliveries = [];

  // Get list of client's delivery partners
  const partners = DeliveryPartner.find({ clientId: work.clientId }, 'name');
  // Loop through the delivery partners and add a new delivery for each one of them
  await eachLimit(partners, 10, async (partner) => {
    const delivery = {
      _id: null,
      deliveryPartner: partner,
      identifier: null,
      originalDelivery: null,
      lastUpdate: null,
      lastAcknowledgment: null,
      status: 'Undelivered',
      cwrAcknowledgementId: null,
    };
    // Get the latest deliveredWork to this partner
    const deliveredWork = await DeliveredWork.findOne({ clientId: work.clientId, workId: work._id, deliveryPartnerId: partner._id }).sort({ deliveryDate: -1 });

    // If the work has been delivered to the partner
    if (deliveredWork) {
      delivery._id = deliveredWork._id;
      delivery.lastUpdate = deliveredWork.updatedAt;
      delivery.originalDelivery = deliveredWork.createdAt;
      // Not entirely sure why we need to referece _doc here specifically, but partnerId was not available otherwise.
      // All other values appear to be available from the root item
      delivery.identifier = deliveredWork._doc.partnerId;
      if (!deliveredWork.status || deliveredWork.status === 'Delivered') {
        delivery.status = 'Delivered';
      } else {
        delivery.lastAcknowledgment = deliveredWork.updatedAt;
        delivery.cwrAcknowledgementId = deliveredWork.cwrAcknowledgementId?.toString();
        delivery.messages = deliveredWork.messages?.length ? deliveredWork.messages.join('. ') : null;
        if (DeliveredWorkController.ackDeliveryStatuses.Accepted.includes(deliveredWork.status)) {
          delivery.status = 'Accepted';
        } else if (DeliveredWorkController.ackDeliveryStatuses.Rejected.includes(deliveredWork.status)) {
          delivery.status = 'Rejected';
        } else {
          delivery.status = 'Other';
        }
      }
    }

    const deliverySchedules = await DeliverySchedule.find({ clientId: work.clientId, deliveryPartnerId: partner._id });

    // Override the delivery status when the delivery is Queued/On Hold
    if (work.forceRedelivery.includes(partner._id) || deliverySchedules.some((schedule) => work?.inFutureDelivery?.includes(schedule._id))) {
      delivery.status = 'Queued';
    }

    if (work.holdRedelivery.includes(partner._id)) {
      delivery.status = 'On Hold';
    }

    deliveries.push(delivery);
  });
  // console.log(deliveries);
  return deliveries.sort((a, b) => {
    if (a.deliveryPartner.name && b.deliveryPartner.name) {
      return a.deliveryPartner.name.localeCompare(b.deliveryPartner.name);
    }
  });
};

WorkController.updateDeliveryStatus = async ({ DeliverySchedule, DeliveryLog, DeliveredWork, work, deliveries }) => {
  await eachLimit(deliveries, 10, async (deliveryObject) => {
    if (deliveryObject.newStatus === 'Force Delivery') {
      if (!work.forceRedelivery.includes(deliveryObject.deliveryPartner?._id)) {
        work.forceRedelivery.push(deliveryObject.deliveryPartner?._id);
      }
      if (work.holdRedelivery.includes(deliveryObject.deliveryPartner?._id)) {
        const index = work.holdRedelivery.indexOf(deliveryObject.deliveryPartner?._id);
        work.holdRedelivery.splice(index, 1);
      }
    } else if (deliveryObject.newStatus === 'Resume') {
      if (work.holdRedelivery.includes(deliveryObject.deliveryPartner?._id)) {
        const index = work.holdRedelivery.indexOf(deliveryObject.deliveryPartner?._id);
        work.holdRedelivery.splice(index, 1);
      }
    } else if (deliveryObject.newStatus === 'Hold') {
      const deliverySchedules = await DeliverySchedule.find({ clientId: work.clientId, deliveryPartnerId: deliveryObject.deliveryPartner?._id });
      if (!work.holdRedelivery.includes(deliveryObject.deliveryPartner?._id)) {
        work.holdRedelivery.push(deliveryObject.deliveryPartner?._id);
      }
      if (deliverySchedules.some((schedule) => work?.inFutureDelivery?.includes(schedule._id))) {
        work.inFutureDelivery = removeOccurrences(work.inFutureDelivery, deliverySchedules);
      }
    } else {
      let deliveredWork;
      clearWorkDeliveryArray({ DeliverySchedule, work, deliveryPartnerId: deliveryObject.deliveryPartner?._id });
      if (deliveryObject._id) {
        deliveredWork = await DeliveredWork.findById(deliveryObject._id);
        deliveredWork.status = deliveryObject.newStatus === 'Mark Accepted' ? 'Accepted' : 'Delivered';
        await deliveredWork.save();
        const deliverySchedules = await DeliverySchedule.find({ clientId: work.clientId, deliveryPartnerId: deliveryObject.deliveryPartner?._id });
        if (deliverySchedules.some((schedule) => work?.inFutureDelivery?.includes(schedule._id))) {
          work.inFutureDelivery = removeOccurrences(work.inFutureDelivery, deliverySchedules);
        }
      } else {
        deliveredWork = new DeliveredWork({
          clientId: work.clientId,
          workId: work._id,
          deliveryPartnerId: deliveryObject.deliveryPartner?._id,
          status: deliveryObject.newStatus === 'Mark Accepted' ? 'Accepted' : 'Delivered',
          deliveryDate: moment().format(),
          userCreated: true,
        });
        await deliveredWork.save();
        const deliverySchedules = await DeliverySchedule.find({ clientId: work.clientId, deliveryPartnerId: deliveryObject.deliveryPartner?._id });
        if (deliverySchedules.some((schedule) => work?.inFutureDelivery?.includes(schedule._id))) {
          work.inFutureDelivery = removeOccurrences(work.inFutureDelivery, deliverySchedules);
        }
      }

      await DeliveryLogController.addLog({
        DeliveryLog,
        clientId: work.clientId,
        deliveryPartnerId: deliveryObject.deliveryPartner?._id,
        workId: work._id,
        deliveredWorkId: deliveredWork._id,
        status: deliveryObject.newStatus === 'Mark Accepted' ? 'Accepted' : 'Delivered',
        action: 'Manual',
      });
    }
  });
  await work.save(); // save work once, after all the updates have been made
};

WorkController.bulkUpdateDeliveryStatus = async ({ Work, Payee, DeliveryLog, DeliveredWork, DeliverySchedule, req }) => {
  // eslint-disable-next-line global-require
  const { isUserForbidden } = require('../libs/userAccess');
  // Keep here temporarily until we move all logic from models
  // eslint-disable-next-line global-require

  const { ids, filter, deliveryPartnerIds, deliveryStatus } = req.body;
  const { clientId } = req.curveUser;

  const partnerIds = deliveryPartnerIds ? deliveryPartnerIds.filter((id) => (id.length === 24 && ObjectId.isValid(id))) : null;

  let workIds = [];
  if (ids.length) {
    workIds = ids.filter((id) => (id.length === 24 && ObjectId.isValid(id)));
  } else {
    const searchParams = { ...WorkController.workSearchParams, project: { _id: 1 } };
    const result = await utils.atlasSearch({ Payee, Model: Work, query: filter, user: req.curveUser, params: searchParams });
    workIds = result.docs.map((work) => work._id);
  }

  await eachLimit(workIds, 10, async (workId) => {
    const work = await Work.findById(workId);
    await eachLimit(partnerIds, 10, async (deliveryPartnerId) => {
      clearWorkDeliveryArray({ DeliverySchedule, work, deliveryPartnerId: new ObjectId(deliveryPartnerId) });

      let deliveredWork = await DeliveredWork.findOne({ clientId, workId, deliveryPartnerId });
      if (deliveredWork) {
        deliveredWork.status = deliveryStatus;
        if (!await isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: deliveredWork, clientOnly: true })) {
          await deliveredWork.save();
        }
      } else {
        deliveredWork = await new DeliveredWork({
          DeliveryLog,
          clientId,
          workId,
          deliveryPartnerId,
          status: deliveryStatus,
          deliveryDate: moment().format(),
          userCreated: true,
        });
        if (!await isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: deliveredWork, clientOnly: true })) {
          await deliveredWork.save();
        }
      }
      await DeliveryLogController.addLog({
        DeliveryLog,
        clientId,
        deliveryPartnerId,
        workId,
        deliveredWorkId: deliveredWork._id,
        status: deliveryStatus,
        action: 'Manual',
      });
    });

    await work.save();
  });
};

const clearWorkDeliveryArray = async ({ DeliverySchedule, work, deliveryPartnerId }) => {
  const deliverySchedules = await DeliverySchedule.find({ clientId: work.clientId, deliveryPartnerId });

  if (work?.forceRedelivery?.includes(deliveryPartnerId)) {
    const index = work.forceRedelivery.indexOf(deliveryPartnerId);
    work.forceRedelivery.splice(index, 1);
  }
  if (deliverySchedules.some((schedule) => work?.inFutureDelivery?.includes(schedule._id))) {
    work.inFutureDelivery = removeOccurrences(work.inFutureDelivery, deliverySchedules);
  }
  if (work?.holdRedelivery?.includes(deliveryPartnerId)) {
    const index = work.holdRedelivery.indexOf(deliveryPartnerId);
    work.holdRedelivery.splice(index, 1);
  }
};

const removeOccurrences = (inFutureDelivery, deliverySchedules) => {
  if (!Array.isArray(inFutureDelivery) || !Array.isArray(deliverySchedules)) {
    return null; // Return null or handle the invalid input case
  }
  const updatedArray = inFutureDelivery.filter((id) => !deliverySchedules.some((deliverySchedule) => deliverySchedule._id.toString() === id.toString()));

  return updatedArray;
};

WorkController.createMany = async ({ Payee, Work, UnmappedWork, req }) => {
  // eslint-disable-next-line global-require
  const { isUserForbidden } = require('../libs/userAccess');
  const { clientId, id: createdBy, id: lastModifiedBy } = req.curveUser;
  const { works } = req.body;

  if (!Array.isArray(works)) {
    return { status: 500, response: { message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' } };
  }
  const created = [];
  const failed = [];
  // Loop through works to ensure they are created and validated one by one
  await eachSeries(works, async (work) => {
    const newWork = new Work({
      title: work?.title,
      identifier: work?.identifier,
      iswc: work?.iswc,
      tunecode: work?.tunecode,
      clientId,
      createdBy,
      lastModifiedBy,
      societyIdentifiers: work?.societyIdentifiers,
    });

    if (!await isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: newWork, clientOnly: true })) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await newWork.save();
        created.push(work.index);

        if (work.unmappedWorkIds?.length > 0) {
          await UnmappedWork.updateMany({ _id: { $in: work.unmappedWorkIds } }, { $set: { workId: newWork._id.toString(), complete: true } }).catch(logger.error);
        }
      } catch (saveErr) {
        failed.push(work.index);
      }
    } else {
      failed.push(work.index);
    }
  });

  const response = {
    created,
    failed,
  };

  return { status: 200, response };
};

WorkController.updateWorksWithFilter = async ({ Work, Payee, CwrDelivery, DeliveryPartner, TerritoryGroup, DeliverySchedule, DeliveredWork, DeliveryLog, Notification, req }) => {
  const result = await CwrUtils.getCustomFilterWorks({
    DeliverySchedule,
    Work,
    CwrDelivery,
    DeliveryPartner,
    TerritoryGroup,
    clientId: req.curveUser.clientId,
    deliveryPartnerId: req.body.deliveryPartnerId,
    deliveryFilter: req.body.filter,
    workIds: req.body.filter?.workIds,
    paginationParams: {},
  });

  const workIds = result.map((work) => work._id.toString());

  if (req.body.deliveryStatus) {
    req.body.deliveryPartnerIds = [req.body.deliveryPartnerId];
    req.body.ids = workIds;
    await WorkController.bulkUpdateDeliveryStatus({ Work, Payee, req, DeliverySchedule, DeliveredWork, DeliveryLog });
  } else if (req.body.action) {
    req.body.workIds = workIds;
    await WorkController.redeliverWorkIds({ Work, DeliverySchedule, req });
  }

  Notification.generate('Bulk update has completed', `Your bulk update of ${workIds.length} works has completed`, null, req.curveUser, {});
};

WorkController.redeliverWorkIds = async ({ Payee, Work, DeliverySchedule, req }) => {
  // eslint-disable-next-line global-require
  const { isUserForbidden } = require('../libs/userAccess');
  const { deliveryPartnerId, workIds, action } = req.body;

  const filteredWorkIds = workIds ? workIds.filter((id) => (id.length === 24 && ObjectId.isValid(id))) : null;
  const deliverySchedules = await DeliverySchedule.find({ clientId: req.curveUser.clientId, deliveryPartnerId });

  await eachLimit(filteredWorkIds, 10, async (workId) => {
    const work = await Work.findById(workId);
    if (action === 'Force') {
      if (!work?.forceRedelivery?.includes(deliveryPartnerId)) {
        work?.forceRedelivery.push(deliveryPartnerId);
      }
      if (work?.holdRedelivery?.includes(deliveryPartnerId)) {
        const index = work.holdRedelivery.indexOf(deliveryPartnerId);
        work.holdRedelivery.splice(index, 1);
      }
    } else if (action === 'Hold') {
      if (!work?.holdRedelivery?.includes(deliveryPartnerId)) {
        work?.holdRedelivery.push(deliveryPartnerId);
      }
      if (deliverySchedules.some((schedule) => work?.inFutureDelivery?.includes(schedule._id))) {
        work.inFutureDelivery = removeOccurrences(work.inFutureDelivery, deliverySchedules);
      }
    } else if (action === 'Resume') {
      if (work?.holdRedelivery?.includes(deliveryPartnerId)) {
        work?.holdRedelivery.splice(work?.holdRedelivery.indexOf(deliveryPartnerId), 1);
      }
    }

    if (!await isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: work, clientOnly: true })) {
      await work.save();
    }
  });
};

WorkController.getStatuses = async ({ Work, Payee, DeliveredWork, req }) => {
  // eslint-disable-next-line global-require
  let statuses = {};

  if (req.query?.text) {
    // Run using Atlas Search
    logger.debug('Running work query using Atlas Search');
    const searchParams = {
      ...WorkController.workSearchParams, // start with initial work search params
      // add pagination parameters
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sortBy: req.query.orderBy,
      sortOrder: req.query.orderDir,
      project: Projection.getFields('work', 'indexPage'),
    };

    const result = await utils.atlasSearch({ Payee, Model: Work, query: req.query, user: req.curveUser, params: searchParams });

    statuses = { works: result.docs, meta: { currentPage: searchParams.page, totalPages: result.totalPages, total: result.total } };
  } else {
    // Run using usual filters
    logger.debug('Running work query using usual filters');
    const paginationParams = {
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
      select: 'clientId title approvalStatus onHold composer approvedDate identifier',
    };

    const results = await Work.paginate(WorkController.paramsToFilterField(req.query, req.curveUser), paginationParams);

    const deliveredWorks = await DeliveredWorkController.get({ DeliveredWork, req, select: 'workId status deliveryDate receivingParty' });

    const combinedData = results.docs.map((result) => {
      const foundWork = deliveredWorks.find((deliveredWork) => deliveredWork.workId.equals(result._id));
      if (foundWork) {
        return { ...result.toObject(), status: foundWork.status, deliveryDate: foundWork.deliveryDate };
      }
      return result;
    });

    statuses = { works: combinedData.length ? combinedData : results.docs, meta: { currentPage: results.page, totalPages: results.pages, total: results.total } };
  }

  return statuses;
};

WorkController.deliveryStatuses = async ({ DeliverySchedule, Work, CwrDelivery, DeliveryPartner, TerritoryGroup, req, paginationParams }) => {
  const result = await CwrUtils.getCustomFilterWorks({
    DeliverySchedule,
    Work,
    CwrDelivery,
    DeliveryPartner,
    TerritoryGroup,
    clientId: req.curveUser.clientId,
    deliveryPartnerId: req.query?.filter?.deliveryPartnerId,
    deliveryFilter: req.query.filter,
    paginationParams,
    workIds: req.query?.filter?.workIds,
  });

  return ({ works: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.pages, total: result.total } });
};

const asyncCreateInTemplate = ({ formedData, template }) => new Promise((resolve) => {
  createXlsx.createInTemplate(formedData, template, (err, filePath) => {
    resolve(filePath);
  });
});

const deliveryStatusesCreateExportXlsx = async ({ Client, client, formedData }) => {
  const template = await Exports.getTemplate({ Client, templateName: 'deliveryStatuses', clientId: client._id });
  const filePath = await asyncCreateInTemplate({ formedData: [formedData], template });

  return filePath;
};

const asyncAddData = ({ formedData, writer }) => new Promise((resolve) => {
  writer.addData(formedData, () => {
    resolve();
  });
});

const deliveryStatusesCreateExportCsv = async ({ formedData }) => {
  const filePath = `${appRootDir}/tmp/Delivery Statuses Export - ${moment().format('X')}.csv`;
  const headers = [
    'ID',
    'Title',
    'Composer',
    'Delivery Partner',
    'Identifier',
    'Delivered',
    'Acknowledged',
    'Status',
    'Reason For Rejection',
  ];
  const writer = new WriteCsv({ headers, outputLocation: filePath });
  await asyncAddData({ formedData, writer });

  return filePath;
};

const formDeliveryStatusesExportData = ({ client, deliveryPartner, works }) => {
  const dateFormat = `${client.dateFormat.toUpperCase()}`;
  const formedData = [];

  works.map((work) => {
    const data = [
      work._id.toString(),
      work.title,
      work.composer,
      deliveryPartner.name,
      work.identifier,
      work?.deliveredWorks?.[0]?.originalDelivery ? moment(work?.deliveredWorks?.[0]?.originalDelivery).format(dateFormat) : null,
      work?.deliveredWorks?.[0]?.lastAcknowledgment ? moment(work?.deliveredWorks?.[0]?.lastAcknowledgment).format(dateFormat) : null,
      work.deliveredWorkStatus ? work.deliveredWorkStatus : 'Undelivered',
      work.deliveredWorkStatus === 'Rejected' ? work?.deliveredWorks?.[0]?.messages : '',
    ];
    formedData.push(data);
  });

  return formedData;
};

const asyncUploadToS3 = ({ client, filePath }) => new Promise((resolve, reject) => {
  fileManager.uploadToS3(`exports/${client.name} Delivery Statuses Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, (err, key) => {
    if (err) {
      reject(err);
    } else {
      resolve(key);
    }
  });
});

const asyncPublicLink24Hours = ({ key }) => new Promise((resolve, reject) => {
  fileManager.publicLink24Hours(key, (err, link) => {
    if (err) {
      reject(err);
    } else {
      resolve(link);
    }
  });
});

const asyncNotificationGenerate = ({ client, link, curveUser, generateOptions, Notification }) => new Promise((resolve, reject) => {
  Notification.generate('Delivery Statuses Export Ready', `Your Delivery Statuses Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
});

WorkController.exportDeliveryStatuses = async ({ Client, Notification, DeliveryPartner, DeliverySchedule, Work, CwrDelivery, TerritoryGroup, req }) => {
  const { curveUser } = req;
  const { clientId } = curveUser;
  const { deliveryPartnerId } = req.body.filter;
  let filePath;

  try {
    const client = await Client.findOne({ _id: clientId });
    const deliveryPartner = await DeliveryPartner.findOne({ _id: deliveryPartnerId });

    const works = await CwrUtils.getCustomFilterWorks({
      DeliverySchedule,
      Work,
      CwrDelivery,
      DeliveryPartner,
      TerritoryGroup,
      clientId: req.curveUser.clientId,
      deliveryPartnerId: req.body?.filter?.deliveryPartnerId,
      deliveryFilter: req.body?.filter,
      workIds: req.body?.filter?.workIds,
    });

    const count = works.length;
    const formedData = formDeliveryStatusesExportData({ client, deliveryPartner, works });

    if (count < 3000) {
      filePath = await deliveryStatusesCreateExportXlsx({ Client, client, formedData });
    } else {
      filePath = await deliveryStatusesCreateExportCsv({ formedData });
    }

    const key = await asyncUploadToS3({ client, filePath });
    const link = await asyncPublicLink24Hours({ key });
    const generateOptions = {
      identifier: 'exportDownload',
      curveUser,
      client,
      subject: `Your Delivery Statuses Export for ${client.name} is Ready to Download`,
      link,
    };

    await asyncNotificationGenerate({ client, link, curveUser, generateOptions, Notification });
  } catch (err) {
    logger.error(err);
    // Return error via email
    Client.findById(curveUser.clientId, (findErr, client) => {
      const generateOptions = {
        identifier: 'exportError',
        curveUser,
        client,
        subject: 'Your Delivery Statuses Export Has Errored',
        error: 'Your Delivery Statuses export has errored. Please try again, or contact support',
      };
      Notification.generate('Your Delivery Statuses Export Has Errored', 'Your Delivery Statuses export has errored. Please try again, or contact support', null, curveUser, generateOptions);
    });
  }
};

WorkController.paramsToFilterField = (inputParams, user) => {
  let params = {};
  if (user.payeeId && user.contractIds && user.contractIds.length > 0) {
    params['salesReturnsRights.contractId'] = { $in: user.contractIds };
  } else if (user.payeeId) {
    params['salesReturnsRights.contractId'] = { $in: [] };
  } else if (user.clientId) {
    params = { clientId: user.clientId };
  }
  if (inputParams.ids) {
    inputParams.ids = inputParams.ids.map((id) => new ObjectId(id));
    params._id = { $in: inputParams.ids };
  }
  if (inputParams.deliveryStatus && inputParams.deliveryPartnerId) {
    if (inputParams.deliveryStatus === 'Undelivered') {
      params.deliveredToPartners = { $ne: inputParams.deliveryPartnerId };
    } else if (inputParams.deliveryStatus === 'Queued') {
      params.forceRedelivery = inputParams.deliveryPartnerId;
    } else if (inputParams.deliveryStatus === 'On Hold') {
      params.$or = [{ holdRedelivery: inputParams.deliveryPartnerId }, { onHold: true }];
    }
  }

  if (inputParams['source.importId']) {
    params['source.importId'] = new ObjectId(inputParams['source.importId']);
  }

  // Regex
  if (inputParams && inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [
      { title: { $regex: regex } },
      { composer: { $regex: regex } },
      { identifier: { $regex: regex } },
      { iswc: { $regex: regex } },
      { tunecode: { $regex: regex } },
      { aliases: { $regex: regex } },
      { 'societyIdentifiers.identifier': { $regex: regex } },
      { foreignId: { $regex: regex } },
      { projectId: { $regex: regex } },
    ];
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }

  if (inputParams.catalogueGroups && inputParams.catalogueGroups.length > 0) { params.catalogueGroups = { $in: inputParams.catalogueGroups }; }
  if (inputParams.contractIds && inputParams.contractIds.length > 0) { params['salesReturnsRights.contractId'] = { $in: inputParams.contractIds }; }
  if (inputParams.composerIds && inputParams.composerIds.length > 0) { params.usedComposerIds = { $in: inputParams.composerIds }; }
  if (inputParams.workIds && inputParams.workIds.length > 0) { params._id = { $in: inputParams.workIds }; }
  if (inputParams.publisherIds && inputParams.publisherIds.length > 0) { params.usedPublisherIds = { $in: inputParams.publisherIds }; }
  // ADD TO: this input.valid is a quick fix. We should look to standardise what we're passing from the Front-end to API.
  // Note: We may also need to update unit test, as it currently looks for a boolean as the param.valid: value.
  if (inputParams.onHold === 'true' || inputParams.onHold) { params.onHold = true; }
  if (inputParams.onHold === 'false' || inputParams.onHold === false) { params.onHold = false; }
  if (inputParams.approvalStatus) { params.approvalStatus = inputParams.approvalStatus; }
  if (inputParams.createdAfter || inputParams.createdBefore) { params.createdAt = {}; }
  if (inputParams.createdAfter) { params.createdAt.$gte = new Date(inputParams.createdAfter); }
  if (inputParams.createdBefore) { params.createdAt.$lte = new Date(inputParams.createdBefore); }
  if (inputParams.identifiers && inputParams.identifiers.length > 0) { params.identifier = { $in: inputParams.identifiers }; }
  params = utils.paramsToFilterParticipation(inputParams, params);
  params = utils.paramsToFilterOwnership(inputParams, params);
  return params;
};

WorkController.arePartnerChainsEqual = (newChain, oldChain) => {
  if (!newChain || !oldChain) return;

  const differences = [];

  function compareObjects(obj1, obj2, path = [], deliveryPartnerId = null) {
    if (typeof obj1 === 'object' && obj1 !== null && typeof obj2 === 'object' && obj2 !== null) {
      // Check for 'deliveryPartnerId' and update it without reassigning the parameter
      const updatedDeliveryPartnerId = obj1.deliveryPartnerId || deliveryPartnerId;

      const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
      const filteredKeys = [...keys].filter((key) => ![
        'createdAt', 'type', '__v', 'updatedAt', 'createdBy',
        'clientId', 'lastModifiedBy', 'cae', 'catalogueGroups',
        'societies', 'publisherAgreements', 'linkedContracts',
        'territories', 'caeWithoutLeadingZeros', 'lowerCaseName',
        'partyNo', 'interestedPartyId', 'label',
      ].includes(key));
      for (const key of filteredKeys) {
        compareObjects(obj1[key], obj2[key], path.concat(key), updatedDeliveryPartnerId);
      }
    } else if (obj1 !== obj2) {
      differences.push({
        path: path.join('.'),
        deliveryPartnerId,
        oldValue: obj2,
        newValue: obj1,
      });
    }
  }

  compareObjects(newChain, oldChain);

  return differences;
};

module.exports = WorkController;
