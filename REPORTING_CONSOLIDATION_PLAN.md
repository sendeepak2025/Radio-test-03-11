# 🎯 Unified Reporting System - Consolidation Plan

## Current Problem
Multiple scattered reporting modules causing confusion:

### Backend Routes (4 different files!)
1. `/api/reports` → `structured-reports.js` (785+ lines)
2. `/api/reports` → `report-export.js` (export features)
3. `/api/reports-v2` → `reports.js` (duplicate system!)
4. `/api/report-templates` → `report-templates.js`

### Frontend Pages (3 different pages!)
1. `viewer/src/pages/ReportingPage.tsx`
2. `viewer/src/pages/reporting/ReportingPage.tsx`
3. Embedded in `ViewerPage.tsx`

### Frontend Components (15+ files!)
- `StructuredReporting.tsx`
- `EnhancedReportingInterface.tsx`
- `ReportingInterface.tsx`
- `ReportEditor.tsx`
- `TemplateSelector.tsx`
- `VoiceDictation.tsx`
- And many more...

## ✅ Solution: ONE Unified Module

### Backend: Single Route File
**File:** `server/src/routes/reports.js` (consolidated)

**Endpoints:**
```
POST   /api/reports                    - Create new report
GET    /api/reports/:reportId          - Get report by ID
PUT    /api/reports/:reportId          - Update report
DELETE /api/reports/:reportId          - Delete draft report

GET    /api/reports/study/:studyUID    - Get reports for study
GET    /api/reports/patient/:patientID - Get patient reports

POST   /api/reports/:reportId/finalize - Finalize report
POST   /api/reports/:reportId/sign     - Sign report
POST   /api/reports/:reportId/addendum - Add addendum

GET    /api/reports/:reportId/pdf      - Export to PDF
POST   /api/reports/:reportId/export   - Export (DICOM SR, FHIR)

GET    /api/reports/templates          - Get templates
POST   /api/reports/templates/suggest  - Auto-select template
```

### Frontend: Single Page
**File:** `viewer/src/pages/ReportingPage.tsx`

**Route:** `/reporting` (only one!)

**Features:**
- Template selection
- Voice dictation
- AI assistance
- Signature capture
- Export options
- All-in-one interface

## 🗑️ Files to Delete

### Backend
- `server/src/routes/structured-reports.js` (merge into reports.js)
- `server/src/routes/report-templates.js` (merge into reports.js)
- Keep `report-export.js` but mount under `/api/reports/export/*`

### Frontend
- `viewer/src/pages/reporting/ReportingPage.tsx` (duplicate)
- `viewer/src/components/reporting/StructuredReporting.old.tsx`
- `viewer/src/components/reporting/EnhancedReportingInterface.tsx` (merge)
- `viewer/src/components/reporting/ReportingInterface.tsx` (merge)

Keep only ONE main component: `UnifiedReportEditor.tsx`

## 📋 Implementation Steps

1. ✅ Create unified backend route
2. ✅ Update route registration in `server/src/routes/index.js`
3. ✅ Create unified frontend page
4. ✅ Update App.tsx routing
5. ✅ Delete old files
6. ✅ Test complete workflow

## 🎯 Result
- ONE route: `/reporting`
- ONE backend file: `server/src/routes/reports.js`
- ONE frontend page: `viewer/src/pages/ReportingPage.tsx`
- ONE main component: `UnifiedReportEditor.tsx`

Clean, simple, maintainable! ✨
