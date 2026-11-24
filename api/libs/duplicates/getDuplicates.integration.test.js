const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const getDuplicates = require('./getDuplicates');
const Client = require('../../models/client');
const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');

describe('getDuplicates', () => {
  let clientId;

  beforeEach(async () => {
    const client = await new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    clientId = client._id.toString();
  });

  describe('when the type is Composer', () => {
    it('should find nested duplicates when searching by name', async () => {
      const duplicateComposer1 = new Composer({
        clientId,
        name: 'Comp One',
        cae: randomString(),
        mainPro: randomString(),
        mainProIdentifier: randomString(),
      });
      const duplicateComposer2 = new Composer({
        clientId,
        name: 'Comp Two',
        cae: randomString(),
        mainPro: randomString(),
        mainProIdentifier: randomString(),
      });
      await Composer.insertMany([duplicateComposer1, duplicateComposer2]);

      const composer = new Composer({
        clientId,
        name: 'Original Composer',
        potentialDuplicatesCount: 2,
        potentialDuplicates: [
          { composerId: duplicateComposer1._id },
          { composerId: duplicateComposer2._id },
        ],
      });
      await Composer.insertMany([composer]);

      const result = await getDuplicates('composer', clientId, {
        search: 'Comp One',
      });

      expect(result.meta.total).toBe(1);
      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].potentialDuplicates).toEqual([
        {
          composerId: duplicateComposer1._id,
          name: duplicateComposer1.name,
          cae: duplicateComposer1.cae,
          worksCount: 0,
          mainPro: duplicateComposer1.mainPro,
          mainProIdentifier: duplicateComposer1.mainProIdentifier,
        },
        {
          composerId: duplicateComposer2._id,
          name: duplicateComposer2.name,
          cae: duplicateComposer2.cae,
          worksCount: 0,
          mainPro: duplicateComposer2.mainPro,
          mainProIdentifier: duplicateComposer2.mainProIdentifier,
        },
      ]);
    });
  });

  describe('when the type is Publisher', () => {
    it('should find nested duplicates when searching by name', async () => {
      const duplicatePublisher1 = new Publisher({
        clientId,
        name: 'Pub One',
        cae: randomString(),
        mainPro: randomString(),
        mainProIdentifier: randomString(),
      });
      const duplicatePublisher2 = new Publisher({
        clientId,
        name: 'Pub Two',
        cae: randomString(),
        mainPro: randomString(),
        mainProIdentifier: randomString(),
      });
      await Publisher.insertMany([duplicatePublisher1, duplicatePublisher2]);

      const publisher = new Publisher({
        clientId,
        name: 'Original Publisher',
        potentialDuplicatesCount: 2,
        potentialDuplicates: [
          { publisherId: duplicatePublisher1._id },
          { publisherId: duplicatePublisher2._id },
        ],
      });
      await Publisher.insertMany([publisher]);

      const result = await getDuplicates('publisher', clientId, {
        search: 'Pub One',
      });

      expect(result.meta.total).toBe(1);
      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0].potentialDuplicates).toEqual([
        {
          publisherId: duplicatePublisher1._id,
          name: duplicatePublisher1.name,
          cae: duplicatePublisher1.cae,
          worksCount: 0,
          mainPro: duplicatePublisher1.mainPro,
          mainProIdentifier: duplicatePublisher1.mainProIdentifier,
        },
        {
          publisherId: duplicatePublisher2._id,
          name: duplicatePublisher2.name,
          cae: duplicatePublisher2.cae,
          worksCount: 0,
          mainPro: duplicatePublisher2.mainPro,
          mainProIdentifier: duplicatePublisher2.mainProIdentifier,
        },
      ]);
    });
  });
});
