<a name="module_iTunesSpecifics"></a>

## iTunesSpecifics

* [iTunesSpecifics](#module_iTunesSpecifics)
    * [.getExchangeRates(localFile, exchangeRates, callback)](#module_iTunesSpecifics.getExchangeRates)
    * [.readFile(localFile, callback)](#module_iTunesSpecifics.readFile)
    * [.getCurrency(string)](#module_iTunesSpecifics.getCurrency) ⇒ <code>string</code>
    * [.getRevenueTotalsByTerritory(data, callback)](#module_iTunesSpecifics.getRevenueTotalsByTerritory)
    * [.prepareExchangeRates(exchangeRates)](#module_iTunesSpecifics.prepareExchangeRates) ⇒ <code>object</code>

<a name="module_iTunesSpecifics.getExchangeRates"></a>

### iTunesSpecifics.getExchangeRates(localFile, exchangeRates, callback)
Gets exchange rates from the supplied Financial File

* Calls `callback(err, result, bankAccountCurrencies)` with
  * `result` containing the extracted exchange rates
  * `bankAccountCurrencies` containing all currencies required by the iTunes Sales Data file
* Calls `callback(err, result, bankAccountCurrencies)` with an `err` message if an error occurs

**Kind**: static method of [<code>iTunesSpecifics</code>](#module_iTunesSpecifics)  

| Param | Type | Description |
| --- | --- | --- |
| localFile | <code>string</code> | File path to data file |
| exchangeRates | <code>Array.&lt;object&gt;</code> | Exchange Rates from Sales File applied to client currencies |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_iTunesSpecifics.readFile"></a>

### iTunesSpecifics.readFile(localFile, callback)
Uses fileOpener to read the file and return tabulated data

* Calls `callback(err, data)` with `data` containing the tabulated data extracted from the file, starting at line 2
* Calls `callback(err, data)` with an `err` message if an error occurs

**Kind**: static method of [<code>iTunesSpecifics</code>](#module_iTunesSpecifics)  

| Param | Type | Description |
| --- | --- | --- |
| localFile | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_iTunesSpecifics.getCurrency"></a>

### iTunesSpecifics.getCurrency(string) ⇒ <code>string</code>
Extracts currency code from string

**Kind**: static method of [<code>iTunesSpecifics</code>](#module_iTunesSpecifics)  
**Returns**: <code>string</code> - currency code, e.g. "SEK", "Americas USD"  

| Param | Type | Description |
| --- | --- | --- |
| string | <code>string</code> | contains currency string obtained from file, e.g. "Sweden (SEK)", "Americas (USD)" |

<a name="module_iTunesSpecifics.getRevenueTotalsByTerritory"></a>

### iTunesSpecifics.getRevenueTotalsByTerritory(data, callback)
Gets revenue totals by Territory, used for iTunes Match files

* Calls `callback(err, result)` with `result` containing the Revenues per Territory

**Kind**: static method of [<code>iTunesSpecifics</code>](#module_iTunesSpecifics)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>array</code> | Sales Data |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_iTunesSpecifics.prepareExchangeRates"></a>

### iTunesSpecifics.prepareExchangeRates(exchangeRates) ⇒ <code>object</code>
Prepares the Exchange Rates, only selecting those that are set against the Home Currency, returning them structured as an object

**Kind**: static method of [<code>iTunesSpecifics</code>](#module_iTunesSpecifics)  
**Returns**: <code>object</code> - An object of Exchange Rates, e.g. { "USD": 1.128027, ... }  

| Param | Type | Description |
| --- | --- | --- |
| exchangeRates | <code>Array.&lt;object&gt;</code> | Exchange Rates from Sales File applied to client currencies |

