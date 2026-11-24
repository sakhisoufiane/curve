/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
import moment from 'moment';
import { BigQuery } from '@google-cloud/bigquery';
import { config } from 'dotenv';
import { writeFileSync, unlinkSync } from 'node:fs';
import { Storage } from '@google-cloud/storage';
import { BigQueryClient, BigQuerySchema } from './bigquery-client';
import { defaultAuthentication } from './bigquery-client-factory';

config();
process.env.NODE_ENV = 'test';

const INTEGRATION_TESTING_BUCKET = 'curve-integration-testing-bucket'

const delegate = new BigQuery(defaultAuthentication());
const datasetName = 'IntegrationTestsDataset';
const bigQueryClient = new BigQueryClient({ datasetName }, delegate);

describe('bigQuery', () => {
  describe('datasetExists', () => {
    it('should return true if a dataset exists', async () => {
      // Act
      const result = await bigQueryClient.datasetExists(datasetName);

      // Assert
      expect(result).toEqual(true);
    });

    it('should return false if a dataset does not exist', async () => {
      // Act
      const result = await bigQueryClient.datasetExists(randomString(40));

      // Assert
      expect(result).toEqual(false);
    });
  });

  describe('tableExists', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    it('should return true if a table exists', async () => {
      await createTable(datasetName, tableName, [{ name: 'hello', type: 'string' }]);

      // Act
      const result = await bigQueryClient.tableExists(datasetName, tableName);

      // Assert
      expect(result).toEqual(true);
    });

    it('should return false if a table does not exist', async () => {
      // Act
      const result = await bigQueryClient.tableExists(datasetName, randomString(40));

      // Assert
      expect(result).toEqual(false);
    });

    it('should return false if a dataset does not exist', async () => {
      // Act
      const result = await bigQueryClient.tableExists(randomString(40), randomString(40));

      // Assert
      expect(result).toEqual(false);
    });
  });

  describe('createTable', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    it('should create the table', async () => {
      // Act
      const result = await bigQueryClient.createTable(
        tableName,
        [
          { name: 'bar', type: 'date' },
          { name: 'foo', type: 'string', mode: 'repeated' },
          { name: 'hello', type: 'record', mode: 'nullable', fields: [{ name: 'world', type: 'integer' }] },
        ]
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result.metadata).not.toBeNull();
      expect(result.metadata.schema).not.toBeNull();
      expect(result.metadata.schema.fields).not.toBeNull();
      expect(result.metadata.schema.fields.length).toEqual(3);

      const column0Result = result.metadata.schema.fields[0];
      expect(column0Result.name).toEqual('bar');
      expect(column0Result.type).toEqual('DATE');

      const column1Result = result.metadata.schema.fields[1];
      expect(column1Result.name).toEqual('foo');
      expect(column1Result.type).toEqual('STRING');
      expect(column1Result.mode).toEqual('REPEATED');

      const column2Result = result.metadata.schema.fields[2];
      expect(column2Result.name).toEqual('hello');
      expect(column2Result.type).toEqual('RECORD');
      expect(column2Result.mode).toEqual('NULLABLE');
      expect(column2Result.fields.length).toEqual(1);
      expect(column2Result.fields[0].name).toEqual('world');
      expect(column2Result.fields[0].type).toEqual('INTEGER');
    });

    it('should add partitions if available', async () => {
      // Act
      const result = await bigQueryClient.createTable(
        tableName,
        [
          { name: 'hello', type: 'integer' },
        ],
        {
          partitionColumn: 'hello'
        }
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result.metadata).not.toBeNull();
      expect(result.metadata.rangePartitioning).not.toBeNull();
      expect(result.metadata.rangePartitioning.field).toEqual('hello');
      expect(result.metadata.rangePartitioning.range.start).toEqual('1');
      expect(result.metadata.rangePartitioning.range.end).toEqual('1000');
      expect(result.metadata.rangePartitioning.range.interval).toEqual('1');
    });
  });

  describe('copyTable', () => {
    let sourceTableName: string;
    let destinationTableName: string;

    beforeEach(async () => {
      sourceTableName = randomString(40);
      destinationTableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, sourceTableName);
      await deleteTableIfExists(datasetName, destinationTableName);
    });

    it('should copy the table', async () => {
      await createTable(datasetName, sourceTableName, [{ name: 'hello', type: 'string' }]);

      // Act
      await bigQueryClient.copyTable(
        datasetName,
        sourceTableName,
        datasetName,
        destinationTableName,
      );

      // Assert
      const [result] = await delegate.dataset(datasetName).table(destinationTableName).get();
      expect(result).not.toBeNull();
      expect(result.metadata).not.toBeNull();
      expect(result.metadata.schema).not.toBeNull();
      expect(result.metadata.schema.fields).not.toBeNull();
      expect(result.metadata.schema.fields.length).toEqual(1);

      const column0Result = result.metadata.schema.fields[0];
      expect(column0Result.name).toEqual('hello');
      expect(column0Result.type).toEqual('STRING');
    });
  });

  describe('deleteTable', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    it('should delete the table', async () => {
      await createTable(datasetName, tableName, [{ name: 'hello', type: 'string' }]);

      // Act
      await bigQueryClient.deleteTable(tableName);

      // Assert
      const [result] = await delegate.dataset(datasetName).table(tableName).exists();
      expect(result).toEqual(false);
    });
  });

  describe('getSchema', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    it('should fetch the schema', async () => {
      const schema = [{ name: 'hello', type: 'STRING' }];
      await createTable(datasetName, tableName, schema);

      // Act
      const result = await bigQueryClient.getSchema(tableName);

      // Assert
      expect(result).toEqual({ fields: schema });
    });
  });

  describe('updateSchema', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    it('should update the schema', async () => {
      const originalSchema = [{ name: 'hello', type: 'STRING' }];
      await createTable(datasetName, tableName, originalSchema);

      const newSchema = [{ name: 'hello', type: 'STRING' }, { name: 'world', type: 'INTEGER' }]

      // Act
      await bigQueryClient.updateSchema(tableName, newSchema);

      // Assert
      const [tableResult] = await delegate.dataset(datasetName).table(tableName).get();
      expect(tableResult).not.toBeNull();
      expect(tableResult.metadata).not.toBeNull();
      expect(tableResult.metadata.schema).not.toBeNull();
      expect(tableResult.metadata.schema).toEqual({ fields: newSchema });
    });
  });

  describe('query', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    it('should execute the query and return the data', async () => {
      const data = [{
        hello: 'world',
      }];

      await createTable(datasetName, tableName, [{ name: 'hello', type: 'STRING' }]);
      await insertData(datasetName, tableName, data);

      // Act
      const result = await bigQueryClient.query(
        `SELECT * FROM \`${datasetName}.${tableName}\``,
        { job_type: 'test_query', client_id: 'test' },
      );

      // Assert
      expect(result).toEqual(data);
    });
  });

  describe('loadLocal', () => {
    let tableName: string;
    let fileName: string | undefined;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
      if (fileName) unlinkSync(fileName);
    });

    it('should load the data from a local file', async () => {
      await createTable(datasetName, tableName, [{ name: 'hello', type: 'STRING' }]);

      fileName = `${randomString(40)}.json`
      const data = { hello: 'world' };

      writeFileSync(fileName, JSON.stringify(data));

      // Act
      await bigQueryClient.loadLocal(fileName, tableName);

      // Assert
      const [result] = await delegate.query(`SELECT * FROM \`${datasetName}.${tableName}\``);
      expect(result).toEqual([data]);
    }, 15000);
  });

  describe('load', () => {
    let tableName: string;
    let fileName: string | undefined;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
      if (fileName) unlinkSync(fileName);
    });

    it('should load JSON data from a file in Cloud Storage', async () => {
      // Create the table to load to
      await createTable(datasetName, tableName, [{ name: 'hello', type: 'STRING' }]);

      // Create a file containing the data
      fileName = `${randomString(40)}.json`
      const data = { hello: 'world' };
      writeFileSync(fileName, JSON.stringify(data));

      // Upload to the integration testing bucket
      const storage = new Storage(defaultAuthentication());
      const [file] = await storage.bucket(INTEGRATION_TESTING_BUCKET).upload(fileName)

      // Act
      await bigQueryClient.load(
        file,
        tableName,
        'NEWLINE_DELIMITED_JSON',
        { job_type: 'test_load', client_id: 'test' }
      );

      // Assert
      const [result] = await delegate.query(`SELECT * FROM \`${datasetName}.${tableName}\``);
      expect(result).toEqual([data]);
    }, 15000);
  });

  describe('createReadSession', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    describe('with QueryStream', () => {
      describe('with chunkSize', () => {
        it('should load all the data on the stream if chunkSize is not set', async () => {
          const data = [
            { hello: 'world' },
            { hello: 'foo' },
            { hello: 'bar' }
          ];

          await createTable(datasetName, tableName, [{ name: 'hello', type: 'STRING' }]);
          await delegate.dataset(datasetName).table(tableName).insert(data);

          // Act
          const readSession = bigQueryClient.createReadSession(
            `SELECT * FROM \`${datasetName}.${tableName}\``,
            { job_type: 'test_read_stream', client_id: 'test' },
            { type: 'query-stream' },
          );
          await readSession.setup();
          const result = await readSession.read();
          await readSession.close();

          // Assert
          expect(result).toEqual(data);
        }, 15000);
      });

      it('should load data to the chunkSize', async () => {
        const element1 = { hello: 'world' };
        const element2 = { hello: 'foo' };
        const element3 = { hello: 'bar' };
        const data = [ element1, element2, element3 ];

        await createTable(datasetName, tableName, [{ name: 'hello', type: 'STRING' }]);
        await delegate.dataset(datasetName).table(tableName).insert(data);

        // Act
        const readSession = bigQueryClient.createReadSession(
          `SELECT * FROM \`${datasetName}.${tableName}\``,
          { job_type: 'test_read_stream', client_id: 'test' },
          { type: 'query-stream', chunkSize: 1 },
        );
        await readSession.setup();
        const result1 = await readSession.read();
        const result2 = await readSession.read();
        const result3 = await readSession.read();
        const result4 = await readSession.read();
        await readSession.close();

        // Assert
        expect(result1).toEqual([element1]);
        expect(result2).toEqual([element2]);
        expect(result3).toEqual([element3]);
        expect(result4).toEqual([]);
      }, 15000);
    });

    it('should return an empty array when no data is available', async () => {
      await createTable(datasetName, tableName, [{ name: 'hello', type: 'STRING' }]);

      // Act
      const readSession = bigQueryClient.createReadSession(
        `SELECT * FROM \`${datasetName}.${tableName}\``,
        { job_type: 'test_read_stream', client_id: 'test' },
        { type: 'query-stream', chunkSize: 1 },
      );
      await readSession.setup();
      const result = await readSession.read();
      await readSession.close();

      // Assert
      expect(result).toEqual([]);
    }, 15000);
  });

  describe('createWriteSession', () => {
    let tableName: string;

    beforeEach(async () => {
      tableName = randomString(40);
    });

    afterEach(async () => {
      await deleteTableIfExists(datasetName, tableName);
    });

    describe('JSON session', () => {
      it('should load data written to the session', async () => {
        await createTable(datasetName, tableName, [{ name: 'hello', type: 'STRING' }]);

        const data = { hello: 'world' };

        // Act
        const writeSession = bigQueryClient.createWriteSession(tableName, { job_type: 'test_write_json', client_id: 'test' }, { type: 'ndjson' });
        await writeSession.setup();
        await writeSession.write(data);
        await writeSession.close();

        // Assert
        const [result] = await delegate.query(`SELECT * FROM \`${datasetName}.${tableName}\``);
        expect(result).toEqual([data]);
      }, 15000);
    });

    describe('Avro session', () => {
      it('should load uncompressed data written to the session', async () => {
        const schema = [{ name: 'hello', type: 'STRING' }];
        await createTable(datasetName, tableName, schema);

        const data = { hello: 'world' };

        // Act
        const writeSession = bigQueryClient.createWriteSession(
          tableName,
          { job_type: 'test_write_avro_uncompressed', client_id: 'test' },
          { type: 'avro', bigQuerySchema: schema }
        );
        await writeSession.setup();
        await writeSession.write(data);
        await writeSession.close();

        // Assert
        const [result] = await delegate.query(`SELECT * FROM \`${datasetName}.${tableName}\``);
        expect(result).toEqual([data]);
      }, 15000);

      it('should load compressed data written to the session', async () => {
        const schema = [{ name: 'hello', type: 'STRING' }];
        await createTable(datasetName, tableName, schema);

        const data = { hello: 'world' };

        // Act
        const writeSession = bigQueryClient.createWriteSession(
          tableName,
          { job_type: 'test_write_avro_compressed', client_id: 'test' },
          { type: 'avro', bigQuerySchema: schema, compression: 'deflate' }
        );
        await writeSession.setup();
        await writeSession.write(data);
        await writeSession.close();

        // Assert
        const [result] = await delegate.query(`SELECT * FROM \`${datasetName}.${tableName}\``);
        expect(result).toEqual([data]);
      }, 15000);
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

const createTable = async (dataset: string, table: string, schema: BigQuerySchema) => {
  const expirationTime = moment().add(15, 'minutes').valueOf().toString();
  await delegate.dataset(dataset).createTable(table, {
    schema,
    expirationTime
  });
}

const insertData = async (dataset: string, table: string, rows: unknown[]) => {
  await delegate.dataset(dataset).table(table).insert(rows);
};

const deleteTableIfExists = async (dataset: string, table: string) => {
  await delegate.dataset(dataset).table(table).delete({ ignoreNotFound: true });
}