<a name="module_calculation"></a>

## calculation

* [calculation](#module_calculation)
    * [.startCalculation(rawLine, mappedLine, calculations, calculationTime, callback)](#module_calculation.startCalculation)
    * [.evaluateConditions(rawLine, mappedLine, calculation)](#module_calculation.evaluateConditions) ⇒ <code>boolean</code>
    * [.checkForExcelBooleanFormat(value)](#module_calculation.checkForExcelBooleanFormat) ⇒ <code>boolean</code>
    * [.checkComparison(value, compareTo, comparison)](#module_calculation.checkComparison) ⇒ <code>boolean</code>
    * [.performCalculation(rawLine, mappedLine, baseValue, calculation)](#module_calculation.performCalculation) ⇒ <code>number</code> \| <code>string</code>

<a name="module_calculation.startCalculation"></a>

### calculation.startCalculation(rawLine, mappedLine, calculations, calculationTime, callback)
Runs calculation on the Sales Line. Certain calculations only run when the method is called the 2nd time

* Calls `callback(err, mappedLine)` with `mappedLine` containing the modified Sales Line
* Calls `callback(err, mappedLine)` with an `err` message if an error occurs

**Kind**: static method of [<code>calculation</code>](#module_calculation)  

| Param | Type | Description |
| --- | --- | --- |
| rawLine | <code>array</code> | Raw unmodified Sales Line, as array |
| mappedLine | <code>object</code> | Sales Line mapped to an object |
| calculations | <code>Array.&lt;object&gt;</code> | Calculation definitions from template |
| calculationTime | <code>number</code> | Indicates if the calculation is run for the 1st(1) or 2nd time(2) |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_calculation.evaluateConditions"></a>

### calculation.evaluateConditions(rawLine, mappedLine, calculation) ⇒ <code>boolean</code>
Evaluations conditions to determine if calculation should run

**Kind**: static method of [<code>calculation</code>](#module_calculation)  
**Returns**: <code>boolean</code> - *true* if calculation should be run  

| Param | Type | Description |
| --- | --- | --- |
| rawLine | <code>array</code> | Raw unmodified Sales Line, as array |
| mappedLine | <code>object</code> | Sales Line mapped to an object |
| calculation | <code>Array.&lt;object&gt;</code> | Calculation definitions from template |

<a name="module_calculation.checkForExcelBooleanFormat"></a>

### calculation.checkForExcelBooleanFormat(value) ⇒ <code>boolean</code>
Formats Excel boolean value 'TRUE' opr 'FALSE' to js booleans, otherwise returns the value if not a boolean

**Kind**: static method of [<code>calculation</code>](#module_calculation)  
**Returns**: <code>boolean</code> - returns the formatted value  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>array</code> | value to evaluate |

<a name="module_calculation.checkComparison"></a>

### calculation.checkComparison(value, compareTo, comparison) ⇒ <code>boolean</code>
Translates written comparisons to JS comparisons and returns the result as a boolean

**Kind**: static method of [<code>calculation</code>](#module_calculation)  
**Returns**: <code>boolean</code> - Result of comparison  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>number</code> | Value to compare |
| compareTo | <code>string</code> \| <code>number</code> | Comparison value |
| comparison | <code>string</code> | String representation of comparison, e.g. "Greater Than or Equal To" |

<a name="module_calculation.performCalculation"></a>

### calculation.performCalculation(rawLine, mappedLine, baseValue, calculation) ⇒ <code>number</code> \| <code>string</code>
Performs calculation according to function contained in *calculation*

**Kind**: static method of [<code>calculation</code>](#module_calculation)  
**Returns**: <code>number</code> \| <code>string</code> - Calculation output  

| Param | Type | Description |
| --- | --- | --- |
| rawLine | <code>array</code> | Raw unmodified Sales Line, as array |
| mappedLine | <code>object</code> | Sales Line mapped to an object |
| baseValue | <code>number</code> \| <code>string</code> | Base value to start from |
| calculation | <code>object</code> | One of the calculations passed from template |

