<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [salesFiles](#salesFiles)
   - [/salesFiles/:id/additional_upload_complete PUT](#Add-uploaded-Financial-File-path-to-Sales-File) - Add uploaded Financial File path to Sales File
   - [/salesFiles/:id/upload_complete PUT](#Add-uploaded-Sales-File-path-to-Sales-File-and-[ingest]) - Add uploaded Sales File path to Sales File and [ingest]
   - [/salesFiles/archive_many/ GET](#Archive-multiple-Sales-Files) - Archive multiple Sales Files
   - [/salesFiles/ POST](#Create-Sales-File) - Create Sales File
   - [/salesFiles/bulk DELETE](#Delete-multiple-Sales-Files) - Delete multiple Sales Files
   - [/salesFiles/:id DELETE](#Delete-Sales-File) - Delete Sales File
   - [/salesFiles/:id/ignition_export/ GET](#Export-(Ignition)-Sales-File) - Export (Ignition) Sales File
   - [/salesFiles/export/ POST](#Export-multiple-Sales-Files) - Export multiple Sales Files
   - [/salesFiles/:id/history GET](#Get-history-for-Sales-File) - Get history for Sales File
   - [/salesFiles/ GET](#Get-multiple-Sales-Files) - Get multiple Sales Files
   - [/salesFiles/:id GET](#Get-Sales-File) - Get Sales File
   - [/salesFiles/:id/get_additional_file_upload_credentials PUT](#Get-upload-credentials-for-Financial-File) - Get upload credentials for Financial File
   - [/salesFiles/:id/get_upload_credentials PUT](#Get-upload-credentials-for-Sales-data-file) - Get upload credentials for Sales data file
   - [/salesFiles/:id PUT](#Save-Sales-File) - Save Sales File
   - [/salesFiles/bulk_ingest POST](#Trigger-ingest-task-for-multiple-Sales-Files) - Trigger ingest task for multiple Sales Files
   - [/salesFiles/:id/ingest POST](#Trigger-ingest-task-for-Sales-File) - Trigger ingest task for Sales File
   - [/salesFiles/bulk_revalidate POST](#Trigger-revalidate-task-for-multiple-Sales-Files) - Trigger revalidate task for multiple Sales Files
   - [/salesFiles/:id/revalidate POST](#Trigger-revalidate-task-for-Sales-File) - Trigger revalidate task for Sales File
   - [/salesFiles/unarchive_many/ GET](#Unarchive-multiple-Sales-Files) - Unarchive multiple Sales Files

___


# <a name='salesFiles'></a> salesFiles

## <a name='Add-uploaded-Financial-File-path-to-Sales-File'></a> Add uploaded Financial File path to Sales File
[Back to top](#top)

```
PUT /salesFiles/:id/additional_upload_complete
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| type | `String` |  Success type  |
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "type": "Complete",
  "message": "The file is successfully uploaded"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| BadRequest | File is missing |
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `BadRequest Response:`

```json
HTTP/1.1 400 BadRequest
{
  "errors": [ "Requires a file to be uploaded" ]
}
```

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Add-uploaded-Sales-File-path-to-Sales-File-and-[ingest]'></a> Add uploaded Sales File path to Sales File and [ingest]
[Back to top](#top)

```
PUT /salesFiles/:id/upload_complete
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| type | `String` |  Success type  |
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "type": "Complete",
  "message": "The file is successfully uploaded"
}
```

#### Success response example - `Success Ingest Response:`

```json
HTTP/1.1 200 OK
{
  "message": "File sent for ingestion"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| BadRequest | File is missing |
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `BadRequest Response:`

```json
HTTP/1.1 400 BadRequest
{
  "errors": [ "Requires a file to be uploaded" ]
}
```

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Archive-multiple-Sales-Files'></a> Archive multiple Sales Files
[Back to top](#top)

```
GET /salesFiles/archive_many/
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "Sale files successfully archived.",
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Create-Sales-File'></a> Create Sales File
[Back to top](#top)

```
POST /salesFiles/
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales File document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales File Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Delete-multiple-Sales-Files'></a> Delete multiple Sales Files
[Back to top](#top)

```
DELETE /salesFiles/bulk
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "Sales Files are being deleted, you will be notified once it is complete"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

## <a name='Delete-Sales-File'></a> Delete Sales File
[Back to top](#top)

```
DELETE /salesFiles/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales File document  |
| message | `String` |  201 Error message returned from salesFile.remove method  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales File Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Export-(Ignition)-Sales-File'></a> Export (Ignition) Sales File
[Back to top](#top)

```
GET /salesFiles/:id/ignition_export/
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "File being prepared to be sent",
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Export-multiple-Sales-Files'></a> Export multiple Sales Files
[Back to top](#top)

```
POST /salesFiles/export/
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "Your report will be sent to you via email shortly",
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

## <a name='Get-history-for-Sales-File'></a> Get history for Sales File
[Back to top](#top)

```
GET /salesFiles/:id/history
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| modelHistory | `Object[]` |  Array of update history entries  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "modelHistory":[
    {
      "ops": [
        {"op":"add","path":"/payeeCategories","value":[]},
        {"op":"add","path":"/name","value":"Payee 1"},
        {"op":"add","path":"/clientId","value":"5fff0b3f35c54f483cf1test"},
        {"op":"add","path":"/createdBy","value":"5f102d96774ddf120098test"},
        {"op":"add","path":"/lastModifiedBy","value":"5f102d96774ddf120098test"}
      ],
      "_id":"603d03d3e9ad836b5989test",
      "ref":"603d03d3e9ad836b5989test",
      "author":null,
      "timestamp":"2021-03-01T15:10:11.955Z",
      "__v":0
    }
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Get-multiple-Sales-Files'></a> Get multiple Sales Files
[Back to top](#top)

```
GET /salesFiles/
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| text | `String` | **optional**  Filter on supplied text string  |
| valid | `String` | **optional**  Filter on valid|invalid files (&quot;true&quot;, &quot;false&quot;)  |
| status | `String` | **optional**  Filter on status (&quot;Setup&quot;, &quot;Complete&quot;, &quot;Ingesting&quot;, &quot;Errored&quot;)  |
| reportedStatus | `String` | **optional**  Filter on reported status (&quot;Fully Reported&quot;, &quot;Partially Reported&quot;, &quot;Unreported&quot;)  |
| archived | `String` | **optional**  Filter on archived|unarchived files (&quot;true&quot;, &quot;false&quot;)  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| salesFiles | `Object[]` |  Array of sales files  |
| meta | `Object` |  Meta data  |
| meta.currentPage | `Number` |  Number of page returned  |
| meta.totalPages | `Number` |  Total number of pages  |
| meta.total | `Number` |  Number of sales files for client  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "salesFiles": [
    {
      "_id": "5fff0b3f35c54f483cf1test",
      "name": "Sales File 1 Name",
      ...
    },
    {
      "_id": "5c54f483cf15fff0b3f3test",
      "name": "Sales File 2 Name",
      ...
    },
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 1,
    "total": 23
  }
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Get-Sales-File'></a> Get Sales File
[Back to top](#top)

```
GET /salesFiles/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales File document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales File Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Get-upload-credentials-for-Financial-File'></a> Get upload credentials for Financial File
[Back to top](#top)

```
PUT /salesFiles/:id/get_additional_file_upload_credentials
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| completePath | `String` |  API path to be called on successful file upload  |
| credentials | `Object` |  S3 paths and credentials  |
| path | `String` |  Path to S3 upload destination  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "completePath": "/salesFiles/5fff0b3f35c54f483cf1test/additional_upload_complete",
  "credentials": { ... },
  "path": "/salesFiles/5fff0b3f35c54f483cf1test/additional_file_name.xls"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| BadRequest | File is missing |
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `BadRequest Response:`

```json
HTTP/1.1 400 BadRequest
{
  "errors": [ "Requires a file to be uploaded" ]
}
```

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Get-upload-credentials-for-Sales-data-file'></a> Get upload credentials for Sales data file
[Back to top](#top)

```
PUT /salesFiles/:id/get_upload_credentials
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| completePath | `String` |  API path to be called on successful file upload  |
| credentials | `Object` |  S3 paths and credentials  |
| path | `String` |  Path to S3 upload destination  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "completePath": "/salesFiles/5fff0b3f35c54f483cf1test/upload_complete",
  "credentials": { ... },
  "path": "/salesFiles/5fff0b3f35c54f483cf1test/sales_file_name.xls"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| BadRequest |  File is missing  |
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `BadRequest Response:`

```json
HTTP/1.1 400 BadRequest
{
  "errors": [ "Requires a file to be uploaded" ]
}
```

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Save-Sales-File'></a> Save Sales File
[Back to top](#top)

```
PUT /salesFiles/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales File document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales File Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Trigger-ingest-task-for-multiple-Sales-Files'></a> Trigger ingest task for multiple Sales Files
[Back to top](#top)

```
POST /salesFiles/bulk_ingest
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "Bulk ingestion of sales files triggered"
}
```

### Error response

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Trigger-ingest-task-for-Sales-File'></a> Trigger ingest task for Sales File
[Back to top](#top)

```
POST /salesFiles/:id/ingest
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "File sent for ingestion"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Trigger-revalidate-task-for-multiple-Sales-Files'></a> Trigger revalidate task for multiple Sales Files
[Back to top](#top)

```
POST /salesFiles/bulk_revalidate
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "Bulk revalidation of sales files triggered"
}
```

### Error response

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Trigger-revalidate-task-for-Sales-File'></a> Trigger revalidate task for Sales File
[Back to top](#top)

```
POST /salesFiles/:id/revalidate
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales File id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "File sent for revalidation"
}
```

### Error response

#### Error response - `Error 404`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Client could not be found |

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound |  Sales File could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Client not found"
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find SalesFile with ID 603d03d3e9ad836b5989test"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Unarchive-multiple-Sales-Files'></a> Unarchive multiple Sales Files
[Back to top](#top)

```
GET /salesFiles/unarchive_many/
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| message | `String` |  Success message  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "message": "Sale files successfully unarchived.",
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `Forbidden Response:`

```json
HTTP/1.1 403 Forbidden
{
  "message": "Forbidden"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```
