const { randomString, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const CwrDelivery = require('../../../models/cwrDelivery');
const Client = require('../../../models/client');
const Work = require('../../../models/work');
const Delivery = require('./delivery');
const DeliveryPartner = require('../../../models/deliveryPartner');
const DeliveredWork = require('../../../models/deliveredWork');
const DeliveryLog = require('../../../models/deliveryLog');

describe('markWorksAsDelivered', () => {
  let client;
  let works;
  let deliveryPartner;
  let delivery;

  beforeEach(async () => {
    client = new Client({ name: randomString() });
    await client.save();

    works = [
      new Work({ clientId: client._id.toString(), title: randomString(), valid: true }),
      new Work({ clientId: client._id.toString(), title: randomString(), valid: true }),
      new Work({ clientId: client._id.toString(), title: randomString(), valid: true }),
    ];
    await Work.insertMany(works);

    deliveryPartner = new DeliveryPartner({
      clientId: client._id.toString(),
      name: randomString(),
      receivingParty: randomString(),
    });
    await deliveryPartner.save();

    delivery = new CwrDelivery({
      clientId: client._id,
      workIds: works.map((work) => work._id.toString()),
      deliveryPartnerId: deliveryPartner._id.toString(),
      territory: 'WW',
    });
    await delivery.save();
  });

  describe('when the works have not been delivered before', () => {
    it('should mark works in a delivery as delivered and log them', async () => {
      // Act
      await Delivery.markWorksAsDelivered({ logKey: randomString(), delivery });

      // Assert

      // Check the updated Delivery
      const updatedDelivery = await CwrDelivery.findById(delivery._id);
      expect(updatedDelivery.workIds.sort()).toEqual(works.map((w) => w._id.toString()).sort());
      expect(updatedDelivery.fromScheduledDelivery).toEqual(false);
      // This function isn't responsible for updating the status, so it should remain unchanged
      expect(updatedDelivery.status).toEqual('Pending');

      // Delivered Works entries should have been created
      const deliveredWorks = await DeliveredWork.find({
        clientId: client._id.toString(),
        deliveryPartnerId: deliveryPartner._id,
      });
      expect(deliveredWorks).toHaveLength(works.length);
      for (const work of works) {
        const deliveredWork = deliveredWorks.find((dw) => dw.workId.toString() === work._id.toString());
        expect(deliveredWork).toBeDefined();
        expect(deliveredWork).toMatchObject({
          clientId: client._id.toString(),
          workId: work._id,
          deliveryPartnerId: deliveryPartner._id,
          cwrDeliveryId: delivery._id,
          receivingParty: deliveryPartner.receivingParty,
          status: 'Delivered',
          deliveryDate: expect.any(Date),
          messages: [],
        });
      }

      // Check the Delivery logs were created
      const logs = await DeliveryLog.find({ clientId: client._id.toString(), deliveryPartnerId: deliveryPartner._id });
      expect(logs).toHaveLength(3);
      for (const work of works) {
        const log = logs.find((l) => l.workId.toString() === work._id.toString());
        const deliveredWork = deliveredWorks.find((dw) => dw.workId.toString() === work._id.toString());
        expect(log).toBeDefined();
        expect(log).toMatchObject({
          clientId: client._id.toString(),
          workId: work._id,
          deliveryPartnerId: deliveryPartner._id,
          log: [
            expect.objectContaining({
              deliveredWorkId: deliveredWork._id,
              cwrDeliveryId: delivery._id,
              messages: [],
              status: 'Delivered',
              action: 'Delivery',
              date: expect.any(Date),
            }),
          ],
        });
      }

      // Check the Works now reference the Delivery
      const updatedWorks = await Work
        .find({ _id: { $in: works.map((w) => w._id) } })
        .select({ deliveredTo: 1, forceRedelivery: 1 })
        .lean();
      for (const updatedWork of updatedWorks) {
        expect(updatedWork.deliveredTo).toEqual([
          expect.objectContaining({ deliveryPartnerId: deliveryPartner._id, deliveredAt: expect.any(Date) }),
        ]);
      }
    });

    describe('when sub-partners exist for the Delivery Partner', () => {
      it('should create DeliveredWork entries for each sub-partner', async () => {
        // Arrange
        const subPartner = new DeliveryPartner({
          clientId: client._id.toString(),
          name: randomString(),
          receivingParty: randomString(),
        });
        await subPartner.save();

        deliveryPartner.subPartners.push({ _id: subPartner._id.toString(), partner: { _id: subPartner._id.toString() } });
        await deliveryPartner.save();

        // Act
        await Delivery.markWorksAsDelivered({ logKey: randomString(), delivery });

        // Assert

        // Delivered Works should have been created for both Partners
        const deliveredWorks = await DeliveredWork.find({
          clientId: client._id.toString(),
          deliveryPartnerId: { $in: [deliveryPartner._id, subPartner._id] },
        });
        expect(deliveredWorks).toHaveLength(works.length * 2);

        // Delivered Logs should have been created for both Partners
        const logs = await DeliveryLog.find({
          clientId: client._id.toString(),
          deliveryPartnerId: { $in: [deliveryPartner._id, subPartner._id] },
        });
        expect(logs).toHaveLength(works.length * 2);

        // Works should reference Deliveries for both Partners
        const updatedWorks = await Work
          .find({ _id: { $in: works.map((w) => w._id) } })
          .select({ deliveredTo: 1, forceRedelivery: 1 })
          .lean();
        for (const updatedWork of updatedWorks) {
          expect(updatedWork.deliveredTo).toEqual([
            expect.objectContaining({ deliveryPartnerId: deliveryPartner._id, deliveredAt: expect.any(Date) }),
            expect.objectContaining({ deliveryPartnerId: subPartner._id, deliveredAt: expect.any(Date) }),
          ]);
        }
      });
    });
  });

  describe('when the works have been delivered before', () => {
    it('should update the existing DeliveredWork entries and logs', async () => {
      // Arrange
      delivery.status = 'Delivered';
      await delivery.save();

      const existingDeliveredWorks = works.map((work) => new DeliveredWork({
        clientId: client._id.toString(),
        workId: work._id,
        deliveryPartnerId: deliveryPartner._id,
        cwrDeliveryId: delivery._id,
        receivingParty: deliveryPartner.receivingParty,
        status: 'Delivered',
        deliveryDate: randomDate(),
      }));
      await DeliveredWork.insertMany(existingDeliveredWorks);

      const existingLogs = works.map((work) => new DeliveryLog({
        clientId: client._id.toString(),
        workId: work._id,
        deliveryPartnerId: deliveryPartner._id,
        log: [{
          deliveredWorkId: existingDeliveredWorks.find((dw) => dw.workId.toString() === work._id.toString())._id,
          cwrDeliveryId: delivery._id,
          messages: [],
          status: 'Delivered',
          action: 'Delivery',
          date: randomDate(),
        }],
      }));
      await DeliveryLog.insertMany(existingLogs);

      // Act
      await Delivery.markWorksAsDelivered({ logKey: randomString(), delivery });

      // Assert
      // Check the updated Delivery
      const updatedDelivery = await CwrDelivery.findById(delivery._id);
      expect(updatedDelivery.workIds.sort()).toEqual(works.map((w) => w._id.toString()).sort());
      expect(updatedDelivery.fromScheduledDelivery).toEqual(false);
      // This function isn't responsible for updating the status, so it should remain unchanged
      expect(updatedDelivery.status).toEqual('Delivered');

      // Delivered Works entries should have been updated, not created again
      const deliveredWorks = await DeliveredWork.find({
        clientId: client._id.toString(),
        deliveryPartnerId: deliveryPartner._id,
      });
      expect(deliveredWorks).toHaveLength(works.length);
      for (const work of works) {
        const deliveredWork = deliveredWorks.find((dw) => dw.workId.toString() === work._id.toString());
        expect(deliveredWork).toBeDefined();
        expect(deliveredWork).toMatchObject({
          clientId: client._id.toString(),
          workId: work._id,
          deliveryPartnerId: deliveryPartner._id,
          cwrDeliveryId: delivery._id,
          receivingParty: deliveryPartner.receivingParty,
          status: 'Delivered',
          deliveryDate: expect.any(Date),
          messages: [],
        });
      }

      // Check the Delivery logs were updated and not created again
      const logs = await DeliveryLog.find({ clientId: client._id.toString(), deliveryPartnerId: deliveryPartner._id }).lean();
      expect(logs).toHaveLength(3);
      for (const work of works) {
        const log = logs.find((l) => l.workId.toString() === work._id.toString());
        const deliveredWork = deliveredWorks.find((dw) => dw.workId.toString() === work._id.toString());
        expect(log).toBeDefined();
        expect(log).toMatchObject({
          clientId: client._id.toString(),
          workId: work._id,
          deliveryPartnerId: deliveryPartner._id,
          log: [
            expect.objectContaining({
              deliveredWorkId: deliveredWork._id,
              cwrDeliveryId: delivery._id,
              messages: [],
              status: 'Delivered',
              action: 'Delivery',
              date: expect.any(Date),
            }),
            expect.objectContaining({
              deliveredWorkId: deliveredWork._id,
              cwrDeliveryId: delivery._id,
              messages: [],
              status: 'Delivered',
              action: 'Delivery',
              date: expect.any(Date),
            }),
          ],
        });
      }

      // Check the Works now reference the Delivery
      const updatedWorks = await Work
        .find({ _id: { $in: works.map((w) => w._id) } })
        .select({ deliveredTo: 1, forceRedelivery: 1 })
        .lean();
      for (const updatedWork of updatedWorks) {
        expect(updatedWork.deliveredTo).toEqual([
          expect.objectContaining({ deliveryPartnerId: deliveryPartner._id, deliveredAt: expect.any(Date) }),
        ]);
      }
    });
  });
});
