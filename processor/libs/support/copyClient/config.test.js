process.env.NODE_ENV = 'test';
const { getCopyConfig } = require('./config');

describe('CopyClient Config Suite', () => {
  const ENV_VAR_COPY = process.env;

  beforeEach(() => {
    process.env = { ...ENV_VAR_COPY };
  });

  afterEach(() => {
    process.env = ENV_VAR_COPY;
  });

  test('production getCopyConfig', () => {
    // Arrange
    process.env.S3_access_key_PROD = 'abc123';
    process.env.S3_secret_key_PROD = 'secret123';
    process.env.S3_bucket_PROD = 'bucket123';
    process.env.DB_USER_PROD = 'user123';
    process.env.DB_PASS_PROD = 'pass123';

    // Act
    const config = getCopyConfig('production');

    // We can't really manipulate the actual production URI in tests so this is all we can expect
    // Because the root of the env vars are from the CSL and that sets env vars at module load
    // Assert
    expect(config.isProduction).toBe(true);
  });

  test('beta getCopyConfig', () => {
    // Arrange
    process.env.Beta_S3_access_key = 'abc123';
    process.env.Beta_S3_secret_key = 'secret123';
    process.env.Beta_S3_bucket = 'bucket123';
    process.env.Beta_S3_region = 'eu-west-1';

    process.env.Beta_DB_PROTOCOL = 'mongodb+srv://';
    process.env.Beta_DB_USER = 'beta_user';
    process.env.Beta_DB_PASS = 'beta_pass';
    process.env.Beta_DB_URL = 'beta_db_url';
    process.env.Beta_DB_NAME = 'beta_db_name';
    process.env.Beta_DB_OPTS = 'beta_db_opts';

    const mockBetaUri = `${process.env.Beta_DB_PROTOCOL}${process.env.Beta_DB_USER}:${process.env.Beta_DB_PASS}@${process.env.Beta_DB_URL}/${process.env.Beta_DB_NAME}?${process.env.Beta_DB_OPTS}`;

    // Act
    const config = getCopyConfig('beta');

    // Assert
    expect(config.isProduction).toBe(false);
    expect(config.dbUri).toBe(mockBetaUri);
    expect(config.bucket).toBe(process.env.Beta_S3_bucket);
  });

  test('Should throw an error if not a real environment', () => {
    expect(() => {
      // Act
      getCopyConfig('not_a_real_env');
      // Assert
    }).toThrow('Unknown environment in getCopyConfig: not_a_real_env');
  });
});
