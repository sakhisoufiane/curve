/* eslint-disable no-await-in-loop */
// Period ID to copy
const periodIds = ['6842e345d6229f4f86c2d629', '67dbfeb48998b93459c81dcc', '67d7f8b4217bc92eb2bd4be6', '677bf0b24223882f27bfcd38', '62ea632d7c0cb685c81f17f2', '62ea648a51e56e948a21a922', '62ea6a1e40cbc51cdcc97208', '62ea6af640cbc51cdcc97a34', '62eadfe020c7bad68bc463de', '6630a8dc123841ef3b078be1', '664cd47d106ca242935ab141', '663c835cf33c125f58bd4b77', '6639cd31c20d4ca2fc4122c6', '663c839af33c125f58bd4e1e', '663cccd4f33c125f58be1d1c', '6641ba6051232d8d2a6b300e', '664481d098475cf3c378a2ef', '664317371123e5804c60058c', '6737a0442a561384719189a6'];

require('../../../models/db');
const { logger, fileManager, fileOpener } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const { promisify } = require('util');
const appRootDir = require('app-root-dir').get();

const bucket = process.env.S3_bucket;

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

const copyPeriodData = async (periodId) => {
  // Get Period
  logger.debug('Getting period data');
  const period = await Period.findById(periodId);
  if (!period) throw Error('No period found for the supplied ID');

  // Create period data folder
  const periodFolder = `${appRootDir}/test/periods/data/${period._id.toString()}`;
  if (!fs.existsSync(periodFolder)) { fs.mkdirSync(periodFolder); }
  // Create salesfile folder
  const salesFilesFolder = `${periodFolder}/salesFiles`;
  if (!fs.existsSync(salesFilesFolder)) { fs.mkdirSync(salesFilesFolder); }
  // Create period data file
  const file = `${periodFolder}/${period._id.toString()}.json`;
  await fs.promises.writeFile(file, '{');

  // add period to file
  await addObjectToFile(file, 'period', period, true);

  // get client data
  logger.debug('Getting client data');
  const client = await Client.findById(period.clientId);
  if (!client) throw Error('No client found for the supplied period');
  const clientWithoutTables = client.toObject();
  clientWithoutTables.createdBigQueryTables = false;
  delete clientWithoutTables.bigQueryDataset;
  delete clientWithoutTables.bigQuerySalesTable;
  delete clientWithoutTables.bigQueryPeriodSales;
  delete clientWithoutTables.bigQueryAccountingPeriodSales;
  delete clientWithoutTables.bigQueryPeriodCosts;
  await addObjectToFile(file, 'client', clientWithoutTables);

  // get contracts data
  logger.debug('Getting contracts data');
  const contracts = await Contract.find({ clientId: period.clientId });
  await addObjectToFile(file, 'contracts', contracts);

  // get payees data
  logger.debug('Getting payees data');
  const payees = await Payee.find({ clientId: period.clientId });
  await addObjectToFile(file, 'payees', payees);

  // get releases data
  logger.debug('Getting releases data');
  const releases = await Release.find({ clientId: period.clientId });
  await addObjectToFile(file, 'releases', releases);

  // get tracks data
  logger.debug('Getting tracks data');
  const tracks = await Track.find({ clientId: period.clientId });
  await addObjectToFile(file, 'tracks', tracks);

  // get works data
  logger.debug('Getting works data');
  const works = await Work.find({ clientId: period.clientId });
  await addObjectToFile(file, 'works', works);

  // get composers data
  logger.debug('Getting composers data');
  const composers = await Composer.find({ clientId: period.clientId });
  await addObjectToFile(file, 'composers', composers);

  // get publishers data
  logger.debug('Getting publishers data');
  const publishers = await Publisher.find({ clientId: period.clientId });
  await addObjectToFile(file, 'publishers', publishers);

  // get salesTemplates data
  logger.debug('Getting sales templates data');
  const salesTemplates = await SalesTemplate.find({ clientId: period.clientId });
  await addObjectToFile(file, 'salesTemplates', salesTemplates);

  // get statements data
  logger.debug('Getting statements data');
  const statements = await Statement.find({ clientId: period.clientId, periodId: period._id.toString() });
  await addObjectToFile(file, 'statements', statements);

  // get costs data
  logger.debug('Getting costs data');
  const costs = await Cost.find({ clientId: period.clientId, _id: { $in: period.costIds } });
  await addObjectToFile(file, 'costs', costs);

  // get salesFiles data
  logger.debug('Getting sales files data');
  const salesFiles = await SalesFile.find({ clientId: period.clientId, _id: { $in: period.salesFilesIds } });
  await addObjectToFile(file, 'salesFiles', salesFiles);
  // Download sales files
  for (const salesFile of salesFiles) {
    const localFile = await promisify(fileManager.downloadFromS3)(salesFile.file, bucket);
    const extension = await promisify(fileOpener.detectExtension)(localFile);
    await fs.promises.copyFile(localFile, `${salesFilesFolder}/${salesFile._id.toString()}${extension}`);
  }
  // get transactions
  logger.debug('Getting transactions');
  const contractIds = contracts.map((contract) => contract._id.toString());
  const statementIds = statements.map((statement) => statement._id.toString());
  // Don't get transactions that are part of this period, otherwise we'll end up with duplicate transactions
  const transactions = await Transaction.find({ clientId: period.clientId, contractId: { $in: contractIds }, statementId: { $nin: statementIds } });
  await addObjectToFile(file, 'transactions', transactions);

  // get accounting periods
  logger.debug('Getting accounting periods');
  const accountingPeriods = await AccountingPeriod.find({ clientId: period.clientId });
  await addObjectToFile(file, 'accountingPeriods', accountingPeriods);

  // get companies
  logger.debug('Getting companies');
  const companies = await Company.find({ clientId: period.clientId });
  await addObjectToFile(file, 'companies', companies);

  // get contract term groups
  logger.debug('Getting contract term groups');
  const contractTermGroups = await ContractTermGroup.find({ clientId: period.clientId });
  await addObjectToFile(file, 'contractTermGroups', contractTermGroups);

  // get Mcps negatives
  logger.debug('Getting Mcps negatives');
  const mcpsNegatives = await McpsNegative.find({ clientId: period.clientId });
  await addObjectToFile(file, 'mcpsNegatives', mcpsNegatives);

  // get Mcps rententions
  logger.debug('Getting Mcps retentions');
  const mcpsRetentions = await McpsRetention.find({ clientId: period.clientId });
  await addObjectToFile(file, 'mcpsRetentions', mcpsRetentions);

  // get territory groups
  logger.debug('Getting territory groups');
  const territoryGroups = await TerritoryGroup.find({ clientId: period.clientId });
  await addObjectToFile(file, 'territoryGroups', territoryGroups);

  // get reports
  logger.debug('Getting reports');
  const reports = await Report.find({ clientId: period.clientId });
  await addObjectToFile(file, 'reports', reports);

  // get escalations
  logger.debug('Getting escalations');
  const escalations = await Escalation.find({ clientId: period.clientId });
  await addObjectToFile(file, 'escalations', escalations);

  // Close file
  await fs.promises.appendFile(file, '\r}');
};

const addObjectToFile = async (file, objectName, object, isFirstObject) => {
  if (!isFirstObject) await fs.promises.appendFile(file, ',');
  await fs.promises.appendFile(file, `\r"${objectName}": ${JSON.stringify(object)}`);
};

const runScript = async () => {
  for (const periodId of periodIds) {
    await copyPeriodData(periodId);
  }
  logger.debug('Done copying period data.');
  process.exit(-1);
};

runScript();
