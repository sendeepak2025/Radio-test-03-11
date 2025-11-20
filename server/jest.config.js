/**
 * Jest Configuration
 * Integration testing configuration for backend API
 */

module.exports = {
  testEnvironment: 'node',
  
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/seed/**',
    '!src/utils/**',
    '!**/node_modules/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: ['text', 'lcov', 'html'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  testTimeout: 30000,
  
  verbose: true,
  
  detectOpenHandles: true,
  
  forceExit: true,
  
  clearMocks: true,
  
  resetMocks: true,
  
  restoreMocks: true
};