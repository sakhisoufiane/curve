const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Period = require('../../../models/period');

const getUsedIds = require('../../getUsedIds');

const QueryMetadata = {
  get: (period, bigQuery, callback) => {
    const recalculation = period.recalculation || {};
    const periodSalesFileIds = period.salesFilesIds;
    const periodId = period._id;
    let modifiedSalesFileIds = false;
    const periodResolvedGroupIds = period.resolvedGroupIds;

    // read period recalculation to determine if we are running a partial
    if (recalculation.salesFiles?.salesFileIds?.length > 0) {
      modifiedSalesFileIds = recalculation.salesFiles.salesFileIds;
    }

    const inputObject = { bigQuery, periodId, clientId: period.clientId, periodSalesFileIds, modifiedSalesFileIds, periodResolvedGroupIds };
    logger.debug({ periodSalesFileIds, modifiedSalesFileIds, periodResolvedGroupIds });

    getUsedIds(inputObject, (err, output) => {
      if (err) {
        logger.error(`${period._id} getUsedIds Errored: `, err);
        callback(err);
      } else {
        recalculation.salesPartitionNos = output.partitionNos;
        if (output.modifiedSalesPartitionNos?.length > 0) {
          recalculation.salesFiles.partitionNos = output.modifiedSalesPartitionNos;
        }

        // Partition nos should not be filtered, as they should allow null values
        const outputSetData = {
          usedContractIds: output.contractIds.filter(Boolean),
          salesPartitionNos: output.partitionNos,
          resolvedGroupSalesFileIds: output.resolvedGroupSalesFileIds,
          resolvedGroupSalesPartitionNos: output.resolvedGroupSalesPartitionNos,
          recalculation,
        };

        logger.info(`${period._id} getUsedIds outputSetData: ${JSON.stringify(outputSetData)}`);
        Period.findByIdAndUpdate(period._id, { $set: outputSetData })
          .then((period) => {
            callback(null, period);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    });
  },
};

module.exports = QueryMetadata;
