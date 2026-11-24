/*
Description: A script to check if Composers and Publishers exist in IP Chain
Start Time: 16:15
End Time: 16:25
Time To Run On Staging: 10 minutes 34 seconds
Ticket No: SUP-576
Category: Publishing, Composers, Publishers
Author: Joe Osborne
*/
require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Work = require('../models/work');
const appRootDir = require('app-root-dir').get();
const async = require('async');
const Publisher = require('../models/publisher');
const Composer = require('../models/composer');
const fs = require('fs');

const batchFindSize = 1000;
const eachLimitWorkBatchSize = 500;
const eachLimitPubCompFindBatchSize = 100;
let batchRun = 0;

const border = '********';
const log = (message) => logger.info(`${border} ${message} ${border}`);
const logErr = (message) => logger.error(`${border} ${message} ${border}`);

const outputLocation = `${appRootDir}/tmp/composersAndPublishersInIpChainThatDoNotExist.csv`;

let uniqueComposerIds = new Set();
let uniquePublisherIds = new Set();
let worksForLaterMapping = [];
let notFoundIdsAndType = [];
let notFoundDetails = [];


const checkIfComposersAndPublishersInIpChainExist = async (lastId) => {
  // reset data to reduce impact on memory 
  uniqueComposerIds = new Set();
  uniquePublisherIds = new Set();
  worksForLaterMapping = [];
  notFoundIdsAndType = [];
  notFoundDetails = [];
  batchRun++;
  log(`Processing Works batch ${batchRun}`);

  let query = { rightsChain: { $ne: [] } };

  if (lastId) {
    query._id = { $gt: lastId };
  };

  try {
    // we need to go through all works, sort, impose a limit and recursively call the function w/ first id greater than last id
    const worksWithIpChain = await Work.find(query, { _id: 1, clientId: 1, rightsChain: 1, usedComposerIds: 1, usedPublisherIds: 1 }).sort({ _id: 1 }).limit(batchFindSize);
    lastId = worksWithIpChain[worksWithIpChain.length - 1]?._id;

    if (worksWithIpChain.length !== 0) {
      async.eachLimit(worksWithIpChain, eachLimitWorkBatchSize, (work, callback) => {
        worksForLaterMapping.push(work);
        work.rightsChain.forEach((rightsChain) => {
          checkChildren(rightsChain.children);
        });
        callback();
      });
      await findPubsAndComps();
      // add data to CSV through each iteration
      formatAndAddDataToReport();
      await checkIfComposersAndPublishersInIpChainExist(lastId);
    } else {
      log('Processed final batch');
      await findPubsAndComps();
      formatAndAddDataToReport();
      log(`Report written: ${outputLocation}`);
      process.exit(0); 
    }
  } catch (err) {
    logErr(`Error finding Works: ${err}`);
  };
};

const checkChildren = (children) => {
  if (children && children[0]) {
    for (let child of children) {
      const fieldIsEmpty = (field) => !field;
      if (!fieldIsEmpty(child?.publisherId) || !fieldIsEmpty(child?.composerId)) {
        if (child?.type === 'Publisher') {
          uniquePublisherIds.add(child.publisherId);
        }
        if (child?.type === 'Composer') {
          uniqueComposerIds.add(child.composerId);
        }
        // loop through all layers of children on IP Chain
        if (child?.children && child.children.length > 0) {
          checkChildren(child.children);
        }
      }
    }
  }
};

const findPubsAndComps = async () => {
  await findData(uniquePublisherIds, 'PUBLISHER', Publisher);
  await findData(uniqueComposerIds, 'COMPOSER', Composer);
};

const findData = async (uniqueIds, type, model) => {
  await async.eachLimit(uniqueIds, eachLimitPubCompFindBatchSize, async (uniqueId) => {
    const found = await model.findOne({ _id: uniqueId }, { _id: 1 });
      if (!found) {
        notFoundIdsAndType.push({ type: type, id: uniqueId });
      }
  });
};


const formatAndAddDataToReport = () => {
  // loop through all publisher and composer ids not found, get relevant work and client ids
  for (const notFoundIdAndType of notFoundIdsAndType) {
    for (const work of worksForLaterMapping) {
      if (work.usedComposerIds.includes(notFoundIdAndType.id) || work.usedPublisherIds.includes(notFoundIdAndType.id)) {
        let idExists = notFoundDetails.find(detail => detail.id === notFoundIdAndType.id); 
        if (idExists) {
          // create an array of all relevant work ids per publisher/composer
          idExists.workIds.push(work._id);
        } else {
          notFoundDetails.push({ clientId: work.clientId, id: notFoundIdAndType.id, workIds: [work._id], type: notFoundIdAndType.type });
        }
      }
    }
  };
  if (notFoundDetails.length > 0) {
    if (!fs.existsSync(outputLocation)) {
      fs.writeFileSync(outputLocation, 'CLIENT ID,ID,PUBLISHER OR COMPOSER,WORK IDS\n');
    }
    const outputData = notFoundDetails.map((line) => [line.clientId, line.id, line.type, line.workIds.join(';')].join(',') + '\n').join('');
    try {
      fs.appendFileSync(outputLocation, outputData);
    } catch (err) {
      logErr(`Error Writing Data: ${err}`);
    }
  }
};

checkIfComposersAndPublishersInIpChainExist(null);
