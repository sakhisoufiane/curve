/* eslint-disable max-len */
jest.mock('@curveroyaltysystems/platform-shared-utils');
jest.mock('../../models/period');
jest.mock('../../models/notification');
jest.mock('../sendEmail');
jest.mock('../helpers/salesHelpers');

const { randomArray, randomError, randomFloat, randomId, randomInt, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const csvWriter = require('csv-write-stream');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const { EventEmitter } = require('events');
const _ = require('lodash');
const { setImmediate: setImmediateAsync } = require('timers/promises');
const Period = require('../../models/period');
const Notification = require('../../models/notification');
const SendEmail = require('../sendEmail');
const { salesHelpers } = require('../helpers/salesHelpers');

const SalesLineExport = require('./salesLineExport');

const mockMomentDate = randomString();
jest.mock('moment', () => jest.fn(() => ({
  format: jest.fn(() => mockMomentDate),
})));

const mockWriter = {
  pipe: jest.fn(),
  end: jest.fn(),
  write: jest.fn(),
};
jest.mock('csv-write-stream', () => jest.fn(() => mockWriter));

describe('SalesLineExport Unit Tests', () => {
  afterEach(jest.restoreAllMocks);

  describe('byFilter', () => {
    let stream;
    let bigQuery;
    let writeStream;

    const curveUser = {};
    const client = {
      _id: randomId(),
    };
    let bqFilter;
    let headers;
    let query;
    let fileLocation;
    let publicLink;

    beforeEach(() => {
    // Set up mocks
      stream = new EventEmitter();
      stream.on('on', jest.fn().mockImplementation((event, callback) => callback()));
      stream.pause = jest.fn();
      stream.resume = jest.fn();

      bigQuery = {
        outputTable: randomString(),
        inputTable: randomString(),
        datasetName: randomString(),
        getDistinct: jest.fn().mockImplementation((...args) => args[args.length - 1](null, [])),
        client: {
          createQueryStream: jest.fn().mockReturnValue(stream),
        },
      };
      writeStream = {
        on: jest.fn().mockImplementation((event, callback) => callback()),
      };
      jest.spyOn(fs, 'createWriteStream').mockReturnValue(writeStream);
      jest.spyOn(Period, 'find').mockResolvedValue([]);
      jest.spyOn(SalesLineExport, 'writeSalesToFile').mockResolvedValue();
      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, _filePath, callback) => {
        callback(null, key);
      });
      publicLink = randomString();
      jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, callback) => {
        callback(null, publicLink);
      });

      // Assign variables
      headers = [
        'Sales Line ID', 'Sales File ID', 'Cat Type', 'Original Cat No', 'Original Barcode', 'Original Release Title',
        'Original Release Artist', 'Mapped Release ID', 'Original ISRC', 'Original Track Title', 'Original Track Artist', 'Mapped Track ID',
        'Work Identifier', 'Tunecode', 'ISWC', 'Original Work Title', 'Original Composers', 'Mapped Work ID', 'Original Contract ID', 'Mapped Contract ID',
        'Original Distribution Channel', 'Mapped Distribution Channel', 'Original Configuration', 'Mapped Configuration', 'Original Price Category',
        'Mapped Price Category', 'Original Territory', 'Mapped Territory', 'Units', 'Retail Price', 'Per Unit Rate', 'Home Currency Net Amount', 'Exchange Rate',
        'Reported Contract IDs', 'Reported Contract Names', 'Reported Period IDs', 'Reported Period Names', 'Included Period IDs', 'Included Period Names'];
      query = `SELECT id, Input.barcode, Input.catNo, Input.catType, Input.configuration, Input.contractId, Input.discountAmount, Input.distributionChannel, Input.exchangeRate, homeCurrencyDiscountAmount, homeCurrencyMechanicalAtSource, Input.homeCurrencyNetAmount, isrc, Input.mechanicalAtSource, Input.netAmount, originalConfiguration, Input.originalCurrency, originalDistributionChannel, originalTerritory, originalReleaseArtist, originalReleaseTitle, originalTrackArtist, originalTrackTitle, positiveNegative, originalWorkTitle, originalComposers, Input.workId, originalIdentifier, iswc, tunecode, songcode, Input.priceCategory, Input.releaseId, Input.saleDate, Input.salesFileId, Input.source, status, Input.subSource, Input.territory, titleMapper, Input.trackId, Input.units, Input.retailPrice, Input.perUnitRate, Input.transactionDate, STRING_AGG(Output.contractId) as contractIds, STRING_AGG(Output.contractName) as contractNames, STRING_AGG(Output.periodId) as periodIds, partitionNo, Input.workId
              FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
              LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output
              ON (Output.salesLineId = Input.id)
              GROUP BY id, Input.barcode, Input.catNo, Input.catType, Input.configuration, Input.contractId, Input.discountAmount, Input.distributionChannel, Input.exchangeRate, homeCurrencyDiscountAmount, homeCurrencyMechanicalAtSource, Input.homeCurrencyNetAmount, isrc, Input.mechanicalAtSource, Input.netAmount, originalConfiguration, Input.originalCurrency, originalDistributionChannel, originalTerritory, originalReleaseArtist, originalReleaseTitle, originalTrackArtist, originalTrackTitle, positiveNegative, originalWorkTitle, originalComposers, Input.workId, originalIdentifier, iswc, tunecode, songcode, Input.priceCategory, Input.releaseId, Input.saleDate, Input.salesFileId, Input.source, status, Input.subSource, Input.territory, titleMapper, Input.trackId, Input.units, Input.retailPrice, Input.perUnitRate, Input.transactionDate, partitionNo, Input.workId`;
      bqFilter = undefined;
      fileLocation = `${appRootDir}/tmp/${mockMomentDate}.csv`;
    });

    it('should send list of headers to csvWriter', async () => {
    // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      expect(csvWriter).toHaveBeenCalledWith({ headers });
    });
    it('should add Group related headers if suspense feature is enabled', async () => {
      client.features = { suspense: true };
      // Arrange
      headers.push('Group Type', 'Group Name');
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      expect(csvWriter).toHaveBeenCalledWith({ headers });
    });
    it('should call bigQuery.getDistinct with correct parameters', async () => {
    // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      expect(bigQuery.getDistinct).toHaveBeenCalledWith(bigQuery.outputTable, 'periodId', {}, expect.any(Function));
    });
    it('should call SendEmail.exportError if bigQuery.getDistinct returns an error', async () => {
    // Arrange
      const error = randomError();
      bigQuery.getDistinct.mockImplementation((...args) => args[args.length - 1](error));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      await setImmediateAsync();
      expect(SendEmail.exportError).toHaveBeenCalledWith(curveUser, client, 'Your Sales Export Has Errored', error.message);
    });
    it('should call Period.find with correct parameters', async () => {
    // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      await setImmediateAsync();
      expect(Period.find).toHaveBeenCalledWith({ _id: { $in: [] } }, 'name salesFilesIds');
    });
    it('should call SendEmail.exportError if Period.find throws an error', async () => {
    // Arrange
      const error = randomError();
      Period.find.mockRejectedValue(error);
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      await setImmediateAsync();
      expect(SendEmail.exportError).toHaveBeenCalledWith(curveUser, client, 'Your Sales Export Has Errored', error.message);
    });
    it('should call fs.createWriteStream with correct parameters', async () => {
    // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      await setImmediateAsync();
      expect(fs.createWriteStream).toHaveBeenCalledWith(fileLocation);
    });
    it('should call csvWriter.pipe with the writeStream', async () => {
    // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      await setImmediateAsync();
      expect(mockWriter.pipe).toHaveBeenCalledWith(writeStream);
    });
    describe('when bqFilter is defined', () => {
      beforeEach(() => {
      // Arrange
        bqFilter = randomString();
      });
      it('should add bqFilter to the query', async () => {
      // Act
        SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
        // Assert
        await setImmediateAsync();
        expect(bigQuery.client.createQueryStream).toHaveBeenCalledWith(
          expect.objectContaining({ query: `${query} HAVING ${bqFilter}` }),
        );
      });
    });
    it('should call bigQuery.client.createQueryStream with query and labels', async () => {
      // Arrange
      const labels = {
        job_type: 'sales_export',
        client_id: client._id.toString(),
      };
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      // Assert
      await setImmediateAsync();
      expect(bigQuery.client.createQueryStream).toHaveBeenCalledWith({ query, labels });
    });
    it('should call SendEmail.exportError if stream emits an error', async () => {
    // Arrange
      const error = randomError();
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('error', error);
      // Assert
      await setImmediateAsync();
      expect(SendEmail.exportError).toHaveBeenCalledWith(curveUser, client, 'Your Sales Export Has Errored', error.message);
    });
    it('should call stream.pause after stream emits data 10 000 times', async () => {
    // Arrange
      const data = randomArray(10_000, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      // Assert
      await setImmediateAsync();
      expect(stream.pause).toHaveBeenCalledTimes(1);
    });
    it('should call SalesLineExport.writeSalesToFile after stream emits data 10 000 times', async () => {
    // Arrange
      const data = randomArray(10_000, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(SalesLineExport.writeSalesToFile).toHaveBeenCalledTimes(1);
      expect(SalesLineExport.writeSalesToFile).toHaveBeenNthCalledWith(1, { writer: mockWriter, sales: data, client });
    });
    it('should call stream.resume after stream emits data 10 000 times', async () => {
    // Arrange
      const data = randomArray(10_000, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      // Assert
      await setImmediateAsync();
      expect(stream.resume).toHaveBeenCalledTimes(1);
    });
    it('should NOT call stream.pause after stream emits data less than 10 000 times', async () => {
    // Arrange
      const data = randomArray(9_999, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      // Assert
      await setImmediateAsync();
      expect(stream.pause).toHaveBeenCalledTimes(0);
    });
    it('should NOT call SalesLineExport.writeSalesToFile after stream emits data less than 10 000 times', async () => {
    // Arrange
      const data = randomArray(9_999, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      // Assert
      await setImmediateAsync();
      expect(SalesLineExport.writeSalesToFile).toHaveBeenCalledTimes(0);
    });
    it('should call SalesLineExport.writeSalesToFile once after stream emits data less than 10 000 times - with end() emitted as well', async () => {
    // Arrange
      const data = randomArray(9_999, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(SalesLineExport.writeSalesToFile).toHaveBeenCalledTimes(1);
      expect(SalesLineExport.writeSalesToFile).toHaveBeenNthCalledWith(1, { writer: mockWriter, sales: data, client });
    });
    it('should call SalesLineExport.writeSalesToFile twice, after stream emits data more than 10 000 times', async () => {
    // Arrange
      const data = randomArray(10_000, () => ({ id: randomId(), salesFileId: randomId() }));
      const data2 = randomArray(10, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      await setImmediateAsync();
      data2.forEach((d) => stream.emit('data', d));
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(SalesLineExport.writeSalesToFile).toHaveBeenCalledTimes(2);
      expect(SalesLineExport.writeSalesToFile).toHaveBeenNthCalledWith(1, { writer: mockWriter, sales: data, client });
      expect(SalesLineExport.writeSalesToFile).toHaveBeenNthCalledWith(2, { writer: mockWriter, sales: data2, client });
    });
    it('should NOT call stream.resume after stream emits data less than 10 000 times', async () => {
    // Arrange
      const data = randomArray(9_999, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      data.forEach((d) => stream.emit('data', d));
      // Assert
      await setImmediateAsync();
      expect(stream.resume).toHaveBeenCalledTimes(0);
    });
    it('should assign the ids of the periods reported to to sale.periodIds', async () => {
    // Arrange
      const sale = { periodIds: randomArray(2, () => randomId()).join(',') };
      const expectedSale = {
        ...sale,
        periodIds: sale.periodIds.split(',').join(';'),
        periodNames: '',
        includedPeriodIds: '',
        includedPeriodName: '',
      };
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('data', sale);
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(SalesLineExport.writeSalesToFile).toHaveBeenCalledWith({ writer: mockWriter, sales: [expectedSale], client });
    });
    it('should assign the names of the periods reported to to sale.periodNames', async () => {
    // Arrange
      const periods = [
        { _id: randomId(), name: randomString(), salesFilesIds: [] },
        { _id: randomId(), name: randomString(), salesFilesIds: [] },
      ];
      Period.find.mockResolvedValue([...periods, { _id: randomId(), name: randomString(), salesFilesIds: [] }]);
      const sale = { periodIds: periods.map((p) => p._id).join(',') };
      const expectedSale = {
        ...sale,
        periodIds: sale.periodIds.split(',').join(';'),
        periodNames: periods.map((p) => p.name).join(';'),
        includedPeriodIds: '',
        includedPeriodName: '',
      };
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('data', sale);
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(SalesLineExport.writeSalesToFile).toHaveBeenCalledWith({ writer: mockWriter, sales: [expectedSale], client });
    });
    it('should assign the ids of the periods the sale is included in to sale.includedPeriodIds AND the names to sale.includedPeriodName', async () => {
    // Arrange
      const salesFileId1 = randomId();
      const salesFileId2 = randomId();
      const periods = [
        { _id: randomId(), name: randomString(), salesFilesIds: [salesFileId1] },
        { _id: randomId(), name: randomString(), salesFilesIds: [salesFileId1] },
        { _id: randomId(), name: randomString(), salesFilesIds: [salesFileId2] },
        { _id: randomId(), name: randomString(), salesFilesIds: [salesFileId1, salesFileId2] },
      ];
      Period.find.mockResolvedValue(periods);
      const sale1 = { periodIds: periods.map((p) => p._id).join(','), salesFileId: salesFileId1 };
      const expectedSale1 = {
        ...sale1,
        periodIds: sale1.periodIds.split(',').join(';'),
        periodNames: periods.map((p) => p.name).join(';'),
        includedPeriodIds: `${periods[0]._id};${periods[1]._id};${periods[3]._id}`,
        includedPeriodName: `${periods[0].name};${periods[1].name};${periods[3].name}`,
      };
      const sale2 = { periodIds: periods.map((p) => p._id).join(','), salesFileId: salesFileId2 };
      const expectedSale2 = {
        ...sale2,
        periodIds: sale2.periodIds.split(',').join(';'),
        periodNames: periods.map((p) => p.name).join(';'),
        includedPeriodIds: `${periods[2]._id};${periods[3]._id}`,
        includedPeriodName: `${periods[2].name};${periods[3].name}`,
      };
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('data', sale1);
      await setImmediateAsync();
      stream.emit('data', sale2);
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(SalesLineExport.writeSalesToFile).toHaveBeenCalledWith({ writer: mockWriter, sales: [expectedSale1, expectedSale2], client });
    });
    it('should call SendEmail.exportError with correct parameters if stream emits an error', async () => {
    // Arrange
      const error = randomError();
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('error', error);
      // Assert
      await setImmediateAsync();
      expect(SendEmail.exportError).toHaveBeenCalledWith(curveUser, client, 'Your Sales Export Has Errored', error.message);
    });
    it('should call writer.end after stream emits end', async () => {
    // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(mockWriter.end).toHaveBeenCalledTimes(1);
    });

    it('should call fileManager.uploadToS3 with the correct parameters after stream emits end', async () => {
    // Arrange
      const key = `exports/${mockMomentDate}.csv`;
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(fileManager.uploadToS3).toHaveBeenCalledWith(key, fileLocation, expect.any(Function));
    });
    it('should call fileManager.publicLink24Hours with the correct parameters after stream emits end', async () => {
    // Arrange
      const key = `exports/${mockMomentDate}.csv`;
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(fileManager.publicLink24Hours).toHaveBeenCalledWith(key, expect.any(Function));
    });
    it('should call Notification.generate with correct parameters if writeStream emits an error', async () => {
    // Arrange
      const generateOptions = {
        identifier: 'exportDownload',
        curveUser,
        client,
        subject: `Your Sales Export for ${client.name} is Ready to Download`,
        link: publicLink,
      };
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(Notification.generate).toHaveBeenCalledWith('Sales Export Ready', `Your Sales Export for ${client.name} is Ready to Download`, publicLink, curveUser, generateOptions, expect.any(Function));
    });
    it('should call Notification.generate with correct parameters if writeStream emits an error', async () => {
    // Arrange
      const error = randomError();
      writeStream.on.mockImplementation((event, callback) => {
        callback(error);
      });
      const generateOptions = {
        identifier: 'exportError',
        curveUser,
        client,
        subject: 'Your Sales Export Has Errored',
        error: 'Your sales export has errored. Please try again, or contact support',
      };
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(Notification.generate).toHaveBeenCalledWith('Your Sales Export Has Errored', 'Your sales export has errored. Please try again, or contact support', null, curveUser, generateOptions);
    });
    it('should call Notification.generate with correct parameters if Notification.generate emits an error', async () => {
    // Arrange
      const error = randomError();
      Notification.generate.mockImplementationOnce((...args) => args[args.length - 1](error));
      const generateOptions = {
        identifier: 'exportError',
        curveUser,
        client,
        subject: 'Your Sales Export Has Errored',
        error: 'Your sales export has errored. Please try again, or contact support',
      };
      // Act
      SalesLineExport.byFilter({ bqFilter, bigQuery, curveUser, client });
      await setImmediateAsync();
      stream.emit('end');
      // Assert
      await setImmediateAsync();
      expect(Notification.generate).toHaveBeenNthCalledWith(2, 'Your Sales Export Has Errored', 'Your sales export has errored. Please try again, or contact support', null, curveUser, generateOptions);
    });
  });
  describe('writeSalesToFile', () => {
    const client = {
      _id: randomId(),
    };
    let sales = [];
    beforeEach(() => {
      jest.spyOn(salesHelpers, 'addGroupInfoToSales').mockImplementation((params) => params.sales);

      sales = [
        {
          id: randomId(),
          salesFileId: randomId(),
          catType: randomString(),
          catNo: randomString(),
          barcode: randomString(),
          originalReleaseTitle: randomString(),
          originalReleaseArtist: randomString(),
          releaseId: randomId(),
          isrc: randomString(),
          originalTrackTitle: randomString(),
          originalTrackArtist: randomString(),
          trackId: randomId(),
          originalIdentifier: randomString(),
          tunecode: randomString(),
          iswc: randomString(),
          originalWorkTitle: randomString(),
          originalComposers: randomArray(3, () => randomString()).join(', '),
          workId: randomId(),
          contractIdentifier: randomString(),
          contractId: randomId(),
          originalDistributionChannel: randomString(),
          distributionChannel: randomString(),
          originalConfiguration: randomString(),
          configuration: randomString(),
          originalPriceCategory: randomString(),
          priceCategory: randomString(),
          originalTerritory: randomString(),
          territory: randomString(),
          units: randomInt(),
          retailPrice: randomFloat(),
          perUnitRate: randomFloat(),
          homeCurrencyNetAmount: randomFloat(),
          exchangeRate: randomFloat(),
          contractIds: randomArray().join(','),
          contractNames: randomArray().join(','),
          periodIds: randomArray().join(';'),
          periodNames: randomArray().map(() => randomString()).join(';'),
          includedPeriodIds: randomArray().join(';'),
          includedPeriodName: randomArray().map(() => randomString()).join(';'),
          groupType: randomString().toLowerCase(),
          groupName: randomString(),
        },
      ];
    });
    it('should call writer.write for each sale', async () => {
      // Arrange
      sales = randomArray(10, () => ({ id: randomId(), salesFileId: randomId() }));
      // Act
      await SalesLineExport.writeSalesToFile({ writer: mockWriter, sales, client });
      // Assert
      expect(mockWriter.write).toHaveBeenCalledTimes(sales.length);
    });
    it('should convert sales data to the correct format', async () => {
      // Arrange
      const line = sales[0];
      // Act
      await SalesLineExport.writeSalesToFile({ writer: mockWriter, sales, client });
      // Assert
      expect(mockWriter.write).toHaveBeenCalledWith([
        line.id, line.salesFileId, line.catType, line.catNo, line.barcode, line.originalReleaseTitle,
        line.originalReleaseArtist, line.releaseId, line.isrc, line.originalTrackTitle, line.originalTrackArtist, line.trackId,
        line.originalIdentifier, line.tunecode, line.iswc, line.originalWorkTitle, line.originalComposers, line.workId, line.contractIdentifier,
        line.contractId, line.originalDistributionChannel, line.distributionChannel, line.originalConfiguration, line.configuration,
        line.originalPriceCategory, line.priceCategory, line.originalTerritory, line.territory, line.units, line.retailPrice, line.perUnitRate, line.homeCurrencyNetAmount,
        line.exchangeRate, line.contractIds ? line.contractIds.replaceAll(',', ';') : '', line.contractNames ? line.contractNames.replaceAll(',', ';') : '', line.periodIds, line.periodNames, line.includedPeriodIds, line.includedPeriodName,
      ]);
    });
    it('should call salesHelpers.addGroupInfoToSales if client has suspense feature enabled', async () => {
      // Arrange
      client.features = { suspense: true };
      // Act
      await SalesLineExport.writeSalesToFile({ writer: mockWriter, sales, client });
      // Assert
      expect(salesHelpers.addGroupInfoToSales).toHaveBeenCalledWith({ clientId: client._id.toString(), sales });
    });
    it('should add the group info to sales if client has suspense feature enabled', async () => {
      // Arrange
      client.features = { suspense: true };
      const line = sales[0];
      // Act
      await SalesLineExport.writeSalesToFile({ writer: mockWriter, sales, client });
      // Assert
      expect(mockWriter.write).toHaveBeenCalledWith([
        line.id, line.salesFileId, line.catType, line.catNo, line.barcode, line.originalReleaseTitle,
        line.originalReleaseArtist, line.releaseId, line.isrc, line.originalTrackTitle, line.originalTrackArtist, line.trackId,
        line.originalIdentifier, line.tunecode, line.iswc, line.originalWorkTitle, line.originalComposers, line.workId, line.contractIdentifier,
        line.contractId, line.originalDistributionChannel, line.distributionChannel, line.originalConfiguration, line.configuration,
        line.originalPriceCategory, line.priceCategory, line.originalTerritory, line.territory, line.units, line.retailPrice, line.perUnitRate, line.homeCurrencyNetAmount,
        line.exchangeRate, line.contractIds ? line.contractIds.replaceAll(',', ';') : '', line.contractNames ? line.contractNames.replaceAll(',', ';') : '', line.periodIds, line.periodNames, line.includedPeriodIds, line.includedPeriodName,
        _.capitalize(line.groupType), line.groupName,
      ]);
    });
  });
});
