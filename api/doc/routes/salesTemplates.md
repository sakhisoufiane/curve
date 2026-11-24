<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [salesTemplates](#salesTemplates)
   - [/salesTemplates/:id/upload_complete PUT](#Add-uploaded-Sales-File-path-to-Sales-Template) - Add uploaded Sales File path to Sales Template
   - [/salesTemplates/archive_many/ GET](#Archive-multiple-Sales-Templates) - Archive multiple Sales Templates
   - [/salesTemplates/ POST](#Create-Library-Template) - Create Library Template
   - [/salesTemplates/:id/add_to_library POST](#Create-Library-Template-from-Sales-Template) - Create Library Template from Sales Template
   - [/salesTemplates/create_from_library_template/:libraryTemplateId POST](#Create-Sales-Template-from-Library-Template) - Create Sales Template from Library Template
   - [/salesTemplates/:id DELETE](#Delete-Sales-Template) - Delete Sales Template
   - [/salesTemplates/:id/history GET](#Get-history-for-Sales-Template) - Get history for Sales Template
   - [/salesTemplates/ GET](#Get-multiple-Sales-Templates) - Get multiple Sales Templates
   - [/salesTemplates/:id GET](#Get-Sales-Template) - Get Sales Template
   - [/salesTemplates/:id/get_upload_credentials PUT](#Get-upload-credentials-for-Sales-data-file) - Get upload credentials for Sales data file
   - [/salesTemplates/:id PUT](#Save-Sales-Template) - Save Sales Template

___


# <a name='salesTemplates'></a> salesTemplates

## <a name='Add-uploaded-Sales-File-path-to-Sales-Template'></a> Add uploaded Sales File path to Sales Template
[Back to top](#top)

```
PUT /salesTemplates/:id/upload_complete
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales Template id  |

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
| BadRequest |  File is missing  |
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales Template could not be found  |

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
  "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Archive-multiple-Sales-Templates'></a> Archive multiple Sales Templates
[Back to top](#top)

```
GET /salesTemplates/archive_many/
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
  "message": "Sale templates successfully archived.",
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

## <a name='Create-Library-Template'></a> Create Library Template
[Back to top](#top)

```
POST /salesTemplates/
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
| none | `Object` |  Sales Template document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales Template Name",
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

## <a name='Create-Library-Template-from-Sales-Template'></a> Create Library Template from Sales Template
[Back to top](#top)

```
POST /salesTemplates/:id/add_to_library
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Library Template document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Library Template Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales Template could not be found  |

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
  "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Create-Sales-Template-from-Library-Template'></a> Create Sales Template from Library Template
[Back to top](#top)

```
POST /salesTemplates/create_from_library_template/:libraryTemplateId
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| libraryTemplateId | `String` |  Library Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales Template document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales Template Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Library Template could not be found  |

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
  "message": "Could not find Library Template with ID 3e9ad5989603d03d836btest"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Delete-Sales-Template'></a> Delete Sales Template
[Back to top](#top)

```
DELETE /salesTemplates/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales Template document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales Template Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales Template could not be found  |

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
  "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Get-history-for-Sales-Template'></a> Get history for Sales Template
[Back to top](#top)

```
GET /salesTemplates/:id/history
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales Template id  |

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
        {"op":"add","path":"/name","value":"Template 1"},
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
| NotFound |  Sales Template could not be found  |

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
  "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Get-multiple-Sales-Templates'></a> Get multiple Sales Templates
[Back to top](#top)

```
GET /salesTemplates/
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
| source | `String` | **optional**  Filter on Sales Template source, e.g. &quot;Apple&quot;  |
| createdAfter | `String` | **optional**  Return only Sales Templates created after createdAfter date (JavaScript date)  |
| createdBefore | `String` | **optional**  Return only Sales Templates created before createdBefore date (JavaScript date)  |
| archived | `String` | **optional**  Filter on archived/unarchived Templates (&quot;true&quot;, &quot;false&quot;)  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| salesTemplates | `Object[]` |  Array of Sales Templates  |
| meta | `Object` |  Meta data  |
| meta.currentPage | `Number` |  Number of page returned  |
| meta.totalPages | `Number` |  Total number of pages  |
| meta.total | `Number` |  Number of Sales Templates for client  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "salesTemplates": [
    {
      "_id": "5fff0b3f35c54f483cf1test",
      "name": "Sales Template 1 Name",
      ...
    },
    {
      "_id": "5c54f483cf15fff0b3f3test",
      "name": "Sales Template 2 Name",
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

## <a name='Get-Sales-Template'></a> Get Sales Template
[Back to top](#top)

```
GET /salesTemplates/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales Template document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales Template Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales Template could not be found  |

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
  "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
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
PUT /salesTemplates/:id/get_upload_credentials
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales Template id  |

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
  "completePath": "/salesTemplates/5fff0b3f35c54f483cf1test/upload_complete",
  "credentials": { ... },
  "path": "/salesTemplates/5fff0b3f35c54f483cf1test/sales_file_name.xls"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| BadRequest |  File is missing  |
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales Template could not be found  |

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
  "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```

## <a name='Save-Sales-Template'></a> Save Sales Template
[Back to top](#top)

```
PUT /salesTemplates/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Sales Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Sales Template document  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5fff0b3f35c54f483cf1test",
  "name": "Sales Template Name",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| Forbidden |  Only client users can access the data  |
| NotFound |  Sales Template could not be found  |

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
  "message": "Could not find Sales Template with ID 5989603d03d3e9ad836btest"
}
```

#### Error response example - `InternalServerError Response:`

```json
HTTP/1.1 500 Internal Server Error
{
  "message": "Internal error, please try again"
}
```
