require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const CwrAcknowledgementIngest = require('./libs/cwr/cwrAcknowledgementIngest');
const CwrAcknowledgement = require('./models/cwrAcknowledgement');

logger.debug(process.argv);
if (process.argv[2]) {
  logger.debug(process.argv[2]);
  CwrAcknowledgement.findById(process.argv[2])
    .then((cwrAcknowledgement) => {
      if (cwrAcknowledgement) {
        console.time(`Ingest Acknowledgement Time: ${cwrAcknowledgement.name}`);
        const cwrAcknowledgementIngest = new CwrAcknowledgementIngest();
        cwrAcknowledgementIngest.ingestFile(cwrAcknowledgement, process.argv[3], () => {
          console.timeEnd(`Ingest Acknowledgement Time: ${cwrAcknowledgement.name}`);
          // wait 2 seconds
          setTimeout(() => process.exit(), 2000);
        });
      } else {
        logger.error(`No Acknowledgement File found with ID ${process.argv[2]}`);
        process.exit(-1);
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit(-1);
    });
} else {
  logger.error('No Acknowledgement File ID passed as an argument');
  process.exit(-1);
}
