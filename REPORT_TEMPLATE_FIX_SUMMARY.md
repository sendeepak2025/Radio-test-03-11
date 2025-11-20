# Report Template Data Structure Fix - Summary

## Problem Statement

When saving reports with templates (e.g., Mammography BI-RADS), the returned data structure was inconsistent:
- Data was duplicated between `sections` object and top-level fields
- Different values in sections vs top-level fields
- Preview showed incorrect data
- Template structure was not respected

## Solution Implemented

Established a clear data hierarchy:
- **Template-based reports**: `sections` is the source of truth
- **Non-template reports**: Top-level fields are the source of truth
- **Top-level fields**: Derived from sections for backward compatibility

## Files Modified

### Backend
1. **server/src/routes/reports-unified.js**
   - Modified POST `/api/reports` (create/upsert)
   - Modified PUT `/api/reports/:reportId` (update)
   - Added logic to store template data in sections
   - Added logic to derive top-level fields from sections

### Frontend
1. **viewer/src/contexts/ReportingContext.tsx**
   - Updated initialization to read from sections when template is used
   - Updated save logic to store in sections when template is used
   - Maintains both sections and top-level fields for consistency

2. **viewer/src/components/reporting/panels/ReportContentPanel.tsx**
   - Added `getFieldValue()` to read from correct location
   - Updated `handleFieldChange()` to update both locations
   - All text fields now use the new logic

## Data Structure

### Template-Based Report (e.g., Mammography BI-RADS)
```json
{
  "templateId": "MAMMO-BIRADS-01",
  "templateName": "Mammography BI-RADS Assessment",
  "sections": {
    "technique": "Standard two-view mammography (CC and MLO) performed.",
    "breast_composition": "Breast density B",
    "findings": "No suspicious masses or calcifications identified.",
    "impression": "BI-RADS Category 1 - Negative",
    "recommendations": "Continue routine annual screening.",
    "uiModule_birads_calculator": "{\"selections\":{...},\"score\":1,\"category\":1}",
    "uiModule_breast_measurements": "[{\"id\":\"...\",\"label\":\"...\"}]"
  },
  "technique": "Standard two-view mammography (CC and MLO) performed.",
  "findingsText": "No suspicious masses or calcifications identified.",
  "impression": "BI-RADS Category 1 - Negative",
  "recommendations": "Continue routine annual screening."
}
```

### Non-Template Report
```json
{
  "technique": "CT chest without contrast",
  "findingsText": "Detailed findings...",
  "impression": "No acute findings",
  "recommendations": "Follow-up in 6 months"
}
```

## Field Mapping

| UI Field | Section Key | Top-Level Field | Notes |
|----------|-------------|-----------------|-------|
| Clinical History | `clinical_indication` | `clinicalHistory` | Template-specific key |
| Technique | `technique` | `technique` | Same key |
| Findings | `findings` | `findingsText` | Different key |
| Impression | `impression` | `impression` | Same key |
| Recommendations | `recommendations` | `recommendations` | Same key |

## How It Works

### Saving
1. User edits fields in UI
2. Both `sections` and top-level fields are updated
3. On save, if template is used:
   - All content stored in `sections`
   - Top-level fields derived from sections
4. Backend stores both for compatibility

### Loading
1. Report loaded from database
2. If template is used:
   - Read from `sections` (source of truth)
   - Initialize top-level fields from sections
3. UI displays from correct location

### Preview
1. Preview reads from top-level fields
2. Top-level fields are always synced from sections
3. Preview shows correct data

## Testing

All changes have been tested with a test script that verifies:
- ✅ Sections contain all template fields
- ✅ UI modules are stored correctly
- ✅ Top-level fields are derived correctly
- ✅ Data consistency between sections and top-level
- ✅ Frontend reads from correct location

## Benefits

1. **Clear Structure**: Single source of truth for template reports
2. **Backward Compatible**: Non-template reports unchanged
3. **Consistent Preview**: Always shows correct data
4. **Template Support**: Respects template structure
5. **UI Modules**: Properly stored and retrieved
6. **No Data Loss**: All template-specific fields preserved

## Migration Path

Existing reports will continue to work:
- Non-template reports use top-level fields (unchanged)
- Template reports will be migrated on next save
- Preview and export work with both structures
- No manual migration required

## Documentation

Three documentation files created:
1. **TEMPLATE_DATA_STRUCTURE_FIX.md** - Detailed technical documentation
2. **TEMPLATE_FIX_QUICK_GUIDE.md** - Quick reference guide
3. **TEMPLATE_DATA_FLOW.md** - Visual diagrams and flow charts

## Next Steps

1. Test with actual reports in your environment
2. Verify all templates work correctly (Mammography, MRI Spine, CT Chest)
3. Check that preview shows correct data
4. Confirm UI modules save and load properly
5. Test export to PDF with template data

## Support

If you encounter any issues:
1. Check browser console for errors
2. Verify `templateId` is set in the report
3. Check that `sections` object contains the data
4. Review the documentation files for troubleshooting

---

**Status**: ✅ Complete and Tested  
**Date**: November 20, 2025  
**Impact**: All template-based reports  
**Breaking Changes**: None (backward compatible)
