<a name="module_salesFile"></a>

## salesFile

* [salesFile](#module_salesFile)
    * [~salesFileSchema](#module_salesFile..salesFileSchema)
        * [new salesFileSchema()](#new_module_salesFile..salesFileSchema_new)
        * [.methods.cleanBulkIdentifiersFromTemplates()](#module_salesFile..salesFileSchema.methods.cleanBulkIdentifiersFromTemplates)
        * [.methods.setPartitionNo()](#module_salesFile..salesFileSchema.methods.setPartitionNo)
        * [.methods.userForbidden(user, readWrite)](#module_salesFile..salesFileSchema.methods.userForbidden) ⇒ <code>boolean</code>
        * [.statics.sendExport(filter, curveUser)](#module_salesFile..salesFileSchema.statics.sendExport)
        * [.methods.exportData()](#module_salesFile..salesFileSchema.methods.exportData) ⇒ <code>array</code>
        * [.statics.convertSalesFilesForXlsx(salesFiles, callback)](#module_salesFile..salesFileSchema.statics.convertSalesFilesForXlsx)
        * [.methods.mapTemplateToSalesFile(localFile, callback)](#module_salesFile..salesFileSchema.methods.mapTemplateToSalesFile)
        * [.methods.createIngestTask(priority, callback)](#module_salesFile..salesFileSchema.methods.createIngestTask)
        * [.statics.bulkIngest(ids, curveUser, [callback])](#module_salesFile..salesFileSchema.statics.bulkIngest)
        * [.methods.createRevalidationTask(priority, callback)](#module_salesFile..salesFileSchema.methods.createRevalidationTask)
        * [.statics.bulkRevalidate(ids, curveUser, [callback])](#module_salesFile..salesFileSchema.statics.bulkRevalidate)
        * [.methods.updateReportedStatus([callback])](#module_salesFile..salesFileSchema.methods.updateReportedStatus)
        * [.statics.clearSalesData(salesFileIds, clientId, callback)](#module_salesFile..salesFileSchema.statics.clearSalesData)
        * [.statics.bulkDelete(ids, clientId, curveUser, callback)](#module_salesFile..salesFileSchema.statics.bulkDelete)
        * [.methods.clearSalesData(ids, clientId, curveUser, callback)](#module_salesFile..salesFileSchema.methods.clearSalesData)
        * [.statics.paramsToFilterField(inputParams, user)](#module_salesFile..salesFileSchema.statics.paramsToFilterField) ⇒ <code>object</code>

<a name="module_salesFile..salesFileSchema"></a>

### salesFile~salesFileSchema
**Kind**: inner class of [<code>salesFile</code>](#module_salesFile)  

* [~salesFileSchema](#module_salesFile..salesFileSchema)
    * [new salesFileSchema()](#new_module_salesFile..salesFileSchema_new)
    * [.methods.cleanBulkIdentifiersFromTemplates()](#module_salesFile..salesFileSchema.methods.cleanBulkIdentifiersFromTemplates)
    * [.methods.setPartitionNo()](#module_salesFile..salesFileSchema.methods.setPartitionNo)
    * [.methods.userForbidden(user, readWrite)](#module_salesFile..salesFileSchema.methods.userForbidden) ⇒ <code>boolean</code>
    * [.statics.sendExport(filter, curveUser)](#module_salesFile..salesFileSchema.statics.sendExport)
    * [.methods.exportData()](#module_salesFile..salesFileSchema.methods.exportData) ⇒ <code>array</code>
    * [.statics.convertSalesFilesForXlsx(salesFiles, callback)](#module_salesFile..salesFileSchema.statics.convertSalesFilesForXlsx)
    * [.methods.mapTemplateToSalesFile(localFile, callback)](#module_salesFile..salesFileSchema.methods.mapTemplateToSalesFile)
    * [.methods.createIngestTask(priority, callback)](#module_salesFile..salesFileSchema.methods.createIngestTask)
    * [.statics.bulkIngest(ids, curveUser, [callback])](#module_salesFile..salesFileSchema.statics.bulkIngest)
    * [.methods.createRevalidationTask(priority, callback)](#module_salesFile..salesFileSchema.methods.createRevalidationTask)
    * [.statics.bulkRevalidate(ids, curveUser, [callback])](#module_salesFile..salesFileSchema.statics.bulkRevalidate)
    * [.methods.updateReportedStatus([callback])](#module_salesFile..salesFileSchema.methods.updateReportedStatus)
    * [.statics.clearSalesData(salesFileIds, clientId, callback)](#module_salesFile..salesFileSchema.statics.clearSalesData)
    * [.statics.bulkDelete(ids, clientId, curveUser, callback)](#module_salesFile..salesFileSchema.statics.bulkDelete)
    * [.methods.clearSalesData(ids, clientId, curveUser, callback)](#module_salesFile..salesFileSchema.methods.clearSalesData)
    * [.statics.paramsToFilterField(inputParams, user)](#module_salesFile..salesFileSchema.statics.paramsToFilterField) ⇒ <code>object</code>

<a name="new_module_salesFile..salesFileSchema_new"></a>

#### new salesFileSchema()
salesFileSchema schema

<a name="module_salesFile..salesFileSchema.methods.cleanBulkIdentifiersFromTemplates"></a>

#### salesFileSchema.methods.cleanBulkIdentifiersFromTemplates()
Clean the bulk identifiers from the templates the sale file isn't attached to anymore

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  
<a name="module_salesFile..salesFileSchema.methods.setPartitionNo"></a>

#### salesFileSchema.methods.setPartitionNo()
Sets the partition number according to today's date

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  
<a name="module_salesFile..salesFileSchema.methods.userForbidden"></a>

#### salesFileSchema.methods.userForbidden(user, readWrite) ⇒ <code>boolean</code>
Checks if the supplied user is forbidden to access Sales File data, either for reading or writing

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  
**Returns**: <code>boolean</code> - Returns false if user is allowed access, true if not  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | The user object |
| readWrite | <code>string</code> | Supplied as either "read" or "write" to check for "read" or "write" access |

<a name="module_salesFile..salesFileSchema.statics.sendExport"></a>

#### salesFileSchema.statics.sendExport(filter, curveUser)
Exports this Sales File as Excel file and uploads to S3. Does not use a callback but instead triggers Notifications to the user.

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Filter object to use for selecting Sales Files from database |
| curveUser | <code>object</code> | User object |

<a name="module_salesFile..salesFileSchema.methods.exportData"></a>

#### salesFileSchema.methods.exportData() ⇒ <code>array</code>
Converts Sales File data for a single Sales File. Used by convertSalesFilesForXlsx

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  
**Returns**: <code>array</code> - An array containing the relevant Sales File information for export  
**See**: convertSalesFilesForXlsx  
<a name="module_salesFile..salesFileSchema.statics.convertSalesFilesForXlsx"></a>

#### salesFileSchema.statics.convertSalesFilesForXlsx(salesFiles, callback)
Converts Sales File data for multiple Sales Files. Used by sendExport

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  
**See**: sendExport

* Calls `callback(err, convertedSalesFiles)` with `convertedSalesFiles` containing the converted Sales Files data
* Calls `callback(err, convertedSalesFiles)` with an `err` message if an error occurs  

| Param | Type | Description |
| --- | --- | --- |
| salesFiles | <code>Array.&lt;object&gt;</code> | An array of Sales File documents |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.methods.mapTemplateToSalesFile"></a>

#### salesFileSchema.methods.mapTemplateToSalesFile(localFile, callback)
Extracts example lines from the supplied file and maps this to the Sales Template fields.

* Calls `callback(err, exampleLines)` with `exampleLines` containing the Example Lines including headerRow and formatRow
* Calls `callback(err, exampleLines)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| localFile | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.methods.createIngestTask"></a>

#### salesFileSchema.methods.createIngestTask(priority, callback)
Creates an ingest task to be picked up by the processor

* Creates a task in the database
* Then changes status of Sales File to "Waiting"
* Sends a message to AWS SQS to notify processor of the pending task
* Calls `callback(err, data)` with `data` containing the data returned by SQS.sendMessage
* Calls `callback(err, data)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| priority | <code>number</code> | The priority of the task (defaults to 1) |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.statics.bulkIngest"></a>

#### salesFileSchema.statics.bulkIngest(ids, curveUser, [callback])
Creates Ingest task for multiple Sales Files

* Calls `callback(err)` with no `err` once done (if callback is supplied)
* Calls `callback(err)` with an `err` message if an error occurs (if callback is supplied)

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| ids | <code>Array.&lt;String&gt;</code> | Sales Files ids |
| curveUser | <code>object</code> | User object |
| [callback] | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.methods.createRevalidationTask"></a>

#### salesFileSchema.methods.createRevalidationTask(priority, callback)
Creates a Revalidation task to be picked up by the processor

* Creates a task in the database
* Then changes status of Sales File to "Waiting"
* Sends a message to AWS SQS to notify processor of the pending task
* Calls `callback(err, data)` with `data` containing the data returned by SQS.sendMessage
* Calls `callback(err, data)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| priority | <code>number</code> | The priority of the task (defaults to 1) |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.statics.bulkRevalidate"></a>

#### salesFileSchema.statics.bulkRevalidate(ids, curveUser, [callback])
Creates Revalidation task for multiple Sales Files

* Calls `callback(err)` with no `err` once done (if callback is supplied)
* Calls `callback(err)` with an `err` message if an error occurs (if callback is supplied)

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| ids | <code>Array.&lt;String&gt;</code> | Sales Files ids |
| curveUser | <code>object</code> | User object |
| [callback] | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.methods.updateReportedStatus"></a>

#### salesFileSchema.methods.updateReportedStatus([callback])
Updates the Sales Files' reportedStatus to either "Complete", "Partially Complete", "Unreported" depending on inputs and outputs.
Sets salesFile.reportedLines to the number of output items

* Calls `callback(err, salesFile)` with `salesFile` containing this Sales File document returned by `salesFile.save()`
* Calls `callback(err, salesFile)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| [callback] | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.statics.clearSalesData"></a>

#### salesFileSchema.statics.clearSalesData(salesFileIds, clientId, callback)
Clears sales data for the supplied Sales Files

* Calls `callback(err)` with no `err` once done
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| salesFileIds | <code>Array.&lt;string&gt;</code> | Array of Sales Files Ids |
| clientId | <code>string</code> | The client id to use for BigQuery database query |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.statics.bulkDelete"></a>

#### salesFileSchema.statics.bulkDelete(ids, clientId, curveUser, callback)
Clears Sales Data for the supplied list of Sales Files Sales Data BigQuery tables and deletes Sales Files from Mongo database

* Calls `callback(err)` with no `err` once done
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| ids | <code>Array.&lt;string&gt;</code> | Array of Sales Files Ids |
| clientId | <code>string</code> | The client id to use for BigQuery database query |
| curveUser | <code>object</code> | User object |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.methods.clearSalesData"></a>

#### salesFileSchema.methods.clearSalesData(ids, clientId, curveUser, callback)
Clears Sales Data for this Sales File's Sales Data BigQuery tables and deletes Sales File from Mongo database. Calls static method bulkDelete to do so.

* Calls `callback(err)` with no `err` once done
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  

| Param | Type | Description |
| --- | --- | --- |
| ids | <code>Array.&lt;string&gt;</code> | Array of Sales Files Ids |
| clientId | <code>string</code> | The client id to use for BigQuery database query |
| curveUser | <code>object</code> | User object |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesFile..salesFileSchema.statics.paramsToFilterField"></a>

#### salesFileSchema.statics.paramsToFilterField(inputParams, user) ⇒ <code>object</code>
Creates database filter from supplied api input params

**Kind**: static method of [<code>salesFileSchema</code>](#module_salesFile..salesFileSchema)  
**Returns**: <code>object</code> - Database filter  

| Param | Type | Description |
| --- | --- | --- |
| inputParams | <code>object</code> | API params used to build the filter. Usually `req.query` passed by API. |
| user | <code>object</code> | The user object |

