const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const chunk = require('chunk');

const Track = require('../../../models/track');
const Release = require('../../../models/release');
const Work = require('../../../models/work');
const ContractTermGroup = require('../../../models/contractTermGroup');
const TerritoryGroup = require('../../../models/territoryGroup');

const CalculationElements = require('../../calculationElements');
const CatalogueOverwritingData = require('./catalogueOverwritingData');
const SalesCalculation = require('../../calculateSales');
const ContractTerms = require('./contractTerms');
const SeperatedMechanicalTerms = require('./separatedMechanicalTerms');
const MechanicalContractTerms = require('./mechanicalContractTerms');
const currenciesToPrefix = require('../../currenciesToPrefix');
const ReleaseMechanicalAmount = require('../release/mechanicalAmount');
const TrackMechanicalAmount = require('../track/mechanicalAmount');

const CalculateContract = {
  runSalesCalculation: (contract, db, bigQuery, object, client, mainQuery, period, totalLines, salesData, completedItemsUpdater, batchTask, callback) => {
    const taskType = batchTask ? batchTask.value.type : null;
    const limit = batchTask && batchTask.limit ? batchTask.limit : 100000000;
    const offset = batchTask && batchTask.offset ? batchTask.offset : 0;
    // Renew Query
    let query;
    // Catalogue Data for Client
    let catalogueData = {};
    // Set Original Data Length
    let originalDataLength = salesData ? salesData.length : 0;
    logger.info(`${period._id} Running ${contract.name}`);
    async.waterfall([
      function (cb) {
        CatalogueOverwritingData.get(contract, (err, data) => {
          if (err) {
            cb(err);
          } else {
            catalogueData = data;
            cb();
          }
        });
      },
      function (cb) {
        if (taskType === 'Individial Contract Batch') {
          logger.debug(`TOTALLINES: ${totalLines}`);
          // Build query from batchquery
          query = JSON.parse(JSON.stringify(mainQuery));
          if (batchTask.value.releaseIds) {
            query.$or.push({ catType: 'Release', releaseId: { $in: batchTask.value.releaseIds } });
          }
          if (batchTask.value.trackIds) {
            query.$or.push({ catType: 'Track', trackId: { $in: batchTask.value.trackIds } });
          }
          if (batchTask.value.workIds) {
            query.$or.push({ catType: 'Work', workId: { $in: batchTask.value.workIds } });
          }
          if (batchTask.value.contractId) {
            query.$or.push({ catType: 'Contract', contractId: batchTask.value.contractId });
          }
          logger.debug(query);
          cb();
        } else if (contract.contractType === 'Mechanical') {
          CalculateContract.contractQuery(contract, bigQuery, period, mainQuery, object, false, false, (err, newQuery) => {
            query = newQuery;
            MechanicalContractTerms.mechanicalTermsToQuery(contract, (err, mechanicalQueries) => {
              if (mechanicalQueries && mechanicalQueries.length > 0) {
                query.$or2 = mechanicalQueries;
              }
              cb();
            });
          });
        } else {
          // Include the specific data in the query when creating the query at this point
          CalculateContract.contractQuery(contract, bigQuery, period, mainQuery, object, true, true, (err, newQuery) => {
            query = newQuery;
            cb(err);
          });
        }
      },
      function (cb) {
        if (taskType !== 'Individial Contract Batch' && !totalLines && totalLines !== 0 && contract.contractType !== 'Mechanical') {
          logger.debug(contract.name, 'Total Count:', totalLines);
          // QUERYLOOP HERE
          if (Array.isArray(query)) {
            async.eachOfSeries(query, (batchQuery, index, batchCb) => {
              getSize(bigQuery, batchQuery, (err, sizeCount) => {
                // Set totalLines to an array on first pass
                if (index === 0) {
                  totalLines = [];
                }
                totalLines[index] = sizeCount;
                batchCb(err);
              });
            }, cb);
          } else {
            getSize(bigQuery, query, (err, sizeCount) => {
              if (sizeCount) {
                totalLines = sizeCount;
              }
              cb(err);
            });
          }
        } else {
          cb();
        }
      },
      function (cb) {
        logger.info(`PeriodID - ${period._id} - Batch Task ID ${batchTask?._id} - ${batchTask?.name}`);
        // QUERYLOOP HERE
        if (Array.isArray(query)) {
          async.eachOfSeries(query, (batchQuery, index, batchCb) => {
            //! Multi Query contract (id, name)
            logger.info(`PeriodID - ${period._id} Multi Query Sales Batch ${contract?._id} - ${contract?.name}`);
            runContractSales(period, db, bigQuery, batchQuery, object, client, catalogueData, limit, offset, salesData, totalLines[index], taskType, batchCb);
          }, cb);
        } else {
          //! Log batchTask ID
          logger.info(`PeriodID - ${period._id} Regular Sales Batch ${contract?._id} - ${contract?.name}`);
          runContractSales(period, db, bigQuery, query, object, client, catalogueData, limit, offset, salesData, totalLines, taskType, cb);
        }
      },
    ], (err) => {
      if (err) {
        logger.error(`${period._id} Contract Has Errored`, err.message);
      }
      // Increase completedCatalogueItems count if counter included
      if (completedItemsUpdater) {
        completedItemsUpdater.increaseCount(1);
      }
      callback(err);
    });

    function getSize(bigQuery, query, callback) {
      bigQuery.getSize(bigQuery.inputTable, '*', query, (err, data) => {
        if (err) {
          callback(err);
        } else if (data && data[0]) {
          callback(null, data[0].count);
        } else {
          callback();
        }
      });
    }

    function runContractSales(period, db, bigQuery, query, object, client, catalogueData, limit, offset, salesData, totalLines, taskType, runCb) {
      // Set limit
      async.waterfall([
        function (waterfallCb) {
          if (salesData) {
            // Use passed sales data
            waterfallCb(null, salesData);
          } else {
            waterfallCb(null, []);
          }
        },
        function (data, waterfallCb) {
          if (salesData) {
            const contractSpecificData = [];
            // Reduce sales data to only include sales data for this contract
            data.forEach((salesLine) => {
              let addToOutput = false;
              // Loop through query
              query.$or.forEach((orItem) => {
                if (
                  (orItem && orItem.contractId && orItem.contractId === salesLine.contractId)
                  || (orItem && orItem.contractId && orItem.contractId.$in && orItem.contractId.$in.includes(salesLine.contractId))
                  || (orItem && orItem.catType === 'Release' && orItem.releaseId && orItem.releaseId === salesLine.releaseId && salesLine.catType === 'Release')
                  || (orItem && orItem.catType === 'Release' && orItem.releaseId && orItem.releaseId.$in && orItem.releaseId.$in.includes(salesLine.releaseId) && salesLine.catType === 'Release')
                  || (orItem && orItem.catType === 'Track' && orItem.trackId && orItem.trackId === salesLine.trackId && salesLine.catType === 'Track')
                  || (orItem && orItem.catType === 'Track' && orItem.trackId && orItem.trackId.$in && orItem.trackId.$in.includes(salesLine.trackId) && salesLine.catType === 'Track')
                  || (orItem && orItem.catType === 'Work' && orItem.workId && orItem.workId === salesLine.workId && salesLine.catType === 'Work')
                  || (orItem && orItem.catType === 'Work' && orItem.workId && orItem.workId.$in && orItem.workId.$in.includes(salesLine.workId) && salesLine.catType === 'Work')
                ) {
                  addToOutput = true;
                }
              });
              // If any of the queries is true - add to output data
              if (addToOutput) {
                contractSpecificData.push(salesLine);
              }
            });
            // Call callback with filtered data
            originalDataLength = data.length;
            waterfallCb(null, contractSpecificData);
          } else {
            // Don't reduce if data loaded from DB specifically for contract
            waterfallCb(null, data);
          }
        },
        function (data, waterfallCb) {
          logger.info(`${period._id} Total Lines for ${contract.name} - ${data.length} - ${totalLines}`);
          // Set data to be held in elements object
          const elements = new CalculationElements({
            db, client, bigQuery, contractQuery: query, object, period, catalogueData, data, totalLines, limit, offset, taskType,
          });
          // Clear data when lines do not match what is expected
          if (totalLines && data.length !== totalLines && data.length < totalLines) {
            logger.info(`${period._id} Total Lines Do Not Match for ${contract.name} - Clearing Data to be Reloaded`);
            elements.data = [];
          }
          // Clear original data for memory optimisation
          data = null;

          if (contract.contractType === 'Mechanical') {
            if (elements.data.length === 0 && !elements.totalLines) {
              logger.info(`${period._id} Skipping Contract with 0 sales - ${contract.name}`);
              waterfallCb();
            } else {
              async.waterfall([
                function (mechWaterfallCb) {
                  if (period.usedContractIds && period.usedContractIds.includes(contract._id.toString())) {
                    CalculateContract.calculateContract(contract, elements, client, mechWaterfallCb);
                  } else {
                    mechWaterfallCb();
                  }
                },
                function (mechWaterfallCb) {
                  MechanicalContractTerms.calculateMechanicalReleases(contract, elements, client, period, mechWaterfallCb);
                },
                function (mechWaterfallCb) {
                  MechanicalContractTerms.calculateMechanicalTracks(contract, elements, client, mechWaterfallCb);
                },
              ], waterfallCb);
            }
          } else {
            async.waterfall([
              function (calcWaterfallCb) {
                if (period.usedContractIds && period.usedContractIds.includes(contract._id.toString())) {
                  CalculateContract.calculateContract(contract, elements, client, calcWaterfallCb);
                } else {
                  calcWaterfallCb();
                }
              },
              function (calcWaterfallCb) {
                if (client.clientType !== 'Publisher') {
                  logger.debug(`${period._id} ${contract.name} - Calculating Releases`);
                  CalculateContract.calculateReleases(contract, elements, client, period, calcWaterfallCb);
                } else {
                  calcWaterfallCb();
                }
              },
              function (calcWaterfallCb) {
                if (client.clientType !== 'Publisher') {
                  logger.debug(`${period._id} ${contract.name} - Calculating Release Specific Tracks`);
                  CalculateContract.calculateReleaseSpecificTracks(contract, elements, client, calcWaterfallCb);
                } else {
                  calcWaterfallCb();
                }
              },
              function (calcWaterfallCb) {
                if (client.clientType !== 'Publisher') {
                  logger.debug(`${period._id} ${contract.name} - Calculating Tracks`);
                  CalculateContract.calculateTracks(contract, elements, client, calcWaterfallCb);
                } else {
                  calcWaterfallCb();
                }
              },
              function (calcWaterfallCb) {
                if (client.clientType === 'Publisher') {
                  logger.debug(`${period._id} ${contract.name} - Calculating Channel Specific Works`);
                  CalculateContract.calculateChannelSpecificWorks(contract, elements, calcWaterfallCb);
                } else {
                  calcWaterfallCb();
                }
              },
              function (calcWaterfallCb) {
                if (client.clientType === 'Publisher') {
                  logger.debug(`${period._id} ${contract.name} - Calculating Works`);
                  CalculateContract.calculateWorks(contract, elements, (err) => {
                    calcWaterfallCb(err);
                  });
                } else {
                  calcWaterfallCb();
                }
              },
            ], waterfallCb);
          }
        },
      ], runCb);
    }
  },
  contractQuery: (contract, bigQuery, period, mainQuery, batchQuery, includeSpecifics, allowBatching, callback) => {
    // Renew Query
    let query = { ...mainQuery };
    query.$or = [];
    // Hold cat item arrays
    let releaseIds = [];
    let trackIds = [];
    let workIds = [];
    // Add contract to $or query
    query.$or.push({ contractId: contract._id.toString() });
    async.waterfall([
      function (cb) {
        // Get Contract Releases
        Release.find({ clientId: period.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { mechanicalContractIds: contract._id.toString() }] }, { _id: 1 }, { _id: -1 })
          .then((releases) => {
            if (releases && releases.length > 0) {
              releaseIds = releases.map((release) => release._id.toString());
              if (batchQuery && batchQuery.releaseIds) {
                releaseIds = releaseIds.filter((id) => batchQuery.releaseIds.includes(id));
              }
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      function (cb) {
        // Get Contract Tracks
        Track.find({ clientId: period.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { releaseSpecificSalesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { mechanicalContractIds: contract._id.toString() }] }, { _id: 1 }, { _id: -1 })
          .then((tracks) => {
            if (tracks && tracks.length > 0) {
              trackIds = tracks.map((track) => track._id.toString());
              if (batchQuery && batchQuery.trackIds) {
                trackIds = trackIds.filter((id) => batchQuery.trackIds.includes(id));
              }
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      function (cb) {
        // Get Contract Works
        Work.find({ clientId: period.clientId, salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { _id: 1 }, { _id: -1 })
          .then((works) => {
            if (works && works.length > 0) {
              workIds = works.map((work) => work._id.toString());
              if (batchQuery && batchQuery.workIds) {
                workIds = workIds.filter((id) => batchQuery.workIds.includes(id));
              }
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      // Add specifics here to filter out any sales where a contract has specific terms - such as only one territory, etc.
      function (cb) {
        // Check if includeSpecifics was passed and is true
        if (includeSpecifics === true) {
          const specificTerms = {};
          async.each(contract.salesTerms, (term, termCb) => {
            if (term) {
              async.parallel([
                function (paraCb) {
                  // Check if territory is a group
                  if (ObjectId.isValid(term.territory)) {
                    // Find territory group
                    TerritoryGroup.findById(term.territory)
                      .then((territoryGroup) => {
                        if (territoryGroup) {
                          // Set territories on output object if it doesn't exist
                          specificTerms.territory = specificTerms.territory || [];
                          // Loop through territories in group
                          territoryGroup.territories.forEach((item) => {
                            // Add territory if it doesn't already exist on object
                            if (specificTerms.territory.indexOf(item) === -1) {
                              specificTerms.territory.push(item);
                            }
                          });
                          paraCb();
                        } else {
                          // Set territories on output object if it doesn't exist
                          specificTerms.territory = specificTerms.territory || [];
                          // Add territory if it doesn't already exist on object
                          if (specificTerms.territory.indexOf(term.territory) === -1) {
                            specificTerms.territory.push(term.territory);
                          }
                          paraCb();
                        }
                      })
                      .catch((err) => {
                        logger.error(err);
                        // Bongo refactor: Previously if errored it did this anyway
                        // so keeping it the same for now, seems dodgy.

                        // Set territories on output object if it doesn't exist
                        specificTerms.territory = specificTerms.territory || [];
                        // Add territory if it doesn't already exist on object
                        if (specificTerms.territory.indexOf(term.territory) === -1) {
                          specificTerms.territory.push(term.territory);
                        }
                        paraCb();
                      });
                  } else {
                    // Set territories on output object if it doesn't exist
                    specificTerms.territory = specificTerms.territory || [];
                    // Add territory if it doesn't already exist on object
                    if (specificTerms.territory.indexOf(term.territory) === -1) {
                      specificTerms.territory.push(term.territory);
                    }
                    paraCb();
                  }
                },
                function (paraCb) {
                  // Check if channel is a group
                  if (ObjectId.isValid(term.channel)) {
                    // Find contract term group
                    ContractTermGroup.findById(term.channel)
                      .then((contractTermGroup) => {
                        if (contractTermGroup) {
                          // Set distributionChannel on output object if it doesn't exist
                          specificTerms.distributionChannel = specificTerms.distributionChannel || [];
                          // Loop through items on group
                          contractTermGroup.items.forEach((item) => {
                            // Add item to output object if it doesn't exist
                            if (item && specificTerms.distributionChannel.indexOf(item) === -1) {
                              specificTerms.distributionChannel.push(item);
                            }
                          });
                          paraCb();
                        } else {
                          // Set distributionChannel on output object if it doesn't exist
                          specificTerms.distributionChannel = specificTerms.distributionChannel || [];
                          // Add item to output object if it doesn't exist
                          if (specificTerms.distributionChannel.indexOf(term.channel) === -1) {
                            specificTerms.distributionChannel.push(term.channel);
                          }
                          paraCb();
                        }
                      })
                      .catch((err) => {
                        logger.error(err);
                        // Bongo refactor: Previously if errored it did this anyway

                        // Set distributionChannel on output object if it doesn't exist
                        specificTerms.distributionChannel = specificTerms.distributionChannel || [];
                        // Add item to output object if it doesn't exist
                        if (specificTerms.distributionChannel.indexOf(term.channel) === -1) {
                          specificTerms.distributionChannel.push(term.channel);
                        }
                        paraCb();
                      });
                  } else {
                    // Set distributionChannel on output object if it doesn't exist
                    specificTerms.distributionChannel = specificTerms.distributionChannel || [];
                    // Add item to output object if it doesn't exist
                    if (specificTerms.distributionChannel.indexOf(term.channel) === -1) {
                      specificTerms.distributionChannel.push(term.channel);
                    }
                    paraCb();
                  }
                },
                function (paraCb) {
                  // Check if config is a group
                  if (ObjectId.isValid(term.configuration)) {
                    // Find contract term group
                    ContractTermGroup.findById(term.configuration)
                      .then((contractTermGroup) => {
                        if (contractTermGroup) {
                          // Set configuration on output object if it doesn't exist
                          specificTerms.configuration = specificTerms.configuration || [];
                          // Loop through items on group
                          contractTermGroup.items.forEach((item) => {
                            // Add item to output object if it doesn't exist
                            if (item && specificTerms.configuration.indexOf(item) === -1) {
                              specificTerms.configuration.push(item);
                            }
                          });
                          paraCb();
                        } else {
                          // Set configuration on output object if it doesn't exist
                          specificTerms.configuration = specificTerms.configuration || [];
                          // Add item to output object if it doesn't exist
                          if (specificTerms.configuration.indexOf(term.configuration) === -1) {
                            specificTerms.configuration.push(term.configuration);
                          }
                          paraCb();
                        }
                      })
                      .catch((err) => {
                        logger.error(err);
                        // Bongo refactor: Previously if errored it did this anyway

                        // Set configuration on output object if it doesn't exist
                        specificTerms.configuration = specificTerms.configuration || [];
                        // Add item to output object if it doesn't exist
                        if (specificTerms.configuration.indexOf(term.configuration) === -1) {
                          specificTerms.configuration.push(term.configuration);
                        }
                        paraCb();
                      });
                  } else {
                    // Set configuration on output object if it doesn't exist
                    specificTerms.configuration = specificTerms.configuration || [];
                    // Add item to output object if it doesn't exist
                    if (specificTerms.configuration.indexOf(term.configuration) === -1) {
                      specificTerms.configuration.push(term.configuration);
                    }
                    paraCb();
                  }
                },
              ], termCb);
            } else {
              termCb();
            }
          }, (err) => {
            // Add item to query if items are in array, and it doesn't include a World or All value (these should be excluded, since that means a term will include everything on a contract)
            if (specificTerms.territory && specificTerms.territory.length > 0 && !specificTerms.territory.includes('World') && !specificTerms.territory.includes('WW')) {
              query.territory = { $in: specificTerms.territory };
            }
            if (specificTerms.distributionChannel && specificTerms.distributionChannel.length > 0 && !specificTerms.distributionChannel.includes('All')) {
              query.distributionChannel = { $in: specificTerms.distributionChannel };
            }
            if (specificTerms.configuration && specificTerms.configuration.length > 0 && !specificTerms.configuration.includes('All')) {
              query.configuration = { $in: specificTerms.configuration };
            }
            cb();
          });
        } else {
          cb();
        }
      },
    ], (err) => {
      query = CalculateContract.batchContractQuery(query, releaseIds, trackIds, workIds, allowBatching);
      logger.debug(query);
      callback(err, query);
    });
  },
  batchContractQuery: (query, releaseIds, trackIds, workIds, allowBatching) => {
    const limit = 5000; // Size of catalogue for each batch task
    // Check if query is above limit or batching is not allowed
    if (!allowBatching
      || (releaseIds.length < limit && trackIds.length < limit && workIds.length < limit)) {
      // Query is not above limit, returns query as an object.
      if (releaseIds && releaseIds.length > 0) {
        query.$or.push({ catType: 'Release', releaseId: { $in: releaseIds } });
      }
      if (trackIds && trackIds.length > 0) {
        query.$or.push({ catType: 'Track', trackId: { $in: trackIds } });
      }
      if (workIds && workIds.length > 0) {
        query.$or.push({ catType: 'Work', workId: { $in: workIds } });
      }
      return query;
    }
    const output = [];
    // Batch each of the values
    const releaseChunks = chunk(releaseIds, limit);
    const trackChunks = chunk(trackIds, limit);
    const workChunks = chunk(workIds, limit);
    // Get highest number to know number of batches
    const batchesToRun = Math.max(releaseChunks.length, trackChunks.length, workChunks.length);
    // Create a query for each item
    for (let i = 0; i < batchesToRun; i += 1) {
      // Create new Query
      const newQuery = JSON.parse(JSON.stringify(query));
      if (releaseChunks[i] && releaseChunks[i].length > 0) {
        logger.debug(`Adding releaseIds batch of ${releaseChunks[i].length}`);
        newQuery.$or.push({ catType: 'Release', releaseId: { $in: releaseChunks[i] } });
      }
      if (trackChunks[i] && trackChunks[i].length > 0) {
        logger.debug(`Adding trackIds batch of ${trackChunks[i].length}`);
        newQuery.$or.push({ catType: 'Track', trackId: { $in: trackChunks[i] } });
      }
      if (workChunks[i] && workChunks[i].length > 0) {
        logger.debug(`Adding workIds batch of ${workChunks[i].length}`);
        newQuery.$or.push({ catType: 'Work', workId: { $in: workChunks[i] } });
      }
      // Add each new query to output
      logger.debug(newQuery);
      output.push(newQuery);
    }
    return output;
  },
  getContractCatalogueIds: (period, contract, callback) => {
    const output = { releases: [], tracks: [], works: [] };
    async.parallel([
      function (cb) {
        // Get Contract Releases
        Release.find({ clientId: period.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { mechanicalContractIds: contract._id.toString() }] }, { _id: 1 })
          .then((releases) => {
            if (releases && releases.length > 0) {
              output.releases = releases.map((release) => release._id.toString());
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      function (cb) {
        // Get Contract Tracks
        Track.find({ clientId: period.clientId, $or: [{ salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { releaseSpecificSalesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { mechanicalContractIds: contract._id.toString() }] }, { _id: 1 })
          .then((tracks) => {
            if (tracks && tracks.length > 0) {
              output.tracks = tracks.map((track) => track._id.toString());
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      function (cb) {
        // Get Contract Works
        Work.find({ clientId: period.clientId, salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { _id: 1 })
          .then((works) => {
            if (works && works.length > 0) {
              output.works = works.map((work) => work._id.toString());
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
    ], (err) => {
      callback(err, output);
    });
  },
  calculateContract: (contract, elements, client, callback) => {
    // const Period = require('./period');
    ContractTerms.forCalcualtion(contract, (err, data) => {
      const newObject = JSON.parse(JSON.stringify(elements.object));
      newObject.calculationType = 'Contract';
      newObject.taskType = elements.taskType;
      newObject.contracts = [data];
      newObject.periodEndDate = elements.period.endDate;
      newObject.exchangeRates = elements.period.currencyExchangeRates;
      newObject.clientCurrencies = currenciesToPrefix(elements.client);
      newObject.mechanicalAmounts = {};
      newObject.bigQuery = elements.bigQuery;
      newObject.sortCalculations = elements.sortCalculations;
      newObject.catalogueData = elements.catalogueData;
      newObject.contractQuery = elements.contractQuery;
      newObject.salesData = elements.data;
      newObject.totalLines = elements.totalLines;
      newObject.limit = elements.limit;
      newObject.offset = elements.offset;
      newObject.escalationEquivalents = contract.escalationEquivalents;
      newObject.db = elements.db;
      newObject.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
      const salesCalculation = new SalesCalculation(newObject);
      salesCalculation.calculate((err, salesData) => {
        elements.data = salesData;
        callback(err);
      });
    });
  },
  calculateReleases: (contract, elements, client, period, callback) => {
    // Get releases associated with contract
    const query = { clientId: contract.clientId, salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } };

    // For Larger Contracts, only include the releaseIds that are passed from the Batch Tasks
    if (elements?.object?.releaseIds) {
      query._id = { $in: elements.object.releaseIds.map((id) => new ObjectId(id)) };
    }

    Release.find(query, {
      salesReturnsRights: 1, mechanicalLicenses: 1, mechanicalBasisPercentage: 1, trackIds: 1, mechanicalTrackCap: 1, dealerPrice: 1, priceCategoryDealerPrices: 1, controlledCompositionClause: 1, mechanicalAmount: 1,
    })
      .then((releases) => {
        logger.debug('FOUND RELEASES');
        async.waterfall([
          function (cb) {
            // Map out percentages against releaseIds
            const mechanicalAmounts = {};
            const participationRates = {};
            const ppds = {};
            const specificDealerPrices = {};
            async.eachLimit(releases, 100, (release, releaseCb) => {
              // TODO: maybe get mechanical amount when no release.mechanicalAmount?
              mechanicalAmounts[release._id.toString()] = release.mechanicalAmount;
              ppds[release._id.toString()] = release.dealerPrice;
              specificDealerPrices[release._id.toString()] = release.priceCategoryDealerPrices;
              release.salesReturnsRights.forEach((right) => {
                if (right.contractId == contract._id.toString()) {
                  participationRates[release._id.toString()] = right.percentage;
                }
              });

              releaseCb();
            }, (err) => {
              logger.debug('GOT RATES');
              cb(err, participationRates, mechanicalAmounts, ppds, specificDealerPrices);
            });
          },
          function (participationRates, mechanicalAmounts, ppds, specificDealerPrices, cb) {
            ContractTerms.forCalcualtion(contract, (err, data) => {
              const newObject = JSON.parse(JSON.stringify(elements.object));
              newObject.contracts = [data];
              newObject.type = 'Release';
              newObject.taskType = elements.taskType;
              newObject.releaseIds = releases.map((release) => release._id.toString());
              newObject.periodEndDate = elements.period.endDate;
              newObject.exchangeRates = elements.period.currencyExchangeRates;
              newObject.clientCurrencies = currenciesToPrefix(elements.client);
              newObject.mechanicalAmounts = mechanicalAmounts;
              newObject.participationRates = participationRates;
              newObject.ppds = ppds;
              newObject.specificDealerPrices = specificDealerPrices;
              newObject.sortCalculations = elements.sortCalculations;
              newObject.catalogueData = elements.catalogueData;
              newObject.bigQuery = elements.bigQuery;
              newObject.contractQuery = elements.contractQuery;
              newObject.salesData = elements.data;
              newObject.totalLines = elements.totalLines;
              newObject.limit = elements.limit;
              newObject.offset = elements.offset;
              newObject.escalationEquivalents = contract.escalationEquivalents;
              newObject.db = elements.db;
              newObject.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
              const salesCalculation = new SalesCalculation(newObject);
              logger.debug('GOING TO CALCULATE');
              salesCalculation.calculate((err, salesData) => {
                elements.data = salesData;
                cb(err);
              });
            });
          },
        ], callback);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  calculateTracks: (contract, elements, client, callback) => {
    // Get tracks that are included in the release specific tracks - which should then be excluded here
    const query = { clientId: contract.clientId, $and: [{ releaseSpecificSalesReturnsRights: { $not: { $size: 0 } } }, { releaseSpecificSalesReturnsRights: { $exists: true } }], $or: [{ releaseSpecificSalesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }] };
    if (elements?.object?.trackIds) {
      query._id = { $in: elements.object.trackIds.map((id) => new ObjectId(id)) };
    }
    Track.find(query, {
      salesReturnsRights: 1, releaseSpecificSalesReturnsRights: 1, reportMechanicals: 1, mechanicalLicenses: 1, statutoryRate: 1, canadianStatutoryRate: 1,
    })
      .then((excludeTracks) => {
        const excludeTrackIds = excludeTracks.map((track) => track._id);

        const trackQuery = {
          $and: [
            { _id: { $nin: excludeTrackIds } },
          ],
          clientId: contract.clientId,
          salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } },
        };

        // When TrackIds are passed to a Batch Task, only include those tracks
        if (elements.object?.trackIds?.length) {
          trackQuery.$and.push({ _id: { $in: elements.object.trackIds } });
        }

        // Get tracks associated with contract
        Track.find(trackQuery, {
          salesReturnsRights: 1, releaseSpecificSalesReturnsRights: 1, reportMechanicals: 1, mechanicalLicenses: 1, statutoryRate: 1, canadianStatutoryRate: 1, duration: 1, mechanicalCalculationBasis: 1,
        })
          .then((tracks) => {
            async.waterfall([
              function (cb) {
                // Map out percentages against releaseIds
                const mechanicalAmounts = {};
                const participationRates = {};
                const releaseRestrictions = {};
                async.eachLimit(tracks, 5, (track, trackCb) => {
                  // Get mechanical amount
                  TrackMechanicalAmount.get(track, (err, mechanical) => {
                    // Set on object
                    mechanicalAmounts[track._id.toString()] = mechanical;
                    // Set release restrictions for release specific tracks
                    if (track.releaseSpecificSalesReturnsRights && track.releaseSpecificSalesReturnsRights.length > 0) {
                      // Loop through restrictions
                      track.releaseSpecificSalesReturnsRights.forEach((right) => {
                        releaseRestrictions[track._id.toString()] = releaseRestrictions[track._id.toString()] || [];
                        // When a release ID is on the restriction, add to array
                        if (right.releaseId) {
                          releaseRestrictions[track._id.toString()].push(right.releaseId);
                        }
                      });
                    }
                    // Loop through rights
                    track.salesReturnsRights.forEach((right) => {
                      // Set participation rates on rights
                      if (right.contractId == contract._id.toString()) {
                        participationRates[track._id.toString()] = right.percentage;
                      }
                    });
                    trackCb();
                  });
                }, (err) => {
                  cb(err, participationRates, mechanicalAmounts, releaseRestrictions);
                });
              },
              function (participationRates, mechanicalAmounts, releaseRestrictions, cb) {
                // For large contracts, remove any sales data being passed through to force the loading of the data
                if (elements.totalLines > 500000) {
                  elements.data = [];
                }
                cb(null, participationRates, mechanicalAmounts, releaseRestrictions);
              },
              function (participationRates, mechanicalAmounts, releaseRestrictions, cb) {
                ContractTerms.forCalcualtion(contract, (err, data) => {
                  const newObject = JSON.parse(JSON.stringify(elements.object));
                  newObject.contracts = [data];
                  newObject.type = 'Track';
                  newObject.taskType = elements.taskType;
                  newObject.trackIds = tracks.map((track) => track._id.toString());
                  newObject.periodEndDate = elements.period.endDate;
                  newObject.exchangeRates = elements.period.currencyExchangeRates;
                  newObject.clientCurrencies = currenciesToPrefix(elements.client);
                  newObject.mechanicalAmounts = mechanicalAmounts;
                  newObject.participationRates = participationRates;
                  newObject.releaseRestrictions = releaseRestrictions;
                  newObject.catalogueData = elements.catalogueData;
                  newObject.sortCalculations = elements.sortCalculations;
                  newObject.bigQuery = elements.bigQuery;
                  newObject.contractQuery = elements.contractQuery;
                  newObject.salesData = elements.data;
                  newObject.totalLines = elements.totalLines;
                  newObject.limit = elements.limit;
                  newObject.offset = elements.offset;
                  newObject.escalationEquivalents = contract.escalationEquivalents;
                  newObject.db = elements.db;
                  newObject.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
                  const salesCalculation = new SalesCalculation(newObject);
                  salesCalculation.calculate((err, salesData) => {
                    elements.data = salesData;
                    cb(err);
                  });
                });
              },
            ], callback);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      })
      .catch((err) => {
        // Bongo refactor: Previously it would crash if errored
        // So let's return the error instead, even if it isn't handled in the callback
        logger.error(err);
        callback(err);
      });
  },
  calculateReleaseSpecificTracks: (contract, elements, client, callback) => {
    const mechanicalAmounts = {};
    // Get tracks
    const query = { clientId: contract.clientId, $and: [{ releaseSpecificSalesReturnsRights: { $not: { $size: 0 } } }, { releaseSpecificSalesReturnsRights: { $exists: true } }], $or: [{ releaseSpecificSalesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }] };
    if (elements?.object?.trackIds) {
      query._id = { $in: elements.object.trackIds.map((id) => new ObjectId(id)) };
    }
    Track.find(query, {
      salesReturnsRights: 1, releaseSpecificSalesReturnsRights: 1, reportMechanicals: 1, mechanicalLicenses: 1, statutoryRate: 1, canadianStatutoryRate: 1,
    })
      .then((tracks) => {
        if (!tracks?.length) {
          callback();
        } else {
          async.waterfall([
            // Get mechanical amounts for all tracks
            function (cb) {
              async.eachLimit(tracks, 5, (track, trackCb) => {
                // Get mechanical amount
                TrackMechanicalAmount.get(track, (err, mechanical) => {
                  // Set on object
                  mechanicalAmounts[track._id.toString()] = mechanical;
                  trackCb(err);
                });
              }, (err) => {
                cb(err);
              });
            },
            // Calculate release specific rights first
            function (cb) {
              const participationRates = {};
              const trackIds = [];
              const releaseIds = [];
              for (const track of tracks) {
                for (const right of track.releaseSpecificSalesReturnsRights) {
                  if (right.contractId === contract._id.toString()) {
                    // Setup participation rates
                    // We want to limit the calculation to the releases having specific rights
                    participationRates[track._id.toString()] = participationRates[track._id.toString()] || [];
                    participationRates[track._id.toString()].push({ rate: right.percentage, releaseId: right.releaseId });
                    releaseIds.push(right.releaseId);
                    trackIds.push(track._id.toString());
                  }
                }
              }

              ContractTerms.forCalcualtion(contract, (err, data) => {
                const newObject = JSON.parse(JSON.stringify(elements.object));
                data.specificRatesCalculation = true;
                data.specificParticipationRates = participationRates;
                data.releaseId = { $in: releaseIds };
                newObject.contracts = [data];
                newObject.type = 'Track';
                newObject.taskType = elements.taskType;
                newObject.trackIds = trackIds;
                newObject.periodEndDate = elements.period.endDate;
                newObject.exchangeRates = elements.period.currencyExchangeRates;
                newObject.clientCurrencies = currenciesToPrefix(elements.client);
                newObject.mechanicalAmounts = mechanicalAmounts;
                newObject.participationRates = {};
                newObject.catalogueData = elements.catalogueData;
                newObject.sortCalculations = elements.sortCalculations;
                newObject.bigQuery = elements.bigQuery;
                newObject.contractQuery = elements.contractQuery;
                newObject.salesData = [];
                newObject.totalLines = elements.totalLines;
                newObject.limit = elements.limit;
                newObject.offset = elements.offset;
                newObject.escalationEquivalents = contract.escalationEquivalents;
                newObject.db = elements.db;
                newObject.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
                const salesCalculation = new SalesCalculation(newObject);
                salesCalculation.calculate((err) => {
                  cb(err);
                });
              });
            },
            // Calculate remaining regular sales rights next
            function (cb) {
              const participationRates = {};
              const trackIds = [];
              const releaseIds = [];
              for (const track of tracks) {
                // Any release IDs in the the specific right should be ignore from the calculation
                const trackReleaseIds = [];
                track.releaseSpecificSalesReturnsRights.forEach((right) => {
                  releaseIds.push(right.releaseId);
                  trackReleaseIds.push(right.releaseId);
                });
                for (const right of track.salesReturnsRights) {
                  if (right.contractId === contract._id.toString()) {
                    participationRates[track._id.toString()] = participationRates[track._id.toString()] || [];
                    participationRates[track._id.toString()].push({ rate: right.percentage, excludeReleaseIds: trackReleaseIds });
                    trackIds.push(track._id.toString());
                  }
                }
              }

              ContractTerms.forCalcualtion(contract, (err, data) => {
                const newObject = JSON.parse(JSON.stringify(elements.object));
                data.specificRatesCalculation = true;
                data.specificParticipationRates = participationRates;
                data.releaseId = { $nin: releaseIds, fromReleaseSpecific: true };
                newObject.contracts = [data];
                newObject.type = 'Track';
                newObject.taskType = elements.taskType;
                newObject.trackIds = trackIds;
                newObject.periodEndDate = elements.period.endDate;
                newObject.exchangeRates = elements.period.currencyExchangeRates;
                newObject.clientCurrencies = currenciesToPrefix(elements.client);
                newObject.mechanicalAmounts = mechanicalAmounts;
                newObject.participationRates = {};
                newObject.catalogueData = elements.catalogueData;
                newObject.sortCalculations = elements.sortCalculations;
                newObject.bigQuery = elements.bigQuery;
                newObject.contractQuery = elements.contractQuery;
                newObject.salesData = [];
                newObject.totalLines = elements.totalLines;
                newObject.limit = elements.limit;
                newObject.offset = elements.offset;
                newObject.escalationEquivalents = contract.escalationEquivalents;
                newObject.db = elements.db;
                newObject.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
                const salesCalculation = new SalesCalculation(newObject);
                salesCalculation.calculate((err) => {
                  cb(err);
                });
              });
            },
          ], callback);
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  calculateWorks: (contract, elements, callback) => {
    // Get works associated with contract
    const query = { clientId: contract.clientId, salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } };

    // For Larger Contracts, only include the workIds that are passed from the Batch Tasks
    if (elements?.object?.workIds) {
      query._id = { $in: elements.object.workIds.map((id) => new ObjectId(id)) };
    }

    Work.find(query, { salesReturnsRights: 1 })
      .then((works) => {
        async.waterfall([
          function (cb) {
            // Map out percentages against releaseIds
            const participationRates = {};
            async.each(works, (work, workCb) => {
              work.salesReturnsRights.forEach((right) => {
                if (right.contractId == contract._id.toString()) {
                  participationRates[work._id.toString()] = right.percentage;
                }
              });
              workCb();
            }, (err) => {
              cb(err, participationRates);
            });
          },
          function (participationRates, cb) {
            ContractTerms.forCalcualtion(contract, (err, data) => {
              const newObject = JSON.parse(JSON.stringify(elements.object));
              newObject.contracts = [data];
              newObject.type = 'Work';
              newObject.taskType = elements.taskType;
              newObject.workIds = works.map((work) => work._id.toString());
              newObject.periodEndDate = elements.period.endDate;
              newObject.exchangeRates = elements.period.currencyExchangeRates;
              newObject.clientCurrencies = currenciesToPrefix(elements.client);
              newObject.participationRates = participationRates;
              newObject.bigQuery = elements.bigQuery;
              newObject.sortCalculations = elements.sortCalculations;
              newObject.catalogueData = elements.catalogueData;
              newObject.contractQuery = elements.contractQuery;
              newObject.salesData = elements.data;
              newObject.totalLines = elements.totalLines;
              newObject.limit = elements.limit;
              newObject.offset = elements.offset;
              newObject.escalationEquivalents = contract.escalationEquivalents;
              newObject.db = elements.db;
              const salesCalculation = new SalesCalculation(newObject);
              salesCalculation.calculate((err, salesData) => {
                elements.data = salesData;
                cb(err);
              });
            });
          },
        ], callback);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  calculateChannelSpecificWorks: (contract, elements, callback) => {
    // Get tracks associated with contract
    Work.find({ clientId: contract.clientId, $and: [{ channelSpecificSalesReturnsRights: { $not: { $size: 0 } } }, { channelSpecificSalesReturnsRights: { $exists: true } }], channelSpecificSalesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } }, { salesReturnsRights: 1, channelSpecificSalesReturnsRights: 1 })
      .then((works) => {
        if (works.length > 0) {
          async.waterfall([
            function (cb) {
              // Maps out specific rates against each work ID
              // Load all territory groups
              TerritoryGroup.find({ clientId: contract.clientId })
                .then((territoryGroups) => {
                  // Organise into object for mapping
                  const territoryGroupMappings = {};
                  territoryGroups.forEach((territoryGroup) => {
                    territoryGroupMappings[territoryGroup._id.toString()] = territoryGroup.territories;
                  });
                  // Create Mapping Object
                  const participationRates = {};
                  // Loop through works
                  async.each(works, (work, workCb) => {
                    // Create blank array for each mapping
                    participationRates[work._id.toString()] = [];
                    // Loop through specific rights
                    work.channelSpecificSalesReturnsRights.forEach((right) => {
                      // When contractId matches this contract
                      if (right.contractId == contract._id.toString()) {
                        // Map territory if it's a group
                        let { territory } = right;
                        if (territoryGroupMappings[right.territory]) {
                          territory = territoryGroupMappings[right.territory];
                        }
                        // Add mapping object
                        participationRates[work._id.toString()].push({
                          distributionChannel: right.distributionChannel, territory, source: right.source, rate: right.percentage,
                        });
                      }
                    });
                    workCb();
                  }, (err) => {
                    cb(err, participationRates);
                  });
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
            function (participationRates, cb) {
              ContractTerms.forCalcualtion(contract, (err, data) => {
                const newObject = JSON.parse(JSON.stringify(elements.object));
                newObject.contracts = [data];
                newObject.type = 'Work';
                newObject.workIds = works.map((work) => work._id.toString());
                newObject.periodEndDate = elements.period.endDate;
                newObject.exchangeRates = elements.period.currencyExchangeRates;
                newObject.clientCurrencies = currenciesToPrefix(elements.client);
                newObject.participationRates = participationRates;
                newObject.bigQuery = elements.bigQuery;
                newObject.sortCalculations = elements.sortCalculations;
                newObject.catalogueData = elements.catalogueData;
                newObject.contractQuery = elements.contractQuery;
                newObject.salesData = elements.data;
                newObject.totalLines = elements.totalLines;
                newObject.limit = elements.limit;
                newObject.offset = elements.offset;
                newObject.escalationEquivalents = contract.escalationEquivalents;
                newObject.db = elements.db;
                const salesCalculation = new SalesCalculation(newObject);
                salesCalculation.calculate((err, salesData) => {
                  elements.data = salesData;
                  cb(err);
                });
              });
            },
          ], callback);
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  contractTermsForCalculation: (contract, callback) => {
    const contractTerms = { contractId: contract._id.toString(), name: contract.name, partitionNo: contract.partitionNo };
    async.parallel({
      deductionTerms(callback) {
        ContractTerms.seperatedDeductionsTerms(contract, callback);
      },
      salesTerms(callback) {
        if (contract.contractType === 'Mechanical') {
          MechanicalContractTerms.seperatedMechanicalContractTerms(callback, callback);
        } else {
          ContractTerms.seperatedSalesTerms(contract, callback);
        }
      },
      withholdingTaxTerms(callback) {
        ContractTerms.seperatedWithholdingTaxTerms(contract, callback);
      },
      mechanicalTerms(callback) {
        SeperatedMechanicalTerms.get(contract, callback);
      },
    }, (err, results) => {
      results.salesTerms = results.salesTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      results.deductionTerms = results.deductionTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      results.mechanicalTerms = results.mechanicalTerms.map((term) => { if (['Release', 'Track', 'Work', 'Contract', 'All', ''].includes(term.catType) || !term.catType) { return term; } }).filter(Boolean);
      contractTerms.terms = {
        contractCurrency: contract.currency, sales: results.salesTerms, deductions: results.deductionTerms, withholdingTaxes: results.withholdingTaxTerms, mechanicalContracts: results.mechanicalTerms, mechanicalAmount: 0,
      };
      callback(null, contractTerms);
    });
  },
};

module.exports = CalculateContract;
