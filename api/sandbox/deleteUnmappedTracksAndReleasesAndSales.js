require('../../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const util = require('util');
const async = require('async');
const Client = require('../../models/client');
const UnmappedTrack = require('../../models/unmappedTrack');
const UnmappedRelease = require('../../models/unmappedRelease');
const SalesFile = require('../../models/salesFile');

const border = '==========================';
const removeSalesLines = (client, callback) => {
    const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
    const clientId = client._id.toString();

    async.waterfall([
        (cb) => {
            // Delete any Unmapped Tracks not associated to sales files on this client
            UnmappedTrack.deleteMany({ clientId, salesFileId: '66db5c3f4920e4f44e2a2319'}, cb);
        },
        (deletedTracks, cb) => {
            console.log('UnmappedTrack deleteMany result:', deletedTracks);
            // Delete any Unmapped Release not associated to sales files on this client
            UnmappedRelease.deleteMany({ clientId, salesFileId: '66db5c3f4920e4f44e2a2319' }, cb);
        },
        (res, cb) => {
          console.log('UnmappedReleases deleteMany result:', res);
          // Delete Sales Data not associated to sales files on this client
          bigQuery.deleteData(bigQuery.inputTable, { salesFileId: '66db5c3f4920e4f44e2a2319' }, cb);
        },
      ], (err, res) => {
        if (err) { logger.error(err); }
        if (res) { logger.info('Complete. BQ response:', res); }
        callback();
      });
}


let filter = {};
if (process.argv?.[2]) { filter = { _id: process.argv[2] } }
async.waterfall([
    (cb) => {
        Client.find(filter).sort({ name: 1 }).exec(cb);
    },
    (clients, cb) => {
        async.eachSeries(clients, (client, eachCb) => {
            logger.info(`${border} Checking ${client.name} ${border}`)
            removeSalesLines(client, eachCb);
        })
    },
], (err) => {
    if (err) { logger.err(err); }
    logger.info(`${border} ✅ Sales Line Deletion Complete ✅ ${border}`)
});
