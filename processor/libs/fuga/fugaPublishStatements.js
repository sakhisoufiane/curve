const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { Storage } = require('@google-cloud/storage');
const async = require('async');
const stream = require('stream');
const { promisify } = require('util');

const { keyBy } = require('lodash');
const Client = require('../../models/client');
const Statement = require('../../models/statement');
const Period = require('../../models/period');
const Contract = require('../../models/contract');
const Notification = require('../../models/notification');

const GCP_CREDENTIALS = {
  client_email: process.env.FUGA_GCS_RASA_CLIENT_EMAIL,
  private_key: process.env.FUGA_GCS_RASA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const GCS_BUCKET = process.env.FUGA_GCS_RASA_BUCKET ?? 'fuga-publish-statements';

const STATEMENT_UPLOAD_CONCURRENCY = 4;

async function publishStatements({ periodId, email }) {
  const logKey = `Fuga Publish Statements | ${periodId} |`;

  if (!periodId || !email) {
    logger.error(logKey, 'Missing required parameters: periodId, email');
    throw new Error('Missing required parameters: periodId, email');
  }

  const period = await Period.findById(periodId);
  if (!period) {
    logger.error(logKey, `Period with ID ${periodId} not found`);
    throw new Error(`Period with ID ${periodId} not found`);
  }

  const client = await Client.findById(period.clientId);
  if (!client) {
    logger.error(logKey, `Client with ID ${period.clientId} not found`);
    throw new Error(`Client with ID ${period.clientId} not found`);
  }

  const clientId = client._id.toString();
  if (!client?.features?.fugaPublishStatementsToCloudStorage) {
    logger.error(logKey, `Fuga publish statements to GCS not enabled for client ID ${clientId}`);
    throw new Error(`Fuga publish statements to GCS not enabled for client ID ${clientId}`);
  }

  logger.info(logKey, 'Fetching Statements for Period ID:', periodId);
  const statements = await getStatements({ clientId, periodId });
  if (!statements || statements.length === 0) {
    logger.error(logKey, `No statements found for period ID ${periodId}`);
    throw new Error(`No statements found for period ID ${periodId}`);
  }

  logger.info(logKey, 'Processing statements:', statements.length);
  const { periodsById, contractsById } = await getStatementMetadata({ clientId, statements })
    .catch((err) => {
      logger.error(logKey, 'Error fetching statements metadata:', err);
      throw err;
    });

  const preparedStatements = statements.map((statement) => {
    const period = periodsById[statement.periodId.toString()];
    const contract = contractsById[statement.contractId.toString()];

    const periodId = period._id.toString();
    const periodName = period.name;
    const periodStartDate = period.startDate;
    const periodEndDate = period.endDate;
    const periodStatementsCount = statements.length;

    const { _id, name, closingBalance, allFilesZip } = statement;
    const currency = statement.currency === 'Home Currency' ? client.homeCurrency : statement.currency;

    const foreignId = contract?.foreignId ?? null;
    const contractName = contract.name;

    return {
      periodId,
      periodName,
      periodStartDate,
      periodEndDate,
      periodStatementsCount,
      statementId: _id.toString(),
      statementName: name,
      foreignId,
      contractName,
      closingBalance,
      currency,
      allFilesZip,
    };
  });

  try {
    const storage = new Storage({ credentials: GCP_CREDENTIALS });
    await async.eachLimit(preparedStatements, STATEMENT_UPLOAD_CONCURRENCY, async (statement) => {
      await publishStatement({ logKey, statement, storage });
      await setStatementPublished(statement.statementId);
    })
      .catch((err) => {
        logger.error(logKey, 'Error publishing statement:', err);
        throw err;
      });
  } catch (err) {
    logger.error(logKey, err);
    const subject = `Error Publishing FUGA Statements for Period ${period.name}`;
    const sendOptions = {
      identifier: 'genericError',
      client,
      subject,
      email,
      mainText: `<div>
      <p>There was an error publishing FUGA statements to GCS. Please notify a member of the Curve team.</p>
      Error: <code>${err?.message}</code>
    </div>`,
    };
    await new Promise((resolve, reject) => {
      Notification.generate('Published FUGA Statements', subject, null, sendOptions, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    throw err;
  }

  logger.info(logKey, 'All statements published successfully, notifying:', email);
  const subject = `FUGA Statements Published for Period ${period.name}`;
  const sendOptions = {
    identifier: 'genericComplete',
    client,
    subject,
    email,
    mainText: `<div>
      <p>Statements have been published successfully to FUGA GCS.</p>
      <p><strong>Client:</strong> ${client.name}</p>
      <p><strong>Reporting Period:</strong> ${period.name}</p>
      <p><strong>Total Statements Published:</strong> ${preparedStatements.length}</p>
    </div>`,
  };
  await new Promise((resolve, reject) => {
    Notification.generate('Published FUGA Statements', subject, null, sendOptions, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  logger.info(logKey, 'Finished publishing FUGA statements');
}

/**
 * Fetch statements for a given client and period
 * @param {Object} params
 * @param {string} params.clientId - Client ID
 * @param {string} params.periodId - Period ID
 * @return {Promise<Array>} - Array of statement objects
 */
async function getStatements({ clientId, periodId }) {
  const statements = await Statement.find(
    { periodId, clientId },
    {
      name: 1,
      periodId: 1,
      contractId: 1,
      closingBalance: 1,
      currency: 1,
      allFilesZip: 1,
    },
  );
  return statements;
}

/**
 * Fetch periods and contracts for statements
 * @param {Object} params
 * @param {string} params.clientId - Client ID
 * @param {Array} params.statements - Array of statement objects
 * @return {Promise<Object>} - Object containing periodsById and contractsById
 */
async function getStatementMetadata({ clientId, statements }) {
  const periodIds = statements.map((statement) => statement.periodId);
  const periods = await Period.find(
    { _id: { $in: periodIds }, clientId },
    { startDate: 1, endDate: 1, name: 1 },
  );
  const periodsById = keyBy(periods, (period) => period._id.toString());

  const contractIds = statements.map((statement) => statement.contractId);
  const contracts = await Contract.find(
    { _id: { $in: contractIds }, clientId },
    { foreignId: 1, name: 1 },
  );
  const contractsById = keyBy(contracts, (contract) => contract._id.toString());

  return { periodsById, contractsById };
}

/**
 * Publish a single statement to GCP
 * @param {Object} params
 * @param {string} params.clientId - Client ID
 * @param {string} params.email - Email to send notification to
 * @param {Object} params.statement - Statement with metadata
 * @param {string} params.statement.statementId - Statement ID
 * @param {string} params.statement.name - Statement name
 * @param {string|null} params.statement.foreignId - Foreign ID (nullable)
 * @param {string} params.statement.contractName - Contract name
 * @param {string} params.statement.periodId - ID of period
 * @param {string} params.statement.periodName - Name of period
 * @param {Date} params.statement.periodStartDate - Start date of period
 * @param {Date} params.statement.periodEndDate - End date of period
 * @param {number} params.statement.periodStatementsCount - Number of statements in the period
 * @param {number} params.statement.closingBalance - Closing balance
 * @param {string} params.statement.currency - Currency
 * @param {string} params.statement.allFilesZip - S3 file key for ZIP file
 * @param {Storage} params.storage - Google Cloud Storage instance
 * @param {string} [params.gcsBucket] - GCS bucket name (optional, defaults to env var or 'fuga-publish-statements')
 * @return {Promise<void>}
 */
async function publishStatement({ logKey, statement, storage, gcsBucket = GCS_BUCKET }) {
  logger.info(logKey, 'Downloading statement from S3:', statement.allFilesZip);
  const s3Object = await fileManager.downloadFromS3Object(statement.allFilesZip, process.env.S3_bucket);

  const pipeline = promisify(stream.pipeline);

  const gcsFileName = `${statement.statementId}-curve.zip`;
  const gcsFileKey = `curve/${statement.periodId}/${gcsFileName}`;

  const gcsFile = storage.bucket(gcsBucket).file(gcsFileKey);

  const metadata = {
    statement_run_id: statement.periodId,
    statement_run_title: statement.periodName,
    statement_run_statements: statement.periodStatementsCount,
    statement_run_start_date: statement.periodStartDate,
    statement_run_end_date: statement.periodEndDate,
    statement_id: statement.statementId,
    account: 'curve',
    organization_id: statement.foreignId,
    currency: statement.currency,
    amount_due: statement.closingBalance,
    contract_name: statement.contractName,
    royalties_type: 'physical',
    file_format: 'curve',
    package_name: `${statement.periodName}_${statement.contractName}-${statement.currency}.zip`.replace(/\s+/g, ''),
  };

  const writeStream = gcsFile.createWriteStream({ metadata: { metadata } });

  logger.info(logKey, 'Uploading statement to GCS:', `gs://${gcsBucket}/${gcsFileKey}`, metadata);
  await pipeline(s3Object.Body, writeStream);

  logger.info(logKey, 'Statement upload complete');
}

/**
 * Set statement status to Published
 * @param {string} statementId - Statement ID
 * @return {Promise<void>}
 */
async function setStatementPublished(statementId) {
  await Statement.updateOne(
    { _id: statementId },
    { $set: { status: 'Published' } },
  );
}

module.exports = {
  publishStatements,
};
