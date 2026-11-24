const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomInt, randomId, cleanUp } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const fs = require('fs');

const Client = require('../../models/client');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliveryPartner = require('../../models/deliveryPartner');
const Work = require('../../models/work');
const Songlist = require('./songlist');
const ExportNotification = require('../exportNotification/exportNotification');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');

const MOCK_MOMENT_DATE = randomString();
jest.mock('moment', () => jest.fn(() => ({ format: jest.fn(() => MOCK_MOMENT_DATE) })));

describe('Songlist', () => {
  describe('createSonglist', () => {
    let client;
    let deliveryId;
    let email;
    let clientId;
    let works;
    let delivery;
    let fileKey;
    let publicUrl;

    beforeEach(async () => {
      client = new Client({
        name: randomString(),
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      });
      await client.save();
      clientId = client._id.toString();

      const deliveryPartner = new DeliveryPartner({ clientId });
      await deliveryPartner.save();
      const deliveryPartnerId = deliveryPartner._id.toString();

      works = [];
      const publishers = [];
      const composers = [];
      for (let i = 0; i < 3; i += 1) {
        const publisher = new Publisher({
          clientId,
          name: randomString(),
          cae: randomInt(),
        });
        publishers.push(publisher);

        const composer = new Composer({
          clientId,
          name: randomString(),
          cae: randomInt(),
        });
        composers.push(composer);

        works.push(new Work({
          title: randomString(),
          clientId,
          rightsChain: [
            {
              territory: 'specific',
              territoryCodes: {
                name: 'NL,GB,SE',
                codes: ['NL', 'GB', 'SE'],
              },
              children: [
                {
                  type: 'Publisher',
                  publisherId: publisher._id.toString(),
                  publisher,
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 100,
                  performanceOwnership: 100,
                  mechanicalCollection: 100,
                  performanceCollection: 100,
                  children: [
                    {
                      type: 'Composer',
                      composerId: composer._id.toString(),
                      composer,
                      name: composer.name,
                      caeNumber: composer.cae,
                      contractType: 'Lyrics & Music',
                      controlled: true,
                      mechanicalOwnership: 100,
                      performanceOwnership: 100,
                      mechanicalCollection: 100,
                      performanceCollection: 100,
                    },
                  ],
                },
              ],
            },
          ],
          valid: true,
        }));
      }
      await Publisher.bulkSave(publishers);
      await Composer.bulkSave(composers);
      await Work.bulkSave(works);

      const territory = 'WW';
      delivery = new CwrDelivery({
        clientId,
        deliveryPartnerId,
        name: randomString(),
        outputFormat: 'CWR',
        workIds: works.map((work) => work._id.toString()),
        territory,
      });
      await delivery.save();

      deliveryId = delivery._id.toString();
      email = randomString();

      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, path, cb) => cb());
      fileKey = `deliveries/${deliveryId}/Songlist-${MOCK_MOMENT_DATE}.csv`;
      publicUrl = randomString();
      jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => cb(null, publicUrl));
      jest.spyOn(ExportNotification, 'sendSonglistExportNotification').mockResolvedValue();
    });

    afterEach((done) => {
      cleanUp(clientId, done);
    });

    it('should export a CWR delivery in Songlist format', async () => {
      // Act
      await Songlist.createSongList({ deliveryId, email });

      // Assert
      const file = fs.readFileSync(`${process.env.APP_ROOT_DIR}/tmp/Songlist-${MOCK_MOMENT_DATE}.csv`, 'utf8');
      expect(file).toBeDefined();
      const lines = file.split('\n');

      // Work titles
      const titleLines = lines.filter((line) => line.includes('Title:'));
      expect(titleLines.length).toEqual(works.length);

      // Territory
      const territory = works[0].rightsChain[0].territoryCodes.name;
      const territoryLines = lines.filter((line) => line.includes(territory));
      expect(territoryLines.length).toEqual(works.length);

      // Publishers
      const publisherLines = lines.filter((line) => line.includes('Publisher'));
      expect(publisherLines.length).toEqual(works.length);

      // Composers
      const composerLines = lines.filter((line) => line.includes('Lyrics & Music'));
      expect(composerLines.length).toEqual(works.length);

      works.forEach((work, index) => {
        const { title, rightsChain } = work;
        const [territory] = rightsChain;
        const [publisher] = territory.children;
        const [composer] = publisher.children;

        expect(titleLines[index]).toEqual(`Title:,${title}`);
        expect(territoryLines[index]).toEqual(`,"${territory.territoryCodes.name}"`);

        // Publishers
        expect(publisherLines[index]).toEqual([
          publisher.publisher.cae,
          publisher.publisher.name,
          '',
          publisher.contractType,
          '',
          'Yes',
          publisher.mechanicalOwnership,
          publisher.performanceOwnership,
          publisher.mechanicalCollection,
          publisher.performanceCollection,
        ].join(','));

        // Composers
        expect(composerLines[index]).toEqual([
          composer.caeNumber,
          // Name should be nested as it's a child
          `  ${composer.name}`,
          '',
          composer.contractType,
          '',
          'Yes',
          composer.mechanicalOwnership,
          composer.performanceOwnership,
          composer.mechanicalCollection,
          composer.performanceCollection,
        ].join(','));
      });

      // Check the S3 file key has been saved on the Delivery
      const deliveryFromDb = await CwrDelivery.findById(deliveryId, { songlistExportFileKey: 1 }).lean();
      expect(deliveryFromDb.songlistExportFileKey).toEqual(fileKey);
    });

    it('should send a download notification to the user', async () => {
      // Act
      await Songlist.createSongList({ deliveryId, email });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalled();
      expect(fileManager.uploadToS3).toHaveBeenCalledWith(
        fileKey,
        `${process.env.APP_ROOT_DIR}/tmp/${fileKey.split('/').pop()}`,
        expect.any(Function),
      );

      expect(fileManager.publicLink24Hours).toHaveBeenCalled();
      expect(fileManager.publicLink24Hours).toHaveBeenCalledWith(fileKey, expect.any(Function));

      expect(ExportNotification.sendSonglistExportNotification).toHaveBeenCalled();
      expect(ExportNotification.sendSonglistExportNotification.mock.calls[0][0].deliveryName).toEqual(delivery.name);
      expect(ExportNotification.sendSonglistExportNotification.mock.calls[0][0].email).toEqual(email);
      expect(ExportNotification.sendSonglistExportNotification.mock.calls[0][0].url).toEqual(publicUrl);
    });

    describe('when the delivery does not exist', () => {
      it('should throw an error', async () => {
        // Arrange
        expect.assertions(2);
        const id = randomId();
        // Act
        try {
          await Songlist.createSongList({ deliveryId: id, email });
        } catch (err) {
          // Assert
          expect(err).toBeDefined();
          expect(err.message).toMatch(`No Delivery found with ID: ${id}`);
        }
      });
    });

    describe('when the delivery is not CWR format', () => {
      it('should throw an error', async () => {
        // Arrange
        expect.assertions(2);
        delivery.outputFormat = 'Catalogue Shipment';
        await delivery.save();
        // Act
        try {
          await Songlist.createSongList({ deliveryId, email });
        } catch (err) {
          // Assert
          expect(err).toBeDefined();
          expect(err.message).toMatch('Songlist export can only be for deliveries of format "CWR"');
        }
      });
    });

    describe('when the delivery has no works', () => {
      it.only('should throw an error', async () => {
        // Arrange
        expect.assertions(2);
        delivery.workIds = [];
        await delivery.save();
        // Act
        try {
          await Songlist.createSongList({ deliveryId, email });
        } catch (err) {
          // Assert
          expect(err).toBeDefined();
          expect(err.message).toMatch('No works found in delivery to export');
        }
      });
    });

    describe('when fetching delivery data fails', () => {
      it('should handle the error', async () => {
        // Arrange
        expect.assertions(2);
        jest.spyOn(Songlist, 'getWorksForDelivery').mockRejectedValueOnce(new Error('FakeError'));
        // Act
        try {
          await Songlist.createSongList({ deliveryId, email });
        } catch (err) {
          // Assert
          expect(err).toBeDefined();
          expect(err.message).toMatch('FakeError');
        }
      });
    });

    describe('when writing the works to the file fails', () => {
      it('should handle the error', async () => {
        // Arrange
        expect.assertions(2);
        jest.spyOn(Songlist, 'writeWorksToFile').mockImplementationOnce(() => {
          throw new Error('FakeError');
        });
        // Act
        try {
          await Songlist.createSongList({ deliveryId, email });
        } catch (err) {
          // Assert
          expect(err).toBeDefined();
          expect(err.message).toMatch('FakeError');
        }
      });
    });
  });
});
