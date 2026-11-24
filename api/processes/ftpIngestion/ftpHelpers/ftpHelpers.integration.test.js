const moment = require('moment');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

// File To Test
const FTPLogs = require('../../../models/ftpLogs');
// Models
const { filterDuplicateFiles } = require('./ftpHelpers');

// Constants
const SERVER_SALES_LOG_DATE = moment('2024-01-01').toDate();

describe('ftpHelpers', () => {
  let file1; let file2; let server; let clientId;

  beforeEach(async () => {
    // Setup test data
    clientId = randomId();
    file1 = { path: randomString(), name: randomString(), date: moment('2024-01-01').toDate() };
    file2 = { path: randomString(), name: randomString(), date: moment().toDate() };
    server = { username: randomString(), host: randomString() };

    const serverSalesLog = new FTPLogs({
      clientId,
      type: 'Server Sales',
      files: [
        {
          server: `${server.username}@${server.host}`,
          filename: `${server.username}@${server.host}`,
          dateUploadedToServer: SERVER_SALES_LOG_DATE,
          dateIngested: SERVER_SALES_LOG_DATE,
        },
      ],
    });

    await serverSalesLog.save();
  });

  describe('filterDuplicateFiles', () => {
    it('If a file has alread been ingested and stored in FTPLogs, it should not be returned', async () => {
      // Arrange
      const files = [file1, file2];
      const ignoredFiles = [
        {
          filename: `${file1.path}/${file1.name}`,
          dateIngested: new Date(),
          dateUploadedToServer: new Date(),
          server: `${server.username}@${server.host}`,
        },
      ];
      // Act
      const result = await filterDuplicateFiles({ clientId, files, ignoredFiles, server });
      // Assert
      expect(result).toEqual([file2]);
    });
    it('If a file has been ingested and stored in FTPLogs but the upload date is different, it should be returned and flagged as a duplicate', async () => {
      // Arrange
      const ignoredFiles = [
        {
          filename: `${file1.path}/${file1.name}`,
          dateIngested: moment().format(),
          dateUploadedToServer: file1.date,
          server: `${server.username}@${server.host}`,
        },
      ];

      const modifiedFile1 = { ...file1, date: moment(file1.date).add(1, 'day').toDate() };
      const files = [modifiedFile1, file2];

      // Act
      const result = await filterDuplicateFiles({ clientId, files, ignoredFiles, server });
      // Assert
      expect(result).toEqual([
        {
          ...modifiedFile1,
          isDuplicate: true,
          previous: expect.objectContaining({
            filename: `${file1.path}/${file1.name}`,
            dateUploadedToServer: file1.date,
            server: `${server.username}@${server.host}`,
          }),
        },
        file2,
      ]);
    });
    it('If the same file has been ingested and stored in FTPLogs but the server is different, it should be returned', async () => {
      // Arrange
      // Create a file with a date after the Server Sales log date
      const fileWithLaterDate = { ...file1, date: moment(SERVER_SALES_LOG_DATE).add(1, 'day').toDate() };

      const ignoredFiles = [
        {
          filename: `${file1.path}/${file1.name}`,
          dateIngested: moment().format(),
          dateUploadedToServer: fileWithLaterDate.date,
          server: `${randomString()}@${randomString()}`,
        },
      ];

      const files = [fileWithLaterDate, file2];

      // Act
      const result = await filterDuplicateFiles({ clientId, files, ignoredFiles, server });
      // Assert
      expect(result).toEqual([fileWithLaterDate, file2]);
    });
    it("If a file has NOT been ingested and but the upload date if BEFORE 'Server Sales' FTPLog date, it should NOT be returned", async () => {
      // Arrange
      const fileWithEarlierDate = { ...file1, date: moment(SERVER_SALES_LOG_DATE).subtract(1, 'day').toDate() };
      const files = [fileWithEarlierDate, file2];
      const ignoredFiles = [];
      // Act
      const result = await filterDuplicateFiles({ clientId, files, ignoredFiles, server });
      // Assert
      expect(result).toEqual([file2]);
    });
    it("If a file has NOT been ingested and but the upload date if AFTER 'Server Sales' FTPLog date, it should be returned", async () => {
      // Arrange
      const fileWithLaterDate = { ...file1, date: moment(SERVER_SALES_LOG_DATE).add(1, 'day').toDate() };
      const files = [fileWithLaterDate, file2];
      const ignoredFiles = [];
      // Act
      const result = await filterDuplicateFiles({ clientId, files, ignoredFiles, server });
      // Assert
      expect(result).toEqual([fileWithLaterDate, file2]);
    });
    it('If Server Sales FTPLog can\'t be found, it should return all files', async () => {
      // Arrange
      const files = [file1, file2];
      const ignoredFiles = [];
      await FTPLogs.deleteOne({ clientId, type: 'Server Sales' });
      // Act
      const result = await filterDuplicateFiles({ clientId, files, ignoredFiles, server });
      // Assert
      expect(result).toEqual([file1, file2]);
    });
    it('If Server Sales FTPLog can\'t be found, but there are ignored files for each file, it should NOT return all files', async () => {
      // Arrange
      const files = [file1, file2];
      const ignoredFiles = [
        {
          filename: `${file1.path}/${file1.name}`,
          dateIngested: moment().format(),
          dateUploadedToServer: file1.date,
          server: `${server.username}@${server.host}`,
        },
        {
          filename: `${file2.path}/${file2.name}`,
          dateIngested: moment().format(),
          dateUploadedToServer: file2.date,
          server: `${server.username}@${server.host}`,
        },
      ];
      await FTPLogs.deleteOne({ clientId, type: 'Server Sales' });
      // Act
      const result = await filterDuplicateFiles({ clientId, files, ignoredFiles, server });
      // Assert
      expect(result).toEqual([]);
    });
  });
});
