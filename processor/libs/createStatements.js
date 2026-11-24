// process.env.NODE_ENV = 'test'; // ??? @tom??
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');
const Contract = require('../models/contract');

module.exports = (event, callback) => {
  /* event = {
    db,
    clientId: period.clientId,
    recalculation: period.recalculation,
    periodId: period._id.toString(),
    year: period.year,
    accountingPeriod: period.accountingPeriod,
    accountingPeriodType: period.accountingPeriodType,
    contractType: period.contractType,
    periodType: period.contractType,
    date: period.endDate,
  }
  */

  async.waterfall([
    // Get contract IDs from sales and costs
    function (cb) {
      getContractIdsFromClient(event.clientId, event.recalculation, event.accountingPeriodType, event.contractType, cb);
    },
    // Create a statement for each contract ID - setting name
    function (contractIds, cb) {
      let count = 0;
      async.each(contractIds, (contractId, contractCb) => {
        logger.debug('$$$', contractId);
        createContract(contractId, event.periodId, event.clientId, event.year, event.accountingPeriod, event.date, event.periodType, (err) => {
          if (err) {
            contractCb(err);
          } else {
            count += 1;

            contractCb();
          }
        });
      }, (err) => {
        cb(err, count);
      });
    },
  ], (err, count) => {
    logger.debug('$$$', count);
    callback(err, { result: `${count} contracts created` });
  });
};

function getContractIdsFromClient(clientId, recalculation, accountingPeriodType, contractType, callback) {
  const filter = { clientId, accountingPeriod: accountingPeriodType, active: true };

  if (recalculation && recalculation.contractIds && !recalculation.salesFiles) {
    // If we have recalculation.salesFiles then we have torn down all contracts and need to rebuild
    logger.debug('create Statements: getContractIdsFromClient:', recalculation.contractIds);
    filter._id = { $in: recalculation.contractIds.map((id) => new ObjectId(id)) };
  }
  filter.contractType = contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };

  Contract.distinct('_id', filter)
    .then((ids) => {
      const mappedIds = ids.map((id) => id.toString());
      callback(null, mappedIds);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}

function createContract(contractId, periodId, clientId, year, accountingPeriod, date, periodType, callback) {
  Contract.findOne({ _id: new ObjectId(contractId) })
    .then((contract) => {
      if (!contract) {
        callback(`No contract found with ID ${contractId}`);
      } else {
        // Create Statement
        const statement = new Statement({
          clientId,
          periodId,
          contractId,
          name: `${year} - ${accountingPeriod}: ${contract.name}`,
          year,
          accountingPeriod,
          date,
          periodType,
          currency: contract.currency,
          status: 'Pending',
        });
        logger.debug('$$$', { statement });
        statement.save()
          .then((statement) => {
            callback(null, statement);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}
