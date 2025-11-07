# 🔧 View Existing Report Fix

## 🎯 Problem

When clicking "View Report" button, the URL shows:
```
/reporting?reportId=690b8098eda62e6470534584&studyUID=1.3.12.2.1107...
```

But the page still shows "Create a new report" instead of loading the existing report.

## 🔍 Root Causes

### 1. ReportingPage Not Handling reportId Parameter
The `ReportingPage.tsx` was not extracting the `reportId` from URL parameters.

### 2. StructuredReportingUnified Not Accepting reportId
The component didn't have a prop to receive the reportId for viewing existing reports.

### 3. Wrong ID Being Passed
The `ViewReportButton` was passing MongoDB `_id` instead of the report's `reportId` field (SR-xxx format).

## ✅ Solutions Applied

### Fix 1: Extract reportId in ReportingPage

**File**: `viewer/src/pages/ReportingPage.tsx`

**Added:**
```typescript
// State
const [reportId, setReportId] = useState<string | undefined>(undefined);

// In useEffect
const urlReportId = params.get('reportId');

console.log('📋 Reporting Page initialized with:', {
  urlReportId,  // ✅ Now extracted
  urlStudyUID,
  urlMode,
  // ...
});

// Set report ID if present
if (urlReportId) {
  console.log('✅ Report ID found:', urlReportId);
  setReportId(urlReportId);
}
```

**Pass to child component:**
```typescript
<StructuredReporting
  studyUID={studyUID}
  reportId={reportId}  // ✅ Now passed
  analysisId={analysisId}
  initialMode={initialMode}
  patientInfo={patientInfo}
  onClose={handleBack}
/>
```

---

### Fix 2: Accept reportId in StructuredReportingUnified

**File**: `viewer/src/components/reporting/StructuredReportingUnified.tsx`

**Updated interface:**
```typescript
export interface StructuredReportingProps {
  studyUID: string;
  reportId?: string; // ✅ Added: for viewing/editing existing report
  analysisId?: string;
  initialMode?: CreationMode;
  patientInfo?: { ... };
  onClose?: () => void;
}
```

**Updated component:**
```typescript
export const StructuredReportingUnified: React.FC<StructuredReportingProps> = ({
  studyUID,
  reportId: initialReportId,  // ✅ Receive as prop
  analysisId,
  initialMode,
  patientInfo,
  onClose
}) => {
  // Initialize state with prop value
  const [reportId, setReportId] = useState<string | undefined>(initialReportId);
```

**Updated initialization logic:**
```typescript
useEffect(() => {
  console.info('📋 StructuredReporting initialized:', { 
    studyUID, 
    reportId: initialReportId,  // ✅ Log it
    analysisId,
    initialMode,
    patientInfo 
  });

  // ✅ If reportId provided, go directly to editor
  if (initialReportId) {
    console.log('🔄 Workflow: Opening existing report in editor');
    setReportId(initialReportId);
    setWorkflowStep('editor');
    telemetryEmit('reporting.workflow.start', { 
      mode: 'edit', 
      studyUID, 
      reportId: initialReportId 
    });
    return;
  }

  // Otherwise, follow normal workflow...
}, [initialMode, studyUID, initialReportId]);
```

---

### Fix 3: Use Correct ID Field in ViewReportButton

**File**: `viewer/src/components/viewer/ViewReportButton.tsx`

**Before:**
```typescript
viewReport(reports[0]._id);  // ❌ MongoDB ObjectId
```

**After:**
```typescript
viewReport(reports[0].reportId || reports[0]._id);  // ✅ Use reportId first
```

**Why:** The backend expects `reportId` (like `SR-1762178279570-xxx`) not MongoDB `_id`.

---

## 🔄 How It Works Now

### Workflow for Viewing Existing Report

```
User clicks "View Report"
  ↓
ViewReportButton.tsx
  ↓
navigate(`/reporting?reportId=${report.reportId}&studyUID=${studyUID}`)
  ↓
ReportingPage.tsx
  ↓
Extracts reportId from URL params
  ↓
Passes to StructuredReportingUnified
  ↓
StructuredReportingUnified.tsx
  ↓
Detects reportId is present
  ↓
Sets workflowStep = 'editor'
  ↓
UnifiedReportEditor.tsx
  ↓
Loads existing report by reportId
  ↓
✅ User sees existing report!
```

### URL Format

**Correct URL:**
```
/reporting?reportId=SR-1762178279570-a7ougnh67&studyUID=1.3.12.2.1107...
```

**Fields:**
- `reportId`: The report's unique identifier (SR-xxx format)
- `studyUID`: The study instance UID

---

## 🧪 Testing

### Test 1: View Existing Report
1. Open a study in viewer
2. Click "View Report" button (if report exists)
3. Should navigate to: `/reporting?reportId=SR-xxx&studyUID=xxx`
4. Should load existing report in editor

**Expected Console Output:**
```
📋 Reporting Page initialized with: { 
  urlReportId: 'SR-xxx', 
  urlStudyUID: '1.3.12.2.1107...' 
}
✅ Report ID found: SR-xxx
✅ Study UID found: 1.3.12.2.1107...
📋 StructuredReporting initialized: { 
  studyUID: '1.3.12.2.1107...', 
  reportId: 'SR-xxx' 
}
🔄 Workflow: Opening existing report in editor
```

### Test 2: Create New Report
1. Open a study in viewer
2. Click "Create Report" button (if no report exists)
3. Should navigate to: `/reporting?studyUID=xxx&mode=manual`
4. Should show template selector

**Expected Console Output:**
```
📋 Reporting Page initialized with: { 
  urlReportId: null, 
  urlStudyUID: '1.3.12.2.1107...',
  urlMode: 'manual'
}
✅ Study UID found: 1.3.12.2.1107...
📋 StructuredReporting initialized: { 
  studyUID: '1.3.12.2.1107...', 
  reportId: undefined,
  initialMode: 'manual'
}
🔄 Workflow: selection → template (manual mode)
```

---

## 📊 Before vs After

### Before Fix

```
User clicks "View Report"
  ↓
URL: /reporting?reportId=690b8098eda62e6470534584&studyUID=xxx
  ↓
ReportingPage ignores reportId parameter
  ↓
StructuredReportingUnified starts at 'selection' step
  ↓
❌ Shows "Create a new report" instead of loading existing
```

### After Fix

```
User clicks "View Report"
  ↓
URL: /reporting?reportId=SR-xxx&studyUID=xxx
  ↓
ReportingPage extracts reportId
  ↓
StructuredReportingUnified receives reportId
  ↓
Detects existing report → goes to 'editor' step
  ↓
UnifiedReportEditor loads report by reportId
  ↓
✅ Shows existing report for editing
```

---

## 🎯 URL Patterns

### View Existing Report
```
/reporting?reportId=SR-1762178279570-a7ougnh67&studyUID=1.3.12.2.1107...
```

### Create New Report (Manual)
```
/reporting?studyUID=1.3.12.2.1107...&mode=manual&patientID=P123&patientName=John%20Doe
```

### Create New Report (AI-Assisted)
```
/reporting?studyUID=1.3.12.2.1107...&mode=ai-assisted&analysisId=ai-123
```

### Create New Report (Quick)
```
/reporting?studyUID=1.3.12.2.1107...&mode=quick
```

---

## 📝 Files Modified

1. ✅ `viewer/src/pages/ReportingPage.tsx`
   - Added `reportId` state
   - Extract `reportId` from URL params
   - Pass `reportId` to StructuredReportingUnified

2. ✅ `viewer/src/components/reporting/StructuredReportingUnified.tsx`
   - Added `reportId` prop to interface
   - Accept `reportId` as prop
   - Check for `reportId` on mount
   - If present, go directly to editor

3. ✅ `viewer/src/components/viewer/ViewReportButton.tsx`
   - Use `report.reportId` instead of `report._id`
   - Fallback to `_id` if `reportId` not available

---

## ✅ Acceptance Criteria

1. ✅ Clicking "View Report" navigates with correct reportId
2. ✅ ReportingPage extracts reportId from URL
3. ✅ StructuredReportingUnified receives reportId
4. ✅ Editor opens with existing report loaded
5. ✅ No more "Create a new report" when viewing existing
6. ✅ Console logs show reportId at each step

---

## 🔍 Troubleshooting

### If report still doesn't load:

1. **Check URL has reportId:**
   ```
   /reporting?reportId=SR-xxx&studyUID=xxx
   ```
   Should have `SR-` prefix, not MongoDB ObjectId

2. **Check console logs:**
   ```
   📋 Reporting Page initialized with: { urlReportId: 'SR-xxx', ... }
   ✅ Report ID found: SR-xxx
   🔄 Workflow: Opening existing report in editor
   ```

3. **Check report exists in backend:**
   ```bash
   curl http://localhost:8001/api/reports/SR-xxx \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Check ViewReportButton is using reportId:**
   - Open DevTools → Network tab
   - Click "View Report"
   - Check URL in address bar
   - Should have `reportId=SR-xxx` not `reportId=690b8098...`

---

## 📚 Related Documentation

- `_NETWORK_ERROR_FIX_SUMMARY.md` - Network error fixes
- `_CORS_ERROR_FIX.md` - CORS error solution
- `_CSRF_FIX.md` - CSRF error fix
- `_STRUCTURED_REPORTING_FIX_SUMMARY.md` - Blank screen fixes
- `_SYSTEM_STATUS.md` - Current system status

---

**Status:** ✅ FIXED
**Date:** 2025-11-05
**Issue:** Existing reports not loading when clicking "View Report"
**Solution:** Extract and pass reportId through component chain
**Result:** Existing reports now load correctly in editor! ✅
