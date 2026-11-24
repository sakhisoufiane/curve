require('dotenv').config();
require('../../models/db');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const FTPIngestion = require('./ftpIngestion');
const Client = require('../../models/client');
const ClientFTPLog = require('../../models/clientFTPLog');

const devMode = (process.env.environmentName.toLowerCase() === 'development');
const logText = 'SALES-FTP-INITIALISER';

function run() {
  // Find clients with configured active uninitialised FTP ingestion
  const query = {
    _id: '61e80c268d2ef8001f7b600d',
    $and: [
      { 'salesFtpIngestions.host': { $exists: true } },
      // { 'salesFtpIngestions.active': true }, // prevents returning any client with only inactive server configs
      { 'salesFtpIngestions.initialisedDate': undefined }, // prevents returning any client with only initialised servers
    ],
  };

  Client.find(query)
    .then((clients) => {
      if (clients && clients.length > 0) {
        logger.info(`${logText} STARTED : ${clients.length} client${clients.length > 1 ? 's' : ''} need${clients.length > 1 ? '' : 's'} servers initialised`);

        async.eachSeries(clients, (client, clientsCb) => {
          logger.info(`${logText}: Running for ${client.name} - ${client._id.toString()}`);

          const salesFtpIngestions = client.salesFtpIngestions || [];
          let ignoredFiles = [];

          ClientFTPLog.findOne({ clientId: client._id })
            .then((clientFTPLog) => {
              if (clientFTPLog) {
                ignoredFiles = clientFTPLog.ignoredFiles || [];
              }

              // filter down to initialise only servers which have a host set, are active and uninitialised
              async.eachSeries(salesFtpIngestions, (server, serverCb) => {
                logger.debug({ server });
                if (server.host && !server.initialisedDate) {
                  // const timerString = `${client._id} - ${client.name} - ${server.host}`;
                  // console.time(timerString);
                  // FTPIngestion.ingest(server, client._id, ignoredFiles, logText, (err) => {
                  //   console.timeEnd(timerString);
                  //   serverCb(err);
                  // });
                  logger.debug('ingest...');
                  setImmediate(serverCb);
                } else {
                  logger.debug('skip...');
                  setImmediate(serverCb);
                }
              }, (ftpIngestionError) => {
                if (ftpIngestionError) {
                  logger.error(ftpIngestionError);
                }
                logger.info(`${logText}: Completed ${client.name} - ${client._id.toString()}`);
                clientsCb();
              });
            })
            .catch((err) => {
              logger.error(err);
              clientsCb();
            });
        }, (err) => {
          if (err) {
            logger.error(err);
          } else {
            logger.info(`${logText} COMPLETE`);
          }
          if (devMode) {
            process.exit(0);
          }
        });
      } else {
        logger.info(`${logText} COMPLETE -  Nothing to do`);
        if (devMode) {
          process.exit(0);
        }
      }
    })
    .catch((err) => {
      logger.error(err);
    });
}

if (devMode) {
  run();
} else {
  // run(); don't run on initial load
  setInterval(run, 1000 * 60 * 10);// 10 minutes
}
