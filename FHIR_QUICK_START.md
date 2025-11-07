# 🚀 FHIR Export - Quick Start Guide

## 5-Minute Setup

### Step 1: Restart Your Servers

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd viewer
npm run dev
```

### Step 2: Create a Test Report

1. Open http://localhost:5173
2. Login to your account
3. Navigate to a study
4. Click "Create Report"
5. Add some findings and impression:
   ```
   Findings: Normal chest radiograph. No acute cardiopulmonary abnormality.
   Impression: Normal chest X-ray.
   ```
6. Save the report

### Step 3: Export to FHIR

#### Option A: Using the UI (Easiest)

1. In the reporting page, look for **"FHIR Export"** button
2. Click it and choose:
   - **Check Export Status** - See if report is ready
   - **Download DiagnosticReport** - Get FHIR JSON file
   - **Download FHIR Bundle** - Get complete package

#### Option B: Using the API

```bash
# 1. Get your access token
# Open browser console and run:
# localStorage.getItem('accessToken')

# 2. Set your token
export TOKEN="your_token_here"

# 3. Get a report ID from your database or UI
export REPORT_ID="RPT-123"

# 4. Export FHIR report
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/fhir/reports/$REPORT_ID

# 5. Download as file
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/fhir/reports/$REPORT_ID/download \
  -o fhir-report.json
```

#### Option C: Using the Test Script

```bash
cd server

# Set your token
export TEST_TOKEN="your_token_here"

# Run test
node test-fhir-export.js
```

### Step 4: Validate Your FHIR Output

1. Go to https://validator.fhir.org/
2. Upload your `fhir-report.json` file
3. Click "Validate"
4. ✅ Should show "Valid FHIR R4 DiagnosticReport"

### Step 5: Test Push to FHIR Server (Optional)

```bash
# Push to public HAPI FHIR test server
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "https://hapi.fhir.org/baseR4",
    "format": "report"
  }' \
  http://localhost:8001/api/fhir/reports/$REPORT_ID/push
```

---

## 🎯 What You Get

### FHIR DiagnosticReport
- Patient demographics
- Study information
- Report findings
- Impression
- Radiologist signature
- LOINC codes
- SNOMED CT codes (if available)

### FHIR Bundle (Complete Package)
- Patient resource
- ImagingStudy resource
- DiagnosticReport resource
- All linked together

---

## 🏥 Real-World Use Cases

### 1. Send to Referring Physician
```bash
# Export and email
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/fhir/reports/$REPORT_ID/download \
  -o report.json

# Email report.json to referring physician
```

### 2. Push to Hospital EHR
```bash
# Push to Epic/Cerner/Allscripts
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "https://your-hospital-ehr.com/fhir",
    "format": "bundle"
  }' \
  http://localhost:8001/api/fhir/reports/$REPORT_ID/push
```

### 3. Patient Portal Integration
```bash
# Export for patient access
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/fhir/reports/$REPORT_ID/bundle \
  > patient-report.json
```

---

## 🔧 Troubleshooting

### "Report not found"
- Make sure you're using the correct `reportId`
- Check that the report exists in your database

### "Report validation failed"
- Add findings to your report
- Add impression to your report
- These are required for FHIR export

### "401 Unauthorized"
- Get a fresh access token from localStorage
- Make sure you're logged in

### "FHIR validation failed"
- Check the error message
- Ensure all required fields are present
- Validate at https://validator.fhir.org/

---

## 📚 API Reference

### GET /api/fhir/reports/:reportId
Export single report as DiagnosticReport

### GET /api/fhir/reports/:reportId/bundle
Export complete FHIR Bundle

### GET /api/fhir/reports/:reportId/download
Download FHIR JSON file

### POST /api/fhir/reports/:reportId/push
Push to external FHIR server

### GET /api/fhir/reports/:reportId/status
Check export readiness

### POST /api/fhir/reports/batch-export
Batch export multiple reports

---

## ✅ Success Checklist

- [ ] Servers are running
- [ ] Created a test report with findings and impression
- [ ] Exported FHIR DiagnosticReport
- [ ] Downloaded FHIR JSON file
- [ ] Validated at https://validator.fhir.org/
- [ ] (Optional) Pushed to HAPI FHIR test server

---

## 🎉 You're Done!

Your radiology system now supports **industry-standard FHIR export**!

**Next:** Integrate with your hospital's EHR system or share reports with referring physicians.

---

**Need Help?** Check `FHIR_INTEGRATION_COMPLETE.md` for detailed documentation.
