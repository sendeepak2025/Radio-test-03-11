# 📘 Unified Reporting API - Quick Reference

## 🌐 Base URLs

### Development
- **Frontend**: `http://localhost:3010`
- **Backend**: `http://localhost:8001`
- **API Base**: `/api/reports` (proxied through Vite)

### Production
- **API Base**: `/api/reports` (same origin)

---

## 🔌 Health & Diagnostics

### Health Check
```bash
GET /api/reports/health
```
**Response:**
```json
{
  "ok": true,
  "service": "unified-reporting",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

### Frontend Connectivity Test
```typescript
import { reportsApi } from '@/services/ReportsApi';

// Simple ping
await reportsApi.ping();

// Comprehensive test
const results = await reportsApi.runConnectivityTest();
// Returns: { health: boolean, templates: boolean, errors: string[] }
```

---

## 📋 Report CRUD Operations

### Create/Update Draft (Upsert)
```typescript
POST /api/reports
Content-Type: application/json
Authorization: Bearer <token>

{
  "studyInstanceUID": "1.2.3.4.5",
  "patientID": "P12345",
  "patientName": "John Doe",
  "modality": "CT",
  "templateId": "chest-ct-template",
  "sections": {
    "indication": "Chest pain",
    "technique": "CT chest with contrast",
    "findings": "No acute findings",
    "impression": "Normal study"
  },
  "findings": [],
  "measurements": [],
  "reportStatus": "draft"
}
```

### Get Report by ID
```typescript
GET /api/reports/:reportId
Authorization: Bearer <token>
```

### Update Report
```typescript
PUT /api/reports/:reportId
Content-Type: application/json
Authorization: Bearer <token>

{
  "sections": { ... },
  "findings": [ ... ]
}
```

### Delete Draft
```typescript
DELETE /api/reports/:reportId
Authorization: Bearer <token>
```

---

## 🔍 Query Operations

### Get Reports by Study
```typescript
GET /api/reports/study/:studyInstanceUID
Authorization: Bearer <token>
```

### Get Reports by Patient
```typescript
GET /api/reports/patient/:patientID?limit=10
Authorization: Bearer <token>
```

---

## 📝 Template Operations

### Get All Templates
```typescript
GET /api/reports/templates?active=true
Authorization: Bearer <token>
```

### Suggest Template
```typescript
POST /api/reports/templates/suggest
Content-Type: application/json
Authorization: Bearer <token>

{
  "modality": "CT",
  "studyDescription": "Chest CT",
  "aiSummary": "..."
}
```

---

## ✍️ Workflow Operations

### Finalize Report (draft → preliminary)
```typescript
POST /api/reports/:reportId/finalize
Authorization: Bearer <token>
```

### Sign Report (→ final)
```typescript
POST /api/reports/:reportId/sign
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  - signatureText: "Dr. John Smith"
  - signature: <image file>
  - signatureHash: "abc123..."
```

### Add Addendum
```typescript
POST /api/reports/:reportId/addendum
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Additional findings noted...",
  "reason": "Follow-up review"
}
```

---

## 📤 Export Operations

### Export (GET with format)
```typescript
GET /api/reports/:reportId/export?format=pdf
Authorization: Bearer <token>

// Formats: pdf | dicom-sr | fhir | json
```

### Export PDF (POST)
```typescript
POST /api/reports/:reportId/export/pdf
Authorization: Bearer <token>
```

### Export DICOM SR
```typescript
POST /api/reports/:reportId/export/dicom-sr
Authorization: Bearer <token>
```

### Export FHIR
```typescript
POST /api/reports/:reportId/export/fhir
Authorization: Bearer <token>
```

---

## 🎨 Frontend Usage Examples

### Initialize Report Editor
```typescript
import UnifiedReportEditor from '@/components/reports/UnifiedReportEditor.enhanced';

<UnifiedReportEditor
  studyInstanceUID="1.2.3.4.5"
  patientInfo={{
    patientID: "P12345",
    patientName: "John Doe",
    modality: "CT"
  }}
  analysisId="ai-analysis-123"  // Optional
  reportId="SR-2025-001"        // Optional (for editing existing)
  templateId="chest-ct"         // Optional
  onReportCreated={(id) => console.log('Created:', id)}
  onReportSigned={() => console.log('Signed!')}
  onClose={() => navigate(-1)}
/>
```

### Use Report State Hook
```typescript
import { useReportState } from '@/hooks/useReportState';

const {
  report,
  loading,
  error,
  updateSection,
  updateField,
  addFinding,
  loadOrCreateDraft
} = useReportState();

// Load or create draft
const draft = await loadOrCreateDraft({
  studyInstanceUID: "1.2.3.4.5",
  patientID: "P12345",
  patientName: "John Doe",
  modality: "CT",
  templateId: "chest-ct",
  aiAnalysisId: "ai-123"
});

// Update sections
updateSection('findings', 'No acute findings');

// Update fields
updateField('reportStatus', 'preliminary');

// Add finding
addFinding({
  id: 'finding-1',
  type: 'nodule',
  description: 'Small nodule in RUL',
  severity: 'mild'
});
```

### Use Autosave Hook
```typescript
import { useAutosave } from '@/hooks/useAutosave';

const {
  isSaving,
  lastSaved,
  saveNow,
  hasUnsavedChanges
} = useAutosave({
  reportId: report.reportId,
  data: report,
  enabled: true,
  paused: false,
  interval: 3000,
  onSaveSuccess: (saved) => console.log('Saved:', saved),
  onSaveError: (error) => console.error('Save failed:', error),
  onVersionConflict: (conflict) => handleConflict(conflict)
});

// Manual save
await saveNow();
```

---

## 🐛 Debugging

### Check Backend Routes
```bash
# Backend logs on startup show:
📍 MOUNTED ROUTES:
  ✅ /api/reports          → Unified Reporting System
  ✅ /api/reports/health   → Health check endpoint
  ✅ /api/reports/templates → Template management
  ✅ /api/reports/:id/export → Export functionality
```

### Check Frontend Proxy
```bash
# Vite dev server logs show:
🔄 Proxying: GET /api/reports/health → http://localhost:8001/api/reports/health
✅ Response: 200 /api/reports/health
```

### Common Issues

#### 404 Not Found
- ✅ Check backend is running: `curl http://localhost:8001/api/reports/health`
- ✅ Check route is mounted in `server/src/routes/index.js`
- ✅ Check URL path matches backend routes exactly

#### CORS Error
- ✅ Development: Use proxy (`/api` not `http://localhost:8001/api`)
- ✅ Check `viewer/vite.config.ts` proxy configuration
- ✅ Production: Ensure same origin or update CORS whitelist

#### Network Error
- ✅ Check backend is running
- ✅ Check browser console for detailed error
- ✅ Use connectivity test: `reportsApi.runConnectivityTest()`
- ✅ Check authentication token is valid

#### Autosave Not Working
- ✅ Check `reportId` is not `temp-*` (offline mode)
- ✅ Check `paused` is false
- ✅ Check console for save errors
- ✅ Verify backend is reachable

---

## 🔐 Authentication

All endpoints (except `/health`) require JWT authentication:

```typescript
Authorization: Bearer <access_token>
```

Token is automatically added by `ReportsApi` client from:
1. `localStorage.getItem('accessToken')`
2. `sessionStorage.getItem('accessToken')`
3. `localStorage.getItem('accessToken')`

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "report": { ... },
  "message": "Report created"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Report not found",
  "code": "NOT_FOUND",
  "details": { ... }
}
```

---

## 🚀 Performance Tips

1. **Autosave**: Default 3s interval, adjust based on needs
2. **Virtualization**: Findings list virtualizes at 50+ items
3. **Lazy Loading**: Heavy components (SignatureDialog) load on demand
4. **Debouncing**: Text inputs debounced to reduce API calls
5. **Caching**: Templates cached after first fetch

---

## 📞 Support

- **Documentation**: See `UNIFIED_REPORTING_COMPLETE.md`
- **Verification**: See `NETWORK_ERROR_FIX_VERIFICATION.md`
- **Issues**: Check browser console (F12) for detailed logs
- **Health Check**: `http://localhost:8001/api/reports/health`
