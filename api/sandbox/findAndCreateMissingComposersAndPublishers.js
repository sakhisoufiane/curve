/*
Description: A script to create missing Composers and Publishers
Start Time: 10:28
End Time: 10:29
Time To Run On Staging: 1 minutes 34 seconds
Ticket No: SUP-868
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
const WriteCsv = require('../libs/writeCsv');

const border = '********';
const log = (message) => logger.info(`${border} ${message} ${border}`);
const logErr = (message) => logger.error(`${border} ${message} ${border}`);

const batchFindSize = 1000;
const eachLimitWorkBatchSize = 500;
const eachLimitPubCompFindBatchSize = 100;
let batchRun = 0;

const cookingVinylAusPubClientId = '5bee9e8cb21cab2a7968aa5b';

const composers = [];
const publishers = [];
const missingPublishers = [];
const missingComposers = [];
const report = [];


const findAndCreateMissingComposersAndPublishers = async (lastId) => {
  batchRun++;
  log(`Processing Works batch ${batchRun}`);

  let query = { rightsChain: { $ne: [] } };

  if (lastId) {
    query._id = { $gt: lastId };
    query.clientId = cookingVinylAusPubClientId;
  };

  try {
    // we need to go through all works, sort, impose a limit and recursively call the function w/ first id greater than last id
    const worksWithIpChain = await Work.find(query, { _id: 1, clientId: 1, rightsChain: 1, usedComposerIds: 1, usedPublisherIds: 1, title: 1 })
      .sort({ _id: 1 })
      .limit(batchFindSize);
    
    lastId = worksWithIpChain[worksWithIpChain.length - 1]?._id;
    if (worksWithIpChain.length !== 0) {
      await async.eachLimit(worksWithIpChain, eachLimitWorkBatchSize, (work, callback) => {
        work.rightsChain.forEach((rightsChain) => {
          checkChildren(rightsChain.children, work._id);
        });
        callback();
      });
      await findAndCreateMissingComposersAndPublishers(lastId);
    } else {
      log('Processed final batch');
      await findPubsAndComps();
      if (missingPublishers.length === 0 && missingComposers.length === 0) {
        log(`No missing Composers or Publishers`)
        process.exit(0);
      } else {
        // await createMissingItems(Publisher, missingPublishers);
        await createMissingItems(Composer, missingComposers);
        await writeReport();
      }
    }
  } catch (err) {
    logErr(`Error finding Works: ${err}`);
  };
};

const checkChildren = (children, workId) => {
  if (children && children?.length) {
    for (let child of children) {
      const fieldIsEmpty = (field) => !field;
      if (!fieldIsEmpty(child?.publisherId) || !fieldIsEmpty(child?.composerId)) {
        const publisherAlreadyAddedToArray = publishers.map((pub) => pub._id).includes(child.publisherId);
        if (child?.type === 'Publisher' && !publisherAlreadyAddedToArray) {
          publishers.push({ _id: child.publisherId, name: child.name, firstName: child.firstName, surname: child.surname, cae: child.cae, workId });
        }
        const composerAlreadyAddedToArray = composers.map((comp) => comp._id).includes(child.composerId);
        if (child?.type === 'Composer' && !composerAlreadyAddedToArray) {
          composers.push({ _id: child.composerId, name: child.name, firstName: child.firstName, surname: child.surname, cae: child.cae, workId });
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
  await findAndStoreData(publishers, 'Publisher', Publisher);
  await findAndStoreData(composers, 'Composer', Composer);
};

const findAndStoreData = async (uniqueCompsPubs, type, model) => {
  await async.eachLimit(uniqueCompsPubs, eachLimitPubCompFindBatchSize, async (uniqueCompPub) => {
    const found = await model.findOne({ _id: uniqueCompPub._id }, { _id: 1 });
    // if comp or pub does not exist, store in array
      if (!found) {
        if (type === 'Publisher') {
          missingPublishers.push({ type: type, _id: uniqueCompPub._id, name: uniqueCompPub.name, firstName: uniqueCompPub.firstName, surname: uniqueCompPub.surname, cae: uniqueCompPub.cae, workId: uniqueCompPub.workId });
        }
        if (type === 'Composer') {
          missingComposers.push({ type: type, _id: uniqueCompPub._id, name: uniqueCompPub.name, firstName: uniqueCompPub.firstName, surname: uniqueCompPub.surname, cae: uniqueCompPub.cae, workId: uniqueCompPub.workId });
        }
      }
  });
};

const createMissingItems = async (model, missingData) => {

  await async.eachSeries(missingData, async (missingComposerOrPublisher) => {
    // use existing name, if there isn't one, extract from excel data using stored indexes
    const missingComposerOrPublisherName = missingComposerOrPublisher?.name;
    if (missingComposerOrPublisherName) {
      // check whether a pub or comp already exists on the client with the same name but with a different id
      // no need for $ne otherwise it would have not be flagged as not found
      const compOrPubExists = await model.findOne({ 
        clientId: cookingVinylAusPubClientId, 
        $or: [
          { name: missingComposerOrPublisherName }, 
          { lowerCaseName: missingComposerOrPublisherName.toLowerCase() }
        ] 
      });

      if (compOrPubExists) {
        // if the comp or pub exists, we need to change the id on the rightsChain
        await findAndUpdateWork(missingComposerOrPublisher, compOrPubExists);
      } else {
        // otherwise we need to create a new pub or comp
        const newCompOrPub = new model({
          _id: missingComposerOrPublisher._id,
          name: missingComposerOrPublisherName,
          firstName: missingComposerOrPublisher.firstName ? missingComposerOrPublisher.firstName: null,
          surname: missingComposerOrPublisher.surname ? missingComposerOrPublisher.surname : null,
          cae: missingComposerOrPublisher.cae ? missingComposerOrPublisher.cae : '00000000000',
          clientId: cookingVinylAusPubClientId
        });
        report.push({
          _id: missingComposerOrPublisher._id,
          changed: 'FALSE',
          changedTo: '',
          createdNew: 'TRUE',
          type: missingComposerOrPublisher.type,
          error: '',
          success: 'TRUE',
        });
        await newCompOrPub.save().catch((err) => {
          if (err) {
            logErr(`Error saving ${missingComposerOrPublisher.type} - ${missingComposerOrPublisher._id}: ${err}`);
          } 
        });
      } 
    }
  });
};

const findAndUpdateWork = async (missingComposerOrPublisher, compOrPubExists) => {
  let query = { clientId: cookingVinylAusPubClientId };
  let field = missingComposerOrPublisher.type === 'Publisher' ? 'usedPublisherIds' : 'usedComposerIds';
  query[field] = { $in: [missingComposerOrPublisher._id] };

  const worksWithIpChain = await Work.find(query);
  await async.eachSeries(worksWithIpChain, async (work) => {
    // Invoke updateRightsChain for each work's rightsChain
    let isModified = updateRightsChain(work.rightsChain, missingComposerOrPublisher, compOrPubExists, work);
    if (isModified) {
      work.markModified('rightsChain'); // Inform Mongoose that the rightsChain has been modified
      report.push({
        _id: missingComposerOrPublisher._id,
        changed: 'TRUE',
        changedTo: compOrPubExists._id.toString(),
        createdNew: 'FALSE',
        type: missingComposerOrPublisher.type,
        error: '',
        success: 'TRUE',
      })
      await work.save().catch((err) => {
        if (err) {
          logErr(`Error saving work: ${work._id} - ${err}`);
        }
      });
    }
  })
};

function updateRightsChain(children, missingComposerOrPublisher, compOrPubExists, work) {
  let isModified = false;
  children.forEach(child => {
    // if (child.publisherId === missingComposerOrPublisher._id) {
    //   child.publisherId = compOrPubExists._id.toString();
    //   work.usedPublisherIds.map((id) => id === child.publisherId ? compOrPubExists._id.toString() : id)
    //   isModified = true;
    // }
    if (child.composerId === missingComposerOrPublisher._id) {
      child.composerId = compOrPubExists._id.toString();
      if (work && work?.usedComposerIds) { work.usedComposerIds.map((id) => id === child.composerId ? compOrPubExists._id.toString() : id)}
      isModified = true;
    }
    if (child.children && child.children.length) {
      // Recursive call to updateRightsChain for the child's children
      const childIsModified = updateRightsChain(child.children, missingComposerOrPublisher, compOrPubExists, work);
      isModified = isModified || childIsModified; // Update isModified if any child was modified
    }
  });
  return isModified; // Return whether any modifications were made
};

const writeReport = async () => {
  const outputLocation = `${appRootDir}/tmp/createdMissingComposersAndPublishers.csv`;
  const writer = new WriteCsv({ headers: ['ID', 'TYPE', 'CHANGED', 'CHANGED TO', 'CREATED NEW', 'ERROR', 'SUCCESS'], outputLocation });
  const outputData = report.map((line) => [line._id, line.type, line.changed, line.changedTo, line.createdNew, line.error, line.success]);
  writer.addData(outputData, () => {
    return new Promise((resolve, reject) => {
      writer.write((err, location) => {
        if (err) {
          logErr(`Error writing CSV: ${err}`);
          reject(err);
        } else {
          log(`Report written: ${location}`);
          resolve();
          process.exit(-1); 
        }
      });
    });
  });
};

findAndCreateMissingComposersAndPublishers(null);
