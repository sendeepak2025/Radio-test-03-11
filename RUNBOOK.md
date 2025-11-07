# 📘 UNIFIED REPORTING SYSTEM - RUNBOOK

## Overview

This runbook documents the unified structured reporting system that consolidates 3 parallel implementations into a single production flow.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED REPORTING FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Entry Points:                                                │
│  • /reporting?studyUID=...                                   │
│  • /reporting?analysisId=...&studyUID=...                   │
│  • From Worklist "Create Report" button                      │
│  • From Viewer "Create Report" button                        │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ReportingPage.tsx (Route Handler)                    │  │
│  │  - Parse query params                                  │  │
│  │  - Error boundaries                                    │  │
│  │  - Loading states                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  StructuredReporting.tsx (Orchestrator)               │  │
│  │  - State machine: selection → template → editor       │  │
│  │  - Mode selection (manual/ai/quick)                   │  │
│  │  - Workflow coordination                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ProductionReportEditor.tsx (Editor)                  │  │
│  │  - Sections editing                                    │  │
│  │  - Structured findings                                 │  │
│  │  - Autosave (3s)                                      │  │
│  │  - Voice dictation                                     │  │
│  │  - Medical macros                                      │  │
│  │  - Critical alerts                                     │  │
│  │  - Digital signature                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ReportsApi (Service Layer)                           │  │
│  │  - Single API client                                   │  │
│  │  - Talks ONLY to /api/reports                         │  │
│  │  - x-reports-impl: unified header                     │  │
│  │  - Version conflict handling                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Backend: /api/reports (Unified Endpoint)             │  │
│  │  - CRUD operations                                     │  │
│  │  - Template management                                 │  │
│  │  - Workflow (finalize/sign/addendum)                  │  │
│  │  - Export (PDF/DICOM-SR/FHIR/JSON)                    │  │
│  │  - RBAC + tenant scoping                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Environment Setup

### Required Environment Variables

```bash
# Frontend (.env)
VITE_API_URL=http://localhost:8001
REPORTING_UNIFIED=1

# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/medical-imaging
JWT_SECRET=your-secret-key
PORT=8001
```

### Feature Flags

```javascript
// Default configuration
{
  "reporting.unified": true,    // Enable unified reporting (DEFAULT: ON)
  "reporting.legacy": false,    // Enable legacy endpoints (DEFAULT: OFF)
  "reporting.autosave": true,   // Enable autosave (DEFAULT: ON)
  "reporting.voice": true,      // Enable voice dictation (DEFAULT: ON)
  "reporting.ai": true          // Enable AI-assisted mode (DEFAULT: ON)
}
```

## Development

### Start Development Servers

```bash
# Terminal 1: Backend API
cd server
npm install
npm run dev

# Terminal 2: Frontend
cd viewer
npm install
npm run dev
```

### Access Points

- Frontend: http://localhost:5173
- Backend API: http://localhost:8001
- Reporting Page: http://localhost:5173/reporting?studyUID=1.2.3.4.5

## API Endpoints

### Base URL: `/api/reports`

#### CRUD Operations

```
POST   /api/reports                    # Create/update report (upsert)
GET    /api/reports/:reportId          # Get specific report
PUT    /api/reports/:reportId          # Update report
DELETE /api/reports/:reportId          # Delete draft report
```

#### Query Operations

```
GET    /api/reports/study/:studyUID    # Get all reports for study
GET    /api/reports/patient/:patientID # Get patient reports
```

#### Template Operations

```
GET    /api/reports/templates          # Get all templates
POST   /api/reports/templates/suggest  # Auto-suggest template
```

#### Workflow Operations

```
POST   /api/reports/:reportId/finalize # Mark as preliminary
POST   /api/reports/:reportId/sign     # Sign and finalize
POST   /api/reports/:reportId/addendum # Add addendum
```

#### Export Operations

```
GET    /api/reports/:reportId/export?format=pdf|dicom-sr|fhir|json
POST   /api/reports/:reportId/export/pdf
POST   /api/reports/:reportId/export/dicom-sr
POST   /api/reports/:reportId/export/fhir
```

## Testing

### Unit Tests

```bash
cd viewer
npm run test

# Run specific test file
npm run test -- useAutosave.test.ts

# Watch mode
npm run test -- --watch
```

### Component Tests

```bash
npm run test -- --testPathPattern=components
```

### E2E Tests

```bash
# Install Playwright (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run specific test
npx playwright test reporting.spec.ts

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

## Workflow

### 1. Create Report (Manual Mode)

```
User clicks "Create Report" from Worklist
  ↓
Navigate to /reporting?studyUID=1.2.3.4.5
  ↓
ReportingPage loads
  ↓
StructuredReporting shows selection screen
  ↓
User selects "Template-Based"
  ↓
TemplateSelector shows available templates
  ↓
User selects template (e.g., "Chest CT")
  ↓
ProductionReportEditor loads with template sections
  ↓
User fills sections (autosave every 3s)
  ↓
User clicks "Mark Preliminary"
  ↓
Status changes: draft → preliminary
  ↓
User clicks "Sign & Finalize"
  ↓
SignaturePad modal opens
  ↓
User signs
  ↓
Status changes: preliminary → final
  ↓
Report is locked (read-only except addendum)
```

### 2. Create Report (AI-Assisted Mode)

```
AI analysis completes
  ↓
Navigate to /reporting?analysisId=abc123&studyUID=1.2.3.4.5
  ↓
ReportingPage loads with analysisId
  ↓
StructuredReporting auto-selects AI mode
  ↓
Load AI analysis data
  ↓
Suggest best template based on modality + AI findings
  ↓
ProductionReportEditor loads with AI-populated sections
  ↓
User reviews and edits AI findings
  ↓
User adds/removes findings
  ↓
User finalizes and signs
```

### 3. Status Transitions

```
draft → preliminary (via /finalize)
  ↓
preliminary → final (via /sign)
  ↓
final → amended (via /addendum)
```

### 4. Autosave Flow

```
User types in editor
  ↓
useAutosave hook detects change
  ↓
Wait 3 seconds (debounce)
  ↓
If no new changes, trigger save
  ↓
POST /api/reports (upsert)
  ↓
Success: Update lastSaved timestamp
  ↓
Error 409 (version conflict):
  ↓
Show VersionConflictModal
  ↓
User chooses: "Use Server" or "Keep Mine"
  ↓
Retry save with chosen version
```

## RBAC (Role-Based Access Control)

### Roles

- `radiologist`: Can create, edit, sign reports
- `admin`: Can create, edit, sign, delete reports
- `superadmin`: Full access
- `qa`: Can view and comment
- `system:admin`: System-level access

### Permissions

```typescript
// Edit report
canEditReport(user, reportStatus)
  - Returns false if status is 'final' or 'amended'
  - Returns false if status is 'cancelled'
  - Returns true if user role is in ['radiologist', 'admin', 'superadmin', 'qa', 'system:admin']

// Sign report
canSignReport(user)
  - Returns true if user role is 'radiologist', 'admin', or 'superadmin'

// Delete report
canDeleteReport(user, reportStatus)
  - Returns false if status is not 'draft'
  - Returns true if user role is in ['radiologist', 'admin', 'superadmin']
```

## Keyboard Shortcuts

```
Ctrl/Cmd + S         Save report
Ctrl/Cmd + Shift + S Sign report
Ctrl/Cmd + Enter     Next field
Ctrl/Cmd + M         Toggle voice dictation
Ctrl/Cmd + /         Show keyboard shortcuts
F11                  Toggle fullscreen
```

## Medical Macros

Type these shortcuts and they will auto-expand:

```
nml  → No acute abnormality detected.
wnl  → Within normal limits.
cf   → Clinical correlation is recommended.
fu   → Follow-up imaging is recommended
prv  → Comparison with previous studies shows
stbl → Stable appearance compared to prior study.
impr → Improved appearance compared to prior study.
wrse → Worsened appearance compared to prior study.
lca  → Lungs are clear bilaterally.
nci  → No consolidation or infiltrate.
npe  → No pleural effusion.
csnl → Cardiac silhouette is normal in size.
mss  → Mediastinal structures are unremarkable.
bsi  → Bony structures are intact.
```

## Troubleshooting

### Autosave Not Working

1. Check browser console for errors
2. Verify network connectivity
3. Check authentication token is valid
4. Verify `reporting.autosave` feature flag is enabled

### Version Conflict

1. VersionConflictModal should appear automatically
2. Choose "Use Server Version" to discard local changes
3. Choose "Keep My Version" to overwrite server changes
4. If modal doesn't appear, check console for errors

### Template Not Loading

1. Verify `/api/reports/templates` endpoint is accessible
2. Check template has `active: true` flag
3. Verify modality matches study modality

### AI Analysis Not Populating

1. Verify `analysisId` is in URL query params
2. Check `/api/ai/analysis/:analysisId` endpoint returns data
3. Verify AI analysis has completed successfully

### Export Failing

1. Check export format is valid: pdf, dicom-sr, fhir, json
2. Verify report is finalized (status: 'final')
3. Check backend has required dependencies (PDFKit, etc.)

## Monitoring & Telemetry

### Events Emitted

```javascript
// Page load
reporting.impl=unified

// Report operations
reporting.report.upserted
reporting.report.updated
reporting.report.finalized
reporting.report.signed
reporting.report.exported
reporting.report.deleted

// Template operations
reporting.template.suggested

// Addendum operations
reporting.addendum.added

// API operations
reporting.api.success
reporting.api.error
```

### Logging

All telemetry events are logged to console in development and sent to analytics service in production.

## Assumptions & Design Decisions

1. **Autosave Interval**: 3 seconds chosen as balance between UX and server load
2. **Version Conflict**: Manual resolution required (no automatic merge)
3. **Template Matching**: Based on modality + study description + AI summary
4. **RBAC**: Tenant scoping enforced at API level
5. **Signature**: SHA-256 hash computed client-side for integrity
6. **Export**: PDF generation uses PDFKit with fallback to plain text
7. **Voice Dictation**: Uses Web Speech API (Chrome/Edge only)
8. **Medical Macros**: Expand on space key press
9. **Critical Findings**: Auto-detected from type='critical' or severity='critical'
10. **Prior Comparison**: Stub implementation (hook provided for future)

## Migration from Legacy

### Phase 1: Parallel Operation (Current)

- Unified API active
- Legacy adapter routes to unified API
- Deprecation warnings in console

### Phase 2: Grace Period (2 weeks)

- Monitor deprecation warnings
- Update all legacy callers
- Test thoroughly

### Phase 3: Removal (After grace period)

- Remove legacy adapter
- Remove deprecation warnings
- Clean up dead code

## Performance Optimization

### Current Optimizations

1. Debounced autosave (3s)
2. Optimistic UI updates
3. Lazy loading of templates
4. Memoized components
5. Request deduplication

### Future Optimizations

1. Virtualized findings list (for >100 findings)
2. Chunked saves (for large reports)
3. Web workers for hashing
4. Service worker for offline support
5. IndexedDB cache for templates

## Security

### Authentication

- JWT tokens in Authorization header
- Token refresh on 401 responses
- Secure cookie storage

### Authorization

- RBAC checks on every API call
- Tenant scoping enforced
- Report ownership validation

### Data Protection

- Content hash for signature verification
- Audit trail for all changes
- Version history preserved
- PHI logging minimized

## Support

### Common Issues

**Q: Report not saving**
A: Check network tab, verify auth token, check console for errors

**Q: Template not appearing**
A: Verify template is active and matches modality

**Q: Voice dictation not working**
A: Only supported in Chrome/Edge, check microphone permissions

**Q: Export button disabled**
A: Report must be finalized before export

### Contact

- Tech Lead: [Your Name]
- Backend Team: backend-team@example.com
- Frontend Team: frontend-team@example.com
- DevOps: devops@example.com

## Changelog

### v1.0.0 (Current)

- ✅ Unified reporting flow
- ✅ Single API client (ReportsApi)
- ✅ Autosave with version conflict handling
- ✅ Digital signature support
- ✅ Export (PDF/DICOM-SR/FHIR/JSON)
- ✅ Medical macros
- ✅ Voice dictation
- ✅ Critical findings alerts
- ✅ RBAC enforcement
- ✅ Legacy adapter for backward compatibility

### Roadmap

- 🔜 Structured findings ontology (RadLex/SNOMED)
- 🔜 Draft collaboration (multi-user)
- 🔜 Offline-first with background sync
- 🔜 Advanced AI discrepancy checker
- 🔜 Quality metrics dashboard
- 🔜 Audit export & e-signature certificates
- 🔜 Theming + i18n
- 🔜 Performance optimizations
