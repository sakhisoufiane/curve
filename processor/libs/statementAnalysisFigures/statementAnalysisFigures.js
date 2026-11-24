const async = require('async');
const { salesCalculations, costsOutput } = require('./helpers');

module.exports = function (event, callback) {
  const object = {};
  async.parallel({
    salesOutput(cb) {
      salesCalculations(event.salesOutputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, event.client, cb);
    },
    costsOutput(cb) {
      costsOutput(event, cb);
    },
  }, (err, result) => {
    if (err) {
      callback(err);
    } else {
      // Loop through output data
      result.salesOutput.distributionChannels.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.distributionChannels = object[item.contractId].net.distributionChannels || [];
        object[item.contractId].net.distributionChannels.push({ type: item.distributionChannel, units: item.units, value: item.net, deduction: item.deduction });
        object[item.contractId].gross.distributionChannels = object[item.contractId].gross.distributionChannels || [];
        object[item.contractId].gross.distributionChannels.push({
          type: item.distributionChannel, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.configurations.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.configurations = object[item.contractId].net.configurations || [];
        object[item.contractId].net.configurations.push({ type: item.configuration, units: item.units, value: item.net, deduction: item.deduction });
        object[item.contractId].gross.configurations = object[item.contractId].gross.configurations || [];
        object[item.contractId].gross.configurations.push({
          type: item.configuration, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.territories.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.territories = object[item.contractId].net.territories || [];
        object[item.contractId].net.territories.push({ type: item.territory, units: item.units, value: item.net, deduction: item.deduction });
        object[item.contractId].gross.territories = object[item.contractId].gross.territories || [];
        object[item.contractId].gross.territories.push({
          type: item.territory, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.sources.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.sources = object[item.contractId].net.sources || [];
        object[item.contractId].net.sources.push({ type: item.source, units: item.units, value: item.net, deduction: item.deduction });
        object[item.contractId].gross.sources = object[item.contractId].gross.sources || [];
        object[item.contractId].gross.sources.push({
          type: item.source, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.subSources.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.subSources = object[item.contractId].net.subSources || [];
        object[item.contractId].net.subSources.push({ type: item.subSource, units: item.units, value: item.net, deduction: item.deduction });
        object[item.contractId].gross.subSources = object[item.contractId].gross.subSources || [];
        object[item.contractId].gross.subSources.push({
          type: item.subSource, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.configChannels.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.configurationByDistributionChannel = object[item.contractId].net.configurationByDistributionChannel || [];
        object[item.contractId].net.configurationByDistributionChannel.push({
          distributionChannel: item.distributionChannel, configuration: item.configuration, units: item.units, value: item.net, deduction: item.deduction,
        });
        object[item.contractId].gross.configurationByDistributionChannel = object[item.contractId].gross.configurationByDistributionChannel || [];
        object[item.contractId].gross.configurationByDistributionChannel.push({
          distributionChannel: item.distributionChannel, configuration: item.configuration, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.releases.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        const title = (item.catalogueReleaseVersion && item.catalogueReleaseVersion !== '') ? `${item.catalogueReleaseTitle} (${item.catalogueReleaseVersion})` : item.catalogueReleaseTitle;
        object[item.contractId].net.releases = object[item.contractId].net.releases || [];
        object[item.contractId].net.releases.push({
          type: item.catalogueCatNo, title, units: item.units, value: item.net, deduction: item.deduction,
        });
        object[item.contractId].gross.releases = object[item.contractId].gross.releases || [];
        object[item.contractId].gross.releases.push({
          type: item.catalogueCatNo, title, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.tracks.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        const title = (item.catalogueTrackVersion && item.catalogueTrackVersion !== '') ? `${item.catalogueTrackTitle} (${item.catalogueTrackVersion})` : item.catalogueTrackTitle;
        object[item.contractId].net.tracks = object[item.contractId].net.tracks || [];
        object[item.contractId].net.tracks.push({
          type: item.catalogueIsrc, title, units: item.units, value: item.net, deduction: item.deduction,
        });
        object[item.contractId].gross.tracks = object[item.contractId].gross.tracks || [];
        object[item.contractId].gross.tracks.push({
          type: item.catalogueIsrc, title, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.salesOutput.works.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.works = object[item.contractId].net.works || [];
        object[item.contractId].net.works.push({
          type: item.catalogueIdentifier, title: item.catalogueWorkTitle, units: item.units, value: item.net, deduction: item.deduction,
        });
        object[item.contractId].gross.works = object[item.contractId].gross.works || [];
        object[item.contractId].gross.works.push({
          type: item.catalogueIdentifier, title: item.catalogueWorkTitle, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        });
      });
      result.costsOutput.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || { gross: {}, net: {} };
        object[item.contractId].net.costs = object[item.contractId].net.costs || [];
        if (item.net !== 0) {
          object[item.contractId].net.costs.push({ type: item.type, value: item.net });
        }
        object[item.contractId].gross.costs = object[item.contractId].gross.costs || [];
        if (item.gross !== 0) {
          object[item.contractId].gross.costs.push({ type: item.type, value: item.gross });
        }
      });
      callback(null, object);
    }
  });
};
