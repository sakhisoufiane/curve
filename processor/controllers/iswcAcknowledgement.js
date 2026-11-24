/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const fs = require('fs');
const { fileManager, logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const { ObjectId } = require('mongodb');
const IswcAcknowledgement = require('../models/iswcAcknowledgement');
const IswcDelivery = require('../models/iswcDelivery');
const IswcDeliveredWork = require('../models/iswcDeliveredWork');
const Work = require('../models/work');
const Client = require('../models/client');
const User = require('../models/user');
const { notifyISWCConflicts } = require('../libs/iswc/iswcHelper');
const Ftp = require('../libs/ftp');
const Sftp = require('../libs/sftp');

const IswcAcknowledgementController = this;

let logIdentifier;

const downloadFile = ({ ftp, ftpFilePath, outputLocation }) => new Promise((resolve, reject) => {
  ftp.download(ftpFilePath)
    .then((file) => {
      const writeStream = fs.createWriteStream(outputLocation);
      file.pipe(writeStream);

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      file.on('error', reject);
    })
    .catch(reject);
});

const uploadFileS3 = ({ outputLocation, fileName }) => new Promise((resolve) => {
  const s3Key = `iswcAcknowledgements/${fileName}`;
  fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
    resolve(response);
  });
});

IswcAcknowledgementController.digestAckFile = async ({ fileName, serverId, clientId }) => {
  logIdentifier = `ISWC-ACKNOWLEDGEMENT-DIGEST : ${fileName}`;
  const errors = [];
  const client = await Client.findOne({ _id: new ObjectId(clientId) });
  const ftpServer = client.iswcFtpIngestions.find((iswcFtpIngestion) => iswcFtpIngestion._id.toString() === serverId);

  const rootDir = ftpServer.directory || '/';
  const defaultPort = (ftpServer.protocol === 'SFTP') ? 22 : 21;
  const ftpConfig = {
    host: ftpServer.host,
    username: ftpServer.username,
    password: ftpServer.password,
    port: ftpServer.port || defaultPort,
  };

  const ftp = (ftpServer.protocol === 'SFTP') ? new Sftp(ftpConfig) : new Ftp(ftpConfig);
  const ftpFilePath = `${rootDir}/${fileName}`;
  const outputLocation = `${appRootDir}/tmp/${fileName}`;

  logger.info(`${logIdentifier} : downloading file from ftp server - ${ftpFilePath}`);

  await ftp.connect();
  await downloadFile({ ftp, ftpFilePath, outputLocation });
  await ftp.disconnect();

  logger.info(`${logIdentifier} : reading downloaded file - ${outputLocation}`);

  const ackFile = JSON.parse(fs.readFileSync(outputLocation, 'utf8'));

  let iswcDeliveryId;
  if (ackFile?.fileHeader?.submittingPublisher?.deliveryId) {
    iswcDeliveryId = ackFile.fileHeader.submittingPublisher.deliveryId;
  } else {
    errors.push('Ack file is missing iswc delivery id in header');
  }

  if (!ackFile?.acknowledgements?.length > 0) {
    errors.push('Ack file doesnt have any acknowledgements');
  }

  let outputFormat;
  const findFirstNonNullOriginalTransactionType = (ackFile) => {
    if (!ackFile || !ackFile.acknowledgements) return null;
    return ackFile.acknowledgements.find(
      (acknowledgement) => acknowledgement.originalTransactionType != null,
    ) || null; // Return null if no such entry is found
  };
  const acknowledgement = findFirstNonNullOriginalTransactionType(ackFile);
  if (acknowledgement?.originalTransactionType === 'FindSubmission') {
    outputFormat = 'ISWC Resolution (IRS)';
  } else if (acknowledgement?.originalTransactionType === 'AddSubmission') {
    outputFormat = 'ISWC Allocation (IAS)';
  } else {
    errors.push('Ack file output format doesnt match known examples');
  }

  const publicKeyS3 = await uploadFileS3({ outputLocation, fileName });
  const iswcDelivery = await IswcDelivery.findOne({ _id: new ObjectId(iswcDeliveryId), clientId: client._id.toString() });
  let iswcAcknowledgement = await IswcAcknowledgement.findOne({ iswcDeliveryId: new ObjectId(iswcDeliveryId), clientId: client._id.toString() });

  logger.info(`${logIdentifier} : ${iswcAcknowledgement ? 'updating' : 'creating'} iswc acknowledgement`);

  if (iswcAcknowledgement) {
    iswcAcknowledgement.fileName = fileName;
    iswcAcknowledgement.deliveryPartnerId = iswcDelivery?.deliveryPartnerId;
    iswcAcknowledgement.publicKeyS3 = publicKeyS3;
    iswcAcknowledgement.outputFormat = outputFormat;
    iswcAcknowledgement.errors = errors;
  } else {
    iswcAcknowledgement = new IswcAcknowledgement({
      fileName,
      iswcDeliveryId: iswcDelivery?._id?.toString(),
      deliveryPartnerId: iswcDelivery?.deliveryPartnerId,
      clientId: client._id.toString(),
      publicKeyS3,
      outputFormat,
      errors,
    });
  }
  await iswcAcknowledgement.save();

  if (errors.length === 0) {
    logger.info(`${logIdentifier} : creating new iswc delivered works`);
    const iswcErrors = [];

    for (const ack of ackFile.acknowledgements) {
      const work = await Work.findOne({ clientId: client._id.toString(), partyNo: ack.originalSubmissionId });
      if (!work) {
        logger.info(`No work found with identifier or partyNo ${ack.originalSubmissionId}`);
        continue;
      }
      if (ack?.preferredIswc) {
        if (work.iswc && work.iswc !== ack.preferredIswc) {
          // Capture cases with an existing ISWC
          iswcErrors.push({
            error: 'Work already has an ISWC, update attempt detected',
            existingIswc: work.iswc,
            newIswc: ack.preferredIswc,
            work,
          });
          continue;
        }

        const iswcDuplicates = await Work.find({
          _id: { $ne: work._id },
          clientId: client._id,
          iswc: ack.preferredIswc,
        });

        if (iswcDuplicates?.length) {
          iswcErrors.push({
            error: 'Duplicate ISWCs detected in Acknowledgement file - a report has been emailed to you',
            iswcDuplicates,
            work,
          });
          continue;
        }

        work.iswc = ack.preferredIswc;
        work.isIswcIrsEligible = false;
        work.isIswcIasEligible = false;
        await work.save();
      }

      const iswcDeliveredWork = new IswcDeliveredWork({
        clientId: client._id.toString(),
        workId: work._id.toString(),
        iswcAcknowledgementId: iswcAcknowledgement?._id?.toString(),
        originalFileCreationDateTime: ack?.originalFileCreationDateTime,
        processingDate: ack?.processingDate,
        originalSubmissionId: ack?.originalSubmissionId,
        transactionStatus: ack?.transactionStatus,
        submissionId: ack?.submissionId,
        originalTransactionType: ack?.originalTransactionType,
        originalTitle: ack?.originalTitle,
        agency: ack?.agency,
        sourcedb: ack?.sourcedb,
        preferredIswc: ack?.preferredIswc,
        interestedParties: ack?.interestedParties,
        workcode: ack?.workcode,
        otherTitles: ack?.otherTitles,
        errorMessages: ack.errorMessages,
      });
      await iswcDeliveredWork.save();
    }

    if (iswcErrors.length && client.deliveryEmails.length) {
      for (const userId of client.deliveryEmails) {
        const user = await User.findById(userId);
        if (user) {
          await notifyISWCConflicts(
            iswcAcknowledgement,
            iswcErrors,
            '',
            user.email,
          );
        }
      }
    }

    logger.info(`${logIdentifier} : deleting file from ftp server - ${ftpFilePath}`);

    try {
      await ftp.connect();
      await ftp.deleteFile(ftpFilePath);
      await ftp.disconnect();
    } catch (err) {
      logger.error(`${logIdentifier} : Could not delete file from ftp server for ISWC Acknowledgement id - ${iswcAcknowledgement._id.toString()}`);
      logger.error(`${logIdentifier} : ${err}`);
    }
  }
  // Not Needed (When we upload to S3 deletes this anyway)
  // fs.unlinkSync(outputLocation);

  logger.info(`${logIdentifier} : process complete`);
};

module.exports = IswcAcknowledgementController;
