/**
 * @module release
 */
const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const _ = require('lodash');
const { Cost: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const modelHistory = require('../libs/modelHistory');
const Notification = require('./notification');
const config = require('../config.json');
const Statement = require('./statement');

const { ObjectId } = mongoose.Types;

const costSchema = schema;

costSchema.plugin(modelHistory, { mongoose, name: 'costPatches', useArchive: true, removePatches: false });
costSchema.plugin(mongoosePaginate);

costSchema.post('init', (cost) => {
  if (cost.files) {
    async.map(
      cost.files,
      (file, cb) => {
        if (file.key) {
          fileManager.publicS3Link(file.key, (err, publicLink) => {
            file.publicLink = publicLink;
            cb(err, file);
          });
        }
      },
      (err, newFiles) => (cost.files = newFiles),
    );
  }
});

costSchema.pre('save', function (next) {
  const cost = this;
  if (cost?.date && cost?.date?.getFullYear().toString().length !== 4) {
    return next(new Error('Year must be 4 digits'));
  }
  // Check for multiple catalogue items
  const totalCatalogueCount = cost.trackIds.length + cost.releaseIds.length + cost.contractIds.length;
  if (totalCatalogueCount > 1) {
    return next(new Error('You can only have one catalogue item or contract mapped to a cost'));
  }

  next();
});

costSchema.post('save', (err, saved, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

costSchema.post('init', (cost) => {
  if (cost.calculationContractIds && cost.calculationContractIds.length > 0) {
    cost.reportedStatus = 'Complete';
  } else {
    cost.reportedStatus = 'Unreported';
  }
});

costSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const cost = this;
  // Check if there are any locked statements associated with the cost
  Statement.find({ clientId: cost.clientId, costIds: cost._id.toString(), locked: true })
    .then((statements) => {
      if (statements && statements.length > 0) {
        // Build statement references
        let statementRefs = statements.map((statement) => ({ name: statement.name, link: `statements/${statement._id.toString()}` }));
        // Get unique values
        statementRefs = _.uniqBy(statementRefs, 'link');
        // Return contractIds as error
        next(new Error(JSON.stringify(statementRefs)));
      } else {
        next();
      }
    })
    .catch((err) => {
      logger.error(`Cost Deletion Errored on ${cost._id}`);
      logger.error(err);
      next(err);
    });
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
      if (message.includes('name: Path `name` is required')) {
        return 'A Name is required';
      } if (message.includes('type: Path `type` is required')) {
        return 'Type is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
}

/**
  * Sends an export of the Cost data by email.
  *
  * @method
  * @param {object} filter - The Cost filter object.
  * @param {object} curveUser - The User sending the export.
  */

costSchema.statics.sendExport = function (filter, curveUser) {
  const Client = require('./client');
  try {
    async.waterfall([
      function (cb) {
        Cost.find(filter)
          .populate(['releaseIds', 'trackIds', 'contractIds'])
          .then((costs) => {
            cb(null, costs);
          })
          .catch((err) => {
            cb(err);
          });
      },
      function (costs, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            // get date format from client settings
            const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
            Cost.convertCostsForXlsx(costs, dateFormat, cb);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (data, cb) {
        if (data.length > 10000) {
          const output = `${appRootDir}/tmp/createInTemplate-${moment().format('X')}.csv`;
          const writer = new WriteCsv({ headers: ['ID', 'Name', 'Amount', 'Currency', 'Date', 'Type', 'Territory', 'Target Period', 'Invoice No', 'Description', 'Release IDs', 'Track IDs', 'Contract IDs'], outputLocation: output });
          writer.addData(data, () => {
            writer.write((err) => {
              cb(err, output);
            });
          });
        } else {
          Exports.getTemplate({ Client, templateName: 'cost', clientId: curveUser.clientId }).then((template) => {
            createXlsx.createInTemplate([data], template, cb);
          });
        }
      },
      function (filePath, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            fileManager.uploadToS3(`exports/${client.name} Cost Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
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
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportDownload',
              curveUser,
              client,
              subject: `Your Costs Export for ${client.name} is Ready to Download`,
              link,
            };
            Notification.generate('Costs Export Ready', `Your Costs Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
              cb(err);
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
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportError',
              curveUser,
              client,
              subject: 'Your Cost Export Has Errored',
              error: err.message,
            };
            Notification.generate('Your Cost Export Has Errored', err.message, null, curveUser, generateOptions);
          })
          .catch((err) => {
            logger.error(err);
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
          subject: 'Your Cost Export Has Errored',
          error: 'Your Cost export has errored. Please try again, or contact support',
        };
        Notification.generate('Your Cost Export Has Errored', 'Your cost export has errored. Please try again, or contact support', null, curveUser, generateOptions);
      })
      .catch((err) => {
        logger.error(err);
      });
  }
};

/**
  * Formats multiple Costs for the Excel export.
  *
  * Calls callback(err, convertedCosts) with an [err] if an error occurs and the array containing [convertedCosts].
  *
  * @method
  * @param {object[]} costs - The Costs to format.
  * @param {string} dateFormat - The date format.
  * @param {function(string, array[], object)} callback - The callback that handles the response.
  */

costSchema.statics.convertCostsForXlsx = function (costs, dateFormat, callback) {
  try {
    if (costs instanceof Array) {
      const convertedCosts = [];
      async.each(costs, (cost, cb) => {
        let releases = '';
        let tracks = '';
        let contracts = '';
        if (cost.releaseIds.length > 0) {
          releases = cost.releaseIds.map((el) => el.catNo || el._id).join(';');
        }
        if (cost.trackIds.length > 0) {
          tracks = cost.trackIds.map((el) => el.isrc || el._id).join(';');
        }
        if (cost.contractIds.length > 0) {
          contracts = cost.contractIds.map((el) => el.name || el._id).join(';');
        }
        convertedCosts.push(cost.exportData(releases, tracks, contracts, dateFormat));
        cb();
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, convertedCosts);
        }
      });
    } else {
      callback('Must be passed an Array of Costs', null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
 * Returns an array of the Costs data to export.
 *
  * @method
  * @param {object[]} releases - Array of Releases to include in the export.
  * @param {object[]} tracks - Array of Tracks to include in the export.
  * @param {object[]} works - Array of Works to include in the export.
  * @param {object[]} contracts - Array of Contracts to include in the export.
  * @param {string} dateFormat - The date format for the export.
  * @returns {array} result - The export data
  */

costSchema.methods.exportData = function (releases, tracks, contracts, dateFormat) {
  return [
    this._id.toString(),
    this.name,
    this.amount,
    this.currency,
    this.date ? moment(this.date).format(dateFormat) : null,
    this.type,
    this.territory,
    this.targetPeriod,
    this.invoiceNo,
    this.description,
    releases,
    tracks,
    contracts,
  ];
};

/**
  * Imports Costs from Excel.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Costs.
  * @param {function(string, object)} callback - The callback that handles the response.
  */

costSchema.statics.importFromExcel = function (file, curveUser, callback) {
  const Client = require('./client');
  const ImportXlsx = require('../libs/importXlsx');
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
        ImportXlsx.getDataByTemplate(file.path, config.importTemplates.cost, 0, 2, dateFormat, (error, data) => {
          if (error) {
            if (error === 'Template does not match') { error = 'It appears the template does not match'; }
            // @Arjun: More double fetching of clients
            Client.findById(curveUser.clientId)
              .then((client) => {
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your Cost Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Cost Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          } else {
            Cost.importCosts(data, curveUser.clientId, (errors, count, importedCosts) => {
              if (errors && errors.length > 0) {
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Cost Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Cost Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              } else {
                // Didn't error, save.
                const partialImportErrors = [];
                async.each(importedCosts, (importedCost, payeeCb) => {
                  importedCost.createdBy = curveUser.id;
                  importedCost.lastModifiedBy = curveUser.id;
                  importedCost.save()
                    .then(() => {
                      payeeCb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      partialImportErrors.push(`Cost ${importedCost.name} did not save - ${err.message || err}`);
                      payeeCb();
                    });
                }, () => {
                  Client.findById(curveUser.clientId)
                    .then((client) => {
                      if (partialImportErrors.length > 0) {
                        const generateOptions = {
                          identifier: 'partialImportError',
                          curveUser,
                          client,
                          subject: 'Your Cost Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };

                        Notification.generate(
                          'Your Cost Import Was Partially Successful',
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
                        const generateOptions = {
                          identifier: 'importComplete',
                          curveUser,
                          client,
                          subject: 'Your Cost Import Has Completed',
                          file: file.originalname,
                          count,
                        };

                        Notification.generate(
                          'Your Cost Import Has Completed',
                          `${count} Costs imported in file ${file.originalname}`,
                          null,
                          curveUser,
                          generateOptions,
                          (err, result) => {
                            if (callback) { callback(err, result); }
                          },
                        );
                      }
                    })
                    .catch((err) => {
                      logger.error(err);
                      callback(err);
                    });
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Cost Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Cost Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
  * Imports a single Cost.
  *
  * Calls callback(error, cost) with an [error] if an errror occurs and the imported [cost].
  *
  * @method
  * @param {object} data - The Cost to import.
  * @param {object} client - Client importing the Cost.
  * @param {string} clientId - ID of the client importing the Cost.
  * @param {function(string, object, string[], object)} callback - The callback that handles the response.
  */

costSchema.statics.importCost = function (data, client, clientId, callback) {
  const Release = require('./release');
  const Track = require('./track');
  const Work = require('./work');
  const Contract = require('./contract');
  const multiCurrencies = ['Home Currency', client.homeCurrency, client.currency2, client.currency3, client.currency4].filter((element) => element !== null);

  if (!data) {
    return callback("Data doesn't match template");
  } if ((!data.name || data.name === '') && (!data.amount || data.amount === '') && (!data.type || data.type === '')) {
    // if blank line then move onto next cost
    return callback();
  } if (data.type && !client.costTypes.includes(data.type)) {
    return callback("Type doesn't match list, defined in your settings");
  } if (data.currency && !multiCurrencies.includes(data.currency)) {
    return callback(`Currency '${data.currency}' doesn't match list, defined in your settings`);
  } if (!data.currency || data.currency === '') {
    return callback('Currency is not included');
  }

  // Convert currency to Home Currency if matching
  if (data.currency === client.homeCurrency) {
    data.currency = 'Home Currency';
  }

  async.waterfall([
    function (cb) {
      if (ObjectId.isValid(data._id)) {
        Cost.findOne({ _id: new ObjectId(data._id), clientId })
          .then((cost) => {
            cb(null, cost);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        const cost = new Cost();
        cb(null, cost);
      }
    },
    function (cost, cb) {
      try {
        cost.clientId = clientId;
        cost.name = data.name;
        cost.type = data.type;
        cost.date = data.date;
        cost.territory = data.territory;
        if (['World', 'world'].includes(cost.territory)) { cost.territory = 'WW'; }
        cost.invoiceNo = data.invoiceNo;
        cost.description = data.description;
        cost.targetPeriod = data.targetPeriod;
        cost.amount = typeof data.amount === 'string' ? Number(data.amount.replace(/[^0-9.-]/g, '')) : Number(data.amount);
        cost.currency = data.currency;
        cost.releaseIds = [];
        cost.trackIds = [];
        cost.workIds = [];
        cost.contractIds = [];
        cb(null, cost);
      } catch (e) {
        cb(e);
      }
    },
  ], (err, cost) => {
    if (err) {
      callback(err);
    } else if (((data.releaseIds && data.releaseIds.length > 0) || (data.trackIds && data.trackIds.length > 0)) && (data.contractIds && data.contractIds.length > 0)) {
      callback('You can only map a cost to either catalogue or to contracts.');
    } else {
      const asyncArrs = [];

      if (data.releaseIds && data.releaseIds !== '') {
        const releases = String(data.releaseIds).split(';');
        releases.forEach((el) => {
          asyncArrs.push((cb) => {
            el = typeof el === 'string' ? el.trim() : el;
            const or = [{ catNo: el }, { aliases: el }];
            if (ObjectId.isValid(el)) { or.push({ _id: new ObjectId(el) }); }
            const query = { $or: or, clientId };
            if (generateId(el)) {
              query.$or.push(generateId(el));
            }
            getReferenceData(Release, query, cost.releaseIds, el, cb);
          });
        });
      }

      if (data.trackIds && data.trackIds !== '') {
        const tracks = String(data.trackIds).split(';');
        tracks.forEach((el) => {
          asyncArrs.push((cb) => {
            el = typeof el === 'string' ? el.trim() : el;
            const or = [{ isrc: el }, { aliases: el }];
            if (ObjectId.isValid(el)) { or.push({ _id: new ObjectId(el) }); }
            const query = { $or: or, clientId };
            if (generateId(el)) {
              query.$or.push(generateId(el));
            }
            getReferenceData(Track, query, cost.trackIds, el, cb);
          });
        });
      }

      if (data.workIds && data.workIds !== '') {
        const works = String(data.workIds).split(';');
        works.forEach((el) => {
          asyncArrs.push((cb) => {
            el = typeof el === 'string' ? el.trim() : el;
            const or = [{ identifier: el }, { aliases: el }];
            if (ObjectId.isValid(el)) { or.push({ _id: new ObjectId(el) }); }
            const query = { $or: or, clientId };
            if (generateId(el)) {
              query.$or.push(generateId(el));
            }
            getReferenceData(Work, query, cost.workIds, el, cb);
          });
        });
      }

      if (data.contractIds && data.contractIds !== '') {
        const contracts = String(data.contractIds).split(';');
        contracts.forEach((el) => {
          asyncArrs.push((cb) => {
            el = typeof el === 'string' ? el.trim() : el;
            const or = [{ name: el }];
            if (ObjectId.isValid(el)) { or.push({ _id: new ObjectId(el) }); }
            const query = { $or: or, clientId };
            if (generateId(el)) {
              query.$or.push(generateId(el));
            }
            if (data.modified) {
              const index = config.importTemplates.cost.findIndex((item) => item.key === 'contractIds');
              const originalName = data.originalRow[index];
              query.$or.push({ name: originalName });
            }
            getReferenceData(Contract, query, cost.contractIds, el, cb);
          });
        });
      }

      async.parallel(asyncArrs, (err) => {
        if (err) {
          callback(err);
        } else {
          cost.validate()
            .then(() => {
              callback(null, cost);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        }
      });
    }
  });
};

/**
  * Imports an array of Costs.
  *
  * Calls callback(errors, count, importedCosts) with an array of [errors] if they occur, the [count] of Costs imported, an array containing the [importedCosts].
  *
  * @method
  * @param {object[]} costs - Costs to import.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {function(string[], number, object, object, object)} callback - The callback that handles the response.
  */

costSchema.statics.importCosts = function (costs, clientId, callback) {
  const Client = require('./client');
  try {
    if (Object.prototype.toString.call(costs) !== '[object Array]') {
      callback('Data must be an Array', null);
    } else if (!clientId) {
      callback('A Client ID must be passed', null);
    } else {
      let count = 0;
      const errors = [];
      const importedCosts = [];
      Client.findById(clientId)
        .then((client) => {
          async.eachOfSeries(costs, (cost, index, cb) => {
            Cost.importCost(cost, client, clientId, (err, importedCost) => {
              if (err) { errors.push(`Line ${index + 3}: ${err}`); }
              if (importedCost) {
                count += 1;
                importedCosts.push(importedCost);
              }
              cb();
            });
          }, (err) => {
            if (err) {
              callback(err, null);
            } else {
              callback(errors, count, importedCosts);
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    }
  } catch (e) {
    callback(e);
  }
};

/**
  * Formats params into a filter.
  *
  * @method
  * @param {object} inputParams - Params to format.
  * @param {object} user - User doing the request.
  * @returns {object} params - The formatted params.
  */

costSchema.statics.paramsToFilterField = function (inputParams, user) {
  let params = {};
  if (user.payeeId && user.contractIds && user.contractIds.length > 0) {
    params = { $and: [{ clientId: user.clientId }, { $or: [{ 'salesReturnsRights.contractId': { $in: user.contractIds } }, { 'costsRights.contractId': { $in: user.contractIds } }] }] };
  } else if (user.clientId) {
    params = { clientId: user.clientId };
  }
  // if(inputParams.text) { params["$text"] = { "$search": inputParams.text } }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [{ name: { $regex: regex } }, { targetPeriod: { $regex: regex } }, { description: { $regex: regex } }, { invoiceNo: { $regex: regex } }];
    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or.push({ _id: inputParams.text });
    }
  }
  if (inputParams.costsName) { params.name = inputParams.costsName; }

  if (inputParams.targetPeriod) {
    if (Array.isArray(inputParams.targetPeriod)) {
      const targetPeriods = inputParams.targetPeriod.reduce((rest, targetPeriod) => {
        if (targetPeriod === 'unassigned') return [...rest, null, ''];
        return [...rest, targetPeriod];
      }, []);
      params.$or = [{ targetPeriod: { $in: targetPeriods } }];
    } else {
      // When searching included sales in period, regex search on targetPeriod
      const regex = new RegExp(_.escapeRegExp(inputParams.targetPeriod), 'i');
      params.targetPeriod = { $regex: regex };
    }
  }
  if (inputParams.reportedStatus) {
    const { reportedStatus } = inputParams;
    if (reportedStatus === 'Complete') params.calculationContractIds = { $exists: true, $not: { $size: 0 } };
    if (reportedStatus === 'Unreported') params.calculationContractIds = { $size: 0 };
  }
  if (inputParams.costsDateAfter || inputParams.costsDateBefore) { params.createdAt = {}; }
  if (inputParams.costsDateAfter) { params.createdAt.$gte = inputParams.costsDateAfter; }
  if (inputParams.costsDateBefore) { params.createdAt.$lte = inputParams.costsDateBefore; }
  if (inputParams.archived) { params.archived = inputParams.archived; }
  if (inputParams.archived === false || inputParams.archived === 'false') { params.archived = { $ne: true }; }
  if (inputParams.notInclude) {
    params._id = {
      $nin: inputParams.notInclude.map((val) => new ObjectId(val)),
    };
  }
  if (inputParams.costTypes && inputParams.costTypes.length > 0) { params.type = { $in: inputParams.costTypes }; }
  return params;
};

let getReferenceData = function (obj, query, resultArr, identifier, cb) {
  obj.findOne(query)
    .then((data) => {
      if (data && resultArr.indexOf(data._id) < 0) {
        resultArr.push(data._id);
        cb();
      } else {
        cb(new Error(`Unable to find item with the identifier ${identifier}`));
      }
    })
    .catch((err) => {
      logger.error(err);
      cb(err);
    });
};

let generateId = function (str) {
  try {
    // eslint-disable-next-line no-undef
    id = new ObjectId(str);
  } catch (e) {
    return null;
  }
  return { _id: str };
};

const Cost = mongoose.model(name, costSchema);

module.exports = Cost;
