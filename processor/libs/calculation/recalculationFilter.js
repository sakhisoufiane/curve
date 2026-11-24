const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const { waterfall, each, series, parallel } = require('async');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const SalesFile = require('../../models/salesFile');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Cost = require('../../models/cost');
const Company = require('../../models/company');
const TerritoryGroup = require('../../models/territoryGroup');
const Report = require('../../models/report');
const Statement = require('../../models/statement');
const SalesGroupLines = require('../../models/salesGroupLines');
const PeriodStatementCreation = require('./period/periodStatementCreation');

const runLogSuffix = ' - Forcing Full recalculation';
// @todo create calculation/index.js in libs - central hub requires and exports a range of helper libs - reference this from the index.js

const calculationLib = {
  createFilter(db, bigQuery, period, client, modComparisonTime, overrideAlwaysRunFull, callback) {
    // return callback(new Error('Unhappy path test'));
    // overrideAlwaysRunFull = false; // Manual codebase override
    const { processEndTime, runNo } = period;
    const initialRun = (runNo === 1 && !processEndTime);
    const clientId = client._id.toString();
    // const recalculation = { type: 'Full', status: '', costIds: [], contractIds: [], salesFilesIds: [] };
    const recalculation = {
      startTime: new Date(),
      currencyExchangeRates: period.currencyExchangeRates,
    };

    checkForceFull(db, period, clientId, client, modComparisonTime, overrideAlwaysRunFull, initialRun, (err, forceFull) => {
      // handle err
      // err = new Error('Test Error Flow');
      recalculation.modComparisonTime = modComparisonTime;
      if (err) {
        const explain = 'Error checking force full options';
        logger.error(`${period._id} ${explain}`);
        logger.error(err);
        forceFull = true; // necessary? believe we just error and out here
        recalculation.type = 'Unknown';
        recalculation.explain = explain;
        recalculation.status = 'Errored';
        logRecalculationDetails(initialRun, modComparisonTime, runNo, recalculation);
        return callback(err, recalculation);
      }

      // Check if this is the first run of this period or if full required in checkForceFull. If either then return to the calculation, otherwise build the recalculation filter
      if (forceFull) {
        recalculation.type = (initialRun) ? 'Initial' : 'Full';
        recalculation.status = 'Processing';
        recalculation.explain = forceFull;
        logger.info(`${period._id} recalculation:`, JSON.stringify(recalculation, null, 6));
        logRecalculationDetails(initialRun, modComparisonTime, runNo, recalculation);
        callback(null, recalculation);
      } else {
        recalculation.type = 'Partial';
        let contractIds = [];
        const { clientType } = client;
        const periodSalesFiles = period.salesFilesIds.map((id) => new ObjectId(id)); // check why we're converting salesFileIds and not costIds as subsequent logic should be same
        const contractType = period.contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };
        const accountingPeriod = period.accountingPeriodType;
        const params = [db, clientId, modComparisonTime, accountingPeriod, contractType];

        parallel({
          // Retrieve all contracts affected by payee changes including deletion
          updatedPayeeContracts(cb) { calculationLib.getUpdatedPayeeContracts(...params, cb); },
          // Retrieve all contracts affected by company changes including deletion
          updatedCompanyContracts(cb) { calculationLib.getUpdatedCompanyContracts(...params, cb); },
          // Retrieve all explicitly modified contracts. * Also is it worth checking associated catalogue as if the contract has none and never did then running the contract is unnecessary
          updatedContracts(cb) { calculationLib.getUpdatedRawContracts(...params, cb); },
          // Retrieve all contracts affected by territoryGroup changes including deletion
          updatedTerritoryContracts(cb) { calculationLib.getUpdatedTerritoryGroups(...params, cb); },
          // Retrieve all contracts affected by territoryGroup changes including deletion
          updatedTermGroupContracts(cb) { calculationLib.getUpdatedContractTermGroups(...params, cb); },
          // Retrieve all contracts affected by catalogue changes including deletion
          updatedCatalogueContracts(cb) { calculationLib.getUpdatedCatalogueContracts(...params, cb); },
          // Retrieve all contracts affected by costs changes including deletion
          updatedCostsContracts(cb) { calculationLib.getUpdatedCostsContracts(...params, period._id, period.costIds, cb); },
          // Retrieve all modified sales files and affected contracts
          updatedSalesFiles(cb) { calculationLib.getUpdatedSalesFiles(...params, bigQuery, clientType, period._id, periodSalesFiles, client, cb); },
          // Retrieve all contracts with statement associations unrelated to this period which have been updated after the modComparisonTime (previous processStartTime)
          updatedStatementContracts(cb) { calculationLib.getUpdatedStatementContracts(...params, period._id, cb); },
        }, async (err, results) => {
          // Return any error to the calculation workflow
          if (err) { return callback(err); }
          logger.debug('================== PROCESS RECALCULATION FILTER =================='); logger.debug({ results });
          // Extract contract data for recalculation filter
          const { updatedPayeeContracts, updatedCompanyContracts, updatedContracts, updatedTerritoryContracts } = results;
          const { updatedTermGroupContracts, updatedCatalogueContracts, updatedCostsContracts, updatedSalesFiles, updatedStatementContracts } = results;

          // Merge array of modified contract ids
          if (updatedContracts?.length > 0) { contractIds.push(...updatedContracts); }
          if (updatedPayeeContracts?.length > 0) { contractIds.push(...updatedPayeeContracts); }
          if (updatedCompanyContracts?.length > 0) { contractIds.push(...updatedCompanyContracts); }
          if (updatedTerritoryContracts?.length > 0) { contractIds.push(...updatedTerritoryContracts); }
          if (updatedTermGroupContracts?.length > 0) { contractIds.push(...updatedTermGroupContracts); }
          if (updatedCatalogueContracts?.length > 0) { contractIds.push(...updatedCatalogueContracts); }
          if (updatedStatementContracts?.length > 0) { contractIds.push(...updatedStatementContracts); }
          logger.debug({ updatedContractsPreCosts: contractIds.filter(calculationLib.onlyUnique) });

          // consider storing sales & costs change based contracts in keyed objects in addition to the all contracts array for more granularity in recalculation
          // i.e like we do for sales files changes - all contracts get cleared  and recreated statements but only costs driven contract changes need to reprocess costs data and only sales related ones reprocess
          // costsContracts = { <costid>: [<contractid>,<contractid>] }, salesContracts = { <contracsalesFiletid>: [<contractid>,<contractid>] }

          // Add costs data to the recalculation filter
          if (updatedCostsContracts?.costIds?.length > 0) {
            recalculation.costIds = updatedCostsContracts.costIds
              .map((id) => id.toString())
              .filter(calculationLib.onlyUnique)
              .filter(calculationLib.isValidObjectIdString);
            contractIds.push(...updatedCostsContracts.contractIds);
          }

          // Ensure all passed contract Ids are unique strings which represent valid contractId Strings
          contractIds = contractIds
            .map((id) => id.toString())
            .filter(calculationLib.onlyUnique)
            .filter(calculationLib.isValidObjectIdString);

          if (updatedSalesFiles) {
            updatedSalesFiles.contractIds = updatedSalesFiles.contractIds
              .filter(calculationLib.onlyUnique)
              .filter(calculationLib.isValidObjectIdString);

            // We need to check if the impacted contracts have any escalations set against them,
            // if that's the case, then these contracts should be recalculated in full and not just the impacted sales files
            if (updatedSalesFiles.contractIds?.length) {
              const contracts = await Contract.find({ _id: { $in: updatedSalesFiles.contractIds } }).select('_id salesTerms costsTerms');
              contracts.forEach((contract) => {
                if (PeriodStatementCreation.isContractUsingEscalations(contract)) {
                  // Remove the contract from the updatedSalesFiles array
                  updatedSalesFiles.contractIds.splice(updatedSalesFiles.contractIds.indexOf(contract._id.toString()), 1);
                  // Add it to the updated contract Ids array so it's recalculated in full
                  if (!contractIds.includes(contract._id.toString())) {
                    contractIds.push(contract._id.toString());
                  }
                }
              });
            }
          }

          // Check cross contracts and return finalised recalculation filter
          calculationLib.expandContractAssociations(db, clientId, contractIds, updatedSalesFiles, modComparisonTime, (crossError, result) => {
            if (crossError) { return callback(crossError); }

            if (result?.salesContractIds?.length > 0) {
              updatedSalesFiles.contractIds = result.salesContractIds;
              recalculation.salesFiles = updatedSalesFiles;
            }
            if (result?.contractIds?.length > 0) {
              recalculation.contractIds = result.contractIds;
            }
            if (result?.periodIsModified) {
              recalculation.status = 'Processing';
            } else {
              recalculation.status = 'No Changes';
              recalculation.endTime = new Date();
            }

            logRecalculationDetails(initialRun, modComparisonTime, runNo, recalculation);
            callback(null, recalculation);
          });
        });
      }
    });
  },
  // helper function to get modified/deleted territoryGroups and return affected contracts array
  getUpdatedTerritoryGroups(db, clientId, modComparisonTime, accountingPeriod, contractType, callback) {
    waterfall([
      // MODIFICATIONS : first get all client territoryGroups modified since last period run
      (filterCallback) => {
        TerritoryGroup.distinct('_id', { clientId, updatedAt: { $gte: modComparisonTime } })
          .then((territoryGroups) => {
            filterCallback(null, territoryGroups);
          })
          .catch((err) => {
            logger.error(err);
            filterCallback(err);
          });
      },
      // DELETIONS : Now need to retrieve any territoryGroups deleted since last period run via patches
      (modifiedTGs, filterCallback) => {
        const projection = { _id: 0, 'ops.value._id': 1 };
        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          'ops.value.clientId': clientId,
          'ops.op': 'deleted',
        };

        db.collection('territory_group_patches')
          .find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('%%%% getUpdatedTerritoryGroups : territoryGroups deleted: ', JSON.stringify(patches, null, 2));
            modifiedTGs.push(...patches.map((item) => item.ops[0].value._id || false).filter(Boolean));
            filterCallback(null, modifiedTGs);
          })
          .catch(filterCallback);
      },
      // GET CONTRACTS : get contract ids associated to modified territory groups
      (modifiedTGs, filterCallback) => {
        if (modifiedTGs?.length > 0) {
          modifiedTGs = modifiedTGs.map((id) => id.toString());
          const contractFilter = {
            clientId,
            accountingPeriod,
            contractType,
            $or: [
              { 'salesTerms.territory': { $in: modifiedTGs } },
              { 'deductionsTerms.territory': { $in: modifiedTGs } },
              { 'mechanicalTerms.territory': { $in: modifiedTGs } },
              { 'withholdingTaxTerms.territory': { $in: modifiedTGs } },
              { 'costsTerms.territory': { $in: modifiedTGs } },
            ],
          };
          Contract.distinct('_id', contractFilter)
            .then((territoryGroups) => {
              filterCallback(null, territoryGroups);
            })
            .catch((err) => {
              logger.error(err);
              filterCallback(err);
            });
        } else {
          filterCallback();
        }
      },
    ], callback);
  },
  // helper function to get modified/deleted territoryGroups and return affected contracts array
  getUpdatedContractTermGroups(db, clientId, modComparisonTime, accountingPeriod, contractType, callback) {
    waterfall([
      // MODIFICATIONS : first get all client contractTermGroups modified since last period run
      (filterCallback) => {
        const updatesFilter = { clientId, updatedAt: { $gte: modComparisonTime } };
        db.collection('contracttermgroups')
          .aggregate([
            { $match: updatesFilter },
            { $group: { _id: '$type', ids: { $addToSet: '$_id' } } },
          ], { allowDiskUse: true })
          .toArray()
          .then((aggregate) => {
            filterCallback(null, aggregate);
          })
          .catch(filterCallback);
      },
      // DELETIONS : Now need to retrieve any contractTermGroups deleted since last period run via patches
      (modifiedTermGroups, filterCallback) => {
        logger.debug('%%%% getUpdatedContractTermGroups: mods');
        logger.debug(JSON.stringify(modifiedTermGroups, null, 2));

        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          'ops.value.clientId': clientId,
          'ops.op': 'deleted',
        };

        db.collection('contract_term_group_patches').aggregate([
          { $match: patchFilter },
          { $group: { _id: '$ops.value.type', ids: { $addToSet: '$ref' } } },
          { $unwind: '$_id' },
        ], { allowDiskUse: true })
          .toArray()
          .then((patchGroups) => {
            filterCallback(null, modifiedTermGroups, patchGroups);
          })
          .catch(filterCallback);
      },
      // GET CONTRACTS : get contract ids associated to modified contract term groups
      (modifiedTermGroups, patchGroups, filterCallback) => {
        logger.debug('%%%% getUpdatedContractTermGroups: deletions');
        logger.debug(JSON.stringify(patchGroups, null, 2));

        // Merge the two data sources
        patchGroups.forEach((patchGroup) => {
          const typeGroup = _.find(modifiedTermGroups, { _id: patchGroup._id });
          if (typeGroup) {
            typeGroup.ids = typeGroup.ids || [];
            typeGroup.ids.push(...patchGroup.ids);
          } else {
            modifiedTermGroups.push({
              _id: patchGroup._id,
              ids: patchGroup.ids,
            });
          }
        });

        // If we have modifications then build the contract filter
        if (modifiedTermGroups?.length > 0) {
          const $or = [];
          const contractTerms = ['salesTerms', 'deductionsTerms', 'mechanicalTerms', 'withholdingTaxTerms'];
          const mapper = {
            channel: 'Distribution Channel',
            configuration: 'Configuration',
            priceCategory: 'Price Category',
            source: 'Source',
          };

          // Loop through the search options to build array of or statements
          Object.entries(mapper).forEach((entry) => {
            const [field, label] = entry;
            const typeGroupIds = _.find(modifiedTermGroups, { _id: label });

            if (typeGroupIds?.ids?.length > 0) {
              // eg $or.push( { 'salesTerms.channel': { $in: typeGroupIds.ids.map((id) => id.toString()) } }, );
              contractTerms.forEach((term) => {
                $or.push({
                  [`${term}.${field}`]: { $in: typeGroupIds.ids.map((id) => id.toString()) },
                });
              });
            }
          });

          // Cost Types : Only type field needs tested here
          const costTypeIds = _.find(modifiedTermGroups, { _id: 'Cost Type' });
          if (costTypeIds?.ids?.length > 0) {
            $or.push({ 'costsTerms.type': { $in: costTypeIds.ids.map((id) => id.toString()) } });
          }

          // Finally get associated contract ids
          const contractFilter = { clientId, accountingPeriod, contractType, $or };
          logger.debug('%%%% getUpdatedContractTermGroups: contractFilter: ', JSON.stringify(contractFilter, null, 2));
          Contract.distinct('_id', contractFilter)
            .then((contracts) => {
              filterCallback(null, contracts);
            })
            .catch((err) => {
              logger.error(err);
              filterCallback(err);
            });
        } else {
          filterCallback();
        }
      },
    ], callback);
  },
  // helper function to get modified/deleted companies and return affected contracts array
  getUpdatedCompanyContracts(db, clientId, modComparisonTime, accountingPeriod, contractType, callback) {
    waterfall([
      // MODIFICATIONS : first get all client companies modified since last period run
      (filterCallback) => {
        Company.distinct('_id', { clientId, updatedAt: { $gte: modComparisonTime } })
          .then((companies) => {
            filterCallback(null, companies);
          })
          .catch((err) => {
            logger.error(err);
            filterCallback(err);
          });
      },
      // DELETIONS : Now need to retrieve any companies deleted since last period run via patches
      (modifiedCompanies, filterCallback) => {
        const projection = { _id: 0, 'ops.value._id': 1 };
        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          'ops.value.clientId': clientId,
          'ops.op': 'deleted',
        };

        db.collection('company_patches').find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('???? getUpdatedCompanyContracts : Companies deleted: ', JSON.stringify(patches, null, 2));
            modifiedCompanies.push(...patches.map((item) => item.ops[0].value._id || false).filter(Boolean));
            filterCallback(null, modifiedCompanies);
          })
          .catch(filterCallback);
      },
      // GET CONTRACTS : get contract ids associated to modified companies
      (modifiedCompanies, filterCallback) => {
        if (modifiedCompanies?.length > 0) {
          Contract.distinct('_id', { clientId, companyId: { $in: modifiedCompanies.map((id) => id.toString()) }, accountingPeriod, contractType })
            .then((contracts) => {
              filterCallback(null, contracts);
            })
            .catch((err) => {
              logger.error(err);
              filterCallback(err);
            });
        } else {
          filterCallback();
        }
      },
    ], callback);
  },
  // helper function to get modified/deleted payees and return affected contracts array
  getUpdatedPayeeContracts(db, clientId, modComparisonTime, accountingPeriod, contractType, callback) {
    waterfall([
      // MODIFICATIONS : first get all client payees modified since last period run
      (filterCallback) => {
        Payee.distinct('_id', { clientId, updatedAt: { $gte: modComparisonTime } })
          .then((payees) => {
            filterCallback(null, payees);
          })
          .catch((err) => {
            logger.error(err);
            filterCallback(err);
          });
      },
      // DELETIONS : Now need to retrieve any client payees deleted since last period run via patches
      (modifiedPayees, filterCallback) => {
        const projection = { _id: 0, 'ops.value._id': 1 };
        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          'ops.value.clientId': clientId,
          'ops.op': 'deleted',
        };

        db.collection('payee_patches')
          .find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('$$$$ getUpdatedPayeeContracts : Payees deleted: ', JSON.stringify(patches, null, 2));
            modifiedPayees.push(...patches.map((item) => item.ops[0].value._id || false).filter(Boolean));
            filterCallback(null, modifiedPayees);
          })
          .catch(filterCallback);
      },
      // GET CONTRACTS : get contract ids associated to modified payees
      (modifiedPayees, filterCallback) => {
        if (modifiedPayees?.length > 0) {
          Contract.distinct('_id', { clientId, 'payees.payeeId': { $in: modifiedPayees.map((id) => id.toString()) }, accountingPeriod, contractType })
            .then((contracts) => {
              filterCallback(null, contracts);
            })
            .catch((err) => {
              logger.error(err);
              filterCallback(err);
            });
        } else {
          filterCallback();
        }
      },
    ], callback);
  },
  // helper function to get contracts related to statements which are from older periods which have been updated after this periods last run
  getUpdatedStatementContracts(db, clientId, modComparisonTime, accountingPeriod, contractType, periodId, callback) {
    waterfall([
      // MODIFICATIONS : first get all statements modified since last period run which are not related to this period and return the related contract id
      (filterCallback) => {
        Statement.distinct('contractId', { clientId, periodId: { $ne: periodId }, updatedAt: { $gte: modComparisonTime } })
          .then((statements) => {
            filterCallback(null, statements);
          })
          .catch((err) => {
            logger.error(err);
            filterCallback(err);
          });
      },
      // REFINE CONTRACTS : need to refine contracts by accountingPeriod and contractType
      (modifiedStatementContracts, filterCallback) => {
        if (modifiedStatementContracts?.length > 0) {
          Contract.distinct('_id', { clientId, _id: { $in: modifiedStatementContracts.map((id) => id.toString()) }, accountingPeriod, contractType })
            .then((contracts) => {
              filterCallback(null, contracts);
            })
            .catch((err) => {
              logger.error(err);
              filterCallback(err);
            });
        } else {
          filterCallback();
        }
      },
    ], callback);
  },
  // helper function to get modified/deleted contracts and return affected contracts array
  getUpdatedRawContracts(db, clientId, modComparisonTime, accountingPeriod, contractType, callback) {
    waterfall([
      // MODIFICATIONS : first get all contracts modified since last period run
      (filterCallback) => {
        const filter = { clientId, updatedAt: { $gte: modComparisonTime }, accountingPeriod, contractType };
        Contract.distinct('_id', filter)
          .then((contracts) => {
            filterCallback(null, contracts);
          })
          .catch((err) => {
            logger.error(err);
            filterCallback(err);
          });
      },
      // DELETIONS : Now need to retrieve any contracts deleted since last period run via patches
      (modifiedContracts, filterCallback) => {
        const projection = { _id: 0, 'ops.value._id': 1 };
        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          'ops.value.clientId': clientId,
          'ops.value.contractType': contractType,
          'ops.value.accountingPeriod': accountingPeriod,
          'ops.op': 'deleted',
        };

        db.collection('contract_patches')
          .find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('@@@@ getUpdatedRawContracts : Raw contracts deleted: ', JSON.stringify(patches, null, 2));
            modifiedContracts.push(...patches.map((item) => item.ops[0].value || false).filter(Boolean));
            filterCallback(null, modifiedContracts);
          })
          .catch(filterCallback);
      },
      // Accounting period changes : Now need to retrieve any contracts whose accounting period changed away from the period accounting type since last run
      (modifiedContracts, filterCallback) => {
        const projection = { _id: 0, ref: 1 };
        // Potential issue in that we cant determine contractType here - worst case we return a contract which doesn't need reprocessing
        // @todo create index for this query
        const patchFilter = {
          clientId: new ObjectId(clientId),
          timestamp: { $gte: modComparisonTime },
          'ops.op': 'replace',
          'ops.path': '/accountingPeriod',
          'ops.originalValue': accountingPeriod,
        };

        db.collection('contract_patches')
          .find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('@@@@ getUpdatedRawContracts : Raw contracts modified accounting period: ', JSON.stringify(patches, null, 2));
            modifiedContracts.push(...patches.map((item) => item.ref || false).filter(Boolean));
            filterCallback(null, modifiedContracts);
          })
          .catch(filterCallback);
      },
    ], callback);
  },
  // helper function to get modified/deleted catalogue and return affected contracts array
  getUpdatedCatalogueContracts(db, clientId, modComparisonTime, accountingPeriod, contractType, callback) {
    // setImmediate(() => { callback(null, ['aaa', 'bbb', '60f1c21e89eb20509b3cd941']); // updatedCatalogueContracts.map((id) => id.toString()) });
    waterfall([
      // MODIFICATIONS : first get all cat items modified since last period run
      (filterCallback) => {
        const catProjection = 'salesReturnsRights.contractId costsRights.contractId releaseSpecificSalesReturnsRights.contractId channelSpecificSalesReturnsRights.contractId';
        const catFilter = { clientId, updatedAt: { $gte: modComparisonTime } };
        series({
          modifiedReleases(cb) {
            Release.find(catFilter, catProjection)
              .then((releases) => {
                cb(null, releases);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          modifiedTracks(cb) {
            Track.find(catFilter, catProjection)
              .then((tracks) => {
                cb(null, tracks);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          modifiedWorks(cb) {
            Work.find(catFilter, catProjection)
              .then((works) => {
                cb(null, works);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
        }, filterCallback);
      },
      // CATALOGUE DELETIONS : Now need to retrieve any catalogue items deleted since last period run via patches
      (modifiedCatalogue, filterCallback) => {
        const { modifiedReleases, modifiedTracks, modifiedWorks } = modifiedCatalogue;
        const projection = {
          _id: 0,
          'ops.value._id': 1,
          'ops.value.salesReturnsRights.contractId': 1,
          'ops.value.costsRights.contractId': 1,
          'ops.value.releaseSpecificSalesReturnsRights.contractId': 1,
          'ops.value.channelSpecificSalesReturnsRights.contractId': 1,
        };
        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          'ops.value.clientId': clientId,
          'ops.op': 'deleted',
        };
        logger.debug('#### getUpdatedCatalogueContracts : patchFilter = ', JSON.stringify(patchFilter, null, 2));

        each(['release', 'track', 'work'], (catType, deletionsCb) => {
          const patchCollection = db.collection(`${catType}_patches`);
          patchCollection.find(patchFilter, { projection })
            .toArray()
            .then((patches) => {
              logger.debug(`#### getUpdatedCatalogueContracts : CATALOGUE DELETIONS : (${catType}) patches = `, JSON.stringify(patches, null, 2));

              // Preserve comment please
              /* if (catType === 'release') {
                modifiedReleases.push(...patches.map((item) => {
                  console.log('------');console.log(item);
                  return item.ops[0].value || false; // Deletion patches only have 1 ops object
                }).filter(Boolean));
                console.log('**************************');console.log({modifiedReleases});console.log('**************************');
              } */
              if (catType === 'release') { modifiedReleases.push(...patches.map((item) => item.ops[0].value || false).filter(Boolean)); }
              if (catType === 'track') { modifiedTracks.push(...patches.map((item) => item.ops[0].value || false).filter(Boolean)); }
              if (catType === 'work') { modifiedWorks.push(...patches.map((item) => item.ops[0].value || false).filter(Boolean)); }

              deletionsCb();
            })
            .catch(deletionsCb);
        }, (err) => {
          filterCallback(err, modifiedReleases, modifiedTracks, modifiedWorks);
        });
      },
      // EXTRACT CONTRACTS Finally extract all current and historical contracts related to catalogue modified or deleted since last period run
      (modifiedReleases, modifiedTracks, modifiedWorks, filterCallback) => {
        const contractIds = []; // contractIds is mutated via extractCatalogueContracts
        const params = [db, contractIds, modComparisonTime, true];

        waterfall([
          extractCatalogueContracts('release', modifiedReleases, ...params),
          extractCatalogueContracts('track', modifiedTracks, ...params),
          extractCatalogueContracts('work', modifiedWorks, ...params),
        ], (err) => {
          if (err) { return filterCallback(err); }
          // Refresh Contract Ids to remove any found contractIDs which aren't relevant to current period
          logger.debug('**** getUpdatedCatalogueContracts : preRefresh', { contractIds });
          const refreshContractFilter = { clientId, accountingPeriod, contractType, _id: { $in: contractIds.map((id) => new ObjectId(id)).filter(calculationLib.onlyUnique) } };
          Contract.distinct('_id', refreshContractFilter)
            .then((contracts) => {
              filterCallback(null, contracts);
            })
            .catch((err) => {
              logger.error(err);
              filterCallback(err);
            });
        });
      },
    ], callback);
  },
  // helper function to get modified costs and related contracts
  getUpdatedCostsContracts(db, clientId, modComparisonTime, accountingPeriod, contractType, periodId, periodCostIds, callback) {
    // setImmediate(() => { callback(null, ['aaa', 'bbb', '60f1c21e89eb20509b3cd941']); // updatedCatalogueContracts.map((id) => id.toString()) });

    // 1. Recalcl is No change
    // 2. Add cost with no mapping - Recalcl is No change
    // 3. add the cost to period  - Recalcl is No change ?? @tom check this - no contracts affected - so should period included costs figure change?
    // 4. Add cost with mapping - Recalcl is  No change :
    // 5. add the cost to period - Recalcl is partial : contract extracted from mapping
    //
    //! need to add any affected contracts (directly or via catalogue to recalculation..contractIds for reprocessing - store seperately (?)
    //! as we don't need to recalculate sales lines for those contracts if otherwise unaffected?)

    // potential update // do this // contractIds = { costsSpecific: [], salesSpecific = [], allcalc = [], nocalc = []}
    /// -catalogue and contract in allcalc
    /// -costs in costs
    /// -sales in sales
    /// -some contracts may be in all
    /// -then update costs and sales paths in -
    /// --- clearPeriod - costs -> costs+allcalc , sales -> sales+allcalc, file&statement deletion -> everything
    /// --- calculations - costs -> costs+allcalc , sales -> sales+allcalc, file&statement creation -> everything
    // what about where no recalculation needed but statements need regenerated - possibly payees and or period changes?
    /// !!! !!! - have to ensure all these contracts are reproccessed ie statements deleted and recreated

    // Note : workIds not relevant for costs
    const releaseIds = []; const trackIds = []; const contractIds = [];

    waterfall([
      // PERIOD ADJUSTMENTS : Retrieve any costsIDs added to or removed from Period since last run
      (filterCallback) => {
        const projection = { _id: 0, ops: 1 }; // { _id: 0, 'ops.path': 1, 'ops.value': 1 };
        const patchFilter = {
          'ops.op': { $in: ['add', 'remove', 'replace'] },
          'ops.path': { $in: [/costIds/] }, // /costIds/
          ref: new ObjectId(periodId),
          timestamp: { $gte: modComparisonTime },
        };
        logger.debug('#### getUpdatedCostsContracts : PERIOD ADJUSTMENTS : patchFilter = ', JSON.stringify(patchFilter, null, 2));

        db.collection('period_patches')
          .find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('#### getUpdatedCostsContracts : PERIOD ADJUSTMENTS : patches - Costs Added/Removed from period = ', JSON.stringify(patches, null, 2));
            const addedOrRemovedCostIds = extractModifiedIdsFromPatches(patches || [], 'costIds');
            filterCallback(null, addedOrRemovedCostIds);
          })
          .catch(filterCallback);
      },
      // MODIFICATIONS : Get all cost documents modified since last period run and added/removed from period
      (addedOrRemovedCostIds, filterCallback) => {
        // Look for modified costs and add any associated contract ids
        const projection = { releaseIds: 1, trackIds: 1, contractIds: 1 };
        const costFilter = {
          clientId,
          $or: [
            { _id: { $in: periodCostIds }, updatedAt: { $gte: modComparisonTime } },
            { _id: { $in: addedOrRemovedCostIds } },
          ],
        };
        logger.debug('#### getUpdatedCostsContracts : MODIFICATIONS : costFilter = ', JSON.stringify(costFilter, null, 2));

        Cost.find(costFilter, projection)
          .then((modifiedCosts) => {
            logger.debug('#### getUpdatedCostsContracts : MODIFICATIONS : modifiedCosts = ', JSON.stringify(modifiedCosts || [], null, 2));
            filterCallback(null, modifiedCosts);
          })
          .catch((err) => {
            logger.error(err);
            filterCallback(err);
          });
      },
      // DELETIONS : Get any costs deleted since last period run via patches to find affected contracts
      (modifiedCosts, filterCallback) => {
        // Create a filtered array of currently known affected costIds to avoid unnecessary read of deletions
        const projection = { _id: 0, 'ops.value._id': 1, 'ops.value.releaseIds': 1, 'ops.value.trackIds': 1, 'ops.value.contractIds': 1 };
        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          'ops.value.clientId': clientId,
          'ops.op': 'deleted', // 'ops.value._id': { $nin: affectedCostIds }, // not necessary as no deleted costs will be returned by previous step
        };

        db.collection('cost_patches').find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('#### getUpdatedCostsContracts : DELETIONS : Raw costs deleted - patches = ', JSON.stringify(patches, null, 2));
            // Add cost metadata objects for any deleted costs to the modifiedCosts array
            modifiedCosts.push(...patches.map((item) => item.ops[0].value || false).filter(Boolean));
            // Pass through modified costts' documents
            filterCallback(null, modifiedCosts.filter(calculationLib.onlyUnique));
          })
          .catch(filterCallback);
      },
      // MAPPINGS : Get any existing or removed contract/catalogue mappings from  affected costs via modifiedCosts & cost_patches
      (modifiedCosts, filterCallback) => {
        // Create modifiedCostIds array to pass on for further digging
        const modifiedCostIds = modifiedCosts.map((cost) => new ObjectId(cost._id));
        logger.debug('##### getUpdatedCostsContracts : MAPPINGS :', { modifiedCostIds });

        // Loop through modified costs adding mappings to modified arrays - NOTE: Works not relevant for costs
        modifiedCosts.forEach((cost) => {
          // Add directly related contract id mappings to contractIds
          if (cost.contractIds?.length > 0) { contractIds.push(...cost.contractIds); }
          // Add catalogue mappings to catalogue arrays to retrieve related contracts via extractCatalogueContracts in the next step
          if (cost.releaseIds?.length > 0) { releaseIds.push(...cost.releaseIds); }
          if (cost.trackIds?.length > 0) { trackIds.push(...cost.trackIds); }
        });

        // Need to first get any removed/replaced contract/catalogue mappings from affected costs
        const patchFilter = {
          'ops.op': { $in: ['remove', 'replace'] }, // Added not relevant as these are included in modified costs step
          'ops.path': { $in: [/contractIds/, /releaseIds/, /trackIds/] }, // , /workIds/
          ref: { $in: modifiedCostIds },
          timestamp: { $gte: modComparisonTime },
        };
        db.collection('cost_patches').find(patchFilter)
          .toArray()
          .then((patches) => {
            logger.debug('##### getUpdatedCostsContracts : REMOVED MAPPINGS : patches = ', JSON.stringify(patches, null, 2));

            // Add removed contract mappings to contractIds array
            contractIds.push(...extractModifiedIdsFromPatches(patches || [], 'contractIds')); // do we need the check from extract cobtracts ie  if (item.op === 'remove') {} else if (item.path.includes('contractId')) { maye pass another param or identify on contract ids --  !!! identify where  contract ids is path in helper function
            // Add removed catalogue mappings to catalogue arrays to retrieve related contracts via extractCatalogueContracts in the next step
            releaseIds.push(...extractModifiedIdsFromPatches(patches || [], 'releaseIds'));
            trackIds.push(...extractModifiedIdsFromPatches(patches || [], 'trackIds'));

            filterCallback(null, modifiedCostIds);
          })
          .catch(filterCallback);
      },
      // GET AFFECTED CATALOGUE :  metadata to extract affected contracts
      (modifiedCostIds, filterCallback) => {
        logger.debug('##### getUpdatedCostsContracts : GET AFFECTED CATALOGUE : data affected so far', { releaseIds, trackIds, contractIds, modifiedCostIds });

        const projection = 'salesReturnsRights.contractId costsRights.contractId releaseSpecificSalesReturnsRights.contractId channelSpecificSalesReturnsRights.contractId';
        parallel({
          affectedReleases(cb) {
            Release.find({ clientId, _id: { $in: releaseIds.filter(calculationLib.onlyUnique) } }, projection)
              .then((releases) => {
                cb(null, releases);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          affectedTracks(cb) {
            Track.find({ clientId, _id: { $in: trackIds.filter(calculationLib.onlyUnique) } }, projection)
              .then((tracks) => {
                cb(null, tracks);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
        }, (err, affectedCatalogue) => {
          if (err) { return filterCallback(err); }
          const { affectedReleases, affectedTracks } = affectedCatalogue;
          logger.debug('##### getUpdatedCostsContracts : GET AFFECTED CATALOGUE : Cost mappings to extract contracts from = ', { affectedReleases, affectedTracks });
          filterCallback(null, modifiedCostIds, affectedReleases, affectedTracks);
        });
      },
      // EXTRACT CONTRACTS FROM CATALOGUE - extract all current and historical contracts related to catalogue modified/deleted since last run
      (modifiedCostIds, affectedReleases, affectedTracks, filterCallback) => {
        // Configure query params for exctracting related contracts
        const params = [db, contractIds, modComparisonTime, true];
        // Go get the related contracts
        waterfall([
          extractCatalogueContracts('release', affectedReleases, ...params),
          extractCatalogueContracts('track', affectedTracks, ...params),
        ], (err) => {
          if (err) { return filterCallback(err); }
          // Refresh Contract Ids to remove any found contractIDs which aren't relevant to current period
          logger.debug('##### getUpdatedCostsContracts : preRefresh', { contractIds });
          const refreshContractFilter = { clientId, accountingPeriod, contractType, _id: { $in: contractIds.map((id) => new ObjectId(id)).filter(calculationLib.onlyUnique) } };
          Contract.distinct('_id', refreshContractFilter)
            .then((contractIds) => {
              const costsData = {
                contractIds,
                costIds: modifiedCostIds,
              };
              logger.debug('##### getUpdatedCostsContracts : EXTRACT CONTRACTS FROM CATALOGUE : costsData returned  = ', JSON.stringify(costsData, null, 2));
              filterCallback(null, costsData);
            })
            .catch((err) => {
              logger.error(err);
              filterCallback(err);
            });
        });
      },
    ], callback);
  },
  // helper function to get modified salesFiles and related contracts
  getUpdatedSalesFiles(db, clientId, modComparisonTime, accountingPeriod, contractType, bigQuery, clientType, periodId, periodSalesFiles, client, callback) {
    // need to get all contracts affected by sales file changes and recalculate these contracts for only affected sales files
    // Note: contractIds is mutated via extractCatalogueContracts
    const contractIds = [];
    const salesLineContractIds = [];

    waterfall([
      // PERIOD ADJUSTMENTS : Retrieve any salesFileIDs added to or removed from Period since last run

      // this also has another patch problem - if you hit the button 'include filtered' then all existing sales files get an 'add' op record
      // Haven't looked at the front end yet but suspect the whole filtered id list is just added to the salesFilesId array as we end up with duplicate sales ids for those previously associated
      // parking for now as worst case is we run some sales files that we didn't need to but this needs addressed - shaould be fairly simple FE fix
      (filterCallback) => {
        const projection = { _id: 0, ops: 1 }; // { _id: 0, 'ops.path': 1, 'ops.value': 1 };
        const patchFilter = {
          'ops.op': { $in: ['add', 'remove', 'replace'] },
          'ops.path': /salesFilesIds/, // /costIds/
          ref: new ObjectId(periodId),
          timestamp: { $gte: modComparisonTime },
        };
        // db.getCollection('period_patches').find({ref : new ObjectId("60f6ecafadfa251ffe188ce9"), "ops.path": /costIds/, "ops.op": { $in: ['remove', 'add'] } }, {_id:0, ops:1}).sort({timestamp: -1})
        logger.debug('%%%% getUpdatedSalesFiles : PERIOD ADJUSTMENTS : patchFilter = ', JSON.stringify(patchFilter, null, 2));

        db.collection('period_patches').find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            logger.debug('%%%% getUpdatedSalesFiles : PERIOD ADJUSTMENTS : patches - Sales Files Added/Removed from period = ', JSON.stringify(patches, null, 2));
            const addedOrRemovedSalesFileIDs = extractModifiedIdsFromPatches(patches || [], 'salesFilesIds');
            filterCallback(null, addedOrRemovedSalesFileIDs);
          })
          .catch(filterCallback);
      },
      // MODIFICATIONS : Get all included salesFiles modified since last period run and added/removed from period retrievig [_ids]
      (addedOrRemovedSalesFileIDs, filterCallback) => {
        // Look for modified salesFilesIds
        const projection = { _id: 1 };
        const salesFilter = {
          clientId,
          $or: [
            { _id: { $in: periodSalesFiles }, updatedAt: { $gte: modComparisonTime } },
            { _id: { $in: addedOrRemovedSalesFileIDs } },
          ],
        };
        logger.debug('%%%% getUpdatedSalesFiles : MODIFICATIONS : salesFilter = ', JSON.stringify(salesFilter, null, 2));

        SalesFile.find(salesFilter, projection)
          .then((salesFileIds) => {
            salesFileIds = salesFileIds.map((salesFile) => salesFile._id.toString());
            logger.debug('%%%% getUpdatedSalesFiles : MODIFICATIONS : ', { salesFileIds });
            filterCallback(null, salesFileIds);
          })
          .catch((err) => {
            logger.error(err);
            filterCallback(err);
          });
      },
      // MODIFICATIONS : Get all modified Sales Groups Lines that are connected to period Sales Files and add those to modified salesFileIds
      (salesFileIds, filterCallback) => {
        if (!client.features?.suspense) {
          return filterCallback(null, salesFileIds);
        }
        const salesGroupLinesFilter = {
          clientId,
          salesFileId: { $in: periodSalesFiles },
          updatedAt: { $gte: modComparisonTime },
        };
        logger.debug('%%%% getUpdatedSalesGroupLines : MODIFICATIONS : salesGroupLinesFilter = ', JSON.stringify(salesGroupLinesFilter, null, 2));
        SalesGroupLines.distinct(
          'salesFileId',
          salesGroupLinesFilter,
        ).then((modSalesFileIds) => {
          logger.debug('%%%% getUpdatedSalesGroupLines : MODIFICATIONS : ', { modSalesFileIds });
          const combinedSalesFileIds = [...new Set([...salesFileIds, ...modSalesFileIds.map((id) => id.toString())])];
          logger.debug('%%%% getUpdatedSalesGroupLines : MODIFICATIONS : COMBINED WITH salesFileIds : ', { combinedSalesFileIds });
          filterCallback(null, combinedSalesFileIds);
        }).catch(filterCallback);
      },
      // DELETIONS : Get any salesFiles deleted since last period run via patches to find affected contracts
      (salesFileIds, filterCallback) => {
        // const affectedCostIds = modifiedCosts.map((cost) => cost._id).filter(calculationLib.onlyUnique);
        const projection = { _id: 0, 'ops.value._id': 1 };
        const patchFilter = {
          timestamp: { $gte: modComparisonTime },
          // 'ops.value._id': { $nin: affectedCostIds }, // not necessary as no deleted costs will be returned by previous step
          'ops.value.clientId': clientId,
          'ops.op': 'deleted',
          // ref $in period.salesFileIds ?? // to be safe i don't think so - if it were deleted but not picked up above it wouldn't be cleared - expecially No once getPeriodIds moves above reecalc filters
        };
        logger.debug('%%%% getUpdatedSalesFiles : DELETIONS : sales Deletion patchFilter = ', JSON.stringify(patchFilter, null, 2));

        db.collection('sales_file_patches').find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            // Create deletedSalesFileIds array for looking up related catalogue/contracts
            logger.debug('%%%% getUpdatedSalesFiles : DELETIONS : patches - Sales Files Deleted from period = ', JSON.stringify(patches, null, 2));
            let deletedSalesFileIds = patches.map((item) => item.ops[0].value._id || false).filter(Boolean);//
            deletedSalesFileIds = deletedSalesFileIds.map((id) => id.toString());
            logger.debug('%%%% getUpdatedSalesFiles : DELETIONS : ', { deletedSalesFileIds });
            filterCallback(null, salesFileIds, deletedSalesFileIds);
          })
          .catch(filterCallback);
      },
      // GET DIRECTLY AFFECTED CONTRACTS :  MODIFICATIONS | DELETIONS : affected contract ids from big query
      (salesFileIds, deletedSalesFileIds, filterCallback) => {
        if (salesFileIds?.length > 0) {
          getAffectedContractIdsFromSalesFileIds(bigQuery, salesFileIds.concat(deletedSalesFileIds), (err, affectedContractIds) => {
            if (err) { return filterCallback(err); }
            logger.debug('%%%% getUpdatedSalesFiles : GET DIRECTLY AFFECTED CONTRACTS :  MODIFICATIONS | DELETIONS : ', JSON.stringify({ affectedContractIds }, null, 2));
            if (affectedContractIds?.length > 0) {
              salesLineContractIds.push(...affectedContractIds);
            }
            filterCallback(null, salesFileIds, deletedSalesFileIds);
          });
        } else {
          logger.debug('%%%% getUpdatedSalesFiles : GET DIRECTLY AFFECTED CONTRACTS : MODIFICATIONS | DELETIONS : No Modified Sales Files');
          setImmediate(() => { filterCallback(null, salesFileIds, deletedSalesFileIds); });
        }
      },
      // GET AFFECTED CATALOGUE :  MODIFICATIONS : affected catalogue ids from big query
      (salesFileIds, deletedSalesFileIds, filterCallback) => {
        if (salesFileIds?.length > 0) {
          getAffectedCatalogueIdsFromSalesFileIds(bigQuery, bigQuery.inputTable, salesFileIds, clientType, (err, affectedCatalogue) => {
            if (err) { return filterCallback(err); }
            logger.debug('%%%% getUpdatedSalesFiles : GET AFFECTED CATALOGUE :  MODIFICATIONS : ', JSON.stringify({ affectedCatalogue }, null, 2));
            filterCallback(err, salesFileIds, deletedSalesFileIds, affectedCatalogue);
          });
        } else {
          logger.debug('%%%% getUpdatedSalesFiles : GET AFFECTED CATALOGUE :  MODIFICATIONS : No Modified Sales Files');
          setImmediate(() => { filterCallback(null, salesFileIds, deletedSalesFileIds, {}); });
        }
      },
      // GET AFFECTED CATALOGUE :  DELETIONS : affected catalogue ids from big query
      // ISODate("2021-09-03T21:20:15.478Z")
      (salesFileIds, deletedSalesFileIds, affectedCatalogue, filterCallback) => {
        if (deletedSalesFileIds?.length > 0) {
          // To retrieve effected catalogue for deleted sales files we now need to hit the sales output table
          getAffectedCatalogueIdsFromSalesFileIds(bigQuery, bigQuery.outputTable, deletedSalesFileIds, clientType, (err, deletionsAffectedCatalogue) => {
            if (err) { return filterCallback(err); }
            logger.debug('%%%% getUpdatedSalesFiles : GET AFFECTED CATALOGUE :  DELETIONS : ', JSON.stringify({ deletionsAffectedCatalogue }, null, 2));
            // From here on we will treat all affected salesFileIds as one array
            salesFileIds.push(...deletedSalesFileIds);
            filterCallback(null, salesFileIds, mergeAffectedCatalogue(affectedCatalogue, deletionsAffectedCatalogue));
          });
        } else {
          logger.debug('%%%% getUpdatedSalesFiles : GET AFFECTED CATALOGUE :  DELETIONS : No Deleted Sales Files');
          setImmediate(() => { filterCallback(null, salesFileIds, affectedCatalogue); });
        }
      },
      // GET CATALOGUE METADATA : metadata to extract affected contracts
      (salesFileIds, affectedCatalogue, filterCallback) => {
        if (salesFileIds?.length > 0) {
          logger.debug('%%%% getUpdatedSalesFiles : GET CATALOGUE METADATA', JSON.stringify({ affectedCatalogue }, null, 2));

          // Now need to get the affected catalogue metadata to extract affected contracts
          const projection = 'salesReturnsRights.contractId costsRights.contractId releaseSpecificSalesReturnsRights.contractId channelSpecificSalesReturnsRights.contractId';
          parallel({
            affectedReleases(cb) {
              Release.find({ clientId, _id: { $in: affectedCatalogue.releaseIds } }, projection)
                .then((releases) => {
                  cb(null, releases);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
            affectedTracks(cb) {
              Track.find({ clientId, _id: { $in: affectedCatalogue.trackIds } }, projection)
                .then((tracks) => {
                  cb(null, tracks);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
            affectedWorks(cb) {
              Work.find({ clientId, _id: { $in: affectedCatalogue.workIds } }, projection)
                .then((works) => {
                  cb(null, works);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
          }, (err, affectedCatalogueMappings) => {
            filterCallback(err, salesFileIds, affectedCatalogueMappings);
          });
        } else {
          return callback();
        }
      },
      // EXTRACT CONTRACTS : Finally extract all current and historical contracts related to catalogue affected by sales files modified or deleted since last period run
      (salesFileIds, affectedCatalogueMappings, filterCallback) => {
        const { affectedReleases, affectedTracks, affectedWorks } = affectedCatalogueMappings;
        // Configure query params for exctracting related contracts
        const includeCosts = false; // setting true to preserve functionality on adding flag - need to review this
        const params = [db, contractIds, modComparisonTime, includeCosts];
        logger.debug('%%%% getUpdatedSalesFiles : Catalogue to extract contracts from ');
        logger.debug({ affectedReleases, affectedTracks, affectedWorks });

        // Go get the related catalogue
        waterfall([
          extractCatalogueContracts('release', affectedReleases, ...params),
          extractCatalogueContracts('track', affectedTracks, ...params),
          extractCatalogueContracts('work', affectedWorks, ...params),
        ], (err) => {
          if (err) { return filterCallback(err); }

          // Merge any salesLineContractIds to contractIds for lookup.
          if (salesLineContractIds?.length > 0) {
            contractIds.push(...salesLineContractIds);
          }

          // Refresh Contract Ids to remove any found contractIDs which aren't relevant to current period
          logger.debug('**** getUpdatedSalesFiles : contracts : preRefresh', { contractIds });
          const refreshContractFilter = { clientId, accountingPeriod, contractType, _id: { $in: contractIds.map((id) => new ObjectId(id)).filter(calculationLib.onlyUnique) } };
          Contract.distinct('_id', refreshContractFilter)
            .then((contractIds) => {
              const salesData = { salesFileIds, contractIds: contractIds.map((id) => id.toString()) };
              logger.debug('%%%% getUpdatedSalesFiles : Returned salesData', JSON.stringify(salesData, null, 2));
              filterCallback(null, salesData);
            })
            .catch((refreshErr) => {
              logger.error(refreshErr);
              filterCallback(refreshErr);
            });
        });
      },
    ], callback);
  },
  // helper function to lookup crossContracts associated to directly affected contracts and salesfile changes
  expandContractAssociations(db, clientId, contractIds, updatedSalesFiles, modComparisonTime, callback) {
    const data = {
      periodIsModified: false,
    };

    // Check cross contracts before building filter
    waterfall([
      (filterCallback) => {
        // Need to find all cross contract associations for all directly affected contracts
        if (contractIds?.length > 0) {
          data.periodIsModified = true;
          calculationLib.getCrossContractsRecursive(db, clientId, contractIds, contractIds, modComparisonTime, (crossError, affectedContractIds) => {
            if (crossError) { return filterCallback(crossError); }
            logger.debug({ 'expandContractAssociations main crossContractIds': affectedContractIds });
            data.contractIds = affectedContractIds.filter(calculationLib.onlyUnique);
            filterCallback();
          });
        } else {
          setImmediate(filterCallback);
        }
      },
      (filterCallback) => {
        // Need to find all cross contract associations for all contracts affected by sales file changes
        if (updatedSalesFiles?.salesFileIds?.length > 0 && updatedSalesFiles.contractIds?.length > 0) {
          data.periodIsModified = true;
          calculationLib.getCrossContractsRecursive(db, clientId, updatedSalesFiles.contractIds, updatedSalesFiles.contractIds, modComparisonTime, (crossError, affectedContractIds) => {
            if (crossError) { return filterCallback(crossError); }
            logger.debug({ 'expandContractAssociations salesFile crossContractIds': affectedContractIds });
            data.salesContractIds = affectedContractIds.filter(calculationLib.onlyUnique);
            filterCallback();
          });
        } else {
          setImmediate(filterCallback);
        }
      },
    ], (crossError) => {
      logger.debug('================== expandContractAssociations DATA ==================', { data });
      callback(crossError, data);
    });
  },
  // helper function to get crossContracts associated to affected contracts
  getCrossContractsRecursive(db, clientId, lookupContractIds, contractIds, modComparisonTime, callback) {
    let crossContractIds = []; // want const

    waterfall([
      // Get all contracts with inbound crossContracts associations to contractIds
      (cb) => {
        Contract.find({ clientId, crossContracts: { $elemMatch: { contractId: { $in: lookupContractIds } } } }, '_id')
          .then((contracts) => {
            cb(null, contracts);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      // Get all contracts with outbound crossContracts associations from contractIds
      (contractsWithInboundCC, cb) => {
        // Add any inbound CC associations to crossContractIds
        crossContractIds.push(...contractsWithInboundCC.map((item) => item._id.toString()));
        // Find outbound associations
        Contract.find({ clientId, _id: { $in: lookupContractIds.map((id) => new ObjectId(id)) } }, 'crossContracts.contractId')
          .then((contractsWithOutboundCC) => {
            // Pull the contractId field from any cross contract associations
            contractsWithOutboundCC.forEach((contract) => {
              crossContractIds.push(...contract.crossContracts.map((item) => item.contractId || false).filter(Boolean));
            });
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      (cb) => {
        const projection = { _id: 0, ops: 1 };
        const patchFilter = {
          'ops.op': { $in: ['remove', 'replace'] },
          'ops.path': /crossContracts/,
          ref: { $in: lookupContractIds.map((id) => new ObjectId(id)) },
          timestamp: { $gte: modComparisonTime },
        };
        // db.getCollection('period_patches').find({ref : new ObjectId("60f6ecafadfa251ffe188ce9"), "ops.path": /costIds/, "ops.op": { $in: ['remove', 'add'] } }, {_id:0, ops:1}).sort({timestamp: -1})
        logger.debug('#### getCrossContracts : patchFilter = ', JSON.stringify(patchFilter, null, 2));

        db.collection('contract_patches').find(patchFilter, { projection })
          .toArray()
          .then((patches) => {
            //! not checking errors on any of these repetitions + can we refactor out the repetition?...
            logger.debug('#### getCrossContracts : patches - CrossContract Removed from contract = ', JSON.stringify(patches, null, 2));
            crossContractIds.push(...extractModifiedIdsFromPatches(patches || [], 'crossContracts'));
            cb();
          })
          .catch(() => cb());
      },
    ], (err) => {
      // Remove any contracts which have already been checked (or spend eternity in an infinite loop!)
      crossContractIds = crossContractIds.filter((item) => contractIds.indexOf(item) === -1);

      if (crossContractIds?.length > 0) {
        crossContractIds.filter(calculationLib.onlyUnique);
        contractIds.push(...crossContractIds);
        calculationLib.getCrossContractsRecursive(db, clientId, crossContractIds, contractIds, modComparisonTime, callback);
      } else {
        callback(null, contractIds);
      }
    });
  },
  // helper function to strrip duplicate values from array
  onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  },
  isValidObjectIdString(value) {
    if (ObjectId.isValid(value)) {
      return ((String)(new ObjectId(value)) === value);
    }
    return false;
  },
};

function checkForceFull(db, period, clientId, client, modComparisonTime, overrideAlwaysRunFull, initialRun, callback) {
  // return callback(new Error('Test Unhappy path'));
  // Check if this is the first run of this period or if full required in checkForceFull. If either then return to the calculation, otherwise build the recalculation filter
  const clientAllowPeriodFilters = client.allowPeriodFilters;
  let explain = checkPeriodMeta(period);

  if (overrideAlwaysRunFull || !clientAllowPeriodFilters || initialRun || explain) {
    // Set the reason for the logs
    if (initialRun) {
      explain = 'Period initial run';
    } else if (overrideAlwaysRunFull) {
      explain = 'Application override switch set : settings.overrideAlwaysRunFull';
    } else if (!clientAllowPeriodFilters) {
      explain = 'Client Allow Period Filters switch is false';
    }

    logger.info(`${period._id.toString()} ${explain}${runLogSuffix}`);
    setImmediate(() => {
      callback(null, explain);
    });
  } else {
    // Check Period and client patches for changes to key data
    waterfall([
      // MODIFICATIONS : First check period patches for changes to key data
      (filterCallback) => {
        logger.debug('#### checkForceFull : checkPeriodPatches');
        checkPeriodPatches(db, period._id, modComparisonTime, client, filterCallback);
      },
      // MODIFICATIONS : check client patches for changes to key data
      (forcedFullOnPeriod, filterCallback) => {
        // logger.debug('#### checkForceFull : forcedFullOnPeriod = ', forcedFullOnPeriod);
        if (forcedFullOnPeriod) {
          // Don't need to check client - just run a full
          setImmediate(() => { filterCallback(null, forcedFullOnPeriod); });
        } else {
          // Check client metadata
          checkClientPatches(db, period._id, clientId, modComparisonTime, filterCallback);
        }
      },
      // MODIFICATIONS : check client csv templates for any changes
      (forcedFullOnClient, filterCallback) => {
        // logger.debug('#### checkForceFull : forcedFullOnClient = ', forcedFullOnClient);
        if (forcedFullOnClient) {
          // Don't need to check templates - just run a full
          setImmediate(() => { filterCallback(null, forcedFullOnClient); });
        } else {
          // Check client metadata
          checkClientTemplates(period._id, clientId, client, modComparisonTime, filterCallback);
        }
      },
      // MODIFICATIONS : check Resolved Groups
      // @NOTE: for dealing with updates of Resolved Groups that are attached to the period we are currently forcing a full recalculation, rather than a more granular approach. (for Suspense MVP, which will be iterated on within 2025. If this comment still exists after 2025, it can most likely be deleted)
      // @NOTE: the plan is to follow a similar pattern as we are are currently doing for Sales Files, but we need to see if this is actually going to give large enough benefits before embarking on building the logic for this.
      (forcedFullOnClientTemplates, filterCallback) => {
        // logger.debug('#### checkForceFull : forcedFullOnClient = ', forcedFullOnClient);
        if (forcedFullOnClientTemplates) {
          // Don't need to check templates - just run a full
          setImmediate(() => { filterCallback(null, forcedFullOnClientTemplates); });
        } else if (client.features?.suspense) {
          // Check Resolved Groups
          checkResolvedGroups(db, period._id, period.resolvedGroupIds, clientId, modComparisonTime, filterCallback);
        } else {
          filterCallback();
        }
      },
    ], callback);
  }
}

// helper function to check if any conditions have changed which should force a full to be run
// const checkPeriodMetaOrig = (period) => period.forceFull || !period.processEndTime || checkPreviousError(period._id, period.status) || checkExchangeRates(period);
const checkPeriodMeta = (period) => {
  let explain;

  if (period.forceFull) {
    explain = 'period.forceFull set to true - manual intervention';
    return explain;
  }

  if (period.contractType === 'Mechanical') {
    explain = 'Mechanical periods always run Full calculation';
    return explain;
  }

  if (period.contractType === 'MCPS') {
    explain = 'MCPS periods always run Full calculation';
    return explain;
  }

  if (!period.processStartTime) {
    explain = 'period.processStartTime missing - must run full';
    return explain;
  }

  const previousError = checkPreviousError(period.calculationError);
  if (previousError) {
    return previousError;
  }

  const exchangeRatesChanged = checkExchangeRates(period);
  if (exchangeRatesChanged) {
    return exchangeRatesChanged;
  }
  return false;
};

// helper function to check if previous run errored
function checkPreviousError(calculationError) {
  // return false; // temp force false return for debugging
  if (calculationError) {
    const explain = 'Previous run errored';
    return explain;
  }
  return false;
}

// helper function to check user updates changes to key period metadata
function checkPeriodPatches(db, periodId, modComparisonTime, client, callback) {
  const projection = { _id: 0, ops: 1 }; // don't need ops
  const patchFilter = {
    // 'ops.op': 'replace',
    'ops.op': { $in: ['add', 'remove', 'replace'] },
    'ops.path': { $in: [/name/, /contractType/, /accountingPeriod/, /accountingPeriodType/, /accountingDate/, /year/, /startDate/, /endDate/] },
    ref: new ObjectId(periodId),
    timestamp: { $gte: modComparisonTime },
  };

  // @NOTE: for MVP we are forcing a full calculation when resolvedGroupIds has been changed since last run
  if (client.features?.suspense) {
    patchFilter['ops.path'].$in.push(/resolvedGroupIds/);
  }
  logger.debug('#### checkPeriodPatches : patchFilter = ', JSON.stringify(patchFilter, null, 2));

  db.collection('period_patches').find(patchFilter, { projection }).toArray()
    .then((patches) => {
      logger.debug('#### checkPeriodPatches : patches = ', JSON.stringify(patches, null, 2));
      if (patches?.length > 0) {
        const explain = 'Key period metadata changed';
        logger.info(`${periodId} ${explain}${runLogSuffix}`);
        return callback(null, explain);
      }
      callback(null, false);
    })
    .catch((err) => {
      const explain = 'Error checking period Metadata';
      logger.info(`${periodId} ${explain}${runLogSuffix}`);
      callback(err, explain);
    });
}

// helper function to check user updates changes to key client metadata
function checkClientPatches(db, periodId, clientId, modComparisonTime, callback) {
  const projection = { _id: 0, ops: 1 }; // don't need ops
  const patchFilter = {
    'ops.op': { $in: ['add', 'remove', 'replace'] },
    'ops.path': { $in: [/name/, /companyName/, /address/, /homeCurrency/, /logo/, /dateFormat/, /email/, /statementCustomText/, /statementOfAccountCustomText/, /selfBillingTaxText/, /selfBillingTaxCustomText/, /vatNo/, /statementDesign/, /statementHeaderType/, /salesReportTemplate/, /costsReportTemplate/, /statementIncludeTotalsRow/, /suppressZeroValueInExport/, /suppressStatementOfAccount/, /displaySeparatedDeductions/, /customDeductionName/] },
    ref: new ObjectId(clientId),
    timestamp: { $gte: modComparisonTime },
  };
  // logger.debug('#### checkClientPatches : patchFilter = ', JSON.stringify(patchFilter, null, 2));

  db.collection('client_patches').find(patchFilter, { projection })
    .toArray()
    .then((patches) => {
      logger.debug('#### checkClientPatches : patches = ', JSON.stringify(patches, null, 2));
      if (patches?.length > 0) {
        const explain = 'Key client metadata changed';
        logger.info(`${periodId} ${explain}${runLogSuffix}`);
        return callback(null, explain);
      }
      callback(null, false);
    })
    .catch((err) => {
      const explain = 'Error checking client metadata';
      logger.info(`${periodId} ${explain}${runLogSuffix}`);
      callback(err, explain);
    });
}

// helper function to check changes to client CSV templates
function checkClientTemplates(periodId, clientId, client, modComparisonTime, callback) {
  const templateIds = [];
  if (client.salesReportTemplate) { templateIds.push(client.salesReportTemplate); }
  if (client.costsReportTemplate) { templateIds.push(client.costsReportTemplate); }

  if (templateIds?.length > 0) {
    const reportFilter = {
      clientId,
      _id: { $in: templateIds },
      updatedAt: { $gte: modComparisonTime },
    };
    logger.debug('#### checkClientTemplates : MODIFICATIONS : reportFilter = ', JSON.stringify(reportFilter, null, 2));

    Report.find(reportFilter, { _id: 1 })
      .then((modifiedTemplates) => {
        logger.debug('#### checkClientTemplates : MODIFICATIONS : modifiedTemplates = ', JSON.stringify(modifiedTemplates || [], null, 2));
        if (modifiedTemplates?.length > 0) {
          const explain = 'Client CSV templates changed';
          logger.info(`${periodId} ${explain}${runLogSuffix}`);
          return callback(null, explain);
        }
        callback(null, false);
      })
      .catch((err) => {
        logger.error(err);
        const explain = 'Error checking client CSV templates';
        logger.info(`${periodId} ${explain}${runLogSuffix}`);
        callback(err, explain);
      });
  } else {
    callback(null, false);
  }
}

// helper function to check updates to Resolved Groups
function checkResolvedGroups(db, periodId, resolvedGroupIds, clientId, modComparisonTime, callback) {
  const resolvedObjectIds = resolvedGroupIds.length ? resolvedGroupIds.map((id) => new ObjectId(id)) : [];
  const updatesFilter = { _id: { $in: resolvedObjectIds }, clientId, updatedAt: { $gte: modComparisonTime } };
  logger.debug('#### checkResolvedGroups : updatesFilter = ', JSON.stringify(updatesFilter, null, 2));
  db.collection('salesgroups')
    .find(updatesFilter, { _id: 1 })
    .toArray()
    .then((resolvedGroups) => {
      if (resolvedGroups?.length) {
        const explain = 'Resolved Groups changed';
        logger.info(`${periodId} ${explain}${runLogSuffix}`);
        return callback(null, explain);
      }
      callback(null, false);
    })
    .catch((err) => {
      const explain = 'Error checking Resolved Groups';
      logger.info(`${periodId} ${explain}${runLogSuffix}`);
      callback(err, explain);
    });
}

// helper function to check if period exchange rates have changed which should force a full to be run
function checkExchangeRates(period) {
  let explain;
  // Safe to assume period.calculationLog exists as this code won't be reached on initial period run
  if (period.calculationLog?.length) {
    const lastRecalculation = period.calculationLog[period.calculationLog.length - 1];
    logger.debug({ lastRecalculation });

    if (lastRecalculation.currencyExchangeRates && period.currencyExchangeRates) {
      if (_.isEqual(lastRecalculation.currencyExchangeRates, period.currencyExchangeRates)) {
        return false;
      }
    }
    explain = 'Period Exchange Rates changed or are incomplete';
  } else {
    explain = 'Calculation log data missing or invalid';
  }
  return explain;
}

// helper function to extract contracts affected by catalogue changes
function extractCatalogueContracts(catType, catItems, db, contractIds, modComparisonTime, includeCosts) {
  return (extractCallback) => {
    logger.debug('^^^^ extractCatalogueContracts', catType, (catItems) ? catItems.length : 0);

    // If we have modified catalogue items then extract contract ids
    if (catItems?.length > 0) {
      const catItemIds = [];
      catItems.forEach((catItem) => {
        // Add contracts associated to affected catalogue items - Could potentially break this down to costContractIds & salesContractIds -probably should to avoid running  sales calc on unaffected
        if (includeCosts && catItem.costsRights?.length > 0) {
          contractIds.push(...catItem.costsRights.map((row) => row.contractId).filter(Boolean));
        }
        if (catType === 'track' && catItem.releaseSpecificSalesReturnsRights?.length > 0) {
          contractIds.push(...catItem.releaseSpecificSalesReturnsRights.map((row) => row.contractId).filter(Boolean));
        }
        if (catType === 'work' && catItem.channelSpecificSalesReturnsRights?.length > 0) {
          contractIds.push(...catItem.channelSpecificSalesReturnsRights.map((row) => row.contractId).filter(Boolean));
        }
        contractIds.push(...catItem.salesReturnsRights.map((row) => row.contractId).filter(Boolean));
        // Also build array of affected catalogue ids for checking deletion history
        catItemIds.push(new ObjectId(catItem._id));
        // catItemIds.push(new ObjectId(catItem._id)); // ensure object ids as if coming from deletions path this will be a string
      });
      logger.debug('^^^^ extractCatalogueContracts : ', { contractIds }, { catItemIds });

      // Go get contracts removed from modified catalogue items' rights using patches collections
      const patchCollection = db.collection(`${catType}_patches`);
      const patchFilter = {
        'ops.op': { $in: ['remove', 'replace'] },
        'ops.path': { $in: [/salesReturnsRights/, /costsRights/, /releaseSpecificSalesReturnsRights/, /channelSpecificSalesReturnsRights/] },
        // 'ops.path': { $in: [/salesReturnsRights\/\d+(\/contractId)+$/, /costsRights\/\d+(\/contractId)*$/] },
        ref: { $in: catItemIds },
        timestamp: { $gte: modComparisonTime },
        // clientId
      };
      logger.debug('^^^^ extractCatalogueContracts : patchFilter = ', JSON.stringify(patchFilter, null, 2));

      // retrieve all changes to catalogue rights since last run and extract affected contract ids // does this need to be batched?
      patchCollection.find(patchFilter)
        .toArray()
        .then((patches) => { // , { ops: 1 }
          logger.debug(`^^^^ extractCatalogueContracts :  ${catType}_patches = `, JSON.stringify(patches, null, 2));
          // map removed or replaced contractIds to contractIds array
          contractIds.push(...extractModifiedIdsFromPatches(patches || [], ['salesReturnsRights', 'costsRights', 'releaseSpecificSalesReturnsRights', 'channelSpecificSalesReturnsRights'], 'catalogue'));
          logger.debug('^^^^ extractCatalogueContracts :  history extracted', { contractIds });

          extractCallback();
        })
        .catch(extractCallback);
    } else {
      setImmediate(extractCallback);
    }
  };
}

function mergeAffectedCatalogue(catIds, deletionCatIds) {
  // deletionCatIds will always have catalogue props set  when this is called
  for (const prop in deletionCatIds) {
    if (deletionCatIds[prop]) {
      if (catIds[prop]) {
        catIds[prop].push(...deletionCatIds[prop]);
      } else {
        catIds[prop] = deletionCatIds[prop];
      }
      catIds[prop] = catIds[prop].filter(calculationLib.onlyUnique);
    }
  }
  return catIds;
}

function getAffectedCatalogueIdsFromSalesFileIds(bigQuery, bqTable, salesFileIds, clientType, callback) {
  let releaseIds = []; let trackIds = []; let workIds = [];
  const filter = { salesFileId: { $in: salesFileIds } };
  logger.debug('#### getAffectedCatalogueIdsFromSalesFileIds > HITTING BIGQUERY');
  waterfall([
    (cb) => {
      bigQuery.getDistinct(bqTable, 'releaseId', filter, (err, values) => {
        if (values) {
          releaseIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
        }
        cb(err);
      });
    },
    (cb) => {
      bigQuery.getDistinct(bqTable, 'trackId', filter, (err, values) => {
        if (values) {
          trackIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
        }
        cb(err);
      });
    },
    (cb) => {
      if (clientType === 'Publisher') {
        bigQuery.getDistinct(bqTable, 'workId', filter, (err, values) => {
          if (values) {
            workIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
          }
          cb(err);
        });
      } else {
        cb();
      }
    },
  ], (err) => {
    callback(err, { releaseIds, trackIds, workIds });
  });
}

function getAffectedContractIdsFromSalesFileIds(bigQuery, salesFileIds, callback) {
  const contractIds = [];
  const filter = { salesFileId: { $in: salesFileIds } };
  logger.debug('#### getAffectedContractIdsFromSalesFileIds > HITTING BIGQUERY');

  waterfall([
    (cb) => {
      // Check input table for any contractIds against sales lines
      bigQuery.getDistinct(bigQuery.inputTable, 'contractId', filter, (err, values) => {
        if (values) {
          const valueIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
          contractIds.push(...valueIds);
        }
        cb(err);
      });
    },
    (cb) => {
      // Check output table for any contractIds against sales lines or if a salesFile input table has changed based on revalidation.
      bigQuery.getDistinct(bigQuery.outputTable, 'contractId', filter, (err, values) => {
        if (values) {
          const valueIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
          contractIds.push(...valueIds);
        }
        cb(err);
      });
    },
  ], (err) => {
    callback(err, contractIds);
  });
}

function extractModifiedIdsFromPatches(patches, paths, patchIdentifier) {
  const modifiedValues = [];
  const pathArray = (Array.isArray(paths)) ? paths : [paths];
  if (typeof paths === 'string' && !patchIdentifier) { patchIdentifier = paths; }
  logger.debug('++++ extractModifiedIdsFromPatches', { pathArray, patchIdentifier });

  // Create arrays of original and current values for any of add/replace/remove
  patches.forEach((patch) => {
    // Run array replacement checks on a per patch basis
    let originalValues = []; let storedValues = [];
    patch.ops.forEach((item) => {
      // Add removed id mappings to relevant array
      pathArray.forEach((path) => {
        if (item.path.includes(path)) {
          let originalContractId = false;
          let storedContractId = false;

          if (['catalogue', 'crossContracts'].includes(patchIdentifier)) {
            if (item.op === 'remove') {
              originalContractId = item.originalValue?.contractId;
            } else if (item.op === 'replace' && item.path.includes('contractId')) {
              // with replace - percentage change may also be referenced as an item so test for contractId in path
              originalContractId = item.originalValue;
              storedContractId = item.value;
            }
          } else {
            originalContractId = item.originalValue;
            storedContractId = item.value;
          }
          originalValues.push(originalContractId);
          storedValues.push(storedContractId);
        }
      });
    });

    // Ensure no null values are taken through
    originalValues = originalValues.filter(Boolean);
    storedValues = storedValues.filter(Boolean);
    // Extract all ids only present in originalValues ie removed or replaced within a patch
    modifiedValues.push(..._.difference(originalValues, storedValues));
    // Extract all ids only present in storedValues ie added or replacing within a patch
    modifiedValues.push(..._.difference(storedValues, originalValues));
    // Throw out the results for debugging
    logger.debug({ originalValues, storedValues, modifiedValues });
  });

  // Log all modifications extracted from patches
  logger.debug({ modifiedValues });
  // return the extracted values filtering for unique values
  return modifiedValues.filter(calculationLib.onlyUnique);
}

const logRecalculationDetails = (initialRun, modComparisonTime, runNo, recalculation) => {
  logger.debug('\x1b[43m \x1b[30m ================================================================\x1b[0m');
  logger.debug('\x1b[43m \x1b[30m ================== FINAL RECALCULATION FILTER ==================\x1b[0m');
  logger.debug('\x1b[43m \x1b[30m ================================================================\x1b[0m');
  logger.debug(JSON.stringify({ initialRun, modComparisonTime, runNo, recalculation }, null, 2));
};

module.exports = calculationLib;
