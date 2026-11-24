require('../../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const util = require('util');
const async = require('async');
const Client = require('../../models/client');
const UnmappedWork = require('../../models/unmappedWork');
const SalesFile = require('../../models/salesFile');

const border = '==========================';

const removeSalesLines = (client, callback) => {
    let salesFileIds;
    const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
    const clientId = client._id.toString();

    async.waterfall([
        (cb) => {
            SalesFile.find({ clientId: client._id.toString() }, '_id', cb);
        },
        (salesFiles, cb) => {
          if (salesFiles) {
            salesFileIds = salesFiles.map((salesFile) => salesFile._id.toString());
            // Delete any Unmapped Works not associated to sales files on this client
            UnmappedWork.deleteMany({ clientId, salesFileId: { $nin: salesFileIds } }, cb);
          } else {
            cb('no sales files found');
          }
        },
        (res, cb) => {
          console.log('UnmappedWork deleteMany result:', res);
          // Delete Sales Data not associated to sales files on this client
          bigQuery.deleteData(bigQuery.inputTable, { salesFileId: { $nin: salesFileIds } }, cb);
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
