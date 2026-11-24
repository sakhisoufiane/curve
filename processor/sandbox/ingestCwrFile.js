require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const CwrAcknowledgementIngest = require('../libs/cwr/cwrAcknowledgementIngest');

const cwrAcknowledgementId = '679a0e77cb620e324fa0ae40';


function importAcknowledgementFile(cwrAcknowledgementId) {
  CwrAcknowledgement.findById(cwrAcknowledgementId, (err, cwrAcknowledgement) => {
    cwrAcknowledgement.status = 'Ingesting';
    cwrAcknowledgement.save((err) => {
      if (err) {
        logger.error(err);
      } else {
        const cwrAcknowledgementIngest = new CwrAcknowledgementIngest();
        cwrAcknowledgementIngest.ingestFile(cwrAcknowledgement,'', (err) => {
          if (err) {
            logger.error(err);
          } else {
            logger.info(`Succesfully ingested cwrAcknowledgement file ${cwrAcknowledgementId}`);
          }
        });
      }
    });
  });
}


importAcknowledgementFile(cwrAcknowledgementId);