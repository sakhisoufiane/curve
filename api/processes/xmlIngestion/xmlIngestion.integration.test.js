const path = require('path');
const {
  logger,
  testUtils,
} = require('@curveroyaltysystems/platform-shared-utils');
const { promisify } = require('util');
const XMLIngestion = require('./xmlReader');
const dataIngest = require('./dataIngest');
const Client = require('../../models/client');
const Track = require('../../models/track');
const { HowToIngestOtherIdsOnImport } = require('../../libs/enums/client');

describe('process: xmlIngestion', () => {
  logger.info(
    '>>>file>>>> int/processes/xmlIngestion/index .....................',
  );

  let client;
  let tracks;

  beforeEach(async () => {
    client = await Client.create({
      name: testUtils.randomString(12),
      clientType: 'Publisher',
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
  });

  const runImport = async ({ testFile, howToIngestOtherIdsOnImport = '', ddexDoNotUpdateExistingLabel = false }) => {
    const [releases] = await Promise.all([
      promisify(XMLIngestion.getReleases)(
        [testFile],
        howToIngestOtherIdsOnImport,
      ),
    ]);

    await promisify(dataIngest.ingest)(
      releases,
      client._id.toString(),
      'Digital',
      {},
      false,
      undefined,
      undefined,
      null,
      ddexDoNotUpdateExistingLabel,
    );

    tracks = await Track.find({ clientId: client._id.toString() });

    return { client, tracks };
  };

  describe('DDEX v3 import', () => {
    const xmlTestData = {
      title: 'Silent Lost DOLBY',
      version: 'Extended Mix',
      duration: 581,
      artist: 'Hollt',
      pLine: 'die Stube Records / Hollt Music',
      label: 'die Stube Records',
    };

    describe('When "howToIngestOtherIdsOnImport" is set to never then don\'t add new track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');

      beforeEach(async () => {
        ({ tracks } = await runImport({ testFile }));
      });

      it('should create one track with expected structure', () => {
        expect(tracks).toHaveLength(1);
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new tracks" then create the track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');

      beforeEach(async () => {
        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewTrack,
        }));
      });

      it('should create two tracks with expected structure', () => {
        expect(tracks).toHaveLength(2);
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        const additionalTrack = tracks.find((track) => track.isrc === 'NLP4Y2000005');
        expect(additionalTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new aliases" then set the alias for that track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');

      beforeEach(async () => {
        await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        });

        // We run it twice so that we can test that there's no duplicates in the alias field
        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        }));
      });

      it('should create one track with expected structure and aliases', () => {
        expect(tracks).toHaveLength(1);
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
          aliases: ['NLP4Y2000005'],
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new track" and the alternative ids already exist as records then don\'t update', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewTrack,
        }));
      });

      it('should create main track and not update existing track that has the alternative ID', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        const existingTrackAfterImport = tracks.find((track) => track._id.toString() === existingTrack._id.toString());
        expect(existingTrackAfterImport).toEqual(expect.objectContaining({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new track" and the alternative ids already exist as an alias then don\'t create it', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');

      beforeEach(async () => {
        await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051525',
          title: 'Track that has the ISRC as an alias',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
          aliases: ['NLP4Y2000005'],
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewTrack,
        }));
      });

      it('should create main track but not create track for existing alias', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        const trackWithAlias = tracks.find((track) => track.isrc === 'NLP4Y2000005');
        expect(trackWithAlias).toBeUndefined();
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new alias" and the alternative ids already exists as an alias then don\'t add the alias', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');

      beforeEach(async () => {
        await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000009',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
          aliases: ['NLP4Y2000005'],
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        }));
      });

      it('should create main track without adding existing alias', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));
        expect(mainTrack.aliases?.includes('NLP4Y2000005')).toBe(false);
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new alias" and the alternative ids already exist as a track then don\'t add the alias', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');

      beforeEach(async () => {
        await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        }));
      });

      it('should create main track without adding alias for existing track', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));
        expect(mainTrack.aliases?.includes('NLP4Y2000005')).toBe(false);
      });
    });

    describe('When an existing track is found then update track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
        });

        ({ tracks } = await runImport({ testFile }));
      });

      it('should update existing track with new values', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));
      });
    });

    describe('When an existing track with a label is redelivered with different label then preserve existing label', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
          label: 'Original Label That Should Be Preserved',
        });

        ({ tracks } = await runImport({ testFile, ddexDoNotUpdateExistingLabel: true }));
      });

      it('should NOT update the existing label', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());

        expect(mainTrack).toEqual(expect.objectContaining({
          title: 'Silent Lost DOLBY',
          version: 'Extended Mix',
          duration: 581,
          artist: 'Hollt',
          pLine: 'die Stube Records / Hollt Music',
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        expect(mainTrack.label).toBe('Original Label That Should Be Preserved');
        expect(mainTrack.label).not.toBe('die Stube Records');
      });
    });

    describe('When an existing track without a label is redelivered with a label then update label', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
        });

        ({ tracks } = await runImport({ testFile }));
      });

      it('should update the label from DDEX', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());

        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        expect(mainTrack.label).toBe('die Stube Records');
      });
    });

    describe('When ddexDoNotUpdateExistingLabel flag is true and existing track has a label', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
          label: 'Original Label That Should Be Preserved',
        });

        ({ tracks } = await runImport({ testFile, ddexDoNotUpdateExistingLabel: true }));
      });

      it('should NOT update the existing label', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());

        expect(mainTrack).toEqual(expect.objectContaining({
          title: 'Silent Lost DOLBY',
          version: 'Extended Mix',
          duration: 581,
          artist: 'Hollt',
          pLine: 'die Stube Records / Hollt Music',
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        expect(mainTrack.label).toBe('Original Label That Should Be Preserved');
        expect(mainTrack.label).not.toBe('die Stube Records');
      });
    });

    describe('When ddexDoNotUpdateExistingLabel flag is false and existing track has a label', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
          label: 'Original Label',
        });

        ({ tracks } = await runImport({ testFile, ddexDoNotUpdateExistingLabel: false }));
      });

      it('should update the label from DDEX', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());

        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        expect(mainTrack.label).toBe('die Stube Records');
      });
    });

    describe('When ddexDoNotUpdateExistingLabel flag is true and existing track has NO label', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
        });

        ({ tracks } = await runImport({ testFile, ddexDoNotUpdateExistingLabel: true }));
      });

      it('should update the label from DDEX since existing track has no label', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());

        expect(mainTrack).toEqual(expect.objectContaining({
          title: 'Silent Lost DOLBY',
          version: 'Extended Mix',
          duration: 581,
          artist: 'Hollt',
          pLine: 'die Stube Records / Hollt Music',
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        expect(mainTrack.label).toBe('die Stube Records');
      });
    });

    describe('When ddexDoNotUpdateExistingLabel flag is false and import has NO label but existing track has a label', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3-no-label.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051527',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
          label: 'Original Label To Be Cleared',
        });

        ({ tracks } = await runImport({ testFile, ddexDoNotUpdateExistingLabel: false }));
      });

      it('should clear the label since flag is false (original behavior)', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());

        expect(mainTrack).toEqual(expect.objectContaining({
          title: 'Track Without Label',
          version: 'Extended Mix',
          duration: 581,
          artist: 'Test Artist',
          pLine: 'Test PLine',
          clientId: client._id.toString(),
          isrc: 'NLRD52051527',
        }));

        expect(mainTrack.label).toBeUndefined();
      });
    });

    describe('When ddexDoNotUpdateExistingLabel flag is true but track is NEW (not existing)', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v3.xml');

      beforeEach(async () => {
        // No existing track - this will be a new track
        ({ tracks } = await runImport({ testFile, ddexDoNotUpdateExistingLabel: true }));
      });

      it('should set the label from DDEX because it is a new track', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'NLRD52051526');

        expect(mainTrack).toEqual(expect.objectContaining({
          title: 'Silent Lost DOLBY',
          version: 'Extended Mix',
          duration: 581,
          artist: 'Hollt',
          pLine: 'die Stube Records / Hollt Music',
          clientId: client._id.toString(),
          isrc: 'NLRD52051526',
        }));

        // Even though flag is true, new tracks should still get their label set
        expect(mainTrack.label).toBe('die Stube Records');
      });
    });
  });

  describe('DDEX v4.3 import', () => {
    const xmlTestData = {
      title: 'Mozart: Lucio Silla, K. 135 - Overture',
      duration: 469,
      artist: 'Filarmonica della Scala and Riccardo Chailly',
      pLine: '℗ 2022 Universal Music Operations Limited',
      version: 'Version 2',
    };

    describe('When "howToIngestOtherIdsOnImport" is set to never then don\'t add new track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');

      beforeEach(async () => {
        ({ tracks } = await runImport({ testFile }));
      });

      it('should create one track with expected structure', () => {
        expect(tracks).toHaveLength(1);
        const mainTrack = tracks.find((track) => track.isrc === 'GBBBC2200191');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new tracks" then create the track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');

      beforeEach(async () => {
        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewTrack,
        }));
      });

      it('should create two tracks with expected structure', () => {
        expect(tracks).toHaveLength(2);
        const mainTrack = tracks.find((track) => track.isrc === 'GBBBC2200191');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
        }));

        const additionalTrack = tracks.find((track) => track.isrc === 'NLP4Y2000005');
        expect(additionalTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new aliases" then set the alias for that track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');

      beforeEach(async () => {
        await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        });

        // We run it twice so that we can test that there's no duplicates in the alias field
        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        }));
      });

      it('should create one track with expected structure and aliases', () => {
        expect(tracks).toHaveLength(1);
        const mainTrack = tracks.find((track) => track.isrc === 'GBBBC2200191');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
          aliases: ['NLP4Y2000005'],
        }));
      });
    });

    describe('When an existing track is found then update track', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
          title: 'Old title',
          duration: 459,
          artist: 'old artist',
          pLine: 'old pline',
          version: 'old version',
        });

        ({ tracks } = await runImport({ testFile }));
      });

      it('should update existing track with new values', () => {
        const mainTrack = tracks.find((track) => track._id.toString() === existingTrack._id.toString());
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new track" and the alternative ids already exist as records then don\'t update', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');
      let existingTrack;

      beforeEach(async () => {
        existingTrack = await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewTrack,
        }));
      });

      it('should create main track and not update existing track', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'GBBBC2200191');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
        }));

        const existingTrackAfterImport = tracks.find((track) => track._id.toString() === existingTrack._id.toString());
        expect(existingTrackAfterImport).toEqual(expect.objectContaining({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
        }));
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new track" and the alternative ids already exist as an alias then don\'t create it', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');

      beforeEach(async () => {
        await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLRD52051525',
          title: 'Track that has the ISRC as an alias',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
          aliases: ['NLP4Y2000005'],
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewTrack,
        }));
      });

      it('should create main track but not create track for existing alias', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'GBBBC2200191');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
        }));

        const trackWithAlias = tracks.find((track) => track.isrc === 'NLP4Y2000005');
        expect(trackWithAlias).toBeUndefined();
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new alias" and the alternative ids already exists as an alias then don\'t add the alias', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');

      beforeEach(async () => {
        await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000009',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
          aliases: ['NLP4Y2000005'],
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        }));
      });

      it('should create main track without adding existing alias', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'GBBBC2200191');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
        }));
        expect(mainTrack.aliases?.includes('NLP4Y2000005')).toBe(false);
      });
    });

    describe('When "howToIngestOtherIdsOnImport" is set to "Create new alias" and the alternative ids already exist as a track then don\'t add the alias', () => {
      const testFile = path.resolve(__dirname, '../../test/test-data/ddex-v43.xml');

      beforeEach(async () => {
        await Track.create({
          clientId: client._id.toString(),
          isrc: 'NLP4Y2000005',
          title: 'Existing track should not get updated',
          duration: 500,
          artist: 'artist2',
          pLine: 'pline2',
          version: 'version2',
        });

        ({ tracks } = await runImport({
          testFile,
          howToIngestOtherIdsOnImport: HowToIngestOtherIdsOnImport.CreateNewAlias,
        }));
      });

      it('should create main track without adding alias for existing track', () => {
        const mainTrack = tracks.find((track) => track.isrc === 'GBBBC2200191');
        expect(mainTrack).toEqual(expect.objectContaining({
          ...xmlTestData,
          clientId: client._id.toString(),
          isrc: 'GBBBC2200191',
        }));
        expect(mainTrack.aliases?.includes('NLP4Y2000005')).toBe(false);
      });
    });
  });
});
