# Radiology Worklist Flow - Complete Guide

## Overview
The Radiology Worklist automatically tracks all studies from upload to finalization, showing their current status and report progress.

## 🔄 Complete Workflow

### 1. **Study Upload** → Worklist Item Created
When a DICOM study is uploaded to Orthanc:

```
DICOM Upload → Orthanc → Webhook → Database → Worklist Item (PENDING)
```

**What Happens:**
- Study is stored in Orthanc PACS
- Webhook automatically triggers (`/api/orthanc/new-instance`)
- Study metadata saved to MongoDB
- **Worklist item automatically created** with status: `pending`

**Worklist Entry:**
```json
{
  "studyInstanceUID": "1.2.3.4.5...",
  "patientID": "PAT001",
  "status": "pending",
  "priority": "routine",
  "reportStatus": "none",
  "scheduledFor": "2025-11-06T10:00:00Z"
}
```

### 2. **Radiologist Starts Reading** → Status: IN PROGRESS
When radiologist clicks "Start Reading" or opens the study:

```
Worklist → Start Reading → Status: IN_PROGRESS
```

**API Call:**
```bash
PUT /api/worklist/{studyInstanceUID}/status
{
  "status": "in_progress"
}
```

**Worklist Updates:**
- `status`: `pending` → `in_progress`
- `startedAt`: Current timestamp
- `assignedTo`: Current user ID

### 3. **Report Draft Created** → Report Status: DRAFT
When radiologist creates or saves a draft report:

```
Reporting Page → Create/Update Report → Worklist Updated
```

**API Call:**
```bash
POST /api/reports
{
  "studyInstanceUID": "1.2.3.4.5...",
  "patientID": "PAT001",
  "status": "draft",
  "sections": {...}
}
```

**Worklist Updates:**
- `reportStatus`: `none` → `draft`
- `reportId`: Report MongoDB ID
- `status`: Remains `in_progress`

### 4. **Report Finalized** → Status: COMPLETED
When radiologist finalizes the report:

```
Report → Finalize → Worklist: COMPLETED + FINALIZED
```

**API Call:**
```bash
POST /api/reports/{reportId}/finalize
```

**Worklist Updates:**
- `reportStatus`: `draft` → `finalized`
- `status`: `in_progress` → `completed`
- `completedAt`: Current timestamp

### 5. **Report Signed** → Final Status
When report is digitally signed:

```
Report → Sign → Worklist: COMPLETED + FINALIZED
```

**API Call:**
```bash
POST /api/reports/{reportId}/sign
{
  "signatureText": "Dr. Smith",
  "meaning": "authored"
}
```

**Worklist Updates:**
- `reportStatus`: Remains `finalized`
- `status`: Remains `completed`
- Report is now immutable (FDA compliant)

## 📊 Worklist Views

### Pending Tab
Shows all studies waiting to be read:
- Status: `pending`
- No report created yet
- Sorted by priority (STAT → Urgent → Routine)

### In Progress Tab
Shows studies currently being worked on:
- Status: `in_progress`
- May have draft report
- Assigned to radiologist

### Completed Tab
Shows finalized studies:
- Status: `completed`
- Report status: `finalized`
- Signed or unsigned

### Critical Tab
Shows studies with critical findings:
- `hasCriticalFindings`: true
- Any status
- Requires immediate attention

## 🎯 Automatic Worklist Updates

### When Study is Uploaded
```javascript
// server/src/routes/orthanc-webhook.js
await worklistService.createWorklistItem(studyInstanceUID, {
  hospitalId: study.hospitalId,
  priority: 'routine',
  scheduledFor: new Date()
});
```

### When Report is Created/Updated
```javascript
// server/src/routes/reports-unified.js - POST /api/reports
await WorklistItem.updateOne(
  { studyInstanceUID },
  { 
    reportStatus: 'draft',
    reportId: report._id.toString(),
    status: 'in_progress'
  }
);
```

### When Report is Finalized
```javascript
// server/src/routes/reports-unified.js - POST /api/reports/:id/finalize
await WorklistItem.updateOne(
  { studyInstanceUID: report.studyInstanceUID },
  { 
    reportStatus: 'finalized',
    reportId: report._id.toString(),
    status: 'completed',
    completedAt: new Date()
  }
);
```

### When Report is Signed
```javascript
// server/src/routes/reports-unified.js - POST /api/reports/:id/sign
await WorklistItem.updateOne(
  { studyInstanceUID: report.studyInstanceUID },
  { 
    reportStatus: 'finalized',
    reportId: report._id.toString(),
    status: 'completed',
    completedAt: new Date()
  }
);
```

## 🔍 Worklist Filtering

### By Status
```bash
GET /api/worklist?status=pending
GET /api/worklist?status=in_progress
GET /api/worklist?status=completed
```

### By Priority
```bash
GET /api/worklist?priority=stat
GET /api/worklist?priority=urgent
GET /api/worklist?priority=routine
```

### By Hospital (Multi-tenancy)
```bash
# Automatically filtered by user's hospitalId
GET /api/worklist
# Returns only studies from user's hospital
```

### By Assigned Radiologist
```bash
GET /api/worklist?assignedTo={userId}
```

### By Critical Findings
```bash
GET /api/worklist?hasCriticalFindings=true
```

## 📈 Worklist Statistics

```bash
GET /api/worklist/stats
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total": 150,
    "byStatus": {
      "pending": 45,
      "inProgress": 30,
      "completed": 75
    },
    "byPriority": {
      "stat": 5,
      "urgent": 20,
      "routine": 125
    },
    "criticalUnnotified": 3
  }
}
```

## 🔄 Manual Sync

If studies exist but don't have worklist items:

```bash
POST /api/worklist/sync
```

**What it does:**
1. Finds all studies in database
2. Creates worklist items for studies without one
3. Updates report status for existing items
4. Returns sync results

**Response:**
```json
{
  "success": true,
  "created": 25,
  "skipped": 100,
  "updated": 50,
  "total": 175
}
```

## 🏥 Hospital Multi-Tenancy

Each hospital only sees their own studies:

```javascript
// Automatic filtering by hospitalId
const query = {
  hospitalId: req.user.hospitalId
};

const items = await WorklistItem.find(query);
```

**Super Admin:**
- Sees all studies from all hospitals
- No hospitalId filter applied

**Hospital Admin/Radiologist:**
- Only sees studies from their hospital
- Automatic hospitalId filter

## 🎨 UI Features

### Worklist Page Components

1. **Statistics Cards**
   - Pending count
   - In Progress count
   - STAT/Urgent count
   - Critical Unnotified count

2. **Search & Filters**
   - Search by patient name, ID, or description
   - Filter by priority
   - Filter by status (tabs)

3. **Action Buttons**
   - Start Reading (pending → in_progress)
   - View Study (open in viewer)
   - Mark Complete (in_progress → completed)
   - More Options (context menu)

4. **Real-time Updates**
   - Auto-refresh on interval
   - Manual refresh button
   - Sync button for manual sync

## 🔧 Troubleshooting

### Worklist is Empty
1. Check if studies exist in database:
   ```bash
   GET /api/viewer/studies
   ```

2. Run manual sync:
   ```bash
   POST /api/worklist/sync
   ```

3. Check Orthanc webhook is configured:
   ```bash
   GET /api/orthanc/sync-status
   ```

### Studies Not Showing After Upload
1. Verify Orthanc webhook is working:
   - Check server logs for "📥 New DICOM instance received"
   - Verify webhook endpoint: `/api/orthanc/new-instance`

2. Check study was saved to database:
   ```bash
   GET /api/dicom/studies
   ```

3. Manually trigger sync:
   ```bash
   POST /api/orthanc/sync-all
   ```

### Report Status Not Updating
1. Check report was saved:
   ```bash
   GET /api/reports/study/{studyInstanceUID}
   ```

2. Verify worklist item exists:
   ```bash
   GET /api/worklist?studyInstanceUID={uid}
   ```

3. Check server logs for worklist update messages:
   - "✅ Worklist updated for study: ..."

## 📝 Database Schema

### WorklistItem Model
```javascript
{
  studyInstanceUID: String,      // Links to Study
  patientID: String,
  status: String,                // pending, in_progress, completed, cancelled
  priority: String,              // routine, urgent, stat
  reportStatus: String,          // none, draft, finalized
  reportId: String,              // Links to Report
  assignedTo: ObjectId,          // User ID
  assignedAt: Date,
  scheduledFor: Date,
  startedAt: Date,
  completedAt: Date,
  hasCriticalFindings: Boolean,
  criticalFindingsNotified: Boolean,
  hospitalId: ObjectId,          // Multi-tenancy
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Best Practices

1. **Always use automatic sync** - Don't manually create worklist items
2. **Let webhooks handle uploads** - Worklist items created automatically
3. **Use status transitions** - Follow the workflow: pending → in_progress → completed
4. **Update report status** - Finalize/sign reports to update worklist
5. **Monitor critical findings** - Check critical tab regularly
6. **Use hospital filtering** - Respect multi-tenancy boundaries

## 🔐 Security & Compliance

- **Multi-tenancy**: Hospital-based data isolation
- **Access Control**: Only authorized users can view/update
- **Audit Trail**: All status changes logged
- **HIPAA Compliant**: PHI protected in all operations
- **FDA 21 CFR Part 11**: Signed reports are immutable

## 📞 Support

If worklist is not showing studies:
1. Run sync: `POST /api/worklist/sync`
2. Check logs for errors
3. Verify Orthanc connection
4. Contact system administrator
