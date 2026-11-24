const moment = require('moment');
const { eachLimit } = require('async');
const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');

require('../../models/db');
const Client = require('../../models/client');
const User = require('../../models/user');
const Statement = require('../../models/statement');
const Payment = require('../../models/payment');
const PaymentGroup = require('../../models/paymentGroup');
const DeliveryPartner = require('../../models/deliveryPartner');


const alphaNumericName = (string) => string.replace(/[^0-9a-z]/gi, '');

const resetClientFields = async ({ client }) => {
  client.inheritCatalogueFrom = [];
  client.salesFtpIngestions = [];
  client.ftpHost = null;
  client.ftpRootDir = null;
  client.ftpUsername = null;
  client.ingestForeignIds = false;
  client.matchContractOnImport = false;
  client.setDefaultReleaseIdOnImport = false;
  client.useBarcodeAsCatNoOnImport = false;
  client.createdBigQueryBackups = true;
  client.paymentProviders = {};
  client.copiedAt = moment().format();
  client.customSupportEmail = null;
  client.ccCommunicationEmail = null;

  // Set Big Query Table Names
  const BetaKey = 'BetaMongo';
  const alphaNumericClientName = `${alphaNumericName(client.name)}${BetaKey}`;

  client.bigQueryDataset = alphaNumericClientName;
  client.bigQuerySalesTable = `${alphaNumericClientName}Sales`;
  client.bigQueryPeriodSales = `${alphaNumericClientName}PeriodSales`;
  client.bigQueryAccountingPeriodSales = `${alphaNumericClientName}AccountingSales`;
  client.bigQueryPeriodCosts = `${alphaNumericClientName}Costs`;

  const newClient = await client.save().catch(logger.error);
  return newClient;
};

const createBigQueryTable = async ({ bigQuery, client, originalClient, table }) => {
  if (!originalClient[table]) return;

  const tableExists = await new Promise((resolve, reject) => {
    bigQuery.tableExists(originalClient.bigQueryDataset, originalClient[table], (err, response) => {
      if (err) { reject(err); } else { resolve(response); }
    });
  });

  if (!tableExists) return;

  await new Promise((resolve, reject) => {
    bigQuery.copyTable(originalClient.bigQueryDataset, originalClient[table], client.bigQueryDataset, client[table], (err) => {
      if (err) { reject(err); } else { resolve(); }
    });
  });
}

const createBigQueryTables = async ({ client, originalClient }) => {
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

  const datasetExists = await new Promise((resolve, reject) => {
    bigQuery.datasetExists(client.bigQueryDataset, (err, response) => {
      if (err) { reject(err); } else { resolve(response); }
    });
  });

  if (datasetExists) {
    await new Promise((resolve, reject) => {
      bigQuery.deleteDataset(client.bigQueryDataset, (err) => {
        if (err) { reject(err); } else { resolve(); }
      });
    });
  }

  // Create Dataset
  await new Promise((resolve, reject) => {
    bigQuery.createDataset(client.bigQueryDataset, (err) => { if (err) { reject(err); } else { resolve(); } });
  });

  // Copy Tables
  await Promise.all([
    createBigQueryTable({ bigQuery, client, originalClient, table: 'bigQuerySalesTable' }),
    createBigQueryTable({ bigQuery, client, originalClient, table: 'bigQueryPeriodSales' }),
    createBigQueryTable({ bigQuery, client, originalClient, table: 'bigQueryAccountingPeriodSales' }),
    createBigQueryTable({ bigQuery, client, originalClient, table: 'bigQueryPeriodCosts' }),
  ]); // Copy Tables
  
};

const run = async () => {
  const usersToKeep = [
    '6131ff1a5d33400025143afc', 
    '622f21b910f790047d5c319b',
    '60103ad66dd46e0025c47fc9',
    '5c08beaff5e67946a3845366',
    '665991a77dd98174ecda5a10',
    '64995f2c072ed4cdabb8ab17',
  ];
  await User.deleteMany({ _id: { $nin: usersToKeep } });

  const clients = await Client.find({}).catch(logger.error);
  if (!clients?.length) return;

  logger.info(`Processing ${clients.length} clients`);
  let count = 0;
  await eachLimit(clients, 100, async (client) => {
    count++;
    process.stdout.write(`\r${count}/${clients.length}`);

    const originalClient = JSON.parse(JSON.stringify(client));
    // Reset Fields
    const updatedClient = await resetClientFields({ client });
    if (!updatedClient) return;

    // Create new Big Query Tables
    await createBigQueryTables({ client: updatedClient, originalClient }).catch(logger.error);
    // Delete Payments
    await Payment.deleteMany({ clientId: updatedClient._id });
    await PaymentGroup.deleteMany({ clientId: updatedClient._id });
    // Clear Delivery Partner FTP Details
    await DeliveryPartner.updateMany({ clientId: updatedClient._id }, {
      $set: {
        ftpHost: null,
        ftpPassword: null,
        ftpPort: null,
        ftpRootDir: null,
        ftpUsername: null,
        notificationEmail: null,
      }
    });
  });
};

run()
.then(() => {
  logger.info('Done');
  process.exit(0);
})
.catch((err) => {
  logger.error('Failed', err);
  process.exit(1);
})