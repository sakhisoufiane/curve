<a name="top"></a>
# Curve Royalty Systems v1.0.0

Main API Documentation

 - [authenticate](#authenticate)
   - [/authenticate POST](#Authenticate) - Authenticate
   - [/authenticate/multi_factor POST](#Multi-Factor) - Multi Factor

___


# <a name='authenticate'></a> authenticate

## <a name='Authenticate'></a> Authenticate
[Back to top](#top)

```
POST /authenticate
```

### Success response example

#### Success response example - `Success Response (Multifactor Enabled) :`

```json
HTTP/1.1 200 OK
{
  success: true,
  multiFactorAuthentication: true,
  token: jwt
}
```

#### Success response example - `Success Response (Multifactor Disabled) :`

```json
HTTP/1.1 200 OK
{
   success: true,
   userType: payee|client|parent|internal,
   adminType: Admin|Standard,
   token: jwt,
   clientName: xyz,
   currencySymbol: $,
   clientType: xyz,
   features: list
}
```

## <a name='Multi-Factor'></a> Multi Factor
[Back to top](#top)

```
POST /authenticate/multi_factor
```

### Success response example

#### Success response example - `Success Response:`

```json
HTTP/1.1 200 OK
{
   success: true,
   userType: payee|client|parent|internal,
   adminType: Admin|Standard,
   token: jwt,
   clientName: xyz,
   currencySymbol: $,
   clientType: xyz,
   features: list
}
```
