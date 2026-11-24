const { cleanUp, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Readable } = require('stream');
const { S3Client } = require('@aws-sdk/client-s3');

const Client = require('../../models/client');
const Track = require('../../models/track');
const ingestFile = require('./ingestFile');

let clientId;
let client;

describe('Splits Youtube Ingestion Integration Tests', () => {
  beforeEach(async () => {
    client = new Client({ name: randomString() });
    await client.save();
    clientId = client._id.toString();
    jest.spyOn(logger, 'info').mockReturnValue();
    jest.spyOn(logger, 'error').mockReturnValue();
    jest.spyOn(logger, 'debug').mockReturnValue();
  });

  afterEach((done) => {
    cleanUp(clientId, done);
  });

  describe('ingestFile', () => {
    it('should ingest tracks from a CSV file and update the database', async () => {
      // Mock S3 file download
      const csvData = `title,version,artist,isrc,duration,tags
Track 1,Live,Artist 1,ISRC001,180,"Youtube, Video"
Track 2,Studio,Artist 2,ISRC002,240,Youtube`;

      const fakeStream = new Readable({
        read() {
          this.push(csvData);
          this.push(null);
        },
      });

      jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({ Body: fakeStream });

      // Perform ingestion
      await ingestFile('test-file-key', clientId);

      // Check if tracks were created in the database
      const tracks = await Track.find({ clientId }).sort({ title: 1 });

      expect(tracks.length).toEqual(2);
      expect(tracks[0]).toMatchObject({
        title: 'Track 1',
        version: 'Live',
        artist: 'Artist 1',
        isrc: 'ISRC001',
        duration: 180,
      });
      expect(tracks[0].tags).toEqual(expect.arrayContaining(['Youtube', 'Video']));

      expect(tracks[1]).toMatchObject({
        title: 'Track 2',
        version: 'Studio',
        artist: 'Artist 2',
        isrc: 'ISRC002',
        duration: 240,
      });
      expect(tracks[1].tags).toEqual(expect.arrayContaining(['Youtube']));
      expect(logger.info.mock.calls[2][0]).toContain('with total ingested lines: 2');
    });

    it('should update existing tracks if ISRC already exists', async () => {
      // Create an existing track
      const existingTrack = new Track({
        clientId,
        title: 'Existing Track',
        artist: 'Existing Artist',
        isrc: 'ISRC001',
        duration: 200,
        tags: ['OldTag'],
      });
      await existingTrack.save();

      // Mock S3 file download with updated data
      const csvData = `title,version,artist,isrc,duration,tags
Updated Track,New Version,Updated Artist,ISRC001,220,"Youtube, NewTag"`;

      const fakeStream = new Readable({
        read() {
          this.push(csvData);
          this.push(null);
        },
      });

      jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({ Body: fakeStream });

      // Perform ingestion
      await ingestFile('test-file-key', clientId);

      // Check if the track was updated
      const updatedTrack = await Track.findOne({ clientId, isrc: 'ISRC001' }).lean();

      expect(updatedTrack).toMatchObject({
        title: 'Updated Track',
        version: 'New Version',
        artist: 'Updated Artist',
        isrc: 'ISRC001',
        duration: 220,
      });
      expect(updatedTrack.tags).toEqual(expect.arrayContaining(['OldTag', 'Youtube', 'NewTag']));
      expect(logger.info.mock.calls[3][0]).toContain('with total ingested lines: 1');
    });

    it('should not ingest tracks with missing required fields', async () => {
      const csvData = `title,version,artist,isrc,duration,tags
Track 1,,Artist 1,,180,"Youtube, Video"
,Studio,Artist 2,ISRC002,240,Youtube
title,Studio,Artist 2,ISRC002,240,Youtube`;

      const fakeStream = new Readable({
        read() {
          this.push(csvData);
          this.push(null);
        },
      });

      jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({ Body: fakeStream });

      await ingestFile('test-file-key', clientId);

      const tracks = await Track.find({ clientId });

      expect(tracks.length).toEqual(1);
      expect(tracks[0]).toMatchObject({
        title: 'title',
        version: 'Studio',
        artist: 'Artist 2',
        isrc: 'ISRC002',
        duration: 240,
      });
      expect(tracks[0].tags).toEqual(expect.arrayContaining(['Youtube']));

      expect(logger.error.mock.calls[0][0]).toContain('Missing fields: isrc');
      expect(logger.error.mock.calls[1][0]).toContain('Missing fields: title');
      expect(logger.info.mock.calls[2][0]).toContain('with total ingested lines: 1');
    });

    it('should handle invalid file format', async () => {
      const csvData = `invalid,header,format
      Track 1,Artist 1,ISRC001`;

      const fakeStream = new Readable({
        read() {
          this.push(csvData);
          this.push(null);
        },
      });

      jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({ Body: fakeStream });

      await ingestFile('test-file-key', clientId);

      const tracks = await Track.find({ clientId });

      expect(tracks.length).toEqual(0);
      expect(logger.error.mock.calls[0][0]).toContain('Missing fields: title, isrc, artist');
      expect(logger.info.mock.calls[2][0]).toContain('total ingested lines: 0');
    });

    it('should ingest tracks with missing optional fields', async () => {
      const csvData = `title,version,artist,isrc,duration,tags
Track 1,,Artist 1,ISRC001,,`;

      const fakeStream = new Readable({
        read() {
          this.push(csvData);
          this.push(null);
        },
      });

      jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({ Body: fakeStream });

      await ingestFile('test-file-key', clientId);

      const tracks = await Track.find({ clientId });

      expect(tracks.length).toEqual(1);
      expect(tracks[0]).toMatchObject({
        title: 'Track 1',
        artist: 'Artist 1',
        isrc: 'ISRC001',
        version: '',
        duration: null,
      });

      expect(Array.isArray(tracks[0].tags)).toBe(true);
      expect(tracks[0].tags).toHaveLength(0);
      expect(logger.info.mock.calls[2][0]).toContain('total ingested lines: 1');
    });
  });
});
