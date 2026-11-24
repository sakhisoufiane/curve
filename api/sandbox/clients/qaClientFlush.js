require('dotenv').config();
require('../models/db');

const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const User = require('../models/user');
const Client = require('../models/client');

const flush = async (clientNames, emails) => {
  const clients = await Client.find({ name: { $in: clientNames } }, '_id');
  if (!clients?.length) throw new Error('No Clients Found');

  logger.debug(`Updating Clients: ${clients.length}`);

  await eachLimit(clients, 4, async (client) => {
    const update = { $set: { qaClient: true } };
    const options = { timestamp: false };
    await Client.findByIdAndUpdate(client._id, update, options);
  });
  logger.info('Clients have updated');

  if (!emails?.length) { logger.info('No Users to update'); return; }

  logger.debug(`Users Lookup: ${emails.length}`);

  const users = await User.find({ email: { $in: emails } });
  if (!users.length) throw new Error('No Users Found');

  await eachLimit(users, 2, async (user) => {
    const update = { $set: { qaInternal: true } };
    await User.findByIdAndUpdate(user._id, update);
  });
  logger.info('Users have updated');
};

const clientNames = [
  'QA - Fuga Label',
  'QA - Fuga Publishing',
  'QA - Fuga Distributor',
  'Millions Test Data',
  'QA Test - Label Lite',
  'QA Test - Distributor',
];

const emails = [
  'gelo+5@curveroyaltysystems.com',
	'gelo+4@curveroyaltysystems.com',
	'gelo+3@curveroyaltysystems.com',
	'gelo+2@curveroyaltysystems.com',
	'gelo+1@curveroyaltysystems.com',
	'jesli@curveroyaltysystems.com',
	'samantha@curveroyaltysystems.com',
]

flush(clientNames).then(() => {
  logger.info('Done');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});