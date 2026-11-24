<a name="module_bigQuery"></a>

## bigQuery

* [bigQuery](#module_bigQuery)
    * [~bigQuery](#module_bigQuery..bigQuery)
        * [new bigQuery(params)](#new_module_bigQuery..bigQuery_new)
        * [.datasetExists(datasetName, callback)](#module_bigQuery..bigQuery+datasetExists)
        * [.tableExists(datasetName, tableName, callback)](#module_bigQuery..bigQuery+tableExists)
        * [.createDataset(datasetName, callback)](#module_bigQuery..bigQuery+createDataset)
        * [.createTable(tableName, schema, partitionColumn, callback)](#module_bigQuery..bigQuery+createTable)
        * [.copyTable(originalDataset, originalTable, destDataset, destTable, callback)](#module_bigQuery..bigQuery+copyTable)
        * [.deleteDataset(callback)](#module_bigQuery..bigQuery+deleteDataset)
        * [.deleteTable(tableName, callback)](#module_bigQuery..bigQuery+deleteTable)
        * [.getSchema(tableName, callback)](#module_bigQuery..bigQuery+getSchema)
        * [.updateSchema(tableName, schema, callback)](#module_bigQuery..bigQuery+updateSchema)
        * [.logQuery(table, query, type, callback)](#module_bigQuery..bigQuery+logQuery)
        * [.getCount(table, countColumn, filter, callback)](#module_bigQuery..bigQuery+getCount)
        * [.getData(table, countColumn, filter, callback)](#module_bigQuery..bigQuery+getData)
        * [.getDataQuery(table, select, filter, options)](#module_bigQuery..bigQuery+getDataQuery) ⇒ <code>string</code>
        * [.getSize(table, selection, filter, callback)](#module_bigQuery..bigQuery+getSize)
        * [.query(query, callback)](#module_bigQuery..bigQuery+query)
        * [.queryJob(query, callback)](#module_bigQuery..bigQuery+queryJob)
        * [.queryDryRun(query, callback)](#module_bigQuery..bigQuery+queryDryRun)
        * [.deleteData(table, filter, callback)](#module_bigQuery..bigQuery+deleteData)
        * [.updateData(table, filter, update, callback)](#module_bigQuery..bigQuery+updateData)
        * [.getDistinct(table, column, filter, callback)](#module_bigQuery..bigQuery+getDistinct)
        * [.getMultiDistinct(table, columns, filter, callback)](#module_bigQuery..bigQuery+getMultiDistinct)
        * [.getAggregate(table, selector, sumColumns, countColumn, filter, options, callback)](#module_bigQuery..bigQuery+getAggregate)
        * [.getAggregateQuery(table, selector, sumColumns, countColumn, filter, options)](#module_bigQuery..bigQuery+getAggregateQuery) ⇒ <code>string</code>
        * [.formatSelector(selector)](#module_bigQuery..bigQuery+formatSelector) ⇒ <code>object</code>
        * [.getSumQuery(sumColumns)](#module_bigQuery..bigQuery+getSumQuery) ⇒ <code>array</code>
        * [.getSalesInputAggregate(groupBy, sumColumns, countColumn, filter, callback)](#module_bigQuery..bigQuery+getSalesInputAggregate)
        * [.getSalesInputSelectQueryArgs(columns)](#module_bigQuery..bigQuery+getSalesInputSelectQueryArgs) ⇒ <code>array</code>
        * [.setupFile(callback)](#module_bigQuery..bigQuery+setupFile)
        * [.writeToFile(data, table, callback)](#module_bigQuery..bigQuery+writeToFile)
        * [.writeFileToDb(table, callback)](#module_bigQuery..bigQuery+writeFileToDb)
        * [.checkAllFilesWrittenToDb(table, callback)](#module_bigQuery..bigQuery+checkAllFilesWrittenToDb)
        * [.writeSpecificFileToDb(table, file, callback)](#module_bigQuery..bigQuery+writeSpecificFileToDb)
        * [.selectQueryFromArray(array)](#module_bigQuery..bigQuery+selectQueryFromArray) ⇒ <code>string</code>
        * [.filterFromObject(object, table)](#module_bigQuery..bigQuery+filterFromObject) ⇒ <code>string</code>
        * [.filterArrayToVales(array)](#module_bigQuery..bigQuery+filterArrayToVales) ⇒ <code>string</code>
        * [.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, callback)](#module_bigQuery..bigQuery+joinSalesCalculationFilter)
        * [.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options)](#module_bigQuery..bigQuery+joinSalesCalculationFilterQuery) ⇒ <code>string</code>
        * [.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options)](#module_bigQuery..bigQuery+joinSalesCalculationFilterQueryObject) ⇒ <code>object</code>
        * [.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractIds, options, callback)](#module_bigQuery..bigQuery+joinSalesFilter)
        * [.joinSalesFilterQuery(salesInputColumns, salesOutputColumns, filter, contractIds, excludeContractIds, options)](#module_bigQuery..bigQuery+joinSalesFilterQuery) ⇒ <code>string</code>
        * [.joinAccountsFilterQuery(salesInputColumns, salesOutputColumns, filter, options)](#module_bigQuery..bigQuery+joinAccountsFilterQuery) ⇒ <code>string</code>
        * [.formatJoinColumnsSelect(displayAs, columns)](#module_bigQuery..bigQuery+formatJoinColumnsSelect) ⇒ <code>Array.&lt;string&gt;</code>
        * [.formatJoinColumnsGroupBy(displayAs, columns)](#module_bigQuery..bigQuery+formatJoinColumnsGroupBy) ⇒ <code>Array.&lt;string&gt;</code>
        * [.formatJoinSalesFilterContractIdQuery(contractIds)](#module_bigQuery..bigQuery+formatJoinSalesFilterContractIdQuery) ⇒ <code>string</code>
        * [.retryErroredQuery(err, query)](#module_bigQuery..bigQuery+retryErroredQuery) ⇒ <code>boolean</code>

<a name="module_bigQuery..bigQuery"></a>

### bigQuery~bigQuery
**Kind**: inner class of [<code>bigQuery</code>](#module_bigQuery)  

* [~bigQuery](#module_bigQuery..bigQuery)
    * [new bigQuery(params)](#new_module_bigQuery..bigQuery_new)
    * [.datasetExists(datasetName, callback)](#module_bigQuery..bigQuery+datasetExists)
    * [.tableExists(datasetName, tableName, callback)](#module_bigQuery..bigQuery+tableExists)
    * [.createDataset(datasetName, callback)](#module_bigQuery..bigQuery+createDataset)
    * [.createTable(tableName, schema, partitionColumn, callback)](#module_bigQuery..bigQuery+createTable)
    * [.copyTable(originalDataset, originalTable, destDataset, destTable, callback)](#module_bigQuery..bigQuery+copyTable)
    * [.deleteDataset(callback)](#module_bigQuery..bigQuery+deleteDataset)
    * [.deleteTable(tableName, callback)](#module_bigQuery..bigQuery+deleteTable)
    * [.getSchema(tableName, callback)](#module_bigQuery..bigQuery+getSchema)
    * [.updateSchema(tableName, schema, callback)](#module_bigQuery..bigQuery+updateSchema)
    * [.logQuery(table, query, type, callback)](#module_bigQuery..bigQuery+logQuery)
    * [.getCount(table, countColumn, filter, callback)](#module_bigQuery..bigQuery+getCount)
    * [.getData(table, countColumn, filter, callback)](#module_bigQuery..bigQuery+getData)
    * [.getDataQuery(table, select, filter, options)](#module_bigQuery..bigQuery+getDataQuery) ⇒ <code>string</code>
    * [.getSize(table, selection, filter, callback)](#module_bigQuery..bigQuery+getSize)
    * [.query(query, callback)](#module_bigQuery..bigQuery+query)
    * [.queryJob(query, callback)](#module_bigQuery..bigQuery+queryJob)
    * [.queryDryRun(query, callback)](#module_bigQuery..bigQuery+queryDryRun)
    * [.deleteData(table, filter, callback)](#module_bigQuery..bigQuery+deleteData)
    * [.updateData(table, filter, update, callback)](#module_bigQuery..bigQuery+updateData)
    * [.getDistinct(table, column, filter, callback)](#module_bigQuery..bigQuery+getDistinct)
    * [.getMultiDistinct(table, columns, filter, callback)](#module_bigQuery..bigQuery+getMultiDistinct)
    * [.getAggregate(table, selector, sumColumns, countColumn, filter, options, callback)](#module_bigQuery..bigQuery+getAggregate)
    * [.getAggregateQuery(table, selector, sumColumns, countColumn, filter, options)](#module_bigQuery..bigQuery+getAggregateQuery) ⇒ <code>string</code>
    * [.formatSelector(selector)](#module_bigQuery..bigQuery+formatSelector) ⇒ <code>object</code>
    * [.getSumQuery(sumColumns)](#module_bigQuery..bigQuery+getSumQuery) ⇒ <code>array</code>
    * [.getSalesInputAggregate(groupBy, sumColumns, countColumn, filter, callback)](#module_bigQuery..bigQuery+getSalesInputAggregate)
    * [.getSalesInputSelectQueryArgs(columns)](#module_bigQuery..bigQuery+getSalesInputSelectQueryArgs) ⇒ <code>array</code>
    * [.setupFile(callback)](#module_bigQuery..bigQuery+setupFile)
    * [.writeToFile(data, table, callback)](#module_bigQuery..bigQuery+writeToFile)
    * [.writeFileToDb(table, callback)](#module_bigQuery..bigQuery+writeFileToDb)
    * [.checkAllFilesWrittenToDb(table, callback)](#module_bigQuery..bigQuery+checkAllFilesWrittenToDb)
    * [.writeSpecificFileToDb(table, file, callback)](#module_bigQuery..bigQuery+writeSpecificFileToDb)
    * [.selectQueryFromArray(array)](#module_bigQuery..bigQuery+selectQueryFromArray) ⇒ <code>string</code>
    * [.filterFromObject(object, table)](#module_bigQuery..bigQuery+filterFromObject) ⇒ <code>string</code>
    * [.filterArrayToVales(array)](#module_bigQuery..bigQuery+filterArrayToVales) ⇒ <code>string</code>
    * [.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, callback)](#module_bigQuery..bigQuery+joinSalesCalculationFilter)
    * [.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options)](#module_bigQuery..bigQuery+joinSalesCalculationFilterQuery) ⇒ <code>string</code>
    * [.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options)](#module_bigQuery..bigQuery+joinSalesCalculationFilterQueryObject) ⇒ <code>object</code>
    * [.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractIds, options, callback)](#module_bigQuery..bigQuery+joinSalesFilter)
    * [.joinSalesFilterQuery(salesInputColumns, salesOutputColumns, filter, contractIds, excludeContractIds, options)](#module_bigQuery..bigQuery+joinSalesFilterQuery) ⇒ <code>string</code>
    * [.joinAccountsFilterQuery(salesInputColumns, salesOutputColumns, filter, options)](#module_bigQuery..bigQuery+joinAccountsFilterQuery) ⇒ <code>string</code>
    * [.formatJoinColumnsSelect(displayAs, columns)](#module_bigQuery..bigQuery+formatJoinColumnsSelect) ⇒ <code>Array.&lt;string&gt;</code>
    * [.formatJoinColumnsGroupBy(displayAs, columns)](#module_bigQuery..bigQuery+formatJoinColumnsGroupBy) ⇒ <code>Array.&lt;string&gt;</code>
    * [.formatJoinSalesFilterContractIdQuery(contractIds)](#module_bigQuery..bigQuery+formatJoinSalesFilterContractIdQuery) ⇒ <code>string</code>
    * [.retryErroredQuery(err, query)](#module_bigQuery..bigQuery+retryErroredQuery) ⇒ <code>boolean</code>

<a name="new_module_bigQuery..bigQuery_new"></a>

#### new bigQuery(params)
Creates a BigQuery Instance.


| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | Parameters for initializing Big Query. |
| params.datasetName | <code>string</code> | Dataset name. |
| params.inputTable | <code>string</code> | Input table name. |
| params.outputTable | <code>string</code> | Output table name. |
| params.costsTable | <code>string</code> | Costs table name. |
| params.accountingTable | <code>string</code> | Accounting table name. |
| [params.bigQueryClient] | <code>object</code> | BigQuery Client. |

<a name="module_bigQuery..bigQuery+datasetExists"></a>

#### bigQuery.datasetExists(datasetName, callback)
Checks if a BigQuery dataset exists already.

Calls callback(err, exists) with a [exists] boolean (true if dataset exists).

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| datasetName | <code>string</code> | Dataset name. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+tableExists"></a>

#### bigQuery.tableExists(datasetName, tableName, callback)
Checks if a BigQuery table exists already.

Calls callback(err, exists) with a [exists] boolean (true if table exists).

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| datasetName | <code>string</code> | Dataset name. |
| tableName | <code>string</code> | Table name. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+createDataset"></a>

#### bigQuery.createDataset(datasetName, callback)
Creates a new BigQuery Dataset.

Calls callback(err, datasetName) with a [datasetName] object containing the returned dataset name.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| datasetName | <code>string</code> | Dataset name. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+createTable"></a>

#### bigQuery.createTable(tableName, schema, partitionColumn, callback)
Creates a new BigQuery Table.

Calls callback(err, table) with a [table] object containing the returned table.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| tableName | <code>string</code> | Table name. |
| schema | <code>object</code> | BigQuery schema. |
| partitionColumn | <code>string</code> | Partition Column. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+copyTable"></a>

#### bigQuery.copyTable(originalDataset, originalTable, destDataset, destTable, callback)
Copied Big Query Tables from one dataset to the other.

Calls callback(err, job) with an object containing the Big Query Job information.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| originalDataset | <code>string</code> | Dataset name to copy from. |
| originalTable | <code>string</code> | Table name to copy from. |
| destDataset | <code>string</code> | Dataset name to copy to. |
| destTable | <code>string</code> | Table name to copy to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+deleteDataset"></a>

#### bigQuery.deleteDataset(callback)
Deletes a BigQuery Dataset and any Tables inside.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+deleteTable"></a>

#### bigQuery.deleteTable(tableName, callback)
Deletes a BigQuery Table.

Calls callback(err, table) with a [table] object containing the returned table.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| tableName | <code>string</code> | Table name. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getSchema"></a>

#### bigQuery.getSchema(tableName, callback)
Gets a BigQuery Table's Schema.

Calls callback(err, schema) with a [schema] object containing the returned schema.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| tableName | <code>string</code> | Table name. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+updateSchema"></a>

#### bigQuery.updateSchema(tableName, schema, callback)
Updates a BigQuery Table's Schema.

Calls callback(err, result) with a [result] object containing the result from bigQueryClient.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| tableName | <code>string</code> | Table name. |
| schema | <code>object</code> | BigQuery schema. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+logQuery"></a>

#### bigQuery.logQuery(table, query, type, callback)
Logs a BigQuery query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table name. |
| query | <code>string</code> | BigQuery query. |
| type | <code>string</code> | Query type - is used to analyse clients usage of the platform. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getCount"></a>

#### bigQuery.getCount(table, countColumn, filter, callback)
Returns the sum of a numeric column that matches a specified filter.

Calls callback(err, count) with a [count] of the total rows.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table name. |
| countColumn | <code>string</code> | BigQuery column. |
| filter | <code>object</code> | BigQuery filter. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getData"></a>

#### bigQuery.getData(table, countColumn, filter, callback)
Gets data from a BigQuery table.

Calls callback(err, data) with [data] from the table.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table name. |
| countColumn | <code>string</code> | BigQuery column. |
| filter | <code>object</code> | BigQuery filter. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getDataQuery"></a>

#### bigQuery.getDataQuery(table, select, filter, options) ⇒ <code>string</code>
Formats the getData query .

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - The formatted query.  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table name. |
| select | <code>string</code> | fields to select from the table. |
| filter | <code>object</code> | BigQuery filter. |
| options | <code>object</code> | Query options |
| options.orderBy | <code>string</code> | Fields to order by. |
| options.orderDir | <code>string</code> | Order direction: 'DESC' or 'ASC'. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |

<a name="module_bigQuery..bigQuery+getSize"></a>

#### bigQuery.getSize(table, selection, filter, callback)
Returns the number of rows that match a specified filter.

Calls callback(err, count) with a [count] of the total documents.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table name. |
| selection | <code>string</code> | BigQuery column. |
| filter | <code>object</code> | BigQuery filter. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+query"></a>

#### bigQuery.query(query, callback)
Runs the BigQuery query.

Calls callback(err, result) with a [result] of the query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>string</code> | Query to run. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+queryJob"></a>

#### bigQuery.queryJob(query, callback)
Creates a query job, waits for the result and then returns it.

Calls callback(err, result) with a [result] from the query job.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>string</code> | Query to run. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+queryDryRun"></a>

#### bigQuery.queryDryRun(query, callback)
Performs a query dry run.

Calls callback(err, result) with a [result] from the query dry run job.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>string</code> | Query to run. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+deleteData"></a>

#### bigQuery.deleteData(table, filter, callback)
Deletes rows that match a specified filter.

Calls callback(err, result) with a [result] from the query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | BigQuery table. |
| filter | <code>object</code> | BigQuery filter. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+updateData"></a>

#### bigQuery.updateData(table, filter, update, callback)
Updates rows that match a specified filter.

Calls callback(err, result) with a [result] from the query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | BigQuery table. |
| filter | <code>object</code> | BigQuery filter. |
| update | <code>object</code> | Update object. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getDistinct"></a>

#### bigQuery.getDistinct(table, column, filter, callback)
Gets distinct values from a column that match a specified filter.

Calls callback(err, result) with a [result] from the query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | BigQuery table. |
| column | <code>string</code> | BigQuery column. |
| filter | <code>object</code> | BigQuery filter. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getMultiDistinct"></a>

#### bigQuery.getMultiDistinct(table, columns, filter, callback)
Gets distinct values from a multiple columns that match a specified filter.

Calls callback(err, result) with a [result] from the query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | BigQuery table. |
| columns | <code>array</code> | BigQuery columns. |
| filter | <code>object</code> | BigQuery filter. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getAggregate"></a>

#### bigQuery.getAggregate(table, selector, sumColumns, countColumn, filter, options, callback)
Gets aggregate values from multiple columns that match a specified filter.

Calls callback(err, result) with a [result] from the query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | BigQuery table. |
| selector | <code>Array.&lt;object&gt;</code> | Columns to select. |
| selector.object | <code>object</code> | Single column object. |
| selector.object.column | <code>string</code> | Column name. |
| selector.object.isSelector | <code>boolean</code> | True if it should be used in the 'Select' query. |
| selector.object.isGroupBy | <code>boolean</code> | True if it should be used in the 'Group By' query. |
| sumColumns | <code>Array.&lt;object&gt;</code> | Columns to SUM. |
| sumColumns.object | <code>object</code> | Single SUM column object. |
| sumColumns.object.column | <code>string</code> | Column name. |
| sumColumns.object.displayAs | <code>string</code> | Display Column As. |
| countColumn | <code>string</code> | Count column name. |
| filter | <code>object</code> | BigQuery filter. |
| options | <code>object</code> | Query options. |
| options.orderBy | <code>string</code> | Fields to order by. |
| options.orderDir | <code>string</code> | Order direction: 'DESC' or 'ASC'. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getAggregateQuery"></a>

#### bigQuery.getAggregateQuery(table, selector, sumColumns, countColumn, filter, options) ⇒ <code>string</code>
Formats aggregate query.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Formatted query.  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | BigQuery table. |
| selector | <code>Array.&lt;object&gt;</code> | Columns to select. |
| selector.object | <code>object</code> | Single column object. |
| selector.object.column | <code>string</code> | Column name. |
| selector.object.isSelector | <code>boolean</code> | True if it should be used in the 'Select' query. |
| selector.object.isGroupBy | <code>boolean</code> | True if it should be used in the 'Group By' query. |
| sumColumns | <code>Array.&lt;object&gt;</code> | Columns to SUM. |
| sumColumns.object | <code>object</code> | Single SUM column object. |
| sumColumns.object.column | <code>string</code> | Column name. |
| sumColumns.object.displayAs | <code>string</code> | Display Column As. |
| countColumn | <code>string</code> | Count column name. |
| filter | <code>object</code> | BigQuery filter. |
| options | <code>object</code> | Query options. |
| options.orderBy | <code>string</code> | Fields to order by. |
| options.orderDir | <code>string</code> | Order direction: 'DESC' or 'ASC'. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |

<a name="module_bigQuery..bigQuery+formatSelector"></a>

#### bigQuery.formatSelector(selector) ⇒ <code>object</code>
Formats select columns.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>object</code> - query - Formatted query object with two arrays: select and groupBy.  

| Param | Type | Description |
| --- | --- | --- |
| selector | <code>Array.&lt;object&gt;</code> | Columns to select. |
| selector.object | <code>object</code> | Single column object. |
| selector.object.column | <code>string</code> | Column name. |
| selector.object.isSelector | <code>boolean</code> | True if it should be used in the 'Select' query. |
| selector.object.isGroupBy | <code>boolean</code> | True if it should be used in the 'Group By' query. |

<a name="module_bigQuery..bigQuery+getSumQuery"></a>

#### bigQuery.getSumQuery(sumColumns) ⇒ <code>array</code>
Formats SUM columns.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>array</code> - query - Formatted array of SUM queries.  

| Param | Type | Description |
| --- | --- | --- |
| sumColumns | <code>Array.&lt;object&gt;</code> | Columns to SUM. |
| sumColumns.object | <code>object</code> | Single SUM column object. |
| sumColumns.object.column | <code>string</code> | Column name. |
| sumColumns.object.displayAs | <code>string</code> | Display Column As. |

<a name="module_bigQuery..bigQuery+getSalesInputAggregate"></a>

#### bigQuery.getSalesInputAggregate(groupBy, sumColumns, countColumn, filter, callback)
Gets Sales Input table aggregate values from multiple columns that match a specified filter.

Calls callback(err, result) with a [result] from the query.

Calls callback(err) with an [err] or message string if an error occurs

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| groupBy | <code>string</code> | Column/Array of columns to group by. |
| sumColumns | <code>Array.&lt;object&gt;</code> | Columns to SUM. |
| sumColumns.object | <code>object</code> | Single SUM column object. |
| sumColumns.object.column | <code>string</code> | Column name. |
| sumColumns.object.displayAs | <code>string</code> | Display Column As. |
| countColumn | <code>string</code> | Count column name. |
| filter | <code>object</code> | BigQuery filter. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+getSalesInputSelectQueryArgs"></a>

#### bigQuery.getSalesInputSelectQueryArgs(columns) ⇒ <code>array</code>
Gets Sales Input table aggregate values from multiple columns that match a specified filter.

Calls callback(err, result) with a [result] from the query.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>array</code> - query - Array of input columns to select.  

| Param | Type | Description |
| --- | --- | --- |
| columns | <code>Array.&lt;object&gt;</code> | Columns to SUM. |
| columns.object | <code>object</code> | Single SUM column object. |
| columns.object.column | <code>string</code> | Column name. |

<a name="module_bigQuery..bigQuery+setupFile"></a>

#### bigQuery.setupFile(callback)
Setup a json file to write data to.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+writeToFile"></a>

#### bigQuery.writeToFile(data, table, callback)
Writes data to the json file.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;object&gt;</code> | Data to write to the file. |
| table | <code>string</code> | Table to write to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+writeFileToDb"></a>

#### bigQuery.writeFileToDb(table, callback)
Writes the data in the json file to the database.

Calls callback(err, result) with a [job] from  bigQuery.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table to write to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+checkAllFilesWrittenToDb"></a>

#### bigQuery.checkAllFilesWrittenToDb(table, callback)
Writes all available files to the database.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table to write to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+writeSpecificFileToDb"></a>

#### bigQuery.writeSpecificFileToDb(table, file, callback)
Writes the data in a specific json file to the database.

Calls callback(err, result) with a [job] from  bigQuery.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| table | <code>string</code> | Table to write to. |
| file | <code>string</code> | File path. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+selectQueryFromArray"></a>

#### bigQuery.selectQueryFromArray(array) ⇒ <code>string</code>
Formats an array into an SQL query.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Formatted select query.  

| Param | Type | Description |
| --- | --- | --- |
| array | <code>Array.&lt;string&gt;</code> | Array of values to select. |

<a name="module_bigQuery..bigQuery+filterFromObject"></a>

#### bigQuery.filterFromObject(object, table) ⇒ <code>string</code>
Formats a MongoDB filter object into an SQL filter.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Formatted filter query.  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | MongoDB filter. |
| table | <code>string</code> | BigQuery table to filter. |

<a name="module_bigQuery..bigQuery+filterArrayToVales"></a>

#### bigQuery.filterArrayToVales(array) ⇒ <code>string</code>
Formats an array into an SQL query.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Formatted query.  

| Param | Type | Description |
| --- | --- | --- |
| array | <code>array</code> | Array of values to format. |

<a name="module_bigQuery..bigQuery+joinSalesCalculationFilter"></a>

#### bigQuery.joinSalesCalculationFilter(salesInputColumns, distinctColumns, filter, options, callback)
Creates the Sales Calculation join filter.

Calls callback(err, result) with a [result] from  bigQuery.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| salesInputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select. |
| distinctColumns | <code>Array.&lt;string&gt;</code> | list of columns to get distinct values for. |
| filter | <code>object</code> | BigQuery filter. |
| options | <code>object</code> | Query options. |
| options.orderBy | <code>string</code> | Fields to order by. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |
| options.uniqueValue | <code>boolean</code> | If only unique values should be selected. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+joinSalesCalculationFilterQuery"></a>

#### bigQuery.joinSalesCalculationFilterQuery(salesInputColumns, distinctColumns, filter, options) ⇒ <code>string</code>
Creates the Sales Calculation filter query.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Formatted filter query.  

| Param | Type | Description |
| --- | --- | --- |
| salesInputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select. |
| distinctColumns | <code>Array.&lt;string&gt;</code> | list of columns to get distinct values for. |
| filter | <code>object</code> | BigQuery filter. |
| options | <code>object</code> | Query options. |
| options.orderBy | <code>string</code> | Fields to order by. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |
| options.uniqueValue | <code>boolean</code> | If only unique values should be selected. |
| options.uniqueValue | <code>boolean</code> | If only unique values should be selected. |

<a name="module_bigQuery..bigQuery+joinSalesCalculationFilterQueryObject"></a>

#### bigQuery.joinSalesCalculationFilterQueryObject(salesInputColumns, distinctColumns, filter, options) ⇒ <code>object</code>
Creates the Sales Calculation filter query object.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>object</code> - query - Formatted filter query object.  

| Param | Type | Description |
| --- | --- | --- |
| salesInputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select. |
| distinctColumns | <code>Array.&lt;string&gt;</code> | list of columns to get distinct values for. |
| filter | <code>object</code> | BigQuery filter. |
| options | <code>object</code> | Query options. |
| options.orderBy | <code>string</code> | Fields to order by. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |
| options.uniqueValue | <code>boolean</code> | If only unique values should be selected. |
| options.uniqueValue | <code>boolean</code> | If only unique values should be selected. |

<a name="module_bigQuery..bigQuery+joinSalesFilter"></a>

#### bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractIds, options, callback)
Creates the Sales join filter.

Calls callback(err, result) with a [result] from  bigQuery.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  

| Param | Type | Description |
| --- | --- | --- |
| salesInputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select from the input table. |
| salesOutputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select from the output table. |
| filter | <code>object</code> | BigQuery filter. |
| contractIds | <code>Array.&lt;string&gt;</code> | Array of contractIds. |
| options | <code>object</code> | Query options. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_bigQuery..bigQuery+joinSalesFilterQuery"></a>

#### bigQuery.joinSalesFilterQuery(salesInputColumns, salesOutputColumns, filter, contractIds, excludeContractIds, options) ⇒ <code>string</code>
Creates the Sales join filter query.

Calls callback(err, result) with a [result] from  bigQuery.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Formatted filter query.  

| Param | Type | Description |
| --- | --- | --- |
| salesInputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select from the input table. |
| salesOutputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select from the output table. |
| filter | <code>object</code> | BigQuery filter. |
| contractIds | <code>Array.&lt;string&gt;</code> | Array of contractIds. |
| excludeContractIds | <code>Array.&lt;string&gt;</code> | Array of contractIds to exclude. |
| options | <code>object</code> | Query options. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |

<a name="module_bigQuery..bigQuery+joinAccountsFilterQuery"></a>

#### bigQuery.joinAccountsFilterQuery(salesInputColumns, salesOutputColumns, filter, options) ⇒ <code>string</code>
Creates the join Accounts filter query.

Calls callback(err, result) with a [result] from  bigQuery.

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Formatted filter query.  

| Param | Type | Description |
| --- | --- | --- |
| salesInputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select from the input table. |
| salesOutputColumns | <code>Array.&lt;string&gt;</code> | list of columns to select from the output table. |
| filter | <code>object</code> | BigQuery filter. |
| options | <code>object</code> | Query options. |
| options.limit | <code>number</code> | Limit the documents returned. |
| options.offset | <code>number</code> | Number of documents to skip. |

<a name="module_bigQuery..bigQuery+formatJoinColumnsSelect"></a>

#### bigQuery.formatJoinColumnsSelect(displayAs, columns) ⇒ <code>Array.&lt;string&gt;</code>
Formats columns to Select for the Join query.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>Array.&lt;string&gt;</code> - columns - Array of joined columns for the query.  

| Param | Type | Description |
| --- | --- | --- |
| displayAs | <code>string</code> | Table name. |
| columns | <code>Array.&lt;object&gt;</code> | Array of columns. |
| columns.aggregate | <code>boolean</code> | Set to false to include the column in the query. |
| columns.column | <code>string</code> | Column name. |

<a name="module_bigQuery..bigQuery+formatJoinColumnsGroupBy"></a>

#### bigQuery.formatJoinColumnsGroupBy(displayAs, columns) ⇒ <code>Array.&lt;string&gt;</code>
Formats columns to Group By for the Join query.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>Array.&lt;string&gt;</code> - columns - Array of joined columns for the query.  

| Param | Type | Description |
| --- | --- | --- |
| displayAs | <code>string</code> | Table name. |
| columns | <code>Array.&lt;object&gt;</code> | Array of columns. |
| columns.groupBy | <code>boolean</code> | Set to true to include the column in the query. |
| columns.column | <code>string</code> | Column name. |

<a name="module_bigQuery..bigQuery+formatJoinSalesFilterContractIdQuery"></a>

#### bigQuery.formatJoinSalesFilterContractIdQuery(contractIds) ⇒ <code>string</code>
Formats the contractIds for the Sales Join query .

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>string</code> - query - Joined contract Ids query.  

| Param | Type | Description |
| --- | --- | --- |
| contractIds | <code>Array.&lt;string&gt;</code> | Array of contractIds. |

<a name="module_bigQuery..bigQuery+retryErroredQuery"></a>

#### bigQuery.retryErroredQuery(err, query) ⇒ <code>boolean</code>
Checkls if a query should be retried based on the error.

**Kind**: instance method of [<code>bigQuery</code>](#module_bigQuery..bigQuery)  
**Returns**: <code>boolean</code> - Returns true if the query should be retried.  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>object</code> | The error object. |
| query | <code>string</code> | The query string/filename for tracking # of retries. |

