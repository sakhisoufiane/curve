const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const { CWR, CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');
const Songlist = require('./songlist');
const CwrDelivery = require('../../models/cwrDelivery');
const CsvExports = require('../exports/csv');
const DeliveryPartner = require('../../models/deliveryPartner');
const Work = require('../../models/work');
const Client = require('../../models/client');

const MOCK_MOMENT_DATE = randomString();
jest.mock('moment', () => jest.fn(() => ({ format: jest.fn(() => MOCK_MOMENT_DATE) })));

describe('Songlist', () => {
  describe('saveFileKey', () => {
    it('should save a songlist export file key on a delivery', async () => {
      // Arrange
      const deliveryId = randomId();
      const fileKey = randomString();
      jest.spyOn(CwrDelivery, 'updateOne').mockResolvedValue();
      // Act
      await Songlist.saveFileKey(deliveryId, fileKey);
      // Assert
      expect(CwrDelivery.updateOne).toHaveBeenCalledWith(
        { _id: deliveryId },
        { songlistExportFileKey: fileKey },
      );
    });
  });

  describe('buildFileKey', () => {
    it('should return an S3 file key for the songlist export', () => {
      // Arrange
      const deliveryId = randomId();
      // Act
      const fileKey = Songlist.buildFileKey(deliveryId);
      // Arrange
      expect(fileKey).toEqual(`deliveries/${deliveryId}/Songlist-${MOCK_MOMENT_DATE}.csv`);
    });
  });

  describe('createCsvStream', () => {
    it('should create a csv write stream with , as the decimal separator', async () => {
      // Arrange
      const fileKey = `${randomString()}/${randomString()}.csv`;
      jest.spyOn(CsvExports, 'writeCsvLine').mockReturnValue();

      // Act
      const { csvStream, fileLocation } = Songlist.createCsvStream({ fileKey });

      // Assert
      const outputLocation = `${process.env.APP_ROOT_DIR}/tmp/${fileKey.split('/').pop()}`;
      expect(csvStream.path).toEqual(outputLocation);
      expect(fileLocation).toEqual(outputLocation);
      expect(CsvExports.writeCsvLine).toHaveBeenCalledWith(
        csvStream,
        [],
        { format: null, bom: true },
      );
    });
  });

  describe('writeChildren', () => {
    let cwr;
    let csvStream;

    beforeEach(() => {
      cwr = new CWR({});
      jest.spyOn(CsvExports, 'writeCsvLine').mockReturnValue();
    });

    describe('when the chain has no children', () => {
      it('should do nothing', () => {
        // Arrange
        const chain = {};
        // Act
        Songlist.writeChildren({ cwr, csvStream, chain });
        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(0);
      });
    });

    describe('when the chain item is a Publisher', () => {
      it('should write it to the csv stream', () => {
        // Arrange
        const chain = {
          children: [
            {
              type: 'Publisher',
              publisher: {
                name: randomString(),
                cae: randomInt(),
                societies: [],
              },
              contractType: 'Original Publisher',
              controlled: true,
              mechanicalOwnership: 100,
              performanceOwnership: 100,
              mechanicalCollection: 100,
              performanceCollection: 100,
            },
          ],
        };

        // Act
        Songlist.writeChildren({ cwr, csvStream, chain });

        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(1);
        const [publisher] = chain.children;
        expect(CsvExports.writeCsvLine).toHaveBeenCalledWith(
          csvStream,
          [
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
          ],
        );
      });
    });

    describe('when the chain item is a Composer', () => {
      it('should write it to the csv stream', () => {
        // Arrange
        const chain = {
          children: [
            {
              type: 'Composer',
              name: randomString(),
              caeNumber: randomInt(),
              contractType: 'Lyrics & Music',
              controlled: false,
              mechanicalOwnership: 75.5,
              performanceOwnership: 100,
              mechanicalCollection: 25.5,
              performanceCollection: 100,
            },
          ],
        };

        // Act
        Songlist.writeChildren({ cwr, csvStream, chain });

        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(1);
        const [composer] = chain.children;
        expect(CsvExports.writeCsvLine).toHaveBeenCalledWith(
          csvStream,
          [
            composer.caeNumber,
            composer.name,
            '',
            composer.contractType,
            '',
            'No',
            composer.mechanicalOwnership,
            composer.performanceOwnership,
            composer.mechanicalCollection,
            composer.performanceCollection,
          ],
        );
      });
    });

    describe('when the chain is nested', () => {
      it('should recursively add all items to the csv stream', () => {
        // Arrange
        const chain = {
          children: [
            {
              type: 'Publisher',
              publisher: {
                name: randomString(),
                cae: randomInt(),
                societies: [],
              },
              contractType: 'Original Publisher',
              controlled: true,
              mechanicalOwnership: 100,
              performanceOwnership: 100,
              mechanicalCollection: 100,
              performanceCollection: 100,
              children: [
                {
                  type: 'Publisher',
                  publisher: {
                    name: randomString(),
                    cae: randomInt(),
                    societies: [],
                  },
                  contractType: 'Sub Publisher',
                  controlled: true,
                  mechanicalOwnership: 100,
                  performanceOwnership: 100,
                  mechanicalCollection: 100,
                  performanceCollection: 100,
                  children: [
                    {
                      type: 'Composer',
                      name: randomString(),
                      caeNumber: randomInt(),
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
        };

        // Act
        Songlist.writeChildren({ cwr, csvStream, chain });

        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(3);

        // Original Publisher
        const [publisher1] = chain.children;
        expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(1, csvStream, [
          publisher1.publisher.cae,
          publisher1.publisher.name,
          '',
          publisher1.contractType,
          '',
          'Yes',
          publisher1.mechanicalOwnership,
          publisher1.performanceOwnership,
          publisher1.mechanicalCollection,
          publisher1.performanceCollection,
        ]);

        // Sub Publisher
        const [publisher2] = publisher1.children;
        expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(2, csvStream, [
          publisher2.publisher.cae,
          // The name should be nested slightly as it's a child row
          `  ${publisher2.publisher.name}`,
          '',
          publisher2.contractType,
          '',
          'Yes',
          publisher2.mechanicalOwnership,
          publisher2.performanceOwnership,
          publisher2.mechanicalCollection,
          publisher2.performanceCollection,
        ]);

        // Composer
        const [composer] = publisher2.children;
        expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(3, csvStream, [
          composer.caeNumber,
          // The name should be nested even more as it's a bottom child row
          `    ${composer.name}`,
          '',
          composer.contractType,
          '',
          'Yes',
          composer.mechanicalOwnership,
          composer.performanceOwnership,
          composer.mechanicalCollection,
          composer.performanceCollection,
        ]);
      });

      it('should indent nested names to show the parent <> child relationship', () => {
        // Arrange
        const chain = {
          children: [
            {
              type: 'Publisher',
              publisher: { name: randomString(), cae: randomInt(), societies: [],
              },
              children: [
                {
                  type: 'Publisher',
                  publisher: { name: randomString(), cae: randomInt(), societies: [] },
                  children: [
                    { type: 'Composer', name: randomString(), caeNumber: randomInt() },
                    { type: 'Composer', name: randomString(), caeNumber: randomInt() },
                  ],
                },
              ],
            },
            {
              type: 'Composer',
              name: randomString(),
              caeNumber: randomInt(),
            },
          ],
        };

        // Act
        Songlist.writeChildren({ cwr, csvStream, chain });

        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(5);
        // Names should be indented for each nested child item
        const [item1, item2, item3, item4, item5] = CsvExports.writeCsvLine.mock.calls;
        const [p1, c3] = chain.children;
        expect(item1[1][1]).toEqual(p1.publisher.name); // Level 1
        expect(item5[1][1]).toEqual(c3.name); // Level 1
        const [p2] = p1.children;
        expect(item2[1][1]).toEqual(`  ${p2.publisher.name}`); // Level 2
        const [c1, c2] = p2.children;
        expect(item3[1][1]).toEqual(`    ${c1.name}`); // Level 3
        expect(item4[1][1]).toEqual(`    ${c2.name}`); // Level 3
      });
    });
  });

  describe('writeWorksToFile', () => {
    it('should add titles & columns for each work', () => {
      // Arrange
      const deliveryPartner = new DeliveryPartner({ receivingParty: 'BMI' });
      const works = [
        new Work({ title: randomString() }),
        new Work({ title: randomString() }),
        new Work({ title: randomString() }),
      ];
      const csvStream = null;
      jest.spyOn(CsvExports, 'writeCsvLine').mockReturnValue();

      // Act
      Songlist.writeWorksToFile({ deliveryPartner, works, csvStream });

      // Assert
      expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(4 * works.length);
      // Work Titles
      expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(1, csvStream, ['Title:', works[0].title]);
      expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(5, csvStream, ['Title:', works[1].title]);
      expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(9, csvStream, ['Title:', works[2].title]);
      // Work Columns
      const subCols = ['', '', '', '', '', '', '', 'Ownership', '', 'Collectible'];
      const mainCols = ['', '', '', 'Capacity', '', 'Controlled', '% Mech.', '% Perf.', '% Mech.', '% Perf.'];
      expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(2, csvStream, subCols);
      expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(3, csvStream, mainCols);
    });

    describe('when the territory is a territory group', () => {
      it('should write territories for each work', () => {
        // Arrange
        const deliveryPartner = new DeliveryPartner({ receivingParty: 'BMI' });
        const works = [
          new Work({
            title: randomString(),
            rightsChain: [
              {
                territoryCodes: { name: 'NL,GB,SE' },
                children: [],
              },
            ],
          }),
        ];
        const csvStream = null;
        jest.spyOn(CsvExports, 'writeCsvLine').mockReturnValue();
        jest.spyOn(Songlist, 'writeChildren');

        // Act
        Songlist.writeWorksToFile({ deliveryPartner, works, csvStream });

        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(6 * works.length);
        expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(4, csvStream, ['', 'NL,GB,SE']);
        // It should write the child items for the territory
        expect(Songlist.writeChildren).toHaveBeenCalledWith({
          cwr: expect.any(Object),
          csvStream,
          chain: works[0].rightsChain[0],
        });
      });
    });

    describe('when the territory is a specific territory', () => {
      it('should write territories for each work', () => {
        // Arrange
        const deliveryPartner = new DeliveryPartner({ receivingParty: 'BMI' });
        const works = [
          new Work({
            title: randomString(),
            rightsChain: [
              {
                territory: 'WW',
                children: [],
              },
            ],
          }),
        ];
        const csvStream = null;
        jest.spyOn(CsvExports, 'writeCsvLine').mockReturnValue();
        jest.spyOn(Songlist, 'writeChildren');

        // Act
        Songlist.writeWorksToFile({ deliveryPartner, works, csvStream });

        // Assert
        expect(CsvExports.writeCsvLine).toHaveBeenCalledTimes(6 * works.length);
        expect(CsvExports.writeCsvLine).toHaveBeenNthCalledWith(4, csvStream, ['', 'WW']);
        // It should write the child items for the territory
        expect(Songlist.writeChildren).toHaveBeenCalledWith({
          cwr: expect.any(Object),
          csvStream,
          chain: works[0].rightsChain[0],
        });
      });
    });
  });

  describe('getWorksForDelivery', () => {
    it('should build a query filter and fetch works in the delivery', async () => {
      // Arrange
      const delivery = new CwrDelivery({ territory: 'WW' });
      const deliveryPartner = new DeliveryPartner({});
      const client = new Client({ features: { partnerChains: true } });
      const filter = { _id: { $in: [randomId(), randomId()] } };
      jest.spyOn(CwrDeliveryController, 'buildWorksFilter').mockResolvedValue(filter);
      jest.spyOn(Songlist, 'getWorksWithDeliveryData').mockResolvedValueOnce();

      // Act
      await Songlist.getWorksForDelivery({ delivery, deliveryPartner, client });

      // Assert
      expect(CwrDeliveryController.buildWorksFilter).toHaveBeenCalledTimes(1);
      expect(CwrDeliveryController.buildWorksFilter.mock.calls[0][0].status).toEqual('All');
      expect(CwrDeliveryController.buildWorksFilter.mock.calls[0][0].delivery).toEqual(delivery);
      expect(Songlist.getWorksWithDeliveryData).toHaveBeenCalledTimes(1);
      expect(Songlist.getWorksWithDeliveryData.mock.calls[0][0].delivery).toEqual(delivery);
      expect(Songlist.getWorksWithDeliveryData.mock.calls[0][0].deliveryPartner).toEqual(deliveryPartner);
      expect(Songlist.getWorksWithDeliveryData.mock.calls[0][0].territory).toEqual(['WW']);
      expect(Songlist.getWorksWithDeliveryData.mock.calls[0][0].filter).toEqual(filter);
      expect(Songlist.getWorksWithDeliveryData.mock.calls[0][0].options).toEqual({ partnerChainsEnabled: true });
    });
  });

  describe('getWorksWithDeliveryData', () => {
    describe('when there are < 10k works', () => {
      it('should retrieve delivery data for the works and return them', async () => {
        // Arrange
        const works = [
          new Work({ title: randomString() }),
          new Work({ title: randomString() }),
          new Work({ title: randomString() }),
        ];
        const delivery = new CwrDelivery();
        const deliveryPartner = new DeliveryPartner();
        const territory = ['WW'];
        const filter = { _id: { $in: works.map((w) => w._id) } };
        const partnerChainsEnabled = true;

        jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({ works, territory: ['NL', 'GB', 'SE'] });
        jest.spyOn(Songlist, 'getWorksWithDeliveryData');

        // Act
        const worksWithDeliveryData = await Songlist.getWorksWithDeliveryData({
          delivery,
          deliveryPartner,
          territory,
          filter,
          options: { partnerChainsEnabled },
        });

        // Assert
        expect(Songlist.getWorksWithDeliveryData).toHaveBeenCalledTimes(1);
        expect(worksWithDeliveryData.works).toEqual(works);
        expect(worksWithDeliveryData.territory).toEqual(['NL', 'GB', 'SE']);
      });
    });

    describe('when there are > 10k works', () => {
      it('should process each batch of works and return them all', async () => {
        // Arrange
        const works = [];
        for (let i = 0; i < 10_500; i += 1) {
          works.push(new Work({ title: randomString() }));
        }

        const delivery = new CwrDelivery();
        const deliveryPartner = new DeliveryPartner();
        const territory = ['WW'];
        const filter = { _id: { $in: works.map((w) => w._id) } };
        const partnerChainsEnabled = true;

        jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({ works: works.slice(0, 10_000), territory: ['WW'] });
        jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({ works: works.slice(10_000), territory: ['WW'] });
        jest.spyOn(Songlist, 'getWorksWithDeliveryData');

        // Act
        const worksWithDeliveryData = await Songlist.getWorksWithDeliveryData({
          delivery,
          deliveryPartner,
          territory,
          filter,
          options: { partnerChainsEnabled },
        });

        // Assert
        expect(Songlist.getWorksWithDeliveryData).toHaveBeenCalledTimes(2);
        // Both batches of works should end up combined
        expect(worksWithDeliveryData.works.length).toEqual(10_500);
        expect(worksWithDeliveryData.works).toEqual(works);
        // The last ID of the first batch should be specified when querying the second batch
        expect(Songlist.getWorksWithDeliveryData.mock.calls[1][0].options).toEqual({
          partnerChainsEnabled,
          lastId: works[9999]._id,
        });
      });
    });
  });
});
