/** @type {import('ts-jest').JestConfigWithTsJest} * */
const config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['json', 'lcov'],
  testEnvironment: 'jsdom',
  bail: true,
  forceExit: true,
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['tsx', 'ts', 'jsx', 'js', 'json', 'node'],
  modulePathIgnorePatterns: ['<rootDir>/test/__fixtures__', '<rootDir>/node_modules', '<rootDir>/dist'],
  preset: 'ts-jest',
  testMatch: [
    '<rootDir>/src/**/*.unit.test.{ts,tsx,js,jsx}',
    '<rootDir>/src/**/*.integration.test.{ts,tsx,js,jsx}',
    '<rootDir>/src/**/*.test.{ts,tsx,js,jsx}',
  ],
  // lucide-react and other UI packages ship as ESM — allow ts-jest to transform them
  transformIgnorePatterns: ['/node_modules/(?!(lucide-react)/)'],
  // mirror the @/* alias from tsconfig
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = config;
