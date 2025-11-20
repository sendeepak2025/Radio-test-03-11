/**
 * Re-seed report templates - Force clean database and reload all templates
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { seedEnhancedTemplatesWithModules } = require('./src/seed/seedEnhancedTemplatesWithModules');

async function reseedTemplates() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const ReportTemplate = require('./src/models/ReportTemplate');
    
    console.log('\n🗑️  Removing ALL existing templates...');
    const deleteResult = await ReportTemplate.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} templates`);

    console.log('\n🌱 Re-seeding enhanced templates with UI modules...');
    await seedEnhancedTemplatesWithModules();
    
    console.log('\n📊 Verifying seeded templates...');
    const templates = await ReportTemplate.find({}).sort({ name: 1 });
    
    console.log(`\n✅ Total templates in database: ${templates.length}\n`);
    
    templates.forEach((t, index) => {
      console.log(`${index + 1}. 📄 ${t.name} (${t.templateId})`);
      console.log(`   Category: ${t.category}`);
      console.log(`   Modalities: ${t.matchingCriteria?.modalities?.join(', ') || 'N/A'}`);
      console.log(`   Body Parts: ${t.matchingCriteria?.bodyParts?.join(', ') || 'N/A'}`);
      console.log(`   UI Modules: ${t.uiModules?.length || 0}`);
      
      if (t.uiModules && t.uiModules.length > 0) {
        t.uiModules.forEach((m, idx) => {
          console.log(`      ${idx + 1}. ${m.title || m.id} (${m.type})`);
          if (m.type === 'diagram') {
            console.log(`         └─ Body Part: ${m.config?.bodyPart || 'NOT SET'} | View: ${m.config?.view || 'NOT SET'}`);
          }
        });
      }
      console.log('');
    });
    
    console.log('\n✨ Re-seeding complete! Please restart the server or refresh your browser.');
    console.log('🔄 To apply changes: Stop the server (Ctrl+C) and run "npm start"\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error re-seeding templates:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

reseedTemplates();
