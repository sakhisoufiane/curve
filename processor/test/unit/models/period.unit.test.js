process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('../../../models/period');

describe('Period', () => {
  logger.info('>>>file>>>> unit/models/Period .....................');

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
    salesPartitionNos: [],
    costIds: [],
    usedContractIds: [],
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
    completedCostCatalogueItems: 0,
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

  beforeEach(() => {
    period = new Period(periodFields);
  });

  it('should include period fields', () => {
    expect(period).to.deep.include(periodFields);
  });

  it('should default fuga blockedStatus to false', () => {
    expect(period.fuga.blockedStatus).to.eq(false);
  });

  it('should set fuga blockedStatus to true', () => {
    const period = new Period({ ...periodFields, fuga: { blockedStatus: true } });
    expect(period.fuga.blockedStatus).to.eq(true);
  });
});
