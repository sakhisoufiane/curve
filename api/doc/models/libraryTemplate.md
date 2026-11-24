<a name="module_libraryTemplate"></a>

## libraryTemplate

* [libraryTemplate](#module_libraryTemplate)
    * [~libraryTemplateSchema](#module_libraryTemplate..libraryTemplateSchema)
        * [new libraryTemplateSchema()](#new_module_libraryTemplate..libraryTemplateSchema_new)
        * [.methods.userForbidden(user, readWrite)](#module_libraryTemplate..libraryTemplateSchema.methods.userForbidden) ⇒ <code>boolean</code>
        * [.methods.tabIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
        * [.methods.headerRowIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.headerRowIndex) ⇒ <code>number</code>
        * [.methods.startingLeftIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
        * [.methods.startingLineIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
        * [.methods.characterSeparators()](#module_libraryTemplate..libraryTemplateSchema.methods.characterSeparators) ⇒ <code>Array.&lt;Number&gt;</code>
        * [.methods.createSalesTemplate(curveUser, callback)](#module_libraryTemplate..libraryTemplateSchema.methods.createSalesTemplate)
        * [.methods.extractExamplesLinesAndIdentifiers(callback)](#module_libraryTemplate..libraryTemplateSchema.methods.extractExamplesLinesAndIdentifiers)

<a name="module_libraryTemplate..libraryTemplateSchema"></a>

### libraryTemplate~libraryTemplateSchema
**Kind**: inner class of [<code>libraryTemplate</code>](#module_libraryTemplate)  

* [~libraryTemplateSchema](#module_libraryTemplate..libraryTemplateSchema)
    * [new libraryTemplateSchema()](#new_module_libraryTemplate..libraryTemplateSchema_new)
    * [.methods.userForbidden(user, readWrite)](#module_libraryTemplate..libraryTemplateSchema.methods.userForbidden) ⇒ <code>boolean</code>
    * [.methods.tabIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
    * [.methods.headerRowIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.headerRowIndex) ⇒ <code>number</code>
    * [.methods.startingLeftIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
    * [.methods.startingLineIndex()](#module_libraryTemplate..libraryTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
    * [.methods.characterSeparators()](#module_libraryTemplate..libraryTemplateSchema.methods.characterSeparators) ⇒ <code>Array.&lt;Number&gt;</code>
    * [.methods.createSalesTemplate(curveUser, callback)](#module_libraryTemplate..libraryTemplateSchema.methods.createSalesTemplate)
    * [.methods.extractExamplesLinesAndIdentifiers(callback)](#module_libraryTemplate..libraryTemplateSchema.methods.extractExamplesLinesAndIdentifiers)

<a name="new_module_libraryTemplate..libraryTemplateSchema_new"></a>

#### new libraryTemplateSchema()
libraryTemplateSchema schema

<a name="module_libraryTemplate..libraryTemplateSchema.methods.userForbidden"></a>

#### libraryTemplateSchema.methods.userForbidden(user, readWrite) ⇒ <code>boolean</code>
Checks if the supplied user is forbidden to access Library Template data, either for reading or writing

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  
**Returns**: <code>boolean</code> - Returns false if user is allowed access, true if not  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | The user object |
| readWrite | <code>string</code> | Supplied as either "read" or "write" to check for "read" or "write" access |

<a name="module_libraryTemplate..libraryTemplateSchema.methods.tabIndex"></a>

#### libraryTemplateSchema.methods.tabIndex() ⇒ <code>number</code>
Returns the Tab Index of this Library Template

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  
**Returns**: <code>number</code> - The Tab Index starting at 0  
<a name="module_libraryTemplate..libraryTemplateSchema.methods.headerRowIndex"></a>

#### libraryTemplateSchema.methods.headerRowIndex() ⇒ <code>number</code>
Returns the Header Row Index of this Library Template

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  
**Returns**: <code>number</code> - The Header Row Index starting at 0  
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
<a name="module_libraryTemplate..libraryTemplateSchema.methods.characterSeparators"></a>

#### libraryTemplateSchema.methods.characterSeparators() ⇒ <code>Array.&lt;Number&gt;</code>
Returns the Character Separators of this Library Template

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  
**Returns**: <code>Array.&lt;Number&gt;</code> - Array of numbers containing the Character Separators  
<a name="module_libraryTemplate..libraryTemplateSchema.methods.createSalesTemplate"></a>

#### libraryTemplateSchema.methods.createSalesTemplate(curveUser, callback)
Creates a Sales Template from this Library Template

* Calls `callback(err, salesTemplate)` with `salesTemplate` containing the Sales File document
* Calls `callback(err, salesTemplate)` with an `err` message if an error occurs

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  

| Param | Type | Description |
| --- | --- | --- |
| curveUser | <code>object</code> | User object |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_libraryTemplate..libraryTemplateSchema.methods.extractExamplesLinesAndIdentifiers"></a>

#### libraryTemplateSchema.methods.extractExamplesLinesAndIdentifiers(callback)
Extracts Example Lines and Identifiers from the Example Sales Data File attached to this Library Template

* Calls `callback(err, libraryTemplate)` with `libraryTemplate` containing the updated Sales Template document
* Calls `callback(err, libraryTemplate)` with an `err` message string if an error occurs

**Kind**: static method of [<code>libraryTemplateSchema</code>](#module_libraryTemplate..libraryTemplateSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | A callback that handles the response |

