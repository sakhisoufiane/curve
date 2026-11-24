const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const LibDelivery = require('./library');
const CwrDeliveryModel = require('../../models/cwrDelivery');
const DeliveryPartner = require('../../models/deliveryPartner');
const Work = require('../../models/work');
const TerritoryGroup = require('../../models/territoryGroup');
const Track = require('../../models/track');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const Release = require('../../models/release');

describe('library', () => {
  describe('createLibDeliveryWork', () => {
    let lib;
    let filter;
    let delivery;
    let deliveryPartner;
    let territory;
    let options;

    beforeEach(() => {
      lib = {
        createData: jest.fn().mockImplementation(({ works, territory }, cb) => cb()),
      };
      filter = {};
      delivery = new CwrDeliveryModel();
      deliveryPartner = new DeliveryPartner();
      territory = 'WW';
      options = null;

      jest.spyOn(LibDelivery, 'createLibDeliveryWork');
    });

    it('should fetch works and add them to a CWR instance', async () => {
      // Arrange
      const works = [
        new Work({ title: randomString() }),
        new Work({ title: randomString() }),
        new Work({ title: randomString() }),
      ];
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({
        works,
        territory: [territory],
      });

      // Act
      await LibDelivery.createLibDeliveryWork({
        lib,
        filter,
        delivery,
        deliveryPartner,
        territory,
        options,
      });

      // Assert
      expect(LibDelivery.createLibDeliveryWork).toHaveBeenCalledTimes(1);
      expect(lib.createData).toHaveBeenCalledWith({ works, deliveryTerritories: [territory] }, expect.any(Function));
    });

    it('should pass required models into CwrDeliveryController', async () => {
      // Arrange
      const works = [new Work({ title: randomString() })];
      jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValue({
        works,
        territory: [territory],
      });

      // Act
      await LibDelivery.createLibDeliveryWork({
        lib,
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
        jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({
          works: works.slice(0, 10_000),
          territory: [territory],
        });
        jest.spyOn(CwrDeliveryController, 'getWorksForDelivery').mockResolvedValueOnce({
          works: works.slice(10_000),
          territory: [territory],
        });

        // Act
        await LibDelivery.createLibDeliveryWork({
          lib,
          filter,
          delivery,
          deliveryPartner,
          territory,
          options,
        });

        // Assert
        // Batch 1 - 10k
        expect(lib.createData).toHaveBeenNthCalledWith(1, { works: works.slice(0, 10_000), deliveryTerritories: [territory] }, expect.any(Function));
        // Batch 2 - remaining 500
        expect(lib.createData).toHaveBeenNthCalledWith(2, { works: works.slice(10_000), deliveryTerritories: [territory] }, expect.any(Function));
      });
    });
  });
});
