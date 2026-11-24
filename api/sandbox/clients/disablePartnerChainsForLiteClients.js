require('dotenv').config();
const { logger } = require('@curveroyaltysystems/platform-shared-utils/libs/structuredLogger');
const Client = require('../../models/client');
require('../../models/db');

const run = async () => {
  logger.info('disablePartnerChainsForLiteClients.js', 'Started');

  let totalClients = await Client.countDocuments({ paymentTier: 'Lite' });
  logger.info('disablePartnerChainsForLiteClients.js', `Found ${totalClients} clients`);

  const cursor = Client.find({ paymentTier: 'Lite' }).cursor();
  let batch = [];
  const batchSize = 20;

  for await (const client of cursor) {
    batch.push(client);
    if (batch.length === batchSize) {
      await handle(batch);
      totalClients -= batchSize;
      logger.info('disablePartnerChainsForLiteClients.js', `Processed ${batchSize} clients, ${totalClients} left`);
      batch = [];
    }
  }

  if (batch.length) await handle(batch);
  logger.info('disablePartnerChainsForLiteClients.js', `Processed ${batchSize} clients, 0 left`);
  logger.info('disablePartnerChainsForLiteClients.js', 'Finished')
}

async function handle(clients) {
  return Promise.all(
    clients.map(client => {
      client.set('features.partnerChains', false);
      return client.save();
    })
  );
}


run();