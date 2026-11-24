const fs = require('fs');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const IswcDelivery = require('../models/iswcDelivery');
const DeliveryPartner = require('../models/deliveryPartner');
const Client = require('../models/client');
const User = require('../models/user');
const IswcRegistration = require('../libs/iswc/iswcRegistration');
const Ftp = require('../libs/ftp');
const Sftp = require('../libs/sftp');

const IswcDeliveryController = this;

let logIdentifier;

IswcDeliveryController.deliver = async ({ iswcDeliveryId, userId }) => {
  logIdentifier = `ISWC-DELIVERY : ${iswcDeliveryId}`;
  const iswcDelivery = await IswcDelivery.findById(iswcDeliveryId);

  if (!iswcDelivery) {
    logger.error(`${logIdentifier} : iswc delivery does not exist`);
    return;
  }

  const deliveryPartner = await DeliveryPartner.findById(iswcDelivery.deliveryPartnerId);

  if (!deliveryPartner || !deliveryPartner?.ftpHost) {
    logger.error(`${logIdentifier} : Missing delivery partner ftp host`);
    iswcDelivery.status = 'Errored';
    iswcDelivery.errorMessage = 'Missing delivery partner ftp host';
    await iswcDelivery.save();
    return;
  }

  const user = await User.findById(userId);
  const client = await Client.findById(user.clientId);
  const workIds = iswcDelivery.deliveredWorkIds;

  let config;
  if (deliveryPartner.outputFormat === 'ISWC Resolution (IRS)') {
    config = {
      senderName: client.cwrPartyName || client.name,
      sendingParty: client.cwrPartyId,
      receivingParty: deliveryPartner.receivingParty,
      ipiNo: deliveryPartner?.ipiNo || client?.ipiNo,
      email: user.email,
      role: 'AM',
      submissionType: 'Find',
      iswcDeliveryId: iswcDelivery._id.toString(),
    };
  } else if (deliveryPartner.outputFormat === 'ISWC Allocation (IAS)') {
    config = {
      senderName: client.cwrPartyName || client.name,
      sendingParty: client.cwrPartyId,
      receivingParty: deliveryPartner.receivingParty,
      ipiNo: deliveryPartner?.ipiNo || client?.ipiNo,
      email: user.email,
      role: 'AM',
      submissionType: 'Add',
      iswcDeliveryId: iswcDelivery._id.toString(),
    };
  } else {
    logger.error(`${logIdentifier} : Unknown output format`);
    iswcDelivery.status = 'Errored';
    iswcDelivery.errorMessage = 'Unknown output format';
    await iswcDelivery.save();
    return;
  }

  logger.info(`${logIdentifier} : creating new iswc delivery file`);

  let fileData;
  try {
    const iswcRegistration = new IswcRegistration();
    await iswcRegistration.createData(workIds, config);
    fileData = iswcRegistration.createFile(client, deliveryPartner.receivingParty, deliveryPartner.outputFormat);
  } catch (err) {
    logger.error(`${logIdentifier} : creating delivery file errored`);
    logger.error(err);
    return;
  }

  const rootDir = deliveryPartner.ftpRootDir || '/';
  const defaultPort = (deliveryPartner.type === 'SFTP') ? 22 : 21;
  const ftpConfig = {
    host: deliveryPartner.ftpHost,
    username: deliveryPartner.ftpUsername,
    password: deliveryPartner.ftpPassword,
    port: deliveryPartner.ftpPort || defaultPort,
  };

  const ftp = (deliveryPartner.type === 'SFTP') ? new Sftp(ftpConfig) : new Ftp(ftpConfig);
  const remotePath = `${rootDir}/${fileData.fileName}`;

  logger.info(`${logIdentifier} : uploading iswc delivery file to ftop server`);

  try {
    await ftp.connect();
    await ftp.uploadFile(fileData.outputLocation, remotePath);
    await ftp.disconnect();
  } catch (err) {
    logger.error(`${logIdentifier} : Could not deliver file to ftp server`);
    logger.error(`${logIdentifier} : ${err}`);
    iswcDelivery.status = 'Errored';
    iswcDelivery.errorMessage = 'Could not deliver file to ftp server';
    await iswcDelivery.save();
    return;
  }

  logger.info(`${logIdentifier} : removing local iswc delivery file`);

  fs.unlinkSync(fileData.outputLocation);

  iswcDelivery.status = 'Delivered';
  await iswcDelivery.save();

  logger.info(`${logIdentifier} : process complete`);
};

module.exports = IswcDeliveryController;
