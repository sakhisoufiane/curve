module.exports = {
  testEnvironment: 'node',
  bail: true,
  testTimeout: 60000,
  globalSetup: './test/jestGlobalSetup.js',
  globalTeardown: './test/jestGlobalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/test/jestSetup.js'],
  maxWorkers: 4,
};
