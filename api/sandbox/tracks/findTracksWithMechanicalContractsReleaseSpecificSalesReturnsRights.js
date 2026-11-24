/*
Description: Find tracks linked to contracts with type "Mechanical"
Time to run: Staging: 49s
Ticket No: CURV-3362
Category: Track/Contract
Author: [Omar Abbas]
*/

require("dotenv").config();
const appRootDir = require("app-root-dir").get();
require("../../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const { WriteCsv } = require("@curveroyaltysystems/curve-shared-logic");
const async = require('async');
const Track = require("../../models/track");
const Contract = require("../../models/contract");

const FETCH_TRACK_LIMIT = 1000;
const PROCESSING_LIMIT = 50;

const run = async () => {
  logger.info("Script findTracksLinkedToMechanicalContracts started");
  const startTime = Date.now();
  try {
    let lastTrackId = null;
    let tracksBatch;

    do {
      tracksBatch = await Track.find({
        releaseSpecificSalesReturnsRights: { $exists: true, $ne: [] },
        ...(lastTrackId && { _id: { $gt: lastTrackId } })
      })
      .sort({ _id: 1 })
      .limit(FETCH_TRACK_LIMIT);
      console.log("processing batch starting with: ", lastTrackId)
      if (tracksBatch.length > 0) {
        await async.eachLimit(tracksBatch, PROCESSING_LIMIT, async (track) => {
          const contractIds = track.releaseSpecificSalesReturnsRights.map(item => item.contractId);
          const contracts = await Contract.find({
            _id: { $in: contractIds },
            contractType: 'Mechanical'
          });
          if (contracts.length > 0) {
            console.log(`Track ID: ${track._id}, Track Name: ${track.title}, Linked Mechanical Contracts: ${contracts.map(c => c._id).join(', ')}`);
          }
        });

        lastTrackId = tracksBatch[tracksBatch.length - 1]._id;
      }
    } while (tracksBatch.length > 0);
    console.log("FINISHED");
    const endTime = Date.now();
    console.log(`Execution Time: ${(endTime - startTime) / 1000} seconds`);
  } catch (error) {
    logger.error(error);
    process.exit(-1);
  }
};

run();
