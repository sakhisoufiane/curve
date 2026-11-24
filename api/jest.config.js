/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageProvider: 'babel',
  coverageReporters: ['json', 'lcov'],
  testEnvironment: 'node',
  bail: true,
  testTimeout: 60000,
  forceExit: true,
  globalSetup: '<rootDir>/jest.globalSetup.js',
  globalTeardown: '<rootDir>/jest.globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/test'],
  testPathIgnorePatterns: ['<rootDir>/test', '/test\\.js$', '/.yalc'],
  ...(process.env.JEST_MAX_WORKERS && { maxWorkers: parseInt(process.env.JEST_MAX_WORKERS, 10) }),
};

module.exports = config;
