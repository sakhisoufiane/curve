const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const PublisherController = require('./publisher');
const Publisher = require('../../models/publisher');
const Client = require('../../models/client');

jest.mock('../../models/publisher');

const { randomId, randomString } = testUtils;

jest.mock('../../models/composer');
jest.mock('../../models/work');
jest.mock('../../models/client');

describe('PublisherController', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Publisher.findOne = jest.fn().mockResolvedValue(null);
    Client.find = jest.fn().mockResolvedValue([]);
  });

  describe('#copyValues', () => {
    it('should copy aliases when present on the source publisher', () => {
      const alias1 = randomString();
      const alias2 = randomString();
      const publisherToCopy = {
        _id: randomId(),
        name: randomString(),
        cae: randomString(),
        mainPro: 'PRS',
        mechanicalPro: null,
        performancePro: null,
        syncPro: null,
        mainProIdentifier: null,
        mechanicalProIdentifier: null,
        performanceProIdentifier: null,
        syncProIdentifier: null,
        controlled: true,
        notes: 'some notes',
        aliases: [alias1, alias2],
      };
      const target = {};

      PublisherController.copyValues({ publisherToCopy, clientId: randomId(), publisher: target });

      expect(target.aliases).toEqual([alias1, alias2]);
    });

    it('should default aliases to empty array when absent on the source publisher', () => {
      const publisherToCopy = {
        _id: randomId(),
        name: randomString(),
        cae: randomString(),
        mainPro: null,
        mechanicalPro: null,
        performancePro: null,
        syncPro: null,
        mainProIdentifier: null,
        mechanicalProIdentifier: null,
        performanceProIdentifier: null,
        syncProIdentifier: null,
        controlled: false,
        notes: '',
      };
      const target = {};

      PublisherController.copyValues({ publisherToCopy, clientId: randomId(), publisher: target });

      expect(target.aliases).toEqual([]);
    });

    it('should not mutate when publisherToCopy is null', () => {
      const target = { name: 'keep' };

      PublisherController.copyValues({ publisherToCopy: null, clientId: randomId(), publisher: target });

      expect(target.aliases).toBeUndefined();
      expect(target.name).toBe('keep');
    });
  });

  describe('#replacePublisherIDWithinIpChain', () => {
    it('should replace old publisher ids with new id and not update the composer', () => {
      const oldIds = ['oldPublisherId1', 'oldPublisherId2'];
      const primaryPublisher = { _id: 'newPublisherId1', cae: 'newCae1' };
      const chain = [
        {
          type: 'Publisher',
          children: [
            { type: 'Publisher', publisherId: 'oldPublisherId1', cae: 'oldCae1', children: [] },
            {
              type: 'Publisher',
              children: [
                { type: 'Composer', composerId: 'composerId', cae: 'composerCae', children: [] },
                { type: 'Publisher', publisherId: 'oldPublisherId2', cae: 'publisherCae', children: [] },
              ],
            },
          ],
        },
      ];

      const result = PublisherController.replacePublisherIDWithinIpChain(oldIds, primaryPublisher, chain);

      expect(result[0].children[0].publisherId).toBe('newPublisherId1');
      expect(result[0].children[0].cae).toBe('newCae1');
      expect(result[0].children[1].children[0].composerId).toBe('composerId');
      expect(result[0].children[1].children[0].cae).toBe('composerCae');
      expect(result[0].children[1].children[1].publisherId).toBe('newPublisherId1');
      expect(result[0].children[1].children[1].cae).toBe('newCae1');
    });

    it('should return the chain unchanged if no matching publisherId', () => {
      const oldIds = ['nonMatchingPublisherId'];
      const primaryPublisher = { _id: 'newPublisherId1', cae: 'newCae1' };
      const chain = [
        {
          type: 'Publisher',
          children: [
            { type: 'Publisher', publisherId: 'oldPublisherId1', cae: 'oldCae1', children: [] },
          ],
        },
      ];

      const result = PublisherController.replacePublisherIDWithinIpChain(oldIds, primaryPublisher, chain);

      expect(result[0].children[0].publisherId).toBe('oldPublisherId1');
      expect(result[0].children[0].cae).toBe('oldCae1');
    });

    it('should handle missing, undefined, or empty children', () => {
      const oldIds = ['oldPublisherId1', 'oldPublisherId2'];
      const primaryPublisher = { _id: 'newPublisherId1', cae: 'newCae1' };
      const chain = [
        {
          type: 'Publisher',
          children: [
            { type: 'Publisher', publisherId: 'oldPublisherId1', cae: 'oldCae1', children: undefined },
            {
              type: 'Publisher',
              children: [
                { type: 'Publisher', publisherId: 'oldPublisherId2', cae: 'oldCae2', children: [] },
                { type: 'Composer', children: undefined },
              ],
            },
            { type: 'Publisher', children: [] },
          ],
        },
      ];

      const result = PublisherController.replacePublisherIDWithinIpChain(oldIds, primaryPublisher, chain);

      expect(result[0].children[0].publisherId).toBe('newPublisherId1');
      expect(result[0].children[0].cae).toBe('newCae1');
      expect(result[0].children[1].children[0].publisherId).toBe('newPublisherId1');
      expect(result[0].children[1].children[0].cae).toBe('newCae1');
      expect(result[0].children[1].children[1].children).toBeUndefined();
      expect(result[0].children[2].children).toEqual([]);
    });
  });

  describe('#resolvePublisherByName', () => {
    it('should return null if clientId is missing', async () => {
      const result = await PublisherController.resolvePublisherByName({ clientId: null, name: randomString() });
      expect(result).toBeNull();
    });

    it('should return null if name is missing', async () => {
      const result = await PublisherController.resolvePublisherByName({ clientId: randomId(), name: '' });
      expect(result).toBeNull();
    });

    it('should find a publisher by primary name (case-insensitive)', async () => {
      const clientId = randomId();
      const pubName = randomString();
      const mockPublisher = { _id: randomId(), name: pubName, lowerCaseName: pubName.toLowerCase() };
      Publisher.findOne = jest.fn()
        .mockResolvedValueOnce(mockPublisher); // first call: by lowerCaseName

      const result = await PublisherController.resolvePublisherByName({ clientId, name: pubName.toUpperCase() });
      expect(result).toEqual(mockPublisher);
      expect(Publisher.findOne).toHaveBeenCalledWith({ clientId, lowerCaseName: pubName.toLowerCase() });
    });

    it('should fall back to alias lookup if primary name not found', async () => {
      const clientId = randomId();
      const aliasName = randomString();
      const mockPublisher = { _id: randomId(), name: randomString(), aliases: [aliasName] };
      Publisher.findOne = jest.fn()
        .mockResolvedValueOnce(null) // first call: by lowerCaseName — not found
        .mockResolvedValueOnce(mockPublisher); // second call: by alias regex

      const result = await PublisherController.resolvePublisherByName({ clientId, name: aliasName });
      expect(result).toEqual(mockPublisher);
      expect(Publisher.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null if neither name nor alias matches', async () => {
      const clientId = randomId();
      Publisher.findOne = jest.fn().mockResolvedValue(null);

      const result = await PublisherController.resolvePublisherByName({ clientId, name: randomString() });
      expect(result).toBeNull();
    });

    it('should escape regex special characters in the name for alias lookup', async () => {
      const clientId = randomId();
      Publisher.findOne = jest.fn()
        .mockResolvedValueOnce(null) // primary name — not found
        .mockResolvedValueOnce(null); // alias — not found

      await PublisherController.resolvePublisherByName({ clientId, name: 'Test (Music)' });
      const secondCall = Publisher.findOne.mock.calls[1][0];
      // The regex should have escaped the parentheses
      expect(secondCall.aliases.$regex.source).toContain('\\(');
      expect(secondCall.aliases.$regex.source).toContain('\\)');
    });
  });
});
