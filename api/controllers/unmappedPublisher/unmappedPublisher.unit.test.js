const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const UnmappedPublisherController = require('./unmappedPublisher');
const UnmappedPublisher = require('../../models/unmappedPublisher');
const Publisher = require('../../models/publisher');

jest.mock('../../models/unmappedPublisher');
jest.mock('../../models/publisher');

describe('UnmappedPublisherController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('paramsToFilterField', () => {
    const user = { clientId: randomId().toString() };

    it('should always include clientId from the user', () => {
      const filter = UnmappedPublisherController.paramsToFilterField({}, user);
      expect(filter.clientId).toBe(user.clientId);
    });

    it('should filter by salesFileId when provided', () => {
      const salesFileId = randomId().toString();
      const filter = UnmappedPublisherController.paramsToFilterField({ salesFileId }, user);
      expect(filter.salesFileId).toBe(salesFileId);
    });

    it('should filter by salesFileIds array when provided', () => {
      const salesFileIds = [randomId().toString(), randomId().toString()];
      const filter = UnmappedPublisherController.paramsToFilterField({ salesFileIds }, user);
      expect(filter.salesFileId).toEqual({ $in: salesFileIds });
    });

    it('should set complete: true when complete param is "true"', () => {
      const filter = UnmappedPublisherController.paramsToFilterField({ complete: 'true' }, user);
      expect(filter.complete).toBe(true);
    });

    it('should set complete: { $ne: true } when complete param is "false"', () => {
      const filter = UnmappedPublisherController.paramsToFilterField({ complete: 'false' }, user);
      expect(filter.complete).toEqual({ $ne: true });
    });

    it('should not set complete filter when param is absent', () => {
      const filter = UnmappedPublisherController.paramsToFilterField({}, user);
      expect(filter.complete).toBeUndefined();
    });

    it('should add a case-insensitive name regex filter when text is provided', () => {
      const filter = UnmappedPublisherController.paramsToFilterField({ text: 'sony' }, user);
      expect(filter.name).toEqual({ $regex: expect.any(RegExp) });
      expect(filter.name.$regex.source).toBe('sony');
      expect(filter.name.$regex.flags).toContain('i');
    });

    it('should escape special regex characters in the text param', () => {
      const filter = UnmappedPublisherController.paramsToFilterField({ text: 'sony (uk)' }, user);
      expect(filter.name.$regex.source).toBe('sony \\(uk\\)');
    });
  });

  describe('mapToExisting', () => {
    const clientId = randomId().toString();
    const publisherId = randomId().toString();
    const unmappedPublisherId = randomId().toString();
    const publisherName = randomString();

    const mockUnmappedPublisher = {
      _id: unmappedPublisherId,
      name: publisherName,
      clientId,
      save: jest.fn().mockResolvedValue({}),
    };

    const mockTargetPublisher = {
      _id: publisherId,
      name: randomString(),
      lowerCaseName: randomString(),
      aliases: [],
    };

    it('should throw 404 when the unmapped publisher is not found', async () => {
      UnmappedPublisher.findOne.mockResolvedValue(null);

      await expect(
        UnmappedPublisherController.mapToExisting({ unmappedPublisherId, publisherId, clientId }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when the target publisher is not found', async () => {
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne.mockResolvedValueOnce(null); // target not found

      await expect(
        UnmappedPublisherController.mapToExisting({ unmappedPublisherId, publisherId, clientId }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 409 when another publisher already holds the name as an alias or primary name', async () => {
      const conflicting = { _id: randomId(), name: randomString() };
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne
        .mockResolvedValueOnce(mockTargetPublisher) // target found
        .mockResolvedValueOnce(conflicting); // conflict found

      await expect(
        UnmappedPublisherController.mapToExisting({ unmappedPublisherId, publisherId, clientId }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should add the name as an alias and mark complete when no conflict exists', async () => {
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne
        .mockResolvedValueOnce(mockTargetPublisher) // target found
        .mockResolvedValueOnce(null); // no conflict
      Publisher.findOneAndUpdate.mockResolvedValue({});

      const result = await UnmappedPublisherController.mapToExisting({
        unmappedPublisherId, publisherId, clientId,
      });

      expect(Publisher.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: { $eq: publisherId }, clientId: { $eq: clientId } },
        { $addToSet: { aliases: publisherName } },
      );
      expect(mockUnmappedPublisher.save).toHaveBeenCalled();
      expect(mockUnmappedPublisher.complete).toBe(true);
      expect(mockUnmappedPublisher.publisherId).toBe(publisherId);
      expect(result.unmappedPublisher).toBe(mockUnmappedPublisher);
    });

    it('should skip $addToSet when the alias is already present on the target publisher', async () => {
      const alreadyAliased = {
        ...mockTargetPublisher,
        aliases: [publisherName],
      };
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne
        .mockResolvedValueOnce(alreadyAliased);

      await UnmappedPublisherController.mapToExisting({ unmappedPublisherId, publisherId, clientId });

      expect(Publisher.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mockUnmappedPublisher.complete).toBe(true);
    });

    it('should succeed when the alias is already on the target even if another publisher holds the same alias', async () => {
      const alreadyAliased = {
        ...mockTargetPublisher,
        aliases: [publisherName],
      };
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne
        .mockResolvedValueOnce(alreadyAliased);

      const result = await UnmappedPublisherController.mapToExisting({
        unmappedPublisherId, publisherId, clientId,
      });

      expect(Publisher.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mockUnmappedPublisher.complete).toBe(true);
      expect(mockUnmappedPublisher.publisherId).toBe(publisherId);
      expect(result.unmappedPublisher).toBe(mockUnmappedPublisher);
    });

    it('should skip $addToSet when the name matches the target publisher primary name', async () => {
      const targetWithMatchingName = {
        ...mockTargetPublisher,
        lowerCaseName: publisherName.toLowerCase(),
        aliases: [],
      };
      const unmapped = { ...mockUnmappedPublisher, name: publisherName, save: jest.fn().mockResolvedValue({}) };
      UnmappedPublisher.findOne.mockResolvedValue(unmapped);
      Publisher.findOne
        .mockResolvedValueOnce(targetWithMatchingName);

      await UnmappedPublisherController.mapToExisting({ unmappedPublisherId, publisherId, clientId });

      expect(Publisher.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('createNew', () => {
    const clientId = randomId().toString();
    const userId = randomId().toString();
    const unmappedPublisherId = randomId().toString();
    const publisherName = randomString();

    const mockUnmappedPublisher = {
      _id: unmappedPublisherId,
      name: publisherName,
      clientId,
      save: jest.fn().mockResolvedValue({}),
    };

    const savedPublisher = { _id: randomId(), name: publisherName };

    it('should throw 404 when the unmapped publisher is not found', async () => {
      UnmappedPublisher.findOne.mockResolvedValue(null);

      await expect(
        UnmappedPublisherController.createNew({ unmappedPublisherId, clientId, userId }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 409 when a publisher with the same name already exists', async () => {
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne.mockResolvedValue({ _id: randomId(), name: publisherName });

      await expect(
        UnmappedPublisherController.createNew({ unmappedPublisherId, clientId, userId }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should create a publisher and mark the unmapped publisher complete on success', async () => {
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne.mockResolvedValue(null); // no existing publisher

      const mockSave = jest.fn().mockResolvedValue(savedPublisher);
      Publisher.mockImplementation(() => ({ save: mockSave }));

      const result = await UnmappedPublisherController.createNew({ unmappedPublisherId, clientId, userId });

      expect(Publisher).toHaveBeenCalledWith(expect.objectContaining({
        clientId,
        name: publisherName,
        lowerCaseName: publisherName.toLowerCase(),
        aliases: [],
        createdBy: userId,
        lastModifiedBy: userId,
      }));
      expect(mockSave).toHaveBeenCalled();
      expect(mockUnmappedPublisher.complete).toBe(true);
      expect(result.unmappedPublisher).toBe(mockUnmappedPublisher);
    });

    it('should include the 409 message text suggesting the user map to the existing publisher', async () => {
      UnmappedPublisher.findOne.mockResolvedValue(mockUnmappedPublisher);
      Publisher.findOne.mockResolvedValue({ _id: randomId(), name: publisherName });

      await expect(
        UnmappedPublisherController.createNew({ unmappedPublisherId, clientId, userId }),
      ).rejects.toThrow('Use the search box to map to it instead.');
    });
  });
});
