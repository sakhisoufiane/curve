/**
 * @module client
 */
const { logger, BigQuery, fileManager, createXlsx, Wise, encryption, configShared } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { Client: { name, schema } } = require('@curveroyaltysystems/models');
const BigQueryDataTransfer = require('@google-cloud/bigquery-data-transfer');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const moment = require('moment');
const async = require('async');
const ContractTermGroup = require('../contractTermGroup');
const Parent = require('../parent');
const modelHistory = require('../../libs/modelHistory');
const SendEmail = require('../../libs/sendEmail');

const isProduction = process.env.environmentName === 'Production';

const clientSchema = schema;

/**
 * Checks the salesFtpIngestions Array for valid IP or FQDN.
 *
 *
 * @method
 * @param {array} salesFtpIngestions - The error to format.
 * @param {function(string)} callback - The callback that handles the response.
 */

function checkFtpIngestions(ftpIngestions) {
  const invalidFTP = [];
  ftpIngestions.forEach((ftpIngestion) => {
    let hostValid = false;
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ftpIngestion.host)) {
      // valid IP address
      hostValid = true;
    } else if (/(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9_-]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}$)/.test(ftpIngestion.host)) {
      // valid FQDN
      hostValid = true;
    }

    let directoryValid = true;
    if (ftpIngestion.directory && ftpIngestion.directory[0] !== '/') {
      directoryValid = false;
    }

    if (!hostValid || !directoryValid) {
      let error = '';
      if (ftpIngestion.name || ftpIngestion.host) {
        error = `${ftpIngestion.name || ftpIngestion.host} - `;
      }
      if (!hostValid) {
        error += 'invalid host, ';
      }
      if (!directoryValid) {
        error += 'invalid directory, ';
      }
      error = error.slice(0, -2);
      invalidFTP.push(error);
    }
  });
  return invalidFTP;
}

clientSchema.pre('save', function (next) {
  this.markModified('releaseMappings');
  this.markModified('trackMappings');
  this.markModified('workMappings');

  const client = this;

  const alphaNumericName = alphaNumericOnly(this.name) + process.env.environmentName;

  if (this.name && this.bigQueryDataset === undefined) {
    this.bigQueryDataset = alphaNumericName;
  }
  if (this.name && isProduction && (this.bigQueryBackupsDataset === undefined || this.bigQueryBackupsDataset === null)) {
    this.bigQueryBackupsDataset = `${alphaNumericName}Backups`;
  }
  if (this.name && this.bigQuerySalesTable === undefined) {
    this.bigQuerySalesTable = `${alphaNumericName}Sales`;
  }
  if (this.name && this.bigQueryPeriodSales === undefined) {
    this.bigQueryPeriodSales = `${alphaNumericName}PeriodSales`;
  }
  if (this.name && this.bigQueryAccountingPeriodSales === undefined) {
    this.bigQueryAccountingPeriodSales = `${alphaNumericName}AccountingPeriodSales`;
  }
  if (this.name && this.bigQueryPeriodCosts === undefined) {
    this.bigQueryPeriodCosts = `${alphaNumericName}PeriodCosts`;
  }

  if (!this.encryptionKey) {
    const key = encryption.encryptionUtils.createKey();
    this.encryptionKey = encryption.encryptionUtils.encryptKey(key);
  }

  // Ensure each flag is a boolean, true if true else false
  if (Array.isArray(client.inheritCatalogueFrom)) {
    client.inheritCatalogueFrom.forEach((obj) => {
      obj.transferPayees = !!obj.transferPayees;

      obj.transferPublishers = !!obj.transferPublishers;

      obj.transferReleases = !!obj.transferReleases;

      obj.transferTracks = !!obj.transferTracks;

      obj.transferWorks = !!obj.transferWorks;
    });
  }
  const filteredDeliveryEmails = client.deliveryEmails.map((email) => email._id).filter((id) => id && id); // Filter out null, undefined, and empty strings to avoid Cast Error issues (ref: SUP-454)
  client.deliveryEmails = filteredDeliveryEmails;

  async.parallel([
    function (callback) {
      if (client.isNew) {
        if (client.paymentTier !== 'Lite') {
          client.features.fixedReports = true;
        } else {
          client.features.partnerChains = false;
        }
        if (client.parentId) {
          Parent.findById(client.parentId)
            .then((parent) => {
              if (parent) {
                client.distributionChannels = parent.distributionChannels;
                client.configurations = parent.configurations;
                client.priceCategories = parent.priceCategories;
                client.costTypes = parent.costTypes;
                client.accountingPeriodTypes = parent.accountingPeriodTypes;
                client.payeeTypes = parent.payeeTypes;
                client.contractTypes = parent.contractTypes;
              }
              callback();
            })
            .catch((err) => {
              logger.error(`Error finding parent with parent id '${client.parentId}': ${err}`);
              callback();
            });
        } else {
          if (client.clientType === 'Label' || client.clientType === 'Distributor') {
            client.distributionChannels = ['Digital', 'Physical', 'Performance', 'Licensing', 'Sync', 'Merchandise', 'Other'];
            client.configurations = ['CD', 'DVD', 'LP', '12"', '10"', '7"', 'Download', 'Premium Stream', 'Ad-Funded Stream', 'Video Premium Stream', 'Video Ad-Funded Stream', 'Ringtone', 'Performance', 'Sync', 'Other'];
            client.priceCategories = ['Full Price', 'Mid Price', 'Budget'];
            client.costTypes = ['Artwork', 'Distribution', 'Marketing', 'Merchandise', 'Other', 'Production', 'Promo', 'Recording', 'Tour', 'Video', 'Postage'];
            client.accountingPeriodTypes = ['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly'];
            // Override any Lite setups
            if (client.paymentTier === 'Lite') {
              client.configurations = ['CD', 'DVD', 'LP', '12"', '10"', '7"', 'Book', 'Cassette', 'Download', 'Stream', 'Video Stream', 'Ringtone', 'Performance', 'Sync', 'Other'];
            }
          } else if (client.clientType === 'Publisher') {
            client.distributionChannels = ['Performance', 'Mechanical', 'Sync', 'Print', 'Other'];
            client.configurations = ['Television', 'Radio', 'Broadcasting', 'Public', 'Live', 'Online', 'Cover', 'Karaoke', 'Cinema', 'Physical', 'Download', 'Streaming', 'Video', 'Ringtone', 'Game', 'Advert', 'Film', 'Writer Procured', 'Performance', 'Mechanical', 'Sync', 'Sheet', 'Other'];
          }
          callback();
        }
      } else {
        callback();
      }
    },
    function (callback) {
      if (!client.createdBigQueryTables) {
        client.createBigQueryTables(callback);
      } else {
        callback();
      }
    },
    // Initialse backup snapshots for new clients on Production only
    function (callback) {
      if (!client.createdBigQueryBackups && isProduction) {
        logger.info(`Attempting to initialise BQBackup Dataset: ${client.bigQueryBackupsDataset}`);
        client.createBigQueryBackups(callback);
      } else {
        callback();
      }
    },
    // Validate Catalogue FTP settings
    function (callback) {
      if (client?.ftpHost || client?.ftpRootDir) {
        const invalidFTP = checkFtpIngestions([{
          host: client.ftpHost, directory: client.ftpRootDir,
        }]);
        if (invalidFTP.length > 0) {
          const invalidFTPError = invalidFTP.reduce((err, curVal) => err.concat(`'${curVal}' - `), '').slice(0, -3);
          callback(new Error(`Catalogue FTP server is invalid - ${invalidFTPError}`));
        } else {
          callback();
        }
      } else {
        callback();
      }
    },
    // Validate Sales FTP settings
    function (callback) {
      const invalidFTP = checkFtpIngestions(client.salesFtpIngestions);
      if (invalidFTP.length > 0) {
        const invalidFTPError = invalidFTP.reduce((err, curVal) => err.concat(`'${curVal}' - `), '').slice(0, -3);
        callback(new Error(`Sales FTP server is invalid - ${invalidFTPError}`));
      } else {
        callback();
      }
    },
    // Validate ACK FTP settings
    function (callback) {
      const invalidFTP = checkFtpIngestions(client.ackFtpIngestions);
      if (invalidFTP.length > 0) {
        const invalidFTPError = invalidFTP.reduce((err, curVal) => err.concat(`'${curVal}' - `), '').slice(0, -3);
        callback(new Error(`Acknowledgement FTP server is invalid - ${invalidFTPError}`));
      } else {
        callback();
      }
    },
    // Validate Currencies
    function (callback) {
      const clientCurrencies = [client.homeCurrency, client.currency2, client.currency3, client.currency4];
      const filteredCurrencies = clientCurrencies.filter(Boolean);
      const checkCurrencyDuplicates = new Set(filteredCurrencies).size !== filteredCurrencies.length;
      if (checkCurrencyDuplicates) {
        callback(new Error('You cannot save duplicate currencies'));
      } else {
        callback();
      }
    },
    // Validate Client Configurations
    function (callback) {
      ContractTermGroup.find({ clientId: client._id })
        .then((groups) => {
          // Helper to check if "all" is in any of the client's arrays
          const arrays = [
            client.catalogueGroups,
            client.priceCategories,
            client.costTypes,
            client.distributionChannels,
            client.sources,
            client.configurations,
          ];
          const hasAll = arrays.some((arr) => arr.map((v) => v.toLowerCase()).includes('all'));
          if (hasAll) {
            return callback(new Error(
              'Invalid configuration: The term "All" is not allowed. Please remove it from your client configuration',
            ));
          }

          // Now check each ContractTermGroup
          for (const group of groups) {
            const nameLower = group.name.toLowerCase();

            // Immediately fail if the name is "all"
            if (nameLower === 'all') {
              return callback(new Error(
                'Invalid configuration: The term "All" is not allowed. Please remove it from your client configuration',
              ));
            }

            // Determine which array to check based on the group type
            let checkArray;
            let checkString;
            switch (group.type) {
              case 'Distribution Channel':
                checkArray = client.distributionChannels;
                checkString = 'Distribution Channel';
                break;
              case 'Catalogue Group':
                checkArray = client.catalogueGroups;
                checkString = 'Catalogue Group';
                break;
              case 'Price Category':
                checkArray = client.priceCategories;
                checkString = 'Price Category';
                break;
              case 'Cost Type':
                checkArray = client.costTypes;
                checkString = 'Cost Type';
                break;
              case 'Source':
                checkArray = client.sources;
                checkString = 'Source';
                break;
              case 'Configuration':
                checkArray = client.configurations;
                checkString = 'Configuration';
                break;
              default:
                checkArray = [];
            }
            // Check if the group name already exists in the relevant array
            if (checkArray.map((item) => item.toLowerCase()).includes(nameLower)) {
              return callback(new Error(
                `The provided name: ${group.name} is disallowed as it either matches a reserved term or a term used as an existing configuration in your ${checkString}`,
              ));
            }
          }

          // If we get here, no conflicts were found
          return callback(null);
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    },
  ], next);
});

clientSchema.plugin(modelHistory, { mongoose, name: 'clientPatches', useArchive: true, removePatches: true, encryptedFields: configShared.encryptedFields.client });

// Encryption plugin has to be inserted after all .pre('save') hooks and before all .post('save') hooks
clientSchema.plugin(encryption.encryptionPlugin, {
  encryptedFields: configShared.encryptedFields.client,
});

clientSchema.post('save', (err, saved, next) => {
  // Handle error messages
  if (err) {
    logger.error(err);
    errorMessages(err, (newError, showToUser) => {
      const error = new Error(newError);
      error.showToUser = showToUser;
      next(error);
    });
  } else {
    next();
  }
});

clientSchema.post('init', (client) => {
  if (client.logo) {
    fileManager.publicS3Link(client.logo, (err, link) => {
      client.publicLogo = link;
    });
  }
});

clientSchema.plugin(mongoosePaginate);

/**
 * Formats an error message to a human readable format.
 *
 * Calls callback(newMessages) with the formatted error [newMessages].
 *
 * @method
 * @param {object} err - The error to format.
 * @param {function(string)} callback - The callback that handles the response.
 */

function errorMessages(err, callback) {
  if (err?.message) {
    let showToUser = true;
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('name: Path `name` is required')) {
        return 'A Name is required';
      }

      if (message.includes('index: name_1 dup key')) {
        return 'A client with the same name exists already in the database';
      }

      showToUser = false;
      return message;
    }).join(', ');
    callback(newMessages, showToUser);
  } else {
    callback();
  }
}

/**
 * Creates BigQuery tables for a new client.
 *
 * Calls callback(err) with the [err] if an error occurs.
 *
 * @method
 * @param {function(string)} callback - The callback that handles the response.
 */

clientSchema.methods.createBigQueryTables = function (callback) {
  const client = this;
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset });

  bigQuery.datasetExists(client.bigQueryDataset, (err, exists) => {
    if (err) {
      logger.error(err);
      callback(err);
    } else if (exists) {
      client.bigQueryDataset += moment().format('X');
      client.createBigQueryTables(callback);
    } else {
      bigQuery.createDataset(client.bigQueryDataset, (err, datasetName) => {
        async.series([
          function (cb) {
            bigQuery.createTable(client.bigQuerySalesTable, bigQuery.inputSchema, 'partitionNo', cb);
          },
          function (cb) {
            bigQuery.createTable(client.bigQueryPeriodSales, bigQuery.outputSchema, 'contractPartitionNo', cb);
          },
          function (cb) {
            bigQuery.createTable(client.bigQueryAccountingPeriodSales, bigQuery.accountingSchema, 'partitionNo', cb);
          },
          function (cb) {
            bigQuery.createTable(client.bigQueryPeriodCosts, bigQuery.costsSchema, null, cb);
          },
        ], (err) => {
          if (err) {
            callback(err);
          } else {
            client.createdBigQueryTables = true;
            callback();
          }
        });
      });
    }
  });
};

/**
 * Creates BigQuery backupos dataset for a new client.
 *
 * Calls callback(err) with the [err] if an error occurs.
 *
 * @method
 * @param {function(string)} callback - The callback that handles the response.
 */

clientSchema.methods.createBigQueryBackups = function (callback) {
  const client = this;
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset });
  // Start by creating the backups dataset
  bigQuery.datasetExists(client.bigQueryBackupsDataset, (err, exists) => {
    if (err) {
      logger.error(err);
      callback(err);
    } else if (exists) {
      client.bigQueryBackupsDataset += moment().format('X');
      client.createBigQueryBackups(callback);
    } else {
      bigQuery.createDataset(client.bigQueryBackupsDataset, (err) => {
        if (err) {
          callback(err);
        } else {
          // Backups dataset created, create the scheduled backup queries.
          logger.info(`Created BQBackup Dataset: ${client.bigQueryBackupsDataset}`);
          createScheduledBackupQueries(client)
            .then(() => {
              // Scheduled backup queries created
              client.createdBigQueryBackups = true;
              logger.info(`Created BQBackup schedules: ${client.name}`);
              callback();
            })
            .catch((err) => {
              logger.error(`Errored on BQBackup schedules: ${client.name} :  ${err}`);
              callback(err);
            });
        }
      });
    }
  });
};

/**
 * Creates BigQuery backup queries for the client tables.
 *
 *
 * @method
 * @param {object} client - The client we're creating backups for.
 */

const createScheduledBackupQueries = async (client) => {
  const bgClientOptions = { credentials: { private_key: process.env.BQ_backup_private_key ? process.env.BQ_backup_private_key.replace(/\\n/g, '\n') : '', client_email: process.env.BQ_backup_client_email } };
  const bqClient = new BigQueryDataTransfer.v1.DataTransferServiceClient(bgClientOptions);

  const projectId = process.env.BQ_project_id;

  logger.info(`Creating BigQuery scheduled queries for ${client.name}..`);

  // List of tables to backup
  const tables = [
    { value: 'bigQuerySalesTable', label: 'Sales Table' },
    { value: 'bigQueryPeriodSales', label: 'Period Sales Table' },
    { value: 'bigQueryAccountingPeriodSales', label: 'Accounting Table' },
    { value: 'bigQueryPeriodCosts', label: 'Costs Table' },
  ];

  // List of backups schedules and their expiry date
  const periods = [
    { value: 'every monday 01:00', label: 'Weekly', expires: '183' },
    { value: '1 of month 01:00', label: 'Monthly', expires: '730' },
  ];

  // Create the scheduled queries
  for (const period of periods) {
    for (const table of tables) {
      // eslint-disable-next-line no-await-in-loop
      await bqClient.createTransferConfig({
        parent: `projects/${projectId}/locations/europe`,
        transferConfig: {
          dataSourceId: 'scheduled_query',
          displayName: `${period.label} backup for ${client.name} - ${table.label}`,
          name: `${client._id.toString()}.${table.value}.${period.label.toLowerCase()}`,
          schedule: period.value,
          params: {
            fields: {
              query: {
                stringValue: `
                DECLARE
                  formatted_date STRING;
                SET
                  formatted_date = FORMAT_DATE("%d-%m-%Y", CURRENT_TIMESTAMP());
                EXECUTE IMMEDIATE
                  FORMAT("CREATE SNAPSHOT TABLE \`curve-1578825897852.${client.bigQueryBackupsDataset}.${table.value}-${period.label.toLowerCase()}-%s\` CLONE \`curve-1578825897852.${client.bigQueryDataset}.${client[table.value]}\` OPTIONS (expiration_timestamp = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL ${period.expires} DAY))", formatted_date)
                `,
              },
            },
          },
        },
      });
    }
  }
};

/**
 * Updates a client's BigQuery tables schemas.
 *
 * Calls callback(err) with the [err] if an error occurs.
 *
 * @method
 * @param {function(string)} callback - The callback that handles the response.
 */

clientSchema.methods.updateBigQuerySchemas = function (callback) {
  const client = this;
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset });
  async.series([
    function (cb) {
      bigQuery.updateSchema(client.bigQuerySalesTable, bigQuery.inputSchema, cb);
    },
    function (cb) {
      bigQuery.updateSchema(client.bigQueryPeriodSales, bigQuery.outputSchema, cb);
    },
    function (cb) {
      bigQuery.updateSchema(client.bigQueryPeriodCosts, bigQuery.costsSchema, cb);
    },
  ], callback);
};

/**
 * Checks if the supplied user is forbidden from accessing the Client data
 *
 * @method
 * @param {object} user - The user object
 * @param {string} readWrite - Supplied as either "read" or "write" to check for "read" or "write" access
 * @returns {boolean} Returns false if user is allowed access, true if not
 */

clientSchema.methods.userForbidden = function (user) {
  // allow monitoring users to copy clients (use in typeahead)
  if (user.internal || user.monitoring) {
    // Internal User
    return false;
  } if (this.parentId && user.parentId === this.parentId) {
    // Parent User of Client
    return false;
  } if (user.clientId === this._id.toString() && !user.payeeId) {
    // Client itself
    return false;
  }
  return true;
};

/**
 * Returns a Client's parent.
 *
 * Calls callback(err, parent) with the [err] if an error occurs and the found [parent].
 *
 * @method
 * @param {function(string, object)} callback - The callback that handles the response.
 */

clientSchema.methods.getParent = function (callback) {
  if (this.parentId) {
    Parent.findById(this.parentId)
      .then((parent) => {
        callback(null, parent);
      })
      .catch((err) => {
        callback(err);
      });
  } else {
    callback();
  }
};

/**
 * Returns the Client's contracts' labels.
 *
 * Calls callback(err, parent) with the [err] if an error occurs and the labels [mapping].
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */

clientSchema.methods.contractLabels = function (callback) {
  const Contract = require('../contract');
  // Get contracts associated with client
  Contract.find({ clientId: this._id.toString() }, { name: 1, labels: 1 })
    .then((contracts) => {
      // Setup mappings object to return
      const mappings = {};
      // Loop through contracts
      contracts.forEach((contract) => {
        // Set Contract ID
        mappings[contract._id.toString()] = contract._id.toString();
        // Set Contract Name
        mappings[contract.name.replace(/\./g, '')] = contract._id.toString();
        // Loop through labels
        contract.labels.forEach((label) => {
          if (label) {
            // Add label name to contract
            mappings[label.replace(/\./g, '')] = contract._id.toString();
          }
        });
      });
      callback(null, mappings);
    })
    .catch((err) => {
      logger.error(`Error getting Contracts labels for contractLabels with clientId ${this._id.toString()}: ${err}`);
      // @Arjun: Do we need to return an error here?
      callback(null, {});
    });
};

/**
 * Flushes the Client's catalogue.
 *
 * Calls callback(err, client) with the [err] if an error occurs and the saved [client].
 *
 * @method
 * @param {function(string, object)} callback - The callback that handles the response.
 */

clientSchema.methods.flushCatalogue = function (callback) {
  const Release = require('../release');
  const client = this;
  const limit = 1000;
  async.waterfall([
    function (cb) {
      // Get Releases Total
      Release.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          cb(null, count);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (releasesCount, cb) {
      // Chunk through releases setting the values to the client
      const rounds = listFromNumber(Math.floor(releasesCount / limit));
      async.eachSeries(rounds, (round, loopCb) => {
        logger.info(`Flushing Catalogue - Round: ${round * limit}`);
        Release.find({ clientId: client._id.toString() }, '_id catNo barcode aliases')
          .limit(limit)
          .skip(round * limit)
          .then((releases) => {
            async.eachSeries(releases, (release, releaseCb) => {
              release.runClientMappings(client, releaseCb);
            }, loopCb);
          })
          .catch((err) => {
            logger.error(`Error flushing Catalogue for client ${client._id.toString()}: ${err}`);
            // @Arjun: Do we need to callback an error here?
            loopCb();
          });
      }, cb);
    },
    function (cb) {
      // Save the client
      client.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(`Error saving client after flushing Catalogue for client ${client._id.toString()}: ${err}`);
          cb(err);
        });
    },
  ], (err) => {
    if (err) { logger.error(err); }
    if (callback) { callback(err); }
  });
};

/**
  * Sends an export of the Client data by email.
  *
  * @method
  * @param {object} filter - The Client filter object.
  * @param {object} curveUser - The User sending the export.
  */

clientSchema.statics.sendExport = function (filter, curveUser) {
  Client.findById(curveUser.clientId)
    .then((client) => {
      async.waterfall([
        function (cb) {
          Client.createExportXlsx(filter, cb);
        },
        function (filePath, cb) {
          Client.findById(curveUser.clientId)
            .then((client) => {
              fileManager.uploadToS3(`exports/Client Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
            })
            .catch((err) => {
              logger.error(`Error finding client in sendExport with clientId ${curveUser.clientId}: ${err}`);
              cb(err);
            });
        },
        function (key, cb) {
          fileManager.publicLink24Hours(key, cb);
        },
        function (link, cb) {
          // Send Email to User
          SendEmail.exportDownload(curveUser, client, 'Your Client Export is Ready to Download', link, cb);
        },
      ], (err) => {
        if (err) {
          logger.info(err);
          SendEmail.exportError(curveUser, client, 'Your Client Export Has Errored', err);
        }
      });
    })
    .catch((err) => {
      logger.error(err);
    });
};

/**
  * Exports the Client data to an Excel file.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the excel file.
  *
  * @method
  * @param {object} filter - The Client filter object.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

clientSchema.statics.createExportXlsx = function (filter, callback) {
  async.waterfall([
    function (cb) {
      Client.find(filter)
        .then((clients) => {
          cb(null, clients);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (clients, cb) {
      Client.convertClientsForXlsx(clients, cb);
    },
    function (data, cb) {
      Exports.getTemplate({ Client, templateName: 'client' }).then((template) => {
        createXlsx.createInTemplate([data], template, cb);
      });
    },
  ], callback);
};

/**
  * Formats mulitple Clients for the Excel export.
  *
  * Calls callback(err, convertedClients) with an [err] if an error occurs and the [convertedClients].
  *
  * @method
  * @param {object[]} clients - The Releases to format.
  * @param {function(string, array[])} callback - The callback that handles the response.
  */

clientSchema.statics.convertClientsForXlsx = function (clients, callback) {
  if (!Array.isArray(clients)) {
    callback(new Array('Must be passed an Array of Clients'), null);
    return;
  }

  try {
    // Get Big Query Amounts
    const bigQuery = new BigQuery({});
    const minusMonth = new Date();
    minusMonth.setMonth(minusMonth.getMonth() - 1);

    const query = `SELECT SUM(size) as size, table 
      FROM \`QueryLogs.QueryLogsA\` 
      WHERE timestamp > TIMESTAMP("${moment(minusMonth).format('YYYY-M-D')} 00:00:00") 
      AND timestamp < TIMESTAMP("${moment().format('YYYY-M-D')} 00:00:00") 
      GROUP BY table`;

    const labels = {
      job_type: 'client_export',
    };

    bigQuery.queryJobPromise({ query, labels })
      .then((result) => {
        // Convert to object
        const usageByTable = {};
        result.forEach((item) => {
          usageByTable[item.table] = item.size;
        });
        const convertedClients = [];
        async.eachLimit(clients, 100, (client, cb) => {
          client.exportData(usageByTable, (err, data) => {
            convertedClients.push(data);
            cb();
          });
        }, (err) => {
          if (err) {
            callback(err, null);
          } else {
            callback(null, convertedClients);
          }
        });
      })
      .catch((err) => callback(err));
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
 * Returns an array of the Client data to export.
 *
 * Calls callback(err, clientData) with an [err] if an error occurs and the [clientData].
 *
 * @method
 * @param {object} usageByTable - Object for the Client's usage by table.
 * @param {function(string, array)} callback - The callback that handles the response.
 */

clientSchema.methods.exportData = function (usageByTable, callback) {
  const Billing = require('../../libs/billing');
  const Contract = require('../contract');
  const Track = require('../track');
  const Work = require('../work');
  const Release = require('../release');
  const SalesFile = require('../salesFile');
  const Period = require('../period');
  const Invoice = require('../invoice');
  const client = this;
  let clientData = [client.name, client.primaryEmail, client.paymentTier, client.notes, moment(client.createdAt).format('DD/MM/YYYY')];
  let contractTotal = 0;
  let salesFileLines = 0;
  let salesFileLinesReported = 0;
  let salesFileNetAmount = 0;
  let salesFileHomeCurrencyNetAmount = 0;
  let periodGrossAmount = 0;
  let periodNetAmount = 0;
  let catalogueTotal = 0;
  // additions to export - put at end of export
  let subscriptionStatus = '';
  let invoiceAmount = '';
  let invoiceDate = '';
  let cardOnFile;
  async.waterfall([
    function (cb) {
      let parent;
      Parent.findById(client.parentId)
        .then((foundParent) => {
          parent = foundParent;
        })
        .catch((err) => {
          logger.error(`Error finding parent in exportData for client ${client._id.toString()}`, err);
        })
        .finally(() => {
          clientData.push(parent ? parent.name : '');
          cb();
        });
    },
    function (cb) {
      // get total count of all contracts
      Contract.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          clientData.push(count);
          contractTotal = count;
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting contracts in exportData for client ${client._id.toString()}`, err);
          // It seems bad we are not handling errors here, adding undefined to maintain index integrity
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      // get total count of all non Mechanical contracts
      Contract.countDocuments({ clientId: client._id.toString(), contractType: { $ne: 'Mechanical' } })
        .then((count) => {
          clientData.push(count);
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting non Mechanical contracts in exportData for client ${client._id.toString()}`, err);
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      // get total count of all non Active non Mechanical contracts
      Contract.countDocuments({ clientId: client._id.toString(), contractType: { $ne: 'Mechanical' }, active: { $eq: true } })
        .then((count) => {
          clientData.push(count);
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting non Active non Mechanical contracts in exportData for client ${client._id.toString()}`, err);
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      // get total count of all Mechanical contracts
      Contract.countDocuments({ clientId: client._id.toString(), contractType: 'Mechanical' })
        .then((count) => {
          clientData.push(count);
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting Mechanical contracts in exportData for client ${client._id.toString()}`, err);
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      // get total count of all Active Mechanical contracts
      Contract.countDocuments({ clientId: client._id.toString(), contractType: 'Mechanical', active: { $eq: true } })
        .then((count) => {
          clientData.push(count);
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting Active Mechanical contracts in exportData for client ${client._id.toString()}`, err);
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      Track.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          clientData.push(count);
          catalogueTotal += count;
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting Tracks in exportData for client ${client._id.toString()}`, err);
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      Work.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          clientData.push(count);
          catalogueTotal += count;
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting Works in exportData for client ${client._id.toString()}`, err);
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      Release.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          clientData.push(count);
          catalogueTotal += count;
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting Releases in exportData for client ${client._id.toString()}`, err);
          clientData.push(undefined);
          cb();
        });
    },
    function (cb) {
      // get some sales file totals for the export
      SalesFile.find({ clientId: client._id.toString() })
        .then((salesFiles) => {
          if (salesFiles.length > 0) {
            // get a total of all sales file lines associated with this client
            salesFileLines = salesFiles?.reduce((totalLines, salesFile) => totalLines + (salesFile.lines || 0), 0);
            // get a total of all sales file lines reported associated with this client
            salesFileLinesReported = salesFiles?.reduce((totalReportedLines, salesFile) => totalReportedLines + (salesFile.reportedLines || 0), 0);
            // get a total of all sales file net amounts associated with this client
            salesFileNetAmount = salesFiles?.reduce((totalNetAmount, salesFile) => totalNetAmount + (salesFile.netAmount || 0), 0);
            // get a total of all salesfile lines net amounts with this client, in the clients home currency
            salesFileHomeCurrencyNetAmount = salesFiles?.reduce((totalHomeCurrencyNetAmount, salesFile) => totalHomeCurrencyNetAmount + (salesFile.homeCurrencyNetAmount || 0), 0);
          }
          clientData.push(salesFileLines);
          clientData.push(salesFileLinesReported);
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting SalesFiles in exportData for client ${client._id.toString()}`, err);
          // It seems bad we are not handling errors here, adding undefined to maintain index integrity
          clientData.push(salesFileLines);
          clientData.push(salesFileLinesReported);
          cb();
        });
    },
    function (cb) {
      // get the latest invoice to get amount and date
      Invoice.findOne({ clientId: client._id.toString() }, 'date usage', { sort: { date: -1 }, limit: 1 })
        .then((invoice) => {
          if (invoice) {
            invoiceAmount = invoice.usage.amount + invoice.usage.vat;
            invoiceDate = moment(invoice?.date).format('DD/MM/YYYY');
          }
          cb();
        })
        .catch((err) => {
          logger.error(`Error getting latest Invoice in exportData for client ${client._id.toString()}`, err);
          cb();
        });
    },
    function (cb) {
      if (client.billing?.stripePaymentMethod) {
        const options = { skipGettingCustomerId: true };
        Billing.retrievePaymentMethod(client, options)
          .then((returnedCard) => {
            cardOnFile = returnedCard;
            cb();
          })
          .catch(cb);
      } else {
        cb();
      }
    },
    function (cb) {
      const minimumCreatedDate = moment().subtract(client.trialDays || 14, 'days').format();
      // is the user within the trial period
      const userIsInTrial = client.billing?.billingType === 'Card'
                                    && !client.billing?.stripePaymentMethod
                                    && !client.billing?.lastPaymentDate
                                    && moment(client.createdAt).isSameOrAfter(minimumCreatedDate);
      if (client.billing?.billingType === 'Invoice') {
        subscriptionStatus = 'Invoice';
      } else if (client.billing?.billingType === 'Card') {
        if (userIsInTrial) {
          // It is during the trial period
          subscriptionStatus = 'Trial';
        } else if (cardOnFile?.card) {
          // It is after the trial period, and there is a card on file
          const month = (`0${cardOnFile?.card.exp_month}`).slice(-2);
          const exp = `${cardOnFile?.card.exp_year}-${month}`;
          // If the card expires this month
          if (moment(exp).startOf('month').isSame(moment().startOf('month'))) {
            subscriptionStatus = 'Card Expires This Month';
          } else if (moment(exp).endOf('month').isSameOrAfter(moment())) {
            // If the card expires after the end of this month
            subscriptionStatus = 'Paying';
          } else {
            // The card has already expired
            subscriptionStatus = 'Card Expired';
          }
        } else {
          // If no card is on file
          subscriptionStatus = 'Expired';
        }
      } else {
        // If Billing Type is not Invoice or Card
        subscriptionStatus = '';
      }
      cb();
    },
    function (cb) {
      // get some period totals for the export
      Period.find({ clientId: client._id.toString() })
        .then((periods) => {
          if (periods.length > 0) {
            // get a total of all period gross amounts associated with this client
            periodGrossAmount = periods?.reduce((totalGrossAmount, period) => totalGrossAmount + (period.grossAmount || 0), 0);
            // get a total of all period net amounts associated with this client
            periodNetAmount = periods?.reduce((totalNetAmount, period) => totalNetAmount + (period.netAmount || 0), 0);
          }
          cb();
        })
        .catch((err) => {
          logger.error(`Error counting Periods in exportData for client ${client._id.toString()}`, err);
          cb();
        });
    },
  ], (err) => {
    const thresholds = [client.contractCap, client.catalogueCap, client.contractOverages, client.catalogueOverages, client.overagesFee, client.overagesCount, client.fees, client.currency, client.homeCurrency, client.billingFrequency, client.calculationFrequency, client.batchWorkers, client.concurrentCalculations, client.concurrentStatementCreations];
    clientData = clientData.concat(thresholds);
    clientData.push(contractTotal > client.contractCap);
    clientData.push(catalogueTotal > client.catalogueCap);
    // Get table data for client, measured in bytes
    let tableData = 0;
    tableData += usageByTable[client.bigQuerySalesTable] ? usageByTable[client.bigQuerySalesTable] : 0;
    tableData += usageByTable[client.bigQueryPeriodSales] ? usageByTable[client.bigQueryPeriodSales] : 0;
    tableData /= 1000000000000;
    clientData.push(tableData);
    clientData.push(tableData * 3);
    // round the Net and Gross amounts for the export
    clientData.push(Math.round(salesFileNetAmount * 100) / 100);
    clientData.push(Math.round(salesFileHomeCurrencyNetAmount * 100) / 100);
    clientData.push(Math.round(periodGrossAmount * 100) / 100);
    clientData.push(Math.round(periodNetAmount * 100) / 100);
    clientData.push(client.clientType);
    clientData.push(client.billing?.billingType);
    clientData.push(subscriptionStatus);
    clientData.push(invoiceAmount);
    clientData.push(invoiceDate);
    callback(err, clientData);
  });
};

/**
  * Returns mappings of the Client's catalogue data.
  *
  * Calls callback(err, mappings) with an [err] if an error occurs and the catalogue [mappings].
  *
  * @method
  * @param {function(string, object)} callback - The callback that handles the response.
  */

clientSchema.methods.catalogueOverwritingData = function (callback) {
  const Release = require('../release');
  const Track = require('../track');
  const Work = require('../work');

  const client = this;
  async.parallel({
    releases(cb) {
      // Setup mappings return object
      const mappings = {};
      // Get track count for batches
      Release.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          // Run through in batches
          const limit = 100000;
          const rounds = listFromNumber(Math.floor(count / limit));
          // Run through each batch
          async.eachSeries(rounds, (round, loopCb) => {
            // Find tracks in batch
            Release.find({ clientId: client._id.toString() }, '_id title version artist label foreignId catNo barcode dealerPrice distributionChannel format priceCategory salesReturnsRights')
              .limit(limit)
              .skip(limit * round)
              .then((releases) => {
                // Loop through all found releases
                releases.forEach((release) => {
                  mappings[release._id.toString()] = {
                    catalogueReleaseTitle: release.title, catalogueReleaseVersion: release.version, catalogueReleaseArtist: release.artist, catalogueReleaseLabel: release.label, catalogueCatNo: release.catNo, catalogueReleaseForeignId: release.foreignId, catalogueBarcode: release.barcode, ppd: release.dealerPrice, priceCategoryDealerPrices: release.priceCategoryDealerPrices, distributionChannel: release.distributionChannel, priceCategory: release.priceCategory, catalogueFormat: release.format, mechanicalBasisPercentage: release.mechanicalBasisPercentage, totalMechanicalAmount: release.totalMechanicalAmount, catalogueContractIds: release.salesReturnsRights.map((term) => term.contractId).join(', '),
                  };
                });
                // Batch callback
                loopCb();
              })
              .catch((err) => {
                logger.error(`Error finding Releases in catalogueOverwritingData for client ${client._id.toString()}`, err);
                loopCb(err);
              });
          }, (err) => {
            // Return mappings
            cb(err, mappings);
          });
        })
        .catch((err) => {
          logger.error(`Error counting Releases in catalogueOverwritingData for client ${client._id.toString()}`, err);
          cb(err, mappings);
        });
    },
    tracks(cb) {
      // Setup mappings return object
      const mappings = {};
      // Get track count for batches
      Track.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          // Run through in batches
          const limit = 100000;
          const rounds = listFromNumber(Math.floor(count / limit));
          // Run through each batch
          async.eachSeries(rounds, (round, loopCb) => {
            // Find tracks in batch
            Track.find({ clientId: client._id.toString() }, '_id title version artist label foreignId isrc salesReturnsRights defaultReleaseId releaseSpecificForeignIds')
              .limit(limit)
              .skip(limit * round)
              .then((tracks) => {
                // Loop through all found tracks
                tracks.forEach((track) => {
                  mappings[track._id.toString()] = {
                    catalogueTrackTitle: track.title, catalogueTrackVersion: track.version, catalogueTrackArtist: track.artist, catalogueTrackLabel: track.label, catalogueIsrc: track.isrc, catalogueTrackForeignId: track.foreignId, releaseSpecificForeignIds: track.releaseSpecificForeignIds, mechanicalRate: track.statutoryRate, defaultReleaseId: track.defaultReleaseId, catalogueContractIds: track.salesReturnsRights.map((term) => term.contractId).join(', '),
                  };
                });
                // Batch callback
                loopCb();
              })
              .catch((err) => {
                logger.error(`Error finding Tracks in catalogueOverwritingData for client ${client._id.toString()}`, err);
                loopCb(err);
              });
          }, (err) => {
            // Return mappings
            cb(err, mappings);
          });
        })
        .catch((err) => {
          logger.error(`Error counting Tracks in catalogueOverwritingData for client ${client._id.toString()}`, err);
          cb(err, mappings);
        });
    },
    works(cb) {
      // Setup mappings return object
      const mappings = {};
      // Get track count for batches
      Work.countDocuments({ clientId: client._id.toString() })
        .then((count) => {
          // Run through in batches
          const limit = 100000;
          const rounds = listFromNumber(Math.floor(count / limit));
          // Run through each batch
          async.eachSeries(rounds, (round, loopCb) => {
            // Find tracks in batch
            Work.find({ clientId: client._id.toString() }, '_id title composer identifier foreignId iswc tunecode salesReturnsRights')
              .limit(limit)
              .skip(limit * round)
              .then((works) => {
                // Loop through all found tracks
                works.forEach((work) => {
                  mappings[work._id] = {
                    catalogueWorkTitle: work.title, catalogueWorkComposer: work.composer, catalogueIdentifier: work.identifier, catalogueWorkForeignId: work.foreignId, catalogueIswc: work.iswc, catalogueTunecode: work.tunecode, catalogueContractIds: work.salesReturnsRights.map((term) => term.contractId).join(', '),
                  };
                });
                // Batch callback
                loopCb();
              })
              .catch((err) => {
                logger.error(`Error finding Works in catalogueOverwritingData for client ${client._id.toString()}`, err);
                loopCb(err);
              });
          }, (err) => {
            // Return mappings
            cb(err, mappings);
          });
        })
        .catch((err) => {
          logger.error(`Error counting Works in catalogueOverwritingData for client ${client._id.toString()}`, err);
          cb(err, mappings);
        });
    },
  }, callback);
};

clientSchema.methods.getStripeSetupIntent = async function () {
  const Billing = require('../../libs/billing');
  const client = this;
  const intent = await Billing.getSetupIntents(client);
  return intent;
};

clientSchema.methods.retrieveSripePaymentMethod = async function () {
  const Billing = require('../../libs/billing');
  const client = this;
  const paymentMethod = await Billing.retrievePaymentMethod(client);
  return paymentMethod;
};

clientSchema.methods.getUsage = async function (currency) {
  const client = this;
  const Billing = require('../../libs/billing');
  const usage = await Billing.getClientUsage(client, currency);
  // Override amount with client monthly price if there's one
  if (client?.billing?.amount) { usage.amount = client.billing.amount; }
  return usage;
};

clientSchema.methods.updatePaymentMethod = async function (paymentIntent) {
  const client = this;
  const Billing = require('../../libs/billing');
  await Billing.updatePaymentMethod(client, paymentIntent);
};

clientSchema.methods.chargeClient = async function (curveUser, ignoreLastPaymentFailure) {
  const client = this;
  const Billing = require('../../libs/billing');
  await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
};

clientSchema.methods.getWiseProfiles = async function (apiKey) {
  const client = this;
  const { paymentApiKey } = client;
  // Get list of profiles from Wise
  // Use api key provided by route or default to the one saved against the client
  const profiles = await Wise.getProfiles(apiKey || paymentApiKey);
  return profiles;
};

clientSchema.methods.getWisePaymentRequirements = async function (currency) {
  const client = this;
  // Get list of requirements from Wise
  const requirements = await Wise.getPaymentRequirements(client.homeCurrency, currency);

  // Brute force requirements returned by Wise as they are incomplete
  if (client.homeCurrency !== 'CAD' && currency === 'CAD') {
    requirements.forEach((paymentMethod) => {
      if (paymentMethod.fields.some((field) => field.name === 'Country')) {
        const canadianStates = { name: 'State', group: [{ key: 'address.state', name: 'State', type: 'select', required: true, example: '', minLength: 1, maxLength: 255, validationRegexp: null, validationAsync: null, valuesAllowed: [{ name: 'Alberta', key: 'AB' }, { name: 'British Columbia', key: 'BC' }, { name: 'Manitoba', key: 'MB' }, { name: 'New Brunswick', key: 'NB' }, { name: 'Newfoundland and Labrador', key: 'NL' }, { name: 'Nova Scotia', key: 'NS' }, { name: 'Ontario', key: 'ON' }, { name: 'Prince Edward Island', key: 'PE' }, { name: 'Quebec', key: 'QC' }, { name: 'Saskatchewan', key: 'SK' }, { name: 'Northwest Territories', key: 'NT' }, { name: 'Nunavut', key: 'NU' }, { name: 'Yukon', key: 'YT' }] }] };
        paymentMethod.fields.push(canadianStates);
      }
    });
  } else if (client.homeCurrency === 'USD' || currency === 'USD') {
    const usStates = { name: 'State', group: [{ key: 'address.state', name: 'State', type: 'select', required: true, example: '', minLength: 1, maxLength: 255, validationRegexp: null, validationAsync: null, valuesAllowed: [{ name: 'Alabama', key: 'AL' }, { name: 'Alaska', key: 'AK' }, { name: 'American Samoa', key: 'AS' }, { name: 'Arizona', key: 'AZ' }, { name: 'Arkansas', key: 'AR' }, { name: 'California', key: 'CA' }, { name: 'Colorado', key: 'CO' }, { name: 'Connecticut', key: 'CT' }, { name: 'Delaware', key: 'DE' }, { name: 'District Of Columbia', key: 'DC' }, { name: 'Federated States Of Micronesia', key: 'FM' }, { name: 'Florida', key: 'FL' }, { name: 'Georgia', key: 'GA' }, { name: 'Guam', key: 'GU' }, { name: 'Hawaii', key: 'HI' }, { name: 'Idaho', key: 'ID' }, { name: 'Illinois', key: 'IL' }, { name: 'Indiana', key: 'IN' }, { name: 'Iowa', key: 'IA' }, { name: 'Kansas', key: 'KS' }, { name: 'Kentucky', key: 'KY' }, { name: 'Louisiana', key: 'LA' }, { name: 'Maine', key: 'ME' }, { name: 'Marshall Islands', key: 'MH' }, { name: 'Maryland', key: 'MD' }, { name: 'Massachusetts', key: 'MA' }, { name: 'Michigan', key: 'MI' }, { name: 'Minnesota', key: 'MN' }, { name: 'Mississippi', key: 'MS' }, { name: 'Missouri', key: 'MO' }, { name: 'Montana', key: 'MT' }, { name: 'Nebraska', key: 'NE' }, { name: 'Nevada', key: 'NV' }, { name: 'New Hampshire', key: 'NH' }, { name: 'New Jersey', key: 'NJ' }, { name: 'New Mexico', key: 'NM' }, { name: 'New York', key: 'NY' }, { name: 'North Carolina', key: 'NC' }, { name: 'North Dakota', key: 'ND' }, { name: 'Northern Mariana Islands', key: 'MP' }, { name: 'Ohio', key: 'OH' }, { name: 'Oklahoma', key: 'OK' }, { name: 'Oregon', key: 'OR' }, { name: 'Palau', key: 'PW' }, { name: 'Pennsylvania', key: 'PA' }, { name: 'Puerto Rico', key: 'PR' }, { name: 'Rhode Island', key: 'RI' }, { name: 'South Carolina', key: 'SC' }, { name: 'South Dakota', key: 'SD' }, { name: 'Tennessee', key: 'TN' }, { name: 'Texas', key: 'TX' }, { name: 'Utah', key: 'UT' }, { name: 'Vermont', key: 'VT' }, { name: 'Virgin Islands', key: 'VI' }, { name: 'Virginia', key: 'VA' }, { name: 'Washington', key: 'WA' }, { name: 'West Virginia', key: 'WV' }, { name: 'Wisconsin', key: 'WI' }, { name: 'Wyoming', key: 'WY' }] }] };
    requirements.forEach((paymentMethod) => { paymentMethod.fields.push(usStates); });
  }
  return requirements;
};

clientSchema.methods.getWiseListOfRecipients = async function (currency) {
  const client = this;
  // Get profile ID
  const { profileId, apiKey } = client.paymentProviders.wise;
  if (profileId && apiKey) {
    // Get list of requirements from Wise
    const recipients = await Wise.getListOfRecipients(profileId, apiKey);
    return recipients;
  }
  return null;
};

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}

function alphaNumericOnly(string) {
  return string.replace(/[^0-9a-z]/gi, '');
}

const Client = mongoose.model(name, clientSchema);

module.exports = Client;
