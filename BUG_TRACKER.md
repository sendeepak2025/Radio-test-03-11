# 🐛 BUG TRACKER
**Week 3 - Bug Tracking and Resolution**

**Created:** 2025-11-18  
**Status:** Active

---

## 📊 BUG SUMMARY

### By Priority
- **CRITICAL:** 1 (0 open, 1 fixed)
- **HIGH:** 2 (2 open, 0 fixed)
- **MEDIUM:** 2 (2 open, 0 fixed)
- **LOW:** 2 (0 open, 2 deferred)

### By Status
- **🐛 OPEN:** 4 bugs
- **✅ FIXED:** 1 bug
- **⏸️ DEFERRED:** 2 bugs
- **❌ WON'T FIX:** 0 bugs

---

## 🔴 CRITICAL BUGS

### BUG-C01: Frontend Build Error - Invalid Import ✅ FIXED
**Priority:** CRITICAL  
**Severity:** BLOCKING  
**Status:** ✅ FIXED  
**Discovered:** 2025-11-18  
**Fixed:** 2025-11-18  

**Description:**
Frontend build fails with import error in `useReportValidation.ts`.

**Error Message:**
```
ERROR No matching export in "src/services/ApiService.ts" for import "api"
```

**Location:**
- File: `viewer/src/hooks/useReportValidation.ts`
- Line: 2

**Root Cause:**
Incorrect import statement trying to import named export `api` from `ApiService`, but the file only exports a default object.

**Impact:**
- Frontend application fails to build
- Complete blockage of all frontend development and testing

**Reproduction Steps:**
1. Run `npm run dev` in viewer directory
2. Build fails with import error

**Fix Applied:**
```typescript
// BEFORE (INCORRECT):
import { api } from '@/services/ApiService';
const response = await api.post(endpoint);

// AFTER (CORRECT):
import ApiService from '@/services/ApiService';
const response = await ApiService.apiCall(endpoint, { method: 'POST' });
const data = await response.json();
```

**Files Modified:**
- `viewer/src/hooks/useReportValidation.ts`

**Testing:**
- ✅ Frontend builds successfully
- ✅ No TypeScript errors
- ⏳ Runtime validation pending

**Resolution Date:** 2025-11-18  
**Resolution By:** AI Assistant

---

## 🟠 HIGH PRIORITY BUGS

### BUG-H01: Missing GEMINI_API_KEY Configuration
**Priority:** HIGH  
**Severity:** BLOCKING (AI features only)  
**Status:** ⏸️ PENDING USER CONFIGURATION  
**Discovered:** 2025-11-18  

**Description:**
GEMINI_API_KEY environment variable not configured, disabling all AI features.

**Error Message:**
```
⚠️ GEMINI_API_KEY not set. AI features will be disabled.
```

**Location:**
- File: `server/src/services/ai-assistant-service.js`
- Environment: `server/.env`

**Root Cause:**
Missing environment variable configuration for Google Gemini Pro API.

**Impact:**
- All AI-assisted features disabled:
  - ✗ Findings text analysis
  - ✗ Impression generation
  - ✗ Critical finding detection
  - ✗ Template field auto-fill suggestions
- No functional impact on core reporting features
- Analytics dashboard will show 0 AI usage

**Reproduction Steps:**
1. Start backend server without GEMINI_API_KEY
2. Check server logs for warning message
3. Attempt to use AI features in report editor
4. AI features will be unavailable

**Required Action:**
User must add GEMINI_API_KEY to `server/.env`:
```bash
GEMINI_API_KEY=your-actual-google-gemini-api-key
```

**Instructions for User:**
1. Obtain API key from: https://makersuite.google.com/app/apikey
2. Add to `server/.env` file
3. Restart backend server: `npm run dev`
4. Verify in logs: "✅ Google Gemini Pro initialized"

**Status:** ⏸️ AWAITING USER CONFIGURATION  
**Workaround:** None - AI features require valid API key  
**ETA:** Pending user action

---

### BUG-H02: Hospital Seed Validation Error
**Priority:** HIGH  
**Severity:** NON-BLOCKING  
**Status:** 🐛 OPEN - TO BE FIXED  
**Discovered:** 2025-11-18  

**Description:**
Admin user seeding fails due to Hospital model validation errors for required fields `apiKey` and `contactEmail`.

**Error Message:**
```
❌ Seed error: Hospital validation failed: 
   apiKey: Path `apiKey` is required.
   contactEmail: Path `contactEmail` is required.

⚠️ Admin user seeding failed: Hospital validation failed
   You may need to create an admin user manually
```

**Location:**
- File: `server/src/seed/seedAdmin.js`
- Model: `server/src/models/Hospital.js`

**Root Cause:**
Seed script creates hospital without providing required fields:
- `apiKey` (required field)
- `contactEmail` (required field)

**Impact:**
- Admin user seeding fails on fresh installation
- Manual admin user creation required
- Hospital record incomplete in database
- Non-blocking for existing installations with admin user

**Reproduction Steps:**
1. Fresh database installation
2. Start backend server
3. Seed script runs automatically
4. Check logs for validation error

**Current Code (Problematic):**
```javascript
// In seedAdmin.js - likely missing these fields:
const hospital = new Hospital({
  name: 'Default Hospital',
  // Missing: apiKey
  // Missing: contactEmail
});
```

**Required Fix:**
```javascript
// Add required fields to hospital creation:
const hospital = new Hospital({
  name: 'Default Hospital',
  apiKey: crypto.randomBytes(32).toString('hex'), // Generate unique API key
  contactEmail: 'admin@defaulthospital.com',
  // ... other fields
});
```

**Files to Modify:**
- `server/src/seed/seedAdmin.js`

**Testing Required:**
1. Drop database or test collection
2. Run seed script
3. Verify hospital created successfully
4. Verify admin user created and linked to hospital

**Status:** 🐛 TO BE FIXED IN DAY 12  
**Assigned To:** Development team  
**ETA:** Day 12 bug fix session

---

## 🟡 MEDIUM PRIORITY BUGS

### BUG-M01: Duplicate Mongoose Schema Indexes
**Priority:** MEDIUM  
**Severity:** WARNING  
**Status:** 🐛 OPEN - TO BE FIXED  
**Discovered:** 2025-11-18  

**Description:**
Mongoose warns about duplicate index definitions on multiple models, indicating inefficient schema configuration.

**Warning Messages:**
```
(node:21920) [MONGOOSE] Warning: Duplicate schema index on {"studyInstanceUID":1} found.
(node:21920) [MONGOOSE] Warning: Duplicate schema index on {"timestamp":1} found.
(node:21920) [MONGOOSE] Warning: Duplicate schema index on {"superbillNumber":1} found.
```

**Location:**
Multiple model files with duplicate index declarations.

**Affected Models:**
1. Study model - `studyInstanceUID` index
2. Report/TelemetryEvent model - `timestamp` index
3. Superbill model - `superbillNumber` index

**Root Cause:**
Index defined both ways:
```javascript
// Method 1: Schema field definition
{
  studyInstanceUID: { type: String, index: true }
}

// Method 2: Schema index method
schema.index({ studyInstanceUID: 1 });

// Both methods create the same index = DUPLICATE
```

**Impact:**
- Performance warning (no functional impact)
- Potential query optimizer confusion
- Increased database overhead (duplicate index maintenance)
- Code smell / technical debt

**Reproduction Steps:**
1. Start backend server
2. Check console for Mongoose warnings
3. Warnings appear during model initialization

**Required Fix:**
For each affected model, choose ONE indexing method:

**Option 1: Field-level index (simpler):**
```javascript
const schema = new Schema({
  studyInstanceUID: { type: String, index: true, unique: true },
  // Remove: schema.index({ studyInstanceUID: 1 });
});
```

**Option 2: Schema-level index (more flexible):**
```javascript
const schema = new Schema({
  studyInstanceUID: { type: String }, // No index: true
});

schema.index({ studyInstanceUID: 1 }, { unique: true });
```

**Files to Review:**
- `server/src/models/Study.js`
- `server/src/models/Report.js`
- `server/src/models/TelemetryEvent.js`
- `server/src/models/Superbill.js`
- All other model files

**Testing Required:**
1. Verify indexes still exist after fix: `db.collection.getIndexes()`
2. Test queries using these indexes
3. Verify no performance degradation
4. Ensure warnings no longer appear

**Status:** 🐛 TO BE FIXED IN DAY 12  
**Assigned To:** Development team  
**ETA:** Day 12 code quality improvements

---

### BUG-M02: TSConfig Duplicate Key Warning
**Priority:** MEDIUM  
**Severity:** WARNING  
**Status:** 🐛 OPEN - TO BE FIXED  
**Discovered:** 2025-11-18  

**Description:**
TypeScript configuration file contains duplicate `skipLibCheck` key.

**Warning Message:**
```
▲ [WARNING] Duplicate key "skipLibCheck" in object literal [duplicate-object-key]
    tsconfig.json:22:4:
      22 │     "skipLibCheck": true,
         ╵     ~~~~~~~~~~~~~~
  The original key "skipLibCheck" is here:
    tsconfig.json:7:4:
      7 │     "skipLibCheck": true,
        ╵     ~~~~~~~~~~~~~~
```

**Location:**
- File: `viewer/tsconfig.json`
- Lines: 7 and 22

**Root Cause:**
Accidental duplication of compiler option, likely from merge or copy-paste.

**Impact:**
- Build warning (no functional impact)
- Second declaration overrides first (same value anyway)
- Code smell / configuration clutter

**Reproduction Steps:**
1. Run `npm run dev` in viewer directory
2. Check build output for warning

**Current Code (Problematic):**
```json
{
  "compilerOptions": {
    "skipLibCheck": true,  // Line 7
    // ... other options
    "skipLibCheck": true   // Line 22 - DUPLICATE
  }
}
```

**Required Fix:**
Remove one of the duplicate entries:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,  // Keep only one
    // ... other options
  }
}
```

**Files to Modify:**
- `viewer/tsconfig.json`

**Testing Required:**
1. Run `npm run dev`
2. Verify warning no longer appears
3. Verify TypeScript compilation still works correctly

**Status:** 🐛 TO BE FIXED IN DAY 12  
**Assigned To:** Development team  
**ETA:** Day 12 code quality improvements  
**Effort:** <5 minutes

---

## 🟢 LOW PRIORITY BUGS

### BUG-L01: IP Whitelist Not Configured
**Priority:** LOW  
**Severity:** SECURITY WARNING (Development only)  
**Status:** ⏸️ DEFERRED - ACCEPTABLE FOR DEVELOPMENT  
**Discovered:** 2025-11-18  

**Description:**
IP whitelist environment variable not configured, allowing all IP addresses.

**Warning Message:**
```
⚠️ IP_WHITELIST not configured. All IPs will be allowed.
```

**Location:**
- Environment: `server/.env`
- Feature: IP-based access control

**Root Cause:**
Missing `IP_WHITELIST` environment variable configuration.

**Impact:**
- All IP addresses can access the API (development mode)
- Acceptable for development environment
- **CRITICAL for production:** Must be configured before production deployment

**Reproduction Steps:**
1. Start backend server without IP_WHITELIST
2. Check server logs for warning

**Recommended Configuration (Production):**
```bash
# server/.env
IP_WHITELIST=127.0.0.1,::1,192.168.1.0/24,10.0.0.0/8
```

**Status:** ⏸️ DEFERRED  
**Reason:** Acceptable for development, required for production  
**Action Required:** Add to production deployment checklist  
**ETA:** Day 15 (Deployment preparation)

---

### BUG-L02: AWS SDK v2 Deprecation Warning
**Priority:** LOW  
**Severity:** FUTURE BREAKING CHANGE  
**Status:** ⏸️ DEFERRED - FUTURE REFACTOR  
**Discovered:** 2025-11-18  

**Description:**
Application uses AWS SDK for JavaScript v2, which is in maintenance mode.

**Warning Message:**
```
NOTE: The AWS SDK for JavaScript (v2) is in maintenance mode.
SDK releases are limited to address critical bug fixes and security issues only.
Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the blog post at https://a.co/cUPnyil
```

**Location:**
- Package: `aws-sdk` (v2)
- Used for: S3 file storage, secret management

**Root Cause:**
Legacy AWS SDK v2 dependency in project.

**Impact:**
- No immediate functional impact
- Future security vulnerabilities may not be patched
- New AWS features unavailable
- Performance improvements in v3 not available

**Affected Features:**
- S3 file uploads (signatures, logos, exports)
- Secret manager integration
- Any AWS service integration

**Recommended Migration (Future):**
```bash
# Uninstall v2
npm uninstall aws-sdk

# Install v3 modular packages
npm install @aws-sdk/client-s3 @aws-sdk/client-secrets-manager
```

Code changes required:
```javascript
// OLD (v2):
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// NEW (v3):
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'us-east-1' });
```

**Files to Review (Future):**
- `server/src/services/backup-service.js`
- `server/src/services/secret-manager.js`
- Any file using `require('aws-sdk')`

**Status:** ⏸️ DEFERRED TO WEEK 4+  
**Reason:** Non-urgent, requires code refactor  
**Estimated Effort:** 4-6 hours  
**Assigned To:** Future refactoring sprint

---

## 📋 BUG FIX CHECKLIST

### Day 11 (Today) ✅
- [x] BUG-C01: Fix frontend build error ✅ COMPLETED

### Day 12 (Tomorrow) 🔧
- [ ] BUG-H02: Fix hospital seed validation
- [ ] BUG-M01: Remove duplicate Mongoose indexes
- [ ] BUG-M02: Fix TSConfig duplicate key

### Day 13 (Security & Compliance)
- [ ] Review BUG-L01: Document IP whitelist for production

### Future (Post Week 3)
- [ ] BUG-L02: Migrate to AWS SDK v3

---

## 📊 METRICS

### Bug Discovery Rate
- **Day 11:** 7 bugs found
- **Critical:** 1 (fixed immediately)
- **Non-critical:** 6

### Bug Fix Rate
- **Day 11:** 1 bug fixed (C01)
- **Fix time:** <1 hour

### Bug Density
- **Total lines of code:** ~6,000 (estimated)
- **Bugs per 1000 lines:** 1.2
- **Status:** Acceptable (industry average: 1-25 bugs/1000 lines)

---

## 🎯 NEXT STEPS

1. **Continue Day 11 Testing** ⏳
   - Manual feature testing
   - Performance baseline measurement
   - Additional bug discovery

2. **Day 12: Bug Fix Session** 📅
   - Fix BUG-H02, BUG-M01, BUG-M02
   - Verify all fixes with tests
   - Update bug tracker

3. **Continuous Monitoring** 👁️
   - Monitor server logs for new warnings
   - Track user-reported issues
   - Performance monitoring

---

**Last Updated:** 2025-11-18 15:00:00  
**Next Review:** Day 12 (Bug fix session)  
**Maintained By:** Development Team
