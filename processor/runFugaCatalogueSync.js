require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('./models/client');
const fugaCatalogueSync = require('./libs/fuga/fugaCatalogueSync');

// script for running fuga sync
if (process.argv[2]) {
  logger.debug(process.argv[2]);
  Client.findById(process.argv[2])
    .then((client) => {
      logger.info(client.fugaIntegration);
      if (client?.fugaIntegration) {
        fugaCatalogueSync.syncClient({ clientId: client._id });
      } else {
        logger.error('No Client with fugaIntegration was found');
        process.exit(-1);
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit(-1);
    });
} else {
  logger.error('No Client ID passed as an argument');
  process.exit(-1);
}
