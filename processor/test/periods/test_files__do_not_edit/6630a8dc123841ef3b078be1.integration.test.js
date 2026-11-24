const periodId = '6630a8dc123841ef3b078be1';
/* eslint-disable guard-for-in */
/* eslint-disable no-undef */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
process.env.NODE_ENV = 'test';
process.env.DB_PROTOCOL = 'mongodb://';
process.env.DB_URL = 'localhost';
process.env.DB_NAME = 'curve_test';
require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const ProcessPeriod = require('../utils/processPeriod');

logger.info('\n\n**** .test/periods/periods.integration.test');

describe('Period', function () {
  // Set timeout to 60 minutes
  this.timeout(60 * 60 * 1000);

  let clientId;
  before((done) => {
    clientId = testUtils.randomId();
    testUtils.cleanUp(clientId, done);
  });

  afterEach((done) => {
    testUtils.cleanUp(clientId, done);
  });

  after((done) => {
    testUtils.cleanUp(clientId, done);
  });

  // Process each period individually
  describe(`Running integration tests for Period ${periodId}`, async () => {
    it('Should run the period and return the expected result', async () => {
      // Arrange
      const periodFilePath = `${appRootDir}/test/periods/data/${periodId}/${periodId}.json`;
      const periodSalesFilesPath = `${appRootDir}/test/periods/data/${periodId}/salesFiles`;
      // Act
      const { originalData, period, statements, recalculatedStatements, transactions, recalculatedTransactions } = await ProcessPeriod.process({ clientId, periodData: periodFilePath, salesFilesFolder: periodSalesFilesPath });
      logger.info(JSON.stringify({ period, statements, recalculatedStatements, transactions, recalculatedTransactions }));
      // Assert
      // Compare period data
      const originalPeriod = originalData.period;
      expect(originalPeriod.name).to.eq(period.name);
      expect(originalPeriod.contractType).to.eq(period.contractType);
      expect(originalPeriod.salesFilesIds).to.deep.eq(period.salesFilesIds);
      expect(originalPeriod.costIds).to.deep.eq(period.costIds);
      expect(originalPeriod.year).to.eq(period.year);
      expect(originalPeriod.accountingPeriod).to.eq(period.accountingPeriod);
      expect(originalPeriod.accountingPeriodType).to.eq(period.accountingPeriodType);
      expect(moment(originalPeriod.startDate).format()).to.eq(moment(period.startDate).format());
      expect(moment(originalPeriod.endDate).format()).to.eq(moment(period.endDate).format());
      expect(moment(originalPeriod.accountingDate).format()).to.eq(moment(period.accountingDate).format());
      expect(parseInt(originalPeriod.grossAmount)).to.eq(parseInt(period.grossAmount));
      expect(parseInt(originalPeriod.grossCosts)).to.eq(parseInt(period.grossCosts));
      expect(originalPeriod.lines).to.eq(period.lines);
      expect(parseInt(originalPeriod.netAmount)).to.eq(parseInt(period.netAmount));
      expect(parseInt(originalPeriod.netCosts)).to.eq(parseInt(period.netCosts));
      expect(originalPeriod.units).to.eq(period.units);
      expect(originalPeriod.currencyExchangeRates).to.deep.eq(JSON.parse(JSON.stringify(period.currencyExchangeRates)));
      // compare analysis fields
      originalPeriod.analysis = sortAnalysisObject(originalPeriod.analysis);
      period.analysis = sortAnalysisObject(period.analysis);
      logger.debug('Original Period Analysis');
      logger.debug(JSON.stringify(originalPeriod.analysis));
      logger.debug('Recalculated Period Analysis');
      logger.debug(JSON.stringify(period.analysis));

      for (const category in originalPeriod.analysis.gross) {
        for (item of originalPeriod.analysis.gross[category]) {
          const index = originalPeriod.analysis.gross[category].indexOf(item);
          const originalItem = originalPeriod.analysis.gross[category][index];
          const recalculationItem = period.analysis.gross[category][index];
          // allow a tolerance of 1
          const difference = originalItem.value - recalculationItem.value;
          expect(difference).to.be.lessThan(2);
        }
      }

      for (const category in originalPeriod.analysis.net) {
        for (item of originalPeriod.analysis.net[category]) {
          const index = originalPeriod.analysis.net[category].indexOf(item);
          const originalItem = originalPeriod.analysis.net[category][index];
          const recalculationItem = period.analysis.net[category][index];
          // allow a tolerance of 1
          const difference = originalItem.value - recalculationItem.value;
          expect(difference).to.be.lessThan(2);
        }
      }

      // Compare data of period generated statements
      const originalStatements = originalData.statements;
      statements.forEach((statement) => {
        logger.info('Statement:', statement._id);
        const originalStatement = findMatchingStatement(statement, originalStatements);
        logger.debug(`Comparing statement ${statement.name} to original statement ${originalStatement.name}`);
        logger.debug('Original Statement:');
        logger.debug(JSON.stringify(originalStatement));
        logger.debug('Calculated Statement:');
        logger.debug(JSON.stringify(statement));
        expect(originalStatement.name).to.eq(statement.name);
        expect(originalStatement.year).to.eq(statement.year);
        expect(originalStatement.accountingPeriod).to.eq(statement.accountingPeriod);
        expect(moment(originalStatement.date).format()).to.eq(moment(statement.date).format());
        expect(originalStatement.periodType).to.eq(statement.periodType);
        expect(originalStatement.currency).to.eq(statement.currency);
        expect(originalStatement.salesFilesIds.sort()).to.deep.eq(statement.salesFilesIds.sort());
        expect(originalStatement.costIds).to.deep.eq(statement.costIds);
        expect(originalStatement.releaseIds).to.deep.eq(statement.releaseIds);
        expect(originalStatement.trackIds).to.deep.eq(statement.trackIds);
        expect(originalStatement.workIds).to.deep.eq(statement.workIds);
        expect(parseInt(originalStatement.openingBalance)).to.eq(parseInt(statement.openingBalance));
        expect(originalStatement.units).to.eq(statement.units);
        expect(parseInt(originalStatement.grossAmount)).to.eq(parseInt(statement.grossAmount));
        expect(parseInt(originalStatement.proRataGrossAmount)).to.eq(parseInt(statement.proRataGrossAmount));
        expect(parseInt(originalStatement.netAmount)).to.eq(parseInt(statement.netAmount));
        expect(parseInt(originalStatement.grossCosts)).to.eq(parseInt(statement.grossCosts));
        expect(parseInt(originalStatement.netCosts)).to.eq(parseInt(statement.netCosts));
        expect(parseInt(originalStatement.reservesWithheld)).to.eq(parseInt(statement.reservesWithheld));
        expect(parseInt(originalStatement.reservesReleased)).to.eq(parseInt(statement.reservesReleased));
        expect(parseInt(originalStatement.taxBasis)).to.eq(parseInt(statement.taxBasis));
        expect(parseInt(originalStatement.withholdingTax)).to.eq(parseInt(statement.withholdingTax));
        expect(parseInt(originalStatement.netOutput)).to.eq(parseInt(statement.netOutput));
        expect(parseInt(originalStatement.closingBalance)).to.eq(parseInt(statement.closingBalance));
        expect(originalStatement.lines).to.eq(statement.lines);
        expect(originalStatement.invalidLines).to.eq(statement.invalidLines);
        expect(originalStatement.profitShareRate).to.eq(statement.profitShareRate);
        expect(parseInt(originalStatement.profitShareBalance)).to.eq(parseInt(statement.profitShareBalance));
        expect(parseInt(originalStatement.profitShareNetAmount)).to.eq(parseInt(statement.profitShareNetAmount));
        // expect(parseInt(originalStatement.profitShareUnrecoupedAdvanceStart)).to.eq(parseInt(statement.profitShareUnrecoupedAdvanceStart));
        expect(parseInt(originalStatement.profitShareAdvanceRecouped)).to.eq(parseInt(statement.profitShareAdvanceRecouped));
        expect(parseInt(originalStatement.otherTransactions)).to.eq(parseInt(statement.otherTransactions));
        expect(parseInt(originalStatement.payments)).to.eq(parseInt(statement.payments));
        expect(originalStatement.selfBillingTaxRate).to.eq(statement.selfBillingTaxRate);
        expect(parseInt(originalStatement.selfBillingTaxAmount)).to.eq(parseInt(statement.selfBillingTaxAmount));
        expect(originalStatement.feesInvoiceTaxRate).to.eq(statement.feesInvoiceTaxRate);
        expect(parseInt(originalStatement.feesInvoiceTaxAmount)).to.eq(parseInt(statement.feesInvoiceTaxAmount));
        expect(originalStatement.autoPaymentNotTriggeredReason).to.eq(statement.autoPaymentNotTriggeredReason);
        expect(originalStatement.autoPaymentTriggered).to.eq(statement.autoPaymentTriggered);
        if (!originalStatement.analysis || !statement.analysis) {
          expect(originalStatement.analysis).to.deep.eq(statement.analysis);
        } else {
          // compare analysis fields
          originalStatement.analysis = sortAnalysisObject(originalStatement.analysis);
          statement.analysis = sortAnalysisObject(statement.analysis);
          logger.debug('Original Statement:');
          logger.debug(originalStatement);
          logger.debug('Calculated Statement:');
          logger.debug(statement);
          for (const category in originalStatement.analysis.gross) {
            for (item of originalStatement.analysis.gross[category]) {
              const index = originalStatement.analysis.gross[category].indexOf(item);
              const originalItem = originalStatement.analysis.gross[category][index];
              const recalculationItem = statement.analysis.gross[category][index];
              // allow a tolerance of 1
              const difference = originalItem.value - recalculationItem.value;
              expect(difference).to.be.lessThan(2);
            }
          }
          for (const category in originalStatement.analysis.net) {
            for (item of originalStatement.analysis.net[category]) {
              const index = originalStatement.analysis.net[category].indexOf(item);
              const originalItem = originalStatement.analysis.net[category][index];
              const recalculationItem = statement.analysis.net[category][index];
              // allow a tolerance of 1
              const difference = originalItem.value - recalculationItem.value;
              expect(difference).to.be.lessThan(2);
            }
          }
        }
      });
      // Compare data of recalculated statements
      recalculatedStatements.forEach((statement) => {
        logger.info('Statement:', statement._id);
        const originalStatement = findMatchingStatement(statement, originalStatements);
        logger.debug(`Comparing recalculated statement ${statement.name} to original statement ${originalStatement.name}`);
        logger.debug('Original Statement:');
        logger.debug(JSON.stringify(originalStatement));
        logger.debug('Recalculated Statement:');
        logger.debug(JSON.stringify(statement));
        expect(originalStatement.name).to.eq(statement.name);
        expect(originalStatement.year).to.eq(statement.year);
        expect(originalStatement.accountingPeriod).to.eq(statement.accountingPeriod);
        expect(moment(originalStatement.date).format()).to.eq(moment(statement.date).format());
        expect(originalStatement.periodType).to.eq(statement.periodType);
        expect(originalStatement.currency).to.eq(statement.currency);
        expect(originalStatement.salesFilesIds.sort()).to.deep.eq(statement.salesFilesIds.sort());
        expect(originalStatement.costIds).to.deep.eq(statement.costIds);
        expect(originalStatement.releaseIds).to.deep.eq(statement.releaseIds);
        expect(originalStatement.trackIds).to.deep.eq(statement.trackIds);
        expect(originalStatement.workIds).to.deep.eq(statement.workIds);
        expect(parseInt(originalStatement.proRataGrossAmount)).to.eq(parseInt(statement.proRataGrossAmount));
        expect(parseInt(originalStatement.taxBasis)).to.eq(parseInt(statement.taxBasis));
        expect(originalStatement.invalidLines).to.eq(statement.invalidLines);
        expect(originalStatement.selfBillingTaxRate).to.eq(statement.selfBillingTaxRate);
        expect(parseInt(originalStatement.selfBillingTaxAmount)).to.eq(parseInt(statement.selfBillingTaxAmount));
        expect(originalStatement.feesInvoiceTaxRate).to.eq(statement.feesInvoiceTaxRate);
        expect(parseInt(originalStatement.feesInvoiceTaxAmount)).to.eq(parseInt(statement.feesInvoiceTaxAmount));
        expect(originalStatement.autoPaymentNotTriggeredReason).to.eq(statement.autoPaymentNotTriggeredReason);
        expect(originalStatement.autoPaymentTriggered).to.eq(statement.autoPaymentTriggered);
        expect(originalStatement.units).to.eq(statement.units);
        expect(parseInt(originalStatement.grossAmount)).to.eq(parseInt(statement.grossAmount));
        expect(parseInt(originalStatement.netAmount)).to.eq(parseInt(statement.netAmount));
        expect(parseInt(originalStatement.grossCosts)).to.eq(parseInt(statement.grossCosts));
        expect(parseInt(originalStatement.netCosts)).to.eq(parseInt(statement.netCosts));
        expect(parseInt(originalStatement.reservesWithheld)).to.eq(parseInt(statement.reservesWithheld));
        expect(parseInt(originalStatement.reservesReleased)).to.eq(parseInt(statement.reservesReleased));
        expect(parseInt(originalStatement.netOutput)).to.eq(parseInt(statement.netOutput));
        expect(parseInt(originalStatement.closingBalance)).to.eq(parseInt(statement.closingBalance));
        // Doesn't seem like we're setting the lines total this when the statemenet is generated by the period
        // expect(originalStatement.lines).to.eq(statement.lines);
        expect(originalStatement.profitShareRate).to.eq(statement.profitShareRate);
        // Due to the way how we clear statements, we may end up with a null value if the fields had a 0 value before calculation
        if (!originalStatement.openingBalance) { expect([0, null].includes(statement.openingBalance)).to.be.true; } else { expect(parseInt(originalStatement.openingBalance)).to.eq(parseInt(statement.openingBalance)); }
        if (!originalStatement.profitShareBalance) { expect([0, null].includes(statement.profitShareBalance)).to.be.true; } else { expect(parseInt(originalStatement.profitShareBalance)).to.eq(parseInt(statement.profitShareBalance)); }
        if (!originalStatement.profitShareNetAmount) { expect([0, null].includes(statement.profitShareNetAmount)).to.be.true; } else { expect(parseInt(originalStatement.profitShareNetAmount)).to.eq(parseInt(statement.profitShareNetAmount)); }
        // if (!originalStatement.profitShareUnrecoupedAdvanceStart) { expect([0, null].includes(statement.profitShareUnrecoupedAdvanceStart)).to.be.true; } else { expect(parseInt(originalStatement.profitShareUnrecoupedAdvanceStart)).to.eq(parseInt(statement.profitShareUnrecoupedAdvanceStart)); }
        if (!originalStatement.profitShareAdvanceRecouped) { expect([0, null].includes(statement.profitShareAdvanceRecouped)).to.be.true; } else { expect(parseInt(originalStatement.profitShareAdvanceRecouped)).to.eq(parseInt(statement.profitShareAdvanceRecouped)); }
        if (!originalStatement.otherTransactions) { expect([0, null].includes(statement.otherTransactions)).to.be.true; } else { expect(parseInt(originalStatement.otherTransactions)).to.eq(parseInt(statement.otherTransactions)); }
        if (!originalStatement.payments) { expect([0, null].includes(statement.payments)).to.be.true; } else { expect(parseInt(originalStatement.payments)).to.eq(parseInt(statement.payments)); }
        if (!originalStatement.withholdingTax) { expect([0, null].includes(statement.withholdingTax)).to.be.true; } else { expect(parseInt(originalStatement.withholdingTax)).to.eq(parseInt(statement.withholdingTax)); }
        // We need to delete empty array from the recalculated statement analysis
        if (originalStatement.analysis?.gross) { for (const field in originalStatement.analysis.gross) { if (originalStatement.analysis.gross[field].length === 0) delete originalStatement.analysis.gross[field]; } }
        if (originalStatement.analysis?.net) {
          for (const field in originalStatement.analysis.net) {
            if (originalStatement.analysis.net[field].length === 0) delete originalStatement.analysis.net[field];
            else {
              // We're not adding proRataGrossAmount on the period calculation to the analysis net, we need to ignore it on the recalculated statement
              originalStatement.analysis.net[field].forEach((item) => { for (const key in item) { if (key === 'proRataGrossAmount') delete item[key]; } });
            }
          }
        }
        if (statement.analysis?.gross) { for (const field in statement.analysis.gross) { if (statement.analysis.gross[field].length === 0) delete statement.analysis.gross[field]; } }
        if (statement.analysis?.net) {
          for (const field in statement.analysis.net) {
            if (statement.analysis.net[field].length === 0) delete statement.analysis.net[field];
            else {
              // We're not adding proRataGrossAmount on the period calculation to the analysis net, we need to ignore it on the recalculated statement
              statement.analysis.net[field].forEach((item) => { for (const key in item) { if (key === 'proRataGrossAmount') delete item[key]; } });
            }
          }
        }
        if (!originalStatement.analysis?.gross) { expect(statement.analysis.gross).to.deep.eq({}); }
        if (!originalStatement.analysis?.net) { expect(statement.analysis.net).to.deep.eq({}); }
        if (originalStatement.analysis?.gross && originalStatement.analysis?.net) {
          // compare analysis fields
          originalStatement.analysis = sortAnalysisObject(originalStatement.analysis);
          statement.analysis = sortAnalysisObject(statement.analysis);
          logger.debug('Original Statement:');
          logger.debug(originalStatement);
          logger.debug('Recalculated Statement:');
          logger.debug(statement);
          for (const category in originalStatement.analysis.gross) {
            for (item of originalStatement.analysis.gross[category]) {
              const index = originalStatement.analysis.gross[category].indexOf(item);
              const originalItem = originalStatement.analysis.gross[category][index];
              const recalculationItem = statement.analysis.gross[category][index];
              // allow a tolerance of 1
              const difference = originalItem.value - recalculationItem.value;
              expect(difference).to.be.lessThan(2);
            }
          }
          for (const category in originalStatement.analysis.net) {
            for (item of originalStatement.analysis.net[category]) {
              const index = originalStatement.analysis.net[category].indexOf(item);
              const originalItem = originalStatement.analysis.net[category][index];
              const recalculationItem = statement.analysis.net[category][index];
              // allow a tolerance of 1
              const difference = originalItem.value - recalculationItem.value;
              expect(difference).to.be.lessThan(2);
            }
          }
        }
      });
    });
  });
});

const findMatchingStatement = (statement, originalStatements) => {
  let matchingStatement;
  originalStatements.forEach((originalStatement) => {
    if (originalStatement.contractId === statement.contractId) matchingStatement = originalStatement;
  });
  return matchingStatement;
};

const sortAnalysisObject = (analysis) => {
  if (!analysis) return;

  const result = {};

  sortSingleAnalysisObject(analysis, result, 'gross');
  sortSingleAnalysisObject(analysis, result, 'net');

  return result;
};

const sortSingleAnalysisObject = (analysis, result, object) => {
  if (analysis[object]) {
    result[object] = {};
    const fields = Object.keys(analysis[object]).sort();
    fields.forEach((field) => {
      analysis[object][field].forEach((subfield) => {
        for (const key in subfield) {
          if (typeof subfield[key] === 'number') {
            subfield[key] = parseFloat(parseInt(subfield[key]));
          }
        }
      });
      result[object][field] = analysis[object][field].sort(sortArrayOfObjects);
    });
  }
};

const sortArrayOfObjects = (a, b) => {
  if (a.type < b.type) { return -1; }
  if (a.type > b.type) { return 1; }
  if (a.value < b.value) { return -1; }
  if (a.value > b.value) { return 1; }
  if (a.units < b.units) { return -1; }
  if (a.units > b.units) { return 1; }
  if (a.configuration < b.configuration) { return -1; }
  if (a.configuration > b.configuration) { return 1; }

  return 0;
};
