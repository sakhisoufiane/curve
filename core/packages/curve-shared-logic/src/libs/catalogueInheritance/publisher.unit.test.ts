import { propagatePublisher } from './publisher';
import {
  randomString,
  asPublisher,
  makeSourcePublisher,
  makeChildPublisherInstance,
  makePublisherModelForPropagation,
  makeClientModel,
  makeClient,
  makeBasicPublisherScenario,
} from './testUtils';

describe('propagatePublisher', () => {
  describe('client filtering', () => {
    it('does nothing when the parent client is not found', async () => {
      const publisher = makeSourcePublisher();
      const { Publisher, childInstance } = makePublisherModelForPropagation();
      const Client = makeClientModel(null, []);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(Publisher.findOne).not.toHaveBeenCalled();
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does nothing when no child clients inherit from the parent', async () => {
      const parent = makeClient();
      const publisher = makeSourcePublisher({ clientId: parent._id });
      const { Publisher, childInstance } = makePublisherModelForPropagation();
      const Client = makeClientModel(parent, []);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does not propagate when transferPublishers is false', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferPublishers: false }]);
      const publisher = makeSourcePublisher({ clientId: parent._id });
      const { Publisher, childInstance } = makePublisherModelForPropagation();
      const Client = makeClientModel(parent, [child]);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('propagates when transferPublishers is true', async () => {
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario();
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('propagates when the publisher belongs to the child catalogueGroup', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferPublishers: true, catalogueGroup: 'Group A' }]);
      const publisher = makeSourcePublisher({ clientId: parent._id, catalogueGroups: ['Group A'] });
      const childInstance = makeChildPublisherInstance();
      const { Publisher } = makePublisherModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('does not propagate when the publisher does not belong to the child catalogueGroup', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferPublishers: true, catalogueGroup: 'Group B' }]);
      const publisher = makeSourcePublisher({ clientId: parent._id, catalogueGroups: ['Group A'] });
      const childInstance = makeChildPublisherInstance();
      const { Publisher } = makePublisherModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('does not propagate when the child has a catalogueGroup filter but the publisher has none', async () => {
      const parent = makeClient();
      const child = makeClient([{ clientId: parent._id.toString(), transferPublishers: true, catalogueGroup: 'Group A' }]);
      const publisher = makeSourcePublisher({ clientId: parent._id, catalogueGroups: [] });
      const childInstance = makeChildPublisherInstance();
      const { Publisher } = makePublisherModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.save).not.toHaveBeenCalled();
    });

    it('propagates when only the second inheritCatalogueFrom entry matches', async () => {
      const parent = makeClient();
      const child = makeClient([
        { clientId: parent._id.toString(), transferPublishers: true, catalogueGroup: 'Group A' },
        { clientId: parent._id.toString(), transferPublishers: true, catalogueGroup: 'Group B' },
      ]);
      const publisher = makeSourcePublisher({ clientId: parent._id, catalogueGroups: ['Group B'] });
      const childInstance = makeChildPublisherInstance();
      const { Publisher } = makePublisherModelForPropagation(childInstance);
      const Client = makeClientModel(parent, [child]);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('propagates to all matching child clients', async () => {
      const parent = makeClient();
      const child1 = makeClient([{ clientId: parent._id.toString(), transferPublishers: true }]);
      const child2 = makeClient([{ clientId: parent._id.toString(), transferPublishers: true }]);
      const publisher = makeSourcePublisher({ clientId: parent._id });

      const instance1 = makeChildPublisherInstance();
      const instance2 = makeChildPublisherInstance();
      let callCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Publisher: any = jest.fn().mockImplementation(() => (callCount++ === 0 ? instance1 : instance2));
      Publisher.findOne = jest.fn().mockResolvedValue(null);
      const Client = makeClientModel(parent, [child1, child2]);

      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(instance1.save).toHaveBeenCalled();
      expect(instance2.save).toHaveBeenCalled();
    });
  });

  describe('copy fidelity', () => {
    it('sets clientId on the child publisher to the child client ID', async () => {
      const { child, publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario();
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(String(childInstance.clientId)).toBe(child._id.toString());
    });

    it('sets duplicatedFrom on the child publisher to the source publisher ID', async () => {
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario();
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(String(childInstance.duplicatedFrom)).toBe(publisher._id.toString());
    });

    it('copies name to the child publisher', async () => {
      const name = randomString();
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario({ name });
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.name).toBe(name);
    });

    it('pads and copies cae to the child publisher', async () => {
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario({ cae: '12345' });
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.cae).toBe('00000012345');
    });

    it('copies controlled to the child publisher', async () => {
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario({ controlled: true });
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.controlled).toBe(true);
    });

    it('copies notes to the child publisher', async () => {
      const notes = randomString();
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario({ notes });
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.notes).toBe(notes);
    });

    it('copies aliases to the child publisher', async () => {
      const aliases = [randomString(), randomString()];
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario({ aliases });
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.aliases).toEqual(aliases);
    });

    it('defaults aliases to an empty array when not set on the source publisher', async () => {
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario();
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.aliases).toEqual([]);
    });
  });

  describe('idempotency', () => {
    it('updates the existing child publisher rather than creating a new one', async () => {
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario();
      Publisher.findOne = jest.fn().mockResolvedValue(childInstance);
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(Publisher).not.toHaveBeenCalled(); // constructor not called — existing doc reused
      expect(childInstance.save).toHaveBeenCalled();
    });

    it('reflects updated values in the existing child publisher', async () => {
      const newName = randomString();
      const { publisher, childInstance, Publisher, Client } = makeBasicPublisherScenario();
      Publisher.findOne = jest.fn().mockResolvedValue(childInstance);
      publisher.name = newName;
      await propagatePublisher({ publisher: asPublisher(publisher), Publisher, Client });
      expect(childInstance.name).toBe(newName);
    });
  });
});
