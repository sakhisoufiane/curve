/* eslint-disable no-param-reassign */
/* eslint-disable no-inner-declarations */

/** @module bigQuery */
// Imports the Google Cloud client library
const { BigQuery } = require('@google-cloud/bigquery');
const { ReservationServiceClient } = require('@google-cloud/bigquery-reservation');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const async = require('async');
const chunk = require('chunk');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const query = require('./query');

/**
 * @typedef {string | number | boolean | null} PrimitiveFilterValue - Primitive types allowed as filter values.
 */

/**
 * @typedef {{
 *   $in?: PrimitiveFilterValue[],
 *   $nin?: PrimitiveFilterValue[],
 *   $ne?: PrimitiveFilterValue,
 *   $gt?: number | Date,
 *   $gte?: number | Date,
 *   $lt?: number | Date,
 *   $lte?: number | Date,
 *   $exists?: boolean
 * }} FilterOperatorObject - Represents filter operators like $in, $nin, $gt, etc.
 */

/**
 * @typedef {{
 *   [field: string]: PrimitiveFilterValue | FilterOperatorObject | BigQueryFilter[] | undefined,
 *   $or?: BigQueryFilter[],
 *   $and?: BigQueryFilter[]
 * }} BigQueryFilter - Represents a filter structure for BigQuery queries, potentially nested using $or and $and.
 * Allows key-value pairs where keys are field names and values are primitive types or operator objects,
 * or keys are $or/$and with an array of filters.
 */

const privateKey = process.env.BQ_private_key ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '';

const bgClientOptions = {
  projectId: process.env.BQ_project_id,
  credentials: {
    client_email: process.env.BQ_client_email,
    private_key: privateKey,
  },
};
let bigQueryClient = new BigQuery(bgClientOptions);

// Tracks how many times a query has been retried.
const queryRetriesTracker = {};
/**
 * Creates a BigQuery Instance.
 * @constructor
 * @param {object} params - Parameters for initializing Big Query.
 * @param {string} params.datasetName - Dataset name.
 * @param {string} params.inputTable - Input table name.
 * @param {string} params.outputTable - Output table name.
 * @param {string} params.costsTable - Costs table name.
 * @param {string} params.accountingTable - Accounting table name.
 * @param {object} [params.bigQueryClient] - BigQuery Client.
 */

const bigQuery = function (params) {
  // Initialise
  this.datasetName = params.datasetName;
  this.inputTable = params.inputTable;
  this.outputTable = params.outputTable;
  this.costsTable = params.costsTable;
  this.accountingTable = params.accountingTable;
  this.writeFileLocked = false;
  this.uploadFileLocked = false;
  this.allFiles = [];
  this.msBeforeRetryingErrors = 2000;

  // Tests will pass in a bigQueryClient in params
  if (params.bigQueryClient) {
    bigQueryClient = params.bigQueryClient;
  }
  this.client = bigQueryClient;

  /**
   * Checks if a BigQuery dataset exists already.
   *
   * Calls callback(err, exists) with a [exists] boolean (true if dataset exists).
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} datasetName - Dataset name.
   * @param {function(string, boolean)} callback - The callback that handles the response.
   */

  this.datasetExists = async function (datasetName, callback) {
    try {
      // Setup dataset
      const checkDataset = bigQueryClient.dataset(datasetName);
      // Check it exists
      checkDataset.exists((err, exists) => {
        // Returns boolean value
        callback(err, exists);
      });
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Checks if a BigQuery table exists already.
   *
   * Calls callback(err, exists) with a [exists] boolean (true if table exists).
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} datasetName - Dataset name.
   * @param {string} tableName - Table name.
   * @param {function(string, boolean)} callback - The callback that handles the response.
   */

  this.tableExists = async function (datasetName, tableName, callback) {
    try {
      // Setup table
      const checkTable = bigQueryClient.dataset(datasetName).table(tableName);
      // Check it exists
      checkTable.exists((err, exists) => {
        // Returns boolean value
        callback(err, exists);
      });
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Creates a new BigQuery Dataset.
   *
   * Calls callback(err, datasetName) with a [datasetName] object containing the returned dataset name.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} datasetName - Dataset name.
   * @param {function(string, string)} callback - The callback that handles the response.
   */

  this.createDataset = async function (datasetName, callback) {
    try {
      // Create the dataset
      await bigQueryClient.createDataset(datasetName, { location: 'EU' });
      // Set the dataset name
      this.datasetName = datasetName;
      // Return the dataset
      callback(null, datasetName);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Creates a new BigQuery Table.
   *
   * Calls callback(err, table) with a [table] object containing the returned table.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} tableName - Table name.
   * @param {object} schema - BigQuery schema.
   * @param {string} partitionColumn - Partition Column.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.createTable = async function (tableName, schema, partitionColumn, callback) {
    // Setup options
    const createTableOptions = {
      schema,
    };
    // Include partition in options if partition column exists
    if (partitionColumn) {
      createTableOptions.rangePartitioning = {
        field: partitionColumn,
        range: {
          start: 1,
          end: 1000,
          interval: 1,
        },
      };
    }
    try {
      // Call create table
      const [table] = await bigQueryClient.dataset(this.datasetName).createTable(tableName, createTableOptions);
      // Return the table
      callback(null, table);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Creates a new Temporary BigQuery Table.
   *
   * Returns the returned table.
   *
   * @static
   * @param {object} params - Parameters for the temporary table
   * @param {string} params.tableName - Table name (required)
   * @param {object} params.schema - BigQuery schema
   * @param {string} [params.partitionColumn] - Optional: Partition Column
   * @param {Date}   params.expirationTime - Time at which table should expire
   * @param {boolean} [params.randomizeName=true] - Optional: Whether to append a random string to the table name to ensure uniqueness. Defaults to true.
   * @returns {Promise<Table>} - Promise which returns a Google Big Query Table
   * @throws {Error} Throws an error if any required parameters are not supplied
   * @throws {Error} Throws an error if no table is returned by createTable
   * or it will reject with the error returned from bigQueryClient.dataset().createTable()
   * @example
   * const tempTable = await bigQuery.createTempTable({
   *   tableName: 'TheTableOfTheDay',
   *   schema: [{name: 'id', type: 'STRING', mode: 'REQUIRED'}],
   *   partitionColumn: 42,
   *   expirationTime: 1748605635086,
   *   randomizeName: true
   * });
   * console.log(tempTable);
   */

  this.createTempTable = async function ({ tableName, schema, partitionColumn, expirationTime, randomizeName }) {
    if (!tableName || !schema || !expirationTime) {
      throw new Error('Missing required parameters');
    }
    // Setup options
    const createTableOptions = {
      schema,
      expirationTime,
    };
    const uniqueTableName = (randomizeName !== false) ? `${tableName}_${uuidv4().replace(/-/g, '')}` : tableName;

    // Include partition in options if partition column exists
    if (partitionColumn) {
      createTableOptions.rangePartitioning = {
        field: partitionColumn,
        range: {
          start: 1,
          end: 1000,
          interval: 1,
        },
      };
    }
    // Call create table
    const result = await bigQueryClient.dataset(this.datasetName).createTable(uniqueTableName, createTableOptions);
    if (!result?.length) {
      throw new Error(`Failed to create Table ${tableName}`);
    }
    const [table] = result;
    // Return the table
    return table;
  };

  /**
   * Copied Big Query Tables from one dataset to the other.
   *
   * Calls callback(err, job) with an object containing the Big Query Job information.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} originalDataset - Dataset name to copy from.
   * @param {string} originalTable - Table name to copy from.
   * @param {string} destDataset - Dataset name to copy to.
   * @param {string} destTable - Table name to copy to.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.copyTable = async function (originalDataset, originalTable, destDataset, destTable, callback) {
    // We need to create a second instance of Big Query for the copy table functonality to work
    // See Google Example and Docs
    // https://github.com/googleapis/nodejs-bigquery/blob/6438df629e9adb707338bd53959c7c10e0ae2936/samples/copyTable.js
    // https://cloud.google.com/bigquery/docs/managing-tables#node.js
    // Copies src_dataset:src_table to dest_dataset:dest_table.
    const projectId = process.env.BQ_project_id;
    const bigquery = new BigQuery({ projectId });
    logger.debug(`Copying ${originalDataset}.${originalTable} -> ${destDataset}.${destTable}`);
    try {
      const [job] = await bigQueryClient
        .dataset(originalDataset)
        .table(originalTable)
        .copy(bigquery.dataset(destDataset).table(destTable));
      callback(null, job);
    } catch (err) {
      callback(err);
    }
  };

  // To come back to this function, I need to format the expirationDate to milliseconds before setting the metaData on the BQ tables. - Function curently cannot be used.
  // this.setExpirationDate = async function (expirationDate, datasetName, callback) {
  //   try {
  //     // Retreive current table metadata
  //     const dataset = bigQueryClient.dataset(datasetName);
  //     const [metadata] = await dataset.getMetadata(datasetName);

  //     // Set new table expiration to 5 days from current time
  //     metadata.expirationTime = expirationDate.toString();
  //     const [apiResponse] = await dataset.setMetadata(metadata);

  //     const newExpirationTime = apiResponse.expirationTime;
  //     callback(null, newExpirationTime);
  //   } catch (err) {
  //     callback(err);
  //   }
  // };

  /**
   * Deletes a BigQuery Dataset and any Tables inside.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {function(object)} callback - The callback that handles the response.
   */

  this.deleteDataset = async function (datasetId, callback) {
    try {
      const dataset = bigQueryClient.dataset(datasetId);
      // Delete the dataset and its contents
      await dataset.delete({ force: true });
      callback();
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Deletes a BigQuery Table.
   *
   * Calls callback(err, table) with a [table] object containing the returned table.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} tableName - Table name.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.deleteTable = async function (tableName, callback) {
    try {
      // Call create table
      const [table] = await bigQueryClient.dataset(this.datasetName).table(tableName).delete();
      // Return the table
      callback(null, table);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Gets a BigQuery Table's Schema.
   *
   * Calls callback(err, schema) with a [schema] object containing the returned schema.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} tableName - Table name.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.getSchema = async function (tableName, callback) {
    try {
      // Get original metadata
      const [metadata] = await bigQueryClient.dataset(this.datasetName).table(tableName).getMetadata();
      // Set schema against metadata
      callback(null, metadata.schema);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Updates a BigQuery Table's Schema.
   *
   * Calls callback(err, result) with a [result] object containing the result from bigQueryClient.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} tableName - Table name.
   * @param {object} schema - BigQuery schema.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.updateSchema = async function (tableName, schema, callback) {
    try {
      // Get original metadata
      const [metadata] = await bigQueryClient.dataset(this.datasetName).table(tableName).getMetadata();
      // Set schema against metadata
      metadata.schema = schema;
      // Set metadata to table
      const [result] = await bigQueryClient.dataset(this.datasetName).table(tableName).setMetadata(metadata);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Logs a BigQuery query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - Table name.
   * @param {string} query - BigQuery query.
   * @param {string} type - Query type - is used to analyse clients usage of the platform.
   * @param {function(string)} callback - The callback that handles the response.
   */

  this.logQuery = async function (table, query, type, callback) {
    const bq = this;
    try {
      // Run dry run for query
      bq.queryDryRun(query, (err, metadata) => {
        if (err) {
          // Handle Error
          if (callback) {
            callback(err);
          }
        } else if (metadata) {
          // Stream data to DB
          try {
            if (typeof query !== 'string') {
              query = query.query;
            }
            bigQueryClient
              .dataset('QueryLogs')
              .table('QueryLogsA')
              .insert([
                {
                  table,
                  type,
                  size: metadata.statistics.totalBytesProcessed,
                  query,
                  timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
                },
              ])
              .catch((e) => {
                logger.error(e);
                logger.error(e.response.insertErrors[0].errors);
              });
          } catch (e) {
            // console.error(e);
          }
          if (callback) {
            callback();
          }
        } else if (callback) {
          callback();
        }
      });
    } catch (err) {
      if (callback) {
        callback(err);
      }
    }
  };

  /**
   * Returns the sum of a numeric column that matches a specified filter.
   *
   * Calls callback(err, count) with a [count] of the total rows.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - Table name.
   * @param {string} countColumn - BigQuery column.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, number)} callback - The callback that handles the response.
   */

  this.getCount = async function (table, countColumn, filter, callback) {
    try {
      let query = `SELECT  SUM(1) AS ${countColumn} FROM \`${this.datasetName}.${table}\``;

      if (filter && Object.keys(filter).length !== 0) {
        query += ` WHERE ${this.filterFromObject(filter)} `;
      }

      // Reduce catalogue requests to much smaller
      query = this.catalogueIdsToParams(query, 'releaseId IN ', 'releaseIds');
      query = this.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
      query = this.catalogueIdsToParams(query, 'workId IN ', 'workIds');

      // Log query
      this.logQuery(table, query, 'Calculation');

      this.queryJob(query, callback);
    } catch (err) {
      // console.log(err);
      callback(err);
    }
  };

  /**
   * Gets data from a BigQuery table.
   *
   * Calls callback(err, data) with [data] from the table.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - Table name.
   * @param {string} countColumn - BigQuery column.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, number)} callback - The callback that handles the response.
   */

  this.getData = async function (table, select, filter, options, callback) {
    try {
      const query = this.getDataQuery(table, select, filter, options);
      // Log query
      this.logQuery(table, query, 'Calculation');
      // Run query
      this.queryJob(query, callback);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Formats the getData query .
   * @function
   * @param {string} table - Table name.
   * @param {string} select - fields to select from the table.
   * @param {object} filter - BigQuery filter.
   * @param {object} options - Query options
   * @param {string} options.orderBy - Fields to order by.
   * @param {string} options.orderDir - Order direction: 'DESC' or 'ASC'.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @returns {string} query - The formatted query.
   */

  this.getDataQuery = function (table, select, filter, options) {
    // Setup query
    let query = `SELECT ${this.selectQueryFromArray(select)}
    FROM \`${this.datasetName}.${table}\`
    WHERE ${this.filterFromObject(filter)}`;

    // If options contains order
    if (options && options.orderBy) {
      if (Array.isArray(options.orderBy)) {
        query += ` ORDER BY ${options.orderBy.join(', ')} `;
      } else {
        query += ` ORDER BY ${options.orderBy} `;
        if (options.orderDir) {
          query += options.orderDir;
        } else {
          query += 'ASC';
        }
      }
    }
    // If options contains limit
    if (options && options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    // If options contains offset
    if (options && options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    return query;
  };

  /**
   * Returns the number of rows that match a specified filter.
   *
   * Calls callback(err, count) with a [count] of the total documents.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - Table name.
   * @param {string} selection - BigQuery column.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, number)} callback - The callback that handles the response.
   */

  this.getSize = async function (table, selection, filter, callback) {
    try {
      // Setup query
      if (!selection) {
        selection = '*';
      }
      /* eslint-disable prefer-const */
      let query = `SELECT COUNT(${selection}) as count
      FROM \`${this.datasetName}.${table}\`
      WHERE ${this.filterFromObject(filter)}`;
      /* eslint-enable prefer-const */

      // Reduce catalogue requests to much smaller
      query = this.catalogueIdsToParams(query, 'releaseId IN ', 'releaseIds');
      query = this.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
      query = this.catalogueIdsToParams(query, 'workId IN ', 'workIds');

      // Log query
      this.logQuery(table, query, 'Calculation');
      // Run query
      this.queryJob(query, callback);
    } catch (err) {
      logger.error(err);
      callback(err);
    }
  };

  /**
   * Runs the BigQuery query.
   *
   * Calls callback(err, result) with a [result] of the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} query - Query to run.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.query = async function (query, callback) {
    logger.debug(query);
    const bq = this;
    try {
      if (typeof query === 'string') {
        // Send query
        const [res] = await bigQueryClient.query({ query });
        // Return result
        callback(null, res);
      } else {
        // Send query
        const [res] = await bigQueryClient.query(query);
        // Return result
        callback(null, res);
      }
    } catch (err) {
      logger.error('Error Code:', err.code);
      logger.error(err);
      // Catch 409 error and retry
      if (await bq.retryErroredQuery(err, query)) {
        logger.info('Retrying..');
        // Wait two seconds
        setTimeout(() => {
          // Retry
          bq.query(query, callback);
        }, 2000);
      } else {
        // Return any errors
        callback(err);
      }
    }
  };

  /**
   * Asynchronously runs this.query, wrapping the result in a Promise so it can be awaited instead of using callbacks.
   *
   * @param {String} query - Query to run.
   * @returns {Promise<Array>} - This promise will resolve with the same result as if calling this.query()
   * or it will reject with the error returned from this.query()
   */
  this.queryPromisify = async function (query) {
    return new Promise((resolve, reject) => {
      this.query(query, (error, response) => {
        if (error) {
          reject(error);
        } else if (response) {
          resolve(response);
        } else {
          reject(new Error('Query did not produce an error or a response'));
        }
      });
    });
  };

  /**
   * @deprecated Use `this.queryJobPromise` instead.
   * Creates a query job, waits for the result and then returns it.
   *
   * Calls callback(err, result) with a [result] from the query job.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} query - Query to run.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.queryJob = async function (query, callback) {
    const bq = this;
    const jobTimeoutMs = 6 * 60 * 60 * 1000;

    try {
      // Create job
      let response;
      const jobId =
        moment().format('YYYYMMDDHHmmssSSSS') +
        Math.random()
          .toString(36)
          .replace(/[^a-z]+/g, '')
          .substr(0, 5);
      if (typeof query === 'string') {
        response = await bigQueryClient.createQueryJob({ query, jobId, useLegacySql: false, jobTimeoutMs });
      } else {
        response = await bigQueryClient.createQueryJob({
          query: query.query,
          jobId,
          params: query.params,
          useLegacySql: false,
          jobTimeoutMs,
        });
      }
      const job = response[0];
      // Wait for the query to finish
      const [res] = await job.getQueryResults(job);
      // Return result
      callback(null, res);
    } catch (err) {
      logger.error('Error Code:', err.code);
      logger.error(err);
      // Catch 409 error and retry
      if (await bq.retryErroredQuery(err, query)) {
        logger.info('Retrying..');
        // Wait two seconds
        setTimeout(() => {
          // Retry
          bq.queryJob(query, callback);
        }, 2000);
      } else {
        // Return any errors
        callback(err);
      }
    }
  };

  /**
   * Creates a query job, waits for the result and then returns it.
   *
   * @param {object} params - Parameters for the query job.
   * @param {string|{query: string, params: object}} params.query - Query to run. Can be a string, or an object with `query` and `params` properties for parameterized queries.
   * @param {object} params.labels - Labels to add to the job. This can be searchable via INFORMATIONS_SCHEMA.JOBS_BY_USER_LABELS on BigQuery.
   * @returns {Promise<Array>} - This promise will resolve with the same result as if calling this.queryJob()
   * or it will reject with the error returned from this.queryJob()
   * @example
   * const salesData = await this.queryJobPromise({ query: 'SELECT * FROM `sales_data`', labels: { period_id: '123' } });
   * console.log(salesData);
   *
   * const salesData = await this.queryJobPromise({
   *   query: {
   *     query: 'SELECT * FROM `sales_data` WHERE period_id = period_id',
   *     params: { period_id: '123' }
   *   },
   *   labels: { another_label: 'another_value' } // Example labels for the parameterized query
   * });
   * console.log(salesData);
   */

  this.queryJobPromise = async function ({ query, labels }) {
    const jobTimeoutMs = 6 * 60 * 60 * 1000;
    let retries = 0;
    const maxRetries = 3;

    do {
      try {
        // Create job
        let response;
        const jobId =
          moment().format('YYYYMMDDHHmmssSSSS') +
          Math.random()
            .toString(36)
            .replace(/[^a-z]+/g, '')
            .substr(0, 5);

        if (typeof query === 'string') {
          // eslint-disable-next-line no-await-in-loop
          response = await bigQueryClient.createQueryJob({ query, jobId, useLegacySql: false, jobTimeoutMs, labels });
        } else {
          // eslint-disable-next-line no-await-in-loop
          response = await bigQueryClient.createQueryJob({
            query: query.query,
            jobId,
            params: query.params,
            useLegacySql: false,
            jobTimeoutMs,
            labels,
          });
        }
        const job = response[0];
        // Wait for the query to finish
        // eslint-disable-next-line no-await-in-loop
        const [res] = await job.getQueryResults(job);
        // Return result on success
        return res;
      } catch (err) {
        retries += 1;
        logger.error(`Error executing query (Attempt ${retries}/${maxRetries}):`, err.code, err.message);
        if (retries >= maxRetries) {
          logger.error('Max retries reached. Rethrowing error.');
          throw err;
        }
        // Wait 2 seconds before retrying
        logger.info(`BIGQUERY: Waiting 2 seconds before retry attempt ${retries + 1}...`);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      }
    } while (retries < maxRetries);

    // This part should ideally not be reached if the loop logic is correct,
    // but as a safeguard, throw an error if the loop finishes unexpectedly.
    throw new Error('Query job promise failed after multiple retries without throwing.');
  };

  /**
   * Performs a query dry run.
   *
   * Calls callback(err, result) with a [result] from the query dry run job.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} query - Query to run.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.queryDryRun = async function (query, callback) {
    try {
      let response;
      if (typeof query === 'string') {
        response = await bigQueryClient.createJob({
          configuration: { query: { query, useLegacySql: false }, dryRun: true },
        });
      } else {
        response = await bigQueryClient.createJob({
          configuration: { query: { query: query.query, params: query.params, useLegacySql: false }, dryRun: true },
        });
      }

      callback(null, response[0].metadata);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Deletes rows that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - BigQuery table.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.deleteData = async function (table, filter, callback) {
    const bq = this;
    let query;
    try {
      // Prepare deletion request
      query = `DELETE
      FROM \`${bq.datasetName}.${table}\`
      WHERE ${bq.filterFromObject(filter)}`;
      // Log query
      logger.debug(query);

      bq.logQuery(table, query, 'Delete');
      logger.info('Attempting to delete Sales Lines | ', filter);
      bq.queryJob(query, async (err, originalResult) => {
        if (err) {
          // Handle any errors from query
          if (await bq.retryErroredQuery(err, query)) {
            logger.info('Retrying Deletion Query..');
            // Wait two seconds
            setTimeout(() => {
              // Retry
              bq.queryJob(query, callback);
            }, 2000);
          } else {
            // Return any errors
            callback(err);
          }
        } else {
          // Count lines
          query = `SELECT COUNT(*) as count
          FROM \`${bq.datasetName}.${table}\`
          WHERE ${bq.filterFromObject(filter)}`;

          logger.info('Counting Deleted Sales Lines... | ', filter);

          // Log query
          logger.debug(query);

          bq.queryJob(query, async (countQueryErr, res) => {
            if (countQueryErr) {
              if (await bq.retryErroredQuery(countQueryErr, query)) {
                logger.info('Retrying Deletion Count Query..');
                // Wait two seconds
                setTimeout(() => {
                  // Retry
                  bq.queryJob(query, callback);
                }, 2000);
              } else {
                // Return any errors
                callback(countQueryErr);
              }
            } else if (res[0] && res[0].count === 0) {
              callback(null, originalResult);
            } else {
              logger.info('Deleted Sales Lines still remain in Table | Retrying Delete Method... | ', filter);
              // Rerun deletion
              bq.deleteData(table, filter, callback);
            }
          });
        }
      });
    } catch (err) {
      if (await bq.retryErroredQuery(err, query)) {
        logger.info('Retrying Full Deletion Method..');
        // Wait two seconds
        setTimeout(() => {
          // Retry
          bq.deleteData(table, filter, callback);
        }, 2000);
      } else {
        // Return any errors
        callback(err);
      }
    }
  };

  /**
   * Updates rows that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - BigQuery table.
   * @param {object} filter - BigQuery filter.
   * @param {object} update - Update object.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.updateData = async function (table, filter, update, callback) {
    const bq = this;
    if (!update) {
      callback(new Error('Update object must be passed'));
    } else {
      try {
        // Prepare query
        let query = `UPDATE \`${this.datasetName}.${table}\`
          SET `;
        // Check if object passed
        if (typeof update === 'object') {
          // Create SET string from object
          query += Object.keys(update)
            .filter((key) => update[key])
            .map((key) => {
              if (typeof update[key] === 'number') {
                return `${key} = ${update[key]}`;
              }
              if (typeof update[key] === 'object' && update[key] && update[key].value) {
                return `${key} = "${update[key].value}"`;
              }
              if (typeof update[key] === 'object' && update[key]) {
                return `${key} = ${update[key]}`;
              }
              if (Array.isArray(update[key])) {
                return `${key} = ${bq.filterArrayToVales(update[key])}`;
              }
              return `${key} = "${update[key]}"`;
            })
            .join(', ');
        } else {
          // Else add a string
          query += update;
        }
        // Add filter
        query += ` WHERE ${bq.filterFromObject(filter)}`;
        // Log query
        bq.logQuery(table, query, 'Update');
        // Send query
        bq.queryJob(query, callback);
      } catch (err) {
        callback(err);
      }
    }
  };

  /**
   * Gets distinct values from a column that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - BigQuery table.
   * @param {string} column - BigQuery column.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.getDistinct = async function (table, column, filter, callback) {
    // Get Distinct values for a column
    try {
      let query = `SELECT
      DISTINCT ${column}
      FROM \`${this.datasetName}.${table}\` WHERE `;
      if (Array.isArray(column)) {
        query += column.map((item) => `${item} IS NOT NULL `).join(' AND ');
      } else {
        query += `${column} IS NOT NULL `;
      }
      query += `AND ${this.filterFromObject(filter)}`;
      // Log query
      this.logQuery(table, query, 'Sales Ingestion');
      // Send query
      this.queryJob(query, (err, data) => {
        if (err) {
          callback(err);
        } else {
          // Format array of objects into array of distinct values and return
          callback(
            err,
            data.map((row) => row[column])
          );
        }
      });
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Gets distinct values from a column that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - BigQuery table.
   * @param {string} column - BigQuery column.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.getDistinctCount = async function (table, column, filter, callback) {
    // Get Distinct values for a column
    try {
      let query = `SELECT
      COUNT(DISTINCT(${column})) as count 
      FROM \`${this.datasetName}.${table}\` WHERE `;
      if (Array.isArray(column)) {
        query += column.map((item) => `${item} IS NOT NULL `).join(' AND ');
      } else {
        query += `${column} IS NOT NULL `;
      }
      query += `AND ${this.filterFromObject(filter)}`;
      // Log query
      this.logQuery(table, query, 'Sales Ingestion');
      // Send query
      this.queryJob(query, (err, data) => {
        if (err) {
          callback(err);
        } else {
          // Format array of objects into array of distinct values and return
          callback(err, data[0]);
        }
      });
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Gets distinct values from a multiple columns that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - BigQuery table.
   * @param {array} columns - BigQuery columns.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.getMultiDistinct = async function (table, columns, filter, callback) {
    // Get Distinct values for a column
    try {
      const query = `SELECT
      DISTINCT ${columns.join(', ')}
      FROM \`${this.datasetName}.${table}\`
      WHERE ${this.filterFromObject(filter)}`;
      // Log query
      this.logQuery(table, query, 'Sales Ingestion');
      // Send query
      this.queryJob(query, (err, data) => {
        // Format array of objects into array of distinct values and return
        callback(err, data);
      });
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Gets aggregate values from multiple columns that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - BigQuery table.
   * @param {object[]} selector - Columns to select.
   * @param {object} selector.object - Single column object.
   * @param {string} selector.object.column - Column name.
   * @param {boolean} selector.object.isSelector - True if it should be used in the 'Select' query.
   * @param {boolean} selector.object.isGroupBy - True if it should be used in the 'Group By' query.
   * @param {object[]} sumColumns - Columns to SUM.
   * @param {object} sumColumns.object - Single SUM column object.
   * @param {string} sumColumns.object.column - Column name.
   * @param {string} sumColumns.object.displayAs - Display Column As.
   * @param {string} countColumn - Count column name.
   * @param {object} filter - BigQuery filter.
   * @param {object} options - Query options.
   * @param {string} options.orderBy - Fields to order by.
   * @param {string} options.orderDir - Order direction: 'DESC' or 'ASC'.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.getAggregate = async function (table, selector, sumColumns, countColumn, filter, options, callback) {
    try {
      if (!callback) {
        callback = options;
      }
      const query = this.getAggregateQuery(table, selector, sumColumns, countColumn, filter, options);
      logger.debug(query);
      // Log query
      this.logQuery(table, query, 'Calculation');
      // Send query
      this.queryJob(query, callback);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Formats aggregate query.
   * @static
   * @param {string} table - BigQuery table.
   * @param {object[]} selector - Columns to select.
   * @param {object} selector.object - Single column object.
   * @param {string} selector.object.column - Column name.
   * @param {boolean} selector.object.isSelector - True if it should be used in the 'Select' query.
   * @param {boolean} selector.object.isGroupBy - True if it should be used in the 'Group By' query.
   * @param {object[]} sumColumns - Columns to SUM.
   * @param {object} sumColumns.object - Single SUM column object.
   * @param {string} sumColumns.object.column - Column name.
   * @param {string} sumColumns.object.displayAs - Display Column As.
   * @param {string} countColumn - Count column name.
   * @param {object} filter - BigQuery filter.
   * @param {object} options - Query options.
   * @param {string} options.orderBy - Fields to order by.
   * @param {string} options.orderDir - Order direction: 'DESC' or 'ASC'.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @returns {string} query - Formatted query.
   */

  this.getAggregateQuery = function (table, selector, sumColumns, countColumn, filter, options) {
    let query = `
          SELECT ${[this.formatSelector(selector).select, this.getSumQuery(sumColumns), `COUNT(*) AS ${countColumn}`].filter(Boolean).join(', ')}
              FROM \`${this.datasetName}.${table}\``;

    if (filter && Object.keys(filter).length !== 0) {
      query += ` WHERE ${this.filterFromObject(filter)}`;
    } else {
      query += ' WHERE true';
    }

    const { groupBy } = this.formatSelector(selector);
    if (groupBy) {
      query += ` GROUP BY ${groupBy}`;
    }

    // If options contains orderBy
    if (options && options.orderBy) {
      if (Array.isArray(options.orderBy)) {
        query += ` ORDER BY ${options.orderBy.join(', ')} `;
      } else {
        query += ` ORDER BY ${options.orderBy} `;
        if (options.orderDir) {
          query += options.orderDir;
        } else {
          query += 'ASC';
        }
      }
    }
    // If options contains limit
    if (options && options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    // If options contains offset
    if (options && options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    return query;
  };

  /**
   * Formats select columns.
   * @static
   * @param {object[]} selector - Columns to select.
   * @param {object} selector.object - Single column object.
   * @param {string} selector.object.column - Column name.
   * @param {boolean} selector.object.isSelector - True if it should be used in the 'Select' query.
   * @param {boolean} selector.object.isGroupBy - True if it should be used in the 'Group By' query.
   * @returns {object} query - Formatted query object with two arrays: select and groupBy.
   */

  this.formatSelector = function (selector) {
    const query = { select: [], groupBy: [] };

    if (typeof selector === 'string') {
      // It's a string, apply to both GROUP BY and SELECT
      query.select = selector;
      query.groupBy = selector;
      return query;
    }
    if (Array.isArray(selector)) {
      // It's an array
      selector.map((field) => {
        if (field.isSelector) {
          query.select.push(field.column);
        }
        if (field.isGroupBy) {
          query.groupBy.push(field.column);
        }
      });

      return {
        select: query.select.join(', '),
        groupBy: query.groupBy.join(', '),
      };
    }
    return { select: '', groupBy: '' };
  };

  /**
   * Formats SUM columns.
   * @static
   * @param {object[]} sumColumns - Columns to SUM.
   * @param {object} sumColumns.object - Single SUM column object.
   * @param {string} sumColumns.object.column - Column name.
   * @param {string} sumColumns.object.displayAs - Display Column As.
   * @returns {array} query - Formatted array of SUM queries.
   */

  this.getSumQuery = function (columns) {
    let query = '';

    if (columns && Array.isArray(columns)) {
      query = columns
        .map((column) => (column.column && column.displayAs ? `SUM(${column.column}) AS ${column.displayAs}` : null))
        .filter(Boolean)
        .join(', ');
    }

    return query;
  };

  /**
   * Gets Sales Input table aggregate values from multiple columns that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs
   * @static
   * @param {string} groupBy - Column/Array of columns to group by.
   * @param {object[]} sumColumns - Columns to SUM.
   * @param {object} sumColumns.object - Single SUM column object.
   * @param {string} sumColumns.object.column - Column name.
   * @param {string} sumColumns.object.displayAs - Display Column As.
   * @param {string} countColumn - Count column name.
   * @param {object} filter - BigQuery filter.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.getSalesInputAggregate = async function (groupBy, sumColumns, countColumn, filter, callback) {
    try {
      let query;
      if (groupBy === 'periodId') {
        query = `SELECT ${this.getSumQuery(sumColumns)}, COUNT(*) AS ${countColumn}
            FROM (
          SELECT string_agg(Output.contractId) as ContractIds,Output.salesLineId,Output.periodId,${this.getSalesInputSelectQueryArgs(sumColumns)}
          FROM  \`${this.datasetName}.${this.outputTable}\` Output
          JOIN \`${this.datasetName}.${this.inputTable}\` Input
          ON Output.salesLineId = Input.id
          GROUP BY Output.salesLineId, Output.periodId, units, homeCurrencyNetAmount)
          `;
      } else if (Array.isArray(groupBy)) {
        query = `SELECT ${groupBy.join(', ')}, ${this.getSumQuery(sumColumns)}, COUNT(*) AS ${countColumn}
            FROM (
          SELECT string_agg(Output.contractId) as ContractIds, 
          Output.salesLineId, ${groupBy.map((item) => `Output.${item}`).join(', ')}, ${this.getSalesInputSelectQueryArgs(sumColumns)}
          FROM \`${this.datasetName}.${this.outputTable}\` Output
          JOIN \`${this.datasetName}.${this.inputTable}\` Input
          ON Output.salesLineId = Input.id
          GROUP BY Output.salesLineId, ${groupBy.map((item) => (item.includes('Output') ? item : `Output.${item}`)).join(', ')}, units, homeCurrencyNetAmount)
          `;
      } else {
        query = `SELECT ${groupBy}, ${this.getSumQuery(sumColumns)}, COUNT(*) AS ${countColumn}
            FROM (
          SELECT string_agg(Output.contractId) as ContractIds,Output.salesLineId,Output.periodId,Output.${groupBy},${this.getSalesInputSelectQueryArgs(sumColumns)}
          FROM \`${this.datasetName}.${this.outputTable}\` Output
          JOIN \`${this.datasetName}.${this.inputTable}\` Input
          ON Output.salesLineId = Input.id
          GROUP BY Output.salesLineId, Output.periodId, Output.${groupBy}, units, homeCurrencyNetAmount)
          `;
      }

      if (filter && Object.keys(filter).length !== 0) {
        query += `
            WHERE ${this.filterFromObject(filter)}`;
      }
      query += `
            GROUP BY ${groupBy}`;
      // Log query
      this.logQuery(this.inputTable, query, 'Calculation');
      // Send query
      this.queryJob(query, callback);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Gets Sales Input table aggregate values from multiple columns that match a specified filter.
   *
   * Calls callback(err, result) with a [result] from the query.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {object[]} columns - Columns to SUM.
   * @param {object} columns.object - Single SUM column object.
   * @param {string} columns.object.column - Column name.
   * @returns {array} query - Array of input columns to select.
   */

  this.getSalesInputSelectQueryArgs = function (columns) {
    let query = '';

    if (columns && Array.isArray(columns)) {
      query = columns
        .map((column) => (column.column ? `Input.${column.column}` : null))
        .filter(Boolean)
        .join(', ');
    }

    return query;
  };

  /**
   * Setup a json file to write data to.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {(function(string))} callback - The callback that handles the response.
   */

  this.setupFile = function (callback) {
    const bq = this;
    // Setup file name and set to object
    bq.fileLocation = `${appRootDir}/tmp/${moment().format('YYYYMMDDHHmmssSSSS')}${Math.random().toString(36).substr(2, 5)}.json`;
    // Add file to all files array
    bq.allFiles.push(this.fileLocation);
    // Create file
    fs.writeFile(this.fileLocation, '', (err) => {
      // Allow writing to file
      bq.writeFileLocked = false;
      callback(err);
    });
  };

  /**
   * Writes data to the json file.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {object[]} data - Data to write to the file.
   * @param {string} table - Table to write to.
   * @param {function(string)} callback - The callback that handles the response.
   */

  this.writeToFile = function (data, table, callback) {
    const bq = this;
    // Check if file is locked to writing
    if (bq.writeFileLocked) {
      // Waiting two seconds
      setTimeout(() => {
        // Recall function
        bq.writeToFile(data, table, callback);
      }, 200);
    } else {
      // Continue to write to file
      if (!callback) {
        callback = table;
        table = null;
      }
      if (!data || !Array.isArray(data)) {
        // Return error
        callback(new Error('Data must be an array'));
      } else {
        async.waterfall(
          [
            function (waterfallCb) {
              // Setup file if it doesn't exist
              if (fs.existsSync(bq.fileLocation)) {
                waterfallCb();
              } else {
                logger.error(`File doesn't exist at ${bq.fileLocation}, setting up new file`);
                bq.setupFile(waterfallCb);
              }
            },
            function (waterfallCb) {
              // Structure array to string
              const chunks = chunk(data, 25000);
              async.eachSeries(
                chunks,
                (dataChunk, cb) => {
                  let output = '';
                  dataChunk.forEach((item) => {
                    output += `${JSON.stringify(item)}\r\n`;
                  });
                  fs.appendFile(bq.fileLocation, output, (err) => {
                    cb(err);
                  });
                },
                waterfallCb
              );
            },
            function (waterfallCb) {
              if (table && fs.existsSync(bq.fileLocation)) {
                // Check file size
                const fileStats = fs.statSync(bq.fileLocation);
                const fileSizeInMb = fileStats.size / 1000000.0;
                /// Check if over 50GB
                if (fileSizeInMb > 50000 && !bq.writeFileLocked) {
                  // Pause for random amount of time to prevent multiple uploads
                  const pause = Math.floor(Math.random() * Math.floor(1000));
                  setTimeout(() => {
                    if (!bq.writeFileLocked) {
                      // Lock file for any more writes
                      bq.writeFileLocked = true;
                      // Write to DB
                      // Pause 2 seconds to allow any writes to complete
                      setTimeout(() => {
                        bq.writeFileToDb(table, (err) => {
                          if (err) {
                            bq.writeFileLocked = false;
                            waterfallCb(err);
                          } else {
                            bq.setupFile((setupFileErr) => {
                              bq.writeFileLocked = false;
                              waterfallCb(setupFileErr);
                            });
                          }
                        });
                      }, 2000);
                    } else {
                      waterfallCb();
                    }
                  }, pause);
                } else {
                  waterfallCb();
                }
              } else {
                waterfallCb();
              }
            },
          ],
          (err) => {
            // Unlock writing again
            bq.writeFileLocked = false;
            callback(err);
          }
        );
      }
    }
  };

  /**
   * Writes the data in the json file to the database.
   *
   * Calls callback(err, result) with a [job] from  bigQuery.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - Table to write to.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.writeFileToDb = async function (table, callback) {
    const bq = this;

    try {
      // Check if file is locked
      if (bq.uploadFileLocked) {
        // Waiting 200ms
        setTimeout(() => {
          // Recall function
          logger.info('Waiting for locked file');
          bq.writeFileToDb(table, callback);
        }, 2000);
      } else if (fs.existsSync(bq.fileLocation)) {
        // Pause for random amount of time to prevent multiple uploads
        const pause = Math.floor(Math.random() * Math.floor(1000));
        setTimeout(() => {
          if (!bq.uploadFileLocked) {
            logger.info('Locking file for writing');
            // Lock file for any more writes
            bq.uploadFileLocked = true;
            // Write to DB
            // Pause 2 seconds to allow any writes to complete
            setTimeout(async () => {
              logger.info('Writing file to DB:', bq.fileLocation);
              // Load file to DB
              try {
                const [job] = await bigQueryClient.dataset(bq.datasetName).table(table).load(bq.fileLocation);

                // Check for errors
                if (!job.errors) {
                  // Remove file
                  fs.unlink(bq.fileLocation, (err) => {
                    bq.uploadFileLocked = false;
                    logger.info('Completed Writing File to DB');
                    // Check any other files that need writing
                    bq.checkAllFilesWrittenToDb(table, () => {
                      callback(null, job);
                    });
                  });
                } else if (await bq.retryErroredQuery(job.errors, bq.fileLocation)) {
                  logger.error('Error Code:', job.errors.code);
                  logger.error(job.errors);
                  logger.info('Retrying..');
                  bq.uploadFileLocked = false;
                  setTimeout(() => {
                    bq.writeFileToDb(table, callback);
                  }, 5000);
                } else {
                  // Return errors
                  bq.uploadFileLocked = false;
                  logger.error(job.errors);
                  callback(job.errors, null);
                }
              } catch (err) {
                logger.error('Error Code:', err.code);
                logger.error(err);
                if (await bq.retryErroredQuery(err, bq.fileLocation)) {
                  logger.info('Retrying..');
                  bq.uploadFileLocked = false;
                  setTimeout(() => {
                    bq.writeFileToDb(table, callback);
                  }, 5000);
                } else {
                  // Return errors
                  bq.uploadFileLocked = false;
                  callback(err, null);
                }
              }
            }, 2000);
          } else {
            callback();
          }
        }, pause);
      } else {
        callback();
      }
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Writes all available files to the database.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - Table to write to.
   * @param {function(string)} callback - The callback that handles the response.
   */

  this.checkAllFilesWrittenToDb = async function (table, callback) {
    const bq = this;
    async.eachSeries(
      this.allFiles,
      (file, cb) => {
        if (file !== bq.fileLocation) {
          bq.writeSpecificFileToDb(table, file, cb);
        } else {
          cb();
        }
      },
      callback
    );
  };

  /**
   * Writes the data in a specific json file to the database.
   *
   * Calls callback(err, result) with a [job] from  bigQuery.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string} table - Table to write to.
   * @param {string} file - File path.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.writeSpecificFileToDb = async function (table, file, callback) {
    const bq = this;
    try {
      if (fs.existsSync(file)) {
        // Pause for random amount of time to prevent multiple uploads
        const pause = Math.floor(Math.random() * Math.floor(1000));
        setTimeout(() => {
          if (!bq.uploadFileLocked) {
            // Lock file for any more writes
            bq.uploadFileLocked = true;
            // Write to DB
            // Pause 2 seconds to allow any writes to complete
            setTimeout(async () => {
              logger.info('Writing Specific file to DB:', bq.fileLocation);
              try {
                // Load file to DB
                const [job] = await bigQueryClient.dataset(bq.datasetName).table(table).load(file);

                // Check for errors
                if (!job.errors) {
                  // Remove file
                  fs.unlink(file, (err) => {
                    bq.uploadFileLocked = false;
                    logger.info('Completed Writing File to DB');
                    callback(null, job);
                  });
                } else if (await bq.retryErroredQuery(job.errors, bq.fileLocation)) {
                  logger.info('Write Rate limit exceeded - trying again');
                  bq.uploadFileLocked = false;
                  setTimeout(() => {
                    bq.writeSpecificFileToDb(table, file, callback);
                  }, 5000);
                } else {
                  // Return errors
                  bq.uploadFileLocked = false;
                  logger.error(job.errors);
                  callback(job.errors, null);
                }
              } catch (err) {
                if (await bq.retryErroredQuery(err, bq.fileLocation)) {
                  logger.info('Write Rate limit exceeded - trying again');
                  bq.uploadFileLocked = false;
                  setTimeout(() => {
                    bq.writeSpecificFileToDb(table, file, callback);
                  }, 5000);
                } else {
                  // Return errors
                  bq.uploadFileLocked = false;
                  logger.error(err);
                  callback(err, null);
                }
              }
            }, 2000);
          } else {
            callback();
          }
        }, pause);
      } else {
        callback();
      }
    } catch (err) {
      logger.error('CAUGHT ERROR');
      logger.error(err);
    }
  };

  /**
   * Formats an array into an SQL query.
   * @static
   * @param {string[]} array - Array of values to select.
   * @returns {string} query - Formatted select query.
   */

  this.selectQueryFromArray = function (array) {
    // Returns SQL string from array or string
    // Check if object
    if (Array.isArray(array)) {
      // Return joined array
      return array.join(', ');
    }
    // Return passed value - allows for passing of SQL filter string
    return array;
  };

  /**
   * Formats a MongoDB filter object into an SQL filter.
   * @static
   * @param {object} object - MongoDB filter.
   * @param {string} table - BigQuery table to filter.
   * @returns {string} query - Formatted filter query.
   */

  this.filterFromObject = function (object, table) {
    // Returns SQL string from MongoDB query
    const bq = this;
    // Check if object
    if (typeof object === 'object' && Object.keys(object).length > 0) {
      // Setup result array
      const result = [];
      // Loop through object keys
      Object.keys(object).forEach((key) => {
        // Setup return query string
        let query = '';

        if (key.includes('$or') && object[key].length > 0) {
          query += '(';
          query += object[key].map((item) => `(${bq.filterFromObject(item, table)})`).join(' OR ');
          query += ')';
        } else if (key.includes('$and') && object[key].length > 0) {
          query += '(';
          query += object[key].map((item) => `(${bq.filterFromObject(item, table)})`).join(' AND ');
          query += ')';
        } else if (key !== '$or' && key !== '$and') {
          // Add key to query
          function keyValue(field = key) {
            if (table) {
              return `${table}.${field}`;
            }
            return field;
          }

          // we want to ignore filtertypes, except is_blank as this is sent without a corresponding key
          if (key.endsWith('FilterType')) {
            const fieldKey = key.replace('FilterType', '');
            if (object[key] === 'is_blank') {
              query += `(${keyValue(fieldKey)} IS NULL OR ${keyValue(fieldKey)} = '')`;
              result.push(query);
            } else if (object[key] === 'is_not_blank') {
              query += `${keyValue(fieldKey)} IS NOT NULL`;
              result.push(query);
            }
            return;
          }

          // Check what type of object has been passed
          if (Array.isArray(object[key])) {
            // Add as array
            query += `${keyValue()} IN ${bq.filterArrayToVales(object[key])}`;
          } else if (object[key] === null) {
            // Add as null query
            query += `${keyValue()} IS NULL`;
          } else if (typeof object[key] === 'object' && object[key].$in && object[key].$in.length > 0) {
            // Add as array
            query += `${keyValue()} IN ${bq.filterArrayToVales(object[key].$in)}`;
          } else if (typeof object[key] === 'object' && object[key].$nin && object[key].$nin.length > 0) {
            // Add as not in array
            query += `${keyValue()} NOT IN ${bq.filterArrayToVales(object[key].$nin)}`;
          } else if (typeof object[key] === 'object' && object[key].$exists === false) {
            // Add IS NULL
            query += `${keyValue()} IS NULL`;
          } else if (typeof object[key] === 'object' && object[key].$exists === true) {
            // Add IS NOT NULL
            query += `${keyValue()} IS NOT NULL`;
          } else if (
            typeof object[key] === 'object' &&
            (Object.keys(object[key]).includes('$gt') ||
              Object.keys(object[key]).includes('$gte') ||
              Object.keys(object[key]).includes('$lt') ||
              Object.keys(object[key]).includes('$lte'))
          ) {
            // Add Date or Number Filters
            const comparisons = [];
            if (object[key].$gt || object[key].$gt === 0) {
              comparisons.push(`${keyValue()} > ${dateOrValue(object[key].$gt)}`);
            }
            if (object[key].$gte || object[key].$gte === 0) {
              comparisons.push(`${keyValue()} >= ${dateOrValue(object[key].$gte)}`);
            }
            if (object[key].$lt || object[key].$lt === 0) {
              comparisons.push(`${keyValue()} < ${dateOrValue(object[key].$lt)}`);
            }
            if (object[key].$lte || object[key].$lte === 0) {
              comparisons.push(`${keyValue()} <= ${dateOrValue(object[key].$lte)}`);
            }
            query += comparisons.join(' AND ');
          } else if (typeof object[key] === 'number') {
            // Add as a number
            query += `${keyValue()} = ${object[key]}`;
          } else if (typeof object[key] === 'object' && (object[key].$ne || object[key].$ne === 0)) {
            // Not Equal query : $ne
            if (typeof object[key].$ne === 'number') {
              query += `${keyValue()} != ${object[key].$ne}`;
            } else {
              query += `${keyValue()} != '${object[key].$ne}'`;
            }
          } else if (typeof object[key] === 'string') {
            // Else just add as a string
            // Apply LIKE with wildcards for "contains" filter type
            if (object[`${key}FilterType`] === 'contains') {
              query += `LOWER(${keyValue()}) LIKE LOWER('%${object[key]}%')`;
            } else if (object[`${key}FilterType`] === '=') {
              query += `LOWER(${keyValue()}) = LOWER('${object[key]}')`;
            } else {
              query += `${keyValue()} = '${object[key]}'`;
            }
          } else if (typeof object[key] === 'boolean') {
            query += `${keyValue()} = ${object[key]}`;
          }
        }
        // Add query if it exists
        if (query && query !== '') {
          result.push(query);
        }
      });
      if (result.length > 0) {
        // Return joined result as SQL string
        return result.join(' AND ');
      }
      // Default to true when filters amount to nothing
      return 'true';
    }
    if (Object.keys(object).length === 0) {
      // A blank filter should set it to true
      return 'true';
    }
    // Return passed value - allows for passing of SQL filter string
    return object;

    function dateOrValue(value) {
      if (value instanceof Date) {
        return `"${moment(value).format('YYYY-MM-DD')}"`;
      }
      return value;
    }
  };

  /**
   * Formats an array into an SQL query.
   * @static
   * @param {array} array - Array of values to format.
   * @returns {string} query - Formatted query.
   */

  this.filterArrayToVales = function (array) {
    // Returns SQL string from array
    // Check if array
    if (Array.isArray(array)) {
      // Setup result
      let result = '(';
      // Loop through each value in array
      result += array
        .map((item) => {
          // It number, just add as a number
          if (typeof item === 'number') {
            return item;
          }
          if (typeof item === 'string') {
            // Else add it as a string
            return `"${item.replace(/(['"])/g, '\\$1')}"`;
          }
          return item;
        })
        .join(', ');
      // Add closing of the array
      result += ')';
      // Return the string
      return result;
    }
    // When not array, return null - no error thrown
    return null;
  };

  this.buildAndRunJoinQuery = async ({ selectFields, distinctFields, filter, options, periodId }) => {
    const FilteredInputTableKey = 'FilteredInput';
    // const FilteredOutputTableKey = 'FilteredOutput';

    const filteredInputTable = `
      WITH ${FilteredInputTableKey} AS (
        SELECT ${selectFields.join(', ')}
        FROM \`${this.datasetName}.${this.inputTable}\`
        WHERE (${this.filterFromObject(filter)})
      ),
    `;

    const filteredOutputTable = `
      AggregatedOutput AS (
        SELECT
          salesLineId,
          STRING_AGG(contractId) AS contractIds,
          STRING_AGG(releaseId) AS releaseIds,
          STRING_AGG(catalogueIsrc) AS trackIsrcs
        FROM \`${this.datasetName}.${this.outputTable}\`
        WHERE salesLineId IN (SELECT id FROM FilteredInput)
        AND periodId = '${periodId}'
        GROUP BY salesLineId
      )
    `;

    let query = `
      ${filteredInputTable}\n
      ${filteredOutputTable}\n
      SELECT
        AggregatedOutput.contractIds,
        AggregatedOutput.releaseIds,
        AggregatedOutput.trackIsrcs,
        FilteredInput.*
      FROM FilteredInput
      LEFT JOIN AggregatedOutput ON FilteredInput.id = AggregatedOutput.salesLineId
    `;

    if (options && options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    // If options contains offset
    if (options && options.offset) {
      query += ` OFFSET ${options.offset}`;
    } else if (options.limit) {
      query += ' OFFSET 0';
    }

    // this.logQuery(this.inputTable, query, 'Calculation');
    console.time('buildAndRunJoinQuery');
    const [job, res] = await this.queryJobAync(query);
    console.timeEnd('buildAndRunJoinQuery');
    logger.debug(`BIG QUERY JOBID: ${job.id} | `, query);
    return res;
  };

  /**
   * Creates the Sales Calculation join filter.
   *
   * Calls callback(err, result) with a [result] from  bigQuery.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string[]} salesInputColumns - list of columns to select.
   * @param {string[]} distinctColumns - list of columns to get distinct values for.
   * @param {object} filter - BigQuery filter.
   * @param {object} options - Query options.
   * @param {string} options.orderBy - Fields to order by.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @param {boolean} options.uniqueValue - If only unique values should be selected.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.joinSalesCalculationFilter = async function (salesInputColumns, distinctColumns, filter, options, callback) {
    try {
      /* eslint-disable prefer-const */
      let query = this.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options);
      /* eslint-enable prefer-const */
      query = this.catalogueIdsToParams(query, 'releaseId IN ', 'releaseIds');
      query = this.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
      query = this.catalogueIdsToParams(query, 'workId IN ', 'workIds');

      // Log query
      this.logQuery(this.inputTable, query, 'Calculation');
      // Send query
      this.queryJob(query, callback);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Creates the Sales Calculation filter query.
   * @static
   * @param {string[]} salesInputColumns - list of columns to select.
   * @param {string[]} distinctColumns - list of columns to get distinct values for.
   * @param {object} filter - BigQuery filter.
   * @param {object} options - Query options.
   * @param {string} options.orderBy - Fields to order by.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @param {boolean} options.uniqueValue - If only unique values should be selected.
   * @param {boolean} options.uniqueValue - If only unique values should be selected.
   * @returns {string} query - Formatted filter query.
   */

  this.joinSalesCalculationFilterQuery = function (salesInputColumns, distinctColumns, filter, options) {
    let query = 'SELECT';
    if (options && options.uniqueValue) {
      query += ` "${options.uniqueValue.replace(/[\W_]+/g, '')}" as uniqueValue,`;
    }
    // eslint-disable-next-line max-len
    query += ` STRING_AGG(Output.contractId) AS contractIds, STRING_AGG(Output.releaseId) AS releaseIds, STRING_AGG(Output.catalogueIsrc) AS trackIsrcs, ${this.formatJoinColumnsSelect('Input', salesInputColumns).join(', ')}
      FROM \`${this.datasetName}.${this.inputTable}\` Input`;
    query += ` LEFT OUTER JOIN \`${this.datasetName}.${this.outputTable}\` Output
      ON (Output.salesLineId = Input.id)`;
    query += ` GROUP BY ${[].concat(this.formatJoinColumnsGroupBy(null, distinctColumns)).join(', ')}`;
    if (filter && Object.keys(filter).length !== 0) {
      query += `
      HAVING (${this.filterFromObject(filter)})`;
    }
    // If options contains orderBy
    if (options && options.orderBy) {
      if (Array.isArray(options.orderBy)) {
        query += ` ORDER BY ${options.orderBy.join(', ')} `;
      } else {
        query += ` ORDER BY ${options.orderBy} `;
        if (options.orderDir) {
          query += options.orderDir;
        } else {
          query += 'ASC';
        }
      }
    }
    // If options contains limit
    if (options && options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    // If options contains offset
    if (options && options.offset) {
      query += ` OFFSET ${options.offset}`;
    } else if (options.limit) {
      query += ' OFFSET 0';
    }
    return query;
  };

  /**
   * Creates the Sales Calculation query.
   * @param {object} param0 - Parameters.
   * @param {string[]} param0.salesInputColumns - List of columns to select.
   * @param {string[]} param0.distinctColumns - List of columns to get distinct values for.
   * @param {BigQueryFilter} param0.filter - BigQuery filter.
   * @param {object} param0.options - Query options.
   * @param {string} param0.options.orderBy - Fields to order by.
   * @param {number} param0.options.limit - Limit the documents returned.
   * @param {number} param0.options.offset - Number of documents to skip.
   * @param {string} param0.view - View to get sales data from.
   * @returns {string} query - Query.
   *
   * @example
   * const query = this.calculationQuery({
   *   salesInputColumns: ['catType'],
   *   distinctColumns: ['contractId', 'releaseId', 'catalogueIsrc'],
   *   filter: { salesFileId: { $in: ['123', '456'] } },
   *   options: { orderBy: 'sales', limit: 10, offset: 0 },
   *   view: 'sales_data'
   * });
   * console.log(query);
   *
   */
  this.calculationQuery = function ({ salesInputColumns, distinctColumns, filter, options, view }) {
    let query = 'SELECT';
    if (options && options.uniqueValue) {
      query += ` "${options.uniqueValue.replace(/[\W_]+/g, '')}" as uniqueValue,`;
    }
    const filterQuery = this.filterFromObject(filter);

    query += `
        STRING_AGG(reportedContractId) AS contractIds,
        STRING_AGG(releaseId) AS releaseIds, 
        STRING_AGG(catalogueIsrc) AS trackIsrcs, 
        ${salesInputColumns.join(', ')}
      FROM \`${this.datasetName}.${view}\` Input
      WHERE (${filterQuery})
      GROUP BY ${distinctColumns.join(', ')}
    `; // Ensure this closes the initial part of the query correctly

    // If options contains orderBy
    if (options && options.orderBy) {
      if (Array.isArray(options.orderBy)) {
        query += ` ORDER BY ${options.orderBy.join(', ')} `;
      } else {
        query += ` ORDER BY ${options.orderBy} `;
        if (options.orderDir) {
          query += options.orderDir;
        } else {
          query += 'ASC';
        }
      }
    }
    // If options contains limit
    if (options && options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    // If options contains offset
    if (options && options.offset) {
      query += ` OFFSET ${options.offset}`;
    } else if (options && options.limit) {
      // Ensure offset 0 is added if limit is present but offset is not
      query += ' OFFSET 0';
    }

    return query;
  };

  /**
   * Get sales data from the output view.
   *
   * @param {object} param0 - Parameters.
   * @param {string[]} param0.salesInputColumns - List of columns to select.
   * @param {string[]} param0.distinctColumns - List of columns to get distinct values for.
   * @param {BigQueryFilter} param0.filter - BigQuery filter.
   * @param {object} param0.options - Query options.
   * @param {string} param0.options.orderBy - Fields to order by.
   * @param {number} param0.options.limit - Limit the documents returned.
   * @param {number} param0.options.offset - Number of documents to skip.
   * @param {string} param0.view - View to get sales data from.
   * @param {object} param0.labels - Labels to add to the job. This can be searchable via INFORMATIONS_SCHEMA.JOBS_BY_USER_LABELS on BigQuery.
   * @returns {Array<object>} salesData - Sales data.
   *
   * @example
   * const salesData = await this.getSalesDataFromOutputView({
   *   salesInputColumns: ['catType'],
   *   distinctColumns: ['contractId', 'releaseId', 'catalogueIsrc'],
   *   filter: { salesFileId: { $in: ['123', '456'] } },
   *   options: { orderBy: 'sales', limit: 10, offset: 0 },
   *   view: 'sales_data',
   *   labels: { period_id: '123' }
   * });
   * console.log(salesData);
   */
  this.getSalesDataFromOutputView = async function ({
    salesInputColumns,
    distinctColumns,
    filter,
    options,
    view,
    labels,
  }) {
    let query = this.calculationQuery({ salesInputColumns, distinctColumns, filter, options, view });

    query = this.catalogueIdsToParams(query, 'releaseId IN ', 'releaseIds');
    query = this.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
    query = this.catalogueIdsToParams(query, 'workId IN ', 'workIds');

    const salesData = await this.queryJobPromise({ query, labels });

    return salesData;
  };

  /**
   * Creates the Sales Calculation filter query object.
   * @static
   * @param {string[]} salesInputColumns - list of columns to select.
   * @param {string[]} distinctColumns - list of columns to get distinct values for.
   * @param {object} filter - BigQuery filter.
   * @param {object} options - Query options.
   * @param {string} options.orderBy - Fields to order by.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @param {boolean} options.uniqueValue - If only unique values should be selected.
   * @param {boolean} options.uniqueValue - If only unique values should be selected.
   * @returns {object} query - Formatted filter query object.
   */

  this.joinSalesCalculationFilterQueryObject = function (salesInputColumns, distinctColumns, filter, options) {
    /* eslint-disable prefer-const */
    let query = this.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options);
    /* eslint-enable prefer-const */
    query = this.catalogueIdsToParams(query, 'releaseId IN ', 'releaseIds');
    query = this.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
    query = this.catalogueIdsToParams(query, 'workId IN ', 'workIds');

    return query;
  };

  /**
   * Creates the Sales join filter.
   *
   * Calls callback(err, result) with a [result] from  bigQuery.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string[]} salesInputColumns - list of columns to select from the input table.
   * @param {string[]} salesOutputColumns - list of columns to select from the output table.
   * @param {object} filter - BigQuery filter.
   * @param {string[]} contractIds - Array of contractIds.
   * @param {object} options - Query options.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @param {function(string, object)} callback - The callback that handles the response.
   */

  this.joinSalesFilter = async function (
    salesInputColumns,
    salesOutputColumns,
    filter,
    contractIds,
    options,
    callback
  ) {
    try {
      const query = this.joinSalesFilterQuery(
        salesInputColumns,
        salesOutputColumns,
        filter,
        contractIds,
        null,
        options
      );
      // Log query
      this.logQuery(this.inputTable, query, 'Calculation');
      // Send query
      this.queryJob(query, callback);
    } catch (err) {
      callback(err);
    }
  };

  /**
   * Creates the Sales join filter query.
   *
   * Calls callback(err, result) with a [result] from  bigQuery.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string[]} salesInputColumns - list of columns to select from the input table.
   * @param {string[]} salesOutputColumns - list of columns to select from the output table.
   * @param {object} filter - BigQuery filter.
   * @param {string[]} contractIds - Array of contractIds.
   * @param {string[]} excludeContractIds - Array of contractIds to exclude.
   * @param {object} options - Query options.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @returns {string} query - Formatted filter query.
   */

  this.joinSalesFilterQuery = function (
    salesInputColumns,
    salesOutputColumns,
    filter,
    contractIds,
    excludeContractIds,
    options
  ) {
    let query = `
      SELECT STRING_AGG(Output.contractId, ', ') as contractIds, 
      ${[].concat(this.formatJoinColumnsSelect('Input', salesInputColumns), this.formatJoinColumnsSelect('Output', salesOutputColumns)).join(', ')}
      FROM \`${this.datasetName}.${this.inputTable}\` Input
      LEFT OUTER JOIN \`${this.datasetName}.${this.outputTable}\` Output
      ON (Output.salesLineId = Input.id)
      GROUP BY ${[].concat(this.formatJoinColumnsGroupBy('Input', salesInputColumns), this.formatJoinColumnsGroupBy('Output', salesOutputColumns)).join(', ')}
      HAVING `;
    if (excludeContractIds && Array.isArray(excludeContractIds) && excludeContractIds.length > 0) {
      query += `(Output.contractId NOT IN (${excludeContractIds.map((item) => `"${item}"`).join(', ')}) OR Output.contractId IS NULL) AND `;
    }
    query += '(Output.salesLineId IS NULL OR (Output.salesLineId IS NOT NULL ';
    const contractIdQuery = this.formatJoinSalesFilterContractIdQuery(contractIds);
    if (contractIdQuery) {
      query += ` AND ${contractIdQuery}))`;
    } else {
      query += '))';
    }

    if (filter && Object.keys(filter).length !== 0) {
      query += `
          AND ${this.filterFromObject(filter)}`;
    }

    // If options contains limit
    if (options && options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    // If options contains offset
    if (options && options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    return query;
  };

  /**
   * Creates the join Accounts filter query.
   *
   * Calls callback(err, result) with a [result] from  bigQuery.
   *
   * Calls callback(err) with an [err] or message string if an error occurs.
   * @static
   * @param {string[]} salesInputColumns - list of columns to select from the input table.
   * @param {string[]} salesOutputColumns - list of columns to select from the output table.
   * @param {object} filter - BigQuery filter.
   * @param {object} options - Query options.
   * @param {number} options.limit - Limit the documents returned.
   * @param {number} options.offset - Number of documents to skip.
   * @returns {string} query - Formatted filter query.
   */

  this.joinAccountsFilterQuery = function (salesInputColumns, salesOutputColumns, filter, options) {
    let query = `
      SELECT ${[].concat(this.formatJoinColumnsSelect('Input', salesInputColumns), this.formatJoinColumnsSelect('Output', salesOutputColumns)).join(', ')}
      FROM \`${this.datasetName}.${this.inputTable}\` Input
      LEFT OUTER JOIN \`${this.datasetName}.${this.accountingTable}\` Output
      ON (Output.salesLineId = Input.id)
      GROUP BY ${[].concat(this.formatJoinColumnsGroupBy('Input', salesInputColumns), this.formatJoinColumnsGroupBy('Output', salesOutputColumns)).join(', ')}
      HAVING (Output.salesLineId IS NULL)`;

    if (filter && Object.keys(filter).length !== 0) {
      query += `
          AND ${this.filterFromObject(filter)}`;
    }

    // If options contains limit
    if (options && options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    // If options contains offset
    if (options && options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    return query;
  };

  /**
   * Formats columns to Select for the Join query.
   * @static
   * @param {string} displayAs - Table name.
   * @param {object[]} columns - Array of columns.
   * @param {boolean} columns.aggregate - Set to false to include the column in the query.
   * @param {string} columns.column - Column name.
   * @returns {string[]} columns - Array of joined columns for the query.
   */

  this.formatJoinColumnsSelect = function (displayAs, columns) {
    const joinColumns = [];
    if (Array.isArray(columns)) {
      columns.map((column) => {
        const text = displayAs ? `${displayAs}.` : '';
        if (typeof column === 'string') {
          joinColumns.push(`${text}${column}`);
        } else if (!column.aggregate) {
          joinColumns.push(`${text}${column.column}`);
        }
      });
    }

    return joinColumns;
  };

  /**
   * Formats columns to Group By for the Join query.
   * @static
   * @param {string} displayAs - Table name.
   * @param {object[]} columns - Array of columns.
   * @param {boolean} columns.groupBy - Set to true to include the column in the query.
   * @param {string} columns.column - Column name.
   * @returns {string[]} columns - Array of joined columns for the query.
   */

  this.formatJoinColumnsGroupBy = function (displayAs, columns) {
    const joinColumns = [];
    if (Array.isArray(columns)) {
      columns.map((column) => {
        const text = displayAs ? `${displayAs}.` : '';
        if (typeof column === 'string') {
          joinColumns.push(`${text}${column}`);
        } else if (column.groupBy) {
          joinColumns.push(`${text}${column.column}`);
        }
      });
    }

    return joinColumns;
  };

  /**
   * Formats the contractIds for the Sales Join query .
   * @static
   * @param {string[]} contractIds - Array of contractIds.
   * @returns {string} query - Joined contract Ids query.
   */

  this.formatJoinSalesFilterContractIdQuery = function (contractIds) {
    let query = '';

    if (typeof contractIds === 'string') {
      query = `contractIds NOT LIKE '%${contractIds}%'`;
    } else if (Array.isArray(contractIds)) {
      const queries = [];
      contractIds.map((id) => {
        queries.push(`contractIds NOT LIKE '%${id}%'`);
      });

      query = queries.join(' AND ');
    }
    return query;
  };

  // TODO: Add documentation and tests for this one
  this.catalogueIdsToParams = function (query, string, paramName) {
    // Copy original string
    const originalQuery = query.query ? query.query : query.slice();
    // Check presence of string in the query
    if (originalQuery.indexOf(string) !== -1) {
      if (typeof query === 'string') {
        // Set query to object
        query = {};
      }
      // Split string on HAVING to having element
      const split = originalQuery.split(string);
      let no = 0;
      let complete = false;
      let endingIndex;
      split[1].split('').forEach((letter, index) => {
        if (!complete && letter === '(') {
          no += 1;
        } else if (!complete && letter === ')') {
          no -= 1;
          if (no === 0) {
            complete = true;
            endingIndex = index;
          }
        }
      });
      let param = split[1].substring(0, endingIndex + 1);
      // Remove first and last characters
      param = param.slice(1);
      param = param.slice(0, param.length - 1);
      // Turn into array
      param = param.split(', ').map((item) => {
        // Remove speech marks
        item = item.slice(1);
        item = item.slice(0, item.length - 1);
        return item;
      });
      // Replace value
      split[1] = split[1].replace(split[1].slice(0, endingIndex + 1), `UNNEST(@${paramName})`);
      query.query = split.join(string);
      query.params = query.params || {};
      query.params[paramName] = param;
    }
    return query;
  };

  /**
   * Checkls if a query should be retried based on the error.
   *
   * @static
   * @param {object} err - The error object.
   * @param {string} query - The query string/filename for tracking # of retries.
   * @returns {boolean} Returns true if the query should be retried.
   */
  this.retryErroredQuery = async function (err, query) {
    // Queries shouldn't be retried if there's no error
    if (!err) {
      return false;
    }

    logger.debug('Retrying error..');
    logger.debug(err);
    // Check if query is an object or a string, or missing altogether
    if (query?.query) {
      query = query.query;
    } else if (!query) {
      // Set to missing to enable at least retrying
      query = 'missing';
    }
    // Add query to the queries tracker if it doesn't exist already
    if (!queryRetriesTracker[query]) {
      queryRetriesTracker[query] = 1;
    }

    if (queryRetriesTracker[query] <= 3) {
      // Increase the wait time by two second on each retry
      const timeout = this.msBeforeRetryingErrors * queryRetriesTracker[query];
      logger.debug(`Waiting ${timeout / 1000}s before retrying..`);
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, timeout));
      // Increment the number of retries on the tracker
      queryRetriesTracker[query] += 1;

      return true;
    }
    // Remove from tracker and return false if it's been tried more than 3 times.
    delete queryRetriesTracker[query];
    return false;
  };

  /**
   * Returns the current slots used using SQL Queries
   *
   * @static
   * @returns {object} Stats about the current slots usage
   */
  this.getSlotUsage = async function () {
    const remainder = 30 - (moment().utc().second() % 30);
    const timeNow = moment()
      .utc()
      .add(remainder, 'seconds')
      .subtract(30, 'seconds')
      .format('YYYY-MM-DD HH:mm:ss.SSSSSS');
    const currentPeriod = moment(timeNow, 'YYYY-MM-DD HH:mm:ss.SSSSSS')
      .subtract(30, 'seconds')
      .format('YYYY-MM-DD HH:mm:ss.SSSSSS');
    const previousPeriod = moment(timeNow, 'YYYY-MM-DD HH:mm:ss.SSSSSS')
      .subtract(60, 'seconds')
      .format('YYYY-MM-DD HH:mm:ss.SSSSSS');

    const query30SecondAverage = `
    SELECT SUM(total_slot_ms) / (1000 * 30) as slots
    FROM ${process.env.BQ_project_id}.region-EU.INFORMATION_SCHEMA.JOBS
    WHERE statement_type != "SCRIPT"
    AND creation_time BETWEEN TIMESTAMP('${currentPeriod}') AND TIMESTAMP('${timeNow}')
    AND end_time IS NOT NULL
    `;

    const queryPrevious30SecondAverage = `
    SELECT SUM(total_slot_ms) / (1000 * 30) as slots
    FROM ${process.env.BQ_project_id}.region-EU.INFORMATION_SCHEMA.JOBS
    WHERE statement_type != "SCRIPT"
    AND creation_time BETWEEN TIMESTAMP('${previousPeriod}') AND TIMESTAMP('${currentPeriod}')
    AND end_time IS NOT NULL  
  `;

    const queryRunningJobs = `
    SELECT SUM(1) AS total
    FROM ${process.env.BQ_project_id}.region-EU.INFORMATION_SCHEMA.JOBS
    WHERE statement_type != "SCRIPT"
    AND state = 'RUNNING'
    AND creation_time BETWEEN TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 SECOND) AND CURRENT_TIMESTAMP()`;

    const queryReservations = `
    SELECT SUM(slot_capacity) AS totalSlots
    FROM ${process.env.BQ_project_id}.region-EU.INFORMATION_SCHEMA.RESERVATIONS_BY_PROJECT
   `;

    const [[average]] = await bigQueryClient.query({ query: query30SecondAverage });
    const [[previousAverage]] = await bigQueryClient.query({ query: queryPrevious30SecondAverage });
    const [[running]] = await bigQueryClient.query({ query: queryRunningJobs });
    const [[capacity]] = await bigQueryClient.query({ query: queryReservations });

    const currentSlotUtilizationPercentage = average.slots ? (average.slots / capacity.totalSlots) * 100 : 0;
    const previousSlotUtilizationPercentage = previousAverage.slots
      ? (previousAverage.slots / capacity.totalSlots) * 100
      : 0;

    return {
      running: running.total || 0,
      currentCapacity: capacity.totalSlots,
      currentSlotUtilizationPercentage,
      previousSlotUtilizationPercentage,
      periodAverageSlotsUsed: average.slots,
      previousPeriodAverageSlotsUsed: previousAverage.slots,
    };
  };

  /**
   * Returns the current slots used using the BigQuery API
   *
   * @static
   * @returns {object} Stats about the current slots usage
   */

  // this.getSlotUsageApi = async function () {
  //   const remainder = 30 - (moment().utc().second() % 30);
  //   const timeNow = moment().utc().add(remainder, 'seconds').subtract(30, 'seconds')
  //     .format('x');
  //   const currentPeriod = moment(timeNow, 'x').subtract(30, 'seconds').format('x');
  //   const previousPeriod = moment(timeNow, 'x').subtract(60, 'seconds').format('x');

  //   // Get jobs pending
  //   const [queryPendingJobs] = await bigQueryClient.getJobs({
  //     allUsers: true,
  //     stateFilter: 'pending',
  //     projection: 'full',
  //   });

  //   // Get running pending
  //   const [queryRunningJobs] = await bigQueryClient.getJobs({
  //     allUsers: true,
  //     stateFilter: 'running',
  //     projection: 'full',
  //   });

  //   // Get current period slots average
  //   const [query30SecondAverage] = await bigQueryClient.getJobs({
  //     allUsers: true,
  //     maxCreationTime: timeNow,
  //     minCreationTime: currentPeriod,
  //     stateFilter: 'done',
  //     projection: 'full',
  //   });
  //   let periodAverageSlotsUsed = 0;
  //   query30SecondAverage.forEach((job) => {
  //     if (job?.metadata?.state === 'DONE') {
  //       // console.log(job.statistics)
  //       const totalSlots = parseInt(job.metadata?.statistics?.totalSlotMs, 10);
  //       if (!Number.isNaN(totalSlots)) {
  //         periodAverageSlotsUsed += totalSlots;
  //       }
  //     }
  //   });
  //   periodAverageSlotsUsed /= (1000 * 30);

  //   // Get previous period slots average
  //   const [queryPrevious30SecondAverage] = await bigQueryClient.getJobs({
  //     allUsers: true,
  //     maxCreationTime: currentPeriod,
  //     minCreationTime: previousPeriod,
  //     stateFilter: 'done',
  //     projection: 'full',
  //   });
  //   let previousPeriodAverageSlotsUsed = 0;
  //   queryPrevious30SecondAverage.forEach((job) => {
  //     if (job?.metadata?.state === 'DONE') {
  //       // console.log(job.statistics)
  //       const totalSlots = parseInt(job.metadata?.statistics?.totalSlotMs, 10);
  //       if (!Number.isNaN(totalSlots)) {
  //         previousPeriodAverageSlotsUsed += totalSlots;
  //       }
  //     }
  //   });
  //   previousPeriodAverageSlotsUsed /= (1000 * 30);

  //   // Get Capacity
  //   let currentCapacity = 0;
  //   const reservationsServiceClient = new ReservationServiceClient(bgClientOptions);
  //   const [reservations] = await reservationsServiceClient.listReservations({
  //     parent: `projects/${process.env.BQ_project_id}/locations/eu`,
  //   });
  //   reservations.forEach((reservation) => {
  //     const slotCapacity = parseInt(reservation?.slotCapacity, 10);
  //     if (!Number.isNaN(slotCapacity)) {
  //       currentCapacity += slotCapacity;
  //     }
  //   });

  //   // Get avg percentages
  //   const currentSlotUtilizationPercentage = periodAverageSlotsUsed ? (periodAverageSlotsUsed / currentCapacity) * 100 : 0;
  //   const previousSlotUtilizationPercentage = previousPeriodAverageSlotsUsed ? (previousPeriodAverageSlotsUsed / currentCapacity) * 100 : 0;

  //   return {
  //     currentCapacity,
  //     currentSlotUtilizationPercentage,
  //     previousSlotUtilizationPercentage,
  //     periodAverageSlotsUsed,
  //     previousPeriodAverageSlotsUsed,
  //     queuedJobs: (queryRunningJobs?.length || 0) + (queryPendingJobs?.length || 0),
  //   };
  // };

  /**
   * Adds 100 Flex slots using SQL Queries.
   *
   * @static
   */
  this.addSlots = async function () {
    const commitmentId = moment().format('x');
    const createCommitment = `CREATE CAPACITY \`${process.env.BQ_project_id}.region-EU.${commitmentId}\` AS JSON '{"slot_count": 100, "plan": "FLEX"}'`;
    await bigQueryClient.query({ query: createCommitment });
    const createReservation = `
      CREATE RESERVATION
      \`${process.env.BQ_project_id}.region-EU.reservation-${commitmentId}\`
      AS JSON '{"slot_capacity": 100}'
    `;
    await bigQueryClient.query({ query: createReservation });
  };

  /**
   * Adds 100 Flex slots using the BigQuery API.
   *
   * @static
   */
  // this.addSlotsApi = async function () {
  //   const capacityCommitmentId = moment().format('x');
  //   const reservationsServiceClient = new ReservationServiceClient(bgClientOptions);
  //   // Create the capacity commitment
  //   await reservationsServiceClient.createCapacityCommitment({
  //     parent: `projects/${process.env.BQ_project_id}/locations/eu`,
  //     capacityCommitmentId,
  //     capacityCommitment: { slotCount: 100, plan: 'FLEX' },
  //   });
  //   // Create the reservation
  //   await reservationsServiceClient.createReservation({
  //     parent: `projects/${process.env.BQ_project_id}/locations/eu`,
  //     reservationId: `reservation-${capacityCommitmentId}`,
  //     reservation: { slotCapacity: 100 },
  //   });
  // };

  /**
   * Removes 100 Flex slots using SQL query.
   *
   * @static
   */
  this.removeSlots = async function () {
    const queryReservations = `
      SELECT reservation_name
      FROM ${process.env.BQ_project_id}.region-EU.INFORMATION_SCHEMA.RESERVATIONS_BY_PROJECT
      WHERE reservation_name LIKE 'reservation-%'
     `;

    const [[reservation]] = await bigQueryClient.query({ query: queryReservations });

    if (!reservation) return;

    const commitmentId = reservation.reservation_name.substring('reservation-'.length);

    const deleteReservationQuery = `DROP RESERVATION \`${process.env.BQ_project_id}.region-EU.${reservation.reservation_name}\``;
    const deleteCommitmentQuery = `DROP CAPACITY \`${process.env.BQ_project_id}.region-EU.${commitmentId}\``;

    await bigQueryClient.query({ query: deleteReservationQuery });
    await bigQueryClient.query({ query: deleteCommitmentQuery });
  };

  /**
   * Removes 100 Flex slots using the BigQuery API.
   *
   * @static
   */
  // this.removeSlotsApi = async function () {
  //   const reservationsServiceClient = new ReservationServiceClient(bgClientOptions);
  //   // Get reservations
  //   const [reservations] = await reservationsServiceClient.listReservations({
  //     parent: `projects/${process.env.BQ_project_id}/locations/eu`,
  //   });

  //   let reservationToDelete;
  //   reservations.forEach((reservation) => {
  //     if (reservation.name.includes('reservation-')) {
  //       reservationToDelete = reservation;
  //     }
  //   });

  //   if (!reservationToDelete) return;

  //   const commitmentId = reservationToDelete.name.substring(`projects/${process.env.BQ_project_id}/locations/EU/reservations/reservation-`.length);

  //   await reservationsServiceClient.deleteReservation({
  //     parent: `projects/${process.env.BQ_project_id}/locations/eu`,
  //     name: reservationToDelete.name,
  //   });
  //   // Delete the commitment
  //   await reservationsServiceClient.deleteCapacityCommitment({
  //     parent: `projects/${process.env.BQ_project_id}/locations/eu`,
  //     name: `projects/${process.env.BQ_project_id}/locations/EU/capacityCommitments/${commitmentId}`,
  //   });
  // };

  /**
   * Sets the max slots level to assigned value using API
   * Note: The value passed is the addition to the base line slots, so it should be in addition to the 100 baseline slots.
   *
   * @static
   */
  this.setAutoscalerMaxSlots = async function (value) {
    const reservationsServiceClient = new ReservationServiceClient(bgClientOptions);
    // Get reservations
    const [reservations] = await reservationsServiceClient.listReservations({
      parent: `projects/${process.env.BQ_project_id}/locations/eu`,
    });

    // Find default reservation
    let reservationToUpdate;
    reservations.forEach((reservation) => {
      if (reservation.name.includes('default')) {
        reservationToUpdate = reservation;
      }
    });

    if (!reservationToUpdate) return;

    // Update the max slot capacity
    await reservationsServiceClient.updateReservation({
      reservation: {
        name: reservationToUpdate.name,
        autoscale: { maxSlots: value },
      },
      updateMask: {
        paths: ['autoscale'],
      },
    });
  };

  this.removeLargeParamValues = async function (queryObj, options) {
    return query.removeLargeParamValues(this, queryObj, options);
  };

  this.inputSchema = [
    { name: 'id', type: 'STRING' },
    { name: 'salesFileId', type: 'STRING' },
    { name: 'ignore', type: 'STRING' },
    { name: 'status', type: 'STRING' },
    { name: 'catType', type: 'STRING' },
    { name: 'releaseId', type: 'STRING' },
    { name: 'trackId', type: 'STRING' },
    { name: 'workId', type: 'STRING' },
    { name: 'contractId', type: 'STRING' },
    { name: 'distributionChannel', type: 'STRING' },
    { name: 'configuration', type: 'STRING' },
    { name: 'priceCategory', type: 'STRING' },
    { name: 'territory', type: 'STRING' },
    { name: 'originalDistributionChannel', type: 'STRING' },
    { name: 'originalConfiguration', type: 'STRING' },
    { name: 'originalPriceCategory', type: 'STRING' },
    { name: 'originalReleaseTitle', type: 'STRING' },
    { name: 'originalReleaseArtist', type: 'STRING' },
    { name: 'originalTrackTitle', type: 'STRING' },
    { name: 'originalTrackArtist', type: 'STRING' },
    { name: 'catNo', type: 'STRING' },
    { name: 'barcode', type: 'STRING' },
    { name: 'isrc', type: 'STRING' },
    { name: 'alternativeId', type: 'STRING' },
    { name: 'originalWorkTitle', type: 'STRING' },
    { name: 'originalComposers', type: 'STRING' },
    { name: 'originalIdentifier', type: 'STRING' },
    { name: 'iswc', type: 'STRING' },
    { name: 'tunecode', type: 'STRING' },
    { name: 'songCode', type: 'STRING' },
    { name: 'contractIdentifier', type: 'STRING' },
    { name: 'titleMapper', type: 'STRING' },
    { name: 'originalTerritory', type: 'STRING' },
    { name: 'saleDate', type: 'DATE' },
    { name: 'transactionDate', type: 'DATE' },
    { name: 'source', type: 'STRING' },
    { name: 'subSource', type: 'STRING' },
    { name: 'description', type: 'STRING' },
    { name: 'multiplier', type: 'FLOAT' },
    { name: 'units', type: 'FLOAT' },
    { name: 'sharePercentage', type: 'FLOAT' },
    { name: 'returnUnits', type: 'FLOAT' },
    { name: 'salePrice', type: 'FLOAT' },
    { name: 'originalCurrency', type: 'STRING' },
    { name: 'positiveNegative', type: 'STRING' },
    { name: 'exchangeRate', type: 'FLOAT' },
    { name: 'grossAmount', type: 'FLOAT' },
    { name: 'netAmount', type: 'FLOAT' },
    { name: 'discountAmount', type: 'FLOAT' },
    { name: 'mechanicalAtSource', type: 'FLOAT' },
    { name: 'returnGrossAmount', type: 'FLOAT' },
    { name: 'returnNetAmount', type: 'FLOAT' },
    { name: 'perUnitRate', type: 'FLOAT' },
    { name: 'retailPrice', type: 'FLOAT' },
    { name: 'homeCurrencyGrossAmount', type: 'FLOAT' },
    { name: 'homeCurrencyNetAmount', type: 'FLOAT' },
    { name: 'homeCurrencyDiscountAmount', type: 'FLOAT' },
    { name: 'homeCurrencyMechanicalAtSource', type: 'FLOAT' },
    { name: 'homeCurrencyReturnGrossAmount', type: 'FLOAT' },
    { name: 'homeCurrencyReturnNetAmount', type: 'FLOAT' },
    { name: 'homeCurrencyPerUnitRate', type: 'FLOAT' },
    { name: 'homeCurrencyRetailPrice', type: 'FLOAT' },
    { name: 'currency2ExchangeRate', type: 'FLOAT' },
    { name: 'currency2GrossAmount', type: 'FLOAT' },
    { name: 'currency2NetAmount', type: 'FLOAT' },
    { name: 'currency2DiscountAmount', type: 'FLOAT' },
    { name: 'currency2MechanicalAtSource', type: 'FLOAT' },
    { name: 'currency2ReturnGrossAmount', type: 'FLOAT' },
    { name: 'currency2ReturnNetAmount', type: 'FLOAT' },
    { name: 'currency2PerUnitRate', type: 'FLOAT' },
    { name: 'currency2RetailPrice', type: 'FLOAT' },
    { name: 'currency3ExchangeRate', type: 'FLOAT' },
    { name: 'currency3GrossAmount', type: 'FLOAT' },
    { name: 'currency3NetAmount', type: 'FLOAT' },
    { name: 'currency3DiscountAmount', type: 'FLOAT' },
    { name: 'currency3MechanicalAtSource', type: 'FLOAT' },
    { name: 'currency3ReturnGrossAmount', type: 'FLOAT' },
    { name: 'currency3ReturnNetAmount', type: 'FLOAT' },
    { name: 'currency3PerUnitRate', type: 'FLOAT' },
    { name: 'currency3RetailPrice', type: 'FLOAT' },
    { name: 'currency4ExchangeRate', type: 'FLOAT' },
    { name: 'currency4GrossAmount', type: 'FLOAT' },
    { name: 'currency4NetAmount', type: 'FLOAT' },
    { name: 'currency4DiscountAmount', type: 'FLOAT' },
    { name: 'currency4MechanicalAtSource', type: 'FLOAT' },
    { name: 'currency4ReturnGrossAmount', type: 'FLOAT' },
    { name: 'currency4ReturnNetAmount', type: 'FLOAT' },
    { name: 'currency4PerUnitRate', type: 'FLOAT' },
    { name: 'currency4RetailPrice', type: 'FLOAT' },
    { name: 'originalPositiveNegative', type: 'STRING' },
    { name: 'duration', type: 'STRING' },
    { name: 'temp1', type: 'STRING' },
    { name: 'temp2', type: 'STRING' },
    { name: 'temp3', type: 'STRING' },
    { name: 'temp4', type: 'STRING' },
    { name: 'temp5', type: 'STRING' },
    { name: 'production', type: 'STRING' },
    { name: 'episode', type: 'STRING' },
    { name: 'dateFrom', type: 'DATE' },
    { name: 'dateTo', type: 'DATE' },
    { name: 'party1', type: 'STRING' },
    { name: 'party2', type: 'STRING' },
    { name: 'party3', type: 'STRING' },
    { name: 'party4', type: 'STRING' },
    { name: 'party5', type: 'STRING' },
    { name: 'catalogueReleaseTitle', type: 'STRING' },
    { name: 'catalogueReleaseVersion', type: 'STRING' },
    { name: 'catalogueReleaseArtist', type: 'STRING' },
    { name: 'catalogueReleaseLabel', type: 'STRING' },
    { name: 'catalogueCatNo', type: 'STRING' },
    { name: 'catalogueReleaseForeignId', type: 'STRING' },
    { name: 'catalogueBarcode', type: 'STRING' },
    { name: 'ppd', type: 'FLOAT' },
    { name: 'proRataAmount', type: 'FLOAT' },
    { name: 'priceCategoryDealerPrices', type: 'STRING', mode: 'REPEATED' },
    { name: 'catalogueFormat', type: 'STRING' },
    { name: 'mechanicalBasisPercentage', type: 'FLOAT' },
    { name: 'totalMechanicalAmount', type: 'FLOAT' },
    { name: 'catalogueTrackTitle', type: 'STRING' },
    { name: 'catalogueTrackVersion', type: 'STRING' },
    { name: 'catalogueTrackArtist', type: 'STRING' },
    { name: 'catalogueTrackLabel', type: 'STRING' },
    { name: 'catalogueIsrc', type: 'STRING' },
    { name: 'catalogueTrackForeignId', type: 'STRING' },
    { name: 'mechanicalRate', type: 'FLOAT' },
    { name: 'catalogueWorkTitle', type: 'STRING' },
    { name: 'catalogueWorkComposer', type: 'STRING' },
    { name: 'catalogueIdentifier', type: 'STRING' },
    { name: 'catalogueWorkForeignId', type: 'STRING' },
    { name: 'catalogueIswc', type: 'STRING' },
    { name: 'catalogueTunecode', type: 'STRING' },
    { name: 'catalogueContractIds', type: 'STRING' },
    { name: 'partitionNo', type: 'INTEGER' },
    { name: 'homeCurrencySalePrice', type: 'FLOAT' },
    { name: 'currency2SalePrice', type: 'FLOAT' },
    { name: 'currency3SalePrice', type: 'FLOAT' },
    { name: 'currency4SalePrice', type: 'FLOAT' },
  ];

  this.outputSchema = [
    { name: 'periodId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'contractId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'contractName', type: 'STRING' },
    { name: 'salesFileId', type: 'STRING' },
    { name: 'salesLineId', type: 'STRING' },
    { name: 'catType', type: 'STRING' },
    { name: 'releaseId', type: 'STRING' },
    { name: 'trackId', type: 'STRING' },
    { name: 'workId', type: 'STRING' },
    { name: 'distributionChannel', type: 'STRING' },
    { name: 'configuration', type: 'STRING' },
    { name: 'priceCategory', type: 'STRING' },
    { name: 'territory', type: 'STRING' },
    { name: 'saleDate', type: 'DATE' },
    { name: 'transactionDate', type: 'DATE' },
    { name: 'source', type: 'STRING' },
    { name: 'subSource', type: 'STRING' },
    { name: 'description', type: 'STRING' },
    { name: 'units', type: 'FLOAT' },
    { name: 'sharePercentage', type: 'FLOAT' },
    { name: 'share', type: 'FLOAT' },
    { name: 'returnUnits', type: 'FLOAT' },
    { name: 'salePrice', type: 'FLOAT' },
    { name: 'originalCurrency', type: 'STRING' },
    { name: 'exchangeRate', type: 'FLOAT' },
    { name: 'grossAmount', type: 'FLOAT' },
    { name: 'netAmount', type: 'FLOAT' },
    { name: 'discountAmount', type: 'FLOAT' },
    { name: 'mechanicalAtSource', type: 'FLOAT' },
    { name: 'homeCurrencyGrossAmount', type: 'FLOAT' },
    { name: 'homeCurrencyNetAmount', type: 'FLOAT' },
    { name: 'perUnitRate', type: 'FLOAT' },
    { name: 'homeCurrencyPerUnitRate', type: 'FLOAT' },
    { name: 'retailPrice', type: 'FLOAT' },
    { name: 'homeCurrencyRetailPrice', type: 'FLOAT' },
    { name: 'duration', type: 'STRING' },
    { name: 'production', type: 'STRING' },
    { name: 'episode', type: 'STRING' },
    { name: 'dateFrom', type: 'DATE' },
    { name: 'dateTo', type: 'DATE' },
    { name: 'barcode', type: 'STRING' },
    { name: 'catNo', type: 'STRING' },
    { name: 'catalogueReleaseTitle', type: 'STRING' },
    { name: 'catalogueReleaseVersion', type: 'STRING' },
    { name: 'catalogueReleaseArtist', type: 'STRING' },
    { name: 'catalogueLabel', type: 'STRING' },
    { name: 'catalogueReleaseLabel', type: 'STRING' },
    { name: 'catalogueCatNo', type: 'STRING' },
    { name: 'catalogueReleaseForeignId', type: 'STRING' },
    { name: 'catalogueBarcode', type: 'STRING' },
    { name: 'ppd', type: 'FLOAT' },
    { name: 'proRataAmount', type: 'FLOAT' },
    { name: 'priceCategoryDealerPrices', type: 'STRING', mode: 'REPEATED' },
    { name: 'catalogueFormat', type: 'STRING' },
    { name: 'mechanicalBasisPercentage', type: 'FLOAT' },
    { name: 'totalMechanicalAmount', type: 'FLOAT' },
    { name: 'catalogueTrackTitle', type: 'STRING' },
    { name: 'catalogueTrackVersion', type: 'STRING' },
    { name: 'catalogueTrackArtist', type: 'STRING' },
    { name: 'catalogueTrackLabel', type: 'STRING' },
    { name: 'catalogueIsrc', type: 'STRING' },
    { name: 'catalogueTrackForeignId', type: 'STRING' },
    { name: 'mechanicalRate', type: 'FLOAT' },
    { name: 'catalogueWorkTitle', type: 'STRING' },
    { name: 'catalogueWorkComposer', type: 'STRING' },
    { name: 'catalogueIdentifier', type: 'STRING' },
    { name: 'catalogueWorkForeignId', type: 'STRING' },
    { name: 'catalogueIswc', type: 'STRING' },
    { name: 'catalogueTunecode', type: 'STRING' },
    { name: 'licenseNo', type: 'STRING' },
    { name: 'catalogueContractIds', type: 'STRING' },
    // Calculation Fields
    { name: 'objectPercentage', type: 'FLOAT' },
    { name: 'proRataTrackAmount', type: 'FLOAT' },
    { name: 'multiplier', type: 'FLOAT' },
    { name: 'royaltyRate', type: 'FLOAT' },
    { name: 'unitRate', type: 'FLOAT' },
    { name: 'reductionRate', type: 'FLOAT' },
    { name: 'calculationInput', type: 'FLOAT' },
    { name: 'calculationType', type: 'STRING' },
    { name: 'deduction', type: 'FLOAT' },
    { name: 'deductionUnitRate', type: 'FLOAT' },
    { name: 'deductionRate', type: 'FLOAT' },
    { name: 'deductionCalculationType', type: 'STRING' },
    { name: 'deductionType', type: 'STRING' },
    { name: 'withholdingTax', type: 'FLOAT' },
    { name: 'withholdingTaxUnitRate', type: 'FLOAT' },
    { name: 'withholdingTaxRate', type: 'FLOAT' },
    { name: 'withholdingTaxCalculationType', type: 'STRING' },
    { name: 'withholdingTaxType', type: 'STRING' },
    { name: 'mechanicalAmount', type: 'FLOAT' },
    { name: 'mechanicalDeduction', type: 'FLOAT' },
    { name: 'mechanicalPercentage', type: 'FLOAT' },
    { name: 'mechanicalType', type: 'STRING' },
    { name: 'mechanicalDeductionType', type: 'STRING' },
    { name: 'mechanicalCurrency', type: 'STRING' },
    { name: 'calculationOutput', type: 'FLOAT' },
    { name: 'reserveRate', type: 'FLOAT' },
    { name: 'reserve', type: 'FLOAT' },
    // Multicurrency Fields
    { name: 'contractCurrency', type: 'STRING' },
    { name: 'contractCurrencyProRataAmount', type: 'FLOAT' },
    { name: 'contractCurrencyExchangeRate', type: 'FLOAT' },
    { name: 'contractCurrencyGrossAmount', type: 'FLOAT' },
    { name: 'contractCurrencyNetAmount', type: 'FLOAT' },
    { name: 'contractCurrencyDiscountAmount', type: 'FLOAT' },
    { name: 'contractCurrencyMechanicalAtSource', type: 'FLOAT' },
    { name: 'contractCurrencyReturnGrossAmount', type: 'FLOAT' },
    { name: 'contractCurrencyReturnNetAmount', type: 'FLOAT' },
    { name: 'contractCurrencyPpd', type: 'FLOAT' },
    { name: 'contractCurrencyPerUnitRate', type: 'FLOAT' },
    { name: 'contractCurrencyRetailPrice', type: 'FLOAT' },
    { name: 'contractCurrencyUnitRate', type: 'FLOAT' },
    { name: 'contractCurrencyCalculationInput', type: 'FLOAT' },
    { name: 'contractCurrencyDeduction', type: 'FLOAT' },
    { name: 'contractCurrencyDeductionUnitRate', type: 'FLOAT' },
    { name: 'contractCurrencyWithholdingTax', type: 'FLOAT' },
    { name: 'contractCurrencyWithholdingTaxUnitRate', type: 'FLOAT' },
    { name: 'contractCurrencyMechanicalAmount', type: 'FLOAT' },
    { name: 'contractCurrencyMechanicalDeduction', type: 'FLOAT' },
    { name: 'contractCurrencyCalculationOutput', type: 'FLOAT' },
    { name: 'contractCurrencyReserve', type: 'FLOAT' },
    { name: 'contractPartitionNo', type: 'INTEGER' },
    { name: 'catalogueComposer', type: 'STRING' },
    { name: 'cataloguePublisher', type: 'STRING' },
    { name: 'catalogueOriginalReleaseTitle', type: 'STRING' },
    { name: 'catalogueOriginalReleaseArtist', type: 'STRING' },
    { name: 'catalogueOriginalBarcode', type: 'STRING' },
    { name: 'catalogueOriginalCatNo', type: 'STRING' },
    { name: 'catalogueOriginalTrackTitle', type: 'STRING' },
    { name: 'catalogueOriginalTrackArtist', type: 'STRING' },
    { name: 'catalogueOriginalIsrc', type: 'STRING' },
    { name: 'homeCurrencySalePrice', type: 'FLOAT' },
    { name: 'contractCurrencySalePrice', type: 'FLOAT' },
  ];

  this.costsSchema = [
    { name: 'periodId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'contractId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'costId', type: 'STRING' },
    { name: 'releaseId', type: 'STRING' },
    { name: 'trackId', type: 'STRING' },
    { name: 'contractName', type: 'STRING' },
    { name: 'type', type: 'STRING' },
    { name: 'name', type: 'STRING' },
    { name: 'invoiceNo', type: 'STRING' },
    { name: 'description', type: 'STRING' },
    { name: 'date', type: 'DATE' },
    { name: 'amount', type: 'FLOAT' },
    { name: 'territory', type: 'STRING' },
    { name: 'objectPercentage', type: 'FLOAT' },
    { name: 'rechargeRate', type: 'FLOAT' },
    { name: 'calculationInput', type: 'FLOAT' },
    { name: 'calculationOutput', type: 'FLOAT' },
    // Contract Currency
    { name: 'contractCurrency', type: 'STRING' },
    { name: 'contractCurrencyAmount', type: 'FLOAT' },
    { name: 'contractCurrencyCalculationInput', type: 'FLOAT' },
    { name: 'contractCurrencyCalculationOutput', type: 'FLOAT' },
    // Catalogue Values
    { name: 'catalogueReleaseTitle', type: 'STRING' },
    { name: 'catalogueReleaseVersion', type: 'STRING' },
    { name: 'catalogueReleaseArtist', type: 'STRING' },
    { name: 'catalogueReleaseLabel', type: 'STRING' },
    { name: 'catalogueLabel', type: 'STRING' },
    { name: 'catalogueCatNo', type: 'STRING' },
    { name: 'catalogueReleaseForeignId', type: 'STRING' },
    { name: 'catalogueBarcode', type: 'STRING' },
    { name: 'catalogueTrackTitle', type: 'STRING' },
    { name: 'catalogueTrackVersion', type: 'STRING' },
    { name: 'catalogueTrackArtist', type: 'STRING' },
    { name: 'catalogueTrackLabel', type: 'STRING' },
    { name: 'catalogueIsrc', type: 'STRING' },
    { name: 'catalogueTrackForeignId', type: 'STRING' },
  ];

  this.accountingSchema = [
    { name: 'accountingPeriodId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'salesFileId', type: 'STRING' },
    { name: 'salesLineId', type: 'STRING' },
    { name: 'catType', type: 'STRING' },
    { name: 'releaseId', type: 'STRING' },
    { name: 'trackId', type: 'STRING' },
    { name: 'workId', type: 'STRING' },
    { name: 'catNo', type: 'STRING' },
    { name: 'isrc', type: 'STRING' },
    { name: 'distributionChannel', type: 'STRING' },
    { name: 'configuration', type: 'STRING' },
    { name: 'priceCategory', type: 'STRING' },
    { name: 'territory', type: 'STRING' },
    { name: 'saleDate', type: 'DATE' },
    { name: 'transactionDate', type: 'DATE' },
    { name: 'source', type: 'STRING' },
    { name: 'subSource', type: 'STRING' },
    { name: 'description', type: 'STRING' },
    { name: 'units', type: 'FLOAT' },
    { name: 'originalCurrency', type: 'STRING' },
    { name: 'exchangeRate', type: 'FLOAT' },
    { name: 'grossAmount', type: 'FLOAT' },
    { name: 'netAmount', type: 'FLOAT' },
    { name: 'homeCurrencyGrossAmount', type: 'FLOAT' },
    { name: 'homeCurrencyNetAmount', type: 'FLOAT' },
    { name: 'partitionNo', type: 'INTEGER' },
    { name: 'adjustment', type: 'BOOLEAN' },
  ];
};

module.exports = bigQuery;
