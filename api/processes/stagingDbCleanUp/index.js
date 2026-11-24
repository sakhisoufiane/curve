const { logger, crossEnvironmentConfig } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const deleteClients = require('../deleteClients');

const cleanUpStagingDb = async () => {
  // Read staging env config
  const { stagingUri, stagingS3Config } = crossEnvironmentConfig;
  // Create expiration date
  const expirationDate = moment().startOf('day').subtract(2, 'days').format();
  const logText = 'StagingClientCleanupProcesses';
  // Find any clients with copiedAt date set to before current expirationDate date
  const filter = {
    $and: [
      { copiedAt: { $exists: true } },
      { copiedAt: { $lte: expirationDate } },
    ],
  };

  logger.info(`${logText}: deleteClients running | expirationDate : ${expirationDate}`);

  await deleteClients(stagingUri, filter, logText, stagingS3Config).catch((err) => {
    if (err) {
      logger.error(`${logText}: Staging DB clean up failed`, err);
    } else {
      logger.info(`${logText}: Staging DB clean up complete`);
    }
  });
};

module.exports = cleanUpStagingDb;
