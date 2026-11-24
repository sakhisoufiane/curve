/* eslint-disable no-await-in-loop */
/* eslint-disable no-promise-executor-return */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');

const TerritoryGroup = require('../../models/territoryGroup');
const Work = require('../../models/work');
const Track = require('../../models/track');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const Release = require('../../models/release');

// Batch size for processing Works
const LIMIT = 10_000;

let _batchNumber = 0;

/**
 * Generates CWR output for a delivery by fetching and processing works in batches,
 * then writing each batch's records to the cwr builder instance.
 *
 * Works are fetched in pages of LIMIT to keep per-batch heap usage bounded. An iterative
 * loop (rather than recursion) is used so each batch's enriched works are eligible for
 * garbage collection before the next batch loads — recursive frames kept all previous
 * batches' data alive on the call stack simultaneously, exhausting the heap on large deliveries.
 *
 * All work IDs are pre-fetched up front in a single lightweight query so that each
 * per-batch query can be a simple $in on LIMIT IDs rather than re-evaluating the full
 * delivery filter (which can contain a $in with 50k+ IDs) combined with a $gt cursor
 * condition on every iteration.
 *
 * @param {Object} params
 * @param {Object} params.cwr - CWR file builder instance (from curve-shared-logic)
 * @param {Object} params.filter - Mongoose filter identifying works for this delivery
 * @param {Object} params.delivery - CwrDelivery document
 * @param {Object} params.deliveryPartner - DeliveryPartner document
 * @param {string|string[]} params.territory - Territory code, continent name, or TerritoryGroup ObjectId — passed through to getWorksForDelivery unchanged each batch
 * @param {Object} params.options - Options forwarded to getWorksForDelivery (e.g. partnerChainsEnabled)
 */
async function createCWRDeliveryWork({ cwr, filter, delivery, deliveryPartner, territory, options }) {
  const id = delivery._id.toString();

  // Fetch only _id fields in sort order — tiny documents, fast query regardless of filter complexity.
  // Each batch then queries { _id: { $in: chunkOf10kIds } } — a straightforward indexed lookup
  // with no 50k-item $in re-scan and no $gt range condition appended on every iteration.
  const allWorkIds = (await Work.find(filter).select('_id').sort({ _id: 1 }).lean()).map((w) => w._id);
  const totalBatches = Math.ceil(allWorkIds.length / LIMIT);
  logger.info(`CWR Delivery: ${id} - ${allWorkIds.length} work IDs pre-fetched, ${totalBatches} batches`);

  for (let i = 0; i < allWorkIds.length; i += LIMIT) {
    _batchNumber += 1;
    const batch = _batchNumber;
    const batchStart = Date.now();
    const chunkIds = allWorkIds.slice(i, i + LIMIT);
    logger.info(`CWR Delivery: ${id} - [Batch ${batch}/${totalBatches}] getWorksForDelivery start | ${chunkIds.length} works`);

    const { works, territory: updatedTerritory } = await CwrDeliveryController.getWorksForDelivery({
      delivery,
      deliveryPartner,
      filter: { _id: { $in: chunkIds } },
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
    logger.info(`CWR Delivery: ${id} - [Batch ${batch}/${totalBatches}] getWorksForDelivery complete | ${works.length} works in ${((Date.now() - batchStart) / 1000).toFixed(1)}s`);

    const addWorksStart = Date.now();
    logger.info(`CWR Delivery: ${id} - [Batch ${batch}/${totalBatches}] cwr.addWorks start | outputLength=${cwr.output.length} chunks`);
    await new Promise((resolve, reject) => cwr.addWorks(works, 'REV', updatedTerritory, (err) => (err ? reject(err) : resolve())))
      .catch((err) => {
        logger.error(err);
        throw err;
      });
    logger.info(`CWR Delivery: ${id} - [Batch ${batch}/${totalBatches}] cwr.addWorks complete in ${((Date.now() - addWorksStart) / 1000).toFixed(1)}s | outputLength=${cwr.output.length} chunks`);
  }
}

module.exports = {
  createCWRDeliveryWork,
};
