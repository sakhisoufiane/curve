process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const { cleanUp, randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');
const axios = require('axios');

const Client = require('../../../models/client');
const Release = require('../../../models/release');
const Track = require('../../../models/track');

const { syncClient } = require('../../../libs/fuga/fugaCatalogueSync');

describe('Fuga Sync Integration Tests', () => {
  const clientId = randomId();
  const salesReturnsRights = [{ contractId: 'test', percentage: 95 }];
  let testRelease1; let testRelease2; let client;

  beforeEach(async () => {
    client = new Client({
      _id: clientId,
      name: randomString(),
      fugaSplitType: 'Fuga Split',
      fugaIntegration: {
        fugaOrgId: 'fuga_org_123',
        fugaLastSync: new Date(),
        fugaCurrentlySyncing: false,
      },
      defaultMechanicalBasis: 'Test',
      defaultReportMechanicals: false,
    });
    await client.save();

    testRelease1 = new Release({ clientId, title: randomString(), name: randomString(), fugaId: randomId(), catNo: randomString(), salesReturnsRights });
    await testRelease1.save();

    testRelease2 = new Release({ clientId, title: randomString(), name: randomString(), fugaId: randomId(), catNo: randomString(), salesReturnsRights });
    await testRelease2.save();

    sinon.stub(axios, 'post').resolves({ status: 200, statusText: 'OK', headers: { 'set-cookie': 'test' } });
    sinon.stub(axios, 'get');
  });

  afterEach((done) => {
    sinon.restore();
    cleanUp(clientId, done);
  });

  it('should sync releases and tracks from Fuga and update the database', async () => {
    axios.get.resolves({
      data: {
        fuga: {
          entities: {
            product: [
              {
                id: testRelease1.fugaId,
                name: testRelease1.title,
                upcCode: '1234567890',
                releaseVersion: '1.0',
                displayArtist: 'Artist 1',
                consumerReleaseDate: '2024-01-01T00:00:00Z',
                catalogNumber: 'CAT001',
                label: { name: 'Label 1' },
              },
              {
                id: testRelease2.fugaId,
                name: testRelease2.title,
                upcCode: '0987654321',
                releaseVersion: '1.1',
                displayArtist: 'Artist 2',
                consumerReleaseDate: '2024-02-01T00:00:00Z',
                catalogNumber: 'CAT002',
                label: { name: 'Label 2' },
              },
            ],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const updatedRelease1 = await Release.findOne({ fugaId: testRelease1.fugaId });
    const updatedRelease2 = await Release.findOne({ fugaId: testRelease2.fugaId });
    expect(updatedRelease1.barcode).to.eq('1234567890');
    expect(updatedRelease2.barcode).to.eq('0987654321');
  });

  it('should sync tracks and update the database, with default calculations', async () => {
    axios.get.onFirstCall().resolves({
      data: {
        fuga: {
          entities: {
            product: [{ id: testRelease1.fugaId, name: testRelease1.name }],
          },
        },
      },
    });

    axios.get.onSecondCall().resolves({
      data: {
        fuga: {
          entities: {
            asset: [
              { id: randomId(), isrcCode: 'ISRC123', name: 'Track 1' },
              { id: randomId(), isrcCode: 'ISRC456', name: 'Track 2' },
            ],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const syncedTracks = await Track.find({ clientId }).sort({ title: 1 });
    expect(syncedTracks.length).to.eq(2);
    expect(syncedTracks[0]).to.include({ isrc: 'ISRC123', title: 'Track 1', mechanicalCalculationBasis: 'Test', reportMechanicals: false });
    expect(syncedTracks[1]).to.include({ isrc: 'ISRC456', title: 'Track 2', mechanicalCalculationBasis: 'Test', reportMechanicals: false });
  });

  it('should use the client mechanical default for new tracks if it exists', async () => {
    client.defaultMechanicalBasis = 'Publisher';
    client.defaultReportMechanicals = false;
    await client.save();

    axios.get.resolves({
      data: {
        fuga: {
          entities: {
            product: [{ id: testRelease1.fugaId, name: testRelease1.name }],
            asset: [
              { id: randomId(), isrcCode: 'ISRC123', name: 'Track 1' },
            ],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const syncedTrack = await Track.findOne({ clientId, isrc: 'ISRC123' });
    expect(syncedTrack.mechanicalCalculationBasis).to.eq('Publisher');
    expect(syncedTrack.reportMechanicals).to.eq(false);
  });

  it('should set mechanical basis to "Custom" if no client mechanical default exists', async () => {
    client.defaultMechanicalBasis = null;
    await client.save();

    axios.get.resolves({
      data: {
        fuga: {
          entities: {
            product: [{ id: testRelease1.fugaId, name: testRelease1.name }],
            asset: [
              { id: randomId(), isrcCode: 'ISRC456', name: 'Track 2' },
            ],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const syncedTrack = await Track.findOne({ clientId, isrc: 'ISRC456' });
    expect(syncedTrack.mechanicalCalculationBasis).to.eq('Custom');
  });

  it('should retain mechanical basis for updated tracks', async () => {
    client.defaultMechanicalBasis = 'Publisher';
    await client.save();

    const existingTrack = new Track({
      clientId,
      title: 'Track 3',
      isrc: 'ISRC789',
      mechanicalCalculationBasis: 'Label',
    });
    await existingTrack.save();

    axios.get.resolves({
      data: {
        fuga: {
          entities: {
            product: [{ id: testRelease1.fugaId, name: testRelease1.name }],
            asset: [{ id: randomId(), isrcCode: 'ISRC789', name: 'Track 3 Updated' }],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const updatedTrack = await Track.findOne({ clientId, isrc: 'ISRC789' });
    expect(updatedTrack.mechanicalCalculationBasis).to.eq('Label');
  });

  it('should not update track matched on alias isrc', async () => {
    const existingTrack = new Track({
      clientId,
      title: 'Track Alias Update',
      isrc: randomString(),
      aliases: ['ISRC789'],
      mechanicalCalculationBasis: 'Label',
    });
    await existingTrack.save();

    axios.get.resolves({
      data: {
        fuga: {
          entities: {
            product: [{ id: testRelease1.fugaId, name: testRelease1.name }],
            asset: [{ id: randomId(), isrcCode: 'ISRC789', name: 'Track 3 Updated' }],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const updatedTrack = await Track.findOne({ clientId, isrc: existingTrack.isrc });
    expect(updatedTrack.title).to.eq('Track Alias Update');
  });

  it('should update track matched on isrc', async () => {
    const existingTrack = new Track({
      clientId,
      title: 'Track Alias Update',
      isrc: 'ISRC789',
      aliases: [],
      mechanicalCalculationBasis: 'Label',
    });
    await existingTrack.save();

    axios.get.resolves({
      data: {
        fuga: {
          entities: {
            product: [{ id: testRelease1.fugaId, name: testRelease1.name }],
            asset: [{ id: randomId(), isrcCode: 'ISRC789', name: 'Track 3 Updated' }],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const updatedTrack = await Track.findOne({ clientId, isrc: existingTrack.isrc });
    expect(updatedTrack.title).to.eq('Track 3 Updated');
  });

  it('should update track matched on fuga id', async () => {
    const fugaId = randomString();
    const existingTrack = new Track({
      clientId,
      title: 'Track Alias Update',
      fugaId,
      isrc: randomString(),
      aliases: [],
      mechanicalCalculationBasis: 'Label',
    });
    await existingTrack.save();

    axios.get.resolves({
      data: {
        fuga: {
          entities: {
            product: [{ id: testRelease1.fugaId, name: testRelease1.name }],
            asset: [{ id: fugaId, isrcCode: 'ISRC789', name: 'Track 3 Updated' }],
          },
        },
      },
    });

    await syncClient({ clientId, userEmail: 'test@example.com' });

    const updatedTrack = await Track.findOne({ clientId, fugaId });
    expect(updatedTrack.title).to.eq('Track 3 Updated');
  });
});
