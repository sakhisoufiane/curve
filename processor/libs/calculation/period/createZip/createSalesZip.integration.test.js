/* eslint-disable no-await-in-loop */
const { randomString, randomId, randomInt, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { testUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const unzipper = require('unzipper');

const Client = require('../../../../models/client');
const Period = require('../../../../models/period');
const Statement = require('../../../../models/statement');
const CreateSalesZips = require('./createSalesZip');
const exportNotication = require('../../../exportNotification/exportNotification');

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

describe('createSalesZip', () => {
  let client;
  let period;
  let statements;
  let files;
  let urls;
  const email = randomString();

  describe('when the client type is Label', () => {
    beforeEach(async () => {
      client = new Client({ name: randomString(), clientType: 'Label' });
      await client.save();

      period = new Period({ clientId: client._id.toString(), name: randomString() });
      await period.save();

      files = [createMockCsv(), createMockCsv(), createMockCsv()];
      urls = [randomString(), randomString(), randomString()];
      statements = [
        new Statement({ clientId: client._id.toString(), periodId: period._id.toString(), salesCsv: files[0].fileKey }),
        new Statement({ clientId: client._id.toString(), periodId: period._id.toString(), salesCsv: files[1].fileKey }),
        new Statement({ clientId: client._id.toString(), periodId: period._id.toString(), salesCsv: files[2].fileKey }),
      ];
      await Statement.bulkSave(statements);

      jest.spyOn(exportNotication, 'sendBulkExportNotification').mockResolvedValue();
    });

    afterEach((done) => {
      testUtils.cleanUp(client._id.toString(), done);
    });

    describe('when the statements total file size is <= max zip size threshold', () => {
      it('should create a single zip file containing the period statements', async () => {
        // Arrange
        jest.spyOn(fileManager, 'downloadFromS3')
          .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[0].filePath))
          .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[1].filePath))
          .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[2].filePath));
        jest.spyOn(fileManager, 'publicLink7Days')
          .mockImplementationOnce((key, cb) => cb(null, urls[0]));
        jest.spyOn(Period, 'updateOne');

        // Act
        await CreateSalesZips.createSalesZips({ client, period, email });

        // Assert
        // The ZIP file should be saved on the Period
        expect(Period.updateOne.mock.calls[0][0]).toEqual({ _id: period._id, clientId: client._id.toString() });
        const zipFileKey = `periods/${period._id.toString()}/${period.name} - Sales CSV Zip 20250101.zip`;
        expect(Period.updateOne.mock.calls[0][1]).toEqual({
          statementSalesExportFileKeys: [zipFileKey],
          statementSalesExportZipsPublicLinks: [urls[0]],
        });

        // The downloaded CSV files should be deleted once zipped
        for (const file of files) expect(fs.existsSync(file.filePath)).toEqual(false);

        // Notification should be for the correct email and include a single ZIP file
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].exportName).toEqual('All Sales');
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].periodName).toEqual(period.name);
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].urls).toHaveLength(1);
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].email).toEqual(email);
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].identifier).toEqual('statementSalesExportZips');

        // The uploaded ZIP should contain the CSV files
        const savedPeriod = await Period.findById(period._id, 'statementSalesExportFileKeys');
        const localFile = await new Promise((resolve, reject) => {
          fileManager.downloadFromS3(savedPeriod.statementSalesExportFileKeys[0], process.env.S3_bucket, null, (err, localFile) => {
            if (err) reject(err);
            else resolve(localFile);
          });
        });

        await new Promise((resolve) => {
          fs.createReadStream(localFile)
            .pipe(unzipper.Extract({ path: `${appRootDir}/tmp` }))
            .on('close', () => resolve());
        });

        for (const file of files) {
          const data = fs.readFileSync(file.filePath).toString('utf-8');
          const lines = data.split('\n');
          expect(lines[0]).toEqual(file.cols);
          expect(lines[1]).toEqual(file.rows);
        }
      });
    });

    describe('when the statements total file size is > max zip size threshold', () => {
      it('should create a multiple zip files containing the period statements', async () => {
        // Arrange
        jest.spyOn(fileManager, 'downloadFromS3')
          .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[0].filePath))
          .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[1].filePath))
          .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[2].filePath));
        jest.spyOn(fileManager, 'publicLink7Days')
          .mockImplementationOnce((key, cb) => cb(null, urls[0]))
          .mockImplementationOnce((key, cb) => cb(null, urls[1]))
          .mockImplementationOnce((key, cb) => cb(null, urls[2]));
        jest.spyOn(Period, 'updateOne');

        // Act
        await CreateSalesZips.createSalesZips({ client, period, email, maxZipSize: -1 });

        // Assert
        // The ZIP file should be saved on the Period
        expect(Period.updateOne.mock.calls[0][0]).toEqual({ _id: period._id, clientId: client._id.toString() });
        const zipFileKey = `periods/${period._id.toString()}/${period.name} - Sales CSV Zip 20250101.zip`;
        expect(Period.updateOne.mock.calls[0][1]).toEqual({
          statementSalesExportFileKeys: [
            zipFileKey,
            zipFileKey.replace('.zip', ' - 002.zip'),
            zipFileKey.replace('.zip', ' - 003.zip'),
          ],
          statementSalesExportZipsPublicLinks: urls,
        });

        // The downloaded CSV files should be deleted once zipped
        for (const file of files) expect(fs.existsSync(file.filePath)).toEqual(false);

        // Notification should be for the correct email and include a single ZIP file
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].exportName).toEqual('All Sales');
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].periodName).toEqual(period.name);
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].urls).toHaveLength(3);
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].email).toEqual(email);
        expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].identifier).toEqual('statementSalesExportZips');

        // Each uploaded ZIP should contain a CSV file
        const savedPeriod = await Period.findById(period._id, 'statementSalesExportFileKeys');
        for (const zipFileKey of savedPeriod.statementSalesExportFileKeys) {
          const localFile = await new Promise((resolve, reject) => {
            fileManager.downloadFromS3(zipFileKey, process.env.S3_bucket, null, (err, localFile) => {
              if (err) reject(err);
              else resolve(localFile);
            });
          });

          await new Promise((resolve) => {
            fs.createReadStream(localFile)
              .pipe(unzipper.Extract({ path: `${appRootDir}/tmp` }))
              .on('close', () => resolve());
          });

          const fileIndex = savedPeriod.statementSalesExportFileKeys.indexOf(zipFileKey);
          const file = files[fileIndex];
          const data = fs.readFileSync(file.filePath).toString('utf-8');
          const lines = data.split('\n');
          expect(lines[0]).toEqual(file.cols);
          expect(lines[1]).toEqual(file.rows);
        }
      });
    });
  });

  describe('when the client type is Publisher', () => {
    beforeEach(async () => {
      client = new Client({ name: randomString(), clientType: 'Publisher' });
      await client.save();

      period = new Period({ clientId: client._id.toString(), name: randomString() });
      await period.save();

      files = [createMockCsv(), createMockCsv(), createMockCsv()];
      urls = [randomString(), randomString(), randomString()];
      statements = [
        new Statement({ clientId: client._id.toString(), periodId: period._id.toString(), salesCsv: files[0].fileKey }),
        new Statement({ clientId: client._id.toString(), periodId: period._id.toString(), salesCsv: files[1].fileKey }),
        new Statement({ clientId: client._id.toString(), periodId: period._id.toString(), salesCsv: files[2].fileKey }),
      ];
      await Statement.bulkSave(statements);

      jest.spyOn(exportNotication, 'sendBulkExportNotification').mockResolvedValue();
    });

    it('should rename the exports to Income (instead of Sales)', async () => {
      // Arrange
      jest.spyOn(fileManager, 'downloadFromS3')
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[0].filePath))
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[1].filePath))
        .mockImplementationOnce((key, bucket, options, cb) => cb(null, files[2].filePath));
      jest.spyOn(fileManager, 'publicLink7Days')
        .mockImplementationOnce((key, cb) => cb(null, urls[0]));
      jest.spyOn(Period, 'updateOne');

      // Act
      await CreateSalesZips.createSalesZips({ client, period, email });

      // Assert
      // The ZIP file should be saved on the Period
      expect(Period.updateOne.mock.calls[0][0]).toEqual({ _id: period._id, clientId: client._id.toString() });
      const zipFileKey = `periods/${period._id.toString()}/${period.name} - Income CSV Zip 20250101.zip`;
      expect(Period.updateOne.mock.calls[0][1]).toEqual({
        statementSalesExportFileKeys: [zipFileKey],
        statementSalesExportZipsPublicLinks: [urls[0]],
      });

      // The downloaded CSV files should be deleted once zipped
      for (const file of files) expect(fs.existsSync(file.filePath)).toEqual(false);

      // Notification should be for the correct email and include a single ZIP file
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].exportName).toEqual('All Sales');
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].periodName).toEqual(period.name);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].urls).toHaveLength(1);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].email).toEqual(email);
      expect(exportNotication.sendBulkExportNotification.mock.calls[0][0].identifier).toEqual('statementSalesExportZips');

      // The uploaded ZIP should contain the CSV files
      const savedPeriod = await Period.findById(period._id, 'statementSalesExportFileKeys');
      const localFile = await new Promise((resolve, reject) => {
        fileManager.downloadFromS3(savedPeriod.statementSalesExportFileKeys[0], process.env.S3_bucket, null, (err, localFile) => {
          if (err) reject(err);
          else resolve(localFile);
        });
      });

      await new Promise((resolve) => {
        fs.createReadStream(localFile)
          .pipe(unzipper.Extract({ path: `${appRootDir}/tmp` }))
          .on('close', () => resolve());
      });

      for (const file of files) {
        const data = fs.readFileSync(file.filePath).toString('utf-8');
        const lines = data.split('\n');
        expect(lines[0]).toEqual(file.cols);
        expect(lines[1]).toEqual(file.rows);
      }
    });

    afterEach((done) => {
      testUtils.cleanUp(client._id.toString(), done);
    });
  });
});
