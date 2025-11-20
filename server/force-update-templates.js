/**
 * Force update enhanced templates in database
 * Run this to refresh template definitions with latest diagram configs
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { seedEnhancedTemplatesWithModules } = require('./src/seed/seedEnhancedTemplatesWithModules');

async function forceUpdateTemplates() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Removing old templates...');
    const ReportTemplate = require('./src/models/ReportTemplate');
    
    // Delete the specific templates that need updating
    await ReportTemplate.deleteMany({
      templateId: { $in: ['MAMMO-BIRADS-01', 'MRI-SPINE-01', 'CT-CHEST-NODULE-01'] }
    });
    console.log('✅ Old templates removed');

    console.log('🌱 Seeding new templates with correct diagram configs...');
    await seedEnhancedTemplatesWithModules();
    
    console.log('\n✅ Templates force-updated successfully!');
    console.log('\n📊 Template Details:');
    
    const templates = await ReportTemplate.find({
      templateId: { $in: ['MAMMO-BIRADS-01', 'MRI-SPINE-01', 'CT-CHEST-NODULE-01'] }
    });
    
    templates.forEach(t => {
      console.log(`\n📄 ${t.name} (${t.templateId})`);
      console.log(`   UI Modules: ${t.uiModules?.length || 0}`);
      t.uiModules?.forEach(m => {
        console.log(`   - ${m.title} (${m.type})`);
        if (m.type === 'diagram') {
          console.log(`     Body Part: ${m.config?.bodyPart || 'NOT SET'}`);
          console.log(`     View: ${m.config?.view || 'NOT SET'}`);
        }
      });
    });
    
    console.log('\n✨ Done! Please refresh your browser to see the updated diagrams.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating templates:', error);
    process.exit(1);
  }
}

forceUpdateTemplates();
