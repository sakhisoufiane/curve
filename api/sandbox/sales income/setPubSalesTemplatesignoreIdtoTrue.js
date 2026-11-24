require('dotenv').config();
require('../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit } = require('async');

const Client = require('../models/client');
const SalesTemplate = require('../models/salesTemplate');

// Main
const setTemplateConfig = async () => {
  const clients = await Client.find({ clientType: 'Publisher' });
  if (clients.length === 0) throw new Error('No Clients found');

  let count = 0;
  await eachLimit(clients, 10, async (client) => {
    count +=1;
    logger.debug(`Updating ${count} of ${clients.length}: ${client.name}`);

    const filter = { clientId: client._id.toString() };
    const options = { timestamps: false }; // Update Many does except this as an argument, timestamp will be updated regardless

    const update = { $set: { ignoreMainIdentifiers: true } };

    await SalesTemplate.updateMany(filter, update, options);
  });
};


// Call Method
setTemplateConfig().then(() => {
  logger.info('✅ Completed Process ✅');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});
