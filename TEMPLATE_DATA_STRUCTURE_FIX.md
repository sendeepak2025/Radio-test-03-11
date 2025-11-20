# Template Data Structure Fix

## Problem
When saving reports with templates, the data structure was inconsistent:
- Both `sections` object and top-level fields (`technique`, `findingsText`, etc.) were being saved
- This caused duplication and confusion about which is the source of truth
- Preview and editing were reading from different locations

## Solution
Implemented a clear data structure hierarchy:

### For Template-Based Reports:
- **Source of Truth**: `sections` object
- **Top-level fields**: Derived from sections for backward compatibility
- **Storage**: All template-specific content stored in `sections` with proper keys

### For Non-Template Reports:
- **Source of Truth**: Top-level fields
- **sections**: Empty or minimal

## Changes Made

### Backend (`server/src/routes/reports-unified.js`)

#### 1. POST /api/reports (Create/Upsert)
```javascript
if (templateId) {
  // Template-based: Store in sections, derive top-level fields
  report.technique = sections.technique || req.body.technique || '';
  report.findingsText = sections.findings || sections.findingsText || req.body.findingsText || '';
  report.impression = sections.impression || req.body.impression || '';
  report.clinicalHistory = sections.clinical_indication || sections.clinicalHistory || req.body.clinicalHistory || '';
  report.recommendations = sections.recommendations || req.body.recommendations || '';
} else {
  // Non-template: Use top-level fields
  report.technique = req.body.technique ?? report.technique ?? '';
  // ... etc
}
```

#### 2. PUT /api/reports/:reportId (Update)
```javascript
if (report.templateId) {
  // Template-based: sections is source of truth
  if (updates.sections) {
    // Derive top-level fields from sections
    report.technique = updates.sections.technique || report.technique || '';
    // ... etc
  }
  
  // If direct fields provided, update both sections and top-level
  if (updates.technique !== undefined) {
    report.sections.technique = updates.technique;
    report.technique = updates.technique;
  }
  // ... etc
}
```

### Frontend

#### 1. ReportingContext (`viewer/src/contexts/ReportingContext.tsx`)

**Initialization**: Read from sections when template is used
```typescript
if (initialData.templateId && mergedSections) {
  clinicalHistory = mergedSections.clinical_indication || mergedSections.clinicalHistory || clinicalHistory;
  technique = mergedSections.technique || technique;
  findingsText = mergedSections.findings || mergedSections.findingsText || findingsText;
  // ... etc
}
```

**Saving**: Store in sections when template is used
```typescript
if (state.templateId) {
  // Ensure narrative fields are in sections with proper keys
  if (state.technique) sectionsToSave.technique = state.technique;
  if (state.findingsText) sectionsToSave.findings = state.findingsText;
  if (state.impression) sectionsToSave.impression = state.impression;
  if (state.clinicalHistory) sectionsToSave.clinical_indication = state.clinicalHistory;
  if (state.recommendations) sectionsToSave.recommendations = state.recommendations;
}
```

#### 2. ReportContentPanel (`viewer/src/components/reporting/panels/ReportContentPanel.tsx`)

**Reading**: Get values from correct location
```typescript
const getFieldValue = (fieldName: string): string => {
  if (state.templateId && state.sections) {
    // Template-based: read from sections
    const sectionKey = fieldName === 'clinicalHistory' ? 'clinical_indication' : 
                       fieldName === 'findingsText' ? 'findings' : 
                       fieldName;
    return state.sections[sectionKey] || '';
  }
  // Non-template: read from top-level field
  return (state as any)[fieldName] || '';
};
```

**Writing**: Update both locations when template is used
```typescript
const handleFieldChange = (field: keyof typeof state, value: string) => {
  if (state.templateId) {
    // Template-based: update both section and top-level field
    const sectionKey = field === 'clinicalHistory' ? 'clinical_indication' : 
                       field === 'findingsText' ? 'findings' : 
                       field as string;
    actions.updateSection(sectionKey, value);
  }
  // Always update top-level field for UI consistency
  actions.updateField(field, value);
};
```

## Section Key Mapping

For template-based reports, the following mapping is used:

| UI Field | Section Key | Top-level Field |
|----------|-------------|-----------------|
| Clinical History | `clinical_indication` | `clinicalHistory` |
| Technique | `technique` | `technique` |
| Findings | `findings` | `findingsText` |
| Impression | `impression` | `impression` |
| Recommendations | `recommendations` | `recommendations` |

## Template Structure Example

### Mammography BI-RADS Template
```javascript
sections: [
  { id: 'technique', title: 'Technique', ... },
  { id: 'breast_composition', title: 'Breast Composition', ... },
  { id: 'findings', title: 'Findings', ... },
  { id: 'impression', title: 'Impression', ... },
  { id: 'recommendations', title: 'Recommendations', ... }
]
```

### Saved Report Data Structure
```json
{
  "templateId": "MAMMO-BIRADS-01",
  "sections": {
    "technique": "Standard two-view mammography (CC and MLO) performed.",
    "breast_composition": "Select breast density (A, B, C, or D)",
    "findings": "Detailed findings from both breasts...",
    "impression": "Final assessment and BI-RADS category...",
    "recommendations": "Follow-up recommendations based on BI-RADS...",
    "uiModule_breast_diagram": "[]",
    "uiModule_birads_calculator": "{...}",
    "uiModule_breast_measurements": "[...]"
  },
  "technique": "Standard two-view mammography (CC and MLO) performed.",
  "findingsText": "Detailed findings from both breasts...",
  "impression": "Final assessment and BI-RADS category...",
  "clinicalHistory": "...",
  "recommendations": "Follow-up recommendations based on BI-RADS..."
}
```

## Benefits

1. **Clear Data Structure**: Single source of truth for template-based reports
2. **Backward Compatibility**: Top-level fields maintained for non-template reports and legacy systems
3. **Consistent Preview**: Preview always shows correct data regardless of template
4. **Proper Template Support**: Template structure is respected and maintained
5. **UI Module Data**: Stored in sections with `uiModule_` prefix

## Testing

To verify the fix:

1. Create a new report with a template (e.g., Mammography BI-RADS)
2. Fill in the fields
3. Save the report
4. Check the saved data structure - sections should contain all template fields
5. Reload the report - all fields should display correctly
6. Preview the report - all content should be visible
7. Export to PDF - all sections should be included

## Migration

Existing reports will continue to work:
- Non-template reports use top-level fields (unchanged)
- Template reports will be migrated on next save to use sections structure
- Preview and export work with both structures
