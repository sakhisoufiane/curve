jest.mock('@curveroyaltysystems/platform-shared-utils', () => {
  const original = jest.requireActual('@curveroyaltysystems/platform-shared-utils');
  return {
    ...original,
    BigQuery: jest.fn().mockReturnValue({
      deleteData: jest.fn().mockImplementation((table, filter, cb) => cb(null, {})),
    }),
  };
});
const { logger, fileManager, fileOpener } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');
const Client = require('../client');
const Notification = require('../notification');
const SalesFile = require('./salesFile');
const UnmappedWork = require('../unmappedWork');
const UnmappedTrack = require('../unmappedTrack');
const UnmappedRelease = require('../unmappedRelease');

describe('SalesFile Model', () => {
  describe('sendExport', () => {
    let filePathFromTest;
    let client;
    let salesFiles;

    beforeEach(async () => {
      client = new Client({
        name: randomString(),
        email: `${randomString()}@curve.com`,
        bigQueryDataset: randomString(),
        bigQuerySalesTable: randomString(),
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      });
      await client.save();

      salesFiles = await Promise.all([
        new SalesFile({
          clientId: client._id.toString(),
          name: randomString(),
          invoiceNo: randomString(),
          targetPeriod: randomString(),
          source: randomString(),
          fileType: 'Standard',
          reportedStatus: 'Unreported',
          archived: false,
          viewed: true,
          overwriteFieldTargetCells: [],
          status: 'Setup',
          error: null,
          overwriteFields: {
            originalSaleType: [],
            transactionDate: new Date('2025-02-15T00:00:00.000Z'),
          },
          salesAccountName: randomString(),
          grossAmount: 0,
          homeCurrencyGrossAmount: 300,
          homeCurrencyNetAmount: 400,
          invalidLines: 1,
          lines: 1,
          netAmount: 0,
          units: 260000,
          valid: false,
          validationLines: 1,
          validationNetAmount: 0,
          validationUnits: 260000,
          reportedLines: 0,
          exchangeRates: [
            {
              from: 'USD',
              to: 'Home Currency',
              rate: 1,
            },
            {
              from: 'VND',
              to: 'EUR',
              rate: 2.4,
            },
          ],
        }).save(),
        new SalesFile({
          clientId: client._id.toString(),
          name: randomString(),
          invoiceNo: randomString(),
          targetPeriod: randomString(),
          source: randomString(),
          fileType: 'Standard',
          reportedStatus: 'Unreported',
          archived: false,
          viewed: true,
          overwriteFieldTargetCells: [],
          status: 'Setup',
          error: null,
          overwriteFields: {
            originalSaleType: [],
            transactionDate: new Date('2025-04-09T00:00:00.000Z'),
          },
          salesAccountName: randomString(),
          grossAmount: 0,
          homeCurrencyGrossAmount: 566,
          homeCurrencyNetAmount: 23,
          invalidLines: 1,
          lines: 1,
          netAmount: 0,
          units: 260000,
          valid: false,
          validationLines: 1,
          validationNetAmount: 0,
          validationUnits: 260000,
          reportedLines: 0,
          exchangeRates: [
            {
              from: 'USD',
              to: 'Home Currency',
              rate: 1,
            },
            {
              from: 'VND',
              to: 'EUR',
              rate: 2.4,
            },
          ],
        }).save(),
      ]);

      Notification.generate = jest.fn((title, message, link, user, options, cb) => {
        cb(null);
      });

      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, localPath, cb) => {
        filePathFromTest = localPath;
        cb(null, 'mock/s3/key.xlsx');
      });

      jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => {
        cb(null, 'https://mocked-link.com/download');
      });
    });

    it('should run sendExport and let me access the filePath', async () => {
      const filter = { _id: { $in: [salesFiles[0]._id, salesFiles[1]._id] } };
      const curveUser = { clientId: client._id.toString() };

      await sendExport(filter, curveUser);

      const options = {
        tab: 0,
        startingLine: 2,
        startingColumn: 0,
        maxRows: 4,
      };

      const { data } = await extractDataAsync(filePathFromTest, options);
      data.forEach((row) => {
        const [id, name, invoiceNo, targetPeriod, source, units, gross, net, unmappedLines, valid, status, archivedStatus, transactionDate] = row;
        const salesFile = salesFiles.find((sf) => sf._id.toString() === id);
        expect(salesFile).toBeDefined();
        expect(id).toEqual(salesFile._id.toString());
        expect(name).toEqual(salesFile.name);
        expect(invoiceNo).toEqual(salesFile.invoiceNo);
        expect(targetPeriod).toEqual(salesFile.targetPeriod);
        expect(source).toEqual(salesFile.salesAccountName);
        expect(units).toEqual(salesFile.units);
        expect(gross).toEqual(salesFile.homeCurrencyGrossAmount);
        expect(net).toEqual(salesFile.homeCurrencyNetAmount);
        expect(unmappedLines).toEqual(salesFile.invalidLines);
        expect(valid).toEqual(salesFile.valid);
        expect(status).toEqual(salesFile.status);
        expect(archivedStatus).toEqual(salesFile.archived ? 'Archived' : 'Live');
        expect(transactionDate).toEqual(moment(salesFile.overwriteFields.transactionDate).format('DD/MM/YYYY'));

        const [, , , , , , , , , , , , , exchFrom1, exchTo1, exchRate1, exchFrom2, exchTo2, exchRate2] = row;

        expect([{
          from: exchFrom1,
          to: exchTo1,
          rate: exchRate1,
        }, {
          from: exchFrom2,
          to: exchTo2,
          rate: exchRate2,
        }]).toEqual(salesFile.exchangeRates);
      });
    });
  });

  describe('clearSalesData', () => {
    let clientId;
    let salesFile1;
    let salesFile2;
    let salesFileIds;
    let unmappedWorks;
    let unmappedTracks;
    let unmappedReleases;

    beforeEach(async () => {
      const client = new Client({ name: randomString(), createdBigQueryTables: true });
      await client.save();
      clientId = client._id.toString();

      salesFile1 = new SalesFile({ clientId, name: randomString(), file: randomString() });
      salesFile2 = new SalesFile({ clientId, name: randomString(), file: randomString() });
      await Promise.all([salesFile1.save(), salesFile2.save()]);
      salesFileIds = [
        salesFile1._id.toString(),
        salesFile2._id.toString(),
      ];

      unmappedWorks = [
        new UnmappedWork({ clientId, salesFileId: randomId() }),
        new UnmappedWork({ clientId, salesFileId: salesFile1._id.toString() }),
        new UnmappedWork({ clientId, salesFileId: salesFile2._id.toString() }),
      ];
      await Promise.all(unmappedWorks.map((w) => w.save()));

      unmappedTracks = [
        new UnmappedTrack({ clientId, salesFileId: randomId() }),
        new UnmappedTrack({ clientId, salesFileId: salesFile1._id.toString() }),
        new UnmappedTrack({ clientId, salesFileId: salesFile2._id.toString() }),
      ];
      await Promise.all(unmappedTracks.map((w) => w.save()));

      unmappedReleases = [
        new UnmappedRelease({ clientId, salesFileId: randomId() }),
        new UnmappedRelease({ clientId, salesFileId: salesFile1._id.toString() }),
        new UnmappedRelease({ clientId, salesFileId: salesFile2._id.toString() }),
      ];
      await Promise.all(unmappedReleases.map((w) => w.save()));

      jest.spyOn(SalesFile, 'find').mockResolvedValue([salesFile1, salesFile2]);
      jest.spyOn(fileManager, 'deleteFromS3').mockImplementation((filePath, cb) => cb(null));
    });

    it('should delete all unmapped catalogue associated with the sales files (CUR-4454)', async () => {
      // Act
      await new Promise((resolve, reject) => {
        SalesFile.clearSalesData(salesFileIds, clientId, (err) => (err ? reject(err) : resolve()));
      });

      // Assert
      const works = await UnmappedWork.find({ clientId });
      expect(works.length).toEqual(1);
      expect(works[0]._id).toEqual(unmappedWorks[0]._id);

      const tracks = await UnmappedTrack.find({ clientId });
      expect(tracks.length).toEqual(1);
      expect(tracks[0]._id).toEqual(unmappedTracks[0]._id);

      const releases = await UnmappedRelease.find({ clientId });
      expect(releases.length).toEqual(1);
      expect(releases[0]._id).toEqual(unmappedReleases[0]._id);
    });

    describe('when called from the deleteOne hook', () => {
      it('should call clearSalesData with the sales file id (CUR-4572)', async () => {
        // Sales Files can be deleted directly, so we need to ensure the hook is called correctly
        // The hook should call clearSalesData with the salesFileId and clientId

        // Act
        await salesFile1.deleteOne();
        await salesFile2.deleteOne();

        // Assert
        const [sf1, sf2] = await Promise.all([SalesFile.findById(salesFile1._id), SalesFile.findById(salesFile2._id)]);
        expect(sf1).toBeNull();
        expect(sf2).toBeNull();

        const works = await UnmappedWork.find({ clientId });
        expect(works.length).toEqual(1);
        expect(works[0]._id).toEqual(unmappedWorks[0]._id);

        const tracks = await UnmappedTrack.find({ clientId });
        expect(tracks.length).toEqual(1);
        expect(tracks[0]._id).toEqual(unmappedTracks[0]._id);

        const releases = await UnmappedRelease.find({ clientId });
        expect(releases.length).toEqual(1);
        expect(releases[0]._id).toEqual(unmappedReleases[0]._id);
      });
    });

    describe('when called via the bulkDelete method', () => {
      it('should call clearSalesData with the sales file ids (CUR-4572)', async () => {
        // Arrange
        jest.spyOn(Notification, 'generate').mockImplementation((title, message, link, user, options, cb) => cb(null));

        // Act
        await new Promise((resolve, reject) => {
          SalesFile.bulkDelete(salesFileIds, clientId, { userId: randomId() }, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Assert
        const [sf1, sf2] = await Promise.all([SalesFile.findById(salesFile1._id), SalesFile.findById(salesFile2._id)]);
        expect(sf1).toBeNull();
        expect(sf2).toBeNull();

        const works = await UnmappedWork.find({ clientId });
        expect(works.length).toEqual(1);
        expect(works[0]._id).toEqual(unmappedWorks[0]._id);

        const tracks = await UnmappedTrack.find({ clientId });
        expect(tracks.length).toEqual(1);
        expect(tracks[0]._id).toEqual(unmappedTracks[0]._id);

        const releases = await UnmappedRelease.find({ clientId });
        expect(releases.length).toEqual(1);
        expect(releases[0]._id).toEqual(unmappedReleases[0]._id);
      });
    });
  });
});

const sendExport = (filter, curveUser) => new Promise((resolve, reject) => {
  SalesFile.sendExport(filter, curveUser, (err) => {
    if (err) {
      logger.error(err);
      return reject(err);
    }
    resolve();
  });
});

const extractDataAsync = (filePath, options) => new Promise((resolve, reject) => {
  fileOpener.extractData(filePath, options, (err, totalTabs, data) => {
    if (err) return reject(err);
    resolve({ totalTabs, data });
  });
});
