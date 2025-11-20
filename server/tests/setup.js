/**
 * Jest Setup
 * Global test configuration and utilities
 */

const mongoose = require('mongoose');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.WEBHOOK_SECRET = 'test-webhook-secret-key';
process.env.MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/radiology-test';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Global test utilities
global.testUtils = {
  /**
   * Generate random test data
   */
  generateTestUser: () => ({
    email: `test${Date.now()}@radiology.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'radiologist'
  }),

  generateTestPatient: () => ({
    patientId: `PAT${Date.now()}`,
    firstName: 'Test',
    lastName: 'Patient',
    dateOfBirth: new Date('1980-01-01'),
    gender: 'M'
  }),

  generateTestReport: (worklistItemId, templateId) => ({
    worklistItemId,
    templateId,
    status: 'draft',
    content: {
      findings: 'Test findings',
      impression: 'Test impression'
    }
  }),

  /**
   * Wait for a condition
   */
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (condition()) {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for condition'));
        }
      }, 100);
    });
  }
};

// Cleanup database after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});