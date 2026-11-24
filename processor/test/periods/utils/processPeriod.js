/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
const ProcessPeriod = this;
const { logger, fileManager, testUtils, fileOpener, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const moment = require('moment');
const { promisify } = require('util');
const { eachLimit } = require('async');
const { MongoClient } = require('mongodb');

const Period = require('../../../models/period');
const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Payee = require('../../../models/payee');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const Composer = require('../../../models/composer');
const Publisher = require('../../../models/publisher');
const SalesTemplate = require('../../../models/salesTemplate');
const SalesFile = require('../../../models/salesFile');
const Cost = require('../../../models/cost');
const Statement = require('../../../models/statement');
const Transaction = require('../../../models/transaction');
const AccountingPeriod = require('../../../models/accountingPeriod');
const Company = require('../../../models/company');
const ContractTermGroup = require('../../../models/contractTermGroup');
const McpsNegative = require('../../../models/mcpsNegative');
const McpsRetention = require('../../../models/mcpsRetention');
const TerritoryGroup = require('../../../models/territoryGroup');
const Report = require('../../../models/report');
const Escalation = require('../../../models/escalation');

const PeriodController = require('../../../libs/calculation/periodController');
const StatementController = require('../../../libs/calculation/statementController');
const SalesFileController = require('../../../libs/salesIngestion/salesFileController');

const bqTestUtils = new BigQueryTestUtils({ containerised: false });

const crossContracts = [];
const summaryContracts = [];

ProcessPeriod.process = async ({ clientId, periodData, salesFilesFolder }) => {
  await bqTestUtils.init();
  const bigQuery = await bqTestUtils.getBigQuery();

  const calculationResult = {};
  // Create Period data
  logger.debug('Creating Period data..');
  periodData = await ProcessPeriod.randomiseIds(periodData);
  calculationResult.originalData = JSON.parse(periodData);
  const period = await ProcessPeriod.createData(clientId, periodData, salesFilesFolder, bigQuery);
  logger.debug(`Done creating data for Period ${period._id}.`);
  // Ingest Sales Files
  logger.debug('Ingesting sales files..');
  const salesFiles = await SalesFile.find({ clientId: period.clientId, _id: { $in: period.salesFilesIds } });
  await eachLimit(salesFiles, 1, (salesFile, cb) => SalesFileController.ingest(salesFile, 'internal', cb));

  // Calculate Period
  logger.debug('Calculating period..');
  await new Promise((resolve) => { PeriodController.calculate(period, () => resolve()); });
  calculationResult.period = await Period.findById(period._id);

  // Get statements
  const statements = await Statement.find({ clientId: period.clientId, periodId: period._id.toString() });
  calculationResult.statements = JSON.parse(JSON.stringify(statements));

  // Recalculate Statements

  // Recalculate statements other than cross and summary
  await eachLimit(statements, 3, async (statement) => {
    if (summaryContracts.indexOf(statement.contractId.toString()) === -1 && crossContracts.indexOf(statement.contractId.toString()) === -1) {
      await new Promise((resolve) => { StatementController.calculate(statement, () => resolve()); });
    }
  });

  // Recalculate cross contracts statements
  await eachLimit(statements, 3, async (statement) => {
    if (crossContracts.indexOf(statement.contractId.toString()) !== -1) {
      await new Promise((resolve) => { StatementController.calculate(statement, () => resolve()); });
    }
  });

  // Recalculate summary statements
  await eachLimit(statements, 3, async (statement) => {
    if (summaryContracts.indexOf(statement.contractId.toString()) !== -1) {
      await new Promise((resolve) => { StatementController.calculate(statement, () => resolve()); });
    }
  });

  calculationResult.recalculatedStatements = JSON.parse(JSON.stringify(await Statement.find({ clientId: period.clientId, periodId: period._id.toString() })));

  await bqTestUtils.cleanUpTestTables({ bigQuery });

  // Return the period data
  return calculationResult;
};

ProcessPeriod.createData = async (clientId, periodData, salesFilesFolder, bigQuery) => {
  const data = JSON.parse(periodData);
  // Create client
  data.client._id = clientId;
  process.stdout.write(`\rAdding Client ${data.client._id}`);
  const client = new Client(data.client);
  client.name = testUtils.randomString();
  client.bigQueryDataset = bigQuery.datasetName;
  client.bigQuerySalesTable = bigQuery.inputTable;
  client.bigQueryPeriodSales = bigQuery.outputTable;
  client.bigQueryPeriodCosts = bigQuery.costsTable;
  client.createdBigQueryTables = true;
  await client.save();
  // Create Contracts
  process.stdout.write('\n');
  let count = 0;
  for (const contract of data.contracts) {
    count += 1;
    if (contract.summaryContractTotals) { summaryContracts.push(contract._id.toString()); }
    if (contract.crossContracts?.length) {
      contract.crossContracts.forEach((crossContract) => { crossContracts.push(crossContract.contractId); });
    }
    process.stdout.write(`\rAdding Contract ${contract._id} ${count}/${data.contracts.length}`);
    contract.clientId = clientId;
    await new Contract(contract).save();
  }

  // Create Payees
  process.stdout.write('\n');
  count = 0;
  for (const payee of data.payees) {
    count += 1;
    process.stdout.write(`\rAdding Payee ${payee._id} ${count}/${data.payees.length}`);
    payee.clientId = clientId;
    await new Payee(payee).save();
  }
  // Create Releases
  process.stdout.write('\n');
  count = 0;
  for (const release of data.releases) {
    count += 1;
    process.stdout.write(`\rAdding Release ${release._id} ${count}/${data.releases.length}`);
    release.clientId = clientId;
    release.skipPreSaveHook = true;
    await new Release(release).save();
  }
  // Create Tracks
  process.stdout.write('\n');
  count = 0;
  for (const track of data.tracks) {
    count += 1;
    process.stdout.write(`\rAdding Track ${track._id} ${count}/${data.tracks.length}`);
    track.clientId = clientId;
    track.skipPreSaveHook = true;
    await new Track(track).save();
  }
  // Create Works
  process.stdout.write('\n');
  process.stdout.write(`\rAdding ${data.works.length} Works`);
  await Work.insertMany(data.works.map((work) => ({ ...work, clientId })));
  // Create Composers
  process.stdout.write('\n');
  process.stdout.write(`\rAdding ${data.composers.length} Composers`);
  await Composer.insertMany(data.composers.map((composer) => ({ ...composer, clientId })));
  // Create Publishers
  process.stdout.write('\n');
  process.stdout.write(`\rAdding ${data.publishers.length} Publishers`);
  await Publisher.insertMany(data.publishers.map((publisher) => ({ ...publisher, clientId })));
  // Costs
  process.stdout.write('\n');
  count = 0;
  for (const cost of data.costs) {
    count += 1;
    process.stdout.write(`\rAdding Cost ${cost._id} ${count}/${data.costs.length}`);
    cost.calculationContractIds = [];
    cost.periodIds = [];
    cost.clientId = clientId;
    await new Cost(cost).save();
  }
  // Sales Templates
  process.stdout.write('\n');
  count = 0;
  for (const salesTemplate of data.salesTemplates) {
    count += 1;
    process.stdout.write(`\rAdding Sales Template ${salesTemplate._id} ${count}/${data.salesTemplates.length}`);
    salesTemplate.clientId = clientId;
    await new SalesTemplate(salesTemplate).save();
  }
  // Sales Files
  process.stdout.write('\n');
  count = 0;
  for (const salesFile of data.salesFiles) {
    count += 1;
    process.stdout.write(`\rAdding Sales File ${salesFile._id} ${count}/${data.salesFiles.length}`);
    // Upload sales file
    const extension = await promisify(fileOpener.detectExtension)(salesFile.file);
    const filePath = `${salesFilesFolder}/${salesFile.originalId}${extension}`;
    salesFile.file = await promisify(fileManager.uploadToS3)(`testData/${salesFile._id}_${moment().format('x')}${extension}`, filePath);
    salesFile.clientId = clientId;
    await new SalesFile(salesFile).save();
  }
  // Transactions
  process.stdout.write('\n');
  count = 0;
  for (const transaction of data.transactions) {
    count += 1;
    process.stdout.write(`\rAdding Transaction ${transaction._id} ${count}/${data.transactions.length}`);
    transaction.clientId = clientId;
    await new Transaction(transaction).save();
  }
  // Companies
  process.stdout.write('\n');
  count = 0;
  for (const company of data.companies) {
    count += 1;
    process.stdout.write(`\rAdding Company ${company._id} ${count}/${data.companies.length}`);
    company.clientId = clientId;
    company.name = testUtils.randomString();
    await new Company(company).save();
  }
  // Accounting periods
  process.stdout.write('\n');
  count = 0;
  for (const accountingPeriod of data.accountingPeriods) {
    count += 1;
    process.stdout.write(`\rAdding Accounting Period ${accountingPeriod._id} ${count}/${data.accountingPeriods.length}`);
    accountingPeriod.clientId = clientId;
    await new AccountingPeriod(accountingPeriod).save();
  }
  // Contract Term Groups
  process.stdout.write('\n');
  count = 0;
  for (const contractTermGroup of data.contractTermGroups) {
    count += 1;
    process.stdout.write(`\rAdding Contract Term Group ${contractTermGroup._id} ${count}/${data.contractTermGroups.length}`);
    contractTermGroup.clientId = clientId;
    await new ContractTermGroup(contractTermGroup).save();
  }
  // Mcps Negatives
  process.stdout.write('\n');
  count = 0;
  for (const mcpsNegative of data.mcpsNegatives) {
    count += 1;
    process.stdout.write(`\rAdding Mcps Negative ${mcpsNegative._id} ${count}/${data.mcpsNegatives.length}`);
    mcpsNegative.clientId = clientId;
    await new McpsNegative(mcpsNegative).save();
  }
  // Mcps Retentions
  process.stdout.write('\n');
  count = 0;
  for (const mcpsRetention of data.mcpsRetentions) {
    count += 1;
    process.stdout.write(`\rAdding Mcps Retention ${mcpsRetention._id} ${count}/${data.mcpsRetentions.length}`);
    mcpsRetention.clientId = clientId;
    await new McpsRetention(mcpsRetention).save();
  }
  // Territory Groups
  process.stdout.write('\n');
  count = 0;
  for (const territoryGroup of data.territoryGroups) {
    count += 1;
    process.stdout.write(`\rAdding Territory Group ${territoryGroup._id} ${count}/${data.territoryGroups.length}`);
    territoryGroup.clientId = clientId;
    await new TerritoryGroup(territoryGroup).save();
  }
  // Reports
  process.stdout.write('\n');
  count = 0;
  for (const report of data.reports) {
    count += 1;
    process.stdout.write(`\rAdding Report ${report._id} ${count}/${data.reports.length}`);
    report.clientId = clientId;
    await new Report(report).save();
  }
  // Escalations
  process.stdout.write('\n');
  count = 0;
  for (const escalation of data.escalations) {
    count += 1;
    process.stdout.write(`\rAdding Escalation ${escalation._id} ${count}/${data.escalations.length}`);
    escalation.clientId = clientId;
    await new Escalation(escalation).save();
  }
  // Period
  process.stdout.write('\n');
  process.stdout.write(`\rAdding Period ${data.period._id}`);
  const period = new Period({
    _id: data.period._id,
    clientId,
    name: data.period.name,
    setupStage: data.period.setupStage,
    year: data.period.year,
    accountingPeriod: data.period.accountingPeriod,
    accountingPeriodType: data.period.accountingPeriodType,
    startDate: moment(data.period.startDate).format(),
    endDate: moment(data.period.endDate).format(),
    accountingDate: moment(data.period.accountingDate).format(),
    exchangeRates: data.period.exchangeRates,
    currencyExchangeRates: data.period.currencyExchangeRates,
    status: data.period.status,
    contractType: data.period.contractType,
    salesFilesIds: data.period.salesFilesIds,
    costIds: data.period.costIds,
    forceFull: true,
  });
  await period.save();
  process.stdout.write('\n');
  process.stdout.write('\rAdding App settings to the db');
  // App Settings,  we need to have clientId against the document to avoid it being deleted by the afterEach hooks. We need to use the mongoClient for this
  const url = 'mongodb://localhost:27017';
  const mongoClient = new MongoClient(url);
  await mongoClient.connect();
  await mongoClient.db('curve_test').collection('appsettings').insertOne({ clientId });
  process.stdout.write('\n');

  return period;
};

ProcessPeriod.randomiseIds = async (dataFile) => {
  let periodData = await fs.promises.readFile(dataFile, 'utf8');
  const data = JSON.parse(periodData);
  const IDs = [];
  const salesFileIDs = [];
  IDs.push(data.client._id.toString());
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
  for (const escalation of data.escalations) { IDs.push(escalation._id.toString()); }
  IDs.push(data.period._id.toString());

  periodData = JSON.stringify(data);

  for (let i = 0; i < IDs.length; i += 1) {
    const newID = testUtils.randomId();
    periodData = periodData.replaceAll(IDs[i], newID);
  }

  for (let i = 0; i < salesFileIDs.length; i += 1) {
    const id = salesFileIDs[i];
    const modifiedId = `${id.slice(0, 12)}===${id.slice(12)}`;
    periodData = periodData.replaceAll(modifiedId, id);
  }

  return periodData;
};

module.exprots = ProcessPeriod;
