/* eslint-disable no-promise-executor-return */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrDeliveryController, CWR } = require('@curveroyaltysystems/curve-shared-logic');
const appRootDir = require('app-root-dir').get();

const DeliveryPartner = require('../../../models/deliveryPartner');
const Client = require('../../../models/client');
const Work = require('../../../models/work');
const TerritoryGroup = require('../../../models/territoryGroup');
const Track = require('../../../models/track');
const Publisher = require('../../../models/publisher');
const Composer = require('../../../models/composer');
const Release = require('../../../models/release');
const Filter = require('./filter');

// Batch size for processing Works (number written to CWR file at a time)
const WORKS_BATCH_SIZE = 10_000;

/**
 * Creates a CWR file for the specified delivery
 * @param {Object} params
 * @param {String} params.logKey Log key for logging
 * @param {Object} params.delivery CwrDelivery document
 * @param {Number} [params.worksBatchSize=WORKS_BATCH_SIZE] Number of works to process per batch
 * @returns {Promise<{client: Object, filePath: String}>} Client document and path to created CWR file
 */
async function createFile({ logKey, delivery, worksBatchSize = WORKS_BATCH_SIZE }) {
  const [client, deliveryPartner] = await Promise.all([
    Client.findById(delivery.clientId),
    DeliveryPartner.findById(delivery.deliveryPartnerId),
  ]);

  const filter = await Filter.buildWorksFilter({ delivery });
  logger.info(logKey, 'Compiled Works filter:', filter);

  const worksCount = await Work.countDocuments(filter);
  logger.info(logKey, 'Total Works to export:', worksCount);
  if (worksCount === 0) {
    throw new Error('No Works found with Delivery filter');
  }

  const cwr = await setupCwrFile({ client, deliveryPartner, delivery });

  await addWorksToFile({
    cwr,
    filter,
    delivery,
    deliveryPartner,
    territory: [delivery.territory],
    options: { partnerChainsEnabled: client.features.partnerChains },
    limit: worksBatchSize,
  });

  delivery.fileName = delivery.fileName ?? cwr.fileName();
  const filePath = `${appRootDir}/tmp/${client._id.toString()}-${Date.now()}-${delivery.fileName}`;

  await closeCwrFile({ cwr, filePath });
  logger.info(logKey, 'CWR file written to:', filePath);

  return { client, filePath };
}

/**
 * Sets up CWR file with header information
 * @param {Object} params
 * @param {Object} params.client Client document
 * @param {Object} params.deliveryPartner DeliveryPartner document
 * @param {Object} params.delivery CwrDelivery document
 * @returns {Promise<CWR>} Configured CWR instance
 */
async function setupCwrFile({ client, deliveryPartner, delivery }) {
  let senderName = client.cwrPartyName ? client.cwrPartyName : client.name;
  senderName = deliveryPartner && deliveryPartner.sendingPartyName ? deliveryPartner.sendingPartyName : senderName;
  // The ipiNo on the delivery partner (if present) overrides the client's ipiNo.
  let { ipiNo } = client;
  if (deliveryPartner && deliveryPartner.ipiNo) {
    ({ ipiNo } = deliveryPartner);
  }
  // The sendingPartyId on the delivery partner (if present) overrides the delivery's sendingParty, which is otherwise taken from the cwrPartyId of the client.
  let sendingParty = client.cwrPartyId;
  if (deliveryPartner?.sendingPartyId) {
    sendingParty = deliveryPartner.sendingPartyId;
  }

  const cwr = new CWR({
    DeliveryPartner,
    deliveryPartner,
    senderName,
    senderType: 'PB',
    sendingParty,
    receivingParty: delivery.receivingParty,
    ipiNo,
    sequenceNo: delivery.sequenceNo,
    version: delivery.cwrVersion,
    deliveryConfiguration: {
      splitElection: deliveryPartner ? deliveryPartner.splitElection : null,
      splitElectionPRO: deliveryPartner ? deliveryPartner.splitElectionPRO : null,
    },
  });

  await new Promise((resolve) => cwr.setup(resolve));
  cwr.addHeader('REV');
  return cwr;
}

/**
 * Recursively adds works to CWR file in batches
 * @param {Object} params
 * @param {CWR} params.cwr Configured CWR instance
 * @param {Object} params.filter Mongoose filter object for Works
 * @param {Object} params.delivery CwrDelivery document
 * @param {Object} params.deliveryPartner DeliveryPartner document
 * @param {Array} params.territory Array of territory codes
 * @param {Object} params.options Options for work retrieval
 * @param {Number} params.limit Number of works to retrieve per batch
 */
async function addWorksToFile({ cwr, filter, delivery, deliveryPartner, territory, options, limit }) {
  // Get works
  const { works, territory: updatedTerritory } = await CwrDeliveryController.getWorksForDelivery({
    delivery,
    deliveryPartner,
    filter,
    options,
    territory,
    limit,
    TerritoryGroup,
    Work,
    Track,
    Publisher,
    Composer,
    Release,
  });
  if (works.length === 0) return;
  // Add data to output
  await new Promise((resolve, reject) => cwr.addWorks(works, 'REV', updatedTerritory, (err) => (err ? reject(err) : resolve())))
    .catch((err) => {
      logger.error(err);
      throw err;
    });
  if (works.length === limit) {
    // If works total is limit, then we need to loop through filter again and grab next batch and repeat
    await addWorksToFile({
      cwr,
      filter,
      delivery,
      deliveryPartner,
      territory,
      options: { lastId: works[works.length - 1]._id },
      limit,
    });
  }
}

/**
 * Closes CWR file and writes to disk
 * @param {Object} params
 * @param {CWR} params.cwr Configured CWR instance
 * @param {String} params.filePath Path to write CWR file to
 * @returns {Promise<String>} Path to written CWR file
 */
async function closeCwrFile({ cwr, filePath }) {
  cwr.addTrailer();
  await new Promise((resolve) => cwr.close(resolve));
  await new Promise((resolve, reject) => {
    cwr.writeToFile(filePath, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
  return filePath;
}

module.exports = {
  createFile,
  setupCwrFile,
  addWorksToFile,
  closeCwrFile,
};
