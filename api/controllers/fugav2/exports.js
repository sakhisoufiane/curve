const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const Track = require('../../models/track');
const { bulkSplitsService } = require('../../libs/splits');

const { getTrackData } = require('./helpers/import-export/db');
const { formatTrackAsCSVRow, formatErrorAsCSVRow, createTrackCSVWriter, createErrorCSVWriter } = require('./helpers/import-export/csv');
const { uploadToS3, UPLOAD_TYPE } = require('./helpers/import-export/upload');
const sendNotification = require('./helpers/import-export/notification');

const exportTracks = async ({ trackIds, bulkSplitsId, curveUser, client }) => {
  const startTime = Date.now();
  logger.info(`Starting export for ${trackIds.length} tracks`);

  try {
    await bulkSplitsService.markInProgress(bulkSplitsId, curveUser.clientId);

    const csvExportPath = `${appRootDir}/tmp/splits_export_${moment().format('X')}.csv`;
    const csvErrorPath = `${appRootDir}/tmp/splits_export_errors_${moment().format('X')}.csv`;

    const trackWriter = createTrackCSVWriter(csvExportPath);
    const errorWriter = createErrorCSVWriter(csvErrorPath);

    const cursor = Track.find({ _id: { $in: trackIds } })
      .select('title artist isrc alternativeId salesReturnsRights')
      .cursor({ batchSize: 1000 });

    let processedCount = 0;
    let errorCount = 0;

    for await (const doc of cursor) {
      const result = await getTrackData(doc);

      if (result.success) {
        const csvRow = formatTrackAsCSVRow(result.track);
        trackWriter.write(csvRow);
        processedCount++;
      } else {
        const csvRow = formatErrorAsCSVRow(result.track, result.errors);
        errorWriter.write(csvRow);
        errorCount++;
      }

      if (processedCount % 1000 === 0) {
        logger.debug(`Processed ${processedCount}/${trackIds.length} tracks`);
      }
    }

    trackWriter.end();
    errorWriter.end();

    logger.info(`CSV generation completed: ${processedCount} tracks processed`);

    const [fileData, errorFileData] = await Promise.all([
      processedCount ? uploadToS3(csvExportPath, curveUser, UPLOAD_TYPE.EXPORT) : { publicLink: null, s3Key: null },
      errorCount ? uploadToS3(csvErrorPath, curveUser, UPLOAD_TYPE.EXPORT) : { publicLink: null, s3Key: null },
    ]);

    await bulkSplitsService.markAsComplete({
      recordId: bulkSplitsId,
      clientId: curveUser.clientId,
      fileData,
      errorFileData,
      updatedCount: processedCount,
      totalCount: processedCount + errorCount,
    });

    sendNotification({
      identifier: 'exportDownload',
      curveUser,
      client,
      collectionName: 'Bulk Splits',
      publicLink: fileData.publicLink,
    });

    logger.info('Track processing completed successfully');
    const totalTime = (Date.now() - startTime) / 1000;
    logger.info('Total processing time for ', processedCount + errorCount, ' tracks: ', totalTime);
  } catch (error) {
    await bulkSplitsService.markAsErrored(bulkSplitsId, curveUser.clientId, {
      errorMessage: `Bulk splits export failed: ${error.message}`,
      errorCause: 'BULK_SPLITS_EXPORT_FAILED',
    });
    logger.error('Export failed:', error);
    throw error;
  }
};

module.exports = { exportTracks };
