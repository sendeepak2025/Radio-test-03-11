# 🔍 Signature "Failed to Fetch" - Debug Steps

## Issue: No Network Request Appears

When you see "Failed to fetch" but **NO network request** in DevTools, it means the request is failing **before** it reaches the network layer.

## Step-by-Step Debugging

### Step 1: Open Browser Console (F12)
1. Open DevTools
2. Go to Console tab
3. Clear console
4. Try signing again
5. Look for these logs:

```
🔐 Signing report: { reportId: "...", meaning: "author", hasToken: true }
📡 API endpoint: /api/signatures/sign
```

### Step 2: Check for Errors

Look for any of these errors in console:

#### Error 1: "No auth token found"
```
❌ No auth token found
```
**Solution:** You're not logged in. Log in first.

#### Error 2: TypeError or Network Error
```
TypeError: Failed to fetch
```
**Possible causes:**
- CORS blocking
- Server not running
- Invalid URL
- Browser blocking request

#### Error 3: Console shows nothing
**Possible causes:**
- JavaScript error before fetch
- Component not rendering
- Event handler not firing

### Step 3: Test API Directly in Console

Paste this in browser console:

```javascript
// Test 1: Check if you're logged in
const token = localStorage.getItem('accessToken')
console.log('Token:', token ? 'Present ✅' : 'Missing ❌')

// Test 2: Check your user info
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('User:', data.user.username)
  console.log('Roles:', data.user.roles)
})
.catch(err => console.error('Auth check failed:', err))

// Test 3: Try signing directly
fetch('/api/signatures/sign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  credentials: 'include',
  body: JSON.stringify({
    reportId: 'SR-test-123',  // Replace with real reportId
    meaning: 'author',
    password: 'your_password'  // Replace with your password
  })
})
.then(r => {
  console.log('Response status:', r.status)
  return r.json()
})
.then(data => console.log('Response:', data))
.catch(err => console.error('Sign failed:', err))
```

### Step 4: Check Server Console

Look in your server terminal for:

```
🔐 Sign request received: { reportId: '...', meaning: 'author', hasPassword: true, userId: '...' }
```

If you see this, the request reached the server!

If you DON'T see this, the request never reached the server.

### Step 5: Check Network Tab

1. Open DevTools → Network tab
2. Clear network log
3. Try signing again
4. Look for `sign` request

**If you see the request:**
- Click on it
- Check Status code
- Check Response tab
- Check Headers tab

**If you DON'T see the request:**
- Request is blocked before network layer
- Check Console for errors
- Check if server is running
- Check CORS configuration

### Step 6: Verify Server is Running

```bash
# Test server health
curl http://localhost:3010/health

# Should return:
# {"ok":true,"timestamp":...}
```

If this fails, your server is not running or not on port 3010.

### Step 7: Check CORS Configuration

In `server/src/index.js`, verify your frontend URL is allowed:

```javascript
const allowedOrigins = [
  'http://localhost:3010',
  'http://localhost:5173',  // ← Your frontend URL
  'http://localhost:3000',
  // ...
];
```

## Common Issues & Solutions

### Issue 1: "Failed to fetch" with no network request

**Cause:** JavaScript error before fetch executes

**Solution:**
1. Check browser console for errors
2. Look for red error messages
3. Fix any JavaScript errors first

### Issue 2: CORS Error

**Symptoms:**
```
Access to fetch at 'http://localhost:3010/api/signatures/sign' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**
Add your frontend URL to CORS whitelist in `server/src/index.js`

### Issue 3: Server Not Running

**Symptoms:**
- No response from `curl http://localhost:3010/health`
- Console shows "Failed to fetch"
- No network request appears

**Solution:**
```bash
cd server
npm start
```

### Issue 4: Wrong Port

**Symptoms:**
- Server running but requests fail
- Network tab shows different port

**Solution:**
Check your frontend is calling the correct port:
- Backend: `http://localhost:3010`
- Frontend: `http://localhost:5173` (or 3000)

### Issue 5: Not Logged In

**Symptoms:**
```
❌ No auth token found
```

**Solution:**
1. Go to login page
2. Log in with your credentials
3. Try signing again

### Issue 6: Invalid Token

**Symptoms:**
```
401 Unauthorized
Authentication required
```

**Solution:**
1. Log out
2. Log in again
3. Try signing again

## Quick Fixes

### Fix 1: Clear Browser Cache
```
Ctrl + Shift + Delete
Clear cache and cookies
Reload page
```

### Fix 2: Restart Server
```bash
# Stop server (Ctrl+C)
# Start server
cd server
npm start
```

### Fix 3: Check Environment Variables
```bash
# In server directory
cat .env

# Should have:
PORT=3010
MONGODB_URI=...
JWT_SECRET=...
```

### Fix 4: Test with cURL
```bash
# Get token first (replace with your credentials)
TOKEN=$(curl -X POST http://localhost:3010/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | jq -r '.token')

# Try signing
curl -X POST http://localhost:3010/api/signatures/sign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reportId": "SR-test-123",
    "meaning": "author",
    "password": "your_password"
  }'
```

## What to Share for Help

If still not working, share:

1. **Browser Console Output:**
   - All logs starting with 🔐, 📡, ✅, or ❌
   - Any error messages

2. **Network Tab:**
   - Screenshot of Network tab
   - Or "No requests appear"

3. **Server Console Output:**
   - Any logs when you try to sign
   - Or "No logs appear"

4. **Your Setup:**
   - Frontend URL: http://localhost:????
   - Backend URL: http://localhost:????
   - Browser: Chrome/Firefox/Safari

5. **Test Results:**
   - Result of `localStorage.getItem('accessToken')`
   - Result of `/api/auth/me` test
   - Result of direct sign test

## Expected Behavior

### Success Flow:
```
1. User clicks "Sign Report"
2. Console: 🔐 Signing report: {...}
3. Console: 📡 API endpoint: /api/signatures/sign
4. Network: POST /api/signatures/sign → 200 OK
5. Server: 🔐 Sign request received: {...}
6. Console: ✅ Sign successful: {...}
7. Modal closes
8. Report status → FINAL
```

### Failure Flow (with network request):
```
1. User clicks "Sign Report"
2. Console: 🔐 Signing report: {...}
3. Network: POST /api/signatures/sign → 401/403/500
4. Console: ❌ Sign failed: {...}
5. Error message shown in modal
```

### Failure Flow (no network request):
```
1. User clicks "Sign Report"
2. Console: ❌ No auth token found
   OR
   Console: TypeError: Failed to fetch
   OR
   Console: (nothing)
3. No network request
4. Error message shown in modal
```

## Next Steps

1. Follow Step 1-7 above
2. Note which step fails
3. Check corresponding solution
4. Share results if still stuck
