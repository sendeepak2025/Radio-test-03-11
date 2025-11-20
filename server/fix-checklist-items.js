// Quick fix script to correct all checklist items in seedComprehensiveTemplates.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'seed', 'seedComprehensiveTemplates.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf-8');

// Define all checklist replacements (from object format to string array format)
const replacements = [
  {
    // Chest X-Ray checklist
    old: `items: ['Replace with proper array']`,
    new: `items: [
            'Airway - trachea midline',
            'Breathing - lung fields clear',
            'Circulation - heart size normal',
            'Diaphragm - sharp costophrenic angles',
            'Bones - no fractures/lesions',
            'Soft tissues - unremarkable'
          ]`
  }
];

// Apply first replacement to test
for (const replacement of replacements) {
  content = content.replace(replacement.old, replacement.new);
}

// Write back
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Fixed checklist items format');
