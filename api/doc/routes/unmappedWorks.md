<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [unmappedWorks](#unmappedWorks)
   - [/unmappedWorks/createWorks POST](#Create-multiple-Works-from-unmapped-works) - Create multiple Works from unmapped works

___


# <a name='unmappedWorks'></a> unmappedWorks

## <a name='Create-multiple-Works-from-unmapped-works'></a> Create multiple Works from unmapped works
[Back to top](#top)

```
POST /unmappedWorks/createWorks
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
  "created": ['620d443dc93571d21e2c527a', '620d443dc93573d21e2c587a'],
  "failed": ['6033962f73f953000f5a0655']
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
