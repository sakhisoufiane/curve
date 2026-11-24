/* eslint-disable no-await-in-loop */
const { randomString, randomId, randomFloat } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const unzipper = require('unzipper');
const { stringify } = require('csv-stringify/sync');

const AllSalesCsv = require('./allSalesCsv');
const Client = require('../../../../models/client');
const Period = require('../../../../models/period');
const Notification = require('../../../../models/notification');
const GoogleStorage = require('../../../../controllers/googleStorage');

jest.mock('moment', () => jest.fn(() => ({ format: jest.fn(() => '20250101') })));
jest.mock('@curveroyaltysystems/platform-shared-utils', () => {
  const actual = jest.requireActual('@curveroyaltysystems/platform-shared-utils');
  return {
    ...actual,
    BigQuery: jest.fn(),
  };
});

describe('All Sales Export Integration Tests', () => {
  let client;
  let clientId;
  let period;
  let periodId;
  let email;
  let salesLines = [];
  const exportFileCount = 3; // Number of mock GS export files

  const mockSingleFileExport = () => {
    const bucketName = 'all-period-sales-export';
    const bucketFileName = `${client.bigQueryPeriodSales}-${periodId}-20250101-export-`;
    const googleStoragePath = `gs://${bucketName}/${bucketFileName}*.json`;

    // Setup fake Google Storage export files
    const files = [];
    for (let i = 0; i < exportFileCount; i += 1) {
      const localFileName = googleStoragePath.split('/').pop();
      files.push({ name: localFileName.replace('*', `0${i + 1}`) });
    }

    jest.spyOn(GoogleStorage.prototype, 'listAllFiles').mockResolvedValue(files);
    jest.spyOn(GoogleStorage.prototype, 'downloadFile')
      .mockImplementation(async ({ file, destination }) => {
        const localPath = `${process.env.APP_ROOT_DIR}/tmp/${file}`;
        fs.writeFileSync(
          localPath,
          salesLines.map((line) => JSON.stringify(line)).join('\n'),
        );
        return localPath;
      });
  };

  beforeEach(async () => {
    clientId = randomId();
    periodId = randomId();
    email = randomString();

    client = new Client({
      _id: clientId,
      name: randomString(),
      bigQueryPeriodSales: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    const fakeRow = () => ({
      periodId,
      contractId: randomId(),
      salesFileId: randomId(),
      salesLineId: randomId(),
      contractName: `"${randomString()}","${randomString()}" - "${randomString()}"`,
      units: randomFloat(),
      grossAmount: randomFloat(),
    });

    salesLines = [fakeRow(), fakeRow(), fakeRow(), fakeRow(), fakeRow()];

    period = new Period({
      _id: periodId,
      clientId,
      name: randomString(),
    });
    await period.save();

    BigQuery.mockImplementation(() => ({
      getCount: jest.fn().mockImplementation((table, col, filter, cb) => cb(null, [{ count: (salesLines.length * exportFileCount) }])),
      getDataQuery: jest.fn().mockReturnValue(randomString()),
      query: jest.fn().mockImplementation((query, cb) => cb(null)),
    }));

    jest.spyOn(Notification, 'generate').mockImplementation((name, description, link, options, cb) => cb(null));
    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((name, fileLocation, cb) => cb(null));
    jest.spyOn(fileManager, 'publicLink7Days').mockImplementation((fileKey, cb) => cb(null, randomString()));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when <= the sales lines threshold', () => {
    beforeEach(() => {
      mockSingleFileExport();
    });

    it('should throw an error when no period id and email specified', async () => {
    // Act
      try {
        await AllSalesCsv.create(randomId());
      } catch (err) {
      // Assert
        expect(err).toBeDefined();
      }
    });

    it('should throw an error if the period cannot be found', async () => {
    // Arrange
      const periodId = randomId();
      // Act
      try {
        await AllSalesCsv.create(periodId, email);
      } catch (err) {
      // Assert
        expect(err).toBeDefined();
        expect(err.message).toEqual(`No Period found with ID ${periodId}`);
      }
    });

    it('should export a single csv file', async () => {
      // Act
      await AllSalesCsv.create(period._id.toString(), email);
      // Assert

      // Single CSV export for the Period should be uploaded to S3
      expect(fileManager.uploadToS3.mock.calls[0][0].startsWith(`periods/${periodId}/${period.name} All Calculated Sales Export`)).toEqual(true);
      expect(fileManager.uploadToS3.mock.calls[0][0].endsWith('.csv')).toEqual(true);

      // File key should have been saved on the Period
      const { salesExportFileKeys } = await Period.findById(period._id, 'salesExportFileKeys');
      expect(salesExportFileKeys.length).toEqual(1);
      expect(salesExportFileKeys[0].startsWith(`periods/${periodId}/${period.name} All Calculated Sales Export`)).toEqual(true);
      expect(salesExportFileKeys[0].endsWith('.csv')).toEqual(true);

      // Notification should include a single S3 public link
      expect(Notification.generate.mock.calls[0][2]).toBeDefined();
      expect(Notification.generate.mock.calls[0][3]).toMatchObject({
        identifier: 'salesExportZips',
        subject: `Your All Sales Export for ${period.name} is Ready For Download`,
        email,
      });
      expect(Notification.generate.mock.calls[0][3]).not.toHaveProperty('urls');

      // File should have the expected data
      const file = fs.readFileSync(fileManager.uploadToS3.mock.calls[0][1]).toString('utf-8');
      const lines = file.split('\n');

      // Check the special BOM character is present
      // This ensures the file is UTF-8 encoded and can be opened in Excel without issues
      const hasBOM = file.charCodeAt(0) === 0xFEFF;
      expect(hasBOM).toEqual(true);

      // File should include all sales lines (sales lines * export files) + 2 (header + trailer line)
      expect(lines.length).toEqual((salesLines.length * 3) + 2);
      for (const expectedLine of salesLines) {
        const lineStr = `${expectedLine.salesFileId},${expectedLine.periodId},${expectedLine.contractId}`;
        const actualLine = lines.find((line) => line.startsWith(lineStr));
        expect(actualLine).toBeDefined();
      }
    });

    it('should escape special csv characters', async () => {
    // Act
      await AllSalesCsv.create(period._id.toString(), email);
      // Assert
      // File should have the expected data AND commas/double quotes escaped correctly
      const file = fs.readFileSync(fileManager.uploadToS3.mock.calls[0][1]).toString('utf-8');
      const lines = file.split('\n');
      for (const expectedLine of salesLines) {
        const lineStr = stringify([[
          expectedLine.salesFileId,
          expectedLine.periodId,
          expectedLine.contractId,
          expectedLine.contractName,
        ]]).replace('\n', '');
        const actualLine = lines.find((line) => line.startsWith(lineStr));
        expect(actualLine).toBeDefined();
      }
    });
  });

  describe('when > sales lines threshold', () => {
    it('should export multiple zipped csv files', async () => {
      // Arrange
      const mockRandom = Math.random();
      jest.spyOn(Math, 'random').mockReturnValue(mockRandom);

      // Google Export needs mocking again but with each line in a different file
      const bucketName = 'all-period-sales-export';
      const bucketFileName = `${client.bigQueryPeriodSales}-${periodId}-20250101-export-`;
      const googleStoragePath = `gs://${bucketName}/${bucketFileName}*.json`;

      // Setup fake Google Storage export files
      const files = [];
      for (let i = 0; i < exportFileCount; i += 1) {
        const localFileName = googleStoragePath.split('/').pop();
        files.push({ name: localFileName.replace('*', `0${i + 1}`) });
      }

      jest.spyOn(GoogleStorage.prototype, 'listAllFiles').mockResolvedValue(files);
      jest.spyOn(GoogleStorage.prototype, 'downloadFile')
        .mockImplementation(async ({ file, destination }) => {
          const localPath = `${process.env.APP_ROOT_DIR}/tmp/${file}`;
          fs.writeFileSync(
            localPath,
            salesLines.map((line) => JSON.stringify(line)).join('\n'),
          );
          return localPath;
        });

      const linesPerFile = 2;

      // Act
      await AllSalesCsv.create(period._id.toString(), email, linesPerFile);

      // Assert
      // 3 export files from GS, 5 lines per file = 15 lines total
      // Split into batches of 2 lines per file
      // Total zips = 15 / 2 = 7.5 => 8 zips

      // 8 zip files should have been uploaded to S3
      const zippedFileCount = Math.ceil((salesLines.length * exportFileCount) / linesPerFile);
      expect(fileManager.uploadToS3).toHaveBeenCalledTimes(zippedFileCount);

      // Every upload should be a zipped file and have the correct index appended to the file name
      for (let i = 0; i < salesLines.length; i += 1) {
        const [name, fileLocation] = fileManager.uploadToS3.mock.calls[i];
        expect(name.startsWith(`periods/${periodId}/${period.name} All Calculated Sales Export`));
        expect(name.endsWith(` - 0${i + 1}.zip`)).toEqual(true);
        expect(fileLocation.endsWith(` - 0${i + 1}.zip`)).toEqual(true);
      }

      // File keys should have been saved on the Period
      const { salesExportFileKeys } = await Period.findById(period._id, 'salesExportFileKeys');
      expect(salesExportFileKeys.length).toEqual(zippedFileCount);
      for (let i = 0; i < salesExportFileKeys.length; i += 1) {
        const key = salesExportFileKeys[i];
        expect(key.endsWith(` - 0${i + 1}.zip`)).toEqual(true);
      }

      // Notification should include multiple S3 public links
      expect(Notification.generate.mock.calls[0][2]).toEqual('');
      expect(Notification.generate.mock.calls[0][3]).toMatchObject({
        identifier: 'salesExportZips',
        subject: `Your All Sales Export for ${period.name} is Ready For Download`,
        email,
        urls: expect.any(Array),
      });
      expect(Notification.generate.mock.calls[0][3].urls.length).toEqual(zippedFileCount);
      for (let i = 0; i < Notification.generate.mock.calls[0][3].urls.length; i += 1) {
        const { name, url } = Notification.generate.mock.calls[0][3].urls[i];
        expect(name.startsWith(`${period.name} All Calculated Sales Export`)).toEqual(true);
        expect(name.endsWith(` - 0${i + 1}.zip`)).toEqual(true);
        expect(url).toBeDefined();
      }

      // Zipped files should include the correct data
      const outputDir = `${process.env.APP_ROOT_DIR}/tmp`;
      const exportedData = [];
      for (const [key, fileLocation] of fileManager.uploadToS3.mock.calls) {
        await new Promise((resolve) => {
          fs.createReadStream(fileLocation)
            .pipe(unzipper.Extract({ path: outputDir }))
            .on('close', () => resolve());
        });

        const csvFileName = fileLocation.split('/').pop().replace('.zip', '.csv');
        const csvFileLocation = `${outputDir}/${csvFileName}`;

        const file = fs.readFileSync(csvFileLocation).toString('utf-8');
        const lines = file.split('\n');

        // Check the special BOM character is present
        // This ensures the file is UTF-8 encoded and can be opened in Excel without issues
        const hasBOM = file.charCodeAt(0) === 0xFEFF;
        expect(hasBOM).toEqual(true);

        // Each file should include a header row, trailer row and a 1-2 data rows
        if (fileLocation.endsWith(' - 08.zip')) {
          // Last file should have a single remaining data row
          expect(lines.length).toEqual(3);
        } else {
          expect(lines.length).toEqual(4);
        }
        // Save the data row for checking after
        exportedData.push(lines[1]);
      }

      // Check all data has been exported
      for (const expectedLine of salesLines) {
        const lineStr = `${expectedLine.salesFileId},${expectedLine.periodId},${expectedLine.contractId}`;
        const actualLine = exportedData.find((line) => line.startsWith(lineStr));
        expect(actualLine).toBeDefined();
      }
    });
  });
});
