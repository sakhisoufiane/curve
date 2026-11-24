<a name="module_collectData"></a>

## collectData

* [collectData](#module_collectData)
    * [.removeNonSchemaItems(bigQuery, databaseTable, template, callback)](#module_collectData.removeNonSchemaItems)
    * [.addSelectorsRequiredForMapping(template, mappingData)](#module_collectData.addSelectorsRequiredForMapping) ⇒

<a name="module_collectData.removeNonSchemaItems"></a>

### collectData.removeNonSchemaItems(bigQuery, databaseTable, template, callback)
Removes items from template which are not in BigQuery schema

* Calls `callback(err, templateOut)` with `templateOut` containing the modified template
* Calls `callback(err, templateOut)` with an `err` message if an error occurs

**Kind**: static method of [<code>collectData</code>](#module_collectData)  

| Param | Type | Description |
| --- | --- | --- |
| bigQuery | <code>object</code> | BigQuery instance |
| databaseTable | <code>string</code> | Name of BigQuery database table |
| template | <code>array</code> | Template to be modified |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_collectData.addSelectorsRequiredForMapping"></a>

### collectData.addSelectorsRequiredForMapping(template, mappingData) ⇒
Adds selectors required for mapping to template

**Kind**: static method of [<code>collectData</code>](#module_collectData)  
**Returns**: Template with any selectors added if required  

| Param | Type | Description |
| --- | --- | --- |
| template | <code>array</code> | Output template |
| mappingData | <code>object</code> | Mapping Data obtained through client.catalogueOverwritingData() |

