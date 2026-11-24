const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { getAWSSecrets, applicationConfigurations } = require('@curveroyaltysystems/curve-env-var-resolver');
const fs = require('fs').promises;
const path = require('path');

async function updateEnvFile() {
  const secrets = await getAWSSecrets(applicationConfigurations.developerFrontEndConfig);

  // Override environmentName to 'development'
  // Do we want to do this? Would be a pain in the dx otherwise
  if (secrets.environmentName) {
    secrets.environmentName = 'development';
  }

  const envFilePath = path.resolve(process.cwd(), '.env');
  const envContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  await fs.writeFile(envFilePath, envContent, { encoding: 'utf8' });
}

updateEnvFile()
  .then(() => {
    logger.info('Environment file updated successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Error updating environment file: ', error);
    process.exit(1);
  });
