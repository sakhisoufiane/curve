const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const { McpsNegative: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const Release = require('./release');
const Client = require('./client');
const ImportXlsx = require('../libs/importXlsx');
const Notification = require('./notification');
const objectPopulated = require('../libs/objectPopulated');
const config = require('../config.json');

const mcpsNegativeSchema = schema;

mcpsNegativeSchema.plugin(modelHistory, { mongoose, name: 'mcpsNegativePatches' });
mcpsNegativeSchema.plugin(mongoosePaginate);

mcpsNegativeSchema.statics.paramsToFilterField = function (inputParams, curveUser) {
  // Creates filter for find from inputParams
  // Prepare result
  let params = {};
  if (!curveUser) {
    throw (new Error('A curveUser is required'));
  } else if (curveUser && !curveUser.mcpsNegativeId && !curveUser.clientId) {
    throw (new Error('curveUser is required to have one of clientId or mcpsNegativeId'));
  } else {
    // If request coming from a mcpsNegative
    if (curveUser.clientId) {
      params = { clientId: curveUser.clientId };
    }
    // When text value is passed
    if (inputParams && inputParams.text) {
      const regex = new RegExp(inputParams.text, 'i');
      params.name = { $regex: regex };
    }
    // Return object
    return params;
  }
};

mcpsNegativeSchema.pre('save', function (next) {
  // Set release title and cat no
  this.setReleaseInfo(next);
});

mcpsNegativeSchema.methods.setReleaseInfo = function (callback) {
  const negative = this;
  // When releaseId exists
  if (negative.releaseId) {
    // Find release by ID
    Release.findOne({ clientId: negative.clientId, _id: new ObjectId(negative.releaseId) })
      .then((release) => {
        // When release is returned
        if (release) {
          negative.releaseTitle = release.title;
          negative.releaseCatNo = release.catNo;
        }
        // Ignore if no release is returned
        callback();
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
    // Clear title and cat no when no release selected
  } else {
    negative.releaseTitle = null;
    negative.releaseCatNo = null;
    callback();
  }
};

// Import
mcpsNegativeSchema.statics.importFromExcel = function (file, curveUser, callback) {
  // Imports mcpsNegatives from an excel template
  // Handle error if no curveUser passed
  if (!curveUser) {
    callback(new Error('importFromExcel requires a curveUser to be passed'));
  } else {
    // Load client for emails
    Client.findById(curveUser.clientId, { name: 1, parentId: 1, dateFormat: 1 })
      .then((client) => {
        if (!file) {
          const subject = 'Your MCPS Negatives Import Has Errored';
          const generateOptions = {
            identifier: 'importError',
            curveUser,
            client,
            subject,
            file: '',
            error: ['No file was uploaded'],
          };
          Notification.generate(subject, 'No file was uploaded', null, curveUser, generateOptions, (err, result) => {
            if (callback) { callback(err, result); }
          });
        } else {
          // get date format from client settings
          const dateFormat = client.dateFormat.toUpperCase();
          // Load data from template
          ImportXlsx.getDataByTemplate(file.path, config.importTemplates.mcpsNegatives, 0, 2, dateFormat, (error, data) => {
            // Handle errors from template
            if (error) {
              logger.error(error);
              // Set error if template errro
              if (error === 'Template does not match' || error === 'Data must be an Array') { error = 'It appears the template does not match'; }
              // Find client
              Client.findById(curveUser.clientId)
                .then((client) => {
                  const generateOptions = {
                    identifier: 'importError',
                    curveUser,
                    client,
                    subject: 'Your MCPS Negatives Import Has Errored',
                    file: file.originalname,
                    error: [error],
                  };
                  // Setup Notification
                  Notification.generate('Your MCPS Negatives Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                    if (callback) { callback(err, result); }
                  });
                })
                .catch((err) => {
                  logger.error(err);
                  callback(err);
                });
            } else {
              // Import mcpsNegatives from data
              McpsNegative.importMcpsNegatives(data, curveUser.clientId, (errors, count, importedMcpsNegatives) => {
                // Handle errors
                if (errors && errors.length > 0) {
                  logger.error(errors);
                  // Generate errors notification
                  const subject = 'Your MCPS Negatives Import Has Errored';
                  const generateOptions = {
                    identifier: 'importError',
                    curveUser,
                    client,
                    subject,
                    file: file.originalname,
                    error: [errors],
                  };
                  Notification.generate(subject, `Error saving data from file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                    if (callback) { callback(err, result); }
                  });
                } else {
                  // No errors, save mcpsNegatives
                  async.each(importedMcpsNegatives, (importedMcpsNegative, mcpsNegativeCb) => {
                    importedMcpsNegative.createdBy = curveUser.id;
                    importedMcpsNegative.lastModifiedBy = curveUser.id;
                    importedMcpsNegative.save()
                      .then((savedMcpsNegative) => {
                        mcpsNegativeCb(null, savedMcpsNegative);
                      })
                      .catch((err) => {
                        logger.error(err);
                        mcpsNegativeCb(err);
                      });
                  }, (err) => {
                    // Generate success notification
                    const subject = 'Your MCPS Negatives Import Has Completed';
                    const generateOptions = {
                      identifier: 'importComplete',
                      curveUser,
                      client,
                      subject,
                      file: file.originalname,
                      count,
                    };
                    Notification.generate(subject, file.originalname, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  });
                }
              });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

mcpsNegativeSchema.statics.importMcpsNegative = function (data, clientId, callback) {
  // Function manages the import of a mcpsNegative, finding or creating a mcpsNegative from the passed data
  // Manage error when no data passed
  if (!data) {
    return callback(new Error("Data doesn't match template"));
  }
  async.waterfall([
    function (waterfallCb) {
      // Find by ID if present
      if (ObjectId.isValid(data._id)) {
        McpsNegative.findOne({ clientId, _id: new ObjectId(data._id) })
          .then((mcpsNegative) => {
            waterfallCb(null, mcpsNegative);
          })
          .catch((err) => {
            waterfallCb(err);
          });
      } else {
        // Continue when no ID
        waterfallCb(null, null);
      }
    },
    function (mcpsNegative, waterfallCb) {
      // Create new if none found
      if (!mcpsNegative) { mcpsNegative = new McpsNegative(); }
      // Set values from data
      mcpsNegative.clientId = clientId;
      mcpsNegative.year = data.year;
      mcpsNegative.accountingPeriod = data.accountingPeriod;
      mcpsNegative.territory = data.territory;
      mcpsNegative.value = data.value;
      // Get associated contract
      Release.findOne({ clientId, catNo: data.catNo })
        .then((release) => {
          // Set release when found
          if (release) {
            mcpsNegative.releaseId = release._id.toString();
            waterfallCb(null, mcpsNegative);
          } else {
            // Return error
            waterfallCb(new Error(`Could not find release with Cat No ${data.catNo}`));
          }
        })
        .catch((err) => {
          logger.error(err);
          waterfallCb(err);
        });
    },
    function (mcpsNegative, waterfallCb) {
      // Validate
      mcpsNegative.validate()
        .then(() => {
          waterfallCb(null, mcpsNegative);
        })
        .catch((err) => {
          logger.error(err);
          waterfallCb(err, mcpsNegative);
        });
    },
  ], callback);
};

mcpsNegativeSchema.statics.importMcpsNegatives = function (mcpsNegatives, clientId, callback) {
  // Takes a set of mcpsNegatives, and prepares import
  // Handle error if not array passed
  if (Object.prototype.toString.call(mcpsNegatives) !== '[object Array]') {
    callback(['Data must be an Array']);
  // Handle error if no clientId
  } else if (!clientId) {
    callback(['A Client ID must be passed']);
  } else {
    // Ingested count for reporting back to user
    let count = 0;
    // Array for holding mcpsNegatives being imported
    const importedMcpsNegatives = [];
    // Array of errors for reporting back to user
    const errors = [];
    // Loop through each of mcpsNegatives
    async.eachOfSeries(mcpsNegatives, (mcpsNegative, index, cb) => {
      // When it's an object
      if (objectPopulated(mcpsNegative)) {
        // Call importMcpsNegative with the data
        McpsNegative.importMcpsNegative(mcpsNegative, clientId, (err, importedMcpsNegative) => {
          // Handle any errors being returned
          if (err) { errors.push(`Line ${index + 3}: ${err.message}`); }
          // McpsNegative passed validation
          if (importedMcpsNegative) {
            // Increment count
            count += 1;
            // Add to array
            importedMcpsNegatives.push(importedMcpsNegative);
          }
          cb();
        });
      // Don't raise error for any non-objects
      } else {
        cb();
      }
    }, (err) => {
      // If err in each
      if (err) {
        callback(err);
      // Return data
      } else {
        callback(errors, count, importedMcpsNegatives);
      }
    });
  }
};

// Export
mcpsNegativeSchema.statics.sendExport = function (filter, curveUser, callback) {
  // Sends export via email
  if (!curveUser) {
    callback(new Error('sendExport requires curveUser to be passed'));
  } else {
    // Get client for managing emails
    Client.findById(curveUser.clientId, { name: 1, parentId: 1 })
      .then((client) => {
        async.waterfall([
          function (cb) {
            // Handle error if filter not passed
            if (!filter) {
              callback(new Error('sendExport requires filter to be passed'));
            } else {
              cb();
            }
          },
          function (cb) {
            // Find mcpsNegatives based on passed filter
            McpsNegative.find(filter)
              .then((mcpsNegatives) => {
                cb(null, mcpsNegatives);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (mcpsNegatives, cb) {
            // Convert data for excel file
            McpsNegative.convertMcpsNegativesForXlsx(mcpsNegatives, cb);
          },
          function (data, cb) {
            // Create XLSX
            Exports.getTemplate({ Client, templateName: 'mcpsNegatives', clientId: curveUser.clientId }).then((template) => {
              createXlsx.createInTemplate([data], template, cb);
            });
          },
          function (filePath, cb) {
            // Update to S3
            fileManager.uploadToS3(`exports/${client.name} MCPS Negatives Export ${moment().format('YYYYMMDDHHmmssSSS')}.xlsx`, filePath, cb);
          },
          function (key, cb) {
            // Create Public Link
            fileManager.publicLink24Hours(key, cb);
          },
          function (link, cb) {
            // Generate notification
            const subject = `Your MCPS Negatives Export for ${client.name} is Ready to Download`;
            const generateOptions = {
              identifier: 'exportDownload',
              curveUser,
              client,
              subject,
              link,
            };
            Notification.generate('MCPS Negatives Export Ready', subject, link, curveUser, generateOptions, cb);
          },
        ], (err) => {
          // Handle any errors
          if (err) {
            logger.error(err);
            // Return error via notification
            const name = 'Your MCPS Negatives Export Has Errored';
            const subject = `Your MCPS Negatives Export for ${client.name} has errored`;
            const generateOptions = {
              identifier: 'exportError',
              curveUser,
              client,
              subject,
              error: err,
            };
            Notification.generate(name, subject, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err); }
            });
          } else if (callback) {
            callback(err);
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

mcpsNegativeSchema.statics.convertMcpsNegativesForXlsx = function (mcpsNegatives, callback) {
  // Converts each of the passed McpsNegatives into an array of data
  // When passed an array
  if (mcpsNegatives instanceof Array) {
    if (mcpsNegatives[0]) {
      // Get all releases
      Release.find({ clientId: mcpsNegatives[0].clientId }, { catNo: 1 })
        .then((releases) => {
          // Set all releases info an object, mapped by ID
          const releaseMapping = {};
          releases.forEach((release) => {
            releaseMapping[release._id.toString()] = release.catNo;
          });
          // Map each element of array to exportData function
          async.map(mcpsNegatives, (mcpsNegative, cb) => {
            mcpsNegative.exportData(releaseMapping, cb);
          }, callback);
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      callback(null, []);
    }
  // When not passed an array
  } else {
    callback(new Array('Must be passed an Array of McpsNegatives'), null);
  }
};

mcpsNegativeSchema.methods.exportData = function (releaseMapping, callback) {
  const mcpsNegative = this;
  // Returns an array of mcpsNegative data for excel
  const catNo = releaseMapping[mcpsNegative.releaseId];
  callback(null, [
    mcpsNegative._id.toString(),
    catNo,
    mcpsNegative.year,
    mcpsNegative.accountingPeriod,
    mcpsNegative.territory,
    mcpsNegative.value,
  ]);
};

const McpsNegative = mongoose.model(name, mcpsNegativeSchema);

module.exports = McpsNegative;
