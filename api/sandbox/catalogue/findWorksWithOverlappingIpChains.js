/* 
Description: Find all the Works across all clients where:
  1) There are multiple IP Chains that either use a Territory Group or specific territories
  2) There is territory overlap (not including "WW") between at least two chains on a Work
  3) Exclude partner chains entirely
  4) Exclude "WW" from overlap checks unless there are 2+ IP Chains both with WW 
Time To Run: 00:11:00s (Staging)
Ticket No: CUR-4004
Category: Catalogue / Works
Author: Joe Osborne
*/

require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const async = require('async');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongoose').Types;
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); };
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); };

const Work = require('../../models/work');
const TerritoryGroup = require('../../models/territoryGroup');
const Client = require('../../models/client');

const WORKS_LIMIT = 1000;
const report = [];
let round = 0;

const findWorksWithOverlappingIpChains = async (lastId) => {
  round++;

  log(`processing round ${round}`);
  let query = { clientId: '64e8a4652dc5ac9aa6b5e3a9', 'rightsChain.1': { $exists: true } };

  if (lastId) {
    query._id = { $gt: lastId };
  }
  const worksWithIpChain = await Work.find(query, { _id: 1, clientId: 1, rightsChain: 1, title: 1, valid: 1, approvalStatus: 1 }).limit(WORKS_LIMIT).sort({ _id: 1 });
  await async.eachLimit(worksWithIpChain, 100, async (work) => {
    const overlap = await checkTerritoryOverlap(work.rightsChain);
    if (overlap) {
      log(`Found work with overlapping IP chains: ${work._id}`);
      const client = await Client.findById(work.clientId, { name: 1 });
      report.push({
        workId: work._id,
        clientId: work.clientId,
        clientName: client?.name,
        title: work.title,
        valid: work.valid,
        approvalStatus: work.approvalStatus,
      });
    }
  });

  if (worksWithIpChain.length === WORKS_LIMIT) {
    findWorksWithOverlappingIpChains(worksWithIpChain[worksWithIpChain.length - 1]._id);
  } else {
    writeReport();
  }
};

const checkTerritoryOverlap = async (rightsChain) => {
  const territoryCodesSeen = new Map();
  let wwCount = 0;
  let overlap = false;

  await async.eachOfSeries(rightsChain, async (chain, index) => {
    if (chain.territory === 'WW') {
      wwCount++;
    }

    if (wwCount > 1) {
      overlap = true;
    }

    if (chain.territory === 'specific') {
      for (const code of chain.territoryCodes.codes || []) {
        if (territoryCodesSeen.has(code) && territoryCodesSeen.get(code) !== index) {
          overlap = true;
        }
        territoryCodesSeen.set(code, index);
      }
    } else if (ObjectId.isValid(chain.territory)) {
      const territoryGroup = await TerritoryGroup.findById(chain.territory, { territories: 1 });
      if (territoryGroup && territoryGroup.territories) {
        for (const code of territoryGroup.territories) {
          if (territoryCodesSeen.has(code) && territoryCodesSeen.get(code) !== index) {
            overlap = true;
          }
          territoryCodesSeen.set(code, index);
        }
      }
    }
  });
  return overlap;
};


const writeReport = async () => {
  const outputLocation = `${appRootDir}/tmp/overlappingIpChains.csv`;
  const writer = new WriteCsv({ headers: ['WORK ID', 'CLIENT ID', 'CLIENT NAME', 'TITLE', 'APPROVAL STATUS', 'VALID'], outputLocation });
  const outputData = report.map((line) => [line.workId, line.clientId, line.clientName, line.title, line.approvalStatus, line.valid]);
  writer.addData(outputData, () => {
    return new Promise((resolve, reject) => {
      writer.write((err, location) => {
        if (err) {
          logErr(`Error writing CSV: ${err}`);
          reject(err);
        } else {
          log(`Report written: ${location}`);
          resolve();
          log(`end time ${new Date()}`);
          process.exit(-1); 
        }
      });
    });
  });
};

findWorksWithOverlappingIpChains();
