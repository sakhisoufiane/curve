const fs = require('fs');
const async = require('async');
const { ObjectId } = require('mongodb');
const appRootDir = require('app-root-dir').get();
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const Cost = require('../../../models/cost');
const Period = require('../../../models/period');
const Contract = require('../../../models/contract');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const Task = require('../../../models/task');
const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');
const McpsRetention = require('../../../models/mcpsRetention');
const McpsNegative = require('../../../models/mcpsNegative');

const customStatement = require('../../statements/customStatements');
const McpsSalesTerms = require('../mcpsSalesTerms');
const writeCsv = require('../../writeCsv');
const config = require('../../../config.json');
const sqs = require('../../sqs');
const { CalculationHelpers, SuspenseHelpers } = require('../helpers');

const unmappedSalesReportV2 = require('../../fixedReports/unmappedSalesV2/index');

const CreatePeriodFiles = {
  triggerUnreportedJob: async ({ type, client, period }) => {
    const task = new Task({
      name: type,
      clientId: client._id.toString(),
      value: {
        periodId: period._id.toString(),
      },
    });

    await task.save();
    await new Promise((resolve) => {
      sqs.sendMessage(task, 1, () => {
        logger.info(`${period._id} Triggering Job For ${type}`);
        resolve();
      });
    });
  },
  createFiles: (period, db, bigQuery, client, callback) => {
    async.series([
      function (cb) {
        // Only create unreported sales if salesFiles or resolvedGroups are attached to the period - otherwise skip the stage
        if (!period.salesFilesIds?.length && !period.resolvedGroupIds?.length) {
          logger.info(`${period._id} Skipping creating unreported sales - no sales files or resolved groups attached`);
          return setImmediate(cb);
        }

        logger.info(`${period._id} Creating Unreported Sales`);

        if (client.features?.unreportedFileV2) {
          return CreatePeriodFiles.triggerUnreportedJob({ type: 'Unreported Sales', client, period }).then(cb).catch(cb);
        }

        // Mechanical Specific Filters
        if (period.contractType === 'Mechanical') {
          return CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], cb);
        }

        // MCPS Specific Filters
        if (period.contractType === 'MCPS') {
          return CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, cb);
        }

        CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] })
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        // Only create unreported costs if costs are attached to the period - otherwise skip the stage
        if (!period.costIds?.length) {
          logger.info(`${period._id} Skipping creating unreported costs - no costs attached`);
          return setImmediate(cb);
        }

        // Create unreported costs period CSV export
        if (client.clientType === 'Publisher' || period.contractType === 'Mechanical' || period.contractType === 'MCPS') return setImmediate(cb);

        logger.info(`${period._id} Creating Unreported Costs`);
        if (client.features?.unreportedFileV2) {
          return CreatePeriodFiles.triggerUnreportedJob({ type: 'Unreported Costs', client, period }).then(cb).catch(cb);
        }

        CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, cb);
      },
      function (cb) {
        // Create suspense CSV export
        CreatePeriodFiles.createSuspenseCsv(period, bigQuery, client, cb);
      },
      function (cb) {
        // Create MCPS Statement
        if (period.contractType === 'MCPS') {
          logger.info(`${period._id} Creating MCPS Statement`);
          CreatePeriodFiles.createMcpsStatement(period, db, bigQuery, client, cb);
        } else {
          cb();
        }
      },
    ], callback);
  },
  createUnreportedSalesCsv: async ({ period, client, excludedSalesFiles }) => {
    const params = {
      _id: period._id,
      filters: [{ period: period._id.toString(), excludedSalesFiles }],
      clientId: client._id.toString(),
      periodFile: true,
    };

    const file = await unmappedSalesReportV2.run(params);
    if (!file) {
      logger.info(`${period._id} | createUnreportedSalesCsv| No file created`);
      return;
    }

    const s3Key = `periods/${period._id.toString()}/Unreported Sales Report.csv`;

    const outputLocation = `${appRootDir}/tmp/${file}`;
    if (!fs.existsSync(outputLocation)) throw new Error('Could not find file in local storage');

    await new Promise((resolve, reject) => {
      fileManager.uploadToS3(s3Key, outputLocation, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await Period.findByIdAndUpdate(period._id, { $set: { unreportedSalesCsv: s3Key, unreportedSalesCsvLastRun: new Date().getTime() } });
    return s3Key;
  },
  catalogueForUnreported: (period, client, callback) => {
    let releaseIds; let trackIds; let workIds; let includedContractIds;
    async.waterfall([
      function (cb) {
        // Get all contracts associated with this period type
        Contract.find({ clientId: client._id.toString(), contractType: { $ne: 'Mechanical' }, accountingPeriod: period.accountingPeriodType }, '_id')
          .lean()
          .then((contracts) => {
            includedContractIds = contracts.map((contract) => contract._id.toString());
            cb();
          })
          .catch((err) => {
            logger.error(err);
            // Bongo refactor: previously this would have crashed. Lets callback an error instead
            cb(err);
          });
      },
      function (cb) {
        // Get all releases that are associated with contracts of this period type
        Release.find({ clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $in: includedContractIds } } } }, '_id')
          .lean()
          .then((removeReleases) => {
            // Get all releases that aren't associated with contracts of the period type
            Release.find({ clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $nin: includedContractIds } } } }, '_id')
              .lean()
              .then((includeReleases) => {
                // Loops through all the releases that aren't of this period type, and removes any that do have a contract of this type
                // Leaving only the releases that do not have a contract of this type, but removing those that have multi-contract types
                removeReleases = removeReleases.map((release) => release._id.toString());
                releaseIds = includeReleases.map((release) => {
                  if (!removeReleases.includes(release._id.toString())) {
                    return release._id.toString();
                  }
                }).filter(Boolean);
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get all tracks that are associated with contracts of this period type
        Track.find({ clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $in: includedContractIds } } } }, '_id')
          .lean()
          .then((removeTracks) => {
            // Get all tracks that aren't associated with contracts of the period type
            Track.find({ clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $nin: includedContractIds } } } }, '_id')
              .lean()
              .then((includeTracks) => {
                // Loops through all the tracks that aren't of this period type, and removes any that do have a contract of this type
                // Leaving only the tracks that do not have a contract of this type, but removing those that have multi-contract types
                removeTracks = removeTracks.map((track) => track._id.toString());
                trackIds = includeTracks.map((track) => {
                  if (!removeTracks.includes(track._id.toString())) {
                    return track._id.toString();
                  }
                }).filter(Boolean);
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get all works that are associated with contracts of this period type
        Work.find({ clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $in: includedContractIds } } } }, '_id')
          .lean()
          .then((removeWorks) => {
            // Get all works that aren't associated with contracts of the period type
            Work.find({ clientId: client._id.toString(), salesReturnsRights: { $elemMatch: { contractId: { $nin: includedContractIds } } } }, '_id')
              .lean()
              .then((includeWorks) => {
                // Loops through all the works that aren't of this period type, and removes any that do have a contract of this type
                // Leaving only the works that do not have a contract of this type, but removing those that have multi-contract types
                removeWorks = removeWorks.map((work) => work._id.toString());
                workIds = includeWorks.map((work) => {
                  if (!removeWorks.includes(work._id.toString())) {
                    return work._id.toString();
                  }
                }).filter(Boolean);
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    ], (err) => {
      callback(err, releaseIds, trackIds, workIds, includedContractIds);
    });
  },
  createMcpsUnreportedSalesCsv: (period, bigQuery, client, callback) => {
    const template = config.exportTemplates.unreportedReport;
    const salesInputColumns = ['id', 'salesFileId', 'catalogueContractIds', 'catType', 'source', 'status', 'subSource', 'territory', 'releaseId', 'catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'ppd', 'barcode', 'catNo', 'catalogueIsrc', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'trackId', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'saleDate', 'transactionDate', 'description'];
    const filter = {
      salesFileId: { $in: period.salesFilesIds },
      status: 'Complete',
    };
    const object = {
      bigQuery,
      databaseTable: client.bigQuerySalesTable,
      template,
      noConsolidation: true,
      filter,
      s3WriteKey: `periods/${period._id.toString()}/Unreported Sales Report.csv`,
      s3AccessKey: process.env.S3_access_key,
      s3SecretKey: process.env.S3_secret_key,
      s3Region: process.env.S3_region,
      s3Bucket: process.env.S3_bucket,
      joinedSalesData: true,
      contractIds: ['MCPS'],
      salesInputColumns,
      salesOutputColumns: ['salesLineId'],
    };
    writeCsv(object, (err, result) => {
      if (err) {
        callback(err);
      } else {
        const time = new Date().getTime();
        Period.findByIdAndUpdate(period._id, { $set: { unreportedSalesCsv: result, unreportedSalesCsvLastRun: time } })
          .then(() => {
            callback(null, result);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    });
  },
  createMechanicalUnreportedSalesCsv: (period, bigQuery, client, excludedSalesFiles, callback) => {
    const logKey = `${period._id} | Unreported Mechanical Sales File`;
    // Get Contracts that aren't associated with this period
    let releaseIds; let trackIds; let includedContractIds;
    const terms = [];
    async.waterfall([
      function (cb) {
        // Get releases that have mechanical licenses associated
        Release.find({ clientId: client._id.toString() }, { _id: 1, mechanicalLicenses: 1 })
          .then((releases) => {
            // Set release IDs to the releases that don't have reportMechanicals turned off for each track
            releaseIds = releases.map((release) => {
              // Setup returning value
              let toReturn = false;
              if (release.mechanicalLicenses && Object.keys(release.mechanicalLicenses).length > 0) {
                // Loop through all mechanical licenses
                Object.keys(release.mechanicalLicenses).forEach((trackId) => {
                  if (release.mechanicalLicenses[trackId] && release.mechanicalLicenses[trackId].reportMechanicals && release.mechanicalLicenses[trackId].reportMechanicals !== 'false') {
                    toReturn = true;
                  }
                });
              } else {
                // Set to true when no mechanicalLicenses
                toReturn = true;
              }
              // Only return release ID when true
              if (toReturn) { return release._id.toString(); }
            }).filter(Boolean);
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get tracks that are set to report mechanicals
        Track.distinct('_id', { clientId: client._id.toString(), reportMechanicals: true })
          .then((tracks) => {
            trackIds = tracks.map((id) => id.toString());
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        Contract.distinct('_id', { clientId: client._id.toString(), contractType: 'Mechanical', accountingPeriod: period.accountingPeriodType })
          .then((inContractIds) => {
            includedContractIds = inContractIds.map((id) => id.toString());
            cb();
          })
          .catch((err) => {
            logger.error(err);
            // Bongo refactor: previously this would have crashed. Lets callback an error instead
            cb(err);
          });
      },
      function (cb) {
        // Get all terms associated with the contracts
        // Get contracts
        Contract.find({ _id: { $in: includedContractIds } })
          .then((contracts) => {
            // Get all territory groups and store by key
            TerritoryGroup.find({ clientId: period.clientId })
              .then((territoryGroups) => {
                const tgs = {};
                territoryGroups.forEach((territoryGroup) => { tgs[territoryGroup._id.toString()] = territoryGroup.territories; });
                // Get all catalogue term gorups and store by key
                ContractTermGroup.find({ clientId: period.clientId })
                  .then((contractTermGroups) => {
                    const ctgs = {};
                    contractTermGroups.forEach((contractTermGroup) => { ctgs[contractTermGroup._id.toString()] = contractTermGroup.items.filter(Boolean); });
                    const inputTerms = [];
                    contracts.forEach((contract) => {
                      contract.mechanicalContractTerms.forEach((term) => {
                        const newTerm = {};
                        if (term.territory !== 'World' && term.territory !== 'WW') {
                          newTerm.territory = tgs[term.territory] ? tgs[term.territory] : term.territory;
                        }
                        if (term.channel !== 'All') {
                          newTerm.distributionChannel = ctgs[term.channel] ? ctgs[term.channel] : term.channel;
                        }
                        if (term.configuration !== 'All') {
                          newTerm.configuration = ctgs[term.configuration] ? ctgs[term.configuration] : term.configuration;
                        }

                        if (term.source !== 'All') {
                          newTerm.source = ctgs[term.source] ? ctgs[term.source] : term.source;
                        }

                        inputTerms.push(newTerm);
                      });
                    });
                    // Get unique terms
                    const termStringsObject = {};
                    inputTerms.forEach((term) => {
                      // Build string for each term
                      let termString = '';
                      if (term.territory && Array.isArray(term.territory)) {
                        termString += `Territory:${term.territory.sort().join('')}`;
                      } else if (term.territory) {
                        termString += `Territory:${term.territory}`;
                      }
                      if (term.distributionChannel && Array.isArray(term.distributionChannel)) {
                        termString += `Channel:${term.distributionChannel.sort().join('')}`;
                      } else if (term.territory) {
                        termString += `Channel:${term.distributionChannel}`;
                      }
                      if (term.configuration && Array.isArray(term.configuration)) {
                        termString += `Config:${term.configuration.sort().join('')}`;
                      } else if (term.territory) {
                        termString += `Config:${term.configuration}`;
                      }
                      if (term.source && Array.isArray(term.source)) {
                        termString += `Source:${term.source.sort().join('')}`;
                      } else if (term.source) {
                        termString += `Source:${term.source}`;
                      }

                      // Only add terms where string doesn't exist
                      if (!termStringsObject[termString]) {
                        termStringsObject[termString] = term;
                      }
                    });

                    // Add unique
                    Object.keys(termStringsObject).forEach((key) => {
                      terms.push(termStringsObject[key]);
                    });
                    cb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    ], async (err) => {
      if (err) {
        callback(err);
      } else {
        const template = client.clientType === 'Publisher' ? config.exportTemplates.unreportedPublishing : config.exportTemplates.unreportedReport;
        const salesFileIdsFilter = Array.isArray(excludedSalesFiles) ? period.salesFilesIds.filter((id) => !excludedSalesFiles.includes(id)) : period.salesFilesIds;

        // Create Sales Lines filter table for for suspense / resolved sales groups filtering when building main filter
        await SuspenseHelpers.createSalesLinesFilterTable({ client, period, bigQuery, processType: 'MechanicalUnreportedSalesCsv' });

        const salesFilter = await CalculationHelpers.buildMainQuery({ client, period, bigQuery, salesFileIds: salesFileIdsFilter, processType: 'MechanicalUnreportedSalesCsv' }).catch((buildQueryErr) => {
          logger.error(`${period._id} Error building main query: `, buildQueryErr);
          callback(buildQueryErr);
        });
        const releaseFilter = {
          ...salesFilter, status: 'Complete', catType: 'Release', releaseId: { $in: releaseIds }, $or: terms,
        };
        const trackFilter = {
          ...salesFilter, status: 'Complete', catType: 'Track', trackId: { $in: trackIds }, $or: terms,
        };
        const contractFilter = {
          ...salesFilter, status: 'Complete', catType: 'Contract', 'Input.contractId': { $in: includedContractIds }, $or: terms,
        };
        const salesInputColumns = client.clientType === 'Publisher'
          ? ['id', 'salesFileId', 'catalogueContractIds', 'catType', 'source', 'status', 'subSource', 'territory', 'barcode', 'catNo', 'catalogueWorkTitle', 'catalogueIdentifier', 'catalogueIswc', 'catalogueTunecode', 'catalogueWorkComposer', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'workId', 'saleDate', 'transactionDate', 'description']
          : ['id', 'salesFileId', 'contractId', 'catalogueContractIds', 'catType', 'source', 'status', 'subSource', 'territory', 'releaseId', 'catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'ppd', 'barcode', 'catNo', 'catalogueIsrc', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'trackId', 'isrc', 'distributionChannel', 'configuration', 'priceCategory', 'units', 'grossAmount', 'netAmount', 'originalCurrency', 'exchangeRate', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'saleDate', 'transactionDate', 'description'];
        // Separate queries if total of ids is above 250k
        const filter = releaseIds.length + trackIds.length < 250000 ? { $or: [releaseFilter, trackFilter, contractFilter] } : [releaseFilter, trackFilter, contractFilter];
        const object = {
          logKey,
          bigQuery,
          databaseTable: client.bigQuerySalesTable,
          template,
          noConsolidation: true,
          filter,
          s3WriteKey: `periods/${period._id.toString()}/Unreported Sales Report.csv`,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Region: process.env.S3_region,
          s3Bucket: process.env.S3_bucket,
          joinedSalesData: true,
          contractIds: includedContractIds,
          salesInputColumns,
          salesOutputColumns: ['salesLineId'],
        };
        writeCsv(object, async (err, result) => {
          if (err) {
            callback(err);
          } else {
            // Delete Sales Lines filter table
            await SuspenseHelpers.deleteSalesLinesFilterTable({ client, period, bigQuery, processType: 'MechanicalUnreportedSalesCsv' });
            const time = new Date().getTime();
            Period.findByIdAndUpdate(period._id, { $set: { unreportedSalesCsv: result, unreportedSalesCsvLastRun: time } })
              .then(() => {
                callback(null, result);
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          }
        });
      }
    });
  },
  createUnreportedCostsCsv: (period, db, client, callback) => {
    const logKey = `${period._id} | Unreported Costs File`;
    // Get any cost IDs that are associated with contracts in this period type
    CreatePeriodFiles.getCostsForUnreported(period, client, (err, costIds) => {
      costIds = costIds || [];
      const object = {
        logKey,
        db,
        databaseTable: 'costs',
        filter: {
          clientId: period.clientId,
          _id: { $in: costIds.map((id) => new ObjectId(id)) },
          $or: [{ calculationContractIds: { $exists: false } }, { calculationContractIds: { $exists: true, $size: 0 } }],
        },
        template: config.exportTemplates.unreportedCostsReport,
        noConsolidation: false,
        s3WriteKey: `periods/${period._id.toString()}/Unreported Costs Report.csv`,
        s3AccessKey: process.env.S3_access_key,
        s3SecretKey: process.env.S3_secret_key,
        s3Region: process.env.S3_region,
        s3Bucket: process.env.S3_bucket,
      };
      writeCsv(object, (err, result) => {
        if (err) {
          callback(err);
        } else {
          const time = new Date().getTime();
          Period.findByIdAndUpdate(period._id, { $set: { unreportedCostsCsv: result, unreportedCostsCsvLastRun: time } })
            .then(() => {
              callback(null, result);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        }
      });
    });
  },
  getCostsForUnreported: (period, client, callback) => {
    let contractIds; let releaseIds; let trackIds; let workIds;
    async.waterfall([
      function (cb) {
        // Get all contracts associated with period type
        Contract.distinct('_id', { clientId: client._id.toString(), accountingPeriod: period.accountingPeriodType })
          .then((contracts) => {
            contractIds = contracts.map((id) => id.toString());
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get all releases associated with the contracts of this period type
        const catalogueQuery = {
          $or: [
            { clientId: client._id.toString(), costsRights: { $elemMatch: { contractId: { $in: contractIds } } } },
            { clientId: client._id.toString(), costsRights: { $size: 0 } },
            { clientId: client._id.toString(), costsRights: { $exists: false } },
          ],
        };
        Release.distinct('_id', catalogueQuery)
          .then((releases) => {
            releaseIds = releases.map((id) => id.toString());
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get all tracks associated with the contracts of this period type
        const catalogueQuery = {
          $or: [
            { clientId: client._id.toString(), costsRights: { $elemMatch: { contractId: { $in: contractIds } } } },
            { clientId: client._id.toString(), costsRights: { $size: 0 } },
            { clientId: client._id.toString(), costsRights: { $exists: false } },
          ],
        };
        Track.distinct('_id', catalogueQuery)
          .then((tracks) => {
            trackIds = tracks.map((id) => id.toString());
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get all works associated with the contracts of this period type
        const catalogueQuery = {
          $or: [
            { clientId: client._id.toString(), costsRights: { $elemMatch: { contractId: { $in: contractIds } } } },
            { clientId: client._id.toString(), costsRights: { $size: 0 } },
            { clientId: client._id.toString(), costsRights: { $exists: false } },
          ],
        };
        Work.distinct('_id', catalogueQuery)
          .then((works) => {
            workIds = works.map((id) => id.toString());
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    ], (err) => {
      if (err) {
        callback(err);
      } else {
        const costIds = [];
        const limit = 10000;
        CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, limit, null, costIds, callback);
      }
    });
  },
  getCostsBatch: (period, contractIds, releaseIds, trackIds, workIds, limit, lastCostId, costIds, callback) => {
    const filter = { clientId: period.clientId, _id: { $in: period.costIds.map((costId) => ObjectId.createFromHexString(costId)) } };
    if (lastCostId) {
      filter._id.$gt = lastCostId;
    }
    // Get all costs associated with the period
    logger.debug(filter);
    Cost.find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .then((costs) => {
        costs.forEach((cost) => {
          const includedContractIds = cost.contractIds.filter((id) => contractIds.includes(id.toString())).length;
          const includedReleaseIds = cost.releaseIds.filter((id) => releaseIds.includes(id.toString())).length;
          const includedTrackIds = cost.trackIds.filter((id) => trackIds.includes(id.toString())).length;
          const includedWorkIds = cost.workIds.filter((id) => workIds.includes(id.toString())).length;
          const noAssociations = (cost.contractIds.length === 0 && cost.releaseIds.length === 0 && cost.trackIds.length === 0 && cost.workIds.length === 0);
          // Save any IDs where a cost is associated with something of this type, or it's has no association at all
          if (includedContractIds || includedReleaseIds || includedTrackIds || includedWorkIds || noAssociations) {
            costIds.push(cost._id);
          }
        });
        if (costs.length === limit) {
          // Rerun process getting next batch
          // Set the last cost ID to set the $gt value
          if (costs[costs.length - 1]) {
            lastCostId = costs[costs.length - 1]._id;
          }
          CreatePeriodFiles.getCostsBatch(period, contractIds, releaseIds, trackIds, workIds, limit, lastCostId, costIds, callback);
        } else {
          callback(null, costIds);
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  createSuspenseCsv: async (period, bigQuery, client, callback) => {
    if (client.features?.suspense && period.contractType !== 'MCPS') {
      const template = client.clientType === 'Publisher' ? config.exportTemplates.suspensePublishing : config.exportTemplates.suspense;
      logger.info(`${period._id} Creating Suspense`);
      const salesLinesFilterTableName = await SuspenseHelpers.buildSalesLinesFilterTableName({ client, period });
      const filter = `id IN ( SELECT id FROM \`${bigQuery.datasetName}.${salesLinesFilterTableName}\` WHERE calculate IS FALSE )`;
      const object = {
        bigQuery,
        databaseTable: client.bigQuerySalesTable,
        filter,
        template,
        noConsolidation: true,
        s3WriteKey: `periods/${period._id.toString()}/Suspense Export.csv`,
        s3AccessKey: process.env.S3_access_key,
        s3SecretKey: process.env.S3_secret_key,
        s3Region: process.env.S3_region,
        s3Bucket: process.env.S3_bucket,
      };
      writeCsv(object, (err, result) => {
        if (err) {
          callback(err);
        } else {
          Period.findByIdAndUpdate(period._id, { $set: { suspenseCsv: result } })
            .then(() => {
              callback(null, result);
            })
            .catch((err) => {
              callback(err);
            });
        }
      });
    } else if (period.suspenseCsv) {
      logger.debug(`${period._id} - Suspense feature disabled - clearing old suspenseCsv`);
      Period.findByIdAndUpdate(period._id, { $unset: { suspenseCsv: 1 } })
        .then(() => {
          callback();
        })
        .catch(callback);
    } else {
      callback();
    }
  },
  createMcpsStatement(period, db, bigQuery, client, callback) {
    const filters = {};
    async.parallel([
      function (cb) {
        // Get releases for mapping data
        Release.find({ clientId: period.clientId }, {
          title: 1, catNo: 1, barcode: 1, artist: 1, format: 1, releaseDate: 1, dealerPrice: 1, mcpsId: 1, mcpsTvAdvertised: 1,
        })
          .then((releases) => {
            // Organise data with ID as key
            const releaseData = {};
            releases.forEach((release) => {
              releaseData[release._id.toString()] = release;
            });
            cb(null, releaseData);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get retentions for mapping data
        McpsRetention.find({ clientId: period.clientId, year: period.year, accountingPeriod: period.accountingPeriod })
          .then((retentions) => {
            cb(null, retentions);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get negatives for mapping data
        McpsNegative.find({ clientId: period.clientId, year: period.year, accountingPeriod: period.accountingPeriod })
          .then((negatives) => {
            cb(null, negatives);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        McpsSalesTerms.seperatedMcpsSalesTerms(client, client.mcpsTargets, (err, output) => {
          filters.mcpsTargets = output;
          cb();
        });
      },
      function (cb) {
        McpsSalesTerms.seperatedMcpsSalesTerms(client, client.mcpsFreeGoodsTargets, (err, output) => {
          filters.mcpsFreeGoodsTargets = output;
          cb();
        });
      },
      function (cb) {
        McpsSalesTerms.seperatedMcpsSalesTerms(client, client.mcpsReturnsTargets, (err, output) => {
          filters.mcpsReturnsTargets = output;
          cb();
        });
      },
      function (cb) {
        McpsSalesTerms.seperatedMcpsSalesTerms(client, client.mcpsReturnsNegativeSales, (err, output) => {
          filters.mcpsReturnsNegativeSales = output;
          cb();
        });
      },
      function (cb) {
        McpsSalesTerms.seperatedMcpsSalesTerms(client, client.mcpsConsignmentTargets, (err, output) => {
          filters.mcpsConsignmentTargets = output;
          cb();
        });
      },
    ], (err, results) => {
      if (err) {
        callback(err);
      } else {
        const object = {
          statementDesign: 'MCPS',
          db,
          bigQuery,
          periodSalesDatabaseTable: client.periodSalesDatabaseTable,
          accountNo: client.mcpsId,
          internationalBasis: client.mcpsInternationalBasis,
          periodId: period._id.toString(),
          clientId: client._id.toString(),
          contractName: client.name,
          clientName: client.name,
          labelName: client.name,
          year: period.year,
          accountingPeriod: period.accountingPeriod,
          startDate: period.startDate,
          endDate: period.endDate,
          mcpsId: client.mcpsId,
          filter: filters.mcpsTargets,
          freeGoodsFilter: filters.mcpsFreeGoodsTargets,
          returnsFilter: filters.mcpsReturnsTargets,
          returnsNegativeSales: filters.mcpsReturnsNegativeSales,
          consignmentFilter: filters.mcpsConsignmentTargets,
          minPerUnitRate: client.mcpsMinPerUnitRate,
          releases: results[0],
          retentions: results[1],
          negatives: results[2],
          s3WriteKey: `periods/${period._id.toString()}/MCPS Statement.xlsx`,
          accessKey: process.env.S3_access_key,
          secretAccessKey: process.env.S3_secret_key,
          region: process.env.S3_region,
          bucket: process.env.S3_bucket,
        };

        customStatement(object, (err, result) => {
          if (err) {
            callback(err);
          } else {
            Period.findByIdAndUpdate(period._id, { $set: { customStatement: result } })
              .then(() => {
                callback(null, result);
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          }
        });
      }
    });
  },
};

module.exports = CreatePeriodFiles;
