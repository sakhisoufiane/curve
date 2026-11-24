<a name="module_utils"></a>

## utils

* [utils](#module_utils)
    * [.safeName(fileName)](#module_utils.safeName) ⇒ <code>string</code>
    * [.safeNameWithRandomString(fileName)](#module_utils.safeNameWithRandomString)

<a name="module_utils.safeName"></a>

### utils.safeName(fileName) ⇒ <code>string</code>
Sanitizes, replaces `/` with `-` and truncates to 130 characters

**Kind**: static method of [<code>utils</code>](#module_utils)  
**Returns**: <code>string</code> - - The safe name truncated to 130 characters  

| Param | Type | Description |
| --- | --- | --- |
| fileName | <code>string</code> | The string to process |

<a name="module_utils.safeNameWithRandomString"></a>

### utils.safeNameWithRandomString(fileName)
Sanitizes using `safeName` method, then adds a random string to the end of the sanitized string

**Kind**: static method of [<code>utils</code>](#module_utils)  

| Param | Type | Description |
| --- | --- | --- |
| fileName | <code>string</code> | The string to process * @returns {string} - The safe name plus a random string added at the end |

