/* eslint-disable no-await-in-loop */
/**
 * @module work
 */
const { logger, fileManager, createZip, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { DeliveredWorkController, Exports, LowerCaseString, TerritoryHelper, Utils, WriteCsv, WorkPreSave, WorkPostSave } = require('@curveroyaltysystems/curve-shared-logic');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const lineReader = require('line-reader');
const fs = require('fs');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { keyBy, groupBy } = require('lodash');
const { Work: { name, schema } } = require('@curveroyaltysystems/models');
const config = require('../../config.json');
const modelHistory = require('../../libs/modelHistory');
const contractTerritoryValidation = require('../../libs/contractTerritoryValidation');
const fixEncoding = require('../../libs/fixEncoding');
const Contract = require('../contract');
const Client = require('../client');
const Composer = require('../composer');
const Notification = require('../notification');
const Publisher = require('../publisher');
const resolvePublishersByName = require('../../libs/publisher/resolvePublishersByName');
const TerritoryGroup = require('../territoryGroup');
const DeliveredWork = require('../deliveredWork');
const IpChainUtils = require('../../libs/ipChain');
const { createMissingTracksUsingWorks } = require('../../controllers/work');

const { ObjectId } = mongoose.Types;

const allTerritories = [
  ...TerritoryHelper.allTerritories, 'WW', 'World', 'Europe', 'Asia', 'Oceania', 'Americas', 'Africa',
];

const workSchema = schema;

workSchema.plugin(modelHistory, { mongoose, name: 'workPatches', useArchive: true, removePatches: false });
workSchema.plugin(mongoosePaginate);

// Important: this must use function syntax, not an arrow function (so it can access the current work)
workSchema.pre('save', async function () {
  try {
    await WorkPreSave.preSave({ work: this, Work, Client, DeliveredWork, Composer, Publisher, TerritoryGroup });
  } catch (err) {
    logger.error('Error in Work pre-save hook:', err);
    throw err;
  }
});

/**
 * Formats an error message to a human readable format.
 *
 * Calls callback(null, newMessages) with the formatted error [newMessages].
 *
 * @method
 * @param {object} err - The error to format.
 * @param {function(string)} callback - The callback that handles the response.
 */

function errorMessages(err, callback) {
  if (err && err.message) {
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('isrc: Path `identifier` is required')) {
        return 'An Identifier is required';
      } if (message.includes('title: Path `title` is required')) {
        return 'A Title is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
}

workSchema.post('save', (err, savedWork, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

// Important: this must use function syntax, not an arrow function (so it can access the current work)
workSchema.post('save', async function () {
  // Track is required lazily to avoid a circular dependency
  const Track = require('../track');
  try {
    await WorkPostSave.postSave({
      work: this,
      Work,
      Client,
      Track,
      Composer,
      Publisher,
      TerritoryGroup,
    });
  } catch (err) {
    logger.error('Error in Work post-save hook:', err);
  }
});

/**
 * Returns the list of delivery partners the Work has been delivered to and assigns it to work.deliveredTo.
 *
 *
 * @method
 */

workSchema.methods.setDeliveries = async function () {
  const DeliveredWork = require('../deliveredWork');
  const work = this;
  // It seems some works do not have deliveredTo field, ticket has been made to the backlog to investigate this.
  const deliveries = await DeliveredWorkController.get({ DeliveredWork, req: { clientId: work.clientId, workId: work._id }, select: { deliveryPartnerId: 1, updatedAt: 1, status: 1, messages: 1, iswc: 1, partnerId: 1 } });
  work.deliveredTo = deliveries.map((delivery) => ({
    deliveryPartnerId: delivery.deliveryPartnerId,
    deliveredAt: delivery.updatedAt,
    status: delivery.status,
    ...(delivery.status && delivery.status !== 'Delivered' && { lastAcknowledgment: delivery.updatedAt }),
    messages: delivery.messages,
    iswc: delivery.iswc,
    partnerId: delivery.partnerId ?? null,
  }));
};

/**
 * * Sums all salesReturnsRights and adds them to work.totalParticipation
 *
 * @method
 */
workSchema.methods.calculateTotalParticipation = function () {
  const work = this;
  // Reset participation to 0
  work.totalParticipation = 0;
  if (work.salesReturnsRights) {
    // Loop through rights
    work.salesReturnsRights.forEach((line) => {
      let percentage = 0;
      if (line.percentage) {
        // Round to 4 decimal places
        percentage = Math.round((line.percentage + Number.EPSILON) * 10000) / 10000;
      }
      work.totalParticipation += percentage;
    });
  }
  // Round final number to 4 decimal places
  work.totalParticipation = Math.round((work.totalParticipation + Number.EPSILON) * 10000) / 10000;
  return work.totalParticipation;
};

/**
 * Populates the ip chain Composers/Publishers.
 *
 *
 * @method
 * @param {function()} callback - The callback that handles the response.
 */

workSchema.methods.populateIpChain = function (callback) {
  const work = this;
  async.each(work.rightsChain, (chain, cb) => {
    if (chain && chain.children && chain.children.length > 0) {
      populateSingleChain(chain, cb);
    } else {
      cb();
    }
  }, callback);
};

function populateSingleChain(chain, callback) {
  async.each(chain.children, (chain, cb) => {
    if (chain) {
      async.series([
        (scb) => {
          if (chain.publisherId) {
            Publisher.findById(chain.publisherId, 'name linkedContracts')
              .then((publisher) => {
                chain.publisher = publisher || {};
                scb();
              }).catch((error) => {
                scb();
              });
          } else {
            scb();
          }
        },
        (scb) => {
          if (chain.composerId) {
            Composer.findById(chain.composerId, 'name linkedContracts')
              .then((composer) => {
                chain.composer = composer || {};
                scb();
              }).catch((error) => {
                scb();
              });
          } else {
            scb();
          }
        },
      ], () => {
        if (chain && chain.children && chain.children.length > 0) {
          populateSingleChain(chain, cb);
        } else {
          cb();
        }
      });
    } else {
      cb();
    }
  }, callback);
}

/**
 * Checks if a work has more than one instance of the same contract attached to it.
 *
 * Calls callback(error) with an [error] if multiple instances of the same contract are attached to the work.
 *
 * @method
 * @param {function(string)} callback - The callback that handles the response.
 */

workSchema.methods.checkMultipleContracts = function (callback) {
  // Test both sales and costs rights
  if (runCheckOnArray(this.salesReturnsRights) || runCheckOnArray(this.costsRights)) {
    // Return error if either one has more than 1 of the same contract
    callback(new Error('A work can only have one instance of a contract attached to it. Please ensure a contract is only included once.'));
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

/**
 * Approves the work
 *
 *
 * @returns {object} - Work
 */
workSchema.methods.approve = async function (curveUser) {
  const work = this;

  if (work.valid && work.approvalStatus === 'Ready for Approval') {
    work.approvedDate = Date.now();
    work.approvalStatus = 'Approved';
    work.lastModifiedBy = curveUser;
    await work.save();
    return work;
  }
  // If being called from approve_many, we want to ignore already "Approved" or works not "Ready for Approval"
  return null;
};

/**
 * Toggle hold on the work
 *
 *
 * @returns {boolean} - onHold
 */
workSchema.methods.toggleHold = async function (curveUser) {
  const work = this;
  work.onHold = !work.onHold;
  work.lastModifiedBy = curveUser;
  await work.save();
  return work.onHold;
};

/**
 * Gets the composer and publisher Ids from the work.rightsChain array.
 *
 * Calls callback(error) with an [error] if an error occurs.
 *
 * @method
 * @param {function(string)} callback - The callback that handles the response.
 */

workSchema.methods.getComposerIDs = function () {
  const work = this;
  const composerIds = [];
  const publisherIds = [];

  for (const chain of work.rightsChain) {
    getIDs(chain);
  }
  for (const partnerChain of work.partnerRightsChains) {
    if (partnerChain.rightsChain && partnerChain.rightsChain.length > 0) {
      for (const chain of partnerChain.rightsChain) {
        getIDs(chain);
      }
    }
  }
  work.usedComposerIds = composerIds;
  work.usedPublisherIds = publisherIds;

  function getIDs(chain) {
    if (chain && chain.type === 'Composer') {
      if (composerIds.indexOf(chain.composerId) === -1 && chain.composerId !== '') {
        composerIds.push(chain.composerId);
      }
    } else if (chain && chain.type === 'Publisher') {
      if (publisherIds.indexOf(chain.publisherId) === -1 && chain.publisherId !== '') {
        publisherIds.push(chain.publisherId);
      }
    }
    if (chain && chain.children) chain.children.forEach((child) => getIDs(child));
  }
};

/**
  * Check if one of the passed contract IDs is associated with the Work.
  *
  * Calls callback(containsId) with [containsId] set to true if one of the passedcontract IDs is associated with the Work.
  *
  * @method
  * @param {string} passedContractIds - Contract IDs to check against.
  * @param {function(boolean)} callback - The callback that handles the response.
  */

workSchema.methods.containsContractIds = function (passedContractIds, callback) {
  if (passedContractIds) {
    this.contractIds((workContractIds) => {
      let value = false;
      passedContractIds.forEach((passedContractId) => {
        if (workContractIds.indexOf(passedContractId) !== -1) {
          value = true;
        }
        if (passedContractId === passedContractIds[passedContractIds.length - 1]) {
          callback(value);
        }
      });
    });
  } else {
    callback(false);
  }
};

/**
  * Returns an array of contract IDs associated with the Work.
  *
  * Calls callback(array) with an [array] of contract IDs associated with the Work.
  *
  * @method
  * @param {function(string[])} callback - The callback that handles the response.
  */

workSchema.methods.contractIds = function (callback) {
  const array = [];
  this.salesReturnsRights.forEach((contractId) => {
    array.push(contractId.contractId);
  });
  this.costsRights.forEach((contractId) => {
    array.push(contractId.contractId);
  });
  callback(array);
};

/**
  * Validates the contracts associated to the Work.
  *
  * Sets work.contractValidation to "No Contracts" if no contracts are associated to the Work
  *
  * Sets work.contractValidation to "Territories Missing" if the contract's territories are missing
  *
  * Sets work.contractValidation to "" otherwise
  *
  * Calls callback() after checking the contracts.
  *
  * @method
  * @param {function()} callback - The callback that handles the response.
  */

workSchema.methods.workContractValidation = function (callback) {
  const self = this;
  this.contractIds((array) => {
    if (array.length === 0) {
      self.contractValidation = 'No Contracts';
      return callback ? callback() : true;
    }
    Contract.find({ _id: { $in: array } })
      .then((contracts) => {
        let verify = true;
        contracts.forEach((contract) => {
          verify = verify && contractTerritoryValidation.checkContract(contract);
        });
        if (!verify) {
          self.contractValidation = 'Territories Missing';
        } else {
          self.contractValidation = '';
        }
        return callback ? callback() : true;
      });
  });
};

/**
  * Sends an export of the Work data by email.
  *
  * @method
  * @param {object} filter - The Work filter object.
  * @param {object} curveUser - The User sending the export.
  */
workSchema.statics.sendExport = function (filter, curveUser) {
  const Client = require('../client');
  try {
    async.waterfall([
      function (cb) {
        Work.countDocuments(filter)
          .then((count) => {
            cb(null, count);
          })
          .catch((error) => {
            logger.error(`Error counting works for export: ${error}`);
            cb(error);
          });
      },
      function (count, cb) {
        // NEED TO CONSIDER THIS, AS IT CURRENTLY HAS TO BE OVER TWO TABS, AND MAY CAUSE THIS TO CRASH OVER A LARGE FILE SIZE
        if (count < 1000) {
          Work.createExportXlsx(filter, curveUser.clientId, cb);
        } else {
          Work.createExportCsv(filter, count, curveUser.clientId, cb);
        }
      },
      function (filePath, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            fileManager.uploadToS3(`exports/${client.name} Work Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
          })
          .catch((error) => {
            logger.error(`Error getting client for export: ${error}`);
            cb(error);
          });
      },
      function (key, cb) {
        fileManager.publicLink24Hours(key, cb);
      },
      function (link, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportDownload',
              curveUser,
              client,
              subject: `Your Works Export for ${client.name} is Ready to Download`,
              link,
            };
            Notification.generate('Works Export Ready', `Your Works Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
              cb(err);
            });
          })
          .catch((error) => {
            logger.error(`Error finding client by id for export '${curveUser.clientId}': ${error}`);
            cb(error);
          });
      },
    ], (err) => {
      if (err) {
        logger.error(err);
        // Return error via email
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportError',
              curveUser,
              client,
              subject: `Your Work Export for ${client?.name}  Has Errored`,
              error: err.message,
            };
            Notification.generate(`Your Work Export for ${client?.name}  Has Errored`, err.message, null, curveUser, generateOptions);
          })
          .catch((err) => {
            logger.error(`Error finding client for notification with clientId '${curveUser.clientId}': ${err}`);
          });
      }
    });
  } catch (e) {
    logger.error(e);
    // Return error via email
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'exportError',
          curveUser,
          client,
          subject: 'Your work Export Has Errored',
          error: 'Your work export has errored. Please try again, or contact support',
        };
        Notification.generate('Your work Export Has Errored', 'Your work export has errored. Please try again, or contact support', null, curveUser, generateOptions);
      })
      .catch((err) => {
        logger.error(`Error finding client for notification with clientId '${curveUser.clientId}': ${err}`);
      });
  }
};

/**
  * Exports the Work data to an Excel file.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the excel file.
  *
  * @method
  * @param {object} filter - The Work filter object.
  * @param {string} clientId - The ID of the client doing the export.
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.statics.createExportXlsx = function (filter, clientId, callback) {
  Client.findById(clientId)
    .then((client) => {
      // get date format from client settings
      const dateFormat = client.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
      async.waterfall([
        function (cb) {
          // Get composers for mapping
          composersForMapping(clientId, cb);
        },
        function (composers, cb) {
          // Get Publishers for mapping
          publishersForMapping(clientId, (err, publishers) => {
            cb(null, composers, publishers);
          });
        },
        function (composers, publishers, cb) {
          Work.find(filter)
            .then((works) => {
              cb(null, composers, publishers, works);
            })
            .catch((error) => {
              logger.error(`Error finding works for export with clientId '${clientId}': ${error}`);
              cb(error, composers, publishers, null);
            });
        },
        function (composers, publishers, works, cb) {
          logger.debug(`No of Works: ${works.length}`);
          Work.convertWorksForXlsx(client, works, composers, publishers, dateFormat, cb);
        },
        function (data, cb) {
          Exports.getTemplate({ Client, templateName: 'work', clientId }).then((template) => {
            createXlsx.createInTemplate(data, template, cb);
          });
        },
      ], callback);
    })
    .catch((error) => {
      logger.error(`Error finding client for xlsx export with clientid '${clientId}': ${error}`);
      callback(error);
    });
};

/**
  * Exports the Work data to a CSV file.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.
  *
  * @method
  * @param {object} filter - The Work filter object.
  * @param {number} count - The number of Work to process per round.
  * @param {string} clientId - The ID of the client doing the export.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

workSchema.statics.createExportCsv = function (filter, count, clientId, callback) {
  Client.findById(clientId)
    .then((client) => {
      const partnerChainsEnabled = client?.features?.partnerChains;
      // get date format from client settings
      const dateFormat = client.dateFormat ? `${client?.dateFormat.toUpperCase()}` : '';
      const limit = 1000;
      const output = `${appRootDir}/tmp/Work Export - ${moment().format('X')}.csv`;
      const alternateTitlesOutput = `${appRootDir}/tmp/Work Export - ${moment().format('X')} - alternateTitles.csv`;
      const participatorsOutput = `${appRootDir}/tmp/Work Export - ${moment().format('X')} - participators.csv`;
      const specificParticipationRatesOutput = `${appRootDir}/tmp/Work Export - ${moment().format('X')} - specificParticipationRates.csv`;
      const societyIdentifiersOutput = `${appRootDir}/tmp/Work Export - ${moment().format('X')} - societyIdentifiers.csv`;
      const ipChainOutput = `${appRootDir}/tmp/Work Export - ${moment().format('X')} - ipChain.csv`;
      const partnerIpChainsOutput = `${appRootDir}/tmp/Work Export - ${moment().format('X')} - partnerIpChains.csv`;
      const workHeaders = [
        'ID',
        'Title',
        'Composers',
        'Foreign ID',
        'Project ID',
        'Party No',
        'Main Identifier',
        'ISWC',
        'Tunecode',
        'Copyright Date',
        'Label Copy',
        'Priority Work',
        'Production Library Work',
        'Category', 'Language',
        'Composite Type',
        'No. of Composite Works',
        'Work Version',
        'Arrangement Type',
        'Lyric Adaption',
        'Performers',
        'Track ISRCs',
        'Territories',
        'Catalogue Groups',
        'Aliases', 'Notes',
      ];
      const workLiteHeaders = [
        'ID',
        'Title',
        'Composers',
        'Foreign ID',
        'Project ID',
        'Party No',
        'Main Identifier',
        'ISWC', 'Tunecode',
        'Copyright Date',
        'Label Copy',
        'Performers',
        'Track ISRCs',
        'Territories',
        'Catalogue Groups',
        'Aliases',
        'Notes',
      ];
      const ipChainHeaders = [
        'Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Territory', 'Participant 1 Type', 'Participant 1 Name', 'Participant 1 First Name', 'Participant 1 Middle Name', 'Participant 1 Surname', 'Participant 1 CAE Number', 'Participant 1 Controlled', 'Participant 1 Mechanical Owned', 'Participant 1 Mechanical Collected', 'Participant 1 Performance Owned', 'Participant 1 Performance Collected', 'Participant 1 Capacity', 'Participant 2 Type', 'Participant 2 Name', 'Participant 2 First Name', 'Participant 2 Middle Name', 'Participant 2 Surname', 'Participant 2 CAE Number', 'Participant 2 Controlled', 'Participant 2 Mechanical Owned', 'Participant 2 Mechanical Collected', 'Participant 2 Performance Owned', 'Participant 2 Performance Collected', 'Participant 2 Capacity', 'Participant 3 Type', 'Participant 3 Name', 'Participant 3 First Name', 'Participant 3 Middle Name', 'Participant 3 Surname', 'Participant 3 CAE Number', 'Participant 3 Controlled', 'Participant 3 Mechanical Owned', 'Participant 3 Mechanical Collected', 'Participant 3 Performance Owned', 'Participant 3 Performance Collected', 'Participant 3 Capacity', 'Participant 4 Type', 'Participant 4 Name', 'Participant 4 First Name', 'Participant 4 Middle Name', 'Participant 4 Surname', 'Participant 4 CAE Number', 'Participant 4 Controlled', 'Participant 4 Mechanical Owned', 'Participant 4 Mechanical Collected', 'Participant 4 Performance Owned', 'Participant 4 Performance Collected', 'Participant 4 Capacity', 'Participant 5 Type', 'Participant 5 Name', 'Participant 5 First Name', 'Participant 5 Middle Name', 'Participant 5 Surname', 'Participant 5 CAE Number', 'Participant 5 Controlled', 'Participant 5 Mechanical Owned', 'Participant 5 Mechanical Collected', 'Participant 5 Performance Owned', 'Participant 5 Performance Collected', 'Participant 5 Capacity', 'Participant 6 Type', 'Participant 6 Name', 'Participant 6 First Name', 'Participant 6 Middle Name', 'Participant 6 Surname', 'Participant 6 CAE Number', 'Participant 6 Controlled', 'Participant 6 Mechanical Owned', 'Participant 6 Mechanical Collected', 'Participant 6 Performance Owned', 'Participant 6 Performance Collected', 'Participant 6 Capacity', 'Participant 7 Type', 'Participant 7 Name', 'Participant 7 First Name', 'Participant 7 Middle Name', 'Participant 7 Surname', 'Participant 7 CAE Number', 'Participant 7 Controlled', 'Participant 7 Mechanical Owned', 'Participant 7 Mechanical Collected', 'Participant 7 Performance Owned', 'Participant 7 Performance Collected', 'Participant 7 Capacity', 'Participant 8 Type', 'Participant 8 Name', 'Participant 8 First Name', 'Participant 8 Middle Name', 'Participant 8 Surname', 'Participant 8 CAE Number', 'Participant 8 Controlled', 'Participant 8 Mechanical Owned', 'Participant 8 Mechanical Collected', 'Participant 8 Performance Owned', 'Participant 8 Performance Collected', 'Participant 8 Capacity', 'Participant 9 Type', 'Participant 9 Name', 'Participant 9 First Name', 'Participant 9 Middle Name', 'Participant 9 Surname', 'Participant 9 CAE Number', 'Participant 9 Controlled', 'Participant 9 Mechanical Owned', 'Participant 9 Mechanical Collected', 'Participant 9 Performance Owned', 'Participant 9 Performance Collected', 'Participant 9 Capacity', 'Participant 10 Type', 'Participant 10 Name', 'Participant 10 First Name', 'Participant 10 Middle Name', 'Participant 10 Surname', 'Participant 10 CAE Number', 'Participant 10 Controlled', 'Participant 10 Mechanical Owned', 'Participant 10 Mechanical Collected', 'Participant 10 Performance Owned', 'Participant 10 Performance Collected', 'Participant 10 Capacity',
      ];
      const partnerIpChainsHeaders = [...ipChainHeaders.slice(0, 5), 'Delivery Partner', ...ipChainHeaders.slice(5)];

      const headers = client.paymentTier !== 'Lite' ? workHeaders : workLiteHeaders;
      const writer = new WriteCsv({ headers, outputLocation: output });
      const ipChainWriter = new WriteCsv({ headers: ipChainHeaders, outputLocation: ipChainOutput });
      const partnerIpChainsWriter = new WriteCsv({ headers: partnerIpChainsHeaders, outputLocation: partnerIpChainsOutput });
      const alternateTitlesWriter = new WriteCsv({ headers: ['Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Alternate Title', 'Language'], outputLocation: alternateTitlesOutput });
      const participatorsWriter = new WriteCsv({ headers: ['Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Contract', 'Rate'], outputLocation: participatorsOutput });
      // Lite templates have no Publishers column on the Specific Participation Rates tab
      const specificParticipationRatesHeaders = client.paymentTier !== 'Lite'
        ? ['Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Contract', 'Distribution Channel', 'Source', 'Territory', 'Publishers', 'Rate']
        : ['Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Contract', 'Distribution Channel', 'Source', 'Territory', 'Rate'];
      const specificParticipationRatesWriter = new WriteCsv({ headers: specificParticipationRatesHeaders, outputLocation: specificParticipationRatesOutput });
      const societyIdentifiersRatesWriter = new WriteCsv({ headers: ['Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Society', 'Identifier'], outputLocation: societyIdentifiersOutput });
      async.waterfall([
        (cb) => {
          // Get composers for mapping
          composersForMapping(clientId, cb);
        },
        (composers, cb) => {
          // Get Publishers for mapping
          publishersForMapping(clientId, (err, publishers) => {
            cb(null, composers, publishers);
          });
        },
        (composers, publishers, cb) => {
          const rounds = listFromNumber(Math.floor(count / limit));
          async.eachLimit(rounds, 3, (round, loopCb) => {
            logger.info(`Work Export: Running Round ${round} of ${rounds.length - 1}`);
            async.waterfall([
              function (cb) {
                Work.find(filter).limit(limit).skip(round * limit).sort({ _id: 1 })
                  .then((works) => {
                    cb(null, works);
                  })
                  .catch((error) => {
                    logger.error(`Error finding works for export with clientId '${clientId}': ${error}`);
                    cb(error);
                  });
              },
              function (works, cb) {
                logger.debug(`No of Works: ${works.length}`);
                Work.convertWorksForXlsx(client, works, composers, publishers, dateFormat, cb);
              },
              function (data, cb) {
                writer.addData(data[0], () => {
                  alternateTitlesWriter.addData(data[1], () => {
                    participatorsWriter.addData(data[2], () => {
                      specificParticipationRatesWriter.addData(data[3], () => {
                        societyIdentifiersRatesWriter.addData(data[4], () => {
                          ipChainWriter.addData(data[5], () => {
                            partnerIpChainsWriter.addData(data[6], cb);
                          });
                        });
                      });
                    });
                  });
                });
              },
            ], loopCb);
          }, cb);
        },
      ], (err) => {
        async.series([
          function (cb) {
            writer.write((err) => {
              cb(err);
            });
          },
          function (cb) {
            alternateTitlesWriter.write((err) => {
              cb(err);
            });
          },
          function (cb) {
            participatorsWriter.write((err) => {
              cb(err);
            });
          },
          function (cb) {
            specificParticipationRatesWriter.write((err) => {
              cb(err);
            });
          },
          function (cb) {
            societyIdentifiersRatesWriter.write((err) => {
              cb(err);
            });
          },
          function (cb) {
            ipChainWriter.write((err) => {
              cb(err);
            });
          },
          function (cb) {
            if (partnerChainsEnabled) {
              partnerIpChainsWriter.write((err) => {
                cb(err);
              });
            } else {
              cb();
            }
          },
        ], (err) => {
          if (err) {
            callback(err);
          } else {
            const csvOutputs = [output, alternateTitlesOutput, participatorsOutput, specificParticipationRatesOutput, societyIdentifiersOutput, ipChainOutput];
            if (partnerChainsEnabled) csvOutputs.push(partnerIpChainsOutput);
            createZip.localFiles(csvOutputs, `${appRootDir}/tmp/Work Export ${moment().format('X')}.zip`, callback);
          }
        });
      });
    })
    .catch((error) => {
      logger.error(`Error finding client for csv export with clientid '${clientId}': ${error}`);
      callback(error);
    });
  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

/**
  * Creates an object of composers for mapping.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] object containing the mapping.
  *
  * @method
  * @param {string} clientId - The ID of the client the composers belong to.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

function composersForMapping(clientId, callback) {
  const output = {};
  Composer.find({ clientId })
    .then((composers) => {
      composers.forEach((composer) => {
        output[composer._id.toString()] = composer;
      });
      callback(null, output);
    })
    .catch((error) => {
      callback(null, output);
    });
}

/**
  * Creates an object of publishers for mapping.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] object containing the mapping.
  *
  * @method
  * @param {string} clientId - The ID of the client the publishers belong to.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

function publishersForMapping(clientId, callback) {
  const output = {};
  Publisher.find({ clientId })
    .then((publishers) => {
      publishers.forEach((publisher) => {
        output[publisher._id.toString()] = publisher;
      });
      callback(null, output);
    }).catch((error) => {
      callback(null, output);
    });
}

/**
  * Removes the Publishers column (index 8) from specific participation rate rows for Lite clients,
  * whose templates don't have it. Returns the rows unchanged for any other payment tier.
  *
  * @param {object} client - The client the rows are being exported for.
  * @param {array[]} rows - Specific participation rate rows.
  * @returns {array[]} The rows matching the client's template.
  */
function removePublishersColumnForLite(client, rows) {
  if (client?.paymentTier !== 'Lite') return rows;
  return rows.map((row) => row.toSpliced(8, 1));
}

/**
  * Formats an array of works for the excel export.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] array containing an array of [convertedWorks], of [ipChains] and of [specificRights].
  *
  * @method
  * @param {object[]} works - Array of works to convert.
  * @param {object[]} composers - Array of composers associated with the work.
  * @param {object[]} publishers - Array of publishers associated with the work.
  * @param {function(string, array[])} callback - The callback that handles the response.
  */
workSchema.statics.convertWorksForXlsx = function (client, works, composers, publishers, dateFormat, callback) {
  const DeliveryPartner = require('../deliveryPartner');
  try {
    if (works instanceof Array) {
      const convertedWorks = [];
      let convertedParticipators = [];
      let convertedAlternateTitles = [];
      let specificParticipationRates = [];
      let societyIdentifiers = [];
      let ipChains = [];
      let partnerIpChains = [];
      async.eachLimit(works, 10, (work, cb) => {
        async.parallel([
          (paraCb) => {
            work.exportData(client, dateFormat, (err, exportWork) => {
              convertedWorks.push(exportWork);
              paraCb();
            });
          },
          (paraCb) => {
            work.exportAlternateTitles((err, exportAlternateTitles) => {
              convertedAlternateTitles = convertedAlternateTitles.concat(exportAlternateTitles);
              paraCb();
            });
          },
          (paraCb) => {
            work.exportParticipators((err, exportParticipators) => {
              convertedParticipators = convertedParticipators.concat(exportParticipators);
              paraCb();
            });
          },
          (paraCb) => {
            work.exportSpecificParticipationRates((err, exportSpecificParticipationRates) => {
              specificParticipationRates = specificParticipationRates.concat(removePublishersColumnForLite(client, exportSpecificParticipationRates));
              paraCb();
            });
          },
          (paraCb) => {
            work.exportSocietyIdentifiers((err, exportSocietyIdentifiers) => {
              societyIdentifiers = societyIdentifiers.concat(exportSocietyIdentifiers);
              paraCb();
            });
          },
          (paraCb) => {
            work.exportIpChainData(work.rightsChain, composers, publishers, (err, exportIpChains) => {
              ipChains = ipChains.concat(exportIpChains);
              paraCb();
            });
          },
          (paraCb) => {
            if (client?.features?.partnerChains) {
              // Get all Delivery Partners that are included in partner chains
              const deliveryPartnerIds = [...new Set(work.partnerRightsChains.map((partnerChain) => partnerChain.deliveryPartnerId))];
              DeliveryPartner.find({ _id: deliveryPartnerIds }, ['name'])
                .then((partners) => {
                  const partnersById = keyBy(partners, (partner) => partner._id.toString());

                  async.eachSeries(work.partnerRightsChains, (partnerChain, cb) => {
                    work.exportIpChainData(partnerChain.rightsChain, composers, publishers, (err, exportIpChains) => {
                      // Insert Delivery Partner name into correct column position once the chain has been exported
                      const partnerName = partnersById[partnerChain.deliveryPartnerId].name;
                      exportIpChains.forEach((chain) => chain.splice(5, 0, partnerName));
                      partnerIpChains = partnerIpChains.concat(exportIpChains);
                      cb();
                    });
                  }, () => {
                    paraCb();
                  });
                })
                .catch((err) => {
                  logger.error(`Error finding delivery partners for convertWorksForXlsx for clientId '${client._id}': ${err}`);
                  paraCb();
                });
            } else {
              paraCb();
            }
          },
        ], cb);
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, [convertedWorks, convertedAlternateTitles, convertedParticipators, specificParticipationRates, societyIdentifiers, ipChains, partnerIpChains]);
        }
      });
    } else {
      callback(new Error('Must be passed an Array of Works'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
 * Returns an array of the Work data to export.
 *
 * Calls callback(err, result) with an [err] if an error occurs and the [result] array containing the export data.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */

workSchema.methods.exportData = function (client, dateFormat, callback) {
  const Track = require('../track');
  const work = this;
  const aliases = work.aliases.map((alias) => alias).join(';');
  const trackIds = work.trackIds.map((trackId) => {
    if (trackId) {
      return new ObjectId(trackId);
    }
  }).filter(Boolean);
  Track.find({ clientId: work.clientId, _id: { $in: trackIds } })
    .then((tracks) => {
      const isrcs = tracks.map((track) => track.isrc).join(';');
      const liteData = [
        work._id.toString(),
        fixEncoding(work.title),
        fixEncoding(work.composer),
        fixEncoding(work.foreignId),
        fixEncoding(work.projectId),
        fixEncoding(work.partyNo),
        fixEncoding(work.identifier),
        fixEncoding(work.iswc),
        fixEncoding(work.tunecode),
        work.copyrightDate ? moment(work.copyrightDate).format(dateFormat) : null,
        work.labelCopy,
        fixEncoding(work.performers.join(';')),
        isrcs,
        work.territories && work.territories.length >= TerritoryHelper.allTerritories.length ? 'WW' : work.territories.join(';'),
        work.catalogueGroups.join(';'),
        aliases,
        work.notes,
      ];
      const data = [
        work._id.toString(),
        fixEncoding(work.title),
        fixEncoding(work.composer),
        fixEncoding(work.foreignId),
        fixEncoding(work.projectId),
        fixEncoding(work.partyNo),
        fixEncoding(work.identifier),
        fixEncoding(work.iswc),
        fixEncoding(work.tunecode),
        work.copyrightDate ? moment(work.copyrightDate).format(dateFormat) : null,
        work.labelCopy,
        work.priority,
        work.productionLibrary,
        work.workDescriptionCategory,
        work.workLanguage,
        work.compositeType,
        work.compositeCount,
        work.versionType,
        work.arrangementType,
        work.lyricAdaptionType,
        fixEncoding(work.performers.join(';')),
        isrcs,
        work.territories && work.territories.length >= TerritoryHelper.allTerritories.length ? 'WW' : work.territories.join(';'),
        work.catalogueGroups.join(';'),
        aliases,
        work.notes,
      ];

      const result = client.paymentTier !== 'Lite' ? data : liteData;
      callback(null, result);
    })
    .catch((error) => {
      logger.error(`Error finding tracks for exportData with clientId '${work.clientId}': ${error}`);
      callback(null, []);
    });
};

/**
 * Returns an array of the Work Alternate Titles.
 *
 * Calls callback(err, result) with an [err] if an error occurs and the [result] array containing the export data.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */

workSchema.methods.exportAlternateTitles = function (callback) {
  const work = this;
  const result = work.alternateTitles.map((title) => [work._id.toString(), fixEncoding(work.title), fixEncoding(work.identifier), fixEncoding(work.tunecode), title.title, title.language]);
  callback(null, result);
};

/**
 * Returns an array of the Work participators.
 *
 * Calls callback(err, result) with an [err] if an error occurs and the [result] array containing the export data.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */

workSchema.methods.exportParticipators = function (callback) {
  const work = this;
  const result = [];
  const Contract = require('../contract');

  async.each(work.salesReturnsRights, (right, cb) => {
    if (right.contractId) {
      Contract.findById(right.contractId)
        .then((contract) => {
          if (contract) {
            result.push([
              work._id.toString(),
              fixEncoding(work.title),
              fixEncoding(work.identifier),
              fixEncoding(work.tunecode),
              fixEncoding(contract.name),
              right.percentage,
            ]);
            cb();
          }

          if (!contract) throw new Error('Contract not found');
        })
        .catch((error) => {
          logger.error(`Error finding contract for exportParticipators with contractId '${right.contractId}': ${error}`);
          cb(error);
        });
    } else {
      cb();
    }
  }, (err) => {
    callback(err, result);
  });
};

/**
 * Returns an array of the Work specific participation rates.
 *
 * Calls callback(err, result) with an [err] if an error occurs and the [result] array containing the export data.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 *
 * If there is a territory group name, it pushes it to the result array instead of the territory group ID
 * If there is no territory group name it pushes ISO codes
 */

workSchema.methods.exportSpecificParticipationRates = function (callback) {
  const work = this;
  const result = [];
  const Contract = require('../contract');

  async.each(work.channelSpecificSalesReturnsRights, (rate, cb) => {
    if (rate.contractId) {
      Contract.findById(rate.contractId)
        .then(async (contract) => {
          if (contract) {
            let territoryGroup;
            if (ObjectId.isValid(rate.territory)) {
              territoryGroup = await TerritoryGroup.findById(rate.territory).catch(logger.error);
            }

            // Resolve publisher IDs to colon-separated names
            let publisherNames = '';
            if (rate.publishers && rate.publishers.length > 0) {
              const publishers = await Publisher.find({ _id: { $in: rate.publishers } }).select('name').lean().catch(logger.error);
              if (publishers) {
                publisherNames = publishers.map((p) => p.name).join(':');
              }
            }

            result.push([
              work._id.toString(),
              fixEncoding(work.title),
              fixEncoding(work.identifier),
              fixEncoding(work.tunecode),
              fixEncoding(contract.name),
              rate.distributionChannel,
              rate.source,
              territoryGroup?.name || rate.territory,
              publisherNames,
              rate.percentage,
            ]);
            cb();
          } else {
            cb();
          }
        })
        .catch((error) => {
          logger.error(`Error finding contract for exportSpecificParticipationRates with contractId '${rate.contractId}': ${error}`);
          cb(error);
        });
    } else {
      cb();
    }
  }, (err) => {
    callback(err, result);
  });
};

/**
 * Returns an array of the Work specific participation rates.
 *
 * Calls callback(err, result) with an [err] if an error occurs and the [result] array containing the export data.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */

workSchema.methods.exportSocietyIdentifiers = function (callback) {
  const work = this;
  const result = [];
  work.societyIdentifiers.map((identifier) => {
    result.push([
      work._id.toString(),
      fixEncoding(work.title),
      fixEncoding(work.identifier),
      fixEncoding(work.tunecode),
      identifier.society,
      identifier.identifier,
    ]);
  });

  callback(null, result);
};

/**
 * Returns a Works IP chains data for export .
 *
 * Calls callback(err, territory) with an [err] if an error occurs and the array of the [results] returned.
 *
 * @method
 * @param {object[]} composers - Array of composers associated with the work.
 * @param {object[]} publishers - Array of publishers associated with the work.
 * @param {function(string, object[])} callback - The callback that handles the response.
 */

workSchema.methods.exportIpChainData = function (rightsChain, composers, publishers, callback) {
  const work = this;
  let deconstructedChains;
  let exportData = [];

  async.eachSeries(rightsChain, (chain, callback) => {
    async.series([
      (scb) => {
        // Map territory groups
        mapChainTerritories(work.clientId, chain, scb);
      },
      (scb) => {
        // Deconstruct the chain
        deconstructedChains = deconstructIpChain(1, {}, chain);
        scb();
      },
      (scb) => {
        // Combine rows that have the same parents and end with a composer
        deconstructedChains = combineComposerChains(deconstructedChains);
        scb();
      },
      (scb) => {
        // Split the chain values
        splitIpChainValues(deconstructedChains);
        scb();
      },
      (scb) => {
        // Populate Composers/Publishers data
        populateComposersPublishers(deconstructedChains, scb);
      },
      (scb) => {
        // Get export data
        exportData = exportData.concat(work.getIpChainsExportData(deconstructedChains));
        scb();
      },
    ], callback);
  }, (err) => {
    callback(err, exportData);
  });
};

function mapChainTerritories(clientId, chain, callback) {
  // find territory groups from id stored on rights chain OR find ISO codes from specific chain
  if (chain && !allTerritories.includes(chain.territory)) {
    if (chain.territory === 'specific') {
      chain.territory = chain.territoryCodes.codes.join(';');
      callback();
    } else {
      TerritoryGroup.findOne({ clientId, _id: chain.territory })
        .then((territoryGroup) => {
          if (territoryGroup) { chain.territory = territoryGroup.name; }
          callback();
        })
        .catch((error) => {
          // logger.error(`Error finding territory group for mapChainTerritories with territoryId '${chain.territory}': ${error}`);
          callback();
        });
    }
  } else {
    callback();
  }
}
/**
 * Formats an ip chain into an array for export.
 *
 * @method
 * @param {object} chain - chain to export.
 * @returns {string[]} - export data
 */
workSchema.methods.getIpChainsExportData = function (chains) {
  const work = this;
  const data = [];
  chains.map((chain) => {
    const row = [];
    row.push(
      ...[
        work._id.toString(),
        work.title,
        work.identifier,
        work.tunecode,
        chain.territory,
      ],
    );
    for (let index = 1; index < chain.totalLevels + 1; index++) {
      if (chain[index]) {
        row.push(
          ...[
            chain[index].type,
            chain[index].name,
            chain[index].firstName,
            chain[index].middleNames,
            chain[index].surname,
            chain[index].cae,
            chain[index].controlled ? chain[index].controlled : false,
            chain[index].mechanicalOwnership,
            chain[index].mechanicalCollection,
            chain[index].performanceOwnership,
            chain[index].performanceCollection,
            chain[index].contractType,
          ],
        );
      }
    }
    data.push(row);
  });

  return data;
};

/**
 * Populates the ip chain's publisher and composer ids
 *
 * Calls callback(error) when done
 *
 * @method
 * @param {object[]} chains - The ip chains to populate.
 * @param {function(string)} callback - the callback that hadnles the response
 */
function populateComposersPublishers(chains, callback) {
  async.each(chains, (chain, cb) => {
    const totalLevels = [];
    for (let index = 1; index < chain.totalLevels + 1; index++) {
      totalLevels.push(index);
    }

    async.each(totalLevels, (level, ecb) => {
      if (chain[level] && chain[level].type === 'Publisher') {
        Publisher.findById(chain[level].publisherId)
          .then((publisher) => {
            if (publisher) {
              chain[level].name = publisher.name;
              chain[level].cae = publisher.cae;
            }
            ecb();
          })
          .catch((error) => {
            ecb();
          });
      } else if (chain[level] && chain[level].type === 'Composer') {
        Composer.findById(chain[level].composerId)
          .then((composer) => {
            if (composer) {
              chain[level].name = composer.name;
              chain[level].firstName = composer.firstName;
              chain[level].middleNames = composer.middleNames;
              chain[level].surname = composer.surname;
              chain[level].cae = composer.cae;
            }
            ecb();
          })
          .catch((error) => {
            ecb();
          });
      } else {
        ecb();
      }
    }, cb);
  }, callback);
}

/**
 * Combines chains that have the same parents and end with a composer into one chain
 *
 * @method
 * @param {object[]} chains - The ip chains to combine.
 * @returns {object[]} chains - the combined chains
 */
function combineComposerChains(chains) {
  chains.forEach((chainA) => {
    const chainsToRemove = [];
    chains.forEach((chainB, index) => {
      if (chainA !== chainB && chainA.tree === chainB.tree) {
        // Add copy of the final element to the above chain
        chainA[chainA.totalLevels + 1] = JSON.parse(JSON.stringify(chainB[chainB.totalLevels]));
        // Updates total levels on the item
        chainA.totalLevels += 1;
        chainsToRemove.push(index);
      }
    });
    // Remove items in reverse order to keep items in same place if multiple removes are required
    chainsToRemove.sort((a, b) => a - b).reverse().forEach((index) => {
      chains.splice(index, 1);
    });
  });

  return chains;
}

function getMatchingChains(matchingChains, chain1, chain2) {
  const chain1Tree = chain1.tree.split('/').filter((item) => item !== 'Composer');
  const chain2Tree = chain2.tree.split('/').filter((item) => item !== 'Composer');
  const totalIterations = chain1Tree.length < chain2Tree.length ? chain1Tree.length : chain2Tree.length;
  const chain1SubTree = [chain1Tree[0]];
  const chain2SubTree = [chain2Tree[0]];
  for (let i = 1; i < totalIterations; i += 1) {
    chain1SubTree.push(chain1Tree[i]);
    chain2SubTree.push(chain2Tree[i]);
    if (chain1SubTree.join('/') === chain2SubTree.join('/') && (!chain2.matches || chain2.matches.indexOf(chain2SubTree.join('/')) === -1)) {
      if (!matchingChains[chain1SubTree.join('/')]) { matchingChains[chain1SubTree.join('/')] = chain1[i].totalSubchainsPerformanceOwnership ? chain1[i].totalSubchainsPerformanceOwnership : 0; }
      matchingChains[chain1SubTree.join('/')] += chain2[i].totalSubchainsPerformanceOwnership;
      if (!chain2.matches) { chain2.matches = []; }
      chain2.matches.push(chain2SubTree.join('/'));
    }
  }
}

function getTotalSubchainsPerformance(chain) {
  const totalIndexes = chain.totalLevels;
  for (let i = 1; i < totalIndexes + 1; i += 1) {
    chain[i].totalSubchainsPerformanceOwnership = 0;
    for (let j = i + 1; j < totalIndexes + 1; j += 1) {
      chain[i].totalSubchainsPerformanceOwnership += chain[j].performanceOwnership ? chain[j].performanceOwnership : 0;
    }
  }
}

function splitIpChainValues(chain) {
  chain.forEach((subChain) => {
    getTotalSubchainsPerformance(subChain);
  });

  const matchingChains = {};
  for (let i = 0; i < chain.length; i += 1) {
    for (let j = i + 1; j < chain.length; j += 1) {
      getMatchingChains(matchingChains, chain[i], chain[j]);
    }
  }

  for (const key in matchingChains) {
    if (matchingChains[key]) {
      const match = key.split('/');
      const territory = match[0];
      const level = match.length - 1;
      const publisher = match[level];
      const totalPerformance = matchingChains[key];
      chain.forEach((row) => {
        if (row.territory === territory && row[level]) {
          const publisherToCompareTo = level === 1 ? `${row.chainIndex}_${row[level].type}_${row[level].publisherId}` : `${row[level].type}_${row[level].publisherId}`;
          if (publisher === publisherToCompareTo) {
            const performanceRatio = (row[level].totalSubchainsPerformanceOwnership / totalPerformance) * 100;
            row[level].mechanicalOwnership = row[level].mechanicalOwnership ? Math.round(row[level].mechanicalOwnership * performanceRatio) / 100 : 0;
            row[level].performanceOwnership = row[level].performanceOwnership ? Math.round(row[level].performanceOwnership * performanceRatio) / 100 : 0;
            row[level].mechanicalCollection = row[level].mechanicalCollection ? Math.round(row[level].mechanicalCollection * performanceRatio) / 100 : 0;
            row[level].performanceCollection = row[level].performanceCollection ? Math.round(row[level].performanceCollection * performanceRatio) / 100 : 0;
          }
        }
      });
    }
  }
}
/**
 * Deconstructs an ip chain into rows for the excel export data
 *
 * Calls callback(error) when done
 *
 * @method
 * @param {number} level - The parent level
 * @param {object} row - The deconstructed row
 * @param {object} chain - The chain being deconstructed
 */
function deconstructIpChain(level, row, chain) {
  let result = [];

  if (chain && chain.children) {
    chain.children.forEach((child, index) => {
      if (child) {
        // Create a new copy of the row on each child
        const rowCopy = JSON.parse(JSON.stringify(row));
        if (level === 1) {
          rowCopy.territory = chain.territory;
          rowCopy.tree = chain.territory;
        }

        // Track tree (for combining composer chains) and total levels
        if (child.type === 'Publisher') {
          if (level === 1) {
            rowCopy.tree += `/${index}_Publisher_${child.publisherId}`;
            rowCopy.chainIndex = index;
          } else {
            rowCopy.tree += `/Publisher_${child.publisherId}`;
          }
        } else if (child.type === 'Composer') {
          rowCopy.tree += '/Composer';
        }
        rowCopy.totalLevels = level;

        rowCopy[level] = {
          type: child.type,
          mechanicalOwnership: parseFloat(child.mechanicalOwnership || 0),
          performanceOwnership: parseFloat(child.performanceOwnership || 0),
          mechanicalCollection: parseFloat(child.mechanicalCollection || 0),
          performanceCollection: parseFloat(child.performanceCollection || 0),
          controlled: child.controlled,
          contractType: child.contractType,
          publisherId: child.publisherId,
          composerId: child.composerId,
        };

        result = result.concat(deconstructIpChain(level + 1, rowCopy, child));

        if (!child.children || child.children.length === 0) {
          result.push(rowCopy);
        }
      }
    });
  }

  return result;
}

/**
 * Returns an array of the Work's unique society identifiers and assigns it to works.societyIdentifiers.
 *
 * @method
 */
workSchema.methods.uniqueSocietyIdentifiers = function () {
  const valuesStrings = this.societyIdentifiers.map((value) => value.society + value.identifier);
  this.societyIdentifiers = this.societyIdentifiers.filter((value, index) => {
    if (index === valuesStrings.indexOf(value.society + value.identifier)) {
      return true;
    }
    return false;
  });
};

/**
 * Returns a list of unique aliases and assigns it to works.aliases.
 *
 * @method
 */

workSchema.methods.uniqueAliases = function () {
  this.aliases = this.aliases.filter((value, index, self) => self.indexOf(value) === index);
};

/**
  * Imports Works from Excel.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Release.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
workSchema.statics.importFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  const Client = require('../client');
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
        const ImportXlsx = require('../../libs/importXlsx');
        const workData = {};
        const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
        let totalWorks = 0;
        async.parallel([
          function (paraCb) {
            // Get the works tab.
            const template = client.paymentTier === 'Lite' ? config.importTemplates.liteWork : config.importTemplates.work;
            ImportXlsx.getDataByTemplate(file.path, template, 0, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                paraCb(err);
              } else {
                logger.debug('Import Template: Got the Works data');
                totalWorks = data.length;
                writeArrayToFile(data, 'Works', (err, output) => {
                  workData.works = output;
                  paraCb(err);
                });
              }
            });
          },
          function (paraCb) {
            // Get the participators tab.
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.workAlternateTitles, 1, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                paraCb(err);
              } else {
                logger.debug('Import Template: Got the Alternate Titles data');
                workData.alternateTitles = turnArrayIntoIndexedObject(data, identifiers);
                paraCb(err);
              }
            });
          },
          function (paraCb) {
            // Get the participators tab.
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.workParticipators, 2, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                paraCb(err);
              } else {
                logger.debug('Import Template: Got the Participators data');
                workData.participators = turnArrayIntoIndexedObject(data, identifiers);
                paraCb(err);
              }
            });
          },
          function (paraCb) {
            // Get the specific participation rates tab. Lite templates have no Publishers column.
            const sprTemplate = client.paymentTier === 'Lite' ? config.importTemplates.liteWorkSpecificPartitionRates : config.importTemplates.workSpecificPartitionRates;
            ImportXlsx.getDataByTemplate(file.path, sprTemplate, 3, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                paraCb(err);
              } else {
                logger.debug('Import Template: Got the Specific Participation Rates data');
                workData.specificRights = turnArrayIntoIndexedObject(data, identifiers);
                paraCb(err);
              }
            });
          },
          function (paraCb) {
            // Get the society identifiers tab.
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.workSocietyIdentifiers, 4, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                paraCb(err);
              } else {
                logger.debug('Import Template: Got the Indentifiers data');
                workData.societyIdentifiers = turnArrayIntoIndexedObject(data, identifiers);
                paraCb(err);
              }
            });
          },
          function (paraCb) {
            // Get the ip chain tab.
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.workIpChain, 5, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                paraCb(err);
              } else {
                logger.debug('Import Template: Got the Ip Chain data');
                if (data?.length) workData.ipChain = formatIpChainComposerNames(data);
                workData.ipChain = turnArrayIntoIndexedObject(data, identifiers);
                getComposersPublishersFromChain(data, curveUser.clientId, (err, indexed) => {
                  if (err && err.length !== 0) {
                    paraCb(err);
                  } else {
                    workData.indexedComposersPublishers = indexed;
                    paraCb();
                  }
                });
              }
            });
          },
          function (paraCb) {
            // Check if partner chains is enabled for the client
            Client.findById(curveUser.clientId, 'features')
              .then((client) => {
                const partnerChainsEnabled = client?.features?.partnerChains;
                // Get the partner ip chain tab.
                if (partnerChainsEnabled) {
                  ImportXlsx.getDataByTemplate(file.path, config.importTemplates.partnerIpChains, 6, 2, dateFormat, (err, data) => {
                    if (err) {
                      logger.error(err);
                      paraCb(err);
                    } else {
                      logger.debug('Import Template: Got the Partner Ip Chains data');
                      if (data?.length) {
                        data = formatIpChainComposerNames(data);
                        workData.partnerRightsChains = turnArrayIntoIndexedObject(data, [...identifiers, 'partnerName']);
                        getComposersPublishersFromChain(data, curveUser.clientId, (err, indexed) => {
                          if (err && err.length > 0) paraCb(err);
                          else {
                            workData.indexedPartnerComposersPublishers = indexed;
                            paraCb();
                          }
                        });
                      } else {
                        paraCb();
                      }
                    }
                  });
                } else {
                  paraCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                paraCb(err);
              });
          },
        ], (error) => {
          if (error) {
            logger.error(error);
          }
          if (error && Array.isArray(error) && error.length !== 0) {
            Client.findById(curveUser.clientId)
              .then((client) => {
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your Work Import Has Errored',
                  file: file.originalname,
                  error,
                };
                Notification.generate('Your Work Import Has Errored', `${error.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(`Error finding client for notification with clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
          } else if (error) {
            logger.error(error);
            if (error === 'Template does not match' || error === 'Data must be an Array') { error = 'It appears the template does not match'; }
            Client.findById(curveUser.clientId)
              .then((client) => {
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your Work Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Work Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(`Error finding client for notification with clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
            // Delete Import Files
            fs.unlinkSync(workData.works);
          } else {
            Work.importWorks(workData.works, workData.alternateTitles, workData.participators, workData.specificRights, workData.societyIdentifiers, workData.ipChain, workData.partnerRightsChains, workData.indexedComposersPublishers, workData.indexedPartnerComposersPublishers, curveUser.clientId, overwriteBlanks, (errors, count, importedWorks) => {
              if (errors && errors.length > 0) {
                logger.error(errors);
                if (errors[0] === 'Data must be an Array') {
                  errors = ['It appears the template does not match. Try downloading and checking our most up to date templates to ensure it matches.'];
                }
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Work Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Work Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(`Error finding client for notification with clientId '${curveUser.clientId}': ${err}`);
                    callback(err);
                  });

                // Delete Import Files
                fs.unlinkSync(workData.works);
                fs.unlinkSync(importedWorks);
              } else {
                // Didn't error, save.
                const partialImportErrors = [];
                let workCount = 0;
                // save composers/publishers
                saveChainComposersPublishers(workData.indexedComposersPublishers, partialImportErrors, () => {
                  lineReader.eachLine(importedWorks, async (batch, last, cb) => {
                    if (!last) {
                      batch = JSON.parse(batch);
                      async.eachSeries(batch, (importedWork, acb) => {
                        workCount += 1;
                        logger.info(`Client ${importedWork.clientId}: Importing Work ${workCount}/${totalWorks}`);
                        Work.findById(importedWork._id)
                          .then((work) => {
                            if (work) {
                              for (const key in importedWork) {
                                if (Object.hasOwnProperty.call(importedWork, key)) { work[key] = importedWork[key]; }
                              }
                            } else {
                              work = new Work(importedWork);
                            }

                            if (!work.createdBy) {
                              work.createdBy = curveUser.id;
                            }
                            work.lastModifiedBy = curveUser.id;

                            work.save()
                              .then(() => {
                                acb();
                              })
                              .catch((err) => {
                                partialImportErrors.push(`Work ${work.title} did not save - ${err.message || err}`);
                                acb();
                              });
                          })
                          .catch((error) => {
                            logger.error(`Error finding work for importFromExcel with workId '${importedWork._id}': ${error}`);
                            acb();
                          });
                      }, () => {
                        cb();
                      });
                    } else {
                      cb(false);
                      if (partialImportErrors.length > 0) {
                        const generateOptions = {
                          identifier: 'partialImportError',
                          curveUser,
                          client,
                          subject: 'Your Work Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };

                        Notification.generate(
                          'Your Work Import Was Partially Successful',
                          `${partialImportErrors.length} errors in file ${file.originalname}`,
                          null,
                          curveUser,
                          generateOptions,
                          (err, result) => {
                            if (callback) { callback(err, result); }
                          },
                        );
                      } else {
                        // Send success email
                        Client.findById(curveUser.clientId)
                          .then((client) => {
                            const generateOptions = {
                              identifier: 'importComplete',
                              curveUser,
                              client,
                              subject: 'Your Work Import Has Completed',
                              file: file.originalname,
                              count,
                            };
                            Notification.generate('Your Work Import Has Completed', `${count} Works imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                              if (callback) { callback(err, result); }
                            });
                          })
                          .catch((err) => {
                            logger.error(`Error finding client for notification with clientId '${curveUser.clientId}': ${err}`);
                            callback(err);
                          });
                      }

                      // Delete Import Files
                      fs.unlinkSync(workData.works);
                      fs.unlinkSync(importedWorks);
                    }
                  });
                });
              }
            });
          }
        });
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Work Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Work Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client for notification with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports a single Work.
  *
  * Calls callback(error, work) with an [error] if an errror occurs and the imported [work].
  *
  * @method
  * @param {object} data - The Work to import.
  * @param {object[]} alternateTitles - alternateTitles to be added to the work.
  * @param {object[]} participators - participators to be added to the work.
  * @param {object[]} specificRights - specificRights to be added to the work.
  * @param {object[]} societyIdentifiers - societyIdentifiers to be added to the work.
  * @param {object[]} ipChains - ipChains to be added to the work.
  * @param {string} clientId - ID of the client importing the Work.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */

workSchema.statics.importWork = function (data, alternateTitles, participators, specificRights, societyIdentifiers, ipChains, partnerRightsChains, indexedComposersPublishers, indexedPartnerComposersPublishers, clientId, overwriteBlanks, index, callback) {
  try {
    const Track = require('../track');
    let errors = [];
    let query;
    if (!data) {
      return callback('Work must be passed');
    } if (!data.title || data.title === '') {
      return callback();
    }
    if (ObjectId.isValid(data._id)) {
      query = { _id: new ObjectId(data._id), clientId };
    } else if (data.identifier) {
      query = { clientId, identifier: data.identifier };
    }
    // logger.debug(`Importing ${data.title}`);
    async.waterfall([
      function (waterfallCb) {
        if (query) {
          Work.findOne(query)
            .then((work) => {
              waterfallCb(null, work);
            })
            .catch((error) => {
              logger.error(`Error finding work for importWork with clientId '${clientId}': ${error}`);
              waterfallCb(error);
            });
        } else {
          waterfallCb(null, null);
        }
      },
      function (work, waterfallCb) {
        if (!work) {
          work = new Work({
            clientId,
            identifier: data.identifier,
          });
          if (data.identifier || overwriteBlanks) { work.identifier = data.identifier; }
        }
        waterfallCb(null, work);
      },
      function (work, waterfallCb) {
        // Clear any arrays if overwriteBlanks is set
        if (data.title || overwriteBlanks) { work.title = data.title; }
        if (data.alternateTitles || overwriteBlanks) { work.alternateTitles = data.alternateTitles; }
        if (data.composer || overwriteBlanks) { work.composer = data.composer; }
        if (data.foreignId || overwriteBlanks) { work.foreignId = data.foreignId; }
        if (data.projectId || overwriteBlanks) { work.projectId = data.projectId; }
        if (data.iswc || overwriteBlanks) { work.iswc = data.iswc; }
        if (data.tunecode || overwriteBlanks) { work.tunecode = data.tunecode; }
        if (data.copyrightDate || overwriteBlanks) { work.copyrightDate = data.copyrightDate; }
        if (data.labelCopy || overwriteBlanks) { work.labelCopy = data.labelCopy; }
        // eslint-disable-next-line max-len
        if (data.performers || overwriteBlanks) { work.performers = data.performers; }
        if (data.priority || data.priority === false || overwriteBlanks) { work.priority = data.priority; }
        if (data.productionLibrary || data.productionLibrary === false || overwriteBlanks) { work.productionLibrary = data.productionLibrary; }
        if (data.compositeCount || overwriteBlanks) { work.compositeCount = data.compositeCount; }
        if (['Pop', 'Jazz', 'Classical', 'Undefined'].includes(data.workDescriptionCategory) || data.workDescriptionCategory === '' || !data.workDescriptionCategory) {
          work.workDescriptionCategory = data.workDescriptionCategory;
        } else {
          errors.push(`Line ${data.line}: Category doesn't match list`);
        }
        if ([
          'English', 'Arabic', 'Assamese', 'Aymara', 'Azerbaijani', 'Bashkir', 'Basque', 'Bengali', 'Bhutani', 'Bihari', 'Bislama', 'Breton', 'Bulgarian', 'Burmese', 'Byelorussian',
          'Cambodian', 'Catalan', 'Chinese', 'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Esperanto', 'Estonian', 'Faeroese', 'Farsi', 'Fiji', 'Finnish', 'French',
          'Frisian', 'Galician', 'Georgian', 'German', 'Greek', 'Greenlandic', 'Guarani', 'Gujarati', 'Hausa', 'Hawaii', 'Hebrew', 'Hindi', 'Hungarian', 'Icelandic',
          'Indonesian', 'Interlingua', 'Interlingue', 'Inupiak', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kashmiri', 'Kazakh', 'Kinyarwanda', 'Kirghiz',
          'Kirundi', 'Korean', 'Kurdish', 'Laothian', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Maori',
          'Marathi', 'Moldavian', 'Mongolian', 'Nauru', 'Ndebele', 'Nepali', 'North Sotho', 'Norwegian', 'Occitan', 'Oriya', 'Oromo', 'Papiamento', 'Pashto', 'Polish',
          'Portuguese', 'Punjabi', 'Quechua', 'Rhaeto-Romance', 'Romanian', 'Russian', 'Samoan', 'Sangro', 'Sanskrit', 'Scots Gaelic', 'Serbian', 'Serbo-Croatian',
          'Sesotho', 'Setswana', 'Shona', 'Sindhi', 'Singhalese', 'Siswati', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sudanese', 'Swahili', 'Swedish', 'Tagalog',
          'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai', 'Tibetan', 'Tigrinya', 'Tonga', 'Tsonga', 'Turkish', 'Turkmen', 'Twi', 'Ukranian', 'Urdu', 'Uzbek', 'Venda',
          'Vietnamese', 'Volapuk', 'Welsh', 'Wolof', 'Xhosa', 'Yiddish', 'Yoruba', 'Zu', 'Zulu',
        ].includes(data.workLanguage) || data.workLanguage === '' || !data.workLanguage) {
          work.workLanguage = data.workLanguage;
        } else {
          errors.push(`Line ${data.line}: Language doesn't match list`);
        }
        if (['None', 'Composite of Samples', 'Medley', 'Potpourri', 'Unspecified'].includes(data.compositeType) || data.compositeType === '' || !data.compositeType) {
          work.compositeType = data.compositeType;
        } else {
          errors.push(`Line ${data.line}: Composite Type doesn't match list`);
        }
        if (['Original Work', 'Modification'].includes(data.versionType) || data.versionType === '' || !data.versionType) {
          work.versionType = data.versionType;
        } else {
          errors.push(`Line ${data.line}: Work Version doesn't match list`);
        }
        if (['Original', 'New Music Added', 'Arrangement', 'Addition of Music to Text', 'Unspecified'].includes(data.arrangementType) || data.arrangementType === '' || !data.arrangementType) {
          work.arrangementType = data.arrangementType;
        } else {
          errors.push(`Line ${data.line}: Arrangement Type doesn't match list`);
        }
        if (['Original', 'None', 'New Lyrics Added', 'Modification', 'Replaced', 'Addition of Lyrics to Music', 'Translation', 'Unspecified'].includes(data.lyricAdaptionType) || data.lyricAdaptionType === '' || !data.lyricAdaptionType) {
          work.lyricAdaptionType = data.lyricAdaptionType;
        } else {
          errors.push(`Line ${data.line}: Lyric Adaption doesn't match list`);
        }
        if (data.notes || overwriteBlanks) { work.notes = data.notes; }
        if ((data.aliases && data.aliases.length !== 0) || overwriteBlanks) { work.aliases = data.aliases.filter(Boolean); }
        waterfallCb(null, work);
      },
      // Handle Work Territories
      function (work, waterfallCb) {
        if (overwriteBlanks) { work.territories = []; }

        if (data.territories && Array.isArray(data.territories) && data.territories.length) {
          if (data.territories.length === 1) {
            if (data.territories[0] === 'WW' || data.territories[0] === 'world' || data.territories[0] === 'World') {
              work.territories = TerritoryHelper.allTerritories;
              waterfallCb(null, work);
            } else {
              TerritoryGroup.findOne({ clientId, name: data.territories[0] })
                .then((territoryGroup) => {
                  if (territoryGroup) { work.territories = territoryGroup.territories; } else { work.territories = data.territories; }
                  waterfallCb(null, work);
                })
                .catch((error) => {
                  logger.error(`Error finding territory group for importWork with clientId '${clientId}': ${error}`);
                  waterfallCb(null, work);
                });
            }
          } else {
            work.territories = data.territories;
            waterfallCb(null, work);
          }
        } else {
          waterfallCb(null, work);
        }
      },
      function (work, waterfallCb) {
        if ((data.catalogueGroups && data.catalogueGroups.length !== 0) || overwriteBlanks) {
          work.catalogueGroups = [];
          Client.findById(clientId)
            .then((client) => {
              if (client && data.catalogueGroups && data.catalogueGroups.length > 0) {
                data.catalogueGroups.forEach((catGroup) => {
                  if (client.catalogueGroups.indexOf(catGroup) !== -1) {
                    work.catalogueGroups.push(catGroup);
                  } else {
                    errors.push(`Line ${data.line}: Catalogue Group ${catGroup} doesn't match list`);
                  }
                });
              }
              waterfallCb(null, work);
            })
            .catch((error) => {
              logger.error(`Error finding client for importWork with clientId '${clientId}': ${error}`);
              waterfallCb(error, work);
            });
        } else {
          waterfallCb(null, work);
        }
      },
      function (work, waterfallCb) {
        work.findRelatedTracks(data, Track, (err) => {
          waterfallCb(err, work);
        });
      },
      function (work, waterfallCb) {
        // logger.debug(`${data.title}: Adding participators`);
        work.addAlternateTitles(alternateTitles, clientId, overwriteBlanks, (err, altTitlesErrors) => {
          errors = errors.concat(altTitlesErrors);
          waterfallCb(err, work);
        });
      },
      function (work, waterfallCb) {
        // logger.debug(`${data.title}: Adding participators`);
        work.addParticipators(participators, clientId, overwriteBlanks, (err, participatorsErrors) => {
          errors = errors.concat(participatorsErrors);
          waterfallCb(err, work);
        });
      },
      function (work, waterfallCb) {
        // Check the contract IDs are unique
        work.checkMultipleContracts((err) => {
          if (err) { errors.push(`Line ${data.line}: ${err}`); }
          waterfallCb(null, work);
        });
      },
      function (work, waterfallCb) {
        // logger.debug(`${data.title}: Adding Specific Participation Rates`);
        work.addSpecificRights(specificRights, clientId, overwriteBlanks, (err, specificErrors) => {
          errors = errors.concat(specificErrors);
          waterfallCb(err, work);
        });
      },
      function (work, waterfallCb) {
        // logger.debug(`${data.title}: Adding Society Identifiers`);
        work.addSocietyIdentifiers(societyIdentifiers, clientId, overwriteBlanks, (err, identifiersErrors) => {
          errors = errors.concat(identifiersErrors);
          waterfallCb(err, work);
        });
      },
      function (work, waterfallCb) {
        // logger.debug(`${data.title}: Adding IP Chains`);
        work.addIpChains(ipChains, indexedComposersPublishers, clientId, overwriteBlanks, (err, ipChainsErrors) => {
          errors = errors.concat(ipChainsErrors);
          waterfallCb(err, work);
        });
      },
      function (work, waterfallCb) {
        if (partnerRightsChains) {
          work.addPartnerIpChains(partnerRightsChains, indexedPartnerComposersPublishers, clientId, overwriteBlanks)
            .then((ipChainErrors) => {
              errors = errors.concat(ipChainErrors);
              waterfallCb(null, work);
            })
            .catch((err) => waterfallCb(err, work));
        } else {
          waterfallCb(null, work);
        }
      },
    ], (err, work) => {
      if (err) {
        callback(err);
      } else if (errors.length > 0) {
        callback(errors);
      } else {
        work.validate()
          .then(() => {
            callback(null, work);
          })
          .catch((error) => {
            callback(error, work);
          });
      }
    });
  } catch (e) {
    logger.error(e);
    callback('An unknown error occurred when ingesting this work. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
};

workSchema.methods.findRelatedTracks = function (workData, Track, callback) {
  const work = this;
  // Map tracks
  const isrcs = workData.trackIsrcs?.map((isrc) => isrc.toString().replace(/[^a-zA-Z0-9]/ig, ''));
  if (!isrcs.length) return callback();

  Track.find({ clientId: work.clientId, isrc: { $in: isrcs } })
    .then((tracks) => {
      work.trackIds = tracks.map((track) => track._id.toString());
      callback();
    });
};

/**
  * Add ip chains to a Work.
  *
  * Calls callback(error) with an [error] if an errror occurs.
  *
  * @method
  * @param {object[]} ipChains - ipChains to be added to the work.
  * @param {object[]} indexedComposersPublishers - all Composers and Publishers specified in the rights chain
  * @param {string} clientId - ID of the client importing the Work.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
*/
workSchema.methods.addIpChains = function (indexedIpChains, indexedComposersPublishers, clientId, overwriteBlanks, callback) {
  const work = this;
  let workIpChains = [];
  if (overwriteBlanks) { work.rightsChain = []; }

  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const ipChains = getItemsFromIndexedObject(work, indexedIpChains, identifiers);
  const { chains, errors } = importTerritoryChains(ipChains);
  workIpChains = workIpChains.concat(chains);

  if (errors.length > 0) {
    callback(null, errors);
  } else if (workIpChains.length === 0) {
    callback(null, errors);
  } else {
    work.rightsChain = [];
    async.eachSeries(workIpChains, (chain, cb) => {
      let formattedChainTerritoryIndex = 0;
      let formattedChainTerritoryChildIndex = 0;
      async.series([
        // Match based on territory
        (scb) => {
          let isTerritoryAlreadyAdded = false;
          work.rightsChain.map((formattedChain, index) => {
            if ((formattedChain.territory !== 'specific' && formattedChain.territory === chain.territory) || (formattedChain.territory === 'specific' && formattedChain?.territoryCodes?.name === chain.territoryCodes?.name)) {
              // Territory already added to the list, add chain to it where the same
              formattedChain.children.push({
                type: chain.participant1Type,
                name: chain.participant1Name,
                firstName: chain.participant1FirstName,
                middleName: chain.participant1MiddleName,
                surname: chain.participant1Surname,
                caeNumber: chain.participant1CaeNumber,
                controlled: chain.participant1Controlled,
                mechanicalOwnership: chain.participant1MechanicalOwned,
                mechanicalCollection: chain.participant1MechanicalCollected,
                performanceOwnership: chain.participant1PerformanceOwned,
                performanceCollection: chain.participant1PerformanceCollected,
                contractType: chain.participant1Capacity,
                children: [],
                index: chain.index,
              });

              isTerritoryAlreadyAdded = true;
              formattedChainTerritoryIndex = index;
              formattedChainTerritoryChildIndex = formattedChain.children.length - 1;
            }
          });

          if (!isTerritoryAlreadyAdded) {
            // Territory not added, add new one and add the chain to it.
            work.rightsChain.push({
              territory: chain.territory,
              territoryCodes: chain.territoryCodes,
              children: [{
                type: chain.participant1Type,
                name: chain.participant1Name,
                firstName: chain.participant1FirstName,
                middleName: chain.participant1MiddleName,
                surname: chain.participant1Surname,
                caeNumber: chain.participant1CaeNumber,
                controlled: chain.participant1Controlled,
                mechanicalOwnership: chain.participant1MechanicalOwned,
                mechanicalCollection: chain.participant1MechanicalCollected,
                performanceOwnership: chain.participant1PerformanceOwned,
                performanceCollection: chain.participant1PerformanceCollected,
                contractType: chain.participant1Capacity,
                children: [],
                index: chain.index,
              }],
            });
            formattedChainTerritoryIndex = work.rightsChain.length - 1;
            formattedChainTerritoryChildIndex = 0;
          }

          scb();
        },
        // Format chain into parents/children
        (scb) => {
          // Reunite children with their parents
          work.rightsChain[formattedChainTerritoryIndex].children[formattedChainTerritoryChildIndex].children = getParentsChildren(2, chain);
          // Set template line number against parent
          work.rightsChain[formattedChainTerritoryIndex].line = chain.line;
          scb();
        },
      ], cb);
    }, () => {
      if (work.rightsChain && work.rightsChain.length > 0) {
        async.series([
          // Combine duplicate same level publishers
          (scb) => {
            // Loop through territories and combine parents
            work.rightsChain.map((chain) => {
              chain.children = chain?.children?.length > 0 ? IpChainUtils.combineDuplicatePublishers(chain.children) : chain.children;
            });
            scb();
          },
          // Make sure composers don't have children
          (scb) => {
            work.rightsChain.map((chain) => {
              combineChildComposers(chain, chain.line, errors);
            });
            scb();
          },
          (scb) => {
            // Clear line number from previous function
            work.rightsChain.forEach((chain) => {
              if (chain.line || chain.line === 0) { delete chain.line; }
            });
            scb();
          },
          // Format territories if they're a territory group
          (scb) => {
            async.each(work.rightsChain, (formattedChain, ecb) => {
              if (!allTerritories.includes(formattedChain.territory)) {
                if (formattedChain.territory === 'specific') {
                  // Check if EVERY value exists in allterritories
                  const everyExists = formattedChain.territoryCodes?.codes?.every((territory) => allTerritories.includes(territory));
                  everyExists ? ecb() : ecb(new Error('IP Chain Territory not recognised'));
                } else {
                  // Find group by name
                  TerritoryGroup.findOne({ clientId, name: formattedChain.territory })
                    .then((territoryGroup) => {
                      if (territoryGroup) {
                        // Replace territory with territory group ID
                        formattedChain.territory = territoryGroup._id.toString();
                        ecb();
                      } else {
                        logger.error(`IP Chain Territory not recognised with clientId '${clientId}': territory '${formattedChain.territory}'`);
                        ecb(new Error('IP Chain Territory not recognised'));
                      }
                    })
                    .catch((error) => {
                      logger.error(`Error finding territory group for addImportChains with clientId '${clientId}': ${error}`);
                      ecb(new Error('IP Chain Territory not recognised'));
                    });
                }
              } else {
                // When territory is from standard list, continue
                ecb();
              }
            }, scb);
          },
          // Add composer/publisher IDs
          (scb) => {
            work.rightsChain.forEach((chain) => {
              mapToPublisherOrComposer(chain, indexedComposersPublishers, clientId);
            });
            scb();
          },
          // Round up/down shares
          (scb) => {
            work.rightsChain.forEach((chain) => {
              roundIpChainShares(chain);
            });
            scb();
          },
        ], (err) => {
          callback(err, errors);
        });
      } else {
        callback(null, errors);
      }
    });
  }
};

/**
  * Add Partner IP Chains to a Work. Similar to addIpChains method but for partnerRightsChains (and using async instead of callbacks)
  *
  * Returns an array of errors (string[]) if any occured
  *
  * @method
  * @param {object[]} ipChains - Partner IP Chains to be added to the work.
  * * @param {object[]} indexedComposersPublishers - all Composers and Publishers specified in the rights chain
  * @param {string} clientId - ID of the client importing the Work.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
*/
workSchema.methods.addPartnerIpChains = async function (indexedIpChains, indexedComposersPublishers, clientId, overwriteBlanks) {
  const DeliveryPartner = require('../deliveryPartner');
  const work = this;
  if (overwriteBlanks || !work.partnerRightsChains) work.partnerRightsChains = [];
  let importErrors = [];

  const identifiers = ['_id', 'identifier', 'tunecode', 'title', 'partnerName'];
  const ipChains = getItemsFromIndexedObject(work, indexedIpChains, identifiers);

  const chainsByPartner = groupBy(ipChains, (chain) => chain.partnerName);

  for (const [partnerName, ipChains] of Object.entries(chainsByPartner)) {
    const partnerChain = { deliveryPartnerId: null, rightsChain: [] };
    const { chains, errors } = importTerritoryChains(ipChains);
    // partnerChain.rightsChain = chains;
    importErrors = importErrors.concat(errors);

    // Stop importing if any errors have occured
    if (importErrors.length > 0) break;
    // eslint-disable-next-line no-continue
    if (chains.length === 0) continue;

    let formattedChainTerritoryIndex = 0;
    let formattedChainTerritoryChildIndex = 0;

    for (const chain of chains) {
      let isTerritoryAlreadyAdded = false;
      // eslint-disable-next-line no-loop-func
      partnerChain.rightsChain.map((formattedChain, index) => {
        if ((formattedChain.territory !== 'specific' && formattedChain.territory === chain.territory) || (formattedChain.territory === 'specific' && formattedChain?.territoryCodes?.name === chain.territoryCodes?.name)) {
          // Territory already added to the list, add chain to it where the same
          formattedChain.children.push({
            type: chain.participant1Type,
            name: chain.participant1Name,
            firstName: chain.participant1FirstName,
            middleName: chain.participant1MiddleName,
            surname: chain.participant1Surname,
            caeNumber: chain.participant1CaeNumber,
            controlled: chain.participant1Controlled,
            mechanicalOwnership: chain.participant1MechanicalOwned,
            mechanicalCollection: chain.participant1MechanicalCollected,
            performanceOwnership: chain.participant1PerformanceOwned,
            performanceCollection: chain.participant1PerformanceCollected,
            contractType: chain.participant1Capacity,
            children: [],
            index: chain.index,
          });
          isTerritoryAlreadyAdded = true;
          formattedChainTerritoryIndex = index;
          formattedChainTerritoryChildIndex = formattedChain.children.length - 1;
        }
      });
      if (!isTerritoryAlreadyAdded) {
        // Territory not added, add new one and add the chain to it.
        partnerChain.rightsChain.push({
          territory: chain.territory,
          territoryCodes: chain.territoryCodes,
          children: [{
            type: chain.participant1Type,
            name: chain.participant1Name,
            firstName: chain.participant1FirstName,
            middleName: chain.participant1MiddleName,
            surname: chain.participant1Surname,
            caeNumber: chain.participant1CaeNumber,
            controlled: chain.participant1Controlled,
            mechanicalOwnership: chain.participant1MechanicalOwned,
            mechanicalCollection: chain.participant1MechanicalCollected,
            performanceOwnership: chain.participant1PerformanceOwned,
            performanceCollection: chain.participant1PerformanceCollected,
            contractType: chain.participant1Capacity,
            children: [],
            index: chain.index,
          }],
        });
        formattedChainTerritoryIndex = partnerChain.rightsChain.length - 1;
        formattedChainTerritoryChildIndex = 0;
      }

      // Reunite children with their parents
      partnerChain.rightsChain[formattedChainTerritoryIndex].children[formattedChainTerritoryChildIndex].children = getParentsChildren(2, chain);
      // Set template line number against parent
      partnerChain.rightsChain[formattedChainTerritoryIndex].line = chain.line;
    }

    // Combine same level publishers
    partnerChain.rightsChain.map((chain) => {
      chain.children = chain?.children?.length > 0 ? IpChainUtils.combineDuplicatePublishers(chain.children) : chain.children;
    });

    // Make sure composers don't have children
    // eslint-disable-next-line no-loop-func
    partnerChain.rightsChain.map((chain) => {
      const composerErrors = [];
      combineChildComposers(chain, chain.line, composerErrors);
      importErrors = importErrors.concat(composerErrors);
    });

    // Clear line number from previous function
    partnerChain.rightsChain.forEach((chain) => {
      if (chain.line || chain.line === 0) delete chain.line;
    });

    // Format territory if it's a territory group
    for (const chain of partnerChain.rightsChain) {
      if (!allTerritories.includes(chain.territory)) {
        if (chain.territory === 'specific') {
          // Check if EVERY value exists in all territories
          const everyExists = chain.territoryCodes?.codes?.every((territory) => allTerritories.includes(territory));
          if (!everyExists) throw new Error('IP Chain Territory not recognised');
        } else {
          // Find group by name
          const territoryGroup = await TerritoryGroup.findOne({ clientId, name: chain.territory });
          if (territoryGroup) {
            // Replace territory with territory group ID
            chain.territory = territoryGroup._id.toString();
          } else {
            throw new Error('IP Chain Territory not recognised');
          }
        }
      }
    }

    // Add composer/publisher IDs
    partnerChain.rightsChain.forEach((chain) => mapToPublisherOrComposer(chain, indexedComposersPublishers, clientId));

    // Round up/down shares
    partnerChain.rightsChain.forEach((chain) => roundIpChainShares(chain));

    // Get delivery partner ID
    const partner = await DeliveryPartner.findOne({ clientId, name: partnerName }, ['_id']);
    if (!partner) throw new Error(`Partner "${partnerName}" not found in Curve`);
    partnerChain.deliveryPartnerId = partner._id.toString();
    const index = work.partnerRightsChains.findIndex((obj) => obj.deliveryPartnerId === partnerChain.deliveryPartnerId);
    if (index >= 0 && work.partnerRightsChains[index]) {
      work.partnerRightsChains[index].rightsChain = partnerChain.rightsChain;
    } else {
      work.partnerRightsChains.push(partnerChain);
    }
  }

  return importErrors;
};

// Converts imported excel IP Chain rows into territory rights chains format
function importTerritoryChains(importedChains) {
  const newChains = [];
  let errors = [];
  importedChains.forEach((chain, index) => {
    chain.index = index;
    if (isObjectPopulated(chain)) {
      if (!chain.territory) {
        errors.push(`Line ${chain.line} Error: Territory required for IP Chain`);
      } else {
        // Split the territory string into an array
        const territoriesArray = chain.territory.split(';');
        // Check if EVERY value exists in allterritories
        const everyTerritoryExists = territoriesArray.every((territory) => allTerritories.includes(territory));
        if (everyTerritoryExists) {
          if (territoriesArray.includes('WW') || territoriesArray.includes('World')) {
            chain.territory = 'WW';
          } else {
            chain.territory = 'specific';
            chain.territoryCodes = { name: territoriesArray.join(','), codes: territoriesArray };
          }
        } else {
          logger.error(`${territoriesArray.filter((item) => !allTerritories.includes(item)).join(',')} Territory not found`);
        }
        newChains.push(chain);
        errors = errors.concat(validateChainRequiredFields(chain));
      }
    }
  });
  return { chains: newChains, errors };
}

/**
 * Validates an ip chain required fields
 *
 * @method
 * @param {object} chain - The ip chain to validate.
 * @param {number} index - Chain excel line number.
 * @returns {string[]} errors- An array of validation errors
 */

function validateChainRequiredFields(chain) {
  const errors = [];
  const excelTotalParticipants = 10;
  if (isObjectPopulated(chain)) {
    for (let i = 1; i < excelTotalParticipants + 1; i += 1) {
      if (chain[`participant${i}Type`]
        || chain[`participant${i}Name`]
        || chain[`participant${i}FirstName`]
        || chain[`participant${i}MiddleName`]
        || chain[`participant${i}Surname`]
        || chain[`participant${i}CaeNumber`]
        || chain[`participant${i}Controlled`]
        || chain[`participant${i}MechanicalOwned`]
        || chain[`participant${i}MechanicalCollected`]
        || chain[`participant${i}PerformanceOwned`]
        || chain[`participant${i}PerformanceCollected`]
        || chain[`participant${i}Capacity`]) {
        if (!chain[`participant${i}Name`]) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} name is required`);
        }
        if (!['Publisher', 'Composer'].includes(chain[`participant${i}Type`]) || !chain[`participant${i}Type`]) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} type doesn't match list`);
        }
        if (chain[`participant${i}Type`] === 'Publisher' && !['Admin', 'Sub Publisher', 'Original Publisher', 'Acquirer', 'Income Participant'].includes(chain[`participant${i}Capacity`])) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} capacity doesn't match publisher capacities list`);
        } else if (chain[`participant${i}Type`] === 'Composer' && !['Lyrics and Music', 'Lyrics', 'Music', 'Arranger', 'Sub Arranger', 'Adapter', 'Sub Author', 'Translator'].includes(chain[`participant${i}Capacity`])) {
          errors.push(`IP Chains Line ${chain.line}: Participant ${i} capacity doesn't match composer capacities list`);
        }
      }
    }
  }

  return errors;
}

/**
 * Makes sure Composers have no children and puts child composers on the same level as the parent
 *
 * @method
 * @param {object} chain - The ip chain to validate.
 */
function combineChildComposers(chain, lineNumber, errors) {
  chain.children.map((child) => {
    if (child.type === 'Composer' && child.children.length > 0) {
      child.children.map((subchild) => {
        if (subchild.type === 'Publisher') {
          errors.push(`IP Chains Line ${lineNumber}: Publishers should not follow Composers in the chain`);
        }
      });
      combineChildComposers(child, lineNumber, errors);
      chain.children = chain.children.concat(child.children);
      child.children = [];
    }
  });

  chain.children.map((child) => {
    combineChildComposers(child, lineNumber, errors);
  });
}

/**
 * Finds/Create composers/publishers and attaches the ID to the chain
 *
 * Calls callback(error) with an [error] if an errror occurs.
 *
 * @method
 * @param {object} chain - The ip chain to validate.
 * @param {string} clientId - Client doing the import.
 * @param {function(string)} callback - The callback that handles the response.
 */
function mapToPublisherOrComposer(chain, indexedComposersPublishers, clientId) {
  if (chain.children) {
    chain.children.forEach((child) => {
      if (child.type === 'Publisher' && indexedComposersPublishers && indexedComposersPublishers[`Publisher_${LowerCaseString(child.name)}`] && indexedComposersPublishers[`Publisher_${LowerCaseString(child.name)}`].publisher) {
        const publisherId = indexedComposersPublishers[`Publisher_${LowerCaseString(child.name)}`]?.publisher?._id?.toString()
          || indexedComposersPublishers[`Publisher_${LowerCaseString(child.name)}`]?.publisher?.publisher?._id?.toString();
        child.publisherId = publisherId;
      } else if (child.type === 'Composer' && indexedComposersPublishers && indexedComposersPublishers[`Composer_${LowerCaseString(child.name)}_${child.caeNumber}`] && indexedComposersPublishers[`Composer_${LowerCaseString(child.name)}_${child.caeNumber}`].composer) {
        const composerId = indexedComposersPublishers[`Composer_${LowerCaseString(child.name)}_${child.caeNumber}`]?.composer?._id?.toString()
          || indexedComposersPublishers[`Composer_${LowerCaseString(child.name)}_${child.caeNumber}`]?.composer?.composer?._id?.toString();
        child.composerId = composerId;
      }

      if (child.children) {
        mapToPublisherOrComposer(child, indexedComposersPublishers, clientId);
      }
    });
  }
}

function roundIpChainShares(chain) {
  if (chain.children) {
    chain.children.forEach((child) => {
      child.mechanicalOwnership = roundSingleIpChainShare(child.mechanicalOwnership);
      child.mechanicalCollection = roundSingleIpChainShare(child.mechanicalCollection);
      child.performanceOwnership = roundSingleIpChainShare(child.performanceOwnership);
      child.performanceCollection = roundSingleIpChainShare(child.performanceCollection);

      // Do the same for the children's children
      roundIpChainShares(child);
    });
  }
}

function roundSingleIpChainShare(share) {
  if (!share) { return share; }
  const roundedShare = Math.round(share * 100) / 100;
  return roundedShare;
}

/**
 * Gets all participants from an excel ip chain row
 *
 * @method
 * @param {number} startIndex - The participants index.
 * @param {object} chain - The ip chain to combine.
 */
function getParentsChildren(startIndex, chain) {
  if (chain[`participant${startIndex}Type`]
    || chain[`participant${startIndex}Name`]
    || chain[`participant${startIndex}FirstName`]
    || chain[`participant${startIndex}MiddleName`]
    || chain[`participant${startIndex}Surname`]
    || chain[`participant${startIndex}CaeNumber`]
    || chain[`participant${startIndex}Controlled`]
    || chain[`participant${startIndex}MechanicalOwned`]
    || chain[`participant${startIndex}MechanicalCollected`]
    || chain[`participant${startIndex}PerformanceOwned`]
    || chain[`participant${startIndex}PerformanceCollected`]
    || chain[`participant${startIndex}Capacity`]) {
    return [{
      type: chain[`participant${startIndex}Type`],
      name: chain[`participant${startIndex}Name`],
      firstName: chain[`participant${startIndex}FirstName`],
      middleName: chain[`participant${startIndex}MiddleName`],
      surname: chain[`participant${startIndex}Surname`],
      caeNumber: chain[`participant${startIndex}CaeNumber`],
      controlled: chain[`participant${startIndex}Controlled`],
      mechanicalOwnership: chain[`participant${startIndex}MechanicalOwned`],
      mechanicalCollection: chain[`participant${startIndex}MechanicalCollected`],
      performanceOwnership: chain[`participant${startIndex}PerformanceOwned`],
      performanceCollection: chain[`participant${startIndex}PerformanceCollected`],
      contractType: chain[`participant${startIndex}Capacity`],
      children: getParentsChildren(startIndex + 1, chain),
      index: chain.index,
    }];
  }
  return [];
}
/**
  * Add participators to a Work.
  *
  * Calls callback(error) with an [error] if an errror occurs.
  *
  * @method
  * @param {object[]} altTitles - altTitles to be added to the work.
  * @param {string} clientId - ID of the client importing the Work.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.methods.addAlternateTitles = function (indexedAltTitles, clientId, overwriteBlanks, callback) {
  const work = this;
  const errors = [];
  if (overwriteBlanks) {
    work.alternateTitles = [];
  }
  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const titles = getItemsFromIndexedObject(work, indexedAltTitles, identifiers);

  if (titles.length === 0) {
    callback(null, errors);
  } else {
    work.alternateTitles = [];

    async.eachLimit(titles, 10, (title, cb) => {
      if (isObjectPopulated(title)) {
        if (!title.altTitle) {
          errors.push(`Alternate Title Line ${title.line}: Title is required`);
        }

        if (title.altTitle) {
          work.alternateTitles.push({ title: title.altTitle, language: title.language });
          cb();
        } else {
          cb();
        }
      } else {
        cb();
      }
    }, (err) => {
      callback(err, errors);
    });
  }
};
/**
  * Add participators to a Work.
  *
  * Calls callback(error) with an [error] if an errror occurs.
  *
  * @method
  * @param {object[]} participators - participators to be added to the work.
  * @param {string} clientId - ID of the client importing the Work.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.methods.addParticipators = function (indexedParticipators, clientId, overwriteBlanks, callback) {
  const Contract = require('../contract');
  const work = this;
  const errors = [];
  if (overwriteBlanks) {
    work.salesReturnsRights = [];
    work.salesReturnsRightsDisplay = [];
  }
  for (const indexedParticipator of Object.values(indexedParticipators)) {
    const nestedParticipator = indexedParticipator[0];
    if ((nestedParticipator.contractName && (nestedParticipator.percentage !== 0 && !nestedParticipator)) || ((nestedParticipator.percentage === 0 || nestedParticipator.percentage) && !nestedParticipator.contractName)) {
      errors.push(`Partipators Line ${nestedParticipator.line} A Contract needs to be linked to a Percentage when a Participator Right is assigned`);
    }
  }
  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const participators = getItemsFromIndexedObject(work, indexedParticipators, identifiers);
  if (participators.length === 0) {
    callback(null, errors);
  } else {
    work.salesReturnsRights = [];
    work.salesReturnsRightsDisplay = [];

    async.eachLimit(participators, 10, (participator, cb) => {
      if (isObjectPopulated(participator)) {
        if (!participator.contractName) {
          errors.push(`Participators Line ${participator.line}: Contract name is required`);
        }

        if (!participator.percentage && participator.percentage !== '0' && participator.percentage !== 0) {
          errors.push(`Participators Line ${participator.line}: Rate is required`);
        }

        if (participator.contractName && (participator.percentage || participator.percentage === '0' || participator.percentage === 0)) {
          Contract.findOne({ clientId, name: participator.contractName })
            .then((contract) => {
              if (contract) {
                // Add field
                work.salesReturnsRights.push({ contractId: contract._id, percentage: participator.percentage });
                work.salesReturnsRightsDisplay.push({ contractId: contract._id, percentage: participator.percentage });
              } else {
                errors.push(`Participators Line ${participator.line}: Could not find contract with the name ${participator.contractName}`);
              }
              cb();
            })
            .catch((error) => {
              cb();
            });
        } else {
          cb();
        }
      } else {
        cb();
      }
    }, (err) => {
      callback(err, errors);
    });
  }
};
/**
  * Add society identifiers to a Work.
  *
  * Calls callback(error) with an [error] if an errror occurs.
  *
  * @method
  * @param {object[]} societyIdentifiers - society identifiers to be added to the work.
  * @param {string} clientId - ID of the client importing the Work.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.methods.addSocietyIdentifiers = function (indexedSocietyIdentifiers, clientId, overwriteBlanks, callback) {
  const work = this;
  const errors = [];
  if (overwriteBlanks) {
    work.societyIdentifiers = [];
  }

  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const societyIdentifiers = getItemsFromIndexedObject(work, indexedSocietyIdentifiers, identifiers);

  if (societyIdentifiers.length === 0) {
    callback(null, errors);
  } else {
    work.societyIdentifiers = [];
    async.eachLimit(societyIdentifiers, 10, (identifier, cb) => {
      if (isObjectPopulated(identifier)) {
        if (!identifier.society) {
          errors.push(`Society Identifiers Line ${identifier.line}: Society name is required`);
        }

        if (!identifier.societyIdentifier) {
          errors.push(`Society Identifiers Line ${identifier.line}: Identifier is required`);
        }

        if (identifier.society && identifier.societyIdentifier) {
          work.societyIdentifiers.push({
            society: identifier.society,
            identifier: identifier.societyIdentifier,
          });
        }
        cb();
      } else {
        cb();
      }
    }, (err) => {
      callback(err, errors);
    });
  }
};

/**
  * Checks that an imported row belongs to the work
  *
  * @method
  * @param {object} data - row to check
  * @return {boolean} - true if the row belongs to the work.
  */
workSchema.methods.dataBelongsToWork = function (data) {
  const work = this;
  if ((data._id && data._id !== '' && data._id === work._id.toString())
    || (!data._id && data.identifier && data.identifier !== '' && String(data.identifier) === String(work.identifier))
    || (!data._id && !data.identifier && data.tunecode && data.tunecode !== '' && String(data.tunecode) === String(work.tunecode))
    || (!data._id && !data.identifier && !data.tunecode && data.title && data.title !== '' && String(data.title) === String(work.title))) {
    return true;
  }
  return false;
};

/**
  * Add Specific Participation Rates to a Work.
  *
  * Calls callback(error) with an [error] if an errror occurs.
  *
  * @method
  * @param {object[]} specificRights - specificRights to be added to the work.
  * @param {string} clientId - ID of the client importing the Work.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.methods.addSpecificRights = function (indexedSpecificRights, clientId, overwriteBlanks, callback) {
  const Contract = require('../contract');
  const work = this;
  const errors = [];
  if (overwriteBlanks) { work.channelSpecificSalesReturnsRights = []; }

  const identifiers = ['_id', 'identifier', 'tunecode', 'title'];
  const specificRights = getItemsFromIndexedObject(work, indexedSpecificRights, identifiers);

  if (specificRights.length === 0) {
    callback(null, errors);
  } else {
    work.channelSpecificSalesReturnsRights = [];
    async.eachLimit(specificRights, 10, (right, cb) => {
      if (isObjectPopulated(right)) {
        // @tom ipChrightain ... not obvious what that should be...? 'right'?.. ''
        if (!right.contractName) {
          errors.push(`Specific Participation Rates Line ${right.line}: Contract name is required`);
        }

        if (!right.percentage && right.percentage !== 0 && right.percentage !== '0') {
          errors.push(`Specific Participation Rates Line ${right.line}: Rate is required`);
        }

        if (right.contractName && (right.percentage || right.percentage === 0 || right.percentage === '0')) {
          const item = {
            distributionChannel: right.distributionChannel,
            source: right.source,
            percentage: right.percentage,
          };

          async.waterfall([
            (waterfallCb) => {
              // Get contract
              Contract.findOne({ clientId, name: right.contractName })
                .then((contract) => {
                  if (contract) {
                    item.contractId = contract._id.toString();
                  } else if (right.contractName && right.contractName !== '') {
                    errors.push(`Specific Participation Rates Line ${right.line}: Contract not found`);
                  }
                  waterfallCb();
                })
                .catch((error) => {
                  logger.error(`Error finding contract for addSpecificRights with clientId '${clientId}': ${error}`);
                  waterfallCb();
                });
            },
            (waterfallCb) => {
              // Get Territory Group
              TerritoryGroup.findOne({ clientId, name: right.territory })
                .then((territoryGroup) => {
                  if (territoryGroup) {
                    item.territory = territoryGroup._id.toString();
                  } else if (!territoryGroup && !allTerritories.includes(right.territory) && right.territory && right.territory !== '') {
                    errors.push(`Specific Participation Rates Line ${right.line}: Territory not found`);
                  } else {
                    item.territory = right.territory;
                  }
                  waterfallCb();
                })
                .catch((error) => {
                  logger.error(`Error finding territory group for addSpecificRights with clientId '${clientId}': ${error}`);
                  waterfallCb();
                });
            },
            (waterfallCb) => {
              // Make sure channel is part of the client's settings
              if (right.distributionChannel) {
                Client.findById(clientId, 'distributionChannels')
                  .then((client) => {
                    if (client && client.distributionChannels && !client.distributionChannels.includes(right.distributionChannel)) {
                      errors.push(`Specific Participation Rates Line ${right.line}: Distribution Channel doesn't match list`);
                    }
                    waterfallCb();
                  })
                  .catch((error) => {
                    logger.error(`Error finding client for addSpecificRights with clientId '${clientId}': ${error}`);
                    waterfallCb();
                  });
              } else {
                waterfallCb();
              }
            },
            (waterfallCb) => {
              // Resolve publisher names to IDs
              if (right.publishers && right.publishers.trim() !== '') {
                const publisherNames = right.publishers.split(':').map((n) => n.trim()).filter(Boolean);
                resolvePublishersByName({ publisherNames, clientId })
                  .then(({ publisherIds, errors: publisherErrors }) => {
                    if (publisherErrors.length > 0) {
                      publisherErrors.forEach((publisherError) => {
                        errors.push(`Specific Participation Rates Line ${right.line}: ${publisherError}`);
                      });
                    } else {
                      item.publishers = publisherIds;
                    }
                    waterfallCb();
                  })
                  .catch((error) => {
                    logger.error(`Error resolving publishers for addSpecificRights with clientId '${clientId}': ${error}`);
                    waterfallCb();
                  });
              } else {
                waterfallCb();
              }
            },
          ], (err) => {
            if (err) {
              cb(err);
            } else {
              // Add output item to work
              work.channelSpecificSalesReturnsRights.push(item);
              cb();
            }
          });
        } else {
          cb();
        }
      } else {
        cb();
      }
    }, (err) => {
      // Enable publisher mapping on the work if any specific rate has publishers
      const hasPublishers = work.channelSpecificSalesReturnsRights.some(
        (right) => right.publishers && right.publishers.length > 0,
      );
      if (hasPublishers) {
        work.enablePublisherMapping = true;
      }
      callback(err, errors);
    });
  }
};

/**
  * Imports an array of Works.
  *
  * Calls callback(errors, count, importedWorks) with an array of [errors] if they occur, the [count] of Works imported, an array of [importedWorks].
  *
  * @method
  * @param {object[]} works - Works to import.
  * @param {object[]} ipChains - ipChains to be added to the works.
  * @param {object[]} specificRights - specificRights to be added to the works.
  * @param {string} clientId - ID of the client importing the Works.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object[])} callback - The callback that handles the response.
  */
workSchema.statics.importWorks = function (works, alternateTitles, participators, specificRights, societyIdentifiers, ipChains, partnerRightsChains, indexedComposersPublishers, indexedPartnerComposersPublishers, clientId, overwriteBlanks, callback) {
  if (!clientId) {
    callback(['A Client ID must be passed'], null);
  } else {
    let count = 0;
    let errors = [];
    let index = 0;
    const outputLocation = `${appRootDir}/tmp/ImportedWorks${moment().format('x')}.json`;
    const importedWorks = fs.createWriteStream(outputLocation);
    let importBatch = [];
    // Object to track how many times an identifier has been used => Return error if used more than once.
    const identifiersTracker = {};

    lineReader.eachLine(works, async (batch, last, cb) => {
      if (!last) {
        logger.debug(`Import: Processing batch ${index + 1}`);
        const batchValidation = `Client ${clientId}: Validating Work Batch ${5000 * index} - ${5000 * (index + 1)}`;
        console.time(batchValidation);
        index += 1;
        batch = JSON.parse(batch);

        await createMissingTracksUsingWorks(clientId, batch);

        async.eachLimit(batch, 10, (work, acb) => {
          if (isObjectPopulated(work)) {
            // Add identifier to the identifiersTracker
            if (work.identifier) {
              if (!identifiersTracker[work.identifier]) { identifiersTracker[work.identifier] = { count: 0, lines: [] }; }
              identifiersTracker[work.identifier].count += 1;
              identifiersTracker[work.identifier].lines.push(work.line);
            }
            Work.importWork(work, alternateTitles, participators, specificRights, societyIdentifiers, ipChains, partnerRightsChains, indexedComposersPublishers, indexedPartnerComposersPublishers, clientId, overwriteBlanks, index, (err, importedWork) => {
              if (Array.isArray(err)) {
                errors = errors.concat(err);
              } else if (err) {
                errors.push(`Line ${index + 3}: ${err}`);
              }
              if (importedWork) {
                count += 1;
                importBatch.push(importedWork);
              }
              if (importBatch.length === 5000) {
                importedWorks.write(`${JSON.stringify(importBatch)}\n`);
                importBatch = [];
              }
              acb();
            });
          } else {
            acb();
          }
        }, () => {
          console.timeEnd(batchValidation);
          cb();
        });
      } else {
        logger.info(`Client ${clientId}: Done validating Works, now saving..`);
        if (importBatch.length !== 0) {
          importedWorks.write(`${JSON.stringify(importBatch)}\n`);
        }
        importedWorks.write('Last_Line_Ignore');
        importedWorks.end();
        // Check the works have no duplicate identifiers
        Object.keys(identifiersTracker).forEach((identifier) => {
          if (identifiersTracker[identifier] && identifiersTracker[identifier].count > 1) {
            identifiersTracker[identifier].lines.forEach((line) => {
              errors.push(`Line ${line}: Identifier ${identifier} is required to be unique`);
            });
          }
        });
        errors = errors.filter((value, index, self) => self.indexOf(value) === index);
        callback(errors, count, outputLocation);
      }
    });
  }
};

/**
  * Adds Aliases to a Work
  *
  * Calls callback(errors, count) with an array of [errors] if any occur and the [count] of aliases added
  *
  * @method
  * @param {object[]} data - An array of aliases to import
  * @param {string} clientId - ID of the client importing the aliases
  * @param {function(string[], number)} callback - The callback that handles the response
  */
workSchema.statics.importAliases = function (data, curveUser, callback) {
  const { clientId, id } = curveUser;
  let count = 0;
  const errors = [];
  async.eachSeries(data, (line, cb) => {
    async.waterfall([
      function (waterfallCb) {
        Work.findOne({ clientId, identifier: line.identifier })
          .then((work) => {
            waterfallCb(null, work);
          })
          .catch((error) => {
            logger.error(`Error finding work for importAliases with clientId '${clientId}': ${error}`);
            waterfallCb(error);
          });
      },
      function (work, waterfallCb) {
        if (!work) {
          Work.findOne({ clientId, tunecode: line.identifier })
            .then((work) => {
              waterfallCb(null, work);
            })
            .catch((error) => {
              logger.error(`Error finding work for importAliases with clientId '${clientId}': ${error}`);
              waterfallCb(error, work);
            });
        } else {
          waterfallCb(null, work);
        }
      },
      function (work, waterfallCb) {
        if (work && line.alias && line.alias !== '') {
          work.aliases.push(line.alias);
          // Only unique aliases
          work.aliases = work.aliases.filter((value, index, self) => self.indexOf(value) === index);
          count += 1;
          work.lastModifiedBy = id;
          work.save()
            .then(() => {
              cb();
            })
            .catch((error) => {
              errors.push(`Line ${data.indexOf(line) + 3}: ${error.message}`);
              cb();
            });
        } else {
          waterfallCb();
        }
      },
    ], cb);
  }, (err) => {
    if (err) {
      callback([err], count);
    } else {
      callback(errors, count);
    }
  });
};

/**
  * Adds Society Identifiers to a Work
  *
  * Calls callback(errors, count) with an array of [errors] if any occur and the [count] of society identifiers added
  *
  * @method
  * @param {object[]} data - An array of society identifiers to import
  * @param {string} clientId - ID of the client importing the aliases
  * @param {function(string[], number)} callback - The callback that handles the response
  */
workSchema.statics.importSocietyIdentifiers = function (data, curveUser, callback) {
  const { clientId, id } = curveUser;
  let count = 0;
  const errors = [];
  async.eachSeries(data, (line, cb) => {
    async.waterfall([
      function (waterfallCb) {
        Work.findOne({ clientId, identifier: line.identifier })
          .then((work) => {
            waterfallCb(null, work);
          })
          .catch((error) => {
            logger.error(`Error finding work for importSocietyIdentifiers with clientId '${clientId}': ${error}`);
            waterfallCb(error);
          });
      },
      function (work, waterfallCb) {
        if (!work) {
          Work.findOne({ clientId, tunecode: line.identifier })
            .then((work) => {
              waterfallCb(null, work);
            })
            .catch((error) => {
              logger.error(`Error finding work for importSocietyIdentifiers with clientId '${clientId}': ${error}`);
              waterfallCb(error, work);
            });
        } else {
          waterfallCb(null, work);
        }
      },
      function (work, waterfallCb) {
        if (work) {
          work.societyIdentifiers.push({ society: line.pro, identifier: line.alias });
          // Only unique aliases
          work.societyIdentifiers = work.societyIdentifiers.filter((value, index, self) => self.indexOf(value) === index);
          count += 1;
          work.lastModifiedBy = id;
          work.save()
            .then(() => {
              cb();
            })
            .catch((error) => {
              errors.push(`Line ${data.indexOf(line) + 3}: ${error.message}`);
              cb();
            });
        } else {
          waterfallCb();
        }
      },
    ], cb);
  }, (err) => {
    if (err) {
      callback([err], count);
    } else {
      callback(errors, count);
    }
  });
};

/**
  * Adds contract rights to Work's field.
  *
  * Calls callback(errors) with an [error] if it occurs.
  *
  * @method
  * @param {string} contractName - The contract's name to add to the work.
  * @param {number} percentage - Contract's percentage.
  * @param {string} field - Field the contract's rights should be added to.
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.methods.mapRights = function (contractName, percentage, field, callback) {
  const work = this;
  const Contract = require('../contract');
  if (contractName && percentage) {
    Contract.findOne({ clientId: work.clientId, name: contractName })
      .then((contract) => {
        if (contract) {
          // work[field] = [];
          // Add field
          work[field].push({ contractId: contract._id, percentage });
          work[`${field}Display`].push({ contractId: contract._id, percentage });

          // Remove any duplicates
          const obj = {};
          for (let i = 0, len = work[field].length; i < len; i += 1) {
            obj[work[field][i].contractId] = work[field][i];
          }
          work[field] = [];
          for (const key in obj) {
            work[field].push(obj[key]);
          }

          callback();
        } else {
          callback(new Error(`Could not find contract with the name ${contractName}`));
        }
      })
      .catch((error) => {
        logger.error(`Error finding contract for mapRights with clientId '${work.clientId}': ${error}`);
        callback(new Error(`Could not find contract with the name ${contractName}`));
      });
  } else {
    callback();
  }
};

/**
  * Add's an acknowledgement to a Work's societyIdentifiers.
  *
  * Calls callback(errors) with an [error] if it occurs.
  *
  * @method
  * @param {object} acknowledgement - Acknowledgement to add.
  * @param {boolean} receivingParty - The receiving party (society).
  * @param {function(string)} callback - The callback that handles the response.
  */

workSchema.methods.updateWithAcknowledgement = function (acknowledgement, receivingParty, callback) {
  const work = this;
  if (acknowledgement.iswc) { work.iswc = acknowledgement.iswc; }
  if (acknowledgement.partnerId && acknowledgement.partnerId !== '00000000000') {
    work.societyIdentifiers.push({ society: receivingParty, identifier: acknowledgement.partnerId });
    if (!work.tunecode || work.tunecode === '') { work.tunecode = acknowledgement.partnerId; }
  }
  // Flush through any duplicate identifiers
  work.uniqueSocietyIdentifiers();
  Work.findByIdAndUpdate(work._id, { $set: { tunecode: work.tunecode, iswc: work.iswc, societyIdentifiers: work.societyIdentifiers } })
    .then((work) => {
      callback(null, work);
    })
    .catch((error) => {
      callback(error);
    });
};

function isObjectPopulated(obj) {
  let objectPopulated = false;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] !== '' && obj[key] !== undefined && obj[key] !== null) objectPopulated = true;
    }
  }
  return objectPopulated;
}

/**
 * Creates a new Composer.
 *
 * Calls callback(error, composer) with an [error] if an error occurs and the created [composer].
 *
 * @method
 * @param {string} clientId - The ID of the client creating the composer.
 * @param {string} name - Name of the composer.
 * @param {string} firstName - First name of the composer.
 * @param {string} middleNames - Middle names of the composer.
 * @param {string} surname - Surname of the composer.
 * @param {string} cae - CAE of the composer.
 * @param {boolean} controlled - Is the composer controlled?.
 * @param {function(string, object)} callback - The callback that handles the response.
 */

function getComposer(clientId, name, firstName, middleNames, surname, cae, controlled, indexed, callback) {
  const Composer = require('../composer');
  async.waterfall([
    function (cb) {
      if (cae && Utils.removeLeadingZeros(cae)) {
        const caeWithoutLeadingZeros = Utils.removeLeadingZeros(cae);
        Composer.findOne({ clientId, $or: [{ cae: Utils.padLeadingZeros(cae, 11) }, { cae: caeWithoutLeadingZeros }, { caeWithoutLeadingZeros }] })
          .then((composer) => {
            cb(null, composer);
          })
          .catch((err) => {
            cb(err);
          });
      } else {
        cb(null, null);
      }
    },
    function (composer, cb) {
      if (composer) {
        cb(null, composer);
      } else {
        // Find the one composer only if its name is the name and where the CAE is null or has 00000000000
        const nameCaeFilter = {
          clientId,
          lowerCaseName: LowerCaseString(name),
          $or: [
            { cae: { $eq: null } },
            { cae: { $eq: '00000000000' } },
            { cae: { $eq: '' } },
          ],
        };
        Composer.findOne(nameCaeFilter)
          .then((composer) => {
            cb(null, composer);
          })
          .catch((err) => {
            cb(err);
          });
      }
    },
    function (composer, cb) {
      if (composer && Utils.removeLeadingZeros(composer.cae) !== Utils.removeLeadingZeros(cae)) {
        cb(null, null);
      } else {
        cb(null, composer);
      }
    },
    function (composer, cb) {
      if (composer) {
        cb(null, composer);
      } else {
        // avoid creating duplicate composers with the same CAE
        let foundComposer = null;
        const caeWithoutLeadingZeros = cae && Utils.removeLeadingZeros(cae.toString());
        for (const key in indexed) {
          if (indexed.hasOwnProperty(key)) {
            const indexedComposer = indexed[key];

            // Check if caeNumber matches and has not already created a composer
            if (indexedComposer.type === 'Composer' && indexedComposer.caeNumber && Utils.removeLeadingZeros(indexedComposer.caeNumber.toString()) === caeWithoutLeadingZeros
              && (caeWithoutLeadingZeros || LowerCaseString(indexedComposer.name) === LowerCaseString(name)) && indexedComposer?.composer?._id) {
              foundComposer = indexedComposer;
              break; // Exit loop after finding the first match
            }
          }
        }
        if (foundComposer) {
          // Found a matching composer in the indexed object
          cb(null, foundComposer);
        } else {
          // No matching composer found, proceed with creation logic
          cb(null, null);
        }
      }
    },
  ], (err, composer) => {
    if (composer) {
      // Return Composer
      callback(err, composer);
    } else if (name) {
      // Create Composer
      let composer = new Composer({
        clientId,
        name,
        cae: Utils.padLeadingZeros(cae, 11),
        firstName,
        middleNames,
        surname,
        controlled,
      });
      composer.validate()
        .then(() => {
          composer = JSON.parse(JSON.stringify(composer));
          composer.saveLater = true;
          callback(null, composer);
        })
        .catch((err) => {
          composer = JSON.parse(JSON.stringify(composer));
          composer.saveLater = true;
          callback(err, composer);
        });
    } else {
      callback(new Error('Composer requires name'));
    }
  });
}

/**
 * Creates a new Publisher.
 *
 * Calls callback(error, publisher) with an [error] if an error occurs and the created [publisher].
 *
 * @method
 * @param {string} clientId - The ID of the client creating the publisher.
 * @param {string} name - Name of the publisher.
 * @param {string} cae - CAE of the publisher.
 * @param {boolean} controlled - Is the composer publisher?.
 * @param {function(string, object)} callback - The callback that handles the response.
 */

function getPublisher(clientId, name, cae, controlled, indexed, callback) {
  const Publisher = require('../publisher');
  async.waterfall([
    function (cb) {
      if (cae && Utils.removeLeadingZeros(cae)) {
        const caeWithoutLeadingZeros = Utils.removeLeadingZeros(cae);
        Publisher.findOne({ clientId, $or: [{ cae: Utils.padLeadingZeros(cae, 11) }, { cae: caeWithoutLeadingZeros }, { caeWithoutLeadingZeros }], lowerCaseName: LowerCaseString(name) })
          .then((publisher) => {
            cb(null, publisher);
          })
          .catch((err) => {
            cb(err);
          });
      } else {
        cb(null, null);
      }
    },
    function (publisher, cb) {
      if (publisher) {
        cb(null, publisher);
      } else if (cae && Utils.removeLeadingZeros(cae)) {
        const caeWithoutLeadingZeros = Utils.removeLeadingZeros(cae);
        Publisher.findOne({ clientId, $or: [{ cae }, { cae: caeWithoutLeadingZeros }, { caeWithoutLeadingZeros }] })
          .then((publisher) => {
            cb(null, publisher);
          })
          .catch((err) => {
            cb(err);
          });
      } else {
        cb(null, null);
      }
    },
    function (publisher, cb) {
      if (publisher) {
        cb(null, publisher);
      } else {
        Publisher.findOne({ clientId, lowerCaseName: LowerCaseString(name) })
          .then((publisher) => {
            cb(null, publisher);
          })
          .catch((err) => {
            cb(err);
          });
      }
    },
    function (publisher, cb) {
      if (publisher) {
        cb(null, publisher);
      } else {
        // avoid creating duplicate publishers with the same CAE
        let foundPublisher = null;
        const caeWithoutLeadingZeros = cae && Utils.removeLeadingZeros(cae.toString());
        for (const key in indexed) {
          if (indexed.hasOwnProperty(key)) {
            // Check if caeNumber matches and has not already created a publisher
            const indexedPublisher = indexed[key];
            const lowerCaseName = indexedPublisher?.publisher?.lowerCaseName ?? '';
            if (indexedPublisher.type === 'Publisher' && indexedPublisher.caeNumber && Utils.removeLeadingZeros(indexedPublisher.caeNumber.toString()) === caeWithoutLeadingZeros && indexedPublisher?.publisher?._id && lowerCaseName === LowerCaseString(name)) {
              foundPublisher = indexedPublisher;
              break; // Exit loop after finding the first match
            }
          }
        }
        if (foundPublisher) {
          // A matching publisher was found in the indexed object
          cb(null, foundPublisher);
        } else {
          // No matching publisher found in indexed, proceed with creation logic
          cb(null, null);
        }
      }
    },
  ], (err, publisher) => {
    if (publisher) {
      // Return Publisher
      callback(err, publisher);
    } else if (name) {
      // Create Publisher
      let publisher = new Publisher({
        clientId,
        name,
        cae: Utils.padLeadingZeros(cae, 11),
        controlled,
      });
      publisher.validate()
        .then(() => {
          publisher = JSON.parse(JSON.stringify(publisher));
          publisher.saveLater = true;
          callback(null, publisher);
        })
        .catch((err) => {
          publisher = JSON.parse(JSON.stringify(publisher));
          publisher.saveLater = true;
          callback(err, publisher);
        });
    } else {
      callback(new Error('Publisher requires name'));
    }
  });
}

/**
  * Creates a new delivery using the passed filter.
  *
  * Calls callback(err, delivery) with an [err] if an error occurs and the created [delivery] object.
  * @method
  * @param {object} filter - The Work filter object.
  * @param {object} curveUser - The User sending the export.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
workSchema.statics.createDelivery = function (filter, curveUser, callback) {
  let dateFormat = 'DD/MM/YYYY';
  async.waterfall([
    // Get Client's date format
    function (cb) {
      Client.findById(curveUser.clientId, 'dateFormat')
        .then((client) => {
          if (client && client.dateFormat) {
            dateFormat = client.dateFormat;
          }
          cb();
        })
        .catch((err) => {
          cb();
        });
    },
    // Get the works
    function (cb) {
      Work.find(filter, '_id')
        .then((work) => {
          cb(null, work);
        })
        .catch((err) => {
          cb(err);
        });
    },
    // Create the delivery
    function (works, cb) {
      const CwrDelivery = require('../cwrDelivery');
      const workIds = works.map((work) => work._id);
      const cwrDelivery = new CwrDelivery({
        name: `Delivery - ${moment().format(dateFormat.toUpperCase())}`,
        clientId: curveUser.clientId,
        filter: {
          workIds,
        },
        territory: 'WW',
      });
      cwrDelivery.save()
        .then((delivery) => {
          cb(null, delivery);
        })
        .catch((err) => {
          cb(err);
        });
    },
  ], callback);
};

/**
  * Shifts the populated contractIds to a new field to keep the original contractId field unmodified.
  *
  * @method
  * @param {object} work - The work to update.
  */
workSchema.statics.formatPopulatedRights = async function (work) {
  // Populate fields
  const populatedWork = await Work.populate(
    work,
    [
      { path: 'salesReturnsRightsDisplay.contractId', model: 'Contract', select: 'name' },
      { path: 'channelSpecificSalesReturnsRights.contractId', model: 'Contract', select: 'name' },
      { path: 'createdBy', select: 'email' },
      { path: 'lastModifiedBy', select: 'email' },
    ],
  );

  work = JSON.parse(JSON.stringify(populatedWork));
  if (work.salesReturnsRightsDisplay) {
    work.salesReturnsRightsDisplay.forEach((right) => {
      if (right && right.contractId) {
        right.contract = right.contractId;
        right.contractId = right.contractId._id.toString();
      }
    });
  }

  if (work.channelSpecificSalesReturnsRights) {
    work.channelSpecificSalesReturnsRights.forEach((right) => {
      if (right && right.contractId) {
        right.contract = right.contractId;
        right.contractId = right.contractId._id.toString();
      }
    });
  }

  return work;
};

function writeArrayToFile(array, name, cb) {
  const outputLocation = `${appRootDir}/tmp/${name}_${moment().format('x')}.json`;
  const file = fs.createWriteStream(outputLocation);
  addLineNumberToImportArray(array);
  array = removeUnpopulatedObjects(array);
  if (array.length > 0 && array.length < 5000) {
    file.write(`${JSON.stringify(array)}\n`);
    file.write('Last_Line_Ignore');
  } else if (array.length >= 5000) {
    const batches = arrayToBatches(array, 5000);
    batches.forEach((batch) => { if (batch) file.write(`${JSON.stringify(batch)}\n`); });
    file.write('Last_Line_Ignore');
  } else {
    file.write('Last_Line_Ignore');
  }
  file.on('error', cb);
  file.end();
  cb(null, outputLocation);
}

function addLineNumberToImportArray(array) {
  array.forEach((item, line) => {
    item.line = line + 3;
  });
}

function arrayToBatches(array, batchSize) {
  const batches = [];
  for (let index = 0; index < array.length; index += batchSize) {
    const batch = array.slice(index, index + batchSize);
    batches.push(batch);
  }

  return batches;
}

function removeUnpopulatedObjects(array) {
  array.map((object, index) => {
    if (!isObjectPopulated(object)) {
      array.splice(index, 1);
    }
  });

  return array;
}

function formatIpChainComposerNames(ipChain) {
  const participants = [];
  const firstProfilesByCae = {}; // Store the first complete profile for each unique CAE number

  // Extract participants and identify the first full profile for each unique CAE number
  for (let i = 1; i <= 10; i += 1) {
    const participant = {
      index: i,
      caeNumber: ipChain[0][`participant${i}CaeNumber`],
      name: ipChain[0][`participant${i}Name`],
      firstName: ipChain[0][`participant${i}FirstName`],
      middleName: ipChain[0][`participant${i}MiddleName`],
      surname: ipChain[0][`participant${i}Surname`],
      type: ipChain[0][`participant${i}Type`],
    };
    participants.push(participant);

    // If the participant is a composer and has a CAE number
    if (participant.type === 'Composer' && participant.caeNumber !== null && participant.caeNumber !== '00000000000' && participant.caeNumber !== '') {
      // If this CAE number hasn't been encountered yet, store the full profile
      if (!firstProfilesByCae[participant.caeNumber]) {
        firstProfilesByCae[participant.caeNumber] = {
          name: participant.name,
          firstName: participant.firstName,
          middleName: participant.middleName,
          surname: participant.surname,
        };
      }
    }
  }

  // Update profiles based on the first full profile encountered for each CAE number
  participants.forEach((participant) => {
    if (participant.type === 'Composer' && participant.caeNumber !== null && participant.caeNumber !== '00000000000' && participant.caeNumber !== '') {
      const firstProfile = firstProfilesByCae[participant.caeNumber];
      ipChain[0][`participant${participant.index}Name`] = firstProfile.name;
      ipChain[0][`participant${participant.index}FirstName`] = firstProfile.firstName;
      ipChain[0][`participant${participant.index}MiddleName`] = firstProfile.middleName;
      ipChain[0][`participant${participant.index}Surname`] = firstProfile.surname;
    }
  });

  return ipChain;
}

function turnArrayIntoIndexedObject(array, identifiers) {
  const indexes = {};
  array.forEach((item, line) => {
    item.line = line + 3;
    let indexed = false;
    identifiers.forEach((identifier) => {
      if (!indexed && item[identifier]) {
        if (!indexes[`${identifier}_${item[identifier]}`]) { indexes[`${identifier}_${item[identifier]}`] = []; }
        indexes[`${identifier}_${item[identifier]}`].push(item);
        indexed = true;
      }
    });
  });

  return indexes;
}

function getItemsFromIndexedObject(work, indexes, identifiers) {
  let result = [];
  identifiers.forEach((identifier) => {
    if (indexes[`${identifier}_${work[identifier]}`] && Array.isArray(indexes[`${identifier}_${work[identifier]}`])) {
      result = result.concat(indexes[`${identifier}_${work[identifier]}`]);
    }
  });
  return result;
}

function getComposersPublishersFromChain(chains, clientId, callback) {
  const excelTotalParticipants = 10;
  const indexed = {};
  let line = 3;
  // Index Composers/Publishers
  chains.forEach((chain) => {
    for (let i = 1; i < excelTotalParticipants + 1; i += 1) {
      if (chain[`participant${i}Type`] && chain[`participant${i}Name`]) {
        let index;
        if (`${chain[`participant${i}Type`]}` === 'Publisher') {
          index = `${chain[`participant${i}Type`]}_${LowerCaseString(chain[`participant${i}Name`])}`;
        }
        if (`${chain[`participant${i}Type`]}` === 'Composer') {
          index = `${chain[`participant${i}Type`]}_${LowerCaseString(chain[`participant${i}Name`])}_${chain[`participant${i}CaeNumber`]}`;
        }
        if (!indexed[index]) {
          indexed[index] = {
            type: chain[`participant${i}Type`],
            name: chain[`participant${i}Name`],
            firstName: chain[`participant${i}FirstName`],
            middleName: chain[`participant${i}MiddleName`],
            surname: chain[`participant${i}Surname`],
            caeNumber: chain[`participant${i}CaeNumber`],
            controlled: Utils.convertStringToBoolean(chain[`participant${i}Controlled`]),
            line,
          };
        }
      }
    }
    line += 1;
  });

  // Get/Create Composers/Publishers
  const validationErrors = [];
  async.mapValuesSeries(indexed, (index, key, cb) => {
    if (index.type === 'Publisher') {
      getPublisher(clientId, index.name, index.caeNumber, index.controlled, indexed, (err, publisher) => {
        if (err) { validationErrors.push(`Line ${index.line}: ${err}`); }
        index.publisher = publisher;
        cb();
      });
    } else if (index.type === 'Composer') {
      getComposer(clientId, index.name, index.firstName, index.middleName, index.surname, index.caeNumber, index.controlled, indexed, (err, composer) => {
        if (err) { validationErrors.push(`Line ${index.line}: ${err}`); }
        index.composer = composer;
        index.name = composer.name;
        index.firstName = composer.firstName;
        index.middleName = composer.middleName;
        index.surname = composer.surname;
        cb();
      });
    } else {
      cb();
    }
  }, () => {
    callback(validationErrors, indexed);
  });
}

function saveChainComposersPublishers(indexed, partialImportErrors, callback) {
  async.mapValuesSeries(indexed, (index, key, cb) => {
    if (index.type === 'Publisher' && index.publisher && index.publisher.saveLater) {
      const publisher = new Publisher(index.publisher);
      publisher.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          if (err && err?.message?.indexOf('CAE is required to be unique') > -1) {
            partialImportErrors.push(`Publisher ${publisher.name}${publisher.cae ? `, CAE: ${publisher.cae},` : ''} did not import due to duplicated CAE`);
          } else if (err) {
            partialImportErrors.push(`Publisher ${publisher.name}${publisher.cae ? `, CAE: ${publisher.cae},` : ''} did not import`);
          }
          cb();
        });
    } else if (index.type === 'Composer' && index.composer && index.composer.saveLater) {
      const composer = new Composer(index.composer);
      composer.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          if (err && err?.message?.indexOf('CAE is required to be unique') > -1) {
            partialImportErrors.push(`Composer ${composer.name}${composer.cae ? `, CAE: ${composer.cae},` : ''} did not import due to duplicated CAE`);
          } else if (err) {
            partialImportErrors.push(`Composer ${composer.name}${composer.cae ? `, CAE: ${composer.cae},` : ''} did not import`);
          }
          cb();
        });
    } else {
      cb();
    }
  }, callback);
}

const Work = mongoose.model(name, workSchema);

// Exposed for unit testing only
Work._getComposer = getComposer;

module.exports = Work;
