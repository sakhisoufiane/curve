const async = require('async');
const { logger, utils } = require('@curveroyaltysystems/platform-shared-utils');

const postSaveLogic = async ({ next, track }) => {
  const Track = require('../models/track');

  if (track.skipPostSaveHook) {
    await Track.findByIdAndUpdate(track._id, { $set: {
      skipPostSaveHook: false,
    } });
    next();
    return;
  }

  try {
    updateCopyToCatalogueClients({ track }, (err) => {
      if (err) {
        logger.error('Copying track across catalogues error:');
        logger.error(err);
      }
    });
    next();
  } catch (e) {
    logger.error(e);
    next();
  }
};

const postSaveErrorHandling = ({ err, next }) => {
  if (err) {
    logger.info('ERROR');
    logger.error(err);
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
};

const preSaveLogic = async ({ next, track, client, durationChanged }) => {
  const Track = require('../models/track');
  if (track?.duration) {
    track.duration = Math.round(track.duration);
  }

  if (track.skipPreSaveHook) {
    await Track.findByIdAndUpdate(track._id, { $set: {
      skipPreSaveHook: false,
    } });
    next();
    return;
  }
  const oldTrack = await Track.findById(track._id);
  if (!client) {
    durationChanged = !(track.duration === oldTrack?.duration);
  }

  if (!oldTrack && client?.defaultMechanicalBasis) {
    track.mechanicalCalculationBasis = client.defaultMechanicalBasis;
    track.reportMechanicals = client.defaultReportMechanicals;
  }

  checkValidationErrors({ track, client }, () => {
    uniqueAliases(track);
    uniqueCatGroups(track);
    calculateTotalParticipation(track);
    utils.clearBlankStrings(track, ['salesReturnsRights', 'costsRights', 'releaseSpecificSalesReturnsRights', 'mechanicalLicenses']);
    setMechanicalIds(track);
    if (track.isrc) { track.isrc = track.isrc.replace(/[^a-zA-Z0-9]/ig, ''); }
    const asyncArray = [];
    calculateMechanicalStatutoryRate({ durationChanged, track, client }, (err) => {
      if (err) {
        logger.error(err);
        next(new Error('Internal error, please try again or contact support'));
      } else {
        // This will check if the isrc exists within another track.
        asyncArray.push(Track.countDocuments({ _id: { $ne: track._id }, clientId: track.clientId, isrc: track.isrc }));
        // This will check if the isrc exists within another tracks aliases.
        asyncArray.push(Track.countDocuments({ _id: { $ne: track._id }, clientId: track.clientId, aliases: track.isrc }));
        track.aliases.forEach((alias) => {
          // This checks if the target track aliases match another tracks aliases.
          asyncArray.push(Track.countDocuments({ _id: { $ne: track._id }, clientId: track.clientId, aliases: alias }));
          // This checks if the target tracks aliases matches another track isrc.
          asyncArray.push(Track.countDocuments({ _id: { $ne: track._id }, clientId: track.clientId, isrc: alias }));
        });

        Promise.all(asyncArray)
          .then((result) => {
            const errors = [];

            // Check if share is a valid number, with valid decimal places.
            if (Array.isArray(track.mechanicalLicenses)) {
              track.mechanicalLicenses.forEach((mechanicalLicense) => {
                if (parseFloat(mechanicalLicense.share) != mechanicalLicense.share) {
                  errors.push(`Share percentage contains an invalid number ${mechanicalLicense.share}`);
                }
              });
            }

            if (track.isrc !== undefined && track.isrc !== null && track.isrc !== '') {
              if (result[0] > 0) {
                errors.push('ISRC is required to be unique');
              }
              if (result[1] > 0) {
                errors.push('The current ISRC matches an existing alias on another track');
              }
            }
            result.forEach((resultArray, index) => {
              if (index > 1 && resultArray > 0 && errors.indexOf('Aliases are required to be unique') === -1) {
                errors.push('Aliases are required to be unique');
              }
            });
            if (errors.length) {
              return next(new Error(errors.join(', ')));
            }
            checkMultipleContracts(track, (err) => {
              if (err) {
                next(err);
              } else {
                validateSalesReturns(track, (err) => {
                  if (err) {
                    next(err);
                  } else {
                    validateCosts(track, (err) => {
                      if (err) {
                        next(err);
                      } else {
                        checkMultipleReleaseSpecificRightsReturns(track, (err) => {
                          next(err);
                        });
                      }
                    });
                  }
                });
              }
            });
          })
          .catch((err) => {
            logger.error(err);
            next(new Error('Internal error, please try again or contact support'));
          });
      }
    });
  });
};

const errorMessages = (err, callback) => {
  if (err && err.message) {
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('isrc: Path `isrc` is required')) {
        return 'An ISRC is required';
      } if (message.includes('title: Path `title` is required')) {
        return 'A Title is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
};

const updateCopyToCatalogueClients = ({ track, clients = null }, callback) => {
  const Client = require('../models/client');
  async.waterfall([
    function (cb) {
      if (!clients) {
        Client.find({ 'inheritCatalogueFrom.clientId': track.clientId })
          .then((foundClients) => {
            cb(null, foundClients);
          }).catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        cb(null, clients);
      }
    },
    function (clients, cb) {
      clients = clients.map((client) => {
        // Check client has either catalogue group or no catalogue group
        let clientMatches = false;
        client.inheritCatalogueFrom?.forEach((inheritance) => {
          if (inheritance && inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
            // Test against track catalogue groups
            if (track.catalogueGroups.indexOf(inheritance.catalogueGroup) !== -1) {
              clientMatches = true;
            }
          } else {
            clientMatches = true;
          }
        });
        if (clientMatches) {
          return client;
        }
      }).filter(Boolean);
      cb(null, clients);
    },
    function (clients, cb) {
      if (clients.length > 0) {
        async.eachSeries(clients, (client, clientCb) => {
          updateCopyToCatalogueByClient({ client, track }, clientCb);
        }, cb);
      } else {
        cb(null, track);
      }
    },
  ], callback);
};

const validateSalesReturns = (track, callback) => {
  let validationErrorFound = false;
  let releaseSpecificValidationErrorFound = false;

  if (track.salesReturnsRights) {
    track.salesReturnsRights.forEach((salesReturnsRight) => {
      if (!salesReturnsRight.contractId || (salesReturnsRight.percentage !== 0 && !salesReturnsRight.percentage)) {
        validationErrorFound = true;
      }
    });
  }
  if (track.releaseSpecificSalesReturnsRights) {
    track.releaseSpecificSalesReturnsRights.forEach((salesReturnsRight) => {
      if (!salesReturnsRight.contractId || (!salesReturnsRight.releaseId) || (salesReturnsRight.percentage !== 0 && !salesReturnsRight.percentage)) {
        releaseSpecificValidationErrorFound = true;
      }
    });
  }
  if (validationErrorFound) {
    callback(new Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned'));
  } if (releaseSpecificValidationErrorFound) {
    callback(new Error('A Contract needs to be linked to a Percentage and a Release when a Release Specific Sales/Returns Rate is assigned'));
  } else {
    callback();
  }
};

/**
  * Check if a Release has Costs and if they are valid (Contract and Percentage both required). 0 is a valid percentage - confirmed by CM.
  */
const validateCosts = (track, callback) => {
  let validationErrorFound = false;
  if (track.costsRights) {
    track.costsRights.forEach((costRight) => {
      if (!costRight.contractId || (costRight.percentage !== 0 && !costRight.percentage)) {
        validationErrorFound = true;
      }
    });
  }
  if (validationErrorFound) {
    callback(new Error('A Contract needs to be linked to a Percentage when a Cost Right is assigned'));
  } else {
    callback();
  }
};

const checkMultipleReleaseSpecificRightsReturns = (track, callback) => {
  if (runCheckOnArray(track.releaseSpecificSalesReturnsRights)) {
    callback(new Error('Release Specific Sales Returns rows are required to be unique.'));
  } else {
    callback();
  }

  function runCheckOnArray(array) {
    if (array?.length > 0) {
      const sanitisedReleaseRights = array.reduce((accumulator, current) => {
        if (checkIfAlreadyExist(current)) {
          return accumulator;
        }
        return [...accumulator, current];

        function checkIfAlreadyExist(currentVal) {
          return accumulator.some((item) => (item.contractId === currentVal.contractId && item.releaseId === currentVal.releaseId));
        }
      }, []);

      if (sanitisedReleaseRights.length < array.length) {
        return true;
      }
    }
  }
};

const checkMultipleContracts = (track, callback) => {
  // Test both sales and costs rights
  if (runCheckOnArray(track.salesReturnsRights) || runCheckOnArray(track.costsRights) || runCheckOnArray(track.mechanicalLicenses)) {
    // Return error if either one has more than 1 of the same contract
    callback(new Error('A track can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.'));
  } else {
    callback();
  }

  function runCheckOnArray(array) {
    const counts = {};
    const contractIds = array.map((right) => right.contractId);
    contractIds.forEach((id) => {
      if (counts[id]) {
        counts[id] += 1;
      } else {
        counts[id] = 1;
      }
    });
    let returnError = false;
    Object.keys(counts).forEach((key) => {
      if (counts[key] > 1) { returnError = true; }
    });
    return returnError;
  }
};

const calculateMechanicalStatutoryRate = async ({ durationChanged, track, client }, callback) => {
  const Client = require('../models/client');
  // load client stat rate settings only if calculation required
  if (durationChanged || ((!track.statutoryRate && track.statutoryRate !== 0) || track.statutoryRate === '') || ((!track.canadianStatutoryRate && track.canadianStatutoryRate !== 0) || track.canadianStatutoryRate === '')) {
    if (!client) {
      let error;
      try {
        client = await Client.findById(track.clientId);
      } catch (err) {
        error = err;
      }
      if (error || !client) {
        callback(error || new Error('Client not found'));
      }
    }
    if (durationChanged || ((!track.statutoryRate && track.statutoryRate !== 0) || track.statutoryRate === '')) {
      track.statutoryRate = calculateStatRate(client.usStatRates, track.duration);
    }
    if ((!track.canadianStatutoryRate && track.canadianStatutoryRate !== 0) || track.canadianStatutoryRate === '') {
      track.canadianStatutoryRate = calculateStatRate(client.caStatRates, track.duration);
    }
    callback();
  } else {
    callback();
  }

  // helper function for calculateMechanicalStatutoryRate method
  function calculateStatRate(statRatesForCountry, duration) {
    let statRates = {};
    if (statRatesForCountry) {
      statRatesForCountry.forEach((ratesRow) => {
        if ((!statRates.startDate || statRates.startDate < ratesRow.startDate) && ratesRow.startDate < Date.now()) {
          statRates = ratesRow;
        }
      });
      if (Object.keys(statRates).length > 0) {
        if (duration) {
          const minutes = duration / 60;
          if (minutes > 5) {
            // if more than 5 minutes return rate based on per minute rate
            return parseFloat(Math.ceil(minutes) * statRates.perMinuteRate).toFixed(5);
          }
        }
        // if no duration or 5 minutes or less return the base rate (or 0 if this is not set)
        return statRates.minAmount || 0;
      }
    }
    return 0;
  }
};

const setMechanicalIds = (track) => {
  // Setup array
  track.mechanicalContractIds = [];
  track.mechanicalLicenses.forEach((license) => {
    // Check if contractId already exists
    if (track.mechanicalContractIds.indexOf(license.contractId) === -1) {
      // Add to array
      track.mechanicalContractIds.push(license.contractId);
    }
  });
};

const uniqueAliases = (track) => {
  if (track.aliases) {
    track.aliases = track.aliases.filter((value, index, self) => self.indexOf(value) === index);
  }
};

const uniqueCatGroups = (track) => {
  if (track.catalogueGroups) {
    track.catalogueGroups = track.catalogueGroups.filter((value, index, self) => self.indexOf(value) === index);
  }
};

const calculateTotalParticipation = (track) => {
  // Reset participation to 0
  track.totalParticipation = 0;
  if (track.salesReturnsRights) {
    // Loop through rights
    track.salesReturnsRights.forEach((line) => {
      let percentage = 0;
      if (line.percentage) {
        // Round to 4 decimal places
        percentage = Math.round((line.percentage + Number.EPSILON) * 10000) / 10000;
      }
      track.totalParticipation += percentage;
    });
  }
  // Round final number to 4 decimal places
  track.totalParticipation = Math.round((track.totalParticipation + Number.EPSILON) * 100) / 100;
  return track.totalParticipation;
};

const checkValidationErrors = async ({ track, client = null }, callback) => {
  const Client = require('../models/client');
  // Reset track validations errors array
  track.validationErrors = [];
  // ISRC required
  if (!track.isrc) {
    track.validationErrors.push('An ISRC is required');
  }
  // Title required
  if (!track.title) {
    track.validationErrors.push('A Title is required');
  }
  // Check sales/return is included and has a contract for non Publishing client
  if (!client) {
    client = await Client.findById(track.clientId, 'clientType');
  }
  if (client?.clientType !== 'Publisher') {
    if (!track?.salesReturnsRights?.length > 0) {
      track.validationErrors.push('At least one Contract needs to be assigned in Sales/Returns Rights');
    } else {
      let salesReturnsRightContractIdFound = true;
      track?.salesReturnsRights?.forEach((salesReturnsRight) => {
        if (!salesReturnsRight.contractId) {
          salesReturnsRightContractIdFound = false;
        }
      });
      if (!salesReturnsRightContractIdFound) {
        track.validationErrors.push('At least one Contract needs to be assigned in Sales/Returns Rights');
      }
    }
  }
  track.valid = track.validationErrors.length === 0;

  callback();
};

const updateCopyToCatalogueByClient = function ({ client, track }, callback) {
  const Track = require('../models/track');

  const thisTrack = track;
  async.waterfall([
    function (cb) {
      // Find any previously created track
      Track.findOne({ clientId: client._id.toString(), duplicatedFrom: thisTrack._id.toString() })
        .then((track) => {
          cb(null, track);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (track, cb) {
      // Create if no track found
      if (!track) {
        const newTrack = new Track();
        cb(null, newTrack);
      } else {
        cb(null, track);
      }
    },
    function (track, cb) {
      // Update values
      copyValues({ track, trackToCopy: thisTrack, clientId: client._id }, () => {
        cb(null, track);
      });
    },
    function (track, cb) {
      track.save()
        .then(() => {
          cb(null, track);
        })
        .catch((err) => {
          thisTrack.validationErrors.push(`Failed syncing to ${client.name}: ${err.message}`);
          Track.updateOne({ _id: thisTrack._id }, { $set: { validationErrors: thisTrack.validationErrors } })
            .then(() => {
              cb(null, track);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        });
    },
  ], callback);
};

const copyValues = function ({ track, trackToCopy, clientId }, callback) {
  if (!trackToCopy) {
    return callback('Track not found');
  }
  track.clientId = clientId;
  track.title = trackToCopy.title;
  track.version = trackToCopy.version;
  track.isrc = trackToCopy.isrc;
  track.artist = trackToCopy.artist;
  track.label = trackToCopy.label;
  track.pLine = trackToCopy.pLine;
  track.duration = trackToCopy.duration;
  const aliasesToAdd = trackToCopy.aliases.filter((alias) => !track.aliases.includes(alias));
  track.aliases = [...track.aliases, ...aliasesToAdd];
  track.projectId = trackToCopy.projectId;
  track.duplicatedFrom = trackToCopy._id;
  callback(null, track);
};

module.exports = {
  postSaveErrorHandling,
  preSaveLogic,
  postSaveLogic,
  updateCopyToCatalogueClients,
  copyValues,
};
