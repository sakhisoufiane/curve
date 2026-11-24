# curve-env-var-resolver

A small utility that resolves environment configuration values for the Curve codebase. The resolver looks up values in this order:

1. .env files (using dotenv-style loading)
2. process.env
3. AWS Secrets Manager

Resolved secrets are cached after the first successful retrieval with a TTL of 15 minutes to reduce external calls.

## Installation

```bash
npm i @curveroyaltysystems/curve-env-var-resolver
```

## Basic usage

Import and call the resolver where you need configuration values:

```ts
import { getEnvVar } from 'curve-env-var-resolver';

// Intellisense-supported key lookup
const mongo = await getEnvVar('mongo');
// Intellisense-supported property access
const dbName = mongo.DB_NAME; 
```

## Generic usage

Import and call the resolver with a custom config schema:

```ts
import { getEnvVarWithConfig } from 'curve-env-var-resolver';
import { string, number } from 'node-env-resolver/validators';

const customConfigSchema = {
  MY_SECRET: {
    PROP_ONE: string(),
    PROP_TWO: number(),
    OPTIONAL_PROP: string({ optional: true }),
  },
};

const mySecret = await getEnvVarWithConfig('MY_SECRET', customConfigSchema);
const propOne = mySecret.PROP_ONE; // string
const propTwo = mySecret.PROP_TWO; // number
const optionalProp = mySecret.OPTIONAL_PROP; // string | undefined
```

The resolver will:
- Check the for KEY cached values first
- Look for KEY in loaded .env files
- If not found, check process.env.KEY
- If still not found, lookup the secret in AWS Secrets Manager
- Cache the resolved value for 15 minutes

## ResolverConfigMap

The ResolverConfigMap is the mapping used by the resolver to map the key you are requesting to the actual secret structure. This allows the resolver to know what properties to expect for each secret so we can ensure type safety and intellisense support.

**Important:** to add support for a new secret you must add a corresponding entry to the ResolverConfigMap. You will get a compile-time error if you try to resolve a key that is not in the map. For simplicity, all secrets are expected to be stored as JSON objects in AWS Secrets Manager and are the values of the objects are read in as strings.

You can mark properties as optional in the config map if they may not be present so the resolver does not throw an error when they are missing.

## Caching behavior

- When a key is resolved from AWS Secrets Manager, the value is cached in memory.
- Cache TTL is 15 minutes.
- During TTL window, subsequent calls return the cached value and do not call AWS.
- After TTL expiration, the next request re-fetches the secret and refreshes the cache.

## AWS setup

If the resolver needs to reach AWS Secrets Manager:

- Ensure the process has AWS credentials, usually by making sure you are logged into the AWS CLI and have a valid AWS_PROFILE.