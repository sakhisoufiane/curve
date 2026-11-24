const { logger, fileManager, createZip, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const _ = require('lodash');
const { Page, UserAccess, WriteCsv, Exports } = require('@curveroyaltysystems/curve-shared-logic');
const config = require('@curveroyaltysystems/curve-shared-logic/config');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const DeliveryPartner = require('../../models/deliveryPartner');
const Payee = require('../../models/payee');
const IswcAcknowledgement = require('../../models/iswcAcknowledgement');
const IswcDeliveredWork = require('../../models/iswcDeliveredWork');
const Client = require('../../models/client');
const Notification = require('../../models/notification');

const IswcAcknowledgementController = this;

const paramsToFilterField = ({ inputParams, user }) => {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }

  if (inputParams?.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.name = { $regex: regex };
  }

  if (inputParams?.deliveryPartnerId) {
    params.deliveryPartnerId = inputParams.deliveryPartnerId;
  }

  if (inputParams?.outputFormat) {
    params.outputFormat = inputParams.outputFormat;
  }

  return params;
};

IswcAcknowledgementController.getIswcAcknowledgements = async ({ req, res }) => {
  if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const paginationParams = {
    page: Page.valueOrDefault(req.query.page, 1),
    limit: Page.valueOrDefault(req.query.limit, 25),
    sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
  };

  let result;
  try {
    result = await IswcAcknowledgement.paginate(paramsToFilterField({ inputParams: req.query, user: req.curveUser }), paginationParams);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }

  const iswcAcknowledgementsComplete = [];
  await async.eachLimit(result.docs, 10, async (iswcAcknowledgement) => {
    const iswcAcknowledgementComplete = JSON.parse(JSON.stringify(iswcAcknowledgement));
    const deliveryPartner = await DeliveryPartner.findById(iswcAcknowledgement.deliveryPartnerId);
    const iswcIn = await IswcDeliveredWork.countDocuments({
      clientId: req.curveUser.clientId,
      iswcAcknowledgementId: iswcAcknowledgement._id,
      transactionStatus: 'FullyAccepted',
    });
    const iswcMissing = await IswcDeliveredWork.countDocuments({
      clientId: req.curveUser.clientId,
      iswcAcknowledgementId: iswcAcknowledgement._id,
      transactionStatus: { $nin: ['FullyAccepted'] },
    });
    iswcAcknowledgementComplete.iswcIn = iswcIn;
    iswcAcknowledgementComplete.iswcMissing = iswcMissing;
    iswcAcknowledgementComplete.deliveryPartnerName = deliveryPartner?.name;
    iswcAcknowledgementsComplete.push(iswcAcknowledgementComplete);
  });

  res.status(200).json({ iswcAcknowledgements: iswcAcknowledgementsComplete, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
};

IswcAcknowledgementController.getIswcAcknowledgement = async ({ req, res }) => {
  let iswcAcknowledgement;
  try {
    iswcAcknowledgement = await IswcAcknowledgement.findById(req.params.id);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }

  if (!iswcAcknowledgement) {
    res.status(404).json({ message: `Could not find ISWC Acknowledgement with ID ${req.params.id}` });
    return;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'read', type: 'catalogue', document: iswcAcknowledgement, clientOnly: true })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const iswcComplete = await IswcDeliveredWork.countDocuments({
    clientId: req.curveUser.clientId,
    iswcAcknowledgementId: iswcAcknowledgement._id,
    transactionStatus: 'FullyAccepted',
  });
  const iswcRejected = await IswcDeliveredWork.countDocuments({
    clientId: req.curveUser.clientId,
    iswcAcknowledgementId: iswcAcknowledgement._id,
    transactionStatus: 'Rejected',
  });
  const iswcIncomplete = await IswcDeliveredWork.countDocuments({
    clientId: req.curveUser.clientId,
    iswcAcknowledgementId: iswcAcknowledgement._id,
    transactionStatus: { $nin: ['FullyAccepted', 'Rejected'] },
  });
  iswcAcknowledgement = JSON.parse(JSON.stringify(iswcAcknowledgement));
  iswcAcknowledgement.iswcComplete = iswcComplete;
  iswcAcknowledgement.iswcRejected = iswcRejected;
  iswcAcknowledgement.iswcIncomplete = iswcIncomplete;

  fileManager.publicS3Link(iswcAcknowledgement.publicKeyS3, (err, publicLink) => {
    iswcAcknowledgement.publicLink = publicLink;
    res.status(200).json(iswcAcknowledgement);
  });
};

IswcAcknowledgementController.deleteBulkIswcAcknowledgementy = async ({ req, res }) => {
  if (!req?.body?.ids?.length) {
    res.status(404).json({ message: 'Missing ISWC Acknowledgement ids' });
    return;
  }

  if (!(req.curveUser.clientId && ['Edit'].includes(req.curveUser.rights?.[req.curveUser.clientId]?.catalogue))) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const ids = req.body.ids.map((id) => new ObjectId(id));
  let iswcAcknowledgements;
  try {
    iswcAcknowledgements = await IswcAcknowledgement.find({ clientId: req.curveUser.clientId, _id: { $in: ids } });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }

  await async.eachLimit(iswcAcknowledgements, 10, async (iswcAcknowledgement) => {
    try {
      await iswcAcknowledgement.deleteOne();
    } catch (err) {
      logger.error(err);
    }
  });

  res.status(200).json(ids);
};

IswcAcknowledgementController.deleteIswcAcknowledgement = async ({ req, res }) => {
  let foundIswcAcknowledgement;
  try {
    foundIswcAcknowledgement = await IswcAcknowledgement.findById(req.params.id);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  if (!foundIswcAcknowledgement) {
    res.status(404).json({ message: `Could not find ISWC Acknowledgement with ID ${req.params.id}` });
    return;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'write', type: 'catalogue', document: foundIswcAcknowledgement, clientOnly: true })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    await foundIswcAcknowledgement.deleteOne();
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  res.status(200).json(foundIswcAcknowledgement);
};

IswcAcknowledgementController.getIswcAcknowledgementWorks = async ({ req, res, forExport }) => {
  const { curveUser, params, query } = req;

  let foundIswcAcknowledgement;
  try {
    foundIswcAcknowledgement = await IswcAcknowledgement.findById(params.id);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }
  if (!foundIswcAcknowledgement) {
    res.status(404).json({ message: `Could not find ISWC Acknowledgement with ID ${req.params.id}` });
    return;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: req.curveUser, operation: 'read', type: 'catalogue', document: foundIswcAcknowledgement, clientOnly: true })) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: Page.sortOrDefault(query.orderBy, query.orderDir),
    orderBy: query.orderBy,
    orderDir: query.orderDir,
  };

  const worksAggregation = [
    {
      $match: {
        clientId: curveUser.clientId,
        iswcAcknowledgementId: foundIswcAcknowledgement._id,
      },
    },
    {
      $sort: {
        workId: 1,
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: '$workId',
        doc: { $first: '$$ROOT' },
      },
    },
    {
      $replaceRoot: {
        newRoot: '$doc',
      },
    },
    {
      $lookup:
        {
          from: 'works',
          localField: 'workId',
          foreignField: '_id',
          as: 'work',
          pipeline: [{
            $project: {
              title: 1,
              composer: 1,
              identifier: 1,
            },
          }],
        },
    },
    {
      $unwind: '$workId',
    },
  ];
  if (query.transactionStatus) {
    worksAggregation[0].$match.transactionStatus = query.transactionStatus;
  }

  if (forExport) {
    return worksAggregation;
  }

  if (paginationParams?.orderBy && paginationParams?.orderDir) {
    worksAggregation.push({
      $sort: { [paginationParams.orderBy]: paginationParams.orderDir === 'desc' ? -1 : 1 },
    });
  }

  paginationParams.limit = paginationParams.limit || 25;
  worksAggregation.push({
    $facet: {
      deliveredWorks: [{ $skip: (paginationParams.page - 1 < 0 ? 0 : paginationParams.page - 1) * paginationParams.limit }, { $limit: paginationParams.limit }],
      total: [{ $count: 'count' }],
    },
  });

  let results;
  try {
    results = await IswcDeliveredWork.aggregate(worksAggregation);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
    return;
  }

  const total = results[0]?.total?.[0]?.count || 0;
  const pagination = {
    deliveredWorks: results[0]?.deliveredWorks,
    meta: {
      currentPage: paginationParams.page,
      totalPages: Math.ceil(total / paginationParams.limit),
      total,
    },
  };
  res.status(200).json(pagination);
};

// Main export function
IswcAcknowledgementController.exportIswcAcknowledgement = async ({ req, res }) => {
  if (!UserAccess.allowReadAccessToAll({ user: req.curveUser, type: 'catalogue' })) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Assign properties from req.body to req.query and req.params to ensure the getIswcAcknowledgementWorks function works correctly for both POST and GET requests
  req.params.id = req.body.id;
  if (req.body?.transactionStatus) {
    req.query.transactionStatus = req.body.transactionStatus;
  }
  const batchSize = 1000;
  const timestamp = moment().format('X');
  const formattedDate = moment().format('YYYYMMDDHHmmssSSS');
  const csvFilePath = `${appRootDir}/tmp/ISWC Acknowledgement Export ${timestamp}.csv`;

  try {
    // Fetch the initial aggregation pipeline
    const initialWorksAggregation = await IswcAcknowledgementController.getIswcAcknowledgementWorks({ req, res, forExport: true });
    // Check the total count of works
    const totalAggregation = [...initialWorksAggregation, { $count: 'total' }];
    const totalResults = await IswcDeliveredWork.aggregate(totalAggregation);
    const totalCount = totalResults[0]?.total || 0;
    const client = await Client.findById(req.curveUser.clientId, 'name');

    // Send immediate response
    res.status(200).json({ message: 'Your report will be sent to you via email shortly' });

    // Determine the export type based on total count
    if (totalCount < 1000) {
      logger.debug('Total count is less than 1000, calling createXlsxExport');
      // Run XLSX export in the background
      await createXlsxExport(client, req.curveUser, initialWorksAggregation);
    } else {
      // Otherwise, run the CSV export process in the background
      const overviewWriter = new WriteCsv({
        headers: config.importTemplates.iswcAcknowledgement.map((header) => header.name),
        outputLocation: csvFilePath,
      });

      await createCsvExport(client, req.curveUser, null, initialWorksAggregation, batchSize, overviewWriter, csvFilePath, formattedDate);
    }
  } catch (error) {
    logger.error(`Failed to start export process: ${error.message}`);
    return res.status(500).json({ message: 'Failed to start export process, please try again.' });
  }
};

// Function to handle XLSX export
async function createXlsxExport(client, curveUser, worksAggregation) {
  try {
    const iswcAckWorksBatch = await IswcDeliveredWork.aggregate(worksAggregation);
    const template = await Exports.getTemplate({ Client, templateName: 'iswcAcknowledgement', clientId: client._id.toString() });
    const outputData = iswcAckWorksBatch.map((line) => [line.work[0]._id.toString(), line.work[0].title, line.work[0].composer, line.work[0].identifier, line.preferredIswc, line.transactionStatus, line?.errorMessages?.message]);

    // Create the Excel file and save it locally
    const output = await new Promise((resolve, reject) => {
      createXlsx.createInTemplate([outputData], template, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    logger.info(`XLSX Export completed successfully: ${output}`);

    // Upload the Excel file to S3
    const s3Key = `exports/${client._id.toString()}/ISWC_Acknowledgement_Export_${Date.now()}.xlsx`;
    const s3Link = await uploadToS3AndGetLink(s3Key, output);
    // Send success notification with the S3 link
    await sendNotification(client, curveUser, 'success', `Your ISWC Acknowledgement Export for ${client.name} is Ready to Download`, s3Link);
  } catch (error) {
    logger.error(`Error during XLSX export process: ${error.message}`);
    await sendNotification(client, curveUser, 'error', 'Your ISWC Acknowledgement Export has errored', error.message);
  }
}

// Helper function to upload to S3 and get a public link
async function uploadToS3AndGetLink(s3Key, filePath) {
  await new Promise((resolve, reject) => {
    fileManager.uploadToS3(s3Key, filePath, (err) => {
      if (err) {
        logger.error(`Error uploading to S3: ${err.message}`);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // Generate a public link for 24 hours
  return new Promise((resolve, reject) => {
    fileManager.publicLink24Hours(s3Key, (err, link) => {
      if (err) {
        logger.error(`Error generating public link: ${err.message}`);
        reject(err);
      } else {
        resolve(link);
      }
    });
  });
}

// Function to handle CSV export
async function createCsvExport(client, curveUser, lastId, worksAggregation, batchSize, overviewWriter, csvFilePath, formattedDate) {
  try {
    await runCsvExport(client, curveUser, lastId, worksAggregation, batchSize, overviewWriter, csvFilePath, formattedDate);
    await new Promise((resolve, reject) => {
      overviewWriter.write((err) => {
        if (err) {
          logger.error(`Error finalizing CSV: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const zipLocation = `${appRootDir}/tmp/ISWC Acknowledgement ${formattedDate}.zip`;
    await new Promise((resolve, reject) => {
      createZip.localFiles([csvFilePath], zipLocation, (err) => {
        if (err) {
          logger.error(`Error zipping files: ${err.message}`);
          reject(err);
        } else {
          logger.debug(`Files zipped successfully at ${zipLocation}`);
          resolve();
        }
      });
    });

    const s3Key = `exports/${client._id.toString()} ISWC Acknowledgement Export ${formattedDate}.${zipLocation.split('.').pop()}`;
    const link = await uploadToS3AndGetLink(s3Key, zipLocation);
    logger.info(`CSV Export completed successfully: ${link}`);
    await sendNotification(client, curveUser, 'success', `Your ISWC Acknowledgement Export for ${client.name} is Ready to Download`, link);
  } catch (err) {
    logger.error(`Error during CSV export process: ${err.message}`);
    await sendNotification(client, curveUser, 'error', 'Your ISWC Acknowledgement Export has errored', err.message);
  }
}

async function runCsvExport(client, curveUser, lastId, worksAggregation, batchSize, overviewWriter, csvFilePath, formattedDate) {
  // Create a fresh copy of the aggregation for each recursive call
  const newAggregation = [...worksAggregation];

  // Add match stage if lastId is present
  if (lastId) {
    newAggregation.unshift({ $match: { _id: { $gt: lastId } } });
  }

  // Add sorting, limiting, and facet stages
  newAggregation.push({ $sort: { _id: 1 } }, { $limit: batchSize }, { $facet: { deliveredWorks: [{ $limit: batchSize }], total: [{ $count: 'count' }] } });

  // Fetch the next batch
  const iswcAckWorksBatch = await IswcDeliveredWork.aggregate(newAggregation);

  // Check if the current batch is empty
  if (iswcAckWorksBatch[0].deliveredWorks.length === 0) {
    logger.info('All batches have been processed.');
    return;
  }

  // Prepare the data for CSV
  const outputData = iswcAckWorksBatch[0].deliveredWorks.map((line) => [line.work[0]._id.toString(), line.work[0].title, line.work[0].composer, line.work[0].identifier, line.preferredIswc, line.transactionStatus, line?.errorMessages?.message]);

  // Append data to the single CSV file
  await new Promise((resolve, reject) => {
    overviewWriter.addData(outputData, (err) => {
      if (err) {
        logger.error(`Error adding data: ${err.message}`);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // Update lastId and recursively call to process the next batch if available
  const newLastId = iswcAckWorksBatch[0].deliveredWorks[iswcAckWorksBatch[0].deliveredWorks.length - 1]._id;
  await createCsvExport(client, curveUser, newLastId, worksAggregation, batchSize, overviewWriter, csvFilePath, formattedDate);
}

// Helper function to send notifications
async function sendNotification(client, curveUser, type, subject, messageOrLink) {
  if (!client) return;

  const generateOptions = { identifier: type === 'success' ? 'exportDownload' : 'exportError', curveUser, client, subject, ...(type === 'success' ? { link: messageOrLink } : { error: messageOrLink }) };

  await new Promise((resolve, reject) => {
    Notification.generate(subject, type === 'success' ? `Your ISWC Acknowledgement Export for ${client.name} is Ready to Download` : messageOrLink, type === 'success' ? messageOrLink : null, curveUser, generateOptions, (err) => {
      if (err) {
        logger.error(`Error generating ${type} notification: ${err.message}`);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = IswcAcknowledgementController;
