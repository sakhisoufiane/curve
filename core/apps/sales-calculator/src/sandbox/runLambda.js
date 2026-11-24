/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-var-requires */

require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Lambda = require('../lambda');
const BatchTask = require('../models/batchTask');

const batchTaskId = '685c035da039d4e11cb1c4e0';

const runSalesCalculation = async () => {
    const batchTask = await BatchTask.findById(batchTaskId).lean();
    const event =  { batchTask };
    const result = await Lambda.lambdaHandler(event);
    logger.debug(result);
    process.exit(0);
};

runSalesCalculation();