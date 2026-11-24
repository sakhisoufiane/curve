require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall, eachLimit } = require('async');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const Client = require('../models/client');
const Work = require('../models/work');

const importMainIdentifiers = (file) => {
  let count = 0;
  const date = new Date()
  logger.info(`Attempting to get data from file: ${file}`)
  waterfall([
      function (cb) {
          // read from 1st line in xlsx file
          const startLine = 1;
          ImportXlsx.getDataByTemplate(file, config.importMainIdentifiers, 0, startLine, date, (err, importedWorks) => {
              if (err) { return cb(err) }

              logger.info(`Imported ${importedWorks.length} identifiers from file.`)
              cb(null, importedWorks)
          })
      },
      function (importedWorks, cb) {
        eachLimit(importedWorks, 10, (importedWork, eachCb) => {
          Work.findById(importedWork.id, (findErr, work) => {
            if (findErr) { 
              logger.error(findErr);
              return eachCb();
            }

            if (!work) {
              logger.error(`Could not find work ${importedWork.id}`); 
              return eachCb();
            }

            count += 1;
            work.identifier = importedWork.mainIdentifier;
            work.save({ timestamps: false }, (saveErr) => {
              if (saveErr) { return eachCb(`Could not save ${work._id}: ${saveErr}`); }
              eachCb();
            });
          });
        }, cb);
      },
  ], (err) => {
      if (err) { 
        logger.error(err); 
      } else {
        logger.info(`Completion: Imported ${count} identifiers`);
        process.exit(-1);
      }
  })
};

const filePath = '/Users/arjundoel/Downloads/Altafonte_IdentifiersToUpdate.xlsx';
importMainIdentifiers(filePath);
