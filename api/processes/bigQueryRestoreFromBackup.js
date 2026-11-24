// Import the Google Cloud client libraries
// @todo move BigQuery to shared repo
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');

const options = {
  keyFilename: 'bigQueryCredentials.json',
  projectId: 'curve-1578825897852',
};

// Instantiate clients
const bigQuery = new BigQuery(options);
const storage = new Storage(options);

async function loadTableGCSAvro(datasetId, tableId, filename, callback) {
  const bucketName = 'curve-big-query-backups';
  // Configure the load job. For full list of options, see:
  // https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#JobConfigurationLoad
  const jobConfigurationLoad = {
    load: { sourceFormat: 'AVRO' },
    use_avro_logical_types: true,
  };

  // Load data from a Google Cloud Storage file into the table
  const [job] = await bigQuery
    .dataset(datasetId)
    .table(tableId)
    .load(storage.bucket(bucketName).file(filename), jobConfigurationLoad);

  // load() waits for the job to finish
  logger.debug(`Job ${job.id} completed.`);

  // Check the job's status for errors
  const { errors } = job.status;
  if (errors && errors.length > 0) {
    callback(errors);
  } else {
    callback();
  }
}

const datasetId = 'CurveLabelDemoStagingNew';
const tableId = 'CurveLabelDemoStagingNewSalesReload';
const fileName = 'Test Client/202012161731992121/Weekly-Backup-000000000002.avro';

loadTableGCSAvro(datasetId, tableId, fileName, (err) => {
  if (err) {
    logger.error(err);
  }
  logger.debug('Complete');
});
