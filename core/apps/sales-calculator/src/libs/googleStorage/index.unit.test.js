/* eslint-disable @typescript-eslint/no-var-requires */
const testUtils = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Storage, TransferManager } = require('@google-cloud/storage');

const GoogleStorage = require('./index');

// Mock all external dependencies
jest.mock('@google-cloud/storage');
jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: {
    info: jest.fn()
  }
}));


describe('GoogleStorage', () => {
  let mockStorage;
  let mockBucket;
  let mockFile;
  let mockTransferManager;
  let bucketName;
  let googleStorage;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup test data
    bucketName = testUtils.randomString(10);
    googleStorage = new GoogleStorage(bucketName);

    // Setup mock file
    mockFile = {
      name: `${testUtils.randomString(8)  }.txt`,
      download: jest.fn(),
      createReadStream: jest.fn()
    };

    // Setup mock bucket
    mockBucket = {
      getFiles: jest.fn(),
      file: jest.fn().mockReturnValue(mockFile),
      upload: jest.fn()
    };

    // Setup mock storage
    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket)
    };

    // Setup mock transfer manager
    mockTransferManager = {
      downloadFileInChunks: jest.fn()
    };

    // Mock constructors
    Storage.mockImplementation(() => mockStorage);
    TransferManager.mockImplementation(() => mockTransferManager);
  });

  describe('constructor', () => {
    it('should create GoogleStorage instance with valid bucket name', () => {
      const testBucketName = testUtils.randomString(10);
      const storage = new GoogleStorage(testBucketName);

      expect(storage.bucketName).toBe(testBucketName);
      expect(storage).toBeInstanceOf(GoogleStorage);
    });

    it('should throw error when bucket name is not provided', () => {
      expect(() => new GoogleStorage()).toThrow('Bucket Name parameter is required');
      expect(() => new GoogleStorage(null)).toThrow('Bucket Name parameter is required');
      expect(() => new GoogleStorage('')).toThrow('Bucket Name parameter is required');
      expect(() => new GoogleStorage(undefined)).toThrow('Bucket Name parameter is required');
    });

    it('should accept various bucket name formats', () => {
      const bucketNames = [
        'my-bucket',
        'my_bucket_123',
        'bucket-with-dashes',
        'bucket123',
        testUtils.randomString(15)
      ];

      bucketNames.forEach(name => {
        expect(() => new GoogleStorage(name)).not.toThrow();
        const storage = new GoogleStorage(name);
        expect(storage.bucketName).toBe(name);
      });
    });

    it('should handle numeric bucket names', () => {
      const numericBucket = '123456789';
      const storage = new GoogleStorage(numericBucket);
      expect(storage.bucketName).toBe(numericBucket);
    });
  });

  describe('listAllFiles', () => {
    it('should return all files from bucket', async () => {
      const mockFiles = [
        { name: 'file1.txt' },
        { name: 'file2.json' },
        { name: 'file3.csv' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.listAllFiles();

      expect(Storage).toHaveBeenCalledWith({
        credentials: {
          client_email: process.env.BQ_client_email,
          private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : ''
        }
      });
      expect(mockStorage.bucket).toHaveBeenCalledWith(bucketName);
      expect(mockBucket.getFiles).toHaveBeenCalledWith();
      expect(result).toEqual(mockFiles);
    });

    it('should return empty array when no files exist', async () => {
      mockBucket.getFiles.mockResolvedValue([[]]);

      const result = await googleStorage.listAllFiles();

      expect(result).toEqual([]);
    });

    it('should handle Google Cloud Storage errors', async () => {
      const error = new Error('Bucket not found');
      mockBucket.getFiles.mockRejectedValue(error);

      await expect(googleStorage.listAllFiles()).rejects.toThrow('Bucket not found');
    });

    it('should create new Storage instance for each call', async () => {
      mockBucket.getFiles.mockResolvedValue([[]]);

      await googleStorage.listAllFiles();
      await googleStorage.listAllFiles();

      expect(Storage).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFilteredFiles', () => {
    it('should return filtered files based on key', async () => {
      const mockFiles = [
        { name: 'test-file1.txt' },
        { name: 'other-file.json' },
        { name: 'test-file2.csv' },
        { name: 'another.txt' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.getFilteredFiles({ key: 'test' });

      expect(mockBucket.getFiles).toHaveBeenCalledWith();
      expect(result).toEqual([
        { name: 'test-file1.txt' },
        { name: 'test-file2.csv' }
      ]);
    });

    it('should return empty array when no files match filter', async () => {
      const mockFiles = [
        { name: 'file1.txt' },
        { name: 'file2.json' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.getFilteredFiles({ key: 'nonexistent' });

      expect(result).toEqual([]);
    });

    it('should throw error when key parameter is missing', async () => {
      await expect(googleStorage.getFilteredFiles({})).rejects.toThrow('Key parameter is required');
      await expect(googleStorage.getFilteredFiles({ key: null })).rejects.toThrow('Key parameter is required');
      await expect(googleStorage.getFilteredFiles({ key: '' })).rejects.toThrow('Key parameter is required');
      await expect(googleStorage.getFilteredFiles({ key: undefined })).rejects.toThrow('Key parameter is required');
    });

    it('should handle partial matches in file names', async () => {
      const mockFiles = [
        { name: 'prefix-test-suffix.txt' },
        { name: 'test.json' },
        { name: 'testing123.csv' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.getFilteredFiles({ key: 'test' });

      expect(result).toEqual(mockFiles); // All files contain 'test'
    });

    it('should be case sensitive in filtering', async () => {
      const mockFiles = [
        { name: 'Test-file.txt' },
        { name: 'test-file.json' },
        { name: 'TEST-file.csv' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.getFilteredFiles({ key: 'test' });

      expect(result).toEqual([{ name: 'test-file.json' }]);
    });

    it('should handle special characters in key', async () => {
      const mockFiles = [
        { name: 'file-2023.txt' },
        { name: 'file_2023.json' },
        { name: 'file.2023.csv' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.getFilteredFiles({ key: '2023' });

      expect(result).toEqual(mockFiles); // All files contain '2023'
    });
  });

  describe('getFilesByFolder', () => {
    it('should return files from specific folder', async () => {
      const folderName = 'documents';
      const mockFiles = [
        { name: 'documents/file1.txt' },
        { name: 'documents/file2.json' },
        { name: 'documents/subfolder/file3.csv' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.getFilesByFolder({ folderName });

      expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: 'documents/' });
      expect(result).toEqual(mockFiles);
    });

    it('should throw error when folder name is missing', async () => {
      await expect(googleStorage.getFilesByFolder({})).rejects.toThrow('Folder Name parameter is required');
      await expect(googleStorage.getFilesByFolder({ folderName: null })).rejects.toThrow('Folder Name parameter is required');
      await expect(googleStorage.getFilesByFolder({ folderName: '' })).rejects.toThrow('Folder Name parameter is required');
      await expect(googleStorage.getFilesByFolder({ folderName: undefined })).rejects.toThrow('Folder Name parameter is required');
    });

    it('should return empty array when folder has no files', async () => {
      mockBucket.getFiles.mockResolvedValue([[]]);

      const result = await googleStorage.getFilesByFolder({ folderName: 'empty-folder' });

      expect(result).toEqual([]);
    });

    it('should handle nested folder paths', async () => {
      const folderName = 'documents/2023/reports';
      const mockFiles = [
        { name: 'documents/2023/reports/report1.pdf' },
        { name: 'documents/2023/reports/report2.pdf' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await googleStorage.getFilesByFolder({ folderName });

      expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: 'documents/2023/reports/' });
      expect(result).toEqual(mockFiles);
    });

    it('should handle folder names with special characters', async () => {
      const folderName = 'folder-with_special.chars';
      mockBucket.getFiles.mockResolvedValue([[]]);

      await googleStorage.getFilesByFolder({ folderName });

      expect(mockBucket.getFiles).toHaveBeenCalledWith({ prefix: 'folder-with_special.chars/' });
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully on first attempt', async () => {
      const fileName = 'test-file.txt';
      const destination = '/tmp/test-file.txt';
      const mockResponse = [Buffer.from('file content')];

      mockFile.download.mockResolvedValue(mockResponse);

      const result = await googleStorage.downloadFile({ file: fileName, destination });

      expect(mockStorage.bucket).toHaveBeenCalledWith(bucketName);
      expect(mockBucket.file).toHaveBeenCalledWith(fileName);
      expect(mockFile.download).toHaveBeenCalledWith({ destination });
      expect(result).toEqual(mockResponse);
    });

    it('should retry download on failure and succeed', async () => {
      const fileName = 'test-file.txt';
      const destination = '/tmp/test-file.txt';
      const mockResponse = [Buffer.from('file content')];

      mockFile.download
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(mockResponse);

      // Mock delay function to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {};
      });

      const result = await googleStorage.downloadFile({ file: fileName, destination });

      expect(mockFile.download).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);

      // Restore setTimeout
      jest.restoreAllMocks();
    });

    it('should throw error after maximum retries exceeded', async () => {
      const fileName = 'test-file.txt';
      const destination = '/tmp/test-file.txt';
      const error = new Error('Persistent error');

      mockFile.download.mockRejectedValue(error);

      // Mock delay function to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {};
      });

      await expect(googleStorage.downloadFile({ file: fileName, destination })).rejects.toThrow('Persistent error');

      expect(mockFile.download).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(logger.info).toHaveBeenCalledTimes(3);

      // Restore setTimeout
      jest.restoreAllMocks();
    });

    it('should handle missing file parameter', async () => {
      // The method doesn't explicitly validate parameters, but Google Cloud SDK will handle this
      const destination = '/tmp/test-file.txt';
      mockFile.download.mockResolvedValue([Buffer.from('content')]);

      await googleStorage.downloadFile({ file: undefined, destination });

      expect(mockBucket.file).toHaveBeenCalledWith(undefined);
    });

    it('should handle missing destination parameter', async () => {
      const fileName = 'test-file.txt';
      mockFile.download.mockResolvedValue([Buffer.from('content')]);

      await googleStorage.downloadFile({ file: fileName, destination: undefined });

      expect(mockFile.download).toHaveBeenCalledWith({ destination: undefined });
    });
  });

  describe('streamNDJSONToArray', () => {
    let mockReadlineInterface;
    let mockReadStream;

    beforeEach(() => {
      mockReadlineInterface = {
        on: jest.fn(),
        close: jest.fn()
      };

      mockReadStream = {
        on: jest.fn(),
        pipe: jest.fn()
      };

      mockFile.createReadStream.mockReturnValue(mockReadStream);

      // Mock readline.createInterface
      const readline = require('readline');
      jest.spyOn(readline, 'createInterface').mockReturnValue(mockReadlineInterface);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should parse NDJSON file and return array of objects', async () => {
      const fileName = 'data.json';
      const mockData = [
        '{"id": 1, "name": "John"}',
        '{"id": 2, "name": "Jane"}',
        '{"id": 3, "name": "Bob"}'
      ];

      // Mock readline interface behavior
      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          // Simulate line events
          setTimeout(() => {
            mockData.forEach(line => callback(line));
          }, 0);
        } else if (event === 'close') {
          // Simulate close event after all lines
          setTimeout(() => callback(), 10);
        }
        return mockReadlineInterface;
      });

      const resultPromise = googleStorage.streamNDJSONToArray(fileName);
      
      // Wait for async operations to complete
      const result = await resultPromise;

      expect(mockStorage.bucket).toHaveBeenCalledWith(bucketName);
      expect(mockBucket.file).toHaveBeenCalledWith(fileName);
      expect(mockFile.createReadStream).toHaveBeenCalled();
      
      expect(result).toEqual([
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
        { id: 3, name: "Bob" }
      ]);
    });

    it('should handle empty NDJSON file', async () => {
      const fileName = 'empty.json';

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(), 0);
        }
        return mockReadlineInterface;
      });

      const result = await googleStorage.streamNDJSONToArray(fileName);

      expect(result).toEqual([]);
    });

    it('should reject when JSON parsing fails', async () => {
      const fileName = 'invalid.json';
      const invalidLine = '{"invalid": json}'; // Missing quotes around json

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          setTimeout(() => callback(invalidLine), 0);
        }
        return mockReadlineInterface;
      });

      await expect(googleStorage.streamNDJSONToArray(fileName)).rejects.toThrow(
        `Failed to parse line as JSON: ${invalidLine}`
      );
    });

    it('should handle mixed valid and invalid JSON lines', async () => {
      const fileName = 'mixed.json';
      const validLine = '{"id": 1, "name": "John"}';
      const invalidLine = '{"invalid": json}';

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          setTimeout(() => {
            callback(validLine);
            callback(invalidLine); // This should cause rejection
          }, 0);
        }
        return mockReadlineInterface;
      });

      await expect(googleStorage.streamNDJSONToArray(fileName)).rejects.toThrow(
        `Failed to parse line as JSON: ${invalidLine}`
      );
    });

    it('should handle stream errors', async () => {
      const fileName = 'error.json';
      const streamError = new Error('Stream read error');

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(streamError), 0);
        }
        return mockReadlineInterface;
      });

      await expect(googleStorage.streamNDJSONToArray(fileName)).rejects.toThrow('Stream read error');
    });

    it('should handle large NDJSON files with many objects', async () => {
      const fileName = 'large.json';
      const largeDataset = [];
      
      // Generate 1000 JSON objects
      for (let i = 0; i < 1000; i++) {
        largeDataset.push(`{"id": ${i}, "value": "item_${i}"}`);
      }

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          setTimeout(() => {
            largeDataset.forEach(line => callback(line));
          }, 0);
        } else if (event === 'close') {
          setTimeout(() => callback(), 10);
        }
        return mockReadlineInterface;
      });

      const result = await googleStorage.streamNDJSONToArray(fileName);

      expect(result).toHaveLength(1000);
      expect(result[0]).toEqual({ id: 0, value: "item_0" });
      expect(result[999]).toEqual({ id: 999, value: "item_999" });
    });

    it('should handle complex nested JSON objects', async () => {
      const fileName = 'complex.json';
      const complexData = [
        '{"user": {"id": 1, "profile": {"name": "John", "settings": {"theme": "dark"}}}, "metadata": {"created": "2023-01-01"}}',
        '{"user": {"id": 2, "profile": {"name": "Jane", "settings": {"theme": "light"}}}, "metadata": {"created": "2023-01-02"}}'
      ];

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          setTimeout(() => {
            complexData.forEach(line => callback(line));
          }, 0);
        } else if (event === 'close') {
          setTimeout(() => callback(), 10);
        }
        return mockReadlineInterface;
      });

      const result = await googleStorage.streamNDJSONToArray(fileName);

      expect(result).toEqual([
        {
          user: { id: 1, profile: { name: "John", settings: { theme: "dark" } } },
          metadata: { created: "2023-01-01" }
        },
        {
          user: { id: 2, profile: { name: "Jane", settings: { theme: "light" } } },
          metadata: { created: "2023-01-02" }
        }
      ]);
    });

    it('should handle empty lines gracefully', async () => {
      const fileName = 'with-empty-lines.json';
      const dataWithEmptyLines = [
        '{"id": 1, "name": "John"}',
        '', // Empty line
        '{"id": 2, "name": "Jane"}',
        '   ', // Whitespace only
        '{"id": 3, "name": "Bob"}'
      ];

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          setTimeout(() => {
            dataWithEmptyLines.forEach(line => callback(line));
          }, 0);
        } else if (event === 'close') {
          setTimeout(() => callback(), 10);
        }
        return mockReadlineInterface;
      });

      // Empty lines should cause JSON parse errors
      await expect(googleStorage.streamNDJSONToArray(fileName)).rejects.toThrow(
        'Failed to parse line as JSON:'
      );
    });

    it('should create readline interface with correct options', async () => {
      const fileName = 'test.json';
      
      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(), 0);
        }
        return mockReadlineInterface;
      });

      await googleStorage.streamNDJSONToArray(fileName);

      const readline = require('readline');
      expect(readline.createInterface).toHaveBeenCalledWith({
        input: mockReadStream,
        crlfDelay: Infinity
      });
    });

    it('should handle different file extensions', async () => {
      const fileNames = ['data.json', 'export.jsonl', 'logs.ndjson', 'file.txt'];
      
      for (const fileName of fileNames) {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        
        // Re-setup the mocks for this iteration
        mockReadlineInterface.on.mockImplementation((event, callback) => {
          if (event === 'line') {
            setTimeout(() => callback('{"test": true}'), 0);
          } else if (event === 'close') {
            setTimeout(() => callback(), 10);
          }
          return mockReadlineInterface;
        });

        const result = await googleStorage.streamNDJSONToArray(fileName);
        expect(result).toEqual([{ test: true }]);
        expect(mockBucket.file).toHaveBeenCalledWith(fileName);
      }
    });

    it('should handle special characters in JSON content', async () => {
      const fileName = 'special-chars.json';
      const specialData = [
        '{"message": "Hello\\nWorld", "emoji": "🎉", "unicode": "café"}',
        '{"text": "Quote: \\"Hello\\"", "backslash": "C:\\\\path\\\\file.txt"}'
      ];

      mockReadlineInterface.on.mockImplementation((event, callback) => {
        if (event === 'line') {
          setTimeout(() => {
            specialData.forEach(line => callback(line));
          }, 0);
        } else if (event === 'close') {
          setTimeout(() => callback(), 10);
        }
        return mockReadlineInterface;
      });

      const result = await googleStorage.streamNDJSONToArray(fileName);

      expect(result).toEqual([
        { message: "Hello\nWorld", emoji: "🎉", unicode: "café" },
        { text: 'Quote: "Hello"', backslash: "C:\\path\\file.txt" }
      ]);
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const source = '/tmp/local-file.txt';
      const destination = 'remote-file.txt';
      const mockResponse = [{ name: destination }];

      mockBucket.upload.mockResolvedValue(mockResponse);

      const result = await googleStorage.uploadFile({ source, destination });

      expect(mockStorage.bucket).toHaveBeenCalledWith(bucketName);
      expect(mockBucket.upload).toHaveBeenCalledWith(source, {
        destination,
        metadata: {}
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle upload errors', async () => {
      const source = '/tmp/local-file.txt';
      const destination = 'remote-file.txt';
      const error = new Error('Upload failed');

      mockBucket.upload.mockRejectedValue(error);

      await expect(googleStorage.uploadFile({ source, destination })).rejects.toThrow('Upload failed');
    });

    it('should handle missing parameters', async () => {
      mockBucket.upload.mockResolvedValue([{}]);

      await googleStorage.uploadFile({ source: undefined, destination: undefined });

      expect(mockBucket.upload).toHaveBeenCalledWith(undefined, {
        destination: undefined,
        metadata: {}
      });
    });

    it('should always include empty metadata object', async () => {
      const source = '/tmp/local-file.txt';
      const destination = 'remote-file.txt';

      mockBucket.upload.mockResolvedValue([{}]);

      await googleStorage.uploadFile({ source, destination });

      expect(mockBucket.upload).toHaveBeenCalledWith(source, {
        destination,
        metadata: {}
      });
    });
  });

  describe('downloadFileConcurrently', () => {
    it('should download file concurrently successfully', async () => {
      const fileName = 'large-file.txt';
      const destination = '/tmp/large-file.txt';
      const chunkSize = 2048;
      const mockResponse = { success: true };

      mockTransferManager.downloadFileInChunks.mockResolvedValue(mockResponse);

      const result = await googleStorage.downloadFileConcurrently({
        file: fileName,
        destination,
        chunkSize
      });

      expect(Storage).toHaveBeenCalledWith({
        credentials: {
          client_email: process.env.BQ_client_email,
          private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : ''
        }
      });
      expect(TransferManager).toHaveBeenCalledWith(mockBucket);
      expect(mockTransferManager.downloadFileInChunks).toHaveBeenCalledWith(fileName, {
        destination,
        chunkSizeBytes: chunkSize
      });
      expect(logger.info).toHaveBeenCalledWith('GOOGLE CLOUD STORAGE | Download Response');
      expect(result).toEqual(mockResponse);
    });

    it('should use default chunk size when not provided', async () => {
      const fileName = 'file.txt';
      const destination = '/tmp/file.txt';
      const mockResponse = { success: true };

      mockTransferManager.downloadFileInChunks.mockResolvedValue(mockResponse);

      await googleStorage.downloadFileConcurrently({ file: fileName, destination });

      expect(mockTransferManager.downloadFileInChunks).toHaveBeenCalledWith(fileName, {
        destination,
        chunkSizeBytes: 1024 // Default chunk size
      });
    });

    it('should retry on failure and succeed', async () => {
      const fileName = 'file.txt';
      const destination = '/tmp/file.txt';
      const mockResponse = { success: true };

      mockTransferManager.downloadFileInChunks
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      // Mock delay function
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {};
      });

      const result = await googleStorage.downloadFileConcurrently({ file: fileName, destination });

      expect(mockTransferManager.downloadFileInChunks).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('GOOGLE CLOUD STORAGE | Retrying download... (Attempt 1)', expect.any(Error));
      expect(logger.info).toHaveBeenCalledWith('GOOGLE CLOUD STORAGE | Download Response');
      expect(result).toEqual(mockResponse);

      // Restore setTimeout
      jest.restoreAllMocks();
    });

    it('should handle TransferManager creation correctly', async () => {
      const fileName = 'file.txt';
      const destination = '/tmp/file.txt';
      const mockResponse = { success: true };

      mockTransferManager.downloadFileInChunks.mockResolvedValue(mockResponse);

      await googleStorage.downloadFileConcurrently({ file: fileName, destination });

      expect(TransferManager).toHaveBeenCalledWith(mockBucket);
      expect(mockTransferManager.downloadFileInChunks).toHaveBeenCalledWith(fileName, {
        destination,
        chunkSizeBytes: 1024
      });
    });

    it('should handle custom chunk sizes', async () => {
      const fileName = 'file.txt';
      const destination = '/tmp/file.txt';
      const customChunkSizes = [512, 2048, 4096, 8192];

      mockTransferManager.downloadFileInChunks.mockResolvedValue({ success: true });

      for (const chunkSize of customChunkSizes) {
        await googleStorage.downloadFileConcurrently({ file: fileName, destination, chunkSize });

        expect(mockTransferManager.downloadFileInChunks).toHaveBeenCalledWith(fileName, {
          destination,
          chunkSizeBytes: chunkSize
        });
      }
    });
  });

  describe('authentication configuration', () => {
    it('should create Storage instance with authentication configuration', async () => {
      mockBucket.getFiles.mockResolvedValue([[]]);

      await googleStorage.listAllFiles();

      // Verify Storage constructor was called with credentials object
      expect(Storage).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: expect.any(Object)
        })
      );
    });

    it('should use GOOGLE_STORAGE_AUTH_OPTS for authentication', async () => {
      mockBucket.getFiles.mockResolvedValue([[]]);

      await googleStorage.listAllFiles();

      // Verify that Storage was called with some authentication config
      expect(Storage).toHaveBeenCalledTimes(1);
      const authConfig = Storage.mock.calls[0][0];
      expect(authConfig).toHaveProperty('credentials');
      expect(authConfig.credentials).toHaveProperty('client_email');
      expect(authConfig.credentials).toHaveProperty('private_key');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: list, filter, download', async () => {
      // Setup mock data for complete workflow
      const mockFiles = [
        { name: 'data-2023-01.json' },
        { name: 'data-2023-02.json' },
        { name: 'report-2023.pdf' }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);
      mockFile.download.mockResolvedValue([Buffer.from('file content')]);

      // List all files
      const allFiles = await googleStorage.listAllFiles();
      expect(allFiles).toEqual(mockFiles);

      // Filter files
      const filteredFiles = await googleStorage.getFilteredFiles({ key: 'data' });
      expect(filteredFiles).toHaveLength(2);

      // Download a file
      const downloadResult = await googleStorage.downloadFile({
        file: 'data-2023-01.json',
        destination: '/tmp/data-2023-01.json'
      });
      expect(downloadResult).toEqual([Buffer.from('file content')]);
    });

    it('should handle bucket operations with different instances', () => {
      const bucket1 = testUtils.randomString(10);
      const bucket2 = testUtils.randomString(10);

      const storage1 = new GoogleStorage(bucket1);
      const storage2 = new GoogleStorage(bucket2);

      expect(storage1.bucketName).toBe(bucket1);
      expect(storage2.bucketName).toBe(bucket2);
      expect(storage1.bucketName).not.toBe(storage2.bucketName);
    });

    it('should maintain separate state for multiple instances', async () => {
      const bucket1 = 'bucket-1';
      const bucket2 = 'bucket-2';

      const storage1 = new GoogleStorage(bucket1);
      const storage2 = new GoogleStorage(bucket2);

      mockBucket.getFiles.mockResolvedValue([[]]);

      await Promise.all([
        storage1.listAllFiles(),
        storage2.listAllFiles()
      ]);

      // Should create separate storage instances
      expect(Storage).toHaveBeenCalledTimes(2);

      // Should call bucket with correct names
      expect(mockStorage.bucket).toHaveBeenCalledWith(bucket1);
      expect(mockStorage.bucket).toHaveBeenCalledWith(bucket2);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      timeoutError.code = 'ETIMEDOUT';

      mockBucket.getFiles.mockRejectedValue(timeoutError);

      await expect(googleStorage.listAllFiles()).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      authError.code = 401;

      mockBucket.getFiles.mockRejectedValue(authError);

      await expect(googleStorage.listAllFiles()).rejects.toThrow('Authentication failed');
    });

    it('should handle bucket not found errors', async () => {
      const notFoundError = new Error('Bucket not found');
      notFoundError.code = 404;

      mockBucket.getFiles.mockRejectedValue(notFoundError);

      await expect(googleStorage.listAllFiles()).rejects.toThrow('Bucket not found');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.code = 429;

      mockBucket.upload.mockRejectedValue(quotaError);

      await expect(googleStorage.uploadFile({
        source: '/tmp/file.txt',
        destination: 'file.txt'
      })).rejects.toThrow('Quota exceeded');
    });

    it('should handle large file operations', async () => {
      const largeFileName = `large-file-${  'x'.repeat(100)  }.txt`;
      mockBucket.getFiles.mockResolvedValue([[{ name: largeFileName }]]);

      const result = await googleStorage.listAllFiles();

      expect(result[0].name).toBe(largeFileName);
    });

    it('should handle special characters in file names', async () => {
      const specialFileName = 'file with spaces & special chars!@#$%^&*().txt';
      mockFile.download.mockResolvedValue([Buffer.from('content')]);

      await googleStorage.downloadFile({
        file: specialFileName,
        destination: '/tmp/special-file.txt'
      });

      expect(mockBucket.file).toHaveBeenCalledWith(specialFileName);
    });

    it('should handle unicode file names', async () => {
      const unicodeFileName = '文件名-файл-ファイル.txt';
      mockFile.download.mockResolvedValue([Buffer.from('content')]);

      await googleStorage.downloadFile({
        file: unicodeFileName,
        destination: '/tmp/unicode-file.txt'
      });

      expect(mockBucket.file).toHaveBeenCalledWith(unicodeFileName);
    });
  });
});