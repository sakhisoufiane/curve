/* eslint-disable no-await-in-loop */
const { logger, fileManager, fileOpener, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');

const fs = require('fs');
const { promisify } = require('util');
const { parallel, eachLimit } = require('async');
const moment = require('moment');
const uuid = require('uuid');
const appRootDir = require('app-root-dir').get();
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const config = require('../config.json');

const Period = require('../models/period');
const Client = require('../models/client');
const Contract = require('../models/contract');
const Payee = require('../models/payee');
const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');
const Composer = require('../models/composer');
const Publisher = require('../models/publisher');
const SalesTemplate = require('../models/salesTemplate');
const SalesFile = require('../models/salesFile');
const Cost = require('../models/cost');
const Statement = require('../models/statement');
const Transaction = require('../models/transaction');
const AccountingPeriod = require('../models/accountingPeriod');
const Company = require('../models/company');
const ContractTermGroup = require('../models/contractTermGroup');
const McpsNegative = require('../models/mcpsNegative');
const McpsRetention = require('../models/mcpsRetention');
const TerritoryGroup = require('../models/territoryGroup');
const Report = require('../models/report');
const User = require('../models/user');
const CWRAcknowledgement = require('../models/cwrAcknowledgement');
const CWRDelivery = require('../models/cwrDelivery');
const DeliveredWork = require('../models/deliveredWork');
const DeliveryLog = require('../models/deliveryLog');
const DeliveryPartner = require('../models/deliveryPartner');
const DeliveryProfile = require('../models/deliveryProfile');
const DeliverySchedule = require('../models/deliverySchedule');

const bucket = process.env.S3_bucket;

const CopyCypressClient = this;

CopyCypressClient.copy = async ({ clientId, userId }) => {
  const clientFolder = await copyData({ clientId, userId });
  const randomisedData = await randomiseIds({ file: `${clientFolder}/${clientId}.json` });
  const { randomClientId, randomUserId } = await createData({ clientData: randomisedData, salesFilesFolder: `${clientFolder}/salesFiles` });
  const token = await generateToken({ randomClientId, randomUserId });
  return token;
};

const copyData = async ({ clientId, userId }) => {
  // Get Client
  logger.debug('Getting client data');
  const client = await Client.findById(clientId);
  if (!client) throw Error('No client found for the supplied ID');

  // Create client data folder
  const clientFolder = `${appRootDir}/tmp/${clientId}-${moment().format('x')}`;
  if (!fs.existsSync(clientFolder)) { fs.mkdirSync(clientFolder); }
  // Create salesfile folder
  const salesFilesFolder = `${clientFolder}/salesFiles`;
  if (!fs.existsSync(salesFilesFolder)) { fs.mkdirSync(salesFilesFolder); }
  // Create period data file
  const file = `${clientFolder}/${clientId}.json`;
  await fs.promises.writeFile(file, '{');
  // Create BQ instance
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
  // get client data
  logger.debug('Getting client data');
  const clientWithoutTables = client.toObject();
  clientWithoutTables.createdBigQueryTables = false;

  delete clientWithoutTables.bigQueryDataset;
  delete clientWithoutTables.bigQuerySalesTable;
  delete clientWithoutTables.bigQueryPeriodSales;
  delete clientWithoutTables.bigQueryAccountingPeriodSales;
  delete clientWithoutTables.bigQueryPeriodCosts;

  await addObjectToFile(file, 'client', clientWithoutTables, true);

  const data = [];

  await parallel([
    async () => {
      // get user data
      logger.debug('Getting user data');
      const user = await User.findById(userId);
      user.email = `${moment().format('x')}@curveroyaltysystems.com`;
      data.push({ label: 'user', value: user });
    },
    async () => {
      // get contracts data
      logger.debug('Getting contracts data');
      const contracts = await Contract.find({ clientId });
      data.push({ label: 'contracts', value: contracts });
    },
    async () => {
      // get payees data
      logger.debug('Getting payees data');
      const payees = await Payee.find({ clientId });
      data.push({ label: 'payees', value: payees });
    },
    async () => {
      // get releases data
      logger.debug('Getting releases data');
      const releases = await Release.find({ clientId });
      data.push({ label: 'releases', value: releases });
    },
    async () => {
      // get tracks data
      logger.debug('Getting tracks data');
      const tracks = await Track.find({ clientId });
      data.push({ label: 'tracks', value: tracks });
    },
    async () => {
      // get works data
      logger.debug('Getting works data');
      const works = await Work.find({ clientId });
      data.push({ label: 'works', value: works });
    },
    async () => {
      // get composers data
      logger.debug('Getting composers data');
      const composers = await Composer.find({ clientId });
      data.push({ label: 'composers', value: composers });
    },
    async () => {
      // get publishers data
      logger.debug('Getting publishers data');
      const publishers = await Publisher.find({ clientId });
      data.push({ label: 'publishers', value: publishers });
    },
    async () => {
      // get salesTemplates data
      logger.debug('Getting sales templates data');
      const salesTemplates = await SalesTemplate.find({ clientId });
      data.push({ label: 'salesTemplates', value: salesTemplates });
    },
    async () => {
      // get periods data
      logger.debug('Getting periods data');
      const periods = await Period.find({ clientId });
      data.push({ label: 'periods', value: periods });
    },
    async () => {
      // get statements data
      logger.debug('Getting statements data');
      const statements = await Statement.find({ clientId });
      data.push({ label: 'statements', value: statements });
    },
    async () => {
      // get costs data
      logger.debug('Getting costs data');
      const costs = await Cost.find({ clientId });
      data.push({ label: 'costs', value: costs });
    },
    async () => {
      // get salesFiles data
      logger.debug('Getting sales files data');
      const salesFiles = await SalesFile.find({ clientId });
      data.push({ label: 'salesFiles', value: salesFiles });
      // Download sales files
      for (const salesFile of salesFiles) {
        const localFile = await promisify(fileManager.downloadFromS3)(salesFile.file, bucket);
        const extension = await promisify(fileOpener.detectExtension)(localFile);
        await fs.promises.copyFile(localFile, `${salesFilesFolder}/${salesFile._id.toString()}${extension}`);
      }
    },
    async () => {
      // get transactions
      logger.debug('Getting transactions');
      const transactions = await Transaction.find({ clientId });
      data.push({ label: 'transactions', value: transactions });
    },
    async () => {
      // get accounting periods
      logger.debug('Getting accounting periods');
      const accountingPeriods = await AccountingPeriod.find({ clientId });
      data.push({ label: 'accountingPeriods', value: accountingPeriods });
    },
    async () => {
      // get companies
      logger.debug('Getting companies');
      const companies = await Company.find({ clientId });
      data.push({ label: 'companies', value: companies });
    },
    async () => {
      // get contract term groups
      logger.debug('Getting contract term groups');
      const contractTermGroups = await ContractTermGroup.find({ clientId });
      data.push({ label: 'contractTermGroups', value: contractTermGroups });
    },
    async () => {
      // get Mcps negatives
      logger.debug('Getting Mcps negatives');
      const mcpsNegatives = await McpsNegative.find({ clientId });
      data.push({ label: 'mcpsNegatives', value: mcpsNegatives });
    },
    async () => {
      // get Mcps rententions
      logger.debug('Getting Mcps retentions');
      const mcpsRetentions = await McpsRetention.find({ clientId });
      data.push({ label: 'mcpsRetentions', value: mcpsRetentions });
    },
    async () => {
      // get territory groups
      logger.debug('Getting territory groups');
      const territoryGroups = await TerritoryGroup.find({ clientId });
      data.push({ label: 'territoryGroups', value: territoryGroups });
    },
    async () => {
      // get reports
      logger.debug('Getting reports');
      const reports = await Report.find({ clientId });
      data.push({ label: 'reports', value: reports });
    },
    async () => {
      // get cwrAcknowledgements
      logger.debug('Getting cwrAcknowledgements');
      const cwrAcknowledgements = await CWRAcknowledgement.find({ clientId });
      data.push({ label: 'cwrAcknowledgements', value: cwrAcknowledgements });
    },
    async () => {
      // get cwrDeliveries
      logger.debug('Getting cwrDeliveries');
      const cwrDeliveries = await CWRDelivery.find({ clientId });
      data.push({ label: 'cwrDeliveries', value: cwrDeliveries });
    },
    async () => {
      // get deliveredWorks
      logger.debug('Getting deliveredWorks');
      const deliveredWorks = await DeliveredWork.find({ clientId });
      data.push({ label: 'deliveredWorks', value: deliveredWorks });
    },
    async () => {
      // get deliveryLogs
      logger.debug('Getting deliveryLogs');
      const deliveryLogs = await DeliveryLog.find({ clientId });
      data.push({ label: 'deliveryLogs', value: deliveryLogs });
    },
    async () => {
      // get deliveryPartners
      logger.debug('Getting deliveryPartners');
      const deliveryPartners = await DeliveryPartner.find({ clientId });
      data.push({ label: 'deliveryPartners', value: deliveryPartners });
    },
    async () => {
      // get deliveryProfiles
      logger.debug('Getting deliveryProfiles');
      const deliveryProfiles = await DeliveryProfile.find({ clientId });
      data.push({ label: 'deliveryProfiles', value: deliveryProfiles });
    },
    async () => {
      // get deliverySchedules
      logger.debug('Getting deliverySchedules');
      const deliverySchedules = await DeliverySchedule.find({ clientId });
      data.push({ label: 'deliverySchedules', value: deliverySchedules });
    },

    async () => {
      // get BQ Input Table data
      logger.debug('Getting BQ Input Table data');

      const query = bigQuery.getDataQuery(bigQuery.inputTable, '*', 'TRUE');
      const labels = {
        job_type: 'cypress_copy',
        sub_process: 'copy_input_table',
      };

      const lines = await bigQuery.queryJobPromise({ query, labels });
      data.push({ label: 'inputTable', value: lines });
    },
    async () => {
      // get BQ Output Table data
      logger.debug('Getting BQ Output Table data');
      const query = bigQuery.getDataQuery(bigQuery.outputTable, '*', 'TRUE');
      const labels = {
        job_type: 'cypress_copy',
        sub_process: 'copy_output_table',
      };

      const lines = await bigQuery.queryJobPromise({ query, labels });
      data.push({ label: 'outputTable', value: lines });
    },
    async () => {
      // get BQ Costs Table data
      logger.debug('Getting BQ Costs Table data');
      const query = bigQuery.getDataQuery(bigQuery.costsTable, '*', 'TRUE');
      const labels = {
        job_type: 'cypress_copy',
        sub_process: 'copy_costs_table',
      };

      const lines = await bigQuery.queryJobPromise({ query, labels });
      data.push({ label: 'costsTable', value: lines });
    },
  ]);

  for (const model of data) {
    await addObjectToFile(file, model.label, model.value);
  }

  // Close file
  await fs.promises.appendFile(file, '\r}');

  return clientFolder;
};

const addObjectToFile = async (file, objectName, object, isFirstObject) => {
  if (!isFirstObject) await fs.promises.appendFile(file, ',');
  await fs.promises.appendFile(file, `\r"${objectName}": ${JSON.stringify(object)}`);
};

const randomiseIds = async ({ file }) => {
  const clientData = await fs.promises.readFile(file, 'utf8');
  const data = JSON.parse(clientData);
  const IDs = [];
  const salesFileIDs = [];
  const bigQueryIDs = [];
  IDs.push(data.client._id.toString());
  IDs.push(data.user._id.toString());
  for (const period of data.periods) { IDs.push(period._id.toString()); }
  for (const statement of data.statements) { IDs.push(statement._id.toString()); }
  for (const contract of data.contracts) { IDs.push(contract._id.toString()); }
  for (const payee of data.payees) { IDs.push(payee._id.toString()); }
  for (const release of data.releases) { IDs.push(release._id.toString()); }
  for (const track of data.tracks) { IDs.push(track._id.toString()); }
  for (const work of data.works) { IDs.push(work._id.toString()); }
  for (const composer of data.composers) { IDs.push(composer._id.toString()); }
  for (const publisher of data.publishers) { IDs.push(publisher._id.toString()); }
  for (const cost of data.costs) { IDs.push(cost._id.toString()); }
  for (const salesTemplate of data.salesTemplates) { IDs.push(salesTemplate._id.toString()); }
  for (const salesFile of data.salesFiles) {
    salesFile.originalId = `${salesFile._id.toString().slice(0, 12)}===${salesFile._id.toString().slice(12)}`;
    IDs.push(salesFile._id.toString());
    salesFileIDs.push(salesFile._id.toString());
  }
  for (const transaction of data.transactions) { IDs.push(transaction._id.toString()); }
  for (const company of data.companies) { IDs.push(company._id.toString()); }
  for (const accountingPeriod of data.accountingPeriods) { IDs.push(accountingPeriod._id.toString()); }
  for (const contractTermGroup of data.contractTermGroups) { IDs.push(contractTermGroup._id.toString()); }
  for (const mcpsNegative of data.mcpsNegatives) { IDs.push(mcpsNegative._id.toString()); }
  for (const mcpsRetention of data.mcpsRetentions) { IDs.push(mcpsRetention._id.toString()); }
  for (const territoryGroup of data.territoryGroups) { IDs.push(territoryGroup._id.toString()); }
  for (const report of data.reports) { IDs.push(report._id.toString()); }
  for (const cwrAcknowledgement of data.cwrAcknowledgements) { IDs.push(cwrAcknowledgement._id.toString()); }
  for (const cwrDelivery of data.cwrDeliveries) { IDs.push(cwrDelivery._id.toString()); }
  for (const deliveredWork of data.deliveredWorks) { IDs.push(deliveredWork._id.toString()); }
  for (const deliveryLog of data.deliveryLogs) { IDs.push(deliveryLog._id.toString()); }
  for (const deliveryPartner of data.deliveryPartners) { IDs.push(deliveryPartner._id.toString()); }
  for (const deliveryProfile of data.deliveryProfiles) { IDs.push(deliveryProfile._id.toString()); }
  for (const deliverySchedule of data.deliverySchedules) { IDs.push(deliverySchedule._id.toString()); }

  let randomisedData = JSON.stringify(data);

  for (let i = 0; i < IDs.length; i += 1) {
    const newID = new ObjectId().toString();
    randomisedData = randomisedData.replaceAll(IDs[i], newID);
  }

  for (const line of data.inputTable) { bigQueryIDs.push({ id: line.id, salesFileId: line.salesFileId }); }
  for (let i = 0; i < bigQueryIDs.length; i += 1) {
    const newID = uuid.v5(moment().format('YYYYMMDDHHmmSSssss') + bigQueryIDs[i].salesFileId + i, uuid.v5.DNS);
    randomisedData = randomisedData.replaceAll(bigQueryIDs[i].id, newID);
  }

  for (let i = 0; i < salesFileIDs.length; i += 1) {
    const id = salesFileIDs[i];
    const modifiedId = `${id.slice(0, 12)}===${id.slice(12)}`;
    randomisedData = randomisedData.replaceAll(modifiedId, id);
  }

  return randomisedData;
};

const createData = async ({ clientData, salesFilesFolder }) => {
  const data = JSON.parse(clientData);
  const randomName = `- Cypress Test Client - ${moment().format('x')}`;
  // Create client
  const clientId = data.client._id.toString();
  logger.debug(`\rAdding Client ${data.client._id}`);
  const { distributionChannels, configurations, priceCategories, costTypes, accountingPeriodTypes } = data.client;
  const client = new Client(data.client);
  client._id = new ObjectId(client._id);
  client.name += randomName;
  client.createdBigQueryTables = false;
  client.cypressClient = true;

  client.bigQueryDataset = client.name.replace(/[^0-9a-z]/gi, '') + moment().format('x') + process.env.environmentName;
  client.bigQueryPeriodSales = `${client.bigQueryDataset}PeriodSales`;
  client.bigQuerySalesTable = `${client.bigQueryDataset}Sales`;
  client.bigQueryAccountingPeriodSales = `${client.bigQueryDataset}AccountingPeriodSales`;
  client.bigQueryPeriodCosts = `${client.bigQueryDataset}PeriodCosts`;

  await client.save();

  client.distributionChannels = distributionChannels;
  client.configurations = configurations;
  client.priceCategories = priceCategories;
  client.costTypes = costTypes;
  client.accountingPeriodTypes = accountingPeriodTypes;
  await client.save();
  // Create BQ instance
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
  // Create User
  logger.debug(`\rAdding User ${data.user._id}`);
  data.user.clientId = clientId;
  data.user.clientIds = [clientId];
  data.user.adminClientIds = [clientId];
  data.user.cypressUser = true;
  data.user.rights = {
    [clientId]: { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true },
  };
  data.user._id = new ObjectId(data.user._id);
  await new User(data.user).save();

  await parallel([
    async () => {
      // Create Contracts
      await eachLimit(data.contracts, 25, async (contract) => {
        logger.debug(`\rAdding Contract ${contract._id}`);
        contract.clientId = clientId;
        contract._id = new ObjectId(contract._id);
        contract.createdAt = new Date(contract.createdAt);
        contract.updatedAt = new Date(contract.updatedAt);
        await Contract.collection.insertOne(contract);
      });
      // Transactions
      await eachLimit(data.transactions, 25, async (transaction) => {
        logger.debug(`\rAdding Transaction ${transaction._id}`);
        transaction.clientId = clientId;
        transaction._id = new ObjectId(transaction._id);
        transaction.createdAt = new Date(transaction.createdAt);
        transaction.updatedAt = new Date(transaction.updatedAt);
        await Transaction.collection.insertOne(transaction);
      });
    },
    async () => {
      // Create Payees
      await eachLimit(data.payees, 25, async (payee) => {
        logger.debug(`\rAdding Payee ${payee._id}`);
        payee.clientId = clientId;
        payee._id = new ObjectId(payee._id);
        payee.createdAt = new Date(payee.createdAt);
        payee.updatedAt = new Date(payee.updatedAt);
        await new Payee(payee).save();
      });
    },
    async () => {
      // Create Releases
      await eachLimit(data.releases, 25, async (release) => {
        logger.debug(`\rAdding Release ${release._id}`);
        release.clientId = clientId;
        release._id = new ObjectId(release._id);
        release.createdAt = new Date(release.createdAt);
        release.updatedAt = new Date(release.updatedAt);
        await Release.collection.insertOne(release);
      });
    },
    async () => {
      // Create Tracks
      await eachLimit(data.tracks, 25, async (track) => {
        logger.debug(`\rAdding Track ${track._id}`);
        track.clientId = clientId;
        track._id = new ObjectId(track._id);
        track.createdAt = new Date(track.createdAt);
        track.updatedAt = new Date(track.updatedAt);
        await Track.collection.insertOne(track);
      });
    },
    async () => {
      // Create Works
      await eachLimit(data.works, 25, async (work) => {
        logger.debug(`\rAdding Work ${work._id}`);
        work.clientId = clientId;
        work._id = new ObjectId(work._id);
        work.createdAt = new Date(work.createdAt);
        work.updatedAt = new Date(work.updatedAt);
        work.approvedDate = new Date(work.approvedDate);
        work.deliveredTo = work.deliveredTo || [];
        work.deliveredTo.forEach((delivery) => {
          delivery.deliveryPartnerId = new ObjectId(delivery.deliveryPartnerId);
          delivery.deliveredAt = new Date(delivery.deliveredAt);
        });
        await Work.collection.insertOne(work);
      });
    },
    async () => {
      // Create Composers
      await eachLimit(data.composers, 25, async (composer) => {
        logger.debug(`\rAdding Composer ${composer._id}`);
        composer.clientId = clientId;
        composer._id = new ObjectId(composer._id);
        composer.createdAt = new Date(composer.createdAt);
        composer.updatedAt = new Date(composer.updatedAt);
        await Composer.collection.insertOne(composer);
      });
    },
    async () => {
      // Create Publishers
      await eachLimit(data.publishers, 25, async (publisher) => {
        logger.debug(`\rAdding Publisher ${publisher._id}`);
        publisher.clientId = clientId;
        publisher._id = new ObjectId(publisher._id);
        publisher.createdAt = new Date(publisher.createdAt);
        publisher.updatedAt = new Date(publisher.updatedAt);
        await Publisher.collection.insertOne(publisher);
      });
    },
    async () => {
      // Costs
      await eachLimit(data.costs, 25, async (cost) => {
        logger.debug(`\rAdding Cost ${cost._id}`);
        cost.clientId = clientId;
        cost._id = new ObjectId(cost._id);
        cost.createdAt = new Date(cost.createdAt);
        cost.updatedAt = new Date(cost.updatedAt);
        await Cost.collection.insertOne(cost);
      });
    },
    async () => {
      // Sales Templates
      await eachLimit(data.salesTemplates, 25, async (salesTemplate) => {
        logger.debug(`\rAdding Sales Template ${salesTemplate._id}`);
        salesTemplate.clientId = clientId;
        salesTemplate._id = new ObjectId(salesTemplate._id);
        salesTemplate.createdAt = new Date(salesTemplate.createdAt);
        salesTemplate.updatedAt = new Date(salesTemplate.updatedAt);
        await SalesTemplate.collection.insertOne(salesTemplate);
      });
    },
    async () => {
      // Sales Files
      await eachLimit(data.salesFiles, 25, async (salesFile) => {
        logger.debug(`\rAdding Sales File ${salesFile._id}`);
        // Upload sales file
        const extension = await promisify(fileOpener.detectExtension)(salesFile.file);
        const filePath = `${salesFilesFolder}/${salesFile.originalId}${extension}`;
        salesFile.file = await promisify(fileManager.uploadToS3)(`testData/${salesFile._id}_${moment().format('x')}${extension}`, filePath);
        salesFile.clientId = clientId;
        salesFile._id = new ObjectId(salesFile._id);
        salesFile.createdAt = new Date(salesFile.createdAt);
        salesFile.updatedAt = new Date(salesFile.updatedAt);
        await SalesFile.collection.insertOne(salesFile);
      });
    },
    async () => {
      // Companies
      await eachLimit(data.companies, 25, async (company) => {
        logger.debug(`\rAdding Company ${company._id}`);
        company.clientId = clientId;
        company.name += randomName;
        company._id = new ObjectId(company._id);
        company.createdAt = new Date(company.createdAt);
        company.updatedAt = new Date(company.updatedAt);
        await Company.collection.insertOne(company);
      });
    },
    async () => {
      // Accounting periods
      await eachLimit(data.accountingPeriods, 25, async (accountingPeriod) => {
        logger.debug(`\rAdding Accounting Period ${accountingPeriod._id}`);
        accountingPeriod.clientId = clientId;
        accountingPeriod._id = new ObjectId(accountingPeriod._id);
        accountingPeriod.createdAt = new Date(accountingPeriod.createdAt);
        accountingPeriod.updatedAt = new Date(accountingPeriod.updatedAt);
        await AccountingPeriod.collection.insertOne(accountingPeriod);
      });
    },
    async () => {
      // Contract Term Groups
      await eachLimit(data.contractTermGroups, 25, async (contractTermGroup) => {
        logger.debug(`\rAdding Contract Term Group ${contractTermGroup._id}`);
        contractTermGroup.clientId = clientId;
        contractTermGroup._id = new ObjectId(contractTermGroup._id);
        contractTermGroup.createdAt = new Date(contractTermGroup.createdAt);
        contractTermGroup.updatedAt = new Date(contractTermGroup.updatedAt);
        await ContractTermGroup.collection.insertOne(contractTermGroup);
      });
    },
    async () => {
      // Mcps Negatives
      await eachLimit(data.mcpsNegatives, 25, async (mcpsNegative) => {
        logger.debug(`\rAdding Mcps Negative ${mcpsNegative._id}`);
        mcpsNegative.clientId = clientId;
        mcpsNegative._id = new ObjectId(mcpsNegative._id);
        mcpsNegative.createdAt = new Date(mcpsNegative.createdAt);
        mcpsNegative.updatedAt = new Date(mcpsNegative.updatedAt);
        await McpsNegative.collection.insertOne(mcpsNegative);
      });
    },
    async () => {
      // Mcps Retentions
      await eachLimit(data.mcpsRetentions, 25, async (mcpsRetention) => {
        logger.debug(`\rAdding Mcps Retention ${mcpsRetention._id}`);
        mcpsRetention.clientId = clientId;
        mcpsRetention._id = new ObjectId(mcpsRetention._id);
        mcpsRetention.createdAt = new Date(mcpsRetention.createdAt);
        mcpsRetention.updatedAt = new Date(mcpsRetention.updatedAt);
        await McpsRetention.collection.insertOne(mcpsRetention);
      });
    },
    async () => {
      // Territory Groups
      await eachLimit(data.territoryGroups, 25, async (territoryGroup) => {
        logger.debug(`\rAdding Territory Group ${territoryGroup._id}`);
        territoryGroup.clientId = clientId;
        territoryGroup._id = new ObjectId(territoryGroup._id);
        territoryGroup.createdAt = new Date(territoryGroup.createdAt);
        territoryGroup.updatedAt = new Date(territoryGroup.updatedAt);
        await TerritoryGroup.collection.insertOne(territoryGroup);
      });
    },
    async () => {
      // Reports
      await eachLimit(data.reports, 25, async (report) => {
        logger.debug(`\rAdding Report ${report._id}`);
        report.clientId = clientId;
        report._id = new ObjectId(report._id);
        report.createdAt = new Date(report.createdAt);
        report.updatedAt = new Date(report.updatedAt);
        await Report.collection.insertOne(report);
      });
    },
    async () => {
      // Periods
      await eachLimit(data.periods, 25, async (period) => {
        logger.debug(`\rAdding Period ${period._id}`);
        period.clientId = clientId;
        period._id = new ObjectId(period._id);
        period.createdAt = new Date(period.createdAt);
        period.updatedAt = new Date(period.updatedAt);
        await Period.collection.insertOne(period);
      });
    },
    async () => {
      // Statements
      await eachLimit(data.statements, 25, async (statement) => {
        logger.debug(`\rAdding Statement ${statement._id}`);
        statement.clientId = clientId;
        statement._id = new ObjectId(statement._id);
        statement.createdAt = new Date(statement.createdAt);
        statement.updatedAt = new Date(statement.updatedAt);
        await Statement.collection.insertOne(statement);
      });
    },

    async () => {
      // CWRAcknowledgement
      await eachLimit(data.cwrAcknowledgements, 25, async (cwrAcknowledgement) => {
        logger.debug(`\rAdding CWRAcknowledgement ${cwrAcknowledgement._id}`);
        cwrAcknowledgement.clientId = clientId;
        cwrAcknowledgement._id = new ObjectId(cwrAcknowledgement._id);
        cwrAcknowledgement.createdAt = new Date(cwrAcknowledgement.createdAt);
        cwrAcknowledgement.updatedAt = new Date(cwrAcknowledgement.updatedAt);
        await CWRAcknowledgement.collection.insertOne(cwrAcknowledgement);
      });
    },
    async () => {
      // CWRDelivery
      await eachLimit(data.cwrDeliveries, 25, async (cwrDelivery) => {
        logger.debug(`\rAdding CWRDelivery ${cwrDelivery._id}`);
        cwrDelivery.clientId = clientId;
        cwrDelivery._id = new ObjectId(cwrDelivery._id);
        cwrDelivery.createdAt = new Date(cwrDelivery.createdAt);
        cwrDelivery.updatedAt = new Date(cwrDelivery.updatedAt);
        await CWRDelivery.collection.insertOne(cwrDelivery);
      });
    },
    async () => {
      // DeliveredWork
      await eachLimit(data.deliveredWorks, 25, async (deliveredWork) => {
        logger.debug(`\rAdding DeliveredWork ${deliveredWork._id}`);
        deliveredWork.clientId = clientId;
        deliveredWork._id = new ObjectId(deliveredWork._id);
        deliveredWork.workId = new ObjectId(deliveredWork.workId);
        deliveredWork.cwrDeliveryId = new ObjectId(deliveredWork.cwrDeliveryId);
        deliveredWork.cwrAcknowledgementId = new ObjectId(deliveredWork.cwrAcknowledgementId);
        deliveredWork.deliveryPartnerId = new ObjectId(deliveredWork.deliveryPartnerId);
        deliveredWork.createdAt = new Date(deliveredWork.createdAt);
        deliveredWork.updatedAt = new Date(deliveredWork.updatedAt);
        deliveredWork.deliveryDate = new Date(deliveredWork.deliveryDate);
        await DeliveredWork.collection.insertOne(deliveredWork);
      });
    },
    async () => {
      // DeliveryLog
      await eachLimit(data.deliveryLogs, 25, async (deliveryLog) => {
        logger.debug(`\rAdding DeliveryLog ${deliveryLog._id}`);
        deliveryLog.clientId = clientId;
        deliveryLog._id = new ObjectId(deliveryLog._id);
        deliveryLog.workId = new ObjectId(deliveryLog.workId);
        deliveryLog.deliveryPartnerId = new ObjectId(deliveryLog.deliveryPartnerId);
        deliveryLog.createdAt = new Date(deliveryLog.createdAt);
        deliveryLog.updatedAt = new Date(deliveryLog.updatedAt);
        for (const log of deliveryLog.log) {
          if (log.deliveredWorkId) { log.deliveredWorkId = new ObjectId(log.deliveredWorkId); }
          if (log.cwrDeliveryId) { log.cwrDeliveryId = new ObjectId(log.cwrDeliveryId); }
          if (log.acknowledgementId) { log.acknowledgementId = new ObjectId(log.acknowledgementId); }
        }
        await DeliveryLog.collection.insertOne(deliveryLog);
      });
    },
    async () => {
      // DeliveryPartner
      await eachLimit(data.deliveryPartners, 25, async (deliveryPartner) => {
        logger.debug(`\rAdding DeliveryPartner ${deliveryPartner._id}`);
        deliveryPartner.clientId = clientId;
        deliveryPartner._id = new ObjectId(deliveryPartner._id);
        deliveryPartner.createdAt = new Date(deliveryPartner.createdAt);
        deliveryPartner.updatedAt = new Date(deliveryPartner.updatedAt);
        await DeliveryPartner.collection.insertOne(deliveryPartner);
      });
    },
    async () => {
      // DeliveryProfile
      await eachLimit(data.deliveryProfiles, 25, async (deliveryProfile) => {
        logger.debug(`\rAdding DeliveryProfile ${deliveryProfile._id}`);
        deliveryProfile.clientId = clientId;
        deliveryProfile._id = new ObjectId(deliveryProfile._id);
        deliveryProfile.createdAt = new Date(deliveryProfile.createdAt);
        deliveryProfile.updatedAt = new Date(deliveryProfile.updatedAt);
        await DeliveryProfile.collection.insertOne(deliveryProfile);
      });
    },
    async () => {
      // DeliverySchedule
      await eachLimit(data.deliverySchedules, 25, async (deliverySchedule) => {
        logger.debug(`\rAdding DeliverySchedule ${deliverySchedule._id}`);
        deliverySchedule.clientId = clientId;
        deliverySchedule._id = new ObjectId(deliverySchedule._id);
        deliverySchedule.deliveryPartnerId = new ObjectId(deliverySchedule.deliveryPartnerId);
        deliverySchedule.createdAt = new Date(deliverySchedule.createdAt);
        deliverySchedule.updatedAt = new Date(deliverySchedule.updatedAt);
        await DeliverySchedule.collection.insertOne(deliverySchedule);
      });
    },
    async () => {
      // BQ Tables
      // make sure no value is an object
      for (const line of data.inputTable) {
        for (const field in line) {
          if (line?.[field]?.value) { line[field] = line[field].value; }
        }
      }
      for (const line of data.outputTable) {
        for (const field in line) {
          if (line?.[field]?.value) { line[field] = line[field].value; }
        }
      }
      for (const line of data.costsTable) {
        for (const field in line) {
          if (line?.[field]?.value) { line[field] = line[field].value; }
        }
      }
      await new Promise((resolve, reject) => {
        bigQuery.setupFile(() => {
          bigQuery.writeToFile(data.inputTable, () => {
            bigQuery.writeFileToDb(bigQuery.inputTable, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      });
      await new Promise((resolve, reject) => {
        bigQuery.setupFile(() => {
          bigQuery.writeToFile(data.outputTable, () => {
            bigQuery.writeFileToDb(bigQuery.outputTable, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      });
      await new Promise((resolve, reject) => {
        bigQuery.setupFile(() => {
          bigQuery.writeToFile(data.costsTable, () => {
            bigQuery.writeFileToDb(bigQuery.costsTable, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      });
    },
  ]);

  return { randomClientId: data.client._id.toString(), randomUserId: data.user._id.toString() };
};

const generateToken = async ({ randomClientId: clientId, randomUserId: userId }) => {
  const user = await User.findById(userId);
  const client = await Client.findById(clientId);

  const adminType = await user.clientAdminType(user.clientId);
  // If user is a parent, get all clients under the parent and add them to the user's rights
  if (user.parentId) {
    const clients = await Client.find({ parentId: user.parentId }).select('_id');
    clients.forEach((client) => {
      user.rights[client._id.toString()] = { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true };
    });
  }
  // Create token for response
  return new Promise((resolve) => {
    jwt.sign(
      { id: userId, type: 'client', internal: user.internal, superInternal: user.superInternal, parentId: user.parentId, clientId, rights: user.internal && !user.rights?.[clientId] ? { [clientId]: { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true } } : { [clientId]: user.rights[clientId] }, lockedForNonPayment: client.lockedForNonPayment, adminType },
      process.env.jsonSecretToken,
      { expiresIn: 86400 },
      (err, token) => {
        resolve(token);
      },
    );
  });
};
module.exports = CopyCypressClient;
