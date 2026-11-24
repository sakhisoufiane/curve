require('../models/db');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Contract = require('../models/contract');

Contract.findById('609c75718ccc410015823587', (err, contract) => {
  contract.catalogueOverwritingData((err, data) => {
    logger.info(`Releases: ${Object.keys(data.releases).length}`);
    logger.info(`Tracks: ${Object.keys(data.tracks).length}`);
    logger.info(`Works: ${Object.keys(data.works).length}`);
  });
});