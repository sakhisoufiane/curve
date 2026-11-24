const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

require('../models/db');

const User = require('../models/user');
const Client = require('../models/client');
const Parent = require('../models/parent');


const parentRightFlush = async () => {
  const parents = await Parent.find({});
  if (!parents?.length) throw new Error('No Parents Found');

  logger.info(`Loaded ${parents.length} parents`);

  await eachLimit(parents, 10, async (parent) => {
    logger.info(`${parent._id.toString()} | ${parent.name}`);

    const query = { parentId: parent._id.toString() };
    const clients = await Client.find(query, '_id parentId');
    if (!clients?.length) { return; }

    const users = await User.find(query);
    if (!users?.length) { return; }

    await eachLimit(users, 10, async (user) => {
      // Add rights access
      for (const client of clients) {
        if (!user.rights?.[client._id.toString()]) {
          user.rights[client._id.toString()] = { catalogue: 'Edit', sales: 'Edit', periods: 'Edit', contracts: 'Edit', admin: true }
        }
      }

      // Remove any null rights
      delete user.rights[null];

      await User.findByIdAndUpdate(user._id, { $set: { rights: user.rights } }, { timestamps: false });
    });
  });
};

parentRightFlush().then((result) => {
  logger.info('Script Done');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});;