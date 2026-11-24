process.env.NODE_ENV = 'test';

const { BigQuery, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const PeriodHeadlineFigures = rewire('../../../libs/periodHeadlineFigures');

const bigQuery = new BigQuery(testUtils.bigQueryRandomParams());

describe('PeriodHeadlineFigures', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
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

  describe('salesInput', () => {
    let event;

    beforeEach((done) => {
      sinon.stub(bigQuery, 'getSalesInputAggregate');
      bigQuery.getSalesInputAggregate.yields();

      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
        salesOutputFilter: { salesOutput: 'filter' },
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodHeadlineFigures.__get__('salesInput')).to.exist;
      done();
    });

    it('should call bigQuery.getSalesInputAggregate with the right args', (done) => {
      // Arrange
      const expectedGroupBy = 'periodId';
      const expectedSumColumns = [
        { column: 'units', displayAs: 'units' },
        { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' },
      ];
      const expectedCountColumn = 'lines';
      const expectedFilter = event.outputFilter;
      // Act
      PeriodHeadlineFigures.__get__('salesInput')(event, (err) => {
        // Assert
        expect(bigQuery.getSalesInputAggregate.called).to.be.true;
        expect(bigQuery.getSalesInputAggregate.calledWith(
          expectedGroupBy,
          expectedSumColumns,
          expectedCountColumn,
          expectedFilter,
        )).to.be.true;
        done(err);
      });
    });

    describe('when bigQuery.getSalesInputAggregate returns an error', () => {
      it('should should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getSalesInputAggregate.yields(expectedError);
        // Act
        PeriodHeadlineFigures.__get__('salesInput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getSalesInputAggregate returns no result', () => {
      it('should should return an empty object', (done) => {
        // Arrange
        const expectedResult = {};
        bigQuery.getSalesInputAggregate.yields();
        // Act
        PeriodHeadlineFigures.__get__('salesInput')(event, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedResult);
          done(err);
        });
      });
    });

    describe('when bigQuery.getSalesInputAggregate returns a result', () => {
      it('should should return result[0]', (done) => {
        // Arrange
        const expectedGetSalesInputAggregate = [testUtils.randomString(), testUtils.randomString()];
        bigQuery.getSalesInputAggregate.yields(null, expectedGetSalesInputAggregate);
        const expectedResult = expectedGetSalesInputAggregate[0];
        // Act
        PeriodHeadlineFigures.__get__('salesInput')(event, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedResult);
          done(err);
        });
      });
    });
  });

  describe('salesOutput', () => {
    let event;

    beforeEach((done) => {
      sinon.stub(bigQuery, 'getAggregate');
      bigQuery.getAggregate.yields();

      sinon.stub(bigQuery, 'getDistinct');
      bigQuery.getDistinct.yields();

      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodHeadlineFigures.__get__('salesOutput')).to.exist;
      done();
    });

    it('should call bigQuery.getAggregate with the right args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.outputTable;
      const expectedSelector = 'periodId';
      const expectedSumColumns = [
        { column: 'units', displayAs: 'units' },
        { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' },
        { column: 'proRataAmount', displayAs: 'proRataGrossAmount' },
        { column: 'calculationOutput', displayAs: 'netPayout' },
        { column: 'reserve', displayAs: 'reservesWithheld' },
        { column: 'withholdingTax', displayAs: 'withholdingTax' },
      ];
      const expectedCountColumn = 'lines';
      const expectedFilter = event.salesOutputFilter;
      const expectedOptions = {};
      // Act
      PeriodHeadlineFigures.__get__('salesOutput')(event, (err) => {
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

    it('should call bigQuery.getDistinct with the right args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.outputTable;
      const expectedColumn = 'salesFileId';
      const expectedFilter = event.salesOutputFilter;
      // Act
      PeriodHeadlineFigures.__get__('salesOutput')(event, (err) => {
        // Assert
        expect(bigQuery.getDistinct.called).to.be.true;
        expect(bigQuery.getDistinct.calledWith(
          expectedTable,
          expectedColumn,
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
        PeriodHeadlineFigures.__get__('salesOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getDistinct returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getDistinct.yields(expectedError);
        // Act
        PeriodHeadlineFigures.__get__('salesOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getAggregate doesn\'t return a grouped data', () => {
      it('shouldn\'t update the object', (done) => {
        // Arrange
        bigQuery.getAggregate.yields();
        // Act
        PeriodHeadlineFigures.__get__('salesOutput')(event, (err, result) => {
          // Assert
          expect(result.units).to.not.exist;
          expect(result.grossRevenue).to.not.exist;
          expect(result.proRataGrossAmount).to.not.exist;
          expect(result.lines).to.not.exist;
          expect(result.netPayout).to.not.exist;
          expect(result.reservesWithheld).to.not.exist;
          expect(result.withholdingTax).to.not.exist;
          done(err);
        });
      });
    });

    describe('when bigQuery.getAggregate returns a grouped data', () => {
      it('should update the object', (done) => {
        // Arrange
        const expectedGetAggregateResult = [
          {
            units: testUtils.randomFloat(),
            grossRevenue: testUtils.randomFloat(),
            lines: testUtils.randomFloat(),
            netPayout: testUtils.randomFloat(),
            reservesWithheld: testUtils.randomFloat(),
            withholdingTax: testUtils.randomFloat(),
            proRataGrossAmount: testUtils.randomFloat(),
          },
        ];
        bigQuery.getAggregate.yields(null, expectedGetAggregateResult);
        // Act
        PeriodHeadlineFigures.__get__('salesOutput')(event, (err, result) => {
          // Assert
          expect(result.units).to.eq(expectedGetAggregateResult[0].units);
          expect(result.grossRevenue).to.eq(expectedGetAggregateResult[0].grossRevenue);
          expect(result.proRataGrossAmount).to.eq(expectedGetAggregateResult[0].proRataGrossAmount);
          expect(result.lines).to.eq(expectedGetAggregateResult[0].lines);
          expect(result.netPayout).to.eq(expectedGetAggregateResult[0].netPayout);
          expect(result.reservesWithheld).to.eq(expectedGetAggregateResult[0].reservesWithheld);
          expect(result.withholdingTax).to.eq(expectedGetAggregateResult[0].withholdingTax);
          done(err);
        });
      });
    });

    describe('when bigQuery.getDistinct returns salesFileIds', () => {
      it('should update the object', (done) => {
        // Arrange
        const expectedGetDistinctResult = [testUtils.randomId(), testUtils.randomId()];
        bigQuery.getDistinct.yields(null, expectedGetDistinctResult);
        // Act
        PeriodHeadlineFigures.__get__('salesOutput')(event, (err, result) => {
          // Assert
          expect(result.salesFileIds).to.deep.eq(expectedGetDistinctResult);
          done(err);
        });
      });
    });
  });

  describe('costsOutput', () => {
    let event;

    beforeEach((done) => {
      sinon.stub(bigQuery, 'getAggregate');
      bigQuery.getAggregate.yields();

      sinon.stub(bigQuery, 'getDistinct');
      bigQuery.getDistinct.yields();

      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodHeadlineFigures.__get__('costsOutput')).to.exist;
      done();
    });

    it('should call bigQuery.getAggregate with the right args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.costsTable;
      const expectedSelector = 'periodId';
      const expectedSumColumns = [
        { column: 'amount', displayAs: 'grossCosts' },
        { column: 'calculationInput', displayAs: 'homeCurrencyGrossCosts' },
        { column: 'calculationOutput', displayAs: 'netCosts' },
      ];
      const expectedCountColumn = 'lines';
      const expectedFilter = event.outputFilter;
      const expectedOptions = {};
      // Act
      PeriodHeadlineFigures.__get__('costsOutput')(event, (err) => {
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

    it('should call bigQuery.getDistinct with the right args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.costsTable;
      const expectedColumn = 'costId';
      const expectedFilter = event.outputFilter;
      // Act
      PeriodHeadlineFigures.__get__('costsOutput')(event, (err) => {
        // Assert
        expect(bigQuery.getDistinct.called).to.be.true;
        expect(bigQuery.getDistinct.calledWith(
          expectedTable,
          expectedColumn,
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
        PeriodHeadlineFigures.__get__('costsOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getDistinct returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getDistinct.yields(expectedError);
        // Act
        PeriodHeadlineFigures.__get__('costsOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getAggregate doesn\'t return a grouped data', () => {
      it('shouldn\'t update the object', (done) => {
        // Arrange
        bigQuery.getAggregate.yields();
        // Act
        PeriodHeadlineFigures.__get__('costsOutput')(event, (err, result) => {
          // Assert
          expect(result.grossCosts).to.not.exist;
          expect(result.netCosts).to.not.exist;
          done(err);
        });
      });
    });

    describe('when bigQuery.getAggregate returns a grouped data', () => {
      it('should update the object', (done) => {
        // Arrange
        const expectedGetAggregateResult = [
          {
            grossCosts: testUtils.randomFloat(),
            netCosts: testUtils.randomFloat(),
          },
        ];
        bigQuery.getAggregate.yields(null, expectedGetAggregateResult);
        // Act
        PeriodHeadlineFigures.__get__('costsOutput')(event, (err, result) => {
          // Assert
          expect(result.grossCosts).to.eq(expectedGetAggregateResult[0].grossCosts);
          expect(result.netCosts).to.eq(expectedGetAggregateResult[0].netCosts);
          done(err);
        });
      });
    });

    describe('when bigQuery.getDistinct returns salesFileIds', () => {
      it('should update the object', (done) => {
        // Arrange
        const expectedGetDistinctResult = [testUtils.randomId(), testUtils.randomId()];
        bigQuery.getDistinct.yields(null, expectedGetDistinctResult);
        // Act
        PeriodHeadlineFigures.__get__('costsOutput')(event, (err, result) => {
          // Assert
          expect(result.costIds).to.deep.eq(expectedGetDistinctResult);
          done(err);
        });
      });
    });
  });

  describe('module.exports', () => {
    let event;
    beforeEach((done) => {
      PeriodHeadlineFigures.__set__('salesInput', sinon.stub());
      PeriodHeadlineFigures.__get__('salesInput').yields();

      PeriodHeadlineFigures.__set__('salesOutput', sinon.stub());
      PeriodHeadlineFigures.__get__('salesOutput').yields();

      PeriodHeadlineFigures.__set__('costsInput', sinon.stub());
      PeriodHeadlineFigures.__get__('costsInput').yields();

      PeriodHeadlineFigures.__set__('costsOutput', sinon.stub());
      PeriodHeadlineFigures.__get__('costsOutput').yields();

      event = {
        salesInputDatabaseUrl: testUtils.randomString(),
        costsInputDatabaseTable: testUtils.randomString(),
        inputFilter: testUtils.randomString(),
      };

      done();
    });

    describe('when event.inputFilter is set', () => {
      it('should call salesInput with the right args', (done) => {
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(PeriodHeadlineFigures.__get__('salesInput').called).to.be.true;
          expect(PeriodHeadlineFigures.__get__('salesInput').calledWith(event)).to.be.true;
          done(err);
        });
      });

      it('should call salesOutput with the right args', (done) => {
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(PeriodHeadlineFigures.__get__('salesOutput').called).to.be.true;
          expect(PeriodHeadlineFigures.__get__('salesOutput').calledWith(event)).to.be.true;
          done(err);
        });
      });

      it('should call costsInput with the right args', (done) => {
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(PeriodHeadlineFigures.__get__('costsInput').called).to.be.true;
          expect(PeriodHeadlineFigures.__get__('costsInput').calledWith(event)).to.be.true;
          done(err);
        });
      });

      it('should call costsOutput with the right args', (done) => {
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(PeriodHeadlineFigures.__get__('costsOutput').called).to.be.true;
          expect(PeriodHeadlineFigures.__get__('costsOutput').calledWith(event)).to.be.true;
          done(err);
        });
      });
    });

    describe('when event.inputFilter is not set', () => {
      it('should call salesInput with the right args', (done) => {
        // Arrange
        delete event.inputFilter;
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(PeriodHeadlineFigures.__get__('salesInput').called).to.be.false;
          done(err);
        });
      });

      it('should call salesOutput with the right args', (done) => {
        // Arrange
        delete event.inputFilter;
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(PeriodHeadlineFigures.__get__('salesOutput').called).to.be.true;
          expect(PeriodHeadlineFigures.__get__('salesOutput').calledWith(event)).to.be.true;
          done(err);
        });
      });

      it('should call costsOutput with the right args', (done) => {
        // Arrange
        delete event.inputFilter;
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(PeriodHeadlineFigures.__get__('costsOutput').called).to.be.true;
          expect(PeriodHeadlineFigures.__get__('costsOutput').calledWith(event)).to.be.true;
          done(err);
        });
      });
    });

    describe('when salesInput returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        PeriodHeadlineFigures.__get__('salesInput').yields(expectedError);
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when salesOutput returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        PeriodHeadlineFigures.__get__('salesOutput').yields(expectedError);
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when costsInput returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        PeriodHeadlineFigures.__get__('costsInput').yields(expectedError);
        // Act
        PeriodHeadlineFigures(event, (err) => {
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
        PeriodHeadlineFigures.__get__('costsOutput').yields(expectedError);
        // Act
        PeriodHeadlineFigures(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when no errors are returned', () => {
      it('should return the right result', (done) => {
        // Arrange
        const expectedSalesInputResult = {
          units: testUtils.randomFloat(),
          grossRevenue: testUtils.randomFloat(),
          lines: testUtils.randomFloat(),
        };
        const expectedSalesOutputResult = {
          netPayout: testUtils.randomFloat(),
          reservesWithheld: testUtils.randomFloat(),
          withholdingTax: testUtils.randomFloat(),
          salesFileIds: [testUtils.randomId(), testUtils.randomId()],
        };

        const expectedCostsInputResultTotal = testUtils.randomFloat();

        const expectedCostsOutputResult = {
          grossCosts: testUtils.randomFloat(),
          netCosts: testUtils.randomFloat(),
          costIds: [testUtils.randomId(), testUtils.randomId()],
        };
        PeriodHeadlineFigures.__get__('salesInput').yields(null, expectedSalesInputResult);
        PeriodHeadlineFigures.__get__('salesOutput').yields(null, expectedSalesOutputResult);
        PeriodHeadlineFigures.__get__('costsInput').yields(null, expectedCostsInputResultTotal);
        PeriodHeadlineFigures.__get__('costsOutput').yields(null, expectedCostsOutputResult);
        // Act
        PeriodHeadlineFigures(event, (err, result) => {
          // Assert
          // salesInput Result
          expect(result.units).to.eq(expectedSalesInputResult.units);
          expect(result.grossRevenue).to.eq(expectedSalesInputResult.grossRevenue);
          expect(result.lines).to.eq(expectedSalesInputResult.lines);
          // salesOutput Result
          expect(result.netPayout).to.eq(expectedSalesOutputResult.netPayout);
          expect(result.reservesWithheld).to.eq(expectedSalesOutputResult.reservesWithheld);
          expect(result.withholdingTax).to.eq(expectedSalesOutputResult.withholdingTax);
          expect(result.salesFileIds).to.deep.eq(expectedSalesOutputResult.salesFileIds);
          // costsInput Result
          expect(result.grossCosts).to.deep.eq(expectedCostsInputResultTotal);
          // costsOutput Result
          expect(result.netCosts).to.eq(expectedCostsOutputResult.netCosts);
          expect(result.costIds).to.deep.eq(expectedCostsOutputResult.costIds);

          done(err);
        });
      });
    });
  });
});
