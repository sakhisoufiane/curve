/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient, ObjectId, Db, Document } = require('mongodb');
const moment = require('moment');
const { getCopyConfig } = require('./config');
const { updateTaskProgressStatus, copyClientLogo, copyDocuments, copySalesFilesNew, copySalesTables } = require('./suite');
const SendEmail = require('../../sendEmail');

const mongoConnectOpts = { ...databaseUtils.getMongoConnectOpts(), serverSelectionTimeoutMS: 3600000 };

const alphaNumericName = (string) => string.replace(/[^0-9a-z]/gi, '');

/**
 * Run the copy client process.
 * @param {ObjectId} params.taskId - The ID of the task to update progress.
 * @param {ObjectId} params.clientId - The ID of the client to copy.
 * @param {Object} params.options - Options for the copy operation.
 * @param {boolean} params.options.includeSales - Whether to include sales data.
 * @param {boolean} params.options.includeTables - Whether to include tables.
 * @param {string} [params.options.sourceEnvironment='production'] - The source environment to copy from.
 * @param {string} [params.options.targetEnvironment='staging'] - The target environment to copy to.
 *
 * @returns {Promise<void>}
 *
 * @example
 * await run({
 *   taskId: new ObjectId('...'),
 *   email: 'test@example.com',
 *   clientId: new ObjectId('...'),
 *   options: { includeSales: true, includeTables: false }
 * });
 */
async function run({ taskId, email, clientId, options }) {
  try {
    // Copy Client
    await copy(taskId, clientId, options);
    // Send email
    await new Promise((resolve, reject) => {
      SendEmail.scriptCompleteEmail('Copy Client', email, (err) => {
        if (err) {
          logger.error('Error sending email:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    logger.error(error);
    // Send error email
    await new Promise((resolve, reject) => {
      SendEmail.scriptErrorEmail('Copy Client', email, (mailErr) => {
        if (mailErr) { reject(mailErr); } else { resolve(); }
      });
    });

    throw new Error(`Error copying client: ${error.message}`);
  }
}

/**
 * Copy a client from one environment to another.
 *
 * @param {ObjectId?} taskId - The ID of the task to update progress.
 * @param {ObjectId} clientId - The ID of the client to copy.
 * @param {Object} options - Options for the copy operation.
 * @param {boolean} options.includeSales - Whether to include sales data.
 * @param {boolean} options.includeTables - Whether to include tables.
 * @param {string} options.sourceEnvironment - The source environment to copy from. [default='production']
 * @param {string} options.targetEnvironment - The target environment to copy to. [default='staging']
 *
 * @returns {Promise<void>}
 *
 * @throws {Error} If the client cannot be found or if the copy operation fails.
 *
 * @example
 * await copy(taskId: new ObjectId('...') || '234253452345sadrf', clientId: new ObjectId('...') || '234253452345sadrf', {
 *   includeSales: true,
 *   includeTables: false,
 *   sourceEnvironment: 'production',
 *   targetEnvironment: 'staging',
 * });
 */
async function copy(taskId, clientId, {
  includeSales,
  includeTables,
  sourceEnvironment = 'production',
  targetEnvironment = 'staging',
}) {
  if (targetEnvironment === sourceEnvironment) throw new Error('Source and target environments cannot be the same');
  if (targetEnvironment === 'production') throw new Error('🚨 WARNING 🚨: Copying to production environment. Please comment out this line and proceed with caution.');

  const sourceConfig = getCopyConfig(sourceEnvironment);
  const targetConfig = getCopyConfig(targetEnvironment);
  const { sourceDb, targetDb } = await connectToDatabases(sourceConfig, targetConfig);

  try {
    const appSettings = await sourceDb.collection('appsettings').findOne({});
    if (!appSettings.copyClientSchema?.length) throw new Error('App Settings not found');

    if (taskId) {
      await updateTaskProgressStatus({ taskId, status: 'Copying Client Document', db: sourceDb });
    }

    // Deleting the client if it already exists on the destination
    await targetDb.collection('clients').deleteOne({ _id: new ObjectId(`${clientId}`) });

    // Loading the client from the source
    const client = await sourceDb.collection('clients').findOne({ _id: new ObjectId(clientId) });
    if (!client) throw new Error(`Client not found with ID ${clientId}`);

    logger.debug(`Copying Client - ${client.name}`);
    const copiedClient = createClientCopy(client, targetConfig, targetEnvironment);

    // Insert into Staging
    await targetDb.collection('clients').insertOne(copiedClient);

    // Why are we not copying into the target DB?
    await copyClientLogo({ taskId, client, db: sourceDb });

    for (const collection of appSettings.copyClientSchema) {
      if (collection.name === 'salesfiles' && includeSales) {
        await copySalesFilesNew(taskId, clientId, sourceDb, targetDb, collection.projection);
        continue;
      }

      await copyDocuments({
        taskId,
        clientId,
        collectionName: collection.name,
        copyToDB: targetDb,
        copyFromDB: sourceDb,
        projection: collection.projection,
      });
    }

    if (includeTables) {
      await copySalesTables(taskId, sourceDb, client, copiedClient, sourceEnvironment, targetEnvironment);
    }
  } catch (err) {
    logger.error(`Error copying client ${clientId} from ${sourceEnvironment} to ${targetEnvironment}`, err);
    await updateTaskProgressStatus({
      taskId,
      status: 'Errored',
      db: sourceDb,
    });
  }
}

/**
   * Creates two connections to the source and target mongo databases given the configurations.
   * Will simply throw an error if any connection fails.
   *
   * @param {object} sourceConfig - The configuration object for the source environment.
   * @param {object} targetConfig - The configuration object for the target environment.
   * @return {Promise<{sourceDb: Db, targetDb: Db}>} A promise that resolves into an object containing the source and target database connections.
   */
async function connectToDatabases(sourceConfig, targetConfig) {
  const sourceMongoClient = await MongoClient.connect(sourceConfig.dbUri, mongoConnectOpts).catch((err) => {
    logger.error(`Failed to connect to source db: ${sourceConfig.dbUri}`);
    throw err;
  });
  const sourceDb = sourceMongoClient.db('curve-production');
  logger.debug(`Connected to source db: ${sourceConfig.dbUri}`);

  const targetMongoClient = await MongoClient.connect(targetConfig.dbUri, mongoConnectOpts).catch((err) => {
    logger.error(`Failed to connect to target db: ${targetConfig.dbUri}`);
    throw err;
  });
  const targetDb = targetMongoClient.db('curve-production');
  logger.debug(`Connected to target db: ${targetConfig.dbUri}`);
  return { sourceDb, targetDb };
}

/**
   * Creates a copy of the sourceClientObject while cleaning certain fields and settings
   * that would not be appropriate for a copied client. targetConfig is only needed to check if
   * the client is being copied to production or not in order to set the correct name for bigQuery tables.
   *
   * @param {Document} sourceClientObject - The client document to copy, pulled from the source database.
   * @param {object} targetConfig - The configuration object for the target environment.
   * @return {Document} A new client object with cleaned fields and settings.
   */
function createClientCopy(sourceClientObject, targetConfig, targetEnvironment) {
  // Ensure targetEnvironment is a properly cased string for BQ tables, i.e, 'Staging', 'Beta'
  const targetEnvString = targetEnvironment
    .toLowerCase()
    .replace(/^./, (chr) => chr.toUpperCase());
  const clientCopy = { ...sourceClientObject };
  const alphaNumericClientName = targetConfig.isProduction ? `${alphaNumericName(clientCopy.name)}` : `${alphaNumericName(clientCopy.name)}${targetEnvString}`;
  if (!targetConfig.isProduction) {
    // Remove duplication config and FTP Details
    clientCopy.inheritCatalogueFrom = [];
    clientCopy.salesFtpIngestions = [];
    clientCopy.ftpHost = null;
    clientCopy.ftpRootDir = null;
    clientCopy.ftpUsername = null;
    clientCopy.ingestForeignIds = false;
    clientCopy.matchContractOnImport = false;
    clientCopy.setDefaultReleaseIdOnImport = false;
    clientCopy.useBarcodeAsCatNoOnImport = false;
  }
  clientCopy.bigQueryDataset = alphaNumericClientName;
  clientCopy.bigQuerySalesTable = `${alphaNumericClientName}Sales`;
  clientCopy.bigQueryPeriodSales = `${alphaNumericClientName}PeriodSales`;
  clientCopy.bigQueryAccountingPeriodSales = `${alphaNumericClientName}AccountingSales`;
  clientCopy.bigQueryPeriodCosts = `${alphaNumericClientName}Costs`;
  clientCopy.createdBigQueryBackups = true;
  clientCopy.paymentProviders = {};
  clientCopy.copiedAt = moment().format();
  clientCopy.customSupportEmail = null;
  clientCopy.ccCommunicationEmail = null;
  return clientCopy;
}

module.exports = {
  createClientCopy,
  run,
  copy,
  connectToDatabases,
};
