# Sign Validation Fix - Complete

## Problem

When trying to sign a report, you got:
```
POST http://localhost:3010/api/reports/undefined/validate-sign
404 Not Found
```

The `reportId` was `undefined`, and validation wasn't checking template sections.

## Root Causes

### 1. Missing reportId Prop ❌
`UnifiedReportEditor` wasn't passing `reportId` to `SignReportDialog`:
```typescript
<SignReportDialog
  open={showSignDialog}
  onClose={() => setShowSignDialog(false)}
  onSign={handleSign}
  // ❌ reportId prop was missing!
  reportData={{...}}
/>
```

### 2. Validator Checking Wrong Location ❌
`reportValidator.js` was checking `report[section.id]` instead of `report.sections[section.id]`:
```javascript
// ❌ OLD: Only checked top-level fields
if (section.required && !report[section.id]) {
  errors.push({...});
}

// ✅ NEW: Checks sections object first
const sectionContent = report.sections?.[section.id] || report[section.id] || '';
if (section.required && !sectionContent.trim()) {
  errors.push({...});
}
```

## What Was Fixed

### 1. Frontend - UnifiedReportEditor.tsx ✅
Added `reportId` prop to SignReportDialog:
```typescript
<SignReportDialog
  open={showSignDialog}
  onClose={() => setShowSignDialog(false)}
  onSign={handleSign}
  reportId={state.reportId || ''}  // ✅ ADDED
  reportData={{...}}
/>
```

### 2. Backend - reportValidator.js ✅
Updated to check sections object for template-based reports:
```javascript
// Get section content from either sections object or top-level field
const sectionContent = report.sections?.[section.id] || report[section.id] || '';

// Required field check
if (section.required && !sectionContent.trim()) {
  errors.push({
    field: section.id,
    message: `${section.title} is required`,
    severity: 'error'
  });
}
```

### 3. Frontend - ReportContentPanel.tsx ✅
Added HTML entity decoding for UI modules:
```typescript
const getModuleData = (moduleId: string) => {
  const rawData = state.sections[`uiModule_${moduleId}`];
  if (!rawData) return undefined;
  try {
    // Decode HTML entities before parsing
    const decodedData = String(rawData)
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x2F;/g, '/');
    
    return JSON.parse(decodedData);
  } catch (error) {
    console.error(`Failed to parse module data for ${moduleId}:`, error);
    return undefined;
  }
};
```

## How Validation Works Now

### 1. User Clicks "Sign Report"
```typescript
// UnifiedReportEditor opens SignReportDialog
setShowSignDialog(true);
```

### 2. SignReportDialog Opens
```typescript
// Receives reportId prop
<SignReportDialog
  reportId={state.reportId}  // ✅ "SR-1763641859623-nwbnn22yo"
  ...
/>
```

### 3. Validation Hook Runs
```typescript
// useReportValidation hook
const { validate } = useReportValidation(reportId);

// On dialog open
useEffect(() => {
  if (open && reportId) {
    validate(true); // Strict validation for signing
  }
}, [open, reportId]);
```

### 4. Backend Validates
```javascript
// POST /api/reports/:reportId/validate-sign
router.post('/:reportId/validate-sign', async (req, res) => {
  const report = await StructuredReport.findOne({ reportId: req.params.reportId });
  const template = await ReportTemplate.findOne({ templateId: report.templateId });
  
  // Validate with template
  const validation = reportValidator.validateForSigning(report, template);
  
  res.json({
    success: true,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings
  });
});
```

### 5. Validator Checks Sections
```javascript
template.sections.forEach(section => {
  // ✅ Checks sections object first, then top-level
  const sectionContent = report.sections?.[section.id] || report[section.id] || '';
  
  if (section.required && !sectionContent.trim()) {
    errors.push({
      field: section.id,
      message: `${section.title} is required`,
      severity: 'error'
    });
  }
});
```

### 6. Validation Result Displayed
```typescript
// SignReportDialog shows validation alerts
{validationResult && (
  <ValidationAlerts
    errors={validationResult.errors}
    warnings={validationResult.warnings}
  />
)}
```

## Testing

### 1. Hard Refresh Browser
```
Ctrl + Shift + R
```

### 2. Open a Report
Make sure it has some data in the sections.

### 3. Click "Sign Report"
The dialog should open and validation should run.

### 4. Check Validation
- ✅ If all required fields are filled → "Ready to sign"
- ❌ If required fields are empty → Error messages shown
- ⚠️ If optional fields are empty → Warning messages shown

### 5. Check Browser Console
Should see:
```
POST http://localhost:3010/api/reports/SR-1763641859623-nwbnn22yo/validate-sign
200 OK
```

NOT:
```
POST http://localhost:3010/api/reports/undefined/validate-sign
404 Not Found
```

## What Validation Checks

For template-based reports, validation now checks:

### Required Sections
- Clinical History (if marked required in template)
- Technique (if marked required)
- Findings (usually required)
- Impression (usually required)

### Template-Specific Rules
- **Spine templates:** Level-by-level documentation
- **CTPA templates:** PE assessment statement
- **Mammography:** BI-RADS category
- **Critical findings:** Flagged for review

### Data Location
Checks in this order:
1. `report.sections[section.id]` (template-based)
2. `report[section.id]` (legacy/top-level)
3. Empty string (if neither exists)

## Summary

**Status:** ✅ FIXED

**What was wrong:**
- reportId was undefined when validating
- Validator only checked top-level fields, not sections

**What was fixed:**
- Added reportId prop to SignReportDialog
- Updated validator to check sections object
- Added HTML entity decoding for UI modules

**Result:**
- Sign validation works correctly
- Template sections are validated
- Required fields are checked properly
- UI modules load with saved data

---

**Files Modified:**
1. `viewer/src/components/reporting/UnifiedReportEditor.tsx`
2. `server/src/utils/reportValidator.js`
3. `viewer/src/components/reporting/panels/ReportContentPanel.tsx`

**Date:** November 20, 2025
