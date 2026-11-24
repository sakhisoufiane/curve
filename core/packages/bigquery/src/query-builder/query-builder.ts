import moment from 'moment';
import { v4 } from 'uuid';
import { logger } from '@curveroyaltysystems/logger';
import { BigQueryClient } from '../client/bigquery-client';
import { BigQueryLabels } from '../client/labels';

/**
 * Primitive types allowed as filter values.
 */
export type PrimitiveFilterValue = string | number | boolean | null;

/**
 * Represents filter operators like $in, $nin, $gt, etc.
 */
export interface FilterOperatorObject {
  $in?: PrimitiveFilterValue[];
  $nin?: PrimitiveFilterValue[];
  $ne?: PrimitiveFilterValue;
  $gt?: number | Date;
  $gte?: number | Date;
  $lt?: number | Date;
  $lte?: number | Date;
  $exists?: boolean;
}

/**
 * Represents a filter structure for BigQuery queries, potentially nested using $or and $and.
 * Allows key-value pairs where keys are field names and values are primitive types or operator objects,
 * or keys are $or/$and with an array of filters.
 */
export interface BigQueryFilter {
  [field: string]: PrimitiveFilterValue | FilterOperatorObject | BigQueryFilter[] | undefined;
  $or?: BigQueryFilter[];
  $and?: BigQueryFilter[];
}

export type Query = {
  query: string;
  params: Record<string, unknown>;
};

export type RemoveLargeParamValuesOptions = {
  maxArrayParamSize?: number;
  expirationTime?: number;
  batchInsertSize?: number;
  tempTablePrefix?: string;
};

/**
 * Creates a query that deletes rows that match a specified filter.
 *
 * @static
 * @param dataset BigQuery dataset.
 * @param table BigQuery table.
 * @param filter BigQuery filter.
 */
export const createDeleteQuery = (
  dataset: string,
  table: string,
  filter: BigQueryFilter,
): Query => {
  const { query, params } = filterFromObject(filter);
  return {
    query: `DELETE
     FROM \`${dataset}.${table}\`
     WHERE ${query}`,
    params,
  }
};

/**
 * Formats the given parameters into a SELECT statement to retrieve some data
 *
 * @param datasetName - The name of the dataset
 * @param table - Table name.
 * @param select - fields to select from the table. Can either be an array of fields or a SQL statement
 * @param filter - BigQuery filter.
 * @param options - Query options
 * @param options.orderBy - Fields to order by.
 * @param options.orderDir - Order direction: 'DESC' or 'ASC'.
 * @param options.limit - Limit the documents returned.
 * @param options.offset - Number of documents to skip.
 * @returns query - The formatted query.
 */
export const getData = (
  datasetName: string,
  table: string,
  select: string | string[],
  filter: BigQueryFilter,
  options?: {
    orderBy?: string | string[],
    orderDir?: string,
    limit?: number,
    offset?: number,
  }
): Query => {
  // Setup query
  const { query: whereStatement, params } = filterFromObject(filter);

  let query = `SELECT ${selectQueryFromArray(select)}
     FROM \`${datasetName}.${table}\`
     WHERE ${whereStatement}`;

  // If options contains order
  if (options?.orderBy) {
    let formattedOrderBy;
    if (Array.isArray(options.orderBy)) {
      const mappedOrderBy = options.orderBy.map((element) => ({ orderBy: element }))
      formattedOrderBy = formatOrderByStatement(mappedOrderBy);
    } else {
      formattedOrderBy = formatOrderByStatement({ orderBy: options.orderBy, orderDir: validateOrderDir(options.orderDir) });
    }
    query += formattedOrderBy;
  }

  // If options contains limit
  if (options && options.limit) {
    const limitField = fieldToParamName('limit', params);
    query += ` LIMIT @${limitField}`;
    params[limitField] = options.limit;
  }
  // If options contains offset
  if (options && options.offset) {
    const offsetField = fieldToParamName('offset', params);
    query += ` OFFSET @${offsetField}`;
    params[offsetField] = options.offset;
  }

  return {
    query,
    params,
  };
};

/**
 * Formats an array of columns to select into a comma-delimited list, for insertion into a SQL statement. Inputs
 * will be validated to check each field is a valid field name (to avoid SQL injection)
 * @param array - Array of values to select.
 * @returns query - Formatted select query.
 */
const selectQueryFromArray = (array: string | string[]): string => {
  array = Array.isArray(array) ? array : [array];

  if (array.length === 0) throw new Error('At least one column must be selected');

  return array.map((element) => validateFieldName(element)).join(', ');
};

type OrderByStatement = { orderBy: string, orderDir?: 'ASC' | 'DESC' }

/**
 * Given one or more Order By columns, with optional directions, format this into SQL statement. Parameters are
 * validated (to guard against SQL injection)
 * @param orderBy
 */
export const formatOrderByStatement = (orderBy: OrderByStatement | OrderByStatement[] | null | undefined): string | null => {
  if (!orderBy) return null;

  orderBy = Array.isArray(orderBy) ? orderBy : [orderBy];

  if (orderBy.length === 0) return '';

  const formatted = orderBy
    .map(({ orderBy, orderDir }) => ({
      orderBy: validateFieldName(orderBy),
      orderDir: validateOrderDir(orderDir),
    }))
    .map(({ orderBy, orderDir }) => `${orderBy} ${orderDir}`)
    .join(', ');

  return ` ORDER BY ${formatted}`;
};

/**
 * Updates rows that match a specified filter.
 *
 * @static
 * @param dataset BigQuery dataset.
 * @param table BigQuery table.
 * @param filter BigQuery filter.
 * @param update Update object.
 * @return Formatted query.
 */
export const updateData = (
   dataset: string,
   table: string,
   filter: BigQueryFilter,
   update: { [key: string]: string | number | string[] | number[] | { value: string } } | string,
) => {
  const params: Record<string, unknown> = {};

  // Prepare query
  let query = `UPDATE \`${dataset}.${table}\`
      SET `;
  // Check if object passed
  if (typeof update === 'object') {
    // Create SET string from object
    query += Object.keys(update)
      .filter((key) => update[key])
      .map((key) => {
        const value = update[key];
        const paramName = fieldToParamName(key, params);
        if (typeof value === 'number') {
          params[paramName] = value;
          return `${validateFieldName(key)} = @${paramName}`;
        }
        if (typeof value === 'object' && value && 'value' in value) {
          params[paramName] = value.value;
          return `${validateFieldName(key)} = @${paramName}`;
        }
        if (typeof value === 'object' && value) {
          params[paramName] = value;
          return `${validateFieldName(key)} = @${paramName}`;
        }
        if (Array.isArray(value)) {
          params[paramName] = value;
          return `${validateFieldName(key)} = @${paramName}`;
        }
        params[paramName] = value;
        return `${validateFieldName(key)} = @${paramName}`;
    }).join(', ');
  } else {
    // Else add a string
    query += update;
  }
  // Add filter
  const convertedFilter = filterFromObject(filter, null, params);

  return {
    query: `${query} WHERE ${convertedFilter.query}`,
    params: convertedFilter.params,
  }
};

/**
 * Gets distinct values from a column that match a specified filter.
 *
 * @static
 * @param dataset - The BigQuery dataset
 * @param table - BigQuery table.
 * @param column - BigQuery column.
 * @param filter - BigQuery filter.
 * @return Formatted query.
 */
export const getDistinct = function (
  dataset: string,
  table: string,
  column: string | string[],
  filter: BigQueryFilter
): Query {
  const { query: whereStatement, params } = filterFromObject(filter);

  // Get Distinct values for a column
  let query = `SELECT DISTINCT ${selectQueryFromArray(column)}
    FROM \`${dataset}.${table}\` WHERE `;

  column = Array.isArray(column) ? column : [column];
  query += column.map((item) => `${validateFieldName(item)} IS NOT NULL `).join('AND ');
  query += `AND ${whereStatement}`;
  return {
    query,
    params,
  };
};

/**
 * Gets distinct values from a column that match a specified filter.
 *
 * @static
 * @param dataset - The BigQuery dataset
 * @param table - BigQuery table.
 * @param column - BigQuery column.
 * @param filter - BigQuery filter.
 * @return Formatted query.
 */
export const getDistinctCount = (
  dataset: string,
  table: string,
  column: string | string[],
  filter: BigQueryFilter,
): Query => {
  const { query: whereStatement, params } = filterFromObject(filter);

  // Get Distinct values for a column
  let query = `SELECT COUNT(DISTINCT(${selectQueryFromArray(column)})) as count
    FROM \`${dataset}.${table}\` 
    WHERE `;

  column = Array.isArray(column) ? column : [column];
  query += column.map((item) => `${validateFieldName(item)} IS NOT NULL `).join('AND ');
  query += `AND ${whereStatement}`;
  return {
    query,
    params,
  };
};

/**
 * Gets distinct values from a multiple columns that match a specified filter.
 *
 * @static
 * @param dataset - The BigQuery dataset
 * @param table - BigQuery table.
 * @param columns - BigQuery columns.
 * @param filter - BigQuery filter.
 * @return Formatted query.
 */
export const getMultiDistinct = (
  dataset: string,
  table: string,
  columns: string[],
  filter: BigQueryFilter,
): Query => {
  // Get Distinct values for a column
  const { query: whereStatement, params } = filterFromObject(filter);
  return {
    query: `SELECT DISTINCT ${selectQueryFromArray(columns)}
   FROM \`${dataset}.${table}\`
   WHERE ${whereStatement}`,
    params,
  }
};

/**
 * Formats aggregate query.
 * @static
 * @param dataset - The BigQuery dataset
 * @param table - BigQuery table.
 * @param selector - Columns to select.
 * @param selector.object - Single column object.
 * @param selector.object.column - Column name.
 * @param selector.object.isSelector - True if it should be used in the 'Select' query.
 * @param selector.object.isGroupBy - True if it should be used in the 'Group By' query.
 * @param sumColumns - Columns to SUM.
 * @param sumColumns.object - Single SUM column object.
 * @param sumColumns.object.column - Column name.
 * @param sumColumns.object.displayAs - Display Column As.
 * @param countColumn - Count column name.
 * @param filter - BigQuery filter.
 * @param options - Query options.
 * @param options.orderBy - Fields to order by.
 * @param options.orderDir - Order direction: 'DESC' or 'ASC'.
 * @param options.limit - Limit the documents returned.
 * @param options.offset - Number of documents to skip.
 * @returns {string} query - Formatted query.
 */
export const getAggregate = (
  dataset: string,
  table: string,
  selector: {
    column: string;
    isSelector: boolean;
    isGroupBy: boolean;
  }[] | string,
  sumColumns: {
    column: string;
    displayAs: string;
  }[],
  countColumn: string,
  filter: BigQueryFilter,
  options: {
    orderBy?: string | string[];
    orderDir?: string;
    limit?: number;
    offset?: number;
  }
): Query => {
  const { select, groupBy } = formatSelector(selector);
  const { query: whereStatement, params } = filterFromObject(filter);

  let query = `
          SELECT ${[select, getSumQuery(sumColumns), `COUNT(*) AS ${validateFieldName(countColumn)}`].filter(Boolean).join(', ')}
              FROM \`${dataset}.${table}\`
              WHERE ${whereStatement}`;

  if (groupBy) {
    query += ` GROUP BY ${groupBy}`;
  }

  // If options contains order
  if (options?.orderBy) {
    let formattedOrderBy;
    if (Array.isArray(options.orderBy)) {
      const mappedOrderBy = options.orderBy.map((element) => ({ orderBy: element }));
      formattedOrderBy = formatOrderByStatement(mappedOrderBy);
    } else {
      formattedOrderBy = formatOrderByStatement({
        orderBy: options.orderBy,
        orderDir: validateOrderDir(options.orderDir),
      });
    }
    query += formattedOrderBy;
  }

  // If options contains limit
  if (options && options.limit) {
    const limitField = fieldToParamName('limit', params);
    query += ` LIMIT @${limitField}`;
    params[limitField] = options.limit;
  }
  // If options contains offset
  if (options && options.offset) {
    const offsetField = fieldToParamName('offset', params);
    query += ` OFFSET @${offsetField}`;
    params[offsetField] = options.offset;
  }

  return {
    query,
    params,
  };
};

/**
 * Formats select columns.
 * @static
 * @param selector - Columns to select.
 * @param selector.object - Single column object.
 * @param selector.object.column - Column name.
 * @param selector.object.isSelector - True if it should be used in the 'Select' query.
 * @param selector.object.isGroupBy - True if it should be used in the 'Group By' query.
 * @returns query - Formatted query object with two arrays: select and groupBy.
 */
const formatSelector = (
  selector?: {
    column: string;
    isSelector?: boolean;
    isGroupBy?: boolean;
  }[] | string | null
): { select: string, groupBy: string } => {
  if (typeof selector === 'string') {
    // It's a string, apply to both GROUP BY and SELECT
    validateFieldName(selector);
    return {
      select: selector,
      groupBy: selector,
    };
  }

  const select: string[] = [];
  const groupBy: string[] = [];

  if (Array.isArray(selector)) {
    // It's an array
    selector.map(({ column, isSelector, isGroupBy }) => {
      validateFieldName(column);
      if (isSelector) {
        select.push(column);
      }
      if (isGroupBy) {
        groupBy.push(column);
      }
    });

    return {
      select: select.join(', '),
      groupBy: groupBy.join(', '),
    };
  }

  return { select: '', groupBy: '' };
};

/**
 * Formats SUM columns.
 * @static
 * @param columns - Columns to SUM.
 * @param columns.object - Single SUM column object.
 * @param columns.object.column - Column name.
 * @param columns.object.displayAs - Display Column As.
 * @returns query - Formatted array of SUM queries.
 */
const getSumQuery = function (
  columns?: {
    column: string;
    displayAs: string;
  }[] | null
) {
  let query = '';

  if (columns && Array.isArray(columns)) {
    query = columns
      .map(({ column, displayAs }) => (column && displayAs ? `SUM(${validateFieldName(column)}) AS ${validateFieldName(displayAs)}` : null))
      .filter(Boolean)
      .join(', ');
  }

  return query;
};

/**
 * Formats a MongoDB filter object into an SQL filter.
 * @static
 * @param object - MongoDB filter.
 * @param table - BigQuery table to filter.
 * @param existingParams - A list of all the parameters we are using already in this query
 * @returns query - Formatted filter query.
 */
export const filterFromObject = function (
  object: BigQueryFilter,
  table?: string | null,
  existingParams?: Record<string, unknown>,
): Query {
  function keyValue(field: string) {
    validateFieldName(field);
    if (table) {
      return `${table}.${field}`;
    }
    return field;
  }

  function dateOrValue(value: number | Date) {
    if (value instanceof Date) {
      return `"${moment(value).format('YYYY-MM-DD')}"`;
    }
    return value;
  }

  // Check if object
  if (typeof object === 'object' && Object.keys(object).length > 0) {
    // Setup result array
    const querySegments: string[] = [];
    let params = existingParams ?? {};

    // Loop through object keys
    Object.keys(object).forEach((key) => {
      // Setup return query string
      let query = '';

      if (key.includes('$or') && object[key] instanceof Array && object[key].length > 0) {
        query += '(';
        query += object[key].map((item) => {
          const querySegment = filterFromObject(item, table, params);
          params = querySegment.params;
          return `(${querySegment.query})`;
        }).join(' OR ');
        query += ')';
      } else if (key.includes('$and') && object[key] instanceof Array && object[key].length > 0) {
        query += '(';
        query += object[key].map((item) => {
          const querySegment = filterFromObject(item, table, params);
          params = querySegment.params;
          return `(${querySegment.query})`;
        }).join(' AND ');
        query += ')';
      } else if (key !== '$or' && key !== '$and') {
        // we want to ignore filtertypes, except is_blank as this is sent without a corresponding key
        const paramName = fieldToParamName(key, params);
        if (key.endsWith('FilterType')) {
          const fieldKey = key.replace('FilterType', '');
          if (object[key] === 'is_blank') {
            query += `(${keyValue(fieldKey)} IS NULL OR ${keyValue(fieldKey)} = '')`;
            querySegments.push(query);
          } else if (object[key] === 'is_not_blank') {
            query += `${keyValue(fieldKey)} IS NOT NULL`;
            querySegments.push(query);
          }
          return;
        }

        // Check what type of object has been passed
        if (Array.isArray(object[key])) {
          // Add as array
          query += `${keyValue(key)} IN UNNEST(@${paramName})`;
          params[paramName] = object[key];
        } else if (object[key] === null) {
          // Add as null query
          query += `${keyValue(key)} IS NULL`;
        } else if (typeof object[key] === 'object' && object[key].$in && object[key].$in.length > 0) {
          // Add as array
          query += `${keyValue(key)} IN UNNEST(@${paramName})`;
          params[paramName] = object[key].$in;
        } else if (typeof object[key] === 'object' && object[key].$nin && object[key].$nin.length > 0) {
          // Add as not in array
          query += `${keyValue(key)} NOT IN UNNEST(@${paramName})`;
          params[paramName] = object[key].$nin;
        } else if (typeof object[key] === 'object' && object[key].$exists === false) {
          // Add IS NULL
          query += `${keyValue(key)} IS NULL`;
        } else if (typeof object[key] === 'object' && object[key].$exists === true) {
          // Add IS NOT NULL
          query += `${keyValue(key)} IS NOT NULL`;
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
            comparisons.push(`${keyValue(key)} > @${paramName}`);
            params[paramName] = dateOrValue(object[key].$gt);
          }
          if (object[key].$gte || object[key].$gte === 0) {
            comparisons.push(`${keyValue(key)} >= @${paramName}`);
            params[paramName] = dateOrValue(object[key].$gte);
          }
          if (object[key].$lt || object[key].$lt === 0) {
            comparisons.push(`${keyValue(key)} < @${paramName}`);
            params[paramName] = dateOrValue(object[key].$lt);
          }
          if (object[key].$lte || object[key].$lte === 0) {
            comparisons.push(`${keyValue(key)} <= @${paramName}`);
            params[paramName] = dateOrValue(object[key].$lte);
          }
          query += comparisons.join(' AND ');
        } else if (typeof object[key] === 'number' || typeof object[key] === 'boolean') {
          // Add as a number
          query += `${keyValue(key)} = @${paramName}`;
          params[paramName] = object[key];
        } else if (typeof object[key] === 'object' && (object[key].$ne || object[key].$ne === 0)) {
          // Not Equal query : $ne
          query += `${keyValue(key)} != @${paramName}`;
          params[paramName] = object[key].$ne;
        } else if (typeof object[key] === 'string') {
          // Else just add as a string
          // Apply LIKE with wildcards for "contains" filter type
          if (object[`${key}FilterType`] === 'contains') {
            query += `LOWER(${keyValue(key)}) LIKE LOWER('%@${paramName}%')`;
            params[paramName] = object[key];
          } else if (object[`${key}FilterType`] === '=') {
            query += `LOWER(${keyValue(key)}) = LOWER(CONCAT('%', @${paramName}, '%'))`;
            params[paramName] = object[key];
          } else {
            query += `${keyValue(key)} = @${paramName}`;
            params[paramName] = object[key];
          }
        } else {
          throw new Error(`Unrecognized value: ${object[key]}`);
        }
      }
      // Add query if it exists
      if (query && query !== '') {
        querySegments.push(query);
      }
    });
    if (querySegments.length > 0) {
      // Return joined result as SQL string
      return {
        query: querySegments.join(' AND '),
        params,
      };
    }
    // Default to true when filters amount to nothing
    return {
      query: 'true',
      params: {},
    };
  }
  if (Object.keys(object).length === 0) {
    // A blank filter should set it to true
    return {
      query: 'true',
      params: {},
    };
  }
  throw new Error(`Cannot handle input type: ${object}`);
};

/**
 * Formats columns to Group By for the Join query.
 * @static
 * @param displayAs - Table name.
 * @param columns - Array of columns.
 * @param columns.column - Column name.
 * @param columns.groupBy - Set to true to include the column in the query.
 * @returns columns - Array of joined columns for the query.
 */
export const formatJoinColumnsGroupBy = function(
  displayAs?: string | null,
  columns?: string[] | { column: string, groupBy?: boolean }[] | null
): string[] {
  const joinColumns: string[] = [];
  if (Array.isArray(columns)) {
    columns.map((column) => {
      const text = displayAs ? `${validateFieldName(displayAs)}.` : '';
      if (typeof column === 'string') {
        joinColumns.push(`${text}${validateFieldName(column)}`);
      } else if (column.groupBy) {
        joinColumns.push(`${text}${validateFieldName(column.column)}`);
      }
    });
  }

  return joinColumns;
};

/**
 * Formats columns to Select for the Join query.
 * @static
 * @param displayAs - Table name.
 * @param columns - Array of columns.
 * @param columns.column - Column name.
 * @param columns.aggregate - Set to false to include the column in the query.
 * @returns columns - Array of joined columns for the query.
 */
export const formatJoinColumnsSelect = function (
  displayAs?: string | null,
  columns?: string[] | { column: string, aggregate?: boolean }[] | null
) {
  const joinColumns: string[] = [];
  if (Array.isArray(columns)) {
    columns.map((column) => {
      const text = displayAs ? `${validateFieldName(displayAs)}.` : '';
      if (typeof column === 'string') {
        joinColumns.push(`${text}${validateFieldName(column)}`);
      } else if (!column.aggregate) {
        joinColumns.push(`${text}${validateFieldName(column.column)}`);
      }
    });
  }

  return joinColumns;
};

export async function removeLargeParamValues(
  bigQuery: BigQueryClient,
  query: Query,
  labels: BigQueryLabels,
  options?: RemoveLargeParamValuesOptions,
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
    const value = query.params[paramKey];
    if (Array.isArray(value) && value.length > opts.maxArrayParamSize) {
      logger.debug('Large query param detected:', paramKey, value.length);

      // Create temp table for the param values
      const schema = [{ name: paramKey, type: 'STRING', mode: 'REQUIRED' }];

      const expirationTime = moment().add(1, 'hour').toDate();

      const tempTable = await bigQuery.createTable(
        `${opts.tempTablePrefix}_${paramKey}`,
        schema,
        undefined,
        { expirationTime },
      );

      const tempTableName = tempTable.id;
      if (!tempTableName) throw new Error('Temp table name not set')

      logger.debug('Created temp query param table:', tempTableName);

      // Write the data to the table
      const writeStream = bigQuery.createWriteSession(
        tempTableName,
        labels,
        {
          type: 'avro',
          bigQuerySchema: schema,
        }
      );
      await writeStream.setup();
      for (const element of value) {
        await writeStream.write(element);
      }
      await writeStream.close();

      // Save the param and table id so the original query can be updated
      tempTableParams[paramKey] = `${bigQuery.datasetName}.${tempTableName}`;
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

const fieldToParamName = (field: string, params: Record<string, unknown>): string => {
  for (let i = 0; true; i += 1) {
    const fieldName = `${field}${i}`;
    if (params[fieldName] === undefined) return fieldName;
  }
}

const validateFieldName = (fieldName: string): string => {
  if (!/^[a-zA-Z0-9_]+$/.test(fieldName)) throw new Error(`Invalid field name: ${fieldName}`);
  return fieldName;
}

const validateOrderDir = (orderDir?: string): 'ASC' | 'DESC' => {
  if (!orderDir) return 'ASC';
  const upper = orderDir.toUpperCase();
  if (upper === 'ASC' || upper === 'DESC') return upper;
  throw new Error(`Invalid order direction: ${orderDir}`)
}