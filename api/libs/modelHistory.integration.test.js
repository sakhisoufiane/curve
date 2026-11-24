const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Work = require('../models/work');
const Client = require('../models/client');

describe('modelHistory', () => {
  let client;
  let work;

  beforeEach(async () => {
    client = await new Client({
      name: randomString(),
      issueIdentifier: false,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
      clientType: 'Publisher',
    }).save();

    work = await new Work({
      clientId: client._id,
      title: randomString(),
    }).save();

    // Clear patches created by the initial save
    await Work.Patches.deleteMany({ ref: work._id });
  });

  describe('filterExclusions', () => {
    it('should not create a patch when only excluded fields are modified', async () => {
      work.deliveredTo = [{ deliveryPartnerId: randomId(), deliveredAt: new Date() }];
      work.inFutureDelivery = [randomId()];
      await work.save();

      const patches = await Work.Patches.find({ ref: work._id });
      expect(patches).toHaveLength(0);
    });

    it('should create a patch when non-excluded fields are modified', async () => {
      work.title = randomString();
      await work.save();

      const patches = await Work.Patches.find({ ref: work._id });
      expect(patches.length).toBeGreaterThan(0);
    });

    it('should create a patch when excluded and non-excluded fields are modified together', async () => {
      work.title = randomString();
      work.deliveredTo = [{ deliveryPartnerId: randomId(), deliveredAt: new Date() }];
      await work.save();

      const patches = await Work.Patches.find({ ref: work._id });
      expect(patches.length).toBeGreaterThan(0);

      const ops = patches.flatMap((patch) => patch.ops);
      const hasExcludedOps = ops.some((op) => op.path.startsWith('/deliveredTo') || op.path.startsWith('/inFutureDelivery'));
      expect(hasExcludedOps).toBe(false);
    });
  });
});
