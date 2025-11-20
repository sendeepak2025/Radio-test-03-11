/**
 * Test Report Data Flow
 * Verify that sections data is properly stored and retrieved
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testReportDataFlow() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');
    
    const StructuredReport = require('./src/models/StructuredReport');
    
    // Find the most recent report
    const report = await StructuredReport.findOne().sort({ updatedAt: -1 }).lean();
    
    if (!report) {
      console.log('❌ No reports found in database');
      process.exit(1);
    }
    
    console.log('📊 Most Recent Report Analysis');
    console.log('================================\n');
    
    console.log(`Report ID: ${report.reportId}`);
    console.log(`Template ID: ${report.templateId || 'None'}`);
    console.log(`Template Name: ${report.templateName || 'None'}`);
    console.log(`Status: ${report.reportStatus}`);
    console.log(`Version: ${report.version}\n`);
    
    console.log('=== SECTIONS OBJECT ===');
    if (report.sections && typeof report.sections === 'object') {
      const sectionKeys = Object.keys(report.sections);
      console.log(`Total keys in sections: ${sectionKeys.length}\n`);
      
      // Separate UI modules from regular sections
      const uiModuleKeys = sectionKeys.filter(k => k.startsWith('uiModule_'));
      const regularSectionKeys = sectionKeys.filter(k => !k.startsWith('uiModule_'));
      
      console.log(`Regular sections (${regularSectionKeys.length}):`);
      regularSectionKeys.forEach(key => {
        const value = report.sections[key];
        const preview = String(value).substring(0, 50);
        console.log(`  - ${key}: "${preview}${String(value).length > 50 ? '...' : ''}"`);
      });
      
      console.log(`\nUI Modules (${uiModuleKeys.length}):`);
      uiModuleKeys.forEach(key => {
        const value = report.sections[key];
        let preview;
        try {
          const parsed = JSON.parse(value);
          preview = JSON.stringify(parsed).substring(0, 80);
        } catch {
          preview = String(value).substring(0, 80);
        }
        console.log(`  - ${key}: ${preview}${String(value).length > 80 ? '...' : ''}`);
      });
    } else {
      console.log('❌ No sections object found');
    }
    
    console.log('\n=== TOP-LEVEL FIELDS ===');
    console.log(`clinicalHistory: "${report.clinicalHistory || '(empty)'}"`);
    console.log(`technique: "${report.technique || '(empty)'}"`);
    console.log(`findingsText: "${report.findingsText || '(empty)'}"`);
    console.log(`impression: "${report.impression || '(empty)'}"`);
    console.log(`recommendations: "${report.recommendations || '(empty)'}"`);
    
    console.log('\n=== DATA CONSISTENCY CHECK ===');
    
    // Check if sections data matches top-level fields
    const issues = [];
    
    if (report.templateId) {
      // Template-based report
      console.log('✅ Template-based report detected\n');
      
      // Check clinical history
      const sectionClinicalHistory = report.sections?.clinical_indication || 
                                     report.sections?.clinical_history || 
                                     report.sections?.clinicalHistory || '';
      if (sectionClinicalHistory && !report.clinicalHistory) {
        issues.push('❌ clinical_indication in sections but clinicalHistory is empty');
      } else if (sectionClinicalHistory !== report.clinicalHistory) {
        console.log(`⚠️  Mismatch: sections.clinical_indication="${sectionClinicalHistory.substring(0, 30)}..." vs clinicalHistory="${report.clinicalHistory?.substring(0, 30) || '(empty)'}..."`);
      } else if (sectionClinicalHistory) {
        console.log(`✅ clinicalHistory synced correctly`);
      }
      
      // Check technique
      const sectionTechnique = report.sections?.technique || '';
      if (sectionTechnique && !report.technique) {
        issues.push('❌ technique in sections but technique field is empty');
      } else if (sectionTechnique !== report.technique) {
        console.log(`⚠️  Mismatch: sections.technique="${sectionTechnique.substring(0, 30)}..." vs technique="${report.technique?.substring(0, 30) || '(empty)'}..."`);
      } else if (sectionTechnique) {
        console.log(`✅ technique synced correctly`);
      }
      
      // Check findings
      const sectionFindings = report.sections?.findings || report.sections?.findingsText || '';
      if (sectionFindings && !report.findingsText) {
        issues.push('❌ findings in sections but findingsText is empty');
      } else if (sectionFindings !== report.findingsText) {
        console.log(`⚠️  Mismatch: sections.findings="${sectionFindings.substring(0, 30)}..." vs findingsText="${report.findingsText?.substring(0, 30) || '(empty)'}..."`);
      } else if (sectionFindings) {
        console.log(`✅ findingsText synced correctly`);
      }
      
      // Check impression
      const sectionImpression = report.sections?.impression || '';
      if (sectionImpression && !report.impression) {
        issues.push('❌ impression in sections but impression field is empty');
      } else if (sectionImpression !== report.impression) {
        console.log(`⚠️  Mismatch: sections.impression="${sectionImpression.substring(0, 30)}..." vs impression="${report.impression?.substring(0, 30) || '(empty)'}..."`);
      } else if (sectionImpression) {
        console.log(`✅ impression synced correctly`);
      }
      
      // Check recommendations
      const sectionRecommendations = report.sections?.recommendations || '';
      if (sectionRecommendations && !report.recommendations) {
        issues.push('❌ recommendations in sections but recommendations field is empty');
      } else if (sectionRecommendations !== report.recommendations) {
        console.log(`⚠️  Mismatch: sections.recommendations="${sectionRecommendations.substring(0, 30)}..." vs recommendations="${report.recommendations?.substring(0, 30) || '(empty)'}..."`);
      } else if (sectionRecommendations) {
        console.log(`✅ recommendations synced correctly`);
      }
    } else {
      console.log('ℹ️  Non-template report');
    }
    
    if (issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('\n✅ No data consistency issues found!');
    }
    
    console.log('\n=== RECOMMENDATION ===');
    if (report.templateId && report.sections && Object.keys(report.sections).length > 0) {
      console.log('✅ Data is stored in sections object (correct for template-based reports)');
      console.log('✅ Preview should read from sections object using templateSections');
      console.log('✅ Top-level fields are for backward compatibility only');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testReportDataFlow();
