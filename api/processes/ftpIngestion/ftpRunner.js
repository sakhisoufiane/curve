require('dotenv').config();
require('../../models/db');
const async = require('async');
const cron = require('node-cron');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const FTPIngestion = require('./ftpIngestion');

const Client = require('../../models/client');
const FTPLogs = require('../../models/ftpLogs');

const devMode = (process.env.environmentName.toLowerCase() === 'development');

const run = async (clientId, serverName, hasInitialisedDate = true) => {
  const logText = hasInitialisedDate ? 'SALES-FTP-INGESTION' : 'SALES-FTP-INITIALISER';
  try {
    // Find clients with configured active initialised FTP ingestion
    const query = {
      'salesFtpIngestions.host': { $exists: true },
      'salesFtpIngestions.active': true,
      'salesFtpIngestions.initialisedDate': { $exists: hasInitialisedDate },
    };

    if (clientId) {
      query._id = clientId;
      query['salesFtpIngestions.name'] = serverName;
    }

    const clients = await Client.find(query);

    if (!clients || !clients.length) return logger.info(`${logText} COMPLETE -  No Clients Configured`);

    logger.info(`${logText}: STARTED : ${clients.length} clients configured`);

    await async.eachSeries(clients, async (client) => {
      logger.info(`${logText}: ${client.name} (${client._id.toString()}) - Running`);
      // eslint-disable-next-line max-len
      logger.info(`${logText}: ${client.name} (${client._id.toString()}) - ${client.name} ${client.clientType} ${client.salesFtpIngestions[0].host} ${client.salesFtpIngestions[0].dsp} ${client.salesFtpIngestions[0].directory} ${client.salesFtpIngestions[0].port} ${client.salesFtpIngestions[0].active} ${client.salesFtpIngestions[0].initialisedDate} ${client.salesFtpIngestions[0].lastSuccessfulCheck}`);

      logger.info(`${logText}: ${client._id.toString()} - Running for ${client.name}`);

      const salesFtpIngestions = client.salesFtpIngestions?.filter((ingestion) => !serverName || ingestion.name === serverName) || [];
      let ignoredFiles = [];

      const ftpLogs = await FTPLogs.find({ clientId: client._id, type: 'Sales' });
      // Merge the files array of different buckets into one
      if (ftpLogs?.length) { ignoredFiles = ftpLogs.map((log) => log.files).flat(1); }

      // filter down to initialise only servers which have a host set, are active and initialised
      await async.eachSeries(salesFtpIngestions, async (server) => {
        if (!server.active || !server.host || (!!server.initialisedDate !== hasInitialisedDate)) { return; }
        const timerString = `Info: ${logText}: ${client.name} (${client.id}) - ${server.name} - ${server.host}`;
        console.time(timerString);
        await new Promise((resolve) => {
          FTPIngestion.ingest(server, client._id, ignoredFiles, logText, client.name, (ftpIngestionError) => {
            console.timeEnd(timerString);
            if (ftpIngestionError) {
              logger.error(`${logText}: ${client.name} (${client._id.toString()}) - ${client.name} - ${ftpIngestionError}`);
            }
            resolve();
          });
        });
      });

      logger.info(`${logText}: ${client.name} (${client._id.toString()}) - Completed ${client.name}`);
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
    // Run daily at 4am
    cron.schedule('0 4 * * *', () => {
      run();
    });
  }
}

module.exports = run;
