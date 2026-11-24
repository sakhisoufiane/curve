<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [releases](#releases)
   - [/releases/:id/add_alias PUT](#Add-aliases-to-a-Release) - Add aliases to a Release
   - [/releases/add_bulk_aliases POST](#Add-aliases-to-multiple-Release-based-on-a-filter) - Add aliases to multiple Release based on a filter
   - [/releases/create_many POST](#Create-multiple-Releases) - Create multiple Releases
   - [/releases/ POST](#Create-new-Release) - Create new Release
   - [/releases DELETE](#Delete-single-or-bulk-Releases) - Delete single or bulk Releases
   - [/releases/export POST](#Export-Releases) - Export Releases
   - [/releases/:id/tracks GET](#Get-a-Release&#39;s-Tracks) - Get a Release&#39;s Tracks
   - [/releases/ GET](#Get-all-Releases) - Get all Releases
   - [/releases/:id/history GET](#Get-Releases&#39;s-edit-history) - Get Releases&#39;s edit history
   - [/releases/:id GET](#Get-single-Release) - Get single Release
   - [/releases/import POST](#Import-Releases) - Import Releases
   - [/releases/:id/inherit_track_mechanicals GET](#Inherit-mechanicals-from-linked-Tracks) - Inherit mechanicals from linked Tracks
   - [/releases/inherit_mechanicals_from_tracks POST](#Inherit-mechanicals-from-Tracks-for-multiple-Releases) - Inherit mechanicals from Tracks for multiple Releases
   - [/releases/pro_rata_contracts_from_tracks POST](#Pro-Rata-sales-and-costs-from-the-Tracks-for-multiple-Releases) - Pro Rata sales and costs from the Tracks for multiple Releases
   - [/releases/:id/pro_rata_track_contracts GET](#Pro-Rata-sales-and-costs-from-the-Tracks-linked-to-the-Release.) - Pro Rata sales and costs from the Tracks linked to the Release.
   - [/releases/:id PUT](#Update-single-Release) - Update single Release

___


# <a name='releases'></a> releases

## <a name='Add-aliases-to-a-Release'></a> Add aliases to a Release
[Back to top](#top)

```
PUT /releases/:id/add_alias
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Release ID  |

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
   message: "Alias added"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Release with ID |
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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
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

## <a name='Add-aliases-to-multiple-Release-based-on-a-filter'></a> Add aliases to multiple Release based on a filter
[Back to top](#top)

```
POST /releases/add_bulk_aliases
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
   message: "Completed Adding Aliases to Releases"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Release with ID |
| BadRequest | No aliases passed |
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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
}
```

#### Error response example - `BadRequest Response:`

```json
HTTP/1.1 400 BadRequest
{
  message: "Aliases are required to be passed"
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

## <a name='Create-multiple-Releases'></a> Create multiple Releases
[Back to top](#top)

```
POST /releases/create_many
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
  "created": [0, 1, 3, 4],
  "failed": [2, 5, 6]
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

## <a name='Create-new-Release'></a> Create new Release
[Back to top](#top)

```
POST /releases/
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
  "name": "New Release",
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

## <a name='Delete-single-or-bulk-Releases'></a> Delete single or bulk Releases
[Back to top](#top)

```
DELETE /releases
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
| NotFound | Could not find Release with ID |
| ReleaseAttachedToSalesFiles |  |
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
  message: "Could not find Releases"
}
```

#### Error response example - `ReleaseAttachedToSalesFiles Response:`

```json
HTTP/1.1 201 Created
{
  message: "Some or all of these releases are attached to Sales Files which will need to be deleted first"
}
```

#### Error response example - `ReleaseAttachedToSalesFiles Response:`

```json
HTTP/1.1 201 Created
[
  {
    name: 'Sales File Name',
    link: 'sales/61376be268ecbc20f2f97952/edit'
  }
]
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

## <a name='Export-Releases'></a> Export Releases
[Back to top](#top)

```
POST /releases/export
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

## <a name='Get-a-Release&#39;s-Tracks'></a> Get a Release&#39;s Tracks
[Back to top](#top)

```
GET /releases/:id/tracks
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Release ID  |

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
  tracks: [
    {
      _id: "5e1494037f08d7395fd35511",
      title: "Track 1",
    },
    {
      _id: "5e1494037f08d7395fd35512",
      title: "Track 2",
    },
    ...
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Release with ID |
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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
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

## <a name='Get-all-Releases'></a> Get all Releases
[Back to top](#top)

```
GET /releases/
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
| ids | `String[]` | **optional**  Filter by Release IDs  |
| catalogueGroups | `String[]` | **optional**  Filter by catalogue groups  |
| contractIds | `String[]` | **optional**  Filter by Contract IDs  |
| createdAfter | `Date` | **optional**  Filter by Release creation date  |
| createdBefore | `Date` | **optional**  Filter by Release creation date  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| releases | `Object[]` |  Array of Releases  |
| meta | `Object` |  Meta data  |
| meta.currentPage | `Number` |  Number of page returned  |
| meta.totalPages | `Number` |  Total number of pages  |
| meta.total | `Number` |  Total number of Releases  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "releases": [
    {
      _id: "5e1494037f08d7395fd31111",
      title: "Release 1",
      ...
    },
    {
      _id: "5e1494037f08d7395fd31112",
      title: "Release 2",
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

## <a name='Get-Releases&#39;s-edit-history'></a> Get Releases&#39;s edit history
[Back to top](#top)

```
GET /releases/:id/history
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Release ID  |

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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
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

## <a name='Get-single-Release'></a> Get single Release
[Back to top](#top)

```
GET /releases/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Release ID  |

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
  title: 'Release 1',
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Release with ID |
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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
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

## <a name='Import-Releases'></a> Import Releases
[Back to top](#top)

```
POST /releases/import
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
  message: "Releases are importing, and a report will be sent to you shortly."
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

## <a name='Inherit-mechanicals-from-linked-Tracks'></a> Inherit mechanicals from linked Tracks
[Back to top](#top)

```
GET /releases/:id/inherit_track_mechanicals
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Release ID  |

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
   release: {
      _id: "5e1494037f08d7395fd35511",
      title: 'Release 1',
      ...
   }
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Release with ID |
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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
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

## <a name='Inherit-mechanicals-from-Tracks-for-multiple-Releases'></a> Inherit mechanicals from Tracks for multiple Releases
[Back to top](#top)

```
POST /releases/inherit_mechanicals_from_tracks
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
   message: "Inherit Mechanicals started. You will be notificed shortly once it has completed."
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

## <a name='Pro-Rata-sales-and-costs-from-the-Tracks-for-multiple-Releases'></a> Pro Rata sales and costs from the Tracks for multiple Releases
[Back to top](#top)

```
POST /releases/pro_rata_contracts_from_tracks
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
   message: "Pro Rata Contracts started. You will be notificed shortly once it has completed."
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

## <a name='Pro-Rata-sales-and-costs-from-the-Tracks-linked-to-the-Release.'></a> Pro Rata sales and costs from the Tracks linked to the Release.
[Back to top](#top)

```
GET /releases/:id/pro_rata_track_contracts
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Release ID  |

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
  contracts: {
    salesReturnsRights: [
      { contractId: "5e1494037f08d7395fd31111", percentage: 10 },
      { contractId: "5e1494037f08d7395fd31112", percentage: 20 },
      ...
    ],
    costsRights: [
      { contractId: "5e1494037f08d7395fd31113", percentage: 30 },
      { contractId: "5e1494037f08d7395fd31114", percentage: 40 },
      ...
    ]
  }
 }
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Release with ID |
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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
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

## <a name='Update-single-Release'></a> Update single Release
[Back to top](#top)

```
PUT /releases/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Release ID  |

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
  title: "Release 1",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Release with ID |
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
  message: "Could not find Release with ID 5e1494037f08d7395fd31111"
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
