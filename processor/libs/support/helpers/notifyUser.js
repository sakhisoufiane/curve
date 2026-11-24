const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Notification = require('../../../models/notification');

const notifyUser = (name, description, link, options) => {
  Notification.generate(name, description, link, options, (notificationErr, result) => {
    if (notificationErr) {
      logger.error(notificationErr);
    } else {
      logger.debug(`Notification generated - ${result}`);
    }
  });
};

module.exports = { notifyUser };
