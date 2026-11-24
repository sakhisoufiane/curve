const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const Notification = require('../../../../models/notification');

const sendNotification = ({ identifier, curveUser, client, publicLink, collectionName }) => {
  try {
    const generateOptions = { identifier, curveUser, client, subject: `Your Raw Export for ${client.name} is Ready to Download`, link: publicLink };
    Notification.generate(`${_.capitalize(collectionName)} Raw Export Ready`, `Your ${_.capitalize(collectionName)} Raw Export for ${client.name} is Ready to Download`, publicLink, curveUser, generateOptions, () => { });
  } catch (error) {
    logger.error('Failed to send notification, but export completed successfully:', error);
  }
};

module.exports = sendNotification;
