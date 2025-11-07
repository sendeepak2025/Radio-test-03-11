# ✅ Compliance Features - Testing Checklist

## Pre-Testing Setup

- [ ] Backend server running
- [ ] Frontend dev server running
- [ ] Database connected
- [ ] Test user account with radiologist role
- [ ] Browser console open (F12) for debugging

---

## 1️⃣ Server Validation Tests

### Test 1.1: Sign Without Impression
**Steps:**
1. Create new report
2. Fill in findings only (leave impression empty)
3. Click "Sign" button
4. Attempt to sign

**Expected Result:**
- ❌ Signing blocked
- Error message: "Impression is required before signing"
- Status code: 400 VALIDATION_FAILED
- Report remains in draft status

**Status:** [ ] Pass [ ] Fail

---

### Test 1.2: Sign Without Findings
**Steps:**
1. Create new report
2. Fill in impression only (leave findings empty)
3. Click "Sign" button
4. Attempt to sign

**Expected Result:**
- ❌ Signing blocked
- Error message: "Findings are required before signing"
- Status code: 400 VALIDATION_FAILED
- Report remains in draft status

**Status:** [ ] Pass [ ] Fail

---

### Test 1.3: CT Contrast Rule
**Steps:**
1. Create new CT report
2. In technique field, write: "CT scan with IV contrast"
3. In findings field, write: "No acute findings" (no mention of contrast)
4. Fill in impression
5. Click "Sign" button
6. Attempt to sign

**Expected Result:**
- ❌ Signing blocked
- Error message: "Contrast mentioned in technique but not documented in findings"
- Status code: 400 VALIDATION_FAILED

**Status:** [ ] Pass [ ] Fail

---

### Test 1.4: Successful Signing
**Steps:**
1. Create new report
2. Fill in all required fields:
   - Technique: "CT scan with IV contrast"
   - Findings: "Contrast enhancement noted. No acute findings."
   - Impression: "Normal study"
3. Click "Sign" button
4. Select signature meaning: "Authored"
5. Draw or type signature
6. Click "Sign & Finalize"

**Expected Result:**
- ✅ Signing succeeds
- Success message: "Report signed and finalized!"
- Report status changes to "final"
- Report becomes immutable

**Status:** [ ] Pass [ ] Fail

---

## 2️⃣ FDA-Compliant Signature Tests

### Test 2.1: Signature Meaning Dropdown
**Steps:**
1. Create and complete a report
2. Click "Sign" button
3. Check signature meaning dropdown

**Expected Result:**
- ✅ Dropdown shows 4 options:
  - Authored - I created this report
  - Reviewed - I reviewed this report
  - Approved - I approve this report
  - Verified - I verified this report
- Default selection: "Authored"

**Status:** [ ] Pass [ ] Fail

---

### Test 2.2: Signature Metadata Storage
**Steps:**
1. Sign a report with meaning "Reviewed"
2. Check database for signature block

**Expected Result:**
- ✅ Signature object contains:
  - by: User ID
  - displayName: User name
  - at: Timestamp
  - method: 'image' or 'text'
  - meaning: 'reviewed'
  - ip: IP address
  - userAgent: Browser info
  - contentHash: SHA-256 hash

**Status:** [ ] Pass [ ] Fail

---

### Test 2.3: Template Version Locking
**Steps:**
1. Create report with template
2. Note template version
3. Sign report
4. Check database

**Expected Result:**
- ✅ templateVersion field populated
- ✅ Version locked at signing time
- ✅ Cannot be changed after signing

**Status:** [ ] Pass [ ] Fail

---

## 3️⃣ Post-Sign Immutability Tests

### Test 3.1: Edit Signed Report
**Steps:**
1. Open a signed/final report
2. Try to edit any field (findings, impression, etc.)
3. Click "Save"

**Expected Result:**
- ❌ Save blocked
- Error message: "Cannot edit signed report. Report is immutable after signing."
- Status code: 409 SIGNED_IMMUTABLE
- No changes saved

**Status:** [ ] Pass [ ] Fail

---

### Test 3.2: Addendum Button Visibility
**Steps:**
1. Open a draft report
2. Check for "Add Addendum" button
3. Sign the report
4. Check for "Add Addendum" button again

**Expected Result:**
- ❌ Button NOT visible for draft reports
- ✅ Button VISIBLE for final reports
- Button labeled: "Add Addendum"

**Status:** [ ] Pass [ ] Fail

---

## 4️⃣ Addendum Flow Tests

### Test 4.1: Add Addendum Without Reason
**Steps:**
1. Open a signed report
2. Click "Add Addendum"
3. Fill in content only (leave reason empty)
4. Click "Add Addendum"

**Expected Result:**
- ❌ Addendum blocked
- Warning message: "Reason for addendum is required"
- Dialog remains open

**Status:** [ ] Pass [ ] Fail

---

### Test 4.2: Add Addendum Without Content
**Steps:**
1. Open a signed report
2. Click "Add Addendum"
3. Fill in reason only (leave content empty)
4. Click "Add Addendum"

**Expected Result:**
- ❌ Addendum blocked
- Warning message: "Addendum content is required"
- Dialog remains open

**Status:** [ ] Pass [ ] Fail

---

### Test 4.3: Successfully Add Addendum
**Steps:**
1. Open a signed report
2. Click "Add Addendum"
3. Fill in:
   - Reason: "Additional findings noted"
   - Content: "Upon further review, small nodule noted in right lower lobe."
4. Click "Add Addendum"

**Expected Result:**
- ✅ Addendum added successfully
- Success message: "Addendum added successfully"
- Addendum appears in dedicated section with warning styling
- Shows: content, reason, author, timestamp
- Report status changes to "final_with_addendum"
- Version number increments

**Status:** [ ] Pass [ ] Fail

---

### Test 4.4: Multiple Addenda
**Steps:**
1. Add first addendum (as in Test 4.3)
2. Add second addendum with different reason
3. Check addenda display

**Expected Result:**
- ✅ Both addenda visible
- ✅ Numbered: "Addendum #1", "Addendum #2"
- ✅ Each shows full metadata
- ✅ Displayed in chronological order

**Status:** [ ] Pass [ ] Fail

---

## 5️⃣ Optimistic Locking Tests

### Test 5.1: Concurrent Edit Detection
**Steps:**
1. Open same report in two browser tabs (Tab A and Tab B)
2. In Tab A: Edit findings, click Save
3. In Tab B: Edit impression, click Save

**Expected Result:**
- ✅ Tab A saves successfully (version increments)
- ❌ Tab B gets version conflict error
- Error message: "Version Conflict - This report has been modified by another user"
- Dialog shows:
  - Your version: X
  - Server version: X+1
  - Options: Reload or Keep editing

**Status:** [ ] Pass [ ] Fail

---

### Test 5.2: Reload After Conflict
**Steps:**
1. Trigger version conflict (as in Test 5.1)
2. Click "OK" to reload

**Expected Result:**
- ✅ Report reloads with latest version
- ✅ Shows changes from other user
- ✅ Your unsaved changes are lost (expected)
- ✅ Version number updated

**Status:** [ ] Pass [ ] Fail

---

### Test 5.3: Keep Editing After Conflict
**Steps:**
1. Trigger version conflict (as in Test 5.1)
2. Click "Cancel" to keep editing

**Expected Result:**
- ✅ Dialog closes
- ✅ Your changes remain in editor
- ✅ Can continue editing
- ⚠️ Next save will still conflict (expected)

**Status:** [ ] Pass [ ] Fail

---

## 6️⃣ Critical Communication Tests

### Test 6.1: Button Visibility
**Steps:**
1. Create report without critical findings
2. Check for "Document Critical Comm" button
3. Add critical finding (severity: critical)
4. Check for button again

**Expected Result:**
- ❌ Button NOT visible without critical findings
- ✅ Button VISIBLE with critical findings
- Button labeled: "Document Critical Comm"
- Button color: Warning (orange/yellow)

**Status:** [ ] Pass [ ] Fail

---

### Test 6.2: Document Critical Communication
**Steps:**
1. Report with critical findings
2. Click "Document Critical Comm"
3. Fill in:
   - Recipient: "Dr. Smith, Attending Physician"
   - Method: "Phone Call"
   - Notes: "Spoke directly at 2:30 PM"
4. Click "Document Communication"

**Expected Result:**
- ✅ Communication documented
- Success message: "Critical communication documented"
- Communication appears in dedicated section with error styling
- Shows: recipient, method, notes, timestamp, communicator
- Chip shows "Documented" with checkmark

**Status:** [ ] Pass [ ] Fail

---

### Test 6.3: Multiple Communications
**Steps:**
1. Document first communication (as in Test 6.2)
2. Document second communication with different method
3. Check display

**Expected Result:**
- ✅ Both communications visible
- ✅ Each shows full metadata
- ✅ Displayed in chronological order
- ✅ Each has "Documented" chip

**Status:** [ ] Pass [ ] Fail

---

## 7️⃣ Template Version Tests

### Test 7.1: Version Saved on Creation
**Steps:**
1. Select a template
2. Create report
3. Check database for templateVersion field

**Expected Result:**
- ✅ templateVersion field populated
- ✅ Matches template's current version
- ✅ Stored as string (e.g., "1.0")

**Status:** [ ] Pass [ ] Fail

---

### Test 7.2: Version Locked at Signing
**Steps:**
1. Create report with template
2. Note templateVersion
3. Sign report
4. Try to change templateVersion in database

**Expected Result:**
- ✅ templateVersion locked
- ✅ Cannot be changed after signing
- ✅ Preserved in exportedJSON

**Status:** [ ] Pass [ ] Fail

---

## 8️⃣ Export Tests

### Test 8.1: JSON Export on Signing
**Steps:**
1. Create and sign a report
2. Check database for exportedJSON field

**Expected Result:**
- ✅ exportedJSON object created
- ✅ Contains complete report snapshot:
  - reportId, patientID, patientName
  - studyInstanceUID, modality
  - technique, findings, impression
  - sections, measurements
  - signedAt, signedBy
  - signature metadata
  - version, templateId, templateVersion
  - exportedAt timestamp

**Status:** [ ] Pass [ ] Fail

---

### Test 8.2: PDF Export (if implemented)
**Steps:**
1. Open signed report
2. Click export button
3. Select PDF format

**Expected Result:**
- ✅ PDF downloads
- ✅ Contains all report content
- ✅ Includes signature manifestation
- ✅ Shows addenda if present

**Status:** [ ] Pass [ ] Fail [ ] N/A

---

## 9️⃣ Database Performance Tests

### Test 9.1: Index Creation
**Steps:**
1. Start server
2. Check server logs

**Expected Result:**
- ✅ Log message: "✅ Report indexes ensured"
- ✅ No errors during index creation
- ✅ Indexes created:
  - reportId (unique)
  - studyInstanceUID
  - patientID + reportStatus
  - updatedAt
  - reportStatus + reportDate

**Status:** [ ] Pass [ ] Fail

---

### Test 9.2: Query Performance
**Steps:**
1. Create 100+ test reports
2. Query by reportId
3. Query by studyInstanceUID
4. Query by patientID + status

**Expected Result:**
- ✅ All queries return in < 50ms
- ✅ No full collection scans
- ✅ Indexes used (check explain plan)

**Status:** [ ] Pass [ ] Fail

---

## 🔟 UI/UX Tests

### Test 10.1: Addenda Display
**Steps:**
1. Open report with addenda
2. Check addenda section

**Expected Result:**
- ✅ Section has warning styling (yellow/orange border)
- ✅ Title: "📝 Addenda (X)"
- ✅ Each addendum in card
- ✅ Shows: content, reason chip, author, timestamp
- ✅ Numbered: "Addendum #1", etc.

**Status:** [ ] Pass [ ] Fail

---

### Test 10.2: Critical Comms Display
**Steps:**
1. Open report with critical communications
2. Check critical comms section

**Expected Result:**
- ✅ Section has error styling (red border)
- ✅ Title: "⚠️ Critical Communications (X)"
- ✅ Each comm in card
- ✅ Shows: method chip, "Documented" chip, recipient, notes, timestamp
- ✅ Clear visual hierarchy

**Status:** [ ] Pass [ ] Fail

---

### Test 10.3: Signature Dialog
**Steps:**
1. Click "Sign" button
2. Check dialog contents

**Expected Result:**
- ✅ Warning alert at top
- ✅ Signature meaning dropdown
- ✅ Two signature options:
  - Draw signature (canvas)
  - Type signature (text field)
- ✅ Cancel and Sign buttons
- ✅ Sign button disabled until signature provided

**Status:** [ ] Pass [ ] Fail

---

## 1️⃣1️⃣ Error Handling Tests

### Test 11.1: Network Error During Save
**Steps:**
1. Edit report
2. Disconnect network
3. Click Save

**Expected Result:**
- ❌ Save fails
- Error message: "Failed to save report"
- Changes remain in editor
- Can retry when network restored

**Status:** [ ] Pass [ ] Fail

---

### Test 11.2: Session Timeout During Sign
**Steps:**
1. Complete report
2. Wait for session to expire
3. Click Sign

**Expected Result:**
- ❌ Sign fails
- Error message: "Authentication required"
- Redirected to login
- Report remains in draft

**Status:** [ ] Pass [ ] Fail

---

### Test 11.3: Invalid Signature Data
**Steps:**
1. Complete report
2. Click Sign
3. Provide invalid signature (e.g., empty canvas)
4. Click Sign & Finalize

**Expected Result:**
- ❌ Sign blocked
- Warning message: "Please provide a signature"
- Dialog remains open

**Status:** [ ] Pass [ ] Fail

---

## 1️⃣2️⃣ Audit Trail Tests

### Test 12.1: Report Creation Logged
**Steps:**
1. Create new report
2. Check audit logs

**Expected Result:**
- ✅ Log entry created
- ✅ Action: REPORT_CREATED
- ✅ Contains: userId, timestamp, IP, reportId

**Status:** [ ] Pass [ ] Fail

---

### Test 12.2: Report Signing Logged
**Steps:**
1. Sign a report
2. Check audit logs

**Expected Result:**
- ✅ Log entry created
- ✅ Action: REPORT_SIGNED
- ✅ Contains: userId, timestamp, IP, reportId, contentHash, signatureMethod, meaning, templateVersion

**Status:** [ ] Pass [ ] Fail

---

### Test 12.3: Addendum Logged
**Steps:**
1. Add addendum
2. Check audit logs

**Expected Result:**
- ✅ Log entry created
- ✅ Action: ADDENDUM_ADDED
- ✅ Contains: userId, timestamp, IP, reportId, reason, addendumCount

**Status:** [ ] Pass [ ] Fail

---

### Test 12.4: Critical Comm Logged
**Steps:**
1. Document critical communication
2. Check audit logs

**Expected Result:**
- ✅ Log entry created
- ✅ Action: CRITICAL_COMM_DOCUMENTED
- ✅ Contains: userId, timestamp, IP, reportId, recipient, method

**Status:** [ ] Pass [ ] Fail

---

## Summary

### Test Results
- Total Tests: 40
- Passed: ___
- Failed: ___
- N/A: ___

### Critical Issues Found
1. _______________
2. _______________
3. _______________

### Non-Critical Issues Found
1. _______________
2. _______________
3. _______________

### Notes
_______________________________________________
_______________________________________________
_______________________________________________

### Sign-Off
- [ ] All critical tests passed
- [ ] All issues documented
- [ ] Ready for production deployment

**Tester Name:** _______________
**Date:** _______________
**Signature:** _______________

---

## Quick Test Commands

### Backend Health Check
```bash
curl http://localhost:8001/api/reports/health
```

### Check Database Indexes
```javascript
// In MongoDB shell
db.structuredreports.getIndexes()
```

### Check Audit Logs
```javascript
// In MongoDB shell
db.auditlogs.find({ action: "REPORT_SIGNED" }).sort({ timestamp: -1 }).limit(10)
```

### Check Report Version
```javascript
// In MongoDB shell
db.structuredreports.findOne({ reportId: "SR-XXX" }, { version: 1, reportStatus: 1, signature: 1 })
```

---

**Testing Complete!** ✅
