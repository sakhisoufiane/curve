const { logger, fileManager, databaseUtils, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { MongoClient } = require('mongodb');
const moment = require('moment');
const async = require('async');
const Client = require('../models/client');
const SalesTemplate = require('../models/salesTemplate');
const SendEmail = require('./sendEmail');
const Release = require('../models/release');
const Track = require('../models/track');

// Mappings
//! move maooings to seperate helper file
const sourceMappings = {
  'INDIGO MUSIK GMBH (GERMANY)': 'INDIGO MUSIK GMBH (GERMANY)',
  INGROOVES: 'INGROOVES',
  'PIAS EUROPE': 'PIAS EUROPE',
  PLAYGROUND: 'PLAYGROUND',
  'SONY MUSIC UK Ltd': 'SONY MUSIC UK Ltd',
};

const configMappings = {
  bigBrother: {
    positiveConfigMapping: {
      'Download (Album)': '4390A',
      'Download (Single)': '4390B',
      'Download (Track)': '4390B',
      Ringtone: '4390Bs',
      treaming: '4390',
      'Video (Streaming)': '4390Bs',
      Licensing: '4300',
      '7 Inch': '4030',
      CD: '4010',
      'CD Boxset': '4010',
      CD2: '4010',
      DVD: '4060',
      LP: '4030',
      'LP Boxset': '4030',
      LP2: '4030',
      'Mixed Format Boxset': '4030',
    },
    negativeConfigMapping: {
      // eslint-disable-next-line max-len
      'Download (Album)': '4390A', 'Download (Single)': '4390B', 'Download (Track)': '4390B', Ringtone: '4390Bs', Streaming: '4390', 'Video (Streaming)': '4390Bs', Licensing: '4300', '7 Inch': '4130', CD: '4110', 'CD Boxset': '4110', CD2: '4110', DVD: '4160', LP: '4130', 'LP Boxset': '4130', LP2: '4130', 'Mixed Format Boxset': '4130',
    },
    discountConfigMapping: {
      '7 Inch': '4230', CD: '4210', 'CD Boxset': '4210', CD2: '4210', DVD: '4260', LP: '4230T', 'LP Boxset': '4230X', LP2: '4230T', 'Mixed Format Boxset': '4261',
    },
  },
  sourMash: {
    positiveConfigMapping: {
      // eslint-disable-next-line max-len
      '10 Inch': '4030', '12 Inch': '4030T', '7 Inch': '4030', Cassette: '4020', CD: '4010', 'CD Boxset': '4010', 'CD Single': '4010', CD2: '4010X', 'Download (Album)': '4390A', 'Download (Single)': '4390B', 'Download (Track)': '4390B', DVD: '4060', Licensing: '4385', LP: '4030T', 'LP Boxset': '4030T', LP2: '4030T', Merchandise: '4385', 'Mixed Format Boxset': '4010', 'Neighbouring Rights': '4385', Ringtone: '4390B', Streaming: '4390AS', Synchronisation: '4385', 'Video (Download)': '4390B', 'Video (Streaming)': '4390AS', 'Blu Ray': '4060',
    },
    negativeConfigMapping: {
      // eslint-disable-next-line max-len
      '10 Inch': '4130', '12 Inch': '4130T', '7 Inch': '4130', Cassette: '4120', CD: '4110', 'CD Boxset': '4110', 'CD Single': '4110', CD2: '4110X', DVD: '4160', LP: '4130T', 'LP Boxset': '4130T', LP2: '4130T', 'Mixed Format Boxset': '4110', 'Blu Ray': '4160',
    },
    discountConfigMapping: {
      // eslint-disable-next-line max-len
      '10 Inch': '4230', '12 Inch': '4230T', '7 Inch': '4230', Cassette: '4220', CD: '4210', 'CD Boxset': '4210', 'CD Single': '4210', CD2: '4210X', DVD: '4260', LP: '4230T', 'LP Boxset': '4230T', LP2: '4230T', 'Mixed Format Boxset': '4210', 'Blu Ray': '4260',
    },
  },
  ignition: {
    positiveConfigMapping: {
      // eslint-disable-next-line max-len
      '10 Inch': '1330', '12 Inch': '1330T', '7 Inch': '1330', Cassette: '1320', CD: '1310', 'CD Boxset': '1310', 'CD Single': '1310', CD2: '1310', 'Download (Album)': '1600A', 'Download (Single)': '1600B', 'Download (Track)': '1600B', DVD: '1360', Licensing: '1990', LP: '1330T', 'LP Boxset': '1330T', LP2: '1330T', 'Neighbouring Rights': '1990', Ringtone: '1600B', Streaming: '1600Bs', Synchronisation: '1860', 'Video (Download)': '1600B', 'Video (Streaming)': '1600Bs', 'Synchronisation (3rd Party)': '1860', '12 Inch Single': '1330T', VPL: '1990',
    },
    negativeConfigMapping: {
      '10 Inch': '1430', '12 Inch': '1430', '7 Inch': '1430', Cassette: '1420', CD: '1410', 'CD Boxset': '1410', 'CD Single': '1410', CD2: '1410', DVD: '1460', Licensing: '0', LP: '1430', 'LP Boxset': '1430', LP2: '1430', '12 Inch Single': '1430',
    },
    discountConfigMapping: {
      '10 Inch': '1530', '12 Inch': '1530T', '7 Inch': '1530', Cassette: '1520', CD: '1510', 'CD Boxset': '1510', 'CD Single': '1510', CD2: '1510', DVD: '1560', LP: '1530T', 'LP Boxset': '1530T', LP2: '1530T', '12 Inch Single': '1530T',
    },
  },
};

const ignitionExport = function (salesFile, curveUser, callback) {
  Client.findById(salesFile.clientId)
    .then((client) => {
      // Prepare variables
      const output = [];
      const ukReleaseData = {};
      const rowReleaseData = {};
      const ukTrackData = {};
      const rowTrackData = {};
      const releaseMappings = {};
      const reverseReleaseMappings = {};
      const trackMappings = {};
      const reverseTrackMappings = {};
      let templateName;
      // Select mappings
      let positiveConfigMapping; let negativeConfigMapping; let discountConfigMapping;

      if (client.name === 'Ignition - Ignition') {
        positiveConfigMapping = configMappings.ignition.positiveConfigMapping;
        negativeConfigMapping = configMappings.ignition.negativeConfigMapping;
        discountConfigMapping = configMappings.ignition.discountConfigMapping;
      } else if (client.name === 'Ignition - Big Brother') {
        positiveConfigMapping = configMappings.bigBrother.positiveConfigMapping;
        negativeConfigMapping = configMappings.bigBrother.negativeConfigMapping;
        discountConfigMapping = configMappings.bigBrother.discountConfigMapping;
      } else if (client.name === 'Ignition - Sour Mash') {
        positiveConfigMapping = configMappings.sourMash.positiveConfigMapping;
        negativeConfigMapping = configMappings.sourMash.negativeConfigMapping;
        discountConfigMapping = configMappings.sourMash.discountConfigMapping;
      }

      async.waterfall([
        function (cb) {
          // Organise Mappings
          async.each(client.catalogueGroups, (catGroup, catGroupCb) => {
            async.parallel([
              function (paraCb) {
                // Releases
                Release.find({ clientId: salesFile.clientId, catalogueGroups: catGroup }, { catNo: 1 })
                  .then((releases) => {
                    const releaseIds = releases.map((release) => release._id.toString());
                    releaseMappings[catGroup] = releaseIds;
                    releaseIds.forEach((releaseId) => { reverseReleaseMappings[releaseId] = catGroup; });
                    paraCb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    paraCb(err);
                  });
              },
              function (paraCb) {
                // Tracks
                Track.find({ clientId: salesFile.clientId, catalogueGroups: catGroup }, { isrc: 1 })
                  .then((tracks) => {
                    const trackIds = tracks.map((track) => track._id.toString());
                    trackMappings[catGroup] = trackIds;
                    trackIds.forEach((trackId) => { reverseTrackMappings[trackId] = catGroup; });
                    paraCb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    paraCb(err);
                  });
              },
            ], catGroupCb);
          }, cb);
        },
        function (cb) {
          SalesTemplate.findById(salesFile.salesTemplateId)
            .then((template) => {
              if (template) { templateName = template.source; }
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        function (cb) {
          // Setup Connection
          connectToMongo(salesFile.clientId, cb);
        },
        function (db, collection, cb) {
          // Collect Data
          async.series([
            function (getDataCb) {
              logger.debug('Running Filters');
              // UK Release Data
              const groups = Object.keys(releaseMappings);
              // Loop through each set of cat nos
              async.eachSeries(groups, (catNoGroup, groupCb) => {
                const filter = {
                  salesFileId: salesFile._id.toString(), catType: 'Release', territory: 'GB', releaseId: { $in: releaseMappings[catNoGroup] }, units: { $gte: 0 },
                };
                // Get positive data
                getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration' }, (err, positiveData) => {
                  // Get negative data
                  filter.units = { $lt: 0 };
                  getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration' }, (err, negativeData) => {
                    ukReleaseData[catNoGroup] = [].concat(positiveData, negativeData);
                    groupCb();
                  });
                });
              }, getDataCb);
            },
            function (getDataCb) {
              // UK Track Data
              const groups = Object.keys(trackMappings);
              // Loop through each set of ISRCs
              async.eachSeries(groups, (isrcGroup, groupCb) => {
                const filter = {
                  salesFileId: salesFile._id.toString(), catType: 'Track', territory: 'GB', trackId: { $in: trackMappings[isrcGroup] },
                };
                getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration' }, (err, data) => {
                  ukTrackData[isrcGroup] = data;
                  groupCb();
                });
              }, getDataCb);
            },
            function (getDataCb) {
              // ROW Release Data
              const groups = Object.keys(releaseMappings);
              // Loop through each set of cat nos
              async.eachSeries(groups, (catNoGroup, groupCb) => {
                const filter = {
                  salesFileId: salesFile._id.toString(), catType: 'Release', territory: { $ne: 'GB' }, releaseId: { $in: releaseMappings[catNoGroup] }, units: { $gte: 0 },
                };
                // Get positive data
                getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration' }, (err, positiveData) => {
                  // Get negative data
                  filter.units = { $lt: 0 };
                  getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration' }, (err, negativeData) => {
                    rowReleaseData[catNoGroup] = [].concat(positiveData, negativeData);
                    groupCb();
                  });
                });
              }, getDataCb);
            },
            function (getDataCb) {
              // ROW Track Data
              const groups = Object.keys(trackMappings);
              // Loop through each set of ISRCs
              async.eachSeries(groups, (isrcGroup, groupCb) => {
                const filter = {
                  salesFileId: salesFile._id.toString(), catType: 'Track', territory: { $ne: 'GB' }, trackId: { $in: trackMappings[isrcGroup] },
                };
                getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration' }, (err, data) => {
                  rowTrackData[isrcGroup] = data;
                  groupCb();
                });
              }, getDataCb);
            },
            // UNKNOWN ITEMS
            function (getDataCb) {
              // Ungrouped releases
              const groups = Object.keys(releaseMappings);
              // Get all cat nos to not be in
              const ninReleaseIds = [];
              groups.forEach((group) => {
                releaseMappings[group].forEach((releaseId) => { ninReleaseIds.push(releaseId); });
              });
              // Loop through each set of cat nos
              const filter = {
                salesFileId: salesFile._id.toString(), catType: 'Release', territory: 'GB', releaseId: { $nin: ninReleaseIds }, units: { $gte: 0 },
              };
              // Get positive data data
              getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration', catalogueCatNo: '$catalogueCatNo' }, (err, positiveData) => {
                // Get negative data
                filter.units = { $lt: 0 };
                getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration', catalogueCatNo: '$catalogueCatNo' }, (err, negativeData) => {
                  ukReleaseData.unknown = [].concat(positiveData, negativeData);
                  getDataCb();
                });
              });
            },
            function (getDataCb) {
              // UK Track Data
              const groups = Object.keys(trackMappings);
              // Get all ISRCs to not be in
              const ninTrackIds = [];
              groups.forEach((group) => {
                trackMappings[group].forEach((trackId) => { ninTrackIds.push(trackId); });
              });
              const filter = {
                salesFileId: salesFile._id.toString(), catType: 'Track', territory: 'GB', trackId: { $nin: ninTrackIds },
              };
              getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration', catalogueIsrc: '$catalogueIsrc' }, (err, data) => {
                ukTrackData.unknown = data;
                getDataCb();
              });
            },
            function (getDataCb) {
              // ROW Release Data
              const groups = Object.keys(releaseMappings);
              // Get all cat nos to not be in
              const ninReleaseIds = [];
              groups.forEach((group) => {
                releaseMappings[group].forEach((releaseId) => { ninReleaseIds.push(releaseId); });
              });
              const filter = {
                salesFileId: salesFile._id.toString(), catType: 'Release', territory: { $ne: 'GB' }, releaseId: { $nin: ninReleaseIds }, units: { $gte: 0 },
              };
              // Get positive data
              getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration', catalogueCatNo: '$catalogueCatNo' }, (err, positiveData) => {
                // Get negative data
                filter.units = { $lt: 0 };
                getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration', catalogueCatNo: '$catalogueCatNo' }, (err, negativeData) => {
                  rowReleaseData.unknown = [].concat(positiveData, negativeData);
                  getDataCb();
                });
              });
            },
            function (getDataCb) {
              // ROW Track Data
              const groups = Object.keys(trackMappings);
              // Get all ISRCs to not be in
              const ninTrackIds = [];
              groups.forEach((group) => {
                trackMappings[group].forEach((trackId) => { ninTrackIds.push(trackId); });
              });
              const filter = {
                salesFileId: salesFile._id.toString(), catType: 'Track', territory: { $ne: 'GB' }, trackId: { $nin: ninTrackIds },
              };
              getData(collection, filter, { distributionChannel: '$distributionChannel', configuration: '$configuration', catalogueIsrc: '$catalogueIsrc' }, (err, data) => {
                rowTrackData.unknown = data;
                getDataCb();
              });
            },
          ], (err) => {
            logger.debug('Completed Filters');
            cb(err);
          });
        },
        function (cb) {
          // Organise data
          async.series([
            function (dataCb) {
              // UK Data
              // Combine Releases and Tracks
              Object.keys(ukTrackData).forEach((trackKey) => {
                ukReleaseData[trackKey] = ukReleaseData[trackKey] || [];
                ukReleaseData[trackKey] = [].concat(ukReleaseData[trackKey], ukTrackData[trackKey]);
              });
              const releaseGroups = Object.keys(ukReleaseData);
              async.eachSeries(releaseGroups, (releaseMapping, releaseMappingCb) => {
                // Consolidate rows with same configs
                const consolidatedData = consolidateData(ukReleaseData[releaseMapping]);
                // Loop through consolidated data
                Object.keys(consolidatedData.consolidated).forEach((dataKey) => {
                  const releaseData = consolidatedData.consolidated[dataKey];
                  if (releaseData && releaseData.units != 0 && releaseData.grossAmount != 0) {
                    // Main Line
                    const lineOutput = dataOutput(salesFile, templateName, releaseData, releaseMapping, '', releaseData.config);
                    output.push(lineOutput);
                  }
                  // Discounts
                  if (releaseData.discountConfig && releaseData.discountAmount != 0) {
                    const discount = discountOutput(salesFile, templateName, releaseData, releaseMapping, '', releaseData.discountConfig);
                    output.push(discount);
                  }
                });
                // Distribution Fee
                if (consolidatedData.distributionFee && consolidatedData.distributionFee.units != 0 && consolidatedData.distributionFee.netAmount != 0) {
                  const distributionNo = client.name === 'Ignition - Ignition' ? '2150' : '5800';
                  const distribution = distributionOutput(salesFile, templateName, consolidatedData.distributionFee, releaseMapping, '', distributionNo);
                  output.push(distribution);
                }
                releaseMappingCb();
              }, dataCb);
            },
            function (dataCb) {
              // ROW  Data
              // Combine Releases and Tracks
              Object.keys(rowTrackData).forEach((trackKey) => {
                rowReleaseData[trackKey] = rowReleaseData[trackKey] || [];
                rowReleaseData[trackKey] = [].concat(rowReleaseData[trackKey], rowTrackData[trackKey]);
              });
              const releaseGroups = Object.keys(rowReleaseData);
              async.eachSeries(releaseGroups, (releaseMapping, releaseMappingCb) => {
                // Consolidate rows with same configs
                const consolidatedData = consolidateData(rowReleaseData[releaseMapping]);
                // Loop through consolidated data
                Object.keys(consolidatedData.consolidated).forEach((dataKey) => {
                  const releaseData = consolidatedData.consolidated[dataKey];
                  if (releaseData && releaseData.units != 0 && releaseData.grossAmount != 0) {
                    // Main Line
                    const lineOutput = dataOutput(salesFile, templateName, releaseData, releaseMapping, 'INT', releaseData.config);
                    output.push(lineOutput);
                  }
                  // Discounts
                  if (releaseData.discountConfig && releaseData.discountAmount != 0) {
                    const discount = discountOutput(salesFile, templateName, releaseData, releaseMapping, 'INT', releaseData.discountConfig);
                    output.push(discount);
                  }
                });
                // Distribution Fee
                if (consolidatedData.distributionFee && consolidatedData.distributionFee.units != 0 && consolidatedData.distributionFee.netAmount != 0) {
                  const distributionNo = client.name === 'Ignition - Ignition' ? '2150' : '5800';
                  const distribution = distributionOutput(salesFile, templateName, consolidatedData.distributionFee, releaseMapping, 'INT', distributionNo);
                  output.push(distribution);
                }
                releaseMappingCb();
              }, dataCb);
            },
          ], cb);
        },
      ], (err) => {
        groupItems(output, (err, outputData) => {
          async.waterfall([
            function (cb) {
              Exports.getTemplate({ Client, templateName: 'ignition', clientId: salesFile.clientId }).then((template) => {
                createXlsx.createInTemplate([outputData], template, cb);
              });
            },
            function (filePath, cb) {
              Client.findById(curveUser.clientId)
                .then((client) => {
                  fileManager.uploadToS3(`exports/${client.name} Ignition Export ${salesFile.name} ${moment().format('YYYYMMDDHHmmssSSS')}.xlsx`, filePath, cb);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
            function (key, cb) {
              fileManager.publicLink24Hours(key, cb);
            },
            function (link, cb) {
              Client.findById(curveUser.clientId)
                .then((client) => {
                  SendEmail.exportDownload(curveUser, client, `Your Ignition Export for ${salesFile.name} is Ready to Download`, link, cb);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
          ], callback);
        });
      });

      function consolidateData(data) {
        const result = {};
        const distributionFee = {
          units: 0, netAmount: 0, grossAmount: 0, discountAmount: 0,
        };
        if (data) {
          data.forEach((item) => {
            logger.debug(item);
            // Set config on initial loop through
            item.config = item.units >= 0 ? mapValue(item.configuration, positiveConfigMapping) : mapValue(item.configuration, negativeConfigMapping);
            item.discountConfig = mapValue(item.configuration, discountConfigMapping);
            const key = item.distributionChannel + item.config;
            if (result[key]) {
              result[key].units += item.units;
              result[key].discountAmount += item.discountAmount;
              result[key].netAmount += item.netAmount;
              result[key].grossAmount += item.grossAmount;
            } else {
              result[key] = item;
            }
            // Set distribution fee
            distributionFee.units += item.units;
            distributionFee.discountAmount += item.discountAmount;
            distributionFee.netAmount += item.netAmount;
            distributionFee.grossAmount += item.grossAmount;
          });
        }
        return { consolidated: result, distributionFee };
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

function groupItems(output, callback) {
  callback(null, output);
}

function connectToMongo(clientId, callback) {
  Client.findById(clientId)
    .then((client) => {
      // MongoDB call, not mongoose
      MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
        .then((mongoClient) => {
          const db = mongoClient.db(databaseUtils.getMongoDBName());
          const collection = db.collection(client.salesDatabaseTable);
          callback(null, db, collection);
        })
        .catch(callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}

function getData(collection, filter, id, callback) {
  const group = {
    _id: id,
    catNo: { $first: '$catalogueCatNo' },
    isrc: { $first: '$catalogueIsrc' },
    units: { $sum: '$units' },
    distributionChannel: { $first: '$distributionChannel' },
    configuration: { $first: '$configuration' },
    saleDate: { $first: '$saleDate' },
    currency: { $first: '$originalCurrency' },
    discountAmount: { $sum: '$homeCurrencyDiscountAmount' },
    netAmount: { $sum: '$homeCurrencyNetAmount' },
    grossAmount: { $sum: '$homeCurrencyGrossAmount' },
  };
  // MongoDB call not mongoose
  collection.aggregate([
    { $match: filter },
    { $group: group },
  ], { allowDiskUse: true })
    .toArray()
    .then((array) => {
      callback(null, array);
    })
    .catch(callback);
}

function dataOutput(salesFile, templateName, lineData, className, terrType, config) {
  return [
    null,
    mapValue(templateName, sourceMappings),
    moment(lineData.saleDate).format('MM/DD/YYYY'),
    'IGNITION',
    'Net 30',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    salesFile.name,
    null,
    null,
    null,
    null,
    null,
    config,
    lineData.units,
    lineData.grossAmount && lineData.units ? lineData.grossAmount / lineData.units : 0, // Per unit rate
    salesFile.name, // Description
    parseFloat(lineData.grossAmount).toFixed(5),
    terrType + className, // Class
    'Tax',
    1000,
    'GBP',
    1,
  ];
}

function discountOutput(salesFile, templateName, lineData, className, terrType, config) {
  return [
    null,
    mapValue(templateName, sourceMappings),
    moment(lineData.saleDate).format('MM/DD/YYYY'),
    'IGNITION',
    'Net 30',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    salesFile.name,
    null,
    null,
    null,
    null,
    null,
    config,
    lineData.units,
    0 - (lineData.discountAmount && lineData.units ? lineData.discountAmount / lineData.units : 0), // Per unit rate
    salesFile.name, // Description
    0 - parseFloat(lineData.discountAmount).toFixed(5),
    terrType + className, // Class
    'Tax',
    1000,
    'GBP',
    1,
  ];
}

function distributionOutput(salesFile, templateName, lineData, className, terrType, config) {
  let distributionFee = lineData.grossAmount;
  distributionFee -= lineData.discountAmount ? lineData.discountAmount : 0;
  distributionFee -= lineData.netAmount;
  return [
    null,
    mapValue(templateName, sourceMappings),
    moment(lineData.saleDate).format('MM/DD/YYYY'),
    'IGNITION',
    'Net 30',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    salesFile.name,
    null,
    null,
    null,
    null,
    null,
    config,
    lineData.units,
    0 - (distributionFee && lineData.units ? distributionFee / lineData.units : 0), // Per unit rate
    salesFile.name, // Description
    0 - parseFloat(distributionFee).toFixed(5),
    terrType + className, // Class
    'Tax',
    1000,
    'GBP',
    1,
  ];
}

function mapValue(value, mappings) {
  if (mappings[value]) {
    return mappings[value];
  }
  return value;
}

// function mapDistributionChannel(value) {
//   const mappings = {};
//   // return mappings[value];
//   return value;
// }

// function mapRelease(value) {
//   const mappings = {};
//   // return mappings[value];
//   return value;
// }

// function mapTrack(value) {
//   const mappings = {};
//   // return mappings[value];
//   return value;
// }

module.exports = ignitionExport;
