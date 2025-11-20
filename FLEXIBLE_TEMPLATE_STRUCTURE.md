# Flexible Template Structure - Complete Guide

## Overview

The report content panel now dynamically renders fields based on the template definition, making it fully flexible for any template structure.

## How It Works

### 1. Template Sections Rendering

The `ReportContentPanel` now renders sections in this order:

```
1. Specialized Assessment Tools (UI Modules)
   ├─ BI-RADS Calculator
   ├─ Breast Measurements
   └─ Breast Diagram

2. Report Sections (from template.sections)
   ├─ Technique
   ├─ Breast Composition
   ├─ Findings
   ├─ Impression
   └─ Recommendations

3. Standard Report Fields (always shown)
   ├─ Clinical History
   ├─ Technique
   ├─ Structured Findings
   ├─ Findings (Free Text)
   ├─ Impression
   └─ Recommendations
```

### 2. Template Definition Structure

Each template defines its sections:

```javascript
{
  templateId: "MAMMO-BIRADS-01",
  name: "Mammography BI-RADS Assessment",
  
  // UI Modules (interactive tools)
  uiModules: [
    {
      id: "birads_calculator",
      type: "calculator",
      title: "BI-RADS Assessment",
      order: 1,
      required: true
    },
    {
      id: "breast_measurements",
      type: "measurements",
      title: "Lesion Measurements",
      order: 2
    }
  ],
  
  // Text Sections (narrative fields)
  sections: [
    {
      id: "technique",
      title: "Technique",
      order: 1,
      required: true,
      defaultContent: "Standard two-view mammography (CC and MLO) performed.",
      placeholder: "Describe imaging technique...",
      rows: 2
    },
    {
      id: "breast_composition",
      title: "Breast Composition",
      order: 2,
      required: true,
      placeholder: "Select breast density (A, B, C, or D)",
      rows: 2
    },
    {
      id: "findings",
      title: "Findings",
      order: 3,
      required: true,
      placeholder: "Detailed findings from both breasts...",
      rows: 6
    },
    {
      id: "impression",
      title: "Impression",
      order: 4,
      required: true,
      placeholder: "Final assessment and BI-RADS category...",
      rows: 4
    },
    {
      id: "recommendations",
      title: "Recommendations",
      order: 5,
      required: true,
      placeholder: "Follow-up recommendations based on BI-RADS...",
      rows: 3
    }
  ]
}
```

### 3. Data Storage Structure

When saved, the report stores data in `sections` object:

```json
{
  "templateId": "MAMMO-BIRADS-01",
  "sections": {
    // Template sections
    "technique": "Standard two-view mammography (CC and MLO) performed.",
    "breast_composition": "Breast density B - Scattered fibroglandular tissue",
    "findings": "No suspicious masses or calcifications identified.",
    "impression": "BI-RADS Category 1 - Negative",
    "recommendations": "Continue routine annual screening mammography.",
    
    // Standard fields (mapped)
    "clinical_indication": "Routine screening",
    
    // UI Modules
    "uiModule_birads_calculator": "{\"selections\":{...},\"score\":1,\"category\":1}",
    "uiModule_breast_measurements": "[{\"id\":\"...\",\"label\":\"...\"}]",
    "uiModule_breast_diagram": "[]"
  },
  
  // Top-level fields (derived for compatibility)
  "technique": "Standard two-view mammography (CC and MLO) performed.",
  "findingsText": "No suspicious masses or calcifications identified.",
  "impression": "BI-RADS Category 1 - Negative",
  "clinicalHistory": "Routine screening",
  "recommendations": "Continue routine annual screening mammography."
}
```

## Component Structure

### ReportContentPanel.tsx

```typescript
const ReportContentPanel: React.FC = () => {
  const { state, actions } = useReporting();
  
  // Render template section field
  const renderTemplateSection = (section: any) => {
    const sectionId = section.id;
    const sectionValue = state.sections[sectionId] || '';
    
    return (
      <Paper key={sectionId} elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {section.title} {section.required && '*'}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={section.rows || 3}
          value={sectionValue}
          onChange={(e) => actions.updateSection(sectionId, e.target.value)}
          placeholder={section.placeholder}
          required={section.required}
        />
      </Paper>
    );
  };
  
  return (
    <Box>
      {/* 1. UI Modules */}
      {state.selectedTemplate?.uiModules?.map(module => 
        renderUIModule(module)
      )}
      
      {/* 2. Template Sections */}
      {state.selectedTemplate?.sections?.map(section => 
        renderTemplateSection(section)
      )}
      
      {/* 3. Standard Fields (always shown) */}
      <StandardFields />
    </Box>
  );
};
```

## Field Mapping

### Template Section → Storage

| Template Section ID | Stored In | Display Name |
|---------------------|-----------|--------------|
| `technique` | `sections.technique` | Technique |
| `breast_composition` | `sections.breast_composition` | Breast Composition |
| `findings` | `sections.findings` | Findings |
| `impression` | `sections.impression` | Impression |
| `recommendations` | `sections.recommendations` | Recommendations |

### Standard Field → Storage

| UI Field | Stored In | Section Key |
|----------|-----------|-------------|
| Clinical History | `sections.clinical_indication` | `clinical_indication` |
| Technique | `sections.technique` | `technique` |
| Findings | `sections.findings` | `findings` |
| Impression | `sections.impression` | `impression` |
| Recommendations | `sections.recommendations` | `recommendations` |

## Creating New Templates

### Example: CT Chest Template

```javascript
{
  templateId: "CT-CHEST-01",
  name: "CT Chest - Lung Nodule Assessment",
  
  uiModules: [
    {
      id: "nodule_measurements",
      type: "measurements",
      title: "Pulmonary Nodule Measurements",
      order: 1
    }
  ],
  
  sections: [
    {
      id: "indication",
      title: "Clinical Indication",
      order: 1,
      required: true,
      placeholder: "Clinical history...",
      rows: 2
    },
    {
      id: "technique",
      title: "Technique",
      order: 2,
      required: true,
      defaultContent: "CT chest without contrast using lung and mediastinal windows.",
      rows: 2
    },
    {
      id: "comparison",
      title: "Comparison",
      order: 3,
      placeholder: "Prior studies for comparison...",
      rows: 2
    },
    {
      id: "lungs",
      title: "Lungs",
      order: 4,
      required: true,
      placeholder: "Lung parenchyma findings...",
      rows: 6
    },
    {
      id: "mediastinum",
      title: "Mediastinum",
      order: 5,
      required: true,
      placeholder: "Mediastinal structures...",
      rows: 4
    },
    {
      id: "impression",
      title: "Impression",
      order: 6,
      required: true,
      placeholder: "Summary and assessment...",
      rows: 4
    }
  ]
}
```

### Saved Data Structure

```json
{
  "templateId": "CT-CHEST-01",
  "sections": {
    "indication": "Cough and fever",
    "technique": "CT chest without contrast using lung and mediastinal windows.",
    "comparison": "CT chest dated 01/15/2024",
    "lungs": "No focal consolidation or ground glass opacity...",
    "mediastinum": "Heart size normal. No lymphadenopathy...",
    "impression": "No acute cardiopulmonary process.",
    "uiModule_nodule_measurements": "[...]"
  }
}
```

## Benefits

### 1. Flexibility
- ✅ Any template can define its own sections
- ✅ Sections render in specified order
- ✅ Each section can have custom properties (rows, placeholder, required)

### 2. Consistency
- ✅ All data stored in `sections` object
- ✅ Standard fields always available as fallback
- ✅ UI modules integrated seamlessly

### 3. Maintainability
- ✅ Single component handles all templates
- ✅ No hardcoded field names
- ✅ Easy to add new templates

### 4. User Experience
- ✅ Template-specific fields show first
- ✅ Standard fields always accessible
- ✅ Clear section organization

## Preview & Export

### Preview Dialog
Shows all sections in order:
1. Patient Information
2. Clinical History
3. Template Sections (in order)
4. Standard Fields
5. UI Module Results
6. Signature (if signed)

### PDF Export
Includes all sections:
1. Header
2. Patient & Study Info
3. Template Sections (in order)
4. Standard Fields
5. Measurements Table
6. Key Images
7. Signature

## Migration Path

### Existing Templates
- ✅ Continue to work with standard fields
- ✅ Can be enhanced with template sections
- ✅ No breaking changes

### New Templates
- ✅ Define custom sections
- ✅ Specify order and properties
- ✅ Full flexibility

## Testing

### Test Template Sections
1. Open report with template
2. Verify sections render in correct order
3. Edit each section
4. Save and verify data in `sections` object
5. Reload and verify fields populate
6. Preview and verify all sections visible
7. Export PDF and verify all sections included

### Test Standard Fields
1. Open report without template
2. Verify standard fields render
3. Edit and save
4. Verify data stored correctly

## Summary

The flexible template structure allows:
- ✅ Dynamic section rendering based on template
- ✅ Custom section properties (title, placeholder, rows, required)
- ✅ Proper data storage in `sections` object
- ✅ Backward compatibility with standard fields
- ✅ Seamless integration with UI modules
- ✅ Complete preview and export support

All templates now work consistently with the same component!
