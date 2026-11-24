const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { updateCopyToCatalogueClients, preSaveLogic } = require('../../controllers/track');
const Track = require('../../models/track');

const trackPostSaveActions = async ({ track, inheritanceClients }) => {
  updateCopyToCatalogueClients({ track, clients: inheritanceClients }, (err) => {
    if (err) {
      logger.error('Copying track across catalogues error:');
      logger.error(err);
    }
  });
};

const trackPreSaveActions = async ({ track, client, durationChanged }) => {
  const next = async (value) => {
    if (value) {
      logger.error(value);
    } else {
      await Track.findByIdAndUpdate(track._id, { $set: { ...track } });
    }
  };

  preSaveLogic({ next, track, client, durationChanged });
};

module.exports = {
  trackPostSaveActions,
  trackPreSaveActions,
};
