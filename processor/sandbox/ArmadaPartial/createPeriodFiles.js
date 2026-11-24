const { MongoClient } = require('mongodb');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');

require('../models/db');

const Client = require('../../models/client');
const Period = require('../../models/period');

const CreatePeriodFiles = require('../../libs/calculation/period/createPeriodFiles');


const run = async ({ periodId }) => {
  const period = await Period.findById(periodId).lean();
  if (!period) throw new Error('Period not found');

  const client = await Client.findById(period.clientId).lean();
  if (!client) throw new Error('Client not found');

  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

  const mongoClient = await MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
  const db = mongoClient.db(databaseUtils.getMongoDBName());

  await new Promise((resolve, reject) => {
    CreatePeriodFiles.createFiles(period, db, bigQuery, client, (err, result) => {
      if (err) return reject(err);
      resolve();
    });
  });  
};

run({ periodId: '678a15051b7d8c76a383c095' }).then(() => {
  logger.info('Script completed successfully');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(1);
});

// node --max-old-space-size=16384 sandbox/ArmadaPartial/createPeriodFiles.js

// THIS SCRIPT CREATES THE UNREPORTED SALES AND COSTS CSV FILES FOR A PERIOD, THIS WILL UPLOAD TO S3 AND SET THE KEYS ON THE PERIOD DOCUMENT