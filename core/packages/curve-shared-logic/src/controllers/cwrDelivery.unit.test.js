const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const mongoose = require('mongoose');

const CwrDeliveryController = require('./cwrDelivery');
const DeliveredWorkController = require('./deliveredWork');
const { CISAC_COUNTRIES_EUROPE } = require('../libs/cwr/territories');

describe('CwrDeliveryController', () => {
  describe('getDataForChildren', () => {
    it('should return if the chain has no children', async () => {
      try {
        await CwrDeliveryController.getDataForChildren({ children: null });
        await CwrDeliveryController.getDataForChildren({ children: [] });
      } catch (err) {
        expect(err).toToBeUndefined();
      }
    });

    it('should not retrieve data for the chain when a chain has no publisher id', async () => {
      const children = [{ type: 'Publisher' }];
      const updatedChildren = await CwrDeliveryController.getDataForChildren({ children });
      expect(updatedChildren).toEqual([]);
    });

    it('should not retrieve data for the chain when a chain has no composer id', async () => {
      const children = [{ type: 'Composer' }];
      const updatedChildren = await CwrDeliveryController.getDataForChildren({ children });
      expect(updatedChildren).toEqual([]);
    });

    it('should fetch the publisher and add data to the chain when a chain has a publisher', async () => {
      const publisher = { _id: randomId(), name: randomString(), cae: randomInt() };
      const children = [{ type: 'Publisher', publisherId: publisher._id }];
      const publisherMap = new Map([[publisher._id.toString(), publisher]]);

      const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, publisherMap });

      expect(updatedChildren).toEqual([{ ...children[0], publisher, name: publisher.name, caeNumber: publisher.cae }]);
    });

    it('should fetch the composer and add data to the chain when a chain has a composer', async () => {
      const composer = { _id: randomId(), name: randomString(), cae: randomInt() };
      const children = [{ type: 'Composer', composerId: composer._id }];
      const composerMap = new Map([[composer._id.toString(), composer]]);

      const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, composerMap });

      expect(updatedChildren).toEqual([{ ...children[0], composer, name: composer.name, caeNumber: composer.cae }]);
    });

    it('should fetch data for both and add it to the chain when a chain has a publisher and a composer', async () => {
      const publisher = { _id: randomId(), name: randomString(), cae: randomInt() };
      const composer = { _id: randomId(), name: randomString(), cae: randomInt() };
      const publisherMap = new Map([[publisher._id.toString(), publisher]]);
      const composerMap = new Map([[composer._id.toString(), composer]]);
      const children = [
        { type: 'Publisher', publisherId: publisher._id },
        { type: 'Composer', composerId: composer._id },
      ];

      const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, publisherMap, composerMap });

      expect(updatedChildren).toEqual([
        { ...children[0], publisher, name: publisher.name, caeNumber: publisher.cae, },
        { ...children[1], composer, name: composer.name, caeNumber: composer.cae },
      ]);
    });

    it('should recursively add data to all children when a chain has nested children', async () => {
      const publisher1 = { _id: randomId(), name: randomString(), cae: randomInt() };
      const publisher2 = { _id: randomId(), name: randomString(), cae: randomInt() };
      const composer = { _id: randomId(), name: randomString(), cae: randomInt() };
      const publisherMap = new Map([[publisher1._id.toString(), publisher1], [publisher2._id.toString(), publisher2]]);
      const composerMap = new Map([[composer._id.toString(), composer]]);
      const children = [
        {
          type: 'Publisher',
          publisherId: publisher1._id,
          children: [{ type: 'Publisher', publisherId: publisher2._id, children: [{ type: 'Composer', composerId: composer._id, }] }],
        },
      ];

      const updatedChildren = await CwrDeliveryController.getDataForChildren({ children, publisherMap, composerMap });

      expect(updatedChildren).toEqual([
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
              children: [{ type: 'Composer', composerId: composer._id, composer, name: composer.name, caeNumber: composer.cae }],
            },
          ],
        },
      ]);
    });
  });

  describe('buildWorksFilter', () => {
    it('should build a filter object for all works when status is All', async () => {
      const delivery = { clientId: randomId(), deliveryPartnerId: randomId(), filterType: 'custom' };
      const filter = await CwrDeliveryController.buildWorksFilter({ status: 'All', delivery });
      expect(filter).toEqual({
        clientId: delivery.clientId,
        approvalStatus: { $in: [] },
        holdRedelivery: { $ne: new mongoose.Types.ObjectId(delivery.deliveryPartnerId) },
      });
    });

    it('should build a filter object for those works when work ids are set on the delivery', async () => {
      const delivery = { clientId: randomId(), deliveryPartnerId: randomId(), filterType: 'custom', workIds: [randomId(), randomId(), randomId()] };
      const filter = await CwrDeliveryController.buildWorksFilter({ status: 'All', delivery });
      expect(filter).toMatchObject({ clientId: delivery.clientId, valid: true });
      expect(filter._id.$in.map((id) => id.toString())).toEqual(delivery.workIds);
    });

    it('should build a filter object with works of that status when status is not All', async () => {
      const delivery = { clientId: randomId(), deliveryPartnerId: randomId(), filterType: 'custom' };
      const workIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];
      jest.spyOn(DeliveredWorkController, 'getWorkIdsByStatus').mockResolvedValue(workIds);
      const filter = await CwrDeliveryController.buildWorksFilter({ status: 'Approved', delivery });
      expect(filter).toEqual({ clientId: delivery.clientId, valid: true, _id: { $in: workIds } });
    });
  });

  describe('getTrackDeliveryData', () => {
    it('should attach the release data when an associated release exists for the track', async () => {
      const track = { _id: new mongoose.Types.ObjectId(), title: randomString(), version: randomString(), artist: randomString(), isrc: randomInt(), duration: randomInt(), label: randomString() };
      const release = { title: randomString(), label: randomString(), catNo: randomInt(), barcode: randomString() };
      const releaseByTrackMap = new Map([[track._id.toString(), release]]);

      const trackWithDeliveryData = CwrDeliveryController.getTrackDeliveryData({ track, releaseByTrackMap });

      expect(trackWithDeliveryData).toEqual({
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

    it('should just return the track when no associated release exists for the track', async () => {
      const track = { _id: new mongoose.Types.ObjectId(), title: randomString(), version: randomString(), artist: randomString(), isrc: randomInt(), duration: randomInt(), label: randomString(), };

      const trackWithDeliveryData = CwrDeliveryController.getTrackDeliveryData({ track });

      expect(trackWithDeliveryData).toEqual({
        title: track.title,
        version: track.version,
        artist: track.artist,
        isrc: track.isrc,
        duration: track.duration,
        trackLabel: track.label,
      });
    });
  });

  describe('getWorksForDelivery', () => {
    let clientId; let works; let deliveryData; let Work; let TerritoryGroup; let delivery; let deliveryPartner; let territory; let filter; let options; let limit;

    const mockWork = () => ({ _id: new mongoose.Types.ObjectId(), title: randomString(), rightsChain: [], });

    beforeEach(() => {
      clientId = randomId();
      works = [];
      deliveryData = {};

      for (let i = 0; i < 50; i += 1) {
        const work = mockWork();
        works.push(work);
        deliveryData[work._id.toString()] = randomString();
      }

      Work = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(works) }) };
      const territoryGroup = {};
      TerritoryGroup = { findById: jest.fn().mockResolvedValue(territoryGroup) };

      delivery = { _id: randomString(), clientId, };
      deliveryPartner = {};
      territory = 'WW';
      filter = { _id: { $in: works.map((w) => w._id), }, };
      options = { partnerChainsEnabled: true };
      limit = 5;
      jest.spyOn(CwrDeliveryController, 'getWorkDeliveryData')
        .mockImplementation(({ work }) => {
          work.valueFromDeliveryData = deliveryData[work._id.toString()];
          return work;
        });
    });

    it('should get all works for a delivery', async () => {
      const worksWithDeliveryData = await CwrDeliveryController.getWorksForDelivery({ delivery, deliveryPartner, territory, filter, options, limit, Work, TerritoryGroup });

      expect(Work.find.mock.calls[0][0]).toEqual(filter);
      expect(Work.find.mock.calls[0][1]).toEqual(null);
      expect(Work.find.mock.calls[0][2]).toEqual({ limit, sort: { _id: 1 } });
      expect(TerritoryGroup.findById.mock.calls).toEqual([]);
      for (let i = 0; i < works.length; i += 1) {
        expect(CwrDeliveryController.getWorkDeliveryData.mock.calls[i][0]).toEqual({
          work: works[i],
          territory,
          deliveryPartner,
          isCatShipment: false,
          partnerChainsEnabled: true,
          lookups: {
            territoryGroupMap: new Map(),
            publisherMap: new Map(),
            composerMap: new Map(),
            trackMap: new Map(),
            releaseByTrackMap: new Map(),
          },
        });
      }
      expect(worksWithDeliveryData.works).toEqual(works.map((work) => ({ ...work, valueFromDeliveryData: deliveryData[work._id.toString()] })));
      expect(worksWithDeliveryData.territory).toEqual(territory);
    });

    it('should fetch that territory group when the territory is a territory group id', async () => {
      territory = randomId();
      delivery.territory = territory;
      const territoryGroup = { _id: territory, territories: ['NL', 'UK', 'SE'], };
      const tgQuery = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(territoryGroup) };
      TerritoryGroup = { findById: jest.fn().mockReturnValue(tgQuery) };

      const worksWithDeliveryData = await CwrDeliveryController.getWorksForDelivery({ delivery, deliveryPartner, territory, filter, options, limit, Work, TerritoryGroup });

      expect(TerritoryGroup.findById.mock.calls[0][0]).toEqual(delivery.territory);
      expect(worksWithDeliveryData.territory).toEqual(territoryGroup.territories);
    });

    it('should only get works from that last id when a previous batch id is specified', async () => {
      options.lastId = works[24]._id;

      await CwrDeliveryController.getWorksForDelivery({ delivery, deliveryPartner, territory, filter, options, limit, Work, TerritoryGroup });

      expect(Work.find.mock.calls[0][0].$and[0]._id.$in).toEqual(works.map((w) => w._id));
      expect(Work.find.mock.calls[0][0].$and[1]._id).toEqual({ $gt: options.lastId });
    });

    it('should filter them out when works with no delivery data are returned', async () => {
      CwrDeliveryController.getWorkDeliveryData.mockRestore();
      for (let i = 0; i < works.length; i += 1) {
        if (i >= 25) works[i].rightsChain = null;
      }

      const worksWithDeliveryData = await CwrDeliveryController.getWorksForDelivery({ delivery, deliveryPartner, territory, filter, options, limit, Work, TerritoryGroup });

      expect(worksWithDeliveryData.works.length).toEqual(25);
      expect(worksWithDeliveryData.works).toEqual(works.slice(0, 25));
    });
  });

  describe('getWorkDeliveryData', () => {
    it('should return null if the work is not defined', async () => {
      const work = await CwrDeliveryController.getWorkDeliveryData({ work: null });
      expect(work).toBeNull();
    });

    it('should return null if the work has no rights chain', async () => {
      const work = await CwrDeliveryController.getWorkDeliveryData({ work: { rightsChain: null } });
      expect(work).toBeNull();
    });

    it('should set the territory codes on the rights chain when a specific territory is defined', async () => {
      const rightsChain = [{ territory: 'specific', territoryCodes: { codes: ['NL', 'GB', 'SE'], }, children: [], },];

      const work = await CwrDeliveryController.getWorkDeliveryData({
        work: { rightsChain, territory: 'WW' },
        territory: 'WW',
        deliveryPartner: {},
        isCatShipment: false,
        partnerChainsEnabled: false,
      });

      expect(work).toEqual({
        rightsChain: [{ territory: ['NL', 'GB', 'SE'], territoryCodes: { codes: ['NL', 'GB', 'SE'] }, children: [], },],
        territory: 'WW',
      });
    });

    it('should set the territory codes on the rights chain when the territory is a continent', async () => {
      const rightsChain = [{ territory: 'specific', territoryCodes: { codes: Object.values(CISAC_COUNTRIES_EUROPE) }, children: [], },];

      const work = await CwrDeliveryController.getWorkDeliveryData({
        work: { rightsChain, territories: Object.values(CISAC_COUNTRIES_EUROPE), },
        territory: 'Europe',
        deliveryPartner: {},
        isCatShipment: false,
        partnerChainsEnabled: false,
      });

      expect(work).toEqual({
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

    it('should fetch the group and set the territory codes on the rights chain when the territory is an id for a territory group', async () => {
      const territoryGroup = { _id: new mongoose.Types.ObjectId(), territories: ['SE', 'NO', 'DK'] };
      const rightsChain = [{ territory: territoryGroup._id.toString(), children: [] }];
      const lookups = {
        territoryGroupMap: new Map([[territoryGroup._id.toString(), territoryGroup]]),
        publisherMap: new Map(),
        composerMap: new Map(),
        trackMap: new Map(),
        releaseByTrackMap: new Map(),
      };

      const work = await CwrDeliveryController.getWorkDeliveryData({
        work: { rightsChain, territories: 'WW' },
        territory: 'WW',
        deliveryPartner: {},
        isCatShipment: false,
        partnerChainsEnabled: false,
        lookups,
      });

      expect(work).toEqual({
        rightsChain: [{ territory: territoryGroup.territories, children: [], isTerritoryGroup: true }],
        territories: 'WW',
      });
    });

    it('should switch the work rights chain for the partner chain when a partner chain exists', async () => {
      const deliveryPartner = { _id: new mongoose.Types.ObjectId() };
      const work = {
        rightsChain: [{ territory: 'GB', },],
        territories: 'WW',
        partnerRightsChains: [{ deliveryPartnerId: deliveryPartner._id.toString(), rightsChain: [{ territory: 'NL' }] }],
      };

      const workWithDeliveryData = await CwrDeliveryController.getWorkDeliveryData({ deliveryPartner, work, partnerChainsEnabled: true, });

      expect(workWithDeliveryData).toEqual({
        rightsChain: [{ territory: 'NL', children: [], score: 0 },],
        territories: work.territories,
        partnerRightsChains: work.partnerRightsChains,
      });
    });
  });

  describe('collectChildrenIds', () => {
    it('should do nothing when children is null or not an array', () => {
      const publisherIds = new Set();
      const composerIds = new Set();
      CwrDeliveryController.collectChildrenIds(null, publisherIds, composerIds);
      CwrDeliveryController.collectChildrenIds(undefined, publisherIds, composerIds);
      expect(publisherIds.size).toBe(0);
      expect(composerIds.size).toBe(0);
    });

    it('should collect a publisher id from a flat child', () => {
      const publisherId = randomId();
      const publisherIds = new Set();
      const composerIds = new Set();
      CwrDeliveryController.collectChildrenIds([{ publisherId }], publisherIds, composerIds);
      expect(publisherIds.has(publisherId.toString())).toBe(true);
      expect(composerIds.size).toBe(0);
    });

    it('should collect a composer id from a flat child', () => {
      const composerId = randomId();
      const publisherIds = new Set();
      const composerIds = new Set();
      CwrDeliveryController.collectChildrenIds([{ composerId }], publisherIds, composerIds);
      expect(composerIds.has(composerId.toString())).toBe(true);
      expect(publisherIds.size).toBe(0);
    });

    it('should skip children with no publisherId or composerId', () => {
      const publisherIds = new Set();
      const composerIds = new Set();
      CwrDeliveryController.collectChildrenIds([{ type: 'Publisher' }, null], publisherIds, composerIds);
      expect(publisherIds.size).toBe(0);
      expect(composerIds.size).toBe(0);
    });

    it('should recursively collect ids from nested children', () => {
      const publisherId = randomId();
      const composerId = randomId();
      const publisherIds = new Set();
      const composerIds = new Set();
      CwrDeliveryController.collectChildrenIds([{ publisherId, children: [{ composerId }] }], publisherIds, composerIds);
      expect(publisherIds.has(publisherId.toString())).toBe(true);
      expect(composerIds.has(composerId.toString())).toBe(true);
    });

    it('should deduplicate ids referenced by multiple children', () => {
      const publisherId = randomId();
      const publisherIds = new Set();
      const composerIds = new Set();
      CwrDeliveryController.collectChildrenIds([{ publisherId }, { publisherId }], publisherIds, composerIds);
      expect(publisherIds.size).toBe(1);
    });
  });

  describe('collectWorkIds', () => {
    it('should return empty sets when works array is empty', () => {
      const result = CwrDeliveryController.collectWorkIds([], null);
      expect(result.territoryGroupIds.size).toBe(0);
      expect(result.publisherIds.size).toBe(0);
      expect(result.composerIds.size).toBe(0);
      expect(result.trackIds.size).toBe(0);
    });

    it('should collect track ids from works', () => {
      const trackId = randomId();
      const { trackIds } = CwrDeliveryController.collectWorkIds([{ trackIds: [trackId], rightsChain: [] }], null);
      expect(trackIds.has(trackId.toString())).toBe(true);
    });

    it('should collect a territory group id when a chain territory is a valid ObjectId', () => {
      const territoryGroupId = randomId();
      const works = [{ rightsChain: [{ territory: territoryGroupId.toString(), children: [] }] }];
      const { territoryGroupIds } = CwrDeliveryController.collectWorkIds(works, null);
      expect(territoryGroupIds.has(territoryGroupId.toString())).toBe(true);
    });

    it('should not collect territory when it is a plain string like WW', () => {
      const works = [{ rightsChain: [{ territory: 'WW', children: [] }] }];
      const { territoryGroupIds } = CwrDeliveryController.collectWorkIds(works, null);
      expect(territoryGroupIds.size).toBe(0);
    });

    it('should collect ids from partnerRightsChains as well as the primary rightsChain', () => {
      const publisherId = randomId();
      const composerId = randomId();
      const works = [{
        rightsChain: [{ children: [{ publisherId }] }],
        partnerRightsChains: [{ rightsChain: [{ children: [{ composerId }] }] }],
      }];
      const { publisherIds, composerIds } = CwrDeliveryController.collectWorkIds(works, null);
      expect(publisherIds.has(publisherId.toString())).toBe(true);
      expect(composerIds.has(composerId.toString())).toBe(true);
    });

    it('should collect the delivery partner insertion publisherId', () => {
      const publisherId = randomId();
      const { publisherIds } = CwrDeliveryController.collectWorkIds([{ rightsChain: [] }], { insertion: { publisherId } });
      expect(publisherIds.has(publisherId.toString())).toBe(true);
    });

    it('should collect extra partner publisher ids from the delivery partner', () => {
      const publisherId = randomId();
      const { publisherIds } = CwrDeliveryController.collectWorkIds([{ rightsChain: [] }], { extraPartners: [{ publisherId }] });
      expect(publisherIds.has(publisherId.toString())).toBe(true);
    });
  });

  describe('batchFetchLookups', () => {
    it('should return empty maps when all id sets are empty', async () => {
      const result = await CwrDeliveryController.batchFetchLookups({
        clientId: randomId(), territoryGroupIds: new Set(), publisherIds: new Set(),
        composerIds: new Set(), trackIds: new Set(),
        TerritoryGroup: null, Publisher: null, Composer: null, Track: null, Release: null,
      });
      expect(result.territoryGroupMap.size).toBe(0);
      expect(result.publisherMap.size).toBe(0);
      expect(result.composerMap.size).toBe(0);
      expect(result.trackMap.size).toBe(0);
      expect(result.releaseByTrackMap.size).toBe(0);
    });

    it('should build a publisherMap keyed by id string', async () => {
      const publisher = { _id: randomId(), name: randomString() };
      const publisherQuery = { lean: jest.fn().mockResolvedValue([publisher]) };
      const Publisher = { find: jest.fn().mockReturnValue(publisherQuery) };
      const { publisherMap } = await CwrDeliveryController.batchFetchLookups({
        clientId: randomId(), territoryGroupIds: new Set(), publisherIds: new Set([publisher._id.toString()]),
        composerIds: new Set(), trackIds: new Set(),
        TerritoryGroup: null, Publisher, Composer: null, Track: null, Release: null,
      });
      expect(publisherMap.get(publisher._id.toString())).toEqual(publisher);
    });

    it('should build a composerMap keyed by id string', async () => {
      const composer = { _id: randomId(), name: randomString() };
      const composerQuery = { lean: jest.fn().mockResolvedValue([composer]) };
      const Composer = { find: jest.fn().mockReturnValue(composerQuery) };
      const { composerMap } = await CwrDeliveryController.batchFetchLookups({
        clientId: randomId(), territoryGroupIds: new Set(), publisherIds: new Set(),
        composerIds: new Set([composer._id.toString()]), trackIds: new Set(),
        TerritoryGroup: null, Publisher: null, Composer, Track: null, Release: null,
      });
      expect(composerMap.get(composer._id.toString())).toEqual(composer);
    });

    it('should build a trackMap keyed by id string', async () => {
      const track = { _id: randomId(), title: randomString() };
      const trackQuery = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([track]) };
      const Track = { find: jest.fn().mockReturnValue(trackQuery) };
      const releaseQuery = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
      const Release = { find: jest.fn().mockReturnValue(releaseQuery) };
      const { trackMap } = await CwrDeliveryController.batchFetchLookups({
        clientId: randomId(), territoryGroupIds: new Set(), publisherIds: new Set(),
        composerIds: new Set(), trackIds: new Set([track._id.toString()]),
        TerritoryGroup: null, Publisher: null, Composer: null, Track, Release,
      });
      expect(trackMap.get(track._id.toString())).toEqual(track);
    });

    it('should map each track to the first release in sort order when multiple releases share a track', async () => {
      const trackId = randomId();
      const release1 = { _id: randomId(), title: randomString(), trackIds: [trackId] };
      const release2 = { _id: randomId(), title: randomString(), trackIds: [trackId] };
      const trackQuery = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
      const Track = { find: jest.fn().mockReturnValue(trackQuery) };
      // sorted ascending by createdAt — release1 is first (oldest), should win
      const releaseQuery = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([release1, release2]) };
      const Release = { find: jest.fn().mockReturnValue(releaseQuery) };
      const { releaseByTrackMap } = await CwrDeliveryController.batchFetchLookups({
        clientId: randomId(), territoryGroupIds: new Set(), publisherIds: new Set(),
        composerIds: new Set(), trackIds: new Set([trackId.toString()]),
        TerritoryGroup: null, Publisher: null, Composer: null, Track, Release,
      });
      expect(releaseByTrackMap.get(trackId.toString())).toEqual(release1);
    });

    it('should build a territoryGroupMap keyed by id string', async () => {
      const territoryGroup = { _id: randomId(), territories: ['NL', 'DE'] };
      const tgQuery = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([territoryGroup]) };
      const TerritoryGroup = { find: jest.fn().mockReturnValue(tgQuery) };
      const { territoryGroupMap } = await CwrDeliveryController.batchFetchLookups({
        clientId: randomId(), territoryGroupIds: new Set([territoryGroup._id.toString()]),
        publisherIds: new Set(), composerIds: new Set(), trackIds: new Set(),
        TerritoryGroup, Publisher: null, Composer: null, Track: null, Release: null,
      });
      expect(territoryGroupMap.get(territoryGroup._id.toString())).toEqual(territoryGroup);
    });
  });
});
