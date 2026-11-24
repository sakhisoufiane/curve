require("../models/db");
const ImportXlsx = require("../libs/importXlsx");
const filePath = "/Users/joeosborne/Downloads/Pandora Configuration Check 20230731 20230803154143269.xlsx";
const { logger, BigQuery } = require("@curveroyaltysystems/platform-shared-utils");
const Client = require("../models/client");
const clientId = "5dd41401956f537fd8a0e91c";
const border = "==========================";
const date = new Date();
let outstandingOps = 0;
const template = [
  { key: "salesFileID" },
  { key: "currentConfiguration" },
  { key: "originalConfiguration" },
  { key: "newConfiguration" },
];

const updateSalesFilesConfigs = (client, importedData) => {
  const bigQuery = new BigQuery({
    datasetName: client.bigQueryDataset,
    inputTable: client.bigQuerySalesTable,
    outputTable: client.bigQueryPeriodSales,
  });

  // Group importedData by newConfiguration.
  const groupedData = groupByNewConfiguration(importedData);

  for (let newConfiguration in groupedData) {
    if (newConfiguration !== 'Radio') { // filter configs already set to Radio
      outstandingOps++;
      
      // Get salesFileIds and currentConfigurations for this group.
      let salesFileIds = groupedData[newConfiguration].map((row) => row.salesFileID);
      let currentConfigurations = groupedData[newConfiguration].map((row) => row.currentConfiguration);

      logger.info(`${border} UPDATING ${salesFileIds.length} SALES FILES TO ${newConfiguration} ${border}`);
    
      let filter = {
        salesFileId: { $in: salesFileIds },
        configuration: { $in: currentConfigurations },
      };
      let update = { configuration: newConfiguration };
  
      // Perform the update for this group.
      bigQuery.updateData(bigQuery.inputTable, filter, update, (err, res) => {
        if (err) {
          logger.error(`${border} ERROR UPDATING DATA: ${err} ${border}`);
        } else {
          logger.info(`${border} UPDATED ${salesFileIds.length} SALES FILES CONFIGURATIONS TO ${newConfiguration} ${border}`);
          outstandingOps--;
          if (outstandingOps === 0) {
            process.exit(0);
          }
        }
      });
    }
  } 
};

function groupByNewConfiguration(data) {
  let groupedData = {};
  for (const row of data) {
    if (!groupedData[row.newConfiguration]) {
      // If this newConfiguration hasn't been seen yet, start a new array for it.
      groupedData[row.newConfiguration] = [row];
    } else {
      // If this newConfiguration has been seen before, add this row to its array.
      groupedData[row.newConfiguration].push(row);
    }
  }
  return groupedData;
}

(async () => {
  const client = await Client.findById(clientId);
  ImportXlsx.getDataByTemplate(filePath, template, 0, 1, date, (err, importedData) => {
    if (err) {
      logger.error(`${border} ERROR GETTING DATA FROM EXCEL FILE: ${err} ${border}`);
    } else {
      updateSalesFilesConfigs(client, importedData);
    }
  });
})();
