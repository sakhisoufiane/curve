### 1.4.5
- Changing stripe config to be consistent as `STRIPE_KEY_TEST` was incorrect in production.

### 1.4.4
- Added 1.4.3 changes to developerConfig as well because I'm not the sharpest tool in the toolbox.

### 1.4.3
- Added `salesCalculator` to secret types and processor config.
- Added missing `gcs/importExport` secret to processor config.


### 1.4.1
- Created `developer` variant of `s3` secret configuration to facilitate local development without requiring application secrets.
- Update developer application configs to use this new developer s3 version so the refresh scripts can update .env files properly.

### 1.4.0
- Added `getEnvVarAWSWithConfig` to allow fetching environment variables directly from AWS Secrets with a custom configuration schema. This is useful for developers who need to retrieve secrets that can't rely on the secret configuration maps defined in the package.
- Renamed loader functions to better reflect purpose.
- Created `developer` variants of `mongo` and `bigQuery` secret configurations to facilitate local development without requiring application secrets.

### 1.3.2
- Removed local development debugging code from `/resolver/envResolver.ts`.

### 1.3.1
- Fixed copy paste error in `getAllAWSSecrets`.

### 1.3.0
- Exported `getAWSSecrets` from the resolver to allow direct access to AWS Secrets Manager secrets without going through the memoised functions. This is useful for scenarios where a fresh fetch of secrets is required, bypassing any cached values and avoiding accidental use of already present .env files due to how the underlying resolver works.

### 1.2.9
- Added optional property `wiseApiUrl` to the wise secret config `WiseResolverConfig` to allow production to pull this secret is uses.

### 1.2.8
- Added `stripe` to `apiConfig` because it was seen in staging ecs file.

### 1.2.7
- Added `NODE_ENV` to `ApiSettingsResolverConfig`. Added to AWS Secrets Manager as well for Beta and Development environments who did not have this secret previously.

### 1.2.6
- Added and exported `getAWSEnvVars` to force a refresh of environment variables directly from AWS Secrets Manager.

### 1.2.5
- Added changelog file.
- Separated bigQuery and bigQuery/backup secrets because the node-env-var resolver will always try fetch the full secret if part is missing. Causing issues when trying to debug locally because bigQuery will always try fetch from AWS Secrets Manager due to the backup property missing due to it being a prod-only secret. This in turn forces the user to be logged in which is not the experience we want locally.