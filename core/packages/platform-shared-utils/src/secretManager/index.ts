import { SecretsManagerClient, GetSecretValueCommand , ResourceNotFoundException } from '@aws-sdk/client-secrets-manager';

let client: SecretsManagerClient;

async function getAPISecrets(): Promise<object> {
  const result = await Promise.all([
    getSecret('exchangeRate'),
    getSecret('s3'),
    getSecret('captcha'),
    getSecret('sendgrid'),
    getSecret('sqs'),
    getSecret('mongo'),
    getSecret('bigQuery'),
    getSecret('cryptography'),
    getSecret('spotify'),
    getSecret('wise'),
    getSecret('tasks'),
    getSecret('payments'),
    getSecret('fuga').catch(optionalSecretCatch),
    getSecret('hubspot').catch(optionalSecretCatch),
    getSecret('tipalti').catch(optionalSecretCatch),
    getSecret('api/settings'),
  ]);
  return bundleSecrets(result);
};

async function getProcessorSecrets(): Promise<object> {
  const result = await Promise.all([
    getSecret('exchangeRate'),
    getSecret('s3'),
    getSecret('sendgrid'),
    getSecret('sqs'),
    getSecret('mongo'),
    getSecret('bigQuery'),
    getSecret('cryptography'),
    getSecret('fuga'),
    getSecret('copyClient').catch(optionalSecretCatch),
    getSecret('platform').catch(optionalSecretCatch),
    getSecret('dmp').catch(optionalSecretCatch),
    getSecret('processor/settings'),
  ]);
  return bundleSecrets(result);
};

export async function getFrontEndSecrets(): Promise<object> {
  const result = await Promise.all([
    getSecret('s3'),
    getSecret('captcha'),
    getSecret('azure'),
    getSecret('app/settings'),
  ]);
  return bundleSecrets(result);
};

async function getPlaiyUISecrets(): Promise<object> {
  return getSecret('plaiy-ui');
};

async function getPlaiyAPISecrets(): Promise<object> {
  return getSecret('plaiy-api');
};

async function getImportsSecrets(): Promise<object> {
  const result = await Promise.all([
    getSecret('s3'),
    getSecret('mongo'),
    getSecret('sendgrid'),
    getSecret('imports/settings'),
  ]);
  return bundleSecrets(result);
};

async function getIngestionBoxSecrets(): Promise<object> {
  const result = await Promise.all([
    getSecret('s3'),
    getSecret('mongo'),
    getSecret('sendgrid'),
    getSecret('captcha'),
    getSecret('azure'),
    getSecret('cryptography'),
    getSecret('exchangeRate'),
    getSecret('sqs'),
    getSecret('tasks'),
    getSecret('fuga'),
    getSecret('bigQuery'),
    getSecret('spotify'),
    getSecret('payments'),
    getSecret('wise'),
    getSecret('ingestion-box/settings'),
  ]);
  return bundleSecrets(result);
};  

async function getPlatformAPISecrets(): Promise<object> {
  const result = await Promise.all([
    getSecret('mongo'),
    getSecret('platform-api/settings'),
  ]);
  return bundleSecrets(result);
};

async function getPaymentsSecrets(): Promise<object> {
  return getSecret('payments/settings');
};

async function getHeartbeatSecrets(): Promise<object> {
  const result = await Promise.all([
    getSecret('mongo'),
    getSecret('cloudwatch'),
    getSecret('s3'),
    getSecret('sqs'),
    getSecret('jira'),
    getSecret('heartbeat/vpc'),
    getSecret('heartbeat/settings'),
  ]);
  return bundleSecrets(result);
}

/**
 * Bundles multiple secret objects into a single object.
 * @param secrets An array of secret objects to bundle.
 * @returns A single object containing all bundled secrets.
 */
function bundleSecrets(secrets: object[]) {
  return secrets.reduce((acc, secret) => ({ ...acc, ...secret }), {});
};

/**
 * Catches optional secrets that may not exist by checking if the error is a ResourceNotFoundException.
 * @param err The error object thrown by the AWS SDK.
 * @returns An empty object if the secret is not found, or rethrows the error.
 */
function optionalSecretCatch(err: ResourceNotFoundException) {
  if (err.name === 'ResourceNotFoundException') {
    return {};
  }
  // If it's a different error, rethrow it
  throw err;
};

/**
 * Retrieves a secret from AWS Secrets Manager.
 * @param secretName The name of the secret to retrieve from AWS Secrets Manager.
 * @returns The secret value as an object.
 */
async function getSecret(secretName: string): Promise<object> {
  if (!client) {
    client = new SecretsManagerClient();
  }

  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  
  if (response?.SecretString) {
    return JSON.parse(response.SecretString);
  }
  throw new Error(`Secret ${secretName} has no JSON.parse-able SecretString property`);
}

/**
 * Sets the environment variables for the application.
 * @param secrets An object containing the secrets to set as environment variables.
 */
export function setSecrets(secrets: object) {
  for (const [key, value] of Object.entries(secrets)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

export const Secrets = {
  getAPISecrets,
  getProcessorSecrets,
  getFrontEndSecrets,
  getPlaiyUISecrets,
  getPlaiyAPISecrets,
  getImportsSecrets,
  getIngestionBoxSecrets,
  getPlatformAPISecrets,
  getPaymentsSecrets,
  getHeartbeatSecrets,
}