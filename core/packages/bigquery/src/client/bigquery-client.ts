import { BigQuery, Table, TableMetadata, JobMetadata } from '@google-cloud/bigquery';
import { retry, handleAll, ExponentialBackoff, halfJitterGenerator } from 'cockatiel';
import type { File } from '@google-cloud/bigquery';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@curveroyaltysystems/logger';
import moment from 'moment';
import { Schema } from 'avsc';
import { BigQueryWriteSession } from '../write/write-session';
import { AvroLocalFileHandler, SupportedCompression } from '../write/file/avro';
import { LocalToBigQueryWriteSession } from '../write/local-to-bigquery-write-session';
import { convertBigQuerySchemaToAvroSchema } from '../util/avro-utils';
import { NewLineDelimitedJsonLocalFileHandler } from '../write/file/json-nd';
import { BigQueryLabels } from './labels';
import { BigQueryReadSession } from '../read/session/read-session';
import { QueryStreamReadSession } from '../read/session/query-stream-read-session';
import { Query } from '../query-builder/query-builder';

export interface BigQueryClientOptions {
  /**
   * The name of the dataset that the clients data belongs to
   */
  datasetName?: string,
  /**
   * The name of the Sales Input table (ingested data) for the client
   */
  inputTable?: string,
  /**
   * The name of the Sales Output table (calculated sales) for the client
   */
  outputTable?: string,
  /**
   * The name of the Costs Output table (calculated costs) for the client
   */
  costsTable?: string,
  /**
   * The name of the Accounting table (aggregated input sales for Netsuite) for the client
   */
  accountingTable?: string,

  /**
   * The initial backoff delay before the first retry, in milliseconds. Each subsequent retry doubles this value. Defaults to 1,000ms.
   */
  retryBackoffTime?: number,
}

export interface BigQueryClientAuthenticationDetails {
  /**
   * The Google Cloud Project that the BigQuery instance is located in
   */
  projectId: string,
  credentials: {
    /**
     * The email address of the user to connect as
     */
    client_email: string
    /**
     * The private key
     */
    private_key: string
  }
}

export interface PartitioningOptions {
  /**
   * The name of the column we should partition against
   */
  partitionColumn: string,
  rangeStart?: number,
  rangeEnd?: number,
  rangeInterval?: number,
}

export interface TempTableOptions {
  /**
   * The Date the table should expire on
   */
  expirationTime: Date
  /**
   * Whether we should randomize the name given to the table. This avoids naming conflicts
   * when temporarily storing data for a process.
   */
  randomizeName?: boolean
}

export type BigQuerySchema = BigQuerySchemaField[]
export type BigQuerySchemaField = { name: string, type: string, mode?: string, fields?: BigQuerySchemaField[] }

export class BigQueryClient {
  private readonly delegate: BigQuery;

  private readonly retryBackoffTime: number;

  datasetName?: string;

  readonly inputTable?: string;

  readonly outputTable?: string;

  readonly costsTable?: string;

  readonly accountingTable?: string;

  constructor(opts: BigQueryClientOptions, delegate: BigQuery) {
    this.delegate = delegate;
    this.retryBackoffTime = opts.retryBackoffTime ?? 1000;
    this.datasetName = opts.datasetName;
    this.inputTable = opts.inputTable;
    this.outputTable = opts.outputTable;
    this.costsTable = opts.costsTable;
    this.accountingTable = opts.accountingTable;
  }

  /**
   * Checks if a BigQuery dataset exists already.
   *
   * @param datasetName - Dataset name.
   * @return True if the dataset exists, false if not
   */
  async datasetExists(datasetName: string): Promise<boolean> {
    const [res] = await this.delegate.dataset(datasetName).exists();
    return res;
  };

  /**
   * Checks if a BigQuery table exists already.
   *
   * @param datasetName - Dataset name.
   * @param tableName - Table name.
   * @return True if the dataset exists, false if not
   */
  async tableExists(datasetName: string, tableName: string): Promise<boolean> {
    const [res] = await this.delegate
      .dataset(datasetName)
      .table(tableName)
      .exists();
    return res;
  };

  /**
   * Creates a new BigQuery Dataset.
   *
   * @param {string} datasetName - Dataset name.
   * @return Promise<string> Resolves to the name of the new dataset
   */
  async createDataset(datasetName: string): Promise<string> {
    // Create the dataset
    await this.delegate.createDataset(datasetName, { location: 'EU' });
    // Set the dataset name
    this.datasetName = datasetName;
    // Return the dataset
    return datasetName;
  };

  /**
   * Creates a new BigQuery Table.
   *
   * @param tableName - Table name.
   * @param schema - BigQuery schema.
   * @param partitioningOptions - Options to partition the table. If null, table will not be partitioned
   * @param tempTableOptions - Information about how to make the table temporary. If null, table will remain indefinetely
   * @return The created Table
   */
  async createTable(
    tableName: string,
    schema: BigQuerySchema,
    partitioningOptions?: PartitioningOptions,
    tempTableOptions?: TempTableOptions
  ): Promise<Table> {
    if (!this.datasetName) {
      throw new Error('Dataset name not set. Please create the dataset first or provide a dataset name in the constructor.');
    }

    // Setup options
    const createTableOptions: TableMetadata = {
      schema
    };
    // Include partition in options if partition column exists
    if (partitioningOptions) {
      createTableOptions.rangePartitioning = {
        field: partitioningOptions.partitionColumn,
        range: {
          start: partitioningOptions.rangeStart?.toString() ?? '1',
          end: partitioningOptions.rangeEnd?.toString() ?? '1000',
          interval: partitioningOptions.rangeInterval?.toString() ?? '1',
        },
      };
    }

    if (tempTableOptions) {
      createTableOptions.expirationTime = tempTableOptions.expirationTime.valueOf().toString();
      if (tempTableOptions?.randomizeName !== false) {
        tableName = `${tableName}_${uuidv4().replace(/-/g, '')}`;
      }
    }

    // Call create table
    const [table] = await this.delegate.dataset(this.datasetName).createTable(tableName, createTableOptions);
    return table;
  };

  /**
   * Copied Big Query Tables from one dataset to the other.
   *
   * @param originalDataset - Dataset name to copy from.
   * @param originalTable - Table name to copy from.
   * @param destDataset - Dataset name to copy to.
   * @param destTable - Table name to copy to.
   * @returns The JobMetadata describing the Copy operation
   */
  async copyTable(
    originalDataset: string,
    originalTable: string,
    destDataset: string,
    destTable: string
  ): Promise<JobMetadata> {
    // We need to create a second instance of Big Query for the copy table functionality to work
    // See Google Example and Docs
    // https://github.com/googleapis/nodejs-bigquery/blob/6438df629e9adb707338bd53959c7c10e0ae2936/samples/copyTable.js
    // https://cloud.google.com/bigquery/docs/managing-tables#node.js
    // Copies src_dataset:src_table to dest_dataset:dest_table.
    const { projectId } = this.delegate;
    const bigquery = new BigQuery({ projectId });

    logger.debug(`Copying ${originalDataset}.${originalTable} -> ${destDataset}.${destTable}`);
    const destinationTable = bigquery.dataset(destDataset).table(destTable);
    const [job] = await this.delegate
      .dataset(originalDataset)
      .table(originalTable)
      .copy(destinationTable);
    return job;
  };

  /**
   * Deletes a BigQuery Dataset and any Tables inside.
   *
   * @param datasetId The Dataset to delete
   * @return Resolves once the Dataset is deleted
   */
  async deleteDataset(datasetId: string): Promise<void> {
    const dataset = this.delegate.dataset(datasetId);
    await dataset.delete({ force: true });
  };

  /**
   * Deletes a BigQuery Table.
   *
   * @param tableName - Table name.
   * @return Resolves once the Dataset is deleted
   */
  async deleteTable(tableName: string) {
    if (!this.datasetName) {
      throw new Error('Dataset name not set. Please create the dataset first or provide a dataset name in the constructor.');
    }

    await this.delegate.dataset(this.datasetName).table(tableName).delete();
  };

  /**
   * Gets a BigQuery Table's Schema.
   *
   * @param tableName - Table name.
   * @return The schema
   */
  async getSchema(tableName: string): Promise<BigQuerySchema> {
    if (!this.datasetName) {
      throw new Error('Dataset name not set. Please create the dataset first or provide a dataset name in the constructor.');
    }

    const [metadata] = await this.delegate.dataset(this.datasetName).table(tableName).getMetadata();
    return metadata.schema as BigQuerySchema;
  };

  /**
   * Updates a BigQuery Table's Schema.
   *
   * @param tableName Table name.
   * @param schema BigQuery schema.
   * @return {Promise<void>} Resolves once the schema is updated
   */
  async updateSchema(tableName: string, schema: BigQuerySchema): Promise<void> {
    if (!this.datasetName) {
      throw new Error('Dataset name not set. Please create the dataset first or provide a dataset name in the constructor.');
    }

    // Get original metadata
    const [metadata] = await this.delegate.dataset(this.datasetName).table(tableName).getMetadata();
    // Set schema against metadata
    metadata.schema = schema;
    // Set metadata to table
    await this.delegate.dataset(this.datasetName).table(tableName).setMetadata(metadata);
  };

  /**
   * Creates a query job, waits for the result, and then returns it.
   *
   * @param query The query to run
   * @param labels - Labels to add to the job. This can be searchable via INFORMATION_SCHEMA.JOBS_BY_USER_LABELS on BigQuery.
   * @param maxRetries The maximum number of retry attempts on failure.
   *   Uses exponential backoff starting at `this.retryBackoffTime`. Defaults to 3.
   * @returns {Promise<any[]>} - This promise will resolve containing the query results
   * @typeParam RowT - The form of the objects returned from BigQuery
   * @example
   * // Plain string query
   * const salesData = await this.query('SELECT * FROM `sales_data`', { document_id: '123' });
   * console.log(salesData);
   *
   * // Parameterized query
   * const salesData = await this.query({
   *    query: 'SELECT * FROM `sales_data` WHERE period_id = @period_id', params: { period_id: '123' } },
   *   { another_label: 'another_value' });
   * console.log(salesData);
   */
  async query<RowT>(query: string | Query, labels: BigQueryLabels, maxRetries = 3): Promise<RowT[]> {
    const jobTimeoutMs = 6 * 60 * 60 * 1000;
    const retryPolicy = retry(handleAll, {
      maxAttempts: maxRetries,
      backoff: new ExponentialBackoff({
        initialDelay: this.retryBackoffTime,
        maxDelay: 60000,
        generator: halfJitterGenerator
      }),
    });

    retryPolicy.onRetry((context) => {
      const cause = 'error' in context ? context.error : context.value;
      const message = cause instanceof Error ? cause.message : String(cause);
      logger.info(`BigQuery query retry attempt ${context.attempt} of ${maxRetries}: ${message}`);
    });

    retryPolicy.onGiveUp((context) => {
      const cause = 'error' in context ? context.error : context.value;
      logger.error(`BigQuery query failed after all ${maxRetries} attempts`, cause);
    });

    const queryString = typeof query === 'string' ? query : query.query;
    logger.debug('BigQuery query started', { query: queryString, labels });

    const result = await retryPolicy.execute(async () => {
      const jobId =
        moment().format('YYYYMMDDHHmmssSSSS') +
        Math.random()
          .toString(36)
          .replace(/[^a-z]+/g, '')
          .substring(0, 5);

      let response;
      if (typeof query === 'string') {
        response = await this.delegate.createQueryJob({ query, jobId, useLegacySql: false, jobTimeoutMs, labels });
      } else {
        response = await this.delegate.createQueryJob({
          query: query.query,
          jobId,
          params: query.params,
          useLegacySql: false,
          jobTimeoutMs,
          labels,
        });
      }

      const job = response[0];
      const [res] = await job.getQueryResults(job);
      return res as RowT[];
    });

    logger.debug('BigQuery query completed', { query: queryString, rowCount: result.length });
    return result;
  }

  /**
   * Loads data to a BigQuery table.
   *
   * @param file Either a path to a locally stored file, a GCS File to upload, or an array of GCS Files to upload
   * @param table The name of the table to upload the data to
   * @param sourceFormat The type of file being loaded. If not defined, the type will be autodetected.
   * @return Resolves once the load job is complete
   * @deprecated Use load instead, and provide labels. If you have a local file, you need to push this to GCS yourself.
   */
  async loadLocal(file: string | File | File[], table: string, sourceFormat?: 'NEWLINE_DELIMITED_JSON' | 'AVRO'): Promise<void> {
    if (!this.datasetName) {
      throw new Error('Dataset name not set. Please create the dataset first or provide a dataset name in the constructor.');
    }

    await this.delegate.dataset(this.datasetName).table(table).load(file, { useAvroLogicalTypes: true, sourceFormat });
  }

  /**
   * Loads data to a BigQuery table.
   *
   * @param gcsUri One or more paths to GCS files, or one or more GCS Files objects
   * @param table The name of the table to upload the data to
   * @param sourceFormat Specifies what file type is being uploaded.
   * @param labels - Labels to add to the job. This can be searchable via INFORMATION_SCHEMA.JOBS_BY_USER_LABELS on BigQuery.
   * @return Resolves once the load job is complete
   */
  async load(gcsUri: string | string[] | File | File[], table: string, sourceFormat: 'NEWLINE_DELIMITED_JSON' | 'AVRO', labels: BigQueryLabels) {
    if (!this.datasetName) {
      throw new Error('Dataset name not set. Please create the dataset first or provide a dataset name in the constructor.');
    }

    let wrappedUri: string[];
    if (Array.isArray(gcsUri)) {
      if (gcsUri.length === 0) {
        throw new Error('An empty array of files cannot be supplied');
      }

      if (typeof gcsUri[0] === 'string') {
        wrappedUri = gcsUri as string[];
      } else {
        wrappedUri = generateGcsUrls(gcsUri as File[]);
      }
    } else if (typeof gcsUri === 'string') {
      wrappedUri = [gcsUri as string];
    } else {
      wrappedUri = [generateGcsUrl(gcsUri as File)];
    }

    const [job] = await this.delegate.createJob({
      configuration: {
        load: {
          destinationTable: {
            projectId: this.delegate.projectId,
            datasetId: this.datasetName,
            tableId: table
          },
          sourceUris: wrappedUri,
          useAvroLogicalTypes: true,
          sourceFormat,
        },
        labels,
      },
    });

    await job.promise();
    logger.info(`Data successfully loaded to ${table}`);
  }

  createReadSession<RowT extends object>(query: Query | string, labels: BigQueryLabels, opts: ReadSessionOptions): BigQueryReadSession<RowT> {
    if (opts?.type === 'query-stream') {
      return new QueryStreamReadSession(this.delegate, query, labels, opts.chunkSize);
    }

    return new QueryStreamReadSession(this.delegate, query, labels);
  }

  createWriteSession<RowT extends object>(table: string, labels: BigQueryLabels, opts: WriteSessionOptions): BigQueryWriteSession<RowT> {
    let fileHandlerFactory;
    if (opts?.type === 'avro') {
      let schema;
      if (opts.avroSchema) {
        schema = opts.avroSchema;
      } else if (opts.bigQuerySchema) {
        schema = convertBigQuerySchemaToAvroSchema(opts.bigQuerySchema);
      } else {
        throw new Error('A schema must be provided')
      }

      fileHandlerFactory = () => new AvroLocalFileHandler(schema, opts.compression, opts.tempDir);
    } else {
      fileHandlerFactory = () => new NewLineDelimitedJsonLocalFileHandler(opts?.tempDir)
    }

    return new LocalToBigQueryWriteSession<RowT>(
      this,
      fileHandlerFactory,
      table,
    );
  }
}

export type ReadSessionOptions = QueryStreamReadSessionOptions | undefined;
export type QueryStreamReadSessionOptions = { type: 'query-stream', chunkSize?: number }

export type WriteSessionOptions = AvroWriteSessionOptions | NewLineDelimitedJsonWriteSessionOptions | undefined
export type GeneralWriteSessionOptions = {
  /**
   * What format we should write the data in. Options are `ndjson` for new-line delimited JSON, or `avro`
   */
  type: 'ndjson' | 'avro',
  /**
   * The name of the temp directory to write local files to. Defaults to `${appDir}/tmp`
   */
  tempDir?: string
};
export interface NewLineDelimitedJsonWriteSessionOptions extends GeneralWriteSessionOptions {
  type: 'ndjson';
}
export interface AvroWriteSessionOptions extends GeneralWriteSessionOptions {
  type: 'avro';
  /**
   * Chooses what kind of compression to use. Data will be uncompressed if not set
   */
  compression?: SupportedCompression;
  /**
   * The BigQuery schema to use when writing the data. One of `bigQuerySchema` or `avroSchema` must be set.
   */
  bigQuerySchema?: BigQuerySchema;
  /**
   * The Avro schema to use when writing the data. One of `bigQuerySchema` or `avroSchema` must be set.
   */
  avroSchema?: Schema;
}

const generateGcsUrls = (files: File[]) => files.map((file) => generateGcsUrl(file));
const generateGcsUrl = (file: File) =>`gs://${file.bucket.name}/${file.name}`;
