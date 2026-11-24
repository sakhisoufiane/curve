process.env.NODE_ENV = 'test';

const { BigQuery, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const StatementHeadlineFigures = rewire('../../../libs/statementHeadlineFigures');

const bigQuery = new BigQuery(testUtils.bigQueryRandomParams());

describe('statementHeadlineFigures', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    sinon.stub(bigQuery, 'getAggregate');
    bigQuery.getAggregate.yields();

    sinon.stub(bigQuery, 'getMultiDistinct');
    bigQuery.getMultiDistinct.yields();

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('salesOutput', () => {
    let event;

    beforeEach((done) => {
      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
        salesOutputFilter: { output: 'filter' },
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(StatementHeadlineFigures.__get__('salesOutput')).to.exist;
      done();
    });

    it('should call bigQuery.getAggregate with the rights args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.outputTable;
      const expectedSelector = [
        { column: 'periodId', isSelector: true, isGroupBy: true },
        { column: 'contractId', isSelector: true, isGroupBy: true },
      ];
      const expectedSumColumns = [
        { column: 'units', displayAs: 'units' },
        { column: 'contractCurrencyNetAmount', displayAs: 'grossRevenue' },
        { column: 'contractCurrencyProRataAmount', displayAs: 'proRataGrossAmount' },
        { column: 'contractCurrencyCalculationOutput', displayAs: 'netPayout' },
        { column: 'contractCurrencyReserve', displayAs: 'reservesWithheld' },
        { column: 'contractCurrencyWithholdingTax', displayAs: 'withholdingTax' },
        { column: 'contractCurrencyMechanicalDeduction', displayAs: 'mechanicalDeduction' },
        { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
      ];
      const expectedCountColumn = 'lines';
      const expectedFilter = event.salesOutputFilter;
      const expectedOptions = {};
      // Act
      StatementHeadlineFigures.__get__('salesOutput')(event, (err) => {
        // Assert
        expect(bigQuery.getAggregate.called).to.be.true;
        expect(bigQuery.getAggregate.calledWith(
          expectedTable,
          expectedSelector,
          expectedSumColumns,
          expectedCountColumn,
          expectedFilter,
          expectedOptions,
        )).to.be.true;
        done(err);
      });
    });

    it('should call bigQuery.getMultiDistinct with the rights args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.outputTable;
      const expectedColumns = ['salesFileId', 'contractId'];
      const expectedFilter = event.outputFilter;
      // Act
      StatementHeadlineFigures.__get__('salesOutput')(event, (err) => {
        // Assert
        expect(bigQuery.getMultiDistinct.called).to.be.true;
        expect(bigQuery.getMultiDistinct.calledWith(
          expectedTable,
          expectedColumns,
          expectedFilter,
        )).to.be.true;
        done(err);
      });
    });

    describe('when bigQuery.getAggregate returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getAggregate.yields(expectedError);
        // Act
        StatementHeadlineFigures.__get__('salesOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getMultiDistinct returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getMultiDistinct.yields(expectedError);
        // Act
        StatementHeadlineFigures.__get__('salesOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when no errors are returned', () => {
      it('should return the result', (done) => {
        // Arrange
        const expectedAggregateResult = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];
        bigQuery.getAggregate.yields(null, expectedAggregateResult);
        const expectedDistinctResult = [testUtils.randomString(), testUtils.randomString()];
        bigQuery.getMultiDistinct.yields(null, expectedDistinctResult);
        // Act
        StatementHeadlineFigures.__get__('salesOutput')(event, (err, result) => {
          // Assert
          expect(result.salesOutputData).to.eq(expectedAggregateResult);
          expect(result.salesFileIds).to.eq(expectedDistinctResult);
          done(err);
        });
      });
    });
  });

  describe('costsOutput', () => {
    let event;

    beforeEach((done) => {
      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(StatementHeadlineFigures.__get__('costsOutput')).to.exist;
      done();
    });

    it('should call bigQuery.getAggregate with the rights args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.costsTable;
      const expectedSelector = [
        { column: 'periodId', isSelector: true, isGroupBy: true },
        { column: 'contractId', isSelector: true, isGroupBy: true },
      ];
      const expectedSumColumns = [
        { column: 'contractCurrencyAmount', displayAs: 'grossCosts' },
        { column: 'contractCurrencyCalculationOutput', displayAs: 'netCosts' },
      ];
      const expectedCountColumn = 'lines';
      const expectedFilter = event.outputFilter;
      const expectedOptions = {};
      // Act
      StatementHeadlineFigures.__get__('costsOutput')(event, (err) => {
        // Assert
        expect(bigQuery.getAggregate.called).to.be.true;
        expect(bigQuery.getAggregate.calledWith(
          expectedTable,
          expectedSelector,
          expectedSumColumns,
          expectedCountColumn,
          expectedFilter,
          expectedOptions,
        )).to.be.true;
        done(err);
      });
    });

    it('should call bigQuery.getMultiDistinct with the rights args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.costsTable;
      const expectedColumns = ['costId', 'contractId'];
      const expectedFilter = event.outputFilter;
      // Act
      StatementHeadlineFigures.__get__('costsOutput')(event, (err) => {
        // Assert
        expect(bigQuery.getMultiDistinct.called).to.be.true;
        expect(bigQuery.getMultiDistinct.calledWith(
          expectedTable,
          expectedColumns,
          expectedFilter,
        )).to.be.true;
        done(err);
      });
    });

    describe('when bigQuery.getAggregate returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getAggregate.yields(expectedError);
        // Act
        StatementHeadlineFigures.__get__('costsOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getMultiDistinct returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getMultiDistinct.yields(expectedError);
        // Act
        StatementHeadlineFigures.__get__('costsOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when no errors are returned', () => {
      it('should return the result', (done) => {
        // Arrange
        const expectedAggregateResult = [testUtils.randomString(), testUtils.randomString(), testUtils.randomString()];
        bigQuery.getAggregate.yields(null, expectedAggregateResult);
        const expectedDistinctResult = [testUtils.randomString(), testUtils.randomString()];
        bigQuery.getMultiDistinct.yields(null, expectedDistinctResult);
        // Act
        StatementHeadlineFigures.__get__('costsOutput')(event, (err, result) => {
          // Assert
          expect(result.costsOutputData).to.eq(expectedAggregateResult);
          expect(result.costIds).to.eq(expectedDistinctResult);
          done(err);
        });
      });
    });
  });

  describe('module.exports', () => {
    let event;
    beforeEach(() => {
      StatementHeadlineFigures.__set__('salesOutput', sinon.stub());
      StatementHeadlineFigures.__get__('salesOutput').yields(null, {
        salesOutputData: [],
        salesFileIds: [],
      });

      StatementHeadlineFigures.__set__('costsOutput', sinon.stub());
      StatementHeadlineFigures.__get__('costsOutput').yields(null, {
        costsOutputData: [],
        costIds: [],
      });

      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
      };
    });

    it('should call salesOutput with the rights args', (done) => {
      // Act
      StatementHeadlineFigures(event, (err) => {
        // Assert
        expect(StatementHeadlineFigures.__get__('salesOutput').called).to.be.true;
        expect(StatementHeadlineFigures.__get__('salesOutput').calledWith(event)).to.be.true;
        done(err);
      });
    });

    it('should call costsOutput with the rights args', (done) => {
      // Act
      StatementHeadlineFigures(event, (err) => {
        // Assert
        expect(StatementHeadlineFigures.__get__('costsOutput').called).to.be.true;
        expect(StatementHeadlineFigures.__get__('costsOutput').calledWith(event)).to.be.true;
        done(err);
      });
    });

    describe('when salesOutput returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        StatementHeadlineFigures.__get__('salesOutput').yields(expectedError);
        // Act
        StatementHeadlineFigures(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when costsOutput returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        StatementHeadlineFigures.__get__('costsOutput').yields(expectedError);
        // Act
        StatementHeadlineFigures(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when no errors are returned', () => {
      it('should return the result', (done) => {
        // Arrange
        const contractId = testUtils.randomId();
        const expectedSalesOutputResult = {
          salesOutputData: [
            {
              contractId,
              units: testUtils.randomFloat(),
              grossRevenue: testUtils.randomFloat(),
              netPayout: testUtils.randomFloat(),
              reservesWithheld: testUtils.randomFloat(),
              withholdingTax: testUtils.randomFloat(),
            },
          ],
          salesFileIds: [
            {
              contractId,
              salesFileId: testUtils.randomId(),
            },
          ],
        };
        StatementHeadlineFigures.__get__('salesOutput').yields(null, expectedSalesOutputResult);
        const expectedCostsOutputResult = {
          costsOutputData: [
            {
              contractId,
              grossCosts: testUtils.randomFloat(),
              netCosts: testUtils.randomFloat(),
            },
          ],
          costIds: [
            {
              contractId,
              costId: testUtils.randomId(),
            },
          ],
        };
        StatementHeadlineFigures.__get__('costsOutput').yields(null, expectedCostsOutputResult);
        // Act
        StatementHeadlineFigures(event, (err, result) => {
          // Assert
          // salesOutput.salesOutputData
          expect(result[expectedSalesOutputResult.salesOutputData[0].contractId]).to.not.be.null;
          expect(result[expectedSalesOutputResult.salesOutputData[0].contractId].units).to.eq(expectedSalesOutputResult.salesOutputData[0].units);
          expect(result[expectedSalesOutputResult.salesOutputData[0].contractId].grossAmount).to.eq(expectedSalesOutputResult.salesOutputData[0].grossRevenue);
          expect(result[expectedSalesOutputResult.salesOutputData[0].contractId].netAmount).to.eq(expectedSalesOutputResult.salesOutputData[0].netPayout);
          expect(result[expectedSalesOutputResult.salesOutputData[0].contractId].reservesWithheld).to.eq(expectedSalesOutputResult.salesOutputData[0].reservesWithheld);
          expect(result[expectedSalesOutputResult.salesOutputData[0].contractId].withholdingTax).to.eq(expectedSalesOutputResult.salesOutputData[0].withholdingTax);
          // salesOutput.salesFileIds
          expect(result[expectedSalesOutputResult.salesFileIds[0].contractId]).to.not.be.null;
          expect(result[expectedSalesOutputResult.salesFileIds[0].contractId].salesFilesIds).to.deep.eq([expectedSalesOutputResult.salesFileIds[0].salesFileId]);
          // costsOutput.costsOutputData
          expect(result[expectedCostsOutputResult.costsOutputData[0].contractId]).to.not.be.null;
          expect(result[expectedCostsOutputResult.costsOutputData[0].contractId].grossCosts).to.eq(expectedCostsOutputResult.costsOutputData[0].grossCosts);
          expect(result[expectedCostsOutputResult.costsOutputData[0].contractId].netCosts).to.eq(expectedCostsOutputResult.costsOutputData[0].netCosts);
          // costsOutput.costIds
          expect(result[expectedCostsOutputResult.costIds[0].contractId]).to.not.be.null;
          expect(result[expectedCostsOutputResult.costIds[0].contractId].costIds).to.deep.eq([expectedCostsOutputResult.costIds[0].costId]);

          // netOutput
          expect(result[contractId].netOutput).to.eq(result[contractId].netAmount - result[contractId].netCosts);

          done(err);
        });
      });
    });
  });
});
