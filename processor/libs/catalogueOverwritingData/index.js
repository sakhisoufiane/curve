/**
 * @module CatalogueOverwritingData
 */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();

const util = require('util');
const path = require('path');
const avro = require('avsc');
const { createWriteStream, statSync } = require('node:fs');
const { unlink } = require('node:fs/promises');
const { pipeline } = require('node:stream/promises');
const { Level } = require('level');
const crypto = require('crypto');
const { createStorage, joinUrl } = require('../util/gcp');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Period = require('../../models/period');

// Creates a client
const listFromNumber = require('../listFromNumber');

/** @typedef {import('mappingsForIngestion').CatalogueMapping} CatalogueMapping */
/**
 * Describes the location to find an Avro file containing catalogue data
 * @typedef {Object} ExternalCatalogueMapping
 * @property {string} url The URL for where to find the catalogue data. Null if no mapping exist
 * @property {string} schema The stringified JSON AVRO schema of the object to load
 */
/**
 * Describes all the overwriting data returned from this class
 * @typedef {Object} CatalogueOverwritingData
 * @property {CatalogueMapping} [releases] A map of releaseId to an object containing catalogue information to write to BigQuery
 * @property {Level} [releasesDb] A KV store containing all the Releases keyed by Work ID
 * @property {ExternalCatalogueMapping} [externalReleases] Contains information about an externally held file of release catalogue information
 * @property {CatalogueMapping} [tracks] A map of trackId to an object containing catalogue information to write to BigQuery
 * @property {Level} [tracksDb] A KV store containing all the Tracks keyed by Work ID
 * @property {ExternalCatalogueMapping} [externalTracks] Contains information about an externally held file of track catalogue information
 * @property {CatalogueMapping} [contracts] A map of contractId to an object containing catalogue information to write to BigQuery
 * @property {ExternalCatalogueMapping} [externalContracts] Contains information about an externally held file of contract catalogue information
 * @property {CatalogueMapping} [works] A map of workId to an object containing catalogue information to write to BigQuery
 * @property {Level} [worksDb] A KV store containing all the Works keyed by Work ID
 * @property {ExternalCatalogueMapping} [externalWorks] Contains information about an externally held file of work catalogue information
 * @property {CatalogueMapping} [payees] A map of payeeId to an object containing catalogue information to write to BigQuery
 * @property {CatalogueMapping} [periods] A map of periodId to an object containing catalogue information to write to BigQuery
 */

let client; let options;

const CatalogueOverwritingData = {
  /**
   * Extracts the mappings from catalogue associated with the client, specifically for catalogue mapping on sales lines
   *
   * @param {object} incomingClient - Instance of Client model
   * @param {object} incomingOptions - An object of options for mappings configuration
   * @param {boolean} incomingOptions.platform Used during Platform ingestion - May load external catalogue data
   * @param {boolean} incomingOptions.db Will trigger the data to be loaded into a Level DB
   * @param {function(Error, CatalogueOverwritingData)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  get: (incomingClient, incomingOptions, callback) => {
    client = incomingClient;
    options = incomingOptions;
    logger.debug('\x1b[45m \x1b[37m client.catalogueOverwritingData called\x1b[0m');
    async.parallel({
      releases: CatalogueOverwritingData.releases,
      tracks: CatalogueOverwritingData.tracks,
      works: CatalogueOverwritingData.works,
      contracts: CatalogueOverwritingData.contracts,
      payees: CatalogueOverwritingData.payees,
      periods: CatalogueOverwritingData.periods,
    }, (err, overwritingData) => {
      if (err) {
        callback(err);
      } else {
        const mappingResult = {};

        if (overwritingData.releases.mappings) {
          mappingResult.releases = overwritingData.releases.mappings;
        } else if (overwritingData.releases.db) {
          mappingResult.releasesDb = overwritingData.releases.db;
        } else if (overwritingData.releases.external) {
          mappingResult.externalReleases = overwritingData.releases.external;
        }

        if (overwritingData.tracks.mappings) {
          mappingResult.tracks = overwritingData.tracks.mappings;
        } else if (overwritingData.tracks.db) {
          mappingResult.tracksDb = overwritingData.tracks.db;
        } else if (overwritingData.tracks.external) {
          mappingResult.externalTracks = overwritingData.tracks.external;
        }

        if (overwritingData.works.mappings) {
          mappingResult.works = overwritingData.works.mappings;
        } else if (overwritingData.works.db) {
          mappingResult.worksDb = overwritingData.works.db;
        } else if (overwritingData.works.external) {
          mappingResult.externalWorks = overwritingData.works.external;
        }

        mappingResult.contracts = overwritingData.contracts.mappings;
        mappingResult.payees = overwritingData.payees.mappings;
        mappingResult.periods = overwritingData.periods.mappings;

        callback(null, mappingResult);
      }
    });
  },
  /**
   * Extracts the release mappings associated with the client
   *
   * @param {function(Error, { mappings?: CatalogueMapping, external?: ExternalCatalogueMapping })} cb - A callback that handles the response, with the returned mappings coming as an object
   */
  releases: (cb) => {
    if (options.platform) {
      util.callbackify(externalReleases)(cb);
    } else if (options.db) {
      util.callbackify(levelReleases)(cb);
    } else {
      smallReleases(cb);
    }
  },
  /**
   * Extracts the track mappings associated with the client
   *
   * @param {function(Error, { mappings?: CatalogueMapping, external?: ExternalCatalogueMapping })} cb - A callback that handles the response, with the returned mappings coming as an object
   */
  tracks: (cb) => {
    if (options.platform) {
      util.callbackify(externalTracks)(cb);
    } else if (options.db) {
      util.callbackify(levelTracks)(cb);
    } else {
      smallTracks(cb);
    }
  },
  /**
   * Extracts the contract mappings associated with the client
   *
   * @param {function(Error, { mappings: CatalogueMapping })} cb - A callback that handles the response, with the returned mappings coming as an object
   */
  contracts: (cb) => {
    // Get track count for batches
    if (!options.platform) {
      smallContracts(cb);
    } else {
      cb(null, { mappings: {} });
    }
  },
  /**
   * Extracts the work mappings associated with the client
   *
   * @param {function(Error, { mappings?: CatalogueMapping, external?: ExternalCatalogueMapping })} cb - A callback that handles the response, with the returned mappings coming as an object
   */
  works: (cb) => {
    // Get track count for batches
    if (options.platform) {
      util.callbackify(externalWorks)(cb);
    } else if (options.db) {
      util.callbackify(levelWorks)(cb);
    } else {
      smallWorks(cb);
    }
  },
  /**
   * Extracts the payee mappings associated with the client
   *
   * @param {function(Error, object)} cb - A callback that handles the response, with the returned mappings coming as an object
   */
  payees: (cb) => {
    if (!options.platform) {
      smallPayees(cb);
    } else {
      cb(null, { mappings: {} });
    }
  },
  /**
   * Extracts the period mappings associated with the client
   *
   * @param {function(Error, object)} cb - A callback that handles the response, with the returned mappings coming as an object
   */
  periods: (cb) => {
    if (!options.platform) {
      smallPeriods(cb);
    } else {
      cb(null, { mappings: {} });
    }
  },
};

/**
 * Extracts the release mappings associated with the client
 *
 * @param {function(Error, {mappings: CatalogueMapping})} cb - A callback that handles the response, with the returned mappings coming as an object
 */
const smallReleases = (cb) => {
  Release.countDocuments({ clientId: client._id.toString() })
    .then((count) => {
      // Setup mappings return object
      const mappings = {};

      // Run through in batches
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      const releaseFilter = { clientId: client._id.toString() };
      let lastReleaseId;
      // Run through each batch
      async.eachSeries(rounds, (round, loopCb) => {
        // Find releases in batch
        if (lastReleaseId) {
          releaseFilter._id = { $gt: lastReleaseId };
        }
        const selectFields = '_id title version artist label foreignId projectId catNo barcode dealerPrice distributionChannel format priceCategory salesReturnsRights releaseDate catalogueGroups';
        Release.find(releaseFilter, selectFields)
          .sort({ _id: 1 })
          .limit(limit)
          .lean()
          .then((releases) => {
            if (releases && releases[releases.length - 1]) {
              // Set lastReleaseId
              lastReleaseId = releases[releases.length - 1]._id;
            }
            // Loop through all found releases
            releases.forEach((release) => {
              mappings[release._id.toString()] = {
                catalogueReleaseTitle: release.title,
                catalogueReleaseVersion: release.version,
                catalogueReleaseArtist: release.artist,
                catalogueReleaseLabel: release.label,
                catalogueCatNo: release.catNo,
                catalogueReleaseForeignId: release.foreignId,
                catalogueReleaseProjectId: release.projectId,
                catalogueBarcode: release.barcode,
                ppd: release.dealerPrice,
                priceCategoryDealerPrices: release.priceCategoryDealerPrices,
                distributionChannel: release.distributionChannel,
                priceCategory: release.priceCategory,
                catalogueFormat: release.format,
                mechanicalBasisPercentage: release.mechanicalBasisPercentage,
                totalMechanicalAmount: release.totalMechanicalAmount,
                catalogueContractIds: (options.joinArraysToString) ? release.salesReturnsRights.map((term) => term.contractId)
                  .join(', ') : release.salesReturnsRights.map((term) => term.contractId),
                catalogueReleaseDate: (options.formatDates && release.releaseDate) ? moment(release.releaseDate)
                  .format(client.dateFormat.toUpperCase()) : release.releaseDate,
                releaseCatalogueGroups: (options.joinArraysToString) ? release.catalogueGroups?.join(';') : release.catalogueGroups,
              };
            });
            // Batch callback
            loopCb();
          })
          .catch((err) => {
            logger.error('Error finding releases in smallReleases:', err);
            cb(err);
          });
      }, (err) => {
        // Return mappings
        logger.info(`Loaded Release Catalogue Data: ${Object.keys(mappings).length}`);
        cb(err, { mappings });
      });
    })
    .catch((err) => {
      logger.error('Error counting releases in smallReleases:', err);
      cb(err);
    });
};

/**
 * Extracts the track mappings associated with the client
 *
 * @param {function(Error, {mappings: CatalogueMapping})} cb - A callback that handles the response, with the returned mappings coming as an object
 */
const smallTracks = (cb) => {
  Track.countDocuments({ clientId: client._id.toString() })
    .then((count) => {
      // Setup mappings return object
      const mappings = {};

      // Run through in batches
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      const trackFilter = { clientId: client._id.toString() };
      let lastTrackId;
      // Run through each batch
      async.eachSeries(rounds, (round, loopCb) => {
        // Find tracks in batch
        const selectFields = '_id title version artist label foreignId projectId isrc salesReturnsRights defaultReleaseId releaseSpecificForeignIds catalogueGroups';
        if (lastTrackId) {
          trackFilter._id = { $gt: lastTrackId };
        }
        Track.find(trackFilter, selectFields)
          .sort({ _id: 1 })
          .limit(limit)
          .lean()
          .then((tracks) => {
            if (tracks[tracks.length - 1]) {
              // Set lastTrackId
              lastTrackId = tracks[tracks.length - 1]._id;
            }
            // Loop through all found tracks
            tracks.forEach((track) => {
              mappings[track._id.toString()] = {
                catalogueTrackTitle: track.title,
                catalogueTrackVersion: track.version,
                catalogueTrackArtist: track.artist,
                catalogueTrackLabel: track.label,
                catalogueIsrc: track.isrc,
                catalogueTrackForeignId: track.foreignId,
                catalogueTrackProjectId: track.projectId,
                releaseSpecificForeignIds: track.releaseSpecificForeignIds,
                mechanicalRate: track.statutoryRate,
                defaultReleaseId: track.defaultReleaseId,
                catalogueContractIds: (options.joinArraysToString) ? track.salesReturnsRights.map((term) => term.contractId)
                  .join(', ') : track.salesReturnsRights.map((term) => term.contractId),
                trackCatalogueGroups: (options.joinArraysToString) ? track.catalogueGroups?.join(';') : track.catalogueGroups,
              };
            });
            // Batch callback
            loopCb();
          })
          .catch((err) => {
            logger.error('Error finding tracks in smallTracks:', err);
            cb(err);
          });
      }, (err) => {
        // Return mappings
        logger.info(`Loaded Track Catalogue Data: ${Object.keys(mappings).length}`);
        cb(err, { mappings });
      });
    })
    .catch((err) => {
      logger.error('Error counting tracks in smallTracks:', err);
      cb(err);
    });
};

/**
 * Extracts the work mappings associated with the client
 *
 * @param {function(Error, {mappings: CatalogueMapping})} cb - A callback that handles the response, with the returned mappings coming as an object
 */
const smallWorks = (cb) => {
  Work.countDocuments({ clientId: client._id.toString() })
    .then((count) => {
      // Setup mappings return object
      const mappings = {};

      // Run through in batches
      // FIX TO NOT LOAD CATALOGUE EVERY TIME HERE for DMP
      if (client.features.dmp === true) count = 0;
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      const workFilter = { clientId: client._id.toString() };
      let lastWorkId;
      // Run through each batch
      async.eachSeries(rounds, (round, loopCb) => {
        if (lastWorkId) {
          workFilter._id = { $gt: lastWorkId };
        }
        // Find works in batch
        const selectFields = '_id title composer identifier foreignId projectId iswc tunecode salesReturnsRights trackIds catalogueGroups';
        Work.find(workFilter, selectFields)
          .sort({ _id: 1 })
          .limit(limit)
          .lean()
          .then((works) => {
            if (works && works[works.length - 1]) {
              // Set lastReleaseId
              lastWorkId = works[works.length - 1]._id;
            }
            // Loop through all found works
            works.forEach((work) => {
              mappings[work._id] = {
                catalogueWorkTitle: work.title,
                catalogueWorkComposer: work.composer,
                catalogueIdentifier: work.identifier,
                catalogueWorkForeignId: work.foreignId,
                catalogueWorkProjectId: work.projectId,
                catalogueIswc: work.iswc,
                catalogueTunecode: work.tunecode,
                catalogueContractIds: (options.joinArraysToString) ? work.salesReturnsRights.map((term) => term.contractId)
                  .join(', ') : work.salesReturnsRights.map((term) => term.contractId),
                catalogueTrackIds: work.trackIds,
                workCatalogueGroups: (options.joinArraysToString) ? work.catalogueGroups?.join(';') : work.catalogueGroups,
              };
            });
            // Batch callback
            loopCb();
          })
          .catch((err) => {
            logger.error('Error finding works in smallWorks:', err);
            cb(err);
          });
      }, (err) => {
        // Return mappings
        logger.info(`Loaded Work Catalogue Data: ${Object.keys(mappings).length}`);
        cb(err, { mappings });
      });
    })
    .catch((err) => {
      logger.error('Error counting works in smallWorks:', err);
      cb(err);
    });
};

/**
 * Extracts the contract mappings associated with the client
 *
 * @param {function(Error, {mappings: CatalogueMapping})} cb - A callback that handles the response, with the returned mappings coming as an object
 */
const smallContracts = (cb) => {
  Contract.countDocuments({ clientId: client._id.toString() })
    .then((count) => {
      // Setup mappings return object
      const mappings = {};

      // Run through in batches
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      const contractFilter = { clientId: client._id.toString() };
      let lastContractId;
      // Run through each batch
      async.eachSeries(rounds, (round, loopCb) => {
        if (lastContractId) {
          contractFilter._id = { $gt: lastContractId };
        }
        // Find contracts in batch
        Contract.find(contractFilter, '_id name foreignId projectId contractType contractCategories currency payees type profitSharePercentage')
          .sort({ _id: 1 })
          .limit(limit)
          .lean()
          .then((contracts) => {
            if (contracts && contracts[contracts.length - 1]) {
              // Set lastContractId
              lastContractId = contracts[contracts.length - 1]._id;
            }
            // Loop through all found contracts
            contracts.forEach((contract) => {
              mappings[contract._id] = {
                contractId: contract._id.toString(),
                contractName: contract.name,
                contractForeignId: contract.foreignId,
                contractProjectId: contract.projectId,
                contractType: contract.contractType,
                contractCategories: (options.joinArraysToString) ? contract?.contractCategories?.join(', ') : contract.contractCategories,
                contractCurrency: contract.currency,
                payees: contract.payees,
                contractDealType: contract?.type === 'Profit Share' ? 'Profit Share - Classic' : contract.type,
                contractProfitSharePercentage: contract.profitSharePercentage,
              };
            });
            // Batch callback
            loopCb();
          })
          .catch((err) => {
            logger.error('Error finding contracts in smallContracts:', err);
            cb(err);
          });
      }, (err) => {
        // Return mappings
        logger.info(`Loaded Contract Catalogue Data: ${Object.keys(mappings).length}`);
        cb(err, { mappings });
      });
    })
    .catch((err) => {
      logger.error('Error counting contracts in smallContracts:', err);
      cb(err);
    });
};

/**
 * Extracts payee information associated with the client
 *
 * @param {function(Error, {mappings: CatalogueMapping})} cb - A callback that handles the response, with the returned mappings coming as an object
 */
const smallPayees = (cb) => {
  // Setup mappings return object
  const mappings = {};
  // Get payee count for batches
  Payee.countDocuments({ clientId: client._id.toString() })
    .then((count) => {
      // Run through in batches
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      // Run through each batch
      async.eachLimit(rounds, 3, (round, loopCb) => {
        // Find payees in batch
        Payee.find({ clientId: client._id.toString() }, 'name foreignId projectId payeeCategories')
          .sort({ _id: 1 })
          .limit(limit)
          .skip(limit * round)
          .then((payees) => {
            // Loop through all found payees
            payees.forEach((payee) => {
              mappings[payee._id] = {
                payeeName: payee.name,
                payeeForeignId: payee.foreignId,
                payeeProjectId: payee.projectId,
                payeeCategories: (options.joinArraysToString) ? payee.payeeCategories?.join(', ') : payee.payeeCategories,
              };
            });
            // Batch callback
            loopCb();
          })
          .catch((err) => {
            logger.error('Error finding payees in smallPayees:', err);
            loopCb(err);
          });
      }, (err) => {
        // Return mappings
        cb(err, { mappings });
      });
    })
    .catch((err) => {
      logger.error('Error counting payees in smallPayees:', err);
      cb(err);
    });
};

/**
 * Extracts period information associated with the client
 *
 * @param {function(Error, {mappings: CatalogueMapping})} cb - A callback that handles the response, with the returned mappings coming as an object
 */
const smallPeriods = (cb) => {
  // Setup mappings return object
  const mappings = {};
  // Get period count for batches
  Period.countDocuments({ clientId: client._id.toString() })
    .then((count) => {
      // Run through in batches
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      // Run through each batch
      async.eachLimit(rounds, 3, (round, loopCb) => {
        // Find periods in batch
        const selectFields = '_id name year accountingPeriod accountingPeriodType startDate endDate accountingDate';
        Period.find({ clientId: client._id.toString() }, selectFields)
          .limit(limit)
          .skip(limit * round)
          .then((periods) => {
            // Loop through all found periods
            periods.forEach((period) => {
              mappings[period._id.toString()] = {
                periodName: period.name, periodYear: period.year, periodAccountingPeriod: period.accountingPeriod, periodAccountingPeriodType: period.accountingPeriodType,
              };
              if (period.startDate) {
                mappings[period._id.toString()].periodStartDate = (options.formatDates) ? moment(period.startDate).format(client.dateFormat.toUpperCase()) : period.startDate;
              }
              if (period.endDate) {
                mappings[period._id.toString()].periodEndDate = (options.formatDates) ? moment(period.endDate).format(client.dateFormat.toUpperCase()) : period.endDate;
              }
              if (period.accountingDate) {
                mappings[period._id.toString()].periodAccountingDate = (options.formatDates) ? moment(period.accountingDate).format(client.dateFormat.toUpperCase()) : period.accountingDate;
              }
            });
            // Batch callback
            loopCb();
          })
          .catch((err) => {
            logger.error('Error finding periods in smallPeriods:', err);
            loopCb(err);
          });
      }, (err) => {
        // Return mappings
        cb(err, { mappings });
      });
    })
    .catch((err) => {
      logger.error('Error counting periods in smallPeriods:', err);
      cb(err);
    });
};

const levelTracks = async () => {
  const clientId = client._id.toString();

  // Create a KV database to hold the Tracks
  const randomString = crypto.randomBytes(10).toString('hex');
  const databasePath = `${appRootDir}/tmp/tracks-db-${clientId}-${moment().format('x')}-${randomString}`;
  const db = new Level(databasePath, { valueEncoding: 'json' });

  // Iterate over each Track, and write each to the database
  const cursor = await Track
    .find(
      { clientId },
      '_id title version artist label foreignId projectId isrc salesReturnsRights defaultReleaseId releaseSpecificForeignIds catalogueGroups',
    )
    .lean()
    .cursor();

  let count = 0;
  for await (const track of cursor) {
    if (track) {
      const id = track._id.toString();
      const mappedTrack = {
        catalogueTrackTitle: track.title,
        catalogueTrackVersion: track.version,
        catalogueTrackArtist: track.artist,
        catalogueTrackLabel: track.label,
        catalogueIsrc: track.isrc,
        catalogueTrackForeignId: track.foreignId,
        catalogueTrackProjectId: track.projectId,
        releaseSpecificForeignIds: track.releaseSpecificForeignIds,
        mechanicalRate: track.statutoryRate,
        defaultReleaseId: track.defaultReleaseId,
        catalogueContractIds: (options.joinArraysToString) ? track.salesReturnsRights.map((term) => term.contractId)
          .join(', ') : track.salesReturnsRights.map((term) => term.contractId),
        trackCatalogueGroups: (options.joinArraysToString) ? track.catalogueGroups?.join(';') : track.catalogueGroups,
      };
      await db.put(id, mappedTrack);
      count += 1;
    }
  }

  logger.info(`Loaded Track Catalogue Data: ${count}`);

  return { db };
};

const levelReleases = async () => {
  const clientId = client._id.toString();

  // Create a KV database to hold the Release
  const randomString = crypto.randomBytes(10).toString('hex');
  const databasePath = `${appRootDir}/tmp/release-db-${clientId}-${moment().format('x')}-${randomString}`;
  const db = new Level(databasePath, { valueEncoding: 'json' });

  // Iterate over each Release, and write each to the database
  const cursor = await Release
    .find(
      { clientId },
      '_id title version artist label foreignId projectId catNo barcode dealerPrice distributionChannel format priceCategory salesReturnsRights releaseDate catalogueGroups',
    )
    .lean()
    .cursor();

  let count = 0;
  for await (const release of cursor) {
    if (release) {
      const id = release._id.toString();
      const mappedRelease = {
        catalogueReleaseTitle: release.title,
        catalogueReleaseVersion: release.version,
        catalogueReleaseArtist: release.artist,
        catalogueReleaseLabel: release.label,
        catalogueCatNo: release.catNo,
        catalogueReleaseForeignId: release.foreignId,
        catalogueReleaseProjectId: release.projectId,
        catalogueBarcode: release.barcode,
        ppd: release.dealerPrice,
        priceCategoryDealerPrices: release.priceCategoryDealerPrices,
        distributionChannel: release.distributionChannel,
        priceCategory: release.priceCategory,
        catalogueFormat: release.format,
        mechanicalBasisPercentage: release.mechanicalBasisPercentage,
        totalMechanicalAmount: release.totalMechanicalAmount,
        catalogueContractIds: (options.joinArraysToString) ? release.salesReturnsRights.map((term) => term.contractId)
          .join(', ') : release.salesReturnsRights.map((term) => term.contractId),
        catalogueReleaseDate: (options.formatDates && release.releaseDate) ? moment(release.releaseDate)
          .format(client.dateFormat.toUpperCase()) : release.releaseDate,
        releaseCatalogueGroups: (options.joinArraysToString) ? release.catalogueGroups?.join(';') : release.catalogueGroups,
      };
      await db.put(id, mappedRelease);
      count += 1;
    }
  }

  logger.info(`Loaded Release Catalogue Data: ${count}`);

  return { db };
};

const levelWorks = async () => {
  const clientId = client._id.toString();

  // Create a KV database to hold the Works
  const randomString = crypto.randomBytes(10).toString('hex');
  const databasePath = `${appRootDir}/tmp/works-db-${clientId}-${moment().format('x')}-${randomString}`;
  const db = new Level(databasePath, { valueEncoding: 'json' });

  // Iterate over each Work, and write each to the database
  const cursor = await Work
    .find(
      { clientId },
      '_id title composer identifier foreignId projectId iswc tunecode salesReturnsRights trackIds catalogueGroups',
    )
    .lean()
    .cursor();

  let count = 0;
  for await (const work of cursor) {
    if (work) {
      const id = work._id.toString();
      const mappedWork = {
        catalogueWorkTitle: work.title,
        catalogueWorkComposer: work.composer,
        catalogueIdentifier: work.identifier,
        catalogueWorkForeignId: work.foreignId,
        catalogueWorkProjectId: work.projectId,
        catalogueIswc: work.iswc,
        catalogueTunecode: work.tunecode,
        catalogueContractIds: (options.joinArraysToString) ? work.salesReturnsRights.map((term) => term.contractId)
          .join(', ') : work.salesReturnsRights.map((term) => term.contractId),
        catalogueTrackIds: work.trackIds,
        workCatalogueGroups: (options.joinArraysToString) ? work.catalogueGroups?.join(';') : work.catalogueGroups,
      };
      await db.put(id, mappedWork);
      count += 1;
    }
  }

  logger.info(`Loaded Work Catalogue Data: ${count}`);

  return { db };
};

/**
 * This function generates a file containing release catalogue mappings, stores the file on S3, and provides the file
 * schema and a public link to the file
 * @return {Promise<{external?: ExternalCatalogueMapping}>} A promise containing release catalogue mapping information
 */
const externalReleases = async () => {
  const clientId = client._id.toString();
  const schema = {
    name: 'Release',
    type: 'record',
    fields: [
      {
        name: 'id',
        type: 'string',
      },
      {
        name: 'title',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'version',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'artist',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'label',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'catNo',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'foreignId',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'barcode',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'dealerPrice',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'distributionChannel',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'priceCategory',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'format',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'contractIds',
        type: {
          type: 'array',
          items: 'string',
          default: [],
        },
      },
    ],
  };

  // Not sure if project-bongo needs to refactor this cursor? Probs not
  const releaseReadStream = Release
    .find(
      { clientId },
      '_id title version artist label catNo barcode foreignId dealerPrice distributionChannel priceCategory format salesReturnsRights',
    )
    .lean()
    .cursor()
    .map((release) => ({
      id: release._id.toString(),
      title: release.title,
      version: release.version,
      artist: release.artist,
      label: release.label,
      catNo: release.catNo,
      foreignId: release.foreignId,
      barcode: release.barcode,
      dealerPrice: release.dealerPrice?.toString(),
      distributionChannel: release.distributionChannel,
      priceCategory: release.priceCategory,
      format: release.format,
      contractIds: release.salesReturnsRights?.map((term) => term.contractId)?.filter(Boolean) ?? [],
    }));

  const rtn = await createAvroFileAndUpload(releaseReadStream, schema, `overwriting-releases-${clientId}-${getCurrentTimestamp()}.avro`);
  if (rtn.external) {
    logger.info(`Uploaded Release Catalogue Data to ${rtn.external.url}`);
  } else {
    logger.info('No Release info to upload');
  }
  return rtn;
};

/**
 * This function generates a file containing track catalogue mappings, stores the file on S3, and provides the file
 * schema and a public link to the file
 * @return {Promise<{external?: ExternalCatalogueMapping}>} A promise containing track catalogue mapping information
 */
const externalTracks = async () => {
  // Set up the CSV writer
  const clientId = client._id.toString();
  const schema = {
    name: 'Track',
    type: 'record',
    fields: [
      {
        name: 'id',
        type: 'string',
      },
      {
        name: 'title',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'version',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'artist',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'label',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'foreignId',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'isrc',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'contractIds',
        type: {
          type: 'array',
          items: 'string',
          default: [],
        },
      },
      {
        name: 'defaultReleaseId',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'releaseSpecificForeignIds',
        type: {
          type: 'map',
          values: 'string',
          default: {},
        },
      },
    ],
  };

  // Load a cursor of all the tracks
  const trackReadStream = Track
    .find(
      { clientId },
      '_id title version artist label foreignId isrc salesReturnsRights defaultReleaseId releaseSpecificForeignIds',
    )
    .lean()
    .cursor()
    .map((track) => ({
      id: track._id.toString(),
      title: track.title,
      version: track.version,
      artist: track.artist,
      label: track.label,
      foreignId: track.foreignId,
      isrc: track.isrc,
      contractIds: track.salesReturnsRights?.map((term) => term.contractId)?.filter(Boolean) ?? [],
      defaultReleaseId: track.defaultReleaseId,
      releaseSpecificForeignIds: track.releaseSpecificForeignIds ?? {},
    }));

  const rtn = await createAvroFileAndUpload(trackReadStream, schema, `overwriting-tracks-${clientId}-${getCurrentTimestamp()}.avro`);
  if (rtn.external) {
    logger.info(`Uploaded Track Catalogue Data to ${rtn.external.url}`);
  } else {
    logger.info('No Track info to upload');
  }
  return rtn;
};

/**
 * This function generates a file containing work catalogue mappings, stores the file on S3, and provides the file
 * schema and a public link to the file
 * @return {Promise<{external?: ExternalCatalogueMapping}>} A promise containing work catalogue mapping information
 */
const externalWorks = async () => {
  // Set up the CSV writer
  const clientId = client._id.toString();
  const schema = {
    name: 'Work',
    type: 'record',
    fields: [
      {
        name: 'id',
        type: 'string',
      },
      {
        name: 'title',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'composer',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'identifier',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'foreignId',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'iswc',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'tunecode',
        type: ['null', 'string'],
        default: null,
      },
      {
        name: 'contractIds',
        type: {
          type: 'array',
          items: 'string',
          default: [],
        },
      },
    ],
  };

  // Load a cursor of all the works
  const workReadStream = Work
    .find(
      { clientId },
      '_id title composer identifier foreignId iswc tunecode salesReturnsRights',
    )
    .lean()
    .cursor()
    .map((work) => ({
      id: work._id.toString(),
      title: work.title,
      composer: work.composer,
      identifier: work.identifier,
      foreignId: work.foreignId,
      iswc: work.iswc,
      tunecode: work.tunecode,
      contractIds: work.salesReturnsRights?.map((term) => term.contractId)?.filter(Boolean) ?? [],
    }));

  const rtn = await createAvroFileAndUpload(workReadStream, schema, `overwriting-works-${clientId}-${getCurrentTimestamp()}.avro`);
  if (rtn.external) {
    logger.info(`Uploaded Track Catalogue Data to ${rtn.external.url}`);
  } else {
    logger.info('No Track info to upload');
  }
  return rtn;
};

/**
 * Given a ReadStream of objects, an Avro schema and an outputLocation, write a file and upload it to S3
 * @param {ReadableStream} readableStream The stream to write to the file
 * @param {AvroSchema} schema The schema of the Avro file to write
 * @param {string} fileName The name of the file to write
 * @return {Promise<{external?: ExternalCatalogueMapping}>} A promise containing the catalogue mapping information. Undefined if no mapping information exists.
 */
const createAvroFileAndUpload = async (readableStream, schema, fileName) => {
  const tempFileLocation = `${appRootDir}/tmp/${fileName}`;
  const encoder = new avro.streams.BlockEncoder(schema);
  const fileWriterStream = createWriteStream(tempFileLocation);

  await pipeline(
    readableStream,
    encoder,
    fileWriterStream,
  );

  // Check if the file is empty. If it is, then return no mapping data.
  if (statSync(tempFileLocation).size === 0) {
    await unlink(tempFileLocation);
    return {};
  }

  // Upload the file to S3
  const url = await uploadToGcs(tempFileLocation);

  return {
    external: {
      url,
      schema: JSON.stringify(schema),
    },
  };
};

const uploadToGcs = async (localPath) => {
  const destination = `catalogOverwritingExports/${client._id}/${path.basename(localPath)}`;

  const bucketName = process.env.SALES_INGESTION_INPUTS_BUCKET;

  const storage = createStorage();
  await storage.bucket(bucketName).upload(localPath, { destination });

  await unlink(localPath);

  return joinUrl(bucketName, destination);
};

const getCurrentTimestamp = () => moment().format('YYYYMMDDHHmmssSSS');

module.exports = CatalogueOverwritingData;
