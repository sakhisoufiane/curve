<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [payees](#payees)
   - [/payees/bulk DELETE](#Bulk-delete-Payees) - Bulk delete Payees
   - [/payees/ POST](#Create-new-Payee) - Create new Payee
   - [/payees/:id DELETE](#Delete-a-single-Payee) - Delete a single Payee
   - [/payees/export POST](#Export-Payees) - Export Payees
   - [/payees/:id/summary GET](#Get-a-Payee&#39;s-royalties-summary) - Get a Payee&#39;s royalties summary
   - [/payees/:id/analytics GET](#Get-a-Payee&#39;s-statements-analytics) - Get a Payee&#39;s statements analytics
   - [/payees/:id/users GET](#Get-all-Payee&#39;s-Users) - Get all Payee&#39;s Users
   - [/payees/ GET](#Get-all-Payees) - Get all Payees
   - [/payees/:id/history GET](#Get-Payee&#39;s-edit-history) - Get Payee&#39;s edit history
   - [/payees/:id GET](#Get-single-Payee) - Get single Payee
   - [/payees/import POST](#Import-Payees) - Import Payees
   - [/payees/:id PUT](#Update-single-Payee) - Update single Payee

___


# <a name='payees'></a> payees

## <a name='Bulk-delete-Payees'></a> Bulk delete Payees
[Back to top](#top)

```
DELETE /payees/bulk
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
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  deletedCount: 1,
  n: 1,
  ok: 1,
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Payee with ID |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 NotFound
{
  message: "Could not find Payees"
}
```

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

## <a name='Create-new-Payee'></a> Create new Payee
[Back to top](#top)

```
POST /payees/
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
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "_id": "5e1494037f08d7395fd35511",
  "name": "New Payee",
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

## <a name='Delete-a-single-Payee'></a> Delete a single Payee
[Back to top](#top)

```
DELETE /payees/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Payee ID to delete  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  _id: "5e1494037f08d7395fd35511",
  name: "Payee 1",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Payee with ID |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 NotFound
{
  message: "Could not find Payee with ID 5e1494037f08d7395fd35511"
}
```

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

## <a name='Export-Payees'></a> Export Payees
[Back to top](#top)

```
POST /payees/export
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
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  message: "Your report will be sent to you via email shortly"
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

## <a name='Get-a-Payee&#39;s-royalties-summary'></a> Get a Payee&#39;s royalties summary
[Back to top](#top)

```
GET /payees/:id/summary
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Payee ID  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  _id: '5e1494037f08d7395fd31111',
  name: 'Payee Name',
  totalRevenuesToDate: 12220,
  totalCostsToDate: 8990
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Payee with ID |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 NotFound
{
  message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
}
```

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

## <a name='Get-a-Payee&#39;s-statements-analytics'></a> Get a Payee&#39;s statements analytics
[Back to top](#top)

```
GET /payees/:id/analytics
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Payee ID  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  net:{
    distributionChannels: [...],
    configurations: [...],
    territories: [...],
    sources: [...],
    subSources: [...],
    costs: [...]
  },
  overTime: {
    data: [ [...], [...], ...],
    labels: [...]
  }
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Payee with ID |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 NotFound
{
  message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
}
```

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

## <a name='Get-all-Payee&#39;s-Users'></a> Get all Payee&#39;s Users
[Back to top](#top)

```
GET /payees/:id/users
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Payee ID  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| payees | `Object[]` |  Array of Payees  |
| meta | `Object` |  Meta data  |
| meta.currentPage | `Number` |  Number of page returned  |
| meta.totalPages | `Number` |  Total number of pages  |
| meta.total | `Number` |  Total number of Payees  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "users": [
    {
      _id: "5e1494037f08d7395fd31111",
      email: "user1@email.com",
      ...
    },
    {
      _id: "5e1494037f08d7395fd31112",
      email: "user2@email.com",
      ...
    },
    ...
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 1,
    "total": 25
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

## <a name='Get-all-Payees'></a> Get all Payees
[Back to top](#top)

```
GET /payees/
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
| name | `String` | **optional**  Filter by Payee name  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| payees | `Object[]` |  Array of Payees  |
| meta | `Object` |  Meta data  |
| meta.currentPage | `Number` |  Number of page returned  |
| meta.totalPages | `Number` |  Total number of pages  |
| meta.total | `Number` |  Total number of Payees  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "payees": [
    {
      _id: "5e1494037f08d7395fd31111",
      name: "Payee 1",
      ...
    },
    {
      _id: "5e1494037f08d7395fd31112",
      name: "Payee 2",
      ...
    },
    ...
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 1,
    "total": 25
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

## <a name='Get-Payee&#39;s-edit-history'></a> Get Payee&#39;s edit history
[Back to top](#top)

```
GET /payees/:id/history
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Payee ID  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  modelHistory: [
    {
      author: 'Author Name'
      ops: [{op: "replace", path: "/lastModifiedBy", value: "600ff2f8d497a0001b460d6d",…},…]
      ref: "5e1493ff7f08d7395fd354ef"
      timestamp: "2021-03-24T09:28:56.839Z"
      __v: 0
      _id: "605b0658770577c1ad08797e"
    },
    ...
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Payee with ID |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 NotFound
{
  message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
}
```

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

## <a name='Get-single-Payee'></a> Get single Payee
[Back to top](#top)

```
GET /payees/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Payee ID  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  _id: "5e1494037f08d7395fd35511",
  name: 'Payee 1',
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Payee with ID |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 NotFound
{
  message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
}
```

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

## <a name='Import-Payees'></a> Import Payees
[Back to top](#top)

```
POST /payees/import
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
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  message: "Payees are importing, and a report will be sent to you shortly."
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| BadRequest | No file uploaded |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `BadRequest Response:`

```json
HTTP/1.1 400 BadRequest
{
  errors: ["Requires a file to be uploaded"]
}
```

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

## <a name='Update-single-Payee'></a> Update single Payee
[Back to top](#top)

```
PUT /payees/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Payee ID  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| Success | `json` | Response |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  _id: "5e1494037f08d7395fd35511",
  name: "Payee 1",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Payee with ID |
| Forbidden |  Only client users can access the data  |

#### Error response - `Error 500`

| Name     | Description                           |
|----------|---------------------------------------|
| InternalServerError |  Server encountered an internal error  |

### Error response example

#### Error response example - `NotFound Response:`

```json
HTTP/1.1 404 NotFound
{
  message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
}
```

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
