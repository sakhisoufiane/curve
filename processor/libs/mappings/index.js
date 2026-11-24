const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Work = require('../../models/work');

module.exports = {
  templateMappingsToObjects(mappings, client, callback) {
    // Do all mappings in single function
    // { territories: [], distributionChannels: [], etc }
    const mapper = this;
    try {
      const output = {
        releases: mappings.releases,
        tracks: mappings.tracks,
        contracts: mappings.contracts,
        works: mappings.works,
        externalReleases: mappings.externalReleases,
        externalTracks: mappings.externalTracks,
        externalContracts: mappings.externalContracts,
        externalWorks: mappings.externalWorks,
        releaseExceptions: client.duplicateReleases,
        trackExceptions: client.duplicateTracks,
        workExceptions: client.duplicateWorks,
      };
      async.parallel([
        function (cb) {
          mapper.templateMappingToObject(mappings.territories, (err, territories) => {
            output.territories = territories;
            cb(err);
          });
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.distributionChannels, (err, distributionChannels) => {
            output.distributionChannels = distributionChannels;
            cb(err);
          });
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.configurations, (err, configurations) => {
            output.configurations = configurations;
            cb(err);
          });
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.priceCategories, (err, priceCategories) => {
            output.priceCategories = priceCategories;
            cb(err);
          });
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.saleTypes, (err, saleTypes) => {
            output.saleTypes = saleTypes;
            cb(err);
          });
        },
        function (cb) {
          output.copyFields = mappings.copyFields;
          cb();
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.positiveNegatives, (err, positiveNegatives) => {
            output.positiveNegatives = positiveNegatives;
            cb(err);
          });
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.sources, (err, sources) => {
            output.sources = sources;
            cb(err);
          });
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.subSources, (err, subSources) => {
            output.subSources = subSources;
            cb(err);
          });
        },
        function (cb) {
          mapper.templateMappingToObject(mappings.currencies, (err, currencies) => {
            output.currencies = currencies;
            cb(err);
          });
        },
        function (cb) {
          mapper.removeInValidExceptions('track', client._id.toString(), output.trackExceptions).then((result) => {
            output.trackExceptions = result;
            cb(null);
          }).catch(cb);
        },
        function (cb) {
          mapper.removeInValidExceptions('release', client._id.toString(), output.releaseExceptions).then((result) => {
            output.releaseExceptions = result;
            cb(null);
          }).catch(cb);
        },
        function (cb) {
          mapper.removeInValidExceptions('work', client._id.toString(), output.workExceptions).then((result) => {
            output.workExceptions = result;
            cb(null);
          }).catch(cb);
        },
      ], (err) => {
        if (err) { logger.error(err); }
        callback(err, output);
      });
    } catch (err) {
      logger.error(err);
      callback(new Error('There was an error in preparing the mappings for the sales file. Please check the template mappings and try again.'));
    }
  },
  templateMappingToObject(mappings, callback) {
    // For a single mapping
    // [ { "map" : "CD", "name" : "Config 1" } ]
    const object = {};
    if (mappings && Array.isArray(mappings)) {
      try {
        async.each(mappings, (mapping, cb) => {
          if (!mapping.map) { mapping.map = ''; }
          // If mapping is N/A, do not clean the string. N/A is a valid mapping, so we need to preserve this
          if (mapping.map !== 'N/A') {
            mapping.map = String(mapping.map).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          }
          object[mapping.map] = mapping.name;
          cb();
        }, (err) => {
          callback(err, object);
        });
      } catch (err) {
        logger.error(err);
        callback(new Error('There was an error in preparing the mappings for the sales file. Please check the template mappings and try again.'));
      }
    } else {
      callback(null, object);
    }
  },
  async removeInValidExceptions(type, clientId, exceptions) {
    let model = null;
    if (type === 'track') model = Track;
    else if (type === 'release') model = Release;
    else if (type === 'work') model = Work;

    const docs = await model.find({ clientId, _id: { $in: exceptions.map(({ output }) => new ObjectId(output)) } }).lean();
    const filteredExceptions = exceptions.filter(({ output }) => docs.find(({ _id }) => _id.toString() === output));
    return filteredExceptions;
  },
};
