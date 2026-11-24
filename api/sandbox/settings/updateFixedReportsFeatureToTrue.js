/* 
* Description: Finds Clients by names given in xlsx format and then switches fixedReports feature to true
* Time to run: 4 seconds
* Ticket No: SUP-569
* Category: Clients, Fixed Reports, Features
* Author: Joe Osborne
*/
require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit } = require('async');
const appRootDir = require('app-root-dir').get();
const ImportXlsx = require('../libs/importXlsx');

const filePath = '/Users/joeosborne/Downloads/mrc clients.xlsx';
const Client = require('../models/client');
const WriteCsv = require('../libs/writeCsv');

const border = '**************';
const log = (message) => {
  logger.info(`${border}${message}${border}`);
};
const logErr = (message) => {
  logger.error(`${border}ERROR: ${message}${border}`);
};

const updateFixedReportsFeatureToTrue = (file) => {
  const errorUpdatingClients = [];
  const updatedClients = [];
  const clientsConfig = [{ key: 'clientName' }];

  ImportXlsx.getDataByTemplate(file, clientsConfig, 0, 0, new Date(), async (err, importedClients) => {
    if (err) {
      logErr(`${err}`);
    }
    const importedClientsArr = importedClients.map((client) => client.clientName);
    const foundClients = await Client.find({ name: { $in: importedClientsArr } }, '_id');
    const foundClientNames = foundClients.map((client) => client.name);
    const clientsNotFoundByName = importedClientsArr.filter((clientName) => !foundClientNames.includes(clientName));

    log(`Found ${foundClients.length} Clients from ${importedClientsArr.length} imported Clients`);

    await eachLimit(foundClients, 5, async (foundClient) => {
      const update = { $set: { 'features.fixedReports': true } };
      const options = { timestamp: false };
      const updatedClient = await Client.findByIdAndUpdate(foundClient._id, update, options);
      if (!updatedClient) {
        errorUpdatingClients.push(foundClient._id.toString());
      } else {
        updatedClients.push(updatedClient._id.toString());
      }
    });

    log(`Could not find ${clientsNotFoundByName.length} Clients by name`);
    log(`Error updating ${errorUpdatingClients.length} Clients`);
    log(`Updated ${updatedClients.length} Clients`);

    const csvWrites = [
      writeCSV(clientsNotFoundByName, 'clientsNotFoundByName'),
      writeCSV(errorUpdatingClients, 'errorUpdatingClients'),
      writeCSV(updatedClients, 'updatedClients'),
    ];

    Promise.all(csvWrites)
      .then(() => {
        log('All CSVs written.');
        process.exit(0);
      })
      .catch((err) => {
        logErr(`${err}`);
        process.exit(1);
      });
  });

  const writeCSV = (data, fileName) => new Promise((resolve, reject) => {
    if (data.length > 0) {
      const outputLocation = `${appRootDir}/tmp/${fileName}.csv`;
      const writer = new WriteCsv({
        headers: ['CLIENT'],
        outputLocation,
      });
      const outputData = data.map((line) => [line]);
      writer.addData(outputData, (err) => {
        if (err) {
          logErr(`${err}`);
        }
        writer.write((err, location) => {
          if (err) {
            logErr(`${err}`);
            reject(err);
          } else {
            log(`${fileName} written to: ${location}`);
            resolve();
          }
        });
      });
    } else {
      resolve();
    }
  });
};

updateFixedReportsFeatureToTrue(filePath);
