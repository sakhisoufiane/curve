const async = require('async');

const validateAndFormatRate = require('./validateAndFormatRate');
const SeparatedDeductionTerms = require('../contract/separatedDeductionTerms');
const MechanicalContractTerms = require('../contract/mechanicalContractTerms');

/**
 * Builds terms for calculating a mechanical contract
 *
 * @param {object} track - An instance of the Track model
 * @param {object} contract - An instance of the Contract model
 * @param {function(string, array)} callback - A callback that handles the response
 */
module.exports = (track, contract, callback) => {
  if (!track || !contract) {
    return callback(new Error('Track and Contract are required in contractsForMechanicalCalculation'));
  }
  const data = [];
  async.each(track.mechanicalLicenses, (trackContract, cb) => {
    if (trackContract.contractId == contract._id.toString()) {
      // Organise data
      const object = {
        objectPercentage: validateAndFormatRate(trackContract.rate), name: contract.name, share: trackContract.share, contractId: trackContract.contractId, contractType: 'Mechanical', partitionNo: contract.partitionNo,
      };
      object.licenseNo = trackContract.licenseNo && trackContract.licenseNo !== '' ? trackContract.licenseNo : contract.licenseNo;
      async.parallel({
        deductionTerms(callback) {
          SeparatedDeductionTerms.get(contract, callback);
        },
        salesTerms(callback) {
          MechanicalContractTerms.seperatedMechanicalContractTerms(contract, callback);
        },
      }, (err, results) => {
        // Remove terms that aren't of the cat group
        results.salesTerms = results.salesTerms.map((term) => { if (['Track', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
        results.deductionTerms = results.deductionTerms.map((term) => { if (['Track', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
        const mechanicalAmount = { US: track.statutoryRate, CA: track.canadianStatutoryRate };
        object.terms = {
          sales: results.salesTerms,
          deductions: results.deductionTerms,
          mechanicalAmount,
          contractCurrency: contract.currency,
          mechanicalCalculationBasis: track.mechanicalCalculationBasis,
          duration: track.duration || 0,
        };
        data.push(object);
        cb();
      });
    } else {
      cb();
    }
  }, (err) => {
    callback(err, data);
  });
};
