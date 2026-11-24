/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
require('./models/db')
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const fs = require('fs');
const GoogleStorage = require('./libs/googleStorage');
const RoyaltyCalculator = require('./libs/royaltyCalculator');
const BatchTask = require('./models/batchTask');
const Period = require('./models/period');

const bucketName = process.env.GCS_JOINED_PERIOD_EXPORT ?? 'period_joined_input_data';

const runTask = async () => {
  try {
    const batchTaskId = process.env.batchTaskId || null;

    if (!batchTaskId) { throw Error('No batchTaskId provided'); }
    
    const batchTask = await BatchTask.findById(batchTaskId);
    
    if (!batchTask) { throw Error('No batchTask found'); }

    logger.info('Received batchTask:', batchTask);
    
    // Download file containing calculation params
    const googleStorage = new GoogleStorage(bucketName);
    const localFilePath = `/tmp/${batchTask._id.toString()}-${moment().format('X')}-calculation_params.json`;
    await googleStorage.downloadFile({ file: batchTask.value.calculationParams, destination: localFilePath });
    const calculationParams = JSON.parse(fs.readFileSync(localFilePath, 'utf8'));
    fs.unlinkSync(localFilePath);
    
    calculationParams.batchTask = batchTask;
    calculationParams.fromLambda = true;
    
    logger.info(`Calculating batch task ${batchTask._id.toString()}`);
    logger.debug(batchTask);

    // Calculate the batch task
    logger.debug(`${calculationParams.period._id} - Calculating batch task ${batchTask._id.toString()} with calculation params ${JSON.stringify(calculationParams)}`);
    const result = await new Promise((resolve, reject) => {
      new RoyaltyCalculator(calculationParams).calculate((err, result) => { if (err) { reject(err); } else { resolve(result); } });
    });

    
    const {status, inputLines, outputLines, error} = result;
    
    if (status === 'Complete') {
      // Update the batch task status and period progress counter
      logger.info(`Batch task ${batchTask._id.toString()} calculated with result ${JSON.stringify(result)}`);
      await BatchTask.findByIdAndUpdate(batchTask._id.toString(), { $set: { status: 'Complete', 'value.inputLines': inputLines, 'value.outputLines': outputLines }});
      await Period.findByIdAndUpdate(batchTask.periodId, { $inc: { completedCatalogueItems: 1 } });
    } else {
      logger.error(`${batchTask.periodId} - Individial Batch Errored ${batchTask._id.toString()} - ${JSON.stringify(result)}`);
      await BatchTask.findByIdAndUpdate(batchTask._id.toString(), { status: 'Errored', error });
    }

    process.exit(0);
    
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

runTask();