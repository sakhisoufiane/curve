const { logger, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, cleanUpAsync } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Client = require('../../../../models/client');
const Contract = require('../../../../models/contract');
const Period = require('../../../../models/period');
const Track = require('../../../../models/track');
const SalesFile = require('../../../../models/salesFile');

const CalculateSales = require('./calculateSales');

const bqTestUtils = new BigQueryTestUtils();

jest.mock('../batch', () => ({
  mainProcessRunBatches: jest.fn().mockImplementation((...args) => args[args.length - 1]()),
}));

jest.mock('../../../sqs', () => ({
  sendMessage: jest.fn().mockImplementation((...args) => args[args.length - 1]()),
}));

// @TODO: Can we not simply mock BigQuery here rather than using a containerised version?
describe('Calculate Sales Integration Tests', function () {
  logger.debug('\n\n**** lib/calculation/period/calculateSales/calculateSales.integration.test.js');

  let client; let trackWithTerms; let object;
  let trackWithoutTerms; let contractWithTerms;
  let contractWithoutTerms; let salesFile; let period;
  let db; let bigQuery; let mainQuery; let contractFindSpy;

  beforeAll(async () => {
    await bqTestUtils.init();
  });
  beforeEach(async () => {
    // Setup BigQuery
    bigQuery = await bqTestUtils.getBigQuery();
    jest.spyOn(bigQuery, 'writeFileToDb').mockImplementation((callback) => callback(null));
    jest.spyOn(bigQuery, 'getSize').mockImplementation((callback) => callback(null, 100));

    // Set up Client
    client = new Client({ name: randomString(), periodCostsDatabaseTable: 'costs' });
    client.bigQueryDataset = bigQuery.datasetName;
    client.bigQuerySalesTable = bigQuery.inputTable;
    client.bigQueryPeriodSales = bigQuery.outputTable;
    client.bigQueryPeriodCosts = bigQuery.costsTable;
    client.createdBigQueryTables = true;
    await client.save();

    // Set up Mechanical Contract WITH terms
    contractWithTerms = new Contract({
      clientId: client._id.toString(),
      contractType: 'Mechanical',
      partitionNo: 12,
      name: 'MECH TEST - TERMS',
      active: true,
      currency: 'Home Currency',
      type: 'Royalty',
      profitSharePercentage: 0,
      accountingPeriod: 'Yearly',
      mechanicalContractTerms: [{
        catType: 'All',
        catalogueGroup: 'All',
        territory: 'WW',
        channel: 'All',
        configuration: 'All',
        priceCategory: 'All',
        source: 'All',
        escalationTrackers: [],
        type: 'Statutory Rate',
        rateBasis: 'US',
        rate: 5,
        escalations: [],
      }],
      reserveBasis: 'Post-Calculation',
    });
    await contractWithTerms.save();

    // Set up Mechanical Contract WITHOUT terms
    contractWithoutTerms = new Contract({
      clientId: client._id.toString(),
      contractType: 'Mechanical',
      partitionNo: 13, // different partition number
      name: 'MECH TEST - NO TERMS',
      active: true,
      currency: 'Home Currency',
      type: 'Royalty',
      profitSharePercentage: 0,
      accountingPeriod: 'Yearly',
      mechanicalContractTerms: [], // No sales terms
      reserveBasis: 'Post-Calculation',
    });
    await contractWithoutTerms.save();

    // Set up Track linked to Mechanical Contract with terms
    trackWithTerms = new Track({
      clientId: client._id.toString(),
      title: 'TRACK WITH TERMS - TITLE',
      artist: 'TRACK WITH TERMS - ARTIST',
      isrc: 'TRACK WITH TERMS - ISRC',
      salesReturnsRights: [{ contractId: randomId(), percentage: 100, _id: randomId() }],
      costsRights: [{ contractId: randomId(), percentage: 100, _id: randomId() }],
      mechanicalLicenses: [{ composerId: null, publisherId: null, contractId: contractWithTerms._id.toString(), licenseNo: '', rate: '100', share: '100' }],
      mechanicalContractIds: [contractWithTerms._id.toString()],
      reportMechanicals: true,
      totalParticipation: 100,
      valid: true,
    });
    await trackWithTerms.save();

    // Set up Track linked to Mechanical Contract without terms
    trackWithoutTerms = new Track({
      clientId: client._id.toString(),
      title: 'TRACK WITHOUT TERMS - TITLE',
      artist: 'TRACK WITHOUT TERMS - ARTIST',
      isrc: 'TRACK WITHOUT TERMS - ISRC',
      salesReturnsRights: [],
      costsRights: [],
      mechanicalLicenses: [],
      mechanicalContractIds: [contractWithoutTerms._id.toString()],
      reportMechanicals: false,
      totalParticipation: 0,
      valid: true,
    });
    await trackWithoutTerms.save();

    // Set up Sales
    salesFile = new SalesFile({
      clientId: client._id.toString(),
      name: randomString(),
      fileType: 'Standard',
      reportedStatus: 'Complete',
      archived: false,
      viewed: true,
      status: 'Complete',
      partitionNo: 57,
      grossAmount: 200,
      homeCurrencyGrossAmount: 200,
      homeCurrencyNetAmount: 200,
      invalidLines: 0,
      lines: 2,
      netAmount: 200,
      units: 20,
      valid: true,
      validationLines: 2,
      validationNetAmount: 200,
      validationUnits: 20,
    });
    await salesFile.save();

    // Set up Period
    period = new Period({
      clientId: client._id.toString(),
      name: randomString(),
      year: 2024,
      accountingPeriod: 'Y1',
      accountingPeriodType: 'Yearly',
      contractType: 'Mechanical',
      salesFilesIds: [salesFile._id.toString()],
      currencyExchangeRates: [{ from: 'GBP', to: 'GBP', rate: 1 }, { from: 'GBP', to: 'Home Currency', rate: 1 }],
    });
    await period.save();

    // Set query objects
    object = { periodId: period._id.toString(), periodType: 'Mechanical', runType: 'main' };
    mainQuery = { salesFileId: { $in: period.salesFilesIds }, $or: [] };

    // Set bigQuery Output File
    await new Promise((resolve, reject) => {
      bigQuery.setupFile((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    contractFindSpy = jest.spyOn(Contract, 'find');
  });

  afterEach(async () => {
    await cleanUpAsync(client._id.toString());
  });

  afterAll(async () => {
    await bqTestUtils.stopTestContainer();
  });

  describe('runContractSalesCalculations', () => {
    it('should filter out Contracts when running a Mechanical period and there are Mechanical Contracts with no Mechanical Terms', async () => {
      await new Promise((resolve) => {
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => resolve());
      });

      const filterToInspect = contractFindSpy.mock.calls[0][0];
      expect(filterToInspect).toHaveProperty('clientId', period.clientId);
      expect(filterToInspect).toHaveProperty('contractType', 'Mechanical');
      expect(filterToInspect).toHaveProperty('mechanicalContractTerms');
      expect(filterToInspect.mechanicalContractTerms).toEqual({ $ne: [] });
    });

    it('should include these Contracts when running a Mechanical period and there are Mechanical Contracts with Mechanical Terms', async () => {
      await new Promise((resolve) => {
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, async () => resolve());
      });

      expect(contractFindSpy).toHaveBeenCalledTimes(1);

      const filterUsedInFind = contractFindSpy.mock.calls[0][0];
      expect(filterUsedInFind).toHaveProperty('clientId', period.clientId);
      expect(filterUsedInFind).toHaveProperty('active', true);
      expect(filterUsedInFind).toHaveProperty('accountingPeriod', period.accountingPeriodType);
      expect(filterUsedInFind).toHaveProperty('contractType', 'Mechanical');
      expect(filterUsedInFind).toHaveProperty('mechanicalContractTerms');
      expect(filterUsedInFind.mechanicalContractTerms).toEqual({ $ne: [] });

      const contractsReturnedFromFind = await Contract.find(filterUsedInFind).exec();
      expect(Array.isArray(contractsReturnedFromFind)).toBe(true);
      expect(contractsReturnedFromFind).toHaveLength(1);
      const returnedContractIds = contractsReturnedFromFind.map((contract) => contract._id.toString());
      expect(returnedContractIds).toContain(contractWithTerms._id.toString());
      expect(returnedContractIds).not.toContain(contractWithoutTerms._id.toString());
    });
  });
});
