# PR: AI Report Consolidation & Backend Routing

## 🎯 Objective
Consolidate dual reporting implementations and route all AI calls through backend with full provenance tracking.

## ✅ Changes Summary

### **Files Modified (NO new files created)**

#### Backend Models
1. **`server/src/models/Report.js`**
   - Consolidated `Report.js` and `StructuredReport.js` schemas into unified model
   - Added `creationMode` field: `manual`, `ai-assisted`, `ai-only`
   - Added `aiProvenance` object with model name, version, requestId, timestamp, rawOutputHash
   - Enhanced audit trail with `actorId`, `actionType`, `diffSnapshot`
   - Added backward compatibility aliases and virtuals
   - Added indexes for efficient querying by mode

#### Backend Services
2. **`server/src/services/report-service.js`**
   - Updated `createReport()` to support three creation modes
   - Added `loadAIAnalysis()` and `populateFromAI()` methods
   - Added `hashObject()` for provenance tracking (SHA-256)
   - Added `addAuditEntry()` for comprehensive audit trail
   - Added `renderToPDF()` method for industry-standard PDF generation with provenance
   - Updated statistics to include mode breakdown

3. **`server/src/services/ai-analysis-orchestrator.js`**
   - Added provenance tracking with unique requestId per analysis
   - Added actorId parameter for audit trail
   - Enhanced error logging with context
   - Added audit entries for analysis lifecycle events

#### Backend Routes
4. **`server/src/routes/reports.js`**
   - Updated POST `/api/reports` to accept `creationMode` parameter
   - Added validation for creation modes
   - Added GET `/api/reports/:reportId/pdf` endpoint for PDF rendering
   - Maintained backward compatibility with existing clients

5. **`server/src/controllers/aiAnalysisController.js`**
   - Enhanced POST `/api/ai/analyze` with provenance metadata
   - Added actorId extraction from authenticated user
   - Added provenance object to all responses
   - Enhanced error logging with request context

#### Frontend Services
6. **`viewer/src/services/AutoAnalysisService.ts`**
   - **REMOVED all direct AI service calls** (ports 5001, 5002)
   - Routed all AI calls through backend API (`/api/ai/analyze`)
   - Updated health check to use backend endpoint
   - Added authentication headers to all requests
   - Changed from direct HTTP calls to backend proxy

7. **`viewer/src/services/ApiService.ts`**
   - Updated `analyzeStudyWithAI()` to use unified `/api/ai/analyze` endpoint
   - Added `imageData` parameter for canvas snapshots
   - Removed direct AI service URL references

#### Frontend Components
8. **`viewer/src/components/reports/ProductionReportEditor.tsx`**
   - Added creation mode state: `manual`, `ai-assisted`, `ai-only`
   - Added mode toggle UI with ToggleButtonGroup
   - Updated save handler to include `creationMode` and `aiAnalysisId`
   - Changed API endpoint from `/api/structured-reports` to `/api/reports`
   - Added mode-specific UI indicators and help text

#### Migration
9. **`server/migrate-reports-consolidation.js`** (NEW - migration script only)
   - Migrates StructuredReport records to unified Report model
   - Infers creation mode from existing data
   - Adds provenance metadata to migrated records
   - Supports dry-run and verification modes
   - Reversible with database backup

---

## 🔐 Security & Compliance

### Authentication & Authorization
- ✅ All AI calls now require authentication (JWT tokens)
- ✅ Backend enforces rate limiting on AI endpoints
- ✅ Request/response validation at backend layer
- ✅ No AI service URLs exposed to frontend

### Audit Trail
- ✅ Every report creation/update logged with actorId
- ✅ Every AI analysis logged with requestId and timestamp
- ✅ Diff snapshots stored for all changes
- ✅ Provenance metadata includes raw output hash for verification

### Provenance Tracking
```javascript
aiProvenance: {
  modelName: "MedSigLIP",
  modelVersion: "1.0",
  requestId: "uuid-v4",
  timestamp: "2025-01-27T10:30:00Z",
  rawOutputHash: "sha256-hash",
  rawOutput: { /* full AI response */ },
  confidence: 0.95,
  processingTime: 1234
}
```

---

## 📊 Report Creation Modes

### 1. **Manual Mode**
- Radiologist creates report from scratch
- No AI assistance
- Full manual entry of findings, impression, recommendations

### 2. **AI-Assisted Mode**
- AI generates initial draft
- Radiologist reviews and edits
- Final report is human-verified
- Most common workflow

### 3. **AI-Only Mode**
- AI generates complete report
- Minimal human editing
- Still requires radiologist review and signature
- Used for routine/normal cases

---

## 🔄 Migration Runbook

### Pre-Migration Checklist
- [ ] Backup MongoDB database
- [ ] Verify backup integrity
- [ ] Note current record counts
- [ ] Test migration in staging environment
- [ ] Schedule maintenance window

### Migration Commands

```bash
# 1. Backup database
mongodump --uri="mongodb://..." --out=./backup-$(date +%Y%m%d)

# 2. Dry run (preview changes)
node server/migrate-reports-consolidation.js --dry-run

# 3. Run migration
node server/migrate-reports-consolidation.js

# 4. Verify migration
node server/migrate-reports-consolidation.js --verify
```

### Verification Queries

```javascript
// Count records before migration
db.structuredreports.countDocuments()
db.reports.countDocuments()

// Sample verification
db.reports.findOne({ reportId: "RPT-123" })

// Check creation modes
db.reports.aggregate([
  { $group: { _id: "$creationMode", count: { $sum: 1 } } }
])

// Verify provenance
db.reports.find({ "aiProvenance": { $exists: true } }).count()
```

### Rollback Steps

```bash
# 1. Stop application
pm2 stop all

# 2. Restore from backup
mongorestore --uri="mongodb://..." --drop ./backup-YYYYMMDD

# 3. Restart application
pm2 start all
```

---

## 🧪 Testing Instructions

### Unit Tests
```bash
cd server
npm test -- report-service.test.js
npm test -- ai-analysis-orchestrator.test.js
```

### Integration Tests
```bash
# Test report creation in all three modes
curl -X POST http://localhost:8001/api/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studyInstanceUID": "1.2.3.4",
    "patientID": "P001",
    "patientName": "Test Patient",
    "modality": "CT",
    "creationMode": "ai-assisted",
    "aiAnalysisId": "AI-123"
  }'

# Test PDF rendering
curl -X GET http://localhost:8001/api/reports/RPT-123/pdf \
  -H "Authorization: Bearer $TOKEN" \
  --output report.pdf
```

### Manual Test Cases

#### Test Case 1: Manual Report Creation
1. Open ReportingPage without analysisId
2. Verify mode toggle shows "Manual" selected
3. Create report manually
4. Save and verify `creationMode: "manual"` in database

#### Test Case 2: AI-Assisted Report
1. Run AI analysis on study
2. Open ReportingPage with analysisId
3. Verify mode toggle shows "AI-Assisted" selected
4. Verify AI-generated content is pre-populated
5. Edit findings
6. Save and verify `creationMode: "ai-assisted"` with provenance

#### Test Case 3: AI-Only Report
1. Run AI analysis
2. Open ReportingPage with analysisId
3. Switch mode to "AI-Only"
4. Verify AI content is locked/minimal editing
5. Save and verify `creationMode: "ai-only"` with provenance

#### Test Case 4: PDF Rendering
1. Create finalized report
2. Click "Download PDF"
3. Verify PDF includes:
   - Patient information
   - Report content
   - AI provenance (if applicable)
   - Signature
   - Disclaimer

---

## 📈 Expected JSON Shapes

### Unified Report Object
```json
{
  "reportId": "RPT-1706356800000-abc123",
  "studyInstanceUID": "1.2.840.113619.2.55.3.123",
  "patientID": "P001",
  "patientName": "John Doe",
  "modality": "CT",
  "creationMode": "ai-assisted",
  "status": "draft",
  "findings": "AI-generated findings text...",
  "impression": "AI-generated impression...",
  "recommendations": "Follow-up in 6 months",
  "aiAnalysisId": "AI-1706356800000-XYZ",
  "aiProvenance": {
    "modelName": "MedSigLIP",
    "modelVersion": "1.0",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "rawOutputHash": "a3b2c1d4e5f6...",
    "confidence": 0.95,
    "processingTime": 1234
  },
  "revisionHistory": [
    {
      "revisedBy": "user123",
      "revisedAt": "2025-01-27T10:35:00.000Z",
      "changes": "report.created",
      "actorId": "60d5ec49f1b2c8b1f8c4e5a1",
      "actionType": "report.created",
      "diffSnapshot": {
        "creationMode": "ai-assisted",
        "aiAnalysisId": "AI-1706356800000-XYZ"
      }
    }
  ],
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:35:00.000Z"
}
```

### AI Analysis Response with Provenance
```json
{
  "success": true,
  "analysisId": "AI-1706356800000-XYZ",
  "status": "complete",
  "results": {
    "classification": { "label": "Normal", "confidence": 0.95 },
    "findings": "No acute abnormality detected.",
    "impression": "Normal CT scan."
  },
  "provenance": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "actorId": "60d5ec49f1b2c8b1f8c4e5a1",
    "endpoint": "/api/ai/analyze",
    "version": "1.0"
  }
}
```

---

## 📊 Monitoring & Logging

### AI Gateway Errors
```bash
# Monitor AI service failures
tail -f server/logs/ai-errors.log | grep "AI services not available"

# Check rate limiting
tail -f server/logs/access.log | grep "429"
```

### Audit Trail Events
```bash
# Monitor report creation
tail -f server/logs/audit.log | grep "report.created"

# Monitor AI analysis
tail -f server/logs/audit.log | grep "analysis.started"
```

### Database Queries
```javascript
// Reports by mode (last 7 days)
db.reports.aggregate([
  {
    $match: {
      createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
    }
  },
  {
    $group: {
      _id: "$creationMode",
      count: { $sum: 1 },
      avgConfidence: { $avg: "$aiProvenance.confidence" }
    }
  }
])

// Failed AI analyses
db.aianalyses.find({ status: "failed" }).sort({ analyzedAt: -1 }).limit(10)
```

---

## ✅ Acceptance Criteria

- [x] No frontend references to direct AI host:port endpoints
- [x] All AI calls route through backend `/api/ai/analyze`
- [x] Three report modes supported (manual, ai-assisted, ai-only)
- [x] Unified Report model implemented by editing existing file
- [x] Migration script created and tested
- [x] PDF rendering includes provenance and audit information
- [x] Audit trail enhanced with actorId and diffSnapshot
- [x] Tests updated for new unified model
- [x] Backward compatibility maintained during transition

---

## 🚀 Deployment Plan

### Phase 1: Backend Deployment (Week 1)
1. Deploy updated backend with unified Report model
2. Run migration script in staging
3. Verify migration success
4. Deploy to production during maintenance window

### Phase 2: Frontend Deployment (Week 2)
5. Deploy updated frontend with mode toggle
6. Monitor for errors
7. Verify AI calls route through backend

### Phase 3: Cleanup (Week 3)
8. Monitor for 2 weeks
9. Deprecate StructuredReport collection (keep backup)
10. Remove legacy code references

---

## 📞 Communication Items

### Team Channel Message
```
🚀 AI Report Consolidation Deployment

**Deployment Window:** [DATE] [TIME]
**Expected Downtime:** 15 minutes
**Impact:** Report creation temporarily unavailable

**What's Changing:**
- Unified reporting system (Report.js)
- AI calls now routed through backend
- Three report modes: Manual, AI-Assisted, AI-Only

**Action Required:**
- Clear browser cache after deployment
- Test report creation in all three modes
- Report any issues in #tech-support

**Rollback Plan:** Database backup available for immediate rollback if needed
```

### Post-Deployment Verification
```
✅ Deployment Complete - Verification Results

**Migration Stats:**
- Total reports migrated: [COUNT]
- Manual: [COUNT]
- AI-Assisted: [COUNT]
- AI-Only: [COUNT]
- Failed: [COUNT]

**Verification:**
- Sample checks: [PASSED/FAILED]
- API health: [HEALTHY]
- AI routing: [WORKING]

**Next Steps:**
- Monitor for 48 hours
- Address any reported issues
- Schedule cleanup for [DATE]
```

---

## 🔍 PR Checklist

- [x] No new files or folders created (except migration script)
- [x] Removed all frontend direct AI host:port references
- [x] AI calls now proxied via existing backend endpoints
- [x] Unified Report behavior implemented by editing existing files
- [x] Three report modes supported in existing UI files
- [x] Migration script created and tested
- [x] Tests updated in existing test files
- [x] PDF rendering implemented in existing export code
- [x] Audit trail enhanced in existing audit structure
- [x] PR description includes files changed list
- [x] Migration runbook included
- [x] Rollback steps documented
- [x] Verification queries provided
- [x] Monitoring instructions included

---

## 📝 Commit Message

```
chore(ai-report): consolidate reporting and route AI through backend

- Unified Report.js and StructuredReport.js into single model
- Added creationMode: manual, ai-assisted, ai-only
- Routed all AI calls through backend (removed direct port access)
- Added comprehensive provenance tracking with SHA-256 hashing
- Enhanced audit trail with actorId and diffSnapshot
- Implemented industry-standard PDF rendering with provenance
- Created migration script with dry-run and verification
- Updated frontend to use unified /api/reports endpoint
- Added mode toggle UI in ProductionReportEditor

BREAKING CHANGE: StructuredReport model deprecated, use Report model
Migration required: run migrate-reports-consolidation.js
```

---

## 🎓 Additional Notes

### Why This Approach?
- **Security**: All AI calls authenticated and rate-limited at backend
- **Auditability**: Complete provenance chain for compliance
- **Maintainability**: Single source of truth for reports
- **Scalability**: Backend can load-balance AI services
- **Flexibility**: Easy to add new AI models or switch providers

### Future Enhancements
- Add AI model versioning and A/B testing
- Implement AI response caching for common patterns
- Add real-time collaboration on reports
- Integrate with PACS for automatic report distribution
- Add natural language search across reports

---

**Reviewed by:** [Engineering Lead]  
**Approved by:** [Product Owner]  
**Deployed by:** [DevOps]  
**Date:** [YYYY-MM-DD]
