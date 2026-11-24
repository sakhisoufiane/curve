const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const PublisherController = require('./publisher');
const Publisher = require('../../models/publisher');
const Work = require('../../models/work');
const Client = require('../../models/client');
const DeliverySchedule = require('../../models/deliverySchedule');
const CwrDelivery = require('../../models/cwrDelivery');

describe('PublisherController', () => {
  let clientId;
  let client;

  beforeEach(async () => {
    client = await Client.create({
      name: randomString(),
      autoApproveWorks: true,
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    clientId = client._id.toString();
  });

  describe('findAndReplaceExistingPublisherIds', () => {
    it('should update work rights chains with the new Publisher ID', async () => {
      // Arrange
      const publisher1 = await Publisher.create({ clientId, name: 'Publisher 1', cae: randomString() });
      const publisher2 = await Publisher.create({ clientId, name: 'Publisher 2', cae: randomString() });

      // Work using the Publisher to be replaced (Publisher 2)
      const work = await Work.create({
        clientId,
        title: randomString(),
        territories: ['WW'],
        usedPublisherIds: [publisher2._id.toString()],
        rightsChain: [
          {
            territory: 'WW',
            children: [
              {
                publisherId: publisher2._id.toString(),
                type: 'Publisher',
                contractType: 'Original Publisher',
                name: publisher2.name,
                cae: publisher2.cae,
                controlled: true,
                mechanicalOwnership: 50,
                mechanicalCollection: 50,
                performanceOwnership: 50,
                performanceCollection: 50,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics and Music',
                    composerId: randomId(),
                    mechanicalOwnership: 50,
                    mechanicalCollection: 50,
                    performanceOwnership: 50,
                    performanceCollection: 50,
                    controlled: true,
                  },
                ],
              },
            ],
          },
        ],
      });

      // Act
      await PublisherController.findAndReplaceExistingPublisherIds(publisher1, [publisher2._id]);

      // Assert
      const updatedWork = await Work.findById(work._id);
      // References to Publisher 2 should be replaced with Publisher 1
      expect(updatedWork.usedPublisherIds).toEqual([publisher1._id.toString()]);
      expect(updatedWork.rightsChain[0].children[0]).toMatchObject({
        publisherId: publisher1._id.toString(),
        cae: publisher1.cae,
        controlled: true,
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      });
      // Rest of the chain should remain unchanged
      expect(updatedWork.rightsChain[0].children[0].children).toEqual(work.rightsChain[0].children[0].children);
    });

    it('should update work partner rights chains with the new Publisher ID', async () => {
      // Arrange
      const publisher1 = await Publisher.create({ clientId, name: 'Publisher 1', cae: randomString() });
      const publisher2 = await Publisher.create({ clientId, name: 'Publisher 2', cae: randomString() });

      const rightsChain = {
        territory: 'WW',
        children: [
          {
            publisherId: publisher2._id.toString(),
            type: 'Publisher',
            contractType: 'Original Publisher',
            name: publisher2.name,
            cae: publisher2.cae,
            controlled: true,
            mechanicalOwnership: 50,
            mechanicalCollection: 50,
            performanceOwnership: 50,
            performanceCollection: 50,
            children: [
              {
                type: 'Composer',
                contractType: 'Lyrics and Music',
                composerId: randomId(),
                mechanicalOwnership: 50,
                mechanicalCollection: 50,
                performanceOwnership: 50,
                performanceCollection: 50,
                controlled: true,
              },
            ],
          },
        ],
      };

      const partnerRightsChain = {
        deliveryPartnerId: randomId(),
        rightsChain: [
          {
            territory: 'WW',
            children: [
              {
                publisherId: publisher2._id.toString(),
                type: 'Publisher',
                contractType: 'Original Publisher',
                name: publisher2.name,
                cae: publisher2.cae,
                controlled: true,
                mechanicalOwnership: 50,
                mechanicalCollection: 50,
                performanceOwnership: 50,
                performanceCollection: 50,
                publisher: {
                  _id: publisher2._id.toString(),
                  name: publisher2.name,
                },
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics and Music',
                    composerId: randomId(),
                    mechanicalOwnership: 50,
                    mechanicalCollection: 50,
                    performanceOwnership: 50,
                    performanceCollection: 50,
                    controlled: true,
                  },
                ],
              },
            ],
          },
        ],
      };

      // Work using the Publisher to be replaced (Publisher 2)
      const work = await Work.create({
        clientId,
        title: randomString(),
        territories: ['WW'],
        usedPublisherIds: [publisher2._id.toString()],
        rightsChain: [rightsChain],
        partnerRightsChains: [partnerRightsChain],
      });

      // Act
      await PublisherController.findAndReplaceExistingPublisherIds(publisher1, [publisher2._id]);

      // Assert
      const updatedWork = await Work.findById(work._id);
      // References to Publisher 2 should be replaced with Publisher 1
      expect(updatedWork.usedPublisherIds).toEqual([publisher1._id.toString()]);
      expect(updatedWork.partnerRightsChains[0].rightsChain[0].children[0]).toMatchObject({
        publisherId: publisher1._id.toString(),
        cae: publisher1.cae,
        controlled: true,
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      });
    });

    it('should update delivery schedule filters with the new Publisher ID', async () => {
      // Arrange
      const publisher1 = await Publisher.create({ clientId, name: 'Publisher 1', cae: randomString() });
      const publisher2 = await Publisher.create({ clientId, name: 'Publisher 2', cae: randomString() });
      const anotherRandomPublisher = randomId();

      const deliverySchedule = new DeliverySchedule({
        clientId,
        deliveryPartnerId: randomId(),
        filterType: 'custom',
        name: randomString(),
        scheduleDay: 1,
        scheduleType: 'Month',
        filter: {
          publisherIds: [
            anotherRandomPublisher,
            publisher2._id.toString(),
          ],
        },
      });
      await DeliverySchedule.insertMany([deliverySchedule]);

      // Act
      await PublisherController.findAndReplaceExistingPublisherIds(publisher1, [publisher2._id]);

      // Assert
      const updatedSchedule = await DeliverySchedule.findById(deliverySchedule._id);
      // References to Publisher 2 should be replaced with Publisher 1
      expect(updatedSchedule.filter.publisherIds).toEqual([anotherRandomPublisher, publisher1._id.toString()]);
    });

    it('should update cwr delivery filters with the new Publisher ID', async () => {
      // Arrange
      const publisher1 = await Publisher.create({ clientId, name: 'Publisher 1', cae: randomString() });
      const publisher2 = await Publisher.create({ clientId, name: 'Publisher 2', cae: randomString() });
      const anotherRandomPublisher = randomId();

      const cwrDelivery = new CwrDelivery({
        clientId,
        deliveryPartnerId: randomId(),
        filterType: 'custom',
        name: randomString(),
        territory: 'WW',
        filter: {
          publisherIds: [
            anotherRandomPublisher,
            publisher2._id.toString(),
          ],
        },
      });
      await CwrDelivery.insertMany([cwrDelivery]);

      // Act
      await PublisherController.findAndReplaceExistingPublisherIds(publisher1, [publisher2._id]);

      // Assert
      const updatedCwrDelivery = await CwrDelivery.findById(cwrDelivery._id);
      // References to Publisher 2 should be replaced with Publisher 1
      expect(updatedCwrDelivery.filter.publisherIds).toEqual([anotherRandomPublisher, publisher1._id.toString()]);
    });
  });
});
