/**
 * Integration tests for validateSales.incompleteSales
 *
 * These tests run the real async.waterfall to catch callback chain issues
 * that unit tests with mocks cannot detect.
 */

const { EventEmitter } = require('events');

jest.mock('../mapper', () => ({
  overwriteFields: jest.fn((line, overwriteFields, cb) => cb(null, line)),
  runExchangeRates: jest.fn((line, currencies, exchangeRates, cb) => cb(null, line)),
  mapAllFields: jest.fn((line, templateSource, catalogue, cb) => cb(null, line)),
  setCatalogueData: jest.fn((line) => line),
  setStatus: jest.fn((line, cb) => {
    line.status = 'Complete';
    cb(null, line);
  }),
}));

jest.mock('@curveroyaltysystems/bigquery', () => ({
  withDefaultCredentials: jest.fn(),
  createDeleteQuery: jest.fn(() => ({ query: 'DELETE FROM `test_dataset.test_input_table` WHERE salesFileId = @salesFileId', params: { salesFileId: 'test123' } })),
}));

const { withDefaultCredentials, createDeleteQuery } = require('@curveroyaltysystems/bigquery');
const validateSales = require('./validateSales');

// Test timeouts
const STREAM_SETTLE_TIME = 500; // Time for stream events to settle
const RETRY_DELAY = 2000; // setTimeout delay in the retry logic
const RETRY_SETTLE_TIME = RETRY_DELAY + 100; // Wait for retry to complete

let mockBigQueryClient;

/**
 * Creates a mock BigQuery object for testing
 */
function createMockBigQuery(streamOverride) {
  const mockStream = streamOverride || new EventEmitter();

  return {
    stream: mockStream,
    mock: {
      inputSchema: [
        { name: 'id', mode: 'NULLABLE' },
        { name: 'status', mode: 'NULLABLE' },
        { name: 'netAmount', mode: 'NULLABLE' },
        { name: 'salesFileId', mode: 'NULLABLE' },
      ],
      inputTable: 'test_input_table',
      setupFile: jest.fn((cb) => cb(null)),
      getDataQuery: jest.fn(() => 'SELECT * FROM test'),
      logQuery: jest.fn(),
      client: {
        createQueryStream: jest.fn(() => mockStream),
      },
      writeToFile: jest.fn((data, table, cb) => cb(null)),
      deleteData: jest.fn((table, filter, cb) => cb(null)),
      writeFileToDb: jest.fn((table, cb) => cb(null)),
    },
  };
}

describe('validateSales.incompleteSales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBigQueryClient = {
      datasetName: 'test_dataset',
      inputTable: 'test_input_table',
      query: jest.fn(() => Promise.resolve()),
    };
    withDefaultCredentials.mockReturnValue(mockBigQueryClient);
  });

  describe('successful completion', () => {
    it('should complete waterfall when stream ends', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, (err, validationData) => {
        // Assert
        expect(err).toBeNull();
        expect(validationData).toBeDefined();
        expect(mock.setupFile).toHaveBeenCalled();
        expect(mockBigQueryClient.query).toHaveBeenCalled();
        expect(mock.writeFileToDb).toHaveBeenCalled();
        done();
      });

      setImmediate(() => stream.emit('end'));
    });

    it('should process data events and complete waterfall', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };
      const testLine = { id: '1', catType: 'Track', trackId: 'track123' };

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, (err, validationData) => {
        // Assert
        expect(err).toBeNull();
        expect(validationData).toBeDefined();
        expect(mock.writeFileToDb).toHaveBeenCalled();
        done();
      });

      setImmediate(() => {
        stream.emit('data', testLine);
        setTimeout(() => stream.emit('end'), 50);
      });
    }, 3000);
  });

  describe('error handling', () => {
    it('should propagate stream error through waterfall callback (tests cb vs callback)', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };
      const streamError = new Error('Stream failed');

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, (err) => {
        // Assert - if error handler uses callback() instead of cb(), this won't be called
        expect(err).toBe(streamError);
        expect(mockBigQueryClient.query).not.toHaveBeenCalled();
        expect(mock.writeFileToDb).not.toHaveBeenCalled();
        done();
      });

      setImmediate(() => stream.emit('error', streamError));
    }, 2000);

    it('should call callback exactly once when both error and end fire (tests streamErrorHandled)', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };
      const streamError = new Error('Stream failed');
      let callbackCount = 0;

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, () => {
        callbackCount += 1;
        if (callbackCount > 1) {
          done(new Error(`Callback called ${callbackCount} times - missing streamErrorHandled guard`));
        }
      });

      setImmediate(() => {
        stream.emit('error', streamError);
        stream.emit('end');

        // Assert
        setTimeout(() => {
          if (callbackCount === 0) {
            done(new Error('Callback never called - error handler may use callback() instead of cb()'));
          } else if (callbackCount === 1) {
            done();
          }
        }, STREAM_SETTLE_TIME);
      });
    }, 2000);
  });

  describe('delete step', () => {
    it('should create new BigQuery client from old client datasetName and inputTable', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, () => {
        // Assert
        expect(withDefaultCredentials).toHaveBeenCalledWith({
          datasetName: mock.datasetName,
          inputTable: mock.inputTable,
          retryBackoffTime: 10000,
        });
        done();
      });

      setImmediate(() => stream.emit('end'));
    });

    it('should call createDeleteQuery with correct dataset, table, and filter', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, () => {
        // Assert
        expect(createDeleteQuery).toHaveBeenCalledWith(
          mockBigQueryClient.datasetName,
          mockBigQueryClient.inputTable,
          filter,
        );
        done();
      });

      setImmediate(() => stream.emit('end'));
    });

    it('should call bigQueryClient.query with correct labels and maxRetries', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };
      const fakeDeleteQuery = { query: 'DELETE ...', params: {} };
      const maxRetries = 15;
      createDeleteQuery.mockReturnValue(fakeDeleteQuery);

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, () => {
        // Assert
        expect(mockBigQueryClient.query).toHaveBeenCalledWith(
          fakeDeleteQuery,
          { sales_file_id: filter.salesFileId },
          maxRetries,
        );
        done();
      });

      setImmediate(() => stream.emit('end'));
    });

    it('should propagate delete error through waterfall callback', (done) => {
      // Arrange
      const { stream, mock } = createMockBigQuery();
      const filter = { salesFileId: 'test123' };
      const deleteError = new Error('BigQuery delete failed');
      mockBigQueryClient.query.mockRejectedValue(deleteError);

      // Act
      validateSales.incompleteSales(filter, mock, {}, {}, [], [], {}, {}, (err) => {
        // Assert
        expect(err).toBe(deleteError);
        expect(mock.writeFileToDb).not.toHaveBeenCalled();
        done();
      });

      setImmediate(() => stream.emit('end'));
    });
  });

  describe('retry logic', () => {
    it('should retry with all parameters on rate limit error (tests catalogueOverwritingData)', (done) => {
      // Arrange
      const firstStream = new EventEmitter();
      const retryStream = new EventEmitter();
      let streamCallCount = 0;

      const { mock } = createMockBigQuery(firstStream);
      mock.client.createQueryStream = jest.fn(() => {
        streamCallCount += 1;
        return streamCallCount === 1 ? firstStream : retryStream;
      });

      const filter = { salesFileId: 'test123' };
      const rateLimitError = new Error('Exceeded rate limits');
      rateLimitError.code = 409;

      // Act
      validateSales.incompleteSales(
        filter,
        mock,
        { templateData: 'test' },
        { catalogueData: 'test' },
        [],
        [],
        { overwriteConfig: true }, // catalogueOverwritingData - must be passed to retry
        { someField: 'value' },
        (err, validationData) => {
          // Assert - if catalogueOverwritingData missing from retry, callback is undefined
          expect(err).toBeNull();
          expect(validationData).toBeDefined();
          expect(streamCallCount).toBe(2);
          done();
        },
      );

      setImmediate(() => {
        firstStream.emit('error', rateLimitError);
        setTimeout(() => retryStream.emit('end'), RETRY_SETTLE_TIME);
      });
    }, 5000);
  });
});
