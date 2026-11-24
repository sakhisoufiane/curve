const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require("../../models/client");
const Contract = require('../../models/contract');
require('../../models/db');

(async () => {
  const clients = await Client.find({ clientType: 'Publisher' });
  if (!clients?.length) throw new Error('No clients found');

  await eachLimit(clients, 100, async (client) => {
    const contractCount = await Contract.count({ clientId: client._id.toString(), feesInvoice: true });
    if (!contractCount) return;
    logger.info(`${client.name} - ${contractCount} contracts found with Fees Invoice Enabled`);
  });

  logger.info('Fees Invoice Public Report Completed');
})();
