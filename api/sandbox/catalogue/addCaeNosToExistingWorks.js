/*
Description: This script loops through all works and backfills the CAE where possible. It avoids using work.save to ensure deliveries are unaffected and calls workSchema.methods.addExtraChainData followed by findByIdAndUpdate.
Time To Run: 02:30:03
Ticket No: CUR-3366
Category: Data Backfill
Author: Joe Osborne
*/

require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const async = require('async');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }
const Work = require('../../models/work');
const WorkController = require('../../node_modules/@curveroyaltysystems/curve-shared-logic/controllers/work');

const batchFindSize = 1000;
let batchRun = 0;
const outputLocation = `${appRootDir}/tmp/caesUpdatedOnWorksErrors.csv`;

// Initialize the output file with headers if it doesn't exist
if (!fs.existsSync(outputLocation)) {
  fs.writeFileSync(outputLocation, 'WORK ID,STATUS\n');
}

// Function to write an individual error report directly to the file
const writeErrorToReport = (workId, reason) => {
  const outputData = `${workId},ERROR: ${reason}\n`;
  try {
    fs.appendFileSync(outputLocation, outputData);
  } catch (err) {
    logErr(`Error Writing Data: ${err}`);
  }
};

// Main function to add CAE numbers to existing works
const addCaeNosToExistingWorks = async (lastId = null) => {
  log(`Starting the CAE backfill process for batch ${batchRun++}`);

  let query = { usedComposerIds: { $exists: true, $ne: [] }};
  if (lastId) {
    query._id = { $gt: lastId };
  }
    
  // Fetch a batch of works
  const works = await Work.find(query, { _id: 1, clientId: 1, rightsChain: 1, usedComposerIds: 1, usedPublisherIds: 1 }).sort({ _id: 1 }).limit(batchFindSize).exec();

  if (works.length !== 0) {
    log(`Found ${works.length} works to process in batch ${batchRun}`);
    let successCount = 0;
    let errorCount = 0;
    await async.eachLimit(works, 100, async (work) => {
      try {
        // Get the old data before making changes
        const oldWork = JSON.parse(JSON.stringify(work));

        // Await the addExtraChainData function call
        await work.addExtraChainData();

        // Perform significant update check before updating the document
        const significantUpdate = WorkController.significantUpdateCheck({ work, oldWork });

        if (significantUpdate.length > 0) {
          const reason = `Significant Update ${significantUpdate.map((field) => field).join(', ')}`;
          log(`Significant Update ${reason}`);
          writeErrorToReport(work._id.toString(), reason);
        } else {
          await Work.findByIdAndUpdate(work._id, { $set: { rightsChain: work.rightsChain }, timestamps: false });
        }
        successCount++;
      } catch (err) {
        errorCount++;
        writeErrorToReport(work._id.toString(), err.message);
      }
    });
    log(`Completed processing batch ${batchRun}. ${successCount} works updated, ${errorCount} errors encountered.`);

    const lastProcessedId = works[works.length - 1]._id;
    await addCaeNosToExistingWorks(lastProcessedId);  
  } else {
    log(`No more works to process. Completed all batches.`);
    process.exit(0);
  }
};

// Start the CAE backfill process
addCaeNosToExistingWorks();
