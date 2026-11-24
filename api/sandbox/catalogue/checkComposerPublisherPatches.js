/*
Description: Find deleted ops in patches for missing Composers and Publishers
Time To Run: 00:00:05s (Staging)
Ticket No: SUP-576
Category: Works, IP Chain, Composers, Publishers
Author: Joe Osborne
*/
require('dotenv').config();
require('../models/db');
const appRootDir = require('app-root-dir').get();
const { MongoClient, ObjectId } = require('mongodb');
const WriteCsv = require('../libs/writeCsv');

const { databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');
const ImportXlsx = require('../libs/importXlsx');
const file = '/Users/joeosborne/Downloads/missingComposersAndPublishers.xlsx';

const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }
const config = [{ "key": "clientId" }, { "key": "id" }, { "key": "composerOrPublisher" }];


const checkComposerPublisherPatches = async (composerPatches, publisherPatches) => {
  const composerIds = [];
  const publisherIds = [];
  let report;

  ImportXlsx.getDataByTemplate(file, config, 0, 1, new Date(), async (err, importedData) => {
    importedData.forEach((line) => {
      if (line.composerOrPublisher === 'COMPOSER') {
        composerIds.push(ObjectId(line.id));
      } else {
        publisherIds.push(ObjectId(line.id));
      }
    });
    const relevantComposerPatches = await composerPatches.find({ "ref": { "$in": composerIds } }).toArray();
    const relevantPublisherPatches = await publisherPatches.find({ "ref": { "$in": publisherIds } }).toArray();
    
    const composerReport = formatDataForReport(relevantComposerPatches, 'Composer');
    const publisherReport = formatDataForReport(relevantPublisherPatches, 'Publisher');
    report = composerReport.concat(publisherReport);
    await writeReport(report, 'Patch Report');
  });
};

const formatDataForReport = (patches, type) => {
  return patches.map(patch => ({
    clientId: patch.clientId,
    type,
    id: patch.ref,
    ops: patch.ops.map((op) => [op.op]),
    author: patch.author,
    date: patch.timestamp,
  }));
};


const writeReport = async (report, reportName) => {
  const outputLocation = `${appRootDir}/tmp/${reportName}.csv`;
  const writeCsv = new WriteCsv({ headers: ['Client ID', 'Composer or Publisher', 'ID', 'Op', 'Author', 'Date'], outputLocation});
  const outputData = report.map((line) => [line.clientId, line.type, line.id, line.ops, line.author, line.date]);
  new Promise((resolve, reject) => {
    writeCsv.addData(outputData, (err) => {
      if (err) {
        logErr(`Error writing CSV: ${err}`);
      } else {
        writeCsv  .write((err, location) => {
          if (err) {
            logErr(`${err}`);
            reject(err);
          } else {
            log(`${reportName} written to: ${location}`);
            resolve();
            process.exit(0);
          }
        });
      }
    });
  })
}

const run = async () => {
  const databaseUrl = databaseUtils.getMongoUrl('auth');
  const mongoClient = await MongoClient.connect(databaseUrl, databaseUtils.getMongoConnectOpts());
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  composerPatches = db.collection('composer_patches');
  publisherPatches = db.collection('publisher_patches');
  await checkComposerPublisherPatches(composerPatches, publisherPatches);
}

run();