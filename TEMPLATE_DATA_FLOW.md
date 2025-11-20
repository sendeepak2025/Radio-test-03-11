# Template Data Flow - Visual Guide

## Before Fix (Problem)

```
┌─────────────────────────────────────────────────────────────┐
│                    SAVED REPORT DATA                         │
│                      (Inconsistent)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  sections: {                                                 │
│    technique: "Standard mammography..."                      │
│    findings: "No masses..."                                  │
│    impression: "BI-RADS 1"                                   │
│    uiModule_birads_calculator: "{...}"                       │
│  }                                                           │
│                                                              │
│  technique: "Standard mammography..."  ← DUPLICATE!          │
│  findingsText: "Detailed findings..."  ← DIFFERENT!          │
│  impression: "Final assessment..."     ← DIFFERENT!          │
│                                                              │
│  ❌ Which is correct? sections or top-level?                 │
│  ❌ Preview shows wrong data                                 │
│  ❌ Template structure not respected                         │
└─────────────────────────────────────────────────────────────┘
```

## After Fix (Solution)

```
┌─────────────────────────────────────────────────────────────┐
│                    SAVED REPORT DATA                         │
│                      (Consistent)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  templateId: "MAMMO-BIRADS-01"                               │
│                                                              │
│  sections: {                    ← SOURCE OF TRUTH            │
│    technique: "Standard mammography..."                      │
│    breast_composition: "Density B"                           │
│    findings: "No masses..."                                  │
│    impression: "BI-RADS 1"                                   │
│    recommendations: "Continue screening"                     │
│    uiModule_birads_calculator: "{...}"                       │
│    uiModule_breast_measurements: "[...]"                     │
│  }                                                           │
│                                                              │
│  technique: "Standard mammography..."  ← DERIVED             │
│  findingsText: "No masses..."          ← DERIVED             │
│  impression: "BI-RADS 1"               ← DERIVED             │
│  recommendations: "Continue screening" ← DERIVED             │
│                                                              │
│  ✅ sections is source of truth                              │
│  ✅ Top-level fields synced for compatibility                │
│  ✅ Template structure respected                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Saving a Report

```
┌──────────────┐
│   UI Form    │
│              │
│ Technique:   │
│ [text input] │
│              │
│ Findings:    │
│ [text input] │
│              │
│ Impression:  │
│ [text input] │
└──────┬───────┘
       │
       │ User types
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              ReportContentPanel                          │
│                                                          │
│  handleFieldChange('technique', value)                   │
│    ├─ if (templateId):                                   │
│    │    ├─ updateSection('technique', value)             │
│    │    └─ updateField('technique', value)               │
│    └─ else:                                              │
│         └─ updateField('technique', value)               │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ State updated
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              ReportingContext                            │
│                                                          │
│  state: {                                                │
│    templateId: "MAMMO-BIRADS-01"                         │
│    sections: {                                           │
│      technique: "Standard mammography..."                │
│      findings: "No masses..."                            │
│    }                                                     │
│    technique: "Standard mammography..."                  │
│    findingsText: "No masses..."                          │
│  }                                                       │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ Auto-save triggered
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              saveReport()                                │
│                                                          │
│  if (templateId):                                        │
│    sectionsToSave.technique = state.technique            │
│    sectionsToSave.findings = state.findingsText          │
│                                                          │
│  PUT /api/reports/:reportId                              │
│    body: { sections: sectionsToSave, ... }               │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ HTTP Request
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│         Backend: PUT /api/reports/:reportId              │
│                                                          │
│  if (report.templateId):                                 │
│    // Store in sections                                  │
│    report.sections = updates.sections                    │
│                                                          │
│    // Derive top-level fields                            │
│    report.technique = sections.technique                 │
│    report.findingsText = sections.findings               │
│                                                          │
│  await report.save()                                     │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ Saved to MongoDB
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                   MongoDB Document                       │
│                                                          │
│  {                                                       │
│    templateId: "MAMMO-BIRADS-01",                        │
│    sections: {                                           │
│      technique: "Standard mammography...",               │
│      findings: "No masses...",                           │
│      impression: "BI-RADS 1"                             │
│    },                                                    │
│    technique: "Standard mammography...",                 │
│    findingsText: "No masses...",                         │
│    impression: "BI-RADS 1"                               │
│  }                                                       │
└──────────────────────────────────────────────────────────┘
```

### Loading a Report

```
┌──────────────────────────────────────────────────────────┐
│                   MongoDB Document                       │
│                                                          │
│  {                                                       │
│    templateId: "MAMMO-BIRADS-01",                        │
│    sections: {                                           │
│      technique: "Standard mammography...",               │
│      findings: "No masses...",                           │
│      impression: "BI-RADS 1"                             │
│    },                                                    │
│    technique: "Standard mammography...",                 │
│    findingsText: "No masses..."                          │
│  }                                                       │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ GET /api/reports/:reportId
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│         Backend: GET /api/reports/:reportId              │
│                                                          │
│  const report = await StructuredReport.findOne(...)      │
│                                                          │
│  res.json({ report: report.toObject() })                 │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ HTTP Response
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              ReportingProvider                           │
│                                                          │
│  if (initialData.templateId && sections):                │
│    // Read from sections                                 │
│    technique = sections.technique                        │
│    findingsText = sections.findings                      │
│    impression = sections.impression                      │
│                                                          │
│  Initialize state with derived values                    │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ State initialized
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              ReportContentPanel                          │
│                                                          │
│  getFieldValue('technique'):                             │
│    if (templateId):                                      │
│      return sections.technique                           │
│    else:                                                 │
│      return state.technique                              │
│                                                          │
│  Display in UI: "Standard mammography..."                │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ Rendered
                       │
                       ▼
┌──────────────┐
│   UI Form    │
│              │
│ Technique:   │
│ Standard     │
│ mammography  │
│              │
│ ✅ Correct!  │
└──────────────┘
```

## Key Principles

### 1. Single Source of Truth
```
Template Report:  sections → top-level (derived)
Non-Template:     top-level (direct)
```

### 2. Field Mapping
```
UI Field          Section Key           Top-Level Field
─────────────────────────────────────────────────────────
Clinical History  clinical_indication   clinicalHistory
Technique         technique             technique
Findings          findings              findingsText
Impression        impression            impression
Recommendations   recommendations       recommendations
```

### 3. UI Module Storage
```
sections: {
  uiModule_birads_calculator: "{...JSON...}",
  uiModule_breast_measurements: "[...JSON...]",
  uiModule_breast_diagram: "[...JSON...]"
}
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Data Structure | ❌ Inconsistent | ✅ Consistent |
| Source of Truth | ❌ Unclear | ✅ Clear (sections) |
| Preview | ❌ Wrong data | ✅ Correct data |
| Template Support | ❌ Not respected | ✅ Fully respected |
| Backward Compat | ❌ Breaking | ✅ Maintained |
| UI Modules | ❌ Lost | ✅ Preserved |

## Summary

The fix ensures that:
1. **Template reports** store all data in `sections` (source of truth)
2. **Top-level fields** are derived for backward compatibility
3. **UI reads** from the correct location based on template presence
4. **Preview and export** always show correct data
5. **Non-template reports** continue to work unchanged
