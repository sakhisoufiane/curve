require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall, eachLimit } = require('async');
const config = require('../config.json');
const ImportXlsx = require('../libs/importXlsx');
const Client = require('../models/client');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Work = require('../models/work');

const importMainIdentifiers = (file) => {
  let count = 0;
  const date = new Date();
  const allIdentifiers = [];
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
        eachLimit(importedWorks, 50, (importedWork, eachCb) => {
          Work.findById(importedWork.id, (findErr, work) => {
            if (findErr) { 
              logger.error(findErr);
              return eachCb();
            }

            if (!work) {
              logger.error(`Could not find work ${importedWork.id}`);
              allIdentifiers.push({ id: importedWork.id, work: '', identifier: '', newIdentifier: '', note: 'Not Found' });
              return eachCb();
            }

            count += 1;
            const oldIdentifier = work.identifier;
            if (work.identifier !== importedWork.mainIdentifier) {
              work.identifier = importedWork.mainIdentifier;
              if (!isNaN(parseInt(importedWork.mainIdentifier))) {
                // if we can use the mainIdentifier as a identifier number use it
                work.identifierNo = importedWork.mainIdentifier;
              }
              Work.findByIdAndUpdate(work._id, { $set: { identifier: work.identifier, identifierNo: work.identifierNo } }, { timestamps: false }, (saveErr) => {
                if (saveErr) {
                  allIdentifiers.push({ id: importedWork.id, work: work.title, identifier: oldIdentifier, newIdentifier: importedWork.mainIdentifier, note: `Could not save: ${saveErr}` });
                } else {
                  allIdentifiers.push({ id: importedWork.id, work: work.title, identifier: oldIdentifier, newIdentifier: importedWork.mainIdentifier, note: 'updated' });
                }
                eachCb();
              });
            } else {
              allIdentifiers.push({ id: importedWork.id, work: work.title, identifier: oldIdentifier, newIdentifier: importedWork.mainIdentifier, note: 'No update needed' });
              eachCb();
            }
          });
        }, cb);
      },
  ], (err) => {
      if (err) { 
        logger.error(err);
        process.exit(-1); 
      } else {
        const outputLocation = `${appRootDir}/tmp/updateMainIdentifiers.csv`;
        const writer = new WriteCsv({ headers: ['id', 'work', 'identifier', 'newIdentifier', 'note'], outputLocation });
        const outputData = allIdentifiers.map((line) => [line.id, line.work, line.identifier, line.newIdentifier, line.note]);
        writer.addData(outputData, () => {
          writer.write((err, location) => {
            console.log(location);
            console.log(`Completion: Imported ${count} identifiers`);
            process.exit(-1); 
          });
        });
      }
  })
};

const filePath = '/Users/mgiul/Downloads/411MainIDforceupdateV2.xlsx';
importMainIdentifiers(filePath);
