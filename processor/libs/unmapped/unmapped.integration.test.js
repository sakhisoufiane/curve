const { randomId, randomString, randomFloat, testUtils } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const path = require('path');
const appRootDir = require('app-root-dir').get();

const Client = require('../../models/client');
const UnmappedWork = require('../../models/unmappedWork');
const UnmappedRelease = require('../../models/unmappedRelease');
const UnmappedTrack = require('../../models/unmappedTrack');
const Notification = require('../../models/notification');
const { exportUnmapped, UNMAPPED_TYPES } = require('./unmapped');

jest.mock('moment', () => jest.fn(() => ({
  format: jest.fn(() => '20250101'),
})));

jest.mock('@curveroyaltysystems/platform-shared-utils', () => {
  const original = jest.requireActual('@curveroyaltysystems/platform-shared-utils');
  return {
    ...original,
    fileManager: {
      uploadToS3: jest.fn((fileKey, fileLocation, cb) => process.nextTick(() => cb(null, fileKey))),
      publicLink24Hours: jest.fn((key, cb) => cb(null, `https://example.com/${key}`)),
    },
  };
});

jest.mock('../../models/notification', () => ({
  generate: jest.fn((name, description, link, options, cb) => process.nextTick(() => cb(null))),
}));

describe('unmapped integration', () => {
  let client;
  const email = 'test@example.com';

  beforeEach(async () => {
    client = new Client({ name: randomString() });
    await client.save();
  });

  afterEach(async () => {
    await Client.deleteOne({ _id: client._id });
    jest.clearAllMocks();
  });

  describe('exportUnmapped', () => {
    describe('when exporting tracks', () => {
      let tracks;

      beforeEach(async () => {
        tracks = [
          new UnmappedTrack({
            clientId: client._id.toString(),
            salesFileId: randomId(),
            title: randomString(),
            __v: 1,
            artist: randomString(),
            isrc: 'USRC12345678',
          }),
          new UnmappedTrack({
            clientId: client._id.toString(),
            salesFileId: randomId(),
            title: randomString(),
            __v: 2,
            artist: randomString(),
            isrc: 'GBRC98765432',
          }),
        ];
        await UnmappedTrack.bulkSave(tracks);
      });

      afterEach(async () => {
        await UnmappedTrack.deleteMany({ clientId: client._id.toString() });
      });

      it('should export tracks to CSV and send notification', async () => {
        // Act
        await exportUnmapped({
          clientId: client._id.toString(),
          type: UNMAPPED_TYPES.track,
          selector: { ids: tracks.map((t) => t._id) },
          email,
        });

        // Assert
        expect(fileManager.uploadToS3).toHaveBeenCalled();
        expect(fileManager.publicLink24Hours).toHaveBeenCalled();
        expect(Notification.generate).toHaveBeenCalledWith(
          'Unmapped Tracks Export Ready',
          expect.stringContaining('Unmapped'),
          expect.any(String),
          expect.objectContaining({
            identifier: 'unmappedExportDownload',
            email,
          }),
          expect.any(Function),
        );
      });
    });

    describe('when exporting releases', () => {
      let releases;

      beforeEach(async () => {
        releases = [
          new UnmappedRelease({
            clientId: client._id.toString(),
            salesFileId: randomId(),
            title: randomString(),
            __v: 1,
            artist: randomString(),
            catNo: 'CAT001',
            barcode: '1234567890123',
          }),
          new UnmappedRelease({
            clientId: client._id.toString(),
            salesFileId: randomId(),
            title: randomString(),
            __v: 2,
            artist: randomString(),
            catNo: 'CAT002',
            barcode: '9876543210987',
          }),
        ];
        await UnmappedRelease.bulkSave(releases);
      });

      afterEach(async () => {
        await UnmappedRelease.deleteMany({ clientId: client._id.toString() });
      });

      it('should export releases to CSV and send notification', async () => {
        // Act
        await exportUnmapped({
          clientId: client._id.toString(),
          type: UNMAPPED_TYPES.release,
          selector: { ids: releases.map((r) => r._id) },
          email,
        });

        // Assert
        expect(fileManager.uploadToS3).toHaveBeenCalled();
        expect(fileManager.publicLink24Hours).toHaveBeenCalled();
        expect(Notification.generate).toHaveBeenCalledWith(
          'Unmapped Releases Export Ready',
          expect.stringContaining('Unmapped'),
          expect.any(String),
          expect.objectContaining({
            identifier: 'unmappedExportDownload',
            email,
          }),
          expect.any(Function),
        );
      });
    });

    describe('when exporting works', () => {
      let works;
      let unlinkSpy;
      const csvPath = path.join(appRootDir, 'tmp', 'Unmapped Works Export - 20250101.csv');

      beforeEach(async () => {
        unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((p, cb) => cb(null));
        works = [
          new UnmappedWork({
            clientId: client._id.toString(),
            salesFileId: randomId(),
            title: randomString(),
            source: randomString(),
            iswc: 'T1234567890',
            tunecode: randomString(),
            songCode: randomString(),
            identifier: randomString(),
            party1: randomString(),
            party2: randomString(),
            party3: randomString(),
            netAmount: randomFloat(),
          }),
        ];
        await UnmappedWork.bulkSave(works);
      });

      afterEach(async () => {
        unlinkSpy.mockRestore();
        await UnmappedWork.deleteMany({ clientId: client._id.toString() });
        if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
      });

      it('should export works to CSV and send notification', async () => {
        await exportUnmapped({
          clientId: client._id.toString(),
          type: UNMAPPED_TYPES.work,
          selector: { ids: works.map((w) => w._id) },
          email,
        });

        expect(fileManager.uploadToS3).toHaveBeenCalled();
        expect(fileManager.publicLink24Hours).toHaveBeenCalled();
        expect(Notification.generate).toHaveBeenCalledWith(
          'Unmapped Works Export Ready',
          expect.stringContaining('Unmapped'),
          expect.any(String),
          expect.objectContaining({
            identifier: 'unmappedExportDownload',
            email,
          }),
          expect.any(Function),
        );
      });

      describe('deduplication', () => {
        let sharedSalesFileId;
        let sharedTitle;
        let sharedSource;

        beforeEach(async () => {
          await UnmappedWork.deleteMany({ clientId: client._id.toString() });
          sharedSalesFileId = randomId();
          sharedTitle = randomString();
          sharedSource = randomString();

          await UnmappedWork.bulkSave([
            new UnmappedWork({
              clientId: client._id.toString(),
              salesFileId: sharedSalesFileId,
              title: sharedTitle,
              source: sharedSource,
              iswc: 'T1234567890',
              songcode: 'SC001',
              identifier: 'ID001',
              party1: 'PA001',
              netAmount: 100,
            }),
            new UnmappedWork({
              clientId: client._id.toString(),
              salesFileId: sharedSalesFileId,
              title: sharedTitle,
              source: sharedSource,
              iswc: 'T1234567890',
              songcode: 'SC002',
              identifier: 'ID002',
              party1: 'PA001',
              netAmount: 200,
            }),
          ]);
        });

        it('collapses multiple docs with the same salesFileId+source+title into one CSV row', async () => {
          await exportUnmapped({
            clientId: client._id.toString(),
            type: UNMAPPED_TYPES.work,
            selector: { filter: { clientId: client._id.toString() } },
            email,
          });

          const csv = fs.readFileSync(csvPath, 'utf8');
          const dataRows = csv.split('\n').filter(Boolean).slice(1); // skip header
          expect(dataRows).toHaveLength(1);
        });

        it('shows unique iswc values once per cell', async () => {
          await exportUnmapped({
            clientId: client._id.toString(),
            type: UNMAPPED_TYPES.work,
            selector: { filter: { clientId: client._id.toString() } },
            email,
          });

          const csv = fs.readFileSync(csvPath, 'utf8');
          expect(csv).toContain('T1234567890');
          // duplicate iswc should only appear once
          expect(csv.match(/T1234567890/g)).toHaveLength(1);
        });

        it('concatenates distinct songcode values with ", "', async () => {
          await exportUnmapped({
            clientId: client._id.toString(),
            type: UNMAPPED_TYPES.work,
            selector: { filter: { clientId: client._id.toString() } },
            email,
          });

          const csv = fs.readFileSync(csvPath, 'utf8');
          expect(csv).toContain('SC001');
          expect(csv).toContain('SC002');
        });

        it('sums netValue across grouped rows', async () => {
          await exportUnmapped({
            clientId: client._id.toString(),
            type: UNMAPPED_TYPES.work,
            selector: { filter: { clientId: client._id.toString() } },
            email,
          });

          const csv = fs.readFileSync(csvPath, 'utf8');
          expect(csv).toContain('300');
        });
      });

      describe('null and blank field handling', () => {
        beforeEach(async () => {
          await UnmappedWork.deleteMany({ clientId: client._id.toString() });
          await UnmappedWork.bulkSave([
            new UnmappedWork({
              clientId: client._id.toString(),
              salesFileId: randomId(),
              title: randomString(),
              source: randomString(),
              // iswc, tunecode, songcode, identifier, parties all omitted (null)
              netAmount: 50,
            }),
          ]);
        });

        it('does not write the literal string "null" into any cell', async () => {
          await exportUnmapped({
            clientId: client._id.toString(),
            type: UNMAPPED_TYPES.work,
            selector: { filter: { clientId: client._id.toString() } },
            email,
          });

          const csv = fs.readFileSync(csvPath, 'utf8');
          expect(csv).not.toContain('null');
        });

        it('does not produce cells consisting solely of commas', async () => {
          await exportUnmapped({
            clientId: client._id.toString(),
            type: UNMAPPED_TYPES.work,
            selector: { filter: { clientId: client._id.toString() } },
            email,
          });

          const csv = fs.readFileSync(csvPath, 'utf8');
          // A cell of only commas would appear as ",," or ",,," between delimiters
          expect(csv).not.toMatch(/^,+$/m);
          expect(csv).not.toMatch(/"[,\s]+"$/m);
        });
      });
    });

    describe('when an invalid type is provided', () => {
      it('should throw an error', async () => {
        // Act & Assert
        await expect(exportUnmapped({
          clientId: client._id.toString(),
          type: 'invalid',
          selector: { ids: [randomId()] },
          email,
        })).rejects.toThrow('Invalid unmapped type: invalid');
      });
    });

    describe('when the client does not exist', () => {
      it('should throw an error', async () => {
        // Act & Assert
        await expect(exportUnmapped({
          clientId: randomId(),
          type: UNMAPPED_TYPES.track,
          selector: { _id: { $in: [randomId()] } },
          email,
        })).rejects.toThrow('not found');
      });
    });
  });
});
