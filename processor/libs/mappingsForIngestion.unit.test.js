process.env.SALES_INGESTION_INPUTS_BUCKET = 'test-bucket';

jest.mock('../models/release', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../models/track', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../models/work', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../models/contract', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));

jest.spyOn(Date, 'now').mockImplementation(() => new Date('2026-01-14T14:28:34.000Z'));

const mockCsvAddData = jest.fn();

const mockWriteCsvObject = jest.fn((opts) => ({
  addData: mockCsvAddData,
}));

jest.mock('./writeCsv/writeCsvObject', () => mockWriteCsvObject);

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  fileManager: {
    uploadToS3: jest.fn((key, localPath, cb) => {
      cb(null, key);
    }),
    publicLink7Days: jest.fn((key, cb) => {
      cb(null, `mock link for ${key}`);
    }),
  },
  logger: {
    error: () => null,
    info: () => null,
  },
}));

jest.mock('./util/gcp', () => ({
  createStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      upload: jest.fn(),
    })),
  })),
}));

jest.mock('node:fs/promises', () => ({
  unlink: jest.fn(),
}));

const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');
const Contract = require('../models/contract');

const mappingsForIngestion = require('./mappingsForIngestion');

const client = {
  _id: '123',
};

function mockQuery(result) {
  const mockQuery = {
    sort: () => mockQuery,
    limit: () => mockQuery,
    cursor: () => mockQuery,
    lean: () => mockQuery,
    then: (resolve, reject) => {
      try {
        resolve(result);
      } catch (error) {
        if (reject) reject(error);
      }
      return Promise.resolve(result);
    },
    exec: () => Promise.resolve(result),
    eachAsync: (cb) => {
      for (const item of result) {
        cb(item);
      }
    },
  };
  return mockQuery;
}

function setupMockQueries(collections) {
  Release.countDocuments.mockResolvedValue(collections.releases.length);
  Release.find.mockReturnValue(mockQuery(collections.releases));

  Track.countDocuments.mockResolvedValue(collections.tracks.length);
  Track.find.mockReturnValue(mockQuery(collections.tracks));

  Work.countDocuments.mockResolvedValue(collections.works.length);
  Work.find.mockReturnValue(mockQuery(collections.works));

  Contract.countDocuments.mockResolvedValue(collections.contracts.length);
  Contract.find.mockReturnValue(mockQuery(collections.contracts));
}

describe('mappingsForIngestion', () => {
  describe('releases ', () => {
    let releases;

    describe('maps normalised catNo and barcode and aliases', () => {
      beforeEach(() => {
        releases = [
          { _id: '000' },
          { _id: '111', catNo: ' cat-1 ' },
          { _id: '222', catNo: 'CAT-1' },
          { _id: '333', barcode: 'barcode 1$£.&', aliases: ['alias-1', 'alias-2'] },
          { _id: '444', catNo: 'cat-2', barcode: 'barcode-2' },
        ];
      });

      it('small', async () => {
        setupMockQueries({ releases, tracks: [], works: [], contracts: [] });
        const result = await mappingsForIngestion.get(client);
        expect(result.releases).toEqual({
          'cat-1': '111',
          'CAT-1': '222',
          'barcode 1': '333',
          'cat-2': '444',
          'barcode-2': '444',
          'alias-1': '333',
          'alias-2': '333',
        });
      });

      it('big', async () => {
        setupMockQueries({ releases, tracks: [], works: [], contracts: [] });
        Release.countDocuments.mockResolvedValue(10001);
        const result = await mappingsForIngestion.get(client, { platform: true });
        expect(mockCsvAddData.mock.calls.map((call) => call[0])).toEqual([
          [],
          [['cat-1', undefined, '111']],
          [['CAT-1', undefined, '222']],
          [
            ['barcode 1', undefined, '333'],
            ['alias-1', undefined, '333'],
            ['alias-2', undefined, '333'],
          ],
          [
            ['cat-2', undefined, '444'],
            ['barcode-2', undefined, '444'],
          ],
        ]);
        expect(result.externalReleases).toEqual({
          inputFileBucketLocation: 'test-bucket',
          inputFileName: 'catalogExports/123/releases-123-20260114142834000.csv',
          fields: [
            { field: 'inputKey', type: 'String' },
            { field: 'channel', type: 'String' },
            { field: 'releaseId', type: 'String' },
          ],
        });
      });
    });

    describe('maps normalised catNo and barcode per distribution channel', () => {
      beforeEach(() => {
        releases = [
          { _id: '111', catNo: ' cat-1 ', distributionChannel: 'dist1' },
          { _id: '222', catNo: ' cat-1 ', distributionChannel: 'dist2' },
          { _id: '333', barcode: 'barcode 1$£.&' },
          { _id: '444', barcode: 'barcode 1$£.&', distributionChannel: 'dist1' },
          { _id: '555', barcode: 'barcode 1$£.&', distributionChannel: 'dist2' },
        ];
      });

      it('small', async () => {
        setupMockQueries({ releases, tracks: [], works: [], contracts: [] });
        const result = await mappingsForIngestion.get(client);
        expect(result.releases).toEqual({
          'cat-1': {
            dist1: '111',
            dist2: '222',
          },
          'barcode 1': {
            dist1: '444',
            dist2: '555',
            undefined: '333',
          },
        });
      });

      it('big', async () => {
        setupMockQueries({ releases, tracks: [], works: [], contracts: [] });
        Release.countDocuments.mockResolvedValue(10001);
        const result = await mappingsForIngestion.get(client, { platform: true });
        expect(mockCsvAddData.mock.calls.map((call) => call[0])).toEqual([
          [['cat-1', 'dist1', '111']],
          [['cat-1', 'dist2', '222']], // TODO note that this lowercases CAT-1, unlike the "small" version!
          [['barcode 1', undefined, '333']],
          [['barcode 1', 'dist1', '444']],
          [['barcode 1', 'dist2', '555']],
        ]);
        expect(result.externalReleases).toEqual({
          inputFileBucketLocation: 'test-bucket',
          inputFileName: 'catalogExports/123/releases-123-20260114142834000.csv',
          fields: [
            { field: 'inputKey', type: 'String' },
            { field: 'channel', type: 'String' },
            { field: 'releaseId', type: 'String' },
          ],
        });
      });
    });
  });

  describe('tracks', () => {
    describe('maps normalised isrc and aliases', () => {
      let tracks;

      beforeEach(() => {
        tracks = [
          { _id: '000' },
          { _id: '111', isrc: ' isrc-1 ' },
          { _id: '222', isrc: 'ISRC1' },
          { _id: '333', aliases: ['alias-1', 'alias-2'] },
        ];
      });

      it('small', async () => {
        setupMockQueries({ releases: [], tracks, works: [], contracts: [] });
        const result = await mappingsForIngestion.get(client);
        expect(result.tracks).toEqual({
          isrc1: '111',
          ISRC1: '222',
          alias1: '333',
          alias2: '333',
        });
      });

      it('big', async () => {
        setupMockQueries({ releases: [], tracks, works: [], contracts: [] });
        Track.countDocuments.mockResolvedValue(10001);
        const result = await mappingsForIngestion.get(client, { platform: true });
        expect(mockCsvAddData.mock.calls.map((call) => call[0])).toEqual([
          [],
          [['isrc1', '111']],
          [['ISRC1', '222']],
          [
            ['alias1', '333'],
            ['alias2', '333'],
          ],
        ]);
        expect(result.externalTracks).toEqual({
          inputFileBucketLocation: 'test-bucket',
          inputFileName: 'catalogExports/123/tracks-123-20260114142834000.csv',
          fields: [
            { field: 'inputKey', type: 'String' },
            { field: 'trackId', type: 'String' },
          ],
        });
      });
    });

    describe('maps normalised alternative id when specified', () => {
      let tracks;

      beforeEach(() => {
        tracks = [
          { _id: '111', isrc: ' isrc-1 ', alternativeId: ' "alt-1" ', useAlternativeId: true },
          { _id: '222', isrc: 'ISRC2', alternativeId: 'alt-xxx' },
          { _id: '333', alternativeId: 'ALT3', useAlternativeId: true },
        ];
      });

      it('small', async () => {
        setupMockQueries({ releases: [], tracks, works: [], contracts: [] });
        const result = await mappingsForIngestion.get({ ...client, features: { useAlternativeId: true } });
        expect(result.tracks).toEqual({
          '"alt-1"': '111',
          ISRC2: '222',
          ALT3: '333',
        });
      });

      it('big', async () => {
        setupMockQueries({ releases: [], tracks, works: [], contracts: [] });
        Track.countDocuments.mockResolvedValue(10001);
        const result = await mappingsForIngestion.get({ ...client, features: { useAlternativeId: true } }, { platform: true });
        expect(mockCsvAddData.mock.calls.map((call) => call[0])).toEqual([
          [['"alt-1"', '111']],
          [['ISRC2', '222']],
          [['ALT3', '333']],
        ]);
        expect(result.externalTracks).toEqual({
          inputFileBucketLocation: 'test-bucket',
          inputFileName: 'catalogExports/123/tracks-123-20260114142834000.csv',
          fields: [
            { field: 'inputKey', type: 'String' },
            { field: 'trackId', type: 'String' },
          ],
        });
      });
    });
  });

  describe('works', () => {
    describe('maps normalised identifier, tunecode, iswc and aliases', () => {
      let works;

      beforeEach(() => {
        works = [
          { _id: '000' },
          { _id: '111', identifier: 'id-$1' },
          { _id: '222', tunecode: 'tune2' },
          { _id: '333', identifier: 'id-3', tunecode: 'tune3', iswc: 'iswc3' },
          { _id: '444', iswc: 'iswc4', aliases: ['alias-1', 'alias-2'] },
        ];
      });

      it('small', async () => {
        setupMockQueries({ releases: [], tracks: [], works, contracts: [] });
        const result = await mappingsForIngestion.get(client);
        expect(result.works).toEqual({
          'id-1': '111',
          tune2: '222',
          'id-3': '333',
          tune3: '333',
          iswc3: '333',
          iswc4: '444',
          'alias-1': '444',
          'alias-2': '444',
        });
      });

      it('big', async () => {
        setupMockQueries({ releases: [], tracks: [], works, contracts: [] });
        Work.countDocuments.mockResolvedValue(10001);
        const result = await mappingsForIngestion.get(client, { platform: true });
        expect(mockCsvAddData.mock.calls.map((call) => call[0])).toEqual([
          [],
          [['id-1', null, '111']],
          [['tune2', null, '222']],
          [
            ['id-3', null, '333'],
            ['tune3', null, '333'],
            ['iswc3', null, '333'],
          ],
          [
            ['iswc4', null, '444'],
            ['alias-1', null, '444'],
            ['alias-2', null, '444'],
          ],
        ]);
        expect(result.externalWorks).toEqual({
          inputFileBucketLocation: 'test-bucket',
          inputFileName: 'catalogExports/123/works-123-20260114142834000.csv',
          fields: [
            { field: 'inputKey', type: 'String' },
            { field: 'society', type: 'String' },
            { field: 'workId', type: 'String' },
          ],
        });
      });
    });

    describe('maps normalised society identifiers by society', () => {
      let works;

      beforeEach(() => {
        works = [
          { _id: '111', societyIdentifiers: [{ identifier: 'id-$1', society: 's1' }] },
          { _id: '222', societyIdentifiers: [{ identifier: 'id-$1', society: 's2' }, { identifier: 'id-$2', society: 's3' }] },
        ];
      });

      it('small', async () => {
        setupMockQueries({ releases: [], tracks: [], works, contracts: [] });
        const result = await mappingsForIngestion.get(client, {});
        expect(result.works).toEqual({
          'id-1': {
            s1: '111',
            s2: '222',
          },
          'id-2': {
            s3: '222',
          },
        });
      });

      it('big', async () => {
        setupMockQueries({ releases: [], tracks: [], works, contracts: [] });
        Work.countDocuments.mockResolvedValue(10001);
        const result = await mappingsForIngestion.get(client, { platform: true });
        expect(mockCsvAddData.mock.calls.map((call) => call[0])).toEqual([
          [
            ['id-1', 's1', '111'],
          ],
          [
            ['id-1', 's2', '222'],
            ['id-2', 's3', '222'],
          ],
        ]);
        expect(result.externalWorks).toEqual({
          inputFileBucketLocation: 'test-bucket',
          inputFileName: 'catalogExports/123/works-123-20260114142834000.csv',
          fields: [
            { field: 'inputKey', type: 'String' },
            { field: 'society', type: 'String' },
            { field: 'workId', type: 'String' },
          ],
        });
      });
    });
  });

  describe('contracts', () => {
    describe('maps normalised name and aliases', () => {
      let contracts;

      beforeEach(() => {
        contracts = [
          { _id: '000' },
          { _id: '111', name: 'contract$1' },
          { _id: '222', name: 'contract-2' },
          { _id: '333', aliases: ['alias-1', 'alias-2'] },
        ];
      });

      it('small', async () => {
        setupMockQueries({ releases: [], tracks: [], works: [], contracts });
        const result = await mappingsForIngestion.get(client, {});
        expect(result.contracts).toEqual({
          contract1: '111',
          'contract-2': '222',
          'alias-1': '333',
          'alias-2': '333',
        });
      });

      it('big', async () => {
        setupMockQueries({ releases: [], tracks: [], works: [], contracts });
        Contract.countDocuments.mockResolvedValue(10001);
        const result = await mappingsForIngestion.get(client, { platform: true });
        expect(mockCsvAddData.mock.calls.map((call) => call[0])).toEqual([
          [],
          [['contract1', '111']],
          [['contract-2', '222']],
          [
            ['alias-1', '333'],
            ['alias-2', '333'],
          ],
        ]);
        expect(result.externalContracts).toEqual({
          inputFileBucketLocation: 'test-bucket',
          inputFileName: 'catalogExports/123/contracts-123-20260114142834000.csv',
          fields: [
            { field: 'inputKey', type: 'String' },
            { field: 'contractId', type: 'String' },
          ],
        });
      });
    });
  });
});
