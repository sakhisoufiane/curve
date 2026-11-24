<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [tracks](#tracks)
   - [/tracks/create_many POST](#Create-multiple-Tracks) - Create multiple Tracks

___


# <a name='tracks'></a> tracks

## <a name='Create-multiple-Tracks'></a> Create multiple Tracks
[Back to top](#top)

```
POST /tracks/create_many
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
