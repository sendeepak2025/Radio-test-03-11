/**
 * Test Radiology Worklist Flow
 * 
 * This script tests the complete worklist workflow:
 * 1. Check if studies exist
 * 2. Sync worklist from studies
 * 3. Verify worklist items created
 * 4. Check statistics
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Study = require('./server/src/models/Study');
const WorklistItem = require('./server/src/models/WorklistItem');
const StructuredReport = require('./server/src/models/StructuredReport');

async function testWorklistFlow() {
  try {
    console.log('🔍 Testing Radiology Worklist Flow\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/radiology');
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Check studies
    console.log('📊 Step 1: Checking Studies');
    console.log('─'.repeat(50));
    const studyCount = await Study.countDocuments();
    console.log(`Total studies in database: ${studyCount}`);
    
    if (studyCount === 0) {
      console.log('❌ No studies found! Upload some DICOM files first.');
      process.exit(1);
    }
    
    const sampleStudies = await Study.find().limit(5).lean();
    console.log('\nSample studies:');
    sampleStudies.forEach((study, i) => {
      console.log(`  ${i + 1}. ${study.patientName} - ${study.modality} - ${study.studyDate}`);
      console.log(`     UID: ${study.studyInstanceUID.substring(0, 30)}...`);
    });
    console.log('');
    
    // Step 2: Check worklist items
    console.log('📋 Step 2: Checking Worklist Items');
    console.log('─'.repeat(50));
    const worklistCount = await WorklistItem.countDocuments();
    console.log(`Total worklist items: ${worklistCount}`);
    
    if (worklistCount === 0) {
      console.log('⚠️  No worklist items found. Running sync...\n');
      
      // Import worklist service
      const worklistService = require('./server/src/services/worklist-service');
      const result = await worklistService.syncFromStudies();
      
      console.log(`✅ Sync completed:`);
      console.log(`   - Created: ${result.created}`);
      console.log(`   - Skipped: ${result.skipped}`);
      console.log(`   - Updated: ${result.updated}`);
      console.log(`   - Total: ${result.total}\n`);
    }
    
    // Step 3: Check worklist by status
    console.log('📊 Step 3: Worklist by Status');
    console.log('─'.repeat(50));
    
    const pending = await WorklistItem.countDocuments({ status: 'pending' });
    const inProgress = await WorklistItem.countDocuments({ status: 'in_progress' });
    const completed = await WorklistItem.countDocuments({ status: 'completed' });
    
    console.log(`Pending:     ${pending}`);
    console.log(`In Progress: ${inProgress}`);
    console.log(`Completed:   ${completed}`);
    console.log('');
    
    // Step 4: Check report status
    console.log('📝 Step 4: Report Status');
    console.log('─'.repeat(50));
    
    const noReport = await WorklistItem.countDocuments({ reportStatus: 'none' });
    const draft = await WorklistItem.countDocuments({ reportStatus: 'draft' });
    const finalized = await WorklistItem.countDocuments({ reportStatus: 'finalized' });
    
    console.log(`No Report:  ${noReport}`);
    console.log(`Draft:      ${draft}`);
    console.log(`Finalized:  ${finalized}`);
    console.log('');
    
    // Step 5: Check priority distribution
    console.log('🚨 Step 5: Priority Distribution');
    console.log('─'.repeat(50));
    
    const stat = await WorklistItem.countDocuments({ priority: 'stat' });
    const urgent = await WorklistItem.countDocuments({ priority: 'urgent' });
    const routine = await WorklistItem.countDocuments({ priority: 'routine' });
    
    console.log(`STAT:    ${stat}`);
    console.log(`Urgent:  ${urgent}`);
    console.log(`Routine: ${routine}`);
    console.log('');
    
    // Step 6: Check critical findings
    console.log('⚠️  Step 6: Critical Findings');
    console.log('─'.repeat(50));
    
    const critical = await WorklistItem.countDocuments({ hasCriticalFindings: true });
    const criticalUnnotified = await WorklistItem.countDocuments({ 
      hasCriticalFindings: true, 
      criticalFindingsNotified: false 
    });
    
    console.log(`Critical findings:     ${critical}`);
    console.log(`Critical unnotified:   ${criticalUnnotified}`);
    console.log('');
    
    // Step 7: Sample worklist items
    console.log('📋 Step 7: Sample Worklist Items');
    console.log('─'.repeat(50));
    
    const sampleItems = await WorklistItem.find()
      .populate('assignedTo', 'username')
      .limit(5)
      .lean();
    
    if (sampleItems.length === 0) {
      console.log('No worklist items to display');
    } else {
      sampleItems.forEach((item, i) => {
        console.log(`\n${i + 1}. Patient: ${item.patientID}`);
        console.log(`   Status: ${item.status} | Report: ${item.reportStatus} | Priority: ${item.priority}`);
        console.log(`   Assigned: ${item.assignedTo ? item.assignedTo.username : 'Unassigned'}`);
        console.log(`   Study UID: ${item.studyInstanceUID.substring(0, 30)}...`);
        if (item.scheduledFor) {
          console.log(`   Scheduled: ${new Date(item.scheduledFor).toLocaleString()}`);
        }
      });
    }
    console.log('');
    
    // Step 8: Check reports
    console.log('📄 Step 8: Reports Status');
    console.log('─'.repeat(50));
    
    const totalReports = await StructuredReport.countDocuments();
    const draftReports = await StructuredReport.countDocuments({ reportStatus: 'draft' });
    const preliminaryReports = await StructuredReport.countDocuments({ reportStatus: 'preliminary' });
    const finalReports = await StructuredReport.countDocuments({ reportStatus: 'final' });
    
    console.log(`Total reports:      ${totalReports}`);
    console.log(`Draft:              ${draftReports}`);
    console.log(`Preliminary:        ${preliminaryReports}`);
    console.log(`Final (signed):     ${finalReports}`);
    console.log('');
    
    // Step 9: Verify sync between reports and worklist
    console.log('🔄 Step 9: Sync Verification');
    console.log('─'.repeat(50));
    
    const reportsWithWorklist = await StructuredReport.aggregate([
      {
        $lookup: {
          from: 'worklistitems',
          localField: 'studyInstanceUID',
          foreignField: 'studyInstanceUID',
          as: 'worklistItem'
        }
      },
      {
        $match: {
          'worklistItem': { $size: 0 }
        }
      }
    ]);
    
    if (reportsWithWorklist.length > 0) {
      console.log(`⚠️  Found ${reportsWithWorklist.length} reports without worklist items`);
      console.log('   Run sync to fix: POST /api/worklist/sync');
    } else {
      console.log('✅ All reports have corresponding worklist items');
    }
    console.log('');
    
    // Summary
    console.log('📊 SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ Studies:         ${studyCount}`);
    console.log(`✅ Worklist Items:  ${worklistCount}`);
    console.log(`✅ Reports:         ${totalReports}`);
    console.log('');
    
    if (worklistCount === studyCount) {
      console.log('✅ All studies have worklist items!');
    } else if (worklistCount < studyCount) {
      console.log(`⚠️  ${studyCount - worklistCount} studies missing worklist items`);
      console.log('   Run: POST /api/worklist/sync');
    } else {
      console.log('⚠️  More worklist items than studies (orphaned items?)');
    }
    
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Start the server: cd server && npm start');
    console.log('2. Open worklist: http://localhost:5173/worklist');
    console.log('3. Upload new studies to test auto-creation');
    console.log('4. Create reports to test status updates');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testWorklistFlow();
