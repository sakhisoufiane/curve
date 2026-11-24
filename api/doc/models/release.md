<a name="module_release"></a>

## release

* [release](#module_release)
    * [~rightsSchema](#module_release..rightsSchema)
        * [new rightsSchema()](#new_module_release..rightsSchema_new)
    * [~releaseSchema](#module_release..releaseSchema)
        * [new releaseSchema()](#new_module_release..releaseSchema_new)
        * [.methods.userForbidden(user, readWrite)](#module_release..releaseSchema.methods.userForbidden) ⇒ <code>boolean</code>
        * [.methods.containsContractIds(passedContractIds, callback)](#module_release..releaseSchema.methods.containsContractIds)
        * [.methods.contractIds(callback)](#module_release..releaseSchema.methods.contractIds)
        * [.methods.releaseContractValidation(callback)](#module_release..releaseSchema.methods.releaseContractValidation)
        * [.statics.sendExport(filter, curveUser, exportTemplateVersion)](#module_release..releaseSchema.statics.sendExport)
        * [.statics.createExportXlsx(filter, exportTemplateVersion, dateFormat, callback)](#module_release..releaseSchema.statics.createExportXlsx)
        * [.statics.createExportCsv(filter, count, dateFormat, callback)](#module_release..releaseSchema.statics.createExportCsv)
        * [.statics.createExportCsvV2(filter, count, dateFormat, callback)](#module_release..releaseSchema.statics.createExportCsvV2)
        * [.statics.multipleReleasesForXlsx(releases, dateFormat, callback)](#module_release..releaseSchema.statics.multipleReleasesForXlsx)
        * [.statics.multipleReleasesForXlsxV2(releases, dateFormat, callback)](#module_release..releaseSchema.statics.multipleReleasesForXlsxV2)
        * [.methods.exportData(aliases, salesReturnRights, costsRights, trackIds, dateFormat)](#module_release..releaseSchema.methods.exportData) ⇒ <code>array</code>
        * [.methods.exportReleaseRow(dateFormat)](#module_release..releaseSchema.methods.exportReleaseRow) ⇒ <code>array</code>
        * [.methods.exportContractRow(contract, contractPercentage)](#module_release..releaseSchema.methods.exportContractRow) ⇒ <code>array</code>
        * [.methods.exportTrackRow(track)](#module_release..releaseSchema.methods.exportTrackRow) ⇒ <code>array</code>
        * [.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importFromExcel)
        * [.statics.importReleases(releases, mechanicals, releaseSpecificRights, clientId, client, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importReleases)
        * [.statics.importRelease(data, mechanicals, releaseSpecificRights, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importRelease)
        * [.statics.importFromExcelNew(file, curveUser, overwriteBlanks, importTemplateVersion, callback)](#module_release..releaseSchema.statics.importFromExcelNew)
        * [.statics.importReleasesNew(importData, clientId, client, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importReleasesNew)
        * [.statics.importReleaseNew(data, importData, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importReleaseNew)
        * [.statics.importAliases(data, clientId, callback)](#module_release..releaseSchema.statics.importAliases)
        * [.methods.addMechanicals(mechanicals, overwriteBlanks, callback)](#module_release..releaseSchema.methods.addMechanicals)
        * [.methods.addTracks(tracks, clientId, overwriteBlanks, callback)](#module_release..releaseSchema.methods.addTracks)
        * [.methods.addContracts(contracts, overwriteBlanks, callback)](#module_release..releaseSchema.methods.addContracts)
        * [.methods.mapRights(contractName, percentage, field, callback)](#module_release..releaseSchema.methods.mapRights)
        * [.methods.updateCopyToCatalogueClients(callback)](#module_release..releaseSchema.methods.updateCopyToCatalogueClients)
        * [.methods.updateCopyToCatalogueByClient(client, callback)](#module_release..releaseSchema.methods.updateCopyToCatalogueByClient)
        * [.methods.copyValues(releaseToCopy, clientId, callback)](#module_release..releaseSchema.methods.copyValues)
        * [.methods.uniqueAliases()](#module_release..releaseSchema.methods.uniqueAliases) ⇒ <code>array</code>
        * [.methods.uniqueCatGroups()](#module_release..releaseSchema.methods.uniqueCatGroups) ⇒ <code>array</code>
        * [.methods.uniqueTrackIds()](#module_release..releaseSchema.methods.uniqueTrackIds) ⇒ <code>array</code>
        * [.methods.calculateTotalParticipation()](#module_release..releaseSchema.methods.calculateTotalParticipation)
        * [.methods.sanitizeSpecificDealerPrice()](#module_release..releaseSchema.methods.sanitizeSpecificDealerPrice)
        * [.methods.checkMultipleContracts(callback)](#module_release..releaseSchema.methods.checkMultipleContracts)
        * [.methods.calculateMechanicalRate()](#module_release..releaseSchema.methods.calculateMechanicalRate)
        * [.methods.setMechanicalIds()](#module_release..releaseSchema.methods.setMechanicalIds)
        * [.methods.setMechanicalBreakdown()](#module_release..releaseSchema.methods.setMechanicalBreakdown)
        * [.methods.checkValidationErrors()](#module_release..releaseSchema.methods.checkValidationErrors)
        * [.methods.getTracks(callback)](#module_release..releaseSchema.methods.getTracks)
        * [.statics.proRataContractsFromTracks(filter, curveUser, callback)](#module_release..releaseSchema.statics.proRataContractsFromTracks)
        * [.statics.inheritMechanicalsFromTracks(filter, curveUser, callback)](#module_release..releaseSchema.statics.inheritMechanicalsFromTracks)
        * [.methods.proRataTrackContracts(callback)](#module_release..releaseSchema.methods.proRataTrackContracts)
        * [.methods.proRataTrackCostContracts(callback)](#module_release..releaseSchema.methods.proRataTrackCostContracts)
        * [.methods.inheritTrackMechanicals(callback)](#module_release..releaseSchema.methods.inheritTrackMechanicals)
        * [.statics.formatPopulatedRights(release)](#module_release..releaseSchema.statics.formatPopulatedRights)
        * [.methods.populateMechanicalLicenses(callback)](#module_release..releaseSchema.methods.populateMechanicalLicenses)
    * [~errorMessages(err, callback)](#module_release..errorMessages)
    * [~mergeSalesLines(convertedReleases, callback)](#module_release..mergeSalesLines)
    * [~mergeContractLines(contracts)](#module_release..mergeContractLines) ⇒ <code>Array.&lt;object&gt;</code>
    * [~errorMessages(err, callback)](#module_release..errorMessages)

<a name="module_release..rightsSchema"></a>

### release~rightsSchema
**Kind**: inner class of [<code>release</code>](#module_release)  
<a name="new_module_release..rightsSchema_new"></a>

#### new rightsSchema()
Rights schema

<a name="module_release..releaseSchema"></a>

### release~releaseSchema
**Kind**: inner class of [<code>release</code>](#module_release)  

* [~releaseSchema](#module_release..releaseSchema)
    * [new releaseSchema()](#new_module_release..releaseSchema_new)
    * [.methods.userForbidden(user, readWrite)](#module_release..releaseSchema.methods.userForbidden) ⇒ <code>boolean</code>
    * [.methods.containsContractIds(passedContractIds, callback)](#module_release..releaseSchema.methods.containsContractIds)
    * [.methods.contractIds(callback)](#module_release..releaseSchema.methods.contractIds)
    * [.methods.releaseContractValidation(callback)](#module_release..releaseSchema.methods.releaseContractValidation)
    * [.statics.sendExport(filter, curveUser, exportTemplateVersion)](#module_release..releaseSchema.statics.sendExport)
    * [.statics.createExportXlsx(filter, exportTemplateVersion, dateFormat, callback)](#module_release..releaseSchema.statics.createExportXlsx)
    * [.statics.createExportCsv(filter, count, dateFormat, callback)](#module_release..releaseSchema.statics.createExportCsv)
    * [.statics.createExportCsvV2(filter, count, dateFormat, callback)](#module_release..releaseSchema.statics.createExportCsvV2)
    * [.statics.multipleReleasesForXlsx(releases, dateFormat, callback)](#module_release..releaseSchema.statics.multipleReleasesForXlsx)
    * [.statics.multipleReleasesForXlsxV2(releases, dateFormat, callback)](#module_release..releaseSchema.statics.multipleReleasesForXlsxV2)
    * [.methods.exportData(aliases, salesReturnRights, costsRights, trackIds, dateFormat)](#module_release..releaseSchema.methods.exportData) ⇒ <code>array</code>
    * [.methods.exportReleaseRow(dateFormat)](#module_release..releaseSchema.methods.exportReleaseRow) ⇒ <code>array</code>
    * [.methods.exportContractRow(contract, contractPercentage)](#module_release..releaseSchema.methods.exportContractRow) ⇒ <code>array</code>
    * [.methods.exportTrackRow(track)](#module_release..releaseSchema.methods.exportTrackRow) ⇒ <code>array</code>
    * [.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importFromExcel)
    * [.statics.importReleases(releases, mechanicals, releaseSpecificRights, clientId, client, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importReleases)
    * [.statics.importRelease(data, mechanicals, releaseSpecificRights, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importRelease)
    * [.statics.importFromExcelNew(file, curveUser, overwriteBlanks, importTemplateVersion, callback)](#module_release..releaseSchema.statics.importFromExcelNew)
    * [.statics.importReleasesNew(importData, clientId, client, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importReleasesNew)
    * [.statics.importReleaseNew(data, importData, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback)](#module_release..releaseSchema.statics.importReleaseNew)
    * [.statics.importAliases(data, clientId, callback)](#module_release..releaseSchema.statics.importAliases)
    * [.methods.addMechanicals(mechanicals, overwriteBlanks, callback)](#module_release..releaseSchema.methods.addMechanicals)
    * [.methods.addTracks(tracks, clientId, overwriteBlanks, callback)](#module_release..releaseSchema.methods.addTracks)
    * [.methods.addContracts(contracts, overwriteBlanks, callback)](#module_release..releaseSchema.methods.addContracts)
    * [.methods.mapRights(contractName, percentage, field, callback)](#module_release..releaseSchema.methods.mapRights)
    * [.methods.updateCopyToCatalogueClients(callback)](#module_release..releaseSchema.methods.updateCopyToCatalogueClients)
    * [.methods.updateCopyToCatalogueByClient(client, callback)](#module_release..releaseSchema.methods.updateCopyToCatalogueByClient)
    * [.methods.copyValues(releaseToCopy, clientId, callback)](#module_release..releaseSchema.methods.copyValues)
    * [.methods.uniqueAliases()](#module_release..releaseSchema.methods.uniqueAliases) ⇒ <code>array</code>
    * [.methods.uniqueCatGroups()](#module_release..releaseSchema.methods.uniqueCatGroups) ⇒ <code>array</code>
    * [.methods.uniqueTrackIds()](#module_release..releaseSchema.methods.uniqueTrackIds) ⇒ <code>array</code>
    * [.methods.calculateTotalParticipation()](#module_release..releaseSchema.methods.calculateTotalParticipation)
    * [.methods.sanitizeSpecificDealerPrice()](#module_release..releaseSchema.methods.sanitizeSpecificDealerPrice)
    * [.methods.checkMultipleContracts(callback)](#module_release..releaseSchema.methods.checkMultipleContracts)
    * [.methods.calculateMechanicalRate()](#module_release..releaseSchema.methods.calculateMechanicalRate)
    * [.methods.setMechanicalIds()](#module_release..releaseSchema.methods.setMechanicalIds)
    * [.methods.setMechanicalBreakdown()](#module_release..releaseSchema.methods.setMechanicalBreakdown)
    * [.methods.checkValidationErrors()](#module_release..releaseSchema.methods.checkValidationErrors)
    * [.methods.getTracks(callback)](#module_release..releaseSchema.methods.getTracks)
    * [.statics.proRataContractsFromTracks(filter, curveUser, callback)](#module_release..releaseSchema.statics.proRataContractsFromTracks)
    * [.statics.inheritMechanicalsFromTracks(filter, curveUser, callback)](#module_release..releaseSchema.statics.inheritMechanicalsFromTracks)
    * [.methods.proRataTrackContracts(callback)](#module_release..releaseSchema.methods.proRataTrackContracts)
    * [.methods.proRataTrackCostContracts(callback)](#module_release..releaseSchema.methods.proRataTrackCostContracts)
    * [.methods.inheritTrackMechanicals(callback)](#module_release..releaseSchema.methods.inheritTrackMechanicals)
    * [.statics.formatPopulatedRights(release)](#module_release..releaseSchema.statics.formatPopulatedRights)
    * [.methods.populateMechanicalLicenses(callback)](#module_release..releaseSchema.methods.populateMechanicalLicenses)

<a name="new_module_release..releaseSchema_new"></a>

#### new releaseSchema()
Release schema

<a name="module_release..releaseSchema.methods.userForbidden"></a>

#### releaseSchema.methods.userForbidden(user, readWrite) ⇒ <code>boolean</code>
Checks if the supplied user is forbidden from accessing the Release data

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>boolean</code> - Returns false if user is allowed access, true if not  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | The user object |
| readWrite | <code>string</code> | Supplied as either "read" or "write" to check for "read" or "write" access |

<a name="module_release..releaseSchema.methods.containsContractIds"></a>

#### releaseSchema.methods.containsContractIds(passedContractIds, callback)
Check if one of the passed contract IDs is associated with the Release.

Calls callback(containsId) with [containsId] set to true if one of the passedcontract IDs is associated with the Release.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| passedContractIds | <code>string</code> | Contract IDs to check against. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.contractIds"></a>

#### releaseSchema.methods.contractIds(callback)
Returns an array of contract IDs associated with the Release.

Calls callback(array) with an [array] of contract IDs associated with the Release.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.releaseContractValidation"></a>

#### releaseSchema.methods.releaseContractValidation(callback)
Validates the contracts associated to the Release.

Sets release.contractValidation to "No Contracts" if no contracts are associated to the Release

Sets release.contractValidation to "Territories Missing" if the contract's territories are missing

Sets release.contractValidation to "" othewrwise

Calls callback() after checking the contracts.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.sendExport"></a>

#### releaseSchema.statics.sendExport(filter, curveUser, exportTemplateVersion)
Sends an export of the Release data by email.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | The Release filter object. |
| curveUser | <code>object</code> | The User sending the export. |
| exportTemplateVersion | <code>object</code> | The export template version. |

<a name="module_release..releaseSchema.statics.createExportXlsx"></a>

#### releaseSchema.statics.createExportXlsx(filter, exportTemplateVersion, dateFormat, callback)
Exports the Release data to an Excel file.

Calls callback(err, output) with an [err] if an error occurs and the [output] path of the excel file.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | The Release filter object. |
| exportTemplateVersion | <code>string</code> | The export template version. |
| dateFormat | <code>string</code> | The date format when writing to the excel file. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.createExportCsv"></a>

#### releaseSchema.statics.createExportCsv(filter, count, dateFormat, callback)
Exports the Release data to a CSV file.

Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | The Release filter object. |
| count | <code>number</code> | The number of Releases to process per round. |
| dateFormat | <code>string</code> | The date format when writing to the csv file. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.createExportCsvV2"></a>

#### releaseSchema.statics.createExportCsvV2(filter, count, dateFormat, callback)
Exports the Release data to a CSV file (V2).

Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | The Release filter object. |
| count | <code>number</code> | The number of Releases to process per round. |
| dateFormat | <code>string</code> | The date format when writing to the csv file. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.multipleReleasesForXlsx"></a>

#### releaseSchema.statics.multipleReleasesForXlsx(releases, dateFormat, callback)
Formats mulitple Releases for the Excel export.

Calls callback(err, data) with an [err] if an error occurs and the release [data].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| releases | <code>Array.&lt;object&gt;</code> | The Releases to format. |
| dateFormat | <code>string</code> | The date format for the excel file. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.multipleReleasesForXlsxV2"></a>

#### releaseSchema.statics.multipleReleasesForXlsxV2(releases, dateFormat, callback)
Formats mulitple Releases for the Excel export (V2).

Calls callback(err, data) with an [err] if an error occurs and the release [data].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| releases | <code>Array.&lt;object&gt;</code> | The Releases to format. |
| dateFormat | <code>string</code> | The date format for the excel file. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.exportData"></a>

#### releaseSchema.methods.exportData(aliases, salesReturnRights, costsRights, trackIds, dateFormat) ⇒ <code>array</code>
Returns an array of the Release data to export.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>array</code> - result - The export data  

| Param | Type | Description |
| --- | --- | --- |
| aliases | <code>Array.&lt;string&gt;</code> | Array of Release aliases. |
| salesReturnRights | <code>Array.&lt;object&gt;</code> | An array of sales returns rights. |
| costsRights | <code>Array.&lt;object&gt;</code> | An array of costs rights. |
| trackIds | <code>Array.&lt;string&gt;</code> | An array of track IDs. |
| dateFormat | <code>string</code> | The date format for the export. |

<a name="module_release..releaseSchema.methods.exportReleaseRow"></a>

#### releaseSchema.methods.exportReleaseRow(dateFormat) ⇒ <code>array</code>
Returns an array of the Release data to export.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>array</code> - result - The export data  

| Param | Type | Description |
| --- | --- | --- |
| dateFormat | <code>string</code> | The date format for the export. |

<a name="module_release..releaseSchema.methods.exportContractRow"></a>

#### releaseSchema.methods.exportContractRow(contract, contractPercentage) ⇒ <code>array</code>
Returns an array of the Contract data to export.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>array</code> - result - The export data  

| Param | Type | Description |
| --- | --- | --- |
| contract | <code>object</code> | The Contract to export. |
| contractPercentage | <code>number</code> | The Contract sales/costs return percentage. |

<a name="module_release..releaseSchema.methods.exportTrackRow"></a>

#### releaseSchema.methods.exportTrackRow(track) ⇒ <code>array</code>
Returns an array of the Track data to export.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>array</code> - result - The export data  

| Param | Type | Description |
| --- | --- | --- |
| track | <code>object</code> | The Track to export. |

<a name="module_release..releaseSchema.statics.importFromExcel"></a>

#### releaseSchema.statics.importFromExcel(file, curveUser, overwriteBlanks, callback)
Imports Releases from Excel Combined Template.

Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>object</code> | File to import. |
| curveUser | <code>object</code> | User importing the Release. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.importReleases"></a>

#### releaseSchema.statics.importReleases(releases, mechanicals, releaseSpecificRights, clientId, client, overwriteBlanks, callback)
Imports an array of Releases.

Calls callback(errors, count, importedReleases, importedTracks, defaultReleaseTracks) with an array of [errors] if they occur, the [count] of Releases imported, an object containing the [importedReleases], an object containing the [importedTracks] and an object containing the [defaultReleaseTracks].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| releases | <code>Array.&lt;object&gt;</code> | Releases to import. |
| mechanicals | <code>object</code> | An object of Mechanicals. |
| releaseSpecificRights | <code>object</code> | An object of track releaseSpecificRights. |
| clientId | <code>string</code> | ID of the client importing the Releases. |
| client | <code>object</code> | Client importing the Releases. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.importRelease"></a>

#### releaseSchema.statics.importRelease(data, mechanicals, releaseSpecificRights, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback)
Imports a single Release.

Calls callback(error, importedRelease, tracksErrors, importedTrack) with an [error] if an errror occurs, the [importedRelease] object, an array of [tracksErrors] if they occur and the [importedTrack].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | The Release to import. |
| mechanicals | <code>object</code> | An object of Mechanicals. |
| releaseSpecificRights | <code>object</code> | An object of track releaseSpecificRights. |
| clientId | <code>string</code> | ID of the client importing the Releases. |
| client | <code>object</code> | Client importing the Releases. |
| importedReleases | <code>object</code> | An object of imported Releases. |
| importedTracks | <code>object</code> | An object of imported Tracks. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.importFromExcelNew"></a>

#### releaseSchema.statics.importFromExcelNew(file, curveUser, overwriteBlanks, importTemplateVersion, callback)
Imports Releases from Excel Separated Template (v2).

Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>object</code> | File to import. |
| curveUser | <code>object</code> | User importing the Release. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| importTemplateVersion | <code>string</code> | The import template version. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.importReleasesNew"></a>

#### releaseSchema.statics.importReleasesNew(importData, clientId, client, overwriteBlanks, callback)
Imports an array of Releases (New Version).

Calls callback(errors, count, importedReleases, importedTracks) with an array of [errors] if they occur, the [count] of Releases imported, an object containing the [importedReleases] and an object containing the [importedTracks].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| importData | <code>object</code> | Import data object. |
| importData.releases | <code>Array.&lt;object&gt;</code> | Releases to import. |
| importData.tracks | <code>Array.&lt;object&gt;</code> | Tracks data. |
| importData.contracts | <code>Array.&lt;object&gt;</code> | Contracts data. |
| importData.mechanicals | <code>Array.&lt;object&gt;</code> | Mechanicals data. |
| clientId | <code>string</code> | ID of the client importing the Releases. |
| client | <code>object</code> | Client importing the Releases. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.importReleaseNew"></a>

#### releaseSchema.statics.importReleaseNew(data, importData, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback)
Imports a single Release (New Version).

Calls callback(error, importedRelease, tracksErrors, importedTracks) with an [error] if an errror occurs, the [importedRelease] object, an array of [tracksErrors] if they occur and the [newImportedTracks].

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | The Release to import. |
| importData | <code>object</code> | Import data object. |
| importData.releases | <code>Array.&lt;object&gt;</code> | Releases to import. |
| importData.tracks | <code>Array.&lt;object&gt;</code> | Tracks data. |
| importData.contracts | <code>Array.&lt;object&gt;</code> | Contracts data. |
| importData.mechanicals | <code>Array.&lt;object&gt;</code> | Mechanicals data. |
| clientId | <code>string</code> | ID of the client importing the Releases. |
| client | <code>object</code> | Client importing the Releases. |
| importedReleases | <code>object</code> | An object of imported Releases. |
| importedTracks | <code>object</code> | An object of imported Tracks. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.importAliases"></a>

#### releaseSchema.statics.importAliases(data, clientId, callback)
Adds aliases to a Release.

Calls callback(errors, count) with an array of [errors] if any occur and the [count] of aliases added.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;object&gt;</code> | An array of  aliases to import. |
| clientId | <code>string</code> | ID of the client importing the aliases. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.addMechanicals"></a>

#### releaseSchema.methods.addMechanicals(mechanicals, overwriteBlanks, callback)
Adds mechanicals to a Release.

Calls callback(error) with an [error] if any error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| mechanicals | <code>Array.&lt;object&gt;</code> | An array of  mechanicals to import. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.addTracks"></a>

#### releaseSchema.methods.addTracks(tracks, clientId, overwriteBlanks, callback)
Adds tracks to a Release.

Calls callback(importedReleaseTracks, trackErrors) with an array of [importedReleaseTracks] and an array of [trackErrors] if any occur.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| tracks | <code>object</code> | An array of  tracks to import. |
| clientId | <code>string</code> | ID of the client importing the tracks. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.addContracts"></a>

#### releaseSchema.methods.addContracts(contracts, overwriteBlanks, callback)
Adds contracts to a Release.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>object</code> | An array of  contracts to import. |
| overwriteBlanks | <code>boolean</code> | Set to true to overwrite blank values. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.mapRights"></a>

#### releaseSchema.methods.mapRights(contractName, percentage, field, callback)
Maps contract fields to a Release.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| contractName | <code>string</code> | The contract name. |
| percentage | <code>number</code> | Rights percentage value. |
| field | <code>string</code> | Field to map to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.updateCopyToCatalogueClients"></a>

#### releaseSchema.methods.updateCopyToCatalogueClients(callback)
Copies catalogue data to other associated clients.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.updateCopyToCatalogueByClient"></a>

#### releaseSchema.methods.updateCopyToCatalogueByClient(client, callback)
Copies catalogue data to a single client.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>object</code> | The client to copy data to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.copyValues"></a>

#### releaseSchema.methods.copyValues(releaseToCopy, clientId, callback)
Copies a single Release to a client.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| releaseToCopy | <code>object</code> | The ID of the client to copy data to. |
| clientId | <code>string</code> | The ID of the client to copy data to. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.uniqueAliases"></a>

#### releaseSchema.methods.uniqueAliases() ⇒ <code>array</code>
Returns a list of unique aliases.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>array</code> - aliases - An array of the Release's unique aliases.  
<a name="module_release..releaseSchema.methods.uniqueCatGroups"></a>

#### releaseSchema.methods.uniqueCatGroups() ⇒ <code>array</code>
Returns a list of unique catalogue groups.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>array</code> - catalogueGroups - An array of the Release's unique catalogue groups.  
<a name="module_release..releaseSchema.methods.uniqueTrackIds"></a>

#### releaseSchema.methods.uniqueTrackIds() ⇒ <code>array</code>
Returns a list of unique track IDs.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
**Returns**: <code>array</code> - trackIds - An array of the Release's track IDs.  
<a name="module_release..releaseSchema.methods.calculateTotalParticipation"></a>

#### releaseSchema.methods.calculateTotalParticipation()
Sums all salesReturnsRights and adds them to release.totalParticipation

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
<a name="module_release..releaseSchema.methods.sanitizeSpecificDealerPrice"></a>

#### releaseSchema.methods.sanitizeSpecificDealerPrice()
Converts all dealer prices within Specific Dealer Prices Array (priceCategoryDealerPrices) to numbers

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
<a name="module_release..releaseSchema.methods.checkMultipleContracts"></a>

#### releaseSchema.methods.checkMultipleContracts(callback)
Checks if a release has more than one instance of the same contract attached to it.

Calls callback(error) with an [error] if multiple instances of the same contract are attached to the release.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.calculateMechanicalRate"></a>

#### releaseSchema.methods.calculateMechanicalRate()
Calculates the Release's mechanical rate.

Sets the calculated mechanical rate to release.mechanicalBasisPercentage

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
<a name="module_release..releaseSchema.methods.setMechanicalIds"></a>

#### releaseSchema.methods.setMechanicalIds()
Returns the IDs of the mechanical contracts associated to the Release.

Sets the mechanical contract IDs to release.mechanicalContractIds
Sets the mechanical composer IDs to release.mechanicalComposerIds
Sets the mechanical publisher IDs to release.mechanicalPublisherIds

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
<a name="module_release..releaseSchema.methods.setMechanicalBreakdown"></a>

#### releaseSchema.methods.setMechanicalBreakdown()
Returns a breakdown of the mechanical contracts associated to the Release.

Sets the result of this breakdown to release.mechanicalBreakdown

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
<a name="module_release..releaseSchema.methods.checkValidationErrors"></a>

#### releaseSchema.methods.checkValidationErrors()
Validates the Release and reports any errors via 'validationErrors'.

Sets the state of the model via 'valid'

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  
<a name="module_release..releaseSchema.methods.getTracks"></a>

#### releaseSchema.methods.getTracks(callback)
Returns a list of Tracks associted to the Release .

Calls callback(error, output) with an [error] if an error occurs and the [ouput] array containing the Tracks.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.proRataContractsFromTracks"></a>

#### releaseSchema.statics.proRataContractsFromTracks(filter, curveUser, callback)
Calls methods to Pro Rata sales and costs from Tracks for each Release.

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | filter for the Releases to process. |
| curveUser | <code>object</code> | User importing the Release. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.inheritMechanicalsFromTracks"></a>

#### releaseSchema.statics.inheritMechanicalsFromTracks(filter, curveUser, callback)
Calls method to inherit Mechanicals from Tracks for each Release

Calls callback(error) with an [error] if an error occurs.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>object</code> | filter for the Releases to process. |
| curveUser | <code>object</code> | User importing the Release. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.proRataTrackContracts"></a>

#### releaseSchema.methods.proRataTrackContracts(callback)
Returns Pro Rata sales from Tracks for a single Release.

Calls callback(error, output) with an [error] if an error occurs and the [output] containing pro rata sales results.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.proRataTrackCostContracts"></a>

#### releaseSchema.methods.proRataTrackCostContracts(callback)
Returns Pro Rata costs from Tracks for a single Release.

Calls callback(error, output) with an [error] if an error occurs and the [output] containing pro rata costs results.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.methods.inheritTrackMechanicals"></a>

#### releaseSchema.methods.inheritTrackMechanicals(callback)
Inherits Mechanicals from Tracks for a single Release

Calls callback(error) with an [error] if an error occurs and the updated [release] object.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..releaseSchema.statics.formatPopulatedRights"></a>

#### releaseSchema.statics.formatPopulatedRights(release)
Shifts the populated contractIds to a new field to keep the original contractId field unmodified.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| release | <code>object</code> | The release to update. |

<a name="module_release..releaseSchema.methods.populateMechanicalLicenses"></a>

#### releaseSchema.methods.populateMechanicalLicenses(callback)
Populates the Composers, Publishers and Contracts on mechanical licenses.

**Kind**: static method of [<code>releaseSchema</code>](#module_release..releaseSchema)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..errorMessages"></a>

### release~errorMessages(err, callback)
Formats an error message to a human readable format.

Calls callback(null, newMessages) with the formatted error [newMessages].

**Kind**: inner method of [<code>release</code>](#module_release)  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>object</code> | The error to format. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..mergeSalesLines"></a>

### release~mergeSalesLines(convertedReleases, callback)
Merges sales lines for each of the converted Reelases.

Calls callback(err, mergedSalesLines) with an [err] if an error occurs and the [mergedSalesLines].

**Kind**: inner method of [<code>release</code>](#module_release)  

| Param | Type | Description |
| --- | --- | --- |
| convertedReleases | <code>Array.&lt;object&gt;</code> | The converted Releases to merge. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_release..mergeContractLines"></a>

### release~mergeContractLines(contracts) ⇒ <code>Array.&lt;object&gt;</code>
Merges duplicate contract lines.

**Kind**: inner method of [<code>release</code>](#module_release)  
**Returns**: <code>Array.&lt;object&gt;</code> - mergedContractLines - The merged contract lines.  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>Array.&lt;object&gt;</code> | The Contract lines to merge. |

<a name="module_release..errorMessages"></a>

### release~errorMessages(err, callback)
Formats an error message to a human readable format.

Calls callback(null, newMessages) with the formatted error [newMessages].

**Kind**: inner method of [<code>release</code>](#module_release)  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>object</code> | The error to format. |
| callback | <code>function</code> | The callback that handles the response. |

