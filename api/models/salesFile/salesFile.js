/**
 * @module salesFile
 */
const { logger, BigQuery, fileOpener, fileManager, createXlsx, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const fs = require('fs');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const { SalesFile: { name, schema } } = require('@curveroyaltysystems/models');
const appRootDir = require('app-root-dir').get();
const modelHistory = require('../../libs/modelHistory');
const SalesTemplate = require('../salesTemplate');
const Client = require('../client');
const UnmappedWork = require('../unmappedWork');
const UnmappedTrack = require('../unmappedTrack');
const UnmappedRelease = require('../unmappedRelease');
const Task = require('../task');
const Notification = require('../notification');
const Payee = require('../payee');
const ModelErrors = require('../../libs/modelErrors');

const dir = `${appRootDir}/tmp/`;

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const salesFileSchema = schema;

salesFileSchema.plugin(modelHistory, { mongoose, name: 'salesFilePatches', useArchive: true, removePatches: false });
salesFileSchema.plugin(mongoosePaginate);

salesFileSchema.post('init', (salesFile) => {
  if (salesFile.file) {
    fileManager.publicS3Link(salesFile.file, (err, publicLink) => {
      salesFile.publicLink = publicLink;
    });
  }
  if (salesFile.customAdditionalFile) {
    fileManager.publicS3Link(salesFile.customAdditionalFile, (err, publicLink) => {
      salesFile.customAdditionalFilePublicLink = publicLink;
    });
  }
});

salesFileSchema.pre('save', function (next) {
  const salesFile = this;
  // Set partitionNo on create only
  if (salesFile.isNew) {
    salesFile.setPartitionNo();
  }

  next();
});

salesFileSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  // Clean up template identifiers
  const salesFile = this;
  if (salesFile.salesTemplateId) {
    SalesTemplate.findById(salesFile.salesTemplateId)
      .then((template) => {
        if (template) {
          template.identification.map((identification, index) => {
            if (identification && identification.salesFileId === salesFile._id.toString() && !identification.usedOnMultipleFiles) {
              template.identification.splice(index, 1);
            }
          });
          template.save()
            .catch((err) => {
              logger.error(err);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
      });
  }
  // Call next without waiting for the identifiers cleanup process
  next();
});

salesFileSchema.post('deleteOne', { document: true }, async function () {
  const salesFile = this;
  const logKey = `Sales File Delete Hook | ${salesFile._id} | `;
  await Promise.all([
    new Promise((resolve, reject) => {
      if (!salesFile.file) reject(new Error('Field "file" (S3 path to file) not found on Sales File'));
      else {
        fileManager.deleteFromS3(salesFile.file, (err) => {
          if (err) reject(err);
          else {
            logger.info(logKey, `File ${salesFile.file} deleted from S3`);
            resolve();
          }
        });
      }
    }),
    new Promise((resolve, reject) => {
      SalesFile.clearSalesData([salesFile._id.toString()], salesFile.clientId, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
  ])
    .catch((err) => {
      logger.error(logKey, err);
      throw err;
    });
});

/**
 * Clean the bulk identifiers from the templates the sale file isn't attached to anymore
 *
 * @method
 */
salesFileSchema.methods.cleanBulkIdentifiersFromTemplates = function () {
  const salesFile = this;
  // Clean up template identifiers
  SalesTemplate.find({ clientId: salesFile.clientId, _id: { $ne: salesFile.salesTemplateId }, 'identification.salesFileId': salesFile._id.toString(), 'identification.usedOnMultipleFiles': { $ne: true } })
    .then((templates) => {
      if (templates) {
        templates.forEach((template) => {
          template.identification.map((identification, index) => {
            if (identification.salesFileId === salesFile._id.toString() && !identification.usedOnMultipleFiles) {
              template.identification.splice(index, 1);
            }
          });
          template.save()
            .catch((err) => {
              logger.error(err);
            });
        });
      } else {
        logger.error('Sales Templates not found');
      }
    })
    .catch((err) => {
      logger.error(err);
    });
};
/**
 * Sets the partition number according to today's date
 *
 * @method
 */
salesFileSchema.methods.setPartitionNo = function () {
  // PartitionNo is set to number of months after Jan 2020
  const today = new Date();
  // Get year today and minus from 2020 to get no of years since 2020
  const yearDifference = today.getFullYear() - 2020;
  // Get today's month - this is 0 indexed
  const month = today.getMonth();
  // Add the two together using the 12 * years for each year that's passed
  this.partitionNo = (12 * yearDifference) + month;
};

salesFileSchema.post('save', (err, saved, next) => {
  // Handle error messages
  if (err) {
    const messages = ModelErrors.map(err.message);
    next(new Error(messages));
    // If no errors, continue with save
  } else {
    next();
  }
});

/**
 * Exports this Sales File as Excel file and uploads to S3. Does not use a callback but instead triggers Notifications to the user.
 *
 * @param {object} filter - Filter object to use for selecting Sales Files from database
 * @param {object} curveUser - User object
 */
salesFileSchema.statics.sendExport = function (filter, curveUser, callback) {
  const Client = require('../client');
  try {
    async.waterfall([
      function (cb) {
        SalesFile.find(filter)
          .then((salesFiles) => {
            cb(null, salesFiles);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (salesFiles, cb) {
        SalesFile.convertSalesFilesForXlsx(salesFiles, cb);
      },
      function (data, cb) {
        Exports.getTemplate({ Client, templateName: 'salesFile', clientId: curveUser.clientId }).then((template) => {
          createXlsx.createInTemplate([data], template, cb);
        });
      },
      function (filePath, cb) {
        // TODO: refactor Client.findById instead of calling twice, see Payee model
        Client.findById(curveUser.clientId)
          .then((client) => {
            fileManager.uploadToS3(`exports/${client.name} Sales File Export ${moment().format('YYYYMMDDHHmmssSSS')}.xlsx`, filePath, cb);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (key, cb) {
        fileManager.publicLink24Hours(key, cb);
      },
      function (link, cb) {
        // TODO: refactor Client.findById instead of calling twice, see Payee model
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportDownload',
              curveUser,
              client,
              subject: `Your Sales File Export for ${client.name} is Ready to Download`,
              link,
            };
            Notification.generate('Sales File Export Ready', `Your Sales Files Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (errNot) => {
              cb(errNot);
            });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    ], (err) => {
      if (err) {
        logger.error(err);
        // Return error via email
        // TODO: refactor Client.findById instead of calling twice, see Payee model
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportError',
              curveUser,
              client,
              subject: `Your Sales File Export for ${client.name} Has Errored`,
              error: err.message,
            };
            Notification.generate(`Your Sales File Export for ${client.name} Has Errored`, err.message, null, curveUser, generateOptions, (errNotification) => {
              if (callback) { callback(errNotification); }
            });
          })
          .catch((error) => {
            logger.error(error);
            callback(error);
          });
      } else if (callback) {
        callback(err);
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
          subject: 'Your Sales File Export Has Errored',
          error: 'Your Sales File export has errored. Please try again, or contact support',
        };
        Notification.generate('Your Sales File Export Has Errored', 'Your sales files export has errored. Please try again, or contact support', null, curveUser, generateOptions, (errNotification) => {
          if (callback) { callback(errNotification); }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
 * Converts Sales File data for a single Sales File. Used by convertSalesFilesForXlsx
 * @see convertSalesFilesForXlsx
 *
 * @returns {array} An array containing the relevant Sales File information for export
 */
salesFileSchema.methods.exportData = function () {
  const data = [
    this._id.toString(),
    this.name,
    this.invoiceNo,
    this.targetPeriod,
    this.salesAccountName,
    this.units,
    this.homeCurrencyGrossAmount,
    this.homeCurrencyNetAmount,
    this.invalidLines,
    this.valid,
    this.status,
  ];
  data.push(this.archived ? 'Archived' : 'Live');
  data.push(this.overwriteFields?.transactionDate ? moment(this.overwriteFields.transactionDate).format('DD/MM/YYYY') : '');

  // Keep this at the end. The template allows the user to export multiple exchange rates
  this.exchangeRates.forEach(({ from, to, rate }) => {
    data.push(from);
    data.push(to);
    data.push(rate);
  });
  return data;
};

/**
 * Converts Sales File data for multiple Sales Files. Used by sendExport
 * @see sendExport
 *
 * * Calls `callback(err, convertedSalesFiles)` with `convertedSalesFiles` containing the converted Sales Files data
 * * Calls `callback(err, convertedSalesFiles)` with an `err` message if an error occurs
 *
 * @param {object[]} salesFiles - An array of Sales File documents
 * @param {function(string, array[])} callback - A callback that handles the response
 */
salesFileSchema.statics.convertSalesFilesForXlsx = function (salesFiles, callback) {
  if (salesFiles instanceof Array) {
    const convertedSalesFiles = [];
    async.each(salesFiles, (salesFile, cb) => {
      convertedSalesFiles.push(salesFile.exportData());
      cb();
    }, (err) => {
      // TODO: We don't ever pass an error from async.each. Therefore the error handling below could be removed.
      if (err) {
        callback(err, null);
      } else {
        callback(null, convertedSalesFiles);
      }
    });
  } else {
    callback(new Error('Must be passed an Array of Sales'));
  }
};

/**
 * Extracts example lines from the supplied file and maps this to the Sales Template fields.
 *
 * * Calls `callback(err, exampleLines)` with `exampleLines` containing the Example Lines including headerRow and formatRow
 * * Calls `callback(err, exampleLines)` with an `err` message if an error occurs
 *
 * @param {string} localFile - File path to data file
 * @param {function(string, array[])} callback - A callback that handles the response
 */
salesFileSchema.methods.mapTemplateToSalesFile = function (localFile, callback) {
  const salesFile = this;
  if (salesFile.salesTemplateId && salesFile.salesTemplateId.length === 24) {
    SalesTemplate.findById(salesFile.salesTemplateId)
      .then((template) => {
        if (!template) {
          logger.error('No template found associated with salesFile');
          callback('No template found');
        } else {
          const options = {
            tab: template.tabIndex(),
            startingLine: template.startingLineIndex(),
            startingColumn: template.startingLeftIndex(),
            delimiter: template.delimiter,
            characterSeparators: template.characterSeparators(),
            encoding: template.encoding,
            maxRows: 20,
            templatefileType: template.fileType,
          };
          fileOpener.extractData(localFile, options, (errExtract, totalTabs, data) => {
            if (errExtract) {
              callback(errExtract);
            } else {
              const result = [];
              const headerRow = [];
              const formatRow = [];
              async.each(template.fields, (field, cb) => {
                if (field) {
                  headerRow.push(field.field);
                  formatRow.push(field.type);
                }
                cb();
              }, () => {
                result.push(headerRow);
                result.push(formatRow);
                if (Array.isArray(data)) {
                  async.each(data.slice(0, 9), (row, cb) => {
                    result.push(row);
                    cb();
                  }, () => {
                    salesFile.exampleLines = result;
                    callback(null, result);
                  });
                } else {
                  callback(null, result);
                }
              });
            }
          });
        }
      })
      .catch((errFind) => {
        logger.error(errFind);
        callback(errFind);
      });
  } else {
    callback(null, []);
  }
};

/**
 * Creates an ingest task to be picked up by the processor
 *
 * * Creates a task in the database
 * * Then changes status of Sales File to "Waiting"
 * * Sends a message to AWS SQS to notify processor of the pending task
 * * Calls `callback(err, data)` with `data` containing the data returned by SQS.sendMessage
 * * Calls `callback(err, data)` with an `err` message if an error occurs
 *
 * @param {number} _priority - {deprecated} The priority of the task (defaults to 1)
 * @param {function(Error)} callback - A callback that handles the error. If no error is present then the task was created and sent successfully.
 */
salesFileSchema.methods.createIngestTask = async function (_priority, curveUser, callback) {
  const Client = require('../client');
  const salesFile = this;
  // Incase the user has updated the template source, we need to flush this through to each sales file
  const salesTemplate = await SalesTemplate.findOne({ _id: salesFile.salesTemplateId, source: { $ne: salesFile.salesAccountName } });
  if (salesTemplate) {
    salesFile.salesAccountName = salesTemplate.source;
    await salesFile.save().catch(logger.error);
  }
  Client.findById(salesFile.clientId, 'name features')
    .then((client) => {
      Task.countDocuments(
        {
          name: { $in: ['Sales File Ingest', 'Sales File Revalidate'] },
          clientId: salesFile.clientId,
          status: { $in: ['Pending', 'In Progress'] },
          'value.salesFileId': salesFile._id.toString(),
        },
      ).then((count) => {
        if (!count) {
          salesFile.status = 'Waiting';
          salesFile.save()
            .then(() => {
              const task = {
                name: 'Sales File Ingest',
                clientId: salesFile.clientId,
                clientName: client.name,
                value: {
                  salesFileId: salesFile._id.toString(),
                  user: curveUser.internal ? 'internal' : curveUser.id,
                },
              };

              if (client.features?.platformSalesIngestion) {
                task.value.runningOn = 'Platform';
              }

              TaskHelpers.createTaskAndSendMessage(Task, task).then(
                () => callback(),
                (err) => callback(err),
              );
            })
            .catch((errSave) => {
              logger.error(errSave);
              callback(errSave);
            });
        } else {
          callback(new Error('This sales file cannot be reingested as it is already in progress'));
        }
      })
        .catch((errCount) => {
          logger.error(errCount);
          callback(errCount);
        });
    })
    .catch((errFind) => {
      logger.error(errFind);
      callback(errFind);
    });
};

/**
 * Creates Ingest task for multiple Sales Files
 *
 * * Calls `callback(err)` with no `err` once done (if callback is supplied)
 * * Calls `callback(err)` with an `err` message if an error occurs (if callback is supplied)
 *
 * @param {String[]} ids - Sales Files ids
 * @param {object} curveUser - User object
 * @param {function(string)} [callback] - A callback that handles the response
 */
salesFileSchema.statics.bulkIngest = function (ids, curveUser, callback) {
  if (!ids || ids.length === 0) {
    if (callback) {
      callback(new Error('Must be passed a set of IDs'));
    }
  } else {
    const idsMapped = ids.map((id) => new ObjectId(id));
    let ingestError;
    SalesFile.find({ clientId: curveUser.clientId, _id: { $in: idsMapped } })
      .then((salesFiles) => {
        async.eachSeries(salesFiles, (salesFile, cb) => {
          UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: salesFile, clientOnly: true })
            .then((forbidden) => {
              if (!forbidden) {
                if (salesFile.locked) {
                  ingestError = new Error('Some sales files are part of a locked period and so can\'t be reingested');
                  cb();
                } else {
                  salesFile.createIngestTask(2, curveUser, (err) => {
                    if (err) {
                      ingestError = new Error('Some sales files could not be reingested as they are already in progress');
                    }
                    cb();
                  });
                }
              } else {
                cb();
              }
            });
        }, (errEach) => {
          if (errEach) { logger.error(errEach); }
          if (callback) {
            callback(ingestError);
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
 * Creates a Revalidation task to be picked up by the processor
 *
 * * Creates a task in the database
 * * Then changes status of Sales File to "Waiting"
 * * Sends a message to AWS SQS to notify processor of the pending task
 * * Calls `callback(err, data)` with `data` containing the data returned by SQS.sendMessage
 * * Calls `callback(err, data)` with an `err` message if an error occurs
 *
 * @param {number} _priority - {deprecated} The priority of the task (defaults to 1)
 * @param {function(string, object)} callback - A callback that handles the response
 */
salesFileSchema.methods.createRevalidationTask = async function (_priority, curveUser, callback) {
  const salesFile = this;
  // Incase the user has updated the template source, we need to flush this through to each sales file
  const salesTemplate = await SalesTemplate.findOne({ _id: salesFile.salesTemplateId, source: { $ne: salesFile.salesAccountName } });
  if (salesTemplate) {
    salesFile.salesAccountName = salesTemplate.source;
    await salesFile.save().catch(logger.error);
  }
  Client.findById(salesFile.clientId, 'name')
    .then((client) => {
      Task.countDocuments(
        {
          name: { $in: ['Sales File Ingest', 'Sales File Revalidate'] },
          clientId: salesFile.clientId,
          status: { $in: ['Pending', 'In Progress'] },
          'value.salesFileId': salesFile._id.toString(),
        },
      ).then((count) => {
        if (!count) {
          salesFile.status = 'Waiting';
          salesFile.save()
            .then(() => {
              TaskHelpers.createTaskAndSendMessage(Task, {
                name: 'Sales File Revalidate',
                clientId: salesFile.clientId,
                clientName: client.name,
                value: {
                  salesFileId: salesFile._id.toString(),
                  user: curveUser.internal ? 'internal' : curveUser.id,
                },
              })
                .then(() => {
                  callback();
                })
                .catch(callback);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        } else {
          callback(new Error('This sales file cannot be revalidated as it is already in progress'));
        }
      })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

/**
 * Creates Revalidation task for multiple Sales Files
 *
 * * Calls `callback(err)` with no `err` once done (if callback is supplied)
 * * Calls `callback(err)` with an `err` message if an error occurs (if callback is supplied)
 *
 * @param {String[]} ids - Sales Files ids
 * @param {object} curveUser - User object
 * @param {function(string)} [callback] - A callback that handles the response
 */
salesFileSchema.statics.bulkRevalidate = function (ids, curveUser, callback) {
  if (!ids || ids.length === 0) {
    if (callback) {
      callback(new Error('Must be passed a set of IDs'));
    }
  } else {
    const idsMapped = ids.map((id) => new ObjectId(id));
    let revalidateError;
    SalesFile.find({ clientId: curveUser.clientId, _id: { $in: idsMapped } })
      .then((salesFiles) => {
        async.eachSeries(salesFiles, (salesFile, cb) => {
          UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: salesFile, clientOnly: true })
            .then((forbidden) => {
              if (!forbidden) {
                if (salesFile.locked) {
                  revalidateError = new Error('Some sales files are part of a locked period and so can\'t be revalidated');
                  cb();
                } else {
                  salesFile.createRevalidationTask(2, curveUser, (err) => {
                    if (err) {
                      revalidateError = new Error('Some sales files could not be revalidated as they are already in progress');
                    }
                    cb();
                  });
                }
              } else {
                cb();
              }
            });
        }, (errEach) => {
          if (errEach) { logger.error(errEach); }
          if (callback) {
            callback(revalidateError);
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
 * Updates the Sales Files' reportedStatus to either "Complete", "Partially Complete", "Unreported" depending on inputs and outputs.
 * Sets salesFile.reportedLines to the number of output items
 *
 * * Calls `callback(err, salesFile)` with `salesFile` containing this Sales File document returned by `salesFile.save()`
 * * Calls `callback(err, salesFile)` with an `err` message if an error occurs
 *
 * @param {function(string, object)} [callback] - A callback that handles the response
 */
salesFileSchema.methods.updateReportedStatus = function (callback) {
  const Client = require('../client');
  const salesFile = this;
  // Get client
  Client.findById(salesFile.clientId)
    .then((client) => {
      // Get sale files big query data
      logger.info(`Sales File: ${salesFile._id.toString()} getting big query data.`);

      // Setup big query
      const bigQuery = new BigQuery({
        datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      });
      async.parallel({
        inputIds(cb) {
          // Get no on unique sales line ids
          bigQuery.getDistinctCount(bigQuery.inputTable, 'id', { salesFileId: salesFile._id.toString(), partitionNo: salesFile.partitionNo }, cb);
        },
        outputIds(cb) {
          // Get no of unique report sales line ids
          bigQuery.getDistinctCount(bigQuery.outputTable, 'salesLineId', { salesFileId: salesFile._id.toString() }, cb);
        },
      }, (errParallel, result) => {
        if (errParallel) {
          logger.error(`Sales File: ${salesFile._id.toString()} - ${errParallel}`);
          callback(new Error('There was an error updating the reported status of the Sales File. Please try again or contact support.'));
        } else {
          // Log input table and output table lines
          logger.info(`Sales File: ${salesFile._id.toString()} result.outputIds.count (${result.outputIds.count}) and result.inputIds.count (${result.inputIds.count})`);

          // Set no of reported lines
          salesFile.reportedLines = result.outputIds.count;
          if (result.outputIds.count === result.inputIds.count) {
            // When everything is report
            salesFile.reportedStatus = 'Complete';
          } else if (result.outputIds.count > 0) {
            // When some lines are reported
            salesFile.reportedStatus = 'Partially Complete';
          } else {
            // When no lines are reported
            salesFile.reportedStatus = 'Unreported';
          }
          salesFile.save()
            .then((savedSalesFile) => {
              callback(null, savedSalesFile);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        }
      });
    })
    .catch((err) => {
      logger.error(err);
      callback(new Error('There was an error loading the client for updating the reported status of the sales file. Please try again or contact support.'));
    });
};

/**
 * Clears sales data for the supplied Sales Files
 *
 * * Calls `callback(err)` with no `err` once done
 * * Calls `callback(err)` with an `err` message if an error occurs
 *
 * @param {string[]} salesFileIds - Array of Sales Files Ids
 * @param {string} clientId - The client id to use for BigQuery database query
 * @param {function(string)} callback - A callback that handles the response
 */
salesFileSchema.statics.clearSalesData = function (salesFileIds, clientId, callback) {
  const Client = require('../client');
  async.waterfall([
    function (cb) {
      // Delete any associated Unmapped Works
      UnmappedWork.deleteMany({ clientId, salesFileId: { $in: salesFileIds } })
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      // Delete any associated Unmapped tracks
      UnmappedTrack.deleteMany({ clientId, salesFileId: { $in: salesFileIds } })
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      // Delete any associated Unmapped releases
      UnmappedRelease.deleteMany({ clientId, salesFileId: { $in: salesFileIds } })
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      Client.findById(clientId)
        .then((client) => {
          if (!client) {
            cb(new Error('Client not found'));
          } else {
            // Get Sales Files
            SalesFile.find({ _id: { $in: salesFileIds.map((id) => new ObjectId(id)) }, clientId }, 'partitionNo')
              .then((salesFiles) => {
                // Get partition nos - including null if it doesn't exist
                const partitionNos = salesFiles.map((salesFile) => (salesFile.partitionNo ? salesFile.partitionNo : null));
                logger.debug(partitionNos);
                const bigQuery = new BigQuery({
                  datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
                });
                // Set up filter
                const filter = { salesFileId: { $in: salesFileIds } };
                // Only include partitions if null is not one of them
                if (partitionNos.includes(null) && partitionNos.filter(Boolean).length > 0) {
                  filter.$or = [{ partitionNo: null }, { partitionNo: { $in: partitionNos.filter(Boolean) } }];
                } else if (partitionNos.includes(null)) {
                  filter.partitionNo = null;
                } else {
                  filter.partitionNo = { $in: partitionNos };
                }
                logger.debug(filter);
                bigQuery.deleteData(bigQuery.inputTable, filter, (errDelete, result) => {
                  if (result) {
                    logger.info(`Remove Sales Data Result for: ${salesFileIds} - ${JSON.stringify(result)}`);
                  }
                  cb(errDelete);
                });
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
  ], callback);
};

/**
 * Clears Sales Data for the supplied list of Sales Files Sales Data BigQuery tables and deletes Sales Files from Mongo database
 *
 * * Calls `callback(err)` with no `err` once done
 * * Calls `callback(err)` with an `err` message if an error occurs
 *
 * @param {string[]} ids - Array of Sales Files Ids
 * @param {string} clientId - The client id to use for BigQuery database query
 * @param {object} curveUser - User object
 * @param {function(string)} callback - A callback that handles the response
 */
salesFileSchema.statics.bulkDelete = function (ids, clientId, curveUser, callback) {
  const Client = require('../client');
  Client.findById(clientId)
    .then((client) => {
      SalesFile.clearSalesData(ids, clientId, (errClear) => {
        if (errClear) {
          callback(errClear);
        } else {
          // Get Sales Files
          // Projection removed so that all data can be stored in patches - Critically important this is not re-added
          SalesFile.find({ _id: { $in: ids.map((id) => new ObjectId(id)) }, clientId })
            .then((salesFiles) => {
              async.each(salesFiles, (salesFile, cb) => {
                const { name } = salesFile;
                salesFile.deleteOne()
                  .then(() => {
                    // Notify user that sales file is deleted
                    const generateOptions = {
                      identifier: 'genericComplete',
                      curveUser,
                      client,
                      subject: 'Your Sales File Has Been Deleted',
                    };
                    Notification.generate('Your Sales File Has Been Deleted', `Sales File ${name} has been successfully deleted`, null, curveUser, generateOptions, (err) => {
                      cb(err);
                    });
                  })
                  .catch((errRemove) => {
                    logger.error(errRemove);
                    // Notify user that sales file is deleted
                    const generateOptions = {
                      curveUser,
                      client,
                      identifier: 'genericError',
                      subject: 'Your Sales File Deletion Has Errored',
                    };
                    Notification.generate('Your Sales File Deletion Has Errored', `Sales File ${name} failed to delete. Please try again or contract support.`, null, curveUser, generateOptions, (errNot) => {
                      cb(errNot);
                    });
                  });
              }, callback);
            })
            .catch((errFindSales) => {
              logger.error(errFindSales);
              callback(errFindSales);
            });
        }
      });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

/**
 * Clears Sales Data for this Sales File's Sales Data BigQuery tables and deletes Sales File from Mongo database. Calls static method bulkDelete to do so.
 *
 * * Calls `callback(err)` with no `err` once done
 * * Calls `callback(err)` with an `err` message if an error occurs
 *
 * @param {string[]} ids - Array of Sales Files Ids
 * @param {string} clientId - The client id to use for BigQuery database query
 * @param {object} curveUser - User object
 * @param {function(string)} callback - A callback that handles the response
 */
salesFileSchema.methods.clearSalesData = function (callback) {
  const salesFile = this;
  logger.info(`Removing Sales Data for Sales File: ${salesFile._id.toString()}`);
  SalesFile.clearSalesData([salesFile._id.toString()], salesFile.clientId, callback);
};

/**
 * Creates database filter from supplied api input params
 *
 * @param {object} inputParams - API params used to build the filter. Usually `req.query` passed by API.
 * @param {object} user - The user object
 * @returns {object} Database filter
 */
salesFileSchema.statics.paramsToFilterField = function (inputParams, user) {
  let params = {};
  if (user.payeeId && user.contractIds && user.contractIds.length > 0) {
    params = {
      $and: [
        { clientId: user.clientId },
        {
          $or: [
            { 'salesReturnsRights.contractId': { $in: user.contractIds } },
            { 'costsRights.contractId': { $in: user.contractIds } },
          ],
        },
      ],
    };
  } else if (user.clientId) {
    params = { clientId: user.clientId };
  }

  if (inputParams) {
    if (inputParams.text) {
      const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
      params.$or = [{ name: { $regex: regex } }, { targetPeriod: { $regex: regex } }, { salesAccountName: { $regex: regex } }, { invoiceNo: { $regex: regex } }];
      if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) { params.$or.push({ _id: inputParams.text }); }
    }
    if (inputParams.name) { params.name = inputParams.name; }
    if (inputParams.salesDateAfter || inputParams.salesDateBefore) { params.createdAt = {}; }
    if (inputParams.salesName) { params.name = inputParams.salesName; }
    // When searching included sales in period, regex search on targetPeriod
    if (inputParams.targetPeriod) {
      if (inputParams.targetPeriod === 'unassigned') {
        const targetPeriodFilters = [
          { targetPeriod: { $exists: false } },
          { targetPeriod: { $eq: '' } },
          { targetPeriod: { $eq: null } },
        ];
        if (params.$or) {
          params.$and = [
            ...(params.$and || []),
            { $or: params.$or },
            { $or: targetPeriodFilters },
          ];

          delete params.$or;
        } else params.$or = targetPeriodFilters;
      } else {
        const regex = new RegExp(_.escapeRegExp(inputParams.targetPeriod), 'i');
        params.targetPeriod = { $regex: regex };
      }
    }
    if (inputParams.foreignId) {
      const regex = new RegExp(_.escapeRegExp(inputParams.foreignId), 'i');
      params.foreignId = { $regex: regex };
    }
    if (inputParams.reportedStatus) { params.reportedStatus = inputParams.reportedStatus; }
    // Fix partially naming
    if (params.reportedStatus === 'Partially Reported') { params.reportedStatus = 'Partially Complete'; }
    if (inputParams.salesDateAfter) { params.createdAt.$gte = inputParams.salesDateAfter; }
    if (inputParams.salesDateBefore) { params.createdAt.$lte = inputParams.salesDateBefore; }
    // ADD TO: this input.valid is a quick fix. We should look to standardise what we're passing from the Front-end to API.
    // Note: We may also need to update unit test, as it currently looks for a string as the param.valid: value.
    if (inputParams.valid === 'true' || inputParams.valid) { params.valid = inputParams.valid; }
    if (inputParams.valid === 'false' || inputParams.valid === false) { params.valid = false; }
    if (inputParams.status) { params.status = inputParams.status; }
    if (inputParams.archived) { params.archived = inputParams.archived; }
    if (inputParams.archived === 'false' || inputParams.archived === false) { params.archived = { $ne: true }; }
    if (inputParams.viewed) { params.viewed = inputParams.viewed; }
    if (inputParams.notInclude) {
      params._id = {
        $nin: inputParams.notInclude.map((val) => new ObjectId(val)),
      };
    }
    if (inputParams.duplicates) { params.duplicateSalesFileId = { $exists: true }; }
  }
  return params;
};

const SalesFile = mongoose.model(name, salesFileSchema);

module.exports = SalesFile;
