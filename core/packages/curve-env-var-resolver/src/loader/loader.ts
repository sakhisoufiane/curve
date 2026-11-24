/* eslint-disable no-restricted-syntax */
import type { ConfigArray } from '../configs/applicationConfigurations.js';
import { getEnvVar, getEnvVarAWS } from '../resolver/index.js';

/**
 * Loads secrets based on the provided configuration array and injects them into process.env.
 * @param config - An array of secret configurations.
 */
export const injectSecrets = async (config: ConfigArray) => {
  const secrets = await getAllSecrets(config);
  const reducedSecrets = reduceSecrets(secrets);
  injectSecretsIntoProcessEnv(reducedSecrets);
};


/**
 * A function that retrieves all secrets based on the provided configuration array.
 * @param config - An array of application configurations.
 * @returns - A promise that resolves to an array of secret objects.
 */
const getAllSecrets = async (config: ConfigArray) => Promise.all(config.map(({ name, catchMissingAWSSecret }) => {
  if (catchMissingAWSSecret) {
    return getEnvVar(name).catch((err) => {
      // This isn't great, if the error message changes, this will break.
      if (err.message.includes('can\'t find the specified secret')) {
        console.debug(`Warning: Missing optional AWS Secret for ${name}, continuing...`);
      } else {
        throw err;
      }
    });
  } 
  return getEnvVar(name);
}));

/**
 * A function that retrieves and reduces secrets based on the provided configuration array. Only uses AWS Secrets Manager.
 * @param config - An array of secret configurations.
 * @returns - A promise that resolves to an object containing all the secrets.
 */
export const getAWSSecrets = async (config: ConfigArray) => {
  const secrets = await getAllAWSSecrets(config);
  const reducedSecrets = reduceSecrets(secrets);
  return reducedSecrets;
}

/**
 * A function that retrieves secrets based on the provided configuration array. Only uses AWS Secrets Manager.
 * @param config - An array of secret configurations.
 * @returns - A promise that resolves to an object containing all the secrets.
 */
const getAllAWSSecrets = async (config: ConfigArray) => Promise.all(config.map(({ name, catchMissingAWSSecret }) => {
  if (catchMissingAWSSecret) {
    return getEnvVarAWS(name).catch((err) => {
      // This isn't great, if the error message changes, this will break.
      if (err.message.includes('can\'t find the specified secret')) {
        console.debug(`Warning: Missing optional AWS Secret for ${name}, continuing...`);
      } else {
        throw err;
      }
    });
  } 
  return getEnvVarAWS(name);
}));

/**
 * Filters out undefined secrets and reduces the array of secret objects into a single object.
 * @param secrets - An array of secret objects.
 * @returns - A single object containing all the secrets merged together.
 */
const reduceSecrets = (secrets: Awaited<ReturnType<typeof getAllSecrets>>) => secrets
    .filter(x => x !== undefined)
    .reduce((total, currentSecret) => ({ ...total, ...currentSecret }), {})

/**
 * Injects the secrets into the process environment variables.
 * @param secrets - An object containing secret key-value pairs.
 */
const injectSecretsIntoProcessEnv = (secrets: Record<string, never>) => {
  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = value;
  }
}

// // Use this function to test loading secrets for all configurations
// // If it errors while logged into staging for example, then you know there's an issue
// // with one of the secrets in that environment.
// const testConfig = async () => {
//   for (const [configName, config] of Object.entries(configs)) {
//     const appSecrets = await loadSecrets(config);
//     // Uncomment to see loaded secrets
//     // console.log(`Loaded secrets for ${configName}:`, appSecrets);
//   }
// }