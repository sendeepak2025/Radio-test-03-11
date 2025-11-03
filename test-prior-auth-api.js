/**
 * Test Script for Prior Authorization API
 * Run this to verify the API is working correctly
 */

const http = require('http');

// Test configuration
const API_URL = 'http://localhost:8001';
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual token from login

// Helper function to make API requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('🧪 Testing Prior Authorization API...\n');

  // Test 1: Check if route is registered (should return 401 without auth)
  console.log('Test 1: Check route registration');
  try {
    const result = await makeRequest('/api/prior-auth/stats/dashboard');
    if (result.status === 401) {
      console.log('✅ Route is registered (401 Unauthorized - needs auth)');
    } else if (result.status === 404) {
      console.log('❌ Route NOT found (404) - routes not registered!');
    } else {
      console.log(`✅ Route responds with status: ${result.status}`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Login to the application at http://localhost:5173/login');
  console.log('2. Open browser DevTools (F12)');
  console.log('3. Go to Application > Local Storage');
  console.log('4. Copy the JWT token');
  console.log('5. Replace TEST_TOKEN in this script');
  console.log('6. Run: node test-prior-auth-api.js');
  console.log('\nOR simply:');
  console.log('1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)');
  console.log('2. Navigate to /prior-auth');
  console.log('3. The error should be gone!');
}

runTests();
