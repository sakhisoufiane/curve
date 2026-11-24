<a name="module_SalesFileController"></a>

## SalesFileController

* [SalesFileController](#module_SalesFileController)
    * [.ingest(salesFile, callback)](#module_SalesFileController.ingest)
    * [.runRevalidation(salesFile, callback)](#module_SalesFileController.runRevalidation)
    * [.revalidate(salesFile, callback)](#module_SalesFileController.revalidate)
    * [.updateReportedStatus(salesFile, callback)](#module_SalesFileController.updateReportedStatus)

<a name="module_SalesFileController.ingest"></a>

### SalesFileController.ingest(salesFile, callback)
The Sales File ingestion process

* Calls `callback()` if successful
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>SalesFileController</code>](#module_SalesFileController)  

| Param | Type | Description |
| --- | --- | --- |
| salesFile | <code>object</code> | The sales file document |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_SalesFileController.runRevalidation"></a>

### SalesFileController.runRevalidation(salesFile, callback)
Runs the revalidation process (via revalidate method)

* Calls `callback()` if successful
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>SalesFileController</code>](#module_SalesFileController)  

| Param | Type | Description |
| --- | --- | --- |
| salesFile | <code>object</code> | The sales file document |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_SalesFileController.revalidate"></a>

### SalesFileController.revalidate(salesFile, callback)
Revalidates this Sales File

* Calls `callback()` if successful
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>SalesFileController</code>](#module_SalesFileController)  

| Param | Type | Description |
| --- | --- | --- |
| salesFile | <code>object</code> | The sales file document |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_SalesFileController.updateReportedStatus"></a>

### SalesFileController.updateReportedStatus(salesFile, callback)
Updates the Sales Files' reportedStatus to either "Complete", "Partially Complete", "Unreported" depending on inputs and outputs.
Sets `salesFile.reportedLines` to the number of output items

* Calls `callback(err, salesFile)` with `salesFile` containing this Sales File document returned by salesFile.save()
* Calls `callback(err, salesFile)` with an `err` message if an error occurs

**Kind**: static method of [<code>SalesFileController</code>](#module_SalesFileController)  

| Param | Type | Description |
| --- | --- | --- |
| salesFile | <code>object</code> | The sales file document |
| callback | <code>function</code> | A callback that handles the response |

