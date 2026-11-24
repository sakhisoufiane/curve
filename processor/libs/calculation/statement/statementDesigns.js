const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Contract = require('../../../models/contract');
const setStatementDesign = require('../contract/setStatementDesign');

const StatementDesigns = {
  setContractStatementDesign: (statement, callback) => {
    // Get contract from statement
    Contract.findById(statement.contractId)
      .then((contract) => {
        // Check contract exists
        if (contract) {
          // Set statement design on contract
          setStatementDesign(contract, callback);
        } else {
          // Handle missing contract
          callback(new Error('Statement is missing a contract'));
        }
      })
      .catch((err) => {
        logger.error(`${statement._id} | Statement is missing a contract`, err);
        callback(new Error('Statement is missing a contract'));
      });
  },
};

module.exports = StatementDesigns;
