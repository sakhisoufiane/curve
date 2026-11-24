/*
Description: Changes the mainIdentifier of works to a new format based on a prefix and an incrementing number.
Time To Run: Depends on number of Works.
Ticket No: CUR-3352
Category: Works
Author: Attilio Andrea Marotta
*/

// Packages
require('dotenv').config();
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
// Model
require('../../models/db');
const Work = require('../../models/work');

// Variables
let increment = 1;

const processWorksBatch = async ({ clientId, prefix, batchLimit, lastId }) => {
    
    const query = { clientId };
    if (lastId) { query._id = { $gt: lastId }; }

    const works = await Work.find(query).select({_id: 1, identifier: 1, title: 1 }).sort({ _id: 1 }).limit(batchLimit);
    if (!works?.length) return;

    await eachLimit(works, 10, async (work) => {
        let newIdentifier = `${prefix}${increment}`;
        logger.info(`Updating mainIdentifier of ${work.title} to ${newIdentifier}`);
        await Work.findByIdAndUpdate(work._id, { identifier: newIdentifier });
        increment++;
    });

    if (works.length === batchLimit) {
      await processWorksBatch({ clientId, prefix, batchLimit, lastId: works[works.length - 1]._id});
    } else {
      console.log('Main Identifiers successfully updated');
    }
  };

// Variable declarations for MoonBug. 
const clientId = '62dfb65da85cf9d0debce026';
const prefix = 'MB';
const batchLimit = 1000;

// Function Execution
processWorksBatch({clientId, prefix, batchLimit}).then(() => {
    logger.info('Done ✅');
    process.exit(0);
  }).catch((err) => {
    logger.error('🚨', err);
    process.exit(1);
  });