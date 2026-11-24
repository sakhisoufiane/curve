require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const User = require('../../models/user');

const run = async () => {
  const user = await User.findById('6a761edafca7b661fbfa1d9c');
  user.setApiKeys();
  await user.save();
};


run()
    .then(() => {
      logger.info('Complete');
      process.exit(0);
    })
    .catch((e) => {
      logger.error(e);
      process.exit(1);
    });
