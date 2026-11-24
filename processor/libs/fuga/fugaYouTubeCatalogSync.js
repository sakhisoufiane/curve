const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Storage } = require('@google-cloud/storage');
const importCSV = require('./fugaYouTubeCSVImport');
const Client = require('../../models/client');

const credentials = {
  client_email: process.env.FUGA_GCP_CLIENT_EMAIL,
  private_key: process.env.FUGA_GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newline characters
};
const storage = new Storage({ credentials });

async function ingestFile(message) {
  const fugaOrgId = message?.metadata?.fuga_organization_id;
  const { bucket, name: fileName } = message || {};

  if (!fugaOrgId || !bucket || !fileName) {
    logger.info('Fuga YouTube catalog sync: invalid message (expected bucket, name, message.metadata.fuga_organization_id}, but some are missing)', { message });
    throw new Error('invalid metadata');
  }

  logger.info('Fuga YouTube catalog sync start', { fileName, fugaOrgId });

  try {
    const client = await Client.findOne({ 'fugaIntegration.fugaOrgId': fugaOrgId });

    if (!client) throw new Error(`Client not found with fugaOrgId ${fugaOrgId}`);

    if (!client.features.useAlternativeId) {
      logger.error(`Fuga YouTube Sync | ${client._id.toString()}  | useAlternativeId is not enabled for client with fugaOrgId ${fugaOrgId}`);
      return;
    }

    const clientId = client._id.toString();
    logger.info('Fuga YouTube catalog sync: downloading from GCS', { clientId, bucket, fileName });
    const remoteFile = storage.bucket(bucket).file(fileName);
    const readStream = remoteFile.createReadStream();

    await importCSV(readStream, clientId);
  } catch (err) {
    logger.error('Fuga YouTube catalog sync error', { fugaOrgId, err });
    throw err;
  }
}

module.exports = ingestFile;
