<a name="module_encryptionUtils"></a>

## encryptionUtils

* [encryptionUtils](#module_encryptionUtils)
    * [.getClientEncryptionKey(clientId, Client)](#module_encryptionUtils.getClientEncryptionKey) ⇒ <code>buffer</code>
    * [.decryptKey(encryptedKey)](#module_encryptionUtils.decryptKey) ⇒ <code>buffer</code>
    * [.encryptKey(key)](#module_encryptionUtils.encryptKey) ⇒ <code>string</code>
    * [.createKey()](#module_encryptionUtils.createKey) ⇒ <code>buffer</code>
    * [.deleteEncryptedFields(obj, encryptedFields, [user])](#module_encryptionUtils.deleteEncryptedFields) ⇒ <code>object</code>
    * [.clearEncryptedFields(obj, encryptedFields, [user])](#module_encryptionUtils.clearEncryptedFields) ⇒ <code>object</code>
    * [.isClientAdminUser(user)](#module_encryptionUtils.isClientAdminUser) ⇒ <code>boolean</code>
    * [.getObjectOrDocument(objOrDocument)](#module_encryptionUtils.getObjectOrDocument) ⇒ <code>object</code>
    * [.containsEncryptedFields(doc, encryptedFields)](#module_encryptionUtils.containsEncryptedFields) ⇒ <code>boolean</code>
    * [.encryptObject(obj, encryptionKey, encryptedFields)](#module_encryptionUtils.encryptObject) ⇒ <code>object</code>
    * [.encryptField(value, encryptionKey)](#module_encryptionUtils.encryptField) ⇒ <code>string</code>
    * [.decryptObject(obj, encryptionKey, encryptedFields)](#module_encryptionUtils.decryptObject) ⇒ <code>object</code>
    * [.decryptField(value, encryptionKey)](#module_encryptionUtils.decryptField) ⇒ <code>string</code> \| <code>object</code> \| <code>array</code>
    * [.getEncryptionKey(doc, Client)](#module_encryptionUtils.getEncryptionKey) ⇒ <code>string</code>

<a name="module_encryptionUtils.getClientEncryptionKey"></a>

### encryptionUtils.getClientEncryptionKey(clientId, Client) ⇒ <code>buffer</code>
Gets and decrypts client encryption key

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>buffer</code> - decrypted client encryption key Buffer  

| Param | Type | Description |
| --- | --- | --- |
| clientId | <code>string</code> | The client id |
| Client | <code>object</code> | The client model |

<a name="module_encryptionUtils.decryptKey"></a>

### encryptionUtils.decryptKey(encryptedKey) ⇒ <code>buffer</code>
Decrypts a key using the MASTER_ENCRYPTION_KEY

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>buffer</code> - decrypted key Buffer  

| Param | Type | Description |
| --- | --- | --- |
| encryptedKey | <code>string</code> | the encrypted key in hex format |

<a name="module_encryptionUtils.encryptKey"></a>

### encryptionUtils.encryptKey(key) ⇒ <code>string</code>
Encrypts a key using the MASTER_ENCRYPTION_KEY

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>string</code> - the encrypted key in hex format  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>buffer</code> | the key Buffer to encrypt |

<a name="module_encryptionUtils.createKey"></a>

### encryptionUtils.createKey() ⇒ <code>buffer</code>
Creates a random key with a byte length of 32

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>buffer</code> - random key Buffer  
<a name="module_encryptionUtils.deleteEncryptedFields"></a>

### encryptionUtils.deleteEncryptedFields(obj, encryptedFields, [user]) ⇒ <code>object</code>
Deletes encrypted fields included in the obj if the user is not authorised to update them

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>object</code> - the object provided, with encrypted fields deleted, if user not authorised to see encrypted fields  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> | The object to be checked and masked |
| encryptedFields | <code>array</code> | a list of encrypted fields names |
| [user] | <code>object</code> | Curve user |

<a name="module_encryptionUtils.clearEncryptedFields"></a>

### encryptionUtils.clearEncryptedFields(obj, encryptedFields, [user]) ⇒ <code>object</code>
Clears encrypted fields included in the obj if the user is not authorised to update them.
Use this for Mongoose documents as the values can not be deleted if defined in the Schema

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>object</code> - the object provided, with encrypted fields set to `undefined`, if user not authorised to see encrypted fields  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> | The object to be checked and masked |
| encryptedFields | <code>array</code> | a list of encrypted fields names |
| [user] | <code>object</code> | Curve user |

<a name="module_encryptionUtils.isClientAdminUser"></a>

### encryptionUtils.isClientAdminUser(user) ⇒ <code>boolean</code>
Returns true if user is a client admin user

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>boolean</code> - `true` if user is client admin  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>object</code> | Curve user |

<a name="module_encryptionUtils.getObjectOrDocument"></a>

### encryptionUtils.getObjectOrDocument(objOrDocument) ⇒ <code>object</code>
Returns the keys of either an object or Mongoose document object

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>object</code> - either original object supplied or for a Mongoose document, the object derived using `.toObject()`  

| Param | Type | Description |
| --- | --- | --- |
| objOrDocument | <code>object</code> | either a JavaScript object or Mongoose document object |

<a name="module_encryptionUtils.containsEncryptedFields"></a>

### encryptionUtils.containsEncryptedFields(doc, encryptedFields) ⇒ <code>boolean</code>
Checks if an object contains any properties referred to in encrypted fields list

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>boolean</code> - `true` if `doc` contains any properties in paths in `encryptedFields`  

| Param | Type | Description |
| --- | --- | --- |
| doc | <code>object</code> | object to process |
| encryptedFields | <code>array</code> | list of field paths to encrypt |

<a name="module_encryptionUtils.encryptObject"></a>

### encryptionUtils.encryptObject(obj, encryptionKey, encryptedFields) ⇒ <code>object</code>
Encrypt any object fields contained in the list of fields to encrypt

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>object</code> - the object with the applicable fields having been encrypted  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> | object to process |
| encryptionKey | <code>string</code> | encryption key to use for encryption |
| encryptedFields | <code>array</code> | list of fields to encrypt |

<a name="module_encryptionUtils.encryptField"></a>

### encryptionUtils.encryptField(value, encryptionKey) ⇒ <code>string</code>
Encrypt the provided value using the encryption key

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>string</code> - the encrypted string  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> \| <code>object</code> \| <code>array</code> | the value to encrypt |
| encryptionKey | <code>string</code> | encryption key to use for encryption |

<a name="module_encryptionUtils.decryptObject"></a>

### encryptionUtils.decryptObject(obj, encryptionKey, encryptedFields) ⇒ <code>object</code>
Decrypt any object fields contained in the list of fields to decrypt

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>object</code> - the object with the applicable fields having been decrypted  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> | object to process |
| encryptionKey | <code>string</code> | encryption key to use for encryption |
| encryptedFields | <code>array</code> | list of fields to encrypt |

<a name="module_encryptionUtils.decryptField"></a>

### encryptionUtils.decryptField(value, encryptionKey) ⇒ <code>string</code> \| <code>object</code> \| <code>array</code>
Decrypt the provided value using the encryption key

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>string</code> \| <code>object</code> \| <code>array</code> - the decrypted value  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | the string to decrypt |
| encryptionKey | <code>string</code> | encryption key to use for encryption |

<a name="module_encryptionUtils.getEncryptionKey"></a>

### encryptionUtils.getEncryptionKey(doc, Client) ⇒ <code>string</code>
Gets the encryption key from the document, either by looking at doc.clientId or doc.encryptionKey (for client documents)

**Kind**: static method of [<code>encryptionUtils</code>](#module_encryptionUtils)  
**Returns**: <code>string</code> - the encryption key  

| Param | Type | Description |
| --- | --- | --- |
| doc | <code>object</code> | the document to get the key from |
| Client | <code>object</code> | the Client model passed in |

