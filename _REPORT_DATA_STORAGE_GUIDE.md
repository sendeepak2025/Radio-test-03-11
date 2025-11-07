# 📝 Report Data Storage & Edit Functionality Guide

## 🎯 Current Status

### ✅ What's Working
1. Report creation (draft is created)
2. Report finalization (status changes to preliminary/final)
3. Report retrieval by ID
4. Version tracking in `revisionHistory`

### ❌ What's Not Working
1. **Report content not being saved** - `findings`, `measurements`, `sections` are empty
2. **Edit functionality** - Need UI to edit existing reports
3. **History tracking** - Need to show what changed in each revision

---

## 🔍 Why Report Data Is Empty

Looking at your report response:
```json
{
  "reportId": "SR-1762361496706-08b2by4if",
  "reportStatus": "preliminary",
  "findings": [],           // ❌ Empty
  "measurements": [],       // ❌ Empty
  "annotations": [],        // ❌ Empty
  "keyImages": [],          // ❌ Empty
  "sections": undefined,    // ❌ Missing
  "revisionHistory": [
    {
      "revisedBy": "hospital",
      "changes": "Report created",
      "previousStatus": null
    },
    {
      "revisedBy": "hospital",
      "changes": "Report finalized",
      "previousStatus": "draft"
    }
  ]
}
```

**Root Cause:** The frontend is creating a draft but not sending any content data. The user needs to:
1. Fill in the report fields (findings, impression, technique, etc.)
2. Save the changes
3. Then finalize

---

## 🔧 Backend API - Already Working!

### Create/Update Report
```http
POST /api/reports
Content-Type: application/json
Authorization: Bearer <token>

{
  "studyInstanceUID": "1.3.12.2.1107...",
  "patientID": "P12345",
  "patientName": "John Doe",
  "modality": "CT",
  "templateId": "chest-ct-template",
  "sections": {
    "indication": "Chest pain",
    "technique": "CT chest with IV contrast",
    "findings": "The lungs are clear. No pleural effusion...",
    "impression": "Normal chest CT"
  },
  "findings": [
    {
      "id": "finding-1",
      "type": "normal",
      "description": "Lungs are clear",
      "severity": "none"
    }
  ],
  "measurements": [
    {
      "id": "meas-1",
      "type": "length",
      "value": 5.2,
      "unit": "cm",
      "location": "Aorta"
    }
  ],
  "keyImages": [
    {
      "id": "img-1",
      "seriesInstanceUID": "1.2.3...",
      "sopInstanceUID": "1.2.3...",
      "frameNumber": 10,
      "description": "Key finding"
    }
  ],
  "reportStatus": "draft"
}
```

### Update Existing Report
```http
PUT /api/reports/SR-xxx
Content-Type: application/json
Authorization: Bearer <token>

{
  "sections": {
    "findings": "Updated findings text...",
    "impression": "Updated impression..."
  },
  "findings": [
    {
      "id": "finding-1",
      "description": "Updated description"
    }
  ]
}
```

**Backend Response:**
- ✅ Saves all fields
- ✅ Bumps version number
- ✅ Adds revision to history
- ✅ Tracks what changed

---

## 🎨 Frontend - What Needs to Happen

### Current Flow (Incomplete)
```
1. User selects template
2. Draft created (empty)
3. User clicks "Finalize"
4. Report finalized (still empty) ❌
```

### Correct Flow (What Should Happen)
```
1. User selects template
2. Draft created (empty)
3. ✅ User fills in report fields:
   - Indication
   - Technique
   - Findings
   - Impression
   - Add measurements
   - Add key images
4. ✅ Autosave sends data to backend
5. User clicks "Finalize"
6. Report finalized (with content) ✅
```

---

## 📋 UnifiedReportEditor - Current Implementation

The `UnifiedReportEditor.enhanced.tsx` already has:

### ✅ Text Fields
```tsx
<TextField
  label="Clinical Indication"
  value={report.content?.indication || ''}
  onChange={(e) => updateField('content.indication', e.target.value)}
/>

<TextField
  label="Technique"
  value={report.content?.technique || ''}
  onChange={(e) => updateField('content.technique', e.target.value)}
/>

<TextField
  label="Impression"
  value={report.content?.impression || ''}
  onChange={(e) => updateField('content.impression', e.target.value)}
/>
```

### ✅ Findings Management
```tsx
<Button onClick={() => addFinding()}>Add Finding</Button>

{findings.map(finding => (
  <TextField
    value={finding.description}
    onChange={(e) => updateFinding(finding.id, { description: e.target.value })}
  />
))}
```

### ✅ Autosave Hook
```tsx
const { isSaving, lastSaved, saveNow } = useAutosave({
  reportId: report.reportId,
  data: report,
  enabled: true,
  interval: 3000,  // Saves every 3 seconds
  onSaveSuccess: (savedReport) => {
    setReport(savedReport);
    toast('Saved');
  }
});
```

---

## 🔄 How Data Flows

### When User Types
```
User types in "Findings" field
  ↓
updateField('content.findings', value)
  ↓
Updates local state
  ↓
Autosave hook detects change
  ↓
After 3 seconds, calls reportsApi.upsert()
  ↓
POST /api/reports with full report data
  ↓
Backend saves to database
  ↓
Returns updated report
  ↓
Frontend updates local state
  ↓
Toast: "Saved" ✅
```

---

## 🛠️ Fix Applied - GET Endpoint

**File**: `server/src/routes/reports-unified.js`

**Before:**
```javascript
const report = await StructuredReport.findById(reportId);
// ❌ This looks for MongoDB _id, not reportId field
```

**After:**
```javascript
// Try to find by reportId field first (SR-xxx format)
let report = await StructuredReport.findOne({ reportId });

// Fallback: try MongoDB _id if reportId not found
if (!report && reportId.match(/^[0-9a-fA-F]{24}$/)) {
  report = await StructuredReport.findById(reportId);
}
```

**Why:** The URL uses `reportId` (SR-xxx) but the old code was looking for MongoDB `_id`.

---

## 📊 Edit Functionality with History

### Current Revision History
```json
"revisionHistory": [
  {
    "revisedBy": "hospital",
    "revisedAt": "2025-11-05T16:51:36.703Z",
    "changes": "Report created",
    "previousStatus": null
  },
  {
    "revisedBy": "hospital",
    "revisedAt": "2025-11-05T17:05:45.928Z",
    "changes": "Report updated",
    "previousStatus": "draft"
  }
]
```

### Enhanced History Tracking (Already Implemented!)

The backend already tracks:
- ✅ Who made the change (`revisedBy`)
- ✅ When it was changed (`revisedAt`)
- ✅ What changed (`changes`)
- ✅ Previous status (`previousStatus`)
- ✅ Version number (`version`)

### To Show Detailed Changes

Update the `pushRevision` function to track specific field changes:

```javascript
function pushRevision(report, user, changes, previousStatus, fieldChanges = {}) {
  report.revisionHistory = report.revisionHistory || [];
  report.revisionHistory.push({
    revisedBy: user?.username || 'System',
    revisedAt: new Date(),
    changes,
    previousStatus,
    fieldChanges  // ✅ Add this
  });
}

// Usage:
pushRevision(report, req.user, 'Report updated', previousStatus, {
  findings: { added: 2, modified: 1, removed: 0 },
  sections: { modified: ['findings', 'impression'] },
  measurements: { added: 1 }
});
```

---

## 🎯 Action Items

### For Backend (Already Done! ✅)
1. ✅ Fix GET endpoint to use `reportId` field
2. ✅ PUT endpoint already handles updates correctly
3. ✅ Version tracking already working
4. ✅ Revision history already working

### For Frontend (Needs Testing)
1. ✅ UnifiedReportEditor has all fields
2. ✅ Autosave hook is implemented
3. ✅ updateField/addFinding/etc. methods exist
4. ⚠️ **Need to verify autosave is actually sending data**

### To Test
1. Open a report in editor
2. Type in the "Findings" field
3. Wait 3 seconds
4. Check Network tab - should see POST/PUT to `/api/reports`
5. Check request payload - should include the text you typed
6. Check response - should show updated report with your text

---

## 🧪 Testing Guide

### Test 1: Create Report with Content
```
1. Navigate to /reporting?studyUID=xxx&mode=manual
2. Select a template
3. Draft created
4. Type in "Clinical Indication": "Chest pain"
5. Type in "Findings": "Lungs are clear"
6. Type in "Impression": "Normal study"
7. Wait 3 seconds
8. Check console: Should see "Saved" toast
9. Refresh page
10. Content should still be there ✅
```

### Test 2: Edit Existing Report
```
1. Navigate to /reporting?reportId=SR-xxx&studyUID=xxx
2. Report loads with existing content
3. Modify "Findings" text
4. Wait 3 seconds
5. Check console: Should see "Saved" toast
6. Check version number: Should increment
7. Check revisionHistory: Should have new entry
```

### Test 3: View History
```
1. Open report
2. Check report.revisionHistory array
3. Should show:
   - Who made each change
   - When it was made
   - What changed
   - Previous status
```

---

## 📝 Example: Complete Report Creation Flow

```javascript
// 1. Create draft
POST /api/reports
{
  "studyInstanceUID": "1.3.12.2.1107...",
  "patientID": "P12345",
  "templateId": "chest-ct-template",
  "reportStatus": "draft"
}
// Response: { reportId: "SR-xxx", version: 1 }

// 2. User types, autosave updates
PUT /api/reports/SR-xxx
{
  "sections": {
    "indication": "Chest pain",
    "technique": "CT chest with contrast"
  }
}
// Response: { reportId: "SR-xxx", version: 2 }

// 3. User adds finding
PUT /api/reports/SR-xxx
{
  "findings": [
    {
      "id": "finding-1",
      "description": "Lungs are clear"
    }
  ]
}
// Response: { reportId: "SR-xxx", version: 3 }

// 4. User finalizes
POST /api/reports/SR-xxx/finalize
// Response: { reportId: "SR-xxx", version: 4, reportStatus: "preliminary" }

// 5. User signs
POST /api/reports/SR-xxx/sign
{
  "signatureText": "Dr. John Smith"
}
// Response: { reportId: "SR-xxx", version: 5, reportStatus: "final" }
```

---

## 🔍 Debugging

### If Data Still Not Saving

1. **Check Browser Console:**
   ```
   Should see:
   - "📝 Creating draft with template: xxx"
   - "✅ Draft created: SR-xxx"
   - User types...
   - After 3 seconds: "Saving..."
   - "✅ Saved"
   ```

2. **Check Network Tab:**
   ```
   Should see:
   - POST /api/reports (create draft)
   - PUT /api/reports/SR-xxx (autosave)
   - Request payload should include your text
   ```

3. **Check Backend Logs:**
   ```
   Should see:
   - [REPORTS API] POST /api/reports
   - [REPORTS API] PUT /api/reports/SR-xxx
   ```

4. **Check Database:**
   ```javascript
   // In MongoDB
   db.structuredreports.findOne({ reportId: "SR-xxx" })
   // Should show your content in sections, findings, etc.
   ```

---

## ✅ Summary

**Backend:** ✅ Fully working
- GET endpoint fixed to use `reportId` field
- PUT endpoint handles updates correctly
- Version tracking working
- Revision history working

**Frontend:** ⚠️ Needs verification
- Editor UI exists
- Autosave hook exists
- Need to verify data is actually being sent

**Next Steps:**
1. Test creating a report and typing content
2. Verify autosave sends data to backend
3. Verify data persists after refresh
4. If not working, check autosave hook configuration

---

**Status:** Backend fixed, frontend needs testing
**Date:** 2025-11-05
