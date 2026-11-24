require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const border = '**************'

let nonStringTitles = [];

const checkWorkTitlesAreStrings = (client, mainCallback) => {
  Work.find({
    clientId: client._id,
    alternateTitles: {
      $elemMatch: {
        title: {
          $not: {
            $type: 'string'
          }
        }
      }
    }
  }, 
  { _id: 1, title: 1, alternateTitles: 1 },
  (err, works) => {
    if (err) {
      return mainCallback(err);
    }
    if (works.length > 0) {
      logger.info(`${border} ${works.length} Works with non-string alternative titles found for Client: ${client._id} ${border}`);
      works.forEach(work => {
        work.alternateTitles.forEach(altTitle => {
          if (typeof altTitle.title !== 'string') {
            nonStringTitles.push({
              clientId: client._id,
              clientName: client.name,
              workId: work._id,
              workTitle: work.title,
              alternativeTitle: altTitle.title,
              type: typeof altTitle.title
            });
          };
        });
      });
    }
    mainCallback(null);
  });
}

const createCSV = () => {
  const outputLocation = `${appRootDir}/tmp/checkWorkTitlesAreStrings.csv`;
  const writer = new WriteCsv({ headers: ['CLIENT ID', 'CLIENT NAME', 'WORK ID', 'WORK TITLE', 'ALTERNATIVE TITLE', 'ALTERNATIVE TITLE TYPE'], outputLocation });
  const outputData = nonStringTitles.map(line => [line.clientId, line.clientName, line.workId, line.workTitle, line.alternativeTitle, line.type]);
  writer.addData(outputData, () => {
    writer.write((err, location) => {
      if (err) {
        logger.error(`${border} Error creating CSV: ${err} ${border}`);
        process.exit(1);
      }
      logger.info(`${border} CSV Written: ${location} ${border}`);
      process.exit(0);
    });
  });
}

const runScript = () => {
  Client.find({}, { _id: 1, name: 1 }, (err, clients) => {
    if (err) {
      logger.error(`${border} Error fetching Clients: ${err} ${border}`);
      process.exit(1);
    }
    logger.info(`${border} Checking Works for ${clients.length} Clients ${border}`);
    async.eachLimit(clients, 50, (client, callback) => {
      checkWorkTitlesAreStrings(client, callback);
    }, (err) => {
      if (err) {
        logger.error(`${border} Script completed with errors: ${err} ${border}`);
      } else {
        logger.info(`${border} Script completed successfully ${border}`);
        createCSV();
      }
    });
  });
};

runScript();
