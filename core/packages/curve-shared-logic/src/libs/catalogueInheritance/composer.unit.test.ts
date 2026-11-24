import { propagateComposer } from './composer';
import {
  randomString,
  asPublisher as asComposer,
  makeSourceComposer,
  makeChildComposerInstance,
  makeComposerModelForPropagation,
  makeClientModel,
  makeClient,
  makeBasicComposerScenario,
} from './testUtils';

describe('propagateComposer', () => {
  describe('client filtering', () => {
    it('does nothing when the parent client is not found', async () => {
      const composer = makeSourceComposer();
      const { Composer, childInstance } = makeComposerModelForPropagation();
      const Client = makeClientModel(null, []);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(Composer.findOne).not.toHaveBeenCalled();
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does nothing when no child clients inherit from the parent', async () => {
      const parent = makeClient();
      const composer = makeSourceComposer({ clientId: parent._id });
      const { Composer, childInstance } = makeComposerModelForPropagation();
      const Client = makeClientModel(parent, []);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does not propagate when transferComposers is false', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferComposers: false }]);
      const composer = makeSourceComposer({ clientId: parent._id });
      const { Composer, childInstance } = makeComposerModelForPropagation();
      const Client = makeClientModel(parent, [child]);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('propagates when transferComposers is true', async () => {
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario();
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('propagates when the composer belongs to the child catalogueGroup', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferComposers: true, catalogueGroup: 'Group A' }]);
      const composer = makeSourceComposer({ clientId: parent._id, catalogueGroups: ['Group A'] });
      const childInstance = makeChildComposerInstance();
      const { Composer } = makeComposerModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('does not propagate when the composer does not belong to the child catalogueGroup', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferComposers: true, catalogueGroup: 'Group B' }]);
      const composer = makeSourceComposer({ clientId: parent._id, catalogueGroups: ['Group A'] });
      const childInstance = makeChildComposerInstance();
      const { Composer } = makeComposerModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does not propagate when the child has a catalogueGroup filter but the composer has none', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferComposers: true, catalogueGroup: 'Group A' }]);
      const composer = makeSourceComposer({ clientId: parent._id, catalogueGroups: [] });
      const childInstance = makeChildComposerInstance();
      const { Composer } = makeComposerModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('propagates when only the second inheritCatalogueFrom entry matches', async () => {
      const parent = makeClient();
      const child = makeClient([
        { clientId: parent._id.toString(), transferComposers: true, catalogueGroup: 'Group A' },
        { clientId: parent._id.toString(), transferComposers: true, catalogueGroup: 'Group B' },
      ]);
      const composer = makeSourceComposer({ clientId: parent._id, catalogueGroups: ['Group B'] });
      const childInstance = makeChildComposerInstance();
      const { Composer } = makeComposerModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('propagates to all matching child clients', async () => {
      const parent = makeClient();
      const child1 = makeClient([{ clientId: parent._id.toString(), transferComposers: true }]);
      const child2 = makeClient([{ clientId: parent._id.toString(), transferComposers: true }]);
      const composer = makeSourceComposer({ clientId: parent._id });

      const instance1 = makeChildComposerInstance();
      const instance2 = makeChildComposerInstance();
      let callCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Composer: any = jest.fn().mockImplementation(() => (callCount++ === 0 ? instance1 : instance2));
      Composer.findOne = jest.fn().mockResolvedValue(null);
      const Client = makeClientModel(parent, [child1, child2]);

      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(instance1.save).toHaveBeenCalled();
      expect(instance2.save).toHaveBeenCalled();
    });
  });

  describe('copy fidelity', () => {
    it('sets clientId on the child composer to the child client ID', async () => {
      const { child, composer, childInstance, Composer, Client } = makeBasicComposerScenario();
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(String(childInstance.clientId)).toBe(child._id.toString());
    });

    it('sets duplicatedFrom on the child composer to the source composer ID', async () => {
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario();
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(String(childInstance.duplicatedFrom)).toBe(composer._id.toString());
    });

    it('copies name to the child composer', async () => {
      const name = randomString();
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario({ name });
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.name).toBe(name);
    });

    it('copies cae as-is to the child composer', async () => {
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario({ cae: 'ABC123' });
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.cae).toBe('ABC123');
    });

    it('copies controlled to the child composer', async () => {
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario({ controlled: true });
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.controlled).toBe(true);
    });

    it('copies notes to the child composer', async () => {
      const notes = randomString();
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario({ notes });
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.notes).toBe(notes);
    });

    it('copies firstName to the child composer', async () => {
      const firstName = randomString();
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario({ firstName });
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.firstName).toBe(firstName);
    });

    it('copies surname to the child composer', async () => {
      const surname = randomString();
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario({ surname });
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.surname).toBe(surname);
    });
  });

  describe('idempotency', () => {
    it('updates the existing child composer rather than creating a new one', async () => {
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario();
      Composer.findOne = jest.fn().mockResolvedValue(childInstance);
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(Composer).not.toHaveBeenCalled(); // constructor not called — existing doc reused
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('reflects updated values in the existing child composer', async () => {
      const newName = randomString();
      const { composer, childInstance, Composer, Client } = makeBasicComposerScenario();
      Composer.findOne = jest.fn().mockResolvedValue(childInstance);
      composer.name = newName;
      await propagateComposer({ composer: asComposer(composer), Composer, Client });
      expect(childInstance.name).toBe(newName);
    });
  });
});
