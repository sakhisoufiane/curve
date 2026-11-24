jest.mock('@curveroyaltysystems/curve-shared-logic', () => ({
  ...jest.requireActual('@curveroyaltysystems/curve-shared-logic'),
  WriteCsv: jest.fn(),
}));

const { AtlasSearch, UserAccess, WorkController, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { randomString, randomId, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');

const workController = require('./work');
const Work = require('../../models/work');
const Track = require('../../models/track');
const DeliveredWork = require('../../models/deliveredWork');
const DeliveryPartner = require('../../models/deliveryPartner');
const RemovedDuplicateWork = require('../../models/removedDuplicateWork');
const Task = require('../../models/task');
const Client = require('../../models/client');
const Notification = require('../../models/notification');
const User = require('../../models/user');

describe('Work', () => {
  const workId = randomId();
  const clientId = randomId();
  const curveUser = { id: randomId(), clientId };

  beforeEach(() => {
    jest.spyOn(Work, 'findById').mockReturnValue({ populate: jest.fn().mockResolvedValue(undefined) });
    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(false);
  });

  describe('getWorkSource', () => {
    it('should throw error if work not found', async () => {
      await expect(workController.getWorkSource({ curveUser, workId }))
        .rejects
        .toThrow(`Could not find Work with ID ${workId}`);
    });

    it('should throw forbidden error if no rights', async () => {
      UserAccess.isUserForbidden.mockResolvedValue(true);
      Work.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({}) });

      await expect(workController.getWorkSource({ curveUser, workId }))
        .rejects
        .toThrow('Forbidden');
    });

    it('should return empty array if no source', async () => {
      Work.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({}) });
      const workSource = await workController.getWorkSource({ curveUser, workId });
      expect(workSource).toEqual([]);
    });

    it('should return empty array if source is empty array', async () => {
      Work.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({ source: [] }) });
      const workSource = await workController.getWorkSource({ curveUser, workId });
      expect(workSource).toEqual([]);
    });

    it('should return descending sorted array of formatted source data', async () => {
      const mockSource = [
        {
          importId: { name: randomString() },
          importPartnerId: { name: randomString() },
          action: randomString(),
          date: new Date('2024-12-10T17:19:27.287Z'),
        },
        {
          importId: { name: randomString() },
          importPartnerId: { name: randomString() },
          action: randomString(),
          date: new Date('2024-12-12T17:19:27.287Z'),
        },
      ];

      Work.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({ source: mockSource }) });

      const expectedWorkSource = mockSource
        .map((source) => ({
          importName: source.importId.name,
          importPartnerName: source.importPartnerId.name,
          action: source.action,
          date: source.date,
        }))
        .sort((a, b) => b.date - a.date);

      const workSource = await workController.getWorkSource({ curveUser, workId });

      expect(workSource).toEqual(expectedWorkSource);
    });
  });

  describe('createMissingTracksUsingWorks', () => {
    const mockClientId = randomId();
    const mockTracks = [
      {
        title: 'Track A',
        trackIsrcs: ['US-S1Z-99-00001', ' US S1Z 9900002 '],
      },
      {
        title: 'Track B',
        trackIsrcs: ['US-S1Z-99-00003'],
      },
      {
        title: 'Track A (Duplicate ISRC)',
        trackIsrcs: ['US-S1Z-99-00001'],
      },
    ];

    const normalizedIsrcs = ['USS1Z9900001', 'USS1Z9900002', 'USS1Z9900003'];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create tracks for missing ISRCs only', async () => {
      const existingTrack = { isrc: normalizedIsrcs[0] };

      jest.spyOn(Track, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([existingTrack]),
      });

      const saveMock = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(Track.prototype, 'save').mockImplementation(saveMock);

      await workController.createMissingTracksUsingWorks(mockClientId, mockTracks);

      expect(saveMock).toHaveBeenCalledTimes(2);

      const createdIsrcs = saveMock.mock.instances.map((instance) => instance.isrc);
      expect(createdIsrcs).toEqual(expect.arrayContaining([normalizedIsrcs[1], normalizedIsrcs[2]]));

      const createdTitles = saveMock.mock.instances.map((instance) => instance.title);
      expect(createdTitles).toEqual(expect.arrayContaining(['Track A', 'Track B']));
    });
  });

  describe('getDeliveriesFromMergedWorks', () => {
    it('should return an empty array if no delivered works found', async () => {
      // Arrange
      const work = new Work({ _id: workId, clientId });
      jest.spyOn(DeliveredWork, 'find').mockResolvedValue([]);
      // Act
      const result = await workController.getDeliveriesFromMergedWorks(work);
      // Assert
      expect(result).toEqual([]);
    });

    it('should return deliveries from delivered works', async () => {
      // Arrange
      const work = new Work({ _id: workId, clientId });
      const deliveryPartner = new DeliveryPartner({ _id: randomId(), name: randomString(), clientId });
      const deliveredWork = new DeliveredWork({
        clientId,
        workId,
        deliveryPartnerId: deliveryPartner._id,
        receivingParty: randomString(),
        deliveryDate: randomDate(),
        updatedAt: randomDate(),
        cwrAcknowledgementId: randomId(),
      });
      const removedDuplicateWork = new RemovedDuplicateWork({
        originalWorkId: work._id,
        originalWork: { title: randomString(), identifier: randomString() },
      });

      jest.spyOn(DeliveredWork, 'find').mockResolvedValueOnce([deliveredWork]);
      jest.spyOn(DeliveryPartner, 'find').mockResolvedValueOnce([deliveryPartner]);
      jest.spyOn(RemovedDuplicateWork, 'find').mockResolvedValueOnce([removedDuplicateWork,
      ]);

      // Act
      const result = await workController.getDeliveriesFromMergedWorks(work);

      // Assert
      expect(result).toEqual([
        {
          receivingParty: deliveredWork.receivingParty,
          deliveryPartnerName: deliveryPartner.name,
          deliveryPartnerId: deliveryPartner._id,
          deliveryDate: deliveredWork.deliveryDate,
          updatedAt: deliveredWork.updatedAt,
          cwrAcknowledgementId: deliveredWork.cwrAcknowledgementId,
          status: 'Pending',
          title: removedDuplicateWork.originalWork.title,
          identifier: removedDuplicateWork.originalWork.identifier,
        },
      ]);
    });
  });

  describe('getWorks', () => {
    let res;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      jest.spyOn(UserAccess, 'allowReadAccessToAll').mockReturnValue(true);
      jest.spyOn(AtlasSearch, 'getSearchResults').mockResolvedValue({ docs: [], totalPages: 1, total: 0 });
    });

    it('should return 403 if user does not have read access', async () => {
      UserAccess.allowReadAccessToAll.mockReturnValue(false);

      await workController.getWorks({ query: {}, curveUser, res });

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    it('should return 200 with works and meta on success', async () => {
      const mockDocs = [{ _id: randomId(), title: randomString() }];
      AtlasSearch.getSearchResults.mockResolvedValue({ docs: mockDocs, totalPages: 3, total: 75 });

      await workController.getWorks({ query: {}, curveUser, res });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        works: mockDocs,
        meta: { currentPage: 1, totalPages: 3, total: 75 },
      });
    });

    it('should return 500 on Atlas Search error', async () => {
      AtlasSearch.getSearchResults.mockRejectedValue(new Error('Search error'));

      await workController.getWorks({ query: {}, curveUser, res });

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal error, please try again' });
    });

    it('should default to page 1 when page is not provided', async () => {
      await workController.getWorks({ query: {}, curveUser, res });

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        meta: expect.objectContaining({ currentPage: 1 }),
      }));
    });

    it('should use the provided page and limit in the meta response', async () => {
      AtlasSearch.getSearchResults.mockResolvedValue({ docs: [], totalPages: 5, total: 100 });

      await workController.getWorks({ query: { page: 3, limit: 10 }, curveUser, res });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        works: [],
        meta: { currentPage: 3, totalPages: 5, total: 100 },
      });
    });
  });

  describe('exportWorks', () => {
    let client; let user;
    beforeEach(() => {
      client = new Client({ _id: clientId, name: randomString() });
      user = new User({ _id: curveUser.id, email: randomString() });

      jest.spyOn(Client, 'findById').mockImplementation(() => ({ lean: jest.fn().mockResolvedValue(client) }));
      jest.spyOn(User, 'findById').mockImplementation(() => ({ lean: jest.fn().mockResolvedValue(user) }));
      jest.spyOn(TaskHelpers, 'createTaskAndSendMessage').mockResolvedValue();
    });

    it('should throw if client or user not found', async () => {
      Client.findById.mockImplementation(() => ({ lean: jest.fn().mockResolvedValue(null) }));

      await expect(workController.exportWorks({ curveUser, body: { ids: [] } }))
        .rejects.toThrow('Client or user not found');
    });

    it('should create a works export task with ids when ids are supplied, ignoring any filter', async () => {
      // Arrange
      const workIds = [randomId(), randomId(), randomId()];
      const rawFilter = { orderBy: 'title', orderDir: 'asc' };
      jest.spyOn(WorkController, 'sanitiseFilter');

      // Act
      await workController.exportWorks({ curveUser, body: { ids: workIds, filter: rawFilter } });

      // Assert
      expect(WorkController.sanitiseFilter).not.toHaveBeenCalled();
      expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
        name: 'Works Export',
        clientId: curveUser.clientId,
        clientName: client.name,
        email: user.email,
        value: {
          clientId: curveUser.clientId,
          filter: { ids: workIds },
        },
      });
    });

    it('should create a works export task with ids when ids are supplied, ignoring any filter', async () => {
      // Arrange
      const workIds = [randomId(), randomId(), randomId()];
      const rawFilter = { orderBy: 'title', orderDir: 'asc' };
      jest.spyOn(WorkController, 'sanitiseFilter');

      // Act
      await workController.exportWorks({ curveUser, body: { ids: workIds, filter: rawFilter } });

      // Assert
      expect(WorkController.sanitiseFilter).not.toHaveBeenCalled();
      expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
        name: 'Works Export',
        clientId: curveUser.clientId,
        clientName: client.name,
        email: user.email,
        value: {
          clientId,
          filter: { ids: workIds },
        },
      });
    });
  });

  describe('runValidationExport', () => {
    beforeEach(() => {
      WriteCsv.mockImplementation(() => ({
        addData: jest.fn((rows, cb) => cb(null)),
        write: jest.fn((cb) => cb(null, '/tmp/export.csv')),
      }));
      jest.spyOn(Client, 'findById').mockResolvedValue({ name: randomString() });
      jest.spyOn(AtlasSearch, 'buildSearchAggregation').mockResolvedValue({ aggregation: [] });
      jest.spyOn(Work, 'aggregate').mockReturnValue({
        allowDiskUse: jest.fn().mockReturnValue({
          cursor: jest.fn().mockReturnValue([]),
        }),
      });
      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, path, cb) => cb(null, key));
      jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => cb(null, 'http://link'));
      jest.spyOn(Notification, 'generate').mockImplementation((...args) => args[args.length - 1](null));
    });

    it('appends a $match on validationErrors.0 to exclude works with no validation errors', async () => {
      const searchStage = { $search: { index: 'workSearch' } };
      AtlasSearch.buildSearchAggregation.mockResolvedValue({ aggregation: [searchStage] });

      await workController.runValidationExport({ curveUser, filter: {} });

      const [pipeline] = Work.aggregate.mock.calls[0];
      expect(pipeline).toEqual([searchStage, { $match: { 'validationErrors.0': { $exists: true } } }]);
    });

    it('passes the sanitised filter to buildSearchAggregation', async () => {
      const rawFilter = { ids: [randomId()], orderBy: 'title' };
      const sanitisedFilter = { ids: rawFilter.ids };
      jest.spyOn(WorkController, 'sanitiseFilter').mockReturnValue(sanitisedFilter);

      await workController.runValidationExport({ curveUser, filter: rawFilter });

      expect(WorkController.sanitiseFilter).toHaveBeenCalledWith(rawFilter);
      const { filterInput } = AtlasSearch.buildSearchAggregation.mock.calls[0][0];
      expect(filterInput).toEqual(sanitisedFilter);
    });

    it('writes one CSV row per validation error with the correct field ordering', async () => {
      const work = {
        _id: randomId(),
        title: randomString(),
        iswc: randomString(),
        composer: randomString(),
        validationErrors: [randomString(), randomString()],
        identifier: randomString(),
      };
      Work.aggregate.mockReturnValue({
        allowDiskUse: jest.fn().mockReturnValue({ cursor: jest.fn().mockReturnValue([work]) }),
      });
      let capturedRows;
      WriteCsv.mockImplementation(() => ({
        addData: jest.fn((rows, cb) => { capturedRows = rows; cb(null); }),
        write: jest.fn((cb) => cb(null, '/tmp/export.csv')),
      }));

      await workController.runValidationExport({ curveUser, filter: {} });

      expect(capturedRows).toEqual([
        [work._id, work.title, work.iswc, work.composer, work.validationErrors[0], work.identifier],
        [work._id, work.title, work.iswc, work.composer, work.validationErrors[1], work.identifier],
      ]);
    });

    it('sends a success notification with the client name and download link', async () => {
      const clientName = randomString();
      const downloadLink = 'http://s3.link';
      Client.findById.mockResolvedValue({ name: clientName });
      fileManager.publicLink24Hours.mockImplementation((key, cb) => cb(null, downloadLink));

      await workController.runValidationExport({ curveUser, filter: {} });

      expect(Notification.generate).toHaveBeenCalledWith(
        'Works Validation Errors Export Ready',
        `Your Works Export of Validation Errors for ${clientName} is Ready to Download`,
        downloadLink,
        curveUser,
        expect.objectContaining({ identifier: 'exportDownload', link: downloadLink }),
        expect.any(Function),
      );
    });

    it('sends an error notification when the export fails', async () => {
      AtlasSearch.buildSearchAggregation.mockRejectedValue(new Error('Atlas Search failed'));

      await workController.runValidationExport({ curveUser, filter: {} });

      expect(Notification.generate).toHaveBeenCalledWith(
        'Your Work Validation Export Has Errored',
        'Your Works Export of Validation Errors Has Errored. Please try again, or contact support',
        null,
        curveUser,
        expect.objectContaining({ identifier: 'exportError' }),
        expect.any(Function),
      );
    });
  });
});
