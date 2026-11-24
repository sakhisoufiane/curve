require('dotenv').config();
require('../models/db');

const { eachLimit } = require('async');
const { BigQuery, logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('../models/client');
const UnmappedWork = require('../models/unmappedWork');

function formatString(input) {
  // Replace single quotes with escaped single quotes
  const formattedString = input.replace(/'/g, "\\'");
  return formattedString;
};

async function getNetAmount(bigQuery, work) {
  const selectCols = [
    { column: 'originalIdentifier', isSelector: true, isGroupBy: true },
    { column: 'originalWorkTitle', isSelector: true, isGroupBy: true },
  ];
  const sumCols = [{ column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' }];
  const options = { orderBy: 'originalIdentifier', orderDir: 'ASC', limit: 1000 };
  const filter = { salesFileId: work.salesFileId };

  if (work.identifier) { filter.originalIdentifier = work.identifier; }
  if (work.iswc) { filter.iswc = work.iswc; }
  if (work.tunecode) { filter.tunecode = work.tunecode; }
  if (work.songcode) { filter.songcode = work.songcode; }

  if (work.party1) { filter.party1 = formatString(work.party1); }
  if (work.party2) { filter.party2 = formatString(work.party2); }
  if (work.party3) { filter.party3 = formatString(work.party3); }
  if (work.party4) { filter.party4 = formatString(work.party4); }
  if (work.party5) { filter.party5 = formatString(work.party5); }

  if (work.title && !work.identifier && !work.iswc && !work.tunecode && !work.songcode) { filter.originalWorkTitle = formatString(work.title); }

  return new Promise((resolve, reject) => {
    bigQuery.getAggregate(bigQuery.inputTable, selectCols, sumCols, 'lines', filter, options, (getAggregateErr, salesData) => {
      if (getAggregateErr) {
        reject(getAggregateErr);
      } else {
        resolve(salesData);
      }
    });
  });
}

const updateUnmappedWorks = async ({ lastId, count }) => {
  const limit = 1000;

  const query = {};
  if (lastId) { query._id = { $gt: lastId } }

  const unmappedWorks = await UnmappedWork.find(query).sort({ _id: 1 }).limit(limit);
  if (!unmappedWorks?.length) throw new Error('No Unmapped Works found');

  await eachLimit(unmappedWorks, 100, async (unmappedWork) => {
    const client = await Client.findById(unmappedWork.clientId);

    if (!client) {
      logger.error(`No Client found: ${unmappedWork.clientId} | Unmapped Work ID: ${unmappedWork._id.toString()}`)
      return;
    }
    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

    const salesData = await getNetAmount(bigQuery, unmappedWork);

    unmappedWork.netAmount = parseFloat(salesData?.[0]?.homeCurrencyNetAmount?.toFixed(4) ?? 0);
    await unmappedWork.save();
  });

  // Log Progress
  const message = `Completed ${unmappedWorks.length} of ${count}`;
  process.stdout.write(`\r${message}`);

  if (unmappedWorks.length === limit) {
    const newLastId = unmappedWorks[unmappedWorks.length - 1]._id;
    const newCount = count + unmappedWorks.length;

    await updateUnmappedWorks({ lastId: newLastId, count: newCount }); 
  }
};

logger.info('Initialising Script')
updateUnmappedWorks({ lastId: null, count: 0 }).then(() => {
  logger.info('🍻 Script Complete 🍻')
  logger.debug("By the time you have run this, publishing has completed. All the blood, sweat and tears is behind you. Congratulations, I'd like to thank Jim, Dite and all the Devs/QA involved, mum, dad, god. I wonder what life will be like at this point in time, for you reading this it is the present, but for me it's the future. Will we have flying cars? How's Daddy Soufiane doing? What will Jim and the CMs cook up next?");
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  logger.error('🤬 Could not complete script 🤬')
  process.exit(0);
});
