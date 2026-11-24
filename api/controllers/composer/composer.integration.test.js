const fs = require('fs');
const { randomId, randomString, cleanUpAsync } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const ComposerController = require('./composer');
const Composer = require('../../models/composer');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Publisher = require('../../models/publisher/publisher');
const Work = require('../../models/work');
const DeliverySchedule = require('../../models/deliverySchedule');
const CwrDelivery = require('../../models/cwrDelivery');

describe('ComposerController', () => {
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

  afterEach(async () => {
    await cleanUpAsync(clientId);
  });

  describe('findAndReplaceExistingComposerIds', () => {
    it('should update work rights chains with the new Composer ID', async () => {
      // Arrange
      const composer1 = await Composer.create({ clientId, name: 'Composer 1', cae: randomString() });
      const composer2 = await Composer.create({ clientId, name: 'Composer 2', cae: randomString() });

      // Work using the Composer to be replaced (Composer 2)
      const work = await Work.create({
        clientId,
        title: randomString(),
        territories: ['WW'],
        usedPublisherIds: [randomId()],
        usedComposerIds: [composer2._id.toString()],
        rightsChain: [
          {
            territory: 'WW',
            children: [
              {
                publisherId: randomId(),
                type: 'Publisher',
                contractType: 'Original Publisher',
                name: randomString(),
                cae: randomString(),
                controlled: true,
                mechanicalOwnership: 50,
                mechanicalCollection: 50,
                performanceOwnership: 50,
                performanceCollection: 50,
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics and Music',
                    composerId: composer2._id.toString(),
                    cae: composer2.cae,
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
      await ComposerController.findAndReplaceExistingComposerIds(composer1, [composer2._id]);

      // Assert
      const updatedWork = await Work.findById(work._id);
      // References to Composer 2 should be replaced with Composer 1
      expect(updatedWork.usedComposerIds).toEqual([composer1._id.toString()]);
      expect(updatedWork.rightsChain[0].children[0].children[0]).toMatchObject({
        composerId: composer1._id.toString(),
        cae: composer1.cae,
        controlled: true,
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
      });
      // Rest of the chain should remain unchanged
      expect(updatedWork.rightsChain[0].children[0].publisherId).toEqual(work.rightsChain[0].children[0].publisherId);
      expect(updatedWork.rightsChain[0].children[0].name).toEqual(work.rightsChain[0].children[0].name);
      expect(updatedWork.rightsChain[0].children[0].cae).toEqual(work.rightsChain[0].children[0].cae);
    });

    it('should update work partner rights chains with the new Publisher ID', async () => {
      // Arrange
      const composer1 = await Composer.create({ clientId, name: 'Composer 1', cae: randomString() });
      const composer2 = await Composer.create({ clientId, name: 'Composer 2', cae: randomString() });

      const rightsChain = {
        territory: 'WW',
        children: [
          {
            publisherId: randomId(),
            type: 'Publisher',
            contractType: 'Original Publisher',
            name: randomString(),
            cae: randomString(),
            controlled: true,
            mechanicalOwnership: 50,
            mechanicalCollection: 50,
            performanceOwnership: 50,
            performanceCollection: 50,
            children: [
              {
                type: 'Composer',
                contractType: 'Lyrics and Music',
                composerId: composer2._id.toString(),
                name: composer2.name,
                cae: composer2.cae,
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
          { territory: 'WW',
            children: [
              {
                publisherId: randomId(),
                type: 'Publisher',
                contractType: 'Original Publisher',
                name: randomString(),
                cae: randomString(),
                controlled: true,
                mechanicalOwnership: 50,
                mechanicalCollection: 50,
                performanceOwnership: 50,
                performanceCollection: 50,
                publisher: {
                  _id: randomId(),
                  name: randomString(),
                },
                children: [
                  {
                    type: 'Composer',
                    contractType: 'Lyrics and Music',
                    composerId: composer2._id.toString(),
                    name: composer2.name,
                    cae: composer2.cae,
                    mechanicalOwnership: 50,
                    mechanicalCollection: 50,
                    performanceOwnership: 50,
                    performanceCollection: 50,
                    controlled: true,
                    composer: {
                      _id: composer2._id.toString(),
                      name: composer2.name,
                    },
                  },
                ],
              },
            ] },
        ],
      };

      // Work using the Publisher to be replaced (Publisher 2)
      const work = await Work.create({
        clientId,
        title: randomString(),
        territories: ['WW'],
        usedPublisherIds: [randomId()],
        usedComposerIds: [composer2._id.toString()],
        rightsChain: [rightsChain],
        partnerRightsChains: [partnerRightsChain],
      });

      // Act
      await ComposerController.findAndReplaceExistingComposerIds(composer1, [composer2._id]);

      // Assert
      const updatedWork = await Work.findById(work._id);
      // References to Composer 2 should be replaced with Composer 1
      expect(updatedWork.usedComposerIds).toEqual([composer1._id.toString()]);
      expect(updatedWork.partnerRightsChains[0].rightsChain[0].children[0].children[0]).toMatchObject({
        composerId: composer1._id.toString(),
        cae: composer1.cae,
        controlled: true,
        mechanicalOwnership: 50,
        mechanicalCollection: 50,
        performanceOwnership: 50,
        performanceCollection: 50,
        composer: {
          _id: composer1._id.toString(),
          name: composer1.name,
        },
      });
    });

    it('should update delivery schedule filters with the new Composer ID', async () => {
      // Arrange
      const composer1 = await Composer.create({ clientId, name: 'Composer 1', cae: randomString() });
      const composer2 = await Composer.create({ clientId, name: 'Composer 2', cae: randomString() });
      const anotherRandomComposer = randomId();

      const deliverySchedule = new DeliverySchedule({
        clientId,
        deliveryPartnerId: randomId(),
        filterType: 'custom',
        name: randomString(),
        scheduleDay: 1,
        scheduleType: 'Month',
        filter: {
          composerIds: [
            anotherRandomComposer,
            composer2._id.toString(),
          ],
        },
      });
      await DeliverySchedule.insertMany([deliverySchedule]);

      // Act
      await ComposerController.findAndReplaceExistingComposerIds(composer1, [composer2._id]);

      // Assert
      const updatedSchedule = await DeliverySchedule.findById(deliverySchedule._id);
      // References to Composer 2 should be replaced with Composer 1
      expect(updatedSchedule.filter.composerIds).toEqual([anotherRandomComposer, composer1._id.toString()]);
    });

    it('should update cwr delivery filters with the new Composer ID', async () => {
      // Arrange
      const composer1 = await Composer.create({ clientId, name: 'Composer 1', cae: randomString() });
      const composer2 = await Composer.create({ clientId, name: 'Composer 2', cae: randomString() });
      const anotherRandomComposer = randomId();

      const cwrDelivery = new CwrDelivery({
        clientId,
        deliveryPartnerId: randomId(),
        filterType: 'custom',
        name: randomString(),
        territory: 'WW',
        filter: {
          composerIds: [
            anotherRandomComposer,
            composer2._id.toString(),
          ],
        },
      });
      await CwrDelivery.insertMany([cwrDelivery]);

      // Act
      await ComposerController.findAndReplaceExistingComposerIds(composer1, [composer2._id]);

      // Assert
      const updatedCwrDelivery = await CwrDelivery.findById(cwrDelivery._id);
      // References to Composer 2 should be replaced with Composer 1
      expect(updatedCwrDelivery.filter.composerIds).toEqual([anotherRandomComposer, composer1._id.toString()]);
    });
  });

  describe('createExportCsv', () => {
    const runExport = (filter, count, clientType = 'Mechanical') => new Promise((resolve, reject) => {
      ComposerController.createExportCsv(filter, count, clientId, clientType, (err, filePath) => {
        if (err) reject(new Error(err));
        else resolve(filePath);
      });
    });

    it('should return a zip file path for a basic export', async () => {
      await Composer.create({ clientId, name: randomString(), cae: randomString() });

      const filePath = await runExport({ clientId }, 1);

      expect(filePath).toMatch(/\.zip$/);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should process multiple composers and return a zip file', async () => {
      await Promise.all([
        Composer.create({ clientId, name: randomString(), cae: randomString(), interestedPartyId: randomId() }),
        Composer.create({ clientId, name: randomString(), cae: randomString(), interestedPartyId: randomId() }),
        Composer.create({ clientId, name: randomString(), cae: randomString(), interestedPartyId: randomId() }),
      ]);

      const filePath = await runExport({ clientId }, 3);

      expect(filePath).toMatch(/\.zip$/);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should process composers with linked contracts', async () => {
      const contract = await Contract.create({ clientId, name: randomString() });
      await Composer.create({
        clientId,
        name: randomString(),
        cae: randomString(),
        linkedContracts: [{ contractId: contract._id }],
      });

      const filePath = await runExport({ clientId }, 1);

      expect(filePath).toMatch(/\.zip$/);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should process composers with society identifiers', async () => {
      await Composer.create({
        clientId,
        name: randomString(),
        cae: randomString(),
        societies: [
          { society: 'ASCAP', identifier: 'ASCAP-001' },
          { society: 'BMI', identifier: 'BMI-002' },
        ],
      });

      const filePath = await runExport({ clientId }, 1);

      expect(filePath).toMatch(/\.zip$/);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should process composers with publisher agreements', async () => {
      const publisher = await Publisher.create({ clientId, name: randomString(), cae: randomString() });
      await Composer.create({
        clientId,
        name: randomString(),
        cae: randomString(),
        publisherAgreements: [{
          publisherId: publisher._id.toString(),
          agreementType: 'License',
          territory: 'WW',
          society: 'ASCAP',
          agreementNo: 'AGR001',
        }],
      });

      const filePath = await runExport({ clientId }, 1);

      expect(filePath).toMatch(/\.zip$/);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should handle multiple pagination rounds when count exceeds the 1000-per-round limit', async () => {
      await Composer.create({ clientId, name: randomString(), cae: randomString() });

      // count=2000 forces 2 rounds; the second round returns no results
      const filePath = await runExport({ clientId }, 2000);

      expect(filePath).toMatch(/\.zip$/);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
