const { Readable } = require('stream');
const importCSV = require('./fugaYouTubeCSVImport');
const Track = require('../../models/track');

jest.mock('../../models/track', () => ({
  bulkWrite: jest.fn(),
}));

describe('importCSV', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should import tracks from a CSV stream in batches', async () => {
    const csvData = `Alternative ID,Title,Linked ISRC,Artist
alt id $1 ,My Title1,isrc 1 ,Some Artist1
alt id $2 ,My Title2,isrc 2 ,Some Artist2
alt id $3 ,My Title3,,Some Artist3
alt id $4 ,My Title4,isrc 4 ,`;

    const readableStream = new Readable();
    readableStream.push(csvData);
    readableStream.push(null);

    const clientId = 'clientId123';

    await importCSV(readableStream, clientId, 3);

    expect(Track.bulkWrite).toHaveBeenCalledTimes(2);
    expect(Track.bulkWrite).toHaveBeenNthCalledWith(1, [
      {
        updateOne: {
          filter: { alternativeId: 'alt id 1', clientId },
          update: {
            $set: { alternativeId: 'alt id 1', title: 'My Title1', linkedIsrc: 'isrc1', artist: 'Some Artist1', clientId, tags: ['youtube'], useAlternativeId: true },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { alternativeId: 'alt id 2', clientId },
          update: {
            $set: { alternativeId: 'alt id 2', title: 'My Title2', linkedIsrc: 'isrc2', artist: 'Some Artist2', clientId, tags: ['youtube'], useAlternativeId: true },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { alternativeId: 'alt id 3', clientId },
          update: {
            $set: { alternativeId: 'alt id 3', title: 'My Title3', linkedIsrc: '', artist: 'Some Artist3', clientId, tags: ['youtube'], useAlternativeId: true },
          },
          upsert: true,
        },
      },
    ]);
    expect(Track.bulkWrite).toHaveBeenNthCalledWith(2, [
      {
        updateOne: {
          filter: { alternativeId: 'alt id 4', clientId },
          update: {
            $set: { alternativeId: 'alt id 4', title: 'My Title4', linkedIsrc: 'isrc4', artist: '', clientId, tags: ['youtube'], useAlternativeId: true },
          },
          upsert: true,
        },
      },
    ]);
  });

  it('should skip rows with no alternativeId or title', async () => {
    const csvData = `Alternative ID,Title,Linked ISRC,Artist
alt id $1 ,My Title1,isrc 1 ,Some Artist1
,My Title2,isrc 2 ,Some Artist2
alt id $3 ,,isrc 3 ,Some Artist3
alt id $4 ,My Title4,isrc 4 ,Some Artist4`;

    const readableStream = new Readable();
    readableStream.push(csvData);
    readableStream.push(null);

    const clientId = 'clientId123';

    await importCSV(readableStream, clientId, 3);

    expect(Track.bulkWrite).toHaveBeenCalledTimes(1);
    expect(Track.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { alternativeId: 'alt id 1', clientId },
          update: {
            $set: { alternativeId: 'alt id 1', title: 'My Title1', linkedIsrc: 'isrc1', artist: 'Some Artist1', clientId, tags: ['youtube'], useAlternativeId: true },
          },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { alternativeId: 'alt id 4', clientId },
          update: {
            $set: { alternativeId: 'alt id 4', title: 'My Title4', linkedIsrc: 'isrc4', artist: 'Some Artist4', clientId, tags: ['youtube'], useAlternativeId: true },
          },
          upsert: true,
        },
      },
    ]);
  });
});
