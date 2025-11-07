# 📝 Compliance Code Comments Index

All compliance-related code changes are marked with inline comments labeled:
```javascript
// ✅ COMPLIANCE UPDATE: Description
```

This document provides a quick index of all compliance comments for easy navigation.

---

## Backend: server/src/routes/reports-unified.js

### Line ~120: Database Indexes
```javascript
// ✅ COMPLIANCE UPDATE: Ensure database indexes are created
async function ensureIndexes() {
  // Creates indexes for performance
}
```

### Line ~150: Validation Function
```javascript
// ✅ COMPLIANCE UPDATE: Server-side validation rules
function validateReportForSigning(report) {
  // Validates impression, findings, contrast rule
}
```

### Line ~450: Enhanced PUT Endpoint
```javascript
// ✅ COMPLIANCE UPDATE: Optimistic locking with ETag/version checking
router.put('/:reportId', async (req, res) => {
  // Checks If-Match header
  // Returns 409 VERSION_CONFLICT on mismatch
  // Returns 409 SIGNED_IMMUTABLE if report is final
}
```

### Line ~550: Enhanced Sign Endpoint
```javascript
// ✅ COMPLIANCE UPDATE: Enhanced FDA-compliant signature with validation
router.post('/:reportId/sign', upload.single('signature'), async (req, res) => {
  // Server-side validation before signing
  // Lock template version at signing
  // Enhanced FDA-compliant signature block
  // Generate and store JSON export on signing
}
```

### Line ~650: Critical Communication Endpoint
```javascript
// ✅ COMPLIANCE UPDATE: Critical finding notification tracking
router.post('/:reportId/critical-comm', async (req, res) {
  // Document critical result communication
}
```

### Line ~700: Enhanced Addendum Endpoint
```javascript
// ✅ COMPLIANCE UPDATE: Enhanced addendum with signature support
router.post('/:reportId/addendum', async (req, res) => {
  // Only allow addendum on final reports
  // Addendum with signature metadata
  // Update status to final_with_addendum
}
```

---

## Frontend: viewer/src/components/reports/ProductionReportEditor.tsx

### Line ~220: Version Tracking State
```javascript
// ✅ COMPLIANCE UPDATE: Version tracking for optimistic locking
const [currentVersion, setCurrentVersion] = useState<number>(1);
```

### Line ~240: Signature State
```javascript
// ✅ COMPLIANCE UPDATE: Addendum state
const [showAddendumDialog, setShowAddendumDialog] = useState(false);
const [addendumContent, setAddendumContent] = useState('');
const [addendumReason, setAddendumReason] = useState('');

// ✅ COMPLIANCE UPDATE: Critical communication state
const [showCriticalCommDialog, setShowCriticalCommDialog] = useState(false);
```

### Line ~950: Save Handler
```javascript
// ✅ COMPLIANCE UPDATE: Track version for optimistic locking
if (savedReport.version) {
  setCurrentVersion(savedReport.version);
}

// ✅ COMPLIANCE UPDATE: Handle version conflict
if (error.response?.status === 409 && error.response?.data?.error === 'VERSION_CONFLICT') {
  // Show conflict dialog
}
```

### Line ~1050: Sign Handler
```javascript
// ✅ COMPLIANCE UPDATE: Add meaning to signature
formData.append('meaning', signatureMeaning);

// ✅ COMPLIANCE UPDATE: Handle validation errors
if (error.response?.status === 400 && error.response?.data?.error === 'VALIDATION_FAILED') {
  // Show validation errors
}
```

### Line ~1100: Addendum Handler
```javascript
// ✅ COMPLIANCE UPDATE: Handle addendum submission
const handleAddAddendum = async () => {
  // Validate and submit addendum
}
```

### Line ~1150: Critical Comm Handler
```javascript
// ✅ COMPLIANCE UPDATE: Handle critical communication documentation
const handleDocumentCriticalComm = async () => {
  // Document critical communication
}
```

### Line ~1400: Action Buttons
```javascript
{/* ✅ COMPLIANCE UPDATE: Add Addendum button for final reports */}
{report && isReportSigned && (
  <Button onClick={() => setShowAddendumDialog(true)}>
    Add Addendum
  </Button>
)}

{/* ✅ COMPLIANCE UPDATE: Document Critical Communication button */}
{report && criticalFindings.length > 0 && (
  <Button onClick={() => setShowCriticalCommDialog(true)}>
    Document Critical Comm
  </Button>
)}
```

### Line ~1600: Addenda Display
```javascript
{/* ✅ COMPLIANCE UPDATE: Display Addenda */}
{report && report.addenda && report.addenda.length > 0 && (
  <Paper>
    {/* Addenda display with warning styling */}
  </Paper>
)}

{/* ✅ COMPLIANCE UPDATE: Display Critical Communications */}
{report && report.criticalComms && report.criticalComms.length > 0 && (
  <Paper>
    {/* Critical comms display with error styling */}
  </Paper>
)}
```

### Line ~1800: Signature Dialog
```javascript
{/* ✅ COMPLIANCE UPDATE: Signature meaning selector */}
<FormControl fullWidth>
  <Select value={signatureMeaning}>
    <MenuItem value="authored">Authored</MenuItem>
    <MenuItem value="reviewed">Reviewed</MenuItem>
    <MenuItem value="approved">Approved</MenuItem>
    <MenuItem value="verified">Verified</MenuItem>
  </Select>
</FormControl>
```

### Line ~1900: Addendum Dialog
```javascript
{/* ✅ COMPLIANCE UPDATE: Addendum Dialog */}
<Dialog open={showAddendumDialog}>
  {/* Reason and content fields */}
</Dialog>
```

### Line ~2000: Critical Comm Dialog
```javascript
{/* ✅ COMPLIANCE UPDATE: Critical Communication Dialog */}
<Dialog open={showCriticalCommDialog}>
  {/* Recipient, method, notes fields */}
</Dialog>
```

---

## Frontend: viewer/src/services/ReportsApi.ts

### Line ~250: Enhanced Update Method
```javascript
// ✅ COMPLIANCE UPDATE: Optimistic locking with ETag/version
async update(reportId, updates, currentVersion?) {
  // Send If-Match header for optimistic locking
  
  // ✅ COMPLIANCE UPDATE: Handle version conflict
  if (error.response?.status === 409 && error.response?.data?.error === 'VERSION_CONFLICT') {
    // Emit telemetry
  }
  
  // ✅ COMPLIANCE UPDATE: Handle signed immutable error
  if (error.response?.status === 409 && error.response?.data?.error === 'SIGNED_IMMUTABLE') {
    // Emit telemetry
  }
}
```

### Line ~350: Enhanced Sign Method
```javascript
// ✅ COMPLIANCE UPDATE: Enhanced FDA-compliant signature with meaning and reason
async sign(reportId, signature) {
  // ✅ COMPLIANCE UPDATE: Add meaning and reason for FDA compliance
  formData.append('meaning', signature.meaning || 'authored');
  
  // ✅ COMPLIANCE UPDATE: Handle validation errors
  if (error.response?.status === 400 && error.response?.data?.error === 'VALIDATION_FAILED') {
    // Emit telemetry
  }
}
```

### Line ~450: Enhanced Addendum Method
```javascript
// ✅ COMPLIANCE UPDATE: Reason is now required
async addAddendum(reportId, content, reason) {
  if (!reason) {
    throw new Error('Reason for addendum is required');
  }
}
```

### Line ~500: Critical Comm Method
```javascript
// ✅ COMPLIANCE UPDATE: New endpoint for critical finding documentation
async documentCriticalComm(reportId, recipient, method, notes?) {
  // Document critical result communication
}
```

---

## Frontend: viewer/src/components/reporting/utils/fdaSignature.ts

### Line ~50: Enhanced Signature Creation
```javascript
// ✅ COMPLIANCE UPDATE: Enhanced with reason parameter for addenda
export async function createFDASignature(
  signatureDataUrl,
  userId,
  userName,
  userRole,
  reportId,
  reportVersion,
  meaning,
  reason? // New parameter
) {
  // Create FDA-compliant signature with reason
}
```

---

## Frontend: viewer/src/utils/reportingUtils.ts

### Line ~200: Enhanced Validation
```javascript
// ✅ COMPLIANCE UPDATE: Enhanced validation with QA rules
export function validateReportContent(content) {
  // ✅ COMPLIANCE UPDATE: Required impression
  if (!content.impression || content.impression.trim() === '') {
    errors.push('Impression is required');
  }

  // ✅ COMPLIANCE UPDATE: Required findings
  const hasFindings = content.findingsText && content.findingsText.trim() !== '';
  const hasStructuredFindings = content.findings && Array.isArray(content.findings) && content.findings.length > 0;
  
  if (!hasFindings && !hasStructuredFindings) {
    errors.push('Findings are required');
  }

  // ✅ COMPLIANCE UPDATE: Contrast rule for CT
  if (content.modality === 'CT' && content.technique) {
    const techniqueText = content.technique.toLowerCase();
    const findingsText = (content.findingsText || '').toLowerCase();
    
    if (techniqueText.includes('contrast') && !findingsText.includes('contrast')) {
      errors.push('Contrast mentioned in technique but not documented in findings');
    }
  }
}
```

---

## Comment Statistics

| File | Compliance Comments | Lines Modified |
|------|---------------------|----------------|
| server/src/routes/reports-unified.js | 15 | ~300 |
| viewer/src/components/reports/ProductionReportEditor.tsx | 20 | ~200 |
| viewer/src/services/ReportsApi.ts | 8 | ~100 |
| viewer/src/components/reporting/utils/fdaSignature.ts | 1 | ~10 |
| viewer/src/utils/reportingUtils.ts | 4 | ~50 |
| **TOTAL** | **48** | **~660** |

---

## Finding Comments in Code

### Using grep (Linux/Mac)
```bash
# Find all compliance comments
grep -r "✅ COMPLIANCE UPDATE" .

# Count compliance comments
grep -r "✅ COMPLIANCE UPDATE" . | wc -l

# Find in specific file
grep "✅ COMPLIANCE UPDATE" server/src/routes/reports-unified.js
```

### Using findstr (Windows)
```cmd
# Find all compliance comments
findstr /S /C:"✅ COMPLIANCE UPDATE" *.*

# Find in specific file
findstr /C:"✅ COMPLIANCE UPDATE" server\src\routes\reports-unified.js
```

### Using VS Code
1. Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
2. Search for: `✅ COMPLIANCE UPDATE`
3. Results show all compliance comments across all files

### Using IDE Search
Most IDEs support "Find in Files":
- **IntelliJ/WebStorm**: `Ctrl+Shift+F`
- **Sublime Text**: `Ctrl+Shift+F`
- **Atom**: `Ctrl+Shift+F`
- **Notepad++**: `Ctrl+Shift+F`

---

## Comment Format

All compliance comments follow this format:

```javascript
// ✅ COMPLIANCE UPDATE: Brief description of what was added/changed
```

**Benefits:**
- ✅ Easy to search and find
- ✅ Clear visual indicator
- ✅ Consistent across all files
- ✅ Self-documenting code
- ✅ Easy to review during code review
- ✅ Can be extracted for documentation

---

## Code Review Checklist

When reviewing compliance changes, look for:

- [ ] All changes have `// ✅ COMPLIANCE UPDATE` comment
- [ ] Comments are descriptive and clear
- [ ] Comments explain WHY, not just WHAT
- [ ] No orphaned comments (comment without corresponding code)
- [ ] Comments are up-to-date with code
- [ ] Comments follow consistent format

---

## Maintenance Notes

### Adding New Compliance Features
When adding new compliance features:
1. Add `// ✅ COMPLIANCE UPDATE:` comment above the change
2. Describe what the change does and why
3. Update this index document
4. Update test checklist
5. Update documentation

### Removing Compliance Features
If a compliance feature needs to be removed:
1. Search for related `// ✅ COMPLIANCE UPDATE` comments
2. Remove code and comments together
3. Update this index document
4. Update test checklist
5. Update documentation

### Modifying Compliance Features
When modifying existing compliance features:
1. Keep the original `// ✅ COMPLIANCE UPDATE` comment
2. Add a new comment if behavior changes significantly
3. Update this index document if needed
4. Update test checklist if needed

---

## Quick Navigation

### By Feature

**Server Validation:**
- server/src/routes/reports-unified.js:~150

**Optimistic Locking:**
- server/src/routes/reports-unified.js:~450
- viewer/src/components/reports/ProductionReportEditor.tsx:~220, ~950
- viewer/src/services/ReportsApi.ts:~250

**FDA Signature:**
- server/src/routes/reports-unified.js:~550
- viewer/src/components/reports/ProductionReportEditor.tsx:~1050, ~1800
- viewer/src/services/ReportsApi.ts:~350
- viewer/src/components/reporting/utils/fdaSignature.ts:~50

**Addendum:**
- server/src/routes/reports-unified.js:~700
- viewer/src/components/reports/ProductionReportEditor.tsx:~1100, ~1600, ~1900
- viewer/src/services/ReportsApi.ts:~450

**Critical Communication:**
- server/src/routes/reports-unified.js:~650
- viewer/src/components/reports/ProductionReportEditor.tsx:~1150, ~1600, ~2000
- viewer/src/services/ReportsApi.ts:~500

**QA Rules:**
- server/src/routes/reports-unified.js:~150
- viewer/src/utils/reportingUtils.ts:~200

**Database Indexes:**
- server/src/routes/reports-unified.js:~120

---

**All comments are production-ready and well-documented!** ✅
