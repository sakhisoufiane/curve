const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { S3Client, CreateBucketCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { testUtils, BigQueryTestUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { LocalstackContainer } = require('@testcontainers/localstack');
const AccountingPeriod = require('../../models/accountingPeriod');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Statement = require('../../models/statement');
const Period = require('../../models/period');
const xeroLedger = require('./xeroLedger');
const Client = require('../../models/client');

const TEST_BUCKET = 'test-accounting-periods';
const TMP_DIR = path.join(require('app-root-dir').get(), 'tmp');

const bqTestUtils = new BigQueryTestUtils();
let bigQuery;
let s3Client;
let localstack;

function readAndDeleteCsv(apName, type) {
  const filePath = path.join(TMP_DIR, `Test AP ${type}.csv`);
  if (!fs.existsSync(filePath)) return null;
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        // eslint-disable-next-line no-irregular-whitespace
        mapHeaders: ({ header }) => header.replace(/^﻿/, ''), // Strip UTF-8 BOM
        mapValues: ({ value }) => (value === '' ? null : value),
      }))
      .on('data', (row) => rows.push(row))
      .on('end', () => { fs.unlinkSync(filePath); resolve(rows); })
      .on('error', reject);
  });
}

async function seedMongo({
  clientId,
  accountingPeriodAttrs = {},
  periodAttrs = {},
  contractAttrs = {},
  payeeAttrs = {},
  statementAttrs = {},
}) {
  const client = await new Client({
    _id: clientId,
    name: 'Test Client',
    accountingPeriodMappings: {
      distributionFees: [],
      distributionChannels: [],
      costs: [],
      ...accountingPeriodAttrs,
    },
  }).save();

  const period = await new Period({
    clientId,
    name: 'Test Period',
    grossAmount: 1000,
    netAmount: 900,
    grossCosts: 100,
    netCosts: 90,
    ...periodAttrs,
  }).save();

  const accountingPeriod = await new AccountingPeriod({
    clientId,
    periodId: period._id,
    name: 'Test AP',
    accountingDate: new Date('2024-03-31'),
    runNo: 0,
    status: 'Pending',
  }).save();

  const payee = await new Payee({
    clientId,
    name: 'Test Payee',
    foreignId: 'TP001',
    country: 'GB',
    ...payeeAttrs,
  }).save();

  const contract = await new Contract({
    clientId,
    name: 'Test Artist',
    foreignId: 'TA001',
    payees: [{ payeeId: payee._id.toString() }],
    active: true,
    contractType: 'Mechanical',
    currency: 'GBP',
    ...contractAttrs,
  }).save();

  await new Statement({
    clientId,
    periodId: period._id,
    contractId: contract._id,
    name: 'Test Artist',
    selfBillingInvoiceNo: 1001,
    feesInvoiceNo: 2001,
    netAmount: 800,
    ...statementAttrs,
  }).save();

  return { client, period, accountingPeriod, contractId: contract._id };
}

async function seedBigQuery({ periodId, contractId, sales = [], costs = [] }) {
  if (sales.length) {
    await bigQuery.client
      .dataset(bigQuery.datasetName)
      .table(bigQuery.outputTable)
      .insert(sales.map((s) => ({ periodId: periodId.toString(), contractId: contractId.toString(), ...s })));
  }
  if (costs.length) {
    await bigQuery.client
      .dataset(bigQuery.datasetName)
      .table(bigQuery.costsTable)
      .insert(costs.map((c) => ({ periodId: periodId.toString(), contractId: contractId.toString(), ...c })));
  }
}

function calculate(accountingPeriod, client) {
  return new Promise((resolve, reject) => {
    xeroLedger.calculate(AccountingPeriod, accountingPeriod, client, bigQuery, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

describe('xeroLedger.calculate', () => {
  let clientId;

  beforeAll(async () => {
    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();

    localstack = await new LocalstackContainer('localstack/localstack:3').start();
    s3Client = new S3Client({
      endpoint: localstack.getConnectionUri(),
      region: 'eu-west-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      forcePathStyle: true,
    });
    await s3Client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));

    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, localPath, callback) => {
      const body = fs.readFileSync(localPath);
      s3Client
        .send(new PutObjectCommand({ Bucket: TEST_BUCKET, Key: key, Body: body }))
        .then(() => fs.unlink(localPath, () => callback(null, key)))
        .catch(callback);
    });

    jest.spyOn(fileManager, 'deleteFromS3').mockImplementation((_key, callback) => callback(null));
  }, 180_000);

  beforeEach(() => {
    clientId = testUtils.randomId();
    xeroLedger.statements = {};
    xeroLedger.contracts = {};
    xeroLedger.payees = {};
  });

  afterEach(async () => {
    await new Promise((resolve, reject) => {
      testUtils.cleanUp(clientId, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  afterAll(async () => {
    await bqTestUtils.stopTestContainer();
    await localstack.stop();
    jest.restoreAllMocks();
  });

  describe('happy path', () => {
    it('produces correct purchases, sales, and transactions CSVs and marks the AccountingPeriod as Complete', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({ clientId });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Streaming', calculationInput: 500, calculationOutput: 450 }],
        costs: [{ type: 'DistFee', description: 'Distribution fee', amount: 50, calculationOutput: 50 }],
      });

      await calculate(accountingPeriod, client);

      const updated = await AccountingPeriod.findById(accountingPeriod._id);
      expect(updated.status).toBe('Complete');
      expect(updated.allCalculatedSalesCsv).toMatch(/^accountingPeriods\//);

      // Purchases CSV — one sales row (calculationInput - calculationOutput) + one costs row (calculationOutput)
      const purchases = await readAndDeleteCsv('Test AP', 'Purchases');
      expect(purchases).toHaveLength(2);

      const purchasesSalesRow = purchases[0];
      expect(purchasesSalesRow['*ContactName']).toBe("'Test Artist");
      expect(purchasesSalesRow['*InvoiceNumber']).toBe('2001');
      expect(purchasesSalesRow['*InvoiceDate']).toBe('31/03/2024');
      expect(purchasesSalesRow['*DueDate']).toBe('15/05/2024');
      expect(purchasesSalesRow['*Description']).toBe('March 24 Sales');
      expect(purchasesSalesRow['*Quantity']).toBe('1');
      expect(Number(purchasesSalesRow['*UnitAmount'])).toBe(50); // 500 - 450
      expect(purchasesSalesRow['*AccountCode']).toBe('Streaming');
      expect(purchasesSalesRow['*TaxType']).toBe('No VAT');

      const purchasesCostsRow = purchases[1];
      expect(purchasesCostsRow['*InvoiceNumber']).toBe('2001');
      expect(Number(purchasesCostsRow['*UnitAmount'])).toBe(50); // calculationOutput
      expect(purchasesCostsRow['*AccountCode']).toBe('DistFee');
      expect(purchasesCostsRow['*TaxType']).toBe('No VAT');

      // Sales CSV — one row per distribution channel using calculationInput
      const sales = await readAndDeleteCsv('Test AP', 'Sales');
      expect(sales).toHaveLength(1);

      const salesRow = sales[0];
      expect(salesRow['*ContactName']).toBe("'Test Artist");
      expect(salesRow['*InvoiceNumber']).toBe('1001');
      expect(salesRow['*InvoiceDate']).toBe('31/03/2024');
      expect(salesRow['*DueDate']).toBe('15/05/2024');
      expect(salesRow.Description).toBe('March 24 Sales');
      expect(salesRow['*Quantity']).toBe('1');
      expect(Number(salesRow['*UnitAmount'])).toBe(500); // calculationInput
      expect(salesRow['*AccountCode']).toBe('Streaming');
      expect(salesRow['*TaxType']).toBe('No VAT');

      // Transactions CSV — one row per cost line plus one ROYS row for statement.netAmount
      const transactions = await readAndDeleteCsv('Test AP', 'Transactions');
      expect(transactions).toHaveLength(2);

      const costsRow = transactions[0];
      expect(costsRow['Royalty Period']).toBe('03/2024');
      expect(costsRow['Royaltor Code']).toBe('TP001');
      expect(costsRow['Royaltor Name']).toBe('Test Payee');
      expect(costsRow['Contract Code']).toBe('TA001');
      expect(costsRow.Name).toBe('Test Artist');
      expect(costsRow['TransType Code']).toBe('DistFee');
      expect(costsRow['TransType Description']).toBe('DistFee');
      expect(costsRow.Description).toBe('Distribution fee');
      expect(Number(costsRow.Amount)).toBe(-50); // 0 - amount
      expect(costsRow['Recoup %']).toBe('100');
      expect(Number(costsRow['Recoup Amount'])).toBe(-50); // 0 - calculationOutput
      expect(costsRow['Currency Code']).toBe('£');

      const roysRow = transactions[1];
      expect(roysRow['TransType Code']).toBe('ROYS');
      expect(roysRow['TransType Description']).toBe('ROYALTY EARNINGS');
      expect(roysRow.Description).toBe('ROYALTY EARNINGS');
      expect(Number(roysRow.Amount)).toBe(800); // statement.netAmount
      expect(Number(roysRow['Recoup Amount'])).toBe(800);
      expect(roysRow['Currency Code']).toBe('£');
    });
  });

  describe('purchases CSV VAT wording', () => {
    it('uses "20% (VAT on Expenses)" for a GB payee with feesInvoiceTaxRate set', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        payeeAttrs: { country: 'GB', feesInvoiceTaxRate: 20 },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Streaming', calculationInput: 400, calculationOutput: 360 }],
        costs: [{ type: 'DistFee', description: 'Fee', amount: 40, calculationOutput: 40 }],
      });

      await calculate(accountingPeriod, client);

      const purchases = await readAndDeleteCsv('Test AP', 'Purchases');
      expect(purchases).toHaveLength(2);
      expect(purchases[0]['*TaxType']).toBe('20% (VAT on Expenses)');
      expect(purchases[1]['*TaxType']).toBe('20% (VAT on Expenses)');
    });

    it('uses "Reverse Charge Expenses (20%)" for a non-GB payee with vatNo', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        payeeAttrs: { country: 'DE', vatNo: 'DE123456789' },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Streaming', calculationInput: 400, calculationOutput: 360 }],
        costs: [{ type: 'DistFee', description: 'Fee', amount: 40, calculationOutput: 40 }],
      });

      await calculate(accountingPeriod, client);

      const purchases = await readAndDeleteCsv('Test AP', 'Purchases');
      expect(purchases).toHaveLength(2);
      expect(purchases[0]['*TaxType']).toBe('Reverse Charge Expenses (20%)');
      expect(purchases[1]['*TaxType']).toBe('Reverse Charge Expenses (20%)');
    });

    it('uses "No VAT" for a payee with no VAT configuration', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        payeeAttrs: { country: 'US' },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Streaming', calculationInput: 400, calculationOutput: 360 }],
        costs: [{ type: 'DistFee', description: 'Fee', amount: 40, calculationOutput: 40 }],
      });

      await calculate(accountingPeriod, client);

      const purchases = await readAndDeleteCsv('Test AP', 'Purchases');
      expect(purchases).toHaveLength(2);
      expect(purchases[0]['*TaxType']).toBe('No VAT');
      expect(purchases[1]['*TaxType']).toBe('No VAT');
    });
  });

  describe('sales CSV VAT wording', () => {
    it('uses "20% (VAT on Income)" for a GB payee with selfBillingTaxRate set', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        payeeAttrs: { country: 'GB', selfBillingTaxRate: 20 },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Download', calculationInput: 500, calculationOutput: 450 }],
        costs: [],
      });

      await calculate(accountingPeriod, client);

      const sales = await readAndDeleteCsv('Test AP', 'Sales');
      expect(sales).toHaveLength(1);
      expect(sales[0]['*AccountCode']).toBe('Download');
      expect(sales[0]['*TaxType']).toBe('20% (VAT on Income)');
    });

    it('uses "Zero Rated EC Services" for a non-GB payee with selfBillingTaxRate of 0', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        payeeAttrs: { country: 'DE', selfBillingTaxRate: 0 },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Download', calculationInput: 500, calculationOutput: 450 }],
        costs: [],
      });

      await calculate(accountingPeriod, client);

      const sales = await readAndDeleteCsv('Test AP', 'Sales');
      expect(sales).toHaveLength(1);
      expect(sales[0]['*AccountCode']).toBe('Download');
      expect(sales[0]['*TaxType']).toBe('Zero Rated EC Services');
    });
  });

  describe('reserves rows', () => {
    it('adds a reserves withheld row to sales and transactions CSVs', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        statementAttrs: { reservesWithheld: 100 },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Streaming', calculationInput: 800, calculationOutput: 700 }],
        costs: [],
      });

      await calculate(accountingPeriod, client);

      // Sales CSV: 1 distribution row + 1 reserves withheld row
      const sales = await readAndDeleteCsv('Test AP', 'Sales');
      expect(sales).toHaveLength(2);
      const reservesRow = sales[1];
      expect(Number(reservesRow['*UnitAmount'])).toBe(-100); // 0 - reservesWithheld
      expect(reservesRow['*AccountCode']).toBe('638');
      expect(reservesRow['*TaxType']).toBe('No VAT');

      // Transactions CSV: 1 RESE row + 1 ROYS row (no costs seeded)
      const transactions = await readAndDeleteCsv('Test AP', 'Transactions');
      expect(transactions).toHaveLength(2);
      const reseRow = transactions[0];
      expect(reseRow['TransType Code']).toBe('RESE');
      expect(reseRow['TransType Description']).toBe('RESERVES HELD');
      expect(Number(reseRow.Amount)).toBe(-100); // 0 - reservesWithheld
      expect(Number(reseRow['Recoup Amount'])).toBe(-100);
    });

    it('adds a reserves released row to sales and transactions CSVs', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        statementAttrs: { reservesReleased: 75 },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'Streaming', calculationInput: 800, calculationOutput: 700 }],
        costs: [],
      });

      await calculate(accountingPeriod, client);

      // Sales CSV: 1 distribution row + 1 reserves released row
      const sales = await readAndDeleteCsv('Test AP', 'Sales');
      expect(sales).toHaveLength(2);
      const reservesRow = sales[1];
      expect(Number(reservesRow['*UnitAmount'])).toBe(75); // reservesReleased
      expect(reservesRow['*AccountCode']).toBe('638');
      expect(reservesRow['*TaxType']).toBe('No VAT');

      // Transactions CSV: 1 RELE row + 1 ROYS row
      const transactions = await readAndDeleteCsv('Test AP', 'Transactions');
      expect(transactions).toHaveLength(2);
      const releRow = transactions[0];
      expect(releRow['TransType Code']).toBe('RELE');
      expect(releRow['TransType Description']).toBe('RESERVES RELEASED');
      expect(Number(releRow.Amount)).toBe(75); // reservesReleased
      expect(Number(releRow['Recoup Amount'])).toBe(75);
    });
  });

  describe('distribution channel mapping', () => {
    it('maps raw distributionChannel values to configured codes in the sales CSV', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        accountingPeriodAttrs: { distributionChannels: [{ from: 'RAW_CHANNEL', to: 'MAPPED_CODE' }] },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'RAW_CHANNEL', calculationInput: 400, calculationOutput: 360 }],
        costs: [],
      });

      await calculate(accountingPeriod, client);

      const sales = await readAndDeleteCsv('Test AP', 'Sales');
      expect(sales).toHaveLength(1);
      expect(sales[0]['*AccountCode']).toBe('MAPPED_CODE');
    });

    it('maps distributionFees values to configured codes in the purchases CSV', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        accountingPeriodAttrs: { distributionFees: [{ from: 'RAW_FEE', to: 'MAPPED_FEE_CODE' }] },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [{ distributionChannel: 'RAW_FEE', calculationInput: 400, calculationOutput: 360 }],
        costs: [],
      });

      await calculate(accountingPeriod, client);

      const purchases = await readAndDeleteCsv('Test AP', 'Purchases');
      expect(purchases).toHaveLength(1);
      expect(purchases[0]['*AccountCode']).toBe('MAPPED_FEE_CODE');
    });

    it('maps cost types to configured codes in the purchases CSV', async () => {
      const { client, period, accountingPeriod, contractId } = await seedMongo({
        clientId,
        accountingPeriodAttrs: { costs: [{ from: 'RAW_COST', to: 'MAPPED_COST_CODE' }] },
      });
      await seedBigQuery({
        periodId: period._id,
        contractId,
        sales: [],
        costs: [{ type: 'RAW_COST', description: 'Cost', amount: 30, calculationOutput: 30 }],
      });

      await calculate(accountingPeriod, client);

      const purchases = await readAndDeleteCsv('Test AP', 'Purchases');
      expect(purchases).toHaveLength(1);
      expect(purchases[0]['*AccountCode']).toBe('MAPPED_COST_CODE');
    });
  });

  describe('error handling', () => {
    it('sets calculationStatus to errored when the linked Period does not exist', async () => {
      const accountingPeriod = await new AccountingPeriod({
        clientId,
        periodId: testUtils.randomId(),
        name: 'Test AP',
        accountingDate: new Date('2024-03-31'),
        runNo: 0,
        status: 'Pending',
      }).save();

      const client = await new Client({ clientId, name: 'Test Client' }).save();

      await calculate(accountingPeriod, client);

      const updated = await AccountingPeriod.findById(accountingPeriod._id);
      expect(updated.calculationStatus).toBe('Errored In Getting Accounting Period Data');
    });
  });
});
