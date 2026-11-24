process.env.NODE_ENV = 'test';
const { randomString, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const _ = require('lodash');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

describe('standardStatement', () => {
  let StandardStatement;
  let params;
  let distChan;
  let filepath;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    StandardStatement = rewire('../../../../libs/statements/standardPdf/libs/standardStatement');

    StandardStatement.__set__('headerRow', sinon.stub());
    StandardStatement.__set__('mapIncomes', sinon.stub());

    distChan = randomString();
    filepath = `/tmp/${randomString()}.pdf`;

    params = {
      periodType: randomString(),
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
      analysis: {
        net: {
          configurationByDistributionChannel: [
            { distributionChannel: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() },
          ],
          distributionChannels: [
            { distributionChannel: randomString(), type: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() },
          ],
          releases: [
            { units: randomInt(), type: randomString(), title: randomString(), value: randomInt() },
          ],
        },
        gross: {
          configurationByDistributionChannel: [
            { distributionChannel: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() },
          ],
          distributionChannels: [
            { distributionChannel: randomString(), type: distChan, configuration: randomString(), value: randomInt(), deduction: randomInt() },
          ],
        },
      },
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

  describe('When the statement design is Distribution', () => {
    let statement;
    let headerRowStub;

    beforeEach((done) => {
      params.statementDesign = 'Distribution';
      statement = new StandardStatement(params);
      headerRowStub = sinon.stub(statement, 'headerRow');
      done();
    });

    it('should include the Distribution Channel name and total', (done) => {
      // Arrange
      // Calculate totals of distribution channels
      const grossValues = params.analysis.gross.distributionChannels?.filter((channel) => {
        const netChannel = params.analysis.net.distributionChannels?.find((netChannel) => netChannel?.type === channel?.type);
        if (netChannel?.value) { return channel; }
      });
      // Act
      statement.create(filepath, () => {
        // Assert
        expect(headerRowStub.args[0][0]).to.equal(distChan);
        // Channel total is equal to the channel value
        const channel = grossValues.find((chan) => chan.type === distChan);
        expect(headerRowStub.args[0][1]).to.equal(channel.value);
        done();
      });
    });

    describe('When Display Separated Deductions is enabled', () => {
      let statement;
      let headerRowStub;

      beforeEach((done) => {
        params.displaySeparatedDeductions = true;
        statement = new StandardStatement(params);
        headerRowStub = sinon.stub(statement, 'headerRow');
        done();
      });

      it('should display the correct Gross Revenue in the Total Income section', (done) => {
        // Act
        statement.create(filepath, () => {
          // Assert
          // Total Income value should equal Gross - Deductions
          expect(headerRowStub.args[2][1]).to.equal(params.grossAmount - params.deductionAmount);
          done();
        });
      });

      it('should include the contract deduction term as a Deduction row', (done) => {
        // Act
        statement.create(filepath, () => {
          // Assert
          expect(headerRowStub.args[1][0]).to.equal(params.customDeductionName);
          expect(headerRowStub.args[1][1]).to.equal(params.deductionAmount);
          done();
        });
      });

      it('should include the Distribution Channel name and total', (done) => {
        // Arrange
        // Calculate totals of distribution channels
        const grossValues = params.analysis.gross.distributionChannels?.filter((channel) => {
          const netChannel = params.analysis.net.distributionChannels?.find((netChannel) => netChannel?.type === channel?.type);
          if (netChannel?.value) { return channel; }
        });
        // Act
        statement.create(filepath, () => {
          // Assert
          expect(headerRowStub.args[0][0]).to.equal(distChan);
          // Channel total is equal to the channel value
          const channel = grossValues.find((chan) => chan.type === distChan);
          expect(headerRowStub.args[0][1]).to.equal(channel.value);
          done();
        });
      });
    });

    describe('When Display Separated Deductions is disabled', () => {
      let statement;
      let headerRowStub;

      beforeEach((done) => {
        statement = new StandardStatement(params);
        headerRowStub = sinon.stub(statement, 'headerRow');
        done();
      });

      it('should display the Gross Amount as the Total Income', (done) => {
        // Act
        statement.create(filepath, () => {
          // Assert
          expect(headerRowStub.args[1][1]).to.equal(params.grossAmount);
          done();
        });
      });

      it('should not include a deduction row', (done) => {
        // Act
        statement.create(filepath, () => {
          // Assert
          // Should only include the distribution channel, total income and total costs rows
          expect(headerRowStub.args.length).to.equal(3);
          expect(headerRowStub.args[0][0]).to.equal(distChan);
          expect(headerRowStub.args[1][0]).to.equal('TOTAL INCOME');
          expect(headerRowStub.args[2][0]).to.equal('TOTAL COSTS');
          done();
        });
      });

      it('should include the Distribution Channel name and total', (done) => {
        // Arrange
        // Calculate totals of distribution channels
        const grossValues = params.analysis.gross.distributionChannels?.filter((channel) => {
          const netChannel = params.analysis.net.distributionChannels?.find((netChannel) => netChannel?.type === channel?.type);
          if (netChannel?.value) { return channel; }
        });
        // Act
        statement.create(filepath, () => {
          // Assert
          expect(headerRowStub.args[0][0]).to.equal(distChan);
          // Channel total is equal to the channel value
          const channel = grossValues.find((chan) => chan.type === distChan);
          expect(headerRowStub.args[0][1]).to.equal(channel.value);
          done();
        });
      });
    });
  });
});
