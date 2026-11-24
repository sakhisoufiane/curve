/*
Description: Updates society name HMS to ECCO
Time To Run: 00:00:45s (Staging)
Ticket No: SUP-753
Category: Publishing, Collection Societies
Author: Joe Osborne
*/
require("dotenv").config();
require("../../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const async = require("async");
const border = "********";
const DeliveryPartner = require("../../models/deliveryPartner");
const Composer = require("../../models/composer");
const Publisher = require("../../models/publisher");
const Work = require("../../models/work");
const CwrDelivery = require("../../models/cwrDelivery");
const log = (message) => { logger.info(`${border} ${message} ${border}`); }

const run = async () => {
  log('Starting script');
  const updateOptions = { timestamps: false };

  await Composer.updateMany({mainPro: {"$exists": true, "$eq": "HMS"}}, { $set: { mainPro: "ECCO" } }, updateOptions);
  await Publisher.updateMany({ mainPro:  {"$exists": true, "$eq": "HMS"}}, { $set: { mainPro: "ECCO" } }, updateOptions);
  await DeliveryPartner.updateMany({ receivingParty: {"$exists": true, "$eq": "HMS"}}, { $set: { receivingParty: "ECCO" } }, updateOptions);
  await DeliveryPartner.updateMany({ splitElectionPRO:  {"$exists": true, "$eq": "HMS"} }, { $set: { splitElectionPRO: "ECCO" } }, updateOptions);
  await CwrDelivery.updateMany({ receivingParty:  {"$exists": true, "$eq": "HMS"}}, { $set: { receivingParty: "ECCO" } }, updateOptions);
  const works = await Work.find({ "societyIdentifiers.society":  {"$exists": true, "$eq": "HMS"}});

  if (works.length) {
    await async.eachLimit(works, 100, async (work) => {
      if (work.societyIdentifiers.length) {
        await async.eachSeries (work.societyIdentifiers, async (societyIdentifier) => {
          if (societyIdentifier.society === 'HMS') {
            const index = work.societyIdentifiers.indexOf(societyIdentifier);
            // Update the specific element in the array
            let update = { $set: {} };
            update.$set[`societyIdentifiers.${index}.society`] = 'ECCO';
    
            await Work.updateOne({ _id: work._id }, update, updateOptions);
          }
        });
      }
    });
  }
  log('Script complete');
  process.exit(0);
}

run();

