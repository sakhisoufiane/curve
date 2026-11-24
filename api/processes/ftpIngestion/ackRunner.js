require('dotenv').config();
require('../../models/db');
const { eachSeries } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const cron = require('node-cron');
const ACKIngestion = require('./ackIngestion');
const Client = require('../../models/client');

const devMode = (process.env.environmentName.toLowerCase() === 'development');

const run = async (clientId, serverName, hasInitialisedDate = true) => {
  const logText = hasInitialisedDate ? 'ACK-FTP-INGESTION' : 'ACK-FTP-INITIALISER';
  try {
    // Find clients with configured active initialised FTP ingestion
    const query = {
      'ackFtpIngestions.host': { $exists: true },
      'ackFtpIngestions.active': true,
      'ackFtpIngestions.initialisedDate': { $exists: hasInitialisedDate },
    };

    if (clientId) {
      query._id = clientId;
      query['ackFtpIngestions.name'] = serverName;
    }

    const clients = await Client.find(query);

    if (!clients?.length) return logger.info(`${logText} COMPLETE -  No Clients Configured`);

    logger.info(`${logText}: STARTED : ${clients.length} clients configured`);

    await eachSeries(clients, async (client) => {
      logger.info(`${logText}: ${client._id.toString()} - Running for ${client.name}`);

      const ackFtpIngestions = client.ackFtpIngestions?.filter((ingestion) => !serverName || ingestion.name === serverName) || [];
      // filter down to initialise only servers which have a host set, are active and initialised
      await eachSeries(ackFtpIngestions, async (server) => {
        if (!server.active || !server.host || (!!server.initialisedDate !== hasInitialisedDate)) { return; }
        const timerString = `${client._id} - ${client.name} - ${server.host}`;

        console.time(timerString);
        await ACKIngestion.ingest({ server, client, logText }).catch((error) => {
          logger.error(`${logText}: ${client._id.toString()} - ${client.name} - ${error}`);
        });
        console.timeEnd(timerString);

        logger.info(`${logText}: ${client._id.toString()} - Completed ${client.name} - `);
      });
    });
  } catch (error) {
    logger.error(error);
  } finally {
    logger.info(`${logText}: COMPLETE`);
    if (devMode && !clientId && !serverName) {
      process.exit(0);
    }
  }
};

if (require.main === module) {
  if (devMode) {
    run();
  } else {
  // run(); don't run on initial load
  // Run daily at 5am
    cron.schedule('0 5 * * *', () => {
      run();
    });
  }
}

module.exports = run;
