/*
Description: A script to identify Tracks that have Mechanical Licenses with rates not empty and below 100 
Time To Run (Staging): 00:00:25s
Ticket No: SUP-855
Category: Tracks, Mechanicals
Author: Joe Osborne
*/
require('dotenv').config();
require('../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Track = require('../models/track');
const WriteCsv = require('../libs/writeCsv');
const Client = require('../models/client');

const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }
let count = 0;
const tracksForReport = [];

const getTracksWithMechanicalLicensesNotEqualToAHundred = async (lastId) => {
  count++;
  log(`Searching Tracks round: ${count}`);
  let filter = {
    mechanicalLicenses: {
      $elemMatch: { 
        rate: { 
          $nin: [100, "100", null, ""],
          $exists: true
        }
      }
    }
  };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  const limit = 1000;
  const foundTracks = await Track.find(filter, { _id: 1, clientId: 1, mechanicalLicenses: 1 }).sort({ _id: 1 }).limit(limit);
  
  const modifiedTracks = foundTracks.map(trackDoc => {
    let track = trackDoc.toObject();
    let trackCount = 0;
    track.mechanicalLicenses.forEach((license) => {
      trackCount++;
      if (license.rate && license.rate !== 100 && license.rate !== '100') {
        track[`rate${trackCount}`] = license.rate ? license.rate : '';
        track[`share${trackCount}`] = license.share ? license.share : '';
        track[`contract${trackCount}`] = license.contractId ? license.contractId : '';
      }
    });
    return track;
  });

  tracksForReport.push(...modifiedTracks);
  
  if (foundTracks.length === limit) {
    lastId = foundTracks[foundTracks.length - 1]._id;
    await getTracksWithMechanicalLicensesNotEqualToAHundred(lastId);
  } else {
    const uniqueClientIds = [...new Set(tracksForReport.map(track => track.clientId))];
    const clientNames = await getClientNames(uniqueClientIds);
    tracksForReport.forEach(track => { track.clientName = clientNames[track.clientId] || 'Unknown' });
    await writeReport();
  }
};

const getClientNames = async (clientIds) => {
  const clientNames = {};
  await async.eachLimit(clientIds, 50, async (clientId) => {
    const client = await Client.findById(clientId, { name: 1 });
    if (client) {
      clientNames[clientId] = client.name;
    }
  });
  return clientNames;
};

const writeReport = async () => {
  const outputLocation = `${appRootDir}/tmp/tracksWithMechanicalLicensesNotEqualToAHundred.csv`;
  const writer = new WriteCsv({ headers: ['CLIENT NAME', 'CLIENT ID', 'TRACK ID', 'MECHANICAL LICENSE RATE', 'MECHANICAL LICENSE SHARE', 'MECHANICAL LICENSE CONTRACT'], outputLocation });
  const outputData = tracksForReport.map((line) => [line.clientName, line.clientId, line._id, line.rate1, line.share1, line.contract1]);
  writer.addData(outputData, () => {
    return new Promise((resolve, reject) => {
      writer.write((err, location) => {
        if (err) {
          logErr(`Error writing CSV: ${err}`);
          reject(err);
        } else {
          log(`${location}`);
          resolve();
          process.exit(-1); 
        }
      });
    });
  });
};

getTracksWithMechanicalLicensesNotEqualToAHundred(null);
