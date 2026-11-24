const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const SalesGroupLines = require('../models/salesGroupLines');

module.exports = function (event, callback) {
  /* event = { bigQuery: bigQuery, periodId: ObjectId, periodSalesFileIds: [123, 234], modifiedSalesFileIds: [123, 234] } */
  const outputContractIds = [];
  const outputPeriodSalesPartitionNos = [];
  const outputModifiedSalesPartitionNos = [];
  const outputResolvedGroupSalesFileIds = [];
  const outputResolvedGroupSalesPartitionNos = [];

  async.waterfall([
    (cb) => {
      getUsedPartitions(event, (err, result) => {
        if (result?.periodSalesPartitionNos?.length > 0) {
          outputPeriodSalesPartitionNos.push(...result.periodSalesPartitionNos);
        }
        if (result?.modifiedSalesPartitionNos?.length > 0) {
          outputModifiedSalesPartitionNos.push(...result.modifiedSalesPartitionNos);
        }
        if (result?.resolvedGroupSalesFileIds?.length) {
          outputResolvedGroupSalesFileIds.push(...result.resolvedGroupSalesFileIds);
        }
        if (result?.resolvedGroupSalesPartitionNos?.length) {
          outputResolvedGroupSalesPartitionNos.push(...result.resolvedGroupSalesPartitionNos);
        }
        cb(err);
      });
    },
    (cb) => {
      getUsedContracts(event, (err, result) => {
        if (result?.contractIds?.length > 0) {
          outputContractIds.push(...result.contractIds);
        }
        cb(err);
      });
    },
  ], (err) => {
    callback(err, {
      contractIds: outputContractIds.filter(onlyUnique),
      partitionNos: outputPeriodSalesPartitionNos.filter(onlyUnique),
      modifiedSalesPartitionNos: outputModifiedSalesPartitionNos.filter(onlyUnique),
      resolvedGroupSalesFileIds: outputResolvedGroupSalesFileIds.filter(onlyUnique),
      resolvedGroupSalesPartitionNos: outputResolvedGroupSalesPartitionNos.filter(onlyUnique),
    });
  });
};

function getUsedPartitions(event, callback) {
  const databaseTable = event.bigQuery.inputTable;
  const periodSalesPartitionNos = [];
  const modifiedSalesPartitionNos = [];
  let resolvedGroupSalesFileIds = [];
  let resolvedGroupSalesPartitionNos = [];
  const { periodId } = event;
  let filter;
  logger.debug(`${periodId} getUsedPartitions databaseTable: ${databaseTable}`);

  if (databaseTable) {
    async.waterfall([
      (cb) => {
        if (event.periodSalesFileIds?.length > 0) {
          filter = { salesFileId: { $in: event.periodSalesFileIds } };
          logger.debug(`${periodId} getUsedPartitions main filter`, filter);
          // We're using multi distinct to return null partion no. Do not edit.
          event.bigQuery.getMultiDistinct(databaseTable, ['partitionNo'], filter, (err, values) => {
            if (values?.length > 0) {
              const partitionNos = values.map((item) => item.partitionNo);
              periodSalesPartitionNos.push(...partitionNos);
            }
            cb(err);
          });
        } else {
          setImmediate(cb);
        }
      },
      (cb) => {
        if (event.modifiedSalesFileIds?.length > 0) {
          filter = { salesFileId: { $in: event.modifiedSalesFileIds } };
          logger.debug(`${periodId} getUsedPartitions modifiedSales filter`, filter);
          // We're using multi distinct to return null partion no. Do not edit.
          event.bigQuery.getMultiDistinct(databaseTable, ['partitionNo'], filter, (err, values) => {
            if (values?.length > 0) {
              const partitionNos = values.map((item) => item.partitionNo);
              modifiedSalesPartitionNos.push(...partitionNos);
            }
            cb(err);
          });
        } else {
          setImmediate(cb);
        }
      },
      (cb) => {
        if (event.periodResolvedGroupIds?.length) {
          SalesGroupLines.distinct(
            'salesFileId',
            {
              clientId: event.clientId,
              salesGroupId: { $in: event.periodResolvedGroupIds },
            },
          ).then((salesFileIds) => {
            resolvedGroupSalesFileIds = salesFileIds.map((id) => id.toString());
            filter = { salesFileId: { $in: resolvedGroupSalesFileIds } };
            logger.debug(`${periodId} getUsedPartitions from Resolved Groups main filter`, filter);
            // We're using multi distinct to return null partion no. Do not edit.
            event.bigQuery.getMultiDistinct(databaseTable, ['partitionNo'], filter, (err, values) => {
              if (values?.length > 0) {
                resolvedGroupSalesPartitionNos = values.map((item) => item.partitionNo);
              }
              cb(err);
            });
          });
        } else {
          setImmediate(cb);
        }
      },
    ], (err) => {
      logger.debug({ periodSalesPartitionNos, modifiedSalesPartitionNos, resolvedGroupSalesFileIds, resolvedGroupSalesPartitionNos });
      callback(err, { periodSalesPartitionNos, modifiedSalesPartitionNos, resolvedGroupSalesFileIds, resolvedGroupSalesPartitionNos });
    });
  } else {
    setImmediate(() => callback(null, {}));
  }
}

function getUsedContracts(event, callback) {
  const databaseTable = event.bigQuery.inputTable;
  const { periodId } = event;
  let contractIds = [];
  logger.debug(`${periodId} getUsedContracts databaseTable: ${databaseTable}`);
  if (databaseTable) {
    event.bigQuery.getDistinct(databaseTable, 'contractId', { salesFileId: { $in: event.periodSalesFileIds } }, (err, values) => {
      if (values) {
        contractIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
      }
      logger.debug({ contractIds });
      callback(err, { contractIds });
    });
  } else {
    setImmediate(() => callback(null, {}));
  }
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
