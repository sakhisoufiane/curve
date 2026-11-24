require('../models/db');
const async = require('async');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../models/client');
const mapper = require('../libs/salesIngestion/mapper');

// 167472834

Client.findById('5d07759340fd0951e9f622bf', (err, client) => {
  const options = { joinArraysToString: true };
  client.catalogueOverwritingData(options, (err, catalogue) => {
    const bigQuery = new BigQuery({
      datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
    });
    bigQuery.setupFile(() => {
      const output = [];
      async.waterfall([
        function (cb) {
          const query = "SELECT * FROM `curve-1578825897852.DominoRecordingCoProduction.DominoRecordingCoProductionSales2` WHERE trackId IS NOT NULL AND catalogueTrackArtist IS NULL AND catType = 'Track'";
          bigQuery.logQuery(bigQuery.inputTable, query, 'Fix');
          let queryCount = 0;
          bigQuery.client.createQueryStream(query)
            .on('error', (err) => {
            // Handle Errors
              console.error(err);
            })
            .on('data', (line) => {
            // Log out every 10k
              queryCount += 1;
              if (queryCount % 1000 == 0) {
                console.log(queryCount);
              }
              const mappedLine = mapper.setCatalogueData(line, catalogue, {});
              if (mappedLine.saleDate) {
                mappedLine.saleDate = mappedLine.saleDate.value;
              }
              if (mappedLine.transactionDate) {
                mappedLine.transactionDate = mappedLine.transactionDate.value;
              }
              delete mappedLine.releaseSpecificForeignIds;
              output.push(mappedLine);
            })
            .on('end', () => {
              console.log('Query Ended:', queryCount);
              console.log('Output:', output.length);
              cb();
            });
        },
        function (cb) {
          // Write Output to File
          bigQuery.writeToFile(output, bigQuery.inputTable, (err) => {
            cb(err);
          });
        },
        function (cb) {
          // Delete Previous Data
          bigQuery.query("DELETE FROM `curve-1578825897852.DominoRecordingCoProduction.DominoRecordingCoProductionSales2` WHERE trackId IS NOT NULL AND catalogueTrackArtist IS NULL AND catType = 'Track'", (err, res) => {
            console.log(res);
            cb(err);
          });
        },
        function (cb) {
          // Write to DB
          bigQuery.writeFileToDb(bigQuery.inputTable, (err, res) => {
            console.log(res);
            cb();
          });
        },
      ], (err) => {
        console.log(err);
        console.log('Complete');
      });
    });
  });
});
