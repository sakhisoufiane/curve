const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/statements/standardPdf/libs/standardStatement.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Statement = require('../../../../../../libs/statements/standardPdf/libs/statementCreator');

describe('standardStatement', () => {
  let StandardStatement; let params; let distChan;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    StandardStatement = rewire('../../../../../../libs/statements/standardPdf/libs/standardStatement');

    StandardStatement.__set__('headerRow', sinon.stub());
    StandardStatement.__set__('mapIncomes', sinon.stub());

    distChan = randomString();

    params = { periodType: randomString(),
      db: randomString(),
      salesTable: randomString(),
      costsTable: randomString(),
      dbFilter: randomString(),
      statementType: randomString(),
      statementDesign: randomString(),
      logo: null,
      companyName: randomString(),
      address: randomString(),
      year: randomString(),
      date: randomDate(),
      startDate: randomDate(),
      accountingPeriod: randomString(),
      periodName: randomString(),
      contractName: randomString(),
      contractType: randomString(),
      analysis: { net: { configurationByDistributionChannel: [{ distributionChannel: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() }],
        distributionChannels: [{ distributionChannel: randomString(), type: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() }],
        releases: [{ units: randomInt(), type: randomString(), title: randomString(), value: randomInt() }] } },
      clientType: randomString(),
      suppressZeroValue: false,
      currencySymbol: '',
      dateFormat: 'DD/MM/YYYY',
      homeCurrency: randomString(),
      grossAmount: randomInt(),
      netAmount: randomInt(),
      grossCosts: randomInt(),
      netCosts: randomInt(),
      netOutput: randomInt(),
      reservesWithheld: randomInt(),
      reservesReleased: randomInt(),
      offsetColour: '#707070',
      contactEmail: randomString(),
      customText: randomString(),
      removeFooterImage: false,
      standardRate: randomInt(),
      standardBalance: randomInt(),
      standardNetAmount: randomInt(),
      standardUnrecoupedAdvanceStart: randomInt(),
      standardAdvanceRecouped: randomInt(),
      proRataGrossAmount: randomInt(),
      feesInvoiceTaxAmount: randomInt(),
      payments: false,
      otherTransactions: false,
      currentBalance: randomInt(),
      runNo: randomInt(),
      openingBalance: randomInt(),
      closingBalance: randomInt(),
      transactionalClosingBalance: randomInt(),
      transactions: randomString(),
      salesData: randomString(),
      salesTemplate: randomString(),
      costsTemplate: randomString(),
      bigQuery: randomString(),
      salesTerms: randomString(),
      statementHeaderType: randomString(),
      payeeName: randomString(),
      payeeAddress: randomString(),
      payeeCountry: randomString(),
      withholdingTax: true,
      totalTransactions: 0,
      deductionAmount: randomInt(),
      displaySeparatedDeductions: false,
      customDeductionName: randomString(),
      inTrial: true,
    };

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });
  describe('When displaySeparatedDeductions is false', () => {
    it('should not add the deduction row', (done) => {
      // Arrange
      params.displaySeparatedDeductions = false;
      // Act
      const standardStatement = new StandardStatement(params);
      const headerRowStub = sinon.stub(standardStatement, 'headerRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(headerRowStub.calledWith(params.customDeductionName, params.deductionAmount, params.offsetColour, true)).to.be.false;
        done();
      });
    });
    it('should not add the deduction total for the distribution channels', (done) => {
      // Arrange
      params.displaySeparatedDeductions = false;
      // Act
      const standardStatement = new StandardStatement(params);
      const headerRowStub = sinon.stub(standardStatement, 'headerRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(headerRowStub.calledWith(params.analysis.net.distributionChannels[0].type, params.analysis.net.distributionChannels[0].value)).to.be.true;
        done();
      });
    });
    it('should not add the deduction to the distribution channels detail rows', (done) => {
      // Arrange
      params.displaySeparatedDeductions = false;
      // Act
      const standardStatement = new StandardStatement(params);
      const detailRowStub = sinon.stub(standardStatement, 'detailRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(detailRowStub.calledWith(standardStatement.configurationsByDistributionChannel[Object.keys(standardStatement.configurationsByDistributionChannel)[0]][0].type, standardStatement.configurationsByDistributionChannel[Object.keys(standardStatement.configurationsByDistributionChannel)[0]][0].value)).to.be.true;
        done();
      });
    });
    it('should not add the deduction to the top items', (done) => {
      // Arrange
      params.displaySeparatedDeductions = false;
      params.statementDesign = 'Catalogue Summary';
      // Act
      const standardStatement = new StandardStatement(params);
      const catalogueDetailRowStub = sinon.stub(standardStatement, 'catalogueDetailRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(catalogueDetailRowStub.calledWith(`${params.analysis.net.releases[0].type}: ${params.analysis.net.releases[0].title}`, params.analysis.net.releases[0].units, params.analysis.net.releases[0].value)).to.be.true;
        done();
      });
    });
    it('should not add the deduction to the royalty details total', (done) => {
      // Arrange
      params.displaySeparatedDeductions = false;
      params.statementDesign = 'Extended';
      // Act
      const standardStatement = new StandardStatement(params);
      standardStatement.salesData = null;
      const catalogueItemHeaderRowStub = sinon.stub(standardStatement, 'catalogueItemHeaderRow').yields();
      const getExtendedDataFromDbStub = sinon.stub(standardStatement, 'getExtendedDataFromDb').yields();
      const getExtendedCostDataStub = sinon.stub(standardStatement, 'getExtendedCostData').yields();
      const groupDataStub = sinon.stub(standardStatement, 'groupData').returns(
        { releases: { 1234: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          tracks: { 12345: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          works: { 123456: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          workTitles: { title1: '123456' },
          contracts: { 1234567: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
        },
      );
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(catalogueItemHeaderRowStub.calledWith(standardStatement.salesData.releases['1234'], standardStatement.salesData.releases['1234'][0].contractCurrencyCalculationOutput)).to.be.true;
        done();
      });
    });
    it('should not add the deduction to the royalty details detail row', (done) => {
      // Arrange
      params.displaySeparatedDeductions = false;
      params.statementDesign = 'Extended';
      // Act
      const standardStatement = new StandardStatement(params);
      standardStatement.salesData = null;
      const catalogueItemHeaderRowStub = sinon.stub(standardStatement, 'catalogueItemHeaderRow').yields();
      const getExtendedDataFromDbStub = sinon.stub(standardStatement, 'getExtendedDataFromDb').yields();
      const getExtendedCostDataStub = sinon.stub(standardStatement, 'getExtendedCostData').yields();
      const valueToStructuredNumberStub = sinon.stub(standardStatement, 'valueToStructuredNumber');
      const groupDataStub = sinon.stub(standardStatement, 'groupData').returns(
        { releases: { 1234: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          tracks: { 12345: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          works: { 123456: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          workTitles: { title1: '123456' },
          contracts: { 1234567: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
        },
      );
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(valueToStructuredNumberStub.calledWith(standardStatement.salesData.releases['1234'][0].contractCurrencyCalculationOutput, 4, 4)).to.be.true;
        done();
      });
    });
  });
  describe('When displaySeparatedDeductions is true', () => {
    it('should add the deduction row', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      params.customDeductionName = null;
      // Act
      const standardStatement = new StandardStatement(params);
      const headerRowStub = sinon.stub(standardStatement, 'headerRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(headerRowStub.called).to.be.true;
        done();
      });
    });
    it('should set the deduction text to customDeductionName when it\'s set against the statement', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      // Act
      const standardStatement = new StandardStatement(params);
      const headerRowStub = sinon.stub(standardStatement, 'headerRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(headerRowStub.calledWith(params.customDeductionName, params.deductionAmount, params.offsetColour, true)).to.be.true;
        done();
      });
    });
    it('should set the deduction text to \'Deduction\' when customDeductionName is not set against the statement', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      params.customDeductionName = null;
      // Act
      const standardStatement = new StandardStatement(params);
      const headerRowStub = sinon.stub(standardStatement, 'headerRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(headerRowStub.calledWith('Deduction', params.deductionAmount, params.offsetColour, true)).to.be.true;
        done();
      });
    });
    it('should add the deduction total for the distribution channels', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      // Act
      const standardStatement = new StandardStatement(params);
      const headerRowStub = sinon.stub(standardStatement, 'headerRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(headerRowStub.calledWith(params.analysis.net.distributionChannels[0].type, params.analysis.net.distributionChannels[0].value + params.analysis.net.distributionChannels[0].deduction)).to.be.true;
        done();
      });
    });
    it('should add the deduction to the distribution channels detail rows', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      // Act
      const standardStatement = new StandardStatement(params);
      const detailRowStub = sinon.stub(standardStatement, 'detailRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(detailRowStub.calledWith(standardStatement.configurationsByDistributionChannel[Object.keys(standardStatement.configurationsByDistributionChannel)[0]][0].type, standardStatement.configurationsByDistributionChannel[Object.keys(standardStatement.configurationsByDistributionChannel)[0]][0].value + standardStatement.configurationsByDistributionChannel[Object.keys(standardStatement.configurationsByDistributionChannel)[0]][0].deduction)).to.be.true;
        done();
      });
    });
    it('should add the deduction to the top items', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      params.statementDesign = 'Catalogue Summary';
      // Act
      const standardStatement = new StandardStatement(params);
      const catalogueDetailRowStub = sinon.stub(standardStatement, 'catalogueDetailRow');
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        // console.log(headerRowStub.getCalls());
        expect(catalogueDetailRowStub.calledWith(`${params.analysis.net.releases[0].type}: ${params.analysis.net.releases[0].title}`, params.analysis.net.releases[0].units, params.analysis.net.releases[0].value + params.analysis.net.releases[0].deduction)).to.be.true;
        done();
      });
    });
    it('should add the deduction to the royalty details total', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      params.statementDesign = 'Extended';
      // Act
      const standardStatement = new StandardStatement(params);
      standardStatement.salesData = null;
      const catalogueItemHeaderRowStub = sinon.stub(standardStatement, 'catalogueItemHeaderRow').yields();
      const getExtendedDataFromDbStub = sinon.stub(standardStatement, 'getExtendedDataFromDb').yields();
      const getExtendedCostDataStub = sinon.stub(standardStatement, 'getExtendedCostData').yields();
      const groupDataStub = sinon.stub(standardStatement, 'groupData').returns(
        { releases: { 1234: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          tracks: { 12345: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          works: { 123456: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          workTitles: { title1: '123456' },
          contracts: { 1234567: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
        },
      );
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(catalogueItemHeaderRowStub.calledWith(standardStatement.salesData.releases['1234'], standardStatement.salesData.releases['1234'][0].contractCurrencyCalculationOutput + standardStatement.salesData.releases['1234'][0].contractCurrencyDeduction)).to.be.true;
        done();
      });
    });
    it('should add the deduction to the royalty details detail row', (done) => {
      // Arrange
      params.displaySeparatedDeductions = true;
      params.statementDesign = 'Extended';
      // Act
      const standardStatement = new StandardStatement(params);
      standardStatement.salesData = null;
      const catalogueItemHeaderRowStub = sinon.stub(standardStatement, 'catalogueItemHeaderRow').yields();
      const getExtendedDataFromDbStub = sinon.stub(standardStatement, 'getExtendedDataFromDb').yields();
      const getExtendedCostDataStub = sinon.stub(standardStatement, 'getExtendedCostData').yields();
      const valueToStructuredNumberStub = sinon.stub(standardStatement, 'valueToStructuredNumber');
      const groupDataStub = sinon.stub(standardStatement, 'groupData').returns(
        { releases: { 1234: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          tracks: { 12345: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          works: { 123456: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
          workTitles: { title1: '123456' },
          contracts: { 1234567: [{ contractCurrencyCalculationOutput: randomInt(), contractCurrencyDeduction: randomInt() }] },
        },
      );
      // Assert
      standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
        expect(valueToStructuredNumberStub.calledWith(standardStatement.salesData.releases['1234'][0].contractCurrencyCalculationOutput + standardStatement.salesData.releases['1234'][0].contractCurrencyDeduction, 4, 4)).to.be.true;
        done();
      });
    });
    describe('When Statement Design is set to Distribution', () => {
      it('should subtract the deduction total from the gross amount for the total income', (done) => {
        // Arrange
        params.displaySeparatedDeductions = true;
        params.customDeductionName = null;
        params.statementDesign = 'Distribution';
        params.analysis.gross = {
          configurationByDistributionChannel: [
            { distributionChannel: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() },
          ],
          distributionChannels: [
            { distributionChannel: randomString(), type: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() },
          ],
        };
        // Act
        const standardStatement = new StandardStatement(params);
        const headerRowStub = sinon.stub(standardStatement, 'headerRow');
        // Assert
        standardStatement.create(`/tmp/${randomString()}.pdf`, () => {
          // Total Income value should equal Gross - Deductions
          expect(headerRowStub.args[2][1]).to.equal(params.grossAmount - params.deductionAmount);
          done();
        });
      });
    });
  });
});
