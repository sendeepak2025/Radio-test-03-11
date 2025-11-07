# 🚀 Compliance Features - Quick Reference

## For Radiologists

### Signing Reports
1. Complete all required fields (findings + impression)
2. Click "Sign" button
3. Select signature meaning from dropdown:
   - **Authored** - I created this report
   - **Reviewed** - I reviewed this report  
   - **Approved** - I approve this report
   - **Verified** - I verified this report
4. Draw or type your signature
5. Click "Sign & Finalize"

**Note:** Once signed, reports cannot be edited. Use addendum for changes.

---

### Adding Addenda
1. Open a signed/final report
2. Click "Add Addendum" button
3. Enter **reason** (required): e.g., "Additional findings noted"
4. Enter **content** (required): Your addendum text
5. Click "Add Addendum"

**Addenda are:**
- Permanently appended to the report
- Cannot be removed
- Included in all exports
- Tracked with full audit trail

---

### Documenting Critical Communications
1. When critical findings are detected, "Document Critical Comm" button appears
2. Click the button
3. Enter:
   - **Recipient** (required): e.g., "Dr. Smith, Attending"
   - **Method** (required): Phone, Email, In-Person, Pager, or EHR
   - **Notes** (optional): Additional details
4. Click "Document Communication"

**This creates a permanent record that critical findings were communicated.**

---

## For Developers

### Server-Side Validation
```javascript
// Location: server/src/routes/reports-unified.js
function validateReportForSigning(report) {
  // Checks:
  // 1. Impression required
  // 2. Findings required
  // 3. Contrast rule for CT
  return { valid: boolean, errors: string[] }
}
```

### Optimistic Locking
```javascript
// Frontend sends version with updates
PUT /api/reports/:reportId
Headers: { 'If-Match': '5' }

// Backend checks version
if (clientVersion !== serverVersion) {
  return 409 VERSION_CONFLICT
}
```

### Signature Block Structure
```javascript
signature: {
  by: ObjectId,              // User ID
  displayName: String,       // User name
  at: Date,                  // Timestamp
  method: 'image' | 'text',  // Signature type
  meaning: String,           // authored/reviewed/approved/verified
  reason: String,            // For addenda
  ip: String,                // IP address
  userAgent: String,         // Browser info
  contentHash: String        // SHA-256 of content
}
```

### API Endpoints

#### Sign Report
```http
POST /api/reports/:reportId/sign
Content-Type: multipart/form-data

FormData:
- signature: File (optional)
- signatureText: String (optional)
- meaning: String (required)
- reason: String (optional, for addenda)
```

#### Add Addendum
```http
POST /api/reports/:reportId/addendum
Content-Type: application/json

{
  "content": "Addendum text",
  "reason": "Reason for addendum"
}
```

#### Document Critical Communication
```http
POST /api/reports/:reportId/critical-comm
Content-Type: application/json

{
  "recipient": "Dr. Smith",
  "method": "phone",
  "notes": "Optional notes"
}
```

### Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 400 | VALIDATION_FAILED | Report validation failed before signing |
| 409 | VERSION_CONFLICT | Concurrent edit detected |
| 409 | SIGNED_IMMUTABLE | Attempted to edit signed report |

### Frontend Usage

#### Update with Version Check
```typescript
import { reportsApi } from '@/services/ReportsApi';

// Update with optimistic locking
try {
  await reportsApi.update(reportId, updates, currentVersion);
} catch (error) {
  if (error.response?.data?.error === 'VERSION_CONFLICT') {
    // Handle conflict
    const serverVersion = error.response.data.serverVersion;
    // Prompt user to reload or merge
  }
}
```

#### Sign with Meaning
```typescript
await reportsApi.sign(reportId, {
  signatureText: 'Dr. John Smith',
  meaning: 'authored'
});
```

#### Add Addendum
```typescript
await reportsApi.addAddendum(
  reportId,
  'Additional findings noted on review',
  'Clarification'
);
```

#### Document Critical Comm
```typescript
await reportsApi.documentCriticalComm(
  reportId,
  'Dr. Smith, Attending Physician',
  'phone',
  'Spoke directly at 2:30 PM'
);
```

---

## Database Indexes

Automatically created on server startup:

```javascript
reportId: unique
studyInstanceUID: 1
patientID + reportStatus: 1
updatedAt: -1
reportStatus + reportDate: -1
```

---

## Validation Rules

### Before Signing
1. ✅ Impression must be present
2. ✅ Findings must be present (text or structured)
3. ✅ CT with contrast: must mention contrast in findings

### During Edit
1. ✅ Cannot edit if status is 'final' or 'final_with_addendum'
2. ✅ Version must match server version

### Addendum
1. ✅ Only allowed on final reports
2. ✅ Reason is required
3. ✅ Content is required

---

## Status Flow

```
draft → preliminary → final → final_with_addendum
                        ↓
                     amended
```

- **draft**: Initial state, can edit freely
- **preliminary**: Finalized but not signed
- **final**: Signed and locked
- **final_with_addendum**: Final with addenda added
- **amended**: Corrected report (future use)

---

## Audit Trail

All actions are logged:
- Report creation
- Report updates
- Report signing
- Addendum additions
- Critical communications
- Export operations

Each log includes:
- User ID
- Action type
- Timestamp
- IP address
- Details

---

## Testing Checklist

### Signing
- [ ] Cannot sign without impression
- [ ] Cannot sign without findings
- [ ] CT contrast rule enforced
- [ ] Signature meaning captured
- [ ] Template version locked

### Post-Sign
- [ ] Cannot edit signed report
- [ ] Clear error message shown
- [ ] Addendum button appears

### Addendum
- [ ] Requires reason
- [ ] Requires content
- [ ] Appends correctly
- [ ] Status updates to final_with_addendum

### Version Control
- [ ] Concurrent edits detected
- [ ] User prompted appropriately
- [ ] No data loss

### Critical Comm
- [ ] Button appears for critical findings
- [ ] Requires recipient
- [ ] Tracks method
- [ ] Audit trail created

---

## Troubleshooting

### "Validation Failed" on Sign
**Cause:** Missing required fields or validation rule violation
**Solution:** Check error message, ensure impression and findings are complete

### "Version Conflict" on Save
**Cause:** Another user edited the report
**Solution:** Reload to get latest version, or merge changes manually

### "Cannot Edit Signed Report"
**Cause:** Attempting to edit a final report
**Solution:** Use "Add Addendum" instead

### Addendum Button Not Showing
**Cause:** Report is not in final status
**Solution:** Sign the report first

---

## Best Practices

1. **Save frequently** - Auto-save runs every 3 seconds
2. **Review before signing** - Signing is permanent
3. **Use addenda for corrections** - Don't try to edit signed reports
4. **Document critical findings immediately** - Use critical comm feature
5. **Provide clear reasons** - For addenda, be specific about why
6. **Check version conflicts** - Reload if prompted

---

## Support

For issues or questions:
1. Check this guide first
2. Review error messages carefully
3. Check browser console (F12) for details
4. Contact system administrator

---

**Last Updated:** 2025-01-XX
**Version:** 1.0
