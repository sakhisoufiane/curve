require('dotenv').config();
require('../../models/db');
const SalesFile = require('../../models/salesFile');
const prepareData = require('../../libs/platform/salesIngestion/prepareData');
const { logger,
  promisify,
  fileManager
} = require('@curveroyaltysystems/platform-shared-utils');

const run = async () => {
  const salesFile = await SalesFile.findById(process.argv[2])
    .catch((error) => {
      console.error(`Error finding sales file with id '${process.argv[2]}'`);
      console.error(error)
    });

  if (salesFile) {
    try {
      const bucket = 'curve-royalties-staging-new'
      const downloadResults = await promisify(fileManager.downloadFromS3, salesFile.file, bucket);
      if (!downloadResults?.length) { throw new Error('downloadFromS3 returned no results'); }
      const localFile = downloadResults[0];

      const body = await prepareData(salesFile, null, localFile);
      logger.debug('Success Platform Prepare Data: ', JSON.stringify(body, null, 2));
    } catch (e) {
      logger.error(`error preparing platform sales ingestion data`, e);
    }
  } else {
    console.debug('No sales file detected.');
  }

  process.exit();
};

run();
