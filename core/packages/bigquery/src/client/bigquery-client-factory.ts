import { BigQuery } from '@google-cloud/bigquery';
import { getEnvVarWithConfig } from '@curveroyaltysystems/curve-env-var-resolver';
import { string } from 'node-env-resolver/validators';
import { BigQueryClient, BigQueryClientOptions, BigQueryClientAuthenticationDetails } from './bigquery-client';

/**
 * Create a BigQuery Client with your own authentication details. Useful for tests.
 *
 * @param options Information about the which datasets and table names to interact with
 * @param authDetails Information about how to authenticate with BigQuery
 */
export function withCredentials(options: BigQueryClientOptions, authDetails: BigQueryClientAuthenticationDetails): BigQueryClient {
  return new BigQueryClient(options, new BigQuery(authDetails));
}

/**
 * Create a BigQuery Client. Credentials will be pulled from the `BQ_project_id`, `BQ_client_email` and `BQ_private_key`
 * and used to authenticate to BigQuery
 *
 * @param options Information about the which datasets and table names to interact with
 */
export function withDefaultCredentials(options: BigQueryClientOptions): BigQueryClient {
  return new BigQueryClient(options, new BigQuery(defaultAuthentication()));
}

/**
 * Create a BigQuery Client. Credentials will be pulled from the bigQuery secret group in AWS Secrets Manager
 * and used to authenticate to BigQuery
 *
 * @param options Information about the which datasets and table names to interact with
 */
export async function withAwsSecretsManagerCredentials(options: BigQueryClientOptions): Promise<BigQueryClient> {
  const auth = await awsSecretsManager();
  return new BigQueryClient(options, new BigQuery(auth));
}

/**
 * Create a BigQuery Client. This leverages BigQuery's default credential loading strategy.
 * Useful when working in GCP, or when using Workload Identify Federation to authenticate.
 *
 * @see https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application
 * @param options Information about the which datasets and table names to interact with
 * @param projectId The project ID to connect to. If not set, the default of the associated account will be used
 */
export function withApplicationDefaultCredentials(options: BigQueryClientOptions, projectId?: string): BigQueryClient {
  return new BigQueryClient(options, new BigQuery( { projectId }));
}

/**
 * Create a BigQuery Client with a specific Google BigQuery instance to delegate to. Useful for tests
 *
 * @see https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application
 * @param options Information about the which datasets and table names to interact with
 * @param bigQuery The delegate client
 */
export function withDelegateClient(options: BigQueryClientOptions, bigQuery: BigQuery): BigQueryClient {
  return new BigQueryClient(options, bigQuery);
}

export function defaultAuthentication(): BigQueryClientAuthenticationDetails {
  const projectId = process.env.BQ_project_id;
  if (!projectId) {
    throw new Error('BQ_project_id is not set');
  }

  const clientEmail = process.env.BQ_client_email;
  if (!clientEmail) {
    throw new Error('BQ_client_email is not set');
  }

  const privateKey = process.env.BQ_private_key;
  if (!privateKey) {
    throw new Error('BQ_private_key is not set');
  }

  return {
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: formatPrivateKey(privateKey),
    }
  };
}

export async function awsSecretsManager(): Promise<BigQueryClientAuthenticationDetails> {
  const bigQuery = await getEnvVarWithConfig('bigQuery', {
    BQ_project_id: string(),
    BQ_client_email: string(),
    BQ_private_key: string(),
  });

  return {
    projectId: bigQuery.BQ_project_id,
    credentials: {
      client_email: bigQuery.BQ_client_email,
      private_key: formatPrivateKey(bigQuery.BQ_private_key),
    }
  };
}

const formatPrivateKey = (key: string): string => key?.replace(/\\n/g, '\n');