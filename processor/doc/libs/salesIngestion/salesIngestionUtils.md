<a name="module_salesIngestionUtils"></a>

## salesIngestionUtils

* [salesIngestionUtils](#module_salesIngestionUtils)
    * [.fieldToFormat(value, fieldName, format)](#module_salesIngestionUtils.fieldToFormat) ⇒ <code>string</code> \| <code>number</code>
    * [.yearFromCharacters([year])](#module_salesIngestionUtils.yearFromCharacters) ⇒ <code>string</code>

<a name="module_salesIngestionUtils.fieldToFormat"></a>

### salesIngestionUtils.fieldToFormat(value, fieldName, format) ⇒ <code>string</code> \| <code>number</code>
Format input *value* according to *fieldName* and/or *format*

**Kind**: static method of [<code>salesIngestionUtils</code>](#module_salesIngestionUtils)  
**Returns**: <code>string</code> \| <code>number</code> - Formatted value  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>number</code> | Value to format |
| fieldName | <code>string</code> | Name assigned to field |
| format | <code>string</code> | Format assigned to field |

<a name="module_salesIngestionUtils.yearFromCharacters"></a>

### salesIngestionUtils.yearFromCharacters([year]) ⇒ <code>string</code>
Ensures date is formatted as 4 characters. If no date available will return the current year

**Kind**: static method of [<code>salesIngestionUtils</code>](#module_salesIngestionUtils)  
**Returns**: <code>string</code> - Year as 4 character string, e.g. "2018, "2021"  

| Param | Type | Description |
| --- | --- | --- |
| [year] | <code>string</code> | Year as string, e.g. "2018", "21" |

