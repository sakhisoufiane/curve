/* eslint-disable no-await-in-loop */
const { fileManager, logger, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { keyBy } = require('lodash');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const Client = require('../../models/client');
const Work = require('../../models/work');
const DeliveryPartner = require('../../models/deliveryPartner');
const Track = require('../../models/track');
const Contract = require('../../models/contract');
const TerritoryGroup = require('../../models/territoryGroup');
const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');
const ExportNotification = require('../exportNotification/exportNotification');
const WorksXlsx = require('./xlsx');
const {
  workHeaders,
  workLiteHeaders,
  alternateTitlesHeaders,
  participatorsHeaders,
  specificParticipationRatesHeaders,
  societyIdentifiersHeaders,
  ipChainHeaders,
  partnerIpChainsHeaders,
} = require('./csvHeaders');
const CsvExports = require('../exports/csv');

// Threshold to decide between XLSX and CSV export (>= this number uses CSV)
const CSV_EXPORT_THRESHOLD = 1000;

// Log progress every 10,000 items
const LOG_INTERVAL = 10_000;

/**
 * Export Works for a given client based on filter and send notification email
 * @param {Object} params
 * @param {string} params.clientId - Client ID
 * @param {Object} params.filter - Mongoose filter to get Works to export
 * @param {string} params.email - Email address to send notification to
 */
async function exportWorks({ clientId, filter, email }) {
  const logKey = `${clientId} | Export Works |`;

  const client = await Client.findById(clientId);
  if (!client) {
    logger.error(logKey, 'Client not found with ID:', clientId);
    throw new Error(`Client with ID ${clientId} not found`);
  }

  // Add clientId to the filter, in case it is missing, to ensure we only fetch Works for the supplied client
  const filterWithClientId = { ...filter, clientId: filter?.clientId || clientId };
  logger.info(logKey, 'Fetching Works with filter:', filterWithClientId);

  const worksCount = await Work.countDocuments(filterWithClientId);
  logger.info(logKey, 'Total Works to export:', worksCount);

  try {
    const filePath = worksCount < CSV_EXPORT_THRESHOLD
      ? await createXlsxExport({ logKey, client, filter: filterWithClientId })
      : await createCsvExport({ logKey, client, filter: filterWithClientId, worksCount });

    logger.info(logKey, 'Export file created at:', filePath);

    const s3Path = `exports/${client.name} Work Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`;
    const s3Key = await new Promise((resolve, reject) => {
      fileManager.uploadToS3(s3Path, filePath, (err, key) => {
        if (err) reject(err);
        resolve(key);
      });
    });

    const downloadUrl = await new Promise((resolve, reject) => {
      fileManager.publicLink24Hours(s3Key, (err, url) => {
        if (err) reject(err);
        resolve(url);
      });
    });

    logger.info(logKey, 'Sending download notification to:', email);
    await ExportNotification.sendWorksExportNotification({
      client,
      email,
      url: downloadUrl,
      isError: false,
    });
  } catch (err) {
    logger.error(logKey, err);
    logger.info(logKey, 'Sending error notification to:', email);
    await ExportNotification.sendWorksExportNotification({
      client,
      email,
      url: null,
      isError: true,
    });
    throw err;
  }
}

/**
 * Fetch related data needed for Works export
 * @param {Object} params
 * @param {Object} params.client - Client object
 * @returns {Promise<Object>} - Related export data
 */
async function getWorksExportData({ client }) {
  const clientId = client._id.toString();

  const [contracts, territoryGroups, tracks, composers, publishers, deliveryPartners] = await Promise.all([
    Contract
      .find({ clientId })
      .select({ _id: 1, name: 1 })
      .lean(),
    TerritoryGroup
      .find({ clientId })
      .select({ _id: 1, name: 1 })
      .lean(),
    Track
      .find({ clientId })
      .select({ _id: 1, isrc: 1 })
      .lean(),
    Composer
      .find({ clientId })
      .select({ _id: 1, name: 1, firstName: 1, middleNames: 1, surname: 1, cae: 1 })
      .lean(),
    Publisher
      .find({ clientId })
      .select({ _id: 1, name: 1, cae: 1 })
      .lean(),
    (async () => {
      if (client?.features?.partnerChains) {
        return DeliveryPartner
          .find({ clientId })
          .select({ _id: 1, name: 1 })
          .lean();
      }
      return Promise.resolve([]);
    })(),
  ]);

  const contractsById = keyBy(contracts, (contract) => contract._id.toString());
  const territoryGroupsById = keyBy(territoryGroups, (group) => group._id.toString());
  const composersById = keyBy(composers, (composer) => composer._id.toString());
  const publishersById = keyBy(publishers, (publisher) => publisher._id.toString());
  const deliveryPartnersById = keyBy(deliveryPartners, (partner) => partner._id.toString());

  const trackIsrcsById = {};
  for (const track of tracks) trackIsrcsById[track._id.toString()] = track.isrc;

  return {
    contractsById,
    territoryGroupsById,
    composersById,
    publishersById,
    deliveryPartnersById,
    trackIsrcsById,
  };
}

/**
 * Create an XLSX export of Works
 * @param {Object} params
 * @param {string} params.logKey - Log key prefix
 * @param {Object} params.client - Client object
 * @param {Object} params.filter - Mongoose filter to get Works to export
 * @returns {Promise<string>} - Path to XLSX file
 */
async function createXlsxExport({ logKey, client, filter }) {
  logger.info(logKey, 'Exporting works in format: XLSX');

  logger.info(logKey, 'Fetching related export data...');
  const worksExportData = await getWorksExportData({ client });

  const works = await Work.find(filter)
    .catch((err) => {
      logger.error('Error fetching works with filter:', filter, err);
      throw err;
    });

  const worksExcelFormat = WorksXlsx.convertWorks({ logKey, client, works, ...worksExportData });

  const template = await Exports.getTemplate({ Client, templateName: 'work', clientId: client._id.toString() });

  const partnerChainsEnabled = !!client.features?.partnerChains;
  const sheetCount = partnerChainsEnabled ? 7 : 6;
  const exportData = worksExcelFormat.slice(0, sheetCount);

  return new Promise((resolve, reject) => {
    createXlsx.createInTemplate(exportData, template, (err, filePath) => {
      if (err) {
        logger.error(logKey, 'Error creating XLSX export with template:', err);
        return reject(err);
      }
      return resolve(filePath);
    });
  });
}

/**
 * Create a CSV export of Works
 * @param {Object} params
 * @param {string} params.logKey - Log key prefix
 * @param {Object} params.client - Client object
 * @param {Object} params.filter - Mongoose filter to get Works to export
 * @param {number} params.worksCount - Total number of Works to export
 * @returns {Promise<string>} - Path to ZIP file containing CSV exports
 */
async function createCsvExport({ logKey, client, filter, worksCount }) {
  logger.info(logKey, 'Exporting works in format: CSV');

  logger.info(logKey, 'Fetching related export data...');
  const worksExportData = await getWorksExportData({ client });

  logger.info(logKey, 'Contracts:', Object.keys(worksExportData.contractsById).length);
  logger.info(logKey, 'Territory Groups:', Object.keys(worksExportData.territoryGroupsById).length);
  logger.info(logKey, 'Composers:', Object.keys(worksExportData.composersById).length);
  logger.info(logKey, 'Publishers:', Object.keys(worksExportData.publishersById).length);
  logger.info(logKey, 'Delivery Partners:', Object.keys(worksExportData.deliveryPartnersById).length);
  logger.info(logKey, 'Tracks:', Object.keys(worksExportData.trackIsrcsById).length);

  const partnerChainsEnabled = !!client?.features?.partnerChains;
  const currentDate = moment().format('X');

  const filePath = `${appRootDir}/tmp/Work Export - ${currentDate}`;
  const headers = client.paymentTier !== 'Lite' ? workHeaders : workLiteHeaders;

  const worksFilePath = `${filePath}.csv`;
  const alternateTitlesFilePath = `${filePath} - alternateTitles.csv`;
  const participatorsFilePath = `${filePath} - participators.csv`;
  const specificParticipationRatesFilePath = `${filePath} - specificParticipationRates.csv`;
  const societyIdentifiersFilePath = `${filePath} - societyIdentifiers.csv`;
  const ipChainFilePath = `${filePath} - ipChain.csv`;
  const partnerIpChainsFilePath = `${filePath} - partnerIpChains.csv`;

  const worksCsvStream = CsvExports.createStream(worksFilePath, headers);
  const alternateTitlesCsvStream = CsvExports.createStream(alternateTitlesFilePath, alternateTitlesHeaders);
  const participatorsCsvStream = CsvExports.createStream(participatorsFilePath, participatorsHeaders);
  const specificParticipationRatesCsvStream = CsvExports.createStream(specificParticipationRatesFilePath, specificParticipationRatesHeaders);
  const societyIdentifiersCsvStream = CsvExports.createStream(societyIdentifiersFilePath, societyIdentifiersHeaders);
  const ipChainCsvStream = CsvExports.createStream(ipChainFilePath, ipChainHeaders);
  const partnerIpChainsCsvStream = partnerChainsEnabled && CsvExports.createStream(partnerIpChainsFilePath, partnerIpChainsHeaders);

  let worksProcessed = 0;

  const worksCursor = await Work.find(filter).lean().cursor();

  logger.info(logKey, 'Converting Works to export format and writing to CSV files...');
  for await (const work of worksCursor) {
    const [works, titles, participators, rights, identifiers, rightsChains, partnerRightsChains] = WorksXlsx.convertWorks({
      client,
      works: [work],
      ...worksExportData,
    });

    for (const work of works) CsvExports.writeCsvLine(worksCsvStream, work);
    for (const title of titles) CsvExports.writeCsvLine(alternateTitlesCsvStream, title);
    for (const participator of participators) CsvExports.writeCsvLine(participatorsCsvStream, participator);
    for (const identifier of identifiers) CsvExports.writeCsvLine(societyIdentifiersCsvStream, identifier);
    for (const rate of rights) CsvExports.writeCsvLine(specificParticipationRatesCsvStream, rate);
    for (const rightsChain of rightsChains) CsvExports.writeCsvLine(ipChainCsvStream, rightsChain);
    if (partnerChainsEnabled) {
      for (const partnerRightsChain of partnerRightsChains) {
        CsvExports.writeCsvLine(partnerIpChainsCsvStream, partnerRightsChain);
      }
    }
    worksProcessed += 1;
    if (worksProcessed % LOG_INTERVAL === 0) {
      logger.info(logKey, `Processed ${worksProcessed.toLocaleString()} of ${worksCount.toLocaleString()} works (${((worksProcessed / worksCount) * 100).toFixed(2)}%)`);
    }
  }
  await CsvExports.closeStream(worksCsvStream);
  await CsvExports.closeStream(alternateTitlesCsvStream);
  await CsvExports.closeStream(participatorsCsvStream);
  await CsvExports.closeStream(specificParticipationRatesCsvStream);
  await CsvExports.closeStream(societyIdentifiersCsvStream);
  await CsvExports.closeStream(ipChainCsvStream);
  if (partnerChainsEnabled) {
    await CsvExports.closeStream(partnerIpChainsCsvStream);
  }

  const allFilesZipPath = `${filePath}.zip`;
  const outputStream = fs.createWriteStream(allFilesZipPath);
  const zipStream = archiver('zip', { zlib: { level: 9 } });
  zipStream.pipe(outputStream);

  zipStream.append(fs.createReadStream(worksFilePath), { name: path.basename(worksFilePath) });
  zipStream.append(fs.createReadStream(alternateTitlesFilePath), { name: path.basename(alternateTitlesFilePath) });
  zipStream.append(fs.createReadStream(participatorsFilePath), { name: path.basename(participatorsFilePath) });
  zipStream.append(fs.createReadStream(specificParticipationRatesFilePath), { name: path.basename(specificParticipationRatesFilePath) });
  zipStream.append(fs.createReadStream(societyIdentifiersFilePath), { name: path.basename(societyIdentifiersFilePath) });
  zipStream.append(fs.createReadStream(ipChainFilePath), { name: path.basename(ipChainFilePath) });
  if (partnerChainsEnabled) {
    zipStream.append(fs.createReadStream(partnerIpChainsFilePath), { name: path.basename(partnerIpChainsFilePath) });
  }

  await zipStream.finalize();

  const zipFinished = new Promise((resolve, reject) => {
    const onFinish = () => {
      outputStream.removeListener('error', onError);
      resolve();
    };
    const onError = (err) => {
      outputStream.removeListener('finish', onFinish);
      reject(err);
    };
    outputStream.once('finish', onFinish);
    outputStream.once('error', onError);
  });

  outputStream.end();
  await zipFinished;

  return allFilesZipPath;
}

module.exports = {
  exportWorks,
};
