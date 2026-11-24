require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Track = require('../models/track');
const Client = require('../models/client');
const WriteCsv = require('../libs/writeCsv');
const appRootDir = require('app-root-dir').get();

const tracksLimit = 1000;
const tracksBatchLimit = 500;
const invalidSalesReturnsRights = [];
const invalidReleaseSpecificSalesReturnsRights = [];
const invalidCostsRights = [];
const ignoreTracksWithContractAndPercentageZero = [];
const headers = [
  'TRACK ID',
  'TRACK TITLE',
  'CLIENT ID',
  'CLIENT NAME',
  'CONTRACT ID',
  'PERCENTAGE',
  'REASON FOR INVALID STATUS',
];
const releaseSpecificheaders = [
  'TRACK ID',
  'TRACK TITLE',
  'CLIENT ID',
  'CLIENT NAME',
  'RELEASE ID',
  'CONTRACT ID',
  'PERCENTAGE',
  'REASON FOR INVALID STATUS',
];
let processedCount = 0;
let batchNumber = 0;

async function checkAllTracksParticipationAndCostsRights(total, lastId) {
  let query = {};
  if (lastId !== null) {
    query._id = { $gt: lastId };
  }
  const tracks = await Track.find(query).sort({ _id: 1 }).limit(tracksLimit).exec();
  const tracksTotalCount = await Track.countDocuments();
  const totalBatches = Math.ceil(tracksTotalCount / tracksLimit);
  batchNumber++;
  logger.info(`*******************Processing Batch Number ${batchNumber} / ${totalBatches} of ${tracksLimit} Tracks out of ${tracksTotalCount} total Tracks*******************`);

  await new Promise((resolve, reject) => {
    async.eachLimit(
      tracks,
      tracksBatchLimit,
      async (track) => {
        if (track.salesReturnsRights) {
          for (const salesReturnsRight of track.salesReturnsRights) {
            if (salesReturnsRight.contractId && salesReturnsRight.percentage === 0) {
              ignoreTracksWithContractAndPercentageZero.push(track._id);
            } else {
              if (!salesReturnsRight.contractId || !salesReturnsRight.percentage) {
                const trackId = track._id.toString() || '';
                const trackTitle = track.title || '';
                const clientId = track.clientId || '';
                const contractId = salesReturnsRight.contractId || '';
                const percentage = salesReturnsRight.percentage || '';
                const errorMessage = 'A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned';
                const client = await Client.findById(track.clientId).exec();
                const clientName = client ? client.name : '';
                invalidSalesReturnsRights.push([
                  trackId,
                  trackTitle,
                  clientId,
                  clientName,
                  contractId,
                  percentage,
                  errorMessage,
                ]);
              }
            }
          }
        }
        if (track.releaseSpecificSalesReturnsRights) {
          for (const specificSalesReturnsRight of track.releaseSpecificSalesReturnsRights) {
            if (specificSalesReturnsRight.contractId && specificSalesReturnsRight.percentage === 0) {
              ignoreTracksWithContractAndPercentageZero.push(track._id);
            } else {
              if (!specificSalesReturnsRight.contractId || !specificSalesReturnsRight.percentage || !specificSalesReturnsRight.releaseId) {
                const trackId = track._id.toString() || '';
                const trackTitle = track.title || '';
                const clientId = track.clientId || '';
                const contractId = specificSalesReturnsRight.contractId || '';
                const percentage = specificSalesReturnsRight.percentage || '';
                const releaseId = specificSalesReturnsRight.releaseId || '';
                const errorMessage = 'Release, Contract and Percentage are required when a Release Specific Sales/Returns Right is assigned';
                const client = await Client.findById(track.clientId).exec();
                const clientName = client ? client.name : '';
                invalidReleaseSpecificSalesReturnsRights.push([
                  trackId,
                  trackTitle,
                  clientId,
                  clientName,
                  releaseId,
                  contractId,
                  percentage,
                  errorMessage,
                ]);
              }
            }
          }
        }
        if (track.costsRights) {
          for (const costRights of track.costsRights) {
            if (costRights.contractId && costRights.percentage === 0) {
              ignoreTracksWithContractAndPercentageZero.push(track._id);
            } else {
              if (!costRights.contractId || !costRights.percentage) {
                const trackId = track._id.toString() || '';
                const trackTitle = track.title || '';
                const clientId = track.clientId || '';
                const contractId = costRights.contractId || '';
                const percentage = costRights.percentage || '';
                const errorMessage = 'Contract and Percentage are required when a Cost Right is assigned';
                const client = await Client.findById(track.clientId).exec();
                const clientName = client ? client.name : '';
                invalidCostsRights.push([
                  trackId,
                  trackTitle,
                  clientId,
                  clientName,
                  contractId,
                  percentage,
                  errorMessage,
                ]);
              }
            }
          }
        }
        processedCount++;
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });

  if (tracks && tracks.length === tracksLimit) {
    const lastTrack = tracks[tracks.length - 1];
    checkAllTracksParticipationAndCostsRights(total + tracksLimit, lastTrack._id);
  } else {
    logger.info(`*******************Processed ${processedCount} out of ${tracksTotalCount} Tracks*******************`);

    if (invalidReleaseSpecificSalesReturnsRights.length > 0) {
      const filteredReleaseSpecificArray = invalidReleaseSpecificSalesReturnsRights.filter(obj => Object.keys(obj).length !== 0);
      await new Promise((resolve, reject) => {
      const outputLocation = `${appRootDir}/tmp/tracksReleaseSpecificInvalidSalesReturnsRights.csv`
      const releaseSpecificSalesReturnsCsv = new WriteCsv({ headers: releaseSpecificheaders, outputLocation });
        releaseSpecificSalesReturnsCsv.addData(filteredReleaseSpecificArray, () => {
          releaseSpecificSalesReturnsCsv.write((err, location) => {
            if (err) {
              reject(err);
            } else {
            logger.info(`Release Specific Sales Returns CSV file written successfully to ${location}`);
            resolve();
            }
          });
        });
      });
    }
    if (invalidSalesReturnsRights.length > 0) {
      const filteredSalesReturnsArray = invalidSalesReturnsRights.filter(obj => Object.keys(obj).length !== 0);
      await new Promise((resolve, reject) => {
      const outputLocation = `${appRootDir}/tmp/tracksInvalidSalesReturnsRights.csv`
      const salesReturnsCsv = new WriteCsv({ headers: headers, outputLocation });
        salesReturnsCsv.addData(filteredSalesReturnsArray, () => {
          salesReturnsCsv.write((err, location) => {
            if (err) {
              reject(err);
            } else {
            logger.info(`Sales Returns CSV file written successfully to ${location}`);
            resolve();
            }
          });
        });
      });
    }
    if (invalidCostsRights.length > 0) {
      const filteredCostsRightsArray = invalidCostsRights.filter(obj => Object.keys(obj).length !== 0);
      await new Promise((resolve, reject) => {
      const outputLocation = `${appRootDir}/tmp/tracksInvalidCostsRights.csv`
      const costsRightsCsv = new WriteCsv({ headers: headers, outputLocation });
        costsRightsCsv.addData(filteredCostsRightsArray, () => {
          costsRightsCsv.write((err, location) => {
            if (err) {
              reject(err);
            } else {
            logger.info(`Sales Returns CSV file written successfully to ${location}`);
            resolve();
            }
          });
        });
      });
    }
    process.exit();
  }
}

checkAllTracksParticipationAndCostsRights(0, null).catch((err) => {
  logger.error('*******************ERROR*******************', err);
});
