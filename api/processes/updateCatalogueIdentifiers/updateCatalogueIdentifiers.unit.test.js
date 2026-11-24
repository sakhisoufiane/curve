const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { updateCatalogueIdentifiers } = require('./updateCatalogueIdentifiers');
const User = require('../../models/user');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Work = require('../../models/work');
const Notification = require('../../models/notification');
const ImportXlsx = require('../../libs/importXlsx');
const Client = require('../../models/client');

jest.mock('../../models/user');
jest.mock('../../models/track');
jest.mock('../../models/client');
jest.mock('../../models/notification');

describe('updateCatalogueIdentifiers', () => {
  let mockCurveUser; let mockFile;
  describe('Test Errors', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Instead of re-mocking
      mockCurveUser = {};
      mockFile = { path: 'path-to-file.xlsx' };
    });
    it('Throws an error when the catalogue name does not exist', async () => {
      Client.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ clientType: 'Pro' }),
      });

      await expect(updateCatalogueIdentifiers({
        clientId: 'client123',
        catalogueName: 'Wrong One',
        file: {},
        curveUser: mockCurveUser,
      })).rejects.toThrow('Invalid catalogue name: Wrong One');
    });

    it('calls Notification.generate with an Error when duplicate identifier is found in the document we upload', async () => {
      const mockData = [
        { _id: '1', isrc: 'ABC123' },
        { _id: '2', isrc: 'ABC123' }, // Duplicate ISRC
      ];

      jest.spyOn(ImportXlsx, 'getDataByTemplate').mockImplementation((path, template, a, b, c, callback) => {
        callback(null, mockData);
      });

      User.findById.mockResolvedValue({ id: 'user123', email: 'test@example.com' });

      Client.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'client123', clientType: 'Pro' }),
      });

      const notificationMock = jest.spyOn(Notification, 'generate').mockImplementation((msg, a, b, user, opts, callback) => {
        callback();
      });

      await updateCatalogueIdentifiers({
        clientId: 'client123',
        catalogueName: 'Tracks',
        file: { path: 'mock/path' },
        curveUser: { id: 'user123' },
      });

      expect(notificationMock).toHaveBeenCalledWith(
        'Error updating Tracks identifiers:',
        null,
        null,
        { id: 'user123' },
        expect.objectContaining({
          identifier: 'genericError',
          subject: 'Your Tracks isrc update has Errored.',
        }),
        expect.any(Function),
      );

      // Ensure it was called once
      expect(notificationMock).toHaveBeenCalledTimes(1);
    });
    it('calls Notification.generate with an Error when identifier already exists in MongoDB', async () => {
      const mockData = [{ _id: '1', isrc: 'ISRC_On_Mongo' }];

      // Mock ImportXlsx.getDataByTemplate
      jest.spyOn(ImportXlsx, 'getDataByTemplate').mockImplementation((path, template, a, b, c, callback) => {
        callback(null, mockData);
      });

      // Mock User.findById
      User.findById.mockResolvedValue({ id: 'user123', email: 'test@example.com' });

      // Mock Client.findById
      Client.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'client123', clientType: 'Pro' }),
      });
      ({ _id: 'client123' });

      // Mock Track.findOne to simulate a duplicate ISRC found in the database
      const trackFindOneMock = jest.spyOn(Track, 'findOne').mockResolvedValue({
        _id: 'existingTrackId',
        isrc: 'ISRC_On_Mongo',
      });

      // Mock Notification.generate
      const notificationMock = jest.spyOn(Notification, 'generate').mockImplementation((msg, a, b, user, opts, callback) => {
        callback(); // Simulate success
      });

      // Call function without expecting it to throw
      await updateCatalogueIdentifiers({
        clientId: 'client123',
        catalogueName: 'Tracks',
        file: { path: 'mock/path' },
        curveUser: { id: 'user123' },
      });

      // Verify Track.findOne was called
      expect(trackFindOneMock).toHaveBeenCalledWith({ clientId: 'client123', isrc: 'ISRC_On_Mongo' });

      // Verify Notification.generate was called
      expect(notificationMock).toHaveBeenCalledWith(
        'Error updating Tracks identifiers:',
        null,
        null,
        { id: 'user123' },
        expect.objectContaining({
          identifier: 'genericError',
          subject: 'Your Tracks isrc update has Errored.',
          error: expect.arrayContaining([expect.stringContaining('ISRC_On_Mongo already exists')]),
        }),
        expect.any(Function),
      );

      // Ensure Notification.generate was called once
      expect(notificationMock).toHaveBeenCalledTimes(1);
    });
  });
  describe('updateCatalogueIdentifiers - Happy Path', () => {
    it('successfully updates item and sends confirmation notification', async () => {
      const trackId = randomId();
      const clientId = randomId();
      const userId = randomId();
      const mockData = [
        { _id: trackId, isrc: 'NEW_ISRC' }, // New ISRC to be added/updated
      ];

      // Mock ImportXlsx.getDataByTemplate
      jest.spyOn(ImportXlsx, 'getDataByTemplate').mockImplementation((path, template, a, b, c, callback) => {
        callback(null, mockData);
      });

      // Mock User.findById
      User.findById.mockResolvedValue({ id: userId, email: 'test@example.com' });

      // Mock Client.findById
      Client.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'client123', clientType: 'Pro' }),
      });
      ({ _id: randomId() });

      // Mock Track.findOne to simulate that no matching track exists in the database (no duplicates)
      const trackFindOneMock = jest.spyOn(Track, 'findOne').mockResolvedValue(null); // No duplicate found

      // Mock Track.bulkWrite to simulate a successful update operation
      const trackBulkWriteMock = jest.spyOn(Track, 'bulkWrite').mockResolvedValue({ nModified: 1 }); // 1 item modified

      // Mock Notification.generate
      const notificationMock = jest.spyOn(Notification, 'generate').mockImplementation((msg, a, b, user, opts, callback) => {
        callback(); // Simulate success
      });
      // Call the function
      await updateCatalogueIdentifiers({
        clientId,
        catalogueName: 'Tracks',
        file: { path: 'mock/path' },
        curveUser: { id: userId },
      });

      // Verify Track.findOne was called with the correct query (no duplicate found)
      expect(trackFindOneMock).toHaveBeenCalledWith({ clientId, isrc: 'NEW_ISRC' });

      // Verify Track.bulkWrite was called with the correct update operation
      expect(trackBulkWriteMock).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: new ObjectId(trackId), clientId }, // Use ObjectId for the _id field
            update: { $set: { isrc: 'NEW_ISRC', lastModified: userId } },
          },
        },
      ]);

      // Verify Notification.generate was called with expected arguments
      expect(notificationMock).toHaveBeenCalledWith(
        '1 Tracks have been updated',
        null,
        null,
        { id: new ObjectId(userId) },
        expect.objectContaining({
          identifier: 'genericComplete',
          subject: 'Your Tracks isrc have been updated, 1 Tracks Updated',
          count: 1,
        }),
        expect.any(Function),
      );
      // Ensure Notification.generate was called once
      expect(notificationMock).toHaveBeenCalledTimes(1);
    });
  });
});
