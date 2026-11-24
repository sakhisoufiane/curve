<a name="module_ingestSalesFile"></a>

## ingestSalesFile

* [ingestSalesFile](#module_ingestSalesFile)
    * [~ingestSalesFile](#module_ingestSalesFile..ingestSalesFile)
        * [.matchToTemplate(localFile, salesFile, callback)](#module_ingestSalesFile..ingestSalesFile.matchToTemplate)
        * [.createAdditionalSalesFile(salesFile, match, matches, originalSalesFileName, tabNames, callback)](#module_ingestSalesFile..ingestSalesFile.createAdditionalSalesFile)
        * [.addTemplateInfoToSalesFile(salesTemplateId, salesFile, callback)](#module_ingestSalesFile..ingestSalesFile.addTemplateInfoToSalesFile)
        * [.combineSalesFileNameAndSuffix(match, matches, salesFileName, tabNames)](#module_ingestSalesFile..ingestSalesFile.combineSalesFileNameAndSuffix)
        * [.ingestionProcessData(salesFile, callback)](#module_ingestSalesFile..ingestSalesFile.ingestionProcessData)
        * [.processFile(bigQuery, file, event, callback)](#module_ingestSalesFile..ingestSalesFile.processFile)
        * [.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, callback)](#module_ingestSalesFile..ingestSalesFile.extractData)
        * [.extractOverwriteFieldTargetCells(data, overwriteFieldTargetCells)](#module_ingestSalesFile..ingestSalesFile.extractOverwriteFieldTargetCells) ⇒ <code>Array.&lt;object&gt;</code>
        * [.getColAndRowFromCellReference(cellRef)](#module_ingestSalesFile..ingestSalesFile.getColAndRowFromCellReference) ⇒ <code>object</code>
        * [.getColNumber(colString)](#module_ingestSalesFile..ingestSalesFile.getColNumber) ⇒ <code>number</code>
        * [.replaceOverwriteValuesAndProRataAmount(event, extractedOverwriteFields, callback)](#module_ingestSalesFile..ingestSalesFile.replaceOverwriteValuesAndProRataAmount)
        * [.processAppleFinancialFile(customAdditionalFile, salesFileId, exchangeRates, callback)](#module_ingestSalesFile..ingestSalesFile.processAppleFinancialFile)
        * [.processItunesMatchFile(event, file, chunked, iTunesExchangeRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback)](#module_ingestSalesFile..ingestSalesFile.processItunesMatchFile)
        * [.processFacebookFinancialFile(customAdditionalFile, salesFileId, callback)](#module_ingestSalesFile..ingestSalesFile.processFacebookFinancialFile)
        * [.setPerUnitRate(event, chunked, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback)](#module_ingestSalesFile..ingestSalesFile.setPerUnitRate)
        * [.processDataChunks(chunked, nextChunkStart, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, customAdditionalFileMissing, bigQuery, file, totalLines, requiredExchangeRates, identification, callback)](#module_ingestSalesFile..ingestSalesFile.processDataChunks)
        * [.processNextChunk(event, chunk, idx, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, validationData, customAdditionalFileMissing, bigQuery, callback)](#module_ingestSalesFile..ingestSalesFile.processNextChunk)
        * [.removeOldSales(bigQuery, salesFileId, partitionNo, callback)](#module_ingestSalesFile..ingestSalesFile.removeOldSales)
        * [.chunk(arr, len)](#module_ingestSalesFile..ingestSalesFile.chunk) ⇒ <code>array</code>
        * [.combineArray(a, b)](#module_ingestSalesFile..ingestSalesFile.combineArray) ⇒ <code>array</code>
        * [.combineObjectArray(a, b)](#module_ingestSalesFile..ingestSalesFile.combineObjectArray) ⇒ <code>Array.&lt;object&gt;</code>
        * [.extractResults(data, startingLine, startingColumn)](#module_ingestSalesFile..ingestSalesFile.extractResults) ⇒ <code>Array.&lt;array&gt;</code>
        * [.createIngestTask(salesFile, priority, callback)](#module_ingestSalesFile..ingestSalesFile.createIngestTask)

<a name="module_ingestSalesFile..ingestSalesFile"></a>

### ingestSalesFile~ingestSalesFile
The beginning of the ingestion process, this method handles the following

* file download from S3
* automatic matching to a Sales Template if one is not attached to the Sales File
* delete previous sales data for the Sales File
* then calls the main ingestion process function
* Calls `callback(err, validationData, identification)` with `validationData` containing the validation data & `identification` containing the identification extracted from the file
* Calls `callback(err, validationData, identification)` with an `err` message if an error occurs

**Kind**: inner constant of [<code>ingestSalesFile</code>](#module_ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | contains elements required for ingestion (below) |
| data.bigQuery | <code>object</code> | bigQuery instance |
| data.salesFile | <code>object</code> | Sales File document |
| callback | <code>function</code> | A callback that handles the response |


* [~ingestSalesFile](#module_ingestSalesFile..ingestSalesFile)
    * [.matchToTemplate(localFile, salesFile, callback)](#module_ingestSalesFile..ingestSalesFile.matchToTemplate)
    * [.createAdditionalSalesFile(salesFile, match, matches, originalSalesFileName, tabNames, callback)](#module_ingestSalesFile..ingestSalesFile.createAdditionalSalesFile)
    * [.addTemplateInfoToSalesFile(salesTemplateId, salesFile, callback)](#module_ingestSalesFile..ingestSalesFile.addTemplateInfoToSalesFile)
    * [.combineSalesFileNameAndSuffix(match, matches, salesFileName, tabNames)](#module_ingestSalesFile..ingestSalesFile.combineSalesFileNameAndSuffix)
    * [.ingestionProcessData(salesFile, callback)](#module_ingestSalesFile..ingestSalesFile.ingestionProcessData)
    * [.processFile(bigQuery, file, event, callback)](#module_ingestSalesFile..ingestSalesFile.processFile)
    * [.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, callback)](#module_ingestSalesFile..ingestSalesFile.extractData)
    * [.extractOverwriteFieldTargetCells(data, overwriteFieldTargetCells)](#module_ingestSalesFile..ingestSalesFile.extractOverwriteFieldTargetCells) ⇒ <code>Array.&lt;object&gt;</code>
    * [.getColAndRowFromCellReference(cellRef)](#module_ingestSalesFile..ingestSalesFile.getColAndRowFromCellReference) ⇒ <code>object</code>
    * [.getColNumber(colString)](#module_ingestSalesFile..ingestSalesFile.getColNumber) ⇒ <code>number</code>
    * [.replaceOverwriteValuesAndProRataAmount(event, extractedOverwriteFields, callback)](#module_ingestSalesFile..ingestSalesFile.replaceOverwriteValuesAndProRataAmount)
    * [.processAppleFinancialFile(customAdditionalFile, salesFileId, exchangeRates, callback)](#module_ingestSalesFile..ingestSalesFile.processAppleFinancialFile)
    * [.processItunesMatchFile(event, file, chunked, iTunesExchangeRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback)](#module_ingestSalesFile..ingestSalesFile.processItunesMatchFile)
    * [.processFacebookFinancialFile(customAdditionalFile, salesFileId, callback)](#module_ingestSalesFile..ingestSalesFile.processFacebookFinancialFile)
    * [.setPerUnitRate(event, chunked, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback)](#module_ingestSalesFile..ingestSalesFile.setPerUnitRate)
    * [.processDataChunks(chunked, nextChunkStart, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, customAdditionalFileMissing, bigQuery, file, totalLines, requiredExchangeRates, identification, callback)](#module_ingestSalesFile..ingestSalesFile.processDataChunks)
    * [.processNextChunk(event, chunk, idx, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, validationData, customAdditionalFileMissing, bigQuery, callback)](#module_ingestSalesFile..ingestSalesFile.processNextChunk)
    * [.removeOldSales(bigQuery, salesFileId, partitionNo, callback)](#module_ingestSalesFile..ingestSalesFile.removeOldSales)
    * [.chunk(arr, len)](#module_ingestSalesFile..ingestSalesFile.chunk) ⇒ <code>array</code>
    * [.combineArray(a, b)](#module_ingestSalesFile..ingestSalesFile.combineArray) ⇒ <code>array</code>
    * [.combineObjectArray(a, b)](#module_ingestSalesFile..ingestSalesFile.combineObjectArray) ⇒ <code>Array.&lt;object&gt;</code>
    * [.extractResults(data, startingLine, startingColumn)](#module_ingestSalesFile..ingestSalesFile.extractResults) ⇒ <code>Array.&lt;array&gt;</code>
    * [.createIngestTask(salesFile, priority, callback)](#module_ingestSalesFile..ingestSalesFile.createIngestTask)

<a name="module_ingestSalesFile..ingestSalesFile.matchToTemplate"></a>

#### ingestSalesFile.matchToTemplate(localFile, salesFile, callback)
Try matching the uploaded sales file to a template within the client's templates or the template library.
If additional sales files are required, these are created and tasks added to ingest these as well.
* Calls `callback(localFile, err)` with `localFile` assigned to the localFile provided on the input params
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| localFile | <code>string</code> | path to sales file stored locally |
| salesFile | <code>object</code> | Sales File document |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.createAdditionalSalesFile"></a>

#### ingestSalesFile.createAdditionalSalesFile(salesFile, match, matches, originalSalesFileName, tabNames, callback)
Creates an additional sales file

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| salesFile | <code>object</code> | Sales File document |
| match | <code>object</code> | Object containing matched template info |
| matches | <code>array</code> | Array containing all matches |
| originalSalesFileName | <code>string</code> | The name of the original Sales File |
| tabNames | <code>array</code> | an array containing all tab names extracted from the Sales File |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.addTemplateInfoToSalesFile"></a>

#### ingestSalesFile.addTemplateInfoToSalesFile(salesTemplateId, salesFile, callback)
Adds relevant settings from the Sales Template to the Sales File

* Calls `callback(err)` with an `err` message if an error occurs, otherwise err = undefined

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| salesTemplateId | <code>string</code> | Sales Template id |
| salesFile | <code>object</code> | Sales File document |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.combineSalesFileNameAndSuffix"></a>

#### ingestSalesFile.combineSalesFileNameAndSuffix(match, matches, salesFileName, tabNames)
Adds relevant settings from the Sales Template to the Sales File

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| match | <code>object</code> | Object containing matched template info |
| matches | <code>array</code> | Array containing all matches |
| salesFileName | <code>string</code> | The Sales File name to add to |
| tabNames | <code>array</code> | an array containing all tab names extracted from the Sales File |

<a name="module_ingestSalesFile..ingestSalesFile.ingestionProcessData"></a>

#### ingestSalesFile.ingestionProcessData(salesFile, callback)
Processes Data for the ingestion process

* Gets template mappings from client settings and Sales Template attached to the Sales File
* Gets catalogueOverwritingData and exchange rate defaults obtained from client
* Then returns the resulting data plus any other information to be passed to the ingestion process
* Calls `callback(err, output)` with `output` containing all the information required for sales ingestion
* Calls `callback(err, output)` with an `err` message if an error occurs

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| salesFile | <code>object</code> | Sales File document |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.processFile"></a>

#### ingestSalesFile.processFile(bigQuery, file, event, callback)
The main sales ingestion process.

* reads the Sales Data file and any additional Financial file (if applicable) attached to the Sales File
* uses the mapper and runs any calculations attached to the Sales Template
* then validates the data and saves to BigQuery database
* returns the validation info and any errors as well as the identification extracted from the file
* Calls `callback(err, validationData, identification)` with `validationData` containing the validation data & `identification` containing the identification extracted from the file
* Calls `callback(err, validationData, identification)` with an `err` message if an error occurs

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| bigQuery | <code>object</code> | bigQuery instance |
| file | <code>string</code> | File path to data file |
| event | <code>object</code> | object with information for sales ingestion |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.extractData"></a>

#### ingestSalesFile.extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, callback)
Extracts Sales Data, Identification and overwriteFields from the supplied file

* Calls `callback(err, data, identification, extractedOverwriteFields)` with `data` containing the extracted Sales Data, `identification` containing the identification extracted from the file & `extractedOverwriteFields` containing Overwrite Fields, e.g. { field: "originalCurrency", type: "String", value: "USD" }
* Calls `callback(err, data, identification, extractedOverwriteFields)` with an `err` message if an error occurs

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| tab | <code>number</code> | Number of tab to extract |
| startingLine | <code>number</code> | Starting line to extract from (first line = 0) |
| startingColumn | <code>number</code> | Starting column to extract from (first column = 0) |
| delimiter | <code>string</code> | Delimiter to use |
| characterSeparators | <code>Array.&lt;number&gt;</code> | Array containing length of each column to split by |
| encoding | <code>string</code> | Encoding type |
| overwriteFieldTargetCells | <code>Array.&lt;object&gt;</code> | Target Cells, e.g. { field: "originalCurrency", type: "String", cell: "A3" } |
| templatefileType | <code>string</code> | Type of template being used for the sales file (only current usage: "CRD") |
| salesFileId | <code>string</code> | Sales file id used for logging |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.extractOverwriteFieldTargetCells"></a>

#### ingestSalesFile.extractOverwriteFieldTargetCells(data, overwriteFieldTargetCells) ⇒ <code>Array.&lt;object&gt;</code>
Extracts Overwrite Fields from data array according to the Target Cells provided in the Sales File

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  
**Returns**: <code>Array.&lt;object&gt;</code> - Array of Overwrite Fields, e.g. { field: "originalCurrency", type: "String", value: "USD" }  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;array&gt;</code> | Sales Data |
| overwriteFieldTargetCells | <code>Array.&lt;object&gt;</code> | Target Cells, e.g. { field: "originalCurrency", type: "String", cell: "A3" } |

<a name="module_ingestSalesFile..ingestSalesFile.getColAndRowFromCellReference"></a>

#### ingestSalesFile.getColAndRowFromCellReference(cellRef) ⇒ <code>object</code>
Translate Excel column reference (e.g. A1, B3) to column and row numbers

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  
**Returns**: <code>object</code> - object containing col and row, e.g. { col: 1, row: 3 } for A3  

| Param | Type | Description |
| --- | --- | --- |
| cellRef | <code>string</code> | String representation of cell (e.g. "A3", "B7") |

<a name="module_ingestSalesFile..ingestSalesFile.getColNumber"></a>

#### ingestSalesFile.getColNumber(colString) ⇒ <code>number</code>
Translates column number from a string (e.g. "A" => 1, "B" => 2)

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  
**Returns**: <code>number</code> - Number representation of column  

| Param | Type | Description |
| --- | --- | --- |
| colString | <code>string</code> | String representation of column (e.g. "A", "B") |

<a name="module_ingestSalesFile..ingestSalesFile.replaceOverwriteValuesAndProRataAmount"></a>

#### ingestSalesFile.replaceOverwriteValuesAndProRataAmount(event, extractedOverwriteFields, callback)
Replace overwrite values and pro rata amount with values from sales file

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>object</code> | object with information for sales ingestion |
| extractedOverwriteFields | <code>Array.&lt;object&gt;</code> | containing Overwrite Fields, e.g. { field: "originalCurrency", type: "String", value: "USD" } |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.processAppleFinancialFile"></a>

#### ingestSalesFile.processAppleFinancialFile(customAdditionalFile, salesFileId, exchangeRates, callback)
Process Apple Financial File

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| customAdditionalFile | <code>string</code> | S3 path to Apple Financial File |
| salesFileId | <code>string</code> | Sales File id |
| exchangeRates | <code>Array.&lt;string&gt;</code> | array of currencies |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.processItunesMatchFile"></a>

#### ingestSalesFile.processItunesMatchFile(event, file, chunked, iTunesExchangeRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback)
Process iTunes Match file

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>object</code> | object with information for sales ingestion |
| file | <code>string</code> | File path to data file |
| chunked | <code>Array.&lt;array&gt;</code> | array containing chunks of data |
| iTunesExchangeRates | <code>object</code> | Exchange rates for Apple/iTunes files |
| allowedKeys | <code>Array.&lt;string&gt;</code> | Allowed keys for the DB from the Big Query lib |
| fieldTypes | <code>object</code> | Field types from Big Query |
| facebookPerUnitRates | <code>object</code> | Per Production rates from Facebook Financial File |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.processFacebookFinancialFile"></a>

#### ingestSalesFile.processFacebookFinancialFile(customAdditionalFile, salesFileId, callback)
Process Facebook Financial File

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| customAdditionalFile | <code>string</code> | S3 path to Apple Financial File |
| salesFileId | <code>string</code> | Sales File id |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.setPerUnitRate"></a>

#### ingestSalesFile.setPerUnitRate(event, chunked, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback)
Set per-unit rate if proRata is set

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>object</code> | object with information for sales ingestion |
| chunked | <code>Array.&lt;array&gt;</code> | array containing chunks of data |
| iTunesExchangeRates | <code>object</code> | Exchange rates for Apple/iTunes files |
| iTunesPerUnitRates | <code>object</code> | Per Unit Rates for iTunes Match files |
| allowedKeys | <code>Array.&lt;string&gt;</code> | Allowed keys for the DB from the Big Query lib |
| fieldTypes | <code>object</code> | Field types from Big Query |
| facebookPerUnitRates | <code>object</code> | Per Production rates from Facebook Financial File |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.processDataChunks"></a>

#### ingestSalesFile.processDataChunks(chunked, nextChunkStart, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, customAdditionalFileMissing, bigQuery, file, totalLines, requiredExchangeRates, identification, callback)
Process the chunked data

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| chunked | <code>Array.&lt;array&gt;</code> | array containing chunks of data |
| nextChunkStart | <code>number</code> | position of next chunk of data |
| event | <code>object</code> | Object with information for sales ingestion |
| perUnitRate | <code>number</code> | Per Unit Rate obtained from pro-rata amount |
| iTunesExchangeRates | <code>object</code> | Exchange rates for Apple/iTunes files |
| iTunesPerUnitRates | <code>object</code> | Per Unit Rates for iTunes Match files |
| allowedKeys | <code>Array.&lt;string&gt;</code> | Allowed keys for the DB from the Big Query lib |
| fieldTypes | <code>object</code> | Field types from Big Query |
| facebookPerUnitRates | <code>object</code> | Per Production rates from Facebook Financial File |
| customAdditionalFileMissing | <code>boolean</code> | indicates if custom file was detected missing during the process |
| bigQuery | <code>object</code> | bigQuery instance |
| file | <code>string</code> | File path to data file |
| totalLines | <code>number</code> | total data lines to process |
| requiredExchangeRates | <code>Array.&lt;string&gt;</code> | Exchange rates obtained from Apple Financial file |
| identification | <code>identification</code> | Identification generated from input file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.processNextChunk"></a>

#### ingestSalesFile.processNextChunk(event, chunk, idx, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, validationData, customAdditionalFileMissing, bigQuery, callback)
Process next chunk

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| event | <code>object</code> | Object with information for sales ingestion |
| chunk | <code>array</code> | chunk of data |
| idx | <code>number</code> | index of chunk in chunks array |
| perUnitRate | <code>number</code> | Per Unit Rate obtained from pro-rata amount |
| iTunesExchangeRates | <code>object</code> | Exchange rates for Apple/iTunes files |
| iTunesPerUnitRates | <code>object</code> | Per Unit Rates for iTunes Match files |
| allowedKeys | <code>Array.&lt;string&gt;</code> | Allowed keys for the DB from the Big Query lib |
| fieldTypes | <code>object</code> | Field types from Big Query |
| facebookPerUnitRates | <code>object</code> | Per Production rates from Facebook Financial File |
| validationData | <code>object</code> | object containing validation data to add to sales file after processing |
| customAdditionalFileMissing | <code>boolean</code> | indicates if custom file was detected missing during the process |
| bigQuery | <code>object</code> | bigQuery instance |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.removeOldSales"></a>

#### ingestSalesFile.removeOldSales(bigQuery, salesFileId, partitionNo, callback)
Removes old sales data for Sales Fil with id salesFileId

* Calls callback(err, output) with `output` containing query results passed back from bigQuery
* Calls callback(err, output) with an `err` message if an error occurs

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| bigQuery | <code>object</code> | bigQuery instance |
| salesFileId | <code>string</code> | Sales File id |
| partitionNo | <code>number</code> | Bug Query partition number |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_ingestSalesFile..ingestSalesFile.chunk"></a>

#### ingestSalesFile.chunk(arr, len) ⇒ <code>array</code>
Splits array into multiple arrays (chunks)

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  
**Returns**: <code>array</code> - Array of arrays with each array containing chunked data of length <= *len*  

| Param | Type | Description |
| --- | --- | --- |
| arr | <code>array</code> | Array to chunk |
| len | <code>number</code> | Maximum length of each chunk |

<a name="module_ingestSalesFile..ingestSalesFile.combineArray"></a>

#### ingestSalesFile.combineArray(a, b) ⇒ <code>array</code>
Combines two arrays of primitive values

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  
**Returns**: <code>array</code> - Combined array  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>array</code> | Array a |
| b | <code>array</code> | Array b |

<a name="module_ingestSalesFile..ingestSalesFile.combineObjectArray"></a>

#### ingestSalesFile.combineObjectArray(a, b) ⇒ <code>Array.&lt;object&gt;</code>
Combines two arrays of objects

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  
**Returns**: <code>Array.&lt;object&gt;</code> - Combined array of objects  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Array.&lt;object&gt;</code> | Array of objects a |
| b | <code>Array.&lt;object&gt;</code> | Array of objects b |

<a name="module_ingestSalesFile..ingestSalesFile.extractResults"></a>

#### ingestSalesFile.extractResults(data, startingLine, startingColumn) ⇒ <code>Array.&lt;array&gt;</code>
Extracts the desired results from the Sales Data, according to *startingLine* and *startingColumn*

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  
**Returns**: <code>Array.&lt;array&gt;</code> - Array of extracted data rows as arrays  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;array&gt;</code> | Sales Data |
| startingLine | <code>number</code> | Starting line to extract from (first line = 0) |
| startingColumn | <code>number</code> | Starting column to extract from (first column = 0) |

<a name="module_ingestSalesFile..ingestSalesFile.createIngestTask"></a>

#### ingestSalesFile.createIngestTask(salesFile, priority, callback)
Creates an ingest task to be picked up by the processor

* Creates a task in the database
* Then changes status of Sales File to "Waiting"
* Sends a message to AWS SQS to notify processor of the pending task
* Calls `callback(err, data)` with `data` containing the data returned by SQS.sendMessage
* Calls `callback(err, data)` with an `err` message if an error occurs

**Kind**: static method of [<code>ingestSalesFile</code>](#module_ingestSalesFile..ingestSalesFile)  

| Param | Type | Description |
| --- | --- | --- |
| salesFile | <code>object</code> | The sales file document |
| priority | <code>number</code> | The priority of the task (defaults to 1) |
| callback | <code>function</code> | A callback that handles the response |

