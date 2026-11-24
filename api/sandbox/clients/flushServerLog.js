const moment = require('moment');
const { eachLimit } = require('async');
const { logger, Bucket } = require('@curveroyaltysystems/platform-shared-utils');

require('../models/db');
const Client = require('../models/client');
const FTPLogs = require('../models/ftpLogs');

const flush = async () => {
  const query = {
    $and: [
      { 'salesFtpIngestions.host': { $exists: true } },
      { 'salesFtpIngestions.active': true },
      { 'salesFtpIngestions.initialisedDate': { $exists: true } },
    ],
  };

  const clients = await Client.find(query, 'salesFtpIngestions');
  if (!clients?.length) throw new Error('No Clients Found');

  logger.debug(`Loaded ${clients.length} clients`)

  const serverDate = moment(new Date()).format();

  let count = 0;
  await eachLimit(clients, 10, async (client) => {
    if (!client?.salesFtpIngestions?.length) { return; }

    for (const salesFtpIngestion of client.salesFtpIngestions) {
      const serverName = `${salesFtpIngestion.username}@${salesFtpIngestion.host}`

      const file = {
        filename: serverName,
        dateIngested: serverDate,
        dateUploadedToServer: serverDate,
        server: serverName,
      };

      await Bucket.add({ Model: FTPLogs, filter: { clientId: client._id.toString(), type: 'Server Sales' }, field: 'files', value: file }).catch(logger.error);
    }

    count += 1;
    process.stdout.write(`\r${count} of ${clients.length} clients`);
  })
};

flush().then(() => {
  logger.info('Done');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});
