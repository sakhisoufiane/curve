process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');

const Period = require('../../../models/period');
const Client = require('../../../models/client');

describe('Period', () => {
  logger.info('>>>file>>>> unit/models/period .....................');

  let period;
  const periodFields = {
    clientId: testUtils.randomId(),
    name: testUtils.randomString(),
    setupStage: testUtils.randomString(),
    year: testUtils.randomInt(),
    accountingPeriod: testUtils.randomString(),
    accountingPeriodType: testUtils.randomString(),
    startDate: testUtils.randomJsDate(),
    endDate: testUtils.randomJsDate(),
    accountingDate: testUtils.randomJsDate(),
    forceFull: false,
    recalculation: {},
    calculationLog: testUtils.randomArray(),
    exchangeRates: {},
    currencyExchangeRates: [],
    status: testUtils.randomString(),
    contractType: testUtils.randomString(),
    calculationStatus: testUtils.randomString(),
    processStartTime: testUtils.randomJsDate(),
    processEndTime: testUtils.randomJsDate(),
    salesFilesIds: [],
    costIds: [],
    totalContractsForCalculation: testUtils.randomInt(),
    units: testUtils.randomInt(),
    grossAmount: testUtils.randomInt(),
    netAmount: testUtils.randomInt(),
    grossCosts: testUtils.randomInt(),
    netCosts: testUtils.randomInt(),
    lines: testUtils.randomInt(),
    valid: false,
    invalidLines: testUtils.randomInt(),
    completedCatalogueItems: 0,
    allCalculatedSalesCsv: testUtils.randomString(),
    allCalculatedSalesCsvPublicLink: testUtils.randomString(),
    allCalculatedCostsCsv: testUtils.randomString(),
    allCalculatedCostsCsvPublicLink: testUtils.randomString(),
    unreportedSalesCsv: testUtils.randomString(),
    unreportedSalesCsvPublicLink: testUtils.randomString(),
    unreportedCostsCsv: testUtils.randomString(),
    unreportedCostsCsvPublicLink: testUtils.randomString(),
    suspenseCsv: testUtils.randomString(),
    suspenseCsvPublicLink: testUtils.randomString(),
    generalLedgerSummary: testUtils.randomString(),
    generalLedgerSummaryPublicLink: testUtils.randomString(),
    customStatement: testUtils.randomString(),
    customStatementPublicLink: testUtils.randomString(),
    statementsZip: testUtils.randomString(),
    statementsZipPublicLink: testUtils.randomString(),
    escalationStartingFigures: [],
    runNo: 0,
    sqsBatchQueue: testUtils.randomString(),
  };

  beforeEach(async () => {
    period = new Period(periodFields);
    await period.save();
  });

  afterEach(() => {
    testUtils.cleanUp;
    // sinon.restore();
  });

  it('should include period fields', () => {
    expect(period).to.deep.include(periodFields);
  });

  it('should default fuga blockedStatus to false', () => {
    expect(period.fuga.blockedStatus).to.eq(false);
  });

  it('should set fuga blockedStatus to true', async () => {
    const period = new Period({ ...periodFields, fuga: { blockedStatus: true } });
    await period.save();
    expect(period.fuga.blockedStatus).to.eq(true);
  });
});
