<a name="module_validate"></a>

## validate

* [validate](#module_validate)
    * [.getDatabaseData(salesFileId, bigQuery, callback)](#module_validate.getDatabaseData)
    * [.getNetAmountFromDatabase(salesFileId, bigQuery, callback)](#module_validate.getNetAmountFromDatabase)
    * [.getValidationDataFromData(data, callback)](#module_validate.getValidationDataFromData)
    * [.valid(databaseResults, dataResults)](#module_validate.valid) ⇒ <code>boolean</code>

<a name="module_validate.getDatabaseData"></a>

### validate.getDatabaseData(salesFileId, bigQuery, callback)
Obtains validation data for Sales File Id from Sales Database

* Calls `callback(err, result)` with `result` containing the validation data
* Calls `callback(err, result)` with an `err` message if an error occurs

**Kind**: static method of [<code>validate</code>](#module_validate)  

| Param | Type | Description |
| --- | --- | --- |
| salesFileId | <code>string</code> | The Sales File Id |
| bigQuery | <code>object</code> | bigQuery instance |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_validate.getNetAmountFromDatabase"></a>

### validate.getNetAmountFromDatabase(salesFileId, bigQuery, callback)
Obtains the net amount from Sales Database

* Calls `callback(err, result)` with `result` containing the validation data
* Calls `callback(err, result)` with an `err` message if an error occurs

**Kind**: static method of [<code>validate</code>](#module_validate)  

| Param | Type | Description |
| --- | --- | --- |
| salesFileId | <code>string</code> | The Sales File Id |
| bigQuery | <code>object</code> | bigQuery instance |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_validate.getValidationDataFromData"></a>

### validate.getValidationDataFromData(data, callback)
Obtains Validation Data from the supplied Sales Data

* Calls `callback(err, result)` with `result` containing the validation data
* Calls `callback(err, result)` with an `err` message if an error occurs

**Kind**: static method of [<code>validate</code>](#module_validate)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;object&gt;</code> | Sales Data mapped to the Template |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_validate.valid"></a>

### validate.valid(databaseResults, dataResults) ⇒ <code>boolean</code>
Compares number of units, lines and the Net Amount and returns true if all match

**Kind**: static method of [<code>validate</code>](#module_validate)  
**Returns**: <code>boolean</code> - *true* if totals from both objects match  

| Param | Type | Description |
| --- | --- | --- |
| databaseResults | <code>object</code> | Validation data from Sales Database |
| dataResults | <code>object</code> | Validation data from Sales Ingestion process |

