#!/usr/bin/env node
/**
 * Direct test of MedSigLIP service
 * Tests the service file directly
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

console.log('🧪 Testing MedSigLIP Service Directly\n');
console.log('='.repeat(60));

// Check environment variables
console.log('\n📋 Environment Configuration:');
console.log(`   HUGGINGFACE_API_KEY: ${process.env.HUGGINGFACE_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   MEDSIGLIP_MODEL: ${process.env.MEDSIGLIP_MODEL || 'Not set'}`);
console.log(`   MEDSIGLIP_GRID_SIZE: ${process.env.MEDSIGLIP_GRID_SIZE || 'Not set'}`);
console.log(`   MEDSIGLIP_CONFIDENCE_THRESHOLD: ${process.env.MEDSIGLIP_CONFIDENCE_THRESHOLD || 'Not set'}`);

if (!process.env.HUGGINGFACE_API_KEY) {
  console.log('\n❌ HUGGINGFACE_API_KEY is not set!');
  console.log('   Add it to server/.env file');
  process.exit(1);
}

// Load the service
console.log('\n🔄 Loading MedSigLIP service...');
const medSigLIPService = require('./server/src/services/medSigLIPService');

console.log('✅ Service loaded successfully');

// Test connection
console.log('\n🔌 Testing Hugging Face API connection...');
console.log('   (This may take 20-30 seconds for first request)');

medSigLIPService.testConnection()
  .then(result => {
    console.log('\n📊 Test Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ MedSigLIP API Connection: SUCCESS');
      console.log(`   Model: ${result.model}`);
      console.log(`   Status: ${result.status}`);
      console.log('\n🎉 MedSigLIP is working correctly!');
      console.log('\n💡 Next: Run full test with image');
      console.log('   node test-medsigclip.js');
    } else {
      console.log('\n❌ MedSigLIP API Connection: FAILED');
      console.log(`   Error: ${result.error}`);
      console.log(`   Status: ${result.status}`);
      
      if (result.status === 401) {
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Check HUGGINGFACE_API_KEY is valid');
        console.log('   - Get key from: https://huggingface.co/settings/tokens');
      } else if (result.status === 503) {
        console.log('\n💡 Model is loading on Hugging Face servers');
        console.log('   Wait 20-30 seconds and try again');
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  })
  .catch(error => {
    console.log('\n❌ Test failed:');
    console.log(`   ${error.message}`);
    console.log('\n' + '='.repeat(60) + '\n');
    process.exit(1);
  });
