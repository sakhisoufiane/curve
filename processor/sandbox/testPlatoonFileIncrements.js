require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('../models/period');
const Platoon = require('../libs/platoon');
const Path = require('path');

Period.findById('65aed626b801746e4bf3ee40', (err, period) => {
  // Platoon.encodeAndSftpOnly(period, {}, (err, res) => {
  //   logger.info('Done');
  // });
  incrementFileNos(period);
});

const incrementFileNos = (period) => {
  // Update the last file no and summary no on period from files
  let highestFileNumber = period.platoon.fileNumberLast || 0;
  let summaryFileNumber = period.platoon.summaryNumber;
  period.platoon.files.forEach((file) => {
    // Only do this on playdata files, summary files structured differently
    if (file.includes('PLAYDATA')) {
      // Get file name from S3 path
      const fileName = Path.basename(file);
      const split = fileName.split('_');
      const fileNumber = parseInt(split[4]);
      summaryFileNumber = parseInt(split[3]);
      console.log(fileNumber, highestFileNumber)
      if (fileNumber > highestFileNumber) {
        highestFileNumber = fileNumber;
      }
    }
  });
  period.platoon.fileNumberLast = highestFileNumber;
  period.platoon.summaryNumber = summaryFileNumber + 1;
  console.log(period.platoon);
}