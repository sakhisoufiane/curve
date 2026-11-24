const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const { each, eachLimit, waterfall, parallel } = require('async');
const _ = require('lodash');

const Client = require('../../models/client');
const Period = require('../../models/period');
const Cost = require('../../models/cost');
const SalesFile = require('../../models/salesFile');
const Statement = require('../../models/statement');
const Contract = require('../../models/contract');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Payment = require('../../models/payment');
const MCPSNegative = require('../../models/mcpsNegative');
const MCPSRetention = require('../../models/mcpsRetention');

const salesItemHelpers = {
  checkDataBeforeDelete: (Model, params, callback) => {
    // split params to local variables
    const { clientId, deletionType, idsToTest, costsFilterField, salesFilterField, logLabel } = params;
    // Load the client data
    Client.findById(new ObjectId(clientId), 'bigQueryDataset bigQuerySalesTable')
      .then((client) => {
        if (!client || !client.bigQuerySalesTable) {
          // Can't proceed with checking validity of the deletion so return
          return callback(new Error('Internal error, please try again'));
        }

        // Determine type of lookup to be made
        const multi = (deletionType === 'multi');
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        const baseFilter = { $in: idsToTest };
        const mongoLookup = (multi) ? salesItemHelpers.getModelDataCount : salesItemHelpers.getModelData;

        // Using waterfall control flow simply to prevent big query lookup should the costs lookup return an error
        waterfall([
          // Look for cost associations in Mongo
          (wcb) => {
            if (costsFilterField) {
              // Build lookup filters (Works don't have costs so don't pass costsFilterField in params)
              const costFilter = { clientId }; // { clientId: client._id.toString() }
              costFilter[costsFilterField] = baseFilter;
              logger.debug('checkDataBeforeDeletion Mongo costFilter\n', JSON.stringify(costFilter, null, 2));
              // Look up associated costs data in mongo - select function to use based on single/bulk deletion request
              mongoLookup(Cost, costFilter, 'costs', (costsErr, costsCount, costs) => {
                wcb(costsErr, { costsCount, costs });
              });
            } else {
              setImmediate(() => {
                wcb(null, {});
              });
            }
          },
          // Look for sales line associations in BQ input table
          (associatedCosts, wcb) => {
            // Build lookup filters
            const salesFilter = {};
            salesFilter[salesFilterField] = baseFilter;
            logger.debug('checkDataBeforeDeletion BQ salesFilter\n', JSON.stringify(salesFilter, null, 2));
            // Look up associated sales data in bigquery - select function to use based on single/bulk deletion request
            const salesLookup = (multi) ? salesItemHelpers.getSalesDataCount : salesItemHelpers.getSalesData;
            salesLookup(bigQuery, salesFilter, (salesErr, salesCount, salesFiles) => {
              wcb(salesErr, associatedCosts, { salesCount, salesFiles });
            });
          },
          // Look for any other associations which should prevent deletion
          (associatedCosts, associatedSales, wcb) => {
            if (salesFilterField === 'contractId') {
              // If deleting contracts - check additional contract associations at the same time as sales/costs
              salesItemHelpers.checkContractAssociations(clientId, baseFilter, mongoLookup, multi, (contractsErr, results) => {
                if (contractsErr) { return callback(contractsErr); }
                const { associatedStatements, associatedContracts, associatedReleases, associatedTracks, associatedWorks, associatedPayments, associatedPeriods } = results;
                // add empty objects for MCPS negatives and retentions, otherwise wcb values become misaligned - ref: SUP-782
                wcb(null, associatedCosts, associatedSales, associatedTracks, {}, {}, associatedReleases, associatedWorks, associatedStatements, associatedContracts, associatedPayments, associatedPeriods);
              });
            } else if (salesFilterField === 'releaseId') {
              salesItemHelpers.checkReleaseAssociations(clientId, baseFilter, mongoLookup, multi, (releasesErr, results) => {
                if (releasesErr) { return callback(releasesErr); }

                const { associatedTracks, associatedMCPSNegatives, associatedMCPSRetentions, associatedClientDuplicateIdentifiers } = results;
                wcb(null, associatedCosts, associatedSales, associatedTracks, associatedMCPSNegatives, associatedMCPSRetentions, {}, {}, {}, {}, {}, {}, associatedClientDuplicateIdentifiers);
              });
            } else if (salesFilterField === 'trackId') {
              salesItemHelpers.checkTrackAssociations(clientId, baseFilter, mongoLookup).then((results) => {
                const { associatedClientDuplicateIdentifiers, associatedReleases } = results;
                wcb(null, associatedCosts, associatedSales, {}, {}, {}, associatedReleases, {}, {}, {}, {}, {}, associatedClientDuplicateIdentifiers);
              }).catch(wcb);
            } else if (salesFilterField === 'workId') {
              salesItemHelpers.checkWorkAssociations(clientId, baseFilter, mongoLookup).then((results) => {
                const { associatedClientDuplicateIdentifiers } = results;
                wcb(null, associatedCosts, associatedSales, {}, {}, {}, {}, {}, {}, {}, {}, {}, associatedClientDuplicateIdentifiers);
              }).catch(wcb);
            } else {
              setImmediate(() => {
                wcb(null, associatedCosts, associatedSales);
              });
            }
          },
        ], (
          err,
          associatedCosts,
          associatedSales,
          associatedTracks = {},
          associatedMCPSNegatives = {},
          associatedMCPSRetentions = {},
          associatedReleases = {},
          associatedWorks = {},
          associatedStatements = {},
          associatedContracts = {},
          associatedPayments = {},
          associatedPeriods = {},
          associatedClientDuplicateIdentifiers = {},
        ) => {
          if (err) {
            logger.error(err);
            return callback(err);
          }
          let response;
          const { costsCount, costs } = associatedCosts;
          const { salesCount, salesFiles } = associatedSales;
          const { statementsCount, statements } = associatedStatements;
          const { contractsCount, contracts } = associatedContracts;
          const { releasesCount, releases } = associatedReleases;
          const { tracksCount, tracks } = associatedTracks;
          const { worksCount, works } = associatedWorks;
          const { paymentsCount, payments } = associatedPayments;
          const { periodsCount, periods } = associatedPeriods;
          const { mcpsNegativeCount, mcpsNegatives } = associatedMCPSNegatives;
          const { mcpsRetentionCount, mcpsRetentions } = associatedMCPSRetentions;
          const { clientCount, clients } = associatedClientDuplicateIdentifiers;

          logger.debug({
            salesCount,
            salesFiles,
            costsCount,
            costs,
            statementsCount,
            statements,
            contractsCount,
            contracts,
            releasesCount,
            releases,
            tracksCount,
            tracks,
            worksCount,
            works,
            paymentsCount,
            payments,
            periods,
            periodsCount,
            mcpsNegativeCount,
            mcpsNegatives,
            mcpsRetentionCount,
            mcpsRetentions,
            clients,
          });

          if (salesCount || costsCount || statementsCount || contractsCount || releasesCount || tracksCount || worksCount || paymentsCount || periodsCount || mcpsNegativeCount || mcpsRetentionCount || clientCount) {
            if (salesFiles || costs || statements || contracts || releases || tracks || works || payments || periods || mcpsNegatives || mcpsRetentions || clients) {
              // This is an edit page deletion and we are returning links to associated data preventing deletion
              const associations = {};
              if (salesFiles) { associations.sales = salesFiles; }
              if (costs) { associations.costs = costs; }
              if (statements) { associations.statements = statements; }
              if (contracts) { associations.contracts = contracts; }
              if (releases) { associations.releases = releases; }
              if (tracks) { associations.tracks = tracks; }
              if (works) { associations.works = works; }
              if (payments) { associations.payments = payments; }
              if (periods) { associations.periods = periods; }
              if (mcpsNegatives) { associations.mcpsNegatives = mcpsNegatives; }
              if (mcpsRetentions) { associations.mcpsRetentions = mcpsRetentions; }
              if (clients) { associations.clients = clients; }
              response = associations;
            } else {
              // This is an index page deletion returning a blanket response based on count lookups
              const associations = [];
              if (salesCount) { associations.push('Sales Files'); }
              if (costsCount) { associations.push('Costs'); }
              if (statementsCount) { associations.push('Statements'); }
              if (contractsCount) { associations.push('Cross Contracts'); }
              if (releasesCount) { associations.push('Releases'); }
              if (tracksCount) { associations.push('Tracks'); }
              if (worksCount) { associations.push('Works'); }
              if (paymentsCount) { associations.push('already paid out Payments'); }
              if (periodsCount) { associations.push('Periods Processing'); }
              if (mcpsNegativeCount) { associations.push('MCPS Negatives'); }
              if (mcpsRetentionCount) { associations.push('MCPS Retentions'); }
              if (clientCount) { associations.push('Client Duplicate Identifiers'); }
              response = associations.join(', ');

              if (associations.length > 1) {
                // Replace last occurence of , with and
                const intPos = response.lastIndexOf(',');
                response = `${response.substring(0, intPos)} and ${response.substring(intPos + 2, response.length)}`;
              }
            }
            logger.debug({ response });
            callback(null, 201, response);
          } else {
            // Set ids to be ObjectIds
            const objectIds = [];
            // Check they are valid IDs first
            idsToTest.forEach((id) => {
              if (ObjectId.isValid(id)) {
                objectIds.push(new ObjectId(id));
              } else {
                logger.error(`Invalid ID: ${id}`);
              }
            });
            // const errors = [];
            let deletedCount = 0;

            // In order to make the deleted data available to the modelHistory library we need to load up the data and delete items individually.
            Model.find({ clientId, _id: { $in: objectIds } })
              .then((docs) => {
                eachLimit(docs, 10, (doc, cb) => {
                  doc.deleteOne()
                    .then(() => {
                      deletedCount += 1;
                      cb();
                    })
                    .catch((err) => {
                      logger.error(`${logLabel} Deletion Errored on ${doc._id.toString()}`, err);
                      cb(err);
                    });
                }, (err) => {
                  callback(err, 200, { deletedCount });
                });
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
        callback(err || new Error('Internal error, please try again'));
      });
  },
  getSalesData: (bigQuery, filter, callback) => {
    logger.debug('BQ sales filter using: getSalesData');

    const column = 'salesFileId';
    const salesFiles = [];

    bigQuery.getDistinct(bigQuery.inputTable, column, filter, (err, results) => {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        logger.debug('BQ getSalesData results\n', JSON.stringify(results, null, 2));
        // logger.debug(results);
        // logger.debug(release._id.toString());
        // SalesFile Ids - For Debbuging without allowing deletion of any records
        // results = ['5d9f43021759eb58962dca9b','5e57be1ba87ad10b4ab366c1'];

        const count = results.length;

        if (count) {
          each(results, (result, cb) => {
            SalesFile.findById(result)
              .then((file) => {
                if (file) {
                  salesFiles.push({
                    name: file.name,
                    link: `sales/${file._id}/edit`,
                  });
                }
                cb();
              })
              .catch((err) => {
                logger.error(`Error finding sales file with id '${result}': ${err}`);
                cb(err);
              });
          }, (err) => {
            callback(err, count, salesFiles);
          });
        } else {
          callback();
        }
      }
    });
  },
  getSalesDataCount: (bigQuery, filter, callback) => {
    const selection = 'DISTINCT salesFileId';
    bigQuery.getSize(bigQuery.inputTable, selection, filter, (err, result) => {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        const { count } = result[0];
        callback(null, count);
      }
    });
  },
  getModelData: (Model, filter, path, callback) => {
    let data;
    const projection = (Model === Contract) ? 'name title accountingPeriod' : 'name title';
    Model.find(filter, projection)
      .then((docs) => {
        let count = 0;
        if (docs && docs.length) {
          data = [];
          count = docs.length;
          docs.forEach((doc) => {
            const object = {
              name: doc.name || doc.title,
              _id: doc._id,
              link: `${path}/${doc._id}${(path === 'statements') ? '' : '/edit'}`,
            };

            if (Model === Contract) { object.accountingPeriod = doc?.accountingPeriod; }
            if (Model === MCPSNegative || Model === MCPSRetention) { object.name = 'MCPS'; }

            data.push(object);
          });
        }
        callback(null, count, data);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  getModelDataCount: (Model, filter, path, callback) => {
    logger.debug('using: getModelDataCount', { path });
    Model.countDocuments(filter)
      .then((count) => {
        callback(null, count);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  checkReleaseAssociations: (clientId, baseFilter, mongoLookup, multi, callback) => {
    // code
    parallel({
      associatedTracks(releasesCallback) {
        // If deleting release - check additional release associations at the same time as sales/costs
        const releaseSpecificTrackFilter = { clientId, releaseSpecificSalesReturnsRights: { $elemMatch: { releaseId: baseFilter } } };
        // Look up associated track data in mongo - select function to use based on single/bulk deletion request
        mongoLookup(Track, releaseSpecificTrackFilter, 'tracks', (releaseSpecificTrackErr, tracksCount, tracks) => {
          releasesCallback(releaseSpecificTrackErr, { tracksCount, tracks });
        });
      },
      associatedMCPSNegatives(releasesCallback) {
        const mcpsNegativeFilter = { clientId, releaseId: baseFilter };
        mongoLookup(MCPSNegative, mcpsNegativeFilter, 'mcpsNegatives', (mcpsNegativeErr, mcpsNegativeCount, mcpsNegatives) => {
          releasesCallback(mcpsNegativeErr, { mcpsNegativeCount, mcpsNegatives });
        });
      },
      associatedMCPSRetentions(releasesCallback) {
        const mcpsRetentionFilter = { clientId, releaseId: baseFilter };
        mongoLookup(MCPSRetention, mcpsRetentionFilter, 'mcpsRetentions', (mcpsRetentionErr, mcpsRetentionCount, mcpsRetentions) => {
          releasesCallback(mcpsRetentionErr, { mcpsRetentionCount, mcpsRetentions });
        });
      },
      associatedClientDuplicateIdentifiers(releasesCallback) {
        salesItemHelpers.associatedClientDuplicateIdentifiers(clientId, baseFilter, mongoLookup, 'release').then(({ clientCount, clients }) => {
          releasesCallback(null, { clientCount, clients });
        }).catch(releasesCallback);
      },
    }, callback);
  },
  checkTrackAssociations: async (clientId, baseFilter, mongoLookup) => {
    const [associatedClientDuplicateIdentifiers, associatedReleases] = await Promise.all([
      salesItemHelpers.associatedClientDuplicateIdentifiers(clientId, baseFilter, mongoLookup, 'track'),
      salesItemHelpers.associatedReleasesForTracks(clientId, baseFilter, mongoLookup),
    ]);
    return { associatedClientDuplicateIdentifiers, associatedReleases };
  },
  checkWorkAssociations: async (clientId, baseFilter, mongoLookup) => ({
    associatedClientDuplicateIdentifiers: await salesItemHelpers.associatedClientDuplicateIdentifiers(clientId, baseFilter, mongoLookup, 'work'),
  }),
  checkContractAssociations: (clientId, baseFilter, mongoLookup, multi, callback) => {
    // Build lookup filter for contract/catalogue checks
    const contractCatFilter = { clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: baseFilter } } }, { costsRights: { $elemMatch: { contractId: baseFilter } } }] };
    logger.debug('ADDITIONAL CONTRACT ASSOCIATION CHECKS RUNNING');
    logger.debug('checkDataBeforeDeletion Mongo releaseFilter\n', JSON.stringify(contractCatFilter, null, 2));

    parallel({
      associatedStatements(contractsCallback) {
        // Build lookup filters
        const statementFilter = { clientId, contractId: baseFilter };
        logger.debug('checkDataBeforeDeletion Mongo statementFilter\n', JSON.stringify(statementFilter, null, 2));
        // Look up associated statement data in mongo - select function to use based on single/bulk deletion request
        mongoLookup(Statement, statementFilter, 'statements', (statementErr, statementsCount, statements) => {
          contractsCallback(statementErr, { statementsCount, statements });
        });
      },
      associatedPeriods(contractsCallback) {
        const contractFilter = { clientId, contractId: baseFilter };
        logger.debug('checkDataBeforeDeletion Mongo contractFilter\n', JSON.stringify(contractFilter, null, 2));

        salesItemHelpers.getModelData(Contract, contractFilter, 'contracts', (contractErr, contractsCount, contracts) => {
          if (contractErr || contractsCount === 0) { return contractsCallback(contractErr); }

          const accountingPeriods = contracts.map((contract) => contract.accountingPeriod);

          const periodFilter = { clientId, status: 'Processing', accountingPeriodType: { $in: accountingPeriods } };
          mongoLookup(Period, periodFilter, 'periods', (periodErr, periodsCount, periods) => {
            contractsCallback(periodErr, { periodsCount, periods });
          });
        });
      },
      associatedContracts(contractsCallback) {
        // Build lookup filters
        const crossContractsFilter = { clientId, crossContracts: { $elemMatch: { contractId: baseFilter } } };
        logger.debug('checkDataBeforeDeletion Mongo crossContractsFilter\n', JSON.stringify(crossContractsFilter, null, 2));
        // Look up associated cross contract data in mongo - select function to use based on single/bulk deletion request
        mongoLookup(Contract, crossContractsFilter, 'contracts', (inboundCCErr, contractsCount, contracts) => {
          contractsCallback(inboundCCErr, { contractsCount, contracts });
        });
      },
      associatedReleases(contractsCallback) {
        // Look up associated release data in mongo - select function to use based on single/bulk deletion request
        mongoLookup(Release, contractCatFilter, 'releases', (releaseErr, releasesCount, releases) => {
          contractsCallback(releaseErr, { releasesCount, releases });
        });
      },
      associatedTracks(contractsCallback) {
        // Add releaseSpecificSalesReturnsRights to existing filter when examining tracks
        const trackFilter = _.cloneDeep(contractCatFilter);
        trackFilter.$or.push({ releaseSpecificSalesReturnsRights: { $elemMatch: { contractId: baseFilter } } });
        // Look up associated track data in mongo - select function to use based on single/bulk deletion request
        mongoLookup(Track, trackFilter, 'tracks', (trackErr, tracksCount, tracks) => {
          contractsCallback(trackErr, { tracksCount, tracks });
        });
      },
      associatedWorks(contractsCallback) {
        // Add channelSpecificSalesReturnsRights to existing filter when examining works
        const worksFilter = _.cloneDeep(contractCatFilter);
        worksFilter.$or.push({ channelSpecificSalesReturnsRights: { $elemMatch: { contractId: baseFilter } } });
        // Look up associated work data in mongo - select function to use based on single/bulk deletion request
        mongoLookup(Work, worksFilter, 'works', (workErr, worksCount, works) => {
          contractsCallback(workErr, { worksCount, works });
        });
      },
      associatedPayments(contractsCallback) {
        const paymentsFilter = { clientId, contractId: baseFilter, status: 'Paid' };
        // Look up associated work data in mongo - select function to use based on single/bulk deletion request
        mongoLookup(Payment, paymentsFilter, 'payments', (paymentErr, paymentsCount, payments) => {
          contractsCallback(paymentErr, { paymentsCount, payments });
        });
      },
    }, callback);
  },
  associatedClientDuplicateIdentifiers: (clientId, baseFilter, mongoLookup, type) => new Promise((resolve, reject) => {
    let field = 'duplicateReleases.output';
    if (type === 'track') {
      field = 'duplicateTracks.output';
    } else if (type === 'work') {
      field = 'duplicateWorks.output';
    }
    const filter = { _id: new ObjectId(clientId), [field]: baseFilter };

    mongoLookup(Client, filter, 'client', (clientErr, clientCount, clients) => {
      if (clientErr) return reject(clientErr);

      if (clientCount && clients) clients[0].link = 'settings';

      resolve({ clientCount, clients });
    });
  }),
  associatedReleasesForTracks: (clientId, baseFilter, mongoLookup) => new Promise((resolve, reject) => {
    mongoLookup(Release, { clientId, trackIds: baseFilter }, 'releases', (err, releasesCount, releases) => {
      if (err) return reject(err);
      resolve({ releasesCount, releases });
    });
  }),
};

module.exports = salesItemHelpers;
