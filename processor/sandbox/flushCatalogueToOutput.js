require('../models/db');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../models/client');

const periodId = '5ecf588e83e16b7f4eac44f2';

let count = 0;
let writtenCount = 0;

Client.findById('5cdec3a5d3853e3de5c3edec', (err, client) => {
  // Setup BigQuery connection
  const bigQuery = new BigQuery({
    datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
  });
  // Get catalogue for writing
  const options = { joinArraysToString: true };
  client.catalogueOverwritingData(options, (err, catalogueData) => {
    // Get query for period data
    const query = bigQuery.getDataQuery(bigQuery.outputTable, '*', { periodId }, {});
    logger.info(query);

    // Set up file
    bigQuery.setupFile(() => {
      bigQuery.client.createQueryStream(query)
        .on('error', (err) => {
          logger.error(err);
        })
        .on('data', (row) => {
        // Check suppress zero value to suppressing values
          count += 1;
          // Overwrite data from catalogue
          row = setCatalogueData(catalogueData, row);
          // Set any dates to standard string
          if (row.saleDate) {
            row.saleDate = row.saleDate.value;
          }
          if (row.transactionDate) {
            row.transactionDate = row.transactionDate.value;
          }
          // Log out every 100k lines
          if (count % 100000 === 0) {
            logger.info(row);
            logger.info(count);
          }
          bigQuery.writeToFile([row], bigQuery.outputTable, () => {
            writtenCount += 1;
          });
        })
        .on('end', () => {
          writeData();
        });
    });
  });

  function writeData() {
    if (writtenCount == count) {
      logger.info('Write Count Matches Count:', count);
      // Remove data from DB
      logger.info(bigQuery.fileLocation);
    // bigQuery.deleteData(bigQuery.outputTable, { periodId: periodId }, function(err) {
      /// / Write file to DB
      // bigQuery.writeFileToDb(bigQuery.outputTable, function(err) {
      // if(err) {
      // logger.error(err);
      // }
      // logger.info("Complete");
      // });
    // });
    } else {
      logger.info('Write Count Does Not Match Count:', writtenCount, count);
      setTimeout(writeData, 2000);
    }
  }

  function setCatalogueData(catalogueData, salesLine) {
    // Check if salesLine exists
    if (salesLine) {
      // Check if salesLine has releaseId
      if (salesLine.releaseId && catalogueData && catalogueData.releases) {
        // Get release from catalogue data
        const releaseData = catalogueData.releases[salesLine.releaseId];
        // If release exists in data, update values
        if (releaseData) {
          Object.keys(releaseData).forEach((key) => {
            salesLine[key] = releaseData[key];
          });
        }
      }
      // Check if salesLine has trackId
      if (salesLine.trackId && catalogueData && catalogueData.tracks) {
        // Get release from catalogue data
        const trackData = catalogueData.tracks[salesLine.trackId];
        // If release exists in data, update values
        if (trackData) {
          Object.keys(trackData).forEach((key) => {
            salesLine[key] = trackData[key];
          });
        }
      }
      // Check if salesLine has workId
      if (salesLine.workId && catalogueData && catalogueData.works) {
        // Get release from catalogue data
        const workData = catalogueData.works[salesLine.workId];
        // If release exists in data, update values
        if (workData) {
          Object.keys(workData).forEach((key) => {
            salesLine[key] = workData[key];
          });
        }
      }
      return salesLine;
    }
    // Return original value
    return salesLine;
  }
});
