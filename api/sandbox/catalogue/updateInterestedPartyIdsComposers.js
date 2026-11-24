/*
Description: Updates Interested Party IDs for Composers
Time To Run: 00:00:20s
Ticket No: CUR-3304
Category: Composers
Author: Joe Osborne
Usage: node sandbox/catalogue/updateInterestedPartyIdsComposers.js "/Users/kassim/Documents/dev/api/tmp/composers.xlsx" 1 9 8 --dry-run
*/
require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const ImportXlsx = require('../../libs/importXlsx');
const Composer = require('../../models/composer');
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
      process.exit(0);
    }

    const splicedData = data.splice(removeRows);
    const mappedData = splicedData.map((data) => ({ id: data[idColNumber - 1], updatedId: data[partyIdColNumber - 1] }));
    const composerIds = mappedData.map((composer) => composer.id);
    const updatedInterestedPartyId = mappedData.map((partyIds) => partyIds.updatedId);
    const composers = await Composer.find({ _id: { $in: composerIds } }, { _id: 1, interestedPartyId: 1 });

    async.eachLimit(composers, 50, async (composer) => {
      const index = composerIds.indexOf(composer._id.toString());
      const updatedPartyId = updatedInterestedPartyId[index];
      log(` ${isDryRun ? 'DRY RUN - ' : ''}Updating ${composer._id} with ${updatedPartyId}`);
      try {
        if (!isDryRun) {
          const oldComposer = await Composer.findByIdAndUpdate(composer._id, { $set: { interestedPartyId: updatedPartyId } }, { timestamps: false });
          if (oldComposer) {
            log(`Updated ${composer._id} FROM ${oldComposer.interestedPartyId} TO ${updatedPartyId}`);
          }
        }
      } catch (updateErr) {
        logErr(`Error updating composer ${composer._id}: ${updateErr}`);
        process.exit(-1);
      }
    }, (finalErr) => {
      if (finalErr) {
        logErr(`Error during update process: ${finalErr}`);
        process.exit(0);
      } else {
        log(`All updates processed successfully.`);
        process.exit(-1);
      }
    });
  });
};

updateInterestedPartyIds();
