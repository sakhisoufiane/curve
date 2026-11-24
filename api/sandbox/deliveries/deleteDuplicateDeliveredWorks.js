/*
Description: A script to check for Delivered Works which have the same Work ID and Delivery Partner ID and delete all bar the most recently updated Delivered Work
Time To Run: 00:03:43s (Staging)
Ticket No: SUP-657
Category: Delivered Works, Publishing
Author: Joe Osborne
*/
require('dotenv').config();
require('../models/db');
const DeliveredWork = require('../models/deliveredWork');
const DeliveryLogController = require('../controllers/deliveryLog');
const WriteCsv = require('../libs/writeCsv');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }
const clientId = '638f392d92d9b3ef0975d053';

const deleteDuplicateDeliveredWorks = async (shouldProcessDeletion) => {
  log('Processing aggregation');
  const aggregation = [
    { $match: { clientId }},
    { $unwind: '$deliveryPartnerId' },
    { $group: {
        _id: {
            workId: '$workId',
            deliveryPartnerId: '$deliveryPartnerId',
            clientId: '$clientId',
        },
        count: { $sum: 1 },
        deliveredWorks: { $push: { _id: '$_id', updatedAt: '$updatedAt', createdAt: '$createdAt', status: '$status', cwrDeliveryId: '$cwrDeliveryId', cwrAcknowledgementId: '$cwrAcknowledgementId'}}
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ];
  const results = await DeliveredWork.aggregate(aggregation, { allowDiskUse: true });
  let sum = 0;

  for (const result of results) {
    const { successFullyAddedLogs, failedToAddLog } = await addDeliveredWorksToDeliveryLogs(result.deliveredWorks, result._id);
    result.logAdded = successFullyAddedLogs.length ? true : false;
    result.failedToAddLogForDeliveredWorkId = failedToAddLog;
    sum += result.count;
    // sort by updatedAt
    result.deliveredWorks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    // remove all bar the first id, mark all others with earlier updatedAt dates for deletion, record the createdAt date for the report
    result.toDelete = result.deliveredWorks.slice(1).map(deliveredWork => `${deliveredWork._id.toString()} - ${new Date(deliveredWork.createdAt).toGMTString()}`);
    // to double check we are keeping the most recent, for the report
    result.isMostRecent = new Date(result.deliveredWorks[0].updatedAt).getTime() === Math.max(...result.deliveredWorks.map(dw => new Date(dw.updatedAt).getTime()));
  }

  log(`Delivered Works issues: ${sum}`);
  
  const idsToRemove = results.flatMap(result => result.isMostRecent ? result.toDelete : [] );
  
  if (idsToRemove && idsToRemove.length > 0) {
    if (shouldProcessDeletion) {
      log(`Total IDs to remove: ${idsToRemove.length}`);
      const { isComplete, errors } = await deleteIdsRecursively(idsToRemove, [], 0);
      if (isComplete) {
        await writeReport(results, shouldProcessDeletion);
      };
      if (errors.length > 0) {
        logErr(`Error deleting Delivered Works: ${errors}`);
      }
      else {
        log(`No issues found`);
        process.exit(0);
      }
    } else {
      await writeReport(results, shouldProcessDeletion);
      process.exit(0);
    }
  } else {
    process.exit(0);
  }
};


const addDeliveredWorksToDeliveryLogs = async (deliveredWorks, ids) => {
  const successFullyAddedLogs = [];
  const failedToAddLog = [];

  await async.eachSeries(deliveredWorks, async (deliveredWork) => {
    const clientId = ids.clientId;
    const deliveryPartnerId = ids.deliveryPartnerId;
    const workId = ids.workId;
    const status = deliveredWork.status;
    const action = 'manual';
    const deliveredWorkId = deliveredWork._id;
    const cwrDeliveryId = deliveredWork.cwrDeliveryId ? deliveredWork.cwrDeliveryId : null;
    const cwrAcknowledgementId = deliveredWork.cwrAcknowledgementId ? deliveredWork.cwrAcknowledgementId : null;
    const log = await DeliveryLogController.addLog({ DeliveryLog, clientId, deliveryPartnerId, workId, deliveredWorkId, cwrDeliveryId, cwrAcknowledgementId, status, action });
    if (log) {
      successFullyAddedLogs.push(log);
    } else {
      failedToAddLog.push(deliveredWork._id);
    }
  });
  return { successFullyAddedLogs, failedToAddLog }
};

const deleteIdsRecursively = async (ids, errors = [], batchCount = 0) => {
  const formattedIds = ids.map(id => id.split(' - ')[0]);
  batchCount++;
  log(`Deleting batch ${batchCount}`);
  if (formattedIds.length === 0) {
    return { isComplete: true, errors };
  }

  const batchLimit = 10000;
  const batchIds = formattedIds.slice(0, batchLimit);

  try {
    await DeliveredWork.deleteMany({ _id: { $in: batchIds } });
  } catch (err) {
    errors.push(err);
  }

  const remainingIds = formattedIds.slice(batchLimit);
  return await deleteIdsRecursively(remainingIds, errors, batchCount);
};

const writeReport = (results, shouldProcessDeletion) => {
  return new Promise((resolve, reject) => {
    const outputLocation = `${appRootDir}/tmp/deletedDeliveredWorks.csv`;
    const writer = new WriteCsv({ headers: ["CLIENT ID", "WORK ID", "DELIVERY PARNTER ID", `${shouldProcessDeletion ? 'DELETED DELIVERED WORK IDS & CREATED AT' : 'DELIVERED WORK IDS & CREATED AT'}`, "KEPT DELIVERED WORK ID", "KEPT DELIVERED WORK ID LAST UPDATED DATE", "KEPT DELIVERED WORK ID CREATED AT DATE", "HAS MOST RECENT UPDATED AT DATE", "DELIVERY LOG ADDED", "DELIVERED WORKS NOT ADDED TO LOGS"], outputLocation });
    const outputData = results.map((line) => {
      return [
        line._id.clientId.toString(),
        line._id.workId.toString(),
        line._id.deliveryPartnerId.toString(),
        line.toDelete.map(id => id.toString()).join('|'),
        line.deliveredWorks[0]._id,
        line.deliveredWorks[0].updatedAt.toGMTString(),
        line.deliveredWorks[0].createdAt.toGMTString(),
        line.isMostRecent,
        line.logAdded,
        line.failedToAddLogForDeliveredWorkId
      ];
    });
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        if (err){
          logErr(`Error writing CSV: ${err}`);
          reject(err);
        } else {
          log(`Script Complete: ${location}`);
          resolve();
          process.exit(0)
        }
      });
    });
  });
};

deleteDuplicateDeliveredWorks(true);