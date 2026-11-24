process.env.NODE_ENV = 'test';

const { BigQuery, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const Cost = require('../../../models/cost');

let PeriodAnalysisFigures = rewire('../../../libs/periodAnalysisFigures');

const bigQuery = new BigQuery(testUtils.bigQueryRandomParams());

describe('PeriodAnalysisFigures', () => {
  before((done) => {
    sinon.restore();
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

  describe('costsInput', () => {
    const aggregateResult = [
      { _id: testUtils.randomId(), value: testUtils.randomString() },
      { _id: testUtils.randomId(), value: testUtils.randomString() },
    ];

    // let mongoCollectionStub;
    // let mongoAggregateCursorStub;
    // let mongoAggregateStub;
    let db;
    let event;

    beforeEach((done) => {
      sinon.stub(Cost, 'aggregate').resolves(aggregateResult);
      // mongoAggregateCursorStub = sinon.stub().resolves(aggregateResult);

      // mongoAggregateStub = sinon.stub().returns({
      //   toArray: mongoAggregateCursorStub,
      // });

      // mongoCollectionStub = sinon.stub().returns({
      //   aggregate: mongoAggregateStub,
      // });

      // db = {
      //   collection: mongoCollectionStub,
      // };

      event = {
        db,
        costsInputDatabaseUrl: testUtils.randomString(),
        costsInputDatabaseTable: testUtils.randomString(),
        costsInputDatabaseName: testUtils.randomString(),
        inputFilter: testUtils.randomString(),
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodAnalysisFigures.__get__('costsInput')).to.exist;
      done();
    });

    it('should call collection.aggregate with the right arguments', (done) => {
      // Arrange
      const filter = { ...event.inputFilter };
      filter.clientId = event.clientId;
      const expectedFilter = [{ $match: filter }, { $group: { _id: '$type', value: { $sum: '$amount' } } }];
      // Act
      PeriodAnalysisFigures.__get__('costsInput')(event, (err, result) => {
        // Assert
        expect(Cost.aggregate.called).to.be.true;
        expect(Cost.aggregate.calledWith(expectedFilter)).to.be.true;
        done(err);
      });
    });

    describe('when no aggregate result is returned', () => {
      it('should return an empty array', (done) => {
        // Arrange
        Cost.aggregate.resolves([]);
        const expectedResult = [];
        // Act
        PeriodAnalysisFigures.__get__('costsInput')(event, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedResult);
          done(err);
        });
      });
    });

    describe('when aggregate result is returned', () => {
      it('should return the aggregate result', (done) => {
        // Arrange
        const expectedResult = [
          { type: aggregateResult[0]._id, value: aggregateResult[0].value },
          { type: aggregateResult[1]._id, value: aggregateResult[1].value },
        ];
        // Act
        PeriodAnalysisFigures.__get__('costsInput')(event, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedResult);
          done(err);
        });
      });
    });

    describe('when aggregate cursor returns an error', () => {
      it('should return return an error', () => {
        // Arrange
        const expectedError = testUtils.randomString();
        Cost.aggregate.rejects(expectedError);
        // Act
        PeriodAnalysisFigures.__get__('costsInput')(event, (err) => {
          // Assert
          expect(err).to.deep.eq(expectedError);
        });
      });
    });

    describe('when aggregate returns an error', () => {
      it('should return return an error', (done) => {
        // Arrange
        const expectedError = { name: testUtils.randomString() };
        Cost.aggregate.rejects(expectedError);
        // Act
        PeriodAnalysisFigures.__get__('costsInput')(event, (err) => {
          // Assert
          expect(err).to.deep.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('costsOutput', () => {
    let event;

    beforeEach((done) => {
      sinon.stub(bigQuery, 'getAggregate');
      bigQuery.getAggregate.yields();

      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
      };
      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodAnalysisFigures.__get__('costsOutput')).to.exist;
      done();
    });

    describe('when getting the gross', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedSelector = 'type';
        const expectedSumColumns = [{ column: 'amount', displayAs: 'value' }];
        const expectedCountColumn = 'lines';
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('costsOutput')(event, (err) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            event.bigQuery.costsTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            event.outputFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when getting the net', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedSelector = 'type';
        const expectedSumColumns = [{ column: 'calculationOutput', displayAs: 'value' }];
        const expectedCountColumn = 'lines';
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('costsOutput')(event, (err) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            event.bigQuery.costsTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            event.outputFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when bigQuery.getAggregate returns an error', () => {
      it('should return an error when getAggregate errors', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getAggregate.yields(expectedError);
        // Act
        PeriodAnalysisFigures.__get__('costsOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getAggregate doesn\'t error', () => {
      it('should return aggregate result', (done) => {
        // Arrange
        const expectedAggregateResult = [
          { type: testUtils.randomId(), value: testUtils.randomString() },
          { type: testUtils.randomId(), value: testUtils.randomString() },
        ];
        bigQuery.getAggregate.yields(null, expectedAggregateResult);
        const expectCostsOutputResult = {
          gross: [
            { type: expectedAggregateResult[0].type, value: expectedAggregateResult[0].value },
            { type: expectedAggregateResult[1].type, value: expectedAggregateResult[1].value },
          ],
          net: [
            { type: expectedAggregateResult[0].type, value: expectedAggregateResult[0].value },
            { type: expectedAggregateResult[1].type, value: expectedAggregateResult[1].value },
          ],
        };
        // Act
        PeriodAnalysisFigures.__get__('costsOutput')(event, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectCostsOutputResult);
          done(err);
        });
      });
    });
  });

  describe('salesInputCalculations', () => {
    let event;
    beforeEach(() => {
      sinon.stub(bigQuery, 'getSalesInputAggregate');
      bigQuery.getSalesInputAggregate.yields();

      event = {
        bigQuery,
        standardFilter: { standard: 'filter' },
        valueSource: testUtils.randomString(),
        table: testUtils.randomString(),
        objectType: testUtils.randomString(),
      };
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodAnalysisFigures.__get__('salesInputCalculations')).to.exist;
      done();
    });

    describe('when getting the distribution channels', () => {
      it('should call bigQuery.getSalesInputAggregate with the rights args', (done) => {
        // Arrange
        const expectedGroupBy = 'distributionChannel';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.standardFilter;
        // Act
        PeriodAnalysisFigures.__get__('salesInputCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
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
    });

    describe('when getting the configurations', () => {
      it('should call bigQuery.getSalesInputAggregate with the rights args', (done) => {
        // Arrange
        const expectedGroupBy = 'configuration';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.standardFilter;
        // Act
        PeriodAnalysisFigures.__get__('salesInputCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
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
    });

    describe('when getting the territories', () => {
      it('should call bigQuery.getSalesInputAggregate with the rights args', (done) => {
        // Arrange
        const expectedGroupBy = 'territory';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.standardFilter;
        // Act
        PeriodAnalysisFigures.__get__('salesInputCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
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
    });

    describe('when getting the sources', () => {
      it('should call bigQuery.getSalesInputAggregate with the rights args', (done) => {
        // Arrange
        const expectedGroupBy = 'source';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.standardFilter;
        // Act
        PeriodAnalysisFigures.__get__('salesInputCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
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
    });

    describe('when getting the subSources', () => {
      it('should call bigQuery.getSalesInputAggregate with the rights args', (done) => {
        // Arrange
        const expectedGroupBy = 'subSource';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
        ];
        const expectedCountColumn = 'lines';
        const expectedFilter = event.standardFilter;
        // Act
        PeriodAnalysisFigures.__get__('salesInputCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
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
    });

    describe('when bigQuery.getSalesInputAggregate returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getSalesInputAggregate.yields(expectedError);
        // Act
        PeriodAnalysisFigures.__get__('salesInputCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getSalesInputAggregate doesn\'t return an error', () => {
      it('should return aggregate result', (done) => {
        // Arrange
        const expectedGetSalesInputAggregateResult = [
          {
            distributionChannel: testUtils.randomString(),
            units: testUtils.randomString(),
            value: testUtils.randomString(),
            configuration: testUtils.randomString(),
            territory: testUtils.randomString(),
            source: testUtils.randomString(),
            subSource: testUtils.randomString(),
          },
          {
            distributionChannel: testUtils.randomString(),
            units: testUtils.randomString(),
            value: testUtils.randomString(),
            configuration: testUtils.randomString(),
            territory: testUtils.randomString(),
            source: testUtils.randomString(),
            subSource: testUtils.randomString(),
          },
        ];
        bigQuery.getSalesInputAggregate.yields(null, expectedGetSalesInputAggregateResult);

        const expectedSalesInputCalculationsResult = {
          distributionChannels: [
            {
              type: expectedGetSalesInputAggregateResult[0].distributionChannel,
              units: expectedGetSalesInputAggregateResult[0].units,
              value: expectedGetSalesInputAggregateResult[0].value,
            },
            {
              type: expectedGetSalesInputAggregateResult[1].distributionChannel,
              units: expectedGetSalesInputAggregateResult[1].units,
              value: expectedGetSalesInputAggregateResult[1].value,
            },
          ],
          configurations: [
            {
              type: expectedGetSalesInputAggregateResult[0].configuration,
              units: expectedGetSalesInputAggregateResult[0].units,
              value: expectedGetSalesInputAggregateResult[0].value,
            },
            {
              type: expectedGetSalesInputAggregateResult[1].configuration,
              units: expectedGetSalesInputAggregateResult[1].units,
              value: expectedGetSalesInputAggregateResult[1].value,
            },
          ],
          territories: [
            {
              type: expectedGetSalesInputAggregateResult[0].territory,
              units: expectedGetSalesInputAggregateResult[0].units,
              value: expectedGetSalesInputAggregateResult[0].value,
            },
            {
              type: expectedGetSalesInputAggregateResult[1].territory,
              units: expectedGetSalesInputAggregateResult[1].units,
              value: expectedGetSalesInputAggregateResult[1].value,
            },
          ],
          sources: [
            {
              type: expectedGetSalesInputAggregateResult[0].source,
              units: expectedGetSalesInputAggregateResult[0].units,
              value: expectedGetSalesInputAggregateResult[0].value,
            },
            {
              type: expectedGetSalesInputAggregateResult[1].source,
              units: expectedGetSalesInputAggregateResult[1].units,
              value: expectedGetSalesInputAggregateResult[1].value,
            },
          ],
          subSources: [
            {
              type: expectedGetSalesInputAggregateResult[0].subSource,
              units: expectedGetSalesInputAggregateResult[0].units,
              value: expectedGetSalesInputAggregateResult[0].value,
            },
            {
              type: expectedGetSalesInputAggregateResult[1].subSource,
              units: expectedGetSalesInputAggregateResult[1].units,
              value: expectedGetSalesInputAggregateResult[1].value,
            },
          ],
        };
        // Act
        PeriodAnalysisFigures.__get__('salesInputCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedSalesInputCalculationsResult);
          done(err);
        });
      });
    });
  });

  describe('salesCalculations', () => {
    let event;

    beforeEach((done) => {
      sinon.stub(bigQuery, 'getAggregate');
      bigQuery.getAggregate.yields();

      event = {
        bigQuery,
        standardFilter: { standard: 'filter' },
        valueSource: testUtils.randomString(),
        table: testUtils.randomString(),
        objectType: testUtils.randomString(),
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodAnalysisFigures.__get__('salesCalculations')).to.exist;
      done();
    });

    describe('when getting the distribution channels', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedTable = event.table;
        const expectedSelector = 'distributionChannel';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when getting the configurations', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedTable = event.table;
        const expectedSelector = 'configuration';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when getting the configuration by distribution channel', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedTable = event.table;
        const expectedSelector = [
          { column: 'configuration', isSelector: true, isGroupBy: true },
          { column: 'distributionChannel', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when getting the territories', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedTable = event.table;
        const expectedSelector = 'territory';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when getting the sources', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedTable = event.table;
        const expectedSelector = 'source';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when getting the subSources', () => {
      it('should call bigQuery.getAggregate with the rights args', (done) => {
        // Arrange
        const expectedTable = event.table;
        const expectedSelector = 'subSource';
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when objectType is not Period', () => {
      it('should call bigQuery.getAggregate to get the releases', (done) => {
        // Arrange
        event.standardFilter.catType = 'Release';
        const expectedTable = event.table;
        const expectedSelector = [
          { column: 'catalogueCatNo', isSelector: true, isGroupBy: true },
          { column: 'catalogueReleaseTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueReleaseVersion, '') AS catalogueReleaseVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueReleaseVersion, '')", isSelector: false, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });

      it('should call bigQuery.getAggregate to get the tracks', (done) => {
        // Arrange
        event.standardFilter.catType = 'Track';
        const expectedTable = event.table;
        const expectedSelector = [
          { column: 'catalogueIsrc', isSelector: true, isGroupBy: true },
          { column: 'catalogueTrackTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueTrackVersion, '') AS catalogueTrackVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueTrackVersion, '')", isSelector: false, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });

      it('should call bigQuery.getAggregate to get the works', (done) => {
        // Arrange
        event.standardFilter.catType = 'Work';
        const expectedTable = event.table;
        const expectedSelector = [
          { column: 'workId', isSelector: true, isGroupBy: true },
          { column: 'catalogueIdentifier', isSelector: true, isGroupBy: true },
          { column: 'catalogueWorkTitle', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.called).to.be.true;
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when objectType is Period', () => {
      it('should not call bigQuery.getAggregate to get the releases', (done) => {
        // Arrange
        event.objectType = 'Period';
        event.standardFilter.catType = 'Release';
        const expectedTable = event.table;
        const expectedSelector = [
          { column: 'catalogueCatNo', isSelector: true, isGroupBy: true },
          { column: 'catalogueReleaseTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueReleaseVersion, '') AS catalogueReleaseVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueReleaseVersion, '')", isSelector: false, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.false;
          done(err);
        });
      });

      it('should not call bigQuery.getAggregate to get the tracks', (done) => {
        // Arrange
        event.objectType = 'Period';
        event.standardFilter.catType = 'Track';
        const expectedTable = event.table;
        const expectedSelector = [
          { column: 'catalogueIsrc', isSelector: true, isGroupBy: true },
          { column: 'catalogueTrackTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueTrackVersion, '') AS catalogueTrackVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueTrackVersion, '')", isSelector: false, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.false;
          done(err);
        });
      });

      it('should not call bigQuery.getAggregate to get the works', (done) => {
        // Arrange
        event.objectType = 'Period';
        event.standardFilter.catType = 'Work';
        const expectedTable = event.table;
        const expectedSelector = [
          { column: 'workId', isSelector: true, isGroupBy: true },
          { column: 'catalogueIdentifier', isSelector: true, isGroupBy: true },
          { column: 'catalogueWorkTitle', isSelector: true, isGroupBy: true },
        ];
        const expectedSumColumns = [
          { column: 'units', displayAs: 'units' },
          { column: event.valueSource, displayAs: 'value' },
          { column: 'proRataAmount', displayAs: 'proRataAmount' },
        ];
        const expectedCountColumn = 'lines';
        const expectedStandardFilter = event.standardFilter;
        const expectedOptions = {};
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(bigQuery.getAggregate.calledWith(
            expectedTable,
            expectedSelector,
            expectedSumColumns,
            expectedCountColumn,
            expectedStandardFilter,
            expectedOptions,
          )).to.be.false;
          done(err);
        });
      });
    });

    describe('when bigQuery.getAggregate returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        bigQuery.getAggregate.yields(expectedError);
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when bigQuery.getAggregate doesn\'t return an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedGetAggregateResult = [
          {
            distributionChannel: testUtils.randomString(),
            configuration: testUtils.randomString(),
            territory: testUtils.randomString(),
            source: testUtils.randomString(),
            subSource: testUtils.randomString(),
            catalogueCatNo: testUtils.randomString(),
            catalogueReleaseTitle: testUtils.randomString(),
            catalogueIsrc: testUtils.randomString(),
            catalogueTrackTitle: testUtils.randomString(),
            catalogueIdentifier: testUtils.randomString(),
            catalogueWorkTitle: testUtils.randomString(),
            proRataAmount: testUtils.randomFloat(),
            units: testUtils.randomString(),
            value: testUtils.randomString(),
          },
          {
            distributionChannel: testUtils.randomString(),
            configuration: testUtils.randomString(),
            territory: testUtils.randomString(),
            source: testUtils.randomString(),
            subSource: testUtils.randomString(),
            catalogueCatNo: testUtils.randomString(),
            catalogueReleaseTitle: testUtils.randomString(),
            catalogueIsrc: testUtils.randomString(),
            catalogueTrackTitle: testUtils.randomString(),
            catalogueIdentifier: testUtils.randomString(),
            catalogueWorkTitle: testUtils.randomString(),
            proRataAmount: testUtils.randomFloat(),
            units: testUtils.randomString(),
            value: testUtils.randomString(),
          },
        ];
        bigQuery.getAggregate.yields(null, expectedGetAggregateResult);

        const expectedSalesCalculationsResult = {
          distributionChannels: [
            {
              type: expectedGetAggregateResult[0].distributionChannel,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].distributionChannel,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          configurations: [
            {
              type: expectedGetAggregateResult[0].configuration,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].configuration,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          territories: [
            {
              type: expectedGetAggregateResult[0].territory,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].territory,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          sources: [
            {
              type: expectedGetAggregateResult[0].source,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].source,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          subSources: [
            {
              type: expectedGetAggregateResult[0].subSource,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].subSource,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          releases: [
            {
              type: expectedGetAggregateResult[0].catalogueCatNo,
              title: expectedGetAggregateResult[0].catalogueReleaseTitle,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].catalogueCatNo,
              title: expectedGetAggregateResult[1].catalogueReleaseTitle,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          tracks: [
            {
              type: expectedGetAggregateResult[0].catalogueIsrc,
              title: expectedGetAggregateResult[0].catalogueTrackTitle,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].catalogueIsrc,
              title: expectedGetAggregateResult[1].catalogueTrackTitle,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          works: [
            {
              type: expectedGetAggregateResult[0].catalogueIdentifier,
              title: expectedGetAggregateResult[0].catalogueWorkTitle,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              type: expectedGetAggregateResult[1].catalogueIdentifier,
              title: expectedGetAggregateResult[1].catalogueWorkTitle,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
          configurationByDistributionChannel: [
            {
              distributionChannel: expectedGetAggregateResult[0].distributionChannel,
              configuration: expectedGetAggregateResult[0].configuration,
              units: expectedGetAggregateResult[0].units,
              value: expectedGetAggregateResult[0].value,
              proRataGrossAmount: expectedGetAggregateResult[0].proRataAmount,
            },
            {
              distributionChannel: expectedGetAggregateResult[1].distributionChannel,
              configuration: expectedGetAggregateResult[1].configuration,
              units: expectedGetAggregateResult[1].units,
              value: expectedGetAggregateResult[1].value,
              proRataGrossAmount: expectedGetAggregateResult[1].proRataAmount,
            },
          ],
        };
        // Act
        PeriodAnalysisFigures.__get__('salesCalculations')(event.standardFilter, event.valueSource, event.bigQuery, event.table, event.objectType, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedSalesCalculationsResult);
          done();
        });
      });
    });
  });

  describe('salesOutput', () => {
    let event;
    beforeEach((done) => {
      PeriodAnalysisFigures.__set__('salesCalculations', sinon.stub());
      PeriodAnalysisFigures.__get__('salesCalculations').yields();

      event = {
        bigQuery,
        outputFilter: { output: 'filter' },
        salesOutputFilter: { salesOutput: 'filter' },
        outputTable: testUtils.randomString(),
        type: testUtils.randomString(),
        outputSalesValue: testUtils.randomString(),
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodAnalysisFigures.__get__('salesOutput')).to.exist;
      done();
    });

    describe('when getting the gross', () => {
      it('should call salesCalculations with the rights args', (done) => {
        // Arrange
        const expectedStandardFilter = event.salesOutputFilter;
        const expectedValueSource = 'calculationInput';
        const expectedBigQuery = event.bigQuery;
        const expectedTable = event.bigQuery.outputTable;
        const expectedObjectType = event.type;
        // Act
        PeriodAnalysisFigures.__get__('salesOutput')(event, (err) => {
          // Assert
          expect(PeriodAnalysisFigures.__get__('salesCalculations').called).to.be.true;
          expect(PeriodAnalysisFigures.__get__('salesCalculations').calledWith(
            expectedStandardFilter,
            expectedValueSource,
            expectedBigQuery,
            expectedTable,
            expectedObjectType,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when getting the net', () => {
      it('should call salesCalculations with the rights args', (done) => {
        // Arrange
        const expectedStandardFilter = event.salesOutputFilter;
        const expectedValueSource = event.outputSalesValue;
        const expectedBigQuery = event.bigQuery;
        const expectedTable = event.bigQuery.outputTable;
        const expectedObjectType = event.type;
        // Act
        PeriodAnalysisFigures.__get__('salesOutput')(event, (err) => {
          // Assert
          expect(PeriodAnalysisFigures.__get__('salesCalculations').called).to.be.true;
          expect(PeriodAnalysisFigures.__get__('salesCalculations').calledWith(
            expectedStandardFilter,
            expectedValueSource,
            expectedBigQuery,
            expectedTable,
            expectedObjectType,
          )).to.be.true;
          done(err);
        });
      });
    });

    describe('when salesCalculations returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        PeriodAnalysisFigures.__get__('salesCalculations').yields(expectedError);
        // Act
        PeriodAnalysisFigures.__get__('salesOutput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when salesCalculations doesn\'t return an error', () => {
      it('should return the result', (done) => {
        // Arrange
        const expectedSalesCalculationsResult = [
          {
            result: testUtils.randomFloat(),
          },
        ];
        PeriodAnalysisFigures.__get__('salesCalculations').yields(null, expectedSalesCalculationsResult);

        const expectedSalesOutputResult = {
          gross: expectedSalesCalculationsResult,
          net: expectedSalesCalculationsResult,
        };
        // Act
        PeriodAnalysisFigures.__get__('salesOutput')(event, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedSalesOutputResult);
          done(err);
        });
      });
    });
  });

  describe('salesInput', () => {
    let event;
    beforeEach((done) => {
      PeriodAnalysisFigures.__set__('salesInputCalculations', sinon.stub());
      PeriodAnalysisFigures.__get__('salesInputCalculations').yields();

      event = {
        bigQuery,
        outputFilter: testUtils.randomString(),
        type: testUtils.randomString(),
      };

      done();
    });

    it('should exist', (done) => {
      // Assert
      expect(PeriodAnalysisFigures.__get__('salesInput')).to.exist;
      done();
    });

    it('should call salesInputCalculations with the rights args', (done) => {
      // Arrange
      const expectedStandardFilter = event.outputFilter;
      const expectedValueSource = 'homeCurrencyNetAmount';
      const expectedBigQuery = event.bigQuery;
      const expectedTable = event.bigQuery.inputTable;
      const expectedObjectType = event.type;
      // Act
      PeriodAnalysisFigures.__get__('salesInput')(event, (err) => {
        // Assert
        expect(PeriodAnalysisFigures.__get__('salesInputCalculations').called).to.be.true;
        expect(PeriodAnalysisFigures.__get__('salesInputCalculations').calledWith(
          expectedStandardFilter,
          expectedValueSource,
          expectedBigQuery,
          expectedTable,
          expectedObjectType,
        )).to.be.true;
        done(err);
      });
    });

    describe('when salesInputCalculations returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        const expectedError = testUtils.randomString();
        PeriodAnalysisFigures.__get__('salesInputCalculations').yields(expectedError);
        // Act
        PeriodAnalysisFigures.__get__('salesInput')(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when salesInputCalculations doesn\'t return an error', () => {
      it('should return the result', (done) => {
        // Arrange
        const expectedSalesInputCalculationsResult = [{ result: testUtils.randomFloat() }];
        PeriodAnalysisFigures.__get__('salesInputCalculations').yields(null, expectedSalesInputCalculationsResult);
        // Act
        PeriodAnalysisFigures.__get__('salesInput')(event, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedSalesInputCalculationsResult);
          done(err);
        });
      });
    });
  });

  describe('module.exports', () => {
    let event;

    beforeEach((done) => {
      PeriodAnalysisFigures = rewire('../../../libs/periodAnalysisFigures');

      PeriodAnalysisFigures.__set__('salesInput', sinon.stub());
      PeriodAnalysisFigures.__get__('salesInput').yields(null, {});

      PeriodAnalysisFigures.__set__('salesOutput', sinon.stub());
      PeriodAnalysisFigures.__get__('salesOutput').yields(null, {});

      PeriodAnalysisFigures.__set__('costsInput', sinon.stub());
      PeriodAnalysisFigures.__get__('costsInput').yields(null, {});

      PeriodAnalysisFigures.__set__('costsOutput', sinon.stub());
      PeriodAnalysisFigures.__get__('costsOutput').yields(null, {});

      event = {
        type: testUtils.randomString(),
      };

      done();
    });

    describe('when salesInput returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        event.inputFilter = {};
        const expectedError = testUtils.randomString();
        PeriodAnalysisFigures.__get__('salesInput').yields(expectedError);
        // Act
        PeriodAnalysisFigures(event, (err) => {
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
        PeriodAnalysisFigures.__get__('salesOutput').yields(expectedError);
        // Act
        PeriodAnalysisFigures(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when costsInput returns an error', () => {
      it('should return an error', (done) => {
        // Arrange
        event.inputFilter = {};
        const expectedError = testUtils.randomString();
        PeriodAnalysisFigures.__get__('costsInput').yields(expectedError);
        // Act
        PeriodAnalysisFigures(event, (err) => {
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
        PeriodAnalysisFigures.__get__('costsOutput').yields(expectedError);
        // Act
        PeriodAnalysisFigures(event, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call salesOutput with the right args', (done) => {
      // Act
      PeriodAnalysisFigures(event, (err) => {
        // Assert
        expect(PeriodAnalysisFigures.__get__('salesOutput').called).to.be.true;
        expect(PeriodAnalysisFigures.__get__('salesOutput').calledWith(event)).to.be.true;
        done(err);
      });
    });

    it('should call costsOutput with the right args', (done) => {
      // Act
      PeriodAnalysisFigures(event, (err) => {
        // Assert
        expect(PeriodAnalysisFigures.__get__('costsOutput').called).to.be.true;
        expect(PeriodAnalysisFigures.__get__('costsOutput').calledWith(event)).to.be.true;
        done(err);
      });
    });

    describe('when no event.inputFilter', () => {
      it('should not call salesInput', (done) => {
        // Act
        PeriodAnalysisFigures(event, (err) => {
          // Assert
          expect(PeriodAnalysisFigures.__get__('salesInput').called).to.be.false;
          done(err);
        });
      });

      it('should not call costsInput', (done) => {
        // Act
        PeriodAnalysisFigures(event, (err) => {
          // Assert
          expect(PeriodAnalysisFigures.__get__('costsInput').called).to.be.false;
          done(err);
        });
      });
    });

    describe('when event.inputFilter is set', () => {
      it('should call salesInput with the right args', (done) => {
        // Arrange
        event.inputFilter = {};
        // Act
        PeriodAnalysisFigures(event, (err) => {
          // Assert
          expect(PeriodAnalysisFigures.__get__('salesInput').called).to.be.true;
          expect(PeriodAnalysisFigures.__get__('salesInput').calledWith(event)).to.be.true;
          done(err);
        });
      });

      it('should call costsInput with the right args', (done) => {
        // Arrange
        event.inputFilter = {};
        // Act
        PeriodAnalysisFigures(event, (err) => {
          // Assert
          expect(PeriodAnalysisFigures.__get__('costsInput').called).to.be.true;
          expect(PeriodAnalysisFigures.__get__('costsInput').calledWith(event)).to.be.true;
          done(err);
        });
      });
    });

    describe('when no errors occur', () => {
      describe('when event.inputFilter is set', () => {
        it('should return the right result', (done) => {
          // Arrange
          event.inputFilter = {};
          const expectedSalesInputResult = { sales: testUtils.randomInt() };
          PeriodAnalysisFigures.__get__('salesInput').yields(null, expectedSalesInputResult);
          const expectedSalesOutputResult = { net: testUtils.randomInt() };
          PeriodAnalysisFigures.__get__('salesOutput').yields(null, expectedSalesOutputResult);
          const expectedCostsInputResult = { net: testUtils.randomInt() };
          PeriodAnalysisFigures.__get__('costsInput').yields(null, expectedCostsInputResult);
          const expectedCostsOutputResult = { net: testUtils.randomInt() };
          PeriodAnalysisFigures.__get__('costsOutput').yields(null, expectedCostsOutputResult);

          const expectedObjectRsult = { gross: {}, net: {} };
          expectedObjectRsult.gross = Object.assign(expectedObjectRsult.gross, expectedSalesInputResult);
          expectedObjectRsult.net = Object.assign(expectedObjectRsult.net, expectedSalesOutputResult.net);
          expectedObjectRsult.gross.costs = expectedCostsInputResult;
          expectedObjectRsult.net.costs = expectedCostsOutputResult.net;
          // Act
          PeriodAnalysisFigures(event, (err, result) => {
            // Assert
            expect(result).to.deep.eq(expectedObjectRsult);
            done(err);
          });
        });
      });

      describe('when event.inputFilter is not set', () => {
        it('should return the right result', (done) => {
          // Arrange
          const expectedSalesOutputResult = { net: testUtils.randomInt() };
          PeriodAnalysisFigures.__get__('salesOutput').yields(null, expectedSalesOutputResult);
          const expectedCostsOutputResult = { net: testUtils.randomInt() };
          PeriodAnalysisFigures.__get__('costsOutput').yields(null, expectedCostsOutputResult);

          const expectedObjectRsult = { gross: {}, net: {} };
          expectedObjectRsult.net = Object.assign(expectedObjectRsult.net, expectedSalesOutputResult.net);
          expectedObjectRsult.gross = Object.assign(expectedObjectRsult.gross, expectedSalesOutputResult.gross);
          expectedObjectRsult.net.costs = expectedCostsOutputResult.net;
          if (!expectedObjectRsult.gross.costs || expectedObjectRsult.gross.costs.length === 0) { expectedObjectRsult.gross.costs = expectedCostsOutputResult.gross; }
          // Act
          PeriodAnalysisFigures(event, (err, result) => {
            // Assert
            expect(result).to.deep.eq(expectedObjectRsult);
            done(err);
          });
        });
      });
    });
  });
});
