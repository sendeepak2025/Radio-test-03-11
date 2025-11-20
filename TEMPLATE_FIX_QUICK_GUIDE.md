# Template Data Structure Fix - Quick Guide

## What Was Fixed

The report saving logic now properly stores template-based reports according to their template structure. Previously, data was duplicated between `sections` and top-level fields, causing confusion.

## How It Works Now

### Template-Based Reports (e.g., Mammography BI-RADS)

**Source of Truth**: `sections` object

```json
{
  "templateId": "MAMMO-BIRADS-01",
  "sections": {
    "technique": "Standard two-view mammography...",
    "breast_composition": "Breast density B",
    "findings": "No suspicious masses...",
    "impression": "BI-RADS Category 1",
    "recommendations": "Continue routine screening",
    "uiModule_birads_calculator": "{...}",
    "uiModule_breast_measurements": "[...]"
  },
  "technique": "Standard two-view mammography...",
  "findingsText": "No suspicious masses...",
  "impression": "BI-RADS Category 1",
  "recommendations": "Continue routine screening"
}
```

**Key Points**:
- All template content stored in `sections`
- Top-level fields are derived for backward compatibility
- UI module data stored with `uiModule_` prefix in sections

### Non-Template Reports

**Source of Truth**: Top-level fields

```json
{
  "technique": "CT chest without contrast",
  "findingsText": "Detailed findings...",
  "impression": "No acute findings",
  "recommendations": "Follow-up in 6 months"
}
```

## Field Mapping

| UI Label | Section Key | Top-Level Field |
|----------|-------------|-----------------|
| Clinical History | `clinical_indication` | `clinicalHistory` |
| Technique | `technique` | `technique` |
| Findings | `findings` | `findingsText` |
| Impression | `impression` | `impression` |
| Recommendations | `recommendations` | `recommendations` |

## Files Modified

### Backend
- `server/src/routes/reports-unified.js`
  - POST /api/reports (create/upsert)
  - PUT /api/reports/:reportId (update)

### Frontend
- `viewer/src/contexts/ReportingContext.tsx`
  - Initialization logic
  - Save logic
- `viewer/src/components/reporting/panels/ReportContentPanel.tsx`
  - Field reading logic
  - Field writing logic

## Testing

Run the test script:
```bash
node test-template-structure.js
```

Expected output: All checks should pass ✅

## Verification Steps

1. **Create a new report with template**:
   - Go to reporting page with `?studyUID=xxx&templateId=MAMMO-BIRADS-01`
   - Fill in fields
   - Save

2. **Check saved data**:
   - Open browser DevTools → Network tab
   - Look at the PUT request to `/api/reports/:reportId`
   - Verify `sections` contains all template fields

3. **Reload and verify**:
   - Refresh the page
   - All fields should display correctly
   - UI modules should show saved data

4. **Preview**:
   - Click "Preview Report"
   - All sections should be visible
   - Content should match what you entered

## Troubleshooting

### Fields not saving
- Check browser console for errors
- Verify `templateId` is set in the report
- Check that `sections` object is being sent in save request

### Fields not displaying after reload
- Check that `sections` contains the data
- Verify `getFieldValue()` is reading from correct location
- Check template ID matches

### Preview shows wrong data
- Top-level fields should be synced from sections
- Check backend is deriving fields correctly
- Verify preview is reading from state fields

## Benefits

✅ **Clear structure**: Single source of truth for template reports  
✅ **Backward compatible**: Non-template reports unchanged  
✅ **Consistent preview**: Always shows correct data  
✅ **Template support**: Respects template structure  
✅ **UI modules**: Properly stored and retrieved  

## Next Steps

The fix is complete and tested. You can now:
1. Test with your actual reports
2. Verify all templates work correctly
3. Check that preview and export show correct data
4. Confirm UI modules save and load properly
