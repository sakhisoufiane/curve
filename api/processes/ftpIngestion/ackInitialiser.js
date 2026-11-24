require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachSeries } = require('async');
const cron = require('node-cron');
const ACKIngestion = require('./ackIngestion');
const Client = require('../../models/client');

const devMode = (process.env.environmentName.toLowerCase() === 'development');
const logText = 'ACK-FTP-INITIALISER';

const run = async () => {
  // Find clients with configured active uninitialised FTP ingestion
  const query = {
    ackFtpIngestions: {
      $elemMatch: {
        host: { $exists: true },
        active: true, // prevents returning any client with only inactive server configs
        initialisedDate: { $exists: false }, // prevents returning any client with only initialised servers
      },
    },
  };

  const clients = await Client.find(query);

  if (!clients?.length) {
    logger.info(`${logText} COMPLETE -  Nothing to do`);
    if (devMode) { process.exit(0); }
  }

  logger.info(`${logText} STARTED : ${clients.length} client${clients.length > 1 ? 's' : ''} need${clients.length > 1 ? '' : 's'} servers initialised`);

  await eachSeries(clients, async (client) => {
    logger.info(`${logText}: ${client._id.toString()} - Running for ${client.name}`);

    const ackFtpIngestions = client.ackFtpIngestions || [];

    await eachSeries(ackFtpIngestions, async (server) => {
      // filter down to initialise only servers which have a host set, are active and uninitialised
      if (server.active && server.host && !server.initialisedDate) {
        const timerString = `${client._id} - ${client.name} - ${server.host}`;

        console.time(timerString);
        await ACKIngestion.ingest({ server, client, logText }).catch((error) => {
          logger.error(`${logText}: ${client._id.toString()} - ${client.name} - ${error}`);
        });
        console.timeEnd(timerString);
      }
    });

    logger.info(`${logText}: ${client._id.toString()} - Completed ${client.name} - `);
  });

  logger.info(`${logText} COMPLETE`);
  if (devMode) { process.exit(0); }
};

if (devMode) {
  run();
} else {
  // run(); don't run on initial load
  // Every 30 minutes, should be 10 minutes
  cron.schedule('*/30 * * * *', () => {
    run();
  });
}
