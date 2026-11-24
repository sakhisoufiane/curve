/**
 * @module ContractCatalogueOverwritingData
 */
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const Composer = require('../../../models/composer');
const Publisher = require('../../../models/publisher');

const listFromNumber = require('../../listFromNumber');

const CatalogueOverwritingData = {
  /**
   * Extracts the mappings from catalogue associated with the client, specifically for catalogue mapping on sales lines
   *
   * @param {object} contract - Instance of contract model
   * @param {function(string, object)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  get: (incomingContract, callback) => {
    const contract = incomingContract;
    async.waterfall([
      (waterfallCb) => {
        async.parallel({
          composers: (cb) => {
            CatalogueOverwritingData.composers(contract, cb);
          },
          publishers: (cb) => {
            CatalogueOverwritingData.publishers(contract, cb);
          },
        }, waterfallCb);
      },
      (composersPublishersMapping, waterfallCb) => {
        // Set query based on contract type
        const query = contract.contractType === 'Mechanical' ? { clientId: contract.clientId, mechanicalContractIds: contract._id.toString() } : { clientId: contract.clientId, salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } };
        const composersMapping = composersPublishersMapping.composers;
        const publishersMapping = composersPublishersMapping.publishers;
        async.parallel({
          releases: (cb) => {
            CatalogueOverwritingData.releases(contract, query, composersMapping, publishersMapping, cb);
          },
          tracks: (cb) => {
            CatalogueOverwritingData.tracks(contract, query, composersMapping, publishersMapping, cb);
          },
          works: (cb) => {
            CatalogueOverwritingData.works(query, cb);
          },
        }, waterfallCb);
      },
    ], callback);
  },
  /**
   * Extracts the composer mappings associated with the client
   *
   * @param {function(string, object)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  composers: (contract, cb) => {
    const composersMapping = {};
    Composer.find({ clientId: contract.clientId }, 'name')
      .then((composers) => {
        if (Array.isArray(composers)) {
          composers.forEach((composer) => {
            if (composer && composer.name) {
              composersMapping[composer._id] = composer.name;
            }
          });
        }
        cb(null, composersMapping);
      })
      .catch((err) => {
        logger.error(err);
        cb(err, composersMapping);
      });
  },
  /**
   * Extracts the publisher mappings associated with the client
   *
   * @param {function(string, object)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  publishers: (contract, cb) => {
    const publishersMapping = {};
    Publisher.find({ clientId: contract.clientId }, 'name')
      .then((publishers) => {
        if (Array.isArray(publishers)) {
          publishers.forEach((publisher) => {
            if (publisher && publisher.name) {
              publishersMapping[publisher._id] = publisher.name;
            }
          });
        }
        cb(null, publishersMapping);
      })
      .catch((err) => {
        logger.error(err);
        cb(err, publishersMapping);
      });
  },
  /**
   * Extracts the release mappings associated with the client
   *
   * @param {function(string, object)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  releases: async (contract, query, composersMapping, publishersMapping, cb) => {
    let releaseQuery = query;

    // Setup mappings return object
    const mappings = {};

    // Setup release specific rights query
    const trackFindParam = { 'releaseSpecificSalesReturnsRights.contractId': contract._id.toString() }; // This Query is already indexed: releaseSpecificSalesReturnsRights.contractId_1
    const tracks = await Track.find(trackFindParam, 'releaseSpecificSalesReturnsRights').lean().catch(logger.error);

    if (tracks?.length > 0) {
      let releaseIds = [];
      tracks.forEach((track) => {
        const releaseSpecificSalesReturnsRightsIds = track.releaseSpecificSalesReturnsRights.map((right) => right.releaseId).filter(Boolean);
        releaseIds = releaseIds.concat(releaseSpecificSalesReturnsRightsIds);
      });

      const filteredReleaseIds = [...new Set(releaseIds)];

      releaseQuery = { $or: [query, { _id: { $in: filteredReleaseIds } }] };
    }

    // Get release count for batches
    Release.countDocuments(releaseQuery)
      .then((count) => {
        // Run through in batches
        const limit = 10000;
        const rounds = listFromNumber(Math.floor(count / limit));
        let lastReleaseId;
        // Run through each batch
        async.eachSeries(rounds, (round, loopCb) => {
          // Find Releases in batch
          if (lastReleaseId) {
            if (releaseQuery.$or?.[0]) {
              releaseQuery.$or[0]._id = { $gt: lastReleaseId };
            } else {
              releaseQuery._id = { $gt: lastReleaseId };
            }
          }
          // Find tracks in batch
          Release.find(releaseQuery, '_id title version artist label foreignId catNo barcode mechanicalLicenses')
            .sort({ _id: 1 })
            .limit(limit)
            .lean()
            .then((releases) => {
              if (releases && releases[releases.length - 1]) {
                // Set lastReleaseId
                lastReleaseId = releases[releases.length - 1]._id;
              }

              if (releases) {
                // Loop through all found releases
                releases.forEach((release) => {
                  mappings[release._id.toString()] = {
                    catalogueReleaseTitle: release.title, catalogueReleaseVersion: release.version, catalogueReleaseArtist: release.artist, catalogueReleaseLabel: release.label, catalogueCatNo: release.catNo, catalogueReleaseForeignId: release.foreignId, catalogueBarcode: release.barcode, composersPublishersMapping: {},
                  };
                  // Map Composers/Publishers
                  if (release.mechanicalLicenses) {
                    Object.keys(release.mechanicalLicenses).forEach((trackId) => {
                      if (release.mechanicalLicenses[trackId] && release.mechanicalLicenses[trackId].licenses && release.mechanicalLicenses[trackId].licenses.length > 0) {
                        release.mechanicalLicenses[trackId].licenses.forEach((license) => {
                          if (license.contractId === contract._id.toString()) {
                            if (!mappings[release._id.toString()].composersPublishersMapping[trackId]) {
                              mappings[release._id.toString()].composersPublishersMapping[trackId] = {};
                            }
                            if (license.composerId && composersMapping[license.composerId]) {
                              mappings[release._id.toString()].composersPublishersMapping[trackId].composer = composersMapping[license.composerId];
                            }
                            if (license.publisherId && publishersMapping[license.publisherId]) {
                              mappings[release._id.toString()].composersPublishersMapping[trackId].publisher = publishersMapping[license.publisherId];
                            }
                          }
                        });
                      }
                    });
                  }
                });
              }
              // Batch callback
              loopCb();
            })
            .catch((err) => {
              logger.error(err);
              loopCb(err);
            });
        }, (err) => {
          // Return mappings
          cb(err, mappings);
        });
      })
      .catch((err) => {
        logger.error(err);
        cb(err, mappings);
      });
  },
  /**
   * Extracts the track mappings associated with the client
   *
   * @param {function(string, object)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  tracks: (contract, query, composersMapping, publishersMapping, cb) => {
    // Setup mappings return object
    const mappings = {};
    // Get track count for batches
    Track.countDocuments(query)
      .then((count) => {
        // Run through in batches
        const limit = 10000;
        const rounds = listFromNumber(Math.floor(count / limit));
        let lastTrackId;
        // Run through each batch
        async.eachSeries(rounds, (round, loopCb) => {
          if (lastTrackId) {
            query._id = { $gt: lastTrackId };
          }
          // Find tracks in batch
          Track.find(query, '_id title version artist label foreignId isrc defaultReleaseId releaseSpecificForeignIds mechanicalLicenses')
            .sort({ _id: 1 })
            .limit(limit)
            .lean()
            .then((tracks) => {
              if (tracks && tracks[tracks.length - 1]) {
                // Set last track ID
                lastTrackId = tracks[tracks.length - 1]._id;
              }

              if (tracks) {
                // Loop through all found tracks
                tracks.forEach((track) => {
                  mappings[track._id.toString()] = {
                    catalogueTrackTitle: track.title, catalogueTrackVersion: track.version, catalogueTrackArtist: track.artist, catalogueTrackLabel: track.label, catalogueIsrc: track.isrc, catalogueTrackForeignId: track.foreignId, defaultReleaseId: track.defaultReleaseId, releaseSpecificForeignIds: track.releaseSpecificForeignIds,
                  };
                  // Get Composer/Publisher
                  if (track.mechanicalLicenses && track.mechanicalLicenses.length > 0) {
                    track.mechanicalLicenses.forEach((license) => {
                      if (license.contractId === contract._id.toString()) {
                        if (license.composerId && composersMapping[license.composerId]) {
                          mappings[track._id.toString()].composer = composersMapping[license.composerId];
                        }
                        if (license.publisherId && publishersMapping[license.publisherId]) {
                          mappings[track._id.toString()].publisher = publishersMapping[license.publisherId];
                        }
                      }
                    });
                  }
                });
              }
              // Batch callback
              loopCb();
            })
            .catch((err) => {
              logger.error(err);
              loopCb(err);
            });
        }, (err) => {
          // Return mappings
          // @Arjun, seems weird you don't do the double return here unlike in releases
          cb(null, mappings);
        });
      })
      .catch((err) => {
        logger.error(err);
        cb(err, mappings);
      });
  },
  /**
   * Extracts the work mappings associated with the client
   *
   * @param {function(string, object)} callback - A callback that handles the response, with the returned mappings coming as an object
   */
  works: (query, cb) => {
    // Setup mappings return object
    const mappings = {};
    // Get track count for batches
    Work.countDocuments(query)
      .then((count) => {
        // Run through in batches
        const limit = 10000;
        const rounds = listFromNumber(Math.floor(count / limit));
        let lastWorkId;
        // Run through each batch
        async.eachSeries(rounds, (round, loopCb) => {
          if (lastWorkId) {
            query._id = { $gt: lastWorkId };
          }
          // Find tracks in batch
          Work.find(query, '_id title composer identifier foreignId iswc tunecode')
            .sort({ _id: 1 })
            .limit(limit)
            .lean()
            .then((works) => {
              if (works && works[works.length - 1]) {
                lastWorkId = works[works.length - 1]._id;
              }

              if (works) {
                // Loop through all found tracks
                works.forEach((work) => {
                  mappings[work._id] = {
                    catalogueWorkTitle: work.title, catalogueWorkComposer: work.composer, catalogueIdentifier: work.identifier, catalogueWorkForeignId: work.foreignId, catalogueIswc: work.iswc, catalogueTunecode: work.tunecode,
                  };
                });
              }
              // Batch callback
              loopCb();
            })
            .catch((err) => {
              logger.error(err);
              loopCb(err);
            });
        }, (err) => {
          // Return mappings
          cb(null, mappings);
        });
      })
      .catch((err) => {
        logger.error(err);
        cb(err, mappings);
      });
  },
};

module.exports = CatalogueOverwritingData;
