// https://cloud.google.com/bigquery/docs/exporting-data#node.js
// @todo move BigQuery to shared repo
require('dotenv').config();
require('../models/db');
const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');
const moment = require('moment');
const sanitize = require('sanitize-filename');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const schedule = require('node-schedule');
const Client = require('../models/client');

const privateKey = (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '';

const bgClientOptions = {
  projectId: process.env.BQ_project_id,
  credentials: {
    client_email: process.env.BQ_client_email,
    private_key: privateKey,
  },
};

const bigQuery = new BigQuery(bgClientOptions);
const storage = new Storage(bgClientOptions);

async function extractTableToStorage(datasetId, tableId, clientName, fileNamePrefix, retry, callback) {
  const bucketName = 'curve-big-query-backups';
  const dateTime = moment().format('YYYYMMDDHHmmSSsss');
  const filename = `${clientName}/${tableId}/${fileNamePrefix}/${dateTime}/` + 'backup-*.avro';

  const storageOptions = {
    location: 'EU',
    compression: 'DEFLATE',
    use_avro_logical_types: true,
  };

  logger.info(`BACKUP: Backing up table ${tableId}`);
  // Export data from the table into a Google Cloud Storage file
  try {
    const [job] = await bigQuery
      .dataset(datasetId)
      .table(tableId)
      .extract(storage.bucket(bucketName).file(filename), storageOptions);
    // Check the job's status for errors
    const { errors } = job.status;
    if (errors && errors.length > 0) {
      callback(errors);
    } else {
      callback();
    }
  } catch (e) {
    if (retry === 0) {
      // Retry after 10 seconds
      setTimeout(() => {
        retry += 1;
        logger.error(`BACKUP: Errored backing up table ${tableId} - Retrying`);
        extractTableToStorage(datasetId, tableId, clientName, fileNamePrefix, retry, callback);
      }, 10000);
    } else {
      logger.error(`BACKUP: Errored backing up table ${tableId} - ${e}`);
      callback(e);
    }
  }
}

function run() {
  const date = new Date();
  if (date.getDay() == 0) {
    // Get all clients
    Client.find({}, {
      name: 1, bigQueryDataset: 1, bigQuerySalesTable: 1, bigQueryPeriodSales: 1, bigQueryPeriodCosts: 1,
    })
      .then((clients) => {
        // Loop through clients
        async.eachSeries(clients, (client, cb) => {
          // Wait two seconds between each client
          setTimeout(() => {
            logger.info(`BACKUP: Running BigQuery backup for ${client.name}`);
            // Set up tables to loop thorugh
            const tables = [client.bigQuerySalesTable, client.bigQueryPeriodSales, client.bigQueryPeriodCosts];
            // Loop through each table
            async.eachSeries(tables, (table, tableCb) => {
              const sanitizedClientName = sanitize(client.name).split('/').join();
              extractTableToStorage(client.bigQueryDataset, table, sanitizedClientName, 'Weekly-Backup', 0, (err) => {
                if (err) {
                  // Log out any errors
                  logger.error(`BACKUP: Errored in backing up table ${table}`);
                  logger.error(err);
                } else {
                  logger.info(`BACKUP: Completed backup for ${table}`);
                }
                // Callback without error to continue in process for other clients
                tableCb();
              });
            }, cb);
          }, 2000);
        }, (err) => {
          if (err) {
            logger.error('BACKUP: Errored in backing up BigQuery');
            logger.error(err);
          } else {
            logger.info('BACKUP: Completed backing up BigQuery tables');
          }
        });
      })
      .catch((err) => {
        logger.error('BACKUP: Errored in backing up BigQuery');
        logger.error(err);
      });
  }
}

run();
schedule.scheduleJob('0 4 * * 7', run);
