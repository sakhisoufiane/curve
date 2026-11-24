const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { updateCopyToCatalogueClients, preSaveLogic } = require('../../controllers/release');
const Release = require('../../models/release');

const releasePostSaveActions = async ({ release, inheritanceClients }) => {
  updateCopyToCatalogueClients({ release, clients: inheritanceClients }, (err) => {
    if (err) {
      logger.error('Copying release across catalogues error:');
      logger.error(err);
    }
  });
};

const releasePreSaveActions = async ({ release, client, updateRunFugaSync }) => {
  const next = async (value) => {
    if (value) {
      logger.error(value);
    } else {
      await Release.findByIdAndUpdate(release._id, { $set: { ...release } });
    }
  };

  preSaveLogic({ next, release, client, updateRunFugaSync });
};

module.exports = {
  releasePostSaveActions,
  releasePreSaveActions,
};
