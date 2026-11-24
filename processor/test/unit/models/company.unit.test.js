process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Company = require('../../../models/company');

describe('Period', () => {
  logger.info('>>>file>>>> unit/models/company .....................');

  let company;
  const fields = {
    clientId: testUtils.randomId(),
    name: testUtils.randomString(),
    foreignId: testUtils.randomString(),
    companyName: testUtils.randomString(),
    address: testUtils.randomString(),
    phone: testUtils.randomString(),
    email: testUtils.randomString(),
    statementCustomText: testUtils.randomString(),
    statementOfAccountCustomText: testUtils.randomString(),
    selfBillingTaxText: testUtils.randomString(),
    selfBillingTaxCustomText: testUtils.randomString(),
    vatNo: testUtils.randomString(),
    statementDesign: testUtils.randomString(),
    logo: testUtils.randomString(),
    publicLogo: testUtils.randomString(),
    salesReportTemplate: testUtils.randomString(),
    costsReportTemplate: testUtils.randomString(),
    statementIncludeTotalsRow: testUtils.randomBoolean(),
    suppressZeroValueInExport: testUtils.randomBoolean(),
    suppressStatementOfAccount: testUtils.randomBoolean(),
    displaySeparatedDeductions: testUtils.randomBoolean(),
    customDeductionName: testUtils.randomString(),
  };

  beforeEach(() => {
    company = new Company(fields);
  });

  it('should include company fields', () => {
    expect(company).to.deep.include(fields);
  });

  it('should default statementHeaderType to default to Standard', () => {
    expect(company.statementHeaderType).to.eq('Standard');
  });
});
