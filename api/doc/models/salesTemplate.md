<a name="module_salesTemplate"></a>

## salesTemplate

* [salesTemplate](#module_salesTemplate)
    * [~salesTemplateSchema](#module_salesTemplate..salesTemplateSchema)
        * [new salesTemplateSchema()](#new_module_salesTemplate..salesTemplateSchema_new)
        * [.methods.userForbidden(user, readWrite)](#module_salesTemplate..salesTemplateSchema.methods.userForbidden) ⇒ <code>boolean</code>
        * [.methods.tabIndex()](#module_salesTemplate..salesTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
        * [.methods.headerRowIndex()](#module_salesTemplate..salesTemplateSchema.methods.headerRowIndex) ⇒ <code>number</code>
        * [.methods.startingLeftIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
        * [.methods.startingLineIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
        * [.methods.characterSeparators()](#module_salesTemplate..salesTemplateSchema.methods.characterSeparators) ⇒ <code>Array.&lt;Number&gt;</code>
        * [.methods.addToLibrary(curveUser, callback)](#module_salesTemplate..salesTemplateSchema.methods.addToLibrary)
        * [.methods.extractExamplesLinesAndIdentifiers(callback)](#module_salesTemplate..salesTemplateSchema.methods.extractExamplesLinesAndIdentifiers)

<a name="module_salesTemplate..salesTemplateSchema"></a>

### salesTemplate~salesTemplateSchema
**Kind**: inner class of [<code>salesTemplate</code>](#module_salesTemplate)  

* [~salesTemplateSchema](#module_salesTemplate..salesTemplateSchema)
    * [new salesTemplateSchema()](#new_module_salesTemplate..salesTemplateSchema_new)
    * [.methods.userForbidden(user, readWrite)](#module_salesTemplate..salesTemplateSchema.methods.userForbidden) ⇒ <code>boolean</code>
    * [.methods.tabIndex()](#module_salesTemplate..salesTemplateSchema.methods.tabIndex) ⇒ <code>number</code>
    * [.methods.headerRowIndex()](#module_salesTemplate..salesTemplateSchema.methods.headerRowIndex) ⇒ <code>number</code>
    * [.methods.startingLeftIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLeftIndex) ⇒ <code>number</code>
    * [.methods.startingLineIndex()](#module_salesTemplate..salesTemplateSchema.methods.startingLineIndex) ⇒ <code>number</code>
    * [.methods.characterSeparators()](#module_salesTemplate..salesTemplateSchema.methods.characterSeparators) ⇒ <code>Array.&lt;Number&gt;</code>
    * [.methods.addToLibrary(curveUser, callback)](#module_salesTemplate..salesTemplateSchema.methods.addToLibrary)
    * [.methods.extractExamplesLinesAndIdentifiers(callback)](#module_salesTemplate..salesTemplateSchema.methods.extractExamplesLinesAndIdentifiers)

<a name="new_module_salesTemplate..salesTemplateSchema_new"></a>

#### new salesTemplateSchema()
salesTemplateSchema schema

<a name="module_salesTemplate..salesTemplateSchema.methods.userForbidden"></a>

#### salesTemplateSchema.methods.userForbidden(user, readWrite) ⇒ <code>boolean</code>
Checks if the supplied user is forbidden to access Sales Template data, either for reading or writing

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>boolean</code> - Returns false if user is allowed access, true if not  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | The user object |
| readWrite | <code>string</code> | Supplied as either "read" or "write" to check for "read" or "write" access |

<a name="module_salesTemplate..salesTemplateSchema.methods.tabIndex"></a>

#### salesTemplateSchema.methods.tabIndex() ⇒ <code>number</code>
Returns the Tab Index of this Sales Template

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>number</code> - The Tab Index starting at 0  
<a name="module_salesTemplate..salesTemplateSchema.methods.headerRowIndex"></a>

#### salesTemplateSchema.methods.headerRowIndex() ⇒ <code>number</code>
Returns the Header Row Index of this Sales Template

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  
**Returns**: <code>number</code> - The Header Row Index starting at 0  
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
<a name="module_salesTemplate..salesTemplateSchema.methods.addToLibrary"></a>

#### salesTemplateSchema.methods.addToLibrary(curveUser, callback)
Adds this Sales Template to the Sales Template Library

* Calls `callback(err, libraryTemplate)` with `libraryTemplate` containing the created Library Template document
* Calls `callback(err, libraryTemplate)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  

| Param | Type | Description |
| --- | --- | --- |
| curveUser | <code>object</code> | Curve User object containing the user id (used to add createdBy and lastModifiedBy properties to Library Template) |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_salesTemplate..salesTemplateSchema.methods.extractExamplesLinesAndIdentifiers"></a>

#### salesTemplateSchema.methods.extractExamplesLinesAndIdentifiers(callback)
Extracts Example Lines and Identifiers from the Example Sales Data File attached to this Sales Template

* Calls `callback(err, salesTemplate)` with `salesTemplate` containing the updated Sales Template document
* Calls `callback(err, salesTemplate)` with an `err` message if an error occurs

**Kind**: static method of [<code>salesTemplateSchema</code>](#module_salesTemplate..salesTemplateSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | A callback that handles the response |

