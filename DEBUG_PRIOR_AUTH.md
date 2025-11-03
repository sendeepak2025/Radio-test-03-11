# 🔍 Prior Authorization Page - Debug Guide

## Issue: Page Opens But Doesn't Load

You mentioned that when you click the Prior Auth button, a new page opens but doesn't load content.

---

## 🎯 Possible Causes & Solutions

### 1. **Loading State Stuck**
The page might be stuck in a loading state if the API calls are failing.

**Check:**
- Open browser DevTools (F12)
- Go to Console tab
- Look for errors like:
  - `Failed to fetch authorizations`
  - Network errors
  - CORS errors

**Solution:**
- Hard refresh: `Ctrl + Shift + R`
- Check if you're logged in (authentication token exists)

---

### 2. **Authentication Token Missing**
The API requires authentication. If the token is missing or expired, the page won't load data.

**Check:**
- F12 → Application → Local Storage
- Look for `token` or `authToken`
- Check if it exists and is not expired

**Solution:**
- Logout and login again
- This will refresh your authentication token

---

### 3. **API Endpoint Not Responding**
The backend might not be responding to the Prior Auth API calls.

**Check:**
- F12 → Network tab
- Look for requests to `/api/prior-auth`
- Check the status codes:
  - 200 = Success ✅
  - 401 = Not authenticated ❌
  - 404 = Route not found ❌
  - 500 = Server error ❌

**Solution:**
- Restart backend server
- Check backend logs for errors

---

### 4. **JavaScript Error Breaking the Page**
A JavaScript error might be preventing the page from rendering.

**Check:**
- F12 → Console tab
- Look for red error messages
- Common errors:
  - `Cannot read property of undefined`
  - `TypeError`
  - `ReferenceError`

**Solution:**
- Note the error message
- Hard refresh the page
- Clear browser cache

---

### 5. **Infinite Loading Spinner**
The page might be showing a loading spinner indefinitely.

**Check:**
- Look for a circular progress indicator
- Check if the page is completely blank or shows the header

**Solution:**
- Check Network tab for failed API calls
- Verify backend is running on port 8001

---

## 🧪 Step-by-Step Debugging

### Step 1: Open Browser DevTools
```
Press F12 or Right-click → Inspect
```

### Step 2: Go to Console Tab
```
Look for any red error messages
```

### Step 3: Go to Network Tab
```
1. Clear network log (trash icon)
2. Refresh the page
3. Look for /api/prior-auth requests
4. Check their status codes
```

### Step 4: Check What You See
```
Option A: Blank white page
Option B: Loading spinner forever
Option C: Error message displayed
Option D: Page header but no content
```

---

## 📊 Expected Behavior

### What You SHOULD See:

```
┌─────────────────────────────────────────────────────┐
│  🏥 Prior Authorization      [Refresh] [New Request]│
├─────────────────────────────────────────────────────┤
│  📊 Statistics Cards                                 │
│  [Total: 0] [Pending: 0] [Approved: 0] [Denied: 0] │
├─────────────────────────────────────────────────────┤
│  [All] [Pending] [In Review] [Approved] [Denied]   │
├─────────────────────────────────────────────────────┤
│  📋 Authorization Table                             │
│  No authorizations found                            │
└─────────────────────────────────────────────────────┘
```

### API Calls That Should Happen:
```
1. GET /api/prior-auth (fetch authorizations)
2. GET /api/prior-auth/stats/dashboard (fetch statistics)
```

---

## 🔧 Quick Fixes

### Fix 1: Hard Refresh
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Fix 2: Clear Cache & Reload
```
1. F12 → Network tab
2. Right-click → Clear browser cache
3. Refresh page
```

### Fix 3: Logout & Login
```
1. Click logout
2. Login again
3. Navigate to Prior Auth
```

### Fix 4: Restart Servers
```bash
# Stop both servers (Ctrl+C)
# Then restart:

# Backend
cd server
npm start

# Frontend
cd viewer
npm run dev
```

---

## 📸 What to Check in Browser

### Console Tab - Look For:
```javascript
// Good (no errors)
✅ No red error messages

// Bad (errors present)
❌ Failed to fetch authorizations: ...
❌ TypeError: Cannot read property 'data' of undefined
❌ Network request failed
```

### Network Tab - Look For:
```
// Good
✅ GET /api/prior-auth → Status: 200
✅ GET /api/prior-auth/stats/dashboard → Status: 200

// Bad
❌ GET /api/prior-auth → Status: 401 (not logged in)
❌ GET /api/prior-auth → Status: 404 (route not found)
❌ GET /api/prior-auth → Status: 500 (server error)
❌ GET /api/prior-auth → Failed (network error)
```

### Application Tab - Check:
```
Local Storage → Look for:
✅ token or authToken (should exist)
✅ user data (should exist)

If missing:
❌ You're not logged in properly
```

---

## 🎯 Most Common Issues

### Issue 1: Not Logged In
**Symptom:** Page opens but immediately shows error or blank
**Solution:** Login again

### Issue 2: Cached Error
**Symptom:** Shows old "Unexpected token" error
**Solution:** Hard refresh (Ctrl + Shift + R)

### Issue 3: Backend Not Running
**Symptom:** Network errors in console
**Solution:** Start backend server

### Issue 4: Wrong Port
**Symptom:** Can't access page at all
**Solution:** Use http://localhost:3010/prior-auth

---

## 📞 What to Tell Me

If the issue persists, please check and tell me:

1. **What do you see?**
   - Blank page?
   - Loading spinner?
   - Error message?
   - Page header only?

2. **Console errors?**
   - Copy any red error messages from F12 → Console

3. **Network status?**
   - F12 → Network → What status codes for /api/prior-auth?

4. **Are you logged in?**
   - F12 → Application → Local Storage → Is there a token?

5. **Backend running?**
   - Is the backend server showing in terminal?
   - Any errors in backend logs?

---

## ✅ Quick Checklist

Before reporting the issue, try these:

- [ ] Hard refresh (Ctrl + Shift + R)
- [ ] Check browser console for errors (F12)
- [ ] Check network tab for failed requests
- [ ] Verify you're logged in
- [ ] Verify backend is running on port 8001
- [ ] Verify frontend is running on port 3010
- [ ] Try logout and login again
- [ ] Try in incognito/private window
- [ ] Clear browser cache completely

---

## 🚀 Expected Working State

When everything is working:
- ✅ Page loads in < 2 seconds
- ✅ Statistics cards show numbers (even if 0)
- ✅ Table shows "No authorizations found" (if empty)
- ✅ "New Request" button is clickable
- ✅ No error messages
- ✅ No console errors
- ✅ Network tab shows 200 OK responses

---

Let me know what you see in the browser console and network tab, and I can help you fix the specific issue!
