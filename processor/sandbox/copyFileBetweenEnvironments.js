require('dotenv').config();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Suite = require('../libs/support/copyClient/suite')

Suite.multipartCopy({
  sourceKey: 'salesFiles/66ec2fc53e6cc280822e13f4/10M Clean Data.csv',
  destinationKey: 'robert-test/10M Clean Data.csv'
}).then(() => {
  logger.info('Copy complete')
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(1);
});

