const mongoose = require('mongoose');
require('dotenv').config();

async function checkTemplateIssues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const ReportTemplate = require('./src/models/ReportTemplate');
    const templates = await ReportTemplate.find({}).lean();
    
    console.log(`\nTotal templates: ${templates.length}\n`);
    
    // Check for duplicate templateIds
    const ids = templates.map(t => t.templateId);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    console.log('Duplicate templateIds:', duplicateIds.length > 0 ? duplicateIds : 'None');
    
    // Check for duplicate names
    const names = templates.map(t => t.name);
    const dupNames = names.filter((name, index) => names.indexOf(name) !== index);
    console.log('Duplicate names:', dupNames.length > 0 ? dupNames : 'None');
    
    // Check for broken checklist items
    console.log('\n=== Checking for broken checklist items ===\n');
    let brokenCount = 0;
    templates.forEach(t => {
      if (t.uiModules) {
        t.uiModules.forEach(m => {
          if (m.type === 'checklist' && m.config && m.config.items) {
            if (m.config.items.length === 1 && m.config.items[0] === 'Replace with proper array') {
              console.log(`BROKEN: ${t.templateId} (${t.name}) - checklist '${m.id}' has placeholder`);
              brokenCount++;
            }
          }
        });
      }
    });
    
    if (brokenCount === 0) {
      console.log('All checklists are properly configured!');
    } else {
      console.log(`\nFound ${brokenCount} broken checklists`);
    }
    
    // List all templates with their UI modules
    console.log('\n=== Template Summary ===\n');
    templates.forEach((t, index) => {
      console.log(`${index + 1}. ${t.templateId} - ${t.name}`);
      console.log(`   Modalities: ${t.matchingCriteria?.modalities?.join(', ') || 'N/A'}`);
      console.log(`   Body Parts: ${t.matchingCriteria?.bodyParts?.join(', ') || 'N/A'}`);
      console.log(`   Sections: ${t.sections?.length || 0}`);
      console.log(`   UI Modules: ${t.uiModules?.length || 0}`);
      if (t.uiModules && t.uiModules.length > 0) {
        t.uiModules.forEach(m => {
          console.log(`      - ${m.type}: ${m.title}`);
        });
      }
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTemplateIssues();
