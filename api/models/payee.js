/* eslint-disable no-await-in-loop */
/**
 * @module payee
 */
const { logger, fileManager, createXlsx, Tipalti, Wise, CurvePay, encryption, configShared } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, Utils } = require('@curveroyaltysystems/curve-shared-logic');
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const { Payee: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const Notification = require('./notification');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const ModelErrors = require('../libs/modelErrors');
const payeeSelectFields = require('../libs/payeeSelectFields');
const Client = require('./client');
const Parent = require('./parent');
const Payment = require('./payment');

const PaymentController = require('../controllers/payment');
const PayeeTransaction = require('./payeeTransaction');

const payeeSchema = schema;

payeeSchema.plugin(modelHistory, { mongoose, name: 'payeePatches', useArchive: true, removePatches: false, encryptedFields: configShared.encryptedFields.payee, Client });

payeeSchema.plugin(mongoosePaginate);

/**
 * Constructs a filter from input params
 *
 * @method
 * @param {object} inputParams - The input params object
 * @param {object} curveUser - The user object
 * @returns {object} params - The constructed filter
 */
payeeSchema.statics.paramsToFilterField = function (inputParams, curveUser) {
  // Creates filter for find from inputParams
  // Prepare result
  let params = {};
  if (!curveUser) {
    throw (new Error('A curveUser is required'));
  } else if (curveUser && !curveUser.payeeId && !curveUser.clientId) {
    throw (new Error('curveUser is required to have one of clientId or payeeId'));
  } else {
    // If request coming from a payee
    if (curveUser.payeeId && curveUser.contractIds && curveUser.contractIds.length > 0) {
      params = { $and: [{ clientId: curveUser.clientId }, { $or: [{ 'salesReturnsRights.contractId': { $in: curveUser.contractIds } }, { 'costsRights.contractId': { $in: curveUser.contractIds } }] }] };
      // If request coming from a client
    } else if (curveUser.clientId) {
      params = { clientId: curveUser.clientId };
    }
    // When text value is passed
    if (inputParams && inputParams.text) {
      const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
      params.$or = [
        { name: { $regex: regex } },
        { alternateName: { $regex: regex } },
        { foreignId: { $regex: regex } },
        { projectId: { $regex: regex } },
      ];
      if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
        params.$or.push({ _id: inputParams.text });
      }
    }
    if (inputParams?.valid === 'true' || inputParams?.valid) { params.valid = true; }
    if (inputParams?.valid === 'false' || inputParams?.valid === false) { params.valid = false; }
    // Return object
    return params;
  }
};

/**
  * Returns the Parent of the Client associated with the Payee.
  *
  * Calls callback(err, parent) with [err] if an error occurs or the [parent] if a Parent is found.
  *
  * Calls callback(err) if no Client is associated with the Payee.
  *
  * @method
  * @param {string} accountingPeriod - Accounting period.
  * @param {function(string, object[])} callback - The callback that handles the response.
  */
payeeSchema.methods.getParent = function (callback) {
  // Get the parent of the client associated with this payee
  const payee = this;
  // Find client
  Client.findById(payee.clientId, { parentId: 1 })
    .then((client) => {
      // When client found, return the parentId - this could be null
      if (client) {
        Parent.findById(client.parentId)
          .then((parent) => {
            callback(null, parent);
          })
          .catch((err) => {
            callback(err);
          });
        // Return error
      } else {
        callback(new Error('No client associated with Payee'));
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(new Error('No client associated with Payee'));
    });
};

/**
  * Returns data of the Client associated with the Payee.
  *
  * Calls callback(err, json) with [err] if an error occurs or the [json] object of the Client data.
  *
  * The returned json object contains: distributionChannels, configurations, priceCategories, sources, costTypes and catalogueGroups.
  *
  * @method
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.methods.getClientValues = function (callback) {
  const Client = require('./client');

  // Gets client values for displaying to payees
  const payee = this;
  // Get client associated with payee
  Client.findById(payee.clientId, {
    distributionChannels: 1, configurations: 1, priceCategories: 1, sources: 1, costTypes: 1, catalogueGroups: 1,
  })
    .then((client) => {
      // Payee to JSON to be able to add the fields to
      const json = payee.toJSON();
      // Only add fields when client is present
      if (client) {
        json.distributionChannels = client.distributionChannels;
        json.configurations = client.configurations;
        json.priceCategories = client.priceCategories;
        json.sources = client.sources;
        json.costTypes = client.costTypes;
        json.catalogueGroups = client.catalogueGroups;
      }
      // Return payee with addition of values
      callback(null, json);
    })
    .catch((err) => {
      callback(err);
    });
};

/**
  * Returns a summary of the Payee's total revenues and costs to date.
  *
  * Calls callback(err, summary) with [err] if an error occurs or a [summary] of the Payee's costs and revenues.
  *
  * @method
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.methods.summary = function (callback) {
  const Contract = require('./contract');
  const Statement = require('./statement');
  // Sums up revenues for all periods
  const payee = this;
  // Build result object
  const summary = {
    _id: payee._id,
    name: payee.name,
    totalRevenuesToDate: 0,
    totalCostsToDate: 0,
  };
  // Find Contracts associated with payee
  Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id }, { name: 1 })
    .then((contracts) => {
      // Get IDs to filter statements by
      const contractIds = contracts.map((contract) => contract._id.toString());
      // Find statements
      Statement.find({ clientId: payee.clientId, contractId: { $in: contractIds }, status: 'Published' })
        .then((statements) => {
          // Loop through statements, summing up net amounts
          statements.forEach((statement) => {
            summary.totalRevenuesToDate += statement.netAmount;
            summary.totalCostsToDate += statement.netCosts;
          });
          // Return summary Payee object
          callback(null, summary);
        })
        .catch((err) => {
          callback(err);
        });
    })
    .catch((err) => {
      callback(err);
    });
};

/**
  * Returns analitycs of all the Payee's statements.
  *
  * Calls callback(err) with [err] if an error occurs.
  *
  * @method
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.methods.analytics = function (callback) {
  const Contract = require('./contract');
  const Statement = require('./statement');
  // Returns analytics for all statements
  const payee = this;
  // Find Contracts associated with payee
  Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id }, { name: 1 })
    .then((contracts) => {
      // Get IDs to filter statements by
      const contractIds = contracts.map((contract) => contract._id.toString());
      // Find statements
      Statement.find({ clientId: payee.clientId, contractId: { $in: contractIds }, status: 'Published' }, { analysis: 1 })
        .then((statements) => {
          // Build result object
          const result = {
            distributionChannels: [],
            configurations: [],
            territories: [],
            sources: [],
            subSources: [],
            costs: [],
          };
          // Build revenues over time object
          const overTime = {
            data: [[], []],
            labels: [],
          };
          // Loop through statements
          statements.forEach((statement) => {
            function addDataToResult(items, resultTarget) {
              // Reusable function for managing adding statement data to result
              if (items) {
                items.forEach((item) => {
                  // Need to track if item type already exists in results
                  let added = false;
                  // Loop through result channels to add values
                  result[resultTarget].forEach((target) => {
                    // If item matches one of the target arrays
                    if (target.type === item.type) {
                      target.units += item.units;
                      target.value += item.value;
                      added = true;
                    }
                  });
                  // Add to array if values haven't been added
                  if (!added) { result[resultTarget].push(item); }
                });
              }
            }

            // Run mapping for each of the array elements
            addDataToResult(statement.analysis.net.distributionChannels, 'distributionChannels');
            addDataToResult(statement.analysis.net.configurations, 'configurations');
            addDataToResult(statement.analysis.net.territories, 'territories');
            addDataToResult(statement.analysis.net.sources, 'sources');
            addDataToResult(statement.analysis.net.subSources, 'subSources');
            addDataToResult(statement.analysis.net.costs, 'costs');
            // Add data to overTime time series data
            overTime.data[0].push(statement.netAmount);
            overTime.data[1].push(statement.netCosts);
            overTime.labels.push(moment(statement.date).format('MM-YYYY'));
          });

          // Return results
          callback(null, { net: result, overTime });
        })
        .catch((err) => {
          callback(err);
        });
    })
    .catch((err) => {
      callback(err);
    });
};

/**
  * Sends an export of the Payee data by email.
  *
  * Calls callback(err, result) with [err] if an error occurs or a [result] of the Payee's net revenues analytics.
  *
  * @method
  * @param {filter} filter - The Payee filter object.
  * @param {curveUser} curveUser - The user object.
  * @param {function(string)} callback - The callback that handles the response.
  */
// Export
payeeSchema.statics.sendExport = function (filter, curveUser, callback) {
  const Client = require('./client');
  // Sends export via email
  if (!curveUser) {
    callback(new Error('sendExport requires curveUser to be passed'));
  } else {
    // Get client managing emails
    Client.findById(curveUser.clientId, { name: 1, parentId: 1, features: 1 })
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
            // Find payees based on passed filter
            Payee.find(filter)
              .then((payees) => {
                cb(null, payees);
              })
              .catch((err) => {
                cb(err);
              });
          },
          function (payees, cb) {
            // Clear encrypted fields if user is not authorised to export them
            if (Array.isArray(payees)) {
              payees.forEach((payee) => {
                payee = encryption.encryptionUtils.clearEncryptedFields(payee, configShared.encryptedFields.payee, curveUser);
                if (!encryption.encryptionUtils.isClientAdminUser(curveUser)) {
                  payeeSelectFields.getClientAdminOnlyFields().forEach((row) => {
                    payee[row] = undefined;
                  });
                }
              });
            }
            // Convert data for excel file
            Payee.convertPayeesForXlsx(payees, client, cb);
          },
          function (data, cb) {
            // Create XLSX
            Exports.getTemplate({ Client, templateName: 'payee', clientId: curveUser.clientId }).then((template) => {
              createXlsx.createInTemplate([data], template, cb);
            });
          },
          function (filePath, cb) {
            // Update to S3
            fileManager.uploadToS3(`exports/${client.name} Payee Export ${moment().format('YYYYMMDDHHmmssSSS')}.xlsx`, filePath, cb);
          },
          function (key, cb) {
            // Create Public Link
            fileManager.publicLink24Hours(key, cb);
          },
          function (link, cb) {
            const generateOptions = {
              identifier: 'exportDownload',
              curveUser,
              client,
              subject: `Your Payees Export for ${client.name} is Ready to Download`,
              link,
            };
            Notification.generate('Payee Export Ready', `Your Payees Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
              cb(err);
            });
          },
        ], (err) => {
          // Handle any errors
          if (err) {
            logger.error(err);
            const generateOptions = {
              identifier: 'exportError',
              curveUser,
              client,
              subject: 'Your Payee Export Has Errored',
              error: err.message,
            };
            Notification.generate('Your Payee Export Has Errored', err.message, null, curveUser, generateOptions, (err) => {
              if (callback) { callback(err); }
            });
          } else if (callback) {
            // Conditional callback
            callback();
          }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Converts each of the passed Payees into an array of data
  *
  * Calls callback(err, convertedPayees) with [err] if an error occurs or a array of [convertedPayees].
  *
  * @method
  * @param {object[]} payees - An array of Payees to convert.
  * @param {function(string, object[])} callback - The callback that handles the response.
  */
payeeSchema.statics.convertPayeesForXlsx = function (payees, client, callback) {
  // Converts each of the passed Payees into an array of data
  // When passed an array
  if (payees instanceof Array) {
    // Map each element of array to exportData function
    const convertedPayees = payees.map((payee) => payee.exportData(client));
    callback(null, convertedPayees);
    // When not passed an array
  } else {
    callback(new Array('Must be passed an Array of Payees'), null);
  }
};

/**
  * Returns an array of the payee data for excel.
  *
  * @method
  * @returns {string[]} data - An array of the Payee's data.
  */
payeeSchema.methods.exportData = function (client) {
  // Returns an array of payee data for excel
  const { features } = client;
  const row = [
    this._id.toString(),
    this.name,
    this.alternateName,
    this.foreignId,
    this.projectId,
    this.supplierCode,
    this.payeeCategories ? this.payeeCategories.join(';') : '',
    this.contactEmail,
    Utils.convertLineBreakToSemiColon(this.address),
    this.country,
    this.vatNo,
    this.selfBillingTaxText,
    this.selfBillingTaxRate,
    this.feesInvoiceTaxRate,
    this.withholdingTaxRate,
    this.withholdingTaxWording,
    this.paymentEmail,
    this.paymentCurrency,
    this.bankName,
    Utils.convertLineBreakToSemiColon(this.bankAddress),
    this.accountNo,
    this.sortCode,
    this.iban,
    this.swiftCode,
    Utils.convertLineBreakToSemiColon(this.notes),
  ];

  if (features?.payeeBalances) { row.splice(17, 0, this.payeeBalanceCurrency); }
  return row;
};

// Import

/**
  * Imports Payees from Excel.
  *
  * Calls callback(err, result) with an [err] or message string if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {curveUser} curveUser - User importing the contract.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.statics.importFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  const Client = require('./client');
  // Imports payees from an excel template
  // Handle error if no curveUser passed
  if (!curveUser) {
    callback(new Error('importFromExcel requires a curveUser to be passed'));
  } else {
    // Load client for emails
    Client.findById(curveUser.clientId, { name: 1, parentId: 1, dateFormat: 1, features: 1 })
      .then((client) => {
        if (!file) {
          const generateOptions = {
            identifier: 'exportError',
            curveUser,
            client,
            subject: 'Your Payee Import Has Errored',
            error: ['No file was uploaded'],
          };
          Notification.generate('Your Payee Import Has Errored', 'No file was uploaded', null, curveUser, generateOptions, (err, result) => {
            if (callback) { callback(err, result); }
          });
        } else {
          // get date format from client settings
          const dateFormat = client.dateFormat.toUpperCase();
          const template = client.features?.payeeBalances ? config.importTemplates.payeeWithPayeeBalances : config.importTemplates.payee;
          // Load data from template
          ImportXlsx.getDataByTemplate(file.path, template, 0, 2, dateFormat, (error, data) => {
            // Handle errors from template
            if (error) {
              // Make the error more user friendly if the template doesn't match
              if (error === 'Template does not match') { error = 'It appears the template does not match'; }

              const generateOptions = {
                identifier: 'importError',
                curveUser,
                client,
                subject: 'Your Payee Import Has Errored',
                file: file.originalname,
                error: [error],
              };
              Notification.generate('Your Payee Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                if (callback) { callback(err, result); }
              });
            } else {
              const isClientAdminUser = encryption.encryptionUtils.isClientAdminUser(curveUser);

              // Import payees from data
              Payee.importPayees(data, curveUser.clientId, overwriteBlanks, isClientAdminUser, (errors, count, importedPayees) => {
                // Handle errors
                if (errors && errors.length > 0) {
                  logger.error(errors);
                  const generateOptions = {
                    identifier: 'importError',
                    curveUser,
                    client,
                    subject: 'Your Payee Import Has Errored',
                    file: file.originalname,
                    error: errors,
                  };
                  Notification.generate('Your Payee Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                    if (callback) { callback(err, result); }
                  });
                } else {
                  // No errors, save payees
                  const partialImportErrors = [];
                  async.each(importedPayees, (importedPayee, payeeCb) => {
                    importedPayee.createdBy = curveUser.id;
                    importedPayee.lastModifiedBy = curveUser.id;
                    importedPayee.save()
                      .then(() => {
                        payeeCb();
                      })
                      .catch((err) => {
                        partialImportErrors.push(`Payee ${importedPayee.name} did not save - ${err.message || err}`);
                        payeeCb();
                      });
                  }, () => {
                    if (partialImportErrors.length > 0) {
                      const generateOptions = {
                        identifier: 'partialImportError',
                        curveUser,
                        client,
                        subject: 'Your Payee Import Was Partially Successful',
                        file: file.originalname,
                        error: partialImportErrors,
                      };

                      Notification.generate(
                        'Your Payee Import Was Partially Successful',
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
                        subject: 'Your Payee Import Has Completed',
                        file: file.originalname,
                        count,
                      };

                      Notification.generate(
                        'Your Payee Import Has Completed',
                        `${count} Payees imported in file ${file.originalname}`,
                        null,
                        curveUser,
                        generateOptions,
                        (err, result) => {
                          if (callback) { callback(err, result); }
                        },
                      );
                    }
                  });
                }
              });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(`Error finding client in importFromExcel with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports a single Payee from Excel.
  *
  * Calls callback(err, payee) with an [err] if an error occurs and the imported [payee].
  * @method
  * @param {object} data - Payee to import.
  * @param {string} clientId - ID of the client importing the payee.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {boolean} isClientAdminUser - Set to true if user is client admin, which means they can update encrypted fields and other client-admin only fields
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.statics.importPayee = function (data, clientId, overwriteBlanks, isClientAdminUser, callback) {
  const Client = require('./client');
  // Function manages the import of a payee, finding or creating a payee from the passed data
  Client.findById(clientId)
    .then((client) => {
      // Manage error when no data passed
      if (!data) {
        return callback(new Error("Data doesn't match template"));
      }
      if (!data.name && !data.alternateName && !data.foreignId && !data.address) {
        // No data on line, so skip
        return callback();
      }
      // Set up query variable
      let query;
      // Add ID to query if exists
      if (ObjectId.isValid(data._id)) {
        query = { _id: new ObjectId(data._id), clientId };
      } else if (data.name) {
        // Add name to query if exists
        query = { clientId, name: data.name };
        // Return error if no name is passed, but other data exists on the line
      } else {
        return callback(new Error('Name must be passed'));
      }

      if (data.paymentCurrency && data.paymentCurrency !== '') {
        const currencyIndex = config.currencies.findIndex((currency) => currency.code === data.paymentCurrency);

        if ((!currencyIndex && currencyIndex !== 0) || currencyIndex === -1) {
          return callback(new Error('Currency doesn\'t match list'));
        }
      }

      // checks if fieldName is part of encrypted fields. Returns true if user is allowed to update encrypted fields
      function allowUpdate(fieldName) {
        if (isClientAdminUser) {
          return true;
        }
        const encryptedFields = configShared.encryptedFields.payee;
        if (encryptedFields) {
          // if the field is an encrypted field or is a client-admin only field don't allow update
          if (fieldName && (encryptedFields.includes(fieldName) || payeeSelectFields.getClientAdminOnlyFields().includes(fieldName))) {
            return false;
          }
          return true;
        }
        return false;
      }

      let payee = {};
      async.waterfall([
        function (cb) {
          Payee.findOne(query)
            .then((foundPayee) => {
              cb(null, foundPayee);
            })
            .catch((err) => {
              cb(err);
            });
        },
        function (foundPayee, cb) {
          // If currency is updated, reset payment fields
          if (foundPayee && allowUpdate('paymentCurrency') && (data.paymentCurrency || overwriteBlanks) && foundPayee.paymentCurrency !== data.paymentCurrency) { _.set(foundPayee, 'paymentProviders.wise', {}); }
          payee = foundPayee || new Payee();
          payee.clientId = clientId;
          if (allowUpdate('name') && (data.name)) { payee.name = data.name; }
          if (allowUpdate('alternateName') && (data.alternateName || overwriteBlanks)) { payee.alternateName = data.alternateName; }
          if (allowUpdate('foreignId') && (data.foreignId || overwriteBlanks)) { payee.foreignId = data.foreignId; }
          if (allowUpdate('projectId') && (data.projectId || overwriteBlanks)) { payee.projectId = data.projectId; }
          if (allowUpdate('supplierCode') && (data.supplierCode || overwriteBlanks)) { payee.supplierCode = data.supplierCode; }
          if (allowUpdate('contactEmail') && (data.contactEmail || overwriteBlanks)) { payee.contactEmail = data.contactEmail; }
          if (allowUpdate('address') && (data.address || overwriteBlanks)) { payee.address = Utils.convertSemiColonToLineBreak(data.address); }
          if (allowUpdate('country') && (data.country || overwriteBlanks)) { payee.country = data.country; }
          if (allowUpdate('vatNo') && (data.vatNo || overwriteBlanks)) { payee.vatNo = data.vatNo; }
          if (allowUpdate('selfBillingTaxText') && (data.selfBillingTaxText || overwriteBlanks)) { payee.selfBillingTaxText = data.selfBillingTaxText; }
          if (allowUpdate('selfBillingTaxRate') && (data.selfBillingTaxRate || overwriteBlanks)) { payee.selfBillingTaxRate = data.selfBillingTaxRate; }
          if (allowUpdate('feesInvoiceTaxRate') && (data.feesInvoiceTaxRate || overwriteBlanks)) { payee.feesInvoiceTaxRate = data.feesInvoiceTaxRate; }
          if (allowUpdate('withholdingTaxRate') && (data.withholdingTaxRate || overwriteBlanks)) { payee.withholdingTaxRate = data.withholdingTaxRate; }
          if (allowUpdate('withholdingTaxWording') && (data.withholdingTaxWording || overwriteBlanks)) { payee.withholdingTaxWording = data.withholdingTaxWording; }
          if (allowUpdate('paymentEmail') && (data.paymentEmail || overwriteBlanks)) { payee.paymentEmail = data.paymentEmail; }
          if (allowUpdate('paymentCurrency') && (data.paymentCurrency || overwriteBlanks)) { payee.paymentCurrency = data.paymentCurrency; }
          if (allowUpdate('bankName') && (data.bankName || overwriteBlanks)) { payee.bankName = data.bankName; }
          if (allowUpdate('bankAddress') && (data.bankAddress || overwriteBlanks)) { payee.bankAddress = Utils.convertSemiColonToLineBreak(data.bankAddress); }
          if (allowUpdate('accountNo') && (data.accountNo || overwriteBlanks)) { payee.accountNo = data.accountNo; }
          if (allowUpdate('sortCode') && (data.sortCode || overwriteBlanks)) { payee.sortCode = data.sortCode; }
          if (allowUpdate('iban') && (data.iban || overwriteBlanks)) { payee.iban = data.iban; }
          if (allowUpdate('swiftCode') && (data.swiftCode || overwriteBlanks)) { payee.swiftCode = data.swiftCode; }
          if (allowUpdate('notes') && (data.notes || overwriteBlanks)) { payee.notes = Utils.convertSemiColonToLineBreak(data.notes); }
          if (client.features.payeeBalances && (data.payeeBalanceCurrency || overwriteBlanks)) { payee.payeeBalanceCurrency = data.payeeBalanceCurrency; }
          if (allowUpdate('payeeCategories') && ((data.payeeCategories && data.payeeCategories.length !== 0) || overwriteBlanks)) {
            // Ensure categories match setup categories in client
            payee.payeeCategories = [];
            async.each(data.payeeCategories, (category, categoryCb) => {
              if (!category || category === '') {
                // Skip if blank
                categoryCb();
              } else if (!client.payeeCategories.includes(category)) {
                // Category doesn't match list
                categoryCb(new Error(`Payee Category ${category} doesn't match list`));
              } else {
                // Add category to the array
                payee.payeeCategories.push(category);
                categoryCb();
              }
            }, (err) => {
              if (err) {
                // Return any category errors
                callback(err);
              } else {
                cb();
              }
            });
          } else {
            cb();
          }
        },
      ], () => {
        // Validates payee
        payee.validate()
          .then(() => {
            callback(null, payee);
          })
          .catch((err) => {
            callback(err);
          });
      });
    })
    // eslint-disable-next-line arrow-body-style
    .catch((err) => {
      logger.error(err);
      return callback(new Error(`Could not find client with ID ${clientId}`));
    });
};

/**
  * Checks that an object is not empty.
  *
  * @method
  * @param {object} obj - Object to check
  * @returns {boolean} objectPopulated - Set to true if the object is empty
  */
function isObjectPopulated(obj) {
  // Function checks if object has values
  let objectPopulated = false;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] !== '') {
        objectPopulated = true;
      }
    }
  }
  return objectPopulated;
}

/**
 * Finds duplicate values in an array and returns them as an array of objects.
 * Each object contains the name and the line numbers of each occurrence
 *
 * @param {string[]} values - The array of values to search
 * @returns {Array<{name: string, lines: number[]}>} An array of objects with duplicate values and their lines.
 */
function findDuplicates(values) {
  const occurrences = {};

  values.forEach((value, index) => {
    if (!occurrences[value]) {
      occurrences[value] = [];
    }
    occurrences[value].push(index + 3);
  });

  const result = Object.keys(occurrences)
    .filter((key) => occurrences[key].length > 1)
    .map((key) => ({
      name: key,
      lines: occurrences[key],
    }));

  return result;
}

/**
  * Imports multiple Payees from Excel.
  *
  * Calls callback(errors, count, importedPayees) with an array of [errors] if they occur, the [count] of payees imported and an array of the [importedPayees].
  * @method
  * @param {object[]} payees - Payees to import.
  * @param {string} clientId - ID of the client importing the contract.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {boolean} isClientAdminUser - Set to true if user is client admin, which means they can update encrypted fields and other client-admin only fields
  * @param {function(string[], number, object[])} callback - The callback that handles the response.
  */
payeeSchema.statics.importPayees = function (payees, clientId, overwriteBlanks, isClientAdminUser, callback) {
  // Takes a set of payees, and prepares import
  // Handle error if not array passed
  if (Object.prototype.toString.call(payees) !== '[object Array]') {
    callback(['Data must be an Array']);
    // Handle error if no clientId
  } else if (!clientId) {
    callback(['A Client ID must be passed']);
  } else {
    // Check for duplicate names within the file
    const duplicates = findDuplicates(payees.map(({ name }) => name));
    if (duplicates.length) {
      return callback(duplicates.map(({ name, lines }) => (`Duplicate name: ${name} - lines: ${lines.join(',')}`)));
    }

    // Ingested count for reporting back to user
    let count = 0;
    // Array for holding payees being imported
    const importedPayees = [];
    // Array of errors for reporting back to user
    const errors = [];
    // Loop through each of payees
    async.eachOfSeries(payees, (payee, index, cb) => {
      // When it's an object
      if (isObjectPopulated(payee)) {
        // Call importPayee with the data
        Payee.importPayee(payee, clientId, overwriteBlanks, isClientAdminUser, (err, importedPayee) => {
          // Handle any errors being returned
          if (err) { errors.push(`Line ${index + 3}: ${err.message}`); }
          // Payee passed validation
          if (importedPayee) {
            // Increment count
            count += 1;
            // Add to array
            importedPayees.push(importedPayee);
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
        callback(errors, count, importedPayees);
      }
    });
  }
};

/**
  * Copies the Payee to other associated clients.
  *
  * Calls callback(error, payee) with an [error] if it occurs and the [payee] object.
  * @method
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.methods.updateCopyToCatalogueClients = function (callback) {
  const Client = require('./client');
  // Functions finds clients to copy payee across to
  const payee = this;
  async.waterfall([
    function (cb) {
      // Find clients based on inheritCatalogueFrom fields
      Client.find({ 'inheritCatalogueFrom.clientId': payee.clientId }, { name: 1, inheritCatalogueFrom: 1 })
        .then((clients) => {
          cb(null, clients);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (clients, cb) {
      // When clients are found
      if (clients.length > 0) {
        // Loop through clieints
        async.eachSeries(clients, (client, clientCb) => {
          // Get specified inheritCatalogue from payee.clientId
          const clientInheritCatalogue = client.inheritCatalogueFrom.filter((client) => client.clientId === payee.clientId);
          // Check if transferPayees is switched on
          if (!clientInheritCatalogue?.[0]?.transferPayees) { return clientCb(); }

          // Call updateCopyToCatalogueByClient on payee
          payee.updateCopyToCatalogueByClient(client, clientCb);
        }, cb);
        // When no clients are found
      } else {
        cb(null, payee);
      }
    },
  ], callback);
};

/**
  * Copies the Payee data from one client to the other.
  *
  * Calls callback(error) with an [error] if it occurs.
  * @method
  * @param {object} client - The client the new Payee belongs to.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.methods.updateCopyToCatalogueByClient = function (client, callback) {
  // Function copies the payee values from one client to the other, creating if they don't exist
  const thisPayee = this;
  async.waterfall([
    function (cb) {
      // Find any previously created release
      Payee.findOne({ clientId: client._id.toString(), duplicatedFrom: thisPayee._id.toString() })
        .then((payee) => {
          cb(null, payee);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (payee, cb) {
      // Create if no release found
      if (!payee) { payee = new Payee(); }
      cb(null, payee);
    },
    function (payee, cb) {
      // Update values
      payee.copyValues(thisPayee, client._id, () => {
        cb(null, payee);
      });
    },
    function (payee, cb) {
      // Save
      payee.save()
        .then((payee) => {
          cb(null, payee);
        })
        .catch((err) => {
          thisPayee.validationErrors.push(`Failed syncing to ${client.name}: ${err.message}`);
          Payee.updateOne({ _id: thisPayee._id }, { $set: { validationErrors: thisPayee.validationErrors } })
            .then(() => {
              cb(null, payee);
            })
            .catch((err) => {
              logger.error(err);
              cb(null, payee);
            });
        });
    },
  ], callback);
};

/**
  * Copies data from one Payee to the current Payee.
  *
  * Calls callback(error) with an [error] if it occurs and the copied [payee] object.
  * @method
  * @param {object} payeeToCopy - The Payee data should be copied from.
  * @param {string} clientId - The ID of the client the Payee belongs to.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
payeeSchema.methods.copyValues = function (payeeToCopy, clientId, callback) {
  // Function copies the values from the passed payee to the this payee
  // Handle error with no payee passed
  if (!payeeToCopy) {
    return callback('Payee not found');
  }
  // Set specific values from payee
  this.clientId = clientId;
  this.name = payeeToCopy.name;
  this.alternateName = payeeToCopy.alternateName;
  this.foreignId = payeeToCopy.foreignId;
  this.supplierCode = payeeToCopy.supplierCode;
  this.contactEmail = payeeToCopy.contactEmail;
  this.address = payeeToCopy.address;
  this.country = payeeToCopy.country;
  this.vatNo = payeeToCopy.vatNo;
  this.withholdingTaxWording = payeeToCopy.withholdingTaxWording;
  this.selfBillingTaxRate = payeeToCopy.selfBillingTaxRate;
  this.selfBillingTaxText = payeeToCopy.selfBillingTaxText;
  this.feesInvoiceTaxRate = payeeToCopy.feesInvoiceTaxRate;
  this.withholdingTaxRate = payeeToCopy.withholdingTaxRate;
  this.bankName = payeeToCopy.bankName;
  this.bankAddress = payeeToCopy.bankAddress;
  this.accountNo = payeeToCopy.accountNo;
  this.sortCode = payeeToCopy.sortCode;
  this.iban = payeeToCopy.iban;
  this.swiftCode = payeeToCopy.swiftCode;
  this.notes = payeeToCopy.notes;
  // Copy payee payment details, this is already decrypted by the currrent client and will be encrypted by the new client on save.
  if (payeeToCopy.paymentProviders) { this.paymentProviders = payeeToCopy.paymentProviders; }
  if (payeeToCopy.paymentCurrency) { this.paymentCurrency = payeeToCopy.paymentCurrency; }
  // Store which payee this was duplicated from
  this.duplicatedFrom = payeeToCopy._id;
  callback(null, this);
};

payeeSchema.methods.updatePayeePaymentsStatus = async function () {
  const payee = this;
  const { payable, reason } = await payee.isPayeePayable();
  // Get payments to update
  const payments = await Payment.find({ clientId: payee.clientId, payeeId: payee._id.toString(), status: { $in: ['Missing Info', 'Pending'] } });
  // Update payments
  async.eachLimit(payments, 10, async (payment) => {
    const warnings = await PaymentController.generateWarning({ payment, payee });
    const update = { status: payable ? 'Pending' : 'Missing Info', missingInfoReason: reason, warnings };
    // Use findByIdAndUpdate instead of save to avoid save loop.
    await Payment.findByIdAndUpdate(payment._id, update);
  });
};

// Keep any eye on the deleteOne hooks, query hooks do not have the model to use as this.
// It would error if query is set to true.
payeeSchema.pre('deleteOne', { query: false, document: true }, function (next) {
  const Contract = require('./contract');
  const payee = this;
  let errors = [];
  async.waterfall([
    // Check if there are any contracts associated with payee
    (cb) => {
      Contract.find({ clientId: payee.clientId, 'payees.payeeId': payee._id.toString() })
        .then((contracts) => {
          if (contracts && contracts.length > 0) {
            // Get contract lines
            errors = errors.concat(contracts.map((contract) => ({ name: contract.name, link: `contracts/${contract._id}/edit`, reason: 'Attached to the contract' })));
            // Get unique values
            errors = _.uniqBy(errors, 'link');
          }
          cb();
        })
        .catch((err) => {
          logger.error(`Payee Deletion Errored on ${payee._id}`);
          logger.error(err);
          cb(err);
        });
    },
    (cb) => {
      // Check if there are any payments associated with payee
      Payment.countDocuments({ clientId: payee.clientId, payeeId: payee._id.toString() })
        .then((payeePayments) => {
          if (payeePayments) {
            errors.push({ reason: 'Payee has payments associated with it.' });
          }
          cb();
        })
        .catch((err) => {
          logger.error(`Payee Deletion Errored on ${payee._id}`);
          logger.error(err);
          cb(err);
        });
    },
  ], (err) => {
    if (err) {
      next(err);
    } else if (errors.length > 0) {
      next(new Error(JSON.stringify(errors)));
    } else {
      next();
    }
  });
});

payeeSchema.methods.getTipaltiIframeAuthentication = async function () {
  const payee = this;
  // Get payer name and api key from the client
  const { paymentProviders } = await Client.findById(payee.clientId, 'paymentProviders');
  const payerName = paymentProviders?.tipalti?.payerName;
  const apiKey = paymentProviders?.tipalti?.apiKey;
  // Get Tipalti authentication url
  const url = Tipalti.getIframeAuthentication(payee, payerName, apiKey);
  return url;
};

payeeSchema.methods.getTipaltiPayeePayableStatus = async function (amount) {
  const payee = this;
  // Get payer name and api key from the client
  const { paymentProviders } = await Client.findById(payee.clientId, 'paymentProviders');
  const payerName = paymentProviders?.tipalti?.payerName;
  const apiKey = paymentProviders?.tipalti?.apiKey;
  const tipaltiPayee = { tipaltiPayeeId: payee.paymentProviders?.tipalti?.payeeId, _id: payee._id };
  // return not payable if no api key or payer name
  if (!apiKey || !payerName) { return { payable: false, reason: 'A Tipalti Payer Name and Api Key are required to enable the payment provider.' }; }
  // Get Tipalti payable status
  const { payable, reason } = await Tipalti.getPayeePayableStatus(tipaltiPayee, payerName, apiKey, amount).catch(logger.error);
  // If the status or reason aren't the same as the ones saved agaisnt he payee, update the payee.
  if (payee.paymentProviders?.tipalti?.payeePayable !== payable || payee.paymentProviders?.tipalti?.payeeNotPayableReason !== reason) {
    _.set(payee, 'paymentProviders.tipalti.payeePayable', payable);
    _.set(payee, 'paymentProviders.tipalti.payeeNotPayableReason', reason);
    await payee.save();
  }
  // return status and reason to be used elsewhere
  return { payable, reason };
};

payeeSchema.methods.getWisePayeePayableStatus = async function (paymentProviders, client) {
  const payee = this;
  const { apiKey } = client.paymentProviders.wise;
  const errors = [];

  if (!payee.paymentProviders?.wise?.recipientId) {
    const payable = false;
    const reason = 'The Payee isn\'t linked to a Wise recipient';
    return { payable, reason };
  }

  // when the recipient is selected from the list of Wise recipients
  if (payee.paymentProviders.wise.recipientId) {
    const recipient = await Wise.getSingleRecipient(payee.paymentProviders.wise.recipientId, apiKey);
    const requirements = await client.getWisePaymentRequirements(recipient.currency);
    const paymentMethodRequirements = requirements.find((requirement) => requirement.type === recipient.type);
    // Check against Wise requirements for the Payee's payment method
    paymentMethodRequirements?.fields?.forEach((requirementGroup) => {
      requirementGroup?.group?.forEach((field) => {
        const recipientField = _.get(recipient.details, field.key);
        const country = _.get(recipient.details, 'address.country');

        if (field?.required && !recipientField && (field.key !== 'address.state' || (field.key === 'address.state' && country === 'US'))) {
          errors.push(`${field.name} is required`);
        }

        if (field?.validationRegexp && recipientField) {
          const regex = new RegExp(field.validationRegexp);
          if (!regex.test(recipientField)) {
            errors.push(`Invalid value for ${field.name}`);
          }
        }
      });
    });
  }

  const payable = errors.length === 0;
  const reason = errors.join(', ');

  return { payable, reason };
};

payeeSchema.methods.getCurvePayPayeePayableStatus = async function (paymentProviders) {
  const payee = this;

  const apiKey = paymentProviders?.curvePay?.apiKey;
  if (!apiKey) { return { payable: false, reason: 'A CurvePay API Key is required to enable the payment provider.' }; }

  try {
    const { payable, reason } = await CurvePay.getPayeePayableStatus(payee, apiKey).catch(logger.error);
    return { payable, reason };
  } catch (error) {
    logger.error(error);
    return { payable: false, reason: 'Error fetching payable status from Curve Pay.' };
  }
};

payeeSchema.methods.isPayeePayable = async function (amount) {
  const Client = require('./client');
  const payee = this;
  logger.debug('Getting the Payee\'s payable status');
  // Get Client payment provider
  const client = await Client.findById(payee.clientId);
  const { paymentProviders } = client;
  // Tipalti Payable Status
  if (paymentProviders?.selectedPaymentProvider === 'Tipalti') {
    const { payable, reason } = await payee.getTipaltiPayeePayableStatus(amount);
    return { payable, reason };
  }

  // Wise Payable Status
  if (paymentProviders?.selectedPaymentProvider === 'Wise') {
    const { payable, reason } = await payee.getWisePayeePayableStatus(paymentProviders, client);
    return { payable, reason };
  }

  // Curve Pay, return true as the validation is done on the payments API
  if (paymentProviders?.selectedPaymentProvider === 'Curve Pay') {
    const { payable, reason } = await payee.getCurvePayPayeePayableStatus(paymentProviders);
    return { payable, reason };
  }

  // Standard CSV
  if (!(payee.accountNo && payee.sortCode) && !payee.iban) {
    const payable = false;
    const reason = 'An IBAN or Account Number and Sort Code are required against the payee';
    return { payable, reason };
  }

  const payable = true; const reason = null;
  return { payable, reason };
};

/**
 * Validates the Payee and reports any errors via 'validationErrors'.
 *
 * Sets the state of the model via 'valid'
 *
 * @method
 * @param {ObjectId} excludeContractId - Payee has been removed from this contract so exclude from filter
 */
payeeSchema.methods.checkValidationErrors = function (excludeContractId) {
  return new Promise((resolve, reject) => {
    const Contract = require('./contract');
    const Client = require('./client');
    const payee = this;
    const filter = excludeContractId ? { clientId: payee.clientId, 'payees.payeeId': payee._id.toString(), _id: { $ne: excludeContractId } } : { clientId: payee.clientId, 'payees.payeeId': payee._id.toString() };
    // Reset payee validations errors array
    payee.validationErrors = [];
    Contract.find(filter, { name: 1, selfBilling: 1, deductWithholding: 1, feesInvoice: 1, payeeBalanceCondition: 1 })
      .then(async (contracts) => {
        if (!contracts?.length > 0) {
          payee.validationErrors.push('Payee should be linked to at least one Contract');
        } else {
          if (payee.selfBillingTaxRate && payee.selfBillingTaxRate > 0) {
            let contractSelfBillingActive = true;
            contracts?.forEach((contract) => {
              if (!contract.selfBilling && contract.payeeBalanceCondition === 'Never') {
                contractSelfBillingActive = false;
              }
            });
            if (!contractSelfBillingActive) {
              payee.validationErrors.push('When Self-Billing Tax Rate provided: Self Billing should be enabled on all associated Contracts');
            }
          }
          if (payee.withholdingTaxRate && payee.withholdingTaxRate > 0) {
            let contractwithholdingTaxRateActive = true;
            contracts?.forEach((contract) => {
              if (!contract.deductWithholding && contract.payeeBalanceCondition === 'Never') {
                contractwithholdingTaxRateActive = false;
              }
            });
            if (!contractwithholdingTaxRateActive) {
              payee.validationErrors.push('When Withholding Tax Rate provided: Deduct Withholding Tax should be enabled on all associated Contracts');
            }
          }
          const client = await Client.findById(payee.clientId, { statementDesign: 1, clientType: 1, features: 1 });
          if (client) {
          // TODO we may remove this option..
            if (client.features?.payeeBalances && !payee.payeeBalanceCurrency) {
              payee.validationErrors.push('When Payee Balances is enabled: Currency should be set');
            }

            if (client.clientType !== 'Publisher') {
              if (payee.feesInvoiceTaxRate && payee.feesInvoiceTaxRate > 0) {
                let contractfeesInvoiceTaxRateActive = true;
                contracts?.forEach((contract) => {
                  if (!contract.feesInvoice && contract.payeeBalanceCondition === 'Never') {
                    contractfeesInvoiceTaxRateActive = false;
                  }
                });
                if (!contractfeesInvoiceTaxRateActive) {
                  payee.validationErrors.push('When Fees Invoice Tax Rate provided: Generate Fees Invoice should be enabled on all associated Contracts');
                }
              }
              if (payee.feesInvoiceTaxRate && payee.feesInvoiceTaxRate > 0 && client.statementDesign !== 'Distribution' && client.clientType !== 'Distributor') {
                payee.validationErrors.push('When Fees Invoice Tax Rate provided: Client Statement Design should be set to Distribution');
              }
            }
          }
        }
        payee.valid = payee?.validationErrors?.length === 0;
        resolve();
      })
      .catch((err) => {
        if (err) {
          logger.error(err);
          reject(err);
        }
      });
  });
};

/**
 * Validates the Payee and reports error if no user attached.
 *
 * Sets the state of the model via 'valid'
 *
 * @method
 * @param {boolean} update - should we also update the payee.
 *
 */
payeeSchema.methods.checkValidationUser = function (update) {
  return new Promise((resolve, reject) => {
    const User = require('./user');
    const payee = this;
    User.countDocuments({ payeeIds: payee._id.toString() })
      .then((count) => {
        if (!count > 0) {
          payee.validationErrors.push('A User needs to be assigned in order for someone to have access to this Payee and view its statements. It is ok to wait with creating Users until you are ready to send statements');
        }
        payee.valid = payee?.validationErrors?.length === 0;
        if (update) {
          // only update validationErrors and valid
          Payee.findByIdAndUpdate(payee._id, { $set: { validationErrors: payee.validationErrors, valid: payee.valid } })
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        } else {
          resolve();
        }
      })
      .catch((err) => {
        logger.error(err);
        reject(err);
      });
  });
};

payeeSchema.pre('save', async function (next) {
  const Client = require('./client');
  const payee = this;
  // We should limit tax rate to no more than 3 whole digits.
  if (Utils.isNotValidTaxRate(payee.selfBillingTaxRate, payee.feesInvoiceTaxRate, payee.withholdingTaxRate)) {
    return next(new Error('Number is too long, please limit to no more than 3 digits.'));
  }

  // Set Tipalti ID if null
  if (!payee.paymentProviders?.tipalti?.payeeId) { _.set(payee, 'paymentProviders.tipalti.payeeId', payee._id.toString()); }
  // Validate payee - Use await to get our valid validateErrors ducks in a row before we complete the save.
  await payee.checkValidationErrors();
  await payee.checkValidationUser();
  // Validate name is unique under client
  const count = await Payee.countDocuments({ _id: { $ne: payee._id }, clientId: payee.clientId, name: payee.name });

  // If Payee Balances is enabled, validate the currency
  const { features, clientType } = await Client.findById(payee.clientId, 'features clientType').catch(logger.error);

  // Payee Validation when payeeBalances is enabled
  if (features?.payeeBalances) {
    // Distribution will set selfBilling at Contract Level
    if (clientType === 'Distributor') {
      payee.selfBilling = false;
      payee.autoPayment = false;
    }

    if (!payee.payeeBalanceCurrency) return next(new Error('Payee Balance Currency is required '));

    // Get previous data
    const foundPayee = await Payee.findById(payee._id).select('_id name payeeBalanceCurrency').catch(logger.error);

    if (foundPayee) {
      const transactionCount = await PayeeTransaction.countDocuments({ payeeId: payee._id }).catch(logger.error);

      // We cannot change the payee balance currency if there are already transactions for this payee, this is to keep the balance consistent with ONE currency
      if (foundPayee.payeeBalanceCurrency !== payee.payeeBalanceCurrency && transactionCount) {
        return next(new Error('Payee Balance Currency cannot be changed when there are already transactions for this payee'));
      }
    }
  }

  // Return error if count is greater than 0
  if (count > 0) {
    return next(new Error('Name is required to be unique'));
    // Else continue with saving
  }
  next();
});

// Encryption plugin has to be inserted after all .pre('save') hooks and before all .post('save') hooks
payeeSchema.plugin(encryption.encryptionPlugin, {
  encryptedFields: configShared.encryptedFields.payee,
  Client,
});

payeeSchema.post('save', function (saved, next) {
  const payee = this;
  async.waterfall([
    (cb) => {
      // Handle copy to after save
      payee.updateCopyToCatalogueClients(cb);
    },
    async () => {
      // No need for await here as we don't depend on the result and this makes the saving process slower
      payee.updatePayeePaymentsStatus();
    },
  ], next);
});

payeeSchema.post('save', (err, saved, next) => {
  // Handle error messages
  if (err) {
    logger.error(err);
    const messages = ModelErrors.map(err.message);
    next(new Error(messages));
    // If no errors, continue with save
  } else {
    next();
  }
});

/**
  * Formats wise payment fields to remove or add dots to them
  *
  * Calls callback(error) with an [error] if it occurs and the copied [payee] object.
  * @method
  * @param {object} paymentFields - The Payee wise fields.
  * @param {boolean} replaceDots - true to remove dots, false add dots.
  * @return {object} newPaymentFields - the formatted object
  */
payeeSchema.statics.escapeDotsFromWiseFields = function (paymentFields, replaceDots) {
  // if replaceDots is true, replace '.' with '_____'. If false, replace '_____' with '.'
  if (paymentFields) {
    const newPaymentFields = {};
    for (const key in paymentFields) {
      if (key) {
        const keyWithoutDot = replaceDots ? key.replace(/\./g, '_____') : key.replace(/_____/g, '.');
        newPaymentFields[keyWithoutDot] = paymentFields[key];
      }
    }

    return newPaymentFields;
  }
};

const Payee = mongoose.model(name, payeeSchema);

module.exports = Payee;
