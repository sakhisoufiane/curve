<a name="module_client"></a>

## client

* [client](#module_client)
    * [~checkSalesFtpIngestions(salesFtpIngestions, callback)](#module_client..checkSalesFtpIngestions)
    * [~errorMessages(err, callback)](#module_client..errorMessages)

<a name="module_client..checkSalesFtpIngestions"></a>

### client~checkSalesFtpIngestions(salesFtpIngestions, callback)
Checks the salesFtpIngestions Array for valid IP or FQDN.

**Kind**: inner method of [<code>client</code>](#module_client)  

| Param | Type | Description |
| --- | --- | --- |
| salesFtpIngestions | <code>array</code> | The error to format. |
| callback | <code>function</code> | The callback that handles the response. |

<a name="module_client..errorMessages"></a>

### client~errorMessages(err, callback)
Formats an error message to a human readable format.

Calls callback(newMessages) with the formatted error [newMessages].

**Kind**: inner method of [<code>client</code>](#module_client)  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>object</code> | The error to format. |
| callback | <code>function</code> | The callback that handles the response. |

