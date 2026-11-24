const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const { eachLimit, parallel } = require('async');

const catalogueItemHelpers = {
  checkDataBeforeDelete: (Model, params, callback) => {
    const Work = require('../models/work');
    const Track = require('../models/track');
    const Release = require('../models/release');
    const Composer = require('../models/composer');
    const Publisher = require('../models/publisher');

    // split params to local variables
    const { clientId, deletionType, idsToTest, worksFilterField, tracksFilterField, releasesFilterField, composersFilterField, publishersFilterField, logLabel } = params;
    // Determine type of lookup to be made
    const multi = (deletionType === 'multi');
    const baseFilter = { $in: idsToTest };
    const mongoLookup = (multi) ? catalogueItemHelpers.getModelDataCount : catalogueItemHelpers.getModelData;

    parallel({
      associatedWorks(pcb) {
        // Look for work associations in Mongo
        if (worksFilterField) {
          // Build lookup filters
          const workFilter = { clientId };
          workFilter[worksFilterField] = baseFilter;
          logger.debug('checkDataBeforeDeletion Mongo workFilter\n', JSON.stringify(workFilter, null, 2));
          // Look up associated works data in mongo - select function to use based on single/bulk deletion request
          mongoLookup(Work, workFilter, 'works', (worksErr, worksCount, works) => {
            pcb(worksErr, { worksCount, works });
          });
        } else {
          setImmediate(() => {
            pcb(null, {});
          });
        }
      },
      associatedTracks(pcb) {
        // Look for track associations in Mongo
        if (tracksFilterField) {
          // Build lookup filters
          const trackFilter = { clientId };
          trackFilter[tracksFilterField] = baseFilter;
          logger.debug('checkDataBeforeDeletion Mongo trackFilter\n', JSON.stringify(trackFilter, null, 2));
          // Look up associated tracks data in mongo - select function to use based on single/bulk deletion request
          mongoLookup(Track, trackFilter, 'tracks', (tracksErr, tracksCount, tracks) => {
            pcb(tracksErr, { tracksCount, tracks });
          });
        } else {
          setImmediate(() => {
            pcb(null, {});
          });
        }
      },
      associatedReleases(pcb) {
        // Look for release associations in Mongo
        if (releasesFilterField) {
          // Build lookup filters
          const releaseFilter = { clientId };
          releaseFilter[releasesFilterField] = baseFilter;
          logger.debug('checkDataBeforeDeletion Mongo releaseFilter\n', JSON.stringify(releaseFilter, null, 2));
          // Look up associated releases data in mongo - select function to use based on single/bulk deletion request
          mongoLookup(Release, releaseFilter, 'releases', (releasesErr, releasesCount, releases) => {
            pcb(releasesErr, { releasesCount, releases });
          });
        } else {
          setImmediate(() => {
            pcb(null, {});
          });
        }
      },
      associatedComposers(pcb) {
        // Look for composer associations in Mongo
        if (composersFilterField) {
          // Build lookup filters
          const composerFilter = { clientId };
          composerFilter[composersFilterField] = baseFilter;
          logger.debug('checkDataBeforeDeletion Mongo composerFilter\n', JSON.stringify(composerFilter, null, 2));
          // Look up associated composers data in mongo - select function to use based on single/bulk deletion request
          mongoLookup(Composer, composerFilter, 'composers', (composersErr, composersCount, composers) => {
            pcb(composersErr, { composersCount, composers });
          });
        } else {
          setImmediate(() => {
            pcb(null, {});
          });
        }
      },
      associatedPublishers(pcb) {
        // Look for publisher associations in Mongo
        if (publishersFilterField) {
          // Build lookup filters
          const publisherFilter = { clientId };
          publisherFilter[publishersFilterField] = baseFilter;
          logger.debug('checkDataBeforeDeletion Mongo publisherFilter\n', JSON.stringify(publisherFilter, null, 2));
          // Look up associated publishers data in mongo - select function to use based on single/bulk deletion request
          mongoLookup(Publisher, publisherFilter, 'publishers', (publishersErr, publishersCount, publishers) => {
            pcb(publishersErr, { publishersCount, publishers });
          });
        } else {
          setImmediate(() => {
            pcb(null, {});
          });
        }
      },
    }, (err, associations) => {
      if (err) {
        logger.error(err);
        return callback(err);
      }
      let response;
      const { worksCount, works } = associations.associatedWorks;
      const { tracksCount, tracks } = associations.associatedTracks;
      const { releasesCount, releases } = associations.associatedReleases;
      const { composersCount, composers } = associations.associatedComposers;
      const { publishersCount, publishers } = associations.associatedPublishers;
      logger.debug({ worksCount, works, tracksCount, tracks, releasesCount, releases, composersCount, composers, publishersCount, publishers });

      if (worksCount || tracksCount || releasesCount || composersCount || publishersCount) {
        if (works || tracks || releases || composers || publishers) {
          // This is an edit page deletion and we are returning links to associated data preventing deletion
          const associations = {};
          if (works) { associations.works = works; }
          if (tracks) { associations.tracks = tracks; }
          if (releases) { associations.releases = releases; }
          if (composers) { associations.composers = composers; }
          if (publishers) { associations.publishers = publishers; }
          response = associations;
        } else {
          // This is an index page deletion returning a blanket response based on count lookups
          const associations = [];
          if (worksCount) { associations.push('Works'); }
          if (tracksCount) { associations.push('Tracks'); }
          if (releasesCount) { associations.push('Releases'); }
          if (composersCount) { associations.push('Composers'); }
          if (publishersCount) { associations.push('Publishers'); }
          response = associations.join(', ');

          if (associations.length > 1) {
            // Replace last occurrence of , with and
            const intPos = response.lastIndexOf(',');
            response = `${response.substring(0, intPos)} and ${response.substring(intPos + 2, response.length)}`;
          }
        }
        logger.debug({ response });
        callback(null, 201, response);
      } else {
        // Set ids to be ObjectIds
        const objectIds = idsToTest.map((id) => new ObjectId(id));
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
            logger.error(`Error finding document for delection with clientId '${clientId}': ${err}`);
            callback(err);
          });
      }
    });
  },
  getModelData: (Model, filter, path, callback) => {
    let data;
    Model.find(filter, 'name title')
      .then((docs) => {
        let count = 0;
        if (docs && docs.length) {
          data = [];
          count = docs.length;
          docs.forEach((doc) => {
            data.push({
              name: doc.name || doc.title,
              _id: doc._id,
              link: `${path}/${doc._id}${(path === 'statements') ? '' : '/edit'}`,
            });
          });
        }
        callback(null, count, data);
      })
      .catch((err) => {
        logger.error(`Error finding document with filter '${JSON.stringify(filter)}': ${err}`);
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
        logger.error(`Error counting documents with filter '${JSON.stringify(filter)}': ${err}`);
        callback(err);
      });
  },
};

module.exports = catalogueItemHelpers;
