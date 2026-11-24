/* eslint-disable no-await-in-loop */
/**
 * @module contract
 */
const _ = require('lodash');
const { logger, fileManager, createZip, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, Utils } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const { Contract: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const modelHistory = require('../libs/modelHistory');
const ModelErrors = require('../libs/modelErrors');
const Cost = require('./cost');
const Payee = require('./payee');
const Statement = require('./statement');
const Transaction = require('./transaction');
const TerritoryGroup = require('./territoryGroup');
const Notification = require('./notification');
const ContractCsv = require('../libs/contractCsv');
const Client = require('./client');
const ContractController = require('../controllers/contracts/contract');

const contractSchema = schema;

contractSchema.plugin(modelHistory, { mongoose, name: 'contractPatches', useArchive: true, removePatches: false });
contractSchema.plugin(mongoosePaginate);

contractSchema.post('init', (contract) => {
  if (contract.files) {
    async.map(contract.files, (file, cb) => {
      if (file.key) {
        fileManager.publicS3Link(file.key, (err, publicLink) => {
          file.publicLink = publicLink;
          cb(err, file);
        });
      }
    }, (err, newFiles) => { contract.files = newFiles; });
  }
});

/**
  * Gets the Releases, Tracks and Works associated with the Contract.
  *
  * Attaches the Releases to contract.releases
  *
  * Attaches the Tracks to contract.tracks
  *
  * Attaches the Works to contract.works
  *
  * Calls callback() when done getting the associated catalogue.
  * @method
  * @param {function()} callback - The callback that handles the response.
  */

contractSchema.methods.getAssociatedCatalogueItems = function (callback) {
  const Release = require('./release');
  const Track = require('./track');
  const Work = require('./work');
  const contract = this;
  async.parallel([
    function (cb) {
      Release.find(
        { clientId: contract.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] },
        { title: 1, artist: 1, catNo: 1, barcode: 1, format: 1, createdAt: 1 },
      )
        .limit(100)
        .then((releases) => {
          contract.releases = releases;
          cb();
        })
        .catch((err) => {
          cb();
        });
    },
    function (cb) {
      Track.find(
        { clientId: contract.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] },
        { title: 1, artist: 1, isrc: 1, createdAt: 1 },
      )
        .limit(100)
        .then((tracks) => {
          contract.tracks = tracks;
          cb();
        })
        .catch((err) => {
          cb();
        });
    },
    function (cb) {
      Work.find(
        { clientId: contract.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { costsRights: { $elemMatch: { contractId: contract._id.toString() } } }] },
        { title: 1, composets: 1, identifier: 1, iswc: 1, createdAt: 1 },
      )
        .limit(100)
        .then((works) => {
          contract.works = works;
          cb();
        })
        .catch((err) => {
          cb();
        });
    },
  ], () => {
    callback();
  });
};
/**
  * Gets the Costs Release IDs associated with the Contract.
  *
  * Calls callback(err, releases) with an [err] or message string if an error occurs and a [releases] array containing the associated Release IDs.
  * @method
  * @param {function(string, string[])} callback - The callback that handles the response.
  */
contractSchema.methods.getAssociatedCostsReleaseIds = function (callback) {
  const Release = require('./release');
  const contract = this;
  Release.find({ clientId: contract.clientId, costsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { _id: 1 })
    .limit(100)
    .then((releases) => {
      callback(null, releases);
    })
    .catch((err) => {
      callback(err);
    });
};

/**
  * Gets the Costs Track IDs associated with the Contract.
  *
  * Calls callback(err, tracks) with an [err] or message string if an error occurs and a [tracks] array containing the associated Track IDs.
  * @method
  * @param {function(string, string[])} callback - The callback that handles the response.
  */
contractSchema.methods.getAssociatedCostsTrackIds = function (callback) {
  const Track = require('./track');
  const contract = this;
  Track.find(
    { clientId: contract.clientId, costsRights: { $elemMatch: { contractId: contract._id.toString() } } },
    { _id: 1 },
  )
    .limit(100)
    .then((tracks) => {
      callback(null, tracks);
    })
    .catch((err) => {
      callback(err, null);
    });
};

/**
  * Gets the Costs associated with the Contract.
  *
  * Attaches the Costs to contract.costs
  *
  * Calls callback() when done getting the associated costs.
  * @method
  * @param {function()} callback - The callback that handles the response.
  */
contractSchema.methods.getAssociatedCosts = function (callback) {
  const contract = this;
  Cost.find({ clientId: contract.clientId, contractIds: contract._id })
    .then((costs) => {
      contract.costs = costs;
      callback();
    })
    .catch((err) => {
      callback();
    });
};

/**
  * Gets the Transactions associated with the Contract.
  *
  * Attaches the Transactions to contract.transactions
  *
  * Calls callback(err) with an [err] or message string if an error occurs.
  * @method
  * @param {date} date - Date prior to which transactions should be returned.
  * @param {function(string)} callback - The callback that handles the response.
  */
contractSchema.methods.getAssociatedTransactions = function (date, callback) {
  const contract = this;
  let balance = contract.openingBalance;
  contract.transactions = [];
  const filter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: date } };
  if (contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible') {
    // Remove Reserves if a profit share
    filter.isReserveRelease = { $ne: true };
    filter.isReserveWithholding = { $ne: true };
  }
  Transaction.find(filter, null, { sort: { date: 1 } })
    .lean()
    .then((transactions) => {
      async.eachSeries(transactions, (transaction, cb) => {
        transaction.balance = balance + transaction.amount;
        contract.transactions.push(transaction);
        balance += transaction.amount;
        cb();
      }, callback);
    })
    .catch((err) => {
      logger.error(`Error finding transaction in getAssociatedTransactions: ${err}`);
      callback(err);
    });
};

/**
  * Gets the future Transactions associated with the Contract.
  *
  * Attaches the Transactions to contract.transactions
  *
  * Calls callback(err) with an [err] or message string if an error occurs.
  * @method
  * @param {date} date - Date after which transactions should be returned.
  * @param {function(string)} callback - The callback that handles the response.
  */

// TODO add the date to the filter instead.
contractSchema.methods.getFutureTransactions = function (date, callback) {
  const contract = this;
  let balance = contract.openingBalance;
  contract.transactions = [];
  const filter = { clientId: contract.clientId, contractId: contract._id };
  if (contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible') {
    // Remove Reserves if a profit share
    filter.isReserveRelease = { $ne: true };
    filter.isReserveWithholding = { $ne: true };
  }
  Transaction.find(filter, null, { sort: { date: 1 } })
    .lean()
    .then((transactions) => {
      async.eachSeries(transactions, (transaction, cb) => {
        transaction.balance = balance + transaction.amount;
        if (transaction.date > date) {
          contract.transactions.push(transaction);
        }
        balance += transaction.amount;
        cb();
      }, callback);
    })
    .catch((err) => {
      logger.error(`Error finding transaction in getFutureTransactions: ${err}`);
      callback(err);
    });
};

/**
  * Gets the Contract balance at a certain date.
  *
  * Calls callback(err, balance) with an [err] or message string if an error occurs and the contract [balance].
  * @method
  * @param {date} date - Date prior to which transactions should be included.
  * @param {object} options - Options object to filter what transaction should be included.
  * @param {boolean} options.excludeAdvance - Set to true if 'Advance' and 'Advance Recoupment' transactions are to be ignored.
  * @param {boolean} options.excludeReserves - Set to true if 'isReserveWithholding' and 'isReserveRelease' transactions are to be ignored.
  * @param {string} options.excludeStatementPayments - Transaction Statement ID to exlude.
  * @param {function(string, number)} callback - The callback that handles the response.
  */
contractSchema.methods.balanceAtDate = function (date, options, callback) {
  const contract = this;
  let balance = contract.openingBalance || 0;
  if (!callback) { callback = options; }
  // Set time to end of previous day to catch all transactions from that day
  const endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
  const filter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate } };
  if (options?.excludeAdvance) { filter.type = { $nin: ['Advance', 'Advance Recoupment'] }; }
  if (options?.getAdvanceRemaining) { filter.type = { $in: ['Advance', 'Advance Recoupment'] }; }
  if (options?.excludeReserves) {
    filter.isReserveWithholding = { $ne: true };
    filter.isReserveRelease = { $ne: true };
  }
  Transaction.find(filter, null, { sort: { date: 1 } })
    .lean()
    .then((transactions) => {
      // When calculating the remaining advance for profit share we need to clear out the opening balance
      if (options?.getAdvanceRemaining) { balance = 0; }

      async.eachSeries(transactions, (transaction, cb) => {
        if (moment.utc(transaction.date).format() <= endOfDate) {
          if (!options.excludeStatementPayments || !(options.excludeStatementPayments === transaction.statementId && transaction.type === 'Payment')) {
            balance += transaction.amount;
          }
        }
        cb();
      }, (err) => {
        callback(err, balance);
      });
    })
    .catch((err) => {
      logger.error(`Error finding transaction in balanceAtDate: ${err}`);
      callback(err);
    });
};

/**
  * Imports Aliases.
  *
  * Calls callback(errors, count) with an array of [errors] if errors occur and the [count] of aliases successfully imported.
  * @method
  * @param {object[]} data - Data to import.
  * @param {string} data.identifier - Contract name.
  * @param {string} data.alias - Alias to add to the contract.
  * @param {string} clientId - ID of the Client importing the Aliases.
  * @param {function(string[], number)} callback - The callback that handles the response.
  */
contractSchema.statics.importAliases = function (data, curveUser, callback) {
  const { clientId, id } = curveUser;
  let count = 0;
  const errors = [];
  async.eachSeries(data, (line, cb) => {
    Contract.findOne({ clientId, name: line.identifier })
      .then((contract) => {
        if (contract && line.alias && line.alias !== '') {
          const alias = String(line.alias).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          contract.aliases.push(alias);
          // Only unique aliases
          contract.aliases = contract.aliases.filter((value, index, self) => self.indexOf(value) === index);
          count += 1;
          contract.lastModifiedBy = id;
          contract.save()
            .then(() => {
              cb();
            })
            .catch((err) => {
              errors.push(`Line ${data.indexOf(line) + 3}: ${err.message}`);
              cb();
            });
        } else {
          errors.push(`Line ${data.indexOf(line) + 3}: Could not find contract with name ${line.identifier}`);
          cb();
        }
      })
      .catch((err) => {
        errors.push(`Line ${data.indexOf(line) + 3}: Could not find contract with name ${line.identifier}`);
        cb();
      });
  }, (err) => {
    if (err) {
      callback([err], count);
    } else {
      callback(errors, count);
    }
  });
};

/**
  * Shifts the populated cross contractIds to a new field to keep the original contractId fields unmodified.
  *
  * @method
  * @param {object} contract - The contract to update.
  */
contractSchema.statics.formatPopulatedRights = async function (contract) {
  // Populate fields
  const populatedContract = await Contract.populate(
    contract,
    [
      { path: 'crossContracts.contractId', model: 'Contract', select: 'name' },
      { path: 'autoPaymentConditions.contractId', model: 'Contract', select: 'name' },
      { path: 'payees.payeeId', model: 'Payee', select: 'name' },
      { path: 'createdBy', select: 'email' },
      { path: 'lastModifiedBy', select: 'email' },
    ],
  );

  contract = JSON.parse(JSON.stringify(populatedContract));

  if (contract.crossContracts) {
    contract.crossContracts.forEach((crossing) => {
      if (crossing && crossing.contractId) {
        crossing.contract = crossing.contractId;
        crossing.contractId = crossing.contractId._id.toString();
      }
    });
  }
  if (contract.autoPaymentConditions) {
    contract.autoPaymentConditions.forEach((condition) => {
      if (condition && condition.contractId) {
        condition.contract = condition.contractId;
        condition.contractId = condition.contractId._id.toString();
      }
    });
  }

  if (contract.payees?.length) {
    contract.payees.forEach((payee) => {
      payee.payee = payee.payeeId;
      payee.payeeId = payee.payeeId._id.toString();
    });
  }

  return contract;
};

/**
  * Sends contracts export.
  *
  * @method
  * @param {object} filter - Filter for Contract.find().
  * @param {string} contractType - Contract type.
  * @param {string} clientType - Client type.
  * @param {string} curveUser - User sending the export.
  */
contractSchema.statics.sendExport = function (filter, contractType, clientType, curveUser) {
  const Client = require('./client');
  let client;
  try {
    logger.info('Sending Contract Export');
    async.waterfall([
      function (cb) {
        Contract.countDocuments(filter)
          .then((count) => {
            cb(null, count);
          })
          .catch((err) => {
            cb(err);
          });
      },
      function (count, cb) {
        Client.findById(curveUser.clientId)
          .then((foundClient) => {
            client = foundClient;
            const { paymentTier } = client;

            if (count < 1000) {
              logger.debug(`Contract Export: ${curveUser.clientId} - Creating XLSX Export`);
              Contract.createXlsxExport(filter, curveUser.clientId, paymentTier, clientType, contractType, cb);
            } else {
              logger.debug(`Contract Export: ${curveUser.clientId} - Creating CSV Export`);
              Contract.createCsvExport(filter, curveUser.clientId, paymentTier, clientType, contractType, cb);
            }
          })
          .catch((err) => {
            logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
            cb(err);
          });
      },
      function (filePath, cb) {
        fileManager.uploadToS3(`exports/${client.name} Contract Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
      },
      function (key, cb) {
        fileManager.publicLink24Hours(key, cb);
      },
      function (link, cb) {
        const generateOptions = {
          identifier: 'exportDownload',
          curveUser,
          client,
          subject: `Your Contracts Export for ${client.name} is Ready to Download`,
          link,
        };
        Notification.generate('Contracts Export Ready', `Your Contracts Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
          cb(err);
        });
      },
    ], (err) => {
      if (err) {
        logger.error(err);
        // Return error via email
        const generateOptions = {
          identifier: 'exportError',
          curveUser,
          client,
          subject: 'Your Contract Export Has Errored',
          error: err.message,
        };
        Notification.generate('Your Contract Export Has Errored', err.message, null, curveUser, generateOptions);
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
          subject: 'Your Contract Export Has Errored',
          error: 'Your contract export has errored. Please try again, or contact support',
        };
        Notification.generate('Your Contract Export Has Errored', 'Your contract export has errored. Please try again, or contact support', null, curveUser, generateOptions);
      })
      .catch((err) => {
        logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
      });
  }
};

/**
  * Checks and setups contract csv export.
  *
  * Calls callback(err, filePath) with an [err] if an error occurs and the string for the filePath
  * @method
  * @param {object} filter - Contract find filter.
  * @param {string} clientId - ID of the client exporting the contracts.
  * @param {string} paymentTier - client paymentTier Lite or Pro
  * @param {string} clientType - Type of client, Publisher, Label etc..
  * @param {string} contractType - Type of Contract, Mechanical or Artist
  * @param {function(string, string)} callback - The callback that handles the response.
  */
contractSchema.statics.createCsvExport = function (filter, clientId, paymentTier, clientType, contractType, callback) {
  if (clientType === 'Publisher') {
    logger.debug('Creating Publishing Contract CSV Export');
    ContractCsv.publishingContratsForCsv(filter, clientId, paymentTier, callback);
  } else if (contractType === 'Mechanical') {
    logger.debug('Creating Mechanical Contract CSV Export');
    ContractCsv.mechanicalContratsForCsv(filter, clientId, callback);
  } else {
    logger.debug('Creating Label Contract CSV Export');
    ContractCsv.labelContractsForCsv(filter, clientId, paymentTier, callback);
  }
};

/**
  * Checks and setups contract workbook export.
  *
  * Calls callback(err, filePath) with an [err] if an error occurs and the string for the filePath
  * @method
  * @param {object} filter - Contract find filter.
  * @param {string} clientId - ID of the client exporting the contracts.
  * @param {string} paymentTier - client paymentTier Lite or Pro
  * @param {string} clientType - Type of client, Publisher, Label etc..
  * @param {string} contractType - Type of Contract, Mechanical or Artist
  * @param {function(string, string)} callback - The callback that handles the response.
  */
contractSchema.statics.createXlsxExport = function (filter, clientId, paymentTier, clientType, contractType, callback) {
  const Client = require('./client');
  async.waterfall([
    (cb) => {
      Contract.find(filter)
        .then((contracts) => {
          cb(null, contracts);
        })
        .catch((err) => {
          cb(err);
        });
    },
    (contracts, cb) => {
      if (clientType === 'Publisher') {
        logger.debug('Creating Publishing Contract XLSX Export');
        Contract.multiplePublisherContractsForXlsx(contracts, clientId, paymentTier, cb);
      } else if (contractType === 'Mechanical') {
        logger.debug('Creating Mechanical Contract XLSX Export');
        Contract.multipleMechanicalContractsForXlsx(contracts, clientId, cb);
      } else {
        logger.debug('Creating Label Contract XLSX Export');
        Contract.multipleContractsForXlsx(contracts, clientId, paymentTier, cb);
      }
    },
    (data, cb) => {
      if (contractType === 'Mechanical') {
        Exports.getTemplate({ Client, templateName: 'mechanicalContract', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      } else {
        Exports.getTemplate({ Client, templateName: 'contract', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      }
    },
  ], callback);
};

const formatContractTermDateDateForExport = ({ date, dateFormat }) => {
  try {
    const formattedDate = moment(date).format(dateFormat);
    return formattedDate;
  } catch (error) {
    return date;
  }
};
/**
  * Exports Standard contracts.
  *
  * Calls callback(err, data) with an [err] if an error occurs and the contracts export [data] for the excel template.
  * @method
  * @param {object[]} contracts - Contracts to export.
  * @param {string} clientId - ID of the client exporting the contracts.
  * @param {function(string, object[])} callback - The callback that handles the response.
  */
contractSchema.statics.multipleContractsForXlsx = function (contracts, clientId, paymentTier, callback) {
  const ContractTermGroup = require('./contractTermGroup');
  const Client = require('./client');

  Client.findById(clientId, 'features dateFormat')
    .then((client) => {
      try {
        if (contracts instanceof Array) {
          const convertedContracts = [];
          const convertedSales = [];
          const convertedDeductions = [];
          const convertedMechanicals = [];
          const convertedWithholdingTax = [];
          const convertedCosts = [];
          const convertedReserves = [];
          const convertedCrossContracts = [];
          const convertedAutoPayments = [];
          const convertedEscalationTrackers = [];
          const convertedEscalationEquivalents = [];
          const territoryGroupMappings = {};
          const contractTermMappings = {};
          const payees = [];

          async.waterfall([
            function (waterfallCb) {
              TerritoryGroup.find({ clientId }, { name: 1 })
                .then((territoryGroups) => {
                  territoryGroups.forEach((group) => { territoryGroupMappings[group._id.toString()] = group.name; });
                  waterfallCb();
                })
                .catch((err) => {
                  waterfallCb(err);
                });
            },
            function (waterfallCb) {
              ContractTermGroup.find({ clientId }, { name: 1, type: 1 })
                .then((contractTermGroups) => {
                  contractTermGroups.forEach((contractTermGroup) => {
                    contractTermMappings[contractTermGroup.type] = contractTermMappings[contractTermGroup.type] || {};
                    contractTermMappings[contractTermGroup.type][contractTermGroup._id.toString()] = contractTermGroup.name;
                  });
                  waterfallCb();
                })
                .catch((err) => {
                  waterfallCb(err);
                });
            },
            function (waterfallCb) {
              // get date format from client settings
              const dateFormat = client.dateFormat?.toUpperCase() || '';
              async.each(contracts, (contract, contractCb) => {
                if (contract) {
                  async.parallel([
                    function (cb) {
                      async.eachSeries(contract.salesTerms, (sale, innerCb) => {
                        if (sale) {
                          sale.territory = territoryGroupMappings[sale.territory] ? territoryGroupMappings[sale.territory] : sale.territory;
                          sale.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][sale.channel] ? contractTermMappings['Distribution Channel'][sale.channel] : sale.channel;
                          sale.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[sale.configuration] ? contractTermMappings.Configuration[sale.configuration] : sale.configuration;
                          sale.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][sale.priceCategory] ? contractTermMappings['Price Category'][sale.priceCategory] : sale.priceCategory;
                          sale.source = contractTermMappings.Source && contractTermMappings.Source[sale.source] ? contractTermMappings.Source[sale.source] : sale.source;
                          const escalationTrackersJoined = sale.escalationTrackers && sale.escalationTrackers.length > 0 ? sale.escalationTrackers.join(';') : null;
                          const proSalesData = [
                            contract.name, sale.catType, sale.catalogueGroup, sale.territory, sale.channel, sale.configuration, sale.priceCategory,
                            sale.source, escalationTrackersJoined, sale.type, sale.rate, sale.multiplier, sale.reductionRate, sale.unitRate, sale.reserve,
                          ];
                          // Add escalations to sales terms
                          if (!sale.escalations?.length) sale.escalations = [];
                          for (const escalation of sale.escalations) {
                            const condition = escalation.conditions?.[0] || {};
                            proSalesData.push(condition.escalationTracker || '');
                            proSalesData.push(condition.thresholdType || '');
                            proSalesData.push(condition.when || '');
                            proSalesData.push(['Sale Date', 'Reporting Date'].includes(condition.escalationTracker) ? formatContractTermDateDateForExport({ date: condition.threshold, dateFormat }) : condition.threshold);
                            proSalesData.push(escalation.type || '');
                            proSalesData.push(escalation.unitRate || '');
                            proSalesData.push(escalation.rate || '');
                            proSalesData.push(escalation.multiplier || '');
                            proSalesData.push(escalation.reductionRate || '');
                            proSalesData.push(escalation.reserve || '');
                          }
                          const liteSalesData = [
                            contract.name, sale.catType, sale.catalogueGroup, sale.territory, sale.channel, sale.configuration, sale.priceCategory,
                            sale.source, sale.type, sale.rate, sale.unitRate, sale.reserve,
                          ];
                          convertedSales.push(paymentTier === 'Lite' ? liteSalesData : proSalesData);
                        }
                        innerCb();
                      }, cb);
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.deductionsTerms, (deduction, innerCb) => {
                          if (deduction) {
                            deduction.territory = territoryGroupMappings[deduction.territory] ? territoryGroupMappings[deduction.territory] : deduction.territory;
                            deduction.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][deduction.channel] ? contractTermMappings['Distribution Channel'][deduction.channel] : deduction.channel;
                            deduction.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[deduction.configuration] ? contractTermMappings.Configuration[deduction.configuration] : deduction.configuration;
                            deduction.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][deduction.priceCategory] ? contractTermMappings['Price Category'][deduction.priceCategory] : deduction.priceCategory;
                            deduction.source = contractTermMappings.Source && contractTermMappings.Source[deduction.source] ? contractTermMappings.Source[deduction.source] : deduction.source;
                            const escalationTrackersJoined = deduction.escalationTrackers && deduction.escalationTrackers.length > 0 ? deduction.escalationTrackers.join(';') : null;
                            convertedDeductions.push([
                              contract.name, deduction.catType, deduction.catalogueGroup, deduction.territory, deduction.channel, deduction.configuration,
                              deduction.priceCategory, deduction.source, deduction.deductionBasis, deduction.type, deduction.rate, deduction.unitRate, escalationTrackersJoined,
                            ]);
                          }
                          innerCb();
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.mechanicalTerms, (mechanical, innerCb) => {
                          if (mechanical) {
                            mechanical.territory = territoryGroupMappings[mechanical.territory] ? territoryGroupMappings[mechanical.territory] : mechanical.territory;
                            mechanical.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][mechanical.channel] ? contractTermMappings['Distribution Channel'][mechanical.channel] : mechanical.channel;
                            mechanical.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[mechanical.configuration] ? contractTermMappings.Configuration[mechanical.configuration] : mechanical.configuration;
                            mechanical.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][mechanical.priceCategory] ? contractTermMappings['Price Category'][mechanical.priceCategory] : mechanical.priceCategory;
                            mechanical.source = contractTermMappings.Source && contractTermMappings.Source[mechanical.source] ? contractTermMappings.Source[mechanical.source] : mechanical.source;
                            convertedMechanicals.push([
                              contract.name, mechanical.catType, mechanical.catalogueGroup, mechanical.territory, mechanical.channel, mechanical.configuration, mechanical.priceCategory,
                              mechanical.source, mechanical.deductionType, mechanical.type, mechanical.rateBasis, mechanical.rate, mechanical.unitRate, mechanical.reserve, mechanical.currency,
                            ]);
                          }
                          innerCb();
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.withholdingTaxTerms, (withholdingTax, innerCb) => {
                          if (withholdingTax) {
                            withholdingTax.territory = territoryGroupMappings[withholdingTax.territory] ? territoryGroupMappings[withholdingTax.territory] : withholdingTax.territory;
                            withholdingTax.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][withholdingTax.channel] ? contractTermMappings['Distribution Channel'][withholdingTax.channel] : withholdingTax.channel;
                            // eslint-disable-next-line max-len
                            withholdingTax.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[withholdingTax.configuration] ? contractTermMappings.Configuration[withholdingTax.configuration] : withholdingTax.configuration;
                            withholdingTax.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][withholdingTax.priceCategory] ? contractTermMappings['Price Category'][withholdingTax.priceCategory] : withholdingTax.priceCategory;
                            withholdingTax.source = contractTermMappings.Source && contractTermMappings.Source[withholdingTax.source] ? contractTermMappings.Source[withholdingTax.source] : withholdingTax.source;
                            const escalationTrackersJoined = withholdingTax.escalationTrackers && withholdingTax.escalationTrackers.length > 0 ? withholdingTax.escalationTrackers.join(';') : null;
                            convertedWithholdingTax.push([
                              contract.name, withholdingTax.catType, withholdingTax.catalogueGroup, withholdingTax.territory, withholdingTax.channel, withholdingTax.configuration,
                              withholdingTax.priceCategory, withholdingTax.source, withholdingTax.deductionBasis, withholdingTax.type, withholdingTax.rate, withholdingTax.unitRate,
                              escalationTrackersJoined,
                            ]);
                          }
                          innerCb();
                        }, cb);
                      }
                    },
                    function (cb) {
                      async.eachSeries(contract.costsTerms, (cost, innerCb) => {
                        if (cost) {
                          cost.territory = territoryGroupMappings[cost.territory] ? territoryGroupMappings[cost.territory] : cost.territory;
                          cost.type = contractTermMappings['Cost Type'] && contractTermMappings['Cost Type'][cost.type] ? contractTermMappings['Cost Type'][cost.type] : cost.type;
                          const escalationTrackersJoined = cost.escalationTrackers && cost.escalationTrackers.length > 0 ? cost.escalationTrackers.join(';') : null;
                          const costData = [contract.name, cost.territory, cost.type, cost.rate, escalationTrackersJoined];

                          // Add escalations to costs terms
                          for (const escalation of cost.escalations) {
                            const condition = escalation.conditions?.[0] || {};
                            costData.push(condition.escalationTracker || '');
                            costData.push(condition.thresholdType || '');
                            costData.push(condition.when || '');
                            costData.push(['Sale Date', 'Reporting Date'].includes(condition.escalationTracker) ? formatContractTermDateDateForExport({ date: condition.threshold, dateFormat }) : condition.threshold);
                            costData.push(escalation.rate || '');
                          }
                          convertedCosts.push(costData);
                        }
                        innerCb();
                      }, cb);
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.crossContracts, (crossContract, innerCb) => {
                          if (crossContract) {
                            Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(crossContract.contractId) })
                              .then((linkToContract) => {
                                if (linkToContract) {
                                  convertedCrossContracts.push([
                                    contract.name,
                                    Contract.mapCrossContractCondition(crossContract.condition),
                                    crossContract.process, linkToContract.name,
                                    crossContract.whenAutoPaymentTriggered,
                                    crossContract.percentage,
                                  ]);
                                }
                                innerCb();
                              })
                              .catch((err) => {
                                innerCb();
                              });
                          } else {
                            innerCb();
                          }
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (!client?.features?.payeeBalances) { return cb(); }

                      async.eachSeries(contract.payees, (payee, innerCb) => {
                        if (payee) {
                          Payee.findOne({ _id: new ObjectId(payee.payeeId) })
                            .then((foundPayee) => {
                              if (foundPayee) {
                                payees.push([contract.name, foundPayee.name, payee.percentage]);
                              }
                              innerCb();
                            })
                            .catch((err) => {
                              innerCb();
                            });
                        } else {
                          innerCb();
                        }
                      }, cb);
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.autoPaymentConditions, (autoPayment, innerCb) => {
                          if (autoPayment) {
                            Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(autoPayment.contractId) })
                              .then((foundContract) => {
                                if (foundContract) {
                                  convertedAutoPayments.push([contract.name, foundContract.name, autoPayment.condition]);
                                }
                                innerCb();
                              })
                              .catch((err) => {
                                innerCb();
                              });
                          } else {
                            innerCb();
                          }
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        // eslint-disable-next-line guard-for-in
                        for (const tracker in contract.escalationTracking) {
                          convertedEscalationTrackers.push([contract.name, tracker, contract.escalationTracking[tracker].startingUnits, contract.escalationTracking[tracker].startingGross, contract.escalationTracking[tracker].startingNet]);
                        }
                        cb();
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        // eslint-disable-next-line guard-for-in
                        for (const equivalent of contract.escalationEquivalents) {
                          convertedEscalationEquivalents.push([contract.name, equivalent.configuration, equivalent.amount]);
                        }
                        cb();
                      }
                    },
                    function (cb) {
                      contract.reserves.forEach((reserve) => {
                        if (reserve) { convertedReserves.push([contract.name, reserve.rate]); }
                      });
                      cb();
                    },
                    function (cb) {
                      Client.findById(clientId)
                        .then((client) => {
                          contract.exportData('Standard', dateFormat, paymentTier, (err, exportData) => {
                            convertedContracts.push(exportData);
                            cb();
                          });
                        })
                        .catch((err) => {
                          logger.error(`Error finding client in multipleContractsForXlsx with clientId '${clientId}': ${err}`);
                          cb(err);
                        });
                    },
                  ], (err) => {
                    // Remove from array
                    const index = contracts.indexOf(contract);
                    contracts.splice(index, 1);
                    contractCb(err);
                  });
                } else {
                  contractCb();
                }
              }, (err) => {
                waterfallCb(err);
              });
            },
          ], (err) => {
            if (err) {
              callback(err, null);
            } else {
              const proTabs = [convertedContracts.sort(), convertedSales.sort(), convertedDeductions.sort(),
                convertedMechanicals.sort(), convertedWithholdingTax.sort(), convertedCosts.sort(),
                convertedReserves.sort(), convertedCrossContracts.sort(), convertedAutoPayments.sort(), convertedEscalationTrackers.sort(), convertedEscalationEquivalents.sort()];

              const liteTabs = [convertedContracts.sort(), convertedSales.sort(), convertedCosts.sort(),
                convertedReserves.sort()];

              // If Payee Balance feature is on, should be set as the second tab
              if (client?.features?.payeeBalances) {
                liteTabs.splice(1, 0, payees.sort());
                proTabs.splice(1, 0, payees.sort());
              }

              callback(null, paymentTier === 'Lite' ? liteTabs : proTabs);
            }
          });
        } else {
          callback(new Error('Must be passed an Array of Contracts'), null);
        }
      } catch (e) {
        logger.error(e);
        callback(e);
      }
    })
    .catch((err) => {
      logger.error(`Error finding client in multipleContractsForXlsx with clientId '${clientId}': ${err}`);
      callback(err);
    });
};

/**
  * Exports Mechanical contracts.
  *
  * Calls callback(err, data) with an [err] if an error occurs and the contracts export [data] for the excel template.
  * @method
  * @param {object[]} contracts - Contracts to export.
  * @param {string} clientId - ID of the client exporting the contracts.
  * @param {function(string, object[])} callback - The callback that handles the response.
  */
contractSchema.statics.multipleMechanicalContractsForXlsx = function (contracts, clientId, callback) {
  const ContractTermGroup = require('./contractTermGroup');
  const Client = require('./client');

  Client.findById(clientId, 'features')
    .then((client) => {
      try {
        if (contracts instanceof Array) {
          const convertedContracts = [];
          const convertedMechanicalTerms = [];
          const convertedReserves = [];
          const convertedCrossContracts = [];
          const territoryGroupMappings = {};
          const contractTermMappings = {};
          const payees = [];

          async.waterfall([
            function (waterfallCb) {
              TerritoryGroup.find({ clientId }, { name: 1 })
                .then((territoryGroups) => {
                  territoryGroups.forEach((group) => { territoryGroupMappings[group._id.toString()] = group.name; });
                  waterfallCb();
                })
                .catch((err) => {
                  waterfallCb(err);
                });
            },
            function (waterfallCb) {
              ContractTermGroup.find({ clientId }, { name: 1, type: 1 })
                .then((contractTermGroups) => {
                  contractTermGroups.forEach((contractTermGroup) => {
                    contractTermMappings[contractTermGroup.type] = contractTermMappings[contractTermGroup.type] || {};
                    contractTermMappings[contractTermGroup.type][contractTermGroup._id.toString()] = contractTermGroup.name;
                  });
                  waterfallCb();
                })
                .catch((err) => {
                  waterfallCb(err);
                });
            },
            function (waterfallCb) {
              async.each(contracts, (contract, contractCb) => {
                if (contract) {
                  async.parallel([
                    function (cb) {
                      async.eachSeries(contract.mechanicalContractTerms, (mechanical, innerCb) => {
                        mechanical.territory = territoryGroupMappings[mechanical.territory] ? territoryGroupMappings[mechanical.territory] : mechanical.territory;
                        mechanical.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][mechanical.channel] ? contractTermMappings['Distribution Channel'][mechanical.channel] : mechanical.channel;
                        mechanical.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[mechanical.configuration] ? contractTermMappings.Configuration[mechanical.configuration] : mechanical.configuration;
                        mechanical.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][mechanical.priceCategory] ? contractTermMappings['Price Category'][mechanical.priceCategory] : mechanical.priceCategory;
                        mechanical.source = contractTermMappings.Source && contractTermMappings.Source[mechanical.source] ? contractTermMappings.Source[mechanical.source] : mechanical.source;
                        if (mechanical) {
                          convertedMechanicalTerms.push([
                            contract.name, mechanical.catType, mechanical.catalogueGroup, mechanical.territory, mechanical.channel, mechanical.configuration,
                            mechanical.priceCategory, mechanical.source, mechanical.type, mechanical.rateBasis, mechanical.rate, mechanical.unitRate, mechanical.reserve,
                          ]);
                          innerCb();
                        } else {
                          innerCb();
                        }
                      }, cb);
                    },
                    function (cb) {
                      contract.reserves.forEach((reserve) => {
                        if (reserve) { convertedReserves.push([contract.name, reserve.rate]); }
                      });
                      cb();
                    },
                    function (cb) {
                      if (!client?.features?.payeeBalances) { return cb(); }

                      async.eachSeries(contract.payees, (payee, innerCb) => {
                        if (payee) {
                          Payee.findOne({ _id: new ObjectId(payee.payeeId) })
                            .then((foundPayee) => {
                              if (foundPayee) {
                                payees.push([contract.name, foundPayee.name, payee.percentage]);
                              }
                              innerCb();
                            })
                            .catch((err) => {
                              innerCb();
                            });
                        } else {
                          innerCb();
                        }
                      }, cb);
                    },
                    function (cb) {
                      async.eachSeries(contract.crossContracts, (crossContract, innerCb) => {
                        if (crossContract) {
                          Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(crossContract.contractId) })
                            .then((linkToContract) => {
                              if (linkToContract) {
                                convertedCrossContracts.push([contract.name, Contract.mapCrossContractCondition(crossContract.condition), crossContract.process, linkToContract.name, crossContract.whenAutoPaymentTriggered, crossContract.percentage]);
                              }
                              innerCb();
                            })
                            .catch((err) => {
                              innerCb();
                            });
                        } else {
                          innerCb();
                        }
                      }, cb);
                    },
                    function (cb) {
                      Client.findById(clientId)
                        .then((client) => {
                          // get date format from client settings
                          const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
                          const { paymentTier } = client;
                          contract.exportData('Mechanical', dateFormat, paymentTier, (err, exportData) => {
                            convertedContracts.push(exportData);
                            cb();
                          });
                        })
                        .catch((err) => {
                          logger.error(`Error finding client in multipleMechanicalContractsForXlsx with clientId '${clientId}': ${err}`);
                          cb(err);
                        });
                    },
                  ], (err) => {
                    // Remove from array
                    const index = contracts.indexOf(contract);
                    contracts.splice(index, 1);
                    contractCb(err);
                  });
                } else {
                  contractCb();
                }
              }, waterfallCb);
            },
          ], (err) => {
            if (err) {
              callback(err, null);
            } else {
              const sheets = [convertedContracts.sort(), convertedMechanicalTerms.sort(), convertedReserves.sort(), convertedCrossContracts.sort()];

              // If Payee Balance feature is on, should be set as the second tab
              if (client?.features?.payeeBalances) { sheets.splice(1, 0, payees.sort()); }

              callback(null, sheets);
            }
          });
        } else {
          callback(new Error('Must be passed an Array of Contracts'), null);
        }
      } catch (e) {
        logger.error(e);
        callback(e);
      }
    })
    .catch((err) => {
      logger.error(`Error finding client in multipleMechanicalContractsForXlsx with clientId '${clientId}': ${err}`);
      callback(err);
    });
};

/**
  * Exports Publisher contracts.
  *
  * Calls callback(err, data) with an [err] if an error occurs and the contracts export [data] for the excel template.
  * @method
  * @param {object[]} contracts - Contracts to export.
  * @param {string} clientId - ID of the client exporting the contracts.
  * @param {function(string, object[])} callback - The callback that handles the response.
  */
contractSchema.statics.multiplePublisherContractsForXlsx = function (contracts, clientId, paymentTier, callback) {
  const ContractTermGroup = require('./contractTermGroup');
  const Client = require('./client');

  Client.findById(clientId, 'features dateFormat')
    .then((client) => {
      try {
        if (contracts instanceof Array) {
          const convertedContracts = [];
          const convertedSales = [];
          const convertedDeductions = [];
          const convertedCrossContracts = [];
          const territoryGroupMappings = {};
          const contractTermMappings = {};
          const convertedWithholdingTax = [];
          const convertedAutoPayments = [];
          const convertedEscalationTrackers = [];
          const convertedEscalationEquivalents = [];
          const payees = [];
          async.waterfall([
            function (waterfallCb) {
              TerritoryGroup.find({ clientId }, { name: 1 })
                .then((territoryGroups) => {
                  territoryGroups.forEach((group) => { territoryGroupMappings[group._id.toString()] = group.name; });
                  waterfallCb();
                })
                .catch((err) => {
                  waterfallCb(err);
                });
            },
            function (waterfallCb) {
              ContractTermGroup.find({ clientId }, { name: 1, type: 1 })
                .then((contractTermGroups) => {
                  contractTermGroups.forEach((contractTermGroup) => {
                    contractTermMappings[contractTermGroup.type] = contractTermMappings[contractTermGroup.type] || {};
                    contractTermMappings[contractTermGroup.type][contractTermGroup._id.toString()] = contractTermGroup.name;
                  });
                  waterfallCb();
                })
                .catch((err) => {
                  waterfallCb(err);
                });
            },
            function (waterfallCb) {
              async.each(contracts, (contract, contractCb) => {
                if (contract) {
                  async.parallel([
                    function (cb) {
                      // get date format from client settings
                      const dateFormat = client.dateFormat?.toUpperCase() || '';
                      async.eachSeries(contract.salesTerms, (sale, innerCb) => {
                        if (sale) {
                          sale.territory = territoryGroupMappings[sale.territory] ? territoryGroupMappings[sale.territory] : sale.territory;
                          sale.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][sale.channel] ? contractTermMappings['Distribution Channel'][sale.channel] : sale.channel;
                          sale.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[sale.configuration] ? contractTermMappings.Configuration[sale.configuration] : sale.configuration;
                          sale.source = contractTermMappings.Source && contractTermMappings.Source[sale.source] ? contractTermMappings.Source[sale.source] : sale.source;
                          const escalationTrackersJoined = sale.escalationTrackers && sale.escalationTrackers.length > 0 ? sale.escalationTrackers.join(';') : null;
                          const salesData = [contract.name, sale.catType, sale.catalogueGroup, sale.territory, sale.channel, sale.configuration, sale.source, escalationTrackersJoined, sale.type, sale.rate, sale.reductionRate];

                          // Add escalations to sales terms
                          for (const escalation of sale.escalations) {
                            const condition = escalation.conditions?.[0] || {};
                            salesData.push(condition.escalationTracker || '');
                            salesData.push(condition.thresholdType || '');
                            salesData.push(condition.when || '');
                            salesData.push(['Sale Date', 'Reporting Date'].includes(condition.escalationTracker) ? formatContractTermDateDateForExport({ date: condition.threshold, dateFormat }) : condition.threshold);
                            salesData.push(escalation.type || '');
                            salesData.push(escalation.rate || '');
                            salesData.push(escalation.reductionRate || '');
                          }

                          convertedSales.push(salesData);
                        }
                        innerCb();
                      }, cb);
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.deductionsTerms, (deduction, innerCb) => {
                          if (deduction) {
                            deduction.territory = territoryGroupMappings[deduction.territory] ? territoryGroupMappings[deduction.territory] : deduction.territory;
                            deduction.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][deduction.channel] ? contractTermMappings['Distribution Channel'][deduction.channel] : deduction.channel;
                            deduction.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[deduction.configuration] ? contractTermMappings.Configuration[deduction.configuration] : deduction.configuration;
                            deduction.source = contractTermMappings.Source && contractTermMappings.Source[deduction.source] ? contractTermMappings.Source[deduction.source] : deduction.source;
                            const escalationTrackersJoined = deduction.escalationTrackers && deduction.escalationTrackers.length > 0 ? deduction.escalationTrackers.join(';') : null;
                            convertedDeductions.push([
                              contract.name, deduction.catType, deduction.catalogueGroup, deduction.territory, deduction.channel, deduction.configuration, deduction.source,
                              deduction.deductionBasis, deduction.type, deduction.rate, deduction.unitRate, escalationTrackersJoined,
                            ]);
                          }
                          innerCb();
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.withholdingTaxTerms, (withholdingTax, innerCb) => {
                          if (withholdingTax) {
                            withholdingTax.territory = territoryGroupMappings[withholdingTax.territory] ? territoryGroupMappings[withholdingTax.territory] : withholdingTax.territory;
                            withholdingTax.channel = contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][withholdingTax.channel] ? contractTermMappings['Distribution Channel'][withholdingTax.channel] : withholdingTax.channel;
                            // eslint-disable-next-line max-len
                            withholdingTax.configuration = contractTermMappings.Configuration && contractTermMappings.Configuration[withholdingTax.configuration] ? contractTermMappings.Configuration[withholdingTax.configuration] : withholdingTax.configuration;
                            withholdingTax.priceCategory = contractTermMappings['Price Category'] && contractTermMappings['Price Category'][withholdingTax.priceCategory] ? contractTermMappings['Price Category'][withholdingTax.priceCategory] : withholdingTax.priceCategory;
                            withholdingTax.source = contractTermMappings.Source && contractTermMappings.Source[withholdingTax.source] ? contractTermMappings.Source[withholdingTax.source] : withholdingTax.source;
                            const escalationTrackersJoined = withholdingTax.escalationTrackers && withholdingTax.escalationTrackers.length > 0 ? withholdingTax.escalationTrackers.join(';') : null;
                            convertedWithholdingTax.push([
                              contract.name, withholdingTax.catType, withholdingTax.catalogueGroup, withholdingTax.territory, withholdingTax.channel, withholdingTax.configuration,
                              withholdingTax.priceCategory, withholdingTax.source, withholdingTax.deductionBasis, withholdingTax.type, withholdingTax.rate, withholdingTax.unitRate,
                              escalationTrackersJoined,
                            ]);
                          }
                          innerCb();
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (!client?.features?.payeeBalances) { return cb(); }

                      async.eachSeries(contract.payees, (payee, innerCb) => {
                        if (payee) {
                          Payee.findOne({ _id: new ObjectId(payee.payeeId) })
                            .then((foundPayee) => {
                              if (foundPayee) {
                                payees.push([contract.name, foundPayee.name, payee.percentage]);
                              }
                              innerCb();
                            })
                            .catch((err) => {
                              innerCb();
                            });
                        } else {
                          innerCb();
                        }
                      }, cb);
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.crossContracts, (crossContract, innerCb) => {
                          if (crossContract) {
                            Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(crossContract.contractId) })
                              .then((linkToContract) => {
                                if (linkToContract) {
                                  convertedCrossContracts.push([
                                    contract.name,
                                    Contract.mapCrossContractCondition(crossContract.condition),
                                    crossContract.process,
                                    linkToContract.name,
                                    crossContract.whenAutoPaymentTriggered,
                                    crossContract.percentage,
                                  ]);
                                }
                                innerCb();
                              })
                              .catch((err) => {
                                innerCb();
                              });
                          } else {
                            innerCb();
                          }
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        async.eachSeries(contract.autoPaymentConditions, (autoPayment, innerCb) => {
                          if (autoPayment) {
                            Contract.findOne({ clientId: contract.clientId, _id: new ObjectId(autoPayment.contractId) })
                              .then((foundContract) => {
                                if (foundContract) {
                                  convertedAutoPayments.push([contract.name, foundContract.name, autoPayment.condition]);
                                }
                                innerCb();
                              })
                              .catch((err) => {
                                innerCb();
                              });
                          } else {
                            innerCb();
                          }
                        }, cb);
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        // eslint-disable-next-line guard-for-in
                        for (const tracker in contract.escalationTracking) {
                          convertedEscalationTrackers.push([contract.name, tracker, contract.escalationTracking[tracker].startingUnits, contract.escalationTracking[tracker].startingGross, contract.escalationTracking[tracker].startingNet]);
                        }
                        cb();
                      }
                    },
                    function (cb) {
                      if (paymentTier === 'Lite') {
                        cb();
                      } else {
                        // eslint-disable-next-line guard-for-in
                        for (const equivalent of contract.escalationEquivalents) {
                          convertedEscalationEquivalents.push([contract.name, equivalent.configuration, equivalent.amount]);
                        }
                        cb();
                      }
                    },
                    function (cb) {
                      Client.findById(clientId)
                        .then((client) => {
                          // get date format from client settings
                          const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
                          const { paymentTier } = client;
                          contract.exportData('Publisher', dateFormat, paymentTier, (err, exportData) => {
                            convertedContracts.push(exportData);
                            cb();
                          });
                        })
                        .catch((err) => {
                          logger.error(`Error finding client in multiplePublisherContractsForXlsx with clientId '${clientId}': ${err}`);
                          cb(err);
                        });
                    },
                  ], (err) => {
                    // Remove from array
                    const index = contracts.indexOf(contract);
                    contracts.splice(index, 1);
                    contractCb(err);
                  });
                } else {
                  contractCb();
                }
              }, (err) => {
                waterfallCb(err);
              });
            },
          ], (err) => {
            if (err) {
              callback(err, null);
            } else {
              const liteData = [convertedContracts.sort(), convertedSales.sort()];
              const proData = [
                convertedContracts.sort(),
                convertedSales.sort(),
                convertedDeductions.sort(),
                convertedWithholdingTax.sort(),
                convertedCrossContracts.sort(),
                convertedAutoPayments.sort(),
                convertedEscalationTrackers.sort(),
                convertedEscalationEquivalents.sort(),
              ];

              if (client?.features?.payeeBalances) {
                liteData.splice(1, 0, payees.sort());
                proData.splice(1, 0, payees.sort());
              }

              callback(null, paymentTier === 'Lite' ? liteData : proData);
            }
          });
        } else {
          callback(new Error('Must be passed an Array of Contracts'), null);
        }
      } catch (e) {
        logger.error(e);
        callback(e);
      }
    })
    .catch((err) => {
      logger.error(`Error finding client in multiplePublisherContractsForXlsx with clientId '${clientId}': ${err}`);
      callback(err);
    });
};

/**
  * Get current contract balance at the time of export.
  *
  * @method
  * @param {function(string, Float, Float)} callback - The callback that handles the response.
  */
contractSchema.methods.getCurrentBalance = function (callback) {
  const contract = this;
  // Config
  const options = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible' ? { excludeAdvance: true, excludeReserves: true } : {};
  const currentDate = new Date();
  // Return current balance
  contract.balanceAtDate(currentDate, options, (err, balance) => {
    // If contract type is profit share get advance remaining if final balance is negative
    if (contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible') {
      const profitShareOptions = { getAdvanceRemaining: true };
      contract.balanceAtDate(currentDate, profitShareOptions, (err, advanceRemaining) => callback(err, advanceRemaining, balance));
    } else {
      callback(err, null, balance);
    }
  });
};

/**
  * Exports contract data.
  *
  * Calls callback(err, data) with an [err] if an error occurs and the contract export [data] for the excel template.
  * @method
  * @param {string} type - Export Type.
  * @param {string} dateFormat - Export dates format.
  * @param {function(string, array)} callback - The callback that handles the response.
  */
contractSchema.methods.exportData = function (type, dateFormat, paymentTier, callback) {
  const contract = this;
  const Payee = require('./payee');
  const Company = require('./company');

  Client.findById(contract.clientId, 'features')
    .then((client) => {
      Payee.findById(contract.payees?.[0]?.payeeId)
        .then(async (payee) => {
          let company;
          if (ObjectId.isValid(contract.companyId)) {
            company = await Company.findById(contract.companyId).catch(logger.error);
          }
          contract.getCurrentBalance((getCurrentBalanceErr, advanceRemaining, balance) => {
            if (getCurrentBalanceErr) { logger.error(getCurrentBalanceErr); }

            const companyName = company ? company.name : '';
            const mechanicalContractData = [
              contract._id.toString(),
              contract.name,
              contract.foreignId,
              contract.projectId,
              contract.active,
              companyName,
              contract.accountingPeriod,
              contract.currency,
              contract.licenseNo,
              contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
              contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
              contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
              contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
              contract.contractCategories.join(';'),
              contract.openingBalance,
              contract.minPayout,
              contract.autoPayment,
              contract.selfBilling,
              contract.deductWithholding,
              contract.summaryContractTotals,
              contract.reserveBasis,
              contract.notes,
              contract.labels && contract.labels.length > 0 ? contract.labels.join(';') : null,
              balance || balance === 0 ? Number(balance.toFixed(2)) : 0,
            ];

            const professionalPublisherData = [
              contract._id.toString(),
              contract.name,
              contract.foreignId,
              contract.projectId,
              contract.active,
              companyName,
              contract.accountingPeriod,
              contract.currency,
              contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
              contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
              contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
              contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
              contract.contractCategories.join(';'),
              contract.openingBalance,
              contract.minPayout,
              contract.autoPayment,
              contract.selfBilling,
              contract.deductWithholding,
              contract.summaryContractTotals,
              contract.notes,
              contract.aliases && contract.aliases.length > 0 ? contract.aliases.join(';') : null,
              balance || balance === 0 ? Number(balance.toFixed(2)) : 0,
            ];

            const professionalLabelData = [
              contract._id.toString(),
              contract.name,
              contract.foreignId,
              contract.projectId,
              contract.active,
              companyName,
              contract.accountingPeriod,
              contract.type === 'Profit Share' ? 'Profit Share - Classic' : contract.type,
              contract.currency,
              contract.profitSharePercentage,
              contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
              contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
              contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
              contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
              contract.contractCategories.join(';'),
              contract.openingBalance,
              contract.minPayout,
              contract.autoPayment,
              contract.selfBilling,
              contract.deductWithholding,
              contract.feesInvoice,
              contract.summaryContractTotals,
              contract.reserveBasis,
              contract.notes,
              contract.labels && contract.labels.length > 0 ? contract.labels.join(';') : null,
              contract.aliases && contract.aliases.length > 0 ? contract.aliases.join(';') : null,
              balance || balance === 0 ? Number(balance.toFixed(2)) : 0,
              advanceRemaining || advanceRemaining === 0 ? Number(advanceRemaining.toFixed(2)) : 0,
            ];

            const litePublisherData = [
              contract._id.toString(),
              contract.name,
              contract.foreignId,
              contract.projectId,
              contract.active,
              contract.accountingPeriod,
              contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
              contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
              contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
              contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
              contract.contractCategories.join(';'),
              contract.openingBalance,
              contract.minPayout,
              contract.autoPayment,
              contract.notes,
              balance || balance === 0 ? Number(balance.toFixed(2)) : 0,
            ];

            const liteLabelData = [
              contract._id.toString(),
              contract.name,
              contract.foreignId,
              contract.projectId,
              contract.active,
              contract.accountingPeriod,
              contract.type === 'Profit Share' ? 'Profit Share - Classic' : contract.type,
              contract.profitSharePercentage,
              contract.startDate ? moment(contract.startDate).format(dateFormat) : null,
              contract.endDate ? moment(contract.endDate).format(dateFormat) : null,
              contract.collectionEndDate ? moment(contract.collectionEndDate).format(dateFormat) : null,
              contract.retentionPeriodEndDate ? moment(contract.retentionPeriodEndDate).format(dateFormat) : null,
              contract.contractCategories.join(';'),
              contract.openingBalance,
              contract.minPayout,
              contract.autoPayment,
              contract.reserveBasis,
              contract.notes,
              balance || balance === 0 ? Number(balance.toFixed(2)) : 0,
              advanceRemaining || advanceRemaining === 0 ? Number(advanceRemaining.toFixed(2)) : 0,
            ];

            // When Payee Balances is switch on we show the contract condition for payee transfers in the payee name field
            const payeeField = client?.features?.payeeBalances ? contract.payeeBalanceCondition : payee?.name;

            mechanicalContractData.splice(4, 0, payeeField);
            litePublisherData.splice(4, 0, payeeField);
            liteLabelData.splice(4, 0, payeeField);
            professionalPublisherData.splice(4, 0, payeeField);
            professionalLabelData.splice(4, 0, payeeField);

            // Return the appropriate template based on hte type and payment tier
            if (type === 'Mechanical') {
              callback(null, mechanicalContractData);
            } else if (paymentTier === 'Lite') {
              if (type === 'Publisher') {
                callback(null, litePublisherData);
              } else {
                callback(null, liteLabelData);
              }
            } else if (type === 'Publisher') {
              callback(null, professionalPublisherData);
            } else {
              callback(null, professionalLabelData);
            }
          });
        })
        .catch((err) => {
          logger.error(`Error finding payee in exportData with payeeId '${contract.payees?.[0]?.payeeId}': ${err}`);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(`Error finding client in exportData with clientId '${contract.clientId}': ${err}`);
      callback(err);
    });
};

/**
  * Maps contract values.
  *
  * @method
  * @param {string} value - Value to map.
  * @returns {string} Mapped value.
  */
contractSchema.statics.mapCrossContractCondition = function (value) {
  switch (value) {
    case 'Positive': return 'Balance is Positive';
    case 'Negative': return 'Balance is Negative';
    case 'Always': return 'Always transfer Balance';
    case 'Balance is Positive': return 'Positive';
    case 'Balance is Negative': return 'Negative';
    case 'Always transfer Balance': return 'Always';
    default: return value;
  }
};
// ------ EXPORT Contracts end ----- //

/**
  * Matches a Contract to Labels.
  *
  * Calls callback(err) with an [err] if an error occurs.
  * @method
  * @param {function(string)} callback - The callback that handles the response.
  */
contractSchema.methods.matchContractToLabels = function (callback) {
  const contract = this;
  const Release = require('./release');
  const Track = require('./track');
  async.waterfall([
    function (cb) {
      // Releases
      Release.find({
        clientId: contract.clientId, salesReturnsRights: { $size: 0 }, costsRights: { $size: 0 }, $or: [{ label: { $in: contract.labels } }, { label: contract.name }],
      })
        .then((releases) => {
          async.each(releases, (release, releaseCb) => {
            release.salesReturnsRights.push({ contractId: contract._id.toString(), percentage: 100 });
            release.costsRights.push({ contractId: contract._id.toString(), percentage: 100 });
            release.save()
              .then(() => {
                releaseCb();
              })
              .catch((err) => {
                releaseCb(err);
              });
          }, cb);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (cb) {
      // Tracks
      Track.find({
        clientId: contract.clientId, salesReturnsRights: { $size: 0 }, costsRights: { $size: 0 }, $or: [{ label: { $in: contract.labels } }, { label: contract.name }],
      })
        .then((tracks) => {
          async.each(tracks, (track, trackCb) => {
            track.salesReturnsRights.push({ contractId: contract._id.toString(), percentage: 100 });
            track.costsRights.push({ contractId: contract._id.toString(), percentage: 100 });
            track.save()
              .then(() => {
                trackCb();
              })
              .catch((err) => {
                trackCb(err);
              });
          }, cb);
        })
        .catch((err) => {
          cb(err);
        });
    },
  ], callback);
};

/**
  * Sets a list of the contract's unique aliases.
  *
  * @method
  */
contractSchema.methods.uniqueAliases = function () {
  if (this.aliases) {
    this.aliases = this.aliases.filter((value, index, self) => self.indexOf(value) === index);
  }
};

/**
  * Sets contract's partition number.
  *
  * @method
  */
contractSchema.methods.setPartitionNo = function () {
  const contract = this;
  // This uses charCodeAt which gives a number for letters
  if (!contract.partitionNo && contract.partitionNo !== 0 && contract.name) {
    const lowerCaseName = contract.name.toLowerCase();
    const code = lowerCaseName.charCodeAt(0);
    if (code >= 97) {
      contract.partitionNo = code - 97;
    } else if (isNaN(code)) {
      contract.partitionNo = 0;
    } else {
      contract.partitionNo = code;
    }
  } else if (!contract.partitionNo) {
    contract.partitionNo = 0;
  }
};

/**
  * Cleans up a number.
  *
  * @method
  * @param {string} numStre - Number to clean up
  * @returns {string} numStre - Cleaned up number
  */
contractSchema.statics.cleanUpNumber = function (numStr) {
  if (numStr && typeof numStr === 'string') {
    numStr = numStr.replace(/\%/g, '');
    if (numStr.indexOf(',') !== -1 && numStr.indexOf('.') !== -1) {
      if (numStr.indexOf(',') > numStr.indexOf('.')) {
        numStr = numStr.replace(/\./g, '').replace(/,/g, '.');
      } else {
        numStr = numStr.replace(/,/g, '');
      }
    } else if (numStr.indexOf(',') !== -1) {
      numStr = numStr.replace(/,/g, '.');
    }
  }
  return numStr;
};

/**
  * Cleans up numbers an array of terms.
  *
  * @method
  * @param {object[]} terms - List of terms to clean up
  * @param {string[]} items - List of terms items to clean up
  * @returns {object[]} terms - Cleaned up terms
  */
contractSchema.statics.cleanUpNumbersInArray = function (terms, items) {
  if (terms && Array.isArray(terms) && Array.isArray(items)) {
    terms.forEach((term) => {
      items.forEach((item) => {
        term[item] = Contract.cleanUpNumber(term[item]);
      });
    });
  }
  return terms;
};

/**
  * Cleans up numbers an dictionary object of escalationTrackers.
  *
  * @method
  * @param {object.<object>} obj - dictionary object of escalation trackers to cleanup
  * @returns {object.<object>} obj - Cleaned up escalation trackers
  */
contractSchema.statics.cleanUpNumbersInDicObj = function (obj) {
  if (obj) {
    for (const [key, value] of Object.entries(obj)) {
      value.units = Contract.cleanUpNumber(parseFloat(value.units));
      value.gross = Contract.cleanUpNumber(parseFloat(value.gross));
      value.net = Contract.cleanUpNumber(parseFloat(value.net));
    }
  }
  return obj;
};

/**
  * Cleans up input values for cross contracts.
  *
  * @method
  * @param {object[]} crossContracts - array of Cross Contract Objects for cleanup
  */
contractSchema.statics.cleanUpCrossContractValues = function (crossContracts) {
  crossContracts.forEach((crossContract) => {
    if (!crossContract.whenAutoPaymentTriggered) { crossContract.whenAutoPaymentTriggered = false; }
  });
  return crossContracts;
};

/**
  * Add Payee name to populated contracts
  *
  * @method
  * @param {object[]} contracts - List of contracts
  */
contractSchema.statics.addPayeeNameToContracts = function (contracts) {
  contracts = JSON.parse(JSON.stringify(contracts));
  contracts.forEach((contract) => {
    if (contract.payees?.[0]?.payeeId && contract.payeeBalanceCondition === 'Never') {
      const payee = contract.payees[0].payeeId;

      contract.payeeName = payee.name;
      contract.payeeId = payee._id?.toString();
    }
  });
  return contracts;
};

contractSchema.pre('validate', function (next) {
  const contract = this;
  // Remove any duplicate aliases
  contract.uniqueAliases();
  // Create partitionNo
  contract.setPartitionNo();
  // Set profit share percentage if not profit share
  if (this.type === 'Royalty') { this.profitSharePercentage = 0; }
  Utils.clearBlankStrings(contract, ['crossContracts', 'autoPaymentConditions', 'payeeId']);
  // Create array for counts
  const asyncArray = [];
  // Check name is unique
  asyncArray.push(Contract.countDocuments.call(Contract, { _id: { $ne: contract._id }, clientId: contract.clientId, name: contract.name, contractType: contract.contractType }));
  // Check if any statements are added to contract
  asyncArray.push(Statement.countDocuments.call(Statement, { clientId: contract.clientId, contractId: contract._id.toString() }));
  // Loop through aliases check each are unique
  if (contract.aliases) {
    contract.aliases.forEach((alias) => {
      asyncArray.push(Contract.countDocuments.call(Contract, { _id: { $ne: contract._id }, clientId: contract.clientId, aliases: alias }));
    });
  }

  Promise.all(asyncArray)
    .then((result) => {
      const errors = [];
      // When name is not unique
      if (result[0] > 0) {
        errors.push('Name is required to be unique');
      }
      // When aliases are not unique
      result.forEach((resultArray, index) => {
        if (index !== 0 && index !== 1 && resultArray > 0 && errors.indexOf('Aliases are required to be unique') === -1) {
          errors.push('Aliases are required to be unique');
        }
      });
      // Check cross contractIds
      async.waterfall([
        function (waterfallCb) {
          if (contract?.crossContracts?.length > 0) {
            async.each(contract.crossContracts, (crossContract, crossContractCb) => {
              Contract.findOne({ _id: crossContract.contractId }, 'name contractType accountingPeriod')
                .then((foundContract) => {
                  const foundContractType = (foundContract?.contractType === 'Mechanical') ? 'Mechanical' : 'Artist';
                  const contractType = (contract?.contractType === 'Mechanical') ? 'Mechanical' : 'Artist'; // force push

                  if (contract?.accountingPeriod !== foundContract?.accountingPeriod || foundContractType !== contractType) {
                    errors.push('Cross contract should only be attached to a contract with the same accounting period and contract type.');
                  }
                  crossContractCb();
                })
                // eslint-disable-next-line arrow-body-style
                .catch((err) => {
                  return crossContractCb(err);
                });
            }, (err) => {
              if (err) { return waterfallCb(err); }
              waterfallCb();
            });
          } else {
            waterfallCb();
          }
        },
        function (waterfallCb) {
          if (contract?.crossContracts?.length > 0) {
            async.each(contract.crossContracts, (crossContract, crossContractCb) => {
              if (crossContract.condition === 'Always' && contract.type === 'Profit Share') {
                errors.push(`Cross contract should not have 'Always transfer Balance' selected with '${crossContract.process}'`);
              }
              if (crossContract.condition === 'Always' && crossContract.process === 'Subtract From') {
                errors.push(`Cross contract should not have 'Always transfer Balance' selected with '${crossContract.process}'`);
              }
              crossContractCb();
            }, (err) => {
              if (err) { return waterfallCb(err); }
              waterfallCb();
            });
          } else {
            waterfallCb();
          }
        },
        function (waterfallCb) {
          if (contract.payeeBalanceCondition === 'Never' || !contract.crossContracts?.length) return waterfallCb();

          for (const crossing of contract.crossContracts) {
            // “Balance Is Positive - Subtract From or Add To”, should only be available when the payee transfer is set to “When Positive”
            if (contract.payeeBalanceCondition === 'Always' && crossing.condition === 'Positive' && (crossing.process === 'Subtract From' || crossing.process === 'Add To')) {
              errors.push(`Cross contract should not have "Balance is Positive" selected with ${crossing.process} with Payee Balance Condition of ${contract.payeeBalanceCondition}`);
            }

            // Disallow “Balance Is Greater Than Min Payout” with Payee Balances
            if (crossing.condition === 'Balance is Greater Than Minimum Payout') {
              errors.push('Cross contract should not have "Balance is Greater Than Minimum Payout" selected when using Payee Balances. If you want to use this condition, please set Payee Balance Condition to "Never"');
            }
          }

          waterfallCb();
        },
      ], () => {
        if (errors.length) {
          // Return errors
          return next(new Error(errors.join(', ')));
        }
        // Else continue
        return next();
      });
    })
    .catch((err) => {
      logger.error(err);
      next(err);
    });
});

/**
  * Check custom client settings with the Contract.
  *
  * checks that the item is defined in settings or Contract Term Groups
  *
  * Calls callback() when done returning errors if any.
  * @method
  * @param {client} Client - The client to check the settings against.
  * @param {item} string - The dist channel to look for in settings client.
  * @param {contractItemArray} String - The name of client settings Array to compare against.
  * @param {contractTermGroupType} String - The string value of type.
  */

contractSchema.methods.checkClientSet = async function (client, item, contractItemArray, contractTermGroupType) {
  const ContractTermGroup = require('./contractTermGroup');
  if (client?.[contractItemArray]?.includes(item)) {
    return true;
  }
  if (mongoose.Types.ObjectId.isValid(item)) {
    const contractTermGroup = await ContractTermGroup.findById(item);
    if (contractTermGroup?.type === contractTermGroupType) {
      return true;
    }
    return false;
  }
  return false;
};

/**
  * Check custom client settings with the Contract.
  *
  * checks that the dist channel is defined in settings or Contract Term Groups
  *
  * Calls callback() when done returning errors if any.
  * @method
  * @param {client} Client - The client to check the settings against.
  * @param {channel} string - The dist channel to look for in settings client.
  */

contractSchema.methods.checkClientChannel = async function (client, channel) {
  const ContractTermGroup = require('./contractTermGroup');
  if (client?.distributionChannels?.includes(channel)) {
    return true;
  }
  if (mongoose.Types.ObjectId.isValid(channel)) {
    const contractTermGroup = await ContractTermGroup.findById(channel);
    if (contractTermGroup?.type === 'Distribution Channel') {
      return true;
    }
    return false;
  }
  return false;
};

/**
  * Check custom client settings with the Contract.
  *
  * checks that the Cost Type is defined in settings or Contract Term Groups
  *
  * Calls callback() when done returning errors if any.
  * @method
  * @param {client} Client - The client to check the settings against.
  * @param {type} string - The cost type to look for in settings client.
  */

contractSchema.methods.checkClientCostType = async function (client, type) {
  const ContractTermGroup = require('./contractTermGroup');
  if (client?.costTypes?.includes(type)) {
    return true;
  }
  if (mongoose.Types.ObjectId.isValid(type)) {
    const contractTermGroup = await ContractTermGroup.findById(type);
    if (contractTermGroup?.type === 'Cost Type') {
      return true;
    }
    return false;
  }
  return false;
};

/**
 * Checks if a contract has any validation errors.
 *
 * Returns only when done validating.
 *
 * @method
 *
 */

contractSchema.methods.checkValidationErrors = async function () {
  const contract = this;
  const Client = require('./client');
  // Reset contract validations errors array
  contract.validationErrors = [];
  const client = await Client.findById(contract.clientId);
  const missingTermMessage = client?.clientType === 'Publisher' ? 'Income' : 'Sales';
  // Check payeeId
  if (!contract.payees?.length) {
    contract.validationErrors.push('A Payee is needed for this contract\'s statements to be visible in the artist portal');
  }
  // Check Accounting Period
  if (!contract.accountingPeriod) {
    contract.validationErrors.push('Accounting Period is required');
  }
  // Check Currency - this defaults so should not fire
  if (!contract.currency) {
    contract.validationErrors.push('Currency is required');
  }
  // Check Contract type - this defaults so should not fire
  if (!contract.type) {
    contract.validationErrors.push('Contract type is required');
  }
  // Check Contract type - this defaults so should not fire
  if (!contract.active) {
    contract.validationErrors.push('Contracts needs to be active in order to report royalties');
  }
  // If deal type is profit share, profit share % is required
  if (contract.type === 'Profit Share - Flexible' && !contract.profitSharePercentage && contract.profitSharePercentage !== 0) {
    contract.validationErrors.push('Profit share % is required');
  }
  // At least one sales term required if an artist contract
  if (contract.contractType === 'Artist' && !contract.summaryContractTotals) {
    if (contract.salesTerms?.length === 0) {
      contract.validationErrors.push(`Contract needs at least one ${missingTermMessage} Term - only exception is when this contract is being used as a summary contract, without processing any sales itself`);
    }
  }
  // At least one mechanical term required if a mechanical contract
  if (contract.contractType === 'Mechanical') {
    if (contract.mechanicalContractTerms?.length === 0) {
      contract.validationErrors.push('Contract needs at least one Mechanical Term in order to report mechanical royalties');
    }
  }
  // Validate the terms
  // lets keep track of error shown
  let rateMissing = false;
  let typeMissing = false;
  let basisMissing = false;
  let unitRateMissing = false;
  let reservesMissing = false;
  let reservesNot100 = false;
  let stDuplicate = false;
  let mtDuplicate = false;
  const channelDistinctArray = [];
  const costTypeDistinctArray = [];
  const configurationDistinctArray = [];
  const priceCategoryDistinctArray = [];
  const catalogueGroupDistinctArray = [];
  const escalationTrackerDistinctArray = [];
  let mtCurrencyMissing = false;
  // do we have a reserves array
  const reservesIncluded = (contract?.reserves?.length > 0);
  const mainTerms = (contract.contractType && contract.contractType === 'Mechanical') ? 'mechanicalContractTerms' : 'salesTerms';
  // Validate the sales Terms
  await Promise.all(contract[mainTerms]?.map(async (mainTerm) => {
    if (mainTerm) {
      // Royalty % required in each term
      if (!mainTerm.rate && mainTerm.rate !== 0 && !rateMissing) {
        contract.validationErrors.push('Royalty Rate % is required in each Term');
        rateMissing = true;
      }
      // Calculation input type required in each term
      if (!mainTerm.type && !typeMissing) {
        contract.validationErrors.push('Calculation type is required in each Term');
        typeMissing = true;
      }
      // If calculation type is unit rate, a unit rate value is required
      if (mainTerm.type === 'Unit Rate' && !mainTerm.unitRate && mainTerm.unitRate !== 0 && !unitRateMissing) {
        contract.validationErrors.push('Unit Rate is required for all (Fixed) Unit Rate Terms');
        unitRateMissing = true;
      }
      // If calculation type is (fixed) unit rate, a unit rate value is required
      if (mainTerm.type === 'Fixed Unit Rate' && !mainTerm.unitRate && mainTerm.unitRate !== 0 && !unitRateMissing) {
        contract.validationErrors.push('Unit Rate is required for all (Fixed) Unit Rate Terms');
        unitRateMissing = true;
      }
      // If at least one term has a reserve % > reserve release schedule required
      if (!reservesMissing && mainTerm.reserve && !reservesIncluded) {
        contract.validationErrors.push('Reserve release schedule is required when reserves are taken');
        // mark that we have shown this error - dont show more than once
        reservesMissing = true;
      }
      // If rrs is required > sum of release reserve schedule should equal 100
      if (mainTerm.reserve && reservesIncluded && !reservesNot100) {
        let reservesCount = 0;
        contract.reserves.forEach((rrs) => {
          if (rrs) {
            reservesCount += rrs.rate;
          }
        });
        if (reservesCount !== 100) {
          contract.validationErrors.push('Sum of release reserve schedule should equal 100');
          // mark that we have shown this error - dont show more than once
          reservesNot100 = true;
        }
      }
      // channel in use in the terms need to exist in Settings
      if (mainTerm.channel && mainTerm.channel !== 'All' && !channelDistinctArray.includes(mainTerm.channel)) {
        channelDistinctArray.push(mainTerm.channel);
        const found = await contract.checkClientChannel(client, mainTerm.channel).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Channel(${mainTerm.channel}) in use in the terms is not defined in Client Settings`);
        }
      }
      // configuration in use in the terms need to exist in Settings
      if (mainTerm.configuration && mainTerm.configuration !== 'All' && !configurationDistinctArray.includes(mainTerm.configuration)) {
        configurationDistinctArray.push(mainTerm.configuration);
        const found = await contract.checkClientSet(client, mainTerm.configuration, 'configurations', 'Configuration').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Configuration(${mainTerm.configuration}) in use in the terms is not defined in Client Settings`);
        }
      }
      // price category in use in the terms need to exist in Settings
      if (mainTerm.priceCategory && mainTerm.priceCategory !== 'All' && !priceCategoryDistinctArray.includes(mainTerm.priceCategory)) {
        priceCategoryDistinctArray.push(mainTerm.priceCategory);
        const found = await contract.checkClientSet(client, mainTerm.priceCategory, 'priceCategories', 'Price Category').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Price Category(${mainTerm.priceCategory}) in use in the terms is not defined in Client Settings`);
        }
      }
      // cat group in use in the terms need to exist in Settings
      if (mainTerm.catalogueGroup && mainTerm.catalogueGroup !== 'All' && !catalogueGroupDistinctArray.includes(mainTerm.catalogueGroup)) {
        catalogueGroupDistinctArray.push(mainTerm.catalogueGroup);
        const found = await contract.checkClientSet(client, mainTerm.catalogueGroup, 'catalogueGroups', null).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Cat Group(${mainTerm.catalogueGroup}) in use in the terms is not defined in Client Settings`);
        }
      }
      // Escalation needs an escalation tracker set
      if (mainTerm.escalationTrackers?.length > 0) {
        mainTerm.escalationTrackers.forEach((escalationTracker) => {
          if (!escalationTrackerDistinctArray.includes(escalationTracker)) {
            escalationTrackerDistinctArray.push(escalationTracker);
            let escalationTrackingFound = false;
            if (isObjectPopulated(contract.escalationTracking)) {
              for (const key in contract.escalationTracking) {
                if (key === escalationTracker) {
                  escalationTrackingFound = true;
                }
              }
              if (!escalationTrackingFound) {
                contract.validationErrors.push(`Escalation(${escalationTracker}) needs an escalation tracker set`);
              }
            } else {
              contract.validationErrors.push(`Escalation(${escalationTracker}) needs an escalation tracker set`);
            }
          }
        });
      }
      // No two sales terms can have the same conditions
      const salesTermsSet = new Set(contract.salesTerms.map(JSON.stringify));
      let hasDuplicates = salesTermsSet.size < contract.salesTerms.length;
      if (hasDuplicates && !stDuplicate) {
        // mark that we have shown this error - dont show more than once
        stDuplicate = true;
        contract.validationErrors.push('No two sales terms should have the same conditions');
      }
      // No two mechanical terms can have the same conditions
      const mechanicalTermsSet = new Set(contract.mechanicalContractTerms.map(JSON.stringify));
      hasDuplicates = mechanicalTermsSet.size < contract.mechanicalContractTerms.length;
      if (hasDuplicates && !mtDuplicate) {
        // mark that we have shown this error - dont show more than once
        mtDuplicate = true;
        contract.validationErrors.push('No two mechanical terms should have the same conditions');
      }
    }
  }));
  // Validate Deduction Terms
  await Promise.all(contract?.deductionsTerms?.map(async (deductionsTerm) => {
    if (deductionsTerm) {
      // Royalty % required in each term
      if (!deductionsTerm.rate && deductionsTerm.rate !== 0 && !rateMissing) {
        contract.validationErrors.push('Royalty Rate % is required in each Term');
        rateMissing = true;
      }
      // Calculation input type required in each term - Defaults to 'Sales Input' so should not fire
      if (!deductionsTerm.deductionBasis && !basisMissing) {
        contract.validationErrors.push('Calculation Basis is required in each Deductions Term');
        basisMissing = true;
      }
      // If calculation type is unit rate, a unit rate value is required
      if (deductionsTerm.deductionBasis === 'Unit Rate' && !deductionsTerm.unitRate && deductionsTerm.unitRate !== 0 && !unitRateMissing) {
        contract.validationErrors.push('Unit Rate is required for all Unit Rate Terms');
        unitRateMissing = true;
      }
      // If calculation type is (fixed) unit rate, a unit rate value is required
      if (deductionsTerm.type === 'Fixed Unit Rate' && !deductionsTerm.unitRate && deductionsTerm.unitRate !== 0 && !unitRateMissing) {
        contract.validationErrors.push('Unit Rate is required for all (Fixed) Unit Rate Terms');
        unitRateMissing = true;
      }
      // channel in use in the terms need to exist in Settings
      if (deductionsTerm.channel && deductionsTerm.channel !== 'All' && !channelDistinctArray.includes(deductionsTerm.channel)) {
        channelDistinctArray.push(deductionsTerm.channel);
        const found = await contract.checkClientChannel(client, deductionsTerm.channel).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Channel(${deductionsTerm.channel}) in use in the terms is not defined in Client Settings`);
        }
      }
      // configuration in use in the terms need to exist in Settings
      if (deductionsTerm.configuration && deductionsTerm.configuration !== 'All' && !configurationDistinctArray.includes(deductionsTerm.configuration)) {
        configurationDistinctArray.push(deductionsTerm.configuration);
        const found = await contract.checkClientSet(client, deductionsTerm.configuration, 'configurations', 'Configuration').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Configuration(${deductionsTerm.configuration}) in use in the terms is not defined in Client Settings`);
        }
      }
      // price category in use in the terms need to exist in Settings
      if (deductionsTerm.priceCategory && deductionsTerm.priceCategory !== 'All' && !priceCategoryDistinctArray.includes(deductionsTerm.priceCategory)) {
        priceCategoryDistinctArray.push(deductionsTerm.priceCategory);
        const found = await contract.checkClientSet(client, deductionsTerm.priceCategory, 'priceCategories', 'Price Category').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Price Category(${deductionsTerm.priceCategory}) in use in the terms is not defined in Client Settings`);
        }
      }
      // cat group in use in the terms need to exist in Settings
      if (deductionsTerm.catalogueGroup && deductionsTerm.catalogueGroup !== 'All' && !catalogueGroupDistinctArray.includes(deductionsTerm.catalogueGroup)) {
        catalogueGroupDistinctArray.push(deductionsTerm.catalogueGroup);
        const found = await contract.checkClientSet(client, deductionsTerm.catalogueGroup, 'catalogueGroups', null).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Cat Group(${deductionsTerm.catalogueGroup}) in use in the terms is not defined in Client Settings`);
        }
      }
    }
  }));
  // Mechanical Deduction validation
  await Promise.all(contract?.mechanicalTerms?.map(async (mechanicalTerm) => {
    if (mechanicalTerm) {
      // Mechanical Deduction term needs a currency
      if (!mechanicalTerm.currency && !mtCurrencyMissing) {
        contract.validationErrors.push('Mechanical Deduction term needs a currency');
        mtCurrencyMissing = true;
      }
      // Royalty % required in each term
      if (!mechanicalTerm.rate && mechanicalTerm.rate !== 0 && !rateMissing) {
        contract.validationErrors.push('Royalty Rate % is required in each Term');
        rateMissing = true;
      }
      // Calculation input type required in each term
      if (!mechanicalTerm.type && !basisMissing) {
        contract.validationErrors.push('Calculation Basis is required in each Deduction Term');
        basisMissing = true;
      }
      // If calculation type is unit rate, a unit rate value is required
      if (mechanicalTerm.type === 'Unit Rate' && !mechanicalTerm.unitRate && mechanicalTerm.unitRate !== 0 && !unitRateMissing) {
        contract.validationErrors.push('Unit Rate is required for all Unit Rate Terms');
        unitRateMissing = true;
      }
      // If calculation type is (fixed) unit rate, a unit rate value is required
      if (mechanicalTerm.type === 'Fixed Unit Rate' && !mechanicalTerm.unitRate && mechanicalTerm.unitRate !== 0 && !unitRateMissing) {
        contract.validationErrors.push('Unit Rate is required for all (Fixed) Unit Rate Terms');
        unitRateMissing = true;
      }
      // If at least one term has a reserve % > reserve release schedule required
      if (!reservesMissing && mechanicalTerm.reserve && !reservesIncluded) {
        contract.validationErrors.push('Reserve release schedule is required when reserves are taken');
        // mark that we have shown this error - dont show more than once
        reservesMissing = true;
      }
      // If rrs is required > sum of release reserve schedule should equal 100
      if (mechanicalTerm.reserve && reservesIncluded && !reservesNot100) {
        let reservesCount = 0;
        contract.reserves.forEach((rrs) => {
          reservesCount += rrs.rate;
        });
        if (reservesCount !== 100) {
          contract.validationErrors.push('Sum of release reserve schedule should equal 100');
          // mark that we have shown this error - dont show more than once
          reservesNot100 = true;
        }
      }
      // channel in use in the terms need to exist in Settings
      if (mechanicalTerm.channel && mechanicalTerm.channel !== 'All' && !channelDistinctArray.includes(mechanicalTerm.channel)) {
        channelDistinctArray.push(mechanicalTerm.channel);
        const found = await contract.checkClientChannel(client, mechanicalTerm.channel).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Channel(${mechanicalTerm.channel}) in use in the terms is not defined in Client Settings`);
        }
      }
      // configuration in use in the terms need to exist in Settings
      if (mechanicalTerm.configuration && mechanicalTerm.configuration !== 'All' && !configurationDistinctArray.includes(mechanicalTerm.configuration)) {
        configurationDistinctArray.push(mechanicalTerm.configuration);
        const found = await contract.checkClientSet(client, mechanicalTerm.configuration, 'configurations', 'Configuration').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Configuration(${mechanicalTerm.configuration}) in use in the terms is not defined in Client Settings`);
        }
      }
      // price category in use in the terms need to exist in Settings
      if (mechanicalTerm.priceCategory && mechanicalTerm.priceCategory !== 'All' && !priceCategoryDistinctArray.includes(mechanicalTerm.priceCategory)) {
        priceCategoryDistinctArray.push(mechanicalTerm.priceCategory);
        const found = await contract.checkClientSet(client, mechanicalTerm.priceCategory, 'priceCategories', 'Price Category').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Price Category(${mechanicalTerm.priceCategory}) in use in the terms is not defined in Client Settings`);
        }
      }
      // cat group in use in the terms need to exist in Settings
      if (mechanicalTerm.catalogueGroup && mechanicalTerm.catalogueGroup !== 'All' && !catalogueGroupDistinctArray.includes(mechanicalTerm.catalogueGroup)) {
        catalogueGroupDistinctArray.push(mechanicalTerm.catalogueGroup);
        const found = await contract.checkClientSet(client, mechanicalTerm.catalogueGroup, 'catalogueGroups', null).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Cat Group(${mechanicalTerm.catalogueGroup}) in use in the terms is not defined in Client Settings`);
        }
      }
    }
  }));
  // Validate Withholding Tax Deduction Terms
  await Promise.all(contract?.withholdingTaxTerms?.map(async (withholdingTaxTerm) => {
    if (withholdingTaxTerm) {
      // Royalty % required in each term
      if (!withholdingTaxTerm.rate && withholdingTaxTerm.rate !== 0 && !rateMissing) {
        contract.validationErrors.push('Royalty Rate % is required in each Term');
        rateMissing = true;
      }
      // Calculation input type required in each term - Defaults to 'Percentage' so should not fire
      if (!withholdingTaxTerm.deductionBasis && !basisMissing) {
        contract.validationErrors.push('Calculation Basis is required in each Deductions Term');
        basisMissing = true;
      }
      // channel in use in the terms need to exist in Settings
      if (withholdingTaxTerm.channel && withholdingTaxTerm.channel !== 'All' && !channelDistinctArray.includes(withholdingTaxTerm.channel)) {
        channelDistinctArray.push(withholdingTaxTerm.channel);
        const found = await contract.checkClientChannel(client, withholdingTaxTerm.channel).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Channel(${withholdingTaxTerm.channel}) in use in the terms is not defined in Client Settings`);
        }
      }
      // configuration in use in the terms need to exist in Settings
      if (withholdingTaxTerm.configuration && withholdingTaxTerm.configuration !== 'All' && !configurationDistinctArray.includes(withholdingTaxTerm.configuration)) {
        configurationDistinctArray.push(withholdingTaxTerm.configuration);
        const found = await contract.checkClientSet(client, withholdingTaxTerm.configuration, 'configurations', 'Configuration').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Configuration(${withholdingTaxTerm.configuration}) in use in the terms is not defined in Client Settings`);
        }
      }
      // price category in use in the terms need to exist in Settings
      if (withholdingTaxTerm.priceCategory && withholdingTaxTerm.priceCategory !== 'All' && !priceCategoryDistinctArray.includes(withholdingTaxTerm.priceCategory)) {
        priceCategoryDistinctArray.push(withholdingTaxTerm.priceCategory);
        const found = await contract.checkClientSet(client, withholdingTaxTerm.priceCategory, 'priceCategories', 'Price Category').catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Price Category(${withholdingTaxTerm.priceCategory}) in use in the terms is not defined in Client Settings`);
        }
      }
      // cat group in use in the terms need to exist in Settings
      if (withholdingTaxTerm.catalogueGroup && withholdingTaxTerm.catalogueGroup !== 'All' && !catalogueGroupDistinctArray.includes(withholdingTaxTerm.catalogueGroup)) {
        catalogueGroupDistinctArray.push(withholdingTaxTerm.catalogueGroup);
        const found = await contract.checkClientSet(client, withholdingTaxTerm.catalogueGroup, 'catalogueGroups', null).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Cat Group(${withholdingTaxTerm.catalogueGroup}) in use in the terms is not defined in Client Settings`);
        }
      }
    }
  }));
  // Validate the Costs Terms
  await Promise.all(contract?.costsTerms?.map(async (costsTerm) => {
    if (costsTerm) {
      // Royalty % required in each term
      if (!costsTerm.rate && costsTerm.rate !== 0 && !rateMissing) {
        contract.validationErrors.push('Royalty Rate % is required in each Term');
        rateMissing = true;
      }
      // Calculation input type required in each term
      if (!costsTerm.type && !typeMissing) {
        contract.validationErrors.push('Calculation type required in each Term');
        typeMissing = true;
      }
      // channel in use in the terms need to exist in Settings
      if (costsTerm.type && costsTerm.type !== 'All' && !costTypeDistinctArray.includes(costsTerm.type)) {
        costTypeDistinctArray.push(costsTerm.type);
        const found = await contract.checkClientCostType(client, costsTerm.type).catch(logger.error);
        if (!found) {
          contract.validationErrors.push(`Cost Type(${costsTerm.type}) in use in the terms is not defined in Client Settings`);
        }
      }
      // Escalation needs an escalation tracker set
      if (costsTerm.escalationTrackers && costsTerm.escalationTrackers.length > 0) {
        costsTerm.escalationTrackers.forEach((escalationTracker) => {
          if (!escalationTrackerDistinctArray.includes(escalationTracker)) {
            escalationTrackerDistinctArray.push(escalationTracker);
            let escalationTrackingFound = false;
            if (isObjectPopulated(contract.escalationTracking)) {
              for (const key in contract.escalationTracking) {
                if (key === escalationTracker) {
                  escalationTrackingFound = true;
                }
              }
              if (!escalationTrackingFound) {
                contract.validationErrors.push(`Escalation(${escalationTracker}) needs an escalation tracker set`);
              }
            } else {
              contract.validationErrors.push(`Escalation(${escalationTracker}) needs an escalation tracker set`);
            }
          }
        });
      }
    }
  }));
  // If escalation is based on a tracker, that tracker needs to be assigned to at least one term.
  if (isObjectPopulated(contract.escalationTracking)) {
    for (const key in contract.escalationTracking) {
      if ({}.hasOwnProperty.call(contract.escalationTracking, key)) {
        let escalationTrackingFound = false;
        contract[mainTerms].forEach((mainTerm) => {
          if (mainTerm.escalationTrackers.includes(key)) {
            escalationTrackingFound = true;
          }
        });
        if (!escalationTrackingFound) {
          contract.costsTerms.forEach((costsTerm) => {
            if (costsTerm.escalationTrackers.includes(key)) {
              escalationTrackingFound = true;
            }
          });
        }
        if (!escalationTrackingFound) {
          contract.validationErrors.push(`Escalation Tracker(${key}) is not found in any Terms`);
        }
      }
    }
  }
  contract.valid = contract.validationErrors.length === 0;
};

/**
 * Validates subclient contract restrictions
 * @param {Object} contract - The contract document
 * @param {Object} previousContract - The previous state of the contract (for updates)
 * @returns {Array} Array of validation errors
 */
contractSchema.methods.validateSubclientRestrictions = function (existingContract) {
  if (!existingContract) {
    return [];
  }
  const contract = this.toObject();
  const existingContractObject = existingContract.toObject();
  const errors = [];

  const isCrossContractsModified = (currentCrossContracts, existingCrossContracts) => {
    // If lengths are different, they're definitely different
    if (currentCrossContracts.length !== existingCrossContracts.length) {
      return true;
    }

    // Compare each cross contract, ignoring updatedAt
    for (let i = 0; i < currentCrossContracts.length; i += 1) {
      const current = { ...currentCrossContracts[i] };
      const existing = { ...existingCrossContracts[i] };

      // Remove updatedAt from both objects for comparison
      delete current.updatedAt;
      delete existing.updatedAt;
      if (!_.isEqual(current, existing)) {
        return true;
      }
    }
    return false;
  };

  const isFieldModified = (fieldName) => {
    if (!existingContract) return false;

    // Special case for crossContracts - ignore updatedAt field
    if (fieldName === 'crossContracts') {
      const currentCrossContracts = contract[fieldName] || [];
      const existingCrossContracts = existingContractObject[fieldName] || [];
      return isCrossContractsModified(currentCrossContracts, existingCrossContracts);
    }
    return !_.isEqual(contract[fieldName], existingContractObject[fieldName]);
  };

  const restrictedFields = [
    { field: 'minPayout', message: 'The Minimum Payout was created as part of an automation and cannot be edited.' },
    { field: 'autoPayment', message: 'The Autopayment setting was created as part of an automation and cannot be changed.' },
    { field: 'accountingPeriod', message: 'The Accounting Period was created as part of an automation and cannot be edited.' },
    { field: 'active', message: 'The Active status was created as part of an automation and cannot be changed.' },
    { field: 'crossContracts', message: 'Cross Contracts were created as part of an automation and cannot be added.' },
    { field: 'deductWithholding', message: 'The Withholding Tax setting was created as part of an automation and cannot be changed.' },
    { field: 'autoPaymentConditions', message: 'Autopayment conditions were created as part of an automation and cannot be added.' },
    { field: 'summaryContractTotals', message: 'The Summary Contract Totals setting was created as part of an automation and cannot be changed.' },
    { field: 'currentBalance', message: 'Balance transfers were created as part of an automation and cannot be edited.' },
    { field: 'openingBalance', message: 'Balance transfers were created as part of an automation and cannot be edited.' },
    { field: 'payees', message: 'Payee details were created as part of an automation and cannot be updated.' },
    { field: 'salesTerms', message: 'These contract terms were created as part of an automation and cannot be edited.' },
    { field: 'mechanicalTerms', message: 'These contract terms were created as part of an automation and cannot be edited.' },
    { field: 'mechanicalContractTerms', message: 'These contract terms were created as part of an automation and cannot be edited.' },
    { field: 'withholdingTaxTerms', message: 'These contract terms were created as part of an automation and cannot be edited.' },
    { field: 'costsTerms', message: 'These contract terms were created as part of an automation and cannot be edited.' },
    { field: 'deductionsTerms', message: 'Deductions are inherited from the main contract and cannot be edited.' },
    { field: 'reserves', message: 'These contract terms were created as part of an automation and cannot be edited.' },
  ];

  restrictedFields.forEach((field) => {
    if (isFieldModified(field.field)) {
      errors.push(field.message);
    }
  });

  return errors;
};

contractSchema.pre('save', async function (next) {
  const contract = this;
  try {
    const previousContract = await Contract.findById(contract._id.toString());

    // TEMPORARILY DISABLED - subclient validation
    // If the contract is not from the LBA route, but has a subClientId
    // then we want to run the additional validation
    // if (!contract.fromLBAroute && contract.subClientId && previousContract) {
    //   const errors = contract.validateSubclientRestrictions(previousContract);
    //   if (errors.length > 0) {
    //     return next(new Error(errors.join(', ')));
    //   }
    // }
    contract.fromLBAroute = undefined;

    await ContractController.formatPayees({ contract });

    await contract.checkValidationErrors().catch(logger.error);

    if (!contract.payees?.length) { return next(); }

    if (!previousContract) { return next(); }

    // If payeeBalanceCondition is Never and payeeId has not changed, skip validation
    const previousPayees = previousContract?.payees.map((payee) => payee.payeeId);
    const previousPayeeBalanceCondition = previousContract?.payeeBalanceCondition;

    if (contract.payeeBalanceCondition === previousPayeeBalanceCondition && _.isEqual(contract.payees.map((payee) => payee.payeeId), previousPayees)) {
      return next();
    }

    for (const payee of contract.payees) {
      const foundPayee = await Payee.findById(payee.payeeId).catch(logger.error);
      if (foundPayee) {
        // Run re-validation for affected payee
        await foundPayee.checkValidationErrors(contract._id).catch(logger.error);
        await foundPayee.checkValidationUser(true).catch(logger.error);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

contractSchema.post('save', async (saved, next) => {
  const Payee = require('./payee');
  // handle successful save and re-validate Payee if payeeId exists
  if (saved.payees?.length) {
    for (const payee of saved.payees) {
      const foundPayee = await Payee.findById(payee.payeeId).catch(logger.error);
      if (foundPayee) {
        // Run re-validation for affected payee
        await foundPayee.checkValidationErrors().catch(logger.error);
        await foundPayee.checkValidationUser(true).catch(logger.error);
      }
    }
    next();
  } else {
    next();
  }
});

contractSchema.post('deleteOne', { document: true }, async (removed, next) => {
  // handle successful remove and re-validate Payee if payeeId existed
  if (removed.payeeBalanceCondition === 'Never') {
    const payee = await Payee.findById(removed.payees?.[0]?.payeeId).catch(logger.error);
    if (!payee) { return next(); }
    // Run re-validation for affected payee
    await payee.checkValidationErrors().catch(logger.error);
    await payee.checkValidationUser(true).catch(logger.error);
    next();
  } else {
    next();
  }
});

contractSchema.post('save', (err, saved, next) => {
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
  * Checks that an object is not empty.
  *
  * @method
  * @param {object} obj - Object to check
  * @returns {boolean} objectPopulated - Set to true if the object is empty
  */
function isObjectPopulated(obj) {
  let objectPopulated = false;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] !== '') objectPopulated = true;
    }
  }

  return objectPopulated;
}

const Contract = mongoose.model(name, contractSchema);

module.exports = Contract;
