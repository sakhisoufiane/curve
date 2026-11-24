const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('./libs/standardSelfBilling');

const event = {
  s3WriteKey: 'statements/5ab52d4a1e878f0b3cf1c780/2017 - H2: The Prodigy - Take me to the hospital - SUMMARY ACCOUNT Statement of Account.pdf',
  logo: 'tmp/Logo.jpg',
  accessKey: 'AKIAJ4P3SJWE4DPV7XHA',
  secretAccessKey: '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',
  region: 'eu-west-1',
  bucket: 'curve-royalties-production',
  address: 'Cooking Vinyl Ltd.\n12-13 Swainson Road\nActon\nLondon\nUK\nW3 7XB',
  vatNo: 'GB98765532',
  year: 2017,
  accountingPeriod: 'H2',
  periodName: 'H217',
  contractName: 'The Prodigy - Take me to the hospital - SUMMARY ACCOUNT',
  date: '2017-12-31T00:00:00.000Z',
  homeCurrency: 'GBP',
  currencySymbol: '€',
  payeeName: 'Some Artist',
  payeeAddress: 'Loxley Cottage\nTalbot Road\nHawkhurst\nKent\nTN18 4LX',
  payeeVatNo: 'GB12345678',
  selfBillingTaxText: 'VAT',
  selfBillingTaxAmount: 123.45,
  selfBillingTaxRate: 20,
  selfBillingInvoiceNo: 150,
  withholdingTaxAmount: 0,
  withholdingTaxRate: 0,
  customText: 'The VAT shown is your output tax due to HMRC',
  runNo: 321,
  closingBalance: 21399.768330397048,
};

const statement = new Statement(event);
statement.create('test.pdf', (fileLocation) => {
  logger.debug(fileLocation);
});
