require('dotenv').config();
require('../../models/db');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const FTPIngestion = require('./ftpIngestion');

const Client = require('../../models/client');
const FTPLogs = require('../../models/ftpLogs');

const devMode = (process.env.environmentName.toLowerCase() === 'development');
const logText = 'SALES-FTP-INITIALISER';

function run() {
  // Find clients with configured active uninitialised FTP ingestion
  const query = {
    $and: [
      { 'salesFtpIngestions.host': { $exists: true } },
      { 'salesFtpIngestions.active': true }, // prevents returning any client with only inactive server configs
      { 'salesFtpIngestions.initialisedDate': undefined }, // prevents returning any client with only initialised servers
    ],
  };

  Client.find(query)
    .then((clients) => {
      if (clients && clients.length > 0) {
        logger.info(`${logText} STARTED : ${clients.length} client${clients.length > 1 ? 's' : ''} need${clients.length > 1 ? '' : 's'} servers initialised`);

        async.eachSeries(clients, (client, clientsCb) => {
          logger.info(`${logText}: ${client._id.toString()} - Running for ${client.name}`);

          const salesFtpIngestions = client.salesFtpIngestions || [];
          let ignoredFiles = [];

          FTPLogs.find({ clientId: client._id, type: 'Sales' })
            .then((ftpLogs) => {
              // Merge the files array of different buckets into one
              if (ftpLogs?.length) { ignoredFiles = ftpLogs.map((log) => log.files).flat(1); }

              // filter down to initialise only servers which have a host set, are active and uninitialised
              async.eachSeries(salesFtpIngestions, (server, serverCb) => {
                if (server.active && server.host && !server.initialisedDate) {
                  const timerString = `${client._id} - ${client.name} - ${server.host}`;
                  console.time(timerString);
                  FTPIngestion.ingest(server, client._id, ignoredFiles, logText, client.name, (ftpIngestionError) => {
                    console.timeEnd(timerString);
                    if (ftpIngestionError) {
                      // logger.error({ftpIngestionError});
                      logger.error(`${logText}: ${client._id.toString()} - ${client.name} - ${ftpIngestionError}`);
                    }
                    serverCb();
                  });
                } else {
                  setImmediate(serverCb);
                }
              }, () => {
                logger.info(`${logText}: ${client._id.toString()} - Completed ${client.name} - `);
                clientsCb();
              });
            })
            .catch((err) => {
              logger.error(`${logText}: ${client._id.toString()} - ${client.name} - ${err}`);
              clientsCb();
            });
        }, () => {
          logger.info(`${logText} COMPLETE`);
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
  setInterval(run, 1000 * 60 * 30);// 30 minutes
}
