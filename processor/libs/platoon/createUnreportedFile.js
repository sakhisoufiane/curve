/* eslint-disable no-await-in-loop */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { ObjectId } = require('mongodb');

const Period = require('../../models/period');

// S3 location: platoon/unreported/
const unreportedFile = `${appRootDir}/tmp/Platoon Unreported ${moment().format('YYYYMMDDHHmmSSsss')}.csv`;

const createUnreportedFromAllPreviousFiles = async () => {
  // Get all periods
  const periods = await Period.find({ _id: { $ne: new ObjectId('67698bc2dac07e60d86e89a6') }, clientId: '5fb257481723790061f46859' }).sort({ createdAt: -1 });
  // const periods = await Period.find({ _id: new ObjectId('66327fa468d57c977c51bc09') }).sort({ createdAt: -1 });
  logger.info(`Platoon: Found ${periods.length} periods`);
  // Loop through periods
  for (const period of periods) {
    logger.info(`Platoon: Period ${period.platoon}`);
    // Get all files
    // Only return first 10 for testing
    const { files } = period.platoon;
    // files = files.slice(0, 5);
    if (files && files.length > 0) {
      logger.info(`Platoon: Found files ${files.length}`);
      // Loop through files
      for (const file of files) {
        if (file.includes('PLAYDATA')) {
          logger.info(`Platoon: Downloading file ${file}`);
          // Get data from CSV
          const data = await extractDataFromFile(file);
          // Create unreported file
          await extractAndWriteUnreported(data);
          // Log
          logger.info(`Platoon: Unreported file created for ${file}`);
        } else {
          logger.info(`Platoon: Skipping file ${file}`);
        }
        // if (files.indexOf(file) === files.length - 1) {
        //   // Upload file to S3
        //   const s3Key = `Platoon/Unreported/Platoon Unreported ${moment().format('YYYYMMDDHHmmSSsss')}.csv`;
        //   fileManager.uploadToS3(s3Key, unreportedFile, async (err, remoteKey) => {
        //     logger.info(`Platoon: Unreported file uploaded to S3 ${remoteKey}`);
        //     const period = await Period.findById('66327fa468d57c977c51bc09');
        //     period.platoon.unreportedFileOutput = remoteKey;
        //     period.platoon.unreportedFileCreated = new Date();
        //     await period.save();
        //   });
        // }
      }
    }
  }
};

const extractDataFromFile = async (file) => new Promise((resolve, reject) => {
  // Download file from S3
  fileManager.downloadFromS3(file, process.env.S3_bucket, async (err, localFile) => {
    const data = [];
    fs.createReadStream(localFile)
      .on('data', (output) => {
        if (Buffer.isBuffer(output)) {
          output = output.toString();
        }
        // Split by line
        const lines = output.split('\n');
        lines.forEach((line) => {
          line = line.split('|');
          // Skip header
          if (line[0] !== 'Sales Line ID') {
            data.push(line);
          }
        });
      })
      .on('end', () => {
        resolve(data);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
});

const extractAndWriteUnreported = async (data) => {
  const unreported = filterUnreported(data);
  // Turn unreported into a string from array of arrays
  const unreportedString = unreported.map((row) => row.join('|')).join('\n');
  // Add to unreported file
  await addToUnreported(unreportedString);
};

const filterUnreported = (data) => {
  // Loop through data and pull out unreported
  const unreported = [];
  data.forEach((row) => {
    if (row && row[15] === 'UNREPORTED') {
      unreported.push(row);
    }
  });
  return unreported;
};

const updatePeriod = async () => {
  const period = await Period.findById('67472de60208bee8ce322995');
  const remoteKey = 'Platoon/Unreported/Platoon Unreported 20250101200559055.csv';
  period.platoon.unreportedFileOutput = remoteKey;
  period.platoon.unreportedFileCreated = new Date();
  await period.save();
};

const addToUnreported = async (data) => {
  fs.appendFileSync(unreportedFile, data);
};

module.exports = { createUnreportedFromAllPreviousFiles, updatePeriod };
