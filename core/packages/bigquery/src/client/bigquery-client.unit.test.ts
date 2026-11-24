/* eslint-disable import/first */
jest.mock('@google-cloud/bigquery');

import { BigQuery } from '@google-cloud/bigquery';
import moment from 'moment';
import { BigQueryClient, BigQuerySchema } from './bigquery-client';

process.env.NODE_ENV = 'test';

const bigQueryParams = {
  datasetName: 'datasetName',
  inputTable: 'inputTable',
  outputTable: 'outputTable',
  costsTable: 'costsTable',
  accountingTable: 'accountingTable',
  retryBackoffTime: 100,
};

let delegate: BigQuery;
let bigQueryClient: BigQueryClient;

describe('bigQuery Unit Tests', () => {
  beforeEach(() => {
    delegate = new BigQuery();
    bigQueryClient = new BigQueryClient(bigQueryParams, delegate);
  });

  afterEach(async () => {
    bigQueryClient.datasetName = 'datasetName';
  });

  it('should initialise with the right params', () => {
    expect(bigQueryClient.datasetName).toEqual(bigQueryParams.datasetName);
    expect(bigQueryClient.inputTable).toEqual(bigQueryParams.inputTable);
    expect(bigQueryClient.outputTable).toEqual(bigQueryParams.outputTable);
    expect(bigQueryClient.costsTable).toEqual(bigQueryParams.costsTable);
    expect(bigQueryClient.accountingTable).toEqual(bigQueryParams.accountingTable);
  });

  describe('datasetExists', () => {
    let datasetStub: jest.Mock;

    it.each([true, false])('should call bigQueryClient.dataset with the datasetName', async (expectedResult) => {
      // Arrange
      const datasetName = 'dataset 1';

      datasetStub = jest.fn(() => ({
        exists: jest.fn().mockResolvedValue([expectedResult]),
      }));
      delegate.dataset = datasetStub

      // Act
      const result = await bigQueryClient.datasetExists(datasetName);

      // Assert
      expect(datasetStub).toHaveBeenCalledWith(datasetName);
      expect(result).toEqual(expectedResult);
    });

    describe('when checkDataset.exists returns an err', () => {
      it('should return an error', async () => {
        // Arrange
        const datasetName = 'dataset 1';
        const datasetExistsError = new Error('Dataset Error');

        datasetStub = jest.fn(() => ({
          exists: jest.fn().mockRejectedValue(datasetExistsError),
        }));
        delegate.dataset = datasetStub

        // Act and Assert
        await expect(bigQueryClient.datasetExists(datasetName)).rejects.toThrow(datasetExistsError);
      });
    });
  });

  describe('getSchema', () => {
    // Arrange
    const metadata = {
      schema: {
        field1: 'Value1',
        field2: 'Value2',
      },
    };
    const tableName = 'Table 1';

    let datasetMock: jest.Mock

    beforeEach(() => {
      datasetMock = jest.fn((givenDataset) => {
        if (givenDataset !== bigQueryParams.datasetName) {
          throw new Error(`Expected datasetName ${bigQueryParams.datasetName} but got ${givenDataset}`)
        }

        return {
          table: jest.fn((givenTable) => {
            if (givenTable !== tableName) {
              throw new Error(`Expected datasetName ${bigQueryParams.datasetName} but got ${givenTable}`)
            }

            return {
              getMetadata: jest.fn().mockResolvedValue([metadata]),
            };
          }),
        }
      })
      delegate.dataset = datasetMock;
    });

    it('should get metadata with the expected table and dataset name', async () => {
      // Act
      const result = await bigQueryClient.getSchema(tableName);
      // Assert
      expect(result).toEqual(metadata.schema);
    });
  });

  describe('query', () => {
    const labels = { job_type: 'test_job', client_id: 'blahblah' };

    let getQueryResultsStub: jest.Mock;
    let createQueryJobStub: jest.Mock;

    beforeEach(() => {
      getQueryResultsStub = jest.fn().mockResolvedValue(['Result']);
      createQueryJobStub = jest.fn().mockResolvedValue([{ getQueryResults: getQueryResultsStub }])
      delegate.createQueryJob = createQueryJobStub;
    });

    it('should call bigQueryClient.query', async () => {
      // Arrange
      const query = randomString();
      // Act
      await bigQueryClient.query(query, labels);
      // Assert
      expect(createQueryJobStub).toHaveBeenCalled();
    });

    it('should return the result when bigQueryClient resolves', async () => {
      // Arrange
      const query = randomString();
      // Act
      const result = await bigQueryClient.query(query, labels);
      // Assert
      expect(result).toEqual('Result');
    });

    it('should return an error when bigQueryClient rejects', async () => {
      // Arrange
      const query = randomString();
      const error = new Error('Oh no!');

      getQueryResultsStub.mockRejectedValue(error);
      // Act
      await expect(bigQueryClient.query(query, labels)).rejects.toThrow(error);
    });

    describe('exponential retry', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should retry on transient failure and eventually succeed', async () => {
        // Arrange
        const error = new Error('Transient error');

        getQueryResultsStub
          .mockRejectedValueOnce(error)
          .mockRejectedValueOnce(error)
          .mockResolvedValue(['Result']);

        // Act
        const promise = bigQueryClient.query(randomString(), labels);
        await jest.runAllTimersAsync();
        const result = await promise;

        // Assert — 1 initial attempt + 2 retries
        expect(createQueryJobStub).toHaveBeenCalledTimes(3);
        expect(result).toEqual('Result');
      });

      it('should throw after default maxRetries (3) are exhausted', async () => {
        // Arrange
        const error = new Error('Persistent error');
        getQueryResultsStub.mockRejectedValue(error);

        // Attach rejection handler BEFORE advancing timers to prevent unhandled rejection
        const promise = bigQueryClient.query(randomString(), labels);
        const assertion = expect(promise).rejects.toThrow(error);

        // Act — cockatiel maxAttempts=3 means 3 retries: 1 initial + 3 retries = 4 calls
        await jest.runAllTimersAsync();
        await assertion;

        expect(createQueryJobStub).toHaveBeenCalledTimes(4);
      });

      it('should respect a custom maxRetries parameter', async () => {
        // Arrange
        const error = new Error('Persistent error');
        getQueryResultsStub.mockRejectedValue(error);

        // Attach rejection handler BEFORE advancing timers to prevent unhandled rejection
        const promise = bigQueryClient.query(randomString(), labels, 5);
        const assertion = expect(promise).rejects.toThrow(error);

        // Act — 1 initial + 5 retries = 6 calls
        await jest.runAllTimersAsync();
        await assertion;

        expect(createQueryJobStub).toHaveBeenCalledTimes(6);
      });
    });
  });

  // TODO load
  // TODO loadLocal

  describe('createDataset', () => {
    let createDatasetStub: jest.Mock;

    beforeEach(() => {
      createDatasetStub = jest.fn().mockResolvedValue([{ some: 'data' }]);
      delegate.createDataset = createDatasetStub;
    });

    it('should call bigQueryClient.createDataset', async () => {
      // Arrange
      const datasetName = 'newDataSet';
      // Act
      await bigQueryClient.createDataset(datasetName);
      // Assert
      expect(delegate.createDataset).toBeTruthy();
    });

    it('should update the dataset name', async () => {
      // Arrange
      const datasetName = 'newDataSetName';
      // Act
      await bigQueryClient.createDataset(datasetName);
      // Assert
      expect(bigQueryClient.datasetName).toEqual('newDataSetName');
    });

    it('should return the dataset name', async () => {
      // Arrange
      const datasetName = 'newDataSetName';
      // Act
      const name = await bigQueryClient.createDataset(datasetName);
      // Assert
      expect(name).toEqual(datasetName);
    });

    it('should return errors', async () => {
      // Arrange
      const error = new Error('Dataset Error');

      createDatasetStub.mockRejectedValue(error);
      // Act
      await expect(bigQueryClient.createDataset('newDataSetName'))
        // Assert
        .rejects
        .toThrow(error)
    });
  });

  describe('createTable', () => {
    let datasetStub: jest.Mock;
    let createTableStub: jest.Mock;

    beforeEach(() => {
      createTableStub = jest.fn().mockResolvedValue([{ table: 'Table' }]);
      datasetStub = jest.fn(() => ({
        createTable: createTableStub,
      }));

      delegate.dataset = datasetStub;
    });

    it('should call bigQueryClient.dataset', async () => {
      // Arrange
      const table = 'table';
      const schema: BigQuerySchema = [];
      // Act
      await bigQueryClient.createTable(table, schema);
      // Assert
      expect(datasetStub).toHaveBeenCalled();
    });

    it('should return the table', async () => {
      // Arrange
      const table = 'table';
      const schema: BigQuerySchema = [];
      // Act
      const result = await bigQueryClient.createTable(table, schema);
      // Assert
      expect(result).toEqual({ table: 'Table' });
    });

    describe('when dataset.createTable returns an error', () => {
      it('should return an error', async () => {
        // Arrange
        const table = 'table';
        const schema: BigQuerySchema = [];
        const error = new Error('Yikes!');

        createTableStub.mockRejectedValue(error)

        // Act
        await expect(bigQueryClient.createTable(table, schema))
          // Assert
          .rejects
          .toThrow(error);
      });
    });

    describe('when partitioningOptions is defined', () => {
      it('should add partitioningOptions to the createTableOptions', async () => {
        // Arrange
        const table = 'table';
        const schema: BigQuerySchema = [];
        const partitionColumn = 'partitionColumn';
        const rangePartitioning = {
          field: partitionColumn,
          range: {
            start: '1',
            end: '1000',
            interval: '1',
          },
        };

        // Act
        await bigQueryClient.createTable(table, schema, { partitionColumn });

        // Assert
        expect(createTableStub).toHaveBeenCalledWith(
          table,
          {
            schema,
            rangePartitioning,
          }
        );
      })
    });

    describe('when tempTableOptions is defined', () => {
      it('should add an expiry date to the createTableOptions', async () => {
        // Arrange
        const table = 'table';
        const schema: BigQuerySchema = [];
        const tempTableOptions = {
          randomizeName: false,
          expirationTime: moment.utc('2025-03-04T12:34:56', moment.ISO_8601, true).toDate()
        }

        // Act
        await bigQueryClient.createTable(table, schema, undefined, tempTableOptions);

        // Assert
        expect(createTableStub).toHaveBeenCalledWith(
          table,
          {
            schema,
            expirationTime: '1741091696000',
          }
        );
      })
    });
  });

  describe('updateSchema', () => {
    let datasetStub: jest.Mock;
    let getMetadataStub: jest.Mock;
    let setMetadataStub: jest.Mock;

    beforeEach(() => {
      getMetadataStub = jest.fn().mockResolvedValue([{ table: 'Table' }]);
      setMetadataStub = jest.fn().mockResolvedValue([{ result: 'Set Metadata' }]);

      datasetStub = jest.fn(() => ({
        table: jest.fn(() => ({
          getMetadata: getMetadataStub,
          setMetadata: setMetadataStub,
        }))
      }));

      delegate.dataset = datasetStub;
    });

    it('should call bigQueryClient.dataset', async () => {
      // Arrange
      const table = 'table';
      const schema: BigQuerySchema = [];
      // Act
      await bigQueryClient.updateSchema(table, schema);
      // Assert
      expect(datasetStub).toHaveBeenCalled();
    });

    it('should return errors on getMetadata', async () => {
      // Arrange
      const table = 'table';
      const schema: BigQuerySchema = [];
      const error = new Error('getMetadata');

      getMetadataStub.mockRejectedValue(error);

      // Act
      await expect(bigQueryClient.updateSchema(table, schema))
        // Assert
          .rejects
          .toThrow(error);
    });

    it('should return errors on setMetadata', async () => {
      // Arrange
      const table = 'table';
      const schema: BigQuerySchema = [];
      const error = new Error('setMetadata');

      setMetadataStub.mockRejectedValue(error);

      // Act
      await expect(bigQueryClient.updateSchema(table, schema))
        // Assert
        .rejects
        .toThrow(error);
    });
  });
});

const randomString = (stringLength?: number) => {
  const length = stringLength || Math.floor(Math.random() * 11) + 10; // default to string length of 10 - 20 characters

  let rtn = '';
  for (let i = 0; i < length; i += 1) {
    const randomNumber = Math.random() * 52; // 2 * 26 chars
    const char = String.fromCharCode(randomNumber + (randomNumber > 26 ? 71 : 65)); // add 65 for upper case, 71 (97 - 26) for lower case letters
    rtn += char;
  }
  return rtn;
};
