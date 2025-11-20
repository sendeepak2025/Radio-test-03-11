/**
 * Quick Test Script for Enhanced Reporting Features
 * Run with: node server/test-enhanced-reporting.js
 */

const { validateReportForSigning, getModalityValidationPreview } = require('./src/utils/modalityValidationRules');

console.log('🧪 Testing Enhanced Reporting Features\n');

// Test 1: CT Contrast Validation
console.log('Test 1: CT Contrast Validation');
const ctReport = {
  modality: 'CT',
  technique: 'CT abdomen with IV contrast',
  findingsText: 'Liver appears normal', // Missing contrast enhancement
  impression: 'Normal study',
  clinicalHistory: 'Abdominal pain'
};

const ctValidation = validateReportForSigning(ctReport);
console.log('  Result:', ctValidation.valid ? '✅ PASS' : '❌ FAIL');
console.log('  Errors:', ctValidation.errors);
console.log('  Expected: Should fail (contrast not documented)\n');

// Test 2: MRI Sequence Validation
console.log('Test 2: MRI Sequence Validation');
const mriReport = {
  modality: 'MRI',
  technique: 'MRI brain', // Missing sequences
  findingsText: 'Brain appears normal',
  impression: 'Normal study',
  clinicalHistory: 'Headache'
};

const mriValidation = validateReportForSigning(mriReport);
console.log('  Result:', mriValidation.valid ? '✅ PASS' : '❌ FAIL');
console.log('  Errors:', mriValidation.errors);
console.log('  Expected: Should fail (sequences not documented)\n');

// Test 3: X-Ray View Validation
console.log('Test 3: X-Ray View Validation');
const xrayReport = {
  modality: 'CR',
  technique: 'Chest radiograph obtained', // Missing views
  findingsText: 'Lungs are clear, heart size normal',
  impression: 'Normal chest x-ray',
  clinicalHistory: 'Cough'
};

const xrayValidation = validateReportForSigning(xrayReport);
console.log('  Result:', xrayValidation.valid ? '✅ PASS' : '❌ FAIL');
console.log('  Errors:', xrayValidation.errors);
console.log('  Expected: Should fail (views not specified)\n');

// Test 4: Valid CT Report
console.log('Test 4: Valid CT Report (Should Pass)');
const validCTReport = {
  modality: 'CT',
  technique: 'CT chest with IV contrast, 2.5mm slices, arterial and portal venous phases',
  findingsText: 'Lungs are clear. Mediastinum is normal. Heart shows normal size with homogeneous contrast enhancement. No masses or lymphadenopathy.',
  impression: 'Normal CT chest',
  clinicalHistory: 'Chest pain'
};

const validCTValidation = validateReportForSigning(validCTReport);
console.log('  Result:', validCTValidation.valid ? '✅ PASS' : '❌ FAIL');
console.log('  Errors:', validCTValidation.errors);
console.log('  Expected: Should pass (all requirements met)\n');

// Test 5: Validation Preview
console.log('Test 5: Validation Preview for Different Modalities\n');

const modalities = ['CT', 'MR', 'CR', 'XA', 'US', 'MG'];
modalities.forEach(modality => {
  const preview = getModalityValidationPreview(modality);
  console.log(`  ${modality}:`);
  console.log(`    Required: ${preview.requiredFields.join(', ')}`);
  console.log(`    Rules: ${preview.specialRules.join('; ')}`);
  console.log('');
});

// Summary
console.log('═══════════════════════════════════════════════════');
console.log('✅ All validation tests completed!');
console.log('═══════════════════════════════════════════════════\n');

console.log('Next Steps:');
console.log('1. Start the server: npm start');
console.log('2. Seed templates: node src/seed/seedEnhancedTemplates.js');
console.log('3. Test API: curl http://localhost:5000/api/reports/templates\n');
