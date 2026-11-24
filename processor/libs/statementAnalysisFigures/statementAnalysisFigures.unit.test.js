const { BigQuery, testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const statementAnalysisFigures = require('./statementAnalysisFigures');
const { salesCalculations, costsOutput } = require('./helpers');

const bigQuery = new BigQuery(testUtils.bigQueryRandomParams());

let mockSalesCalculationsResult;
let mockSalesCalculationsError;
let mockCostsOutputResult;
let mockCostsOutputError;

jest.mock('./helpers', () => ({
  salesCalculations: jest.fn((...args) => {
    args[args.length - 1](mockSalesCalculationsError, mockSalesCalculationsResult);
  }),
  costsOutput: jest.fn((...args) => {
    args[args.length - 1](mockCostsOutputError, mockCostsOutputResult);
  }),
}));

describe('statementAnalysisFigures', () => {
  beforeEach(() => {
    mockSalesCalculationsResult = {
      distributionChannels: [],
      configurations: [],
      territories: [],
      sources: [],
      subSources: [],
      configChannels: [],
      releases: [],
      tracks: [],
      works: [],
    };
    mockCostsOutputResult = [];
    mockSalesCalculationsError = null;
    mockCostsOutputError = null;
  });
  const event = {
    bigQuery,
    outputFilter: { field: testUtils.randomString() },
    salesOutputFilter: { field: testUtils.randomString() },
    valueSource: testUtils.randomString(),
    table: testUtils.randomString(),
    type: testUtils.randomString(),
  };

  it('should call salesCalculations with the right args', (done) => {
    // Act
    statementAnalysisFigures(event, (err) => {
      // Assert
      expect(salesCalculations).toHaveBeenCalled();
      expect(salesCalculations).toHaveBeenCalledWith(
        event.salesOutputFilter,
        event.bigQuery,
        event.bigQuery.outputTable,
        event.type,
        undefined,
        expect.any(Function),
      );
      done(err);
    });
  });

  it('should call costsOutput with the right args', (done) => {
    // Act
    statementAnalysisFigures(event, (err) => {
      // Assert
      expect(costsOutput).toHaveBeenCalled();
      expect(costsOutput).toHaveBeenCalledWith(event, expect.any(Function));
      done(err);
    });
  });

  describe('when salesCalculations returns an error', () => {
    it('should return an error', (done) => {
      // Arrange
      const expectedError = testUtils.randomString();
      mockSalesCalculationsError = expectedError;
      // Act
      statementAnalysisFigures(event, (err) => {
        // Assert
        expect(err).toBe(expectedError);
        done();
      });
    });
  });

  describe('when costsOutput returns an error', () => {
    it('should return an error', (done) => {
      // Arrange
      const expectedError = testUtils.randomString();
      mockCostsOutputError = expectedError;
      // Act
      statementAnalysisFigures(event, (err) => {
        // Assert
        expect(err).toBe(expectedError);
        done();
      });
    });
  });

  describe('when no errors are returned', () => {
    it('should return the result', (done) => {
      // Arrange
      const contractId = testUtils.randomId();
      const expectedSalesOutputResult = {
        distributionChannels: [{ distributionChannel: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        configurations: [{ configuration: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        territories: [{ territory: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        sources: [{ source: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        subSources: [{ subSource: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        configChannels: [{ configuration: testUtils.randomString(), distributionChannel: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        releases: [{ catalogueCatNo: testUtils.randomString(), catalogueReleaseTitle: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        tracks: [{ catalogueIsrc: testUtils.randomString(), catalogueTrackTitle: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
        works: [{ catalogueIdentifier: testUtils.randomString(), catalogueWorkTitle: testUtils.randomString(), units: testUtils.randomFloat(), net: testUtils.randomFloat(), gross: testUtils.randomFloat(), contractId, deduction: testUtils.randomFloat() }],
      };
      const expectedCostsOutputResult = [{ contractId, type: testUtils.randomString(), net: testUtils.randomFloat(), gross: testUtils.randomFloat() }];
      mockSalesCalculationsResult = expectedSalesOutputResult;
      mockCostsOutputResult = expectedCostsOutputResult;

      // Act
      statementAnalysisFigures(event, (err, result) => {
        // Assert
        // distributionChannels
        let item = expectedSalesOutputResult.distributionChannels[0];
        expect(result[contractId].gross.distributionChannels).toEqual([{ type: item.distributionChannel, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction }]);
        expect(result[contractId].net.distributionChannels).toEqual([{ type: item.distributionChannel, units: item.units, value: item.net, deduction: item.deduction }]);

        // configurations
        [item] = expectedSalesOutputResult.configurations;
        expect(result[contractId].gross.configurations).toEqual([{ type: item.configuration, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction }]);
        expect(result[contractId].net.configurations).toEqual([{ type: item.configuration, units: item.units, value: item.net, deduction: item.deduction }]);

        // territories
        [item] = expectedSalesOutputResult.territories;
        expect(result[contractId].gross.territories).toEqual([{ type: item.territory, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction }]);
        expect(result[contractId].net.territories).toEqual([{ type: item.territory, units: item.units, value: item.net, deduction: item.deduction }]);

        // sources
        [item] = expectedSalesOutputResult.sources;
        expect(result[contractId].gross.sources).toEqual([{ type: item.source, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction }]);
        expect(result[contractId].net.sources).toEqual([{ type: item.source, units: item.units, value: item.net, deduction: item.deduction }]);

        // subSources
        [item] = expectedSalesOutputResult.subSources;
        expect(result[contractId].gross.subSources).toEqual([{ type: item.subSource, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction }]);
        expect(result[contractId].net.subSources).toEqual([{ type: item.subSource, units: item.units, value: item.net, deduction: item.deduction }]);

        // configChannels
        [item] = expectedSalesOutputResult.configChannels;
        expect(result[contractId].gross.configurationByDistributionChannel).toEqual([{
          distributionChannel: item.distributionChannel, configuration: item.configuration, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        }]);
        expect(result[contractId].net.configurationByDistributionChannel).toEqual([{
          distributionChannel: item.distributionChannel, configuration: item.configuration, units: item.units, value: item.net, deduction: item.deduction,
        }]);

        // releases
        [item] = expectedSalesOutputResult.releases;
        expect(result[contractId].gross.releases).toEqual([{
          type: item.catalogueCatNo, title: item.catalogueReleaseTitle, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        }]);
        expect(result[contractId].net.releases).toEqual([{
          type: item.catalogueCatNo, title: item.catalogueReleaseTitle, units: item.units, value: item.net, deduction: item.deduction,
        }]);

        // tracks
        [item] = expectedSalesOutputResult.tracks;
        expect(result[contractId].gross.tracks).toEqual([{
          type: item.catalogueIsrc, title: item.catalogueTrackTitle, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        }]);
        expect(result[contractId].net.tracks).toEqual([{
          type: item.catalogueIsrc, title: item.catalogueTrackTitle, units: item.units, value: item.net, deduction: item.deduction,
        }]);

        // works
        [item] = expectedSalesOutputResult.works;
        expect(result[contractId].gross.works).toEqual([{
          type: item.catalogueIdentifier, title: item.catalogueWorkTitle, units: item.units, value: item.gross, proRataGrossAmount: item.proRataAmount, deduction: item.deduction,
        }]);
        expect(result[contractId].net.works).toEqual([{
          type: item.catalogueIdentifier, title: item.catalogueWorkTitle, units: item.units, value: item.net, deduction: item.deduction,
        }]);

        // costs
        [item] = expectedCostsOutputResult;
        expect(result[contractId].gross.costs).toEqual([{ type: item.type, value: item.gross }]);
        expect(result[contractId].net.costs).toEqual([{ type: item.type, value: item.net }]);

        done(err);
      });
    });
  });
});
