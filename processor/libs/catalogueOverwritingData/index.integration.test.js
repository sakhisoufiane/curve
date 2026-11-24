const { promisify } = require('@curveroyaltysystems/platform-shared-utils/libs/promisify');
const avro = require('avsc');
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { readFile } = require('node:fs/promises');
const { Readable } = require('node:stream');
const gcp = require('../util/gcp');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');

process.env.SALES_INGESTION_INPUTS_BUCKET = 'test-bucket';

let storage;
jest.spyOn(gcp, 'createStorage').mockImplementation(() => storage);

const CatalogueOverwritingData = require('./index');

describe('catalogueOverwritingData Integration Tests', () => {
  let client;
  let getAllStoredFiles;

  beforeEach(async () => {
    // Generate a fresh client for each test
    client = new Client({ name: testUtils.randomString() });
    await client.save();

    // Create the storage mock
    const storageMock = createStorageMock();
    storage = storageMock.storageMock;
    getAllStoredFiles = storageMock.getAllStoredFiles;
  });

  afterEach(async () => {
    // Tear down the client after use
    await promisify(testUtils.cleanUp, client._id);
  });

  describe('When platform option is set', () => {
    describe('Release exports', () => {
      it('are uploaded to GCS', async () => {
        // Set up a Release
        const release = new Release({
          clientId: client._id.toString(),
          title: 'My First Release',
          version: '1.0',
          artist: 'The Roberts',
          foreignId: 'my-first-release-fk',
          projectId: 'my_first_release_pk',
          catNo: 'CATNO00001',
          barcode: '0000000000017',
          label: "Robert's Label",
          releaseDate: '2025-03-01T00:00:00.000+00:00',
          distributionChannel: 'Performance',
          format: 'Physical',
          dealerPrice: 1.23,
          trackIds: [
            '67cee45c50ab1f49832857f7',
          ],
          salesReturnsRights: [
            {
              contractId: '67cee4f750ab1f4983285bf5',
              percentage: 100,
            },
          ],
          priceCategory: 'Full Price',
        });

        await release.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back externalReleases, with the URL and schema set
        const { externalReleases } = data;
        expect(externalReleases).toBeTruthy();

        const { url, schema } = externalReleases;
        expect(url).toBeTruthy();
        expect(schema).toBeTruthy();

        // We should only have one stored file
        const storedFiles = getAllStoredFiles();
        expect(Object.keys(storedFiles).length).toEqual(1);

        // The buffer should be stored against the path we returned in the externalReleases data
        const { fileName } = gcp.splitUrl(url);
        const buffer = storedFiles[fileName];
        expect(buffer).toBeTruthy();

        const results = await getObjectsFromStream(bufferToReadStream(buffer));

        // We expect one release back
        expect(results.length).toEqual(1);

        // Validate the fields are what we expect
        const foundRelease = results[0];
        expect(foundRelease.title).toEqual('My First Release');
        expect(foundRelease.version).toEqual('1.0');
        expect(foundRelease.artist).toEqual('The Roberts');
        expect(foundRelease.label).toEqual('Robert\'s Label');
        expect(foundRelease.catNo).toEqual('CATNO00001');
        expect(foundRelease.foreignId).toEqual('my-first-release-fk');
        expect(foundRelease.barcode).toEqual('0000000000017');
        expect(foundRelease.dealerPrice).toEqual('1.23');
        expect(foundRelease.distributionChannel).toEqual('Performance');
        expect(foundRelease.priceCategory).toEqual('Full Price');
        expect(foundRelease.format).toEqual('Physical');

        expect(foundRelease.contractIds.length).toEqual(1);
        expect(foundRelease.contractIds[0]).toEqual('67cee4f750ab1f4983285bf5');
      });

      it('uploaded to GCS with nullable fields', async () => {
        // Set up a Release
        const release = new Release({
          clientId: client._id.toString(),
          title: 'My First Release',
        });

        await release.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back externalReleases, with the URL and schema set
        const { externalReleases } = data;
        expect(externalReleases).toBeTruthy();

        const { url, schema } = externalReleases;
        expect(url).toBeTruthy();
        expect(schema).toBeTruthy();

        // We should only have one stored file
        const storedFiles = getAllStoredFiles();
        expect(Object.keys(storedFiles).length).toEqual(1);

        // The buffer should be stored against the path we returned in the externalReleases data
        const { fileName } = gcp.splitUrl(url);
        const buffer = storedFiles[fileName];
        expect(buffer).toBeTruthy();

        const results = await getObjectsFromStream(bufferToReadStream(buffer));

        // Validate the fields are what we expect
        const foundRelease = results[0];
        expect(foundRelease.title).toEqual('My First Release');
        expect(foundRelease.version).toBeFalsy();
        expect(foundRelease.artist).toBeFalsy();
        expect(foundRelease.label).toBeFalsy();
        expect(foundRelease.catNo).toBeFalsy();
        expect(foundRelease.foreignId).toBeFalsy();
        expect(foundRelease.barcode).toBeFalsy();
        expect(foundRelease.dealerPrice).toBeFalsy();
        expect(foundRelease.distributionChannel).toBeFalsy();
        expect(foundRelease.priceCategory).toBeFalsy();
        expect(foundRelease.format).toBeFalsy();
        expect(foundRelease.contractIds.length).toEqual(0);
      });

      it('not uploaded if no releases present', async () => {
        // Don't set up a Release

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back no externalReleases info
        const { externalReleases } = data;
        expect(externalReleases).toBeFalsy();
      });
    });

    describe('Track exports', () => {
      it('are uploaded to GCS', async () => {
        // Set up a Track
        const track = new Track({
          clientId: client._id.toString(),
          title: 'Track 1',
          version: '2.0',
          artist: 'The Roberts ft. Some Guy',
          foreignId: 'track-1-fk',
          projectId: 'track_1_pk',
          isrc: 'ISRC00001',
          label: 'Some Label',
          pLine: "What's a P Line?",
          defaultReleaseId: '67cee28450ab1f4983285408',
          salesReturnsRights: [
            {
              contractId: '67cee51e50ab1f4983285d7f',
              percentage: 25,
            },
            {
              contractId: '67cee5391c0c6e366dc50270',
              percentage: 75,
            },
          ],
          releaseSpecificSalesReturnsRights: [
            {
              releaseId: '67cee45650ab1f49832857ab',
              contractId: '67ceefc850ab1f4983286e01',
              percentage: 100,
            },
          ],
          costsRights: [
            {
              contractId: '67cee51e50ab1f4983285d7f',
              percentage: 60,
            },
            {
              contractId: '67cee5391c0c6e366dc50270',
              percentage: 40,
            },
          ],
          statutoryRate: 0.127,
          canadianStatutoryRate: 0.083,
          releaseSpecificForeignIds: {
            '67cee45650ab1f49832857ab': 'release-specific-id-2-1',
          },
        });

        await track.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back externalTracks, with the URL and schema set
        const { externalTracks } = data;
        expect(externalTracks).toBeTruthy();

        const { url, schema } = externalTracks;
        expect(url).toBeTruthy();
        expect(schema).toBeTruthy();

        // We should only have one stored file
        const storedFiles = getAllStoredFiles();
        expect(Object.keys(storedFiles).length).toEqual(1);

        // The buffer should be stored against the path we returned in the externalTracks data
        const { fileName } = gcp.splitUrl(url);
        const buffer = storedFiles[fileName];
        expect(buffer).toBeTruthy();

        const results = await getObjectsFromStream(bufferToReadStream(buffer));

        // We expect one track back
        expect(results.length).toEqual(1);

        // Validate the fields are what we expect
        const foundTrack = results[0];
        expect(foundTrack.title).toEqual('Track 1');
        expect(foundTrack.version).toEqual('2.0');
        expect(foundTrack.artist).toEqual('The Roberts ft. Some Guy');
        expect(foundTrack.label).toEqual('Some Label');
        expect(foundTrack.foreignId).toEqual('track-1-fk');
        expect(foundTrack.isrc).toEqual('ISRC00001');
        expect(foundTrack.contractIds).toEqual(['67cee51e50ab1f4983285d7f', '67cee5391c0c6e366dc50270']);
        expect(foundTrack.defaultReleaseId).toEqual('67cee28450ab1f4983285408');
        expect(foundTrack.releaseSpecificForeignIds).toEqual({ '67cee45650ab1f49832857ab': 'release-specific-id-2-1' });
      });

      it('Handles nullable fields correctly', async () => {
        // Set up a Track
        const track = new Track({
          clientId: client._id.toString(),
          title: 'Track 1',
        });

        await track.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back externalTracks, with the URL and schema set
        const { externalTracks } = data;
        expect(externalTracks).toBeTruthy();

        const { url, schema } = externalTracks;
        expect(url).toBeTruthy();
        expect(schema).toBeTruthy();

        // We should only have one stored file
        const storedFiles = getAllStoredFiles();
        expect(Object.keys(storedFiles).length).toEqual(1);

        // The buffer should be stored against the path we returned in the externalTracks data
        const { fileName } = gcp.splitUrl(url);
        const buffer = storedFiles[fileName];
        expect(buffer).toBeTruthy();

        const results = await getObjectsFromStream(bufferToReadStream(buffer));

        // We expect one track back
        expect(results.length).toEqual(1);

        // Validate the fields are what we expect
        const foundTrack = results[0];
        expect(foundTrack.title).toEqual('Track 1');
        expect(foundTrack.version).toBeFalsy();
        expect(foundTrack.artist).toBeFalsy();
        expect(foundTrack.label).toBeFalsy();
        expect(foundTrack.foreignId).toBeFalsy();
        expect(foundTrack.isrc).toBeFalsy();
        expect(foundTrack.contractIds).toEqual([]);
        expect(foundTrack.defaultReleaseId).toBeFalsy();
        expect(foundTrack.releaseSpecificForeignIds).toEqual({});
      });

      it('not uploaded if no releases present', async () => {
        // Don't set up a Track

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back no externalTracks info
        const { externalTracks } = data;
        expect(externalTracks).toBeFalsy();
      });
    });

    describe('Work exports', () => {
      it('are uploaded to GCS', async () => {
        // Set up a Work
        const work = new Work({
          clientId: client._id.toString(),
          title: 'My First Work',
          composer: 'Jimmy',
          foreignId: 'my-first-work-fk',
          projectId: 'my_first_work_pk',
          identifier: 'MyFirstWork',
          tunecode: 'TUNECODE00001',
          iswc: 'ISWC00001',
          salesReturnsRights: [
            {
              contractId: '67cee5461c0c6e366dc5030a',
              percentage: 100,
              displayPercentage: 100,
            },
          ],
        });

        await work.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back externalWorks, with the URL and schema set
        const { externalWorks } = data;
        expect(externalWorks).toBeTruthy();

        const { url, schema } = externalWorks;
        expect(url).toBeTruthy();
        expect(schema).toBeTruthy();

        // We should only have one stored file
        const storedFiles = getAllStoredFiles();
        expect(Object.keys(storedFiles).length).toEqual(1);

        // The buffer should be stored against the path we returned in the externalWorks data
        const { fileName } = gcp.splitUrl(url);
        const buffer = storedFiles[fileName];
        expect(buffer).toBeTruthy();

        const results = await getObjectsFromStream(bufferToReadStream(buffer));

        // We expect one work back
        expect(results.length).toEqual(1);

        // Validate the fields are what we expect
        const foundWork = results[0];
        expect(foundWork.title).toEqual('My First Work');
        expect(foundWork.composer).toEqual('Jimmy');
        expect(foundWork.identifier).toEqual('MyFirstWork');
        expect(foundWork.foreignId).toEqual('my-first-work-fk');
        expect(foundWork.iswc).toEqual('ISWC00001');
        expect(foundWork.tunecode).toEqual('TUNECODE00001');
        expect(foundWork.contractIds).toEqual(['67cee5461c0c6e366dc5030a']);
      });

      it('uploaded to GCS with nullable fields', async () => {
        // Set up a Work
        const work = new Work({
          clientId: client._id.toString(),
          title: 'My First Work',
          salesReturnsRights: [],
          channelSpecificSalesReturnsRights: [],
        });

        await work.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back externalWorks, with the URL and schema set
        const { externalWorks } = data;
        expect(externalWorks).toBeTruthy();

        const { url, schema } = externalWorks;
        expect(url).toBeTruthy();
        expect(schema).toBeTruthy();

        // We should only have one stored file
        const storedFiles = getAllStoredFiles();
        expect(Object.keys(storedFiles).length).toEqual(1);

        // The buffer should be stored against the path we returned in the externalWorks data
        const { fileName } = gcp.splitUrl(url);
        const buffer = storedFiles[fileName];
        expect(buffer).toBeTruthy();

        const results = await getObjectsFromStream(bufferToReadStream(buffer));

        // We expect one work back
        expect(results.length).toEqual(1);

        // Validate the fields are what we expect
        const foundWork = results[0];
        expect(foundWork.title).toEqual('My First Work');
        expect(foundWork.composer).toBeFalsy();
        expect(foundWork.identifier).toBeFalsy();
        expect(foundWork.foreignId).toBeFalsy();
        expect(foundWork.iswc).toBeFalsy();
        expect(foundWork.tunecode).toBeFalsy();
        expect(foundWork.contractIds).toEqual([]);
      });

      it('not uploaded if no releases present', async () => {
        // Don't set up a Work

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { platform: true });

        // Check we got back no externalWorks info
        const { externalReleases } = data;
        expect(externalReleases).toBeFalsy();
      });
    });
  });

  describe('When db option is set', () => {
    describe('Release exports', () => {
      it('are loaded into a database', async () => {
        // Set up a Release
        const release = new Release({
          clientId: client._id.toString(),
          title: 'My First Release',
          version: '1.0',
          artist: 'The Roberts',
          foreignId: 'my-first-release-fk',
          projectId: 'my_first_release_pk',
          catNo: 'CATNO00001',
          barcode: '0000000000017',
          label: "Robert's Label",
          releaseDate: '2025-03-01T00:00:00.000+00:00',
          distributionChannel: 'Performance',
          format: 'Physical',
          dealerPrice: 1.23,
          trackIds: [
            '67cee45c50ab1f49832857f7',
          ],
          salesReturnsRights: [
            {
              contractId: '67cee4f750ab1f4983285bf5',
              percentage: 100,
            },
          ],
          priceCategory: 'Full Price',
          priceCategoryDealerPrices: [0.1, 0.2],
          mechanicalBasisPercentage: 0.3,
          totalMechanicalAmount: 50,
          catalogueGroups: ['Group A', 'Group B'],
        });

        const { _id } = await release.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { db: true });

        // Check we got back releasesDb, with the data inside
        const { releasesDb } = data;
        expect(releasesDb).toBeTruthy();

        const result = await releasesDb.get(_id.toString());

        // Validate the fields are what we expect
        expect(result.catalogueReleaseTitle).toEqual('My First Release');
        expect(result.catalogueReleaseVersion).toEqual('1.0');
        expect(result.catalogueReleaseArtist).toEqual('The Roberts');
        expect(result.catalogueReleaseLabel).toEqual('Robert\'s Label');
        expect(result.catalogueCatNo).toEqual('CATNO00001');
        expect(result.catalogueReleaseForeignId).toEqual('my-first-release-fk');
        expect(result.catalogueReleaseProjectId).toEqual('my_first_release_pk');
        expect(result.catalogueBarcode).toEqual('0000000000017');
        expect(result.ppd).toEqual(1.23);
        expect(result.distributionChannel).toEqual('Performance');
        expect(result.priceCategory).toEqual('Full Price');
        expect(result.catalogueFormat).toEqual('Physical');
        expect(result.catalogueContractIds.length).toEqual(1);
        expect(result.catalogueContractIds[0]).toEqual('67cee4f750ab1f4983285bf5');
        expect(result.catalogueReleaseDate).toEqual('2025-03-01T00:00:00.000Z');
        expect(result.releaseCatalogueGroups).toEqual(['Group A', 'Group B']);
      });

      it('uploaded to GCS with nullable fields', async () => {
        // Set up a Release
        const release = new Release({
          clientId: client._id.toString(),
          title: 'My First Release',
        });

        const { _id } = await release.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { db: true });

        // Check we got back releasesDb, with the data inside
        const { releasesDb } = data;
        expect(releasesDb).toBeTruthy();

        const result = await releasesDb.get(_id.toString());

        // Validate the fields are what we expect
        expect(result.catalogueReleaseTitle).toEqual('My First Release');
        expect(result.catalogueReleaseVersion).toBeFalsy();
        expect(result.catalogueReleaseArtist).toBeFalsy();
        expect(result.catalogueReleaseLabel).toBeFalsy();
        expect(result.catalogueCatNo).toBeFalsy();
        expect(result.catalogueReleaseForeignId).toBeFalsy();
        expect(result.catalogueReleaseProjectId).toBeFalsy();
        expect(result.catalogueBarcode).toBeFalsy();
        expect(result.ppd).toBeFalsy();
        expect(result.distributionChannel).toBeFalsy();
        expect(result.priceCategory).toBeFalsy();
        expect(result.catalogueFormat).toBeFalsy();
        expect(result.catalogueContractIds.length).toEqual(0);
        expect(result.catalogueReleaseDate).toBeFalsy();
        expect(result.releaseCatalogueGroups.length).toEqual(0);
      });
    });

    describe('Track exports', () => {
      it('are uploaded to GCS', async () => {
        // Set up a Track
        const track = new Track({
          clientId: client._id.toString(),
          title: 'Track 1',
          version: '2.0',
          artist: 'The Roberts ft. Some Guy',
          foreignId: 'track-1-fk',
          projectId: 'track_1_pk',
          isrc: 'ISRC00001',
          label: 'Some Label',
          pLine: "What's a P Line?",
          defaultReleaseId: '67cee28450ab1f4983285408',
          salesReturnsRights: [
            {
              contractId: '67cee51e50ab1f4983285d7f',
              percentage: 25,
            },
            {
              contractId: '67cee5391c0c6e366dc50270',
              percentage: 75,
            },
          ],
          releaseSpecificSalesReturnsRights: [
            {
              releaseId: '67cee45650ab1f49832857ab',
              contractId: '67ceefc850ab1f4983286e01',
              percentage: 100,
            },
          ],
          costsRights: [
            {
              contractId: '67cee51e50ab1f4983285d7f',
              percentage: 60,
            },
            {
              contractId: '67cee5391c0c6e366dc50270',
              percentage: 40,
            },
          ],
          statutoryRate: 0.127,
          canadianStatutoryRate: 0.083,
          releaseSpecificForeignIds: {
            '67cee45650ab1f49832857ab': 'release-specific-id-2-1',
          },
          catalogueGroups: ['Group A', 'Group B'],
        });

        const { _id } = await track.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { db: true });

        // Check we got back tracksDb, with the data inside
        const { tracksDb } = data;
        expect(tracksDb).toBeTruthy();

        const result = await tracksDb.get(_id.toString());

        // Validate the fields are what we expect
        expect(result.catalogueTrackTitle).toEqual('Track 1');
        expect(result.catalogueTrackVersion).toEqual('2.0');
        expect(result.catalogueTrackArtist).toEqual('The Roberts ft. Some Guy');
        expect(result.catalogueTrackLabel).toEqual('Some Label');
        expect(result.catalogueIsrc).toEqual('ISRC00001');
        expect(result.catalogueTrackForeignId).toEqual('track-1-fk');
        expect(result.catalogueTrackProjectId).toEqual('track_1_pk');
        expect(result.catalogueContractIds).toEqual(['67cee51e50ab1f4983285d7f', '67cee5391c0c6e366dc50270']);
        expect(result.defaultReleaseId).toEqual('67cee28450ab1f4983285408');
        expect(result.releaseSpecificForeignIds).toEqual({ '67cee45650ab1f49832857ab': 'release-specific-id-2-1' });
        expect(result.trackCatalogueGroups).toEqual(['Group A', 'Group B']);
      });

      it('Handles nullable fields correctly', async () => {
        // Set up a Track
        const track = new Track({
          clientId: client._id.toString(),
          title: 'Track 1',
        });

        const { _id } = await track.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { db: true });

        // Check we got back tracksDb, with the data inside
        const { tracksDb } = data;
        expect(tracksDb).toBeTruthy();

        const result = await tracksDb.get(_id.toString());

        // Validate the fields are what we expect
        expect(result.catalogueTrackTitle).toEqual('Track 1');
        expect(result.catalogueTrackVersion).toBeFalsy();
        expect(result.catalogueTrackArtist).toBeFalsy();
        expect(result.catalogueTrackLabel).toBeFalsy();
        expect(result.catalogueIsrc).toBeFalsy();
        expect(result.catalogueTrackForeignId).toBeFalsy();
        expect(result.catalogueTrackProjectId).toBeFalsy();
        expect(result.catalogueContractIds.length).toEqual(0);
        expect(result.defaultReleaseId).toBeFalsy();
        expect(result.releaseSpecificForeignIds).toEqual({});
        expect(result.trackCatalogueGroups.length).toEqual(0);
      });
    });

    describe('Work exports', () => {
      it('are uploaded to GCS', async () => {
        // Set up a Work
        const work = new Work({
          clientId: client._id.toString(),
          title: 'My First Work',
          composer: 'Jimmy',
          foreignId: 'my-first-work-fk',
          projectId: 'my_first_work_pk',
          identifier: 'MyFirstWork',
          tunecode: 'TUNECODE00001',
          iswc: 'ISWC00001',
          salesReturnsRights: [
            {
              contractId: '67cee5461c0c6e366dc5030a',
              percentage: 100,
              displayPercentage: 100,
            },
          ],
          trackIds: ['1', '3', '6'],
          catalogueGroups: ['Group A', 'Group B'],
        });

        const { _id } = await work.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { db: true });

        // Check we got back worksDb, with the data inside
        const { worksDb } = data;
        expect(worksDb).toBeTruthy();

        const result = await worksDb.get(_id.toString());

        // Validate the fields are what we expect
        expect(result.catalogueWorkTitle).toEqual('My First Work');
        expect(result.catalogueWorkComposer).toEqual('Jimmy');
        expect(result.catalogueIdentifier).toEqual('MyFirstWork');
        expect(result.catalogueWorkForeignId).toEqual('my-first-work-fk');
        expect(result.catalogueWorkProjectId).toEqual('my_first_work_pk');
        expect(result.catalogueIswc).toEqual('ISWC00001');
        expect(result.catalogueTunecode).toEqual('TUNECODE00001');
        expect(result.catalogueContractIds).toEqual(['67cee5461c0c6e366dc5030a']);
        expect(result.catalogueTrackIds).toEqual(['1', '3', '6']);
        expect(result.workCatalogueGroups).toEqual(['Group A', 'Group B']);
      });

      it('uploaded to GCS with nullable fields', async () => {
        // Set up a Work
        const work = new Work({
          clientId: client._id.toString(),
          title: 'My First Work',
          salesReturnsRights: [],
          channelSpecificSalesReturnsRights: [],
        });

        const { _id } = await work.save();

        // Fetch our data
        const [data] = await promisify(CatalogueOverwritingData.get, client, { db: true });

        // Check we got back worksDb, with the data inside
        const { worksDb } = data;
        expect(worksDb).toBeTruthy();

        const result = await worksDb.get(_id.toString());

        // Validate the fields are what we expect
        expect(result.catalogueWorkTitle).toEqual('My First Work');
        expect(result.catalogueWorkComposer).toBeFalsy();
        expect(result.catalogueIdentifier).toBeFalsy();
        expect(result.catalogueWorkForeignId).toBeFalsy();
        expect(result.catalogueWorkProjectId).toBeFalsy();
        expect(result.catalogueIswc).toBeFalsy();
        expect(result.catalogueTunecode).toBeFalsy();
        expect(result.catalogueContractIds.length).toEqual(0);
        expect(result.catalogueTrackIds.length).toEqual(0);
        expect(result.workCatalogueGroups.length).toEqual(0);
      });
    });
  });

  describe('When joinArraysToString option is set', () => {
    describe('Release exports', () => {
      it('joins catalogueContractIds and catalogueGroups as strings', async () => {
        const release = new Release({
          clientId: client._id.toString(),
          title: 'My First Release',
          salesReturnsRights: [
            { contractId: '67cee4f750ab1f4983285bf5', percentage: 60 },
            { contractId: '67cee5391c0c6e366dc50270', percentage: 40 },
          ],
          catalogueGroups: ['Group A', 'Group B'],
        });

        const { _id } = await release.save();

        const [data] = await promisify(CatalogueOverwritingData.get, client, { joinArraysToString: true });

        const result = data.releases[_id.toString()];
        expect(result.catalogueContractIds).toEqual('67cee4f750ab1f4983285bf5, 67cee5391c0c6e366dc50270');
        expect(result.releaseCatalogueGroups).toEqual('Group A;Group B');
      });
    });

    describe('Track exports', () => {
      it('joins catalogueContractIds and trackCatalogueGroups as strings', async () => {
        const track = new Track({
          clientId: client._id.toString(),
          title: 'Track 1',
          salesReturnsRights: [
            { contractId: '67cee4f750ab1f4983285bf5', percentage: 60 },
            { contractId: '67cee5391c0c6e366dc50270', percentage: 40 },
          ],
          catalogueGroups: ['Group A', 'Group B'],
        });

        const { _id } = await track.save();

        const [data] = await promisify(CatalogueOverwritingData.get, client, { joinArraysToString: true });

        const result = data.tracks[_id.toString()];
        expect(result.catalogueContractIds).toEqual('67cee4f750ab1f4983285bf5, 67cee5391c0c6e366dc50270');
        expect(result.trackCatalogueGroups).toEqual('Group A;Group B');
      });

      it('joins catalogueContractIds as a string', async () => {
        const track = new Track({
          clientId: client._id.toString(),
          title: 'My First Track',
          salesReturnsRights: [
            { contractId: '67cee51e50ab1f4983285d7f', percentage: 50 },
            { contractId: '67cee5391c0c6e366dc50270', percentage: 50 },
          ],
        });

        const { _id } = await track.save();

        const [data] = await promisify(CatalogueOverwritingData.get, client, { joinArraysToString: true });

        const result = data.tracks[_id.toString()];
        expect(result.catalogueContractIds).toEqual('67cee51e50ab1f4983285d7f, 67cee5391c0c6e366dc50270');
      });
    });

    describe('Work exports', () => {
      it('joins catalogueContractIds as a string', async () => {
        const work = new Work({
          clientId: client._id.toString(),
          title: 'My First Work',
          salesReturnsRights: [
            { contractId: '67cee5461c0c6e366dc5030a', percentage: 60, displayPercentage: 60 },
            { contractId: '67cee5391c0c6e366dc50270', percentage: 40, displayPercentage: 40 },
          ],
        });

        const { _id } = await work.save();

        const [data] = await promisify(CatalogueOverwritingData.get, client, { joinArraysToString: true });

        const result = data.works[_id.toString()];
        expect(result.catalogueContractIds).toEqual('67cee5461c0c6e366dc5030a, 67cee5391c0c6e366dc50270');
      });

      it('joins workCatalogueGroups as a string', async () => {
        const work = new Work({
          clientId: client._id.toString(),
          title: 'My First Work',
          salesReturnsRights: [
            { contractId: '67cee5461c0c6e366dc5030a', percentage: 60, displayPercentage: 60 },
            { contractId: '67cee5391c0c6e366dc50270', percentage: 40, displayPercentage: 40 },
          ],
          catalogueGroups: ['Group A', 'Group B'],
        });

        const { _id } = await work.save();

        const [data] = await promisify(CatalogueOverwritingData.get, client, { joinArraysToString: true });

        const result = data.works[_id.toString()];
        expect(result.catalogueContractIds).toEqual('67cee5461c0c6e366dc5030a, 67cee5391c0c6e366dc50270');
        expect(result.workCatalogueGroups).toEqual('Group A;Group B');
      });
    });

    describe('Contract exports', () => {
      it('joins contractCategories as a string', async () => {
        const contract = new Contract({
          clientId: client._id.toString(),
          name: 'My First Contract',
          contractCategories: ['Cat A', 'Cat B'],
        });

        const { _id } = await contract.save();

        const [data] = await promisify(CatalogueOverwritingData.get, client, { joinArraysToString: true });

        const result = data.contracts[_id.toString()];
        expect(result.contractCategories).toEqual('Cat A, Cat B');
      });
    });

    describe('Payee exports', () => {
      it('joins payeeCategories as a string', async () => {
        const payee = new Payee({
          clientId: client._id.toString(),
          name: 'My First Payee',
          payeeCategories: ['Category 1', 'Category 2'],
        });

        const { _id } = await payee.save();

        const [data] = await promisify(CatalogueOverwritingData.get, client, { joinArraysToString: true });

        const result = data.payees[_id.toString()];
        expect(result.payeeCategories).toEqual('Category 1, Category 2');
      });
    });
  });
});

const bufferToReadStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signal end of stream
  return stream;
};

const getObjectsFromStream = async (stream) => {
  const decoder = new avro.streams.BlockDecoder();
  const decodedStream = stream.pipe(decoder);

  const rtn = [];
  for await (const element of decodedStream) {
    rtn.push(element);
  }
  return rtn;
};

// Mock implementation of Google Cloud Storage
const createStorageMock = () => {
  // Store file contents in memory
  const uploadedFiles = new Map();

  // Create a mock Storage instance
  const storageMock = {
    bucket: jest.fn().mockImplementation(() => ({
      upload: jest.fn().mockImplementation(async (path, options) => {
        // Read file contents
        expect(path).toBeTruthy();
        const fileBuffer = await readFile(path);

        const { destination } = options;
        expect(destination).toBeTruthy();

        // Store file contents in memory using the path as the key
        uploadedFiles.set(destination, fileBuffer);

        // Return a mock upload promise
        return Promise.resolve([{
          metadata: {
            name: path,
          },
        }]);
      }),
    })),
  };

  return {
    storageMock,

    // Helper to get all stored files
    getAllStoredFiles: () => Object.fromEntries(uploadedFiles),
  };
};
