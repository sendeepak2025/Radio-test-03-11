#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Study = require('./src/models/Study');
const Series = require('./src/models/Series');
const Instance = require('./src/models/Instance');

async function checkSeries() {
  const studyUID = '1.2.840.113619.2.358.3.2831219201.478.1757591846.583';
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get study
    const study = await Study.findOne({ studyInstanceUID: studyUID }).lean();
    if (!study) {
      console.log('❌ Study not found');
      return;
    }

    console.log('📊 Study:', study.patientName);
    console.log('   Study UID:', studyUID);
    console.log('   Instances:', study.numberOfInstances);
    console.log('');

    // Get all instances grouped by series
    const instances = await Instance.find({ studyInstanceUID: studyUID })
      .sort({ seriesInstanceUID: 1, instanceNumber: 1 })
      .lean();

    console.log(`Found ${instances.length} instances in database\n`);

    // Group by series
    const seriesMap = new Map();
    for (const inst of instances) {
      const seriesUID = inst.seriesInstanceUID || `${studyUID}.1`;
      if (!seriesMap.has(seriesUID)) {
        seriesMap.set(seriesUID, {
          seriesInstanceUID: seriesUID,
          seriesNumber: inst.seriesNumber || '',
          modality: inst.modality,
          instances: []
        });
      }
      seriesMap.get(seriesUID).instances.push(inst);
    }

    console.log(`📁 Found ${seriesMap.size} series:\n`);
    
    let seriesIndex = 1;
    for (const [seriesUID, seriesData] of seriesMap) {
      console.log(`Series ${seriesIndex}:`);
      console.log(`  UID: ${seriesUID}`);
      console.log(`  Modality: ${seriesData.modality}`);
      console.log(`  Instances: ${seriesData.instances.length}`);
      console.log(`  First instance: ${seriesData.instances[0]?.instanceNumber || 'N/A'}`);
      console.log(`  Last instance: ${seriesData.instances[seriesData.instances.length - 1]?.instanceNumber || 'N/A'}`);
      console.log('');
      seriesIndex++;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkSeries();
