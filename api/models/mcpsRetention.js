const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const { McpsRetention: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const Release = require('./release');
const Client = require('./client');
const ImportXlsx = require('../libs/importXlsx');
const Notification = require('./notification');
const objectPopulated = require('../libs/objectPopulated');
const config = require('../config.json');

const mcpsRetentionSchema = schema;

mcpsRetentionSchema.plugin(modelHistory, { mongoose, name: 'mcpsRetentionPatches' });
mcpsRetentionSchema.plugin(mongoosePaginate);

mcpsRetentionSchema.statics.paramsToFilterField = function (inputParams, curveUser) {
  // Creates filter for find from inputParams
  // Prepare result
  let params = {};
  if (!curveUser) {
    throw (new Error('A curveUser is required'));
  } else if (curveUser && !curveUser.payeeId && !curveUser.clientId) {
    throw (new Error('curveUser is required to have one of clientId or payeeId'));
  } else {
    // If request coming from a payee
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

mcpsRetentionSchema.pre('save', function (next) {
  // Set release title and cat no
  this.setReleaseInfo(next);
});

mcpsRetentionSchema.methods.setReleaseInfo = function (callback) {
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
        callback();
      });
    // Clear title and cat no when no release selected
  } else {
    negative.releaseTitle = null;
    negative.releaseCatNo = null;
    callback();
  }
};

// Import
mcpsRetentionSchema.statics.importFromExcel = function (file, curveUser, callback) {
  // Imports mcpsRetentions from an excel template
  // Handle error if no curveUser passed
  if (!curveUser) {
    callback(new Error('importFromExcel requires a curveUser to be passed'));
  } else {
    // Load client for emails
    Client.findById(curveUser.clientId, { name: 1, parentId: 1, dateFormat: 1 })
      .then((client) => {
        if (!file) {
          const subject = 'Your MCPS Retentions Import Has Errored';
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
          ImportXlsx.getDataByTemplate(file.path, config.importTemplates.mcpsRetentions, 0, 2, dateFormat, (error, data) => {
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
                    subject: 'Your MCPS Retentions Import Has Errored',
                    file: file.originalname,
                    error: [error],
                  };
                  // Setup Notification
                  Notification.generate('Your MCPS Retentions Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                    if (callback) { callback(err, result); }
                  });
                })
                .catch((err) => {
                  logger.error(err);
                  callback(err);
                });
            } else {
              // Import mcpsRetentions from data
              McpsRetention.importMcpsRetentions(data, curveUser.clientId, (errors, count, importedMcpsRetentions) => {
                // Handle errors
                if (errors && errors.length > 0) {
                  logger.error(errors);
                  // Generate errors notification
                  const subject = 'Your MCPS Retentions Import Has Errored';
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
                  // No errors, save mcpsRetentions
                  async.each(importedMcpsRetentions, (importedMcpsRetention, mcpsRetentionCb) => {
                    importedMcpsRetention.createdBy = curveUser.id;
                    importedMcpsRetention.lastModifiedBy = curveUser.id;
                    importedMcpsRetention.save()
                      .then((savedMcpsRetention) => {
                        mcpsRetentionCb(null, savedMcpsRetention);
                      })
                      .catch((err) => {
                        mcpsRetentionCb(err);
                      });
                  }, (err) => {
                    // Generate success notification
                    const subject = 'Your MCPS Retentions Import Has Completed';
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

mcpsRetentionSchema.statics.importMcpsRetention = function (data, clientId, callback) {
  // Function manages the import of a mcpsRetention, finding or creating a mcpsRetention from the passed data
  // Manage error when no data passed
  if (!data) {
    return callback(new Error("Data doesn't match template"));
  }
  async.waterfall([
    function (waterfallCb) {
      // Find by ID if present
      if (ObjectId.isValid(data._id)) {
        McpsRetention.findOne({ clientId, _id: new ObjectId(data._id) })
          .then((mcpsRetention) => {
            waterfallCb(null, mcpsRetention);
          })
          .catch((err) => {
            waterfallCb(err);
          });
      } else {
        // Continue when no ID
        waterfallCb(null, null);
      }
    },
    function (mcpsRetention, waterfallCb) {
      // Create new if none found
      if (!mcpsRetention) { mcpsRetention = new McpsRetention(); }
      // Set values from data
      mcpsRetention.clientId = clientId;
      mcpsRetention.year = data.year;
      mcpsRetention.accountingPeriod = data.accountingPeriod;
      mcpsRetention.territory = data.territory;
      mcpsRetention.retention = data.retention;
      mcpsRetention.tvRetention = data.tvRetention;
      // Get associated contract
      Release.findOne({ clientId, catNo: data.catNo })
        .then((release) => {
          // Set release when found
          if (release) {
            mcpsRetention.releaseId = release._id.toString();
            waterfallCb(null, mcpsRetention);
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
    function (mcpsRetention, waterfallCb) {
      // Validate
      mcpsRetention.validate()
        .then(() => {
          waterfallCb(null, mcpsRetention);
        })
        .catch((err) => {
          waterfallCb(err);
        });
    },
  ], callback);
};

mcpsRetentionSchema.statics.importMcpsRetentions = function (mcpsRetentions, clientId, callback) {
  // Takes a set of mcpsRetentions, and prepares import
  // Handle error if not array passed
  if (Object.prototype.toString.call(mcpsRetentions) !== '[object Array]') {
    callback(['Data must be an Array']);
  // Handle error if no clientId
  } else if (!clientId) {
    callback(['A Client ID must be passed']);
  } else {
    // Ingested count for reporting back to user
    let count = 0;
    // Array for holding mcpsRetentions being imported
    const importedMcpsRetentions = [];
    // Array of errors for reporting back to user
    const errors = [];
    // Loop through each of mcpsRetentions
    async.eachOfSeries(mcpsRetentions, (mcpsRetention, index, cb) => {
      // When it's an object
      if (objectPopulated(mcpsRetention)) {
        // Call importMcpsRetention with the data
        McpsRetention.importMcpsRetention(mcpsRetention, clientId, (err, importedMcpsRetention) => {
          // Handle any errors being returned
          if (err) { errors.push(`Line ${index + 3}: ${err.message}`); }
          // McpsRetention passed validation
          if (importedMcpsRetention) {
            // Increment count
            count += 1;
            // Add to array
            importedMcpsRetentions.push(importedMcpsRetention);
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
        callback(errors, count, importedMcpsRetentions);
      }
    });
  }
};

// Export
mcpsRetentionSchema.statics.sendExport = function (filter, curveUser, callback) {
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
            // Find mcpsRetentions based on passed filter
            McpsRetention.find(filter)
              .then((mcpsRetentions) => {
                cb(null, mcpsRetentions);
              })
              .catch((err) => {
                cb(err);
              });
          },
          function (mcpsRetentions, cb) {
            // Convert data for excel file
            McpsRetention.convertMcpsRetentionsForXlsx(mcpsRetentions, cb);
          },
          function (data, cb) {
            // Create XLSX
            Exports.getTemplate({ Client, templateName: 'mcpsRetentions', clientId: curveUser.clientId }).then((template) => {
              createXlsx.createInTemplate([data], template, cb);
            });
          },
          function (filePath, cb) {
            // Update to S3
            fileManager.uploadToS3(`exports/${client.name} MCPS Retentions Export ${moment().format('YYYYMMDDHHmmssSSS')}.xlsx`, filePath, cb);
          },
          function (key, cb) {
            // Create Public Link
            fileManager.publicLink24Hours(key, cb);
          },
          function (link, cb) {
            // Generate notification
            const subject = `Your MCPS Retentions Export for ${client.name} is Ready to Download`;
            const generateOptions = {
              identifier: 'exportDownload',
              curveUser,
              client,
              subject,
              link,
            };
            Notification.generate('MCPS Retentions Export Ready', subject, link, curveUser, generateOptions, cb);
          },
        ], (err) => {
          // Handle any errors
          if (err) {
            logger.error(err);
            // Return error via notification
            const name = 'Your MCPS Retentions Export Has Errored';
            const subject = `Your MCPS Retentions Export for ${client.name} has errored`;
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
            // Conditional callback
            callback();
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

mcpsRetentionSchema.statics.convertMcpsRetentionsForXlsx = function (mcpsRetentions, callback) {
  // Converts each of the passed McpsRetentions into an array of data
  // When passed an array
  if (mcpsRetentions instanceof Array) {
    if (mcpsRetentions[0]) {
      // Get all releases
      Release.find({ clientId: mcpsRetentions[0].clientId }, { catNo: 1 })
        .then((releases) => {
          // Set all releases info an object, mapped by ID
          const releaseMapping = {};
          releases.forEach((release) => {
            releaseMapping[release._id.toString()] = release.catNo;
          });
          // Map each element of array to exportData function
          async.map(mcpsRetentions, (mcpsRetention, cb) => {
            mcpsRetention.exportData(releaseMapping, cb);
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
    callback(new Array('Must be passed an Array of McpsRetentions'), null);
  }
};

mcpsRetentionSchema.methods.exportData = function (releaseMapping, callback) {
  const mcpsRetention = this;
  // Returns an array of mcpsRetention data for excel
  const catNo = releaseMapping[mcpsRetention.releaseId];
  callback(null, [
    mcpsRetention._id.toString(),
    catNo,
    mcpsRetention.year,
    mcpsRetention.accountingPeriod,
    mcpsRetention.territory,
    mcpsRetention.retention,
    mcpsRetention.tvRetention,
  ]);
};

const McpsRetention = mongoose.model(name, mcpsRetentionSchema);

module.exports = McpsRetention;
