require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('../../models/period');

const Platoon = require('./index');

Period.findById('68542c41ba257757c6140df9')
  .then((period) => {
    Platoon.downloadSAPOutput(period, { email: 'tom@curveroyaltysystems.com' }, (err) => {
    });
  })
  .catch((err) => {
    logger.error('Error finding period in testPlatoonGenerate', err);
  });
