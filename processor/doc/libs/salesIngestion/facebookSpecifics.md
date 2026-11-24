<a name="module_facebookSpecifics"></a>

## facebookSpecifics

* [facebookSpecifics](#module_facebookSpecifics)
    * [.getPerProductionRates(localFile, callback)](#module_facebookSpecifics.getPerProductionRates)
    * [.readFile(localFile, callback)](#module_facebookSpecifics.readFile)

<a name="module_facebookSpecifics.getPerProductionRates"></a>

### facebookSpecifics.getPerProductionRates(localFile, callback)
Extracts Per Production Rates from Facebook Financial File

* Calls `callback(err, rates)` with `rates` containing the extracted Per Production Rates, e.g. {"AR":0.0010846872761023025, "AU":0.0062251494203212, ...}
* Calls `callback(err, rates)` with an `err` message if an error occurs

**Kind**: static method of [<code>facebookSpecifics</code>](#module_facebookSpecifics)  

| Param | Type | Description |
| --- | --- | --- |
| localFile | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_facebookSpecifics.readFile"></a>

### facebookSpecifics.readFile(localFile, callback)
Uses fileOpener to read the file and return tabulated data

* Calls `callback(err, data)` with `data` containing the tabulated data extracted from the file, starting at line 6
* Calls `callback(err, data)` with an `err` message if an error occurs

**Kind**: static method of [<code>facebookSpecifics</code>](#module_facebookSpecifics)  

| Param | Type | Description |
| --- | --- | --- |
| localFile | <code>string</code> | File path to data file |
| callback | <code>function</code> | A callback that handles the response |

