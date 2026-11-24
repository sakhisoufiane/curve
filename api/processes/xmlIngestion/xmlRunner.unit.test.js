const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Client = require('../../models/client');
const xmlIngestion = require('./index');

const { clientSpecificFeeds } = require('./xmlRunnerTypes');

describe('xmlRunner', () => {
  const clientSftp = {
    _id: randomId(),
    name: randomString(),
    clientType: 'Publisher',
    ftpHost: randomString(),
    ftpUsername: randomString(),
    ftpPassword: randomString(),
    ftpPort: 22,
    ftpProtocol: 'SFTP',
    ftpAuthenticationType: 'Key File',
    ftpFileKey: randomString(),
    ftpRootDir: '/',
    ftpNoDdexBatches: false,
  };

  const clientFtp = {
    _id: randomId(),
    name: randomString(),
    clientType: 'Publisher',
    ftpHost: randomString(),
    ftpUsername: randomString(),
    ftpPassword: randomString(),
    ftpPort: 21,
    ftpProtocol: 'FTP',
    ftpRootDir: '/',
    ftpNoDdexBatches: false,
  };

  beforeEach(() => {
    xmlIngestion.ingest = jest.fn().mockImplementation((
      params,
      clientId,
      rootDir,
      noDdexBatches,
      defaultDistributionChannel,
      labelMappings,
      setDefaultReleaseIdOnImport,
      ingestForeignIds,
      useBarcodeAsCatNoOnImport,
      otherIdsOnImport,
      howToIngestOtherIdsOnImport,
      ddexDoNotUpdateExistingLabel,
      callback,
    ) => callback(null));
  });

  describe('clientSpecificFeeds', () => {
    it('should call xmlIngestion.ingest with correct SFTP parameters from client', async () => {
      Client.find = jest.fn().mockResolvedValue([clientSftp]);
      clientSftp.contractLabels = jest.fn().mockImplementation((cb) => cb(null, ['mock label']));

      clientSpecificFeeds(() => {
        expect(Client.find).toHaveBeenCalledTimes(1);
        expect(xmlIngestion.ingest).toHaveBeenCalledTimes(1);
        expect(xmlIngestion.ingest.mock.calls[0][0]).toEqual({
          protocol: clientSftp.ftpProtocol,
          host: clientSftp.ftpHost,
          username: clientSftp.ftpUsername,
          password: clientSftp.ftpPassword,
          port: clientSftp.ftpPort,
          authenticationType: clientSftp.ftpAuthenticationType,
          privateKey: clientSftp.ftpFileKey,
        });
      });
    });

    it('should call xmlIngestion.ingest with correct FTP parameters from client', async () => {
      Client.find = jest.fn().mockResolvedValue([clientFtp]);
      clientFtp.contractLabels = jest.fn().mockImplementation((cb) => cb(null, ['mock label']));

      clientSpecificFeeds(() => {
        expect(Client.find).toHaveBeenCalledTimes(1);
        expect(xmlIngestion.ingest).toHaveBeenCalledTimes(1);
        expect(xmlIngestion.ingest.mock.calls[0][0]).toEqual({
          protocol: clientFtp.ftpProtocol,
          host: clientFtp.ftpHost,
          username: clientFtp.ftpUsername,
          password: clientFtp.ftpPassword,
          port: clientFtp.ftpPort,
          authenticationType: clientFtp.ftpAuthenticationType,
          privateKey: clientFtp.ftpFileKey,
        });
      });
    });
  });
});
