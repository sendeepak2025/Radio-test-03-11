# Preview Template Match Fix - Complete Analysis

## Problem Identified

### Before Fix:
Preview was showing **hardcoded standard fields** instead of **dynamic template sections in order**.

```
Preview showed:
1. Clinical History (hardcoded)
2. Technique (hardcoded)
3. Findings (hardcoded)
4. Impression (hardcoded)
5. Recommendations (hardcoded)
6. UI Module Results
7. Additional Template Fields (breast_composition) ⚠️ AT END!
```

### Template Actually Defines:
```
MAMMO-BIRADS-01 sections (in order):
1. technique (order: 1)
2. breast_composition (order: 2) ⚠️ Should be here!
3. findings (order: 3)
4. impression (order: 4)
5. recommendations (order: 5)
```

## Root Cause

1. **Hardcoded Fields**: Preview had hardcoded sections instead of reading from template
2. **Wrong Order**: Template-specific fields shown at end, not in template order
3. **Missing Template Data**: Preview didn't receive template section definitions

## Solution Implemented

### 1. Dynamic Section Rendering

**Before**:
```typescript
{/* Hardcoded */}
<Box>Technique</Box>
<Box>Findings</Box>
<Box>Impression</Box>
```

**After**:
```typescript
{/* Dynamic based on template */}
{reportData.templateSections
  .sort((a, b) => a.order - b.order)
  .map(section => (
    <Box key={section.id}>
      <Typography>{section.title}</Typography>
      <Typography>{reportData.sections[section.id]}</Typography>
    </Box>
  ))
}
```

### 2. Template Sections Passed to Preview

**ReportPreviewDialog Interface**:
```typescript
interface ReportPreviewDialogProps {
  reportData: {
    templateId?: string;
    templateName?: string;
    templateSections?: any[]; // ✅ Added
    sections?: Record<string, string>;
    // ... other fields
  };
}
```

### 3. Fetch Template in Preview Button

**ReportPreviewButton**:
```typescript
// Fetch template if templateId exists
let templateSections = [];
if (report.templateId) {
  const templateResponse = await reportsApi.getTemplate(report.templateId);
  templateSections = templateResponse.data?.sections || [];
}

setReportData({
  ...report,
  templateSections: templateSections // ✅ Pass to preview
});
```

### 4. Pass Template from Editor

**UnifiedReportEditor**:
```typescript
<ReportPreviewDialog
  reportData={{
    ...state,
    templateSections: state.selectedTemplate?.sections || [] // ✅ Pass from state
  }}
/>
```

## Preview Flow Now

### For Template-Based Reports:

```
1. Check if templateId exists
   ↓
2. If yes, render sections dynamically:
   ↓
   For each section in templateSections (sorted by order):
     - Get section.id (e.g., "technique", "breast_composition")
     - Get value from reportData.sections[section.id]
     - Display: section.title + value
   ↓
3. Result: Sections in template order!
```

### For Non-Template Reports:

```
1. Check if templateId exists
   ↓
2. If no, render standard fields:
   - Clinical History
   - Technique
   - Findings
   - Impression
   - Recommendations
```

## Preview Structure Now

### Mammography BI-RADS Template:

```
┌─────────────────────────────────────────┐
│ MEDICAL IMAGING REPORT                  │
├─────────────────────────────────────────┤
│ Patient Information                     │
├─────────────────────────────────────────┤
│ TECHNIQUE (order: 1)                    │
│   Standard two-view mammography...      │
├─────────────────────────────────────────┤
│ BREAST COMPOSITION (order: 2) ✅        │
│   Breast density B                      │
├─────────────────────────────────────────┤
│ FINDINGS (order: 3)                     │
│   No suspicious masses...               │
├─────────────────────────────────────────┤
│ IMPRESSION (order: 4)                   │
│   BI-RADS Category 1                    │
├─────────────────────────────────────────┤
│ RECOMMENDATIONS (order: 5)              │
│   Continue routine screening            │
├─────────────────────────────────────────┤
│ Structured Findings (if any)            │
├─────────────────────────────────────────┤
│ ASSESSMENT TOOLS RESULTS                │
│   BI-RADS Calculator                    │
│   Breast Measurements                   │
│   Breast Diagram                        │
└─────────────────────────────────────────┘
```

### MRI Spine Template:

```
┌─────────────────────────────────────────┐
│ MEDICAL IMAGING REPORT                  │
├─────────────────────────────────────────┤
│ CLINICAL INDICATION (order: 1)          │
│   Back pain                             │
├─────────────────────────────────────────┤
│ TECHNIQUE (order: 2)                    │
│   MRI lumbar spine...                   │
├─────────────────────────────────────────┤
│ ALIGNMENT (order: 3)                    │
│   Normal spinal alignment               │
├─────────────────────────────────────────┤
│ DETAILED FINDINGS (order: 4)            │
│   Level-by-level findings...            │
├─────────────────────────────────────────┤
│ IMPRESSION (order: 5)                   │
│   Degenerative changes L4-L5            │
├─────────────────────────────────────────┤
│ ASSESSMENT TOOLS RESULTS                │
│   Spine Checklist                       │
│   Disc Measurements                     │
└─────────────────────────────────────────┘
```

## Files Modified

1. **viewer/src/components/reporting/ReportPreviewDialog.tsx**
   - Changed from hardcoded fields to dynamic template sections
   - Added templateSections to interface
   - Renders sections in template order
   - Removed "Additional Template Fields" section

2. **viewer/src/components/reporting/UnifiedReportEditor.tsx**
   - Passes `state.selectedTemplate?.sections` to preview

3. **viewer/src/components/reporting/ReportPreviewButton.tsx**
   - Fetches template when loading report
   - Passes templateSections to preview

## Benefits

✅ **Template Order**: Sections show in template-defined order  
✅ **Dynamic**: Works with any template structure  
✅ **Consistent**: Preview matches template exactly  
✅ **Flexible**: Each template can have different sections  
✅ **Complete**: All template sections visible  

## Testing

### Test Case 1: Mammography Template
```
Expected Order:
1. Technique
2. Breast Composition ✅ (was at end, now in order)
3. Findings
4. Impression
5. Recommendations
6. UI Modules
```

### Test Case 2: MRI Spine Template
```
Expected Order:
1. Clinical Indication
2. Technique
3. Alignment
4. Detailed Findings
5. Impression
6. UI Modules
```

### Test Case 3: Non-Template Report
```
Expected:
1. Clinical History
2. Technique
3. Findings
4. Impression
5. Recommendations
```

## Summary

**Problem**: Preview showed hardcoded fields, template sections at end  
**Solution**: Dynamic rendering based on template.sections order  
**Result**: Preview now matches template structure exactly! ✅

Preview is now **100% template-driven** and shows sections in the correct order as defined by the template.
