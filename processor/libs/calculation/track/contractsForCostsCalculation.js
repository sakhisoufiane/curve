const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Contract = require('../../../models/contract');

const SeparatedCostsTerms = require('../contract/separatedCostsTerms');

/**
 * Builds terms for calculating a cost
 *
 * @param {object} track - An instance of the Track model
 * @param {string} accountingPeriod - The accounting period that the contract should match to be included
 * @param {string} contractType - The contract type that the contract should match to be included
 * @param {object} contract - An instance of the Contract model
 * @param {function(string, object)} callback - A callback that handles the response
 */
module.exports = (track, accountingPeriod, contractType, contract, callback) => {
  const data = [];
  async.each(track.costsRights, (trackContract, cb) => {
    // When passed a contract, only the return the one, else return all contracts associated
    if (contract && contract._id && contract.active === true && contract._id.toString() == trackContract.contractId) {
      const object = {
        objectPercentage: trackContract.percentage, contractId: trackContract.contractId, name: contract.name, contractCurrency: contract.currency, partitionNo: contract.partitionNo,
      };
      async.parallel({
        costsTerms(callback) {
          SeparatedCostsTerms.get(contract, callback);
        },
      }, (err, results) => {
        object.terms = results.costsTerms;
        data.push(object);
        cb();
      });
    } else if (contract && contract._id) {
      // When contract passed, but doesn't match row
      cb();
    } else {
      // Organise data
      const contractFilter = { clientId: track.clientId, _id: trackContract.contractId, accountingPeriod, active: true };
      contractFilter.contractType = contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };
      Contract.findOne(contractFilter)
        .then((contract) => {
          if (contract) {
            const object = {
              objectPercentage: trackContract.percentage, contractId: trackContract.contractId, name: contract.name, contractCurrency: contract.currency, partitionNo: contract.partitionNo,
            };
            async.parallel({
              costsTerms(callback) {
                SeparatedCostsTerms.get(contract, callback);
              },
            }, (err, results) => {
              object.terms = results.costsTerms;
              data.push(object);
              cb();
            });
          } else {
            cb();
          }
        })
        .catch((err) => {
          logger.error(`Error finding contract with filter ${JSON.stringify(contractFilter)}`, err);
          cb();
        });
    }
  }, (err) => {
    callback(err, data);
  });
};
