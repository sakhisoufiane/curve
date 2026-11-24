const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Track = require('../../models/track');
const { bulkSplitsService } = require('../../libs/splits');
const { getTrackData } = require('./helpers/import-export/db');
const { formatTrackAsCSVRow, formatErrorAsCSVRow, createTrackCSVWriter, createErrorCSVWriter } = require('./helpers/import-export/csv');
const { uploadToS3, UPLOAD_TYPE } = require('./helpers/import-export/upload');
const sendNotification = require('./helpers/import-export/notification');
const { exportTracks } = require('./exports');

jest.mock('app-root-dir', () => ({
  get: jest.fn(() => '/mock/app/root'),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

jest.mock('moment');
jest.mock('../../models/track');
jest.mock('../../libs/splits', () => ({
  bulkSplitsService: {
    markInProgress: jest.fn(),
    markAsComplete: jest.fn(),
    markAsErrored: jest.fn(),
  },
}));

jest.mock('./helpers/import-export/upload', () => ({
  uploadToS3: jest.fn().mockResolvedValue({ publicLink: 'https://s3-upload-url', s3Key: 's3Key' }),
  UPLOAD_TYPE: {
    IMPORT: 'import',
    EXPORT: 'export',
  },
}));

jest.mock('./helpers/import-export/db');
jest.mock('./helpers/import-export/csv');
jest.mock('./helpers/import-export/upload');
jest.mock('./helpers/import-export/notification');
jest.mock('@curveroyaltysystems/platform-shared-utils');

describe('exports', () => {
  let mockCursor;
  let mockTrackWriter;
  let mockErrorWriter;
  let curveUser;
  let client;
  let trackIds;
  let bulkSplitsId;

  beforeEach(() => {
    jest.clearAllMocks();

    moment.mockReturnValue({
      format: jest.fn(() => '1234567890'),
    });

    mockTrackWriter = {
      write: jest.fn(),
      end: jest.fn(),
    };
    mockErrorWriter = {
      write: jest.fn(),
      end: jest.fn(),
    };

    createTrackCSVWriter.mockReturnValue(mockTrackWriter);
    createErrorCSVWriter.mockReturnValue(mockErrorWriter);

    mockCursor = {
      [Symbol.asyncIterator]: jest.fn(),
    };

    const mockSelect = jest.fn().mockReturnValue({
      cursor: jest.fn().mockReturnValue(mockCursor),
    });
    Track.find.mockReturnValue({
      select: mockSelect,
    });

    bulkSplitsService.markInProgress.mockResolvedValue();
    bulkSplitsService.markAsComplete.mockResolvedValue();
    bulkSplitsService.markAsErrored.mockResolvedValue();

    getTrackData.mockResolvedValue({ success: true, track: {} });
    formatTrackAsCSVRow.mockReturnValue('csv,row,data');
    formatErrorAsCSVRow.mockReturnValue('error,csv,row');
    sendNotification.mockResolvedValue();

    curveUser = {
      id: randomId(),
      clientId: randomId(),
    };
    client = { name: randomString() };
    trackIds = [randomId(), randomId(), randomId()];
    bulkSplitsId = randomId();
  });

  it('should process all tracks successfully and complete export', async () => {
    const mockTracks = [
      { _id: trackIds[0], title: randomString(), artist: randomString(), isrc: randomString() },
      { _id: trackIds[1], title: randomString(), artist: randomString(), isrc: randomString() },
      { _id: trackIds[2], title: randomString(), artist: randomString(), isrc: randomString() },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const track of mockTracks) {
        yield track;
      }
    };

    getTrackData.mockImplementation((track) => Promise.resolve({
      success: true,
      track: { ...track, payees: [] },
    }));

    await exportTracks({ trackIds, bulkSplitsId, curveUser, client });

    expect(bulkSplitsService.markInProgress).toHaveBeenCalledWith(bulkSplitsId, curveUser.clientId);
    expect(bulkSplitsService.markAsComplete).toHaveBeenCalledWith({
      recordId: bulkSplitsId,
      clientId: curveUser.clientId,
      fileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
      errorFileData: { publicLink: null, s3Key: null },
      totalCount: mockTracks.length,
      updatedCount: mockTracks.length,
    });

    expect(getTrackData).toHaveBeenCalledTimes(3);
    expect(formatTrackAsCSVRow).toHaveBeenCalledTimes(3);
    expect(mockTrackWriter.write).toHaveBeenCalledTimes(3);
    expect(mockTrackWriter.end).toHaveBeenCalled();

    expect(sendNotification).toHaveBeenCalledWith({
      identifier: 'exportDownload',
      curveUser,
      client,
      collectionName: 'Bulk Splits',
      publicLink: 'https://s3-upload-url',
    });
  });

  it('should handle tracks with errors and create error CSV', async () => {
    const mockTracks = [
      { _id: trackIds[0], title: randomString() },
      { _id: trackIds[1], title: randomString() },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const track of mockTracks) {
        yield track;
      }
    };

    getTrackData.mockImplementation((track) => {
      if (track._id === trackIds[0]) {
        return Promise.resolve({
          success: true,
          track: { ...track, payees: [] },
        });
      }
      return Promise.resolve({
        success: false,
        track: { ...track, payees: [] },
        errors: ['Validation error'],
      });
    });

    await exportTracks({ trackIds: [trackIds[0], trackIds[1]], bulkSplitsId, curveUser, client });

    expect(formatTrackAsCSVRow).toHaveBeenCalledTimes(1);
    expect(formatErrorAsCSVRow).toHaveBeenCalledTimes(1);
    expect(mockTrackWriter.write).toHaveBeenCalledTimes(1);
    expect(mockErrorWriter.write).toHaveBeenCalledTimes(1);

    expect(bulkSplitsService.markAsComplete).toHaveBeenCalledWith({
      recordId: bulkSplitsId,
      clientId: curveUser.clientId,
      fileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
      errorFileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
      totalCount: 2,
      updatedCount: 1,
    });
  });

  it('should mark export as errored when an exception occurs', async () => {
    const error = new Error('Database connection failed');

    Track.find.mockImplementation(() => {
      throw error;
    });

    await expect(exportTracks({ trackIds, bulkSplitsId, curveUser, client }))
      .rejects.toThrow('Database connection failed');

    expect(bulkSplitsService.markAsErrored).toHaveBeenCalledWith(
      bulkSplitsId,
      curveUser.clientId,
      {
        errorMessage: `Bulk splits export failed: ${error.message}`,
        errorCause: 'BULK_SPLITS_EXPORT_FAILED',
      },
    );
    expect(logger.error).toHaveBeenCalledWith('Export failed:', error);
  });

  it('should handle cursor iteration errors', async () => {
    const error = new Error('Cursor iteration failed');

    // eslint-disable-next-line
    mockCursor[Symbol.asyncIterator] = async function* () {
      throw error;
    };

    await expect(exportTracks({ trackIds, bulkSplitsId, curveUser, client }))
      .rejects.toThrow('Cursor iteration failed');

    expect(bulkSplitsService.markAsErrored).toHaveBeenCalledWith(
      bulkSplitsId,
      curveUser.clientId,
      {
        errorMessage: `Bulk splits export failed: ${error.message}`,
        errorCause: 'BULK_SPLITS_EXPORT_FAILED',
      },
    );
  });

  it('should end both writers after processing', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {
      yield { _id: trackIds[0], title: randomString() };
    };

    getTrackData.mockResolvedValue({
      success: true,
      track: { _id: trackIds[0], title: randomString(), payees: [] },
    });

    await exportTracks({ trackIds, bulkSplitsId, curveUser, client });

    expect(mockTrackWriter.end).toHaveBeenCalled();
    expect(mockErrorWriter.end).toHaveBeenCalled();
  });

  it('should query tracks with correct parameters', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {
      // Empty iterator
    };

    await exportTracks({ trackIds, bulkSplitsId, curveUser, client });

    expect(Track.find).toHaveBeenCalledWith({ _id: { $in: trackIds } });

    const findResult = Track.find();
    expect(findResult.select).toHaveBeenCalledWith('title artist isrc alternativeId salesReturnsRights');

    const selectResult = findResult.select();
    expect(selectResult.cursor).toHaveBeenCalledWith({ batchSize: 1000 });
  });

  it('should upload error file when errors occur', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {
      yield { _id: trackIds[0], title: randomString() };
    };

    getTrackData.mockResolvedValue({
      success: false,
      track: { _id: trackIds[0], title: randomString(), payees: [] },
      errors: ['Validation error'],
    });

    await exportTracks({ trackIds: [trackIds[0]], bulkSplitsId, curveUser, client });

    expect(uploadToS3).toHaveBeenCalledWith(
      expect.stringContaining('splits_export_errors'),
      curveUser,
      UPLOAD_TYPE.EXPORT,
    );
    expect(bulkSplitsService.markAsComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        errorFileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
        totalCount: 1,
        updatedCount: 0,
      }),
    );
  });
});
