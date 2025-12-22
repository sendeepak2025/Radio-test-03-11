#!/usr/bin/env node

const axios = require('axios');

async function testAPI() {
  const studyUID = '1.2.840.113619.2.358.3.2831219201.478.1757591846.583';
  const apiUrl = `http://localhost:8001/api/dicom/studies/${studyUID}/metadata`;
  
  try {
    console.log('🔍 Testing API endpoint:', apiUrl);
    console.log('');
    
    const response = await axios.get(apiUrl);
    const data = response.data;
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Success:', data.success);
    console.log('');
    
    if (data.success && data.data) {
      const study = data.data;
      console.log('Study Data:');
      console.log('  Patient:', study.patientName);
      console.log('  Study UID:', study.studyInstanceUID);
      console.log('  Number of Series:', study.numberOfSeries);
      console.log('  Total Instances:', study.numberOfInstances);
      console.log('');
      
      if (study.series && Array.isArray(study.series)) {
        console.log(`📁 Series Details (${study.series.length} series):`);
        study.series.forEach((series, index) => {
          console.log(`  Series ${index + 1}:`);
          console.log(`    UID: ${series.seriesInstanceUID}`);
          console.log(`    Number: ${series.seriesNumber}`);
          console.log(`    Description: ${series.seriesDescription}`);
          console.log(`    Modality: ${series.modality}`);
          console.log(`    Instances: ${series.numberOfInstances}`);
          console.log('');
        });
      } else {
        console.log('❌ No series data found or series is not an array');
      }
    } else {
      console.log('❌ API returned error:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testAPI();