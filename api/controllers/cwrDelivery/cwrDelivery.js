/* eslint-disable no-promise-executor-return */
const { logger, fileManager, promisify, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrDeliveryController, CWR } = require('@curveroyaltysystems/curve-shared-logic');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');

const Client = require('../../models/client');
const User = require('../../models/user');
const Work = require('../../models/work');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliverySchedule = require('../../models/deliverySchedule');
const DeliveryPartner = require('../../models/deliveryPartner');
const DeliveredWork = require('../../models/deliveredWork');
const TerritoryGroup = require('../../models/territoryGroup');
const Notification = require('../../models/notification');
const Task = require('../../models/task');

const Mlc = require('../../libs/deliveries/mlc');
const Cs = require('../../libs/deliveries/catShipment');
const CsSimple = require('../../libs/deliveries/catShipmentSimple');
const Youtube = require('../../libs/deliveries/youtube');
const IswcRegistration = require('../../libs/deliveries/iswcRegistration');
const IswcLib = require('../../libs/deliveries/iswc');
const CwrDeliveryLib = require('../../libs/deliveries/cwr');
const LibDelivery = require('../../libs/deliveries/library');

/**
 * @param {Object} params
 * @param {string} params.clientId
 * @param {string} params.userId
 * @param {string} params.cwrDeliveryId
 * @returns {Promise<void>}
 * @description Creates a task to export the songlist for a CWR Delivery and sends it to SQS for processing
 */
async function exportSonglist({ clientId, userId, cwrDeliveryId }) {
  const [client, user] = await Promise.all([
    Client.findById(clientId, { name: 1 }).lean(),
    User.findById(userId, { email: 1 }).lean(),
  ]);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Songlist Export',
    clientId,
    clientName: client.name,
    email: user.email,
    value: {
      deliveryId: cwrDeliveryId,
    },
  });
}

/**
 * @param {Object} params
 * @param {string} params.clientId
 * @param {string} params.userId
 * @param {string} params.cwrDeliveryId
 * @param {boolean} params.markWorksAsDelivered - whether to mark works as delivered as part of the export process, this is used for the 'Export and Deliver' functionality on the front end
 * @returns {Promise<void>}
 * @description Creates a task to export a CWR Delivery and sends it to SQS for processing. Optionally marks works as delivered as part of the export process.
 */
async function exportCwrDelivery({ clientId, userId, cwrDeliveryId, markWorksAsDelivered }) {
  const [client, user] = await Promise.all([
    Client.findById(clientId, { name: 1 }).lean(),
    User.findById(userId, { email: 1 }).lean(),
  ]);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'CWR Delivery Export',
    clientId,
    clientName: client.name,
    email: user.email,
    value: {
      deliveryId: cwrDeliveryId,
      markWorksAsDelivered,
    },
  });
}

/**
 * @param {Object} params
 * @param {CwrDelivery} params.delivery - the delivery to prepare for export
 * @param {DeliveryPartner} params.deliveryPartner - the delivery partner associated with the delivery, used to determine certain settings for the export
 * @param {User} params.curveUser - the user initiating the export, used for logging and in some cases to determine settings for the export
 * @returns {Promise<string>} - resolves with the S3 key of the prepared file ready for export
 * @description Prepares a CWR Delivery for export by building the appropriate filter, generating the file in the correct format, uploading it to S3 and returning the S3 key. The preparation steps differ based on the output format of the delivery, with CWR deliveries having additional steps to build the CWR file.
 */
async function prepareDelivery({ delivery, deliveryPartner, curveUser }) {
  const logKey = `CWR Delivery: ${delivery._id} - `;
  const client = await Client.findById(delivery.clientId, { name: 1, cwrPartyName: 1, cwrPartyId: 1, ipiNo: 1, features: 1 });
  const clientId = client._id.toString();
  const clientName = client.name;
  const territory = [delivery.territory];
  const partnerChainsEnabled = client?.features?.partnerChains || curveUser.internal;

  logger.info(logKey, 'Building works filter');

  // Get filter
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

  // Exclude uncontrolled works from the filter results, as these should not be included in the CWR export.
  const uncontrolledWorks = await CwrDeliveryController.getUncontrolledWorks({
    Work,
    DeliveryPartner,
    TerritoryGroup,
    DeliverySchedule,
    CwrDelivery,
    cwrDelivery: delivery,
    query: filter,
  });
  if (uncontrolledWorks.length > 0) {
    if (!filter._id) filter._id = {};
    filter._id.$nin = uncontrolledWorks.map((work) => work._id);
  }

  logger.debug(logKey, 'Works filter:', filter);

  // Next steps depend on delivery type with each using its own lib
  let s3Path;
  let location;

  if (delivery.outputFormat === 'MLC') {
    logger.info(logKey, 'MLC Delivery');

    // Create MLC File
    const mlc = new Mlc();
    await LibDelivery.createLibDeliveryWork({ lib: mlc, filter, delivery, deliveryPartner, territory, options: {} });
    logger.info(logKey, 'Creating MLC Files');

    [s3Path, location] = await new Promise((resolve, reject) => {
      mlc.createFiles(appRootDir, clientId, (err, fileName, loc) => {
        if (err) return reject(err);
        resolve([`deliveryFiles/mls/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
      });
    });
  } else if (delivery.outputFormat === 'Catalogue Shipment') {
    logger.info(logKey, 'Cat Shipment Delivery');

    // Create Catalogue Shipment File
    const cs = new Cs();
    await LibDelivery.createLibDeliveryWork({ lib: cs, filter, delivery, deliveryPartner, territory, options: {} });
    logger.info(logKey, 'Creating Cat Shipment Files');

    [s3Path, location] = await new Promise((resolve, reject) => {
      cs.createFile(appRootDir, clientName, (err, fileName, loc) => {
        if (err) return reject(err);
        resolve([`deliveryFiles/cs/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
      });
    });
  } else if (delivery.outputFormat === 'Catalogue Shipment - Simple') {
    logger.info(logKey, 'Cat Shipment Simple Delivery');

    // Create Simple Catalogue Shipment File
    const cs = new CsSimple();
    await LibDelivery.createLibDeliveryWork({ lib: cs, filter, delivery, deliveryPartner, territory, options: {} });
    logger.info(logKey, 'Creating Cat Shipment Simple Files');

    [s3Path, location] = await new Promise((resolve, reject) => {
      cs.createFile(appRootDir, clientName, (err, fileName, loc) => {
        if (err) return reject(err);
        resolve([`deliveryFiles/cs/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
      });
    });
  } else if (delivery.outputFormat === 'Youtube') {
    logger.info(logKey, 'Youtube Delivery');

    // Create Youtube File
    const youtube = new Youtube();
    await LibDelivery.createLibDeliveryWork({ lib: youtube, filter, delivery, deliveryPartner, territory, options: {} });
    logger.info(logKey, 'Creating Youtube Files');

    [s3Path, location] = await new Promise((resolve, reject) => {
      youtube.createFile(appRootDir, clientName, (err, fileName, loc) => {
        if (err) return reject(err);
        resolve([`deliveryFiles/youtube/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
      });
    });
  } else if (delivery.outputFormat === 'ISWC Registration - JSON') {
    logger.info(logKey, 'ISWC Registration JSON Delivery');

    // Find user for email to go into file
    const user = await User.findById(curveUser.id);
    // @TOM: should we not error if we can't find the user?
    const email = user ? user.email : '';
    const iswcRegistration = new IswcRegistration();
    await IswcLib.createISWCRegistrationWork({ iswcRegistration, filter, delivery, deliveryPartner, territory, client, email, submissionType: 'Add', options: {} });

    logger.info(logKey, 'Creating ISWC Registration Files');
    [s3Path, location] = await new Promise((resolve, reject) => {
      iswcRegistration.createFile(client, delivery.receivingParty, (err, fileName, loc) => {
        if (err) return reject(err);
        resolve([`deliveryFiles/iswcRegistration/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
      });
    });
  } else if (delivery.outputFormat === 'ISWC Lookup - JSON') {
    logger.info(logKey, 'ISWC Lookup JSON Delivery');

    // Find user for email to go into file
    const user = await User.findById(curveUser.id);
    // @TOM: should we not error if we can't find the user?
    const email = user ? user.email : '';
    const iswcRegistration = new IswcRegistration();
    await IswcLib.createISWCRegistrationWork({ iswcRegistration, filter, delivery, deliveryPartner, territory, client, email, submissionType: 'Find', options: {} });
    logger.info(logKey, 'Creating ISWC Lookup JSON Files');

    [s3Path, location] = await new Promise((resolve, reject) => {
      iswcRegistration.createFile(client, delivery.receivingParty, (err, fileName, loc) => {
        if (err) return reject(err);
        resolve([`deliveryFiles/iswcRegistration/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
      });
    });
  } else if (delivery.outputFormat === 'Excel') {
    logger.info(logKey, 'Excel Delivery');
    const count = await Work.countDocuments(filter);
    if (count < 3000) {
      [s3Path, location] = await new Promise((resolve, reject) => {
        Work.createExportXlsx(filter, clientId, (err, loc) => {
          if (err) return reject(err);
          const fileName = `${delivery.name} Work Export ${moment().format('YYYYMMDDHHmmssSSS')}.${loc.split('.').pop()}`;
          resolve([`deliveryFiles/excel/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
        });
      });
    } else {
      [s3Path, location] = await new Promise((resolve, reject) => {
        Work.createExportCsv(filter, count, clientId, (err, loc) => {
          if (err) return reject(err);
          const fileName = `${delivery.name} Work Export ${moment().format('YYYYMMDDHHmmssSSS')}.${loc.split('.').pop()}`;
          resolve([`deliveryFiles/excel/${clientId}/${delivery._id.toString()}/${fileName}`, loc]);
        });
      });
    }
  } else if (delivery.outputFormat === 'CWR') {
    logger.info(logKey, 'CWR Delivery');

    // Create CWR File
    let senderName = client.cwrPartyName ? client.cwrPartyName : client.name;
    senderName = deliveryPartner && deliveryPartner.sendingPartyName ? deliveryPartner.sendingPartyName : senderName;

    // The ipiNo on the delivery partner overrides the client ipiNo, if present.
    let { ipiNo } = client;
    if (deliveryPartner && deliveryPartner.ipiNo) {
      ({ ipiNo } = deliveryPartner);
    }

    // The sendingPartyId on the delivery partner (if present) overrides the delivery's sendingParty, which is otherwise taken from the cwrPartyId of the client.
    let sendingParty = client.cwrPartyId;
    if (deliveryPartner?.sendingPartyId) {
      sendingParty = deliveryPartner.sendingPartyId;
    }

    logger.info(logKey, 'Creating CWR Object');
    const cwr = new CWR({
      // Model needs injecting for now, fix this soon
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

    logger.info(logKey, 'Calling cwr.setup');
    await new Promise((resolve) => cwr.setup(resolve));
    cwr.addHeader('REV');

    logger.info(logKey, 'Calling cwr.addWorks');
    await CwrDeliveryLib.createCWRDeliveryWork({
      cwr,
      filter,
      delivery,
      deliveryPartner,
      territory,
      options: { partnerChainsEnabled },
    });

    cwr.addTrailer();
    logger.info(logKey, 'Closing CWR file');

    await new Promise((resolve) => cwr.close(resolve));
    delivery.fileName = delivery.fileName ?? cwr.fileName();
    const cwrS3Path = `deliveryFiles/cwr/${delivery.fileName}`;
    const cwrLocation = `${appRootDir}/tmp/${clientId}-${moment().format('x')}`;

    logger.info(logKey, 'Writing cwr file');
    await new Promise((resolve, reject) => {
      cwr.writeToFile(cwrLocation, (err) => {
        logger.info(logKey, 'CWR file write complete');
        if (err) {
          logger.error(logKey, `Errored: ${err}`);
          return reject(err);
        }
        resolve();
      });
    });
    s3Path = cwrS3Path;
    location = cwrLocation;
  } else {
    logger.error(logKey, 'Delivery type unknown:', delivery.outputFormat);
    throw new Error(`Delivery type unknown: ${delivery.outputFormat}`);
  }

  // Upload to S3
  logger.info(logKey, `Uploading output file to ${s3Path} | ${location}`);
  return new Promise((resolve, reject) => {
    fileManager.uploadToS3(s3Path, location, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * @param {Object} params
 * @param {CwrDelivery} params.delivery - the delivery to export
 * @param {User} params.curveUser - the user initiating the export, used for logging and in some cases to determine settings for the export
 * @param {boolean} params.markWorksAsDelivered - whether to mark works as delivered as part of the export process, this is used for the 'Export and Deliver' functionality on the front end. If true, works will be marked as delivered and delivery status will be set to 'Delivered' on successful export, or 'Errored' if the export fails. If false, works will not be marked as delivered and delivery status will not be updated regardless of export success or failure.
 * @returns {Promise<void>}
 * @description Exports a CWR Delivery by preparing the file, uploading it to S3 and sending a notification to the user with a link to download the file. Optionally marks works as delivered as part of the export process, which also updates the delivery status based on success or failure of the export.
 */
async function exportDelivery({
  delivery,
  curveUser,
  markWorksAsDelivered,
}) {
  const logKey = `CWR Delivery: ${delivery._id} - `;

  try {
    logger.info(logKey, 'Starting export');

    // Refactored to check delivery partner exists and the settings before doing any heavy lifting
    logger.info(logKey, 'Getting delivery partners');
    const deliveryPartner = await DeliveryPartner.findById(delivery.deliveryPartnerId);

    if (markWorksAsDelivered) {
      logger.info(logKey, 'Marking works as delivered');
      await new Promise((resolve, reject) => {
        delivery.deliverWorks((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    logger.info(logKey, 'Preparing delivery');
    const key = await prepareDelivery({ delivery, deliveryPartner, curveUser });

    logger.info(logKey, 'Getting public link for S3 file');
    const [link] = await promisify(fileManager.publicLink24Hours, key);

    logger.info(logKey, 'Sending download ready message');
    const client = await Client.findById(curveUser.clientId);
    const subject = `Your ${delivery.outputFormat} Export for ${client.name} is Ready to Download`;
    const generateOptions = {
      identifier: 'exportDownload',
      curveUser,
      client,
      subject,
      link,
    };
    await promisify(
      Notification.generate,
      `${delivery.outputFormat} Export Ready`,
      subject,
      link,
      curveUser,
      generateOptions,
    );

    // Save delivery after file name is attached
    await delivery.save();

    if (markWorksAsDelivered) {
      delivery.status = 'Delivered';
      delivery.errorMessage = null;
    }
  } catch (err) {
    if (markWorksAsDelivered) {
      delivery.status = 'Errored';
      delivery.errorMessage = err.message;
      logger.error(logKey, 'Delivery Export Error:', err);
    }
  } finally {
    if (markWorksAsDelivered) {
      await delivery.save().catch((err) => {
        logger.error(logKey, 'Could not save delivery:', err);
      });
    }
  }
}

module.exports = {
  exportSonglist,
  exportCwrDelivery,
  prepareDelivery,
  exportDelivery,
};
