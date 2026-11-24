require("dotenv").config();
require("../models/db");

const { eachLimit } = require('async');
const appRootDir = require('app-root-dir').get();
const { logger } = require("@curveroyaltysystems/platform-shared-utils");

const WriteCsv = require('../libs/writeCsv');

const Client = require('../models/client');
const Release = require('../models/release');
const MCPSNegative = require('../models/mcpsNegative');
const MCPSRetention = require('../models/mcpsRetention');

function addToFile(writer, data) {
  return new Promise((resolve, reject) => {
    writer.addData(data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  })
}

function writeToFile(writer) {
  return new Promise((resolve, reject) => {
    writer.write((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function getMissingCatalogue(mcpsDocs) {
  const missingCatalogue = [];

  await eachLimit(mcpsDocs, 100, async (mcpsDoc) => {
    const client = await Client.findById(mcpsDoc.clientId).catch(logger.error);
    const release = await Release.findById(mcpsDoc.releaseId).catch(logger.error);

    const row = [ mcpsDoc.clientId, client?.name, mcpsDoc.releaseId, mcpsDoc.releaseTitle, mcpsDoc.releaseCatNo, mcpsDoc.accountingPeriod, mcpsDoc.year ];
    if (!release) { missingCatalogue.push(row) }
  });

  return missingCatalogue;
}

const check = async (Model, field, writer, lastId, count) => {
  const limit = 1000;

  const query = {};
  if (lastId) { query._id = { $gt: lastId } }

  const mcpsDocs = await Model.find(query).sort({ _id: 1 }).limit(limit);
  if (!mcpsDocs?.length) throw new Error(`No ${field} Found!`)

  logger.info(`Loaded ${mcpsDocs.length} ${field}`)
  const missingReleaseIds = await getMissingCatalogue(mcpsDocs);
  
  logger.info(`Adding Data to file: ${field}`);
  await addToFile(writer, missingReleaseIds);
  
  const newLastId = mcpsDocs[mcpsDocs.length - 1]._id;
  const newCount = count + mcpsDocs.length;
  
  logger.debug(`${field} docs added so far: ${newCount}`)
  if (mcpsDocs.length === limit) { 
    await check(Model, field, writer, newLastId, newCount); 
  } else {
    await writeToFile(writer);
  }
}

const outputLocationNegatives = `${appRootDir}/tmp/MCPS Missing Releases Report (Negatives).csv`;
const writerNegatives = new WriteCsv({ headers: ['Client ID', 'Client Name', 'Release ID', 'Release Title', 'Cat No', 'Accounting Period', 'Year'], outputLocation: outputLocationNegatives });

const outputLocationRetentions = `${appRootDir}/tmp/MCPS Missing Releases Report (Retentions).csv`;
const writerRetentions = new WriteCsv({ headers: ['Client ID', 'Client Name', 'Release ID', 'Release Title', 'Cat No', 'Accounting Period', 'Year'], outputLocation: outputLocationRetentions });


const mcpsNegatives = check(MCPSNegative, 'MCPSNegatives', writerNegatives, null, 0);
const mcpsRetentions = check(MCPSRetention, 'MCPSRetentions', writerRetentions, null, 0);

Promise.all([mcpsNegatives, mcpsRetentions]).then(() => {
  logger.info('✅ COMPLETE ✅')
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});
