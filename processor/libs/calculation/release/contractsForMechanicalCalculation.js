const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Track = require('../../../models/track');

const SeperatedSalesTerms = require('../contract/separatedSalesTerms');
const SeperatedDeductionTerms = require('../contract/separatedDeductionTerms');
const SeperatedWithholdingTaxTerms = require('../contract/separatedWithholdingTaxTerms');
const SeperatedMechanicalContractTerms = require('../contract/separatedMechanicalContractTerms');
const SeperatedMechanicalTerms = require('../contract/separatedMechanicalTerms');
const ReleaseMechanicalAmount = require('./mechanicalAmount');
const ControlledComposition = require('./controlledComposition');

/**
 * Builds terms for calculating a mechanical contract
 *
 * @param {object} release - An instance of the Track model
 * @param {object} contract - An instance of the Contract model
 * @param {object} client - An instance of the Client model
 * @param {object} period - An instance of the Period model
 * @param {function(string, array)} callback - A callback that handles the response
 */
module.exports = (release, contract, client, period, callback) => {
  const data = [];
  const trackLicenses = [];
  if (release.mechanicalLicenses) {
    Object.keys(release.mechanicalLicenses).forEach((trackId) => {
      if (release.trackIds.includes(trackId) && release.mechanicalLicenses[trackId] && release.mechanicalLicenses[trackId].reportMechanicals && release.mechanicalLicenses[trackId].licenses) {
        release.mechanicalLicenses[trackId].licenses.forEach((license) => {
          if (license.contractId === contract._id.toString()) {
            license.trackId = trackId;
            trackLicenses.push(license);
          }
        });
      }
    });
  }
  ControlledComposition.getOrSkipControlledComposition(release, client, (err, totalControlledMechanicalAmount, controlledCompositionAmounts) => {
    async.each(trackLicenses, (trackLicense, cb) => {
      // Organise data
      const object = {
        objectPercentage: trackLicense.rate, name: contract.name, share: trackLicense.share, contractId: trackLicense.contractId, contractType: 'Mechanical', partitionNo: contract.partitionNo,
      };
      object.licenseNo = trackLicense.licenseNo && trackLicense.licenseNo !== '' ? trackLicense.licenseNo : contract.licenseNo;
      async.waterfall([
        function (waterfallCb) {
          // Get Track info
          Track.findById(trackLicense.trackId)
            .then((track) => {
              if (track) {
                object.track = {
                  _id: track._id,
                  title: track.title,
                  version: track.version,
                  artist: track.artist,
                  isrc: track.isrc,
                  statutoryRate: { US: track.statutoryRate, CA: track.canadianStatutoryRate },
                  controlledCompositionClause: release.controlledCompositionClause,
                  mechanicalCalculationBasis: track.mechanicalCalculationBasis,
                  duration: track.duration || 0,
                };
                if (release.controlledCompositionClause && controlledCompositionAmounts[track._id.toString()]?.[contract._id.toString()]) {
                  object.track.statutoryRate = controlledCompositionAmounts[track._id.toString()][contract._id.toString()];
                  object.track.statutoryRate.splitIntoDates = true;
                }
                waterfallCb();
              } else {
                waterfallCb();
              }
            })
            .catch((err) => {
              logger.error(err);
              waterfallCb();
            });
        },
        function (waterfallCb) {
          // Prepare terms
          async.parallel({
            deductionTerms(callback) {
              SeperatedDeductionTerms.get(contract, callback);
            },
            withholdingTaxTerms(callback) {
              SeperatedWithholdingTaxTerms.get(contract, callback);
            },
            salesTerms(callback) {
              if (contract.contractType === 'Mechanical') {
                SeperatedMechanicalContractTerms.get(contract, callback);
              } else {
                SeperatedSalesTerms.get(contract, callback);
              }
            },
            mechanicalTerms(callback) {
              SeperatedMechanicalTerms.get(contract, callback);
            },
            mechanicalAmount(callback) {
              ReleaseMechanicalAmount.get(release, client, callback);
            },
            totalTracks(callback) {
              ReleaseMechanicalAmount.totalUniqueTracks(release, callback);
            },
            mechanicalBasisPercentage(callback) {
              ReleaseMechanicalAmount.getMechanicalBasisPercentage(release, trackLicense.trackCapOverride, callback);
            },
          }, (err, results) => {
            results.salesTerms = results.salesTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
            results.deductionTerms = results.deductionTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
            results.withholdingTaxTerms = results.withholdingTaxTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
            results.mechanicalTerms = results.mechanicalTerms.map((term) => { if (['Release', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
            object.terms = {
              sales: results.salesTerms, deductions: results.deductionTerms, mechanicalContracts: results.mechanicalTerms, mechanicalBasisPercentage: results.mechanicalBasisPercentage, mechanicalAmount: results.mechanicalAmount, totalTracks: results.totalTracks, contractCurrency: contract.currency,
            };
            data.push(object);
            waterfallCb();
          });
        },
      ], cb);
    }, (err) => {
      callback(err, data);
    });
  });
};
