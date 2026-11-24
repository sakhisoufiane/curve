const { EventEmitter } = require('events');

// Mock dependencies before requiring the module
jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
  databaseUtils: {
    getMongoUrl: jest.fn(() => 'mongodb://localhost:27017'),
    getMongoConnectOpts: jest.fn(() => ({})),
    getMongoDBName: jest.fn(() => 'testdb'),
  },
  fileManager: {
    uploadToS3: jest.fn((key, path, cb) => cb(null, key)),
    publicLink24Hours: jest.fn((key, cb) => cb(null, `https://s3.amazonaws.com/${key}`)),
  },
}));

jest.mock('mongodb', () => {
  const mockObjectId = jest.fn((id) => ({ toString: () => id, _id: id }));
  mockObjectId.isValid = jest.fn(() => true);

  return {
    ObjectId: mockObjectId,
    MongoClient: {
      connect: jest.fn(),
    },
  };
});

jest.mock('app-root-dir', () => ({
  get: jest.fn(() => '/mock/app/root'),
}));

jest.mock('moment', () => {
  const mockMoment = jest.fn(() => ({
    format: jest.fn((fmt) => (fmt === 'X' ? '1234567890' : '20260119120000000')),
  }));
  return mockMoment;
});

jest.mock('../../models/client', () => ({
  findById: jest.fn(),
}));

jest.mock('../../models/notification', () => ({
  generate: jest.fn(),
}));

// Create mock streams
const createMockWriteStream = () => {
  const stream = new EventEmitter();
  stream.write = jest.fn();
  stream.end = jest.fn();
  return stream;
};

const createMockReadStream = (lines) => {
  const stream = new EventEmitter();
  // Simulate readable stream behavior for readline
  stream.on = jest.fn((event, handler) => {
    EventEmitter.prototype.on.call(stream, event, handler);
    return stream;
  });
  stream._lines = lines;
  return stream;
};

jest.mock('fs', () => ({
  createWriteStream: jest.fn(),
  createReadStream: jest.fn(),
  promises: {
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(),
}));

// Now require the modules
const { MongoClient } = require('mongodb');
const fs = require('fs');
const readline = require('readline');
const { fileManager, logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const Notification = require('../../models/notification');
const { CSVRawExport } = require('./mongodb-export');

describe('CSVRawExport', () => {
  let mockCollection;
  let mockDb;
  let mockMongoClient;
  let mockCursor;
  let mockWriteStream;
  let mockOutputWriteStream;
  let mockReadStream;
  let mockReadlineInterface;

  const mockCurveUser = {
    clientId: 'client123',
    email: 'test@example.com',
  };

  const mockClient = {
    _id: 'client123',
    name: 'Test Client',
  };

  const mockDocuments = [
    { _id: 'doc1', name: 'Document 1', value: 100 },
    { _id: 'doc2', name: 'Document 2', value: 200 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock cursor with async iterator
    mockCursor = {
      async* [Symbol.asyncIterator]() {
        for (const doc of mockDocuments) {
          yield doc;
        }
      },
    };

    // Setup mock collection
    mockCollection = {
      find: jest.fn(() => mockCursor),
    };

    // Setup mock db
    mockDb = {
      collection: jest.fn(() => mockCollection),
    };

    // Setup mock mongo client
    mockMongoClient = {
      db: jest.fn(() => mockDb),
      close: jest.fn(),
    };

    MongoClient.connect.mockResolvedValue(mockMongoClient);

    // Setup mock write streams
    mockWriteStream = createMockWriteStream();
    mockOutputWriteStream = createMockWriteStream();

    fs.createWriteStream
      .mockReturnValueOnce(mockWriteStream) // JSON file
      .mockReturnValueOnce(mockOutputWriteStream); // CSV file

    // Setup mock read stream and readline
    const jsonLines = mockDocuments.map((doc) => JSON.stringify(doc));
    mockReadStream = createMockReadStream(jsonLines);
    fs.createReadStream.mockReturnValue(mockReadStream);

    mockReadlineInterface = {
      async* [Symbol.asyncIterator]() {
        for (const doc of mockDocuments) {
          yield JSON.stringify(doc);
        }
      },
    };
    readline.createInterface.mockReturnValue(mockReadlineInterface);

    // Setup Client mock
    Client.findById.mockResolvedValue(mockClient);
  });

  describe('existing behavior (async with notification)', () => {
    it('should connect to MongoDB and query the specified collection', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(MongoClient.connect).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('releases');
      expect(mockCollection.find).toHaveBeenCalledWith(filter, { batchSize: 1000 });
    });

    it('should convert string IDs to ObjectId when filter._id.$in is present', async () => {
      const { ObjectId } = require('mongodb');
      const filter = { clientId: 'client123', _id: { $in: ['id1', 'id2'] } };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(ObjectId).toHaveBeenCalledWith('id1');
      expect(ObjectId).toHaveBeenCalledWith('id2');
    });

    it('should write documents to JSON file', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(fs.createWriteStream).toHaveBeenCalledWith('/mock/app/root/tmp/export_1234567890.json');
      expect(mockWriteStream.write).toHaveBeenCalled();
      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('should close MongoDB connection after reading documents', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(mockMongoClient.close).toHaveBeenCalled();
    });

    it('should convert JSON to CSV and write output', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(fs.createReadStream).toHaveBeenCalledWith('/mock/app/root/tmp/export_1234567890.json', 'utf8');
      expect(readline.createInterface).toHaveBeenCalled();
      expect(mockOutputWriteStream.write).toHaveBeenCalled();
      expect(mockOutputWriteStream.end).toHaveBeenCalled();
    });

    it('should upload CSV to S3', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(fileManager.uploadToS3).toHaveBeenCalledWith(
        expect.stringContaining('raw_exports/Test Client - releases raw export'),
        '/mock/app/root/tmp/export_1234567890.csv',
        expect.any(Function),
      );
    });

    it('should generate a 24-hour public link', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(fileManager.publicLink24Hours).toHaveBeenCalled();
    });

    it('should call Notification.generate with correct parameters', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(Notification.generate).toHaveBeenCalledWith(
        'Releases Raw Export Ready',
        'Your Releases Raw Export for Test Client is Ready to Download',
        expect.stringContaining('https://s3.amazonaws.com/'),
        mockCurveUser,
        expect.objectContaining({
          identifier: 'exportDownload',
          curveUser: mockCurveUser,
          client: mockClient,
          subject: 'Your Raw Export for Test Client is Ready to Download',
        }),
        expect.any(Function),
      );
    });

    it('should log export completion', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Exported releases to'),
      );
    });

    it('should skip empty lines when reading JSON file', async () => {
      mockReadlineInterface = {
        async* [Symbol.asyncIterator]() {
          yield JSON.stringify(mockDocuments[0]);
          yield '   '; // empty/whitespace line
          yield JSON.stringify(mockDocuments[1]);
        },
      };
      readline.createInterface.mockReturnValue(mockReadlineInterface);

      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      // Should still complete without error
      expect(mockOutputWriteStream.end).toHaveBeenCalled();
    });

    it('should handle and log invalid JSON lines', async () => {
      mockReadlineInterface = {
        async* [Symbol.asyncIterator]() {
          yield JSON.stringify(mockDocuments[0]);
          yield 'invalid json {{{';
          yield JSON.stringify(mockDocuments[1]);
        },
      };
      readline.createInterface.mockReturnValue(mockReadlineInterface);

      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      expect(logger.error).toHaveBeenCalledWith('Skipping invalid JSON line:', 'invalid json {{{');
    });

    it('should escape quotes in CSV values', async () => {
      const docsWithQuotes = [
        { _id: 'doc1', name: 'Document with "quotes"', value: 100 },
      ];

      mockCursor = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithQuotes) {
            yield doc;
          }
        },
      };
      mockCollection.find.mockReturnValue(mockCursor);

      mockReadlineInterface = {
        async* [Symbol.asyncIterator]() {
          yield JSON.stringify(docsWithQuotes[0]);
        },
      };
      readline.createInterface.mockReturnValue(mockReadlineInterface);

      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      // Check that CSV output includes escaped quotes
      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const csvDataRow = writeCalls.find((call) => call[0].includes('Document with'));
      expect(csvDataRow[0]).toContain('""quotes""');
    });

    it('should stringify object values in CSV', async () => {
      const docsWithObjects = [
        { _id: 'doc1', metadata: { key: 'value' } },
      ];

      mockCursor = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithObjects) {
            yield doc;
          }
        },
      };
      mockCollection.find.mockReturnValue(mockCursor);

      mockReadlineInterface = {
        async* [Symbol.asyncIterator]() {
          yield JSON.stringify(docsWithObjects[0]);
        },
      };
      readline.createInterface.mockReturnValue(mockReadlineInterface);

      const filter = { clientId: 'client123' };

      await CSVRawExport({ curveUser: mockCurveUser, collectionName: 'releases', filter });

      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const csvDataRow = writeCalls.find((call) => call[0].includes('key'));
      // CSV escapes quotes, so {"key":"value"} becomes {""key"":""value""}
      expect(csvDataRow[0]).toContain('{""key"":""value""}');
    });
  });

  describe('sync option', () => {
    it('should return { csvPublicLink } when sync is true', async () => {
      const filter = { clientId: 'client123' };

      const result = await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        sync: true,
      });

      expect(result).toEqual({
        csvPublicLink: expect.stringContaining('https://s3.amazonaws.com/'),
      });
    });

    it('should NOT call Notification.generate when sync is true', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        sync: true,
      });

      expect(Notification.generate).not.toHaveBeenCalled();
    });

    it('should still call Notification.generate when sync is false', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        sync: false,
      });

      expect(Notification.generate).toHaveBeenCalled();
    });

    it('should still call Notification.generate when sync is not provided', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
      });

      expect(Notification.generate).toHaveBeenCalled();
    });
  });

  describe('excludeFields option', () => {
    it('should exclude specified fields from CSV headers', async () => {
      const docsWithSensitiveData = [
        { _id: 'doc1', name: 'Document 1', email: 'secret@test.com', password: 'hash123' },
        { _id: 'doc2', name: 'Document 2', email: 'another@test.com', password: 'hash456' },
      ];

      mockCursor = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithSensitiveData) {
            yield doc;
          }
        },
      };
      mockCollection.find.mockReturnValue(mockCursor);

      mockReadlineInterface = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithSensitiveData) {
            yield JSON.stringify(doc);
          }
        },
      };
      readline.createInterface.mockReturnValue(mockReadlineInterface);

      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        excludeFields: ['email', 'password'],
      });

      // Check that the header row does NOT include excluded fields
      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const headerRow = writeCalls[0][0]; // First write is the header
      expect(headerRow).toContain('_id');
      expect(headerRow).toContain('name');
      expect(headerRow).not.toContain('email');
      expect(headerRow).not.toContain('password');
    });

    it('should exclude a single field from CSV headers', async () => {
      const docsWithSensitiveData = [
        { _id: 'doc1', name: 'Document 1', secretField: 'hidden' },
      ];

      mockCursor = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithSensitiveData) {
            yield doc;
          }
        },
      };
      mockCollection.find.mockReturnValue(mockCursor);

      mockReadlineInterface = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithSensitiveData) {
            yield JSON.stringify(doc);
          }
        },
      };
      readline.createInterface.mockReturnValue(mockReadlineInterface);

      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        excludeFields: ['secretField'],
      });

      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const headerRow = writeCalls[0][0];
      expect(headerRow).toContain('_id');
      expect(headerRow).toContain('name');
      expect(headerRow).not.toContain('secretField');
    });

    it('should include all fields when excludeFields is empty array', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        excludeFields: [],
      });

      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const headerRow = writeCalls[0][0];
      expect(headerRow).toContain('_id');
      expect(headerRow).toContain('name');
      expect(headerRow).toContain('value');
    });

    it('should include all fields when excludeFields is not provided', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
      });

      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const headerRow = writeCalls[0][0];
      expect(headerRow).toContain('_id');
      expect(headerRow).toContain('name');
      expect(headerRow).toContain('value');
    });

    it('should handle excludeFields that do not exist in documents', async () => {
      const filter = { clientId: 'client123' };

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        excludeFields: ['nonExistentField', 'anotherMissingField'],
      });

      // Should complete without error
      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const headerRow = writeCalls[0][0];
      expect(headerRow).toContain('_id');
      expect(headerRow).toContain('name');
      expect(headerRow).toContain('value');
    });

    it('should work correctly with sync option combined with excludeFields', async () => {
      const docsWithSensitiveData = [
        { _id: 'doc1', name: 'Document 1', sensitiveData: 'secret' },
      ];

      mockCursor = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithSensitiveData) {
            yield doc;
          }
        },
      };
      mockCollection.find.mockReturnValue(mockCursor);

      mockReadlineInterface = {
        async* [Symbol.asyncIterator]() {
          for (const doc of docsWithSensitiveData) {
            yield JSON.stringify(doc);
          }
        },
      };
      readline.createInterface.mockReturnValue(mockReadlineInterface);

      const filter = { clientId: 'client123' };

      const result = await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        sync: true,
        excludeFields: ['sensitiveData'],
      });

      expect(result).toEqual({
        csvPublicLink: expect.stringContaining('https://s3.amazonaws.com/'),
      });

      const writeCalls = mockOutputWriteStream.write.mock.calls;
      const headerRow = writeCalls[0][0];
      expect(headerRow).not.toContain('sensitiveData');
      expect(Notification.generate).not.toHaveBeenCalled();
    });

    it('should log debug info including excludeFields', async () => {
      const filter = { clientId: 'client123' };
      const excludeFields = ['email', 'password'];

      await CSVRawExport({
        curveUser: mockCurveUser,
        collectionName: 'releases',
        filter,
        excludeFields,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('"excludeFields":["email","password"]'),
      );
    });
  });
});
