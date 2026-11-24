const {
  logger,
  fileManager,
} = require('@curveroyaltysystems/platform-shared-utils');
const {
  randomString,
  cleanUp,
  randomId,
  randomISWC,
} = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const { promisify } = require('util');
const Client = require('../../models/client');
const Work = require('../../models/work');
const Track = require('../../models/track');
const Release = require('../../models/release');
const { removeInValidExceptions } = require('.');

describe('mappings', function () {
  logger.info('>>>file>>>> libs/mapping .....................');

  describe('removeInValidExceptions', () => {
    let client;
    let clientId;
    let work;
    let release;
    let track;

    beforeEach(async () => {
      client = new Client({
        name: randomString(),
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      });
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

      await Promise.all([track.save(), release.save(), work.save()]);
    });

    afterEach(async () => {
      await promisify(cleanUp)(clientId);
    });

    it("should remove track exception if the ID doesn't exist", async () => {
      const exceptions = await removeInValidExceptions(
        'track',
        client._id.toString(),
        [{ isrc: randomISWC(), title: randomString(), output: randomId() }],
      );

      expect(exceptions).toEqual([]);
    });

    it('should not remove track exception if the ID exist', async () => {
      const exceptionData = [
        {
          isrc: randomISWC(),
          title: randomString(),
          output: track._id.toString(),
        },
      ];

      const exceptions = await removeInValidExceptions(
        'track',
        client._id.toString(),
        exceptionData,
      );

      expect(exceptions).toEqual(exceptionData);
    });

    it("should remove release exception if the ID doesn't exist", async () => {
      const exceptions = await removeInValidExceptions(
        'release',
        client._id.toString(),
        [{ isrc: randomISWC(), title: randomString(), output: randomId() }],
      );

      expect(exceptions).toEqual([]);
    });

    it('should not remove release exception if the ID exist', async () => {
      const exceptionData = [
        {
          isrc: randomISWC(),
          title: randomString(),
          output: release._id.toString(),
        },
      ];

      const exceptions = await removeInValidExceptions(
        'release',
        client._id.toString(),
        exceptionData,
      );

      expect(exceptions).toEqual(exceptionData);
    });

    it("should remove work exception if the ID doesn't exist", async () => {
      const exceptions = await removeInValidExceptions(
        'work',
        client._id.toString(),
        [{ isrc: randomISWC(), title: randomString(), output: randomId() }],
      );

      expect(exceptions).toEqual([]);
    });

    it('should not remove work exception if the ID exist', async () => {
      const exceptionData = [
        {
          isrc: randomISWC(),
          title: randomString(),
          output: work._id.toString(),
        },
      ];

      const exceptions = await removeInValidExceptions(
        'work',
        client._id.toString(),
        exceptionData,
      );

      expect(exceptions).toEqual(exceptionData);
    });
  });
});
