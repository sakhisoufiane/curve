const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { runExportQuery } = require('./query');

describe('query', () => {
  describe('runExportQuery', () => {
    it('should run a BigQuery EXPORT query', async () => {
      // Arrange
      const bigQuery = {
        query: jest.fn().mockImplementation((query, cb) => cb()),
      };
      const googleStoragePath = randomString();
      const query = {
        query: randomString(),
        params: {
          salesFileId0: [randomId(), randomId(), randomId()],
        },
      };
      // Act
      await runExportQuery({
        bigQuery,
        googleStoragePath,
        query,
      });
      // Assert
      expect(bigQuery.query).toHaveBeenCalledWith(
        {
          query: `EXPORT DATA OPTIONS(uri='${googleStoragePath}', overwrite=true, format='JSON') AS ${query.query}`,
          params: query.params,
        },
        expect.any(Function),
      );
    });
  });
});
