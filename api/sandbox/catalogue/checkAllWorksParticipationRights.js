require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');
const WriteCsv = require('../libs/writeCsv');
const appRootDir = require('app-root-dir').get();

const worksLimit = 1000;
const worksBatchLimit = 500;
const invalidSalesReturnsRights = [];
const invalidChannelSpecificSalesReturnsRights = [];
const ignoreWorksWithContractAndPercentageZero = [];
const headers = [
  'WORK ID',
  'WORK TITLE',
  'CLIENT ID',
  'CLIENT NAME',
  'CONTRACT ID',
  'PERCENTAGE',
  'REASON FOR INVALID STATUS',
];
let processedCount = 0;
let batchNumber = 0;

async function checkAllWorksParticipationRights(total, lastId) {
  let query = {};
  if (lastId !== null) {
    query._id = { $gt: lastId };
  }
  const works = await Work.find(query).sort({ _id: 1 }).limit(worksLimit).exec();
  const worksTotalCount = await Work.countDocuments();
  const totalBatches = Math.ceil(worksTotalCount / worksLimit);
  batchNumber++;
  logger.info(`*******************Processing Batch Number ${batchNumber} / ${totalBatches} of ${worksLimit} Works out of ${worksTotalCount} total Works*******************`);

  await new Promise((resolve, reject) => {
    async.eachLimit(
      works,
      worksBatchLimit,
      async (work) => {
        if (work.salesReturnsRights) {
          for (const salesReturnsRight of work.salesReturnsRights) {
            if (salesReturnsRight.contractId && salesReturnsRight.percentage === 0) {
              ignoreWorksWithContractAndPercentageZero.push(work._id);
            } else {
              if (!salesReturnsRight.contractId || !salesReturnsRight.percentage) {
                const workId = work._id.toString() || '';
                const workTitle = work.title || '';
                const clientId = work.clientId || '';
                const contractId = salesReturnsRight.contractId || '';
                const percentage = salesReturnsRight.percentage || '';
                const errorMessage = 'A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned';
                const client = await Client.findById(work.clientId).exec();
                const clientName = client ? client.name : '';
                invalidSalesReturnsRights.push([
                  workId,
                  workTitle,
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
        if (work.channelSpecificSalesReturnsRights) {
          for (const specificSalesReturnsRight of work.channelSpecificSalesReturnsRights) {
            if (specificSalesReturnsRight.contractId && specificSalesReturnsRight.percentage === 0) {
              ignoreWorksWithContractAndPercentageZero.push(work._id);
            } else {
              if (!specificSalesReturnsRight.contractId || !specificSalesReturnsRight.percentage) {
                const workId = work._id.toString() || '';
                const workTitle = work.title || '';
                const clientId = work.clientId || '';
                const contractId = specificSalesReturnsRight.contractId || '';
                const percentage = specificSalesReturnsRight.percentage || '';
                const errorMessage = 'A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned';
                const client = await Client.findById(work.clientId).exec();
                const clientName = client ? client.name : '';
                invalidChannelSpecificSalesReturnsRights.push([
                  workId,
                  workTitle,
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

  if (works && works.length === worksLimit) {
    const lastWork = works[works.length - 1];
    checkAllWorksParticipationRights(total + worksLimit, lastWork._id);
  } else {
    logger.info(`*******************Processed ${processedCount} out of ${worksTotalCount} works*******************`);

    if (invalidChannelSpecificSalesReturnsRights.length > 0) {
      const filteredChannelSpecificArray = invalidChannelSpecificSalesReturnsRights.filter(obj => Object.keys(obj).length !== 0);
      await new Promise((resolve, reject) => {
      const outputLocation = `${appRootDir}/tmp/worksChannelSpecificInvaludSalesReturnsRights.csv`
      const channelSpecificSalesReturnsCsv = new WriteCsv({ headers: headers, outputLocation });
        channelSpecificSalesReturnsCsv.addData(filteredChannelSpecificArray, () => {
          channelSpecificSalesReturnsCsv.write((err, location) => {
            if (err) {
              reject(err);
            } else {
            logger.info(`Channel Specific Sales Returns CSV file written successfully to ${location}`);
            resolve();
            }
          });
        });
      });
    }
    if (invalidSalesReturnsRights.length > 0) {
      const filteredSalesReturnsArray = invalidSalesReturnsRights.filter(obj => Object.keys(obj).length !== 0);
      await new Promise((resolve, reject) => {
      const outputLocation = `${appRootDir}/tmp/worksInvalidSalesReturnsRights.csv`
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

checkAllWorksParticipationRights(0, null).catch((err) => {
  logger.error('*******************ERROR*******************', err);
});
