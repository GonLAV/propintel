'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__wt/'],
  modulePathIgnorePatterns: ['<rootDir>/tests/.*/__wt/'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!**/__wt/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 20000,
};
