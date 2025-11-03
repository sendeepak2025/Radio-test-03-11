# Quick Reference: AI Report Consolidation

## 🎯 What Changed?

### For Developers
- **One Report Model**: Use `Report.js` (not StructuredReport)
- **AI Routing**: All AI calls go through `/api/ai/analyze` (no direct ports)
- **Three Modes**: `manual`, `ai-assisted`, `ai-only`
- **Provenance**: Every AI call tracked with hash and metadata

### For Radiologists
- **Mode Toggle**: Choose how you want to create reports
  - 🖊️ **Manual**: Type everything yourself
  - 🤖 **AI-Assisted**: AI suggests, you edit
  - ⚡ **AI-Only**: AI generates, you review
- **Same Workflow**: Everything else works the same

---

## 📋 API Changes

### Old Way (Deprecated)
```javascript
// ❌ DON'T DO THIS ANYMORE
fetch('http://localhost:5001/classify', { ... })
fetch('http://localhost:5002/generate-report', { ... })

// ❌ OLD ENDPOINT
POST /api/structured-reports/from-ai/:analysisId
```

### New Way (Current)
```javascript
// ✅ DO THIS
POST /api/ai/analyze
{
  "studyInstanceUID": "1.2.3.4",
  "frameIndex": 0,
  "imageData": "base64...",
  "modality": "CT"
}

// ✅ NEW UNIFIED ENDPOINT
POST /api/reports
{
  "studyInstanceUID": "1.2.3.4",
  "patientID": "P001",
  "creationMode": "ai-assisted",
  "aiAnalysisId": "AI-123"
}
```

---

## 🔧 Common Tasks

### Create Manual Report
```javascript
const report = await axios.post('/api/reports', {
  studyInstanceUID: '1.2.3.4',
  patientID: 'P001',
  patientName: 'John Doe',
  modality: 'CT',
  creationMode: 'manual'
});
```

### Create AI-Assisted Report
```javascript
// 1. Run AI analysis
const analysis = await axios.post('/api/ai/analyze', {
  studyInstanceUID: '1.2.3.4',
  frameIndex: 0,
  imageData: canvas.toDataURL().split(',')[1]
});

// 2. Create report with AI data
const report = await axios.post('/api/reports', {
  studyInstanceUID: '1.2.3.4',
  patientID: 'P001',
  creationMode: 'ai-assisted',
  aiAnalysisId: analysis.analysisId
});
```

### Download PDF
```javascript
window.open(`/api/reports/${reportId}/pdf`);
```

---

## 🗄️ Database Queries

### Find Reports by Mode
```javascript
db.reports.find({ creationMode: "ai-assisted" })
```

### Check AI Provenance
```javascript
db.reports.findOne(
  { reportId: "RPT-123" },
  { aiProvenance: 1 }
)
```

### Audit Trail
```javascript
db.reports.findOne(
  { reportId: "RPT-123" },
  { revisionHistory: 1 }
)
```

---

## 🚨 Troubleshooting

### "AI services not available"
```bash
# Check backend can reach AI services
curl http://localhost:8001/api/medical-ai/health

# Check AI services directly (on server only)
curl http://localhost:5001/health
curl http://localhost:5002/health
```

### "Report not found"
```bash
# Check if using old endpoint
# Change from /api/structured-reports to /api/reports
```

### Migration Issues
```bash
# Verify migration
node server/migrate-reports-consolidation.js --verify

# Re-run migration
node server/migrate-reports-consolidation.js
```

---

## 📊 Monitoring

### Check AI Usage
```javascript
db.reports.aggregate([
  { $match: { createdAt: { $gte: new Date('2025-01-01') } } },
  { $group: { _id: "$creationMode", count: { $sum: 1 } } }
])
```

### Failed Analyses
```javascript
db.aianalyses.find({ status: "failed" }).sort({ analyzedAt: -1 })
```

### Audit Events
```bash
tail -f server/logs/audit.log | grep "report.created"
```

---

## 🔐 Security Notes

- ✅ All AI calls require authentication
- ✅ Rate limiting: 100 requests/minute per user
- ✅ Provenance tracked with SHA-256 hash
- ✅ Audit trail for all actions
- ❌ No direct AI service access from frontend

---

## 📞 Need Help?

- **Technical Issues**: #tech-support
- **Migration Questions**: @devops-team
- **Feature Requests**: #product-feedback

---

**Last Updated**: 2025-01-27  
**Version**: 1.0
