/**
 * TODO: Add more tests that will cover checkContractAssociations and rest of the checkReleaseAssociations
 */
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Client = require('../../models/client');
const Track = require('../../models/track');
const SalesItemHelpers = require('./index'); // adjust path
const Release = require('../../models/release');
const Cost = require('../../models/cost');
const Work = require('../../models/work');

const checkDataBeforeDeleteAsync = (model, params) => new Promise((resolve, reject) => {
  SalesItemHelpers.checkDataBeforeDelete(model, params, (err, status, result) => {
    if (err) return reject(err);
    resolve({ status, result });
  });
});

describe('checkDataBeforeDelete', () => {
  let client;
  let clientId;
  let track;
  let release;
  let cost;
  let work;

  beforeEach(async () => {
    SalesItemHelpers.getSalesData = (bigQuery, filter, cb) => cb(null, undefined, undefined);
    SalesItemHelpers.getSalesDataCount = (bigQuery, filter, cb) => cb(null, undefined);

    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    clientId = client._id.toString();
    await client.save();

    track = new Track({
      clientId,
      name: randomString(),
      isrc: randomString(),
    });

    release = new Release({
      clientId,
      title: randomString(),
      catNo: randomString(),
    });

    work = new Work({
      clientId,
      title: randomString(),
      iswc: randomString(),
      composer: randomString(),
    });

    cost = new Cost({
      clientId: client._id,
      name: randomString(),
      invoiceNo: randomString(),
      file: randomString(),
      type: 'COST',
    });

    await Promise.all([track.save(), release.save(), cost.save(), work.save()]);
  });

  afterAll(async () => {
    await testUtils.cleanUpAsync(clientId);
  });

  describe('deletionType - single', () => {
    it('should return 200 when track is safe to delete', async () => {
      const params = {
        clientId,
        idsToTest: [track._id],
        deletionType: 'single',
        salesFilterField: 'trackId',
        costsFilterField: 'trackIds',
        logLabel: 'Track',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Track, params);

      expect(status).toBe(200);
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('should return 201 when track is used on client', async () => {
      client.duplicateTracks = [{
        output: track._id.toString(),
        isrc: randomString(),
        title: randomString(),
      }];

      await client.save();

      const params = {
        clientId,
        idsToTest: [track._id.toString()],
        deletionType: 'single',
        salesFilterField: 'trackId',
        costsFilterField: 'trackIds',
        logLabel: 'Track',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Track, params);

      expect(status).toBe(201);
      expect(result).toEqual({ clients: [{ _id: client._id, link: 'settings', name: client.name }] });
    });

    it('should return 201 when track is referenced by a release', async () => {
      release.trackIds = [track._id.toString()];
      await release.save();

      const params = {
        clientId,
        idsToTest: [track._id.toString()],
        deletionType: 'single',
        salesFilterField: 'trackId',
        costsFilterField: 'trackIds',
        logLabel: 'Track',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Track, params);

      expect(status).toBe(201);
      expect(result.releases).toHaveLength(1);
      expect(result.releases[0]._id.toString()).toBe(release._id.toString());
      expect(result.releases[0].link).toBe(`releases/${release._id}/edit`);
    });

    it('should return 200 when release is safe to delete', async () => {
      const params = {
        clientId,
        idsToTest: [release._id],
        deletionType: 'single',
        salesFilterField: 'releaseId',
        costsFilterField: 'releaseIds',
        logLabel: 'Release',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Release, params);

      expect(status).toBe(200);
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('should return 200 when work is safe to delete', async () => {
      const params = {
        clientId,
        idsToTest: [work._id],
        deletionType: 'single',
        salesFilterField: 'workId',
        // costsFilterField: 'workIds',
        logLabel: 'Work',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Work, params);

      expect(status).toBe(200);
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('should return 201 when release is used on client', async () => {
      client.duplicateReleases = [{
        output: release._id.toString(),
        catNo: randomString(),
        title: randomString(),
      }];

      await client.save();

      const params = {
        clientId,
        idsToTest: [release._id.toString()],
        deletionType: 'single',
        salesFilterField: 'releaseId',
        costsFilterField: 'releaseIds',
        logLabel: 'Release',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Release, params);

      expect(status).toBe(201);
      expect(result).toEqual({ clients: [{ _id: client._id, link: 'settings', name: client.name }] });
    });

    it('should return 201 when work is used on client', async () => {
      client.duplicateWorks = [{
        output: work._id.toString(),
        isrc: randomString(),
        title: randomString(),
      }];

      await client.save();

      const params = {
        clientId,
        idsToTest: [work._id.toString()],
        deletionType: 'single',
        salesFilterField: 'workId',
        costsFilterField: 'workIds',
        logLabel: 'Work',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Work, params);

      expect(status).toBe(201);
      expect(result).toEqual({ clients: [{ _id: client._id, link: 'settings', name: client.name }] });
    });

    it('should return 201 when release is used on cost', async () => {
      cost.releaseIds = [release._id.toString()];
      await cost.save();

      const params = {
        clientId,
        idsToTest: [release._id.toString()],
        deletionType: 'single',
        salesFilterField: 'releaseId',
        costsFilterField: 'releaseIds',
        logLabel: 'Release',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Release, params);

      expect(status).toBe(201);
      expect(result).toEqual({ costs: [{ _id: cost._id, link: `costs/${cost._id}/edit`, name: cost.name }] });
    });
  });

  describe('deletionType - multi', () => {
    it('should return 200 when track is safe to delete', async () => {
      const params = {
        clientId,
        idsToTest: [track._id],
        deletionType: 'multi',
        salesFilterField: 'trackId',
        costsFilterField: 'trackIds',
        logLabel: 'Track',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Track, params);

      expect(status).toBe(200);
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('should return 201 when track is used on client', async () => {
      client.duplicateTracks = [{
        output: track._id.toString(),
        isrc: randomString(),
        title: randomString(),
      }];

      await client.save();

      const params = {
        clientId,
        idsToTest: [track._id.toString()],
        deletionType: 'multi',
        salesFilterField: 'trackId',
        costsFilterField: 'trackIds',
        logLabel: 'Track',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Track, params);

      expect(status).toBe(201);
      expect(result).toEqual('Client Duplicate Identifiers');
    });

    it('should return 201 when track is referenced by a release', async () => {
      release.trackIds = [track._id.toString()];
      await release.save();

      const params = {
        clientId,
        idsToTest: [track._id.toString()],
        deletionType: 'multi',
        salesFilterField: 'trackId',
        costsFilterField: 'trackIds',
        logLabel: 'Track',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Track, params);

      expect(status).toBe(201);
      expect(result).toEqual('Releases');
    });

    it('should return 200 when release is safe to delete', async () => {
      const params = {
        clientId,
        idsToTest: [release._id],
        deletionType: 'multi',
        salesFilterField: 'releaseId',
        costsFilterField: 'releaseIds',
        logLabel: 'Release',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Release, params);

      expect(status).toBe(200);
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('should return 201 when release is used on client', async () => {
      client.duplicateReleases = [{
        output: release._id.toString(),
        isrc: randomString(),
        title: randomString(),
      }];

      await client.save();

      const params = {
        clientId,
        idsToTest: [release._id.toString()],
        deletionType: 'multi',
        salesFilterField: 'releaseId',
        costsFilterField: 'releaseIds',
        logLabel: 'Release',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Release, params);

      expect(status).toBe(201);
      expect(result).toEqual('Client Duplicate Identifiers');
    });

    it('should return 201 when release is used on costs', async () => {
      cost.releaseIds = [release._id.toString()];
      await cost.save();

      const params = {
        clientId,
        idsToTest: [release._id.toString()],
        deletionType: 'multi',
        salesFilterField: 'releaseId',
        costsFilterField: 'releaseIds',
        logLabel: 'Release',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Release, params);

      expect(status).toBe(201);
      expect(result).toEqual('Costs');
    });

    it('should return 201 when work is used on client', async () => {
      client.duplicateWorks = [{
        output: work._id.toString(),
        isrc: randomString(),
        title: randomString(),
      }];

      await client.save();

      const params = {
        clientId,
        idsToTest: [work._id.toString()],
        deletionType: 'multi',
        salesFilterField: 'workId',
        costsFilterField: 'workIds',
        logLabel: 'Work',
      };

      const { status, result } = await checkDataBeforeDeleteAsync(Work, params);

      expect(status).toBe(201);
      expect(result).toEqual('Client Duplicate Identifiers');
    });
  });
});
