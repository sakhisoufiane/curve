const moment = require('moment');
const fs = require('fs');
const csv = require('csv-parser');
const { EventEmitter } = require('events');
const { bulkSplitsService } = require('../../libs/splits');
const { updateTrack } = require('./helpers/import-export/db');
const { validateHeaders, formatTrackAsCSVRow, formatErrorAsCSVRow, createTrackCSVWriter, createErrorCSVWriter } = require('./helpers/import-export/csv');
const { uploadToS3, UPLOAD_TYPE } = require('./helpers/import-export/upload');
const sendNotification = require('./helpers/import-export/notification');
const { importTracks } = require('./imports');

jest.mock('app-root-dir', () => ({
  get: jest.fn(() => '/mock/app/root'),
}));

jest.mock('fs', () => ({
  createReadStream: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('csv-parser');
jest.mock('moment', () => jest.fn(() => ({
  format: jest.fn(() => '1234567890'),
})));

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../libs/splits', () => ({
  bulkSplitsService: {
    markInProgress: jest.fn(),
    markAsComplete: jest.fn(),
    markAsErrored: jest.fn(),
  },
}));

jest.mock('./helpers/import-export/db', () => ({
  updateTrack: jest.fn(),
}));

jest.mock('./helpers/import-export/csv', () => {
  const mockTrackWriter = {
    write: jest.fn(),
    end: jest.fn(),
  };
  const mockErrorWriter = {
    write: jest.fn(),
    end: jest.fn(),
  };

  return {
    validateHeaders: jest.fn(),
    validateRow: jest.fn(),
    extractPayeesFromRow: jest.fn(),
    validatePayees: jest.fn(),
    formatTrackAsCSVRow: jest.fn(),
    formatErrorAsCSVRow: jest.fn(),
    createTrackCSVWriter: jest.fn(() => mockTrackWriter),
    createErrorCSVWriter: jest.fn(() => mockErrorWriter),
  };
});
jest.mock('./helpers/import-export/upload', () => ({
  uploadToS3: jest.fn().mockResolvedValue({ publicLink: 'https://s3-upload-url', s3Key: 's3Key' }),
  UPLOAD_TYPE: {
    IMPORT: 'import',
    EXPORT: 'export',
  },
}));
jest.mock('./helpers/import-export/notification', () => jest.fn(() => Promise.resolve()));
jest.mock('@curveroyaltysystems/platform-shared-utils');

describe('imports', () => {
  const curveUser = {
    id: 'user-123',
    clientId: 'client-123',
  };
  const client = { name: 'Test Client' };
  const bulkSplitsId = 'bulk-splits-123';
  const file = {
    path: '/path/to/upload.csv',
    originalname: 'upload.csv',
  };

  let mockStream;
  let trackWriter;
  let errorWriter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStream = setupMockStream();
    trackWriter = createTrackCSVWriter();
    errorWriter = createErrorCSVWriter();
  });

  it('should process valid file and write results to tmp/splits_import_currentDate.csv file', async () => {
    // GIVEN
    const mockRows = [
      { ID: 'track-1', 'Asset Title': 'Track 1', Artists: 'Artist 1', ISRC: 'ISRC1', 'Alternative ID': 'ALT1' },
      { ID: 'track-2', 'Asset Title': 'Track 2', Artists: 'Artist 2', ISRC: 'ISRC2', 'Alternative ID': 'ALT2' },
    ];

    updateTrack.mockResolvedValue({
      id: 'track-123',
      title: 'Test Track',
      artist: 'Test Artist',
      isrc: 'ISRC123',
      alternativeId: 'ALT123',
      payees: [{ name: 'Test Payee', email: 'test@example.com', percentage: 100 }],
    });

    // WHEN
    importTracks({
      file,
      curveUser,
      client,
      bulkSplitsId,
    });

    await simulateStreamEvents({
      stream: mockStream,
      rows: mockRows,
    });

    // THEN
    expect(createTrackCSVWriter).toHaveBeenCalledWith('/mock/app/root/tmp/splits_import_1234567890.csv');
    expect(formatTrackAsCSVRow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'track-123',
        title: 'Test Track',
      }),
    );
    expect(trackWriter.write).toHaveBeenCalledTimes(2);
    expect(bulkSplitsService.markAsComplete).toHaveBeenCalledWith({
      recordId: bulkSplitsId,
      clientId: curveUser.clientId,
      fileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
      errorFileData: { publicLink: null, s3Key: null },
      totalCount: 2,
      updatedCount: 2,
    });
  });

  it('should mark import as errored when header validation fails', async () => {
    // GIVEN
    validateHeaders.mockImplementationOnce(() => {
      const error = new Error('File validation error. Incorrect headers: ID, Asset Title');
      error.cause = 'BULK_SPLITS_IMPORT_FAILED';
      error.code = 400;
      error.details = '';
      throw error;
    });

    // WHEN
    importTracks({
      file,
      curveUser,
      client,
      bulkSplitsId,
    });

    await simulateStreamEvents({
      stream: mockStream,
      rows: [],
    });

    // THEN
    expect(bulkSplitsService.markAsErrored).toHaveBeenCalledWith(
      bulkSplitsId,
      curveUser.clientId,
      {
        errorMessage: 'Bulk splits import failed: File validation error. Incorrect headers: ID, Asset Title',
        errorCause: 'BULK_SPLITS_IMPORT_FAILED',
      },
    );
    expect(trackWriter.write).not.toHaveBeenCalled();
  });

  it('should write error for first track and continue processing second track', async () => {
    // GIVEN
    const mockRows = [
      { ID: 'track-1', 'Asset Title': 'Track 1', Artists: 'Artist 1', ISRC: 'ISRC1', 'Alternative ID': 'ALT1' },
      { ID: 'track-2', 'Asset Title': 'Track 2', Artists: 'Artist 2', ISRC: 'ISRC2', 'Alternative ID': 'ALT2' },
    ];

    // First row processing - error:
    updateTrack.mockRejectedValueOnce(new Error('Updating track data failed: Track not found'));

    // Second row processing - successful:
    updateTrack.mockResolvedValueOnce({
      id: 'track-2',
      title: 'Track 2',
      artist: 'Artist 2',
      isrc: 'ISRC2',
      alternativeId: 'ALT2',
      payees: [{ name: 'Test Payee 2', email: 'test2@example.com', percentage: 100 }],
    });

    // WHEN
    importTracks({
      file,
      curveUser,
      client,
      bulkSplitsId,
    });

    await simulateStreamEvents({
      stream: mockStream,
      rows: mockRows,
    });

    // THEN
    // First row should be written to error CSV
    expect(formatErrorAsCSVRow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockRows[0].ID,
        title: mockRows[0]['Asset Title'],
        artist: mockRows[0].Artists,
      }),
      ['Updating track data failed: Track not found'],
    );
    expect(errorWriter.write).toHaveBeenCalledTimes(1);

    // Second row should be written to track CSV
    expect(formatTrackAsCSVRow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockRows[1].ID,
        title: mockRows[1]['Asset Title'],
      }),
    );
    expect(trackWriter.write).toHaveBeenCalledTimes(1);

    expect(bulkSplitsService.markAsComplete).toHaveBeenCalledWith({
      recordId: bulkSplitsId,
      clientId: curveUser.clientId,
      fileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
      errorFileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
      totalCount: 2,
      updatedCount: 1,
    });
  });

  it('should call postprocessing functions with correct parameters after successful import', async () => {
    // GIVEN
    const mockRows = [
      { ID: 'track-1', 'Asset Title': 'Track 1', Artists: 'Artist 1', ISRC: 'ISRC1', 'Alternative ID': 'ALT1' },
    ];

    updateTrack.mockResolvedValue({
      id: 'track-1',
      title: 'Track 1',
      artist: 'Artist 1',
      isrc: 'ISRC1',
      alternativeId: 'ALT1',
      payees: [{ name: 'Test Payee', email: 'test@example.com', percentage: 100 }],
    });

    // WHEN
    importTracks({
      file,
      curveUser,
      client,
      bulkSplitsId,
    });

    await simulateStreamEvents({
      stream: mockStream,
      rows: mockRows,
    });

    // THEN
    expect(uploadToS3).toHaveBeenCalledWith(
      '/mock/app/root/tmp/splits_import_1234567890.csv',
      curveUser,
      UPLOAD_TYPE.IMPORT,
    );

    expect(bulkSplitsService.markAsComplete).toHaveBeenCalledWith({
      recordId: bulkSplitsId,
      clientId: curveUser.clientId,
      fileData: { publicLink: 'https://s3-upload-url', s3Key: 's3Key' },
      errorFileData: { publicLink: null, s3Key: null },
      totalCount: 1,
      updatedCount: 1,
    });

    expect(sendNotification).toHaveBeenCalledWith({
      identifier: 'importDownload',
      curveUser,
      client,
      collectionName: 'Bulk Splits',
      publicLink: 'https://s3-upload-url',
    });

    expect(fs.unlinkSync).toHaveBeenCalledWith(file.path);
  });
});

/* Helper functions */
async function simulateStreamEvents({ stream, rows }) {
  await new Promise((resolve) => {
    setImmediate(() => {
      stream.emit('headers', ['mockHeaders']);

      setImmediate(async () => {
        for (const row of rows) {
          stream.emit('data', row);
        }

        stream.emit('end');

        // Wait for async actions to complete
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve('done with completion');
          }, 200);
        });

        resolve();
      });
    });
  });
}

function setupMockStream() {
  const stream = new EventEmitter();
  let isPaused = false;

  stream.pause = jest.fn(() => {
    isPaused = true;
  });

  stream.resume = jest.fn(() => {
    isPaused = false;
  });

  stream.isPaused = () => isPaused;

  stream.destroy = jest.fn((error) => {
    if (error) {
      setImmediate(() => stream.emit('error', error));
    }
  });

  stream.pipe = jest.fn().mockReturnValue(stream);

  fs.createReadStream.mockReturnValue(stream);
  csv.mockReturnValue(stream);

  return stream;
}
