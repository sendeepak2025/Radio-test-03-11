/**
 * Fix Existing Reports - Sync sections to top-level fields
 * This script updates all existing reports to ensure sections data
 * is properly synced to top-level fields for backward compatibility
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixExistingReports() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');
    
    const StructuredReport = require('./src/models/StructuredReport');
    
    // Find all template-based reports
    const reports = await StructuredReport.find({ 
      templateId: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${reports.length} template-based reports\n`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const report of reports) {
      let needsUpdate = false;
      const updates = {};
      
      // Check if sections data exists but top-level fields are empty
      if (report.sections && typeof report.sections === 'object') {
        // Clinical History
        const sectionClinicalHistory = report.sections.clinical_history || 
                                       report.sections.clinical_indication || 
                                       report.sections.clinicalHistory || 
                                       report.sections.indication || '';
        if (sectionClinicalHistory && !report.clinicalHistory) {
          updates.clinicalHistory = sectionClinicalHistory;
          needsUpdate = true;
          console.log(`  - Syncing clinicalHistory: "${sectionClinicalHistory.substring(0, 30)}..."`);
        }
        
        // Technique
        const sectionTechnique = report.sections.technique || '';
        if (sectionTechnique && !report.technique) {
          updates.technique = sectionTechnique;
          needsUpdate = true;
          console.log(`  - Syncing technique: "${sectionTechnique.substring(0, 30)}..."`);
        }
        
        // Findings
        const sectionFindings = report.sections.findings || report.sections.findingsText || '';
        if (sectionFindings && !report.findingsText) {
          updates.findingsText = sectionFindings;
          needsUpdate = true;
          console.log(`  - Syncing findingsText: "${sectionFindings.substring(0, 30)}..."`);
        }
        
        // Impression
        const sectionImpression = report.sections.impression || '';
        if (sectionImpression && !report.impression) {
          updates.impression = sectionImpression;
          needsUpdate = true;
          console.log(`  - Syncing impression: "${sectionImpression.substring(0, 30)}..."`);
        }
        
        // Recommendations
        const sectionRecommendations = report.sections.recommendations || '';
        if (sectionRecommendations && !report.recommendations) {
          updates.recommendations = sectionRecommendations;
          needsUpdate = true;
          console.log(`  - Syncing recommendations: "${sectionRecommendations.substring(0, 30)}..."`);
        }
      }
      
      if (needsUpdate) {
        console.log(`\n✅ Fixing report ${report.reportId} (${report.templateName || report.templateId})`);
        await StructuredReport.updateOne(
          { _id: report._id },
          { $set: updates }
        );
        fixed++;
      } else {
        skipped++;
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Fixed: ${fixed} reports`);
    console.log(`⏭️  Skipped: ${skipped} reports (already synced)`);
    console.log(`📊 Total: ${reports.length} reports\n`);
    
    if (fixed > 0) {
      console.log('✅ All reports have been fixed!');
      console.log('   Top-level fields now match sections data.');
      console.log('   Refresh your browser to see the changes.');
    } else {
      console.log('ℹ️  No reports needed fixing.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixExistingReports();
