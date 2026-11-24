require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');

const createScheduledQueries = async () => {
  logger.info('BQBackup Runner: Started');
  const clients = await Client.find({createdBigQueryBackups: { $ne: true } });
  logger.debug(`BQBackup Runner: Found ${clients.length} clients.`)
  for (const client of clients) {
    logger.info(`BQBackup Runner: ${clients.indexOf(client) + 1}/${clients.length} Creating backups for: ${client.name}`)
    await client.save().catch((e) => logger.error(e)); // !! no error handling - Biscayne Recording - BU dataset created - Scheduled queries created but client not saved due to ftp vslidation failing
  }
}

createScheduledQueries()
.then(() => logger.info('BQBackup Runner: Queries created'))
.catch((e) => logger.error(e));