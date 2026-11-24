require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SalesFileController = require('./libs/salesIngestion/salesFileController');

const SalesFile = require('./models/salesFile');

logger.debug(process.argv);
if (process.argv[2]) {
  logger.debug(process.argv[2]);
  SalesFile.findById(process.argv[2])
    .then((salesFile) => {
      if (salesFile) {
        console.time(`Revalidate Sales Time: ${salesFile.name}`);
        SalesFileController.revalidate(salesFile, () => {
          console.timeEnd(`Revalidate Sales Time: ${salesFile.name}`);
          process.exit();
        });
      } else {
        logger.error(`No Sales File found with ID ${process.argv[2]}`);
        process.exit(-1);
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit(-1);
    });
} else {
  logger.error('No Sales File ID passed as an argument');
  process.exit(-1);
}
