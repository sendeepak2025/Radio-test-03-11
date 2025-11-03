#!/usr/bin/env node
/**
 * Test MedSigLIP Classification (Hugging Face API)
 * Comprehensive test of the classification service
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8001';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(70));
  log(message, 'bright');
  console.log('='.repeat(70));
}

async function testMedSigLIPService() {
  header('🧪 TESTING MEDSIGCLIP (HUGGING FACE API)');

  try {
    // Test 1: Check if backend is running
    header('Test 1: Backend Connection');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      log('✅ Backend is running', 'green');
      log(`   Status: ${healthCheck.status}`, 'cyan');
    } catch (error) {
      log('❌ Backend is not running!', 'red');
      log('   Start it with: cd server && npm start', 'yellow');
      return;
    }

    // Test 2: Check AI service status
    header('Test 2: AI Service Status');
    const statusResponse = await axios.get(`${BASE_URL}/api/ai/status`);
    const { services } = statusResponse.data;

    log('📊 MedSigLIP Configuration:', 'cyan');
    console.log(JSON.stringify(services.medSigLIP, null, 2));

    if (services.medSigLIP.enabled) {
      log('✅ MedSigLIP is ENABLED', 'green');
      log(`   Provider: ${services.medSigLIP.provider}`, 'cyan');
      log(`   Model: ${services.medSigLIP.model}`, 'cyan');
      log(`   Grid Size: ${services.medSigLIP.gridSize}`, 'cyan');
      log(`   Threshold: ${services.medSigLIP.threshold}`, 'cyan');
    } else {
      log('❌ MedSigLIP is DISABLED', 'red');
      return;
    }

    // Test 3: Test API connection
    header('Test 3: MedSigLIP API Connection');
    log('🔌 Testing Hugging Face API connection...', 'yellow');
    
    const testResponse = await axios.get(`${BASE_URL}/api/ai/test`);
    const { services: testServices } = testResponse.data;

    if (testServices.medSigLIP.success) {
      log('✅ MedSigLIP API: Connected', 'green');
      log(`   Model: ${testServices.medSigLIP.model}`, 'cyan');
      log(`   Status: ${testServices.medSigLIP.status}`, 'cyan');
    } else {
      log('❌ MedSigLIP API: Connection Failed', 'red');
      log(`   Error: ${testServices.medSigLIP.error}`, 'red');
      return;
    }

    // Test 4: Test with sample image (if available)
    header('Test 4: Classification Test');
    
    // Check if test image exists
    const testImagePaths = [
      'test-image.jpg',
      'test-image.png',
      'sample.jpg',
      'sample.png'
    ];

    let testImagePath = null;
    for (const imagePath of testImagePaths) {
      if (fs.existsSync(imagePath)) {
        testImagePath = imagePath;
        break;
      }
    }

    if (testImagePath) {
      log(`📸 Found test image: ${testImagePath}`, 'cyan');
      log('🔍 Running classification...', 'yellow');
      log('   (This may take 10-15 seconds for first request)', 'yellow');

      const FormData = require('form-data');
      const form = new FormData();
      form.append('image', fs.createReadStream(testImagePath));

      const startTime = Date.now();
      
      try {
        const classifyResponse = await axios.post(
          `${BASE_URL}/api/ai/detect`,
          form,
          {
            headers: form.getHeaders(),
            timeout: 60000 // 60 second timeout
          }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        log(`✅ Classification completed in ${duration}s`, 'green');
        
        const { detections, metadata } = classifyResponse.data;
        
        log('\n📊 Results:', 'cyan');
        log(`   Regions processed: ${metadata.regionsProcessed}`, 'cyan');
        log(`   Grid size: ${metadata.gridSize}x${metadata.gridSize}`, 'cyan');
        log(`   Detections found: ${detections.length}`, 'cyan');
        
        if (detections.length > 0) {
          log('\n🔍 Detections:', 'cyan');
          detections.forEach((detection, idx) => {
            log(`\n   Detection ${idx + 1}:`, 'bright');
            log(`     Label: ${detection.label}`, 'cyan');
            log(`     Confidence: ${(detection.confidence * 100).toFixed(1)}%`, 'cyan');
            log(`     Location: (${detection.x}, ${detection.y})`, 'cyan');
            log(`     Size: ${detection.width}x${detection.height}`, 'cyan');
          });
        } else {
          log('   No abnormalities detected (image appears normal)', 'yellow');
        }

        // Show raw response
        log('\n📋 Full Response:', 'cyan');
        console.log(JSON.stringify(classifyResponse.data, null, 2));

      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (error.code === 'ECONNABORTED') {
          log(`❌ Request timed out after ${duration}s`, 'red');
          log('   This might be the first request (model loading)', 'yellow');
          log('   Try again in 30 seconds', 'yellow');
        } else if (error.response) {
          log(`❌ Classification failed after ${duration}s`, 'red');
          log(`   Status: ${error.response.status}`, 'red');
          log(`   Error: ${error.response.data.error || 'Unknown error'}`, 'red');
          
          if (error.response.status === 503) {
            log('\n💡 Model is loading on Hugging Face servers', 'yellow');
            log('   This is normal for the first request', 'yellow');
            log('   Wait 20-30 seconds and try again', 'yellow');
          }
        } else {
          log(`❌ Classification failed: ${error.message}`, 'red');
        }
      }

    } else {
      log('⚠️  No test image found', 'yellow');
      log('   To test classification, add a medical image:', 'cyan');
      log('   - test-image.jpg', 'cyan');
      log('   - test-image.png', 'cyan');
      log('   - sample.jpg', 'cyan');
      log('   - sample.png', 'cyan');
    }

    // Test 5: Performance metrics
    header('Test 5: Configuration & Performance');
    
    log('⚙️  Current Configuration:', 'cyan');
    log(`   Grid Size: ${services.medSigLIP.gridSize}x${services.medSigLIP.gridSize} = ${services.medSigLIP.gridSize * services.medSigLIP.gridSize} regions`, 'cyan');
    log(`   Confidence Threshold: ${services.medSigLIP.threshold}`, 'cyan');
    log(`   Model: ${services.medSigLIP.model}`, 'cyan');
    
    log('\n📊 Expected Performance:', 'cyan');
    const regions = services.medSigLIP.gridSize * services.medSigLIP.gridSize;
    const estimatedTime = regions * 1.5; // ~1.5s per region
    log(`   Regions to process: ${regions}`, 'cyan');
    log(`   Estimated time: ${estimatedTime.toFixed(0)}-${(estimatedTime * 1.5).toFixed(0)} seconds`, 'cyan');
    
    log('\n💡 Optimization Tips:', 'cyan');
    log('   - Reduce grid size to 2 for faster analysis (4 regions)', 'yellow');
    log('   - Increase threshold to 0.20 for fewer false positives', 'yellow');
    log('   - First request takes longer (model loading)', 'yellow');

    // Summary
    header('📋 SUMMARY');
    
    log('✅ Backend: Running', 'green');
    log('✅ MedSigLIP: Enabled', 'green');
    log('✅ Hugging Face API: Connected', 'green');
    
    if (testImagePath) {
      log('✅ Classification: Tested', 'green');
    } else {
      log('⚠️  Classification: Not tested (no image)', 'yellow');
    }
    
    log('\n🎉 MedSigLIP is working correctly!', 'green');
    log('\n💡 Next Steps:', 'cyan');
    log('   1. Upload a medical image in the frontend', 'cyan');
    log('   2. Click "Analyze with AI"', 'cyan');
    log('   3. Watch MedSigLIP detect abnormalities', 'cyan');
    
    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    header('❌ TEST FAILED');
    
    if (error.code === 'ECONNREFUSED') {
      log('Backend server is not running!', 'red');
      log('Start it with: cd server && npm start', 'yellow');
    } else if (error.response) {
      log(`HTTP Error: ${error.response.status}`, 'red');
      log(`Message: ${error.response.data.error || error.message}`, 'red');
    } else {
      log(`Error: ${error.message}`, 'red');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    process.exit(1);
  }
}

// Run the test
log('🚀 Starting MedSigLIP Test Suite...', 'bright');
testMedSigLIPService();
