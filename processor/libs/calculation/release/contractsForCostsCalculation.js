const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Contract = require('../../../models/contract');

const SeparatedCostsTerms = require('../contract/separatedCostsTerms');

/**
 * Builds terms for calculating a cost
 *
 * @param {object} release - An instance of the Release model
 * @param {string} accountingPeriod - The accounting period that the contract should match to be included
 * @param {string} contractType - The contract type that the contract should match to be included
 * @param {object} contract - An instance of the Contract model
 * @param {function(string, object)} callback - A callback that handles the response
 */
module.exports = (release, accountingPeriod, contractType, contract, callback) => {
  const data = [];
  async.each(release.costsRights, (releaseContract, cb) => {
    // When passed a contract, only the return the one, else return all contracts associated
    if (contract && contract._id && contract.active === true && contract._id.toString() === releaseContract.contractId) {
      const object = {
        objectPercentage: releaseContract.percentage, contractId: releaseContract.contractId, name: contract.name, contractCurrency: contract.currency, partitionNo: contract.partitionNo,
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
      const contractFilter = { clientId: release.clientId, _id: releaseContract.contractId, accountingPeriod, active: true };
      contractFilter.contractType = contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };
      Contract.findOne(contractFilter)
        .then((contract) => {
          if (contract) {
            const object = {
              objectPercentage: releaseContract.percentage, contractId: releaseContract.contractId, name: contract.name, contractCurrency: contract.currency,
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
          logger.error(err);
          // Project bongo: Should we call cb with an error here?
          // For now, we just log the error and continue like previously
          cb();
        });
    }
  }, (err) => {
    callback(err, data);
  });
};
