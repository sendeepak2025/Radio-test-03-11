# 🎯 Unified Reporting System - Quick Reference

## ONE Route, ONE System

### Frontend
```
URL: /reporting
File: viewer/src/pages/ReportingPage.tsx
```

### Backend
```
Route: /api/reports/*
File: server/src/routes/reports-unified.js
```

## Common Operations

### 1. Create Report
```bash
POST /api/reports
{
  "studyInstanceUID": "1.2.3.4.5",
  "patientID": "P12345",
  "patientName": "John Doe",
  "modality": "XA",
  "templateId": "chest-xray"
}
```

### 2. Get Report
```bash
GET /api/reports/:reportId
```

### 3. Update Report
```bash
PUT /api/reports/:reportId
{
  "sections": {
    "findings": "Updated findings...",
    "impression": "Updated impression..."
  }
}
```

### 4. Sign Report
```bash
POST /api/reports/:reportId/sign
{
  "signatureText": "Dr. Smith"
}
```

### 5. Export PDF
```bash
GET /api/reports/:reportId/pdf
```

### 6. Get Study Reports
```bash
GET /api/reports/study/:studyInstanceUID
```

### 7. Get Patient Reports
```bash
GET /api/reports/patient/:patientID?limit=10
```

### 8. Get Templates
```bash
GET /api/reports/templates
```

### 9. Auto-Select Template
```bash
POST /api/reports/templates/suggest
{
  "modality": "XA",
  "bodyPart": "CHEST",
  "studyDescription": "Chest X-Ray"
}
```

## Report Status Flow

```
draft → preliminary → final
         ↓
      addendum (if needed)
```

## Files Changed

### ✅ Created
- `server/src/routes/reports-unified.js` - Unified backend route
- `UNIFIED_REPORTING_COMPLETE.md` - Complete documentation
- `REPORTING_CONSOLIDATION_PLAN.md` - Implementation plan

### ✅ Modified
- `server/src/routes/index.js` - Updated route registration
- `viewer/src/App.tsx` - Simplified routing

### 🗑️ Can Delete (Optional)
- `server/src/routes/structured-reports.js`
- `server/src/routes/report-templates.js`
- `server/src/routes/reports.js`
- `viewer/src/pages/reporting/ReportingPage.tsx` (duplicate)

## Testing

```bash
# Start backend
cd server
npm start

# Start frontend
cd viewer
npm run dev

# Navigate to
http://localhost:5173/reporting
```

## Key Features

✅ Single unified route  
✅ Template auto-selection  
✅ Voice dictation support  
✅ Digital signatures  
✅ PDF export  
✅ DICOM SR export  
✅ Audit trail  
✅ Addendum support  
✅ Report history  

## Support

All reporting functionality is now in ONE place:
- Backend: `server/src/routes/reports-unified.js`
- Frontend: `viewer/src/pages/ReportingPage.tsx`

No more confusion! 🎉
