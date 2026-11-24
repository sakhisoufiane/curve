require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Release = require('../models/release');
const Client = require('../models/client');
const WriteCsv = require('../libs/writeCsv');
const appRootDir = require('app-root-dir').get();

const releasesLimit = 1000;
const releasesBatchLimit = 500;
const invalidSalesReturnsRights = [];
const invalidCostsRights = [];
const ignoreReleasesWithContractAndPercentageZero = [];
const headers = [
  'RELEASE ID',
  'RELEASE TITLE',
  'CLIENT ID',
  'CLIENT NAME',
  'CONTRACT ID',
  'PERCENTAGE',
  'REASON FOR INVALID STATUS',
];
let processedCount = 0;
let batchNumber = 0;

async function checkAllReleasesParticipationRightsAndCosts(total, lastId) {
  let query = {};
  if (lastId !== null) {
    query._id = { $gt: lastId };
  }
  const releases = await Release.find(query).sort({ _id: 1 }).limit(releasesLimit).exec();
  const releasesTotalCount = await Release.countDocuments();
  const totalBatches = Math.ceil(releasesTotalCount / releasesLimit);
  batchNumber++;
  logger.info(`*******************Processing Batch Number ${batchNumber} / ${totalBatches} of ${releasesLimit} Releases out of ${releasesTotalCount} total Releases*******************`);

  await new Promise((resolve, reject) => {
    async.eachLimit(
      releases,
      releasesBatchLimit,
      async (release) => {
        if (release.salesReturnsRights) {
          for (const salesReturnsRight of release.salesReturnsRights) {
            if (salesReturnsRight.contractId && salesReturnsRight.percentage === 0) {
              ignoreReleasesWithContractAndPercentageZero.push(release._id);
            } else {
              if (!salesReturnsRight.contractId || !salesReturnsRight.percentage) {
                const releaseId = release._id.toString() || '';
                const releaseTitle = release.title || '';
                const clientId = release.clientId || '';
                const contractId = salesReturnsRight.contractId || '';
                const percentage = salesReturnsRight.percentage || '';
                const errorMessage = 'A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned';
                const client = await Client.findById(release.clientId).exec();
                const clientName = client ? client.name : '';
                invalidSalesReturnsRights.push([
                  releaseId,
                  releaseTitle,
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
        if (release.costsRights) {
          for (const costRight of release.costsRights) {
            if (costRight.contractId && costRight.percentage === 0) {
              ignoreReleasesWithContractAndPercentageZero.push(release._id);
            } else {
              if (!costRight.contractId || !costRight.percentage) {
                const releaseId = release._id.toString() || '';
                const releaseTitle = release.title || '';
                const clientId = release.clientId || '';
                const contractId = costRight.contractId || '';
                const percentage = costRight.percentage || '';
                const errorMessage = 'A Contract needs to be linked to a Percentage when a Cost Right is assigned';
                const client = await Client.findById(release.clientId).exec();
                const clientName = client ? client.name : '';
                invalidCostsRights.push([
                  releaseId,
                  releaseTitle,
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

  if (releases && releases.length === releasesLimit) {
    const lastRelease = releases[releases.length - 1];
    checkAllReleasesParticipationRightsAndCosts(total + releasesLimit, lastRelease._id);
  } else {
    logger.info(`*******************Processed ${processedCount} out of ${releasesTotalCount} Releases*******************`);

    if (invalidCostsRights.length > 0) {
      const filteredCostsRightsArray = invalidCostsRights.filter(obj => Object.keys(obj).length !== 0);
      await new Promise((resolve, reject) => {
      const outputLocation = `${appRootDir}/tmp/releasesInvalidCostsRightsCsv.csv`
      const costsRightsCsv = new WriteCsv({ headers: headers, outputLocation });
        costsRightsCsv.addData(filteredCostsRightsArray, () => {
          costsRightsCsv.write((err, location) => {
            if (err) {
              reject(err);
            } else {
            logger.info(`Costs Rights CSV file written successfully to ${location}`);
            resolve();
            }
          });
        });
      });
    }
    if (invalidSalesReturnsRights.length > 0) {
      const filteredSalesReturnsArray = invalidSalesReturnsRights.filter(obj => Object.keys(obj).length !== 0);
      await new Promise((resolve, reject) => {
      const outputLocation = `${appRootDir}/tmp/releasesInvalidSalesReturnsRights.csv`
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
    process.exit();
  }
}

checkAllReleasesParticipationRightsAndCosts(0, null).catch((err) => {
  logger.error('*******************ERROR*******************', err);
});
