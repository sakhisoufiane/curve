<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [composers](#composers)
   - [/composers DELETE](#Delete-single-or-bulk-Composers) - Delete single or bulk Composers

___


# <a name='composers'></a> composers

## <a name='Delete-single-or-bulk-Composers'></a> Delete single or bulk Composers
[Back to top](#top)

```
DELETE /composers
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
| NotFound | Could not find Composer with ID |
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
  message: "Could not find Composers"
}
```

#### Error response example - `ComposerAttachedToWork Response:`

```json
HTTP/1.1 201 Created
[
  {
    title: 'Work Title',
    link: 'works/61376be268ecbc20f2f97952/edit'
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
