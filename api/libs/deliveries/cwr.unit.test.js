const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const CwrDelivery = require('./cwr');
const CwrDeliveryModel = require('../../models/cwrDelivery');
const DeliveryPartner = require('../../models/deliveryPartner');
const Work = require('../../models/work');
const TerritoryGroup = require('../../models/territoryGroup');
const Track = require('../../models/track');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const Release = require('../../models/release');

describe('cwr', () => {
  describe('createCWRDeliveryWork', () => {
    let cwr;
    let filter;
    let delivery;
    let deliveryPartner;
    let territory;
    let options;

    beforeEach(() => {
      cwr = {
        output: [],
        addWorks: jest.fn().mockImplementation((works, rev, territory, cb) => cb()),
      };
      filter = {};
      delivery = new CwrDeliveryModel();
      deliveryPartner = new DeliveryPartner();
      territory = 'WW';
      options = null;

      jest.spyOn(CwrDelivery, 'createCWRDeliveryWork');
    });

    it('should fetch works and add them to a CWR instance', async () => {
      // Arrange
      const works = [
        new Work({ title: randomString() }),
        new Work({ title: randomString() }),
        new Work({ title: randomString() }),
      ];
      jest.spyOn(Work, 'find').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(works.map((w) => ({ _id: w._id }))),
      });
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({
        works,
        territory: [territory],
      });

      // Act
      await CwrDelivery.createCWRDeliveryWork({
        cwr,
        filter,
        delivery,
        deliveryPartner,
        territory,
        options,
      });

      // Assert
      expect(CwrDelivery.createCWRDeliveryWork).toHaveBeenCalledTimes(1);
      expect(cwr.addWorks).toHaveBeenCalledWith(works, 'REV', [territory], expect.any(Function));
    });

    it('should pass required models into CwrDeliveryController', async () => {
      // Arrange
      const works = [new Work({ title: randomString() })];
      jest.spyOn(Work, 'find').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(works.map((w) => ({ _id: w._id }))),
      });
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({
        works,
        territory: [territory],
      });

      // Act
      await CwrDelivery.createCWRDeliveryWork({
        cwr,
        filter,
        delivery,
        deliveryPartner,
        territory,
        options,
      });

      // Assert
      expect(CwrDeliveryController.getWorksForDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          TerritoryGroup,
          Work,
          Track,
          Publisher,
          Composer,
          Release,
        }),
      );
    });

    describe('>10k works in the delivery', () => {
      it('should recursively add all works in batches', async () => {
        // Arrange
        const works = [];
        for (let i = 0; i < 10_500; i += 1) {
          works.push(new Work({ title: randomString() }));
        }
        jest.spyOn(Work, 'find').mockReturnValue({
          select: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(works.map((w) => ({ _id: w._id }))),
        });
        jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({
          works: works.slice(0, 10_000),
          territory: [territory],
        });
        jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({
          works: works.slice(10_000),
          territory: [territory],
        });

        // Act
        await CwrDelivery.createCWRDeliveryWork({
          cwr,
          filter,
          delivery,
          deliveryPartner,
          territory,
          options,
        });

        // Assert
        // Batch 1 - 10k
        expect(cwr.addWorks).toHaveBeenNthCalledWith(1, works.slice(0, 10_000), 'REV', [territory], expect.any(Function));
        // Batch 2 - remaining 500
        expect(cwr.addWorks).toHaveBeenNthCalledWith(2, works.slice(10_000), 'REV', [territory], expect.any(Function));
      });
    });
  });
});
