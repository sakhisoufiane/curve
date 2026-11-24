import {
  BigQueryClientOptions,
  BigQueryClientAuthenticationDetails,
  BigQueryClient,
  PartitioningOptions,
  TempTableOptions,
  WriteSessionOptions,
  AvroWriteSessionOptions,
} from './client/bigquery-client';
import {
  SupportedCompression,
} from './write/file/avro';
import {
  withCredentials,
  withDefaultCredentials,
  withAwsSecretsManagerCredentials,
  withApplicationDefaultCredentials,
  withDelegateClient,
} from './client/bigquery-client-factory';
import {
  PrimitiveFilterValue,
  FilterOperatorObject,
  BigQueryFilter,
  createDeleteQuery,
  updateData,
  getDistinct,
  getDistinctCount,
  getMultiDistinct,
  getAggregate,
  filterFromObject,
  formatJoinColumnsGroupBy,
  formatJoinColumnsSelect,
  removeLargeParamValues,
  rewriteQueryWithTempTables,
} from './query-builder/query-builder';
import {
  inputSchema,
  outputSchema,
  costsSchema,
  accountingSchema,
} from './client/known-schemas';
import {
  BigQueryLabels,
  LongRunningJobLabels,
} from './client/labels';

export type {
  BigQueryClientOptions,
  BigQueryClientAuthenticationDetails,
  PartitioningOptions,
  TempTableOptions,
  WriteSessionOptions,
  PrimitiveFilterValue,
  FilterOperatorObject,
  BigQueryFilter,
  AvroWriteSessionOptions,
  SupportedCompression,
  BigQueryLabels,
  LongRunningJobLabels,
};
export {
  BigQueryClient,
  withCredentials,
  withDefaultCredentials,
  withAwsSecretsManagerCredentials,
  withApplicationDefaultCredentials,
  withDelegateClient,
  createDeleteQuery,
  updateData,
  getDistinct,
  getDistinctCount,
  getMultiDistinct,
  getAggregate,
  filterFromObject,
  formatJoinColumnsGroupBy,
  formatJoinColumnsSelect,
  removeLargeParamValues,
  rewriteQueryWithTempTables,
  inputSchema,
  outputSchema,
  costsSchema,
  accountingSchema,
};
