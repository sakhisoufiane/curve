/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
require('../models/db');
const SalesCalculator = require('../index');
const Period = require('../models/period');
const Client = require('../models/client');

const periodId = '69bdc4be1da2182ed43aa253';

/** Optional: contract Mongo _id for one statement / one contract. Omit or unset for full period. */
const contractId = '69bdbbe50bd9b8d2976e3082';

const runSalesCalculation = async () => {
    const period = await Period.findById(periodId);
    const object = {periodId, periodType: 'Standard', salesFileIds: period.salesFilesIds, runType: 'main'};
    const client = await Client.findById(period.clientId);
    const query = { salesFileId: {$in: period.salesFilesIds }};
    // Set to true to run locally, false to trigger a lambda to pick up the task.
    const runLocally = true;
    await SalesCalculator.calculate({
        period,
        client,
        object,
        query,
        runLocally,
        ...(contractId ? { contractId } : {}),
    });
    process.exit(0);
};

runSalesCalculation();