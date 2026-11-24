const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const async = require('async');
const CollectData = require('./collectData');
const CollectDataNoAggregation = require('./collectDataNoAggregation');
const CollectDataAggregationMongo = require('./collectDataAggregationMongo');
const WriteCsv = require('./writeCsvObject');
const CollectDataMongo = require('./collectDataMongo');

module.exports = function (event, callback) {
  /*
  event = {
        databaseTable: "someSales",
        filter: { periodId: "123", contractId: "453" },
        template: [{ field: "title", header: "Title" }, { field: "releaseArtist", header: "Release Artist" }],
        s3WriteKey: "somewhere/on/s3",
        s3AccessKey: "123456",
        s3SecretKey: "54321",
        s3Region: "region",
        s3Bucket: "some-bucket",
        data: optional array of data to be used instead of querying BigQuery
        mappingData: Object containing mapping data for client
  }
*/

  const min = 100000;
  const max = 999999;
  const uniqueIdentifier = Math.floor(Math.random() * (max - min + 1)) + min;

  // Set up CSV Writer
  const outputLocation = `${appRootDir}/tmp/${uniqueIdentifier}-${event.s3WriteKey.split('/').pop()}`;
  const headers = event.template.map((e) => e.header);

  const writerConfig = { headers, outputLocation };
  if (event.format === 'EU Decimal Comma') { writerConfig.separator = ';'; }

  const writeCsv = new WriteCsv(writerConfig);

  // Prepare Data
  logger.debug('Collecting Data');

  // Select either no aggregation or default to aggregation for collecting data
  logger.debug('No Consolidation:', event.noConsolidation);

  // Default Use BigQuery
  let collectDataLib = event.noConsolidation ? CollectDataNoAggregation : CollectData;
  let database = event.bigQuery;
  // Set to MongoDB if costs table
  if (event.databaseTable === 'costs') {
    collectDataLib = event.noConsolidation ? CollectDataMongo : CollectDataAggregationMongo;
    database = event.db.collection('costs');
  }

  // If no filter, set to true
  if (!event.filter || (!Array.isArray(event.filter) && Object.keys(event.filter).length === 0)) { event.filter = 'true'; }

  async.waterfall([
    function (waterfallCb) {
      if (event.data) {
        const formattedData = [];
        event.data.forEach((line) => {
          const formattedLine = [];

          if (Array.isArray(line)) {
            line.forEach((cell) => {
              if (typeof cell === 'number' && event.format === 'EU Decimal Comma') {
                formattedLine.push(utils.convertToEUFormat(cell));
              } else {
                formattedLine.push(cell);
              }
            });
          }

          formattedData.push(formattedLine);
        });

        event.data = formattedData;

        // Check if suppress zero values is on
        if (event.suppressZeroValue) {
          // Get index of output column
          let index;
          event.template.forEach((column, i) => {
            if (column.field === 'contractCurrencyCalculationOutput') {
              index = i;
            }
          });
          // Loop through data and remove and 0 values
          event.data = event.data.map((line) => {
            if (line[index]) {
              return line;
            }
          }).filter(Boolean);
          // Add data to CSV
          writeCsv.addData(event.data, waterfallCb);
        } else {
          // Add data to CSV
          writeCsv.addData(event.data, waterfallCb);
        }
      } else if (event.joinedSalesData) {
        getJoinedSalesData(collectDataLib, database, event.filter, event.template, event.salesInputColumns, event.salesOutputColumns, event.contractIds, event.excludedContractIds, writeCsv, event.format, event.logKey, waterfallCb);
      } else {
        collectDataLib.getData(database, event.databaseTable, event.filter, event.template, event.sort, event.suppressZeroValue, writeCsv, event.mappingData, event.format, event.logKey, (err, result) => {
          waterfallCb(err);
        });
      }
    },
    function (waterfallCb) {
      if (event.totalsRow) {
        if (event.suppressZeroValue) {
          event.filter.contractCurrencyCalculationOutput = { $ne: 0 };
        }
        collectDataLib.getTotals(database, event.databaseTable, event.filter, event.template, event.sort, writeCsv, event.format, (err) => {
          waterfallCb(err);
        });
      } else {
        waterfallCb();
      }
    },
  ], (err) => {
    if (err) {
      logger.error(err);
      callback(err);
    } else {
      writeCsv.write((err, fileLocation) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else {
          fileManager.uploadToS3(event.s3WriteKey, outputLocation, (err, response) => {
            if (fs.existsSync(outputLocation)) {
              fs.unlink(outputLocation, (err) => {
                logger.debug(`File deleted: ${outputLocation}`);
                callback(err, event.s3WriteKey);
              });
            } else {
              callback(err, event.s3WriteKey);
            }
          });
        }
      });
    }
  });
};

function getJoinedSalesData(collectDataLib, database, filter, template, salesInputColumns, salesOutputColumns, contractIds, excludedContractIds, writeCsv, format, logKey, callback) {
  if (Array.isArray(filter)) {
    async.eachSeries(filter, (singleFilter, cb) => {
      collectDataLib.getJoinedSalesData(database, singleFilter, template, salesInputColumns, salesOutputColumns, contractIds, excludedContractIds, writeCsv, format, logKey, cb);
    }, callback);
  } else {
    collectDataLib.getJoinedSalesData(database, filter, template, salesInputColumns, salesOutputColumns, contractIds, excludedContractIds, writeCsv, format, logKey, (err) => {
      callback(err);
    });
  }
}
