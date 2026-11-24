const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const Client = require('../../../../models/client');

const UPLOAD_TYPE = {
  IMPORT: 'import',
  EXPORT: 'export',
};

const uploadToS3 = async (exportPath, curveUser, uploadType) => {
  try {
    const client = await Client.findById(curveUser.clientId);
    if (!client) {
      throw new Error('Could not find client with id: ', curveUser.clientId);
    }

    const fileFormat = exportPath.split('.').pop();

    const s3Key = await new Promise((resolve, reject) => {
      fileManager.uploadToS3(
        `raw_${uploadType}/${client.name} - Tracks Splits ${uploadType} ${moment().format('YYYYMMDDHHmmssSSS')}.${fileFormat}`,
        exportPath,
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        },
      );
    });

    const publicLink = await new Promise((resolve, reject) => {
      fileManager.publicLink7Days(s3Key, (err, link) => {
        if (err) reject(err);
        else resolve(link);
      });
    });

    logger.info(`Upload completed successfully: ${publicLink}`);

    return { publicLink, s3Key };
  } catch (error) {
    logger.error('Error in upload:', error);
    throw error;
  }
};

module.exports = { uploadToS3, UPLOAD_TYPE };
