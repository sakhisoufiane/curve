require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('./models/client');

const clientsWithFilterDisabled = [
  '602d04d0e2cf9900151cc226', // Signum
  '61e1652e2a825904a9e1ec89', // Contagious
  '61e69f79b1e9d1001fca7af5', // Future House Cloud GmbH
  '61e6ac351169050592872159', // UMG Neighbouring Rights
  '61e6ef7e7051ff081959d409', // Spitfire Audio
  '61e70b5c9ff4560026f677d5', // Netflix
  '61e7d98c24b44500266a5587', // Virgin Germany
  '61e80c268d2ef8001f7b600d', // Nmbrs
  '61e811ca334efe00209b32c5', // Raff (Test)
];

Client.updateMany({ _id: { $nin: clientsWithFilterDisabled } }, { $set: { allowPeriodFilters: true } })
  .then((res) => {
    if (res) {
      logger.info(res);
    }
    process.exit();
  })
  .catch((err) => {
    logger.error(err);
    process.exit();
  });
