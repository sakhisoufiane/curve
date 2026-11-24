const async = require('async');
const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');

module.exports = {
  templateMappingsToObjects(mappings, callback) {
    // Do all mappings in single function
    // { territories: [], distributionChannels: [], etc }
    const mapper = this;
    const output = {
      releases: mappings.client.releaseMappings,
      tracks: mappings.client.trackMappings,
      works: mappings.client.workMappings,
    };
    async.parallel([
      function (cb) {
        mapper.templateMappingToObject(mappings.territories, (territories) => {
          output.territories = territories;
          cb();
        });
      },
      function (cb) {
        mapper.templateMappingToObject(mappings.distributionChannels, (distributionChannels) => {
          output.distributionChannels = distributionChannels;
          cb();
        });
      },
      function (cb) {
        mapper.templateMappingToObject(mappings.configurations, (configurations) => {
          output.configurations = configurations;
          cb();
        });
      },
      function (cb) {
        mapper.templateMappingToObject(mappings.priceCategories, (priceCategories) => {
          output.priceCategories = priceCategories;
          cb();
        });
      },
      function (cb) {
        output.copyFields = {};
        async.each(mappings.copyFields, (copyField, copyFieldCb) => {
          output.copyFields[copyField.from] = copyField.to;
          copyFieldCb();
        }, cb);
      },
      function (cb) {
        mapper.templateMappingToObject(mappings.positiveNegatives, (positiveNegatives) => {
          output.positiveNegatives = positiveNegatives;
          cb();
        });
      },
      function (cb) {
        mapper.templateMappingToObject(mappings.subsources, (subSources) => {
          output.subSources = subSources;
          cb();
        });
      },
    ], () => {
      callback(output.territories, output.distributionChannels, output.configurations, output.priceCategories, output.copyFields, output.positiveNegatives, output.subSources, output.releases, output.tracks, output.works);
    });
  },
  templateMappingToObject(mappings, callback) {
    // For a single mapping
    // [ { "map" : "CD", "name" : "Config 1" } ]
    const object = {};
    if (mappings && mappings.constructor === Array) {
      async.each(mappings, (mapping, cb) => {
        object[mapping.map] = mapping.name;
        cb();
      }, () => {
        callback(object);
      });
    } else {
      callback(object);
    }
  },
};
