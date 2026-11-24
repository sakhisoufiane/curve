const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const TerritoryGroup = require('../../models/territoryGroup');
const Work = require('../../models/work');
const Track = require('../../models/track');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const Release = require('../../models/release');

// Batch size for processing Works
const LIMIT = 10_000;

async function createLibDeliveryWork({ lib, filter, delivery, deliveryPartner, territory, options }) {
  // Get works
  const { works, territory: updatedTerritory } = await CwrDeliveryController.getWorksForDelivery({
    delivery,
    deliveryPartner,
    filter,
    options,
    territory,
    limit: LIMIT,
    TerritoryGroup,
    Work,
    Track,
    Publisher,
    Composer,
    Release,
  });

  // Add data to output
  await new Promise((resolve, reject) => {
    lib.createData({ works, deliveryTerritories: updatedTerritory }, (err) => (err ? reject(err) : resolve()));
  })
    .catch((err) => {
      logger.error(err);
      throw err;
    });

  logger.info(`Lib Delivery: ${delivery._id.toString()} Found Works: ${works.length}`);
  if (works.length === LIMIT) {
    logger.info(`Lib Delivery: ${delivery._id.toString()} Running next batch`);
    // If works total is limit, then we need to loop through filter again and grab next batch and repeat
    await createLibDeliveryWork({
      lib,
      filter,
      delivery,
      deliveryPartner,
      territory,
      options: { lastId: works[works.length - 1]._id },
    });
  }
}

module.exports = {
  createLibDeliveryWork,
};
