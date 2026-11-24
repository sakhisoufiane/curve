/* eslint-disable no-await-in-loop */
const { logger, databaseUtils, fileManager, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const { eachLimit } = require('async');
const util = require('util');

const connectToDb = async (uri) => {
  try {
    const dbConnection = await MongoClient.connect(uri, databaseUtils.getMongoConnectOpts());
    const db = dbConnection.db('curve-production');
    return db;
  } catch (error) {
    logger.error(error);
  }
};

// s3Config is optional - if not passed then fileManager.deleteFromS3async & fileManager.deleteFromS3Path defaults to server env
const deleteCients = async (uri, query, logText, s3Config) => {
  // Connect to db
  const db = await connectToDb(uri);
  // if (!db) { return logger.info(`${logText}: Failed to connect to mongo`); }

  // Models
  const Statement = db.collection('statements');
  const Period = db.collection('periods');
  const SalesFile = db.collection('salesfiles');
  const SalesTemplate = db.collection('salestemplates');
  const Cost = db.collection('costs');
  const Contract = db.collection('contracts');
  const Payee = db.collection('payees');
  const Release = db.collection('releases');
  const Track = db.collection('tracks');
  const Work = db.collection('works');
  const Publisher = db.collection('publishers');
  const Composer = db.collection('composers');
  const Delivery = db.collection('cwrdeliveries');
  const CwrAcknowledgment = db.collection('cwracknowledgements');
  const Company = db.collection('companies');
  const ContractTermGroup = db.collection('contracttermgroups');
  const DeliveryPartner = db.collection('deliverypartners');
  const DeliveryProfile = db.collection('deliveryprofiles');
  const McpcNegative = db.collection('mcpcretentions');
  const McpcRetention = db.collection('mcpcretentions');
  const Payment = db.collection('payments');
  const PaymentGroup = db.collection('paymentgroups');
  const TerritoryGroup = db.collection('territorygroups');
  const Transaction = db.collection('transactions');
  const UnmappedWork = db.collection('unmappedworks');
  const UnmappedTrack = db.collection('unmappedtracks');
  const UnmappedRelease = db.collection('unmappedreleases');
  const Client = db.collection('clients');

  const clients = await Client.find(query, 'name bigQueryDataset bigQuerySalesTable bigQueryPeriodSales bigQueryPeriodCosts bigQueryAccountingPeriodSales').toArray().catch(logger.error);

  if (!clients?.length) { return logger.info(`${logText}: No clients to delete`); }

  // return logger.info('Script Run BLOCKED');

  logger.info(`${logText}: Found ${clients.length} clients to delete`);

  for (const client of clients) {
    logger.info(`${logText}: ${client._id} : Deleting client: ${client.name}`);
    //   Statements
    logger.info(`${logText}: ${client._id} : Deleting statements files..`);
    const statements = await Statement.find({ clientId: client._id.toString() }, 'allFilesZip salesCsv costsCsv pdf statementOfAccount selfBillingInvoice feesInvoice customStatement').toArray().catch(logger.error);

    await eachLimit(statements, 10, async (statement) => {
      logger.debug(`${client._id} : Deleting statement files for : ${statement._id}`);
      // Delete allFilesZip
      if (statement.allFilesZip) { await fileManager.deleteFromS3async(statement.allFilesZip, s3Config).catch(logger.error); }
      // Delete salesCsv
      if (statement.salesCsv) { await fileManager.deleteFromS3async(statement.salesCsv, s3Config).catch(logger.error); }
      // Delete costsCsv
      if (statement.costsCsv) { await fileManager.deleteFromS3async(statement.costsCsv, s3Config).catch(logger.error); }
      // Delete pdf
      if (statement.pdf) { await fileManager.deleteFromS3async(statement.pdf, s3Config).catch(logger.error); }
      // Delete statementOfAccount
      if (statement.statementOfAccount) { await fileManager.deleteFromS3async(statement.statementOfAccount, s3Config).catch(logger.error); }
      // Delete selfBillingInvoice
      if (statement.selfBillingInvoice) { await fileManager.deleteFromS3async(statement.selfBillingInvoice, s3Config).catch(logger.error); }
      // Delete feesInvoice
      if (statement.feesInvoice) { await fileManager.deleteFromS3async(statement.feesInvoice, s3Config).catch(logger.error); }
      // Delete customStatement
      if (statement.customStatement) { await fileManager.deleteFromS3async(statement.customStatement, s3Config).catch(logger.error); }
    });

    logger.info(`${logText}: ${client._id} : Deleting statements..`);
    await Statement.deleteMany({ clientId: client._id.toString() });

    // Periods
    logger.info(`${logText}: ${client._id} : Deleting periods files..`);
    const periods = await Period.find({ clientId: client._id.toString() }, 'allCalculatedSalesCsv, allCalculatedCostsCsv, unreportedSalesCsv, unreportedCostsCsv, suspenseCsv, generalLedgerSummary, customStatement, statementsZip').toArray();
    await eachLimit(periods, 10, async (period) => {
      // Removed individual file deletions in favour of a catchall approach
      // Delete allCalculatedSalesCsv
      // if (period.allCalculatedSalesCsv) { await fileManager.deleteFromS3async(period.allCalculatedSalesCsv, s3Config).catch(logger.error); }
      // // Delete allCalculatedCostsCsv
      // if (period.allCalculatedCostsCsv) { await fileManager.deleteFromS3async(period.allCalculatedCostsCsv, s3Config).catch(logger.error); }
      // // Delete unreportedSalesCsv
      // if (period.unreportedSalesCsv) { await fileManager.deleteFromS3async(period.unreportedSalesCsv, s3Config).catch(logger.error); }
      // // Delete unreportedCostsCsv
      // if (period.unreportedCostsCsv) { await fileManager.deleteFromS3async(period.unreportedCostsCsv, s3Config).catch(logger.error); }
      // // Delete suspenseCsv
      // if (period.suspenseCsv) { await fileManager.deleteFromS3async(period.suspenseCsv, s3Config).catch(logger.error); }
      // // Delete generalLedgerSummary
      // if (period.generalLedgerSummary) { await fileManager.deleteFromS3async(period.generalLedgerSummary, s3Config).catch(logger.error); }
      // // Delete customStatement
      // if (period.customStatement) { await fileManager.deleteFromS3async(period.customStatement, s3Config).catch(logger.error); }
      // // Delete statementsZip
      // if (period.statementsZip) { await fileManager.deleteFromS3async(period.statementsZip, s3Config).catch(logger.error); }

      // NOTE allCalculatedSalesCsv & allCalculatedCostsCsv null against the period record so not deleting
      // Need to do a loop here to delete all period files rather than running individually !
      logger.debug(`${client._id} : Deleting period files for : ${period._id}`);
      if (period) { await fileManager.deleteFromS3Path(`periods/${period._id}/`, s3Config).catch(logger.error); }
    });

    logger.info(`${logText}: ${client._id} : Deleting periods..`);
    await Period.deleteMany({ clientId: client._id.toString() });

    // Sales Files
    logger.info(`${logText}: ${client._id} : Deleting sales files' files..`);
    const salesFiles = await SalesFile.find({ clientId: client._id.toString() }, 'file, customAdditionalFile').toArray();
    await eachLimit(salesFiles, 10, async (salesfile) => {
      logger.debug(`${client._id} : Deleting salesfile files for : ${salesfile._id}`);
      // Delete file
      if (salesfile.file) { await fileManager.deleteFromS3async(salesfile.file, s3Config).catch(logger.error); }
      // Delete customAdditionalFile
      if (salesfile.customAdditionalFile) await fileManager.deleteFromS3async(salesfile.customAdditionalFile, s3Config).catch(logger.error);
    });

    logger.info(`${logText}: ${client._id} : Deleting sales files..`);
    await SalesFile.deleteMany({ clientId: client._id.toString() });

    // Templates
    logger.info(`${logText}: ${client._id} : Deleting sales template files..`);
    const salesTemplates = await SalesTemplate.find({ clientId: client._id.toString() }, 'file').toArray();
    await eachLimit(salesTemplates, 10, async (salesTemplate) => {
      logger.debug(`${client._id} : Deleting salesTemplate files for : ${salesTemplate._id}`);
      // Delete file
      if (salesTemplate.file) { await fileManager.deleteFromS3async(salesTemplate.file, s3Config).catch(logger.error); }
    });

    logger.info(`${logText}: ${client._id} : Deleting sales templates..`);
    await SalesTemplate.deleteMany({ clientId: client._id.toString() });

    // Costs
    logger.info(`${logText}: ${client._id} : Deleting costs files..`);
    const costs = await Cost.find({ clientId: client._id.toString() }, 'files').toArray();
    await eachLimit(costs, 10, async (cost) => {
      if (cost.files) {
        logger.debug(`${client._id} : Deleting cost files for : ${cost._id}`);
        for (const file of cost.files) {
          // Delete file
          await fileManager.deleteFromS3async(file, s3Config).catch(logger.error);
        }
      }
    });

    logger.info(`${logText}: ${client._id} : Deleting costs..`);
    await Cost.deleteMany({ clientId: client._id.toString() });

    // Contracts
    logger.info(`${logText}: ${client._id} : Deleting contracts files..`);
    const contracts = await Contract.find({ clientId: client._id.toString() }, 'files').toArray();
    await eachLimit(contracts, 10, async (contract) => {
      if (contract.files) {
        logger.debug(`${client._id} : Deleting contract files for : ${contract._id}`);
        for (const file of contract.files) {
          // Delete file
          await fileManager.deleteFromS3async(file, s3Config).catch(logger.error);
        }
      }
    });

    logger.info(`${logText}: ${client._id} : Deleting contracts..`);
    await Contract.deleteMany({ clientId: client._id.toString() });

    // Payees
    logger.info(`${logText}: ${client._id} : Deleting payees..`);
    await Payee.deleteMany({ clientId: client._id.toString() });
    // Releases
    logger.info(`${logText}: ${client._id} : Deleting releases..`);
    await Release.deleteMany({ clientId: client._id.toString() });
    // Tracks
    logger.info(`${logText}: ${client._id} : Deleting tracks..`);
    await Track.deleteMany({ clientId: client._id.toString() });
    // Works
    logger.info(`${logText}: ${client._id} : Deleting works..`);
    await Work.deleteMany({ clientId: client._id.toString() });
    // Publishers
    logger.info(`${logText}: ${client._id} : Deleting publishers..`);
    await Publisher.deleteMany({ clientId: client._id.toString() });
    // Composers
    logger.info(`${logText}: ${client._id} : Deleting composers..`);
    await Composer.deleteMany({ clientId: client._id.toString() });
    // Deliveries
    logger.info(`${logText}: ${client._id} : Deleting deliveries..`);
    await Delivery.deleteMany({ clientId: client._id.toString() });
    // CWR Aknowledgments
    logger.info(`${logText}: ${client._id} : Deleting cwr acknowledgments..`);
    await CwrAcknowledgment.deleteMany({ clientId: client._id.toString() });
    // Companies
    logger.info(`${logText}: ${client._id} : Deleting companies..`);
    await Company.deleteMany({ clientId: client._id.toString() });
    // Contract Term Groups
    logger.info(`${logText}: ${client._id} : Deleting contract term groups..`);
    await ContractTermGroup.deleteMany({ clientId: client._id.toString() });
    // Delivery Partners
    logger.info(`${logText}: ${client._id} : Deleting delivery partners..`);
    await DeliveryPartner.deleteMany({ clientId: client._id.toString() });
    // Delivery Profiles
    logger.info(`${logText}: ${client._id} : Deleting delivery profiles..`);
    await DeliveryProfile.deleteMany({ clientId: client._id.toString() });
    // MCPS Negatives
    logger.info(`${logText}: ${client._id} : Deleting mcps negatives..`);
    await McpcNegative.deleteMany({ clientId: client._id.toString() });
    // MCPS Retentions
    logger.info(`${logText}: ${client._id} : Deleting mcps retentions..`);
    await McpcRetention.deleteMany({ clientId: client._id.toString() });
    // Payments
    logger.info(`${logText}: ${client._id} : Deleting payments..`);
    await Payment.deleteMany({ clientId: client._id.toString() });
    // Payment Groups
    logger.info(`${logText}: ${client._id} : Deleting payments groups..`);
    await PaymentGroup.deleteMany({ clientId: client._id.toString() });
    // Territory Groups
    logger.info(`${logText}: ${client._id} : Deleting territory groups..`);
    await TerritoryGroup.deleteMany({ clientId: client._id.toString() });
    // Transactions
    logger.info(`${logText}: ${client._id} : Deleting transactions..`);
    await Transaction.deleteMany({ clientId: client._id.toString() });
    // Unmapped works
    logger.info(`${logText}: ${client._id} : Deleting unmapped works..`);
    await UnmappedWork.deleteMany({ clientId: client._id.toString() });
    // Unmapped tracks
    logger.info(`${logText}: ${client._id} : Deleting unmapped tracks..`);
    await UnmappedTrack.deleteMany({ clientId: client._id.toString() });
    // Unmapped releases
    logger.info(`${logText}: ${client._id} : Deleting unmapped releases..`);
    await UnmappedRelease.deleteMany({ clientId: client._id.toString() });

    // Delete bigQuery tables
    if (client.bigQueryDataset) {
      logger.info(`${logText}: ${client._id} : Deleting BigQuery Dataset... ${client.bigQueryDataset}`);
      const bigQueryClient = new BigQuery({ datasetName: client.bigQueryDataset });
      await util.promisify(bigQueryClient.deleteDataset)(client.bigQueryDataset).catch(logger.error);
    }

    // Delete Client
    logger.info(`${logText}: ${client._id} : Deleting client..`);
    await Client.findOneAndDelete({ _id: client._id });
    logger.info(`${logText}: ${client._id} : Client deletion complete ${client.name}`);
  }
};

module.exports = deleteCients;
