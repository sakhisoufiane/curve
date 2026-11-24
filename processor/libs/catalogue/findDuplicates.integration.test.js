/* eslint-disable no-await-in-loop */
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const FindDuplicates = require('./findDuplicates');
const Client = require('../../models/client');
const Work = require('../../models/work');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const User = require('../../models/user');
const Notification = require('../../models/notification');
const { createMockCursor } = require('./testUtils');

describe('findDuplicates', () => {
  let clientId;
  let email;

  beforeEach(async () => {
    const client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    clientId = client._id.toString();
    email = randomString();

    const user = new User({ clientId, email });
    await user.save();
  });

  it('should throw an error if clientId or type is not provided', async () => {
    // Arrange
    const invalidParams = [
      { clientId: null, type: 'work' },
      { clientId, type: null },
      { clientId: null, type: null },
    ];
      // Act & Assert
    for (const params of invalidParams) {
      await expect(FindDuplicates.findDuplicates(params)).rejects.toThrow('Client ID and catalogue type must be specified');
    }
  });

  describe('when the catalogue type is "work"', () => {
    it('should do nothing if no works are found', async () => {
      // Arrange
      jest.spyOn(FindDuplicates, 'getStreamedCatalogue');
      // Act
      await FindDuplicates.findDuplicates({ clientId, type: 'work' });
      // Assert
      expect(FindDuplicates.getStreamedCatalogue).toHaveBeenCalledTimes(0);
    });

    it('should do nothing if no duplicates are found', async () => {
      // Arrange
      jest.spyOn(FindDuplicates, 'getStreamedCatalogue').mockResolvedValueOnce(createMockCursor([]));
      jest.spyOn(FindDuplicates, 'buildBulkUpdateOperations');
      // Act
      await FindDuplicates.findDuplicates({ clientId, type: 'work' });
      // Assert
      expect(FindDuplicates.buildBulkUpdateOperations).toHaveBeenCalledTimes(0);
    });

    describe('when works are found', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest.spyOn(FindDuplicates, 'getDuplicateGroups');
        jest.spyOn(Work, 'updateMany').mockResolvedValueOnce();
        jest.spyOn(Work, 'bulkWrite').mockResolvedValueOnce();
        jest.spyOn(Notification, 'generate').mockImplementation((name, description, link, options, cb) => cb(null));
      });

      afterEach(async () => {
        await Work.deleteMany({ clientId });
      });

      it('should find duplicate works based on similar titles', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'Work With Some Words' }),
          new Work({ clientId, title: 'work with some words' }),
          new Work({ clientId, title: 'Completely Different' }),
        ];
        await Work.insertMany(works);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        expect(duplicates[0]).toEqual([works[0]._id.toString(), works[1]._id.toString()]);
      });

      it('should find duplicate works based on similar composers', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'A', composer: 'Composer A Feat. Composer C' }),
          new Work({ clientId, title: 'B', composer: 'composer a feat. composer c' }),
          new Work({ clientId, title: 'C', composer: 'Completely Different' }),
          new Work({ clientId, title: 'A', composer: 'composer a feat. composer c' }),
        ];
        await Work.insertMany(works);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        expect(duplicates[0]).toEqual([works[0]._id.toString(), works[3]._id.toString()]);
      });

      it('should find duplicate works based on similar alternative titles', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'A', alternateTitles: [{ title: 'A1' }, { title: 'A2' }] }),
          new Work({ clientId, title: 'A', alternateTitles: [{ title: 'A1' }, { title: 'A' }] }),
          new Work({ clientId, title: 'B', alternateTitles: [{ title: 'B1' }, { title: 'B2' }] }),
        ];
        await Work.insertMany(works);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        expect(duplicates[0]).toEqual([works[0]._id.toString(), works[1]._id.toString()]);
      });

      it('should not find duplicate works from a unique set of works', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'A', composer: 'A', alternateTitles: [{ title: 'A1' }, { title: 'A2' }] }),
          new Work({ clientId, title: 'B', composer: 'A', alternateTitles: [{ title: 'B1' }] }),
          new Work({ clientId, title: 'C', composer: 'A', alternateTitles: [{ title: 'C1' }, { title: 'C2' }] }),
        ];
        await Work.insertMany(works);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        expect(duplicates).toEqual([]);
      });

      it('should find duplicate works with exact matches', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'Exact Match', composer: 'Composer A', alternateTitles: [{ title: 'Exact Match' }] }),
          new Work({ clientId, title: 'Exact Match', composer: 'Composer A', alternateTitles: [{ title: 'Exact Match' }] }),
          new Work({ clientId, title: 'Different Title', composer: 'Composer B', alternateTitles: [{ title: 'Different Match' }] }),
        ];
        await Work.insertMany(works);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        expect(duplicates[0]).toEqual([works[0]._id.toString(), works[1]._id.toString()]);
      });

      it('should clear existing duplicates', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'A', composer: 'A' }),
          new Work({ clientId, title: 'A', composer: 'A' }),
        ];
        await Work.insertMany(works);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Assert
        expect(Work.updateMany).toHaveBeenCalledWith({ clientId }, { potentialDuplicates: [], potentialDuplicatesCount: 0 });
      });

      it('should build work update operations and save them', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'A', composer: 'A' }),
          new Work({ clientId, title: 'A', composer: 'A' }),
          new Work({ clientId, title: 'B', composer: 'B' }),
          new Work({ clientId, title: 'A', composer: 'A' }),
        ];
        await Work.insertMany(works);
        jest.spyOn(FindDuplicates, 'buildBulkUpdateOperations');
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Arrange
        const expectedOperation = {
          updateOne: {
            filter: { clientId, _id: works[0]._id.toString() },
            update: {
              potentialDuplicates: [{ workId: works[3]._id.toString() }, { workId: works[1]._id.toString() }],
              potentialDuplicatesCount: 2,
            },
          },
        };
        expect(FindDuplicates.buildBulkUpdateOperations.mock.results[0].value[0][0]).toEqual(expectedOperation);
        expect(Work.bulkWrite).toHaveBeenCalledWith([expectedOperation]);
      });

      it('should handle blacklisted duplicates', async () => {
        // Arrange
        const works = [
          new Work({ clientId, title: 'A', composer: 'A', blacklistedDuplicateIds: [] }),
          new Work({ clientId, title: 'A', composer: 'A', blacklistedDuplicateIds: [] }),
          new Work({ clientId, title: 'C', composer: 'C', blacklistedDuplicateIds: [] }),
        ];
        await Work.insertMany(works);
        works[0].blacklistedDuplicateIds = [works[1]._id.toString()];
        await works[0].save();
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        expect(duplicates).toEqual([]);
      });

      it('should notify the user if an email is provided', async () => {
      // Arrange
        const works = [
          new Work({ clientId, title: 'Work With Some Words' }),
          new Work({ clientId, title: 'work with some words' }),
          new Work({ clientId, title: 'Completely Different' }),
        ];
        await Work.insertMany(works);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'work', email });
        // Assert
        expect(Notification.generate).toHaveBeenCalled();
        expect(Notification.generate).toHaveBeenCalledWith(
          'Find Duplicate Works',
          'Catalogue processing complete',
          null,
          expect.objectContaining({
            email,
            identifier: 'genericComplete',
            mainText: expect.any(String),
            subject: 'Find Duplicate Works',
          }),
          expect.any(Function),
        );
      });
    });
  });

  describe('when the catalogue type is "publisher"', () => {
    it('should do nothing if no publishers are found', async () => {
      // Arrange
      jest.spyOn(FindDuplicates, 'getStreamedCatalogue');
      // Act
      await FindDuplicates.findDuplicates({ clientId, type: 'publisher' });
      // Assert
      expect(FindDuplicates.getStreamedCatalogue).toHaveBeenCalledTimes(0);
    });

    it('should do nothing if no duplicates are found', async () => {
      // Arrange
      jest.spyOn(FindDuplicates, 'getStreamedCatalogue').mockResolvedValueOnce(createMockCursor([]));
      jest.spyOn(FindDuplicates, 'buildBulkUpdateOperations');
      // Act
      await FindDuplicates.findDuplicates({ clientId, type: 'publisher' });
      // Assert
      expect(FindDuplicates.buildBulkUpdateOperations).toHaveBeenCalledTimes(0);
    });

    describe('when publishers are found', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest.spyOn(FindDuplicates, 'getDuplicateGroups');
        jest.spyOn(Publisher, 'updateMany').mockResolvedValueOnce();
        jest.spyOn(Publisher, 'bulkWrite').mockResolvedValueOnce();
        jest.spyOn(Notification, 'generate').mockImplementation((name, description, link, options, cb) => cb(null));
      });

      afterEach(async () => {
        await Publisher.deleteMany({ clientId });
      });

      it('should find duplicate publishers based on similar name and caeWithoutLeadingZeros fields', async () => {
        // Arrange
        const publishers = [
          new Publisher({ clientId, name: 'BeatMint Publishing (Cam)', caeWithoutLeadingZeros: '6250100000' }),
          new Publisher({ clientId, name: 'Beat Mint Publishing (Cam)', caeWithoutLeadingZeros: '' }),
          new Publisher({ clientId, name: 'BeatMint Publishing', caeWithoutLeadingZeros: '' }),
        ];
        await Publisher.insertMany(publishers);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'publisher' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        // The first two publishers should be considered potential duplicates due to the similar names
        // The caeWithoutLeadingZeros field is different but has a low weight so the impact is minimal
        const idA = publishers[0]._id.toString();
        const idB = publishers[1]._id.toString();
        const idC = publishers[2]._id.toString();

        const group = duplicates.find((g) => g.includes(idA) && g.includes(idB));
        expect(group).toBeDefined();
        expect(group).not.toContain(idC);
      });

      it('should notify the user if an email is provided', async () => {
        // Arrange
        const publishers = [
          new Publisher({ clientId, name: 'BeatMint Publishing (Cam)', caeWithoutLeadingZeros: '6250100000' }),
          new Publisher({ clientId, name: 'Beat Mint Publishing (Cam)', caeWithoutLeadingZeros: '' }),
          new Publisher({ clientId, name: 'BeatMint Publishing', caeWithoutLeadingZeros: '' }),
        ];
        await Publisher.insertMany(publishers);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'publisher', email });
        // Assert
        expect(Notification.generate).toHaveBeenCalled();
        expect(Notification.generate).toHaveBeenCalledWith(
          'Find Duplicate Publishers',
          'Catalogue processing complete',
          null,
          expect.objectContaining({
            email,
            identifier: 'genericComplete',
            mainText: expect.any(String),
            subject: 'Find Duplicate Publishers',
          }),
          expect.any(Function),
        );
      });
    });
  });

  describe('when the catalogue type is "composer"', () => {
    it('should do nothing if no composers are found', async () => {
      // Arrange
      jest.spyOn(FindDuplicates, 'getStreamedCatalogue');
      // Act
      await FindDuplicates.findDuplicates({ clientId, type: 'composer' });
      // Assert
      expect(FindDuplicates.getStreamedCatalogue).toHaveBeenCalledTimes(0);
    });

    it('should do nothing if no duplicates are found', async () => {
      // Arrange
      jest.spyOn(FindDuplicates, 'getStreamedCatalogue').mockResolvedValueOnce(createMockCursor([]));
      jest.spyOn(FindDuplicates, 'buildBulkUpdateOperations');
      // Act
      await FindDuplicates.findDuplicates({ clientId, type: 'composer' });
      // Assert
      expect(FindDuplicates.buildBulkUpdateOperations).toHaveBeenCalledTimes(0);
    });

    describe('when composers are found', () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest.spyOn(FindDuplicates, 'getDuplicateGroups');
        jest.spyOn(Composer, 'updateMany').mockResolvedValueOnce();
        jest.spyOn(Composer, 'bulkWrite').mockResolvedValueOnce();
        jest.spyOn(Notification, 'generate').mockImplementation((name, description, link, options, cb) => cb(null));
      });

      afterEach(async () => {
        await Composer.deleteMany({ clientId });
      });

      it('should find duplicate composers based on similar name, firstName, surname and caeWithoutLeadingZeros fields', async () => {
        // Arrange
        const composers = [
          new Composer({ clientId, name: 'Composer A', firstName: 'Composer', surname: 'A', caeWithoutLeadingZeros: '1234567890' }),
          new Composer({ clientId, name: 'composer a', firstName: 'composer', surname: 'a', caeWithoutLeadingZeros: '' }),
          new Composer({ clientId, name: 'Composer B', firstName: 'Composer', surname: 'B', caeWithoutLeadingZeros: '' }),
        ];
        await Composer.insertMany(composers);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'composer' });
        // Assert
        const duplicates = await FindDuplicates.getDuplicateGroups.mock.results[0].value;
        expect(duplicates[0]).toEqual([composers[0]._id.toString(), composers[1]._id.toString()]);
      });

      it('should notify the user if an email is provided', async () => {
        // Arrange
        const composers = [
          new Composer({ clientId, name: 'Composer A', firstName: 'Composer', surname: 'A', caeWithoutLeadingZeros: '1234567890' }),
          new Composer({ clientId, name: 'composer a', firstName: 'composer', surname: 'a', caeWithoutLeadingZeros: '' }),
          new Composer({ clientId, name: 'Composer B', firstName: 'Composer', surname: 'B', caeWithoutLeadingZeros: '' }),
        ];
        await Composer.insertMany(composers);
        // Act
        await FindDuplicates.findDuplicates({ clientId, type: 'composer', email });
        // Assert
        expect(Notification.generate).toHaveBeenCalled();
        expect(Notification.generate).toHaveBeenCalledWith(
          'Find Duplicate Composers',
          'Catalogue processing complete',
          null,
          expect.objectContaining({
            email,
            identifier: 'genericComplete',
            mainText: expect.any(String),
            subject: 'Find Duplicate Composers',
          }),
          expect.any(Function),
        );
      });
    });
  });
});
