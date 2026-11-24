/* eslint-disable no-restricted-syntax */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');

module.exports = function (event, callback) {
  /* event = {
    db,
    bigQuery,
    recalculation,
    costsDatabaseTable: "someSales",
    periodId: "12345",
    contractIds: []
  }
  */
  async.series([
    function (cb) {
      sales(event, cb);
    },
    function (cb) {
      inputCosts(event).then(cb).catch(cb);
    },
    function (cb) {
      outputCosts(event, cb);
    },
    function (cb) {
      mcpsRetentions(event).then(cb).catch(cb);
    },
    function (cb) {
      mcpsNegatives(event).then(cb).catch(cb);
    },
  ], callback);
};

function sales(event, callback) {
  const $or = [];
  // Read or setup empty recalculation object
  const recalculation = event.recalculation || {};
  // Determine if we need to clear down only event.contractIds array
  const filterOnContracts = recalculation.contractIds || event.type === 'Statement' ? event.contractIds : false;
  // Determine if we need to clear down all sales files records
  const filterOnSalesFiles = recalculation.salesFiles ? recalculation.salesFiles.salesFileIds : false;

  // If changes to contracts detected or rerunning a statement then add contracts to or array
  if (filterOnContracts && filterOnContracts.length > 0) {
    $or.push({ contractId: { $in: filterOnContracts } });
  }

  // If changes to sales files detected then add to or array
  if (filterOnSalesFiles && filterOnSalesFiles.length > 0) {
    $or.push({ salesFileId: { $in: filterOnSalesFiles } });
  }

  // Ensure removal of sales lines no longer included in the period
  if (recalculation.type === 'Partial' && event.periodSalesFiles && event.periodSalesFiles.length > 0) {
    $or.push({ salesFileId: { $nin: event.periodSalesFiles } });
  }

  // Create salesFilter including any conditional ors
  const salesFilter = { periodId: event.periodId, $or };

  // Add partitionIds if they are present
  if (event.partitionNos && event.partitionNos.length > 0) {
    salesFilter.contractPartitionNo = { $in: event.partitionNos };
  }

  logger.debug('clearPeriod: sales'); logger.debug({ filterOnSalesFiles }, { filterOnContracts });
  logger.debug('clearPeriod: salesFilter'); logger.debug(JSON.stringify(salesFilter, null, 4));

  event.bigQuery.deleteData(event.bigQuery.outputTable, salesFilter, callback);
}

async function inputCosts(event) {
  const recalculation = event.recalculation || {};
  // If we have nodified sales files but no modified contrcts then nothing to do here
  if (recalculation.salesFiles && !recalculation.contractIds) return;

  // PRE RECALC LOGIC
  // const filter = event.type === 'Statement' ? { periodIds: { $in: [event.periodId] }, calculationContractIds: { $in: event.contractIds } } : { periodIds: { $in: [event.periodId] } };
  // const pullQuery = event.type === 'Statement' ? { $pull: { calculationContractIds: { $in: event.contractIds } } } : { $pull: { periodIds: event.periodId, calculationContractIds: { $in: event.contractIds } } };
  const inputCollection = event.db.collection(event.costsDatabaseTable);
  const filterOnContracts = recalculation.contractIds || event.type === 'Statement' ? event.contractIds : false;
  const filter = filterOnContracts ? { clientId: event.clientId, periodIds: { $in: [event.periodId] }, calculationContractIds: { $in: filterOnContracts } } : { clientId: event.clientId, periodIds: { $in: [event.periodId] } };
  const pullQuery = filterOnContracts ? { $pull: { calculationContractIds: { $in: filterOnContracts } } } : { $pull: { periodIds: event.periodId, calculationContractIds: { $in: event.contractIds } } };
  logger.debug('clearPeriod > inputCosts', { filter }, { filterOnContracts });

  await inputCollection.updateMany(filter, pullQuery);

  if (recalculation.costIds) {
    // We need to remove period references on costs removed from the period which isn't handled above
    const filterNew = { _id: { $in: recalculation.costIds.map((id) => new ObjectId(id)) } };
    const pullQuery = { $pull: { periodIds: event.periodId } };
    await inputCollection.updateMany(filterNew, pullQuery);
  }
}

function outputCosts(event, callback) {
  const recalculation = event.recalculation || {};
  // If we have nodified sales files but no modified contrcts then nothing to do here
  if (recalculation.salesFiles && !recalculation.contractIds) {
    return callback();
  }

  // If costs have been modified, (including being removed from period), all related contracts will be passed in recalculation.contractIds and so records will be removed here
  const filterOnContracts = recalculation.contractIds || event.type === 'Statement' ? event.contractIds : false;
  const filter = filterOnContracts ? { periodId: event.periodId, contractId: { $in: filterOnContracts } } : { periodId: event.periodId };

  logger.debug('clearPeriod > outputCosts', { filter }, { filterOnContracts });
  event.bigQuery.deleteData(event.bigQuery.costsTable, filter, callback);
}

async function mcpsRetentions(event) {
  // Review if these need updated for recalc - pevously assumed not
  if (event.type !== 'Statement') {
    const inputCollection = event.db.collection('mcpsretentions');
    await inputCollection.deleteMany({ periodId: event.periodId });
  }
}

async function mcpsNegatives(event) {
  // Review if these need updated for recalc - pevously assumed not
  if (event.type !== 'Statement') {
    const inputCollection = event.db.collection('mcpsnegatives');
    await inputCollection.deleteMany({ periodId: event.periodId });
  }
}
