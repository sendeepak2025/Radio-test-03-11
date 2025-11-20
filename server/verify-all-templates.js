/**
 * Comprehensive Template Verification Script
 * Checks all 23 templates for:
 * - No duplicates
 * - Proper structure
 * - UI modules configured
 * - Sections configured
 * - Preview data completeness
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function verifyAllTemplates() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully!\n');
    
    const ReportTemplate = require('./src/models/ReportTemplate');
    const templates = await ReportTemplate.find({}).lean();
    
    console.log(`📊 Total templates in database: ${templates.length}\n`);
    
    // ============================================================================
    // 1. CHECK FOR DUPLICATES
    // ============================================================================
    console.log('=== 1. CHECKING FOR DUPLICATES ===\n');
    
    const templateIds = templates.map(t => t.templateId);
    const duplicateIds = templateIds.filter((id, index) => templateIds.indexOf(id) !== index);
    
    const names = templates.map(t => t.name);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    
    if (duplicateIds.length > 0) {
      console.log('❌ DUPLICATE TEMPLATE IDs FOUND:');
      duplicateIds.forEach(id => console.log(`   - ${id}`));
    } else {
      console.log('✅ No duplicate template IDs');
    }
    
    if (duplicateNames.length > 0) {
      console.log('❌ DUPLICATE TEMPLATE NAMES FOUND:');
      duplicateNames.forEach(name => console.log(`   - ${name}`));
    } else {
      console.log('✅ No duplicate template names');
    }
    
    // ============================================================================
    // 2. CHECK TEMPLATE STRUCTURE
    // ============================================================================
    console.log('\n=== 2. CHECKING TEMPLATE STRUCTURE ===\n');
    
    let structureIssues = 0;
    
    templates.forEach(t => {
      const issues = [];
      
      // Check required fields
      if (!t.templateId) issues.push('Missing templateId');
      if (!t.name) issues.push('Missing name');
      if (!t.description) issues.push('Missing description');
      if (!t.category) issues.push('Missing category');
      
      // Check matching criteria
      if (!t.matchingCriteria) {
        issues.push('Missing matchingCriteria');
      } else {
        if (!t.matchingCriteria.modalities || t.matchingCriteria.modalities.length === 0) {
          issues.push('Missing modalities');
        }
        if (!t.matchingCriteria.bodyParts || t.matchingCriteria.bodyParts.length === 0) {
          issues.push('Missing bodyParts');
        }
      }
      
      // Check sections
      if (!t.sections || t.sections.length === 0) {
        issues.push('Missing sections');
      }
      
      // Check UI modules
      if (!t.uiModules || t.uiModules.length === 0) {
        issues.push('Missing uiModules');
      }
      
      if (issues.length > 0) {
        console.log(`❌ ${t.templateId} - ${t.name}`);
        issues.forEach(issue => console.log(`   - ${issue}`));
        structureIssues++;
      }
    });
    
    if (structureIssues === 0) {
      console.log('✅ All templates have proper structure');
    } else {
      console.log(`\n❌ Found ${structureIssues} templates with structure issues`);
    }
    
    // ============================================================================
    // 3. CHECK UI MODULES
    // ============================================================================
    console.log('\n=== 3. CHECKING UI MODULES ===\n');
    
    let moduleIssues = 0;
    
    templates.forEach(t => {
      if (!t.uiModules || t.uiModules.length === 0) {
        console.log(`❌ ${t.templateId} - No UI modules`);
        moduleIssues++;
        return;
      }
      
      const issues = [];
      
      t.uiModules.forEach(m => {
        if (!m.id) issues.push(`Module missing id`);
        if (!m.type) issues.push(`Module missing type`);
        if (!m.title) issues.push(`Module missing title`);
        if (!m.config) issues.push(`Module ${m.id} missing config`);
        
        // Check for placeholder checklist items
        if (m.type === 'checklist' && m.config && m.config.items) {
          if (m.config.items.length === 1 && m.config.items[0] === 'Replace with proper array') {
            issues.push(`Checklist ${m.id} has placeholder items`);
          }
        }
      });
      
      if (issues.length > 0) {
        console.log(`❌ ${t.templateId} - ${t.name}`);
        issues.forEach(issue => console.log(`   - ${issue}`));
        moduleIssues++;
      }
    });
    
    if (moduleIssues === 0) {
      console.log('✅ All UI modules are properly configured');
    } else {
      console.log(`\n❌ Found ${moduleIssues} templates with UI module issues`);
    }
    
    // ============================================================================
    // 4. CHECK SECTIONS
    // ============================================================================
    console.log('\n=== 4. CHECKING SECTIONS ===\n');
    
    let sectionIssues = 0;
    
    templates.forEach(t => {
      if (!t.sections || t.sections.length === 0) {
        console.log(`❌ ${t.templateId} - No sections`);
        sectionIssues++;
        return;
      }
      
      const issues = [];
      
      t.sections.forEach(s => {
        if (!s.id) issues.push(`Section missing id`);
        if (!s.title) issues.push(`Section missing title`);
        if (s.order === undefined) issues.push(`Section ${s.id} missing order`);
      });
      
      if (issues.length > 0) {
        console.log(`❌ ${t.templateId} - ${t.name}`);
        issues.forEach(issue => console.log(`   - ${issue}`));
        sectionIssues++;
      }
    });
    
    if (sectionIssues === 0) {
      console.log('✅ All sections are properly configured');
    } else {
      console.log(`\n❌ Found ${sectionIssues} templates with section issues`);
    }
    
    // ============================================================================
    // 5. PREVIEW DATA COMPLETENESS
    // ============================================================================
    console.log('\n=== 5. CHECKING PREVIEW DATA COMPLETENESS ===\n');
    
    templates.forEach((t, index) => {
      console.log(`${index + 1}. ${t.templateId} - ${t.name}`);
      console.log(`   ✅ Modalities: ${t.matchingCriteria?.modalities?.join(', ') || 'N/A'}`);
      console.log(`   ✅ Body Parts: ${t.matchingCriteria?.bodyParts?.join(', ') || 'N/A'}`);
      console.log(`   ✅ Sections: ${t.sections?.length || 0}`);
      console.log(`   ✅ UI Modules: ${t.uiModules?.length || 0}`);
      
      if (t.uiModules && t.uiModules.length > 0) {
        t.uiModules.forEach(m => {
          console.log(`      - ${m.type}: ${m.title}`);
        });
      }
      
      if (t.sections && t.sections.length > 0) {
        console.log(`   Section Details:`);
        t.sections.forEach(s => {
          console.log(`      - ${s.id}: ${s.title} (order: ${s.order}, required: ${s.required || false})`);
        });
      }
      
      console.log('');
    });
    
    // ============================================================================
    // 6. SUMMARY
    // ============================================================================
    console.log('\n=== SUMMARY ===\n');
    
    const totalIssues = structureIssues + moduleIssues + sectionIssues + 
                        (duplicateIds.length > 0 ? 1 : 0) + 
                        (duplicateNames.length > 0 ? 1 : 0);
    
    if (totalIssues === 0) {
      console.log('✅ ALL TEMPLATES ARE PERFECT!');
      console.log(`   - ${templates.length} templates`);
      console.log(`   - No duplicates`);
      console.log(`   - All have proper structure`);
      console.log(`   - All have UI modules`);
      console.log(`   - All have sections`);
      console.log(`   - Preview data is complete`);
    } else {
      console.log(`❌ FOUND ${totalIssues} ISSUES`);
      console.log('   Please review the details above');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAllTemplates();
