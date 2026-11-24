/* eslint-disable no-await-in-loop */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { chunk } = require('lodash');
const fs = require('fs');
const { Types } = require('mongoose');
const Client = require('../../models/client');
const UnmappedWork = require('../../models/unmappedWork');
const UnmappedRelease = require('../../models/unmappedRelease');
const UnmappedTrack = require('../../models/unmappedTrack');
const Notification = require('../../models/notification');
const CsvExports = require('../exports/csv');

// Valid unmapped types
const UNMAPPED_TYPES = {
  work: 'work',
  release: 'release',
  track: 'track',
};

// Model mapping by type
const MODELS = {
  [UNMAPPED_TYPES.work]: UnmappedWork,
  [UNMAPPED_TYPES.release]: UnmappedRelease,
  [UNMAPPED_TYPES.track]: UnmappedTrack,
};

// CSV headers for each type
const HEADERS = {
  [UNMAPPED_TYPES.work]: [
    'Salesfile ID',
    'Title',
    'Source',
    'ISWC',
    'Tunecode',
    'Song Code',
    'Identifier',
    'Party 1',
    'Party 2',
    'Party 3',
    'Party 4',
    'Party 5',
    'Net Value',
  ],
  [UNMAPPED_TYPES.release]: [
    'Salesfile ID',
    'Title',
    'Artist',
    'Cat No',
    'Barcode',
  ],
  [UNMAPPED_TYPES.track]: [
    'Salesfile ID',
    'Title',
    'Artist',
    'ISRC',
  ],
};

// Display names for notifications
const DISPLAY_NAMES = {
  [UNMAPPED_TYPES.work]: 'Unmapped Works',
  [UNMAPPED_TYPES.release]: 'Unmapped Releases',
  [UNMAPPED_TYPES.track]: 'Unmapped Tracks',
};

// Number of records to process per batch
const BATCH_SIZE = 10_000;

/**
 * Export unmapped records (Works, Releases, or Tracks) to CSV
 * @param {Object} params
 * @param {string} params.clientId - Client ID
 * @param {string} params.type - Type of unmapped records ('work', 'release', 'track')
 * @param {string[]} params.ids - Array of record IDs to export
 * @param {string} params.email - Email address to send notification to
 * @param {Object} params.filter - Mongo filter for works to export
 */
async function exportUnmapped({ clientId, type, email, selector }) {
  const logKey = `${clientId} | Export ${DISPLAY_NAMES[type]} |`;
  const ids = selector?.ids || [];

  // Validate type
  if (!UNMAPPED_TYPES[type]) {
    throw new Error(`Invalid unmapped type: ${type}. Must be one of: ${Object.keys(UNMAPPED_TYPES).join(', ')}`);
  }

  const client = await Client.findById(clientId);
  if (!client) {
    logger.error(logKey, 'Client not found with ID:', clientId);
    throw new Error(`Client with ID ${clientId} not found`);
  }
  const idsPresent = ids.length > 0 ? ids.length : 'all';
  const Model = MODELS[type];
  const headers = HEADERS[type];
  const displayName = DISPLAY_NAMES[type];
  logger.info(logKey, 'Exporting', idsPresent, 'records of type:', displayName);

  try {
    const filePath = await createCsvExport({
      logKey,
      clientId,
      ids,
      type,
      headers,
      displayName,
      Model,
      selector,
    });

    logger.info(logKey, 'Export file created at:', filePath);

    const s3Path = `exports/${client.name} ${displayName} Export ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
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
    await sendNotification({
      client,
      email,
      displayName,
      url: downloadUrl,
      isError: false,
    });

    // Clean up local file
    fs.unlink(filePath, (err) => {
      if (err) logger.error(logKey, 'Error deleting local file:', err);
    });
  } catch (err) {
    logger.error(logKey, err);
    logger.info(logKey, 'Sending error notification to:', email);
    await sendNotification({
      client,
      email,
      displayName,
      url: null,
      isError: true,
    });
    throw err;
  }
}

/**
 * Create a CSV export file for unmapped records
 * @param {Object} params
 * @param {string} params.logKey - Log key prefix
 * @param {Object} params.clientId - Client ID
 * @param {string[]} params.ids - Array of record IDs
 * @param {string} params.type - Type of unmapped records
 * @param {Object} params.filter - Mongoose filter
 * @param {string[]} params.headers - CSV headers
 * @param {string} params.displayName - Display name for logging
 * @param {Model} params.Model - Mongoose model
 * @returns {Promise<string>} - Path to CSV file
 */
async function createCsvExport({ logKey, clientId, type, headers, displayName, Model, selector }) {
  logger.info(logKey, `Exporting ${displayName} in format: CSV`);

  const currentDate = moment().format('X');
  const filePath = `${appRootDir}/tmp/${displayName} Export - ${currentDate}.csv`;

  const csvStream = CsvExports.createStream(filePath, headers);
  // Need special exemption for works Model due to it having duplicates and needing aggregation
  let recordsToExport = [];
  const { filter } = selector;
  if (Model === UnmappedWork) {
    const group = { $group:
    // Keeping each doc unique via identifier and source
    // { _id: { identifier: '$identifier', source: '$source' },
    // There could be instances where the title and or part is different, we want to just display the first doc fields
{ _id: { salesFileId: '$salesFileId', source: '$source', title: '$title' },
  title: { $first: '$title' },
  source: { $first: '$source' },
  identifier: { $push: '$identifier' },
  ids: { $push: '$_id' },
  iswc: { $push: '$iswc' },
  tunecode: { $push: '$tunecode' },
  songcode: { $push: '$songcode' },
  party1: { $push: '$party1' },
  party2: { $push: '$party2' },
  party3: { $push: '$party3' },
  party4: { $push: '$party4' },
  party5: { $push: '$party5' },
  workId: { $push: '$workId' },
  netValue: { $sum: '$netAmount' },
  salesFileId: { $first: '$salesFileId' },
},
    };
    if (filter) {
      // Aggregate Query
      const aggregation = [
        { $match: { ...filter, clientId: clientId.toString() } },
        group,
      ];

      recordsToExport = await UnmappedWork.aggregate(aggregation).catch(logger.error);
    } else {
      const objectIds = selector.ids.map((id) => new Types.ObjectId(id));
      // Aggregate Query
      const aggregation = [
        {
          $match: {
            _id: { $in: objectIds },
            clientId: clientId.toString(),
          },
        },
        group,
      ];

      recordsToExport = await UnmappedWork.aggregate(aggregation).catch(logger.error);
    }
  } else if (filter) {
    recordsToExport = await Model.find({ ...filter, clientId: clientId.toString() }).lean();
  } else {
    const objectIds = selector.ids.map((id) => new Types.ObjectId(id));
    recordsToExport = await Model.find({ _id: { $in: objectIds }, clientId: clientId.toString() }).lean();
  }

  for (const record of recordsToExport) {
    const row = convertRecordToRow(record, type);
    CsvExports.writeCsvLine(csvStream, row);
  }

  await CsvExports.closeStream(csvStream);

  return filePath;
}

/**
 * Convert a record to a CSV row based on its type
 * @param {Object} record - The database record
 * @param {string} type - The type of record
 * @returns {string[]} - Array of values for CSV row
 */
function toUniqueStr(val) {
  if (!Array.isArray(val)) return (val || '').trim();
  const unique = [...new Set(val.map((v) => (v == null ? '' : String(v).trim())).filter(Boolean))];
  return unique.join(', ');
}

function convertRecordToRow(record, type) {
  switch (type) {
    case UNMAPPED_TYPES.work:
      return [
        record.salesFileId || '',
        record.title || '',
        record.source || '',
        toUniqueStr(record.iswc),
        toUniqueStr(record.tunecode),
        toUniqueStr(record.songcode),
        toUniqueStr(record.identifier),
        toUniqueStr(record.party1),
        toUniqueStr(record.party2),
        toUniqueStr(record.party3),
        toUniqueStr(record.party4),
        toUniqueStr(record.party5),
        record.netValue ?? '',
      ];
    case UNMAPPED_TYPES.release:
      return [
        record.salesFileId || '',
        record.title || '',
        record.artist || '',
        record.catNo || '',
        record.barcode || '',
      ];
    case UNMAPPED_TYPES.track:
      return [
        record.salesFileId || '',
        record.title || '',
        record.artist || '',
        record.isrc || '',
      ];
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

/**
 * Send notification for unmapped export
 * @param {Object} params
 * @param {Object} params.client - Client object
 * @param {string} params.email - Email address
 * @param {string} params.displayName - Display name for the export type
 * @param {string|null} params.url - Download URL (null if error)
 * @param {boolean} params.isError - Whether this is an error notification
 * @param {string} [params.errorMessage] - Custom error message
 */
async function sendNotification({ client, email, displayName, url, isError, errorMessage }) {
  if (isError) {
    const subject = `Your Unmapped Export for ${client.name} Has Errored`;
    const options = {
      identifier: 'genericError',
      client,
      subject,
      email,
      mainText: errorMessage || 'There was an error while generating your export. Please try again later or contact support if the issue persists.',
    };
    return new Promise((resolve, reject) => {
      Notification.generate(subject, subject, null, options, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  const subject = `Your Unmapped Export for ${client.name} is Ready to Download`;
  const options = {
    identifier: 'unmappedExportDownload',
    client,
    subject,
    email,
    link: url,
  };
  await new Promise((resolve, reject) => {
    Notification.generate(`${displayName} Export Ready`, subject, url, options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  exportUnmapped,
  UNMAPPED_TYPES,
  HEADERS,
  DISPLAY_NAMES,
  toUniqueStr,
};
