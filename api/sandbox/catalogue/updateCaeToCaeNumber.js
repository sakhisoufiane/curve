/*
Description: Updates CAE to CAE Number in the rightsChain of works in the database.
Time To Run: 00:00:05:00s
Ticket No: CUR-4000
Category: Works 
Author: Joe Osborne
*/

require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const async = require('async');
const Work = require('../../models/work');

const border = '********';
const log = (message) => logger.info(`${border} ${message} ${border}`);
const logErr = (message) => logger.error(`${border} ${message} ${border}`);

const WORKS_LIMIT = 1000;
const report = [];
let round = 0;

const updateCaeToCaeNumber = async (lastId) => {
  round++;
  log(`Processing round ${round}`);
  const query = { rightsChain: { $exists: true, $ne: [] } };

  if (lastId) {
    query._id = { $gt: lastId };
  }

  const aggregation = [
    { "$match": query },
    {
      "$match": {
        "$expr": {
          "$function": {
            "body": "function(rightsChain) { if (!Array.isArray(rightsChain) || rightsChain.length === 0) return false; function findComposer(chain) { for (let item of chain) { if (!item || typeof item !== 'object') continue; if (item.type === \"Composer\" && item.cae) return true; if (Array.isArray(item.children) && findComposer(item.children)) return true; } return false; } return findComposer(rightsChain); }",
            "args": ["$rightsChain"],
            "lang": "js"
          }
        }
      }
    },
    { "$sort": { "_id": 1 } },
    { "$limit": WORKS_LIMIT }
  ];

  const works = await Work.aggregate(aggregation);
  await async.eachLimit(works, 100, async (work) => {
    let updated = false;

    work.rightsChain.forEach((chain) => {
      if (processChain(work, chain)) {
        updated = true;
      }
    });

    if (updated) {
      await Work.findByIdAndUpdate(work._id, { $set: { rightsChain: work.rightsChain } }, { timestamps: false });
    }
  });

  if (works.length === WORKS_LIMIT) {
    updateCaeToCaeNumber(works[works.length - 1]._id);
  } else {
    log('All works have been processed');
    log(`Total CAEs updated: ${report.length}`);
    writeReport();
  }
};

const processChain = (work, chain) => {
  let updated = false;

  chain?.children?.forEach((child) => {
    if (child.type === 'Composer' && child.cae) {
      child.caeNumber = child.cae;
      delete child.cae;
      updated = true;

      report.push({
        clientId: work.clientId,
        workId: work._id.toString(),
        name: child.name,
        caeNumber: child.caeNumber,
      });
    }
    if (child.children) {
      updated = processChain(work, child) || updated;
    }
  });

  return updated;
};

const writeReport = async () => {
  const outputLocation = `${appRootDir}/tmp/caesThatHaveBeenUpdatedToCaeNumberOnRightsChain.csv`;
  const writer = new WriteCsv({ headers: ['Client ID', 'Work ID', 'Composer Name', 'CAE Number'], outputLocation });
  const outputData = report.map((line) => [line.clientId, line.workId, line.name, line.caeNumber]);

  writer.addData(outputData, () => {
    return new Promise((resolve, reject) => {
      writer.write((err, location) => {
        if (err) {
          logErr(`Error writing CSV: ${err}`);
          reject(err);
        } else {
          log(`Report written: ${location}`);
          resolve();
          process.exit(0);
        }
      });
    });
  });
};

updateCaeToCaeNumber(null);
