const { ObjectId } = require('mongodb');
const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Track = require('../../../models/track');
const MechanicalUtils = require('../mechanicalUtils');

const ControlledComposition = {
  getOrSkipControlledComposition: (release, client, callback) => {
    let ratesObject = {};

    if (client.usStatRates) {
      client.usStatRates.forEach((rate) => {
        if (!ratesObject[moment(rate.startDate).format('YYYY-MM-DD')]) {
          ratesObject[moment(rate.startDate).format('YYYY-MM-DD')] = { US: 0, CA: 0, minUS: 0, minCA: 0 };
        }

        ratesObject[moment(rate.startDate).format('YYYY-MM-DD')].usMinAmount = rate.minAmount;
        ratesObject[moment(rate.startDate).format('YYYY-MM-DD')].usPerMinuteRate = rate.perMinuteRate;
      });
    }

    if (client.caStatRates) {
      client.caStatRates.forEach((rate) => {
        if (!ratesObject[moment(rate.startDate).format('YYYY-MM-DD')]) {
          ratesObject[moment(rate.startDate).format('YYYY-MM-DD')] = { US: 0, CA: 0, minUS: 0, minCA: 0 };
        }

        ratesObject[moment(rate.startDate).format('YYYY-MM-DD')].caMinAmount = rate.minAmount;
        ratesObject[moment(rate.startDate).format('YYYY-MM-DD')].caPerMinuteRate = rate.perMinuteRate;
      });
    }

    // We sort the mechanical rates incase there are sales dates that do not meet any of the dates here, we can default to the oldest date (first item in object)
    ratesObject = MechanicalUtils.sortMechanicalRatesObject(ratesObject);

    if (release && release.controlledCompositionClause) {
      ControlledComposition.getControlledCompositionRate(ratesObject, release, callback);
    } else {
      callback();
    }
  },
  getControlledCompositionRate: (ratesObject, release, callback) => {
    if (release.controlledCompositionClause) {
      // Get Total Tracks
      const totalTracks = ControlledComposition.getTotalTracks(release);
      // Get total amount multiplying the total tracks by the min stat rate
      for (const date in ratesObject) {
        if (ratesObject[date]) {
          ratesObject[date].US += totalTracks * (ratesObject[date].usMinAmount || 0);
          ratesObject[date].minUS += totalTracks * (ratesObject[date].usMinAmount || 0);
          ratesObject[date].CA += totalTracks * (ratesObject[date].caMinAmount || 0);
          ratesObject[date].minCA += totalTracks * (ratesObject[date].caMinAmount || 0);
        }
      }

      // Get track breakdown
      ControlledComposition.getTrackBreakdown(release, ratesObject, (err, trackBreakdown) => {
        callback(err, ratesObject, trackBreakdown);
      });
    } else {
      callback(null, 0);
    }
  },
  getTotalTracks: (release) => {
    // Total tracks should include all tracks that have reportMechanicals configured, or no doesn't exist in object (for fallback)
    let totalTracks = 0;
    release.trackIds.forEach((trackId) => {
      if (
        (release.mechanicalLicenses[trackId] && release.mechanicalLicenses[trackId].reportMechanicals)
        || !release.mechanicalLicenses[trackId]
      ) {
        totalTracks += 1;
      }
    });
    // If track cap is less than total amount of reporting tracks, it should be the total
    if (release.mechanicalTrackCap && release.mechanicalTrackCap < totalTracks) {
      totalTracks = release.mechanicalTrackCap;
    }
    return totalTracks;
  },
  getTrackBreakdown: (release, ratesObject, callback) => {
    const mechanicalAmount = JSON.parse(JSON.stringify(ratesObject));
    // Count how many tracks have reportMechanicals enabled
    let totalShare = 0;
    Object.values(release.mechanicalLicenses).forEach((track) => {
      if (track?.reportMechanicals) {
        if (track?.licenses) {
          track.licenses.forEach((license) => {
            if (license.share) {
              totalShare += parseFloat(license.share);
            }
          });
        }
      }
    });
    if (release.mechanicalLicenses) {
      // Get tracks object
      ControlledComposition.getTracks(release, (err, tracks) => {
        if (err) {
          return callback(err);
        }
        const output = {};
        // Loop through mechanical licenses
        Object.keys(release.mechanicalLicenses).forEach((trackId) => {
          // Confirm track is set to report mechanicals
          if (release.mechanicalLicenses[trackId]?.reportMechanicals) {
            const track = tracks[trackId];
            // Loop through licenses
            if (release.mechanicalLicenses[trackId].licenses) {
              release.mechanicalLicenses[trackId].licenses.forEach((license) => {
                // Get mechanical amount for track
                const licenseMechanicalAmount = JSON.parse(JSON.stringify(ratesObject));
                for (const date in licenseMechanicalAmount) {
                  if (licenseMechanicalAmount[date]) {
                    licenseMechanicalAmount[date].US = 0;
                    licenseMechanicalAmount[date].minUS = 0;
                    licenseMechanicalAmount[date].CA = 0;
                    licenseMechanicalAmount[date].minCA = 0;
                  }
                }

                // Add mechanical amount to output
                ControlledComposition.addRatesToObject(licenseMechanicalAmount, track, 1);
                output[trackId] = output[trackId] || {};
                output[trackId][license.contractId] = licenseMechanicalAmount;
                // Remove from total
                if (license && !license.controlled) {
                  ControlledComposition.removeFromTotalRatesObject(mechanicalAmount, track, license.share);
                  totalShare -= license.share;
                }
              });
            }
          }
        });
        // Remaining tracks get a share of the remaining total
        for (const date in mechanicalAmount) {
          if (mechanicalAmount[date]) {
            mechanicalAmount[date].perSharePercentageUsAmount = mechanicalAmount[date].US / totalShare;
            mechanicalAmount[date].perSharePercentageCaAmount = mechanicalAmount[date].CA / totalShare;
          }
        }

        Object.keys(release.mechanicalLicenses).forEach((trackId) => {
          // Only add this for each track that is set to report mechanicals and not controlled
          if (release.mechanicalLicenses[trackId]?.reportMechanicals) {
            if (release.mechanicalLicenses[trackId].licenses) {
              release.mechanicalLicenses[trackId].licenses.forEach((license) => {
                if (license.controlled) {
                  output[trackId] = output[trackId] || {};
                  for (const date in output[trackId][license.contractId]) {
                    if (output[trackId][license.contractId][date]) {
                      output[trackId][license.contractId][date].US = mechanicalAmount[date].perSharePercentageUsAmount * 100;
                      output[trackId][license.contractId][date].CA = mechanicalAmount[date].perSharePercentageCaAmount * 100;
                    }
                  }
                }
              });
            }
          } else if (!release.mechanicalLicenses[trackId]?.reportMechanicals) {
            output[trackId] = {};
          }
        });
        callback(null, output);
      });
    } else {
      callback();
    }
  },
  getTracks: (release, callback) => {
    if (release.mechanicalLicenses) {
      const output = {};
      const trackObjectIds = Object.keys(release.mechanicalLicenses).filter(Boolean).map((id) => new ObjectId(id));
      Track.find({ _id: { $in: trackObjectIds } })
        .then((tracks) => {
          tracks.forEach((track) => {
            output[track._id.toString()] = track;
          });
          callback(null, output);
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      callback(null, {});
    }
  },
  addRatesToObject: (ratesObject, track, multiplier) => {
    track.duration = track.duration || 1;
    const field = track.duration < 301 ? 'minAmount' : 'perMinuteRate';
    let minutes = 0;
    // If less than 5 minutes, multiply minAmount by 1, otherwise multiply perMuniteRate by the num,ber of minutes
    minutes = track.duration < 301 ? 1 : ControlledComposition.getStatRateMinutes(track.duration);

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
  removeFromTotalRatesObject: (ratesObject, track, share) => {
    track.duration = track.duration || 1;
    const field = track.duration < 301 ? 'minAmount' : 'perMinuteRate';
    let minutes = 0;
    // If less than 5 minutes, multiply minAmount by 1, otherwise multiply perMuniteRate by the num,ber of minutes
    minutes = track.duration < 301 ? 1 : ControlledComposition.getStatRateMinutes(track.duration);

    // Get the rate to use for the track
    if (track.mechanicalCalculationBasis === 'Sale Date') {
      if (field === 'minAmount') {
        // Loop through the dates in the rates object
        for (const date in ratesObject) {
          if (ratesObject[date]) {
            ratesObject[date].US -= ((minutes * (ratesObject[date].usMinAmount || 0)) * (parseFloat(share) / 100));
            ratesObject[date].minUS -= ((minutes * (ratesObject[date].usMinAmount || 0)) * (parseFloat(share) / 100));
            ratesObject[date].CA -= ((minutes * (ratesObject[date].caMinAmount || 0)) * (parseFloat(share) / 100));
            ratesObject[date].minCA -= ((minutes * (ratesObject[date].caMinAmount || 0)) * (parseFloat(share) / 100));
          }
        }
      } else {
        // Loop through the dates in the rates object
        for (const date in ratesObject) {
          if (ratesObject[date]) {
            ratesObject[date].US -= ((minutes * (ratesObject[date].usPerMinuteRate || 0)) * (parseFloat(share) / 100));
            ratesObject[date].minUS -= ((minutes * (ratesObject[date].usMinAmount || 0)) * (parseFloat(share) / 100));
            ratesObject[date].CA -= ((minutes * (ratesObject[date].caPerMinuteRate || 0)) * (parseFloat(share) / 100));
            ratesObject[date].minCA -= ((minutes * (ratesObject[date].caMinAmount || 0)) * (parseFloat(share) / 100));
          }
        }
      }
    } else {
      // Loop through the dates in the rates object
      for (const date in ratesObject) {
        if (ratesObject[date]) {
          ratesObject[date].US -= (track.statutoryRate * (parseFloat(share) / 100));
          ratesObject[date].minUS -= ((ratesObject[date].usMinAmount || 0) * (parseFloat(share) / 100));
          ratesObject[date].CA -= (track.canadianStatutoryRate * (parseFloat(share) / 100));
          ratesObject[date].minCA -= ((ratesObject[date].caMinAmount || 0) * (parseFloat(share) / 100));
        }
      }
    }
  },
  getStatRateMinutes: (duration) => {
    if (Number.isNaN(duration)) return 0;
    return Math.ceil(duration / 60);
  },
};

module.exports = ControlledComposition;
