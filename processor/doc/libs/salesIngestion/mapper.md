<a name="module_mapper"></a>

## mapper

* [mapper](#module_mapper)
    * _static_
        * [.arrayToTemplate(array, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, currencies, exchangeRates, facebookPerUnitRates, callback)](#module_mapper.arrayToTemplate)
        * [.splitReturns(line, callback)](#module_mapper.splitReturns)
        * [.lineToTemplate(line, index, salesFileId, templateSource, template, overwriteFields, catalogue, calculation, catalogueOverwritingData, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, currencies, exchangeRates, facebookPerUnitRates, callback)](#module_mapper.lineToTemplate)
        * [.addPerUnitRate(perUnitRate, overwrittenObject, callback)](#module_mapper.addPerUnitRate)
        * [.addiTunesPerUnitRate(iTunesPerUnitRates, overwrittenObject, callback)](#module_mapper.addiTunesPerUnitRate)
        * [.addFacebookPerUnitRate(facebookPerUnitRates, overwrittenObject, callback)](#module_mapper.addFacebookPerUnitRate)
        * [.mapAllFields(object, templateSource, fields, callback)](#module_mapper.mapAllFields)
        * [.createTitleMap(object)](#module_mapper.createTitleMap) ⇒ <code>string</code>
        * [.mapValue(originalValue, mapping)](#module_mapper.mapValue) ⇒ <code>string</code>
        * [.calculateCatType(object)](#module_mapper.calculateCatType) ⇒ <code>string</code>
        * [.overwriteFields(object, fields, callback)](#module_mapper.overwriteFields)
        * [.setITunesExchangeRates(object, iTunesExchangeRates, callback)](#module_mapper.setITunesExchangeRates)
        * [.setStatus(object, callback)](#module_mapper.setStatus)
        * [.setNegative(object, callback)](#module_mapper.setNegative)
        * [.runExchangeRates(object, currencies, exchangeRates, callback)](#module_mapper.runExchangeRates)
        * [.runMultiplier(object, callback)](#module_mapper.runMultiplier)
        * [.mapToCatalogue(object, templateSource, catalogue, callback)](#module_mapper.mapToCatalogue)
        * [.checkForException(identifier, title, exceptions, exceptionField)](#module_mapper.checkForException) ⇒ <code>string</code>
        * [.mapSimpleCatalogue(identifier, title, mappings, exceptions, exceptionField)](#module_mapper.mapSimpleCatalogue) ⇒ <code>string</code>
        * [.mapProductCatalogue(catNo, barcode, distributionChannel, title, mappings, exceptions)](#module_mapper.mapProductCatalogue) ⇒ <code>string</code>
        * [.mapWorkCatalogue(identifier, tunecode, songCode, iswc, title, titleMapper, source, mappings, exceptions)](#module_mapper.mapWorkCatalogue) ⇒ <code>string</code>
        * [.valueOrDistributionChannel(value, distributionChannel)](#module_mapper.valueOrDistributionChannel) ⇒ <code>string</code>
        * [.setCatalogueData(object, catalogueOverwritingData, overwriteFields)](#module_mapper.setCatalogueData) ⇒
            * [~writeItemValuesToObject(object, item)](#module_mapper.setCatalogueData..writeItemValuesToObject) ⇒
    * _inner_
        * [~removeFullStopsForMapping(value)](#module_mapper..removeFullStopsForMapping) ⇒ <code>string</code> \| <code>number</code>

<a name="module_mapper.arrayToTemplate"></a>

### mapper.arrayToTemplate(array, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, currencies, exchangeRates, facebookPerUnitRates, callback)
Maps Sales Data to Template

* Calls `callback(err, result)` with `result` containing Sales Data mapped to the template fields
* Calls `callback(err, result)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| array | <code>Array.&lt;array&gt;</code> | Sales Data to process |
| event | <code>object</code> | Object with information for sales ingestion |
| perUnitRate | <code>number</code> | Per Unit Rate obtained from pro-rata amount |
| iTunesExchangeRates | <code>object</code> | Exchange rates for Apple/iTunes files |
| iTunesPerUnitRates | <code>object</code> | Per Unit Rates for iTunes Match files |
| allowedKeys | <code>Array.&lt;string&gt;</code> | Allowed keys for the DB from the Big Query lib |
| fieldTypes | <code>object</code> | Field types from Big Query |
| currencies | <code>object</code> | Currencies from client settings |
| exchangeRates | <code>Array.&lt;object&gt;</code> | Exchange Rates from Sales File applied to client currencies |
| facebookPerUnitRates | <code>object</code> | Per Production rates from Facebook Financial File |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.splitReturns"></a>

### mapper.splitReturns(line, callback)
Splits Returns for mapped Sales Line

* Calls `callback(err, lines)` with `lines` containing the processed Sales Lines
* Calls `callback(err, result)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| line | <code>object</code> | Sales Line mapped to template |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.lineToTemplate"></a>

### mapper.lineToTemplate(line, index, salesFileId, templateSource, template, overwriteFields, catalogue, calculation, catalogueOverwritingData, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, currencies, exchangeRates, facebookPerUnitRates, callback)
Maps Sales Line to Template

* Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the Sales Line mapped to the template fields
* Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| line | <code>array</code> | Sales Line to map to template |
| index | <code>number</code> | Index of Line in Sales Lines array |
| salesFileId | <code>string</code> | The Sales File id |
| templateSource | <code>string</code> | The Template source |
| template | <code>Array.&lt;object&gt;</code> | The Template fields |
| overwriteFields | <code>object</code> | List of default values for fields, used to overwrite values from Sales Data |
| catalogue | <code>object</code> | Configuration from Client Settings, template mappings as well as reduced catalogue data for client |
| calculation | <code>Array.&lt;object&gt;</code> | Calculation definitions from template |
| catalogueOverwritingData | <code>object</code> | All Catalogue Data for client |
| perUnitRate | <code>number</code> | Per Unit Rate obtained from pro-rata amount |
| iTunesExchangeRates | <code>object</code> | Exchange rates for Apple/iTunes files |
| iTunesPerUnitRates | <code>object</code> | Per Unit Rates for iTunes Match files |
| currencies | <code>object</code> | Currencies from Client Settings |
| exchangeRates | <code>Array.&lt;object&gt;</code> | Exchange Rates from Sales File applied to client currencies |
| facebookPerUnitRates | <code>object</code> | Per Production rates from Facebook Financial File |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.addPerUnitRate"></a>

### mapper.addPerUnitRate(perUnitRate, overwrittenObject, callback)
Calculates and adds grossAmount & netAmount using Per Unit Rate and number of units for overwrittenObject

* Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the updated Sales Line
* Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| perUnitRate | <code>number</code> | The Per Unit rate |
| overwrittenObject | <code>object</code> | Sales Line |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.addiTunesPerUnitRate"></a>

### mapper.addiTunesPerUnitRate(iTunesPerUnitRates, overwrittenObject, callback)
Calculates and adds grossAmount & netAmount using iTunes Per Unit Rates and number of units for overwrittenObject

* Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the updated Sales Line
* Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| iTunesPerUnitRates | <code>object</code> | Per Unit Rates for iTunes Match files |
| overwrittenObject | <code>object</code> | Sales Line |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.addFacebookPerUnitRate"></a>

### mapper.addFacebookPerUnitRate(facebookPerUnitRates, overwrittenObject, callback)
Calculates and adds grossAmount using Facebook Per Unit Rates and number of units for overwrittenObject. Defaults units to 50 if it doesn't exist.

* Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the updated Sales Line
* Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| facebookPerUnitRates | <code>object</code> | Per Unit Rates for Facebook files |
| overwrittenObject | <code>object</code> | Sales Line |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.mapAllFields"></a>

### mapper.mapAllFields(object, templateSource, fields, callback)
Maps catalogue values to the provided Sales Line object and returns the object

* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| templateSource | <code>string</code> | The Template source |
| fields | <code>object</code> | Catalogue data and template mappings |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.createTitleMap"></a>

### mapper.createTitleMap(object) ⇒ <code>string</code>
Creates Title from originalWorkTitle with any party available on Sales Line, separated by " - "

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - Combined Title, e.g. "In The Shadows - Jane Doe - John Doe"  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |

<a name="module_mapper.mapValue"></a>

### mapper.mapValue(originalValue, mapping) ⇒ <code>string</code>
Applies any mappings to the supplied value if the value is found in *mapping*

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - - Mapped value  

| Param | Type | Description |
| --- | --- | --- |
| originalValue | <code>string</code> \| <code>number</code> | Value provided which can be of string or number |
| mapping | <code>object</code> | Object containing mappings to use |

<a name="module_mapper.calculateCatType"></a>

### mapper.calculateCatType(object) ⇒ <code>string</code>
Works out the Catalogue Type from any other catalogue related values that relate to certain catTypes, e.g. "tunecode" => "Work", "catNo" => "Release"

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - The catType of either Work | Track | Release | Contract or null if none found  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |

<a name="module_mapper.overwriteFields"></a>

### mapper.overwriteFields(object, fields, callback)
Overwrites any values with the value from overwriteFields (from Sales File document)

* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| fields | <code>object</code> | Overwrite Fields |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.setITunesExchangeRates"></a>

### mapper.setITunesExchangeRates(object, iTunesExchangeRates, callback)
Applies Exchange Rates obtained from iTunes Financial File based, dealing with USD territories

* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| iTunesExchangeRates | <code>object</code> | Exchange Rates obtained from iTunes Financial File |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.setStatus"></a>

### mapper.setStatus(object, callback)
Sets status of Sales Line, when all required values are available, the status is set to "Complete", otherwise "Incomplete" (unless status is "Suspense")

* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.setNegative"></a>

### mapper.setNegative(object, callback)
Changes Gross Amount and Net Amount to negative values if positiveNegative is set to "Negative"

* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.runExchangeRates"></a>

### mapper.runExchangeRates(object, currencies, exchangeRates, callback)
Uses exchange rates and monetary values to work out and set respective Home Currency amounts (e.g. homeCurrencyGrossAmount)

* In addition sets the Exchange Rate for the Sales Line
* Additionally sets Exchange Rates for any Currencies defined in client settings for the Sales Line
* And if applicable works out amounts for each of these additional Currencies as well
* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| currencies | <code>object</code> | Currencies from client settings |
| exchangeRates | <code>Array.&lt;object&gt;</code> | Exchange Rates from Sales File applied to client currencies |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.runMultiplier"></a>

### mapper.runMultiplier(object, callback)
Applies multiplier to monetary values

* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.mapToCatalogue"></a>

### mapper.mapToCatalogue(object, templateSource, catalogue, callback)
Maps missing workId, trackId, releaseId or contractId from catalogue data

* Calls `callback(err, object)` with `object` containing the updated Sales Line
* Calls `callback(err, object)` with an `err` message if an error occurs

**Kind**: static method of [<code>mapper</code>](#module_mapper)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| templateSource | <code>string</code> | The Template source |
| catalogue | <code>object</code> | Configuration from Client Settings as well as reduced catalogue data for client |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_mapper.checkForException"></a>

### mapper.checkForException(identifier, title, exceptions, exceptionField) ⇒ <code>string</code>
Check if an exception exists for the identifier and title includes exception.title, then return the exception Map To value

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - The Map To value set for the exception (exception.output, usually the Curve catalogue id)  

| Param | Type | Description |
| --- | --- | --- |
| identifier | <code>string</code> | Identifier used for mapping |
| title | <code>string</code> | Title of catalogue item, (e.g. "Track") |
| exceptions | <code>Array.&lt;object&gt;</code> | Exceptions set in Client Settings |
| exceptionField | <code>string</code> | Exception field to check by (e.g. "isrc", "catNo") |

<a name="module_mapper.mapSimpleCatalogue"></a>

### mapper.mapSimpleCatalogue(identifier, title, mappings, exceptions, exceptionField) ⇒ <code>string</code>
Maps Catalogue Items according to mapping or exception (if one exists)

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - the mapping for {identifier}, or the exception output for {identifier} if this exists (usually the Curve catalogue id)  

| Param | Type | Description |
| --- | --- | --- |
| identifier | <code>string</code> | Identifier used for mapping |
| title | <code>string</code> | Title of catalogue item, (e.g. "Track") |
| mappings | <code>object</code> | Contains the mappings |
| exceptions | <code>Array.&lt;object&gt;</code> | Exceptions set in Client Settings |
| exceptionField | <code>string</code> | Exception field to check by (e.g. "isrc", "catNo") |

<a name="module_mapper.mapProductCatalogue"></a>

### mapper.mapProductCatalogue(catNo, barcode, distributionChannel, title, mappings, exceptions) ⇒ <code>string</code>
Maps Product Catalogue Items (used for Releases currently) according to mapping or exception (if one exists)

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - the mapping for {identifier}, or the exception output for {identifier} if this exists (usually the Curve catalogue id)  

| Param | Type | Description |
| --- | --- | --- |
| catNo | <code>string</code> | catNo of Release |
| barcode | <code>string</code> | Barcode of Release |
| distributionChannel | <code>string</code> | Distribution Channel of Catalogue Item |
| title | <code>string</code> | Title of Catalogue Item |
| mappings | <code>object</code> | Contains the mappings |
| exceptions | <code>Array.&lt;object&gt;</code> | Exceptions set in Client Settings |

<a name="module_mapper.mapWorkCatalogue"></a>

### mapper.mapWorkCatalogue(identifier, tunecode, songCode, iswc, title, titleMapper, source, mappings, exceptions) ⇒ <code>string</code>
Maps Work Catalogue Items according to mapping or exception (if one exists)

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - the mapping for {identifier}, or the exception output for {identifier} if this exists (usually the Curve catalogue id)  

| Param | Type | Description |
| --- | --- | --- |
| identifier | <code>string</code> | Work identifier |
| tunecode | <code>string</code> | Work tunecode |
| songCode | <code>string</code> | Work songCode |
| iswc | <code>string</code> | Work ISWC |
| title | <code>string</code> | Title of Catalogue Item |
| titleMapper | <code>string</code> | Combined Title with party names, e.g. "In The Shadows - Jane Doe - John Doe" |
| source | <code>string</code> | Template Source |
| mappings | <code>object</code> | Contains the mappings |
| exceptions | <code>Array.&lt;object&gt;</code> | Exceptions set in Client Settings |

<a name="module_mapper.valueOrDistributionChannel"></a>

### mapper.valueOrDistributionChannel(value, distributionChannel) ⇒ <code>string</code>
Returns the value provided unless a Distribution Channel is available for value

* if *value[distributionChannel]* exists, return the value of this
* also returns value of *value[undefined]*  if this exists
* otherwise returns *value*

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> - the output value as described above (usually Curve catalogue id)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>object</code> | Value to check |
| distributionChannel | <code>string</code> | Distribution Channel |

<a name="module_mapper.setCatalogueData"></a>

### mapper.setCatalogueData(object, catalogueOverwritingData, overwriteFields) ⇒
Overwrites values from Sales Line with current Catalogue Data

**Kind**: static method of [<code>mapper</code>](#module_mapper)  
**Returns**: Modified Sales Line  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| catalogueOverwritingData | <code>object</code> | All Catalogue Data for client |
| overwriteFields | <code>object</code> | List of default values for fields, used to overwrite values from Sales Data |

<a name="module_mapper.setCatalogueData..writeItemValuesToObject"></a>

#### setCatalogueData~writeItemValuesToObject(object, item) ⇒
Writes values from *item* to Sales Line (apart from "distributionChannel", "configuration", "priceCategory")

**Kind**: inner method of [<code>setCatalogueData</code>](#module_mapper.setCatalogueData)  
**Returns**: Modified Sales Line  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | Sales Line |
| item | <code>object</code> | - |

<a name="module_mapper..removeFullStopsForMapping"></a>

### mapper~removeFullStopsForMapping(value) ⇒ <code>string</code> \| <code>number</code>
Removes full stops from *value* if it is a string, otherwise just returns *value*

**Kind**: inner method of [<code>mapper</code>](#module_mapper)  
**Returns**: <code>string</code> \| <code>number</code> - string with full stops removed, if not a string returns *value*  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>number</code> | any number or string |

