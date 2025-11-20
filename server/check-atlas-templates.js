/**
 * Check MongoDB Atlas Templates
 * This script connects to your hosted MongoDB and checks for templates
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mahitechnocrats:qNfbRMgnCthyu59@cluster1.xqa5iyj.mongodb.net/radiology-final-21-10';

async function checkTemplates() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully!\n');

    // Define schema inline
    const templateSchema = new mongoose.Schema({
      templateId: String,
      name: String,
      uiModules: Array,
      matchingCriteria: Object,
      sections: Array
    }, { collection: 'reporttemplates' });

    const ReportTemplate = mongoose.model('ReportTemplate', templateSchema);

    // Count total templates
    const totalCount = await ReportTemplate.countDocuments();
    console.log(`📊 Total templates in database: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('❌ NO TEMPLATES FOUND!\n');
      console.log('This is why all reports look the same.');
      console.log('You need to run the seed script.\n');
      process.exit(0);
    }

    // List all templates
    console.log('📋 Templates found:');
    console.log('─'.repeat(80));
    
    const templates = await ReportTemplate.find({});
    
    templates.forEach((template, idx) => {
      console.log(`\n${idx + 1}. ${template.templateId || 'NO-ID'}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Modalities: ${template.matchingCriteria?.modalities?.join(', ') || 'N/A'}`);
      console.log(`   Body Parts: ${template.matchingCriteria?.bodyParts?.join(', ') || 'N/A'}`);
      console.log(`   Sections: ${template.sections?.length || 0}`);
      
      if (template.uiModules && template.uiModules.length > 0) {
        console.log(`   ✅ UI Modules: ${template.uiModules.length}`);
        template.uiModules.forEach(mod => {
          console.log(`      - ${mod.type}: ${mod.title || mod.id}`);
        });
      } else {
        console.log(`   ❌ UI Modules: NONE (missing specialized modules!)`);
      }
    });

    console.log('\n' + '─'.repeat(80));

    // Check for specialized templates
    const specializedTemplates = await ReportTemplate.find({
      templateId: { $in: ['MAMMO-BIRADS-01', 'MRI-SPINE-01', 'CT-CHEST-01'] }
    });

    console.log('\n\n🎯 Specialized Templates Check:');
    console.log('─'.repeat(80));
    
    const expected = ['MAMMO-BIRADS-01', 'MRI-SPINE-01', 'CT-CHEST-01'];
    expected.forEach(templateId => {
      const found = specializedTemplates.find(t => t.templateId === templateId);
      if (found) {
        console.log(`✅ ${templateId} - FOUND (${found.uiModules?.length || 0} UI modules)`);
      } else {
        console.log(`❌ ${templateId} - MISSING`);
      }
    });

    console.log('\n' + '─'.repeat(80));

    // Summary
    console.log('\n\n📝 SUMMARY:');
    const withModules = templates.filter(t => t.uiModules && t.uiModules.length > 0).length;
    const withoutModules = totalCount - withModules;
    
    console.log(`   Total templates: ${totalCount}`);
    console.log(`   With UI modules: ${withModules} ✅`);
    console.log(`   Without UI modules: ${withoutModules} ❌`);
    
    if (withModules === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   No templates have UI modules configured.');
      console.log('   This is why all reports look the same!');
      console.log('\n💡 SOLUTION:');
      console.log('   Run: node src/seed/seedEnhancedTemplatesWithModules.js');
    } else if (specializedTemplates.length < 3) {
      console.log('\n⚠️  PROBLEM IDENTIFIED:');
      console.log('   Missing specialized templates (BI-RADS, Spine, Chest).');
      console.log('\n💡 SOLUTION:');
      console.log('   Run: node src/seed/seedEnhancedTemplatesWithModules.js');
    } else {
      console.log('\n✅ ALL GOOD!');
      console.log('   Specialized templates are configured correctly.');
      console.log('   If reports still look the same, check:');
      console.log('   1. Backend server is running (npm start)');
      console.log('   2. Using correct modality (MG for Mammography)');
      console.log('   3. Using correct body part (BREAST for Mammography)');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Cannot connect to MongoDB Atlas.');
      console.log('   Check your internet connection.');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Authentication failed.');
      console.log('   Check the username/password in MONGODB_URI.');
    }
    process.exit(1);
  }
}

checkTemplates();
