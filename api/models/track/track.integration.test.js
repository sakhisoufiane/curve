const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Client = require('../client');
const Track = require('./track');

describe('Track', () => {
  describe('save', () => {
    it('should save track with minimal data', async () => {
      const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
      const track = new Track({ clientId: client._id });
      await track.save();
      expect(track.isNew).toBe(false);
    });

    it('should reject track with no clientId', async () => {
      const track = new Track({});
      await expect(track.save()).rejects.toBeDefined();
    });

    it('should reject track with invalid clientId', async () => {
      const track = new Track({ clientId: randomString() });
      await expect(track.save()).rejects.toBeDefined();
    });

    describe('when using isrc', () => {
      it('should reject track with duplicate isrc in another track', async () => {
        const isrc = randomString();
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
        const firstTrack = new Track({ clientId: client._id, isrc });
        await firstTrack.save();

        const secondTrack = new Track({ clientId: client._id, isrc });
        await expect(secondTrack.save()).rejects.toThrow(`The ISRC '${isrc}' matches the ISRC on track: ${firstTrack._id}`);
      });

      it('should accept track with duplicate isrc in another track for another client', async () => {
        const isrc = randomString();
        const otherClient = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
        const firstTrack = new Track({ clientId: otherClient._id, isrc });
        await firstTrack.save();

        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
        const secondTrack = new Track({ clientId: client._id, isrc });
        await secondTrack.save();
        expect(secondTrack.isNew).toBe(false);
      });

      it('should reject track with duplicate isrc in the aliases of another track', async () => {
        const isrc = randomString();
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
        const firstTrack = new Track({ clientId: client._id, isrc: randomString(), aliases: [randomString(), isrc] });
        await firstTrack.save();

        const secondTrack = new Track({ clientId: client._id, isrc });
        await expect(secondTrack.save()).rejects.toThrow(`The ISRC '${isrc}' matches an existing alias on track: ${firstTrack._id}`);
      });

      it('should reset alternativeId and linkedIsrc when switching from alternativeId to isrc', async () => {
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true, features: { useAlternativeId: true } }).save();
        const track = new Track({ clientId: client._id, alternativeId: randomString(), linkedIsrc: randomString() });
        await track.save();

        track.useAlternativeId = false;
        await track.save();
        expect(track.alternativeId).toBe(null);
        expect(track.linkedIsrc).toBe(null);
      });

      it('should add validation errors for missing fields', async () => {
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
        const track = new Track({ clientId: client._id });
        await track.save();
        expect(track.validationErrors).toEqual([
          'An ISRC is required',
          'A Title is required',
          'At least one Contract needs to be assigned in Sales/Returns Rights',
        ]);
      });
    });

    describe('when using alternativeId', () => {
      it('should reject using alternativeId if client feature is not enabled', async () => {
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
        const firstTrack = new Track({ clientId: client._id, useAlternativeId: true, alternativeId: randomString() });
        await expect(firstTrack.save()).rejects.toThrow('Alternative ID cannot be used for this client.');
      });

      it('should reject track with duplicate alternativeId in another track', async () => {
        const alternativeId = randomString();
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true, features: { useAlternativeId: true } }).save();
        const firstTrack = new Track({ clientId: client._id, useAlternativeId: true, alternativeId });
        await firstTrack.save();

        const secondTrack = new Track({ clientId: client._id, useAlternativeId: true, alternativeId });
        await expect(secondTrack.save()).rejects.toThrow(`The Alternative ID '${alternativeId}' matches the Alternative ID on track: ${firstTrack._id}`);
      });

      it('should reset isrc when switching from isrc to alternativeId', async () => {
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true, features: { useAlternativeId: true } }).save();
        const track = new Track({ clientId: client._id, isrc: randomString() });
        await track.save();

        track.useAlternativeId = true;
        await track.save();
        expect(track.isrc).toBe(null);
      });

      it('should add validation errors for missing fields', async () => {
        const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true, features: { useAlternativeId: true } }).save();
        const track = new Track({ clientId: client._id, useAlternativeId: true });
        await track.save();
        expect(track.validationErrors).toEqual([
          'An Alternative ID is required',
          'A Title is required',
          'At least one Contract needs to be assigned in Sales/Returns Rights',
        ]);
      });
    });

    it('should reject track with duplicate isrc in its own aliases list', async () => {
      const isrc = randomString();
      const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
      const firstTrack = new Track({ clientId: client._id, isrc: randomString(), aliases: [randomString(), isrc] });
      await firstTrack.save();

      const secondTrack = new Track({ clientId: client._id, isrc });
      await expect(secondTrack.save()).rejects.toThrow(`The ISRC '${isrc}' matches an existing alias on track: ${firstTrack._id}`);
    });

    it('should reject track with duplicate alias in the aliases of another track', async () => {
      const isrc = randomString();
      const client = await new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();
      const firstTrack = new Track({ clientId: client._id, isrc: randomString(), aliases: [randomString(), isrc] });
      await firstTrack.save();

      const secondTrack = new Track({ clientId: client._id, isrc: randomString(), aliases: [randomString(), isrc] });
      await expect(secondTrack.save()).rejects.toThrow(`The alias '${isrc}' matches an existing alias on track: ${firstTrack._id}`);
    });
  });
});
