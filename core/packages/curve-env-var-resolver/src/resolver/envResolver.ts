import { resolveAsync, type Resolver, type SimpleEnvSchema, type InferSimpleSchema } from 'node-env-resolver';
import { awsSecrets } from 'node-env-resolver-aws';
import { processEnv, dotenv } from 'node-env-resolver/resolvers';
import { ResolverConfigMap, type ResolverConfigMapType } from '../configs/secretTypes';

// This utility type flattens a union of object types into a single object type.
type FlattenUnion<T> = (
  T extends unknown ? (k: T) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// Type representing the union of the simplified schemas for the requested keys
type SimpleSchemaUnion<K extends keyof ResolverConfigMapType> = 
  InferSimpleSchema<ResolverConfigMapType[K]>;

// The final, single, merged object type
type MergedReturnType<K extends keyof ResolverConfigMapType> = 
  FlattenUnion<SimpleSchemaUnion<K>>;

/**
 * Retrieves the value of a secret/environment variable based on its key.
 * The key must exist in the ResolverConfigMap to ensure type safety and intellisense support.
 *
 * @example
 * ```typescript
 * import { getEnvVar } from 'curve-env-var-resolver';
 * const mongo = await getEnvVar('mongo');
 * console.log(mongo.DB_NAME); // string
 * console.log(mongo.DB_USER); // string
 * ```
 * 
 * @param key - the key of the secret/environment variable to retrieve.
 * @returns - the key-value of the secret/environment variable in a flattened object.
 */
async function getEnvVar<K extends keyof ResolverConfigMapType>(
  key: K
) {
  const resolverConfig = ResolverConfigMap[key];
  const envVar = await resolveAsync(
    {
      resolvers: [
        [dotenv(), resolverConfig],
        [processEnv(), resolverConfig],
        [awsSecrets({ secretId: key }), resolverConfig],
      ],
      options: { priority: 'first' }
    }
  );
  return envVar;
}

/**
 * Retrieves the value of a secret/environment variable with a specific schema configuration.
 * This schema configuration can be a little tricky to understand as it is built off of Jag's
 * node-env-resolver package's schema definition system. 
 * https://www.npmjs.com/package/node-env-resolver
 *
 * @example
 * ```typescript
 * import { getEnvVarWithConfig } from 'curve-env-var-resolver';
 * const envVar = await getEnvVarWithConfig('example-secret', { EXAMPLE_KEY: string({ optional: true }), ANOTHER_KEY: string() });
 * console.log(envVar.EXAMPLE_KEY); // string | undefined
 * console.log(envVar.ANOTHER_KEY); // string
 * ```
 * 
 * @param key - the key of the secret/environment variable to retrieve.
 * @param config - the schema configuration for the secret/environment variable.
 * @returns the key-value of the secret/environment variable in a flattened object.
 */
async function getEnvVarWithConfig <C extends SimpleEnvSchema> (
  key: string, config: C
)
 {
   const envVar = await resolveAsync(
    {
      resolvers: [
        [dotenv(), config],
        [processEnv(), config],
        [awsSecrets({ secretId: key }), config],
      ],
      options: { priority: 'first' }
    }
  );
  return envVar;
}

/**
 * A function that retrieves a secret/environment variable from AWS Secrets Manager based on its key.
 * The key must exist in the ResolverConfigMap to ensure type safety and intellisense support.
 * @param key - the key of the secret/environment variable to retrieve.
 * @returns - the key-value of the secret/environment variable in a flattened object.
 */
export async function getEnvVarAWS<K extends keyof ResolverConfigMapType>(
  key: K
) {
  const resolverConfig = ResolverConfigMap[key];
  const envVar = await resolveAsync(
    {
      resolvers: [
        [awsSecrets({ secretId: key }), resolverConfig],
      ],
      options: { priority: 'first' }
    }
  );
  return envVar;
}

/**
 * A function that retrieves a secret/environment variable from AWS Secrets Manager 
 * with a specific schema configuration based off of the passed in config.
 * The key is the secret ID in AWS Secrets Manager.
 * @param key - the key of the secret/environment variable to retrieve.
 * @param config - the schema configuration for the secret/environment variable.
 * @returns - the key-value of the secret/environment variable in a flattened object.
 */
export async function getEnvVarAWSWithConfig <C extends SimpleEnvSchema> (
  key: string, config: C
) 
 {
   const envVar = await resolveAsync(
    {
      resolvers: [
        [awsSecrets({ secretId: key }), config],
      ],
      options: { priority: 'first' }
    }
  );
  return envVar;
}

/**
 * Retrieves multiple secrets/environment variables based on their keys.
 * The keys must exist in the ResolverConfigMap to ensure type safety and intellisense support.
 * Due to limitations in node-env-resolver this is slow when retrieving many secrets at once,
 * so it is recommended to use this function sparingly and prefer to Promise.all() getEnvVar where possible.
 * 
 * @example
 * ```typescript
 * import { getEnvVars } from 'curve-env-var-resolver';
 * const envVars = await getEnvVars(['mongo', 's3']);
 * console.log(envVars.DB_NAME); // string (from mongo)
 * console.log(envVars.BUCKET_NAME); // string (from s3)
 * ```
 * @param keys - an array of keys of the secrets/environment variables to retrieve.
 * @returns - the combined key-value pairs of the secrets/environment variables in a flattened object.
 */
export async function getEnvVars<K extends keyof ResolverConfigMapType>(
  keys: K[]
): Promise<MergedReturnType<K>> {
  const totalConfig: Record<string, never> = {};
  const resolvers: [Resolver, SimpleEnvSchema][] = [ ];
  for (const key of keys) {
    // Get current key's configuration
    const resolverConfig = ResolverConfigMap[key];
    // Build the total config object
    Object.assign(totalConfig, resolverConfig);
    // Add the resolver to the array for AWS Secrets
    resolvers.push([awsSecrets({ secretId: key }), resolverConfig]);
  }
  resolvers.unshift([processEnv(), totalConfig]);
  resolvers.unshift([dotenv(), totalConfig]);

  const envVars = await resolveAsync(
    {
      resolvers,
      options: { priority: 'first' }
    }
  );
  return envVars as unknown as Promise<MergedReturnType<K>>;
};

type GetEnvVarFnType = typeof getEnvVar;
type GetEnvVarWithConfigFnType = typeof getEnvVarWithConfig;

function dualMemoise (
  fn1: GetEnvVarFnType,
  fn2: GetEnvVarWithConfigFnType,
  ttlMs: number
): {
  memoisedGetEnvVar: GetEnvVarFnType;
  memoisedGetEnvVarWithConfig: GetEnvVarWithConfigFnType;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = new Map<string, { value: any; expiresAt: number }>();

  return {
    memoisedGetEnvVar: <K extends keyof ResolverConfigMapType> (key: K) => {
      const now = Date.now();
      const cached = cache.get(key);

      if (cached && cached.expiresAt > now) {
        return cached.value;
      }

      const valuePromise = fn1(key);
      cache.set(key, {
        value: valuePromise,
        expiresAt: now + ttlMs,
      });

      return valuePromise;
    },
    memoisedGetEnvVarWithConfig: <C extends SimpleEnvSchema> (key: string, config: C) => {
      const now = Date.now();
      const cached = cache.get(key);

      if (cached && cached.expiresAt > now) {
        return cached.value;
      }

      const valuePromise = fn2(key, config);
      cache.set(key, {
        value: valuePromise,
        expiresAt: now + ttlMs,
      });

      return valuePromise;
    }
  };
}

const ttl15Minutes = 15 * 60 * 1000; // 15 minutes in milliseconds
export const memoisedFunctions = dualMemoise(getEnvVar, getEnvVarWithConfig, ttl15Minutes);
