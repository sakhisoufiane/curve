<a name="module_track"></a>

## track

* [track](#module_track)
    * [~mergeSalesLines(convertedReleases)](#module_track..mergeSalesLines) ⇒ <code>Array.&lt;object&gt;</code>
    * [~mergeContractLines(contracts)](#module_track..mergeContractLines) ⇒ <code>Array.&lt;object&gt;</code>
    * [~errorMessages(err, callback)](#module_track..errorMessages)

<a name="module_track..mergeSalesLines"></a>

### track~mergeSalesLines(convertedReleases) ⇒ <code>Array.&lt;object&gt;</code>
Merges sales lines for each of the converted Tracks.

Calls callback(err, mergedSalesLines) with an [err] if an error occurs and the [mergedSalesLines].

**Kind**: inner method of [<code>track</code>](#module_track)  
**Returns**: <code>Array.&lt;object&gt;</code> - mergedSalesLines - Returns the merged sales lines.  

| Param | Type | Description |
| --- | --- | --- |
| convertedReleases | <code>Array.&lt;object&gt;</code> | The converted Releases to merge. |

<a name="module_track..mergeContractLines"></a>

### track~mergeContractLines(contracts) ⇒ <code>Array.&lt;object&gt;</code>
Merges duplicate contract lines.

**Kind**: inner method of [<code>track</code>](#module_track)  
**Returns**: <code>Array.&lt;object&gt;</code> - mergedContractLines - The merged contract lines.  

| Param | Type | Description |
| --- | --- | --- |
| contracts | <code>Array.&lt;object&gt;</code> | The Contract lines to merge. |

<a name="module_track..errorMessages"></a>

### track~errorMessages(err, callback)
Formats an error message to a human readable format.

Calls callback(null, newMessages) with the formatted error [newMessages].

**Kind**: inner method of [<code>track</code>](#module_track)  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>object</code> | The error to format. |
| callback | <code>function</code> | The callback that handles the response. |

