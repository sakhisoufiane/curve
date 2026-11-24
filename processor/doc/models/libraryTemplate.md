<a name="module_libraryTemplate"></a>

## libraryTemplate

* [libraryTemplate](#module_libraryTemplate)
    * [~libraryTemplateSchema](#module_libraryTemplate..libraryTemplateSchema)
        * [new libraryTemplateSchema()](#new_module_libraryTemplate..libraryTemplateSchema_new)
        * [.methods.tabIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
        * [.methods.startingLeftIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
        * [.methods.startingLineIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
        * [.methods.createSalesTemplate(clientId, callback)](#module_libraryTemplate..libraryTemplateSchema.methods.createSalesTemplate)

<a name="module_libraryTemplate..libraryTemplateSchema"></a>

### libraryTemplate~libraryTemplateSchema
**Kind**: inner class of [<code>libraryTemplate</code>](#module_libraryTemplate)  

* [~libraryTemplateSchema](#module_libraryTemplate..libraryTemplateSchema)
    * [new libraryTemplateSchema()](#new_module_libraryTemplate..libraryTemplateSchema_new)
    * [.methods.tabIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
    * [.methods.startingLeftIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
    * [.methods.startingLineIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
    * [.methods.createSalesTemplate(clientId, callback)](#module_libraryTemplate..libraryTemplateSchema.methods.createSalesTemplate)

<a name="new_module_libraryTemplate..libraryTemplateSchema_new"></a>

#### new libraryTemplateSchema()
libraryTemplateSchema schema

<a name="module_libraryTemplate..libraryTemplateSchema.methods.tabIndex"></a>

#### libraryTemplateSchema.methods.tabIndex() ⇒ <code>number</code>
Returns the Tab Index of this Library Template

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  
**Returns**: <code>number</code> - The Tab Index starting at 0  
<a name="module_libraryTemplate..libraryTemplateSchema.methods.startingLeftIndex"></a>

#### libraryTemplateSchema.methods.startingLeftIndex() ⇒ <code>number</code>
Returns the Starting Left Index (Column Index) of this Library Template

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  
**Returns**: <code>number</code> - The Starting Left Index starting at 0  
<a name="module_libraryTemplate..libraryTemplateSchema.methods.startingLineIndex"></a>

#### libraryTemplateSchema.methods.startingLineIndex() ⇒ <code>number</code>
Returns the Starting Line Index of this Library Template

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  
**Returns**: <code>number</code> - The Starting Line Index starting at 0  
<a name="module_libraryTemplate..libraryTemplateSchema.methods.createSalesTemplate"></a>

#### libraryTemplateSchema.methods.createSalesTemplate(clientId, callback)
Creates a Sales Template from this Library Template

* Calls `callback(err, salesTemplate)` with `salesTemplate` containing the Sales File document
* Calls `callback(err, salesTemplate)` with an `err` if an error occurs

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  

| Param | Type | Description |
| --- | --- | --- |
| clientId | <code>object</code> | The client id to add |
| callback | <code>function</code> | A callback that handles the response |

