import { Readable } from 'stream';
import AWS from '@aws-sdk/client-s3';

import fileManager from './fileManager';

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn(),
    GetObjectCommand: jest.fn(),
  };
});

describe('downloadFromS3Object', () => {
  it('should download a file from S3 and return a stream', async () => {
    // Arrange
    const s3ObjectKey = 'test-file.txt';
    const s3Bucket = 'test-bucket';
    const fakeStream = new Readable();
    const mockSend = jest.fn().mockResolvedValue({ Body: fakeStream });
    (AWS.S3Client as unknown as jest.Mock).mockImplementation(() => ({ send: mockSend }));
    const getObjectSpy = jest.spyOn(AWS, 'GetObjectCommand');

    // Act
    const result = await fileManager.downloadFromS3Object(s3ObjectKey, s3Bucket);

    // Assert
    // Verify send was called with a GetObjectCommand
    expect(mockSend).toHaveBeenCalledWith(expect.any(AWS.GetObjectCommand));
    expect(getObjectSpy).toHaveBeenCalledWith({
      Bucket: s3Bucket,
      Key: s3ObjectKey,
    });

    // Verify result has the Body stream
    expect(result.Body).toBe(fakeStream);
    expect(typeof result.Body.pipe).toBe('function');
  });
});
