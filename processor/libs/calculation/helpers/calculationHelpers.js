const SuspenseHelpers = require('./suspenseHelpers');

const checkForModifiedSales = ({ runType, recalculation, period, salesFileIds, salesPartitionNos }) => {
  const returnObj = {
    salesFileIds,
    salesPartitionNos,
  };
  // For modifiedSales run we need to update salesFile and partition no arrays
  if (runType === 'modifiedSales') {
    if (recalculation?.salesFiles?.salesFileIds?.length > 0) {
      // Filter out sales files removed from period since last run - these are correctly in the recalculation object but shouldn't be recalculated here
      returnObj.salesFileIds = recalculation.salesFiles.salesFileIds.filter((value) => period.salesFilesIds.includes(value)).filter(Boolean);
      // If this is modified Sales Run and we have a more granular list of partitions - then use it
      if (recalculation.salesFiles.partitionNos?.length > 0) {
        returnObj.salesPartitionNos = recalculation.salesFiles.partitionNos;
      }
    }
  }
  return returnObj;
};

const buildMainQuery = async ({ client, period, statement, processType, bigQuery, salesFileIds }) => {
  // Build query for filtering sales
  let mainQuery = {
    salesFileId: { $in: salesFileIds },
    $or: [],
  };
  if (client.features?.suspense && period.contractType !== 'MCPS') {
    if (!bigQuery) {
      throw (new Error('bigQuery is required in calculationHelpers.buildMainQuery'));
    }
    const salesLinesFilterTableName = await SuspenseHelpers.buildSalesLinesFilterTableName({ client, period, statement, processType });
    mainQuery = {
      $or4: [
        // Resolved Groups query filter to include sales lines that have been selected to be included
        `id IN ( SELECT id FROM \`${bigQuery.datasetName}.${salesLinesFilterTableName}\` WHERE calculate IS TRUE )`,
      ],
      $or: [],
    };
    // only add the Sales File related query filter when there are actually Sales Files included in the period
    if (salesFileIds?.length) {
      mainQuery.$or4.push({
        $and: [
          { salesFileId: { $in: salesFileIds } },
          // Suspense and Resolved Groups query filter to exclude lines that are not in Resolved Groups that have been added to the period for processing
          `id NOT IN ( SELECT id FROM \`${bigQuery.datasetName}.${salesLinesFilterTableName}\` WHERE calculate IS FALSE )`,
        ],
      });
    }
  }
  return mainQuery;
};

const addPartitionFilterToQuery = ({ mainQuery, salesPartitionNos }) => {
  const queryCopy = { ...mainQuery };
  if (salesPartitionNos.indexOf(null) !== -1) {
    const partitionsWithoutNull = salesPartitionNos.filter(Boolean);
    queryCopy.$or3 = [{ partitionNo: null }];
    if (partitionsWithoutNull.length > 0) {
      queryCopy.$or3.push({ partitionNo: { $in: partitionsWithoutNull } });
    }
  } else {
    queryCopy.partitionNo = { $in: salesPartitionNos };
  }
  return queryCopy;
};

module.exports = {
  checkForModifiedSales,
  buildMainQuery,
  addPartitionFilterToQuery,
};
