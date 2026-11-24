const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');

const Contract = require('../../../models/contract');

const setStatementDesign = require('../contract/setStatementDesign');

const StatementDesigns = {
  setContractStatementDesigns: (period, client, callback) => {
    const { recalculation } = period;
    const filter = { clientId: client._id };

    if (recalculation?.contractIds?.length > 0 && !recalculation.salesFiles) {
      filter._id = { $in: recalculation.contractIds.map((id) => ObjectId.createFromHexString(id)) };
    } else {
      filter.accountingPeriod = period.accountingPeriodType;
    }
    if (period.contractType === 'Mechanical') { filter.contractType = 'Mechanical'; }
    logger.debug(`Statement Design Filter: ${JSON.stringify(filter)}`);

    Contract.find(filter)
      .then((contracts) => {
        if (contracts) {
          async.eachLimit(contracts, 10, (contract, cb) => {
            setStatementDesign(contract, cb);
          }, callback);
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
};

module.exports = StatementDesigns;
