const { randomArray, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const statementHelpers = require('./statementHelpers');
const calculationHelper = require('../../../calculationHelper');

jest.mock('../../../calculationHelper', () => ({
  sortAndLimit: jest.fn(),
}));

describe('statementHelpers', () => {
  describe('sortAndLimitCatalogueAnalysisData', () => {
    let analysisData;
    beforeEach(() => {
      calculationHelper.sortAndLimit.mockReset();
      analysisData = {
        gross: randomCatalogue(),
        net: randomCatalogue(),
      };
    });
    afterAll(jest.restoreAllMocks);

    it('should call sortAndLimit for all gross and net catalogue properties and return the modified analysisData', () => {
      // Arrange
      calculationHelper.sortAndLimit
        .mockReturnValueOnce(['sortedReleases'])
        .mockReturnValueOnce(['sortedTracks'])
        .mockReturnValueOnce(['sortedWorks'])
        .mockReturnValueOnce(['sortedNetReleases'])
        .mockReturnValueOnce(['sortedNetTracks'])
        .mockReturnValueOnce(['sortedNetWorks']);
      const limit = randomInt();
      // Act
      const result = statementHelpers.sortAndLimitCatalogueAnalysisData(
        analysisData,
        limit,
      );
      // Assert
      expect(calculationHelper.sortAndLimit).toHaveBeenCalledTimes(6);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(1, analysisData.gross.releases, 'value', limit);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(2, analysisData.gross.tracks, 'value', limit);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(3, analysisData.gross.works, 'value', limit);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(4, analysisData.net.releases, 'value', limit);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(5, analysisData.net.tracks, 'value', limit);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(6, analysisData.net.works, 'value', limit);

      expect(result.gross.releases).toEqual(['sortedReleases']);
      expect(result.gross.tracks).toEqual(['sortedTracks']);
      expect(result.gross.works).toEqual(['sortedWorks']);
      expect(result.net.releases).toEqual(['sortedNetReleases']);
      expect(result.net.tracks).toEqual(['sortedNetTracks']);
      expect(result.net.works).toEqual(['sortedNetWorks']);
    });

    it('should only call sortAndLimit for present catalogue data', () => {
      // Arrange
      calculationHelper.sortAndLimit
        .mockReturnValueOnce(['sortedGrossTracks'])
        .mockReturnValueOnce(['sortedNetWorks']);
      analysisData = {
        gross: {
          tracks: randomArrayOfObjects(),
        },
        net: {
          works: randomArrayOfObjects(),
        },
      };
      const limit = randomInt();
      // Act
      const result = statementHelpers.sortAndLimitCatalogueAnalysisData(
        analysisData,
        limit,
      );
      // Assert
      expect(calculationHelper.sortAndLimit).toHaveBeenCalledTimes(2);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(1, analysisData.gross.tracks, 'value', limit);
      expect(calculationHelper.sortAndLimit).toHaveBeenNthCalledWith(2, analysisData.net.works, 'value', limit);

      expect(result.gross.tracks).toEqual(['sortedGrossTracks']);
      expect(result.net.works).toEqual(['sortedNetWorks']);
    });

    it('should handle missing gross and net objects gracefully', () => {
      // Arrange
      analysisData = {};
      const limit = randomInt();
      // Act
      const result = statementHelpers.sortAndLimitCatalogueAnalysisData(
        analysisData,
        limit,
      );
      // Assert
      expect(calculationHelper.sortAndLimit).not.toHaveBeenCalled();
      expect(result).toEqual(analysisData);
    });

    it('should handle missing releases/tracks/works properties gracefully', () => {
      // Arrange
      analysisData = {
        gross: {},
        net: {},
      };
      const limit = randomInt();
      // Act
      const result = statementHelpers.sortAndLimitCatalogueAnalysisData(
        analysisData,
        limit,
      );
      // Assert
      expect(calculationHelper.sortAndLimit).not.toHaveBeenCalled();
      expect(result).toEqual(analysisData);
    });

    it('should keep the remainder of the passed object unmodified', () => {
      // Arrange
      analysisData = {
        ...analysisData,
        someOtherProp: randomArrayOfObjects(),
        anotherProp: randomInt(),
      };
      const limit = randomInt();
      // Act
      const result = statementHelpers.sortAndLimitCatalogueAnalysisData(
        analysisData,
        limit,
      );
      // Assert
      expect(result.someOtherProp).toEqual(analysisData.someOtherProp);
      expect(result.anotherProp).toEqual(analysisData.anotherProp);

      expect(result).not.toBe(analysisData);
      expect(result.gross).not.toBe(analysisData.gross);
      expect(result.net).not.toBe(analysisData.net);
    });
  });
});

function randomCatalogue() {
  return {
    releases: randomArrayOfObjects(),
    tracks: randomArrayOfObjects(),
    works: randomArrayOfObjects(),
  };
}

function randomArrayOfObjects() {
  return randomArray().map(() => ({
    value: randomInt(),
  }));
}
