<a name="module_utils"></a>

## utils

* [utils](#module_utils)
    * [~utils](#module_utils..utils) : <code>object</code>
        * [.isBarcodeCorrupt(number)](#module_utils..utils.isBarcodeCorrupt) ⇒ <code>bool</code>
        * [.convertStringToBoolean(inputParam)](#module_utils..utils.convertStringToBoolean) ⇒ <code>boolean</code>
        * [.paramsToFilterParticipation(inputParams, params)](#module_utils..utils.paramsToFilterParticipation) ⇒ <code>object</code>
        * [.paramsToFilterOwnership(inputParams, params)](#module_utils..utils.paramsToFilterOwnership) ⇒ <code>object</code>
        * [.filterEqualLessAndGreaterThan(symbol, value)](#module_utils..utils.filterEqualLessAndGreaterThan) ⇒ <code>object</code>
        * [.atlasSearch(Model, query, user, params)](#module_utils..utils.atlasSearch) ⇒ <code>object</code>
        * [.atlasSearchEqualLessGreaterThan(path)](#module_utils..utils.atlasSearchEqualLessGreaterThan) ⇒ <code>object</code>
        * [.clearBlankStrings(document, properties)](#module_utils..utils.clearBlankStrings)
        * [.isStrongPassword(password)](#module_utils..utils.isStrongPassword) ⇒ <code>boolean</code>
        * [.combineContractAndCompanyIds(inputParams, clientId)](#module_utils..utils.combineContractAndCompanyIds) ⇒ <code>Array.&lt;string&gt;</code>

<a name="module_utils..utils"></a>

### utils~utils : <code>object</code>
**Kind**: inner namespace of [<code>utils</code>](#module_utils)  

* [~utils](#module_utils..utils) : <code>object</code>
    * [.isBarcodeCorrupt(number)](#module_utils..utils.isBarcodeCorrupt) ⇒ <code>bool</code>
    * [.convertStringToBoolean(inputParam)](#module_utils..utils.convertStringToBoolean) ⇒ <code>boolean</code>
    * [.paramsToFilterParticipation(inputParams, params)](#module_utils..utils.paramsToFilterParticipation) ⇒ <code>object</code>
    * [.paramsToFilterOwnership(inputParams, params)](#module_utils..utils.paramsToFilterOwnership) ⇒ <code>object</code>
    * [.filterEqualLessAndGreaterThan(symbol, value)](#module_utils..utils.filterEqualLessAndGreaterThan) ⇒ <code>object</code>
    * [.atlasSearch(Model, query, user, params)](#module_utils..utils.atlasSearch) ⇒ <code>object</code>
    * [.atlasSearchEqualLessGreaterThan(path)](#module_utils..utils.atlasSearchEqualLessGreaterThan) ⇒ <code>object</code>
    * [.clearBlankStrings(document, properties)](#module_utils..utils.clearBlankStrings)
    * [.isStrongPassword(password)](#module_utils..utils.isStrongPassword) ⇒ <code>boolean</code>
    * [.combineContractAndCompanyIds(inputParams, clientId)](#module_utils..utils.combineContractAndCompanyIds) ⇒ <code>Array.&lt;string&gt;</code>

<a name="module_utils..utils.isBarcodeCorrupt"></a>

#### utils.isBarcodeCorrupt(number) ⇒ <code>bool</code>
Checks whether a barcode has been corrupted by a csv on import

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>bool</code> - return either true or false based on the result of condition  

| Param | Type | Description |
| --- | --- | --- |
| number | <code>any</code> | any data type passed to function, should anticipate either a string or number |

<a name="module_utils..utils.convertStringToBoolean"></a>

#### utils.convertStringToBoolean(inputParam) ⇒ <code>boolean</code>
Converts any string boolean to a boolean from excel import.

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>boolean</code> - returns either true or false based on conditon passed  

| Param | Type | Description |
| --- | --- | --- |
| inputParam | <code>any</code> | inputParam is passed from field from excel import, could either be a string e.g. 'TRUE' or bool true |

<a name="module_utils..utils.paramsToFilterParticipation"></a>

#### utils.paramsToFilterParticipation(inputParams, params) ⇒ <code>object</code>
Converts `=`, `<`, `>`, `=<`, `=>` from `participation` param (if this exists) to database filter and adds to the filter object passed

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>object</code> - params to use as filter with `totalParticipation` added if `inputParams.participation` filter exists  

| Param | Type | Description |
| --- | --- | --- |
| inputParams | <code>object</code> | input params passed from route |
| params | <code>object</code> | filter to be added to |

<a name="module_utils..utils.paramsToFilterOwnership"></a>

#### utils.paramsToFilterOwnership(inputParams, params) ⇒ <code>object</code>
Converts `=`, `<`, `>`, `=<`, `=>` from `ownership` param (if this exists) to database filter and adds to the filter object passed

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>object</code> - params to use as filter with `totalParticipation` added if `inputParams.participation` filter exists  

| Param | Type | Description |
| --- | --- | --- |
| inputParams | <code>object</code> | input params passed from route |
| params | <code>object</code> | filter to be added to |

<a name="module_utils..utils.filterEqualLessAndGreaterThan"></a>

#### utils.filterEqualLessAndGreaterThan(symbol, value) ⇒ <code>object</code>
Converts `=`, `<`, `>`, `=<`, `=>` to database filter

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>object</code> - filter object  

| Param | Type | Description |
| --- | --- | --- |
| symbol | <code>object</code> | symbol for comparison |
| value | <code>object</code> | value to filter on |

<a name="module_utils..utils.atlasSearch"></a>

#### utils.atlasSearch(Model, query, user, params) ⇒ <code>object</code>
Performs an Atlas Search

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>object</code> - containing `docs`, `totalPages`, `total`  

| Param | Type | Description |
| --- | --- | --- |
| Model | <code>object</code> | Database Model to use for the aggregation query |
| query | <code>object</code> | Query as passed by the front end |
| user | <code>object</code> | User object containing payeeId and contractId properties |
| params | <code>object</code> | Parameters for the search are provided as an object |
| params.searchIndex | <code>string</code> | Atlas Search index to use for the search |
| [params.page] | <code>number</code> | Number of the page to return |
| [params.limit] | <code>number</code> | Maximum number of results to return |
| [params.sortBy] | <code>string</code> | The field to sort on |
| [params.sortOrder] | <code>string</code> | The order for the sort asc|desc - defaults to asc |
| [params.filterItems] | <code>Array.&lt;object&gt;</code> | Fields to filter on |
| [params.filterItems.name] | <code>string</code> | Name of the field for each filter on (as provided as a property on the query object) |
| [params.filterItems.field] | <code>string</code> | Indexed field each filter relates to |
| [params.filterItems.type] | <code>string</code> | Type of field - `text`,`boolean`,`before`,`after`,`equalLessGreaterThan`,`objectIds` |
| [params.payeeFilterFields] | <code>Array.&lt;string&gt;</code> | Fields to use for Payee Users filter |
| [params.textSearchFields] | <code>Array.&lt;string&gt;</code> | Indexed fields to use for Text Search |
| [params.payeeFilterFields] | <code>Array.&lt;string&gt;</code> | Fields to use for Payee Users filter |

<a name="module_utils..utils.atlasSearchEqualLessGreaterThan"></a>

#### utils.atlasSearchEqualLessGreaterThan(path) ⇒ <code>object</code>
Converts `=`, `<`, `>`, `=<`, `=>` to atlas search range filters

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>object</code> - object containing either `filter` or `mustNot` property as array  

| Param | Type | Description |
| --- | --- | --- |
| comparison.symbol | <code>string</code> | Symbol for comparison |
| comparison.value | <code>number</code> \| <code>string</code> | Value to compare to |
| path | <code>string</code> | Indexed field path to apply the range filter to |

<a name="module_utils..utils.clearBlankStrings"></a>

#### utils.clearBlankStrings(document, properties)
Clears blank strings that could cause .populate to error

* For properties of type array this processes contractId, composerId, publisherId on any object in the array
* For properties of type string this processes the property itself

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>object</code> | the document object containing properties to be cleaned up |
| properties | <code>Array.&lt;string&gt;</code> | list of properties to check and fix if blank strings are found |

<a name="module_utils..utils.isStrongPassword"></a>

#### utils.isStrongPassword(password) ⇒ <code>boolean</code>
Check if the provided password meets the minimum requirements

* Contains at least 1 lower case letter, 1 upper case letter, 1 digit, 1 special character
* Has a minimum length of 8 chars

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>boolean</code> - true if password meets the minimum requirements  

| Param | Type | Description |
| --- | --- | --- |
| password | <code>string</code> | password to check |

<a name="module_utils..utils.combineContractAndCompanyIds"></a>

#### utils.combineContractAndCompanyIds(inputParams, clientId) ⇒ <code>Array.&lt;string&gt;</code>
Creates `contractIds` from `companyIds` and intersects these with any `contractIds` present on inputParams

* If no `companyIds` are present it will return `inputParams.contractIds`
* If no `contractIds` are present it will return all `contractIds` associated with a company (or companies)
* If both are present only `contractIds` present in both `contractIds` and extracted `contractIds` from `companyIds` will be returned

**Kind**: static method of [<code>utils</code>](#module_utils..utils)  
**Returns**: <code>Array.&lt;string&gt;</code> - - array of contract ids as strings  

| Param | Type | Description |
| --- | --- | --- |
| inputParams | <code>object</code> | input params used for filtering |
| inputParams.companyIds | <code>Array.&lt;string&gt;</code> | list of company ids |
| inputParams.contractIds | <code>Array.&lt;string&gt;</code> | list of contract ids |
| clientId | <code>string</code> | the clientId to be used when searching for contracts |

