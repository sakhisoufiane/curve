const { ObjectId } = require('mongodb');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const PublisherController = require('../../controllers/publisher');
const resolvePublishersByName = require('./resolvePublishersByName');

jest.mock('../../controllers/publisher', () => ({
  resolvePublisherByName: jest.fn(),
}));

describe('resolvePublishersByName', () => {
  let clientId;
  let publisherId;
  let publisherName;

  beforeEach(() => {
    clientId = randomId();
    publisherId = new ObjectId();
    publisherName = randomString();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when resolving a single publisher', () => {
    it('should resolve a publisher by name', async () => {
      PublisherController.resolvePublisherByName.mockResolvedValue({ _id: publisherId, name: publisherName });

      const result = await resolvePublishersByName({
        publisherNames: [publisherName],
        clientId,
      });

      expect(result.publisherIds).toEqual([publisherId.toString()]);
      expect(result.errors).toEqual([]);
      expect(PublisherController.resolvePublisherByName).toHaveBeenCalledTimes(1);
      expect(PublisherController.resolvePublisherByName).toHaveBeenCalledWith({
        clientId,
        name: publisherName,
      });
    });
  });

  describe('when resolving multiple publishers', () => {
    it('should resolve all publishers and preserve input order', async () => {
      const id2 = new ObjectId();
      const id3 = new ObjectId();
      const name2 = randomString();
      const name3 = randomString();

      PublisherController.resolvePublisherByName
        .mockResolvedValueOnce({ _id: publisherId, name: publisherName })
        .mockResolvedValueOnce({ _id: id2, name: name2 })
        .mockResolvedValueOnce({ _id: id3, name: name3 });

      const result = await resolvePublishersByName({
        publisherNames: [publisherName, name2, name3],
        clientId,
      });

      expect(result.publisherIds).toEqual([publisherId.toString(), id2.toString(), id3.toString()]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('when publishers cannot be resolved', () => {
    it('should return an error for an unresolved publisher name', async () => {
      PublisherController.resolvePublisherByName.mockResolvedValue(null);

      const result = await resolvePublishersByName({
        publisherNames: [publisherName],
        clientId,
      });

      expect(result.publisherIds).toEqual([]);
      expect(result.errors).toEqual([`Publisher '${publisherName}' not found`]);
    });

    it('should return errors only for unresolved names and IDs for resolved ones', async () => {
      const unknownName = randomString();

      PublisherController.resolvePublisherByName
        .mockResolvedValueOnce({ _id: publisherId, name: publisherName })
        .mockResolvedValueOnce(null);

      const result = await resolvePublishersByName({
        publisherNames: [publisherName, unknownName],
        clientId,
      });

      expect(result.publisherIds).toEqual([publisherId.toString()]);
      expect(result.errors).toEqual([`Publisher '${unknownName}' not found`]);
    });

    it('should return multiple errors when multiple publishers are unresolved', async () => {
      const unknownName = randomString();
      PublisherController.resolvePublisherByName.mockResolvedValue(null);

      const result = await resolvePublishersByName({
        publisherNames: [publisherName, unknownName],
        clientId,
      });

      expect(result.publisherIds).toEqual([]);
      expect(result.errors).toEqual([
        `Publisher '${publisherName}' not found`,
        `Publisher '${unknownName}' not found`,
      ]);
    });
  });

  describe('edge cases', () => {
    it('should return empty results for an empty array', async () => {
      const result = await resolvePublishersByName({
        publisherNames: [],
        clientId,
      });

      expect(result.publisherIds).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(PublisherController.resolvePublisherByName).not.toHaveBeenCalled();
    });

    it('should handle null, undefined, and numeric values in the names array', async () => {
      PublisherController.resolvePublisherByName.mockResolvedValue({ _id: publisherId, name: publisherName });

      const result = await resolvePublishersByName({
        publisherNames: [null, undefined, 123, publisherName],
        clientId,
      });

      // null and undefined skipped, 123 coerced to '123' and resolved, publisherName resolved
      expect(result.publisherIds).toEqual([publisherId.toString(), publisherId.toString()]);
      expect(result.errors).toEqual([]);
      expect(PublisherController.resolvePublisherByName).toHaveBeenCalledTimes(2);
      expect(PublisherController.resolvePublisherByName).toHaveBeenCalledWith({ clientId, name: '123' });
    });

    it('should skip empty strings and whitespace-only entries', async () => {
      PublisherController.resolvePublisherByName.mockResolvedValue({ _id: publisherId, name: publisherName });

      const result = await resolvePublishersByName({
        publisherNames: ['', '  ', publisherName, ''],
        clientId,
      });

      expect(result.publisherIds).toEqual([publisherId.toString()]);
      expect(result.errors).toEqual([]);
      expect(PublisherController.resolvePublisherByName).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from publisher names before resolving', async () => {
      PublisherController.resolvePublisherByName.mockResolvedValue({ _id: publisherId, name: publisherName });

      const result = await resolvePublishersByName({
        publisherNames: [`  ${publisherName}  `],
        clientId,
      });

      expect(result.publisherIds).toEqual([publisherId.toString()]);
      expect(PublisherController.resolvePublisherByName).toHaveBeenCalledWith({
        clientId,
        name: publisherName,
      });
    });

    it('should scope all lookups to the provided clientId', async () => {
      PublisherController.resolvePublisherByName.mockResolvedValue(null);

      await resolvePublishersByName({
        publisherNames: [publisherName],
        clientId,
      });

      expect(PublisherController.resolvePublisherByName).toHaveBeenCalledWith({
        clientId,
        name: publisherName,
      });
    });
  });
});
