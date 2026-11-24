import { chunk } from 'lodash';
import { v4 } from 'uuid';

import logger from '../logger';

type Query = {
  query: string;
  params: Record<string, unknown>;
};

type RemoveLargeParamValuesOptions = {
  maxArrayParamSize?: number;
  expirationTime?: number;
  batchInsertSize?: number;
  tempTablePrefix?: string;
};

// Remove when BigQuery module is re-written in TypeScript
type BigQuery = {
  datasetName: string;
  createTempTable: (params: {
    tableName: string;
    schema: { name: string; type: string; mode: string }[];
    expirationTime: number;
  }) => Promise<{ id: string }>;
  queryPromisify: (query: Query) => Promise<void>;
};

export async function removeLargeParamValues(
  bigQuery: BigQuery,
  query: Query,
  options?: RemoveLargeParamValuesOptions
) {
  if (!query?.params || Object.keys(query.params)?.length === 0) {
    return query;
  }

  const opts: Required<RemoveLargeParamValuesOptions> = {
    maxArrayParamSize: 100_000,
    expirationTime: Date.now() + 60 * 60 * 1000, // 1 hour from now
    batchInsertSize: 50_000,
    tempTablePrefix: v4().replace(/-/g, ''),
    ...options,
  };

  // Params fields and their temp table id if exceeding the size threshold
  const tempTableParams: Record<string, string> = {};

  for (const paramKey of Object.keys(query.params)) {
    if (Array.isArray(query.params[paramKey]) && query.params[paramKey].length > opts.maxArrayParamSize) {
      logger.debug('Large query param detected:', paramKey, query.params[paramKey].length);

      // Create temp table for the param values
      const schema = [{ name: paramKey, type: 'STRING', mode: 'REQUIRED' }];
      const expirationTime = Date.now() + 60 * 60 * 1000; // 1 hour

      const tempTable = await bigQuery.createTempTable({
        tableName: `${opts.tempTablePrefix}_${paramKey}`,
        schema,
        expirationTime,
      });
      logger.debug('Created temp query param table:', tempTable.id);

      // Add the param values in chunks (otherwise the param size issue is encountered again)
      const batches = chunk(query.params[paramKey], opts.batchInsertSize);
      for (const batch of batches) {
        logger.debug(`Inserting query param batch (${paramKey}):`, batch.length);
        await bigQuery.queryPromisify({
          query: `INSERT INTO \`${bigQuery.datasetName}.${tempTable.id}\` (${paramKey}) SELECT value FROM UNNEST(@values) AS value`,
          params: {
            values: batch,
          },
        });
      }

      // Save the param and table id so the original query can be updated
      tempTableParams[paramKey] = `${bigQuery.datasetName}.${tempTable.id}`;
    }
  }

  if (Object.keys(tempTableParams).length === 0) return query;
  return rewriteQueryWithTempTables(query, tempTableParams);
}

export function rewriteQueryWithTempTables(originalQueryObj: Query, tempTableParams: Record<string, string>) {
  const updatedQuery: Query = { ...originalQueryObj };

  // Matches: fieldExpr IN UNNEST(@paramName)
  const inUnnestRegex = /(\b[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?)\s+IN\s+UNNEST\(@([a-zA-Z_]\w*)\)/g;

  updatedQuery.query = updatedQuery.query.replace(inUnnestRegex, (fullMatch, fieldExpr, paramName) => {
    if (!tempTableParams[paramName]) return fullMatch;
    const tableFullName = tempTableParams[paramName];

    // Remove the parameter from params since we’ve replaced it
    delete updatedQuery.params[paramName];

    // Replace with an EXISTS clause
    return `EXISTS (SELECT 1 FROM \`${tableFullName}\` t WHERE t.${paramName} = ${fieldExpr})`;
  });

  return updatedQuery;
}
