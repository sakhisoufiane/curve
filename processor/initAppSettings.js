require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const AppSettings = require('./models/appSettings');

const appSetting = new AppSettings({
  overrideAlwaysRunFull: false,
});

appSetting.save()
  .then((settings) => {
    logger.debug(settings);
    process.exit(0);
  })
  .catch((err) => {
    logger.error(err);
    process.exit(0);
  });
