const { databaseUtils, BigQuery, logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const { MongoClient } = require('mongodb');
const Period = require('../../../models/period');
const Client = require('../../../models/client');

const CreatePeriodFiles = require('./createPeriodFiles');
const User = require('../../../models/user');
const Notification = require('../../../models/notification');

const PeriodFiles = this;

PeriodFiles.createMechanicalUnreportedSalesCsv = ({ period, bigQuery, client, excludedSalesFiles }) => new Promise((resolve, reject) => {
  CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, excludedSalesFiles, (err, result) => {
    if (err) {
      reject(err);
    } else {
      resolve(result);
    }
  });
});

PeriodFiles.createUnreportedSalesCsv = async ({ period, client, excludedSalesFiles }) => {
  const result = await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles });
  return result;
};

PeriodFiles.createMcpsUnreportedSalesCsv = ({ period, bigQuery, client }) => new Promise((resolve, reject) => {
  CreatePeriodFiles.createMcpsUnreportedSalesCsv(period, bigQuery, client, (err, result) => {
    if (err) {
      reject(err);
    } else {
      resolve(result);
    }
  });
});

PeriodFiles.createUnreportedCostsCsv = async ({ period, client }) => {
  const mongoClient = await MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts());
  const db = mongoClient.db(databaseUtils.getMongoDBName());

  return new Promise((resolve, reject) => {
    CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, (err, result) => {
      mongoClient.close();
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

PeriodFiles.getPubicLink = (s3Link) => new Promise((resolve, reject) => {
  fileManager.publicS3Link(s3Link, (err, publicLink) => {
    if (err) reject(err);
    resolve(publicLink);
  });
});

PeriodFiles.notifyClient = ({ client, period, email, type, publicLink }) => new Promise((resolve, reject) => {
  const subject = `Your ${type} Export for ${period.name} is Ready for Download`;
  const generateOptions = {
    identifier: 'reportDownload',
    client,
    subject,
    email,
    link: publicLink,
  };
  const notificationName = `Period File Export - ${type}`;
  Notification.generate(notificationName, subject, publicLink, generateOptions, (err) => {
    if (err) reject(err);
    resolve();
  });
});

PeriodFiles.get = async ({ periodId, email, type, excludedSalesFiles }) => {
  const logKey = `${periodId} | ${type}`;

  if (!['Unreported Sales', 'Unreported Costs'].includes(type)) throw new Error(`Invalid type ${type}`);

  const period = await Period.findById(periodId);
  if (!period) {
    logger.error(`${logKey} | No periodId found`);
    return;
  }

  const client = await Client.findById(period.clientId);
  if (!client) throw new Error(`No client found with ID ${period.clientId}`);

  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

  logger.info(`${logKey} | Starting to create files`);

  let result;

  if (type === 'Unreported Sales') {
    if (period.contractType === 'Mechanical') {
      // Mechanical Specific Filters
      result = await PeriodFiles.createMechanicalUnreportedSalesCsv({ period, bigQuery, client, excludedSalesFiles });
    } else if (period.contractType === 'MCPS') {
      // MCPS Specific Filters
      result = await PeriodFiles.createMcpsUnreportedSalesCsv({ period, bigQuery, client });
    } else {
      // Standard Report
      // Notify Out of sync sales files
      result = await PeriodFiles.createUnreportedSalesCsv({ period, bigQuery, client, excludedSalesFiles });
    }
  } else if (type === 'Unreported Costs' && client.clientType !== 'Publisher' && !['Mechanical', 'MCPS'].includes(period.contractType)) {
    // Standard Costs Report
    result = await PeriodFiles.createUnreportedCostsCsv({ period, client });
  } else {
    throw new Error(`Invalid type ${type}`);
  }

  logger.info(`${logKey} | Files Created`, result);

  if (email) {
    const foundUser = await User.findOne({ email }).lean();
    if (!foundUser) throw new Error(`No user found with ID ${email}`);

    logger.info(`${logKey} | Period Files Created`);
    logger.info(`${logKey} | Getting Public Link`);
    // Get Public Link
    const publicLink = await PeriodFiles.getPubicLink(result);

    logger.info(`${logKey} | Notifying User`);
    await PeriodFiles.notifyClient({ client, period, email: foundUser.email, type, publicLink });
  }
};

module.exports = PeriodFiles;
