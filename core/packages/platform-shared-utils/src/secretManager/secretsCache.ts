import dotenv from 'dotenv';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

dotenv.config();

type SecretCache = {
  [key: string]: { value: string; expiresAt: number };
};

class SecretsCache {
  private cache: SecretCache = {};

  private client = new SecretsManagerClient();

  private ttl = 60 * 60 * 1000; // 1 hour

  async getSecret(name: string): Promise<string> {
    // Check if the secret is in environment variables first
    // Do we want to delete the secret from env vars after reading it once?
    if (process.env[name]) {
      return process.env[name]!;
    }

    const now = Date.now();

    // Check cache
    if (this.cache[name] && this.cache[name].expiresAt > now) {
      return this.cache[name].value;
    }

    // Check AWS Secrets Manager
    const command = new GetSecretValueCommand({ SecretId: name });
    const response = await this.client.send(command);

    if (!response.SecretString) throw new Error(`Secret ${name} not found`);

    // Store in cache
    this.cache[name] = {
      value: response.SecretString,
      expiresAt: now + this.ttl,
    };

    return response.SecretString;
  }
}

export const secretsCache = new SecretsCache();