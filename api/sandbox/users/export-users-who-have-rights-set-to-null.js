require('dotenv').config();
require('../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require("@curveroyaltysystems/curve-shared-logic");
const appRootDir = require('app-root-dir').get();
const User = require('../../models/user');

const runExportUsersWhoHaveRightsSetToNull = async () => {
  logger.info('export-users-who-have-rights-set-to-null.js: ', 'Retrieving users')
  const batch = 1000;
  let skip = 0;
  let hasMore = true;

  let results = [];

  while (hasMore) {
    const users = await User.find({ rights: { $type: 10 } }).skip(skip).limit(batch);
    results = [...results, ...users];
    if (users.length > 0) {
      skip += users.length;
    }
    hasMore = users.length === batch;
  }

  logger.info('export-users-who-have-rights-set-to-null.js: ', `Total users retrieved: ${results.length}`);

  const outputLocation = `${appRootDir}/tmp/export-users-who-have-rights-set-to-null.csv`;
  logger.info('export-users-who-have-rights-set-to-null.js: ', `Now exporting to file: ${outputLocation}`);

  const outputData = results.map(({ _id, }) => [_id]);
  const writer = new WriteCsv({
    headers: ["ID"],
    outputLocation,
  });
  writer.addData(outputData, () => {
    writer.write((err, location) => {
      if (err) {
        logger.error(err);
        throw err;
      }
      logger.info(
        `Script findCrossContractProcessAddToBelow100Percent complete - file saved to ${location}`
      );
      logger.info('export-users-who-have-rights-set-to-null.js: ', `Export complete`, `File saved to ${location}`);
      process.exit(0);
    });
  });


}

runExportUsersWhoHaveRightsSetToNull();

