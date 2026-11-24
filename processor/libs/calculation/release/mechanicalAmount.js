const async = require('async');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Track = require('../../../models/track');
const ControlledComposition = require('./controlledComposition');
const MechanicalUtils = require('../mechanicalUtils');

const MechanicalAmount = {
  /**
 * Gets mechanical amounts for a release
 *
 * @param {object} release - An instance of the Release model
 * @param {object} client - An instance of the Client model
 * @param {function(string, object)} callback - A callback that handles the response
 */
  get: (release, client, callback) => {
    let result = {};

    if (client.usStatRates) {
      client.usStatRates.forEach((rate) => {
        if (!result[moment(rate.startDate).format('YYYY-MM-DD')]) {
          result[moment(rate.startDate).format('YYYY-MM-DD')] = { US: 0, CA: 0, minUS: 0, minCA: 0 };
        }

        result[moment(rate.startDate).format('YYYY-MM-DD')].usMinAmount = rate.minAmount;
        result[moment(rate.startDate).format('YYYY-MM-DD')].usPerMinuteRate = rate.perMinuteRate;
      });
    }

    if (client.caStatRates) {
      client.caStatRates.forEach((rate) => {
        if (!result[moment(rate.startDate).format('YYYY-MM-DD')]) {
          result[moment(rate.startDate).format('YYYY-MM-DD')] = { US: 0, CA: 0, minUS: 0, minCA: 0 };
        }

        result[moment(rate.startDate).format('YYYY-MM-DD')].caMinAmount = rate.minAmount;
        result[moment(rate.startDate).format('YYYY-MM-DD')].caPerMinuteRate = rate.perMinuteRate;
      });
    }

    // We sort the mechanical rates incase there are sales dates that do not meet any of the dates here, we can default to the oldest date (first item in object)
    result = MechanicalUtils.sortMechanicalRatesObject(result);

    if (release.controlledCompositionClause) {
      ControlledComposition.getControlledCompositionRate(result, release, (err, totalMechanical) => {
        result = {};
        for (const date in totalMechanical) {
          if (totalMechanical[date]) {
            result[date] = {};
            result[date].US = totalMechanical[date].US;
            result[date].minUS = totalMechanical[date].US;
            result[date].usMinAmount = totalMechanical[date].usMinAmount;
            result[date].usPerMinuteRate = totalMechanical[date].usPerMinuteRate;
            result[date].CA = totalMechanical[date].CA;
            result[date].minCA = totalMechanical[date].CA;
            result[date].caMinAmount = totalMechanical[date].caMinAmount;
            result[date].caPerMinuteRate = totalMechanical[date].caPerMinuteRate;
          }
        }

        callback(err, result);
      });
    } else if (release.mechanicalLicenses && Object.keys(release.mechanicalLicenses).length > 0) {
      async.eachLimit(release.trackIds.filter(Boolean), 5, (trackId, cb) => {
        Track.findById(trackId)
          .then((track) => {
            if (track) {
              // Default to 0 should rates not exist
              track.statutoryRate = track.statutoryRate || 0;
              track.canadianStatutoryRate = track.canadianStatutoryRate || 0;
              track.duration = track.duration || 0;
              // Get tracks rates
              MechanicalAmount.calculateRates(result, release, track, cb);
            } else {
              cb();
            }
          })
          .catch((err) => {
            logger.error(err);
            // Project Bongo: We were ignoring error before so let's continue to do the same
            // Probably not correct however
            cb();
          });
      }, (err) => {
        // Set Mechanical Basis Percentage
        callback(err, result);
      });
    } else {
      async.eachLimit(release.trackIds.filter(Boolean), 5, (trackId, trackCb) => {
        Track.findById(trackId)
          .then((track) => {
            if (track) {
              // Default to 0 should rates not exist
              track.statutoryRate = track.statutoryRate || 0;
              track.canadianStatutoryRate = track.canadianStatutoryRate || 0;
              track.duration = track.duration || 0;
              if (track && (track.statutoryRate || track.canadianStatutoryRate)) {
                MechanicalAmount.addRatesToObject(result, track, 1);
                trackCb();
              } else {
                trackCb();
              }
            } else {
              trackCb();
            }
          })
          .catch((err) => {
            logger.error(err);
            // Project Bongo: We were ignoring error before so let's continue to do the same
            // Probably not correct however
            trackCb();
          });
      }, (err) => {
        callback(err, result);
      });
    }
  },
  /**
 * Returns a number for the min stat rate for a specific date
 *
 * @param {array} stateRates - An array of stat rates
 * @param {date} date - the date that the rate should be present for
 * @returns {number} number
 */
  getMinStatRateForDate: (statRates, date) => {
    if (statRates) {
      let latestStatRates = {};
      statRates.forEach((ratesRow) => {
        if ((!latestStatRates.startDate || latestStatRates.startDate < ratesRow.startDate) && ratesRow.startDate < date) {
          latestStatRates = ratesRow;
        }
      });
      if (Object.keys(latestStatRates).length > 0) {
        return (latestStatRates.minAmount || 0);
      }
      return 0;
    }
    return 0;
  },
  /**
 * Calculates mechanical amounts and rates for mechanicals
 *
 * @param {object} ratesObject - The object containing the rates
 * @param {object} release - An instance of the Release model
 * @param {string} track - An instance of the Track model
 */
  calculateRates: (ratesObject, release, track, callback) => {
    if (release.mechanicalLicenses && release.mechanicalLicenses[track._id.toString()] && release.mechanicalLicenses[track._id.toString()].licenses && release.mechanicalLicenses[track._id.toString()].licenses.length > 0 && release.mechanicalLicenses[track._id.toString()].reportMechanicals) {
      // Has licenses, so multiplies by the license rates
      let mechanicalBasisSum = 0;
      // Loop through and get license amounts
      // Set up total shares - to manage tracks that have more than 100% share due to different rights being attached
      let totalShare = 0;
      release.mechanicalLicenses[track._id.toString()].licenses.forEach((license) => {
        if (license.share) {
          totalShare += parseFloat(license.share);
        }
      });
      release.mechanicalLicenses[track._id.toString()].licenses.forEach((license) => {
        if (license.rate) {
          const trackCap = license.trackCapOverride || license.trackCapOverride == 0 ? parseFloat(license.trackCapOverride) : parseFloat(release.mechanicalTrackCap);
          if (trackCap && trackCap < release.trackIds.length) {
            mechanicalBasisSum = parseFloat(trackCap / release.trackIds.length * 100);
          } else {
            mechanicalBasisSum = 100;
          }
          const calc = parseFloat(license.rate) / 100 * parseFloat(license.share) / totalShare * mechanicalBasisSum / 100;

          MechanicalAmount.addRatesToObject(ratesObject, track, calc);
        }
      });
    } else {
      // Check if report mechanicals is specifically turned off, or the track doesn't exist in the licenses
      if (
        (release.mechanicalLicenses && release.mechanicalLicenses[track._id.toString()] && !release.mechanicalLicenses[track._id.toString()].reportMechanicals)
        || (release.mechanicalLicenses && Object.keys(release.mechanicalLicenses).length > 0 && !release.mechanicalLicenses[track._id.toString()])
        || !release.mechanicalLicenses) {
        track.statutoryRate = 0;
        track.canadianStatutoryRate = 0;
      }
      // Has no licenses, so use 100% of stat rate
      if (track.statutoryRate || track.canadianStatutoryRate) {
        // Set mechanical basis for track cap
        const mechanicalTrackCap = release.mechanicalTrackCap ? release.mechanicalTrackCap : release.trackIds.length;
        const cap = (parseFloat(mechanicalTrackCap / release.trackIds.length));

        MechanicalAmount.addRatesToObject(ratesObject, track, cap);
      }
    }

    callback();
  },
  /**
 * Gets the basis percentage from track caps including any override that may be passed
 *
 * @param {object} release - An instance of the Release model
 * @param {number} trackCapOverride - An override of the track cap on the release
 * @param {function(string, number)} callback - A callback that handles the response
 */
  getMechanicalBasisPercentage: (release, trackCapOverride, callback) => {
    // Check for override from license
    const trackCap = trackCapOverride || trackCapOverride === 0 ? trackCapOverride : release.mechanicalTrackCap;
    // If track cap is less than total tracks
    if (trackCap && trackCap !== '' && release.trackIds && release.trackIds.length > 0 && trackCap < release.trackIds.length) {
      callback(null, parseFloat((trackCap / release.trackIds.length) * 100).toFixed(5));
    } else if (trackCap && trackCap !== '' && release.trackIds && release.trackIds.length > 0 && trackCap >= release.trackIds.length) {
      callback(null, 100);
    } else {
      callback(null, release.mechanicalBasisPercentage);
    }
  },
  /**
 * Returns a count of total unique tracks on the release
 *
 * @param {object} release - An instance of the Release model
 * @param {function(string, number)} callback - A callback that handles the response
 */
  totalUniqueTracks: (release, callback) => {
    // Strip any null values and get all IDs as strings
    const trackIds = release.trackIds.map((trackId) => { if (trackId) { return trackId.toString(); } }).filter(Boolean);
    // Get just unique values
    const uniqueIds = trackIds.filter((value, index, self) => self.indexOf(value) === index);
    // Get ObjectIds for filter
    const objectIds = uniqueIds.map((id) => {
      try {
        return new ObjectId(id);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    // Find the tracks to confirm they still exist, and return the count
    Track.countDocuments({ _id: { $in: objectIds } })
      .then((count) => {
        callback(null, count);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  getStatRateMinutes: (duration) => {
    if (Number.isNaN(duration)) return 0;
    return Math.ceil(duration / 60);
  },
  addRatesToObject: (ratesObject, track, multiplier) => {
    track.duration = track.duration || 1;
    const field = track.duration < 301 ? 'minAmount' : 'perMinuteRate';
    let minutes = 0;
    // If less than 5 minutes, multiply minAmount by 1, otherwise multiply perMuniteRate by the num,ber of minutes
    minutes = track.duration < 301 ? 1 : MechanicalAmount.getStatRateMinutes(track.duration);

    // Get the rate to use for the track
    if (track.mechanicalCalculationBasis === 'Sale Date') {
      if (field === 'minAmount') {
        // Loop through the dates in the rates object
        for (const date in ratesObject) {
          if (ratesObject[date]) {
            ratesObject[date].US += (minutes * (ratesObject[date].usMinAmount || 0)) * multiplier;
            ratesObject[date].minUS += (ratesObject[date].usMinAmount || 0) * multiplier;
            ratesObject[date].CA += (minutes * (ratesObject[date].caMinAmount || 0)) * multiplier;
            ratesObject[date].minCA += (ratesObject[date].caMinAmount || 0) * multiplier;
          }
        }
      } else {
        // Loop through the dates in the rates object
        for (const date in ratesObject) {
          if (ratesObject[date]) {
            ratesObject[date].US += (minutes * (ratesObject[date].usPerMinuteRate || 0)) * multiplier;
            ratesObject[date].minUS += (ratesObject[date].usMinAmount || 0) * multiplier;
            ratesObject[date].CA += (minutes * (ratesObject[date].caPerMinuteRate || 0)) * multiplier;
            ratesObject[date].minCA += (ratesObject[date].caMinAmount || 0) * multiplier;
          }
        }
      }
    } else {
      // Loop through the dates in the rates object
      for (const date in ratesObject) {
        if (ratesObject[date]) {
          ratesObject[date].US += track.statutoryRate * multiplier;
          ratesObject[date].minUS += (ratesObject[date].usMinAmount || 0) * multiplier;
          ratesObject[date].CA += track.canadianStatutoryRate * multiplier;
          ratesObject[date].minCA += (ratesObject[date].caMinAmount || 0) * multiplier;
        }
      }
    }
  },
};

module.exports = MechanicalAmount;
