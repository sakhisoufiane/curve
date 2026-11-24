<a name="module_fileOpener"></a>

## fileOpener

* [fileOpener](#module_fileOpener)
    * _static_
        * [.extractData(file, options, callback)](#module_fileOpener.extractData)
        * [.extractDataAndIdentifiers(file, options, callback)](#module_fileOpener.extractDataAndIdentifiers)
        * [.extractIdentifiers(file, callback)](#module_fileOpener.extractIdentifiers)
        * [.detectExtension(file, callback)](#module_fileOpener.detectExtension)
        * [.detectFileType(file, callback)](#module_fileOpener.detectFileType)
        * [.detectEncoding(file, callback)](#module_fileOpener.detectEncoding)
        * [.readData(file, type, options, callback)](#module_fileOpener.readData)
        * [.readExcelFile(file, tab, [returnAllTabs], [maxRows], callback)](#module_fileOpener.readExcelFile)
        * [.readExcelJs(file, tab, [returnAllTabs], [maxRows], callback)](#module_fileOpener.readExcelJs)
        * [.readXlsxFile(file, tab, [returnAllTabs], [maxRows], callback)](#module_fileOpener.readXlsxFile)
        * [.readCsvFile(file, [delimiter], [encoding], [maxRows], callback)](#module_fileOpener.readCsvFile)
        * [.readTxtFile(file, [delimiter], [encoding], [maxRows], [chunkStart], callback)](#module_fileOpener.readTxtFile)
    * _inner_
        * [~arrayFromXlsRange(worksheet, [stopAtLine])](#module_fileOpener..arrayFromXlsRange) ⇒ <code>array</code>
        * [~xlsxExtractSheet(file, tab, [maxRows], callback)](#module_fileOpener..xlsxExtractSheet)
        * [~extractResults(data, startingLine, startingColumn)](#module_fileOpener..extractResults) ⇒ <code>Array.&lt;array&gt;</code>
        * [~removeUnwantedCharacters(data)](#module_fileOpener..removeUnwantedCharacters) ⇒ <code>Array.&lt;array&gt;</code>
        * [~separateByCharacters(data, characterSeparators, callback)](#module_fileOpener..separateByCharacters)

<a name="module_fileOpener.extractData"></a>

### fileOpener.extractData(file, options, callback)
Checks file extension, extracts tabulated data from the supplied file.

* Calls `callback(err, totalTabs, data)`
  * `totalTabs` the number of tabs in the file
  * `data` containing the extracted data rows
  * `nextChunkStart` set to the start of the next chunk to read from the file (optional)
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| options | <code>object</code> | Used to pass options to function |
| options.tab | <code>number</code> | Number of tab to extract |
| [options.startingLine] | <code>number</code> | Starting line to extract from (first line = 0) |
| [options.startingColumn] | <code>number</code> | Starting column to extract from (first column = 0) |
| [options.characterSeparators] | <code>Array.&lt;number&gt;</code> | Array containing length of each column to split by |
| [options.delimiter] | <code>string</code> | Delimiter to use |
| [options.encoding] | <code>string</code> | Encoding type |
| [options.returnAllTabs] | <code>boolean</code> | Flag to set if all tabs in the file should be extracted |
| [options.maxRows] | <code>number</code> | Maximum number of lines to extract |
| [options.chunkStart] | <code>number</code> | Start line when reading a chunk of data only |
| [options.templatefileType] | <code>string</code> | Type of template being used for the sales file (only current usage: "CRD") |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.extractDataAndIdentifiers"></a>

### fileOpener.extractDataAndIdentifiers(file, options, callback)
Extracts data and identifiers from file.

* Calls `callback(err, output)` with `output` containing the extracted data rows, total tabs & identification
* Calls `callback(err, output)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  
**See**: [templateMatcher](templateMatcher)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| options | <code>object</code> | Used to pass options to function |
| options.tab | <code>number</code> | Number of tab to extract |
| options.headerRow | <code>number</code> | Position of header row (starting from 0) |
| options.startingLine | <code>number</code> | Line to start from (starting from 0) |
| options.startingColumn | <code>number</code> | Column to start from (starting from 0) |
| [options.delimiter] | <code>string</code> | Delimiter to use |
| [options.characterSeparators] | <code>string</code> | Character separators |
| [options.encoding] | <code>string</code> | Encoding type |
| [options.maxRows] | <code>number</code> | Maximum number of lines to extract |
| [options.templatefileType] | <code>string</code> | Type of template being used for the sales file (only current usage: "CRD") |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.extractIdentifiers"></a>

### fileOpener.extractIdentifiers(file, callback)
Extracts identifiers from file.

* Calls `callback(err, identifiers, tabNames)` with
  * `identifiers` containing the extracted identifiers
  * `tabNames` an array of all tab names if detected (only applicable to Excel files)
* Calls `callback(err, identifiers, tabNames)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  
**See**: [templateMatcher](templateMatcher)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.detectExtension"></a>

### fileOpener.detectExtension(file, callback)
Returns the extension of the supplied file.

* Calls `callback(err, extension)` with the `extension` of the supplied file (e.g. ".xls")
* Calls `callback(err, extension)` with an `err` message if file extension doesn't match the list of allowed sales file extensions

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.detectFileType"></a>

### fileOpener.detectFileType(file, callback)
Checks the file type of the supplied file by calling `file "{filepath}"`

* Calls `callback(err, fileType)` with `fileType` containing the fileType, if detected
* currently only checks for Text Files, or anything else that is out of the ordinary

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.detectEncoding"></a>

### fileOpener.detectEncoding(file, callback)
Checks the encoding of the supplied file

* Calls `callback(err, encoding)` with `encoding` containing the encoding, if detected - `err` is always returned as `null`, reserved for future use

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.readData"></a>

### fileOpener.readData(file, type, options, callback)
According to file extension, calls relevant functions to extract data from file.

* Calls `callback(err, totalTabs, tabs, sheetNames, nextChunkStart)` with
  * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
  * `totalTabs` the number of tabs in the file
  * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
  * `nextChunkStart` set to the start of the next chunk to read from the file (optional)
* Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| type | <code>string</code> | file extension formatted as .ext |
| options | <code>object</code> | Used to pass options to function |
| options.tab | <code>number</code> | Number of tab to extract |
| [options.delimiter] | <code>string</code> | Delimiter to use |
| [options.encoding] | <code>string</code> | Encoding type |
| [options.returnAllTabs] | <code>boolean</code> | Flag to set if all tabs in the file should be extracted |
| [options.maxRows] | <code>number</code> | Maximum number of lines to extract |
| [options.chunkStart] | <code>number</code> | Start line when reading a chunk of data only |
| [options.templatefileType] | <code>string</code> | Type of template being used for the sales file (only current usage: "CRD") |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.readExcelFile"></a>

### fileOpener.readExcelFile(file, tab, [returnAllTabs], [maxRows], callback)
Extracts data and total tabs from Excel file using XLSX npm lib

* Calls `callback(err, totalTabs, tabs, sheetNames)` with
  * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
  * `totalTabs` the number of tabs in the file
  * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
* Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| tab | <code>number</code> | Number of tab to extract |
| [returnAllTabs] | <code>boolean</code> | Flag to set if all tabs in the file should be extracted |
| [maxRows] | <code>number</code> | Maximum number of lines to extract |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.readExcelJs"></a>

### fileOpener.readExcelJs(file, tab, [returnAllTabs], [maxRows], callback)
Extracts data and total tabs from Excel file using ExcelJS npm lib

* Calls `callback(err, totalTabs, tabs, sheetNames)` with
  * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
  * `totalTabs` the number of tabs in the file
  * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
* Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| tab | <code>number</code> | Number of tab to extract |
| [returnAllTabs] | <code>boolean</code> | Flag to set if all tabs in the file should be extracted |
| [maxRows] | <code>number</code> | Maximum number of lines to extract |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.readXlsxFile"></a>

### fileOpener.readXlsxFile(file, tab, [returnAllTabs], [maxRows], callback)
Extracts data and total tabs (only if countTabs is set to true) from Excel file using XLSXExtract npm lib

* Calls `callback(err, totalTabs, tabs, sheetNames)` with
  * `tabs` containing the extracted data rows for all tabs (if returnAllTabs set to true)
  * `totalTabs` the number of tabs in the file
  * `sheetNames` an array of all tab names if detected (only applicable to Excel files)
* Calls `callback(err, totalTabs, tabs, sheetNames)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| tab | <code>number</code> | Number of tab to extract |
| [returnAllTabs] | <code>boolean</code> | Flag to set if all tabs in the file should be extracted |
| [maxRows] | <code>number</code> | Maximum number of lines to extract |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.readCsvFile"></a>

### fileOpener.readCsvFile(file, [delimiter], [encoding], [maxRows], callback)
Extracts data from CSV file using fast-csv npm lib

* Calls `callback(err, result, nextChunkStart)` with `result` containing the extracted data rows and `nextChunkStart` set to the start of the next chunk to read from the file
* Calls `callback(err)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| [delimiter] | <code>string</code> | Delimiter to use |
| [encoding] | <code>string</code> | Encoding type |
| [maxRows] | <code>number</code> | Maximum number of lines to extract |
| [options.chunkStart] | <code>number</code> | Start line when reading a chunk of data only |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener.readTxtFile"></a>

### fileOpener.readTxtFile(file, [delimiter], [encoding], [maxRows], [chunkStart], callback)
Extracts data from Text file using line-by-line npm lib

* Calls `callback(err, result)` with `result` containing the extracted data rows
* Calls `callback(err, result)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| [delimiter] | <code>string</code> | Delimiter to use |
| [encoding] | <code>string</code> | Encoding type |
| [maxRows] | <code>number</code> | Maximum number of lines to extract |
| [chunkStart] | <code>number</code> | Start line when reading a chunk of data only |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener..arrayFromXlsRange"></a>

### fileOpener~arrayFromXlsRange(worksheet, [stopAtLine]) ⇒ <code>array</code>
Takes in a worksheet extracted by XLSX library and returns an array of rows for this sheet.
Optionally stops on line defined in stopAtLine

**Kind**: inner method of [<code>fileOpener</code>](#module_fileOpener)  
**Returns**: <code>array</code> - The extracted data rows  

| Param | Type | Description |
| --- | --- | --- |
| worksheet | <code>object</code> | worksheet extracted by XLSX library |
| [stopAtLine] | <code>number</code> | The line to stop on |

<a name="module_fileOpener..xlsxExtractSheet"></a>

### fileOpener~xlsxExtractSheet(file, tab, [maxRows], callback)
Extracts one sheet from file using XLSXExtract library

* Calls `callback(err, result)` with `result` containing the extracted data rows
* Calls `callback(err, result)` with an `err` message if an error occurs

**Kind**: inner method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| file | <code>string</code> | File path to data file |
| tab | <code>number</code> | Number of sheet to extract |
| [maxRows] | <code>number</code> | Maximum number of lines to extract |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileOpener..extractResults"></a>

### fileOpener~extractResults(data, startingLine, startingColumn) ⇒ <code>Array.&lt;array&gt;</code>
Extracts the desired results from the Sales Data, according to *startingLine* and *startingColumn*

**Kind**: inner method of [<code>fileOpener</code>](#module_fileOpener)  
**Returns**: <code>Array.&lt;array&gt;</code> - Array of extracted data rows as arrays  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;array&gt;</code> | Sales Data |
| startingLine | <code>number</code> | Starting line to extract from (first line = 0) |
| startingColumn | <code>number</code> | Starting column to extract from (first column = 0) |

<a name="module_fileOpener..removeUnwantedCharacters"></a>

### fileOpener~removeUnwantedCharacters(data) ⇒ <code>Array.&lt;array&gt;</code>
Removes any unwanted characters from the Sales Data
* changes `="Text Data"` to `Text Data` (entire field only)
* changes `"Text Data"` to `Text Data` (entire field only)

**Kind**: inner method of [<code>fileOpener</code>](#module_fileOpener)  
**Returns**: <code>Array.&lt;array&gt;</code> - Array of data rows as arrays with unwanted characters removed  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;array&gt;</code> | Sales Data |

<a name="module_fileOpener..separateByCharacters"></a>

### fileOpener~separateByCharacters(data, characterSeparators, callback)
Separates array of strings into a data array split by character separators as defined in characterSeparators array

* Calls `callback(err, array)` with `array` containing the data rows as arrays
* Calls `callback(err, array)` with an `err` message if an error occurs

**Kind**: inner method of [<code>fileOpener</code>](#module_fileOpener)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>array</code> | Data array to process |
| characterSeparators | <code>Array.&lt;number&gt;</code> | Array containing length of each column to split by |
| callback | <code>function</code> | A callback that handles the response |

