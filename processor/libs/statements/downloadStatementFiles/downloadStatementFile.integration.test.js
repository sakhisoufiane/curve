/* eslint-disable no-await-in-loop */
const { randomString, randomId, randomInt, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { testUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();

const Client = require('../../../models/client');
const Statement = require('../../../models/statement');
const DownloadStatementFiles = require('./downloadStatementFiles');
const exportNotication = require('../../exportNotification/exportNotification');

jest.mock('moment', () => jest.fn(() => ({
  format: jest.fn(() => '20250101'),
})));

jest.mock('@curveroyaltysystems/platform-shared-utils', () => {
  const original = jest.requireActual('@curveroyaltysystems/platform-shared-utils');
  const appRootDir = require('app-root-dir').get();
  return {
    ...original,
    fileManager: {
      downloadFromS3: jest.fn((key, bucket, options, cb) => cb(null, `${appRootDir}/tmp/${key.split('/').pop()}`)),
      publicLink7Days: jest.fn((key, cb) => cb(null, `https://example.com/${key}`)), // <-- realistic URL
      uploadToS3: jest.fn((fileKey, fileLocation, cb) => process.nextTick(() => cb(null, { success: true }))),
    },
  };
});

const createMockCsv = () => {
  const fileKey = `${randomId()}.csv`;
  const filePath = `${appRootDir}/tmp/${fileKey}`;
  const stream = fs.createWriteStream(filePath);
  const cols = [randomString(), randomString(), randomString()].join(',');
  const rows = [randomString(), randomInt(), randomFloat()].join(',');
  stream.write(`${cols}\n`);
  stream.write(`${rows}\n`);
  stream.end();
  return { fileKey, filePath, cols, rows };
};

describe('downloadStatementFiles', () => {
  let client;
  let statements;
  let files;
  let urls;
  const email = randomString();

  beforeEach(async () => {
    client = new Client({ name: randomString() });
    await client.save();

    files = [createMockCsv(), createMockCsv(), createMockCsv()];
    urls = [randomString(), randomString(), randomString()];
    statements = [
      new Statement({ clientId: client._id.toString(), allFilesZip: files[0].fileKey }),
      new Statement({ clientId: client._id.toString(), allFilesZip: files[1].fileKey }),
      new Statement({ clientId: client._id.toString(), allFilesZip: files[2].fileKey }),
    ];
    await Statement.bulkSave(statements);

    jest.spyOn(exportNotication, 'sendBulkExportNotification').mockResolvedValue();
  });

  afterEach((done) => {
    testUtils.cleanUp(client._id.toString(), done);
  });

  describe('when the statements total file size is <= max zip size threshold', () => {
    it('should create a single zip file containing the statements files, and generate a public link', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3')
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[0].filePath))
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[1].filePath))
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[2].filePath));
      jest.spyOn(fileManager, 'publicLink7Days')
        .mockImplementationOnce((key, cb) => cb(null, urls[0]));

      // Act
      await DownloadStatementFiles.downloadStatementFiles([statements[0]._id.toString(), statements[1]._id.toString(), statements[2]._id.toString()], client.name, email);

      // The downloaded CSV files should be deleted once zipped
      for (const file of files) expect(fs.existsSync(file.filePath)).toEqual(false);

      // Notification should be for the correct email and include a single ZIP file
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].exportName).toEqual('Selected Statements');
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].periodName).toEqual(null);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].urls).toHaveLength(1);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].email).toEqual(email);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].identifier).toEqual('statementAllFilesExportZip');
    });
  });

  describe('when the statements total file size is > max zip size threshold', () => {
    it('should create a multiple zip files containing the statements files, and generate public links', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3')
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[0].filePath))
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[1].filePath))
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[2].filePath));
      jest.spyOn(fileManager, 'publicLink7Days')
        .mockImplementationOnce((key, cb) => cb(null, urls[0]))
        .mockImplementationOnce((key, cb) => cb(null, urls[1]))
        .mockImplementationOnce((key, cb) => cb(null, urls[2]));

      // Act
      await DownloadStatementFiles.downloadStatementFiles([statements[0]._id.toString(), statements[1]._id.toString(), statements[2]._id.toString()], client.name, email, -1);

      // Assert
      // The downloaded CSV files should be deleted once zipped
      for (const file of files) expect(fs.existsSync(file.filePath)).toEqual(false);

      // Notification should be for the correct email and include a single ZIP file
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].exportName).toEqual('Selected Statements');
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].periodName).toEqual(null);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].urls).toHaveLength(3);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].email).toEqual(email);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].identifier).toEqual('statementAllFilesExportZip');
    });
  });
});
