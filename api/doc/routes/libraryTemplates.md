<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [libraryTemplates](#libraryTemplates)
   - [/libraryTemplates/:id/upload_complete PUT](#Add-uploaded-Sales-File-path-to-Library-Template) - Add uploaded Sales File path to Library Template
   - [/libraryTemplates/ POST](#Create-Library-Template) - Create Library Template
   - [/libraryTemplates/:id DELETE](#Delete-Library-Template) - Delete Library Template
   - [/libraryTemplates/:id/history GET](#Get-history-for-Library-Template) - Get history for Library Template
   - [/libraryTemplates/:id GET](#Get-Library-Template) - Get Library Template
   - [/libraryTemplates/ GET](#Get-multiple-Library-Templates) - Get multiple Library Templates
   - [/libraryTemplates/:id/get_upload_credentials PUT](#Get-upload-credentials-for-Sales-data-file) - Get upload credentials for Sales data file
   - [/libraryTemplates/:id PUT](#Save-Library-Template) - Save Library Template

___


# <a name='libraryTemplates'></a> libraryTemplates

## <a name='Add-uploaded-Sales-File-path-to-Library-Template'></a> Add uploaded Sales File path to Library Template
[Back to top](#top)

```
PUT /libraryTemplates/:id/upload_complete
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Library Template id  |

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
| NotFound |  Library Template could not be found  |

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

## <a name='Create-Library-Template'></a> Create Library Template
[Back to top](#top)

```
POST /libraryTemplates/
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
| none | `Object` |  Library Template object  |

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

## <a name='Delete-Library-Template'></a> Delete Library Template
[Back to top](#top)

```
DELETE /libraryTemplates/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Library Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Library Template object  |

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
| NotFound |  Library Template could not be found  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

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

## <a name='Get-history-for-Library-Template'></a> Get history for Library Template
[Back to top](#top)

```
GET /libraryTemplates/:id/history
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Library Template id  |

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
| Forbidden |  Only internal users can access the data  |
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

## <a name='Get-Library-Template'></a> Get Library Template
[Back to top](#top)

```
GET /libraryTemplates/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Library Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Library Template object  |

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
| Forbidden |  Only internal users can access the data  |
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

## <a name='Get-multiple-Library-Templates'></a> Get multiple Library Templates
[Back to top](#top)

```
GET /libraryTemplates/
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
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| libraryTemplates | `Object[]` | Array of Library Templates |
| meta | `Object` | Meta data |
| meta.currentPage | `Number` | Number of page returned |
| meta.totalPages | `Number` | Total number of pages |
| meta.total | `Number` | Number of Library Templates for client |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "libraryTemplates": [
    {
      "published": true,
      "_id": "45ee6e06013e9b5d0fa39c9f",
      "name": "Library Template 1 Name",
      "source": "Source 1",
      "createdAt": "2021-01-29T10:55:49.551Z"
    },
    {
      "published": "true",
      "_id": "e9b4d45ee6e006013fa39c77",
      "name": "Library Template 2 Name",
      "source": "Source 2",
      "createdAt": "2021-01-30T08:25:23.123Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 1,
    "total": 2
  }
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

## <a name='Get-upload-credentials-for-Sales-data-file'></a> Get upload credentials for Sales data file
[Back to top](#top)

```
PUT /libraryTemplates/:id/get_upload_credentials
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Library Template id  |

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
  "completePath": "/libraryTemplates/5fff0b3f35c54f483cf1test/upload_complete",
  "credentials": { ... },
  "path": "/libraryTemplates/5fff0b3f35c54f483cf1test/sales_file_name.xls"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| BadRequest |  File is missing  |
| NotFound |  Library Template could not be found  |

### Error response example

#### Error response example - `BadRequest Response:`

```json
HTTP/1.1 400 BadRequest
{
  "errors": [ "Requires a file to be uploaded" ]
}
```

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 Not Found
{
  "message": "Could not find Library Template with ID 3e9ad5989603d03d836btest"
}
```

## <a name='Save-Library-Template'></a> Save Library Template
[Back to top](#top)

```
PUT /libraryTemplates/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Library Template id  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| none | `Object` |  Library Template object  |

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
| Forbidden |  Only internal users can access the data  |
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
