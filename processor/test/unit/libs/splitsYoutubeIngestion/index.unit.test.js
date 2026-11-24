const { expect } = require('chai');
const sinon = require('sinon');
const { S3Client } = require('@aws-sdk/client-s3');
const rewire = require('rewire');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { listAllObjects, extractIDFromKey } = require('../../../../libs/splitsYoutubeIngestion/index');

describe('listAllObjects', () => {
  let s3ClientStub;

  beforeEach(() => {
    s3ClientStub = sinon.stub(S3Client.prototype, 'send');
    sinon.stub(logger, 'error'); // Stub logger to avoid actual logging in tests
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return all objects when the response is not truncated', async () => {
    // Arrange
    const bucket = 'test-bucket';
    const prefix = 'test-prefix';
    const s3Response = {
      Contents: [{ Key: 'file1.txt' }, { Key: 'file2.txt' }],
      IsTruncated: false,
    };
    s3ClientStub.resolves(s3Response);

    // Act
    const result = await listAllObjects(bucket, prefix);

    // Assert
    expect(result).to.deep.equal(s3Response.Contents);
    expect(s3ClientStub.calledOnce).to.be.true;
  });

  it('should handle pagination when the response is truncated', async () => {
    // Arrange
    const bucket = 'test-bucket';
    const prefix = 'test-prefix';
    const firstResponse = {
      Contents: [{ Key: 'file1.txt' }],
      IsTruncated: true,
    };
    const secondResponse = {
      Contents: [{ Key: 'file2.txt' }],
      IsTruncated: false,
    };
    s3ClientStub.onFirstCall().resolves(firstResponse);
    s3ClientStub.onSecondCall().resolves(secondResponse);

    // Act
    const result = await listAllObjects(bucket, prefix);

    // Assert
    expect(result).to.deep.equal([...firstResponse.Contents, ...secondResponse.Contents]);
    expect(s3ClientStub.calledTwice).to.be.true;
  });

  it('should log an error and rethrow it if the S3 request fails', async () => {
    // Arrange
    const bucket = 'test-bucket';
    const prefix = 'test-prefix';
    const error = new Error('S3 error');
    s3ClientStub.rejects(error);

    // Act & Assert
    try {
      await listAllObjects(bucket, prefix);
    } catch (err) {
      expect(err).to.equal(error);
      expect(logger.error.calledOnce).to.be.true;
      expect(logger.error.calledWith('Error listing objects:', error)).to.be.true;
    }
  });
});

describe('extractIDFromKey', () => {
  it('should return the second segment of the key when key has multiple segments', () => {
    // Arrange
    const key = 'folder1/folder2/file.txt';

    // Act
    const result = extractIDFromKey(key);

    // Assert
    expect(result).to.equal('folder2');
  });

  it('should return undefined when the key has only one segment', () => {
    // Arrange
    const key = 'file.txt';

    // Act
    const result = extractIDFromKey(key);

    // Assert
    expect(result).to.be.undefined;
  });

  it('should return undefined for an empty key', () => {
    // Arrange
    const key = '';

    // Act
    const result = extractIDFromKey(key);

    // Assert
    expect(result).to.be.undefined;
  });

  it('should return null for a blank value', () => {
    // Arrange and Act
    const result = extractIDFromKey();

    // Assert
    expect(result).to.be.undefined;
  });

  it('should return the correct ID even if key has trailing slashes', () => {
    // Arrange
    const key = 'folder1/folder2/';

    // Act
    const result = extractIDFromKey(key);

    // Assert
    expect(result).to.equal('folder2');
  });
});

describe('scanAndIngest', () => {
  let index;
  let listAllObjectsStub; let ingestFileStub; let
    logger;

  beforeEach(() => {
    index = rewire('../../../../libs/splitsYoutubeIngestion/index');
    listAllObjectsStub = sinon.stub();
    ingestFileStub = sinon.stub();
    logger = { error: sinon.stub() };

    // Replace the internal dependencies
    index.__set__('listAllObjects', listAllObjectsStub);
    index.__set__('ingestFile', ingestFileStub);
    index.__set__('logger', logger);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should call ingestFile for each object returned by listAllObjects', async () => {
    // Arrange
    const bucket = 'test-bucket';
    const prefix = 'test-prefix';
    const objects = [
      { Key: 'folder1/id1/file.txt' },
      { Key: 'folder2/id2/file.txt' },
    ];
    listAllObjectsStub.resolves(objects);

    const scanAndIngest = index.__get__('scanAndIngest');

    // Act
    await scanAndIngest(bucket, prefix);

    // Assert
    expect(ingestFileStub.callCount).to.equal(objects.length);
    expect(ingestFileStub.firstCall.calledWith(objects[0].Key, 'id1')).to.be.true;
    expect(ingestFileStub.secondCall.calledWith(objects[1].Key, 'id2')).to.be.true;
  });

  it('should log an error if listAllObjects throws an error', async () => {
    // Arrange
    const bucket = 'test-bucket';
    const prefix = 'test-prefix';
    const error = new Error('S3 error');
    listAllObjectsStub.rejects(error);

    const scanAndIngest = index.__get__('scanAndIngest');

    // Act
    await scanAndIngest(bucket, prefix);

    // Assert
    expect(logger.error.calledOnce).to.be.true;
    expect(ingestFileStub.notCalled).to.be.true;
  });

  it('should not call ingestFile if no ID is extracted from the object key', async () => {
    // Arrange
    const bucket = 'test-bucket';
    const prefix = 'test-prefix';
    const objects = [
      { Key: 'invalidkey1' }, // No second segment, ID extraction will return null
      { Key: 'invalidkey2/' }, // No second segment, ID extraction will return null
    ];
    listAllObjectsStub.resolves(objects);

    const scanAndIngest = index.__get__('scanAndIngest');

    // Act
    await scanAndIngest(bucket, prefix);

    // Assert
    expect(ingestFileStub.notCalled).to.be.true;
  });
});
