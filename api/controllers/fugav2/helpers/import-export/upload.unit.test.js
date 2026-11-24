const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { uploadToS3 } = require('./upload');
const Client = require('../../../../models/client');

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  fileManager: {
    uploadToS3: jest.fn(),
    publicLink7Days: jest.fn(),
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../../models/client', () => ({
  findById: jest.fn().mockResolvedValue({
    name: 'Default Client',
  }),
}));

describe('uploadToS3', () => {
  const curveUser = {
    clientId: 'client-123',
  };
  const mockClient = {
    name: 'Test Client',
  };
  const exportPath = '/tmp/test-export.csv';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw if client not found', async () => {
    // GIVEN
    Client.findById.mockResolvedValue(null);

    // THEN
    await expect(uploadToS3(exportPath, curveUser)).rejects.toThrow(/Could not find client with id/);
  });

  it('should throw if fileManager upload function rejects', async () => {
    // GIVEN
    Client.findById.mockResolvedValue(mockClient);
    fileManager.uploadToS3.mockImplementation((key, localPath, callback) => {
      callback(new Error('upload error'));
    });

    // THEN
    await expect(uploadToS3(exportPath, curveUser)).rejects.toThrow(/upload error/);
  });

  it('should throw if uploadPublicLink function rejects', async () => {
    // GIVEN
    Client.findById.mockResolvedValue(mockClient);
    fileManager.uploadToS3.mockImplementation((key, localPath, callback) => {
      callback(null, 's3key');
    });
    fileManager.publicLink7Days.mockImplementation((s3key, callback) => {
      callback(new Error('Public link generation failed'), null);
    });

    // THEN
    await expect(uploadToS3(exportPath, curveUser)).rejects.toThrow(/Public link generation failed/);
  });

  it('should return public link if public link generation succeeds', async () => {
    // GIVEN
    Client.findById.mockResolvedValue(mockClient);
    fileManager.uploadToS3.mockImplementation((key, localPath, callback) => {
      callback(null, 's3key');
    });
    fileManager.publicLink7Days.mockImplementation((s3key, callback) => {
      callback(null, 'https://correct-link');
    });

    // WHEN
    const result = await uploadToS3(exportPath, curveUser);

    // THEN
    expect(result).toEqual({ publicLink: 'https://correct-link', s3Key: 's3key' });
  });
});
