/* eslint-disable no-return-assign */
const { expect } = require('chai');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const mongoose = require('mongoose');

const CwrDeliveryController = require('../../../controllers/cwrDelivery');
const DeliveredWorkController = require('../../../controllers/deliveredWork');
const { CISAC_COUNTRIES_EUROPE } = require('../../../libs/cwr/territories');

describe('CwrDeliveryController', () => {
  describe('getDataForChildren', () => {
    it('should return if the chain has no children', async () => {
      // Act
      try {
        await CwrDeliveryController.getDataForChildren({ children: null });
        await CwrDeliveryController.getDataForChildren({ children: [] });
      } catch (err) {
        // Assert
        expect(err).to.be.undefined;
      }
    });

    describe('when a chain has no publisher id', () => {
      it('should not retrieve data for the chain', async () => {
        // Arrange
        const children = [{ type: 'Publisher' }];
        // Act
        const updatedChildren = await CwrDeliveryController.getDataForChildren({ children });
        // Assert
        expect(updatedChildren).to.eql([]);
      });
    });

    describe('when a chain has no composer id', () => {
      it('should not retrieve data for the chain', async () => {
        // Arrange
        const children = [{ type: 'Composer' }];
        // Act
        const updatedChildren = await CwrDeliveryController.getDataForChildren({ children });
        // Assert
        expect(updatedChildren).to.eql([]);
      });
    });

    describe('when a chain has a publisher', () => {
      it('should fetch the publisher and add data to the chain', async () => {
        // Arrange
        const publisher = {
          _id: randomId(),
          name: randomString(),
          cae: randomInt(),
        };
        const children = [{ type: 'Publisher', publisherId: publisher._id }];
        const Publisher = {
          findById: jest.fn().mockResolvedValue(publisher),
        };
        // Act
        const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, Publisher });
        // Assert
        expect(updatedChildren).to.eql([{
          ...children[0],
          publisher,
          name: publisher.name,
          caeNumber: publisher.cae,
        }]);
      });
    });

    describe('when a chain has a composer', () => {
      it('should fetch the composer and add data to the chain', async () => {
        // Arrange
        const composer = {
          _id: randomId(),
          name: randomString(),
          cae: randomInt(),
        };
        const children = [{ type: 'Composer', composerId: composer._id }];
        const Composer = {
          findById: jest.fn().mockResolvedValue(composer),
        };
        // Act
        const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, Composer });
        // Assert
        expect(updatedChildren).to.eql([{
          ...children[0],
          composer,
          name: composer.name,
          caeNumber: composer.cae,
        }]);
      });
    });

    describe('when a chain has a publisher and a composer', () => {
      it('should fetch data for both and add it to the chain', async () => {
        // Arrange
        const publisher = {
          _id: randomId(),
          name: randomString(),
          cae: randomInt(),
        };
        const Publisher = {
          findById: jest.fn().mockResolvedValue(publisher),
        };
        const composer = {
          _id: randomId(),
          name: randomString(),
          cae: randomInt(),
        };
        const Composer = {
          findById: jest.fn().mockResolvedValue(composer),
        };
        const children = [
          { type: 'Publisher', publisherId: publisher._id },
          { type: 'Composer', composerId: composer._id },
        ];
        // Act
        const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, Publisher, Composer });
        // Assert
        expect(updatedChildren).to.eql([
          {
            ...children[0],
            publisher,
            name: publisher.name,
            caeNumber: publisher.cae,
          },
          {
            ...children[1],
            composer,
            name: composer.name,
            caeNumber: composer.cae,
          },
        ]);
      });
    });

    describe('when a chain has nested children', () => {
      it('should recursively add data to all children', async () => {
        // Arrange
        const publisher1 = { _id: randomId(), name: randomString(), cae: randomInt() };
        const publisher2 = { _id: randomId(), name: randomString(), cae: randomInt() };
        const composer = { _id: randomId(), name: randomString(), cae: randomInt() };

        const Publisher = {
          findById: jest.fn()
            .mockResolvedValueOnce(publisher1)
            .mockResolvedValueOnce(publisher2),
        };
        const Composer = {
          findById: jest.fn().mockResolvedValue(composer),
        };

        const children = [
          {
            type: 'Publisher',
            publisherId: publisher1._id,
            children: [
              {
                type: 'Publisher',
                publisherId: publisher2._id,
                children: [
                  {
                    type: 'Composer',
                    composerId: composer._id,
                  },
                ],
              },
            ],
          },
        ];

        // Act
        const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, Publisher, Composer });

        // Assert
        expect(updatedChildren).to.eql([
          {
            type: 'Publisher',
            publisherId: publisher1._id,
            publisher: publisher1,
            name: publisher1.name,
            caeNumber: publisher1.cae,
            children: [
              {
                type: 'Publisher',
                publisherId: publisher2._id,
                publisher: publisher2,
                name: publisher2.name,
                caeNumber: publisher2.cae,
                children: [
                  {
                    type: 'Composer',
                    composerId: composer._id,
                    composer,
                    name: composer.name,
                    caeNumber: composer.cae,
                  },
                ],
              },
            ],
          },
        ]);
      });
    });
  });

  describe('buildWorksFilter', () => {
    describe('when status is All', () => {
      it('should build a filter object for all works', async () => {
        // Arrange
        const delivery = {
          clientId: randomId(),
          deliveryPartnerId: randomId(),
          filterType: 'custom',
        };
        // Act
        const filter = await CwrDeliveryController.buildWorksFilter({
          status: 'All',
          delivery,
        });
        // Assert
        expect(filter).to.eql({
          clientId: delivery.clientId,
          approvalStatus: { $in: [] },
          holdRedelivery: { $ne: new mongoose.Types.ObjectId(delivery.deliveryPartnerId) },
        });
      });
    });

    describe('when work ids are set on the delivery', () => {
      it('should build a filter object for those works', async () => {
        // Arrange
        const delivery = {
          clientId: randomId(),
          deliveryPartnerId: randomId(),
          filterType: 'custom',
          workIds: [randomId(), randomId(), randomId()],
        };
        // Act
        const filter = await CwrDeliveryController.buildWorksFilter({
          status: 'All',
          delivery,
        });
        // Assert
        expect(filter).to.include({ clientId: delivery.clientId, valid: true });
        expect(filter._id.$in.map((id) => id.toString())).to.eql(delivery.workIds);
      });
    });

    describe('when status is not All', () => {
      it('should build a filter object with works of that status', async () => {
        // Arrange
        const delivery = {
          clientId: randomId(),
          deliveryPartnerId: randomId(),
          filterType: 'custom',
        };
        const workIds = [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ];
        jest.spyOn(DeliveredWorkController, 'getWorkIdsByStatus').mockResolvedValue(workIds);
        // Act
        const filter = await CwrDeliveryController.buildWorksFilter({
          status: 'Approved',
          delivery,
        });
        // Assert
        expect(filter).to.eql({
          clientId: delivery.clientId,
          valid: true,
          _id: { $in: workIds },
        });
      });
    });
  });

  describe('getTrackDeliveryData', () => {
    describe('when an associated release exists for the track', () => {
      it('should attach the release data', async () => {
        // Arrange
        const track = {
          _id: new mongoose.Types.ObjectId(),
          title: randomString(),
          version: randomString(),
          artist: randomString(),
          isrc: randomInt(),
          duration: randomInt(),
          label: randomString(),
        };
        const release = {
          title: randomString(),
          label: randomString(),
          catNo: randomInt(),
          barcode: randomString(),
        };
        const Release = {
          findOne: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(release),
            }),
          }),
        };
        // Act
        const trackWithDeliveryData = await CwrDeliveryController.getTrackDeliveryData({
          track,
          Release,
        });
        // Assert
        expect(trackWithDeliveryData).to.eql({
          title: track.title,
          version: track.version,
          artist: track.artist,
          isrc: track.isrc,
          duration: track.duration,
          trackLabel: track.label,
          releaseTitle: release.title,
          label: release.label,
          catNo: release.catNo,
          barcode: release.barcode,
        });
      });
    });

    describe('when no associated release exists for the track', () => {
      it('should just return the track', async () => {
        // Arrange
        const track = {
          _id: new mongoose.Types.ObjectId(),
          title: randomString(),
          version: randomString(),
          artist: randomString(),
          isrc: randomInt(),
          duration: randomInt(),
          label: randomString(),
        };
        const release = null;
        const Release = {
          findOne: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(release),
            }),
          }),
        };
        // Act
        const trackWithDeliveryData = await CwrDeliveryController.getTrackDeliveryData({
          track,
          Release,
        });
        // Assert
        expect(trackWithDeliveryData).to.eql({
          title: track.title,
          version: track.version,
          artist: track.artist,
          isrc: track.isrc,
          duration: track.duration,
          trackLabel: track.label,
        });
      });
    });
  });

  describe('getWorksForDelivery', () => {
    let clientId;
    let works;
    let deliveryData;
    let Work;
    let TerritoryGroup;
    let delivery;
    let deliveryPartner;
    let territory;
    let filter;
    let options;
    let limit;

    const mockWork = () => ({
      _id: new mongoose.Types.ObjectId(),
      title: randomString(),
      rightsChain: [],
    });

    beforeEach(() => {
      clientId = randomId();
      works = [];
      deliveryData = {};
      for (let i = 0; i < 50; i += 1) {
        const work = mockWork();
        works.push(work);
        deliveryData[work._id.toString()] = randomString();
      }
      Work = { find: jest.fn().mockResolvedValue(works) };
      const territoryGroup = {};
      TerritoryGroup = { findById: jest.fn().mockResolvedValue(territoryGroup) };

      delivery = {
        _id: randomString(),
        clientId,
      };
      deliveryPartner = {};
      territory = 'WW';
      filter = {
        _id: {
          $in: works.map((w) => w._id),
        },
      };
      options = { partnerChainsEnabled: true };
      limit = 5;
      jest
        .spyOn(CwrDeliveryController, 'getWorkDeliveryData')
        .mockImplementation(({ work }) => {
          work.valueFromDeliveryData = deliveryData[work._id.toString()];
          return Promise.resolve(work);
        });
    });

    it('should get all works for a delivery', async () => {
      // Act
      const worksWithDeliveryData = await CwrDeliveryController.getWorksForDelivery({
        delivery,
        deliveryPartner,
        territory,
        filter,
        options,
        limit,
        Work,
        TerritoryGroup,
      });

      // Assert
      expect(Work.find.mock.calls[0][0]).to.eql(filter);
      expect(Work.find.mock.calls[0][1]).to.eql(null);
      expect(Work.find.mock.calls[0][2]).to.eql({ limit, sort: { _id: 1 } });
      expect(TerritoryGroup.findById.mock.calls).to.eql([]);

      for (let i = 0; i < works.length; i += 1) {
        expect(CwrDeliveryController.getWorkDeliveryData.mock.calls[i][0]).to.eql({
          work: works[i],
          territory,
          deliveryPartner,
          isCatShipment: false,
          partnerChainsEnabled: true,
          Track: undefined,
          Release: undefined,
          TerritoryGroup,
          Publisher: undefined,
          Composer: undefined,
        });
      }
      expect(worksWithDeliveryData.works).to.eql(
        works.map((work) => ({
          ...work,
          valueFromDeliveryData: deliveryData[work._id.toString()],
        })),
      );
      expect(worksWithDeliveryData.territory).to.eql(territory);
    });

    describe('when the territory is a territory group id', () => {
      it('should fetch that territory group', async () => {
        // Arrange
        territory = randomId();
        delivery.territory = territory;
        const territoryGroup = {
          _id: territory,
          territories: ['NL', 'UK', 'SE'],
        };
        TerritoryGroup = { findById: jest.fn().mockResolvedValue(territoryGroup) };

        // Act
        const worksWithDeliveryData = await CwrDeliveryController.getWorksForDelivery({
          delivery,
          deliveryPartner,
          territory,
          filter,
          options,
          limit,
          Work,
          TerritoryGroup,
        });

        // Assert
        expect(TerritoryGroup.findById.mock.calls[0][0]).to.equal(delivery.territory);
        expect(worksWithDeliveryData.territory).to.equal(territoryGroup.territories);
      });
    });

    describe('when a previous batch id is specified', () => {
      it('should only get works from that last id', async () => {
        // Arrange
        options.lastId = works[24]._id;

        // Act
        await CwrDeliveryController.getWorksForDelivery({
          delivery,
          deliveryPartner,
          territory,
          filter,
          options,
          limit,
          Work,
          TerritoryGroup,
        });

        // Assert
        expect(Work.find.mock.calls[0][0].$and[0]._id.$in).to.eql(works.map((w) => w._id));
        expect(Work.find.mock.calls[0][0].$and[1]._id).to.eql({ $gt: options.lastId });
      });
    });

    describe('when works with no delivery data are returned', () => {
      it('should filter them out', async () => {
        // Arrange
        CwrDeliveryController.getWorkDeliveryData.mockRestore();
        for (let i = 0; i < works.length; i += 1) {
          if (i >= 25) works[i].rightsChain = null;
        }

        // Act
        const worksWithDeliveryData = await CwrDeliveryController.getWorksForDelivery({
          delivery,
          deliveryPartner,
          territory,
          filter,
          options,
          limit,
          Work,
          TerritoryGroup,
        });

        // Assert
        expect(worksWithDeliveryData.works.length).to.equal(25);
        expect(worksWithDeliveryData.works).to.eql(works.slice(0, 25));
      });
    });
  });

  describe('getWorkDeliveryData', () => {
    it('should return null if the work is not defined', async () => {
      // Act
      const work = await CwrDeliveryController.getWorkDeliveryData({ work: null });
      // Assert
      expect(work).to.be.null;
    });

    it('should return null if the work has no rights chain', async () => {
      // Act
      const work = await CwrDeliveryController.getWorkDeliveryData({ work: { rightsChain: null } });
      // Assert
      expect(work).to.be.null;
    });

    describe('when a specific territory is defined', () => {
      it('should set the territory codes on the rights chain', async () => {
        // Arrange
        const rightsChain = [
          {
            territory: 'specific',
            territoryCodes: {
              codes: ['NL', 'GB', 'SE'],
            },
            children: [],
          },
        ];
        // Act
        const work = await CwrDeliveryController.getWorkDeliveryData({
          work: {
            rightsChain,
            territory: 'WW',
          },
          territory: 'WW',
          deliveryPartner: {},
          isCatShipment: false,
          partnerChainsEnabled: false,
        });
        // Assert
        expect(work).to.eql({
          rightsChain: [
            {
              territory: ['NL', 'GB', 'SE'],
              territoryCodes: { codes: ['NL', 'GB', 'SE'] },
              children: [],
            },
          ],
          territory: 'WW',
        });
      });
    });

    describe('when the territory is a continent', () => {
      it('should set the territory codes on the rights chain', async () => {
        // Arrange
        const rightsChain = [
          {
            territory: 'specific',
            territoryCodes: { codes: Object.values(CISAC_COUNTRIES_EUROPE) },
            children: [],
          },
        ];
        // Act
        const work = await CwrDeliveryController.getWorkDeliveryData({
          work: {
            rightsChain,
            territories: Object.values(CISAC_COUNTRIES_EUROPE),
          },
          territory: 'Europe',
          deliveryPartner: {},
          isCatShipment: false,
          partnerChainsEnabled: false,
        });
        // Assert
        expect(work).to.eql({
          rightsChain: [
            {
              territory: Object.values(CISAC_COUNTRIES_EUROPE),
              territoryCodes: { codes: Object.values(CISAC_COUNTRIES_EUROPE) },
              children: [],
              score: 4_500_000,
              newTerritories: Object.values(CISAC_COUNTRIES_EUROPE),
            },
          ],
          territories: Object.values(CISAC_COUNTRIES_EUROPE),
        });
      });
    });

    describe('when the territory is an id for a territory group', () => {
      it('should fetch the group and set the territory codes on the rights chain', async () => {
        // Arrange
        const territoryGroup = {
          _id: new mongoose.Types.ObjectId(),
          territories: ['SE', 'NO', 'DK'],
        };
        const TerritoryGroup = { findById: jest.fn().mockResolvedValue(territoryGroup) };
        const rightsChain = [
          {
            territory: territoryGroup._id.toString(),
            children: [],
          },
        ];
        // Act
        const work = await CwrDeliveryController.getWorkDeliveryData({
          work: {
            rightsChain,
            territories: 'WW',
          },
          territory: 'WW',
          deliveryPartner: {},
          isCatShipment: false,
          partnerChainsEnabled: false,
          TerritoryGroup,
        });
        // Assert
        expect(work).to.eql({
          rightsChain: [
            {
              territory: territoryGroup.territories,
              children: [],
              isTerritoryGroup: true,
            },
          ],
          territories: 'WW',
        });
      });
    });

    describe('when a partner chain exists', () => {
      it('should switch the work rights chain for the partner chain', async () => {
        // Act
        const deliveryPartner = { _id: new mongoose.Types.ObjectId() };
        const work = {
          rightsChain: [
            {
              territory: 'GB',
            },
          ],
          territories: 'WW',
          partnerRightsChains: [
            {
              deliveryPartnerId: deliveryPartner._id.toString(),
              rightsChain: [
                {
                  territory: 'NL',
                },
              ],
            },
          ],
        };
        const workWithDeliveryData = await CwrDeliveryController.getWorkDeliveryData({
          deliveryPartner,
          work,
          partnerChainsEnabled: true,
        });
        // Assert
        expect(workWithDeliveryData).to.eql({
          rightsChain: [
            { territory: 'NL', children: [], score: 0 },
          ],
          territories: work.territories,
          partnerRightsChains: work.partnerRightsChains,
        });
      });
    });
  });
});
