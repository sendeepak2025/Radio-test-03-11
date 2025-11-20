# ✅ URL-Based Template Loading - Implementation Guide

## Overview

Implemented URL parameter-based template fetching for cleaner, more RESTful architecture. The `templateId` is now passed via URL and the full template is fetched from the backend when needed.

---

## How It Works

### URL Structure

```
/app/reporting?studyUID={studyUID}&reportId={reportId}&templateId={templateId}
```

**Parameters:**
- `studyUID` - Required - Study instance UID
- `reportId` - Optional - Existing report ID (for loading reports)
- `templateId` - Optional - Template ID to fetch (for specialized modules)
- `patientID`, `patientName`, `modality` - Optional patient info

### Flow Diagram

```
User clicks template
    ↓
TemplateSelectorUnified
    ├─ Creates report via POST /api/reports
    ├─ Gets reportId from response
    └─ Calls onTemplateSelect(templateId, reportId)
    ↓
ReportingPage.handleTemplateSelected()
    ├─ Updates URL: ?studyUID=...&reportId=...&templateId=MAMMO-BIRADS-01
    ├─ Calls loadReportData()
    └─ Triggers re-fetch
    ↓
ReportingPage.loadReportData()
    ├─ Reads templateId from URL params
    ├─ Fetches template: GET /api/reports/templates/{templateId}
    ├─ Gets full template with uiModules
    └─ Sets reportData.selectedTemplate
    ↓
ReportingProvider
    ├─ Initialized with selectedTemplate in initialData
    └─ state.selectedTemplate available
    ↓
ReportContentPanel
    ├─ Reads state.selectedTemplate?.uiModules
    ├─ Renders BI-RADS Calculator
    ├─ Renders Measurements
    └─ Renders Checklists
```

---

## Implementation Details

### 1. URL Update on Template Selection

**File:** `viewer/src/pages/ReportingPage.tsx`

```typescript
const handleTemplateSelected = (templateId: string, createdReportId: string) => {
  // Update URL with templateId and reportId
  const params = new URLSearchParams(window.location.search);
  params.set('reportId', createdReportId);
  params.set('templateId', templateId);
  
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', newUrl);
  
  // Reload data to fetch template
  loadReportData();
};
```

### 2. Template Fetching from URL

**File:** `viewer/src/pages/ReportingPage.tsx`

```typescript
const loadReportData = async () => {
  const params = new URLSearchParams(window.location.search);
  const templateId = params.get('templateId');
  const reportId = params.get('reportId');
  
  if (reportId) {
    // Load existing report
    const reportResponse = await fetch(`/api/reports/${reportId}`);
    const loadedReport = reportResponse.json().report;
    
    // Fetch template if templateId is in URL or report
    const reportTemplateId = templateId || loadedReport.templateId;
    
    if (reportTemplateId) {
      const templateResponse = await fetch(
        `/api/reports/templates/${reportTemplateId}`
      );
      const selectedTemplate = templateResponse.json().template;
      
      setReportData({
        ...loadedReport,
        selectedTemplate  // ← Full template with uiModules
      });
    }
  }
};
```

### 3. Template Passed to ReportingProvider

**File:** `viewer/src/pages/ReportingPage.tsx`

```typescript
<ReportingProvider initialData={reportData}>
  {/* reportData includes selectedTemplate */}
  <UnifiedReportEditor />
</ReportingProvider>
```

### 4. ReportingContext Spreads initialData

**File:** `viewer/src/contexts/ReportingContext.tsx`

```typescript
export const ReportingProvider: React.FC = ({ initialData }) => {
  const [state, dispatch] = useReducer(reportReducer, {
    // ... other fields
    ...initialData  // ← Includes selectedTemplate from URL fetch
  } as ReportState);
  
  // state.selectedTemplate is now available
};
```

---

## Benefits of URL-Based Approach

### ✅ Advantages

1. **RESTful** - URL represents the resource state
2. **Shareable** - Users can copy/paste URL to share exact report
3. **Bookmarkable** - URL can be bookmarked with templateId
4. **Refreshable** - Page refresh maintains template selection
5. **Single Source of Truth** - URL is the authority, not component state
6. **Backend Controlled** - Template data always fresh from DB
7. **Cleaner Code** - No need to pass template through multiple components

### ✅ Use Cases Supported

1. **New Report Flow**
   ```
   Click template → URL updated → Template fetched → UI modules appear
   ```

2. **Refresh Existing Report**
   ```
   F5 refresh → URL has templateId → Template re-fetched → UI modules appear
   ```

3. **Bookmark Report**
   ```
   Bookmark URL with templateId → Open later → Template loaded automatically
   ```

4. **Share Report Link**
   ```
   Copy URL → Send to colleague → They see same template modules
   ```

---

## API Endpoints Used

### GET /api/reports/templates/:templateId

**Request:**
```http
GET /api/reports/templates/MAMMO-BIRADS-01
Authorization: Bearer {token}
```

**Response:**
```json
{
  "template": {
    "templateId": "MAMMO-BIRADS-01",
    "name": "Mammography BI-RADS Assessment",
    "uiModules": [
      {
        "id": "birads_calculator",
        "type": "calculator",
        "title": "BI-RADS Assessment",
        "config": { ... }
      },
      {
        "id": "breast_measurements",
        "type": "measurements",
        "title": "Lesion Measurements",
        "config": { ... }
      }
    ],
    "sections": [ ... ]
  }
}
```

---

## Example URLs

### Example 1: New Mammography Report

**Initial URL (template selector):**
```
/app/reporting?studyUID=1.2.3.4.5.6&modality=MG&patientID=123
```

**After clicking Mammography template:**
```
/app/reporting?studyUID=1.2.3.4.5.6&modality=MG&patientID=123&reportId=673d1234&templateId=MAMMO-BIRADS-01
```

### Example 2: Load Existing Report

**URL to load existing report:**
```
/app/reporting?studyUID=1.2.3.4.5.6&reportId=673d1234&templateId=MAMMO-BIRADS-01
```

**What happens:**
1. Page reads `reportId` from URL
2. Fetches report: `GET /api/reports/673d1234`
3. Reads `templateId` from URL (or falls back to report.templateId)
4. Fetches template: `GET /api/reports/templates/MAMMO-BIRADS-01`
5. Renders UI modules from template

---

## Testing

### Test 1: Click Template and Verify URL

1. Navigate to: `/app/reporting?studyUID=test123&modality=MG`
2. Click "Mammography BI-RADS Assessment"
3. **Verify URL changes to:**
   ```
   /app/reporting?studyUID=test123&modality=MG&reportId=...&templateId=MAMMO-BIRADS-01
   ```
4. **Verify console logs:**
   ```
   ✅ Updated URL: /app/reporting?studyUID=...&reportId=...&templateId=MAMMO-BIRADS-01
   📋 Fetching template: MAMMO-BIRADS-01
   ✅ Template fetched: Mammography BI-RADS Assessment
   ✅ UI Modules: 2
   ```
5. **Verify UI:**
   - BI-RADS Calculator appears
   - Lesion Measurements appears

### Test 2: Refresh Page with templateId in URL

1. Complete Test 1
2. Press F5 to refresh page
3. **Verify:**
   - URL still has `templateId=MAMMO-BIRADS-01`
   - Template is re-fetched from backend
   - UI modules appear correctly

### Test 3: Direct Navigation with templateId

1. Navigate directly to:
   ```
   /app/reporting?studyUID=test123&reportId=673d1234&templateId=MAMMO-BIRADS-01
   ```
2. **Verify:**
   - Report loads
   - Template fetched by ID
   - UI modules appear

---

## Files Changed

### Modified Files (3)

1. **`viewer/src/pages/ReportingPage.tsx`**
   - Updated `loadReportData()` to read `templateId` from URL
   - Added template fetching logic
   - Updated `handleTemplateSelected()` to update URL with `templateId`
   - Calls `loadReportData()` after URL update to trigger template fetch

2. **`viewer/src/components/reporting/TemplateSelectorUnified.tsx`**
   - Reverted callback signature to not pass template object
   - Simplified - just passes `templateId` and `reportId`

3. **`viewer/src/contexts/ReportingContext.tsx`**
   - Removed auto-fetch logic (now handled in ReportingPage)
   - Kept `selectedTemplate` state field
   - Kept `SET_SELECTED_TEMPLATE` action (for future use)

### No Changes Needed

- **`viewer/src/components/reporting/panels/ReportContentPanel.tsx`**
  - Already reads `state.selectedTemplate?.uiModules`
  - Works automatically when `selectedTemplate` is populated

---

## Debugging

### Check URL Parameters

```javascript
// In browser console:
const params = new URLSearchParams(window.location.search);
console.log('studyUID:', params.get('studyUID'));
console.log('reportId:', params.get('reportId'));
console.log('templateId:', params.get('templateId'));
```

### Check Template Fetch

1. Open DevTools → Network tab
2. Click a template
3. Look for:
   - `GET /api/reports/templates/MAMMO-BIRADS-01`
   - Status: 200
   - Response includes `uiModules` array

### Check State

```javascript
// In browser console (after adding window.__reportingState):
console.log(window.__reportingState.selectedTemplate);
// Should show: { templateId: 'MAMMO-BIRADS-01', uiModules: [...] }
```

---

## Migration from Old Approach

### Old Approach (Passing Template Object)
```typescript
// TemplateSelectorUnified
onTemplateSelect(templateId, reportId, template);  // Passed entire object

// ReportingPage
handleTemplateSelected(templateId, reportId, template) {
  setReportData({ templateId, selectedTemplate: template });
}
```

**Problems:**
- Template object passed through multiple components
- Large object in component props
- Stale data if template updated in DB

### New Approach (URL + Fetch)
```typescript
// TemplateSelectorUnified
onTemplateSelect(templateId, reportId);  // Just IDs

// ReportingPage
handleTemplateSelected(templateId, reportId) {
  // Update URL
  params.set('templateId', templateId);
  
  // Fetch template from backend
  const template = await fetch(`/api/reports/templates/${templateId}`);
  setReportData({ selectedTemplate: template });
}
```

**Benefits:**
- URL is source of truth
- Template always fresh from DB
- Smaller component props
- Sharable/bookmarkable URLs

---

## Summary

**Approach:** URL-based template loading  
**URL Format:** `/app/reporting?studyUID={id}&reportId={id}&templateId={id}`  
**Template Fetch:** `GET /api/reports/templates/{templateId}`  
**Data Flow:** URL → Fetch → State → Render  
**Status:** ✅ Implemented and ready to test

**Next Step:** Restart frontend dev server and test clicking on templates

---

## Console Logs to Expect

```
When clicking Mammography template:

✅ Template selected, report created: 673d1234...
✅ Template ID: MAMMO-BIRADS-01
✅ Updated URL: /app/reporting?studyUID=...&reportId=673d1234&templateId=MAMMO-BIRADS-01
📋 Template will be fetched on page reload from URL param
📋 Reporting Page initialized: { studyUID, reportId, templateId: 'MAMMO-BIRADS-01' }
📋 Fetching template: MAMMO-BIRADS-01
✅ Template fetched: Mammography BI-RADS Assessment
✅ UI Modules: 2
✅ Loaded existing report: 673d1234
```

If you see these logs, the URL-based approach is working! ✅
