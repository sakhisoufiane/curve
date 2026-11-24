const async = require('async');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const Transaction = require('../../../../models/transaction');
// DMP change, revert after
const Client = require('../../../../models/client');

module.exports = (statement, callback) => {
  // Setup contract IDs array
  const contractIds = [];
  // Add this statement's contractId
  contractIds.push(statement.contractId);
  // Find contract associated with statement
  Contract.findById(statement.contractId)
    .then((contract) => {
      if (!contract) {
        // Handle error if not contract found
        callback(new Error('Could not find contract associated with statement'));
      } else if (contract.summaryContractTotals) {
        // DMP CHANGE Optimized client lookup with just the features.dmp field
        Client.findById(statement.clientId)
          .select('features.dmp')
          .lean()
          .then((client) => {
            // find contract that has this statement as an 'Add To' cross contract
            Contract.find({ clientId: statement.clientId, crossContracts: { $elemMatch: { process: 'Add To', contractId: statement.contractId } } })
              .then((contracts) => {
                async.each(contracts, (contract, contractCb) => {
                  // Get statement assocaited with contract
                  Statement.findOne({ clientId: statement.clientId, periodId: statement.periodId, contractId: contract._id.toString() })
                    .then((contractStatement) => {
                      if (contractStatement) {
                        // Get associated transaction
                        Transaction.findOne({ clientId: statement.clientId, contractId: statement.contractId, transferringStatementId: contractStatement._id.toString() })
                          .then((transaction) => {
                            // Check if transaction exists
                            // DMP change, we always want to include these regardless of transactions.
                            if (transaction || (client?.features?.dmp && statement._isDmpCrossContractUpdate)) {
                              // Add to associated contracts
                              contractIds.push(contract._id.toString());
                            }
                            contractCb();
                          })
                          .catch((err) => {
                            logger.error(err);
                            contractCb();
                          });
                      } else {
                        contractCb();
                      }
                    })
                    .catch((err) => {
                      logger.error(err);
                      contractCb();
                    });
                }, (err) => {
                  // Return result
                  callback(err, contractIds);
                });
              })
              .catch((err) => {
                logger.error(err);
                callback(err, contractIds);
              });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        // Return just this Contract ID
        callback(null, contractIds);
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};
