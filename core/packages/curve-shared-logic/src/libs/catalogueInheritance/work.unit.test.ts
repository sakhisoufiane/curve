import { propagateWork } from './work';
import {
  randomId,
  randomString,
  asWork,
  makeSourceWork,
  makeChildWorkInstance,
  makeClient,
  makePublisher,
  makeComposer,
  makeTerritoryGroup,
  makeWorkModel,
  makeClientModel,
  makeTrackModel,
  makePublisherModel,
  makeComposerModel,
  makeTerritoryGroupModel,
  makeDefaultModels,
  makeComposerPublisherTerritoryModels,
  makeTrackComposerTerritoryModels,
  makeTrackPublisherTerritoryModels,
  makeBasicScenario,
  buildChainWithPublisher,
  buildChainWithComposer,
  buildChainWithTerritoryGroup,
} from './testUtils';

describe('propagateWork', () => {
  describe('client filtering', () => {
    it('does nothing when the parent client is not found', async () => {
      const work = makeSourceWork();
      const { Work, childInstance } = makeWorkModel();
      const Client = makeClientModel(null, []);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(Work.findOne).not.toHaveBeenCalled();
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does nothing when no child clients inherit from the parent', async () => {
      const parent = makeClient();
      const work = makeSourceWork({ clientId: parent._id });
      const { Work, childInstance } = makeWorkModel();
      const Client = makeClientModel(parent, []);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does not propagate when transferWorks is false', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferWorks: false }]);
      const work = makeSourceWork({ clientId: parent._id });
      const { Work, childInstance } = makeWorkModel();
      const Client = makeClientModel(parent, [child]);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('propagates when transferWorks is true', async () => {
      const { work, childInstance, Work, Client } = makeBasicScenario();
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('propagates when the work belongs to the child catalogueGroup', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferWorks: true, catalogueGroup: 'Group A' }]);
      const work = makeSourceWork({ clientId: parent._id, catalogueGroups: ['Group A'] });
      const childInstance = makeChildWorkInstance();
      const { Work } = makeWorkModel(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('does not propagate when the work does not belong to the child catalogueGroup', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferWorks: true, catalogueGroup: 'Group B' }]);
      const work = makeSourceWork({ clientId: parent._id, catalogueGroups: ['Group A'] });
      const childInstance = makeChildWorkInstance();
      const { Work } = makeWorkModel(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does not propagate when the child has a catalogueGroup filter but the work has none', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferWorks: true, catalogueGroup: 'Group A' }]);
      const work = makeSourceWork({ clientId: parent._id, catalogueGroups: [] });
      const childInstance = makeChildWorkInstance();
      const { Work } = makeWorkModel(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('propagates when only the second inheritCatalogueFrom entry matches', async () => {
      const parent = makeClient();
      const child = makeClient([
        { clientId: parent._id.toString(), transferWorks: true, catalogueGroup: 'Group A' },
        { clientId: parent._id.toString(), transferWorks: true, catalogueGroup: 'Group B' },
      ]);
      const work = makeSourceWork({ clientId: parent._id, catalogueGroups: ['Group B'] });
      const childInstance = makeChildWorkInstance();
      const { Work } = makeWorkModel(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('propagates to all matching child clients', async () => {
      const parent = makeClient();
      const child1 = makeClient([{ clientId: parent._id.toString(), transferWorks: true }]);
      const child2 = makeClient([{ clientId: parent._id.toString(), transferWorks: true }]);
      const work = makeSourceWork({ clientId: parent._id });

      const instance1 = makeChildWorkInstance();
      const instance2 = makeChildWorkInstance();
      let callCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Work: any = jest.fn().mockImplementation(() => (callCount++ === 0 ? instance1 : instance2));
      Work.findOne = jest.fn().mockResolvedValue(null);
      Work.updateOne = jest.fn().mockResolvedValue(undefined);
      const Client = makeClientModel(parent, [child1, child2]);

      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(instance1.save).toHaveBeenCalled();
      expect(instance2.save).toHaveBeenCalled();
    });
  });

  describe('copy fidelity', () => {
    it('sets clientId on the child work to the child client ID', async () => {
      const { child, work, childInstance, Work, Client } = makeBasicScenario();
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(String(childInstance.clientId)).toBe(child._id.toString());
    });

    it('sets duplicatedFrom on the child work to the source work ID', async () => {
      const { work, childInstance, Work, Client } = makeBasicScenario();
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(String(childInstance.duplicatedFrom)).toBe(work._id.toString());
    });

    it('copies the title to the child work', async () => {
      const title = randomString();
      const { work, childInstance, Work, Client } = makeBasicScenario({ title });
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.title).toBe(title);
    });
  });

  describe('accumulating fields', () => {
    it('appends source aliases to the child work', async () => {
      const { work, childInstance, Work, Client } = makeBasicScenario({ aliases: ['ALIAS ONE', 'ALIAS TWO'] });
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(childInstance.aliases).toEqual(expect.arrayContaining(['ALIAS ONE', 'ALIAS TWO']));
    });

    it('does not add duplicate aliases already present on the child', async () => {
      const { work, Work, Client } = makeBasicScenario({ aliases: ['ALIAS ONE'] });
      const childInstance = makeChildWorkInstance({ aliases: ['ALIAS ONE'] });
      Work.mockImplementation(() => childInstance);
      Work.findOne.mockResolvedValue(null);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      const count = (childInstance.aliases as string[]).filter((a) => a === 'ALIAS ONE').length;
      expect(count).toBe(1);
    });

    it('appends source societyIdentifiers to the child work', async () => {
      const { work, childInstance, Work, Client } = makeBasicScenario({
        societyIdentifiers: [{ society: 'PRS', identifier: 'PRS00001' }],
      });
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect((childInstance.societyIdentifiers as { identifier: string }[])[0]!.identifier).toBe('PRS00001');
    });

    it('does not add duplicate societyIdentifiers already present on the child', async () => {
      const existing = { society: 'PRS', identifier: 'PRS00001' };
      const { work, Work, Client } = makeBasicScenario({ societyIdentifiers: [existing] });
      const childInstance = makeChildWorkInstance({ societyIdentifiers: [existing] });
      Work.mockImplementation(() => childInstance);
      Work.findOne.mockResolvedValue(null);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      const count = (childInstance.societyIdentifiers as (typeof existing)[]).filter(
        (s) => s.identifier === 'PRS00001'
      ).length;
      expect(count).toBe(1);
    });
  });

  describe('idempotency', () => {
    it('updates an existing child work rather than creating a new one', async () => {
      const { work, Work, Client } = makeBasicScenario();
      const existingChild = makeChildWorkInstance();
      Work.findOne.mockResolvedValue(existingChild);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(Work).not.toHaveBeenCalled(); // new Work() not called
      expect(existingChild.save).toHaveBeenCalled();
    });

    it('reflects the updated title in the existing child work', async () => {
      const title = randomString();
      const { work, Work, Client } = makeBasicScenario({ title });
      const existingChild = makeChildWorkInstance({ title: 'old title' });
      Work.findOne.mockResolvedValue(existingChild);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(existingChild.title).toBe(title);
    });
  });

  describe('copyTracks', () => {
    it('creates a new track in the child client and links it to the child work', async () => {
      const trackId = randomId();
      const { work, childInstance, Work, Client } = makeBasicScenario({ trackIds: [trackId] });
      const sourceTrack = { _id: trackId, isrc: randomString(), clientId: work.clientId };
      const { Track, newTrackInstance } = makeTrackModel([sourceTrack]);
      await propagateWork({ work: asWork(work), Work, Client, Track, ...makeComposerPublisherTerritoryModels() });
      expect(newTrackInstance.save).toHaveBeenCalled();
      expect(childInstance.trackIds as string[]).toContain(newTrackInstance._id.toString());
    });

    it('reuses an existing track in the child client matched by ISRC', async () => {
      const trackId = randomId();
      const isrc = randomString();
      const { work, childInstance, Work, Client } = makeBasicScenario({ trackIds: [trackId] });
      const sourceTrack = { _id: trackId, isrc, clientId: work.clientId };
      const existingChildTrackId = randomId();
      const existingChildTrack = { _id: existingChildTrackId };
      const { Track, newTrackInstance } = makeTrackModel([sourceTrack], existingChildTrack);
      await propagateWork({ work: asWork(work), Work, Client, Track, ...makeComposerPublisherTerritoryModels() });
      expect(newTrackInstance.save).not.toHaveBeenCalled();
      expect(childInstance.trackIds as string[]).toContain(existingChildTrackId.toString());
    });

    it('does not add a track ID that is already in the child work trackIds', async () => {
      const trackId = randomId();
      const existingChildTrackId = randomId();
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferWorks: true }]);
      const work = makeSourceWork({ clientId: parent._id, trackIds: [trackId] });
      const childInstance = makeChildWorkInstance({ trackIds: [existingChildTrackId.toString()] });
      const { Work } = makeWorkModel(childInstance);
      const Client = makeClientModel(parent, [child]);
      const sourceTrack = { _id: trackId, isrc: randomString() };
      const existingChildTrack = { _id: existingChildTrackId };
      const { Track } = makeTrackModel([sourceTrack], existingChildTrack);
      await propagateWork({ work: asWork(work), Work, Client, Track, ...makeComposerPublisherTerritoryModels() });
      const count = (childInstance.trackIds as string[]).filter((id) => id === existingChildTrackId.toString()).length;
      expect(count).toBe(1);
    });

    it('swallows track save errors so one bad track does not block the others', async () => {
      const trackId1 = randomId();
      const trackId2 = randomId();
      const { work, childInstance, Work, Client } = makeBasicScenario({ trackIds: [trackId1, trackId2] });
      const sourceTracks = [
        { _id: trackId1, isrc: randomString() },
        { _id: trackId2, isrc: randomString() },
      ];

      let callCount = 0;
      const goodTrackId = randomId();
      const failInstance = {
        _id: randomId(),
        save: jest.fn().mockRejectedValue(new Error('track save failed')),
        copyValues: jest.fn().mockImplementation((_t: unknown, _c: unknown, cb: () => void) => cb()),
      };
      const goodInstance = {
        _id: goodTrackId,
        save: jest.fn().mockResolvedValue({ _id: goodTrackId }),
        copyValues: jest.fn().mockImplementation((_t: unknown, _c: unknown, cb: () => void) => cb()),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Track: any = jest.fn().mockImplementation(() => (callCount++ === 0 ? failInstance : goodInstance));
      Track.find = jest.fn().mockResolvedValue(sourceTracks);
      Track.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        propagateWork({ work: asWork(work), Work, Client, Track, ...makeComposerPublisherTerritoryModels() })
      ).resolves.not.toThrow();
      expect(childInstance.trackIds as string[]).toContain(goodTrackId.toString());
    });
  });

  describe('copyIpChain — publishers', () => {
    it('creates a new publisher in the child client', async () => {
      const publisherId = randomId();
      const { work, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithPublisher(publisherId.toString()),
      });
      const originalPublisher = makePublisher({ _id: publisherId });
      const { Publisher, newInstance } = makePublisherModel();
      Publisher.findById.mockResolvedValue(originalPublisher);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackComposerTerritoryModels(), Publisher });
      expect(newInstance.save).toHaveBeenCalled();
    });

    it('remaps publisherId in the copied chain to the child publisher ID', async () => {
      const publisherId = randomId();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithPublisher(publisherId.toString()),
      });
      const originalPublisher = makePublisher({ _id: publisherId });
      const { Publisher, newInstance } = makePublisherModel();
      Publisher.findById.mockResolvedValue(originalPublisher);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackComposerTerritoryModels(), Publisher });
      const chain = childInstance.rightsChain as { children: { publisherId: string }[] }[];
      expect(chain[0]!.children[0]!.publisherId).toBe(newInstance._id.toString());
    });

    it('reuses an existing publisher matched by duplicatedFrom', async () => {
      const publisherId = randomId();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithPublisher(publisherId.toString()),
      });
      const existingChildPublisherId = randomId();
      const existingChildPublisher = { _id: existingChildPublisherId };
      const { Publisher, newInstance } = makePublisherModel();
      Publisher.findOne.mockResolvedValue(existingChildPublisher);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackComposerTerritoryModels(), Publisher });
      expect(newInstance.save).not.toHaveBeenCalled();
      const chain = childInstance.rightsChain as { children: { publisherId: string }[] }[];
      expect(chain[0]!.children[0]!.publisherId).toBe(existingChildPublisherId.toString());
    });

    it('reuses an existing publisher matched by name when no duplicatedFrom match exists', async () => {
      const publisherId = randomId();
      const publisherName = randomString();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithPublisher(publisherId.toString()),
      });
      const originalPublisher = makePublisher({ _id: publisherId, name: publisherName });
      const existingChildPublisherId = randomId();
      const existingChildPublisher = { _id: existingChildPublisherId, name: publisherName };
      const { Publisher, newInstance } = makePublisherModel();
      Publisher.findOne
        .mockResolvedValueOnce(null) // duplicatedFrom check
        .mockResolvedValueOnce(existingChildPublisher); // name check
      Publisher.findById.mockResolvedValue(originalPublisher);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackComposerTerritoryModels(), Publisher });
      expect(newInstance.save).not.toHaveBeenCalled();
      const chain = childInstance.rightsChain as { children: { publisherId: string }[] }[];
      expect(chain[0]!.children[0]!.publisherId).toBe(existingChildPublisherId.toString());
    });
  });

  describe('copyIpChain — composers', () => {
    it('creates a new composer in the child client', async () => {
      const composerId = randomId();
      const { work, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithComposer(composerId.toString()),
      });
      const originalComposer = makeComposer({ _id: composerId });
      const { Composer, newInstance } = makeComposerModel();
      Composer.findById.mockResolvedValue(originalComposer);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackPublisherTerritoryModels(), Composer });
      expect(newInstance.save).toHaveBeenCalled();
    });

    it('remaps composerId in the copied chain to the child composer ID', async () => {
      const composerId = randomId();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithComposer(composerId.toString()),
      });
      const originalComposer = makeComposer({ _id: composerId });
      const { Composer, newInstance } = makeComposerModel();
      Composer.findById.mockResolvedValue(originalComposer);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackPublisherTerritoryModels(), Composer });
      const chain = childInstance.rightsChain as { children: { composerId: string }[] }[];
      expect(chain[0]!.children[0]!.composerId).toBe(newInstance._id.toString());
    });

    it('reuses an existing composer matched by duplicatedFrom', async () => {
      const composerId = randomId();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithComposer(composerId.toString()),
      });
      const existingChildComposerId = randomId();
      const existingChildComposer = { _id: existingChildComposerId };
      const { Composer, newInstance } = makeComposerModel();
      Composer.findOne.mockResolvedValue(existingChildComposer);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackPublisherTerritoryModels(), Composer });
      expect(newInstance.save).not.toHaveBeenCalled();
      const chain = childInstance.rightsChain as { children: { composerId: string }[] }[];
      expect(chain[0]!.children[0]!.composerId).toBe(existingChildComposerId.toString());
    });

    it('reuses an existing composer matched by CAE', async () => {
      const composerId = randomId();
      const cae = '12345678901';
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithComposer(composerId.toString()),
      });
      const originalComposer = makeComposer({ _id: composerId, cae });
      const existingChildComposerId = randomId();
      const existingChildComposer = { _id: existingChildComposerId, cae };
      const { Composer, newInstance } = makeComposerModel();
      Composer.findOne
        .mockResolvedValueOnce(null) // duplicatedFrom check
        .mockResolvedValueOnce(existingChildComposer); // CAE match
      Composer.findById.mockResolvedValue(originalComposer);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackPublisherTerritoryModels(), Composer });
      expect(newInstance.save).not.toHaveBeenCalled();
      const chain = childInstance.rightsChain as { children: { composerId: string }[] }[];
      expect(chain[0]!.children[0]!.composerId).toBe(existingChildComposerId.toString());
    });

    it('reuses an existing composer matched by name when CAE is absent', async () => {
      const composerId = randomId();
      const composerName = randomString();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithComposer(composerId.toString()),
      });
      const originalComposer = makeComposer({ _id: composerId, name: composerName, cae: undefined });
      const existingChildComposerId = randomId();
      const existingChildComposer = { _id: existingChildComposerId, name: composerName, cae: null };
      const { Composer, newInstance } = makeComposerModel();
      Composer.findOne
        .mockResolvedValueOnce(null) // duplicatedFrom check
        .mockResolvedValueOnce(existingChildComposer); // name match
      Composer.findById.mockResolvedValue(originalComposer);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackPublisherTerritoryModels(), Composer });
      expect(newInstance.save).not.toHaveBeenCalled();
      const chain = childInstance.rightsChain as { children: { composerId: string }[] }[];
      expect(chain[0]!.children[0]!.composerId).toBe(existingChildComposerId.toString());
    });

    it('reuses an existing composer when parent CAE has leading zeros and child CAE does not', async () => {
      const composerId = randomId();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithComposer(composerId.toString()),
      });
      // Parent '00012345678' -> stripped '12345678'; child stored as '12345678'
      const originalComposer = makeComposer({
        _id: composerId,
        cae: '00012345678',
        caeWithoutLeadingZeros: '12345678',
      });
      const existingChildComposerId = randomId();
      const existingChildComposer = { _id: existingChildComposerId, cae: '12345678' };
      const { Composer, newInstance } = makeComposerModel();
      Composer.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existingChildComposer);
      Composer.findById.mockResolvedValue(originalComposer);
      await propagateWork({ work: asWork(work), Work, Client, ...makeTrackPublisherTerritoryModels(), Composer });
      expect(newInstance.save).not.toHaveBeenCalled();
      const chain = childInstance.rightsChain as { children: { composerId: string }[] }[];
      expect(chain[0]!.children[0]!.composerId).toBe(existingChildComposerId.toString());
    });
  });

  describe('copyIpChain — nested publisher -> composer chain', () => {
    it('copies both publisher and nested composer and remaps their IDs', async () => {
      const publisherId = randomId();
      const composerId = randomId();
      const nestedChain = [
        {
          territory: 'WW',
          children: [
            {
              type: 'Publisher',
              publisherId: publisherId.toString(),
              children: [{ type: 'Composer', composerId: composerId.toString(), children: [] }],
            },
          ],
        },
      ];
      const { work, childInstance, Work, Client } = makeBasicScenario({ rightsChain: nestedChain });

      const originalPublisher = makePublisher({ _id: publisherId });
      const newPublisherId = randomId();
      const newPublisherInstance = { _id: newPublisherId, save: jest.fn().mockResolvedValue({ _id: newPublisherId }) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Publisher: any = jest.fn().mockImplementation(() => newPublisherInstance);
      Publisher.findOne = jest.fn().mockResolvedValue(null);
      Publisher.findById = jest.fn().mockResolvedValue(originalPublisher);

      const originalComposer = makeComposer({ _id: composerId });
      const newComposerId = randomId();
      const newComposerInstance = { _id: newComposerId, save: jest.fn().mockResolvedValue({ _id: newComposerId }) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Composer: any = jest.fn().mockImplementation(() => newComposerInstance);
      Composer.findOne = jest.fn().mockResolvedValue(null);
      Composer.findById = jest.fn().mockResolvedValue(originalComposer);

      await propagateWork({
        work: asWork(work),
        Work,
        Client,
        Track: makeTrackModel().Track,
        Composer,
        Publisher,
        TerritoryGroup: makeTerritoryGroupModel().TerritoryGroup,
      });

      const chain = childInstance.rightsChain as {
        children: { publisherId: string; children: { composerId: string }[] }[];
      }[];
      expect(chain[0]!.children[0]!.publisherId).toBe(newPublisherId.toString());
      expect(chain[0]!.children[0]!.children[0]!.composerId).toBe(newComposerId.toString());
    });
  });

  describe('copyChainTerritory', () => {
    it('leaves a standard territory code unchanged in the chain', async () => {
      const publisherId = randomId();
      // 'WW' is not a 24-char ObjectId -- should be preserved as-is
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithPublisher(publisherId.toString()),
      });
      const originalPublisher = makePublisher({ _id: publisherId });
      const { Publisher } = makePublisherModel();
      Publisher.findById.mockResolvedValue(originalPublisher);
      await propagateWork({
        work: asWork(work),
        Work,
        Client,
        Track: makeTrackModel().Track,
        Composer: makeComposerModel().Composer,
        Publisher,
        TerritoryGroup: makeTerritoryGroupModel().TerritoryGroup,
      });
      const chain = childInstance.rightsChain as { territory: string }[];
      expect(chain[0]!.territory).toBe('WW');
    });

    it('creates a new TerritoryGroup in the child client when the territory is a TerritoryGroup ID', async () => {
      const publisherId = randomId();
      const territoryGroupId = randomId(); // valid 24-char ObjectId
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithTerritoryGroup(territoryGroupId.toString(), publisherId.toString()),
      });
      const originalPublisher = makePublisher({ _id: publisherId });
      const { Publisher } = makePublisherModel();
      Publisher.findById.mockResolvedValue(originalPublisher);

      const originalGroup = makeTerritoryGroup({ _id: territoryGroupId });
      const { TerritoryGroup, newInstance } = makeTerritoryGroupModel();
      TerritoryGroup.findById.mockResolvedValue(originalGroup);

      await propagateWork({
        work: asWork(work),
        Work,
        Client,
        Track: makeTrackModel().Track,
        Composer: makeComposerModel().Composer,
        Publisher,
        TerritoryGroup,
      });

      expect(newInstance.save).toHaveBeenCalled();
      const chain = childInstance.rightsChain as { territory: string }[];
      expect(chain[0]!.territory).toBe(newInstance._id.toString());
    });

    it('reuses an existing TerritoryGroup in the child client matched by name', async () => {
      const publisherId = randomId();
      const territoryGroupId = randomId();
      const groupName = randomString();
      const { work, childInstance, Work, Client } = makeBasicScenario({
        rightsChain: buildChainWithTerritoryGroup(territoryGroupId.toString(), publisherId.toString()),
      });
      const originalPublisher = makePublisher({ _id: publisherId });
      const { Publisher } = makePublisherModel();
      Publisher.findById.mockResolvedValue(originalPublisher);

      const originalGroup = makeTerritoryGroup({ _id: territoryGroupId, name: groupName });
      const existingChildGroupId = randomId();
      const existingChildGroup = { _id: existingChildGroupId, name: groupName };
      const { TerritoryGroup, newInstance } = makeTerritoryGroupModel();
      TerritoryGroup.findById.mockResolvedValue(originalGroup);
      TerritoryGroup.findOne.mockResolvedValue(existingChildGroup);

      await propagateWork({
        work: asWork(work),
        Work,
        Client,
        Track: makeTrackModel().Track,
        Composer: makeComposerModel().Composer,
        Publisher,
        TerritoryGroup,
      });

      expect(newInstance.save).not.toHaveBeenCalled();
      const chain = childInstance.rightsChain as { territory: string }[];
      expect(chain[0]!.territory).toBe(existingChildGroupId.toString());
    });
  });

  describe('error handling', () => {
    it('appends a validationError to the parent work when saving the child fails', async () => {
      const { work, Work, Client } = makeBasicScenario();
      const failingChild = makeChildWorkInstance({
        save: jest.fn().mockRejectedValue(new Error('unique key violation')),
      });
      Work.mockImplementation(() => failingChild);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect((work.validationErrors as string[]).some((e) => e.includes('Failed syncing to'))).toBe(true);
    });

    it('calls Work.updateOne to persist the validationError on the parent work', async () => {
      const { work, Work, Client } = makeBasicScenario();
      const failingChild = makeChildWorkInstance({ save: jest.fn().mockRejectedValue(new Error('save failed')) });
      Work.mockImplementation(() => failingChild);
      await propagateWork({ work: asWork(work), Work, Client, ...makeDefaultModels() });
      expect(Work.updateOne).toHaveBeenCalledWith(
        { _id: work._id },
        { $set: { validationErrors: work.validationErrors } }
      );
    });
  });
});
