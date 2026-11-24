require('dotenv').config();
require('../models/db');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall, eachLimit } = require('async');
const WriteCsv = require('../libs/writeCsv');
const Work = require('../models/work');
const Composer = require('../models/composer');
const Publisher = require('../models/publisher');

let count = 0;
let workCount = 0;
let composerCount = 0;
let publisherCount = 0;
const limit = 1000;

// Works
const checkPartyIdsForWorks = async (clientId, lastId, total) => {
  let filter = { clientId }
  if (lastId) { filter._id = { $gt: lastId } }

  const works = await Work.find(filter).sort({ _id: 1 }).limit(limit).exec();

  await eachLimit(works, 1, async (work) => {
    count += 1;
    lastId = work._id;
    logger.debug(`\r${count}/${works.length + total} - ${work._id} - ${work.title}`);

    if (work.partyNo) {
      const partyNoCount = await Work.countDocuments({ clientId, partyNo: work.partyNo })
      if (partyNoCount > 1) { 
        workCount++;
        await work.save().catch(logger.error);
      }
    }
  });

  if (works?.length === limit) { await checkPartyIdsForWorks(clientId, lastId, total + limit); }
  return;
};

// Composers
const checkPartyIdsForComposers = async (clientId, lastId, total) => {
  let filter = { clientId }
  if (lastId) { filter._id = { $gt: lastId } }

  const composers = await Composer.find(filter).sort({ _id: 1 }).limit(limit).exec();

  await eachLimit(composers, 1, async (composer) => {
    count += 1;
    lastId = composer._id;
    logger.debug(`\r${count}/${composers.length + total} - ${composer._id} - ${composer.name}`);

    if (composer.partyNo) {
      const partyNoCount = await Composer.countDocuments({ clientId, partyNo: composer.partyNo })
      if (partyNoCount > 1) { 
        composerCount++;
        await composer.save().catch(logger.error); 
      }
    }
  });

  if (composers?.length === limit) { await checkPartyIdsForComposers(clientId, lastId, total + limit); }
  return;
};

// Publishers
const checkPartyIdsForPublishers = async (clientId, lastId, total) => {
  let filter = { clientId }
  if (lastId) { filter._id = { $gt: lastId } }

  const publishers = await Publisher.find(filter).sort({ _id: 1 }).limit(limit).exec();

  await eachLimit(publishers, 1, async (publisher) => {
    count += 1;
    lastId = publisher._id;
    logger.debug(`\r${count}/${publishers.length + total} - ${publisher._id} - ${publisher.name}`);

    if (publisher.partyNo) {
      const partyNoCount = await Publisher.countDocuments({ clientId, partyNo: publisher.partyNo })
      if (partyNoCount > 1) {
        publisherCount++;
        await publisher.save().catch(logger.error);
      }
    }
  });

  if (publishers?.length === limit) { await publishersWithDuplicatePartyNo(clientId, lastId, total + limit); }
  return;
};

/// <---------- Main Function --------> ///
const runCheck = async (clientId) => {
  logger.info('============= Flushing Works =============');
  await checkPartyIdsForWorks(clientId, null, 0);
  logger.info(`============= Cleaned ${workCount.length} works =============`);

  logger.info('============= Flushing Publishers =============');
  await checkPartyIdsForPublishers(clientId, null, 0);
  logger.info(`============= Cleaned ${composerCount.length} composers =============`);

  logger.info('============= Flushing Composers =============');
  await checkPartyIdsForComposers(clientId, null, 0);
  logger.info(`============= Cleaned ${publisherCount.length} publishers =============`);

  process.exit(0);
}

const clientId = '61963d674f0ad8002863cf25';
runCheck(clientId).catch(logger.error);
