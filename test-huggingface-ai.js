#!/usr/bin/env node
/**
 * Test Hugging Face AI Integration
 * Tests MedSigLIP + MedGemma services
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8001';

async function testAIServices() {
  console.log('🧪 Testing Hugging Face AI Integration\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check AI Status
    console.log('\n📊 Test 1: Checking AI Service Status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/ai/status`);
    
    console.log('✅ Status Response:');
    console.log(JSON.stringify(statusResponse.data, null, 2));
    
    const { services } = statusResponse.data;
    
    if (services.medSigLIP.enabled) {
      console.log('✅ MedSigLIP: ENABLED (Hugging Face API)');
      console.log(`   Model: ${services.medSigLIP.model}`);
      console.log(`   Provider: ${services.medSigLIP.provider}`);
    } else {
      console.log('❌ MedSigLIP: DISABLED');
    }
    
    if (services.medGemma.enabled) {
      console.log('✅ MedGemma: ENABLED (Google Gemini API)');
      console.log(`   Model: ${services.medGemma.model}`);
      console.log(`   Provider: ${services.medGemma.provider}`);
    } else {
      console.log('❌ MedGemma: DISABLED');
    }

    // Test 2: Test API Connections
    console.log('\n🔌 Test 2: Testing API Connections...');
    const testResponse = await axios.get(`${BASE_URL}/api/ai/test`);
    
    console.log('✅ Connection Test Response:');
    console.log(JSON.stringify(testResponse.data, null, 2));
    
    const { services: testServices } = testResponse.data;
    
    if (testServices.medSigLIP.success) {
      console.log('✅ MedSigLIP API: Connected');
    } else {
      console.log('❌ MedSigLIP API: Failed');
      console.log(`   Error: ${testServices.medSigLIP.error}`);
    }
    
    if (testServices.medGemma.success) {
      console.log('✅ MedGemma API: Connected');
    } else {
      console.log('❌ MedGemma API: Failed');
      console.log(`   Error: ${testServices.medGemma.error}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    
    const allGood = 
      services.medSigLIP.enabled && 
      services.medGemma.enabled &&
      testServices.medSigLIP.success && 
      testServices.medGemma.success;
    
    if (allGood) {
      console.log('✅ ALL SYSTEMS OPERATIONAL');
      console.log('\n🎉 Your AI stack is ready!');
      console.log('\nArchitecture:');
      console.log('  Frontend → Backend → Hugging Face Models');
      console.log('                        ├─ MedSigLIP (Classification)');
      console.log('                        └─ MedGemma (Report Generation)');
      console.log('\n💡 Next Steps:');
      console.log('  1. Upload a medical image in the frontend');
      console.log('  2. Click "Analyze with AI"');
      console.log('  3. Watch the magic happen! ✨');
    } else {
      console.log('⚠️  SOME ISSUES DETECTED');
      console.log('\n🔧 Troubleshooting:');
      
      if (!services.medSigLIP.enabled) {
        console.log('  • Set HUGGINGFACE_ENABLED=true in server/.env');
        console.log('  • Add HUGGINGFACE_API_KEY to server/.env');
      }
      
      if (!services.medGemma.enabled) {
        console.log('  • Add GOOGLE_AI_API_KEY to server/.env');
      }
      
      if (!testServices.medSigLIP.success) {
        console.log('  • Check Hugging Face API key is valid');
        console.log('  • Verify internet connection');
      }
      
      if (!testServices.medGemma.success) {
        console.log('  • Check Google AI API key is valid');
        console.log('  • Verify internet connection');
      }
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Backend server is not running!');
      console.error('   Start it with: cd server && npm start');
    } else if (error.response) {
      console.error('\n📋 Error Details:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run tests
testAIServices();
