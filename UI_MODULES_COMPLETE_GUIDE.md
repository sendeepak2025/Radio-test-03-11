# UI Modules (Specialized Assessment Tools) - Complete Guide

## Overview

UI Modules are interactive assessment tools that are different for each template. They are now properly:
- ✅ Stored in database
- ✅ Displayed in preview
- ✅ Included in PDF export

## Supported UI Module Types

### 1. Calculator Modules
**Example**: BI-RADS Calculator (Mammography)

```javascript
{
  id: "birads_calculator",
  type: "calculator",
  title: "BI-RADS Assessment",
  config: {
    type: "birads",
    criteria: [...]
  }
}
```

**Stored Data**:
```json
{
  "selections": {
    "mass": "none",
    "calcifications": "benign",
    "asymmetry": "none"
  },
  "score": 1,
  "category": 1,
  "recommendation": "Negative - Routine screening",
  "findings": ["Calcifications: Benign (coarse, popcorn)"]
}
```

### 2. Measurement Modules
**Example**: Breast Measurements, Nodule Measurements

```javascript
{
  id: "breast_measurements",
  type: "measurements",
  title: "Lesion Measurements",
  config: {
    defaultUnit: "mm",
    allowedUnits: ["mm", "cm"],
    predefinedLabels: ["Mass AP", "Mass Transverse", ...]
  }
}
```

**Stored Data**:
```json
[
  {
    "id": "meas-1763629322034",
    "label": "Mass AP",
    "value": "12",
    "unit": "mm",
    "notes": "Right breast 2 o'clock"
  }
]
```

### 3. Checklist Modules
**Example**: Spine Level Assessment

```javascript
{
  id: "spine_checklist",
  type: "checklist",
  title: "Vertebral Level Assessment",
  config: {
    items: ["L1", "L2", "L3", "L4", "L5", "S1"],
    statusOptions: ["Normal", "Degenerative", "Disc Herniation", ...]
  }
}
```

**Stored Data**:
```json
{
  "items": {
    "L1": "Normal",
    "L2": "Normal",
    "L3": "Degenerative",
    "L4": "Disc Herniation",
    "L5": "Normal"
  }
}
```

### 4. Diagram Modules
**Example**: Breast Diagram, Spine Diagram

```javascript
{
  id: "breast_diagram",
  type: "diagram",
  title: "Breast Lesion Localization",
  config: {
    bodyPart: "breast",
    view: "bilateral",
    allowedTools: ["point", "circle", "ruler"]
  }
}
```

**Stored Data**:
```json
[
  {
    "id": "mark-1",
    "type": "circle",
    "x": 150,
    "y": 200,
    "radius": 10,
    "label": "Mass"
  }
]
```

## Data Storage Structure

### In Database (MongoDB)
```json
{
  "_id": "691e0a30843d70fc1ae60b67",
  "templateId": "MAMMO-BIRADS-01",
  "sections": {
    // Standard fields
    "technique": "Standard two-view mammography...",
    "findings": "No suspicious masses...",
    "impression": "BI-RADS Category 1",
    
    // Template-specific fields
    "breast_composition": "Breast density B",
    
    // UI Modules (stored with uiModule_ prefix)
    "uiModule_birads_calculator": "{\"selections\":{...},\"score\":1,\"category\":1}",
    "uiModule_breast_measurements": "[{\"id\":\"...\",\"label\":\"...\"}]",
    "uiModule_breast_diagram": "[]"
  }
}
```

## Preview Display

### Preview Dialog Structure
```
┌─────────────────────────────────────────┐
│ MEDICAL IMAGING REPORT                  │
├─────────────────────────────────────────┤
│ Patient Information                     │
│ Clinical History                        │
│ Technique                               │
│ Findings                                │
│ Impression                              │
│ Recommendations                         │
├─────────────────────────────────────────┤
│ ASSESSMENT TOOLS RESULTS                │
│                                         │
│ BI-RADS CALCULATOR                      │
│   BI-RADS Category: 1                   │
│   Recommendation: Negative - Routine... │
│   Findings:                             │
│     • Calcifications: Benign            │
│                                         │
│ BREAST MEASUREMENTS                     │
│   • Mass AP: 12 mm (Right breast...)    │
│   • Mass Transverse: 8 mm               │
│                                         │
│ BREAST DIAGRAM                          │
│   2 marking(s) on diagram               │
├─────────────────────────────────────────┤
│ ADDITIONAL TEMPLATE FIELDS              │
│ BREAST COMPOSITION                      │
│   Breast density B                      │
└─────────────────────────────────────────┘
```

### Preview Code
```typescript
{/* UI Module Results */}
{reportData.sections && Object.entries(reportData.sections)
  .filter(([key]) => key.startsWith('uiModule_'))
  .map(([key, value]) => {
    const moduleId = key.replace('uiModule_', '');
    const parsedData = JSON.parse(value);
    
    return (
      <Box key={key}>
        <Typography variant="body2" fontWeight="bold">
          {moduleId.replace(/_/g, ' ').toUpperCase()}
        </Typography>
        
        {/* BI-RADS Calculator */}
        {moduleId === 'birads_calculator' && (
          <Box>
            <Typography>BI-RADS Category: {parsedData.category}</Typography>
            <Typography>{parsedData.recommendation}</Typography>
          </Box>
        )}
        
        {/* Measurements */}
        {moduleId.includes('measurement') && Array.isArray(parsedData) && (
          <Box>
            {parsedData.map(m => (
              <Typography>• {m.label}: {m.value} {m.unit}</Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  })
}
```

## PDF Export

### PDF Structure
```
┌─────────────────────────────────────────┐
│ MEDICAL IMAGING CENTER                  │
│ RADIOLOGY REPORT                        │
├─────────────────────────────────────────┤
│ PATIENT INFORMATION                     │
│ STUDY INFORMATION                       │
├─────────────────────────────────────────┤
│ Clinical History                        │
│ Technique                               │
│ Findings                                │
│ Impression                              │
│ Recommendations                         │
├─────────────────────────────────────────┤
│ ASSESSMENT TOOLS RESULTS                │
│                                         │
│ BI-RADS CALCULATOR                      │
│   BI-RADS Category: 1                   │
│   Recommendation: Negative - Routine... │
│   Findings:                             │
│     • Calcifications: Benign            │
│                                         │
│ BREAST MEASUREMENTS                     │
│   • Mass AP: 12 mm (Right breast...)    │
│   • Mass Transverse: 8 mm               │
│                                         │
│ BREAST DIAGRAM                          │
│   2 marking(s) on diagram               │
├─────────────────────────────────────────┤
│ ADDITIONAL TEMPLATE FIELDS              │
│ Breast Composition                      │
│   Breast density B                      │
├─────────────────────────────────────────┤
│ DIGITAL SIGNATURE                       │
│ [Signature Image]                       │
│ Signed by: Dr. Smith                    │
│ Date: 2025-11-20                        │
└─────────────────────────────────────────┘
```

### PDF Code
```javascript
// UI Module Results
if (report.templateId && report.sections) {
  const uiModules = Object.entries(report.sections)
    .filter(([key]) => key.startsWith('uiModule_'));
  
  if (uiModules.length > 0) {
    doc.fontSize(12)
      .fillColor('#1976d2')
      .text('ASSESSMENT TOOLS RESULTS', this.margin, doc.y);
    
    uiModules.forEach(([key, value]) => {
      const moduleId = key.replace('uiModule_', '');
      const parsedData = JSON.parse(value);
      
      doc.fontSize(11)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text(moduleId.replace(/_/g, ' ').toUpperCase(), this.margin, doc.y);
      
      // BI-RADS Calculator
      if (moduleId === 'birads_calculator' && parsedData?.category) {
        doc.fontSize(10)
          .text(`BI-RADS Category: ${parsedData.category}`, this.margin + 20, doc.y);
        doc.text(`Recommendation: ${parsedData.recommendation}`, this.margin + 20, doc.y);
      }
      
      // Measurements
      else if (moduleId.includes('measurement') && Array.isArray(parsedData)) {
        parsedData.forEach(m => {
          doc.text(`  • ${m.label}: ${m.value} ${m.unit}`, this.margin + 20, doc.y);
        });
      }
    });
  }
}
```

## Template Examples

### Mammography Template
```javascript
{
  templateId: "MAMMO-BIRADS-01",
  uiModules: [
    {
      id: "birads_calculator",
      type: "calculator",
      title: "BI-RADS Assessment"
    },
    {
      id: "breast_measurements",
      type: "measurements",
      title: "Lesion Measurements"
    },
    {
      id: "breast_diagram",
      type: "diagram",
      title: "Breast Lesion Localization"
    }
  ]
}
```

### MRI Spine Template
```javascript
{
  templateId: "MRI-SPINE-01",
  uiModules: [
    {
      id: "spine_checklist",
      type: "checklist",
      title: "Vertebral Level Assessment"
    },
    {
      id: "disc_measurements",
      type: "measurements",
      title: "Disc and Canal Measurements"
    },
    {
      id: "spine_diagram",
      type: "diagram",
      title: "Spine Diagram"
    }
  ]
}
```

### CT Chest Template
```javascript
{
  templateId: "CT-CHEST-01",
  uiModules: [
    {
      id: "nodule_measurements",
      type: "measurements",
      title: "Pulmonary Nodule Measurements"
    },
    {
      id: "chest_diagram",
      type: "diagram",
      title: "Chest Diagram"
    }
  ]
}
```

## Data Flow

### 1. User Interaction
```
User fills BI-RADS Calculator
  ↓
Selects: Mass = "none", Calcifications = "benign"
  ↓
Calculator computes: Category = 1, Score = 1
  ↓
handleModuleChange('birads_calculator', data)
```

### 2. State Update
```
actions.updateSection('uiModule_birads_calculator', JSON.stringify(data))
  ↓
state.sections['uiModule_birads_calculator'] = "{...JSON...}"
```

### 3. Save to Backend
```
Frontend sends:
{
  sections: {
    "uiModule_birads_calculator": "{...JSON...}",
    "uiModule_breast_measurements": "[...JSON...]"
  }
}
  ↓
Backend stores in MongoDB
```

### 4. Display in Preview
```
Preview reads sections
  ↓
Filters uiModule_* keys
  ↓
Parses JSON
  ↓
Renders based on module type
```

### 5. Export to PDF
```
PDF service reads sections
  ↓
Filters uiModule_* keys
  ↓
Parses JSON
  ↓
Adds to PDF with formatting
```

## Testing Checklist

### ✅ Data Storage
- [ ] UI module data stored in `sections.uiModule_*`
- [ ] Data is valid JSON
- [ ] All module types supported
- [ ] Data persists after save

### ✅ Preview Display
- [ ] "Assessment Tools Results" section visible
- [ ] BI-RADS calculator shows category and recommendation
- [ ] Measurements show as list
- [ ] Checklist shows items and status
- [ ] Diagram shows marking count

### ✅ PDF Export
- [ ] "ASSESSMENT TOOLS RESULTS" section in PDF
- [ ] BI-RADS calculator formatted correctly
- [ ] Measurements formatted as list
- [ ] Checklist formatted as list
- [ ] All module types handled

### ✅ Different Templates
- [ ] Mammography template (BI-RADS, measurements, diagram)
- [ ] MRI Spine template (checklist, measurements, diagram)
- [ ] CT Chest template (measurements, diagram)
- [ ] Each template shows its own modules

## Files Modified

1. **viewer/src/components/reporting/ReportPreviewDialog.tsx**
   - Added "Assessment Tools Results" section
   - Parses and displays UI module data
   - Handles different module types

2. **server/src/services/pdf-service.js**
   - Added "ASSESSMENT TOOLS RESULTS" section
   - Parses and formats UI module data
   - Handles different module types

3. **viewer/src/components/reporting/panels/ReportContentPanel.tsx**
   - Renders UI modules dynamically
   - Stores data in sections with `uiModule_` prefix

## Summary

✅ **Storage**: UI modules stored in `sections.uiModule_*` as JSON strings  
✅ **Preview**: Displays all module results with proper formatting  
✅ **PDF**: Includes all module results in export  
✅ **Flexible**: Works with any template and module type  
✅ **Type-Safe**: Handles different module types correctly  

All Specialized Assessment Tools are now fully integrated! 🎉
