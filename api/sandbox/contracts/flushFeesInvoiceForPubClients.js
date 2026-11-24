const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

require('../../models/db');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Statement = require('../../models/statement');

// Main
const flushFeesInvoice = async () => {
  const clients = await Client.find({ clientType: 'Publisher' }).select('_id name');
  if (!clients?.length) throw new Error('No clients found');

  logger.info(`Flushing fees invoice for ${clients.length} clients`)

  let count = 0;

  await eachLimit(clients, 10, async (client) => {
    const options = { timestamp: false, createPatch: false };

    await Contract.updateMany(
      { clientId: client._id.toString(), feesInvoice: true }, // Filter
      { $set: { feesInvoice: false } }, // Update
      options
    );

    await Statement.updateMany(
      { clientId: client._id.toString() }, // Filter
      { $set: { feesInvoicePublicLink: null, feesInvoice: null, feesInvoiceTaxRate: null, feesInvoiceTaxAmount: null } }, // Update
      options
    );

    count += 1;
    logger.info(`Flushed fees invoice for client ${client.name}`);
  });

  logger.info(`Flushed fees invoice for ${count} clients`);
}

// Total of 7 Client on Production
flushFeesInvoice().then(() => {
  logger.info('Fees flushed successfully');
  process.exit(0);
}).catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
