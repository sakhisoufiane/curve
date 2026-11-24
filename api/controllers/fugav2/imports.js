const fs = require('fs');
const csv = require('csv-parser');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { bulkSplitsService } = require('../../libs/splits');
const { updateTrack } = require('./helpers/import-export/db');
const { validateHeaders, validateRow, extractPayeesFromRow, validatePayees, formatTrackAsCSVRow, formatErrorAsCSVRow, createTrackCSVWriter, createErrorCSVWriter } = require('./helpers/import-export/csv');
const { uploadToS3, UPLOAD_TYPE } = require('./helpers/import-export/upload');
const sendNotification = require('./helpers/import-export/notification');

const importTracks = async ({ file, curveUser, client, bulkSplitsId }) => {
  const { clientId } = curveUser;

  try {
    await bulkSplitsService.markInProgress(bulkSplitsId, clientId);
  } catch (error) {
    logger.error('Failed to mark import as in progress:', error);
    throw error;
  }

  const csvImportPath = `${appRootDir}/tmp/splits_import_${moment().format('X')}.csv`;
  const csvErrorPath = `${appRootDir}/tmp/splits_import_errors_${moment().format('X')}.csv`;

  const trackWriter = createTrackCSVWriter(csvImportPath);
  const errorWriter = createErrorCSVWriter(csvErrorPath);

  let processingCount = 0;
  let endEmitted = false;

  let successCount = 0;
  let errorCount = 0;

  const stream = fs.createReadStream(file.path)
    .pipe(csv())
    .on('headers', (headers) => {
      stream.pause();
      try {
        validateHeaders(headers);
        logger.info('File headers validation passed; proceeding with tracks import.');
        stream.resume();
      } catch (error) {
        logger.error(`File headers validation failed: ${error}`);
        stream.destroy(error);
      }
    })
    .on('data', async (row) => {
      stream.pause();
      processingCount++;

      const result = await processRow({ row, clientId });

      if (result.success) {
        const csvRow = formatTrackAsCSVRow(result.track);
        trackWriter.write(csvRow);
        successCount++;
      } else {
        const csvRow = formatErrorAsCSVRow(result.track, result.errors);
        errorWriter.write(csvRow);
        errorCount++;
      }

      processingCount--;
      stream.resume();
      checkIfComplete();
    })
    .on('end', () => {
      endEmitted = true;
      checkIfComplete();
    })
    .on('error', async (error) => {
      trackWriter.end();
      errorWriter.end();

      logger.error('Import stream error:', error);
      await bulkSplitsService.markAsErrored(bulkSplitsId, clientId, {
        errorMessage: `Bulk splits import failed: ${error.message}`,
        errorCause: error.cause || 'BULK_SPLITS_IMPORT_FAILED',
      });
    });

  const checkIfComplete = async () => {
    if (endEmitted && processingCount === 0) {
      await handleStreamEnd();
    }
  };

  const handleStreamEnd = async () => {
    logger.info(`${successCount} tracks processed successfully. ${errorCount} tracks processed with errors.`);

    try {
      trackWriter.end();
      errorWriter.end();

      const [fileData, errorFileData] = await Promise.all([
        successCount ? uploadToS3(csvImportPath, curveUser, UPLOAD_TYPE.IMPORT) : { publicLink: null, s3Key: null },
        errorCount ? uploadToS3(csvErrorPath, curveUser, UPLOAD_TYPE.IMPORT) : { publicLink: null, s3Key: null },
      ]);

      await bulkSplitsService.markAsComplete({
        recordId: bulkSplitsId,
        clientId,
        fileData,
        errorFileData,
        updatedCount: successCount,
        totalCount: successCount + errorCount,
      });

      sendNotification({
        identifier: 'importDownload',
        curveUser,
        client,
        collectionName: 'Bulk Splits',
        publicLink: fileData.publicLink,
      });

      fs.unlinkSync(file.path);
    } catch (err) {
      logger.error('Error completing import:', err);
      await bulkSplitsService.markAsErrored(bulkSplitsId, clientId, {
        errorMessage: `Bulk splits import failed: ${err.message}`,
        errorCause: 'BULK_SPLITS_IMPORT_FAILED',
      });
    }
  };
};

const processRow = async ({ row, clientId }) => {
  try {
    validateRow(row);
    const payees = extractPayeesFromRow(row);
    validatePayees(payees);

    const track = await updateTrack({
      clientId,
      trackId: row.ID,
      payees,
    });

    return {
      success: true,
      track,
    };
  } catch (error) {
    logger.error(`Error processing row: ${error.message}`, error);
    const track = {
      id: row.ID || '',
      title: row['Asset Title'] || '',
      artist: row.Artists || '',
      alternativeId: row['Alternative ID'] || '',
      isrc: row.ISRC || '',
    };

    return {
      success: false,
      track,
      errors: [error.message],
    };
  }
};

module.exports = {
  importTracks,
};
