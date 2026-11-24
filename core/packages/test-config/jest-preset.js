/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('ts-jest').JestConfigWithTsJest} * */
const config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['json', 'lcov'],
  testEnvironment: 'node',
  bail: true,
  forceExit: true,
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/test/__fixtures__', '<rootDir>/node_modules', '<rootDir>/dist'],
  preset: 'ts-jest',
  testMatch: [
    '<rootDir>/src/**/*.unit.test.{ts,js}',
    '<rootDir>/src/**/*.integration.test.{ts,js}',
    '<rootDir>/src/**/*.test.{ts,js}',
  ],
};

module.exports = config;
