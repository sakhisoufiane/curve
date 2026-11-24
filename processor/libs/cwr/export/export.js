const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const CwrDelivery = require('../../../models/cwrDelivery');
const ExportNotification = require('../../exportNotification/exportNotification');
const CwrBuilder = require('./builder');
const Delivery = require('./delivery');

async function exportCwrDelivery({ deliveryId, markWorksAsDelivered, email }) {
  const logKey = `${deliveryId} | Export CWR Delivery |`;

  const cwrDelivery = await CwrDelivery.findById(deliveryId);
  if (!cwrDelivery) {
    logger.error(logKey, `CWR Delivery with ID ${deliveryId} not found`);
    throw new Error(`CWR Delivery with ID ${deliveryId} not found`);
  }

  try {
    logger.info(logKey, 'Mark works as delivered:', markWorksAsDelivered);
    if (markWorksAsDelivered) {
      cwrDelivery.status = 'In Progress';
      await cwrDelivery.save();
      await Delivery.markWorksAsDelivered({ logKey, delivery: cwrDelivery });
    }

    const { filePath, client } = await CwrBuilder.createFile({ logKey, delivery: cwrDelivery });

    const s3Path = `deliveryFiles/cwr/${cwrDelivery.fileName}`;
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
    await ExportNotification.sendCwrExportNotification({
      client,
      email,
      url: downloadUrl,
      deliveryFormat: cwrDelivery.outputFormat,
    });

    if (markWorksAsDelivered) {
      cwrDelivery.status = 'Delivered';
      cwrDelivery.errorMessage = null;
    }
  } catch (err) {
    logger.error(logKey, err);
    if (markWorksAsDelivered) {
      cwrDelivery.status = 'Errored';
      cwrDelivery.errorMessage = err.message;
    }
    throw err;
  } finally {
    await cwrDelivery.save()
      .catch((err) => {
        logger.error(logKey, 'Failed to update CWR Delivery', err);
      });
  }
}

module.exports = {
  exportCwrDelivery,
};
