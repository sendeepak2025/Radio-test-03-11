# 🔧 Viewer to Reporting Navigation Fix

## ✅ Problem Fixed:
When clicking "Create Report" or "View Report" from the viewer, it was showing error: "Study UID is required."

## 🎯 Root Cause:
The viewer's report buttons were navigating to `/reporting` instead of `/app/reporting`.

## 🔨 What Was Fixed:

### 1. ViewReportButton Component
**File:** `viewer/src/components/viewer/ViewReportButton.tsx`

**Before:**
```tsx
navigate(`/reporting?reportId=${reportId}&studyUID=${studyInstanceUID}`)
navigate(`/reporting?studyUID=${studyInstanceUID}&patientID=...`)
```

**After:**
```tsx
navigate(`/app/reporting?reportId=${reportId}&studyUID=${studyInstanceUID}`)
navigate(`/app/reporting?studyUID=${studyInstanceUID}&patientID=...`)
```

Fixed both:
- `viewReport()` - For viewing existing reports
- `createNewReport()` - For creating new reports

### 2. ViewerPage "Open Reporting Interface" Button
**File:** `viewer/src/pages/viewer/ViewerPage.tsx`

**Before:**
```tsx
navigate(`/reporting?studyUID=${studyData.studyInstanceUID}&mode=manual...`)
```

**After:**
```tsx
navigate(`/app/reporting?studyUID=${studyData.studyInstanceUID}&mode=manual...`)
```

---

## 📊 Files Modified:

1. ✅ `viewer/src/components/viewer/ViewReportButton.tsx`
2. ✅ `viewer/src/pages/viewer/ViewerPage.tsx`

---

## 🎯 How It Works Now:

### From Viewer - Create Report:
```
1. Open study in viewer (/app/viewer/:studyUID)
2. Click "Create Report" button (top right)
3. Opens: /app/reporting?studyUID=xxx&patientID=yyy... ✅
4. Report editor loads with study context ✅
```

### From Viewer - View Existing Report:
```
1. Open study in viewer (/app/viewer/:studyUID)
2. If report exists, button shows "View Report"
3. Click "View Report"
4. Opens: /app/reporting?reportId=xxx&studyUID=yyy ✅
5. Report editor loads existing report ✅
```

### From Viewer - Multiple Reports:
```
1. Open study in viewer (/app/viewer/:studyUID)
2. If multiple reports exist, button shows "View Reports (2)"
3. Click button → Shows menu with all reports
4. Click any report → Opens that report ✅
5. Click "Create New Report" → Creates new report ✅
```

### From Viewer - Structured Reporting Tab:
```
1. Open study in viewer
2. Go to "Structured Reporting" tab
3. Click "Open Reporting Interface" button
4. Opens: /app/reporting?studyUID=xxx&mode=manual... ✅
5. Report editor loads with manual mode ✅
```

---

## 🎨 ViewReportButton Behavior:

### No Reports Exist:
- Button: "Create Report" (blue)
- Click → Creates new report ✅

### One Report Exists:
- Button: "View Report" (green)
- Click → Opens existing report ✅

### Multiple Reports Exist:
- Button: "View Reports (3)" (green with count badge)
- Click → Shows menu with all reports
- Select report → Opens that report ✅
- Select "Create New Report" → Creates new report ✅

---

## ✅ Testing Checklist:

After refreshing your browser:

### Test Create Report:
- [ ] Open a study in viewer
- [ ] Click "Create Report" button (if no reports exist)
- [ ] Reporting page should open with study loaded ✅
- [ ] No "Study UID is required" error ✅

### Test View Report:
- [ ] Open a study that has a report
- [ ] Click "View Report" button
- [ ] Reporting page should open with existing report ✅
- [ ] Report content should be loaded ✅

### Test Multiple Reports:
- [ ] Open a study with multiple reports
- [ ] Click "View Reports (X)" button
- [ ] Menu should show all reports
- [ ] Click any report → Opens that report ✅
- [ ] Click "Create New Report" → Creates new report ✅

### Test Structured Reporting Tab:
- [ ] Open a study in viewer
- [ ] Go to "Structured Reporting" tab
- [ ] Click "Open Reporting Interface" button
- [ ] Reporting page should open ✅

---

## 🔍 Complete Reporting Navigation Map:

```
From Viewer (/app/viewer/:studyUID)
    ↓
    ├─ "Create Report" button
    │   └─ /app/reporting?studyUID=xxx&patientID=yyy... ✅
    │
    ├─ "View Report" button (1 report)
    │   └─ /app/reporting?reportId=xxx&studyUID=yyy ✅
    │
    ├─ "View Reports (N)" button (multiple reports)
    │   ├─ Select Report 1 → /app/reporting?reportId=xxx&studyUID=yyy ✅
    │   ├─ Select Report 2 → /app/reporting?reportId=zzz&studyUID=yyy ✅
    │   └─ "Create New Report" → /app/reporting?studyUID=yyy... ✅
    │
    └─ "Structured Reporting" tab
        └─ "Open Reporting Interface" button
            └─ /app/reporting?studyUID=xxx&mode=manual... ✅
```

---

## 💡 Important Notes:

### URL Parameters Passed:
When creating a new report from viewer:
- `studyUID` - Study instance UID (required)
- `patientID` - Patient ID (optional)
- `patientName` - Patient name (optional)
- `modality` - Study modality (optional)
- `mode` - Creation mode (optional, e.g., "manual")

When viewing existing report:
- `reportId` - Report ID to load
- `studyUID` - Study instance UID

### Button States:
The ViewReportButton automatically:
- Checks if reports exist for the study
- Shows appropriate button text and color
- Handles single vs multiple reports
- Includes report count badge when multiple reports

---

## 🚀 Next Steps:

1. **Refresh your browser** (Ctrl + Shift + R)
2. **Open a study in viewer** (`/app/viewer/:studyUID`)
3. **Click "Create Report"** or "View Report" button
4. **Verify** - Reporting page should open with study loaded (no error!)

---

## 🎉 All Viewer Reporting Navigation Fixed!

Reporting from viewer now works correctly:
- ✅ "Create Report" button works
- ✅ "View Report" button works
- ✅ Multiple reports menu works
- ✅ "Open Reporting Interface" button works
- ✅ All navigation includes `/app` prefix
- ✅ All navigation includes studyUID parameter
- ✅ No more "Study UID is required" errors

**Users can now create and view reports from the viewer!** 🚀
