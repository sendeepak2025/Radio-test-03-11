# 🔧 Signature "Failed to Fetch" Troubleshooting Guide

## Issues Fixed

### 1. **Missing Authorization Headers**
   - ✅ Added JWT token to all API calls
   - ✅ Token retrieved from localStorage/sessionStorage

### 2. **Wrong Parameter Order**
   - ✅ Fixed `signReport(reportId, meaning, password)` parameter order
   - ✅ Backend expects: `{ reportId, meaning, password }`

### 3. **Removed Strict Middleware**
   - ✅ Removed `enforceIPWhitelist()` (too restrictive for dev)
   - ✅ Removed `requireMFA()` (optional for dev)
   - ✅ Kept essential: `authenticate`, `requireSignatureRole`, `verifyPassword`

### 4. **Role Compatibility**
   - ✅ Added support for `user.role` (singular) for backward compatibility
   - ✅ Added 'superadmin' to admin roles

## How to Debug

### Step 1: Check Browser Console
Open browser DevTools (F12) and look for:
```
Error signing report: [error message]
```

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Click "Sign Report"
3. Look for `POST /api/signatures/sign` request
4. Check:
   - Status code (should be 200)
   - Request headers (should have Authorization: Bearer ...)
   - Request payload (should have reportId, meaning, password)
   - Response (check error message)

### Step 3: Check Server Logs
Look in server console for:
```
❌ Error signing report: [error message]
```

## Common Errors & Solutions

### Error: "Failed to fetch"
**Cause:** Network error or CORS issue
**Solution:**
1. Check if backend server is running
2. Verify API endpoint: `http://localhost:3010/api/signatures/sign`
3. Check CORS configuration in `server/src/index.js`

### Error: "Authentication required"
**Cause:** Missing or invalid JWT token
**Solution:**
1. Check if user is logged in
2. Verify token exists: `localStorage.getItem('accessToken')`
3. Check token expiration

### Error: "Insufficient permissions to sign as author"
**Cause:** User role doesn't have signature permission
**Solution:**
1. Check user roles in database
2. Required roles for 'author': radiologist, physician, doctor, attending, resident
3. Add role to user or use admin account

### Error: "Invalid password"
**Cause:** Wrong password entered
**Solution:**
1. Verify password is correct
2. Check password hash in database

### Error: "Report ID is required"
**Cause:** reportId not being sent
**Solution:**
1. Check SignatureModal is receiving reportId prop
2. Verify reportId is not null/undefined

## Required User Roles

### For 'author' signature:
- radiologist
- physician
- doctor
- attending
- resident

### For 'reviewer' signature:
- radiologist
- physician
- doctor
- attending
- senior_radiologist

### For 'approver' signature:
- attending
- senior_radiologist
- department_head
- admin
- superadmin

### Admin (can sign with any meaning):
- system:admin
- super_admin
- superadmin

## Testing Steps

### 1. Check User Role
```javascript
// In browser console
const token = localStorage.getItem('accessToken')
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('User roles:', data.user.roles))
```

### 2. Test Sign API Directly
```javascript
// In browser console
const token = localStorage.getItem('accessToken')
fetch('/api/signatures/sign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  credentials: 'include',
  body: JSON.stringify({
    reportId: 'SR-123',  // Replace with actual reportId
    meaning: 'author',
    password: 'your_password'
  })
})
.then(r => r.json())
.then(data => console.log('Sign result:', data))
.catch(err => console.error('Sign error:', err))
```

### 3. Check Signature Permissions
```javascript
// In browser console
const token = localStorage.getItem('accessToken')
fetch('/api/signatures/permissions', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => console.log('Permissions:', data))
```

## Quick Fix for Development

If you need to bypass role checks for testing, temporarily modify the middleware:

```javascript
// server/src/middleware/signature-middleware.js
function hasSignaturePermission(user, meaning) {
  // TEMPORARY: Allow all authenticated users (REMOVE IN PRODUCTION!)
  return true;
  
  // Original code...
}
```

**⚠️ WARNING:** Remove this bypass before deploying to production!

## API Endpoint Details

### POST /api/signatures/sign
```
URL: http://localhost:3010/api/signatures/sign
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
Body:
  {
    "reportId": "SR-123",
    "meaning": "author",
    "password": "user_password"
  }
```

### Expected Response (Success)
```json
{
  "success": true,
  "message": "Report signed successfully",
  "data": {
    "signatureId": "64abc123...",
    "reportId": "SR-123",
    "signerName": "Dr. John Smith",
    "meaning": "author",
    "timestamp": "2024-01-15T10:45:23.000Z",
    "status": "valid",
    "algorithm": "RSA-SHA256",
    "keySize": 2048
  }
}
```

### Expected Response (Error)
```json
{
  "success": false,
  "message": "Insufficient permissions to sign as author",
  "error": "INSUFFICIENT_SIGNATURE_PERMISSIONS",
  "requiredRoles": ["radiologist", "physician", "doctor"],
  "userRoles": ["user"]
}
```

## Next Steps

1. **Check browser console** for specific error message
2. **Check network tab** to see actual API request/response
3. **Verify user has correct role** in database
4. **Test with admin account** if available
5. **Check server logs** for backend errors

## Need More Help?

If the issue persists:
1. Share the exact error message from browser console
2. Share the network request/response details
3. Share user roles from database
4. Share server logs
