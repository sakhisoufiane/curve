const async = require('async');
require('dotenv').config();
require('../models/db');
const CwrDelivery = require('../models/cwrDelivery');
const Import = require('../models/import');
const Client = require('../models/client');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const border = '***************';

cwrImportsAfterSpecifiedDate = () => {
  const importsForReport = [];
  const afterDate = new Date('2023-08-06');

  Client.find({ clientType: 'Publisher' }, (err, publishingClients) => {
    if (err) {
      return logger.error(`${border} Error fetching clients: ${err} ${border}`);
    }

    logger.info(`${border} Retrieved ${publishingClients.length} Publishing Clients ${border}`);

    async.eachLimit(publishingClients, 50, (client, cb) => {
      Import.find({
        clientId: client._id,
        transferringSystem: 'CWR',
        createdAt: { $gt: afterDate },
      }, (err, importsAfterDate) => {
        if (err) {
          logger.error(`${border} Error processing client: ${client._id}. Error: ${err} ${border}`);
          return cb(); 
        }
        if (importsAfterDate && importsAfterDate.length) {
          logger.info(`${border} Found ${importsAfterDate.length} CWR Imports created after ${afterDate} for Client: ${client._id} ${border}`);
          importsAfterDate.forEach((singleImport) => {
            importsForReport.push(singleImport);
          });
        }
        cb();
      });
    }, () => {
      const outputLocation = `${appRootDir}/tmp/cwrImportsAfterSpecifiedDate.csv`;
      const writer = new WriteCsv({
        headers: ['CLIENT ID', 'IMPORT ID', 'IMPORTED DATE'],
        outputLocation,
      });
      const outputData = importsForReport.map((line) => [
        line.clientId,
        line._id.toString(),
        line.createdAt,
      ]);
      
      writer.addData(outputData, () => {
        writer.write((err, location) => {
          if (err) {
            logger.error(`${border} Error Writing to CSV Clients: ${err} ${border}`);
            return;
          }
          logger.info(`${border} Report created: ${location} ${border}`);
          process.exit(-1);
        });
      });
    });
  });
}

cwrImportsAfterSpecifiedDate();
