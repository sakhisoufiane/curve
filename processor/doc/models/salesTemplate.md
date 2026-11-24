<a name="module_salesTemplate"></a>

## salesTemplate

* [salesTemplate](#module_salesTemplate)
    * [~salesTemplateSchema](#module_salesTemplate..salesTemplateSchema)
        * [new salesTemplateSchema()](#new_module_salesTemplate..salesTemplateSchema_new)
        * [.statics.getStandardTerritoryMappings()](#module_salesTemplate..salesTemplateSchema.statics.getStandardTerritoryMappings) ⇒ <code>object</code>
        * [.methods.tabIndex()](#module_salesTemplate..salesTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
        * [.methods.startingLeftIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
        * [.methods.startingLineIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
        * [.methods.characterSeparators()](#module_salesTemplate..salesTemplateSchema.methods.characterSeparators) ⇒ <code>Array.&lt;Number&gt;</code>
        * [.methods.fullMappingsForSalesIngestion(callback)](#module_salesTemplate..salesTemplateSchema.methods.fullMappingsForSalesIngestion)
    * [~addToTemplateArray(array, elementsToAdd, callback)](#module_salesTemplate..addToTemplateArray)

<a name="module_salesTemplate..salesTemplateSchema"></a>

### salesTemplate~salesTemplateSchema
**Kind**: inner class of [<code>salesTemplate</code>](#module_salesTemplate)  

* [~salesTemplateSchema](#module_salesTemplate..salesTemplateSchema)
    * [new salesTemplateSchema()](#new_module_salesTemplate..salesTemplateSchema_new)
    * [.statics.getStandardTerritoryMappings()](#module_salesTemplate..salesTemplateSchema.statics.getStandardTerritoryMappings) ⇒ <code>object</code>
    * [.methods.tabIndex()](#module_salesTemplate..salesTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
    * [.methods.startingLeftIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
    * [.methods.startingLineIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
    * [.methods.characterSeparators()](#module_salesTemplate..salesTemplateSchema.methods.characterSeparators) ⇒ <code>Array.&lt;Number&gt;</code>
    * [.methods.fullMappingsForSalesIngestion(callback)](#module_salesTemplate..salesTemplateSchema.methods.fullMappingsForSalesIngestion)

<a name="new_module_salesTemplate..salesTemplateSchema_new"></a>

#### new salesTemplateSchema()
salesTemplateSchema schema

<a name="module_salesTemplate..salesTemplateSchema.statics.getStandardTerritoryMappings"></a>

#### salesTemplateSchema.statics.getStandardTerritoryMappings() ⇒ <code>object</code>
Returns Standard Territory Mappings

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>object</code> - Standard Territory Mappings  
<a name="module_salesTemplate..salesTemplateSchema.methods.tabIndex"></a>

#### salesTemplateSchema.methods.tabIndex() ⇒ <code>number</code>
Returns the Tab Index of this Sales Template

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>number</code> - The Tab Index starting at 0  
<a name="module_salesTemplate..salesTemplateSchema.methods.startingLeftIndex"></a>

#### salesTemplateSchema.methods.startingLeftIndex() ⇒ <code>number</code>
Returns the Starting Left Index (Column Index) of this Sales Template

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>number</code> - The Starting Left Index starting at 0  
<a name="module_salesTemplate..salesTemplateSchema.methods.startingLineIndex"></a>

#### salesTemplateSchema.methods.startingLineIndex() ⇒ <code>number</code>
Returns the Starting Line Index of this Sales Template

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>number</code> - The Starting Line Index starting at 0  
<a name="module_salesTemplate..salesTemplateSchema.methods.characterSeparators"></a>

#### salesTemplateSchema.methods.characterSeparators() ⇒ <code>Array.&lt;Number&gt;</code>
Returns the Character Separators of this Sales Template

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>Array.&lt;Number&gt;</code> - Array of numbers containing the Character Separators  
<a name="module_salesTemplate..salesTemplateSchema.methods.fullMappingsForSalesIngestion"></a>

#### salesTemplateSchema.methods.fullMappingsForSalesIngestion(callback)
Compiles Mappings For Sales Ingestion

If the client attached to the Sales Template is found, this adds distributionChannels, configurations, priceCategories and saleTypes from the client to the mappings already contained in the Sales Template

* Calls `callback(err, mappings)` with `mappings` containing the various mappings, as well as the Client document in case a client is found
* Calls `callback(err, mappings)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesTemplate..addToTemplateArray"></a>

### salesTemplate~addToTemplateArray(array, elementsToAdd, callback)
Adds mappings from an array of values to a supplied array of mapping objects. Used by fullMappingsForSalesIngestion

* Calls `callback()` if successful
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: inner method of [<code>salesTemplate</code>](#module_salesTemplate)  

| Param | Type | Description |
| --- | --- | --- |
| array | <code>Array.&lt;object&gt;</code> | Array of mapping objects to add to |
| elementsToAdd | <code>Array.&lt;string&gt;</code> | Array of values to add |
| callback | <code>function</code> | A callback that handles the response |

