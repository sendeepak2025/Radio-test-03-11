/**
 * Fix HTML Entities in UI Module Data
 * Converts &quot; back to " in uiModule_* sections
 */

const mongoose = require('mongoose');
require('dotenv').config();

function decodeHtmlEntities(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

async function fixHtmlEntities() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');
    
    const StructuredReport = require('./src/models/StructuredReport');
    
    // Find all reports with sections
    const reports = await StructuredReport.find({ 
      sections: { $exists: true }
    });
    
    console.log(`📊 Found ${reports.length} reports with sections\n`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const report of reports) {
      let needsUpdate = false;
      const updates = {};
      
      if (report.sections && typeof report.sections === 'object') {
        const newSections = { ...report.sections };
        
        // Check each section for HTML entities
        for (const [key, value] of Object.entries(report.sections)) {
          if (key.startsWith('uiModule_') && typeof value === 'string') {
            // Check if it has HTML entities
            if (value.includes('&quot;') || value.includes('&#x2F;')) {
              const decoded = decodeHtmlEntities(value);
              newSections[key] = decoded;
              needsUpdate = true;
              
              console.log(`  - Fixing ${key} in report ${report.reportId}`);
              console.log(`    Before: ${value.substring(0, 80)}...`);
              console.log(`    After:  ${decoded.substring(0, 80)}...`);
            }
          }
        }
        
        if (needsUpdate) {
          updates.sections = newSections;
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
    console.log(`⏭️  Skipped: ${skipped} reports (no HTML entities)`);
    console.log(`📊 Total: ${reports.length} reports\n`);
    
    if (fixed > 0) {
      console.log('✅ All HTML entities have been decoded!');
      console.log('   UI modules should now load correctly.');
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

fixHtmlEntities();
