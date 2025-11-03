// Test script to verify production infrastructure
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Production Infrastructure...\n');

// Test 1: Check all backend files exist
console.log('📁 Test 1: Checking backend files...');
const backendFiles = [
  'server/src/models/WorklistItem.js',
  'server/src/models/Report.js',
  'server/src/services/worklist-service.js',
  'server/src/services/report-service.js',
  'server/src/routes/worklist.js',
  'server/src/routes/reports.js'
];

let backendPass = true;
backendFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) backendPass = false;
});

// Test 2: Check all frontend files exist
console.log('\n📁 Test 2: Checking frontend files...');
const frontendFiles = [
  'viewer/src/pages/worklist/EnhancedWorklistPage.tsx',
  'viewer/src/components/reports/PriorStudiesPanel.tsx',
  'viewer/src/App.tsx'
];

let frontendPass = true;
frontendFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) frontendPass = false;
});

// Test 3: Check documentation files
console.log('\n📚 Test 3: Checking documentation...');
const docFiles = [
  'START_HERE.md',
  'PRODUCTION_INFRASTRUCTURE_COMPLETE.md',
  'PRODUCTION_QUICK_START.md',
  'DEPLOYMENT_CHECKLIST.md'
];

let docPass = true;
docFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) docPass = false;
});

// Test 4: Check setup scripts
console.log('\n🔧 Test 4: Checking setup scripts...');
const scriptFiles = [
  'setup-production-infrastructure.sh',
  'setup-production-infrastructure.ps1'
];

let scriptPass = true;
scriptFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) scriptPass = false;
});

// Test 5: Verify routes are registered
console.log('\n🔌 Test 5: Checking route registration...');
const indexContent = fs.readFileSync('server/src/routes/index.js', 'utf8');
const routeChecks = [
  { name: 'Worklist routes imported', check: indexContent.includes("require('./worklist')") },
  { name: 'Reports routes imported', check: indexContent.includes("require('./reports')") },
  { name: 'Worklist routes registered', check: indexContent.includes("router.use('/api/worklist'") },
  { name: 'Reports routes registered', check: indexContent.includes("router.use('/api/reports-v2'") }
];

let routePass = true;
routeChecks.forEach(({ name, check }) => {
  console.log(`  ${check ? '✅' : '❌'} ${name}`);
  if (!check) routePass = false;
});

// Test 6: Verify App.tsx uses EnhancedWorklistPage
console.log('\n⚛️  Test 6: Checking App.tsx configuration...');
const appContent = fs.readFileSync('viewer/src/App.tsx', 'utf8');
const appChecks = [
  { name: 'EnhancedWorklistPage imported', check: appContent.includes("import EnhancedWorklistPage") },
  { name: 'Worklist route configured', check: appContent.includes("<EnhancedWorklistPage />") }
];

let appPass = true;
appChecks.forEach(({ name, check }) => {
  console.log(`  ${check ? '✅' : '❌'} ${name}`);
  if (!check) appPass = false;
});

// Test 7: Check for syntax errors (basic)
console.log('\n🔍 Test 7: Checking for basic syntax errors...');
let syntaxPass = true;

try {
  require('./server/src/models/WorklistItem.js');
  console.log('  ✅ WorklistItem.js - No syntax errors');
} catch (e) {
  console.log('  ❌ WorklistItem.js - Syntax error:', e.message);
  syntaxPass = false;
}

try {
  require('./server/src/models/Report.js');
  console.log('  ✅ Report.js - No syntax errors');
} catch (e) {
  console.log('  ❌ Report.js - Syntax error:', e.message);
  syntaxPass = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Backend Files:     ${backendPass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Frontend Files:    ${frontendPass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Documentation:     ${docPass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Setup Scripts:     ${scriptPass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Route Registration: ${routePass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`App Configuration: ${appPass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Syntax Check:      ${syntaxPass ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(60));

const allPass = backendPass && frontendPass && docPass && scriptPass && routePass && appPass && syntaxPass;

if (allPass) {
  console.log('\n🎉 ALL TESTS PASSED! Infrastructure is ready!');
  console.log('\n📋 Next Steps:');
  console.log('1. Start backend: cd server && npm start');
  console.log('2. Start frontend: cd viewer && npm run dev');
  console.log('3. Run setup: .\\setup-production-infrastructure.ps1');
  console.log('4. Open worklist: http://localhost:5173/worklist');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED! Please review the errors above.');
  process.exit(1);
}
