/**
 * @module MappingsForIngestion
 */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const appRootDir = require('app-root-dir').get();
const moment = require('moment/moment');
const util = require('util');
const path = require('path');
const { unlink } = require('node:fs/promises');
const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');
const Contract = require('../models/contract');
const WriteCsv = require('./writeCsv/writeCsvObject');

const listFromNumber = require('./listFromNumber');
const { createStorage } = require('./util/gcp');

/**
 * Represents mappings to the catalogue. Each ID maps to an object containing metadata about the catalogue entry
 * @typedef {Object.<string, *>} CatalogueMapping
 */
/**
 * Wrapper for a type name
 * @typedef {Object} FieldType
 * @property {string} type
 */
/**
 * The definition of a Field. Inherits the type parameter from it's parent FieldType. May optionally have a subType
 * if the Field is of type List
 * @typedef {FieldType} Field
 * @property {string} field The name of the field
 * @property {FieldType} [subType] The sub-type, if this FieldType supports subtypes
 */
/**
 * An object describing some catalogue data stored on disk
 * @typedef {Object} ExternalCatalogueMapping
 * @property {string} inputFileBucketLocation The bucket name where the file is stored in GCS
 * @property {string} inputFileName The path to the file in the bucket
 * @property {Field[]} fields A list of fields, with their names, types
 */
/**
 * Describes all the overwriting data returned from this class
 * @typedef {Object} MappingsForIngestion
 * @property {CatalogueMapping} [releases] A map of catNo or barcode, to a release ID
 * @property {ExternalCatalogueMapping} [externalReleases] Contains information about an externally held file of release catalogue information
 * @property {CatalogueMapping} [tracks] A map of ISRC, to a track ID
 * @property {ExternalCatalogueMapping} [externalTracks] Contains information about an externally held file of track catalogue information
 * @property {CatalogueMapping} [contracts] A map of contract name to a contract ID
 * @property {ExternalCatalogueMapping} [externalContracts] Contains information about an externally held file of contract catalogue information
 * @property {CatalogueMapping} [works] A map of some identifier (songCode, tunecode, ISWC etc) to a Work ID
 * @property {ExternalCatalogueMapping} [externalWorks] Contains information about an externally held file of work catalogue information
 */

const MappingsForIngestion = {
  /**
   * Extracts the mappings from catalogue associated with the client, specifically for mapping in the sales ingestion process
   *
   * @param {object} client - Instance of Client model
   * @param {object} options - An object of options for mappings configuration
   * @param {function(Error, MappingsForIngestion)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  get: async (client, options = {}) => {
    const results = await Promise.all([
      releases(client, options),
      tracks(client, options),
      contracts(client, options),
      works(client, options),
    ]);
    return results.reduce((allMappings, result) => ({ ...allMappings, ...result }), {});
  },
};

/**
 * Extracts the release mappings associated with the client
 */
async function releases(client, options) {
  // Get track count for batches
  const count = await Release.countDocuments({ clientId: client._id.toString() });
  if (options.platform && count > 10000) {
    return bigReleases(client, options);
  }
  return smallReleasesPromise(client, options, count);
}

/**
 * Extracts the track mappings associated with the client
 */
async function tracks(client, options) {
  // Get track count for batches
  const count = await Track.countDocuments({ clientId: client._id.toString() });
  if (options.platform && count > 10000) {
    return bigTracks(client, options);
  }
  return smallTracksPromise(client, options, count);
}

/**
 * Extracts the contract mappings associated with the client
 */
async function contracts(client, options) {
  // Get track count for batches
  const count = await Contract.countDocuments({ clientId: client._id.toString() });
  if (options.platform && count > 10000) {
    return bigContracts(client, options);
  }
  return smallContractsPromise(client, options, count);
}

/**
 * Extracts the work mappings associated with the client
 */
async function works(client, options) {
  // Get track count for batches
  const count = await Work.countDocuments({ clientId: client._id.toString() });
  if (options.platform && count > 10000) {
    return bigWorks(client, options);
  }
  return smallWorksPromise(client, options, count);
}

const cleanKey = (key) => String(key).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
const cleanIsrc = (key) => String(key).trim().replace(/[^0-9a-zA-Z(),_'#"]/gi, '');

/**
 * A function which creates an object of mappings from the Releases defined for the client
 * @param {number} count The number of tracks available to load
 * @param {function(Error, { mappings: CatalogueMapping })} cb A callback, expecting either an error or a mappings object
 */
const smallReleases = (client, options, count, cb) => {
  // Setup mappings return object
  const mappings = {};

  // Run through in batches
  const limit = 10000;
  const rounds = listFromNumber(Math.floor(count / limit));
  const releaseFilter = { clientId: client._id.toString() };
  let lastReleaseId;
  // Run through each batch
  async.eachSeries(rounds, (round, loopCb) => {
    if (lastReleaseId) {
      releaseFilter._id = { $gt: lastReleaseId };
    }
    // Find tracks in batch
    Release.find(releaseFilter, {
      catNo: 1, barcode: 1, aliases: 1, distributionChannel: 1,
    }).sort({ _id: 1 }).limit(limit).lean()
      .then((releases) => {
        if (releases && releases[releases.length - 1]) {
          // Set lastReleaseId
          lastReleaseId = releases[releases.length - 1]._id;
        }
        // Loop through all found releases
        releases.forEach((release) => {
          if (release.catNo) {
            // Clean up field
            release.catNo = cleanKey(release.catNo);
            // Add Cat No as mapping
            mappings[release.catNo] = mappings[release.catNo] || {};
            mappings[release.catNo][release.distributionChannel] = release._id.toString();
          }
          if (release.barcode) {
            // Clean up field
            release.barcode = cleanKey(release.barcode);
            // Add Barcode as mapping
            mappings[release.barcode] = mappings[release.barcode] || {};
            mappings[release.barcode][release.distributionChannel] = release._id.toString();
          }
          // Check for aliases
          if (Array.isArray(release.aliases)) {
            // Add each alias to mapping
            release.aliases.forEach((alias) => {
              if (alias) {
                // Tidy up alias characters
                alias = cleanKey(alias);
                // Add Barcode as mapping
                mappings[alias] = mappings[alias] || {};
                mappings[alias][release.distributionChannel] = release._id.toString();
              }
            });
          }
        });
        // Batch callback
        loopCb();
      })
      .catch((err) => {
        logger.error(err);
        loopCb(err);
      });
  }, (err) => {
    if (err) {
      logger.error(`Failed to load release identifiers for mapping: ${err}`);
      cb(err);
    } else {
      const result = {};
      // Flatten any that don't have multiple mappings
      Object.keys(mappings)
        .forEach((identifier) => {
          // Get embedded object keys
          const keys = Object.keys(mappings[identifier]);
          // When only one key, use final ID to map to
          if (keys.length === 1) {
            result[identifier] = mappings[identifier][keys[0]];
            // Else keep the object
          } else {
            result[identifier] = mappings[identifier];
          }
        });
      // Return mappings
      logger.info(`Loaded Release Identifiers for Mapping: ${Object.keys(result).length}`);
      cb(null, { releases: result });
    }
  });
};
const smallReleasesPromise = util.promisify(smallReleases);

/**
 * A function which creates a file containing mappings from the Releases defined for the client
 * @return {Promise<{ external: ExternalCatalogueMapping }>}
 */
const bigReleases = async (client, options) => {
  // Set up the CSV writer
  const outputLocation = `${appRootDir}/tmp/releases-${client._id}-${moment.utc().format('YYYYMMDDHHmmssSSS')}.csv`;
  const csv = new WriteCsv({ headers: ['inputKey', 'channel', 'releaseId'], outputLocation });

  // Load a cursor of all the releases
  await Release
    .find(
      { clientId: client._id.toString() },
      { catNo: 1, barcode: 1, aliases: 1, distributionChannel: 1 },
    )
    .cursor()
    .eachAsync((release) => {
      // Create one mapping for CatNo, another for Barcode, and one for each alias
      const mappings = [];
      if (release.catNo) {
        // Add a mapping by catNo
        mappings.push([
          cleanKey(release.catNo),
          release.distributionChannel,
          release._id,
        ]);
      }
      if (release.barcode) {
        // Add a mapping by barcode
        mappings.push([
          cleanKey(release.barcode),
          release.distributionChannel,
          release._id,
        ]);
      }
      // Check for aliases
      if (Array.isArray(release.aliases)) {
        // Add each alias to mapping
        release.aliases
          .filter((alias) => !!alias)
          .map((alias) => ([
            cleanKey(alias),
            release.distributionChannel,
            release._id,
          ]))
          .forEach((mapping) => mappings.push(mapping));
      }
      return util.promisify(csv.addData)(mappings);
    });

  // Upload the file to GCS
  const { inputFileBucketLocation, inputFileName } = await uploadToGcs(client, outputLocation);

  logger.info('Loaded Big Release Identifiers for Mapping');
  return {
    externalReleases: {
      inputFileBucketLocation,
      inputFileName,
      fields: [
        { field: 'inputKey', type: 'String' },
        { field: 'channel', type: 'String' },
        { field: 'releaseId', type: 'String' },
      ],
    },
  };
};

/**
 * A function which creates an object of mappings from the Tracks defined for the client
 * @param {number} count The number of releases available to load
 * @param {function(Error, { mappings: CatalogueMapping })} cb A callback, expecting either an error or a mappings object
 */
const smallTracks = (client, options, count, cb) => {
  // Setup mappings return object
  const mappings = {};

  // Run through in batches
  const limit = 10000;
  const rounds = listFromNumber(Math.floor(count / limit));
  // Run through each batch
  const trackFilter = { clientId: client._id.toString() };
  let lastTrackId;
  async.eachSeries(rounds, (round, loopCb) => {
    // Find tracks in batch
    if (lastTrackId) {
      trackFilter._id = { $gt: lastTrackId };
    }
    Track.find(trackFilter, { isrc: 1, aliases: 1, useAlternativeId: 1, alternativeId: 1 })
      .sort({ _id: 1 })
      .limit(limit)
      .lean()
      .then((tracks) => {
        if (tracks && tracks[tracks.length - 1]) {
          // Set lastTrackId
          lastTrackId = tracks[tracks.length - 1]._id;
        }
        // Loop through all found tracks
        tracks.forEach((track) => {
          if (client.features?.useAlternativeId && track.useAlternativeId && track.alternativeId) {
            track.alternativeId = cleanKey(track.alternativeId);
            mappings[track.alternativeId] = track._id.toString();
          } else if (track.isrc) {
            // Clean up fields
            track.isrc = cleanIsrc(track.isrc);
            // Add ISRC as mapping
            mappings[track.isrc] = track._id.toString();
          }
          // Check for aliases
          if (Array.isArray(track.aliases)) {
            // Add each alias to mapping
            track.aliases.forEach((alias) => {
              if (alias) {
                // Tidy up alias characters
                alias = cleanIsrc(alias);
                mappings[alias] = track._id.toString();
              }
            });
          }
        });
        // Batch callback
        loopCb();
      })
      .catch((err) => {
        logger.error(err);
        loopCb(err);
      });
  }, (err) => {
    if (err) {
      logger.error(`Failed to load track identifiers for mapping: ${err}`);
      cb(err);
    } else {
      // Return mappings
      logger.info(`Loaded Track Identifiers for Mapping: ${Object.keys(mappings).length}`);
      cb(null, { tracks: mappings });
    }
  });
};
const smallTracksPromise = util.promisify(smallTracks);

/**
 * A function which creates a file containing mappings from the Tracks defined for the client
 * @return {Promise<{ external: ExternalCatalogueMapping }>}
 */
const bigTracks = async (client, options) => {
  // Set up the CSV writer
  const outputLocation = `${appRootDir}/tmp/tracks-${client._id}-${moment.utc().format('YYYYMMDDHHmmssSSS')}.csv`;
  const csv = new WriteCsv({ headers: ['inputKey', 'trackId'], outputLocation });

  // Load a cursor of all the tracks
  await Track
    .find(
      { clientId: client._id.toString() },
      { isrc: 1, aliases: 1, useAlternativeId: 1, alternativeId: 1 },
    )
    .cursor()
    .eachAsync((track) => {
      const mappings = [];
      if (client.features?.useAlternativeId && track.useAlternativeId && track.alternativeId) {
        // Add a mapping by alternativeId
        mappings.push([
          cleanKey(track.alternativeId),
          track._id,
        ]);
      } else if (track.isrc) {
        // Add a mapping by isrc
        mappings.push([
          cleanIsrc(track.isrc),
          track._id,
        ]);
      }
      // Check for aliases
      if (Array.isArray(track.aliases)) {
        // Add each alias to mapping
        track.aliases
          .filter((alias) => !!alias)
          .map((alias) => ([
            cleanIsrc(alias),
            track._id,
          ]))
          .forEach((mapping) => mappings.push(mapping));
      }
      return util.promisify(csv.addData)(mappings);
    });

  // Upload the file to GCS
  const { inputFileBucketLocation, inputFileName } = await uploadToGcs(client, outputLocation);

  logger.info('Loaded Big Track Identifiers for Mapping');
  return {
    externalTracks: {
      inputFileBucketLocation,
      inputFileName,
      fields: [
        { field: 'inputKey', type: 'String' },
        { field: 'trackId', type: 'String' },
      ],
    },
  };
};

/**
 * A function which creates an object of mappings from the Contracts defined for the client
 * @param {number} count The number of contracts available to load
 * @param {function(Error, { mappings: CatalogueMapping })} cb A callback, expecting either an error or a mappings object
 */
const smallContracts = (client, options, count, cb) => {
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
    // Find tracks in batch
    Contract.find(contractFilter, { name: 1, aliases: 1 })
      .sort({ _id: 1 })
      .limit(limit)
      .lean()
      .then((contracts) => {
        if (contracts && contracts[contracts.length - 1]) {
          // Set lastContractId
          lastContractId = contracts[contracts.length - 1]._id;
        }
        // Loop through all found tracks
        contracts.forEach((contract) => {
          if (contract.name) {
            // Clean up fields
            contract.name = cleanKey(contract.name);
            // Add ISRC as mapping
            mappings[contract.name] = contract._id.toString();
          }
          // Check for aliases
          if (Array.isArray(contract.aliases)) {
            // Add each alias to mapping
            contract.aliases.forEach((alias) => {
              if (alias) {
                // Tidy up alias characters
                alias = cleanKey(alias);
                mappings[alias] = contract._id.toString();
              }
            });
          }
        });
        // Batch callback
        loopCb();
      })
      .catch((err) => {
        logger.error(err);
        loopCb(err);
      });
  }, (err) => {
    if (err) {
      logger.error(`Failed to load Contract Identifiers for Mapping: ${err}`);
      cb(err);
    } else {
      // Return mappings
      logger.info(`Loaded Contract Identifiers for Mapping: ${Object.keys(mappings).length}`);
      cb(null, { contracts: mappings });
    }
  });
};
const smallContractsPromise = util.promisify(smallContracts);

/**
 * A function which creates a file containing mappings from the Contracts defined for the client
 * @return {Promise<{ external: ExternalCatalogueMapping }>}
 */
const bigContracts = async (client, options) => {
  // Set up the CSV writer
  const outputLocation = `${appRootDir}/tmp/contracts-${client._id}-${moment.utc().format('YYYYMMDDHHmmssSSS')}.csv`;
  const csv = new WriteCsv({ headers: ['inputKey', 'contractId'], outputLocation });

  // Load a cursor of all the contracts
  await Contract
    .find(
      { clientId: client._id.toString() },
      { name: 1, aliases: 1 },
    )
    .cursor()
    .eachAsync((contract) => {
      const mappings = [];
      if (contract.name) {
        // Add a mapping by contract name
        mappings.push([
          cleanKey(contract.name),
          contract._id,
        ]);
      }
      // Check for aliases
      if (Array.isArray(contract.aliases)) {
        // Add each alias to mapping
        contract.aliases
          .filter((alias) => !!alias)
          .map((alias) => ([
            cleanKey(alias),
            contract._id,
          ]))
          .forEach((mapping) => mappings.push(mapping));
      }
      return util.promisify(csv.addData)(mappings);
    });

  // Upload the file to GCS
  const { inputFileBucketLocation, inputFileName } = await uploadToGcs(client, outputLocation);

  logger.info('Loaded Big Contract Identifiers for Mapping');
  return {
    externalContracts: {
      inputFileBucketLocation,
      inputFileName,
      fields: [
        { field: 'inputKey', type: 'String' },
        { field: 'contractId', type: 'String' },
      ],
    },
  };
};

/**
 * A function which creates an object of mappings from the Works defined for the client
 * @param {number} count The number of works available to load
 * @param {function(Error, { mappings: CatalogueMapping })} cb A callback, expecting either an error or a mappings object
 */
const smallWorks = (client, options, count, cb) => {
  // Setup mappings return object
  const mappings = {};

  // Run through in batches
  const limit = 10000;
  const rounds = listFromNumber(Math.floor(count / limit));
  const workFilter = { clientId: client._id.toString() };
  let lastWorkId;
  // Run through each batch
  async.eachSeries(rounds, (round, loopCb) => {
    if (lastWorkId) {
      workFilter._id = { $gt: lastWorkId };
    }
    // Find tracks in batch
    Work.find(workFilter, {
      identifier: 1, tunecode: 1, iswc: 1, aliases: 1, societyIdentifiers: 1,
    })
      .sort({ _id: 1 })
      .limit(limit)
      .lean()
      .then((works) => {
        if (works && works[works.length - 1]) {
          // Set lastReleaseId
          lastWorkId = works[works.length - 1]._id;
        }
        // Loop through all found tracks
        works.forEach((work) => {
          if (work.identifier && !options.ignoreMainIdentifiers) {
            // Clean up field
            work.identifier = cleanKey(work.identifier);
            // Add Identifier as mapping
            mappings[work.identifier] = work._id.toString();
          }
          if (work.tunecode) {
            // Clean up field
            work.tunecode = cleanKey(work.tunecode);
            // Add Identifier as mapping
            mappings[work.tunecode] = work._id.toString();
          }
          if (work.iswc) {
            // Clean up field
            work.iswc = cleanKey(work.iswc);
            // Add Identifier as mapping
            mappings[work.iswc] = work._id.toString();
          }
          // Check for aliases
          if (Array.isArray(work.aliases)) {
            // Add each alias to mapping
            work.aliases.forEach((alias) => {
              if (alias) {
                // Tidy up alias characters
                alias = cleanKey(alias);
                mappings[alias] = work._id.toString();
              }
            });
          }
          // Check for Society Specifics
          if (Array.isArray(work.societyIdentifiers)) {
            // Add each alias to mapping
            work.societyIdentifiers.forEach((society) => {
              if (society.identifier) {
                // Tidy up alias characters
                society.identifier = cleanKey(society.identifier);
                // Add mapping
                mappings[society.identifier] = mappings[society.identifier] || {};
                mappings[society.identifier][society.society] = work._id.toString();
              }
            });
          }
        });
        // Batch callback
        loopCb();
      })
      .catch((err) => {
        logger.error(err);
        loopCb(err);
      });
  }, (err) => {
    if (err) {
      logger.error(`Failed to load Work Identifiers for Mapping: ${err}`);
      cb(err);
    } else {
      // Return mappings
      logger.info(`Loaded Work Identifiers for Mapping: ${Object.keys(mappings).length}`);
      cb(null, { works: mappings });
    }
  });
};
const smallWorksPromise = util.promisify(smallWorks);

/**
 * A function which creates a file containing mappings from the Works defined for the client
 * @return {Promise<{ external: ExternalCatalogueMapping }>}
 */
const bigWorks = async (client, options) => {
  // Set up the CSV writer
  const outputLocation = `${appRootDir}/tmp/works-${client._id}-${moment.utc().format('YYYYMMDDHHmmssSSS')}.csv`;
  const csv = new WriteCsv({ headers: ['inputKey', 'society', 'workId'], outputLocation });

  // Load a cursor of all the works
  await Work
    .find(
      { clientId: client._id.toString() },
      { identifier: 1, tunecode: 1, iswc: 1, aliases: 1, societyIdentifiers: 1 },
    )
    .cursor()
    .eachAsync((work) => {
      const mappings = [];
      if (work.identifier && !options.ignoreMainIdentifiers) {
        mappings.push([
          cleanKey(work.identifier),
          null,
          work._id,
        ]);
      }
      if (work.tunecode) {
        mappings.push([
          cleanKey(work.tunecode),
          null,
          work._id,
        ]);
      }
      if (work.iswc) {
        mappings.push([
          cleanKey(work.iswc),
          null,
          work._id,
        ]);
      }
      // Check for aliases
      if (Array.isArray(work.aliases)) {
        // Add each alias to mapping
        work.aliases
          .filter((alias) => !!alias)
          .map((alias) => ([
            cleanKey(alias),
            null,
            work._id,
          ]))
          .forEach((mapping) => mappings.push(mapping));
      }
      // Check for Society Specifics
      if (Array.isArray(work.societyIdentifiers)) {
        // Add each alias to mapping
        work.societyIdentifiers
          .filter((societyIdentifier) => !!societyIdentifier)
          .map((societyIdentifier) => [
            cleanKey(societyIdentifier.identifier),
            societyIdentifier.society,
            work._id,
          ])
          .forEach((mapping) => mappings.push(mapping));
      }
      return util.promisify(csv.addData)(mappings);
    });

  // Upload the file to GCS
  const { inputFileBucketLocation, inputFileName } = await uploadToGcs(client, outputLocation);

  logger.info('Loaded Big Works Identifiers for Mapping');
  return {
    externalWorks: {
      inputFileBucketLocation,
      inputFileName,
      fields: [
        { field: 'inputKey', type: 'String' },
        { field: 'society', type: 'String' },
        { field: 'workId', type: 'String' },
      ],
    },
  };
};

const uploadToGcs = async (client, localPath) => {
  const inputFileName = `catalogExports/${client._id}/${path.basename(localPath)}`;

  const inputFileBucketLocation = process.env.SALES_INGESTION_INPUTS_BUCKET;

  const storage = createStorage();
  await storage.bucket(inputFileBucketLocation).upload(localPath, { destination: inputFileName });

  await unlink(localPath);

  return {
    inputFileBucketLocation,
    inputFileName,
  };
};

module.exports = MappingsForIngestion;
