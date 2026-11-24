/* eslint-disable no-await-in-loop */
/* eslint-disable no-promise-executor-return */
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const unzipper = require('unzipper');
const { ObjectId } = require('mongodb');

const AllSalesCsv = require('./index');
const config = require('../../../../config.json');
const Client = require('../../../../models/client');
const Period = require('../../../../models/period');
const Statement = require('../../../../models/statement');
const GoogleStorage = require('../../../../controllers/googleStorage');

describe('allSalesCsv', () => {
  let periodId;

  beforeEach(() => {
    periodId = randomId();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTableCount', () => {
    it('should return the total count of rows in a BigQuery table', async () => {
      // Arrange
      const bigQueryGetCount = { getCount: jest.fn().mockImplementation((table, count, filter, cb) => cb(null, [{ count: 100 }])) };
      // Act
      const count = await AllSalesCsv.getTableCount(bigQueryGetCount, 'salesInput', { periodId });
      // Assert
      expect(count).toEqual(100);
    });
  });

  describe('createFileKeys', () => {
    describe('when there is a single file', () => {
      it('should return a single file key with a csv and zip field', () => {
        // Act
        const fileKeys = AllSalesCsv.createFileKeys('periods/1/allSalesExport1', 1);
        // Assert
        expect(fileKeys).toEqual([{
          csv: 'periods/1/allSalesExport1.csv',
          zip: 'periods/1/allSalesExport1.zip',
        }]);
      });
    });

    describe('when there are multiple files', () => {
      it('should return multiple file keys with csv and zip fields', () => {
        // Act
        const fileKeys = AllSalesCsv.createFileKeys('periods/1/allSalesExport1', 2);
        // Assert
        expect(fileKeys).toEqual([
          {
            csv: 'periods/1/allSalesExport1 - 01.csv',
            zip: 'periods/1/allSalesExport1 - 01.zip',
          },
          {
            csv: 'periods/1/allSalesExport1 - 02.csv',
            zip: 'periods/1/allSalesExport1 - 02.zip',
          },
        ]);
      });
    });
  });

  describe('getSignedS3Urls', () => {
    it('should generate signed S3 urls for the specified file keys', async () => {
      // Arrange
      const fileKeys = ['periods/1/export - 01.zip', 'periods/1/export - 02.zip'];
      const fakeS3Urls = [randomString(), randomString()];
      jest.spyOn(fileManager, 'publicLink7Days')
        .mockImplementationOnce((fileKey, cb) => cb(null, fakeS3Urls[0]))
        .mockImplementationOnce((fileKey, cb) => cb(null, fakeS3Urls[1]));
      // Act
      const urls = await AllSalesCsv.getSignedS3Urls(fileKeys);
      // Assert
      expect(urls).toEqual([
        {
          name: 'export - 01.zip',
          url: fakeS3Urls[0],
        },
        {
          name: 'export - 02.zip',
          url: fakeS3Urls[1],
        },
      ]);
    });
  });

  describe('saveFileKeys', () => {
    it('should save specified file keys on a period', async () => {
      // Arrange
      const periodId = randomId();
      const clientId = randomId();
      const fileKeys = ['periods/1/export1', 'periods/1/export2'];
      const urls = [randomString(), randomString()];
      jest.spyOn(Period, 'updateOne').mockResolvedValueOnce();
      // Act
      await AllSalesCsv.saveFileKeys(periodId, clientId, fileKeys, urls);
      // Assert
      expect(Period.updateOne).toHaveBeenCalledWith(
        { _id: periodId, clientId },
        { salesExportFileKeys: fileKeys, salesExportZipsPublicLinks: urls },
      );
    });
  });

  describe('createCsvStream', () => {
    it('should create a csv file stream from a file key', () => {
      // Arrange
      const fileKey = 'periods/1/allSalesExport.csv';
      const mockRandom = Math.random();
      jest.spyOn(Math, 'random').mockReturnValueOnce(mockRandom);
      const min = 100000;
      const max = 999999;
      const mockId = Math.floor(mockRandom * (max - min + 1)) + min;
      // Act
      const { csvStream, fileLocation, fileName } = AllSalesCsv.createCsvStream(fileKey);
      // Assert
      expect(csvStream).toBeInstanceOf(fs.WriteStream);
      expect(fileLocation).toEqual(`${appRootDir}/tmp/${mockId}-allSalesExport.csv`);
      expect(fileName).toEqual(`${mockId}-allSalesExport.csv`);
    });
  });

  describe('createZipStream', () => {
    it('should create a zip file stream from a file key', () => {
      // Arrange
      const fileKey = 'periods/1/allSalesExport.zip';
      const mockRandom = Math.random();
      jest.spyOn(Math, 'random').mockReturnValueOnce(mockRandom);
      const min = 100000;
      const max = 999999;
      const mockId = Math.floor(mockRandom * (max - min + 1)) + min;
      // Act
      const { outputStream, zipStream, fileLocation } = AllSalesCsv.createZipStream(fileKey);
      // Assert
      expect(outputStream).toBeInstanceOf(fs.WriteStream);
      expect(zipStream.constructor.name).toEqual('Archiver');
      expect(fileLocation).toEqual(`${appRootDir}/tmp/${mockId}-allSalesExport.zip`);
    });
  });

  describe('runExportQuery', () => {
    it('should run a data export query on BigQuery', async () => {
      // Arrange
      const bigQuery = { query: jest.fn().mockImplementation((query, cb) => cb(null)) };
      const googleStoragePath = 'gs://bucket/file';
      const query = 'SELECT salesLineId, units FROM salesTable LIMIT 100';
      // Act
      await AllSalesCsv.runExportQuery({ bigQuery, googleStoragePath, query });
      // Assert
      expect(bigQuery.query).toHaveBeenCalledWith(expect.stringContaining(`EXPORT DATA OPTIONS(uri='${googleStoragePath}', overwrite=true, format='JSON') AS ${query}`), expect.any(Function));
    });
  });

  describe('downloadQueryExportFiles', () => {
    let bucketFileName;
    const bucketName = randomString();
    const files = [
      { name: 'allSalesExport-0001.json' },
      { name: 'allSalesExport-0002.json' },
    ];
    let listAllFilesSpy;
    let downloadFileSpy;
    let mockId;

    const createFile = async (name, data) => {
      const stream = fs.createWriteStream(`${appRootDir}/tmp/${name}`);
      for (const row of data) stream.write(`${JSON.stringify(row)}\n`);
      const finished = new Promise((resolve) => stream.once('finish', resolve));
      stream.end();
      await finished;
    };

    beforeEach(() => {
      bucketFileName = 'allSalesExport';
      listAllFilesSpy = jest
        .spyOn(GoogleStorage.prototype, 'listAllFiles')
        .mockResolvedValue(files);
      downloadFileSpy = jest
        .spyOn(GoogleStorage.prototype, 'downloadFile')
        .mockResolvedValue();
      const mockRandom = Math.random();
      jest.spyOn(Math, 'random').mockReturnValue(mockRandom);
      const min = 100000;
      const max = 999999;
      mockId = Math.floor(mockRandom * (max - min + 1)) + min;
    });

    it('should download BigQuery export files from Google Storage', async () => {
      // Arrange
      await createFile(files[0].name, [{ salesLineId: randomId() }]);
      await createFile(files[1].name, [{ salesLineId: randomId() }]);
      const onFileReady = jest.fn();
      // Act
      await AllSalesCsv.downloadQueryExportFiles({
        bucketName,
        bucketFileName,
        template: config.exportTemplates.sales,
        fileKeys: [{ csv: 'periods/1/allSalesExport.csv' }],
        headers: ['col1', 'col2', 'col3'],
        logKey: '',
        onFileReady,
      });
      // Assert
      await expect(listAllFilesSpy.mock.results[0].value).resolves.toEqual(files);
      expect(downloadFileSpy).toHaveBeenCalledTimes(2);
      expect(downloadFileSpy).toHaveBeenNthCalledWith(
        1,
        { file: files[0].name, destination: `${appRootDir}/tmp/${files[0].name}` },
      );
      expect(downloadFileSpy).toHaveBeenNthCalledWith(
        2,
        { file: files[1].name, destination: `${appRootDir}/tmp/${files[1].name}` },
      );
      expect(onFileReady).toHaveBeenCalledTimes(1);
      expect(onFileReady).toHaveBeenCalledWith({
        fileKey: { csv: 'periods/1/allSalesExport.csv' },
        fileLocation: `${appRootDir}/tmp/${mockId}-allSalesExport.csv`,
      });
    });

    it('should convert downloaded export files to a single csv file', async () => {
      // Arrange
      const lines = [
        { salesFileId: randomId(), units: 1 },
        { salesFileId: randomId(), units: 2 },
      ];
      await createFile(files[0].name, [lines[0]]);
      await createFile(files[1].name, [lines[1]]);
      const template = config.exportTemplates.sales.filter((col) => ['salesFileId', 'units'].includes(col.field));
      let fileLocation;
      const onFileReady = jest.fn().mockImplementation(({ fileKey, fileLocation: filePath }) => {
        fileLocation = filePath;
      });
      // Act
      await AllSalesCsv.downloadQueryExportFiles({
        bucketName,
        bucketFileName,
        template,
        fileKeys: [{ csv: 'periods/1/allSalesExport.csv' }],
        headers: template.map((col) => col.header),
        onFileReady,
        logKey: '',
      });
      // Assert
      const outputPath = `${appRootDir}/tmp/${mockId}-allSalesExport.csv`;
      expect(fileLocation).toEqual(outputPath);
      const data = fs.readFileSync(outputPath, 'utf-8');
      expect(data).toMatch([
        'Sales File ID,Units',
        Object.values(lines[0]).join(','),
        Object.values(lines[1]).join(','),
        '',
      ].join('\n'));
      expect(onFileReady).toHaveBeenCalledTimes(1);
      expect(onFileReady).toHaveBeenCalledWith({
        fileKey: { csv: 'periods/1/allSalesExport.csv' },
        fileLocation: outputPath,
      });
    });

    it('should delete the BigQuery export files once converted to CSV', async () => {
      // Arrange
      const bucketFileName = 'allSalesExport';
      await createFile(files[0].name, [{ salesLineId: randomId() }]);
      await createFile(files[1].name, [{ salesLineId: randomId() }]);
      const onFileReady = jest.fn();
      // Act
      await AllSalesCsv.downloadQueryExportFiles({
        bucketName,
        bucketFileName,
        template: config.exportTemplates.sales,
        fileKeys: [{ csv: 'periods/1/allSalesExport.csv' }],
        headers: ['col1', 'col2', 'col3'],
        onFileReady,
        logKey: '',
      });
      // Assert
      expect(fs.existsSync(`${appRootDir}/tmp/${files[0].name}`)).toEqual(false);
      expect(fs.existsSync(`${appRootDir}/tmp/${files[1].name}`)).toEqual(false);
      expect(onFileReady).toHaveBeenCalledTimes(1);
    });

    it('should zip the converted csv file when above the size threshold', async () => {
      // Arrange
      const file1lines = [
        { salesFileId: randomId(), units: 1 },
        { salesFileId: randomId(), units: 2 },
      ];
      const file2lines = [
        { salesFileId: randomId(), units: 3 },
        { salesFileId: randomId(), units: 4 },
      ];
      await createFile(files[0].name, file1lines);
      await createFile(files[1].name, file2lines);
      const template = config.exportTemplates.sales.filter((col) => ['salesFileId', 'units'].includes(col.field));

      const fileLocations = [];
      const onFileReady = jest.fn().mockImplementation(async ({ fileKey, fileLocation: filePath }) => {
        fileLocations.push(filePath);
        return Promise.resolve();
      });

      // Act
      await AllSalesCsv.downloadQueryExportFiles({
        bucketName,
        bucketFileName,
        template,
        fileKeys: [
          { csv: 'periods/1/allSalesExport-01.csv', zip: 'periods/1/allSalesExport-01.zip' },
          { csv: 'periods/1/allSalesExport-02.csv', zip: 'periods/1/allSalesExport-02.zip' },
        ],
        headers: template.map((col) => col.header),
        onFileReady,
        linesPerFile: 2,
        logKey: '',
      });
      // Assert
      expect(fileLocations).toHaveLength(2);
      expect(fileLocations).toEqual([
        `${appRootDir}/tmp/${mockId}-allSalesExport-01.zip`,
        `${appRootDir}/tmp/${mockId}-allSalesExport-02.zip`,
      ]);

      // Open the zipped exports
      for (let i = 0; i < fileLocations.length; i += 1) {
        const fileLocation = fileLocations[i];
        const unzipPath = `${appRootDir}/tmp/allSalesExport-unzipped-${i}`;
        await new Promise((resolve) => {
          fs.createReadStream(fileLocation)
            .pipe(unzipper.Extract({ path: unzipPath }))
            .on('close', () => resolve());
        });
        const filesInZip = fs.readdirSync(unzipPath);
        const csvFileName = `${mockId}-allSalesExport-0${i + 1}.csv`;
        expect(filesInZip).toEqual([csvFileName]);

        // Check data in the CSV file
        const data = fs.readFileSync(`${unzipPath}/${csvFileName}`, 'utf-8');
        const expectedFileLines = i === 0 ? file1lines : file2lines;
        expect(data).toMatch([
          'Sales File ID,Units',
          Object.values(expectedFileLines[0]).join(','),
          Object.values(expectedFileLines[1]).join(','),
          '',
        ].join('\n'));

        // The CSV should be deleted after zipping
        expect(fs.existsSync(`${appRootDir}/tmp/${csvFileName}`)).toEqual(false);
      }
    });
  });

  describe('zipFile', () => {
    it('should write a file to a zip stream', async () => {
      // Arrange
      const mockRandom = Math.random();
      jest.spyOn(Math, 'random').mockReturnValueOnce(mockRandom);
      const min = 100000;
      const max = 999999;
      const mockId = Math.floor(mockRandom * (max - min + 1)) + min;
      const zipFileKey = 'periods/1/allSalesExport.zip';
      const fileToZipName = randomId();
      const fileToZipLocation = `${appRootDir}/tmp/${fileToZipName}`;
      const stream = fs.createWriteStream(fileToZipLocation);
      stream.write('some,export,data');
      const finished = new Promise((resolve) => stream.once('finish', resolve));
      stream.end();
      await finished;
      // Act
      const { fileLocation } = await AllSalesCsv.zipFile({ zipFileKey, fileToZipLocation, fileToZipName });
      // Assert
      expect(fileLocation).toEqual(`${appRootDir}/tmp/${mockId}-allSalesExport.zip`);
      expect(fs.existsSync(fileLocation)).toEqual(true);
    });
  });

  describe('getExportDetails', () => {
    let period;

    beforeEach(() => {
      period = { _id: new ObjectId(), clientId: randomId() };
      jest.spyOn(Statement, 'find').mockReturnValue({
        lean: jest.fn().mockReturnValue(Promise.resolve([
          { partitionNo: 1 },
          { partitionNo: 2 },
          { partitionNo: 2 },
        ])),
      });
    });

    it('should return client configuration details for the export', async () => {
      // Arrange
      jest.spyOn(Client, 'findById').mockResolvedValueOnce({ name: 'Export Client' });
      // Act
      const details = await AllSalesCsv.getExportDetails(period);
      // Assert
      expect(details.client).toEqual({ name: 'Export Client' });
    });

    describe('when the client type is Label', () => {
      it('should use the default sales export template', async () => {
        // Arrange
        jest.spyOn(Client, 'findById').mockResolvedValueOnce({ clientType: 'Label' });
        // Act
        const details = await AllSalesCsv.getExportDetails(period);
        // Assert
        expect(details.template).toEqual(config.exportTemplates.sales);
      });
    });

    describe('when the client type is Publisher', () => {
      it('should use the publishing sales export template', async () => {
        // Arrange
        jest.spyOn(Client, 'findById').mockResolvedValueOnce({ clientType: 'Publisher' });
        // Act
        const details = await AllSalesCsv.getExportDetails(period);
        // Assert
        expect(details.template).toEqual(config.exportTemplates.salesPublishing);
      });
    });

    describe('when the Period contract type is Mechanical', () => {
      it('should use the mechanical sales export template', async () => {
        // Arrange
        jest.spyOn(Client, 'findById').mockResolvedValueOnce({});
        // Act
        const details = await AllSalesCsv.getExportDetails({ ...period, contractType: 'Mechanical' });
        // Assert
        expect(details.template).toEqual(config.exportTemplates.mechanicals);
      });
    });

    it('should retrieve a unique array of statement partition nos', async () => {
      // Arrange
      jest.spyOn(Client, 'findById').mockResolvedValueOnce({});
      // Act
      const details = await AllSalesCsv.getExportDetails(period);
      // Assert
      expect(details.statementPartitionNos).toEqual([1, 2]);
    });
  });
});
