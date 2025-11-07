const mongoose = require('mongoose');
require('dotenv').config();

async function checkWorklist() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/radiology');
    
    const Study = require('./server/src/models/Study');
    const WorklistItem = require('./server/src/models/WorklistItem');
    
    const studyCount = await Study.countDocuments();
    const worklistCount = await WorklistItem.countDocuments();
    
    console.log('📊 Database Status:');
    console.log('Studies:', studyCount);
    console.log('Worklist Items:', worklistCount);
    console.log('');
    
    if (studyCount > 0) {
      const latestStudy = await Study.findOne().sort({createdAt: -1}).lean();
      console.log('Latest Study:');
      console.log('  Patient:', latestStudy.patientName);
      console.log('  Study UID:', latestStudy.studyInstanceUID.substring(0, 40) + '...');
      console.log('  Created:', latestStudy.createdAt);
      console.log('  Hospital ID:', latestStudy.hospitalId || 'NOT SET');
      console.log('');
      
      // Check if this study has a worklist item
      const worklistForStudy = await WorklistItem.findOne({ 
        studyInstanceUID: latestStudy.studyInstanceUID 
      }).lean();
      
      if (worklistForStudy) {
        console.log('✅ Worklist item EXISTS for latest study');
        console.log('  Status:', worklistForStudy.status);
        console.log('  Priority:', worklistForStudy.priority);
        console.log('  Hospital ID:', worklistForStudy.hospitalId);
      } else {
        console.log('❌ NO worklist item for latest study!');
        console.log('');
        console.log('🔧 Creating worklist item now...');
        
        const worklistService = require('./server/src/services/worklist-service');
        try {
          await worklistService.createWorklistItem(latestStudy.studyInstanceUID, {
            hospitalId: latestStudy.hospitalId,
            priority: 'routine'
          });
          console.log('✅ Worklist item created!');
        } catch (error) {
          console.error('❌ Failed to create worklist item:', error.message);
        }
      }
    }
    
    console.log('');
    console.log('🔄 Running full sync...');
    const worklistService = require('./server/src/services/worklist-service');
    const result = await worklistService.syncFromStudies();
    console.log('Sync Results:');
    console.log('  Created:', result.created);
    console.log('  Skipped:', result.skipped);
    console.log('  Updated:', result.updated || 0);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWorklist();
