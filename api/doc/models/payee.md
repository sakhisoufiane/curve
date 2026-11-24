<a name="module_payee"></a>

## payee

* [payee](#module_payee)
    * [~payeeSchema](#module_payee..payeeSchema)
        * [new payeeSchema()](#new_module_payee..payeeSchema_new)
        * [.statics.paramsToFilterField(inputParams, curveUser)](#module_payee..payeeSchema.statics.paramsToFilterField) ⇒ <code>object</code>
        * [.methods.userForbidden(user, readWrite)](#module_payee..payeeSchema.methods.userForbidden) ⇒ <code>boolean</code>
        * [.methods.getParent(accountingPeriod, callback)](#module_payee..payeeSchema.methods.getParent)
        * [.methods.getClientValues(callback)](#module_payee..payeeSchema.methods.getClientValues)
        * [.methods.summary(callback)](#module_payee..payeeSchema.methods.summary)
        * [.methods.analytics(callback)](#module_payee..payeeSchema.methods.analytics)
        * [.statics.sendExport(filter, curveUser, callback)](#module_payee..payeeSchema.statics.sendExport)
        * [.statics.convertPayeesForXlsx(payees, callback)](#module_payee..payeeSchema.statics.convertPayeesForXlsx)
        * [.methods.exportData()](#module_payee..payeeSchema.methods.exportData) ⇒ <code>Array.&lt;string&gt;</code>
        * [.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)](#module_payee..payeeSchema.statics.importFromExcel)
        * [.statics.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, callback)](#module_payee..payeeSchema.statics.importPayee)
        * [.statics.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, callback)](#module_payee..payeeSchema.statics.importPayees)
        * [.methods.updateCopyToCatalogueClients(callback)](#module_payee..payeeSchema.methods.updateCopyToCatalogueClients)
        * [.methods.updateCopyToCatalogueByClient(client, callback)](#module_payee..payeeSchema.methods.updateCopyToCatalogueByClient)
        * [.methods.copyValues(payeeToCopy, clientId, callback)](#module_payee..payeeSchema.methods.copyValues)
        * [.methods.checkValidationErrors(excludeContractId)](#module_payee..payeeSchema.methods.checkValidationErrors)
        * [.methods.checkValidationUser(update)](#module_payee..payeeSchema.methods.checkValidationUser)
        * [.statics.escapeDotsFromWiseFields(paymentFields, replaceDots)](#module_payee..payeeSchema.statics.escapeDotsFromWiseFields) ⇒ <code>object</code>
    * [~isObjectPopulated(obj)](#module_payee..isObjectPopulated) ⇒ <code>boolean</code>

<a name="module_payee..payeeSchema"></a>

### payee~payeeSchema
**Kind**: inner class of [<code>payee</code>](#module_payee)  

* [~payeeSchema](#module_payee..payeeSchema)
    * [new payeeSchema()](#new_module_payee..payeeSchema_new)
    * [.statics.paramsToFilterField(inputParams, curveUser)](#module_payee..payeeSchema.statics.paramsToFilterField) ⇒ <code>object</code>
    * [.methods.userForbidden(user, readWrite)](#module_payee..payeeSchema.methods.userForbidden) ⇒ <code>boolean</code>
    * [.methods.getParent(accountingPeriod, callback)](#module_payee..payeeSchema.methods.getParent)
    * [.methods.getClientValues(callback)](#module_payee..payeeSchema.methods.getClientValues)
    * [.methods.summary(callback)](#module_payee..payeeSchema.methods.summary)
    * [.methods.analytics(callback)](#module_payee..payeeSchema.methods.analytics)
    * [.statics.sendExport(filter, curveUser, callback)](#module_payee..payeeSchema.statics.sendExport)
    * [.statics.convertPayeesForXlsx(payees, callback)](#module_payee..payeeSchema.statics.convertPayeesForXlsx)
    * [.methods.exportData()](#module_payee..payeeSchema.methods.exportData) ⇒ <code>Array.&lt;string&gt;</code>
    * [.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)](#module_payee..payeeSchema.statics.importFromExcel)
    * [.statics.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, callback)](#module_payee..payeeSchema.statics.importPayee)
    * [.statics.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, callback)](#module_payee..payeeSchema.statics.importPayees)
    * [.methods.updateCopyToCatalogueClients(callback)](#module_payee..payeeSchema.methods.updateCopyToCatalogueClients)
    * [.methods.updateCopyToCatalogueByClient(client, callback)](#module_payee..payeeSchema.methods.updateCopyToCatalogueByClient)
    * [.methods.copyValues(payeeToCopy, clientId, callback)](#module_payee..payeeSchema.methods.copyValues)
    * [.methods.checkValidationErrors(excludeContractId)](#module_payee..payeeSchema.methods.checkValidationErrors)
    * [.methods.checkValidationUser(update)](#module_payee..payeeSchema.methods.checkValidationUser)
    * [.statics.escapeDotsFromWiseFields(paymentFields, replaceDots)](#module_payee..payeeSchema.statics.escapeDotsFromWiseFields) ⇒ <code>object</code>

<a name="new_module_payee..payeeSchema_new"></a>

#### new payeeSchema()
Payee schema

<a name="module_payee..payeeSchema.statics.paramsToFilterField"></a>

#### payeeSchema.statics.paramsToFilterField(inputParams, curveUser) ⇒ <code>object</code>
Constructs a filter from input params

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  
**Returns**: <code>object</code> - params - The constructed filter  

| Param | Type | Description |
| --- | --- | --- |
| inputParams | <code>object</code> | The input params object |
| curveUser | <code>object</code> | The user object |

<a name="module_payee..payeeSchema.methods.userForbidden"></a>

#### payeeSchema.methods.userForbidden(user, readWrite) ⇒ <code>boolean</code>
Checks if the supplied user is forbidden from accessing the payee data

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  
**Returns**: <code>boolean</code> - Returns false if user is allowed access, true if not  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | The user object |
| readWrite | <code>string</code> | Supplied as either "read" or "write" to check for "read" or "write" access |

<a name="module_payee..payeeSchema.methods.getParent"></a>

#### payeeSchema.methods.getParent(accountingPeriod, callback)
Returns the Parent of the Client associated with the Payee.

Calls callback(err, parent) with [err] if an error occurs or the [parent] if a Parent is found.

Calls callback(err) if no Client is associated with the Payee.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| accountingPeriod | <code>string</code> | Accounting period. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.getClientValues"></a>

#### payeeSchema.methods.getClientValues(callback)
Returns data of the Client associated with the Payee.

Calls callback(err, json) with [err] if an error occurs or the [json] object of the Client data.

The returned json object contains: distributionChannels, configurations, priceCategories, sources, costTypes and catalogueGroups.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.summary"></a>

#### payeeSchema.methods.summary(callback)
Returns a summary of the Payee's total revenues and costs to date.

Calls callback(err, summary) with [err] if an error occurs or a [summary] of the Payee's costs and revenues.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.analytics"></a>

#### payeeSchema.methods.analytics(callback)
Returns analitycs of all the Payee's statements.

Calls callback(err) with [err] if an error occurs.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.statics.sendExport"></a>

#### payeeSchema.statics.sendExport(filter, curveUser, callback)
Sends an export of the Payee data by email.

Calls callback(err, result) with [err] if an error occurs or a [result] of the Payee's net revenues analytics.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>filter</code> | The Payee filter object. |
| curveUser | <code>curveUser</code> | The user object. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.statics.convertPayeesForXlsx"></a>

#### payeeSchema.statics.convertPayeesForXlsx(payees, callback)
Converts each of the passed Payees into an array of data

Calls callback(err, convertedPayees) with [err] if an error occurs or a array of [convertedPayees].

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| payees | <code>Array.&lt;object&gt;</code> | An array of Payees to convert. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.exportData"></a>

#### payeeSchema.methods.exportData() ⇒ <code>Array.&lt;string&gt;</code>
Returns an array of the payee data for excel.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  
**Returns**: <code>Array.&lt;string&gt;</code> - data - An array of the Payee's data.  
<a name="module_payee..payeeSchema.statics.importFromExcel"></a>

#### payeeSchema.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)
Imports Payees from Excel.

Calls callback(err, result) with an [err] or message string if an error occurs and the generated notification [result].

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>object</code> | File to import. |
| curveUser | <code>curveUser</code> | User importing the contract. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.statics.importPayee"></a>

#### payeeSchema.statics.importPayee(data, clientId, overwriteBlanks, isClientAdminUser, callback)
Imports a single Payee from Excel.

Calls callback(err, payee) with an [err] if an error occurs and the imported [payee].

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Payee to import. |
| clientId | <code>string</code> | ID of the client importing the payee. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| isClientAdminUser | <code>boolean</code> | Set to true if user is client admin, which means they can update encrypted fields and other client-admin only fields |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.statics.importPayees"></a>

#### payeeSchema.statics.importPayees(payees, clientId, overwriteBlanks, isClientAdminUser, callback)
Imports multiple Payees from Excel.

Calls callback(errors, count, importedPayees) with an array of [errors] if they occur, the [count] of payees imported and an array of the [importedPayees].

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| payees | <code>Array.&lt;object&gt;</code> | Payees to import. |
| clientId | <code>string</code> | ID of the client importing the contract. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| isClientAdminUser | <code>boolean</code> | Set to true if user is client admin, which means they can update encrypted fields and other client-admin only fields |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.updateCopyToCatalogueClients"></a>

#### payeeSchema.methods.updateCopyToCatalogueClients(callback)
Copies the Payee to other associated clients.

Calls callback(error, payee) with an [error] if it occurs and the [payee] object.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.updateCopyToCatalogueByClient"></a>

#### payeeSchema.methods.updateCopyToCatalogueByClient(client, callback)
Copies the Payee data from one client to the other.

Calls callback(error) with an [error] if it occurs.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | The client the new Payee belongs to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.copyValues"></a>

#### payeeSchema.methods.copyValues(payeeToCopy, clientId, callback)
Copies data from one Payee to the current Payee.

Calls callback(error) with an [error] if it occurs and the copied [payee] object.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| payeeToCopy | <code>object</code> | The Payee data should be copied from. |
| clientId | <code>string</code> | The ID of the client the Payee belongs to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_payee..payeeSchema.methods.checkValidationErrors"></a>

#### payeeSchema.methods.checkValidationErrors(excludeContractId)
Validates the Payee and reports any errors via 'validationErrors'.

Sets the state of the model via 'valid'

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| excludeContractId | <code>ObjectId</code> | Payee has been removed from this contract so exclude from filter |

<a name="module_payee..payeeSchema.methods.checkValidationUser"></a>

#### payeeSchema.methods.checkValidationUser(update)
Validates the Payee and reports error if no user attached.

Sets the state of the model via 'valid'

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  

| Param | Type | Description |
| --- | --- | --- |
| update | <code>boolean</code> | should we also update the payee. |

<a name="module_payee..payeeSchema.statics.escapeDotsFromWiseFields"></a>

#### payeeSchema.statics.escapeDotsFromWiseFields(paymentFields, replaceDots) ⇒ <code>object</code>
Formats wise payment fields to remove or add dots to them

Calls callback(error) with an [error] if it occurs and the copied [payee] object.

**Kind**: static method of [<code>payeeSchema</code>](#module_payee..payeeSchema)  
**Returns**: <code>object</code> - newPaymentFields - the formatted object  

| Param | Type | Description |
| --- | --- | --- |
| paymentFields | <code>object</code> | The Payee wise fields. |
| replaceDots | <code>boolean</code> | true to remove dots, false add dots. |

<a name="module_payee..isObjectPopulated"></a>

### payee~isObjectPopulated(obj) ⇒ <code>boolean</code>
Checks that an object is not empty.

**Kind**: inner method of [<code>payee</code>](#module_payee)  
**Returns**: <code>boolean</code> - objectPopulated - Set to true if the object is empty  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> | Object to check |

