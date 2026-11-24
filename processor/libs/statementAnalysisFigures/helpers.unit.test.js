const { BigQuery, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { costsOutput, salesCalculations } = require('./helpers');

const bigQuery = new BigQuery(testUtils.bigQueryRandomParams());

let event;

describe('helpers', () => {
  beforeEach(() => {
    jest.spyOn(bigQuery, 'getAggregate').mockImplementation((...args) => args[args.length - 1]());

    event = {
      bigQuery,
      outputFilter: { field: testUtils.randomString() },
      salesOutputFilter: { field: testUtils.randomString() },
      valueSource: testUtils.randomString(),
      table: testUtils.randomString(),
      type: testUtils.randomString(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('costsOutput', () => {
    it('should exist', () => {
      // Assert
      expect(costsOutput).toBeDefined();
    });

    it('should call bigQuery.getAggregate with the right args', (done) => {
      // Arrange
      const expectedTable = event.bigQuery.costsTable;
      const expectedSelector = [
        { column: 'periodId', isSelector: true, isGroupBy: true },
        { column: 'contractId', isSelector: true, isGroupBy: true },
        { column: 'type', isSelector: true, isGroupBy: true },
      ];
      const expectedSumColumns = [
        { column: 'contractCurrencyAmount', displayAs: 'gross' },
        { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
      ];
      const expectedCountColumn = 'lines';
      const expectedFilter = event.outputFilter;
      // Act
      costsOutput(event, (err) => {
        // Assert
        expect(bigQuery.getAggregate).toHaveBeenCalled();
        expect(bigQuery.getAggregate).toHaveBeenCalledWith(
          expectedTable,
          expectedSelector,
          expectedSumColumns,
          expectedCountColumn,
          expectedFilter,
          expect.any(Function),
        );
        done(err);
      });
    });

    describe('when bigQuery.getAggregate returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getAggregate.mockImplementation((...args) => args[args.length - 1](expectedError));
        // Act
        costsOutput(event, (err) => {
          // Assert
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe("when bigQuery.getAggregate doesn't return an error", () => {
      it('should return the result', (done) => {
        // Arrange
        const expectedAggregateResult = [
          { type: testUtils.randomId(), value: testUtils.randomString() },
          { type: testUtils.randomId(), value: testUtils.randomString() },
        ];
        bigQuery.getAggregate.mockImplementation((...args) => args[args.length - 1](null, expectedAggregateResult));
        // Act
        costsOutput(event, (err, result) => {
          // Assert
          expect(result).toEqual(expectedAggregateResult);
          done(err);
        });
      });
    });
  });

  describe('salesCalculations', () => {
    it('should exist', (done) => {
      // Assert
      expect(salesCalculations).toBeDefined();
      done();
    });

    describe('when getting the distribution channels', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'distributionChannel', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });

    describe('when getting the configurations', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'configuration', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });

    describe('when getting the territories', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'territory', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });

    describe('when getting the sources', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'source', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });

    describe('when getting the subSources', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'subSource', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });

    describe('when getting the releases', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        event.outputFilter.catType = 'Release';
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'catalogueCatNo', isSelector: true, isGroupBy: true },
          { column: 'catalogueReleaseTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueReleaseVersion, '') AS catalogueReleaseVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueReleaseVersion, '')", isSelector: false, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });

    describe('when getting the tracks', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        event.outputFilter.catType = 'Track';
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'catalogueIsrc', isSelector: true, isGroupBy: true },
          { column: 'catalogueTrackTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueTrackVersion, '') AS catalogueTrackVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueTrackVersion, '')", isSelector: false, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });
    describe('when getting the works', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        event.outputFilter.catType = 'Work';
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'workId', isSelector: true, isGroupBy: true },
          { column: 'catalogueIdentifier', isSelector: true, isGroupBy: true },
          { column: 'catalogueWorkTitle', isSelector: true, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });
    describe('when getting the config channels', () => {
      it('should call bigQuery.getAggregate with the right args', (done) => {
        // Arrange
        const client = {};
        event.outputFilter.catType = 'Work';
        const expectedTable = event.bigQuery.outputTable;
        const expectedSelector = [
          { column: 'configuration', isSelector: true, isGroupBy: true },
          { column: 'distributionChannel', isSelector: true, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.outputFilter;
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(bigQuery.getAggregate).toHaveBeenCalled();
          expect(bigQuery.getAggregate).toHaveBeenCalledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedFilter,
            expect.any(Function),
          );
          done(err);
        });
      });
    });

    describe('when bigQuery.getAggregate returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const client = {};
        const expectedError = testUtils.randomString();
        bigQuery.getAggregate.mockImplementation((...args) => args[args.length - 1](expectedError));
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err) => {
          // Assert
          expect(err).toBe(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getAggregate doesn\'t return an error', () => {
      it('should return the result', (done) => {
        // Arrange
        const client = {};
        const expectedAggregateResult = [
          { distributionChannel: testUtils.randomString(), configuration: testUtils.randomString(), territory: testUtils.randomString(), source: testUtils.randomString(), subSource: testUtils.randomString(), catalogueCatNo: testUtils.randomString(), catalogueReleaseTitle: testUtils.randomString(), catalogueIsrc: testUtils.randomString(), catalogueTrackTitle: testUtils.randomString(), catalogueIdentifier: testUtils.randomString(), catalogueWorkTitle: testUtils.randomString(), units: testUtils.randomString(), value: testUtils.randomString() },
          { distributionChannel: testUtils.randomString(), configuration: testUtils.randomString(), territory: testUtils.randomString(), source: testUtils.randomString(), subSource: testUtils.randomString(), catalogueCatNo: testUtils.randomString(), catalogueReleaseTitle: testUtils.randomString(), catalogueIsrc: testUtils.randomString(), catalogueTrackTitle: testUtils.randomString(), catalogueIdentifier: testUtils.randomString(), catalogueWorkTitle: testUtils.randomString(), units: testUtils.randomString(), value: testUtils.randomString() },
        ];
        bigQuery.getAggregate.mockImplementation((...args) => args[args.length - 1](null, expectedAggregateResult));
        const expectedSalesCalculationsResult = {
          distributionChannels: expectedAggregateResult,
          configurations: expectedAggregateResult,
          territories: expectedAggregateResult,
          sources: expectedAggregateResult,
          subSources: expectedAggregateResult,
          releases: expectedAggregateResult,
          tracks: expectedAggregateResult,
          works: expectedAggregateResult,
          configChannels: expectedAggregateResult,
        };
        // Act
        salesCalculations(event.outputFilter, event.bigQuery, event.bigQuery.outputTable, event.type, client, (err, result) => {
          // Assert
          expect(result).toEqual(expectedSalesCalculationsResult);
          done();
        });
      });
    });
  });
});
