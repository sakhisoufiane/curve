/*
Description: Updates Interested Party IDs for Publishers
Time To Run: 00:00:20s
Ticket No: CUR-3304
Category: Publishers
Author: Joe Osborne
node sandbox/catalogue/updateInterestedPartyIdsPublishers.js "/Users/kassim/Documents/dev/api/tmp/kassim-test.xlsx" 1 9 8 --dry-run  
*/
require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const ImportXlsx = require('../../libs/importXlsx');
const Publisher = require('../../models/publisher');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }

const updateInterestedPartyIds = async () => {

  const [, , file, removeRows = 0, idColNumber, partyIdColNumber] = process.argv;
  const isDryRun = process.argv.includes('--dry-run')

  if (isDryRun) {
    log('This is a dry run so no changes will be made');
  }

  if (!file) {
    logErr(`File location not provided`);
    process.exit(-1);
  }

  if (!idColNumber) {
    logErr(`Publisher ID index was not provided`);
    process.exit(-1);
  }

  if (!partyIdColNumber) {
    logErr(`Party ID index was not provided`);
    process.exit(-1);
  }
  
  ImportXlsx.getData(file, 0, async (err, data) => {
    if (err) {
      logErr(`Error reading data from file: ${err}`);
      process.exit(-1); 
    }

    const splicedData = data.splice(removeRows);
    const mappedData = splicedData.map((data) => ({ id: data[idColNumber - 1], updatedId: data[partyIdColNumber - 1] }));
    const publisherIds = mappedData.map((publisher) => publisher.id);
    const updatedInterestedPartyId = mappedData.map((partyIds) => partyIds.updatedId);
    const publishers = await Publisher.find({ _id: { $in: publisherIds } }, { _id: 1, interestedPartyId: 1 });
    
    async.eachLimit(publishers, 50, async (publisher) => {
      const index = publisherIds.indexOf(publisher._id.toString());
      const updatedPartyId = updatedInterestedPartyId[index];
      log(` ${isDryRun ? 'DRY RUN - ' : ''}Updating ${publisher._id} with ${updatedPartyId}`);
      try {
        if (!isDryRun) {
          const oldPublisher = await Publisher.findByIdAndUpdate(publisher._id, { $set: { interestedPartyId: updatedPartyId } }, { timestamps: false });
          if (oldPublisher) {
            log(`Updated ${publisher._id} FROM ${oldPublisher.interestedPartyId} TO ${updatedPartyId}`);
          }
        }
      } catch (updateErr) {
        logErr(`Error updating publisher ${publisher._id}: ${updateErr}`);
        process.exit(-1);
      }
    }, (finalErr) => {
      if (finalErr) {
        logErr(`Error during update process: ${finalErr}`);
        process.exit(-1);
      } else {
        log(`All updates processed successfully.`);
        process.exit(0);
      }
    });
  });
};

updateInterestedPartyIds();
