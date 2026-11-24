/* eslint-disable no-promise-executor-return */
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const FileUtils = require('./fileUtils');

describe('fileUtils', () => {
  describe('createZipStream', () => {
    it('should create a zip stream', () => {
      // Arrange
      const filePath = `${appRootDir}/tmp/${randomId()}`;
      // Act
      const { outputStream, zipStream } = FileUtils.createZipStream(filePath);
      // Assert
      expect(outputStream).toBeInstanceOf(fs.WriteStream);
      expect(zipStream.constructor.name).toEqual('Archiver');
      expect(outputStream.path).toEqual(filePath);
    });
  });

  describe('getFileSize', () => {
    it('should return the size of a local file in MB', () => {
      // Arrange
      jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1_500_000 });
      // Act
      const size = FileUtils.getFileSize(randomString());
      // Assert
      expect(size).toEqual(1);
    });
  });

  describe('closeStream', () => {
    it('should wait for a stream to finish before closing', async () => {
      // Arrange
      const { outputStream, zipStream } = FileUtils.createZipStream(`${appRootDir}/tmp/${randomId()}`);
      // Act
      await FileUtils.closeStream(outputStream, zipStream);
      // Assert
      expect(outputStream.destroyed).toEqual(true);
    });
  });

  describe('uploadFile', () => {
    it('should upload a statement zip to S3', async () => {
      // Arrange
      const fileKey = `statements/${randomId()}/All Calculated Sales.zip`;
      const filePath = randomString();
      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((fileKey, fileLocation, callback) => {
        callback(null, filePath);
      });
      // Act
      await FileUtils.uploadFile(filePath, fileKey);
      // Assert
      expect(fileManager.uploadToS3.mock.calls[0][0]).toEqual(fileKey);
      expect(fileManager.uploadToS3.mock.calls[0][1]).toEqual(filePath);
    });
  });

  describe('addFileToZip', () => {
    it('should add a file to a zip stream', async () => {
      // Arrange
      const csvFilePath = `${appRootDir}/tmp/${randomId()}.csv`;
      const stream = fs.createWriteStream(csvFilePath);
      stream.write('some,export,data');
      const finished = new Promise((resolve) => stream.once('close', resolve));
      stream.end();
      await finished;
      const zipFilePath = `${appRootDir}/tmp/${randomId()}.zip`;
      const { outputStream, zipStream } = FileUtils.createZipStream(zipFilePath);
      // Act
      await FileUtils.addFileToZip(csvFilePath, zipStream, []);
      await FileUtils.closeStream(outputStream, zipStream);
      // Assert
      expect(fs.existsSync(zipFilePath)).toEqual(true);
      // The CSV file should have been deleted after adding to the ZIP
      expect(fs.existsSync(csvFilePath)).toEqual(false);
    });

    it('should return the file name just added to the zip', async () => {
      // Arrange
      const csvFilePath = `${appRootDir}/tmp/${randomId()}.csv`;
      const stream = fs.createWriteStream(csvFilePath);
      stream.write('some,export,data');
      const finished = new Promise((resolve) => stream.once('close', resolve));
      stream.end();
      await finished;
      const zipFilePath = `${appRootDir}/tmp/${randomId()}.zip`;
      const { outputStream, zipStream } = FileUtils.createZipStream(zipFilePath);
      // Act
      const fileAdded = await FileUtils.addFileToZip(csvFilePath, zipStream, []);
      await FileUtils.closeStream(outputStream, zipStream);
      // Assert
      expect(fileAdded).toEqual(csvFilePath.split('/').pop());
    });

    it('should append the index to a duplicate filename', async () => {
      // Arrange
      const dupe = randomId();
      const csvFilePath = `${appRootDir}/tmp/${dupe}.csv`;
      const filesAlreadyAdded = [
        randomString(),
        randomString(),
        csvFilePath.split('/').pop(),
        csvFilePath.split('/').pop().replace('.csv', ' 02.csv'),
      ];
      const stream = fs.createWriteStream(csvFilePath);
      stream.write('some,export,data');
      const finished = new Promise((resolve) => stream.once('close', resolve));
      stream.end();
      await finished;
      const zipFilePath = `${appRootDir}/tmp/${randomId()}.zip`;
      const { outputStream, zipStream } = FileUtils.createZipStream(zipFilePath);
      // Act
      const fileAdded = await FileUtils.addFileToZip(csvFilePath, zipStream, filesAlreadyAdded);
      await FileUtils.closeStream(outputStream, zipStream);
      // Assert
      // The file added with the same name should be appended with the index (2)
      expect(fileAdded).toEqual(csvFilePath.split('/').pop().replace('.csv', ' 03.csv'));
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
      const urls = await FileUtils.getSignedS3Urls(fileKeys);
      // Assert
      expect(urls).toEqual([
        { name: 'export - 01.zip', url: fakeS3Urls[0] },
        { name: 'export - 02.zip', url: fakeS3Urls[1] },
      ]);
    });
  });
});
