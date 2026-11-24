const moment = require('moment');
const appRootDir = require('app-root-dir').get()
const { eachLimit } = require('async');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

require('../models/db');
const User = require('../models/user');

const add = ({ writer, data }) => new Promise((resolve, reject) => {
  writer.addData([data], (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
});


const write = ({ writer }) => new Promise((resolve, reject) => {
  writer.write((err, location) => {
    if (err) {
      reject(err);
    } else {
      resolve(location);
    }
  });
});


const checkUsers = async () => {
  const outputLocation = `${appRootDir}/tmp/users-wrong-rights.csv`
  const writer = new WriteCsv({
    headers: ['Created At', 'ID', 'Email', 'Unknown Rights'],
    outputLocation,
  });

  const users = await User
    .find({})
    .select({
      _id: 1,
      email: 1,
      clientIds: 1,
      adminClientIds: 1,
      rights: 1,
      createdAt: 1,
    })
    .lean();

  let count = 0;
  await eachLimit(users, 100, async (user) => {
    count++;
    logger.info(`Processed ${count} of ${users.length} users`);

    const clientIds = [...new Set([...user.clientIds, ...user.adminClientIds])];

    if (!user.rights) return;

    const missingRights = [];
    for (const rightsClientId of Object.keys(user.rights)) {
      if (!clientIds.includes(rightsClientId)) {
        // add to report
        missingRights.push(rightsClientId);
        // remove the rights for this client
        const userRights = { ...user.rights };
        delete userRights[rightsClientId];
        user.rights = userRights;
      }
    }

    await user.save();

    if (missingRights.length > 0) {
      await add({ writer, data: [moment(user.createdAt).format('YYYY-MM-DD'), user._id, user.email, missingRights.join(',')] });
    }
  });

  const location = await write({ writer });
  logger.info(`Users checked and written to ${location}`);
};

checkUsers()
  .then(() => {
    logger.info('Users checked');
    process.exit(0);
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });