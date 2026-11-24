

require('dotenv').config();
require('../../models/db');
const csv = require('csv-parser');
const fs = require('fs');
const _ = require("lodash");
const { ObjectId } = require('mongodb');
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { argv } = require('node:process');
const Release = require('../../models/release');

const rows = [];

const run = () => {
  logger.info('setSpecificDealerPrices.js: Started');

  const [, , filePath] = argv

  if (!filePath) {
    logger.error('\x1b[41m \x1b[33m Provide CSV file path\x1b[0m');
    process.exit(1);
  }


  fs.createReadStream(filePath)
    .on('error', (e) => {
      logger.error(`\x1b[41m \x1b[33m ${e.message}\x1b[0m`);
      process.exit(1);
    })
    .pipe(csv())
    .on('headers', (headers) => {
      // Make sure all headers are present correctly
      if (!['ID', 'CURRENCY', 'PPD'].every(header => headers.includes(header))) {
        logger.error(`\x1b[41m \x1b[33m Headers are incorrect they should be: ID,CURRENCY,PPD\x1b[0m`);
        process.exit(1);
      }
    })
    .on('data', (row) => {
      rows.push(row);
    })
    .on('end', updateReleases)

}

const updateReleases = async () => {

  const uniqueRows = _.uniqWith(rows, _.isEqual);
  if (rows.length !== uniqueRows.length) {
    logger.info(`setSpecificDealerPrices.js: \x1b[43m\x1b[30m There are ${rows.length - uniqueRows.length} duplicates \x1b[0m`);
  }

  const releases = await Release.find({ _id: { $in: uniqueRows.map(({ ID }) => new ObjectId(ID)) } });

  const releasesToUpdate = uniqueRows.map(row => {
    const release = releases.find((release) => row.ID === release._id.toString());

    if (!release) {
      logger.info(`setSpecificDealerPrices.js: \x1b[43m\x1b[30m Release doesn't exist: ${row.ID} \x1b[0m`);
      return null;
    }

    const priceCategoryDealerPrice = release.priceCategoryDealerPrices.find((pcdp) => pcdp.territory === 'WW' && pcdp.currency === row.CURRENCY && pcdp.dealerPrice.toString() === row.PPD);
    if (priceCategoryDealerPrice) {
      logger.info(`setSpecificDealerPrices.js: \x1b[43m\x1b[30m Update skipped - dealer price is already set for Release: ${release._id} \x1b[0m`);
      return null;
    }
    release.priceCategoryDealerPrices.push({ territory: 'WW', currency: row.CURRENCY, dealerPrice: row.PPD });
    return release;
  }).filter((release) => release);

  logger.info('setSpecificDealerPrices.js: Updating releases...');
  await eachLimit(releasesToUpdate, 10, async (release) => {
    try {
      await release.save();
    } catch (e) {
      logger.error(`\x1b[41m \x1b[33m ${e.message}\x1b[0m`);
    }
  });

  logger.info('setSpecificDealerPrices.js: Complete');
  process.exit(0);
}


run();