# 🚀 Smart Template System - Quick Start Guide

## 5-Minute Setup

### Step 1: Seed Default Templates (1 minute)

```bash
cd server
node src/seed/seedReportTemplates.js
```

✅ Creates 5 default templates:
1. Coronary Angiography
2. Chest X-Ray
3. Brain MRI
4. CT Abdomen/Pelvis
5. General Radiology

---

### Step 2: Test Auto-Selection (2 minutes)

```javascript
// Test with Coronary Angiography study
const response = await fetch('/api/report-templates/auto-select', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    modality: 'XA',
    bodyPart: 'HEART',
    studyDescription: 'Coronary Angiography'
  })
});

const result = await response.json();
console.log('✅ Selected:', result.template.name);
console.log('📊 Score:', result.matchScore);
// Output: ✅ Selected: Coronary Angiography Report
//         📊 Score: 100
```

---

### Step 3: Create Report with Auto-Template (2 minutes)

```javascript
// Create consolidated report - template auto-selected!
const response = await fetch('/api/structured-reports/consolidated', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studyInstanceUID: '1.2.3.4.5',
    patientID: 'P12345',
    patientName: 'John Doe',
    modality: 'XA',
    bodyPart: 'HEART',
    studyDescription: 'Coronary Angiography',
    radiologistName: 'Dr. Smith',
    frames: aiAnalysisResults
  })
});

const result = await response.json();
console.log('✅ Report created with template:', result.template.name);
console.log('📋 Template sections:', result.report.templateSections);
console.log('🎯 Match score:', result.template.matchScore);
```

---

## 🎯 How It Works

### Automatic Selection

When you create a consolidated report, the system:

1. **Analyzes Study** - Looks at modality, body part, description
2. **Scores Templates** - Calculates match score for each template
3. **Selects Best Match** - Picks highest scoring template
4. **Applies Template** - Adds sections, fields, and options to report

### Scoring Example

**Study:** XA Coronary Angiography, HEART

```
Template: Coronary Angiography Report
├─ Modality Match (XA = XA)           → 50 points
├─ Body Part Match (HEART in [HEART]) → 30 points
├─ Keyword Match ("coronary" found)   → 5 points
└─ Procedure Type (diagnostic)        → 15 points
                                        ─────────
                                Total:  100 points ✅
```

---

## 📋 Available Templates

### 1. Coronary Angiography (Priority: 100)
- **Modalities:** XA, RF
- **Body Parts:** HEART, CHEST, CARDIAC
- **Keywords:** coronary, angiography, cardiac cath
- **Sections:** 7 specialized sections
- **Fields:** Vessels, Stenosis grades, TIMI flow

### 2. Chest X-Ray (Priority: 90)
- **Modalities:** CR, DX, RF
- **Body Parts:** CHEST, THORAX, LUNG
- **Keywords:** chest, thorax, cxr
- **Sections:** 5 standard sections
- **Fields:** Lung fields, Heart size, Bones

### 3. Brain MRI (Priority: 85)
- **Modalities:** MR, MRI
- **Body Parts:** BRAIN, HEAD, SKULL
- **Keywords:** brain, head, mri, cerebral
- **Sections:** 5 standard sections
- **Fields:** Gray matter, White matter, Ventricles

### 4. CT Abdomen/Pelvis (Priority: 80)
- **Modalities:** CT
- **Body Parts:** ABDOMEN, PELVIS
- **Keywords:** abdomen, pelvis, abdominal
- **Sections:** 5 standard sections
- **Fields:** Liver, Kidneys, Pancreas, Bowel

### 5. General Radiology (Priority: 0 - Fallback)
- **Modalities:** All
- **Body Parts:** All
- **Keywords:** None (catches everything)
- **Sections:** 6 generic sections

---

## 🔧 Common Operations

### Get All Templates
```javascript
const response = await fetch('/api/report-templates', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { templates } = await response.json();
```

### Search Templates
```javascript
const response = await fetch('/api/report-templates?search=coronary', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Filter by Category
```javascript
const response = await fetch('/api/report-templates?category=cardiology', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Get Template Suggestions
```javascript
const response = await fetch('/api/report-templates/suggest', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    modality: 'CT',
    bodyPart: 'CHEST'
  })
});
const { suggestions } = await response.json();
// Returns top 3 matching templates
```

### Rate a Template
```javascript
const response = await fetch('/api/report-templates/TPL-CORONARY-ANGIO-001/rate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rating: 5,
    comment: 'Excellent template!'
  })
});
```

---

## 📊 What You Get

### In Report Response

```json
{
  "success": true,
  "report": {
    "reportId": "SR-...",
    "templateId": "TPL-CORONARY-ANGIO-001",
    "templateName": "Coronary Angiography Report",
    "templateSections": [
      {
        "id": "clinical-indication",
        "title": "Clinical Indication",
        "order": 1,
        "required": true
      },
      ...
    ],
    "templateFields": {
      "vessels": ["LAD", "LCX", "RCA", "LM"],
      "stenosisGrade": ["Normal", "Mild", "Moderate", "Severe"]
    },
    "fieldOptions": {
      "timiFlow": ["TIMI 0", "TIMI 1", "TIMI 2", "TIMI 3"]
    }
  },
  "template": {
    "templateId": "TPL-CORONARY-ANGIO-001",
    "name": "Coronary Angiography Report",
    "category": "cardiology",
    "matchScore": 100,
    "matchDetails": {
      "modalityMatch": 50,
      "bodyPartMatch": 30,
      "keywordMatch": 5,
      "procedureTypeMatch": 15
    }
  }
}
```

---

## 🎨 Create Custom Template

```javascript
const customTemplate = {
  name: "My Custom Template",
  description: "Custom template for specific use case",
  category: "cardiology",
  matchingCriteria: {
    modalities: ["XA"],
    bodyParts: ["HEART"],
    keywords: ["custom", "special"],
    procedureTypes: ["diagnostic"]
  },
  sections: [
    {
      id: "indication",
      title: "Clinical Indication",
      order: 1,
      required: true,
      placeholder: "Enter indication..."
    }
  ],
  priority: 95,
  active: true
};

const response = await fetch('/api/report-templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(customTemplate)
});
```

---

## 📈 View Analytics

```javascript
const response = await fetch('/api/report-templates/analytics/usage', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { analytics } = await response.json();
console.log('Most used:', analytics.mostUsed.name);
console.log('Total templates:', analytics.totalTemplates);
console.log('By category:', analytics.byCategory);
```

---

## ✅ Benefits

**For You:**
- ⚡ Faster reporting (pre-filled sections)
- 📋 Consistent format
- ✅ No missed sections
- 🎯 Specialty-specific fields

**For System:**
- 🤖 Automatic selection
- 📊 Usage tracking
- ⭐ Quality ratings
- 🔧 Easy customization

---

## 🆘 Troubleshooting

### No Template Selected?
- Check if templates are seeded: `node src/seed/seedReportTemplates.js`
- Verify study has modality and body part
- Check template priorities

### Wrong Template Selected?
- Review match scores in response
- Adjust template priorities
- Add more specific keywords
- Create custom template

### Template Not Appearing?
- Check `active: true` in template
- Verify matching criteria
- Check priority (higher = preferred)

---

## 📚 Full Documentation

See `SMART_TEMPLATE_SYSTEM_COMPLETE.md` for:
- Complete API reference
- Detailed algorithm explanation
- Advanced customization
- Performance metrics
- Future enhancements

---

**Status: READY TO USE** ✅

Start using smart templates in your reports today! 🚀
