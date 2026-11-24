const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const fs = require('fs');
const { Readable } = require('stream');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ingestFileModule = rewire('../../../../libs/splitsYoutubeIngestion/ingestFile.js');
const ingestFile = ingestFileModule.__get__('ingestFile');
const downloadFileFromS3 = ingestFileModule.__get__('downloadFileFromS3');
const processFile = ingestFileModule.__get__('processFile');
const prepareCurrentCatalogue = ingestFileModule.__get__('prepareCurrentCatalogue');
const processRow = ingestFileModule.__get__('processRow');

describe('ingestFile', () => {
  let loggerStub; let ClientStub; let TrackStub; let downloadFileStub; let
    processFileStub;

  beforeEach(() => {
    loggerStub = { info: sinon.stub(), error: sinon.stub(), debug: sinon.stub() };
    ClientStub = { findById: sinon.stub() };
    TrackStub = { find: sinon.stub().resolves([]), findByIdAndUpdate: sinon.stub(), save: sinon.stub() };
    downloadFileStub = sinon.stub();
    processFileStub = sinon.stub();

    ingestFileModule.__set__('logger', loggerStub);
    ingestFileModule.__set__('Client', ClientStub);
    ingestFileModule.__set__('Track', TrackStub);
    ingestFileModule.__set__('downloadFileFromS3', downloadFileStub);
    ingestFileModule.__set__('processFile', processFileStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should log an error if the client is not found', async () => {
    // Arrange
    ClientStub.findById.resolves(null);

    // Act
    await ingestFile('fileKey', 'invalidClientId');

    // Assert
    expect(loggerStub.error.calledOnce).to.be.true;
    expect(loggerStub.error.calledWith('Fuga Youtube: Client with ID invalidClientId not found - abandoning file ingestion for file fileKey')).to.be.true;
  });

  it('should process the file if the client is found', async () => {
    // Arrange
    const client = { _id: 'validClientId', name: 'Test Client' };
    ClientStub.findById.resolves(client);
    downloadFileStub.resolves('localFilePath');
    processFileStub.resolves({ totalLines: 100 }); // Mock 100 rows processed

    // Act
    await ingestFile('fileKey', 'validClientId');

    // Assert
    expect(loggerStub.info.calledWith('Fuga Youtube: Ingesting file: fileKey with ClientId: validClientId')).to.be.true;
    expect(downloadFileStub.calledOnceWith('fileKey')).to.be.true;
    expect(processFileStub.calledOnceWith('localFilePath', client)).to.be.true;
    expect(loggerStub.info.calledWith('Fuga Youtube: Ingested File fileKey into Client: Test Client with total lines: 100')).to.be.true;
  });
});

describe('processFile', () => {
  let loggerStub; let processRowStub; let prepareCurrentCatalogueStub; let eachLimitStub; let
    fakeStream; let client; let localFile;

  beforeEach(() => {
    client = { name: 'Test Client' };
    localFile = 'test.csv';

    loggerStub = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    };

    // Creating a fake stream with the necessary methods
    const csvData = `title,version,artist,isrc,duration,tags
Music Name 01,Live,Artist 1,GB7QY2400001,302,"Youtube, Video"
Music Name 02,Concert,Artist 2,GB7QY2400002,302,Youtube
Music Name 03,Music Video,Artist 3,GB7QY2400003,302,"Youtube, Music"`;

    // Create a readable stream from the CSV data
    fakeStream = new Readable({
      read() {
        this.push(csvData);
        this.push(null);
      },
    });
    sinon.stub(fs, 'createReadStream').returns(fakeStream);

    processRowStub = sinon.stub().resolves(true);
    prepareCurrentCatalogueStub = sinon.stub().resolves({});

    eachLimitStub = sinon.stub().callsFake((arr, limit, iterator) => new Promise((resolve, reject) => {
      const processItem = (index) => {
        if (index >= arr.length) {
          resolve();
          return;
        }
        Promise.resolve(iterator(arr[index]))
          .then(() => processItem(index + 1))
          .catch(reject);
      };
      processItem(0);
    }));

    // Using rewire to replace module-level dependencies
    ingestFileModule.__set__('logger', loggerStub);
    ingestFileModule.__set__('prepareCurrentCatalogue', prepareCurrentCatalogueStub);
    ingestFileModule.__set__('processRow', processRowStub);
    ingestFileModule.__set__('eachLimit', eachLimitStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should process all lines from the CSV file and resolve the total number of ingested lines', async () => {
    // Act
    const result = await processFile(localFile, client);

    // Assert
    expect(prepareCurrentCatalogueStub.calledOnceWith(client)).to.be.true;
    expect(processRowStub.callCount).to.equal(3);
    expect(loggerStub.info.calledWith(`Fuga Youtube: Processed file ${localFile} with total ingested lines: 3`)).to.be.true;
    expect(result).to.deep.equal({ totalLines: 3 });
  });

  it('should log an error and not ingest any tracks if the CSV has an invalid delimiter', async () => {
    // Arrange

    // Creating a fake stream with malformed csv
    const invalidCsvData = 'isrc,title;artist\nISRC123;Title 1;Artist 1\nISRC456;Title 2;Artist 2';

    // Create a readable stream from the CSV data
    fakeStream = new Readable({
      read() {
        this.push(invalidCsvData);
        this.push(null);
      },
    });
    fs.createReadStream.returns(fakeStream);
    processRowStub = sinon.stub().resolves(true);

    // Act
    const result = await processFile(localFile, client);

    // Assert
    expect(loggerStub.error.calledWith('Fuga Youtube: Error parsing csv file test.csv: Row length does not match headers')).to.be.true;
    expect(processRowStub.called).to.be.false;
    expect(result).to.deep.equal({ totalLines: 0 });
  });

  it('should log an error and not ingest any tracks if there is a field mismatch in the CSV', async () => {
    // Arrange
    const csvData = `title,version,artist,isrc,duration,tags
Music Name 01,Live,Artist 1,GB7QY2400001,302,"Youtube, Video"
Music Name 02,Concert,Artist 2,GB7QY2400002,302,Youtube, wrongfield
Music Name 03,Music Video,Artist 3,GB7QY2400003,302,"Youtube, Music"`;

    // Create a readable stream from the CSV data
    fakeStream = new Readable({
      read() {
        this.push(csvData);
        this.push(null);
      },
    });
    fs.createReadStream.returns(fakeStream);

    // Act
    const result = await processFile(localFile, client);

    // Assert
    expect(loggerStub.error.calledWith('Fuga Youtube: Error parsing csv file test.csv: Row length does not match headers')).to.be.true;
    expect(processRowStub.called).to.be.false;
    expect(result).to.deep.equal({ totalLines: 0 });
  });

  it('should log an error and reject if processing a row fails', async () => {
    // Arrange

    const error = new Error('Processing error');
    processRowStub.onFirstCall().resolves(true);
    processRowStub.onSecondCall().rejects(error);

    // Act & Assert
    try {
      await processFile(localFile, client);
    } catch (err) {
      expect(loggerStub.error.calledWith(`Fuga Youtube: Error processing file ${localFile}:`, error)).to.be.true;
      expect(err).to.deep.equal({ totalLines: 1 });
    }
  });
});

describe('prepareCurrentCatalogue', () => {
  let TrackStub;

  beforeEach(() => {
    TrackStub = { find: sinon.stub() };
    ingestFileModule.__set__('Track', TrackStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a map of ISRCs for a client', async () => {
    // Arrange
    const client = { _id: 'clientId' };
    const tracks = [
      { _id: 'track1', isrc: 'ISRC123', tags: ['tag1'] },
      { _id: 'track2', isrc: 'ISRC456', tags: ['tag2'] },
    ];
    TrackStub.find.resolves(tracks);

    // Act
    const result = await prepareCurrentCatalogue(client);

    // Assert
    expect(TrackStub.find.calledOnceWith({ clientId: 'clientId' }, { _id: 1, isrc: 1, tags: 1 })).to.be.true;
    expect(result).to.deep.equal({
      ISRC123: { _id: 'track1', tags: ['tag1'] },
      ISRC456: { _id: 'track2', tags: ['tag2'] },
    });
  });
});

describe('processRow', () => {
  let trackStub; let
    loggerStub;

  beforeEach(() => {
    loggerStub = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    };

    // Mock Track as a constructor function
    trackStub = sinon.stub();

    // Mock the static methods on Track
    trackStub.findByIdAndUpdate = sinon.stub().resolves();

    // Mock instance methods
    trackStub.prototype.save = sinon.stub().resolves();

    ingestFileModule.__set__('Track', trackStub);
    ingestFileModule.__set__('logger', loggerStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should update an existing track if the ISRC exists', async () => {
    // Arrange
    const data = { isrc: 'ISRC123', title: 'New Title', artist: 'New Artist', tags: 'tag1,tag2' };
    const client = { _id: 'clientId', name: 'Test Client' };
    const currentCatalogue = { ISRC123: { _id: 'track1', tags: ['oldTag'] } };

    // Act
    await processRow(data, client, currentCatalogue);

    // Assert
    expect(loggerStub.info.calledWith('Fuga Youtube: Updating track with ISRC ISRC123 for client Test Client')).to.be.true;
    expect(loggerStub.debug.calledWith('Fuga Youtube: Updating track with ISRC ISRC123 with new data:', data)).to.be.true;
    expect(trackStub.findByIdAndUpdate.calledOnceWith(
      'track1',
      {
        $set: {
          title: data.title,
          version: data.version,
          artist: data.artist,
          duration: data.duration,
          tags: ['oldTag', 'tag1', 'tag2'],
        },
      },
    )).to.be.true;
  });

  it('should create a new track if the ISRC does not exist', async () => {
    // Arrange
    const data = { isrc: 'ISRC789', title: 'New Track', artist: 'New Artist', tags: 'tag1' };
    const client = { _id: 'clientId', name: 'Test Client' };
    const currentCatalogue = {};

    // Act
    await processRow(data, client, currentCatalogue);

    // Assert
    expect(loggerStub.debug.calledWith(`Fuga Youtube: Creating new track with ISRC ${data.isrc} for client ${client.name}`)).to.be.true;
    expect(trackStub.calledOnceWith({
      clientId: client._id.toString(),
      title: data.title,
      version: data.version,
      artist: data.artist,
      isrc: data.isrc,
      duration: data.duration,
      tags: ['tag1'],
    })).to.be.true;

    // Check that the save method on the new instance was called
    const trackInstance = trackStub.getCall(0).thisValue;
    expect(trackInstance.save.calledOnce).to.be.true;
  });

  it('should not ingest a track with missing required fields', async () => {
    // Arrange
    const data = { isrc: 'ISRC123' };
    const client = { _id: 'clientId', name: 'Test Client' };
    const currentCatalogue = {};

    // Act
    await processRow(data, client, currentCatalogue);

    // Assert
    expect(trackStub.prototype.save.called).to.be.false;
    expect(loggerStub.error.calledOnce).to.be.true;
    expect(loggerStub.error.calledWith('Fuga Youtube: Error processing row: {"isrc":"ISRC123"}, Missing fields: title, artist')).to.be.true;
  });
});

describe('downloadFileFromS3', () => {
  let s3ClientStub; let loggerStub; let fileStreamStub; let
    envStub;

  beforeEach(() => {
    s3ClientStub = sinon.stub(S3Client.prototype, 'send');
    loggerStub = {
      info: sinon.stub(),
      error: sinon.stub(),
    };
    fileStreamStub = {
      pipe: sinon.stub().returnsThis(),
      on: sinon.stub(),
    };

    sinon.stub(fs, 'createWriteStream').returns(fileStreamStub);
    envStub = {
      S3_access_key: 'testAccessKey',
      S3_secret_key: 'testSecretKey',
      S3_region: 'test-region',
    };

    ingestFileModule.__set__('logger', loggerStub);
    ingestFileModule.__set__('process.env', envStub);
    ingestFileModule.__set__('appRootDir', '/app/root'); // Mock the app root directory
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error if the key is not provided', async () => {
    try {
      await downloadFileFromS3();
    } catch (err) {
      expect(err.message).to.equal('Fuga Youtube: Key is required to download file from S3');
    }
  });

  it('should successfully download a file from S3', async () => {
    // Arrange
    const key = 'fileKey';
    const s3Response = { Body: { pipe: sinon.stub() } };
    s3ClientStub.resolves(s3Response);

    const expectedDownloadPath = '/app/root/tmp/fileKey';
    fileStreamStub.on.withArgs('close').yields();

    // Act
    const result = await downloadFileFromS3(key);

    // Assert
    expect(s3ClientStub.calledOnce).to.be.true;
    expect(s3ClientStub.calledWithMatch(sinon.match.instanceOf(GetObjectCommand))).to.be.true;
    expect(fs.createWriteStream.calledOnceWith(expectedDownloadPath)).to.be.true;
    expect(loggerStub.info.calledWith(`Fuga Youtube: File downloaded successfully to ${expectedDownloadPath}`)).to.be.true;
    expect(result).to.equal(expectedDownloadPath);
  });

  it('should log an error if the file write fails', async () => {
    // Arrange
    const key = 'fileKey';
    const s3Response = { Body: { pipe: sinon.stub() } };
    s3ClientStub.resolves(s3Response);

    const error = new Error('Write error');
    fileStreamStub.on.withArgs('error').yields(error);

    // Act & Assert
    try {
      await downloadFileFromS3(key);
    } catch (err) {
      expect(loggerStub.error.calledWith('Fuga Youtube: Error writing file:', error)).to.be.true;
      expect(err).to.equal(error);
    }
  });

  it('should log an error and throw if the S3 download fails', async () => {
    // Arrange
    const key = 'fileKey';
    const error = new Error('S3 error');
    s3ClientStub.rejects(error);

    // Act & Assert
    try {
      await downloadFileFromS3(key);
    } catch (err) {
      expect(loggerStub.error.calledWith('Fuga Youtube: Error downloading file from S3:', error)).to.be.true;
      expect(err).to.equal(error);
    }
  });
});
