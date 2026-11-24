const { Readable } = require('stream');

const mockCreateReadStream = jest.fn();
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockImplementation(() => ({
      file: jest.fn().mockImplementation(() => ({
        createReadStream: mockCreateReadStream,
      })),
    })),
  })),
}));

const fugaYouTubeCatalogSync = require('./fugaYouTubeCatalogSync');
const Client = require('../../models/client');
const Track = require('../../models/track');

const fugaOrgId = 'fuga-org-123';

function defaultExpectedTrack() {
  return {
    ...new Track().toObject(),
    __v: expect.any(Number),
    _id: expect.anything(),
    workIds: [],
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    valid: false,
    validationErrors: [],
  };
}

describe('fugaYouTubeCatalogSync', () => {
  let clientId;

  beforeEach(async () => {
    const client = new Client({
      name: 'fugaclient',
      fugaIntegration: {
        fugaOrgId,
      },
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
      features: {
        useAlternativeId: true,
      },
    });
    await client.save();
    clientId = client._id.toString();
  });

  afterEach(async () => {
    await Track.deleteMany({ clientId });
    await Client.deleteOne({ _id: clientId });
  });

  it('should insert new tracks with defaults & the data from the CSV', async () => {
    const csvData = `Alternative ID,Title,Linked ISRC,Artist
alt id $1 ,My Title1,isrc 1 ,Some Artist1
alt id $2 ,My Title2,isrc 2 ,Some Artist2
alt id $3 ,My Title3,,Some Artist3
alt id $4 ,My Title4,isrc 4 ,`;
    const readableStream = new Readable();
    readableStream.push(csvData);
    readableStream.push(null);
    mockCreateReadStream.mockReturnValue(readableStream);
    const metadata = {
      bucket: 'mybucket',
      name: 'myname',
      metadata: {
        fuga_organization_id: fugaOrgId,
        statement_run_title: 'statement run title',
      },
    };
    await fugaYouTubeCatalogSync(metadata);
    const tracks = await Track.find({ clientId }).sort({ alternativeId: 1 }).lean();

    expect(tracks).toEqual([
      {
        ...defaultExpectedTrack(),
        releaseSpecificForeignIds: {},
        clientId,
        useAlternativeId: true,
        alternativeId: 'alt id 1',
        title: 'My Title1',
        linkedIsrc: 'isrc1',
        artist: 'Some Artist1',
        tags: ['youtube'],
      },
      {
        ...defaultExpectedTrack(),
        releaseSpecificForeignIds: {},
        clientId,
        useAlternativeId: true,
        alternativeId: 'alt id 2',
        title: 'My Title2',
        linkedIsrc: 'isrc2',
        artist: 'Some Artist2',
        tags: ['youtube'],
      },
      {
        ...defaultExpectedTrack(),
        releaseSpecificForeignIds: {},
        clientId,
        useAlternativeId: true,
        alternativeId: 'alt id 3',
        title: 'My Title3',
        linkedIsrc: '',
        artist: 'Some Artist3',
        tags: ['youtube'],
      },
      {
        ...defaultExpectedTrack(),
        releaseSpecificForeignIds: {},
        clientId,
        useAlternativeId: true,
        alternativeId: 'alt id 4',
        title: 'My Title4',
        linkedIsrc: 'isrc4',
        artist: '',
        tags: ['youtube'],
      },
    ]);
  });

  it('should update any existing tracks with the data from the CSV and insert new ones', async () => {
    await Track.bulkWrite([
      {
        insertOne: {
          document: {
            clientId,
            useAlternativeId: true,
            alternativeId: 'alt id 2',
            duration: 22,
            label: 'label 2',
          },
        },
      },
      {
        insertOne: {
          document: {
            clientId,
            useAlternativeId: true,
            alternativeId: 'alt id 1',
            title: 'My Title1',
            linkedIsrc: 'isrc1',
            artist: 'Some Artist1',
            tags: ['something else'],
            duration: 11,
            label: 'label 1',
          },
        },
      },
    ]);

    const csvData = `Alternative ID,Title,Linked ISRC,Artist
alt id $1 ,My New Title1,new isrc 1 ,
alt id $2 ,My Title2,isrc 2 ,Some Artist2
alt id $3 ,My Title3,,`;
    const readableStream = new Readable();
    readableStream.push(csvData);
    readableStream.push(null);
    mockCreateReadStream.mockReturnValue(readableStream);
    const metadata = {
      bucket: 'mybucket',
      name: 'myname',
      metadata: {
        fuga_organization_id: fugaOrgId,
        statement_run_title: 'statement run title',
      },
    };
    await fugaYouTubeCatalogSync(metadata);

    const tracks = await Track.find({ clientId }).sort({ alternativeId: 1 }).lean();
    expect(tracks).toEqual([
      {
        ...defaultExpectedTrack(),
        clientId,
        useAlternativeId: true,
        alternativeId: 'alt id 1',
        title: 'My New Title1',
        linkedIsrc: 'newisrc1',
        artist: '',
        tags: ['youtube'],
        duration: 11,
        label: 'label 1',
      },
      {
        ...defaultExpectedTrack(),
        clientId,
        useAlternativeId: true,
        alternativeId: 'alt id 2',
        title: 'My Title2',
        linkedIsrc: 'isrc2',
        artist: 'Some Artist2',
        tags: ['youtube'],
        duration: 22,
        label: 'label 2',
      },
      {
        ...defaultExpectedTrack(),
        clientId,
        useAlternativeId: true,
        alternativeId: 'alt id 3',
        title: 'My Title3',
        linkedIsrc: '',
        artist: '',
        tags: ['youtube'],
        releaseSpecificForeignIds: {}, // TODO no idea why this gets added only with updateOne but not with insertOne...
      },
    ]);
  });

  it('should fail if client cannot be found by FUGA org id', async () => {
    const readableStream = new Readable();
    readableStream.push('');
    readableStream.push(null);
    mockCreateReadStream.mockReturnValue(readableStream);
    const metadata = {
      bucket: 'mybucket',
      name: 'myname',
      metadata: {
        fuga_organization_id: 'BAD',
        statement_run_title: 'statement run title',
      },
    };
    await expect(fugaYouTubeCatalogSync(metadata)).rejects.toThrow('Client not found with fugaOrgId BAD');
  });

  it('should return early if client doesn\'t have useAlternativeId set', async () => {
    const client = await Client.findById(clientId);
    client.features.useAlternativeId = false;
    await client.save();
    const readableStream = new Readable();
    readableStream.push('');
    readableStream.push(null);
    mockCreateReadStream.mockReturnValue(readableStream);
    const metadata = {
      bucket: 'mybucket',
      name: 'myname',
      metadata: {
        fuga_organization_id: fugaOrgId,
        statement_run_title: 'statement run title',
      },
    };
    // Should return early without throwing
    await expect(fugaYouTubeCatalogSync(metadata)).resolves.not.toThrow();
  });
});
