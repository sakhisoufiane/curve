/* eslint-disable no-promise-executor-return */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const moment = require('moment');
const { CwrDeliveryController, CWR } = require('@curveroyaltysystems/curve-shared-logic');

const CsvExports = require('../exports/csv');
const CwrDelivery = require('../../models/cwrDelivery');
const Client = require('../../models/client');
const Work = require('../../models/work');
const TerritoryGroup = require('../../models/territoryGroup');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const DeliveryPartner = require('../../models/deliveryPartner');
const Track = require('../../models/track');
const Release = require('../../models/release');
const DeliverySchedule = require('../../models/deliverySchedule');
const DeliveredWork = require('../../models/deliveredWork');
const ExportNotification = require('../exportNotification/exportNotification');

const WORKS_BATCH_LIMIT = 10_000;

/**
 *
 * @param {Object} params
 * @param {string} params.deliveryId Delivery ID
 * @param {string} params.email Email address for sending the download notification
 */
async function createSongList({ deliveryId, email }) {
  const logKey = `${deliveryId} | Create Report |`;

  logger.info(logKey, 'Fetching delivery:', deliveryId);
  const delivery = await CwrDelivery.findById(deliveryId);
  if (!delivery) {
    const error = new Error(`No Delivery found with ID: ${deliveryId}`);
    logger.error(logKey, error);
    throw error;
  }
  if (delivery.outputFormat !== 'CWR') {
    const error = new Error('Songlist export can only be for deliveries of format "CWR"');
    logger.error(logKey, error);
    throw error;
  }

  logger.info(logKey, 'Fetching client:', delivery.clientId);
  const client = await Client.findById(delivery.clientId);

  logger.info(logKey, 'Fetching delivery partner:', delivery.deliveryPartnerId);
  const deliveryPartner = await DeliveryPartner.findById(delivery.deliveryPartnerId);

  logger.info(logKey, 'Fetching delivery data for works');
  const { works } = await Songlist.getWorksForDelivery({ delivery, deliveryPartner, client })
    .catch((err) => {
      logger.error(logKey, 'Error getting Delivery data for Works:', err);
      throw err;
    });
  if (works.length === 0) {
    const error = new Error('No works found in delivery to export');
    logger.error(logKey, error);
    throw error;
  }

  const fileKey = buildFileKey(deliveryId);
  const { csvStream, fileLocation } = createCsvStream({
    fileKey,
  });

  logger.info(logKey, 'Writing works to songlist file:', fileLocation);
  try {
    Songlist.writeWorksToFile({ deliveryPartner, works, csvStream });
  } catch (err) {
    logger.error(logKey, 'Error writing Works to Songlist file:', err);
    throw err;
  }

  logger.info(logKey, 'Closing file stream and finalising songlist file');
  await CsvExports.closeStream(csvStream);

  // Upload to S3
  logger.info(logKey, 'Uploading file to S3 with key:', fileKey);
  await new Promise((resolve, reject) => {
    fileManager.uploadToS3(fileKey, fileLocation, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  })
    .catch((err) => {
      logger.error(logKey, 'Error uploading file to S3:', err);
      throw err;
    });

  // Generate public URL
  const signedUrl = await new Promise((resolve, reject) => {
    fileManager.publicLink24Hours(fileKey, (err, signedUrl) => {
      if (err) reject(err);
      else resolve(signedUrl);
    });
  });

  // Save on delivery
  logger.info(logKey, 'Saving S3 file key on Delivery:', deliveryId);
  await saveFileKey(deliveryId, fileKey);

  // Send notifications
  logger.info(logKey, 'Sending download notification to:', email);
  await ExportNotification.sendSonglistExportNotification({
    deliveryName: delivery.name,
    client,
    email,
    url: signedUrl,
  });
}

/**
 * @param {Object} params
 * @param {string} params.fileKey - S3 file key
 * @param {string} params.format - Number separator option
 */
function createCsvStream({ fileKey }) {
  const fileName = fileKey.split('/').pop();
  const fileLocation = `${appRootDir}/tmp/${fileName}`;

  const csvStream = fs.createWriteStream(fileLocation);
  CsvExports.writeCsvLine(csvStream, [], { format: null, bom: true });

  return { csvStream, fileLocation, fileName };
}

/**
 *
 * @param {Object} params
 * @param {Delivery} params.delivery Delivery model instance
 * @param {DeliveryPartner} params.deliveryPartner Delivery Partner model instance
 * @param {Client} params.client Client model instance
 */
async function getWorksForDelivery({ delivery, deliveryPartner, client }) {
  const territory = [delivery.territory];
  const partnerChainsEnabled = client?.features?.partnerChains;

  const filter = await CwrDeliveryController.buildWorksFilter({
    status: 'All',
    delivery,
    DeliveryPartner,
    Work,
    DeliverySchedule,
    CwrDelivery,
    TerritoryGroup,
    DeliveredWork,
  });

  return Songlist.getWorksWithDeliveryData({
    delivery,
    deliveryPartner,
    territory,
    filter,
    options: { partnerChainsEnabled },
    // Injected models
    Work,
    TerritoryGroup,
    Track,
    Publisher,
    Composer,
  });
}

/**
 *
 * @param {Object} params
 * @param {Delivery} params.delivery Delivery model instance
 * @param {DeliveryPartner} params.deliveryPartner Delivery Partner model instance
 * @param {string} params.territory Territory code or TerritoryGroup ID
 * @param {Object} params.filter DB Filter for querying the Works in the Delivery
 * @param {{ partnerChainsEnabled?: boolean, lastId?: string | ObjectID }} params.options Options for querying Works
 */
async function getWorksWithDeliveryData({
  works = [],
  delivery,
  deliveryPartner,
  territory,
  filter,
  options: { partnerChainsEnabled },
}) {
  const { works: worksWithDeliveryData, territory: updatedTerritory } = await CwrDeliveryController.getWorksForDelivery({
    delivery,
    deliveryPartner,
    territory,
    filter,
    options: { partnerChainsEnabled },
    // Injected models
    Work,
    TerritoryGroup,
    Track,
    Release,
    Publisher,
    Composer,
  });
  works = works.concat(worksWithDeliveryData);
  if (works.length === WORKS_BATCH_LIMIT) {
    return Songlist.getWorksWithDeliveryData({
      works,
      delivery,
      deliveryPartner,
      territory,
      filter,
      options: {
        partnerChainsEnabled,
        lastId: works[works.length - 1]._id,
      },
    });
  }
  return { works, territory: updatedTerritory };
}

/**
 *
 * @param {Object} params
 * @param {DeliveryPartner} params.deliveryPartner Delivery Partner model instance
 * @param {Work[]} params.works Array of populated Works
 * @param {WriteStream} params.csvStream
 */
function writeWorksToFile({ deliveryPartner, works, csvStream }) {
  // Create an empty CWR instance so we can use some instance methods
  const cwr = new CWR({ receivingParty: deliveryPartner.receivingParty });

  for (const work of works) {
    CsvExports.writeCsvLine(csvStream, ['Title:', work.title]);
    CsvExports.writeCsvLine(csvStream, [
      '', '', '', '', '', '', '', 'Ownership', '', 'Collectible',
    ]);
    CsvExports.writeCsvLine(csvStream, [
      '', '', '', 'Capacity', '', 'Controlled', '% Mech.', '% Perf.', '% Mech.', '% Perf.',
    ]);

    if (work?.rightsChain?.length > 0) {
      for (const territoryChain of work.rightsChain) {
        const territoryName = territoryChain?.territoryCodes?.name ?? territoryChain.territory;
        CsvExports.writeCsvLine(csvStream, ['', territoryName]);
        Songlist.writeChildren({ cwr, csvStream, chain: territoryChain });
        CsvExports.writeCsvLine(csvStream, []);
      }
    }

    CsvExports.writeCsvLine(csvStream, []);
  }
}

/**
 *
 * @param {Object} params
 * @param {CWR} params.cwr
 * @param {WriteStream} params.csvStream
 * @param {{ children: unknown[] }} params.chain
 * @param {number?} params.level
 */
function writeChildren({ cwr, csvStream, chain, level = 0 }) {
  if (!chain?.children || chain?.children?.length === 0) return;
  for (const child of chain.children) {
    const name = child.type === 'Publisher' ? cwr.getSocietyPublisherName(child.publisher) : child.name;
    const cae = child.type === 'Publisher' ? cwr.getSocietyPublisherCae(child.publisher) : child.caeNumber;
    CsvExports.writeCsvLine(csvStream, [
      cae,
      `${' '.repeat(level * 2)}${name}`,
      '',
      child.contractType,
      '',
      child.controlled ? 'Yes' : 'No',
      child.mechanicalOwnership,
      child.performanceOwnership,
      child.mechanicalCollection,
      child.performanceCollection,
    ]);
    if (child?.children?.length > 0) {
      writeChildren({ cwr, csvStream, chain: child, level: level + 1 });
    }
  }
}

/**
 *
 * @param {string} deliveryId CWR Delivery ID
 */
function buildFileKey(deliveryId) {
  return `deliveries/${deliveryId}/Songlist-${moment().format('x')}.csv`;
}

/**
 *
 * @param {string} deliveryId CWR Delivery ID
 * @param {string} fileKey S3 file key
 */
async function saveFileKey(deliveryId, fileKey) {
  await CwrDelivery.updateOne({ _id: deliveryId }, {
    songlistExportFileKey: fileKey,
  });
}

const Songlist = {
  createSongList,
  createCsvStream,
  getWorksForDelivery,
  getWorksWithDeliveryData,
  writeWorksToFile,
  writeChildren,
  buildFileKey,
  saveFileKey,
};

module.exports = Songlist;
