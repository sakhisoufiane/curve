<a name="module_encryptionPlugin"></a>

## encryptionPlugin
Encryption plugin for use with mongoose models


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| schema | <code>object</code> |  | The schema |
| options | <code>object</code> |  | Plugin options |
| [options.encryptedFields] | <code>Array.&lt;string&gt;</code> |  | A list of fields to encrypt. Default is to encrypt all fields. |
| [options.decryptPostSave] | <code>boolean</code> | <code>true</code> | Whether to automatically decrypt documents in the application after saving them (faster if false) |
| [options.Client] | <code>object</code> |  | Client model |

