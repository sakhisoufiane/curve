<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [contracts](#contracts)
   - [/contracts/:id/add_alias PUT](#Add-alias-to-a-Contract) - Add alias to a Contract
   - [/contracts/ POST](#Create-new-Contract) - Create new Contract
   - [/contracts/:id/file/:key DELETE](#Delete-a-file-from-a-Contract) - Delete a file from a Contract
   - [/contracts DELETE](#Delete-single-or-bulk-Contracts) - Delete single or bulk Contracts
   - [/contracts/export POST](#Export-Contracts) - Export Contracts
   - [/contracts/:id/flush_labels_to_catalogue GET](#Flush-Contract-onto-catalogue) - Flush Contract onto catalogue
   - [/contracts/:id/costs GET](#Get-a-single-Contract&#39;s-Costs) - Get a single Contract&#39;s Costs
   - [/contracts/:id/releases GET](#Get-a-single-Contract&#39;s-Releases) - Get a single Contract&#39;s Releases
   - [/contracts/:id/tracks GET](#Get-a-single-Contract&#39;s-Tracks) - Get a single Contract&#39;s Tracks
   - [/contracts/:id/works GET](#Get-a-single-Contract&#39;s-Works) - Get a single Contract&#39;s Works
   - [/contracts/ GET](#Get-all-Contracts) - Get all Contracts
   - [/contracts/:id/history GET](#Get-Contract&#39;s-edit-history) - Get Contract&#39;s edit history
   - [/contracts/:id/statuses GET](#Get-Contract&#39;s-statuses-by-Payee-ID) - Get Contract&#39;s statuses by Payee ID
   - [/contracts/:id/upload PUT](#Get-S3-upload-credentials-for-a-Contract) - Get S3 upload credentials for a Contract
   - [/contracts/:id GET](#Get-single-Contract) - Get single Contract
   - [/contracts/:id/future_transactions GET](#Get-single-Contract&#39;s-future-transactions) - Get single Contract&#39;s future transactions
   - [/contracts/:id/transactions GET](#Get-single-Contract&#39;s-transactions) - Get single Contract&#39;s transactions
   - [/contracts/import POST](#Import-Contracts) - Import Contracts
   - [/contracts/:id/upload_complete POST](#Save-files-against-Contract-on-upload) - Save files against Contract on upload
   - [/contracts/:id PUT](#Update-single-Contract) - Update single Contract

___


# <a name='contracts'></a> contracts

## <a name='Add-alias-to-a-Contract'></a> Add alias to a Contract
[Back to top](#top)

```
PUT /contracts/:id/add_alias
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Create-new-Contract'></a> Create new Contract
[Back to top](#top)

```
POST /contracts/
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
  "name": "New Contract",
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

## <a name='Delete-a-file-from-a-Contract'></a> Delete a file from a Contract
[Back to top](#top)

```
DELETE /contracts/:id/file/:key
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |
| key | `Object` |  S3 key  |

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
  type: "Complete",
  message: "The file is successfully deleted",
  files:
  [
    {
      key: "file1.xlsx",
      publicLink: "file 1 public link"
    },
    ...
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Delete-single-or-bulk-Contracts'></a> Delete single or bulk Contracts
[Back to top](#top)

```
DELETE /contracts
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
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contracts"
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

## <a name='Export-Contracts'></a> Export Contracts
[Back to top](#top)

```
POST /contracts/export
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

## <a name='Flush-Contract-onto-catalogue'></a> Flush Contract onto catalogue
[Back to top](#top)

```
GET /contracts/:id/flush_labels_to_catalogue
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
  message: "Flushing contracts onto catalogue"
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-a-single-Contract&#39;s-Costs'></a> Get a single Contract&#39;s Costs
[Back to top](#top)

```
GET /contracts/:id/costs
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

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
  associatedReleaseIds: ["5e1494037f08d7395fd35586", "5e1494037f08d7395fd35587", ..],
  associatedTrackIds: ["5e1494037f08d7395fd35588", "5e1494037f08d7395fd35589", ..],
  "costs": [
    {
      _id: "5e1494037f08d7395fd35511",
      title: "Release 1",
      ...
    },
    {
      _id: "5e1494037f08d7395fd35585",
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
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-a-single-Contract&#39;s-Releases'></a> Get a single Contract&#39;s Releases
[Back to top](#top)

```
GET /contracts/:id/releases
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

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
  "releases": [
    {
      _id: "5e1494037f08d7395fd35511",
      title: "Release 1",
      ...
    },
    {
      _id: "5e1494037f08d7395fd35585",
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
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-a-single-Contract&#39;s-Tracks'></a> Get a single Contract&#39;s Tracks
[Back to top](#top)

```
GET /contracts/:id/tracks
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

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
  "tracks": [
    {
      _id: "5e1494037f08d7395fd35511",
      title: "Release 1",
      ...
    },
    {
      _id: "5e1494037f08d7395fd35585",
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
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-a-single-Contract&#39;s-Works'></a> Get a single Contract&#39;s Works
[Back to top](#top)

```
GET /contracts/:id/works
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

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
  "works": [
    {
      _id: "5e1494037f08d7395fd35511",
      title: "Release 1",
      ...
    },
    {
      _id: "5e1494037f08d7395fd35585",
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
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-all-Contracts'></a> Get all Contracts
[Back to top](#top)

```
GET /contracts/
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
| payeeId | `String` | **optional**  Filter by PayeeId  |
| contractType | `String` | **optional**  Filter by Contract type  |
| ids | `String[]` | **optional**  Only return documents matching theser ids  |
| page | `Number` | **optional**  Page number to return  |
| limit | `Number` | **optional**  Number of items to return per page  |
| orderBy | `String` | **optional**  Column to order by  |
| orderDir | `String` | **optional**  Order direction (&quot;asc&quot;, &quot;desc&quot;)  |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| contracts | `Object[]` |  Array of Contracts  |
| meta | `Object` |  Meta data  |
| meta.currentPage | `Number` |  Number of page returned  |
| meta.totalPages | `Number` |  Total number of pages  |
| meta.total | `Number` |  Number of Sales Templates for client  |

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
  "contracts": [
    {
      _id: "5e1494037f08d7395fd35511",
      name: "Contract 1",
      ...
    },
    {
      _id: "5e1494037f08d7395fd35585",
      name: "Contract 2",
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

## <a name='Get-Contract&#39;s-edit-history'></a> Get Contract&#39;s edit history
[Back to top](#top)

```
GET /contracts/:id/history
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-Contract&#39;s-statuses-by-Payee-ID'></a> Get Contract&#39;s statuses by Payee ID
[Back to top](#top)

```
GET /contracts/:id/statuses
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
  statuses: [
    { name: 'Contract 1', balance: 999 },
    { name: 'Contract 2', balance: 1299 },
    ...
  ]
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

## <a name='Get-S3-upload-credentials-for-a-Contract'></a> Get S3 upload credentials for a Contract
[Back to top](#top)

```
PUT /contracts/:id/upload
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
  path: "path/file_to_upload.xlsx",
  credentials:
    {
     url: "https://curve-royalties-staging.s3-eu-west-1.amazonaws.com/",
     fields:
     {
       key: "contracts/5e1494037f08d7395fd35511/1616584064528/file_to_upload.xlsx",
       AWSAccessKeyId: "VKfA4ARWVO35GXN451MT",
       acl: "private",
       policy: "eyJleHBpcmF0vW9uIjoiMjAyMS0wMy0yNFQxNjowNzo0NC41MzFaIiwiY29uZGl0aW9ucyI6W3siYnVja2V0IjoiY3VydmUtcm95YWx0aWVzLXN0YWdpbmcifSxbInN0YXJ0cy13aXRoIiwiJGtleSIsImNvbnRyYWN0cy81ZTE0OTQwMzdmMDhkNzM5NWZkMzU1ODQvMTYxNjU4NDA2NDUyOC9EYXRhRG9rdG9yIEZhaWxlZCBDaGVja3VwIC0gUmVsZWFzZXMgLSBUaHUgTWFyIDE4IDIwMjEgMTFfNThfNDAgR01UKzAxMDAgKEdNVCswMV8wMCkgLnhsc3giXSx7ImFjbCI6InByaXZhdGUifSx7InN1Y2Nlc3NfYWN0aW9uX3N0YXR1cyI6IjIwMSJ9LFsic3RhcnRzLXdpdGgiLCIkQ29udGVudC1UeXBlIiwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3Vt4W50LnNwcmVhZHNoZWV0bWwuc2hlZXQiXSxbImNvbnRlbnQtbGVuZ3RoLXJhbmdlIiwwLDEwMDAwNDg1NzYwYV19",
       signature: "/fO0uxrzVuVtkKsACrX4Wv7CP+Q=",
       Content-Type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
       success_action_status:201
      }
     },
     completePath: "/contracts/5e1494037f08d7395fd35511/upload_complete",
     fileName: "file_to_upload.xlsx"
    }
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
| BadRequest | No file uploaded |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
}
```

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

## <a name='Get-single-Contract'></a> Get single Contract
[Back to top](#top)

```
GET /contracts/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
  name: 'Contract 1',
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-single-Contract&#39;s-future-transactions'></a> Get single Contract&#39;s future transactions
[Back to top](#top)

```
GET /contracts/:id/future_transactions
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
  transactions: [
    {
      amount: 10,
      _id: "5e39976b8864e10e7c1bb6a1",
      balance: 10,
      ...
    },
    {
      amount: 20,
      _id: "5e39976b8864e10e7c1bb6a2",
      balance: 20,
      ...
    },
    ...
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Get-single-Contract&#39;s-transactions'></a> Get single Contract&#39;s transactions
[Back to top](#top)

```
GET /contracts/:id/transactions
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
  transactions: [
    {
      amount: 10,
      _id: "5e39976b8864e10e7c1bb6a1",
      balance: 10,
      ...
    },
    {
      amount: 20,
      _id: "5e39976b8864e10e7c1bb6a2",
      balance: 20,
      ...
    },
    ...
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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

## <a name='Import-Contracts'></a> Import Contracts
[Back to top](#top)

```
POST /contracts/import
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
  message: "Contracts are importing, and a report will be sent to you shortly."
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

## <a name='Save-files-against-Contract-on-upload'></a> Save files against Contract on upload
[Back to top](#top)

```
POST /contracts/:id/upload_complete
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
  type: "Complete",
  message: "The file is successfully uploaded",
  files:
  [
    {
      key: "file1.xlsx",
      publicLink: "file 1 public link"
    },
    ...
  ]
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
| BadRequest | No file uploaded |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
}
```

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

## <a name='Update-single-Contract'></a> Update single Contract
[Back to top](#top)

```
PUT /contracts/:id
```

### Headers - `Header`

| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
| applicationToken | `String` | <ul> <li>Unique token for api</li> </ul> |
| token | `String` | <ul> <li>Users unique access token</li> </ul> |

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `String` |  Contract ID  |

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
  name: "Contract 1",
  ...
}
```

### Error response

#### Error response - `Error 4xx`

| Name     | Description                           |
|----------|---------------------------------------|
| NotFound | Could not find Contract with ID |
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
  message: "Could not find Contract with ID 5e1494037f08d7395fd35511"
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
