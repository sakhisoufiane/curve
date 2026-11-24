<a name="module_contract"></a>

## contract

* [contract](#module_contract)
    * [~contractSchema](#module_contract..contractSchema)
        * [new contractSchema()](#new_module_contract..contractSchema_new)
        * [.methods.userForbidden(user, readWrite)](#module_contract..contractSchema.methods.userForbidden) ⇒ <code>boolean</code>
        * [.methods.getAssociatedCatalogueItems(callback)](#module_contract..contractSchema.methods.getAssociatedCatalogueItems)
        * [.methods.getAssociatedCostsReleaseIds(callback)](#module_contract..contractSchema.methods.getAssociatedCostsReleaseIds)
        * [.methods.getAssociatedCostsTrackIds(callback)](#module_contract..contractSchema.methods.getAssociatedCostsTrackIds)
        * [.methods.getAssociatedCosts(callback)](#module_contract..contractSchema.methods.getAssociatedCosts)
        * [.methods.getAssociatedTransactions(date, callback)](#module_contract..contractSchema.methods.getAssociatedTransactions)
        * [.methods.getFutureTransactions(date, callback)](#module_contract..contractSchema.methods.getFutureTransactions)
        * [.methods.balanceAtDate(date, options, callback)](#module_contract..contractSchema.methods.balanceAtDate)
        * [.statics.importAliases(data, clientId, callback)](#module_contract..contractSchema.statics.importAliases)
        * [.statics.formatPopulatedRights(contract)](#module_contract..contractSchema.statics.formatPopulatedRights)
        * [.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)](#module_contract..contractSchema.statics.importFromExcel)
        * [.statics.importMechanicalFromExcel(file, curveUser, overwriteBlanks, callback)](#module_contract..contractSchema.statics.importMechanicalFromExcel)
        * [.statics.importPublisherFromExcel(file, curveUser, overwriteBlanks, callback)](#module_contract..contractSchema.statics.importPublisherFromExcel)
        * [.statics.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, callback)](#module_contract..contractSchema.statics.importContract)
        * [.statics.importContracts(contracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, callback)](#module_contract..contractSchema.statics.importContracts)
        * [.statics.sendExport(filter, contractType, clientType, curveUser)](#module_contract..contractSchema.statics.sendExport)
        * [.statics.multipleContractsForXlsx(contracts, clientId, callback)](#module_contract..contractSchema.statics.multipleContractsForXlsx)
        * [.statics.multipleMechanicalContractsForXlsx(contracts, clientId, callback)](#module_contract..contractSchema.statics.multipleMechanicalContractsForXlsx)
        * [.statics.multiplePublisherContractsForXlsx(contracts, clientId, callback)](#module_contract..contractSchema.statics.multiplePublisherContractsForXlsx)
        * [.methods.getCurrentBalance(callback)](#module_contract..contractSchema.methods.getCurrentBalance)
        * [.methods.exportData(type, dateFormat, callback)](#module_contract..contractSchema.methods.exportData)
        * [.statics.createCsvExport(data, type, clientType, callback)](#module_contract..contractSchema.statics.createCsvExport)
        * [.statics.mapCrossContractCondition(value)](#module_contract..contractSchema.statics.mapCrossContractCondition) ⇒ <code>string</code>
        * [.methods.matchContractToLabels(callback)](#module_contract..contractSchema.methods.matchContractToLabels)
        * [.methods.uniqueAliases()](#module_contract..contractSchema.methods.uniqueAliases)
        * [.methods.setPartitionNo()](#module_contract..contractSchema.methods.setPartitionNo)
        * [.statics.cleanUpNumber(numStre)](#module_contract..contractSchema.statics.cleanUpNumber) ⇒ <code>string</code>
        * [.statics.cleanUpNumbersInArray(terms, items)](#module_contract..contractSchema.statics.cleanUpNumbersInArray) ⇒ <code>Array.&lt;object&gt;</code>
        * [.statics.cleanUpNumbersInDicObj(obj)](#module_contract..contractSchema.statics.cleanUpNumbersInDicObj) ⇒ <code>object.&lt;object&gt;</code>
        * [.statics.cleanUpCrossContractValues(crossContracts)](#module_contract..contractSchema.statics.cleanUpCrossContractValues)
        * [.statics.addPayeeNameToContracts(contracts)](#module_contract..contractSchema.statics.addPayeeNameToContracts)
        * [.methods.checkClientSet(Client, string, String, String)](#module_contract..contractSchema.methods.checkClientSet)
        * [.methods.checkClientChannel(Client, string)](#module_contract..contractSchema.methods.checkClientChannel)
        * [.methods.checkClientCostType(Client, string)](#module_contract..contractSchema.methods.checkClientCostType)
        * [.methods.checkValidationErrors()](#module_contract..contractSchema.methods.checkValidationErrors)
    * [~createCsv(array, headers, fileType, callback)](#module_contract..createCsv)
    * [~isObjectPopulated(obj)](#module_contract..isObjectPopulated) ⇒ <code>boolean</code>
    * [~processCategories(data, contract, client, index, overwriteBlanks, errors, callback)](#module_contract..processCategories)
    * [~processPayee(data, contract, client, index, overwriteBlanks, Payee, errors, callback)](#module_contract..processPayee)
    * [~processCompany(data, contract, client, index, overwriteBlanks, Company, errors, callback)](#module_contract..processCompany)
    * [~processContractTermGroups(contractTermMappings, clientId, callback)](#module_contract..processContractTermGroups)
    * [~processTerms(contract, client, tabData, tabName, fieldName, overwriteBlanks, contractTermMappings, contractTemplateType, errors, callback)](#module_contract..processTerms)
    * [~processCrossContracts(contract, otherMapData, overwriteBlanks, errors, callback)](#module_contract..processCrossContracts)
    * [~processAutoPaymentConditions(contract, otherMapData, overwriteBlanks, errors, callback)](#module_contract..processAutoPaymentConditions)
    * [~processReserves(contract, otherMapData, overwriteBlanks, callback)](#module_contract..processReserves)

<a name="module_contract..contractSchema"></a>

### contract~contractSchema
**Kind**: inner class of [<code>contract</code>](#module_contract)  

* [~contractSchema](#module_contract..contractSchema)
    * [new contractSchema()](#new_module_contract..contractSchema_new)
    * [.methods.userForbidden(user, readWrite)](#module_contract..contractSchema.methods.userForbidden) ⇒ <code>boolean</code>
    * [.methods.getAssociatedCatalogueItems(callback)](#module_contract..contractSchema.methods.getAssociatedCatalogueItems)
    * [.methods.getAssociatedCostsReleaseIds(callback)](#module_contract..contractSchema.methods.getAssociatedCostsReleaseIds)
    * [.methods.getAssociatedCostsTrackIds(callback)](#module_contract..contractSchema.methods.getAssociatedCostsTrackIds)
    * [.methods.getAssociatedCosts(callback)](#module_contract..contractSchema.methods.getAssociatedCosts)
    * [.methods.getAssociatedTransactions(date, callback)](#module_contract..contractSchema.methods.getAssociatedTransactions)
    * [.methods.getFutureTransactions(date, callback)](#module_contract..contractSchema.methods.getFutureTransactions)
    * [.methods.balanceAtDate(date, options, callback)](#module_contract..contractSchema.methods.balanceAtDate)
    * [.statics.importAliases(data, clientId, callback)](#module_contract..contractSchema.statics.importAliases)
    * [.statics.formatPopulatedRights(contract)](#module_contract..contractSchema.statics.formatPopulatedRights)
    * [.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)](#module_contract..contractSchema.statics.importFromExcel)
    * [.statics.importMechanicalFromExcel(file, curveUser, overwriteBlanks, callback)](#module_contract..contractSchema.statics.importMechanicalFromExcel)
    * [.statics.importPublisherFromExcel(file, curveUser, overwriteBlanks, callback)](#module_contract..contractSchema.statics.importPublisherFromExcel)
    * [.statics.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, callback)](#module_contract..contractSchema.statics.importContract)
    * [.statics.importContracts(contracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, callback)](#module_contract..contractSchema.statics.importContracts)
    * [.statics.sendExport(filter, contractType, clientType, curveUser)](#module_contract..contractSchema.statics.sendExport)
    * [.statics.multipleContractsForXlsx(contracts, clientId, callback)](#module_contract..contractSchema.statics.multipleContractsForXlsx)
    * [.statics.multipleMechanicalContractsForXlsx(contracts, clientId, callback)](#module_contract..contractSchema.statics.multipleMechanicalContractsForXlsx)
    * [.statics.multiplePublisherContractsForXlsx(contracts, clientId, callback)](#module_contract..contractSchema.statics.multiplePublisherContractsForXlsx)
    * [.methods.getCurrentBalance(callback)](#module_contract..contractSchema.methods.getCurrentBalance)
    * [.methods.exportData(type, dateFormat, callback)](#module_contract..contractSchema.methods.exportData)
    * [.statics.createCsvExport(data, type, clientType, callback)](#module_contract..contractSchema.statics.createCsvExport)
    * [.statics.mapCrossContractCondition(value)](#module_contract..contractSchema.statics.mapCrossContractCondition) ⇒ <code>string</code>
    * [.methods.matchContractToLabels(callback)](#module_contract..contractSchema.methods.matchContractToLabels)
    * [.methods.uniqueAliases()](#module_contract..contractSchema.methods.uniqueAliases)
    * [.methods.setPartitionNo()](#module_contract..contractSchema.methods.setPartitionNo)
    * [.statics.cleanUpNumber(numStre)](#module_contract..contractSchema.statics.cleanUpNumber) ⇒ <code>string</code>
    * [.statics.cleanUpNumbersInArray(terms, items)](#module_contract..contractSchema.statics.cleanUpNumbersInArray) ⇒ <code>Array.&lt;object&gt;</code>
    * [.statics.cleanUpNumbersInDicObj(obj)](#module_contract..contractSchema.statics.cleanUpNumbersInDicObj) ⇒ <code>object.&lt;object&gt;</code>
    * [.statics.cleanUpCrossContractValues(crossContracts)](#module_contract..contractSchema.statics.cleanUpCrossContractValues)
    * [.statics.addPayeeNameToContracts(contracts)](#module_contract..contractSchema.statics.addPayeeNameToContracts)
    * [.methods.checkClientSet(Client, string, String, String)](#module_contract..contractSchema.methods.checkClientSet)
    * [.methods.checkClientChannel(Client, string)](#module_contract..contractSchema.methods.checkClientChannel)
    * [.methods.checkClientCostType(Client, string)](#module_contract..contractSchema.methods.checkClientCostType)
    * [.methods.checkValidationErrors()](#module_contract..contractSchema.methods.checkValidationErrors)

<a name="new_module_contract..contractSchema_new"></a>

#### new contractSchema()
contract schema

<a name="module_contract..contractSchema.methods.userForbidden"></a>

#### contractSchema.methods.userForbidden(user, readWrite) ⇒ <code>boolean</code>
Checks if the supplied user is forbidden to access the contract data, either for reading or writing

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
**Returns**: <code>boolean</code> - Returns false if user is allowed access, true if not  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | The user object |
| readWrite | <code>string</code> | Supplied as either "read" or "write" to check for "read" or "write" access |

<a name="module_contract..contractSchema.methods.getAssociatedCatalogueItems"></a>

#### contractSchema.methods.getAssociatedCatalogueItems(callback)
Gets the Releases, Tracks and Works associated with the Contract.

Attaches the Releases to contract.releases

Attaches the Tracks to contract.tracks

Attaches the Works to contract.works

Calls callback() when done getting the associated catalogue.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.getAssociatedCostsReleaseIds"></a>

#### contractSchema.methods.getAssociatedCostsReleaseIds(callback)
Gets the Costs Release IDs associated with the Contract.

Calls callback(err, releases) with an [err] or message string if an error occurs and a [releases] array containing the associated Release IDs.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.getAssociatedCostsTrackIds"></a>

#### contractSchema.methods.getAssociatedCostsTrackIds(callback)
Gets the Costs Track IDs associated with the Contract.

Calls callback(err, tracks) with an [err] or message string if an error occurs and a [tracks] array containing the associated Track IDs.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.getAssociatedCosts"></a>

#### contractSchema.methods.getAssociatedCosts(callback)
Gets the Costs associated with the Contract.

Attaches the Costs to contract.costs

Calls callback() when done getting the associated costs.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.getAssociatedTransactions"></a>

#### contractSchema.methods.getAssociatedTransactions(date, callback)
Gets the Transactions associated with the Contract.

Attaches the Transactions to contract.transactions

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>date</code> | Date prior to which transactions should be returned. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.getFutureTransactions"></a>

#### contractSchema.methods.getFutureTransactions(date, callback)
Gets the future Transactions associated with the Contract.

Attaches the Transactions to contract.transactions

Calls callback(err) with an [err] or message string if an error occurs.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>date</code> | Date after which transactions should be returned. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.balanceAtDate"></a>

#### contractSchema.methods.balanceAtDate(date, options, callback)
Gets the Contract balance at a certain date.

Calls callback(err, balance) with an [err] or message string if an error occurs and the contract [balance].

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>date</code> | Date prior to which transactions should be included. |
| options | <code>object</code> | Options object to filter what transaction should be included. |
| options.excludeAdvance | <code>boolean</code> | Set to true if 'Advance' and 'Advance Recoupment' transactions are to be ignored. |
| options.excludeReserves | <code>boolean</code> | Set to true if 'isReserveWithholding' and 'isReserveRelease' transactions are to be ignored. |
| options.excludeStatementPayments | <code>string</code> | Transaction Statement ID to exlude. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.importAliases"></a>

#### contractSchema.statics.importAliases(data, clientId, callback)
Imports Aliases.

Calls callback(errors, count) with an array of [errors] if errors occur and the [count] of aliases successfully imported.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;object&gt;</code> | Data to import. |
| data.identifier | <code>string</code> | Contract name. |
| data.alias | <code>string</code> | Alias to add to the contract. |
| clientId | <code>string</code> | ID of the Client importing the Aliases. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.formatPopulatedRights"></a>

#### contractSchema.statics.formatPopulatedRights(contract)
Shifts the populated cross contractIds to a new field to keep the original contractId fields unmodified.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contract | <code>object</code> | The contract to update. |

<a name="module_contract..contractSchema.statics.importFromExcel"></a>

#### contractSchema.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)
Imports Standard Contracts from Excel.

Calls callback(err, result) with an [err] or message string if an error occurs and the generated notification [result].

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>object</code> | File to import. |
| curveUser | <code>curveUser</code> | User importing the contract. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.importMechanicalFromExcel"></a>

#### contractSchema.statics.importMechanicalFromExcel(file, curveUser, overwriteBlanks, callback)
Imports Mechanical Contracts from Excel.

Calls callback(err, result) with an [err] or message string if an error occurs and the generated notification [result].

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>object</code> | File to import. |
| curveUser | <code>curveUser</code> | User importing the contract. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.importPublisherFromExcel"></a>

#### contractSchema.statics.importPublisherFromExcel(file, curveUser, overwriteBlanks, callback)
Imports Publisher Contracts from Excel.

Calls callback(err, result) with an [err] or message string if an error occurs and the generated notification [result].

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>object</code> | File to import. |
| curveUser | <code>curveUser</code> | User importing the contract. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.importContract"></a>

#### contractSchema.statics.importContract(data, index, otherMapData, clientId, client, overwriteBlanks, contractTemplateType, callback)
Imports a single Contract from Excel.

Calls callback(err, contract, errors) with an [err] or message string if an error occurs, the imported [contract] and a list of import [errors].

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Contract to import. |
| index | <code>number</code> | Index of the line being imported. |
| otherMapData | <code>object</code> | Data import from other tabs. |
| otherMapData.sales | <code>Array.&lt;object&gt;</code> | Sales data. |
| otherMapData.deductions | <code>Array.&lt;object&gt;</code> | Deductions data. |
| otherMapData.mechanicals | <code>Array.&lt;object&gt;</code> | Mechanicals data. |
| otherMapData.withholdingTax | <code>Array.&lt;object&gt;</code> | WithholdingTax data. |
| otherMapData.costs | <code>Array.&lt;object&gt;</code> | Costs data. |
| otherMapData.reserves | <code>Array.&lt;object&gt;</code> | Reserves data. |
| otherMapData.crossContracts | <code>Array.&lt;object&gt;</code> | CrossContracts data. |
| clientId | <code>string</code> | ID of the client importing the contract. |
| client | <code>object</code> | Client importing the contract. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| contractTemplateType | <code>string</code> | Contract template type: 'Standard', 'Publisher' or 'Mechanical'. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.importContracts"></a>

#### contractSchema.statics.importContracts(contracts, otherMapData, clientId, overwriteBlanks, contractTemplateType, callback)
Imports multiple Contracts from Excel.

Calls callback(errors, count, importedContracts) with an array of [errors] if they occur, the count of contracts imported and an array of the [importedContracts].

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>Array.&lt;object&gt;</code> | Contracts to import. |
| otherMapData | <code>object</code> | Data import from other tabs. |
| otherMapData.sales | <code>Array.&lt;object&gt;</code> | Sales data. |
| otherMapData.deductions | <code>Array.&lt;object&gt;</code> | Deductions data. |
| otherMapData.mechanicals | <code>Array.&lt;object&gt;</code> | Mechanicals data. |
| otherMapData.withholdingTax | <code>Array.&lt;object&gt;</code> | WithholdingTax data. |
| otherMapData.costs | <code>Array.&lt;object&gt;</code> | Costs data. |
| otherMapData.reserves | <code>Array.&lt;object&gt;</code> | Reserves data. |
| otherMapData.crossContracts | <code>Array.&lt;object&gt;</code> | CrossContracts data. |
| clientId | <code>string</code> | ID of the client importing the contract. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| contractTemplateType | <code>string</code> | Contract template type: 'Standard', 'Publisher' or 'Mechanical'. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.sendExport"></a>

#### contractSchema.statics.sendExport(filter, contractType, clientType, curveUser)
Sends contracts export.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | Filter for Contract.find(). |
| contractType | <code>string</code> | Contract type. |
| clientType | <code>string</code> | Client type. |
| curveUser | <code>string</code> | User sending the export. |

<a name="module_contract..contractSchema.statics.multipleContractsForXlsx"></a>

#### contractSchema.statics.multipleContractsForXlsx(contracts, clientId, callback)
Exports Standard contracts.

Calls callback(err, data) with an [err] if an error occurs and the contracts export [data] for the excel template.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>Array.&lt;object&gt;</code> | Contracts to export. |
| clientId | <code>string</code> | ID of the client exporting the contracts. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.multipleMechanicalContractsForXlsx"></a>

#### contractSchema.statics.multipleMechanicalContractsForXlsx(contracts, clientId, callback)
Exports Mechanical contracts.

Calls callback(err, data) with an [err] if an error occurs and the contracts export [data] for the excel template.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>Array.&lt;object&gt;</code> | Contracts to export. |
| clientId | <code>string</code> | ID of the client exporting the contracts. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.multiplePublisherContractsForXlsx"></a>

#### contractSchema.statics.multiplePublisherContractsForXlsx(contracts, clientId, callback)
Exports Publisher contracts.

Calls callback(err, data) with an [err] if an error occurs and the contracts export [data] for the excel template.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>Array.&lt;object&gt;</code> | Contracts to export. |
| clientId | <code>string</code> | ID of the client exporting the contracts. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.getCurrentBalance"></a>

#### contractSchema.methods.getCurrentBalance(callback)
Get current contract balance at the time of export.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.exportData"></a>

#### contractSchema.methods.exportData(type, dateFormat, callback)
Exports contract data.

Calls callback(err, data) with an [err] if an error occurs and the contract export [data] for the excel template.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Export Type. |
| dateFormat | <code>string</code> | Export dates format. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.createCsvExport"></a>

#### contractSchema.statics.createCsvExport(data, type, clientType, callback)
Creates a CSV Export.

Calls callback(err, path) with an [err] if an error occurs and the csv export file [path].

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;object&gt;</code> | Data to export. |
| type | <code>string</code> | Export Type. |
| clientType | <code>string</code> | Client Type. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.statics.mapCrossContractCondition"></a>

#### contractSchema.statics.mapCrossContractCondition(value) ⇒ <code>string</code>
Maps contract values.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
**Returns**: <code>string</code> - Mapped value.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Value to map. |

<a name="module_contract..contractSchema.methods.matchContractToLabels"></a>

#### contractSchema.methods.matchContractToLabels(callback)
Matches a Contract to Labels.

Calls callback(err) with an [err] if an error occurs.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..contractSchema.methods.uniqueAliases"></a>

#### contractSchema.methods.uniqueAliases()
Sets a list of the contract's unique aliases.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
<a name="module_contract..contractSchema.methods.setPartitionNo"></a>

#### contractSchema.methods.setPartitionNo()
Sets contract's partition number.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
<a name="module_contract..contractSchema.statics.cleanUpNumber"></a>

#### contractSchema.statics.cleanUpNumber(numStre) ⇒ <code>string</code>
Cleans up a number.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
**Returns**: <code>string</code> - numStre - Cleaned up number  

| Param | Type | Description |
| --- | --- | --- |
| numStre | <code>string</code> | Number to clean up |

<a name="module_contract..contractSchema.statics.cleanUpNumbersInArray"></a>

#### contractSchema.statics.cleanUpNumbersInArray(terms, items) ⇒ <code>Array.&lt;object&gt;</code>
Cleans up numbers an array of terms.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
**Returns**: <code>Array.&lt;object&gt;</code> - terms - Cleaned up terms  

| Param | Type | Description |
| --- | --- | --- |
| terms | <code>Array.&lt;object&gt;</code> | List of terms to clean up |
| items | <code>Array.&lt;string&gt;</code> | List of terms items to clean up |

<a name="module_contract..contractSchema.statics.cleanUpNumbersInDicObj"></a>

#### contractSchema.statics.cleanUpNumbersInDicObj(obj) ⇒ <code>object.&lt;object&gt;</code>
Cleans up numbers an dictionary object of escalationTrackers.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
**Returns**: <code>object.&lt;object&gt;</code> - obj - Cleaned up escalation trackers  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object.&lt;object&gt;</code> | dictionary object of escalation trackers to cleanup |

<a name="module_contract..contractSchema.statics.cleanUpCrossContractValues"></a>

#### contractSchema.statics.cleanUpCrossContractValues(crossContracts)
Cleans up input values for cross contracts.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| crossContracts | <code>Array.&lt;object&gt;</code> | array of Cross Contract Objects for cleanup |

<a name="module_contract..contractSchema.statics.addPayeeNameToContracts"></a>

#### contractSchema.statics.addPayeeNameToContracts(contracts)
Add Payee name to populated contracts

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>Array.&lt;object&gt;</code> | List of contracts |

<a name="module_contract..contractSchema.methods.checkClientSet"></a>

#### contractSchema.methods.checkClientSet(Client, string, String, String)
Check custom client settings with the Contract.

checks that the item is defined in settings or Contract Term Groups

Calls callback() when done returning errors if any.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| Client | <code>client</code> | The client to check the settings against. |
| string | <code>item</code> | The dist channel to look for in settings client. |
| String | <code>contractItemArray</code> | The name of client settings Array to compare against. |
| String | <code>contractTermGroupType</code> | The string value of type. |

<a name="module_contract..contractSchema.methods.checkClientChannel"></a>

#### contractSchema.methods.checkClientChannel(Client, string)
Check custom client settings with the Contract.

checks that the dist channel is defined in settings or Contract Term Groups

Calls callback() when done returning errors if any.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| Client | <code>client</code> | The client to check the settings against. |
| string | <code>channel</code> | The dist channel to look for in settings client. |

<a name="module_contract..contractSchema.methods.checkClientCostType"></a>

#### contractSchema.methods.checkClientCostType(Client, string)
Check custom client settings with the Contract.

checks that the Cost Type is defined in settings or Contract Term Groups

Calls callback() when done returning errors if any.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  

| Param | Type | Description |
| --- | --- | --- |
| Client | <code>client</code> | The client to check the settings against. |
| string | <code>type</code> | The cost type to look for in settings client. |

<a name="module_contract..contractSchema.methods.checkValidationErrors"></a>

#### contractSchema.methods.checkValidationErrors()
Checks if a contract has any validation errors.

Returns only when done validating.

**Kind**: static method of [<code>contractSchema</code>](#module_contract..contractSchema)  
<a name="module_contract..createCsv"></a>

### contract~createCsv(array, headers, fileType, callback)
Creates a CSV file for export.

Calls callback(err, path) with an [err] if an error occurs and the csv file [path].

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| array | <code>Array.&lt;object&gt;</code> | Data to export. |
| headers | <code>string</code> | CSV file headers. |
| fileType | <code>string</code> | Contract export type. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..isObjectPopulated"></a>

### contract~isObjectPopulated(obj) ⇒ <code>boolean</code>
Checks that an object is not empty.

**Kind**: inner method of [<code>contract</code>](#module_contract)  
**Returns**: <code>boolean</code> - objectPopulated - Set to true if the object is empty  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> | Object to check |

<a name="module_contract..processCategories"></a>

### contract~processCategories(data, contract, client, index, overwriteBlanks, errors, callback)
Processes the contract categories before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Single contract data being imported. |
| contract | <code>object</code> | Contract object being imported. |
| client | <code>object</code> | Client importing the Contract. |
| index | <code>number</code> | Index of the contract being imported. |
| overwriteBlanks | <code>boolean</code> | Should blanks be overwritten. |
| errors | <code>Array.&lt;string&gt;</code> | Array errors should be pushed to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..processPayee"></a>

### contract~processPayee(data, contract, client, index, overwriteBlanks, Payee, errors, callback)
Processes the contract payees before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Single contract data being imported. |
| contract | <code>object</code> | Contract object being imported. |
| client | <code>object</code> | Client importing the Contract. |
| index | <code>number</code> | Index of the contract being imported. |
| overwriteBlanks | <code>boolean</code> | Should blanks be overwritten. |
| Payee | <code>object</code> | The Payee model instance. |
| errors | <code>Array.&lt;string&gt;</code> | Array errors should be pushed to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..processCompany"></a>

### contract~processCompany(data, contract, client, index, overwriteBlanks, Company, errors, callback)
Processes the contract companies before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | Single contract data being imported. |
| contract | <code>object</code> | Contract object being imported. |
| client | <code>object</code> | Client importing the Contract. |
| index | <code>number</code> | Index of the contract being imported. |
| overwriteBlanks | <code>boolean</code> | Should blanks be overwritten. |
| Company | <code>object</code> | The Company model instance. |
| errors | <code>Array.&lt;string&gt;</code> | Array errors should be pushed to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..processContractTermGroups"></a>

### contract~processContractTermGroups(contractTermMappings, clientId, callback)
Processes the contract term groups before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| contractTermMappings | <code>object</code> | Object mapped term groups should be assigned to. |
| clientId | <code>string</code> | ID of the client doing the import. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..processTerms"></a>

### contract~processTerms(contract, client, tabData, tabName, fieldName, overwriteBlanks, contractTermMappings, contractTemplateType, errors, callback)
Processes the contract terms before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| contract | <code>object</code> | Contract object being imported. |
| client | <code>object</code> | Client importing the Contract. |
| tabData | <code>object</code> | Tab data from the import file. |
| tabName | <code>string</code> | Tab name from the import file. |
| fieldName | <code>string</code> | Contract field that should be processed. |
| overwriteBlanks | <code>boolean</code> | Should blanks be overwritten. |
| contractTermMappings | <code>object</code> | Object of mapped term groups. |
| contractTemplateType | <code>string</code> | Contract import type. |
| errors | <code>Array.&lt;string&gt;</code> | Array errors should be pushed to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..processCrossContracts"></a>

### contract~processCrossContracts(contract, otherMapData, overwriteBlanks, errors, callback)
Processes the contract cross contracts before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| contract | <code>object</code> | Contract object being imported. |
| otherMapData | <code>object</code> | Import data from other tabs. |
| overwriteBlanks | <code>boolean</code> | Should blanks be overwritten. |
| errors | <code>Array.&lt;string&gt;</code> | Array errors should be pushed to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..processAutoPaymentConditions"></a>

### contract~processAutoPaymentConditions(contract, otherMapData, overwriteBlanks, errors, callback)
Processes the auto payment conditions before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| contract | <code>object</code> | Contract object being imported. |
| otherMapData | <code>object</code> | Import data from other tabs. |
| overwriteBlanks | <code>boolean</code> | Should blanks be overwritten. |
| errors | <code>Array.&lt;string&gt;</code> | Array errors should be pushed to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_contract..processReserves"></a>

### contract~processReserves(contract, otherMapData, overwriteBlanks, callback)
Processes the contract cross contracts before an import .

Calls callback() when done.

**Kind**: inner method of [<code>contract</code>](#module_contract)  

| Param | Type | Description |
| --- | --- | --- |
| contract | <code>object</code> | Contract object being imported. |
| otherMapData | <code>object</code> | Import data from other tabs. |
| overwriteBlanks | <code>boolean</code> | Should blanks be overwritten. |
| callback | <code>function</code> | The callback that handles the response. |

