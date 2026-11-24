<a name="module_fileManager"></a>

## fileManager

* [fileManager](#module_fileManager)
    * _static_
        * [.downloadFromS3(key, bucket, options, cb)](#module_fileManager.downloadFromS3)
        * [.copyS3File(sourceKey, destKey, callback)](#module_fileManager.copyS3File)
    * _inner_
        * [~uploadReadableStream(params)](#module_fileManager..uploadReadableStream)
        * [~runUpload(opts, callback)](#module_fileManager..runUpload)
        * [~actionUpload(opts, callback)](#module_fileManager..actionUpload)

<a name="module_fileManager.downloadFromS3"></a>

### fileManager.downloadFromS3(key, bucket, options, cb)
Downloads a file from S3 storage and return a temporary local file

* Calls `callback(err, localFile)` with `localFile` containing the path to the local file
* Calls `callback(err, localFile)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileManager</code>](#module_fileManager)  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | path to file on S3 storage |
| bucket | <code>string</code> | S3 bucket path |
| options | <code>object</code> | Options |
| cb | <code>function</code> | A callback that handles the response |

<a name="module_fileManager.copyS3File"></a>

### fileManager.copyS3File(sourceKey, destKey, callback)
Copies a S3 storage file to another S3 storage destination

* Calls `callback(err, response)` with `response` containing the data retuned by AWS.copyObject
* Calls `callback(err, response)` with an `err` message if an error occurs

**Kind**: static method of [<code>fileManager</code>](#module_fileManager)  

| Param | Type | Description |
| --- | --- | --- |
| sourceKey | <code>\*</code> | Key of the file to copy |
| destKey | <code>\*</code> | Destination key |
| [options.sourceBucket] | <code>\*</code> | source bucket, if not supplied will use bucket defined in env |
| [options.destBucket] | <code>\*</code> | destination bucket, if not supplied will use bucket defined in env |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileManager..uploadReadableStream"></a>

### fileManager~uploadReadableStream(params)
Uploads a single file stream to s3 bucket

* Returns: Promise

**Kind**: inner method of [<code>fileManager</code>](#module_fileManager)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>object</code> | AWS upload parameters |
| params.Bucket | <code>string</code> | s3 bucket where file should be uploaded |
| params.Key | <code>string</code> | s3 key where file should be uploaded |
| params.Body | <code>object</code> | file stream object |
| params.ACL | <code>string</code> | Optional setting defining access to uploaded file |

<a name="module_fileManager..runUpload"></a>

### fileManager~runUpload(opts, callback)
Uploads a single file from local tmp for to s3 bucket

* Calls `callback(err, key)` with `key` containing the aws key
* Calls `callback(err, key)` with an `err` message if an error occurs

**Kind**: inner method of [<code>fileManager</code>](#module_fileManager)  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>object</code> | Query options |
| opts.key | <code>string</code> | s3 key where file should be uploaded |
| opts.localPath | <code>string</code> | Full local path of file to be uploaded |
| opts.makePublic | <code>boolean</code> | State whether s3 link be public |
| callback | <code>function</code> | A callback that handles the response |

<a name="module_fileManager..actionUpload"></a>

### fileManager~actionUpload(opts, callback)
Check if file to be uploaded is present. Makes 2 staggered attempts

* Calls `callback(err, key)` with `key` containing the aws key
* Calls `callback(err, key)` with an `err` message if an error occurs

**Kind**: inner method of [<code>fileManager</code>](#module_fileManager)  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>object</code> | Query options |
| opts.key | <code>string</code> | s3 key where file should be uploaded |
| opts.localPath | <code>string</code> | Full local path of file to be uploaded |
| opts.makePublic | <code>boolean</code> | State whether s3 link be public |
| callback | <code>function</code> | A callback that handles the response |

