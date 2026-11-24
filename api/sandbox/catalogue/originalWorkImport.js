require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall, eachLimit } = require('async');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const Work = require('../models/work');


const importOriginalWorkData = (clientId, callback) => {
  const date = new Date();
  waterfall([
    (cb) => {
      // read from 1st line in xlsx file
      const startLine = 1;
      ImportXlsx.getDataByTemplate(file, config.importOriginalWorksScript, 0, startLine, date, (err, importedWorks) => {
          if (err) { return cb(err); }

          logger.info(`Imported ${importedWorks.length} works from file.`);
          cb(null, importedWorks);
      })
    },
    (importedWorks, cb) => {
      let count = 0;
      eachLimit(importedWorks, 10, (importedWork, eachCb) => {
        Work.findById(importedWork.id, (findErr, work) => {
          if (findErr) { return eachCb(findErr); }

          if (!work) {
            logger.error(`Could not find work for ${importedWork.id} - ${importedWork.originalWorkTitle}`);
            return eachCb();
          }

          work.originalWorkTitle = importedWork.originalWorkTitle;
          work.originalWorkSource = importedWork.originalWorkSource;

          count += 1;
          work.save({ timestamps: false }, eachCb);
        })
      }, (err) => {
        logger.info(`Saved ${count} of ${importedWorks.length} works`)
        cb(err);
      })
    },
  ], callback)
}

const file = '/Users/arjundoel/Downloads/Bailer MP Modification import (2).xlsx'; // Enter filepath for import file here
const clientId = '61ba3c19fec82a05ecf1c1fa';

importOriginalWorkData(clientId, (err) => {
  if (err) { logger.error(err); }
  logger.info('Import complete');
  process.exit(0);
});

