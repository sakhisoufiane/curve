const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const TerritoryGroup = require('../../../models/territoryGroup');
const ContractTermGroup = require('../../../models/contractTermGroup');

const SalesCalculation = require('../../calculateSales');
const currenciesToPrefix = require('../../currenciesToPrefix');
const releaseContractsForMechanicalCalculation = require('../release/contractsForMechanicalCalculation');

const MechanicalContractTerms = {
  mechanicalTermsToQuery: (contract, callback) => {
    // Territory Groups
    // Contract Term Groups
    async.map(contract.mechanicalContractTerms, (term, cb) => {
      const termObject = {};
      async.parallel([
        function (paraCb) {
          if (ObjectId.isValid(term.territory)) {
            TerritoryGroup.findById(term.territory)
              .then((territoryGroup) => {
                if (territoryGroup) {
                  termObject.territory = termObject.territory || [];
                  territoryGroup.territories.forEach((item) => {
                    if (termObject.territory.indexOf(item) === -1) {
                      termObject.territory.push(item);
                    }
                  });
                }
                paraCb();
              })
              .catch((err) => {
                logger.error(err);
                paraCb();
              });
          } else if (term.territory && term.territory !== 'World' && term.territory !== 'WW') {
            termObject.territory = termObject.territory || [];
            if (termObject.territory.indexOf(term.territory) === -1) {
              termObject.territory.push(term.territory);
            }
            paraCb();
          } else {
            paraCb();
          }
        },
        function (paraCb) {
          if (ObjectId.isValid(term.channel)) {
            ContractTermGroup.findById(term.channel)
              .then((contractTermGroup) => {
                if (contractTermGroup) {
                  termObject.distributionChannel = termObject.distributionChannel || [];
                  termObject.distributionChannel = [].concat(contractTermGroup.items.filter(Boolean), termObject.distributionChannel);
                  // TODO: @tom: I believe this forEach is no longer needed as the concat above already does the same. Am I missing something?
                  contractTermGroup.items.forEach((item) => {
                    if (item && termObject.distributionChannel.indexOf(item) === -1) {
                      termObject.distributionChannel.push(item);
                    }
                  });
                  paraCb();
                } else {
                  paraCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                paraCb();
              });
          } else if (term.channel && term.channel !== 'All') {
            termObject.distributionChannel = termObject.distributionChannel || [];
            if (termObject.distributionChannel.indexOf(term.channel) === -1) {
              termObject.distributionChannel.push(term.channel);
            }
            paraCb();
          } else {
            paraCb();
          }
        },
        function (paraCb) {
          if (ObjectId.isValid(term.configuration)) {
            ContractTermGroup.findById(term.configuration)
              .then((contractTermGroup) => {
                if (contractTermGroup) {
                  termObject.configuration = termObject.configuration || [];
                  contractTermGroup.items.forEach((item) => {
                    if (item && termObject.configuration.indexOf(item) === -1) {
                      termObject.configuration.push(item);
                    }
                  });
                  paraCb();
                } else {
                  paraCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                paraCb();
              });
          } else if (term.configuration && term.configuration !== 'All') {
            termObject.configuration = termObject.configuration || [];
            if (termObject.configuration.indexOf(term.configuration) === -1) {
              termObject.configuration.push(term.configuration);
            }
            paraCb();
          } else {
            paraCb();
          }
        },
      ], (err) => {
        // Flatten any arrays
        if (termObject.territory && Array.isArray(termObject.territory)) { termObject.territory = [].concat.apply([], termObject.territory); }
        if (termObject.distributionChannel && Array.isArray(termObject.distributionChannel)) { termObject.distributionChannel = [].concat.apply([], termObject.distributionChannel); }
        if (termObject.configuration && Array.isArray(termObject.configuration)) { termObject.configuration = [].concat.apply([], termObject.configuration); }
        cb(err, termObject);
      });
    }, callback);
  },
  calculateMechanicalReleases: (contract, elements, client, period, callback) => {
    getSalesDataAndCalculate(0, callback);

    function getSalesDataAndCalculate(offset, salesCb) {
      const limit = 100000;
      // Get Sales Data
      const selectFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];
      const distinctFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];
      console.time(`Loading Data Time ${contract.name}`);
      // Set timestamp
      const timestamp = moment().format('YYYYMMDDHHmmSSssss');
      async.waterfall([
        function (waterfallCb) {
          // Get Query
          MechanicalContractTerms.mechanicalTermsToQuery(contract, waterfallCb);
        },
        function (contractQueries, waterfallCb) {
          // Get data
          const contractQuery = contractQueries && contractQueries.length > 0 ? { $or: contractQueries } : {};
          Release.find({ clientId: contract.clientId, mechanicalContractIds: contract._id.toString() }, '_id')
            .then((releases) => {
              contractQuery.salesFileId = elements.contractQuery.salesFileId;
              contractQuery.catType = 'Release';
              contractQuery.releaseId = { $in: releases.map((release) => release._id.toString()) };
              if (!elements.data || (elements.data && elements.data.length === 0 && elements.totalLines > 0)) {
                elements.bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, contractQuery, {
                  limit, offset, orderBy: 'id', uniqueValue: `${contract._id.toString()}-${timestamp}`,
                }, (err, data) => {
                  waterfallCb(null, data);
                });
              } else {
                waterfallCb(null, elements.data);
              }
            })
            .catch((err) => {
              logger.error(err);
              // Previously we would throw a runtime error here, but now we handle it gracefully
              // Surely that doesn't break anything
              waterfallCb(err);
            });
        },
      ], (err, data) => {
        if (data.length > 0) {
          calculateReleases(data, (err) => {
            if (err) {
              salesCb(err);
            } else if (data && data.length == limit && (!elements.data || (elements.data && elements.data.length === 0 && elements.totalLines > 0))) {
              getSalesDataAndCalculate(offset + limit, salesCb);
            } else {
              salesCb();
            }
          });
        } else {
          salesCb();
        }
      });
    }

    function calculateReleases(salesData, calculateReleasesCb) {
      async.waterfall([
        function (cb) {
          // Get tracks associated with this mechanical contract
          Release.find({ clientId: contract.clientId, mechanicalContractIds: contract._id.toString() })
            .then((releases) => {
              cb(null, releases);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        function (releases, cb) {
          // Call calculation on each release
          let count = 0;
          async.eachLimit(releases, 10, (release, releaseCb) => {
            // Set PPDs and Specific PPDs for calculation
            const ppds = {};
            const specificDealerPrices = {};
            ppds[release._id.toString()] = release.dealerPrice;
            specificDealerPrices[release._id.toString()] = release.priceCategoryDealerPrices;
            const specificSalesData = [];
            salesData.forEach((line) => {
              if (line.catType === 'Release' && line.releaseId == release._id.toString()) {
                specificSalesData.push(line);
              }
            });
            count += 1;
            logger.debug(`${elements.period._id} Running Release ${count} of ${releases.length} with ${salesData.length}`);
            releaseContractsForMechanicalCalculation(release, contract, client, period, (err, data) => {
              const newObject = JSON.parse(JSON.stringify(elements.object));
              newObject.contracts = data;
              newObject.type = 'Release';
              newObject.id = release._id.toString();
              newObject.periodEndDate = elements.period.endDate;
              newObject.exchangeRates = elements.period.currencyExchangeRates;
              newObject.clientCurrencies = currenciesToPrefix(elements.client);
              newObject.bigQuery = elements.bigQuery;
              newObject.contractQuery = elements.contractQuery;
              newObject.sortCalculations = elements.sortCalculations;
              newObject.catalogueData = elements.catalogueData;
              newObject.salesData = specificSalesData;
              newObject.totalLines = specificSalesData.length;
              newObject.escalationEquivalents = contract.escalationEquivalents;
              newObject.ppds = ppds;
              newObject.specificDealerPrices = specificDealerPrices;
              newObject.db = elements.db;
              newObject.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
              const salesCalculation = new SalesCalculation(newObject);
              salesCalculation.calculate((err, payload) => {
                releaseCb(err);
              });
            });
          }, cb);
        },

      ], calculateReleasesCb);
    }
  },
  calculateMechanicalTracks: (contract, elements, client, callback) => {
    getSalesDataAndCalculate(0, callback);

    function getSalesDataAndCalculate(offset, salesCb) {
      const limit = 100000;
      // Get Sales Data
      const selectFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'isrc'];
      const distinctFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'isrc'];
      console.time(`Loading Data Time ${contract.name}`);
      // Set timestamp
      const timestamp = moment().format('YYYYMMDDHHmmSSssss');
      async.waterfall([
        function (waterfallCb) {
          // Get Query
          MechanicalContractTerms.mechanicalTermsToQuery(contract, waterfallCb);
        },
        function (contractQueries, waterfallCb) {
          // Get data
          const contractQuery = contractQueries && contractQueries.length > 0 ? { $or: contractQueries } : {};
          Track.find({
            clientId: contract.clientId, mechanicalContractIds: contract._id.toString(), reportMechanicals: true,
          }, '_id')
            .then((tracks) => {
              contractQuery.salesFileId = elements.contractQuery.salesFileId;
              contractQuery.catType = 'Track';
              contractQuery.trackId = { $in: tracks.map((track) => track._id.toString()) };
              if (!elements.data || (elements.data && elements.data.length === 0 && elements.totalLines > 0)) {
                elements.bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, contractQuery, {
                  limit, offset, orderBy: 'id', uniqueValue: `${contract._id.toString()}-${timestamp}`,
                }, (err, data) => {
                  waterfallCb(null, data);
                });
              } else {
                waterfallCb(null, elements.data);
              }
            })
            .catch((err) => {
              logger.error(err);
              waterfallCb(err);
            });
        },
      ], (err, data) => {
        if (data.length > 0) {
          calculateTracks(data, (err) => {
            if (err) {
              salesCb(err);
            } else if (data && data.length == limit && (!elements.data || (elements.data && elements.data.length === 0 && elements.totalLines > 0))) {
              getSalesDataAndCalculate(offset + limit, salesCb);
            } else {
              salesCb();
            }
          });
        } else {
          salesCb();
        }
      });
    }

    function calculateTracks(salesData, calculateTracksCb) {
      async.waterfall([
        function (cb) {
          // Get tracks associated with this mechanical contract
          Track.find({
            clientId: contract.clientId, mechanicalContractIds: contract._id.toString(), reportMechanicals: true })
            .then((tracks) => {
              cb(null, tracks);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        function (tracks, cb) {
          // Call calculation on each track
          let count = 0;
          async.eachLimit(tracks, 10, (track, trackCb) => {
            count += 1;
            logger.debug(`${elements.period._id} Running Track ${count} of ${tracks.length} with ${salesData.length}`);
            const specificSalesData = [];
            salesData.forEach((line) => {
              if (line.catType === 'Track' && line.trackId == track._id.toString()) {
                specificSalesData.push(line);
              }
            });
            // Adding this require here as track/contractsForMechanicalCalculation.js and contract/mechanicalContractTerms.js require each other
            // causing a circular dependency issue
            // eslint-disable-next-line global-require
            const trackContractsForMechanicalCalculation = require('../track/contractsForMechanicalCalculation');
            trackContractsForMechanicalCalculation(track, contract, (err, data) => {
              const newObject = JSON.parse(JSON.stringify(elements.object));
              newObject.contracts = data;
              newObject.type = 'Track';
              newObject.id = track._id.toString();
              newObject.periodEndDate = elements.period.endDate;
              newObject.exchangeRates = elements.period.currencyExchangeRates;
              newObject.clientCurrencies = currenciesToPrefix(elements.client);
              newObject.bigQuery = elements.bigQuery;
              newObject.contractQuery = elements.contractQuery;
              newObject.sortCalculations = elements.sortCalculations;
              newObject.catalogueData = elements.catalogueData;
              newObject.salesData = specificSalesData;
              newObject.totalLines = specificSalesData.length;
              newObject.escalationEquivalents = contract.escalationEquivalents;
              newObject.db = elements.db;
              newObject.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
              const salesCalculation = new SalesCalculation(newObject);
              salesCalculation.calculate((err, payload) => {
                trackCb(err);
              });
            });
          }, cb);
        },
      ], calculateTracksCb);
    }
  },
  seperatedMechanicalContractTerms: (contract, callback) => {
    const terms = [];

    async.eachSeries(contract.mechanicalContractTerms, (obj, cb) => {
      if (obj) {
        obj = obj instanceof mongoose.Document ? obj.toObject() : obj;
        // Set reserve basis
        obj.reserveBasis = contract.reserveBasis;
        async.waterfall([
          function (waterfallCb) {
            // Releases
            if (obj.catalogueGroup) {
              Release.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((releases) => {
                  if (releases) {
                    obj.releaseIds = releases.map((release) => release._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            // Tracks
            if (obj.catalogueGroup) {
              Track.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((tracks) => {
                  if (tracks) {
                    obj.trackIds = tracks.map((track) => track._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            // Works
            if (obj.catalogueGroup) {
              Work.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((works) => {
                  if (works) {
                    obj.workIds = works.map((work) => work._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.territory && obj.territory.length == 24) {
              TerritoryGroup.findOne({ _id: obj.territory })
                .then((territoryGroup) => {
                  if (territoryGroup) {
                    obj.territory = territoryGroup.territories;
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.channel && obj.channel.length == 24) {
              ContractTermGroup.findById(obj.channel)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.channel = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.configuration && obj.configuration.length == 24) {
              ContractTermGroup.findById(obj.configuration)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.configuration = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.priceCategory && obj.priceCategory.length == 24) {
              ContractTermGroup.findById(obj.priceCategory)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.priceCategory = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.source && obj.source.length == 24) {
              ContractTermGroup.findById(obj.source)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.source = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
        ], (err) => {
          if (obj.catalogueGroup && obj.catalogueGroup !== 'All'
            && (!obj.releaseIds || (obj.releaseIds && obj.releaseIds.length === 0))
            && (!obj.trackIds || (obj.trackIds && obj.trackIds.length === 0))
            && (!obj.workIds || (obj.workIds && obj.workIds.length === 0))
          ) {
            // Don't add terms when object group exists but doesn't have any catalogue
            logger.info(`Not adding term due to no catalogue associated with group:${JSON.stringify(obj)}`);
          } else {
            terms.push(obj);
          }
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      callback(err, terms);
    });
  },
  seperatedMechanicalTerms: (contract, callback) => {
    const terms = [];

    async.eachSeries(contract.mechanicalTerms, (obj, cb) => {
      if (obj) {
        obj = obj.toObject();
        // Set reserve basis
        obj.reserveBasis = contract.reserveBasis;
        async.waterfall([
          function (waterfallCb) {
            // Releases
            if (obj.catalogueGroup) {
              Release.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((releases) => {
                  if (releases) {
                    obj.releaseIds = releases.map((release) => release._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            // Tracks
            if (obj.catalogueGroup) {
              Track.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((tracks) => {
                  if (tracks) {
                    obj.trackIds = tracks.map((track) => track._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            // Works
            if (obj.catalogueGroup) {
              Work.find({ clientId: contract.clientId, catalogueGroups: obj.catalogueGroup }, { _id: 1 })
                .then((works) => {
                  if (works) {
                    obj.workIds = works.map((work) => work._id.toString());
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.territory && obj.territory.length == 24) {
              TerritoryGroup.findOne({ _id: obj.territory })
                .then((territoryGroup) => {
                  if (territoryGroup) {
                    obj.territory = territoryGroup.territories;
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.channel && obj.channel.length == 24) {
              ContractTermGroup.findById(obj.channel)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.channel = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.configuration && obj.configuration.length == 24) {
              ContractTermGroup.findById(obj.configuration)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.configuration = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.priceCategory && obj.priceCategory.length == 24) {
              ContractTermGroup.findById(obj.priceCategory)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.priceCategory = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            if (obj && obj.source && obj.source.length == 24) {
              ContractTermGroup.findById(obj.source)
                .then((contractTermGroup) => {
                  if (contractTermGroup) {
                    obj.source = contractTermGroup.items.filter(Boolean);
                    waterfallCb();
                  } else {
                    waterfallCb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  waterfallCb(err);
                });
            } else {
              waterfallCb();
            }
          },
        ], (err) => {
          if (obj.catalogueGroup && obj.catalogueGroup !== 'All'
            && (!obj.releaseIds || (obj.releaseIds && obj.releaseIds.length === 0))
            && (!obj.trackIds || (obj.trackIds && obj.trackIds.length === 0))
            && (!obj.workIds || (obj.workIds && obj.workIds.length === 0))
          ) {
            // Don't add terms when object group exists but doesn't have any catalogue
            logger.info(`Not adding term due to no catalogue associated with group:${JSON.stringify(obj)}`);
          } else {
            terms.push(obj);
          }

          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      callback(err, terms);
    });
  },
};

module.exports = MechanicalContractTerms;
