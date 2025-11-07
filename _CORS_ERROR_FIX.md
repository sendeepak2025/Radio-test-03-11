# 🔧 CORS Error Fix - Templates Loading

## 🎯 Problem

When trying to load templates, the browser shows:
```
CORS error
xhr ReportsApi.ts:35
templates?active=true
```

This happens because the frontend is making requests directly to `http://localhost:8001` instead of going through the Vite proxy.

## 🔍 Root Cause

**File**: `viewer/src/services/ReportsApi.ts`

The `getBaseURL()` function had a fallback to `'http://localhost:8001'`:

```typescript
const getBaseURL = (): string => {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && (window as any).API_BASE_URL) ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8001'  // ❌ This causes CORS!
  );
};
```

When `VITE_API_BASE_URL` was set to `/api`, axios would create URLs like:
```
/api/api/reports/templates  // ❌ Double /api!
```

## ✅ Solution

### 1. Fixed `getBaseURL()` Function

**File**: `viewer/src/services/ReportsApi.ts`

```typescript
const getBaseURL = (): string => {
  // In development, ALWAYS use relative path to go through Vite proxy
  // In production, use relative path (same origin) or configured URL
  const envBaseURL = import.meta.env.VITE_API_BASE_URL;
  
  if (envBaseURL) {
    console.log('🌐 Using VITE_API_BASE_URL:', envBaseURL);
    return envBaseURL;
  }
  
  // Default to empty string (relative URLs) to use Vite proxy
  console.log('🌐 Using relative URLs (Vite proxy)');
  return '';  // ✅ Empty string = relative URLs
};
```

### 2. Fixed Constructor

```typescript
constructor() {
  this.baseURL = API_BASE_URL;
  
  // Build full base URL for axios
  // If API_BASE_URL is empty, just use BASE_PATH (relative URL)
  const fullBaseURL = this.baseURL ? this.baseURL + BASE_PATH : BASE_PATH;
  
  console.log('🌐 ReportsApi initialized with baseURL:', fullBaseURL);
  
  this.client = axios.create({
    baseURL: fullBaseURL,  // ✅ Will be '/api/reports' (relative)
    headers: {
      'Content-Type': 'application/json',
      'x-reports-impl': 'unified'
    },
    withCredentials: true
  });
}
```

### 3. Fixed Environment Variable

**File**: `viewer/.env.development`

**Before:**
```env
VITE_API_BASE_URL=/api  # ❌ Causes double /api
```

**After:**
```env
VITE_API_BASE_URL=  # ✅ Empty = use relative URLs
```

## 🔄 How It Works Now

### Request Flow

```
Frontend (Browser)
  ↓
  GET /api/reports/templates
  ↓
Vite Dev Server (localhost:3010)
  ↓ (proxy configured in vite.config.ts)
  GET http://localhost:8001/api/reports/templates
  ↓
Backend (Express)
  ↓
  ✅ Response (200 OK)
  ↓
Vite Dev Server
  ↓
Frontend (Browser)
  ✅ Templates loaded!
```

### URL Construction

**Before (WRONG):**
```
baseURL: '/api'
BASE_PATH: '/api/reports'
Final URL: '/api/api/reports/templates'  ❌
```

**After (CORRECT):**
```
baseURL: ''  (empty)
BASE_PATH: '/api/reports'
Final URL: '/api/reports/templates'  ✅
```

## 🧪 Testing

### 1. Check Console Logs

After refresh, you should see:
```
🌐 Using relative URLs (Vite proxy)
🌐 ReportsApi initialized with baseURL: /api/reports
🌐 Reports API Configuration:
   Base URL: (relative - using Vite proxy)
   Full Path: /api/reports
   First Request: /api/reports/templates
   Using Proxy: true
```

### 2. Check Network Tab

In browser DevTools → Network tab:
```
Request URL: http://localhost:3010/api/reports/templates
Status: 200 OK
Type: xhr
```

**NOT:**
```
Request URL: http://localhost:8001/api/reports/templates  ❌
Status: (failed) CORS error
```

### 3. Check Vite Console

In terminal where Vite is running:
```
🔄 Proxying: GET /api/reports/templates → http://localhost:8001/api/reports/templates
✅ Response: 200 /api/reports/templates
```

## 📊 Before vs After

### Before Fix

```
Browser makes request to:
  http://localhost:8001/api/reports/templates
    ↓
  ❌ CORS Error
  ❌ Access blocked by CORS policy
  ❌ No 'Access-Control-Allow-Origin' header
```

### After Fix

```
Browser makes request to:
  /api/reports/templates (relative URL)
    ↓
  Vite proxy intercepts
    ↓
  Forwards to: http://localhost:8001/api/reports/templates
    ↓
  ✅ Response received
    ↓
  Vite proxy returns to browser
    ↓
  ✅ Templates loaded!
```

## 🚀 Deployment Notes

### Development
- ✅ Uses Vite proxy (no CORS issues)
- ✅ Relative URLs: `/api/reports/...`
- ✅ Proxy configured in `vite.config.ts`

### Production
- ✅ Frontend and backend on same domain (no CORS)
- ✅ Relative URLs work: `/api/reports/...`
- ✅ No proxy needed (same origin)

### If Frontend and Backend on Different Domains
Update `.env.production`:
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

Then backend must have CORS configured:
```javascript
app.use(cors({
  origin: 'https://frontend.yourdomain.com',
  credentials: true
}));
```

## 📝 Files Modified

1. ✅ `viewer/src/services/ReportsApi.ts`
   - Fixed `getBaseURL()` to return empty string by default
   - Fixed constructor to handle empty baseURL
   - Enhanced logging to show proxy usage

2. ✅ `viewer/.env.development`
   - Changed `VITE_API_BASE_URL=/api` to `VITE_API_BASE_URL=`
   - Added comment explaining why it's empty

## ✅ Acceptance Criteria

1. ✅ No CORS errors in browser console
2. ✅ Templates load successfully
3. ✅ Network tab shows requests to `localhost:3010` (not `localhost:8001`)
4. ✅ Vite console shows proxy logs
5. ✅ Console shows "Using Proxy: true"

## 🔍 Troubleshooting

### If CORS errors persist:

1. **Check Vite is running:**
   ```bash
   cd viewer
   npm run dev
   ```

2. **Check .env.development:**
   ```bash
   cat viewer/.env.development
   # Should show: VITE_API_BASE_URL=
   ```

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear cache in DevTools

4. **Restart Vite dev server:**
   ```bash
   # Stop Vite (Ctrl+C)
   # Start again
   npm run dev
   ```

5. **Check vite.config.ts proxy:**
   ```typescript
   proxy: {
     '/api': {
       target: process.env.VITE_BACKEND_URL || 'http://localhost:8001',
       changeOrigin: true,
       secure: false,
       ws: true
     }
   }
   ```

### If templates still don't load:

1. **Check backend is running:**
   ```bash
   curl http://localhost:8001/api/reports/health
   # Should return: {"ok":true,"service":"unified-reporting",...}
   ```

2. **Check templates exist:**
   ```bash
   curl http://localhost:8001/api/reports/templates \
     -H "Authorization: Bearer YOUR_TOKEN"
   # Should return: {"success":true,"templates":[...],"count":N}
   ```

3. **Check authentication:**
   - Open DevTools → Application → Local Storage
   - Look for `accessToken` or `token`
   - If missing, log in again

## 📚 Related Documentation

- `NETWORK_ERROR_FIX_VERIFICATION.md` - Network error fixes
- `REPORTING_API_QUICK_REFERENCE.md` - API reference
- `NETWORK_FLOW_DIAGRAM.md` - Request flow diagrams

---

**Status**: ✅ FIXED
**Date**: 2025-11-05
**Issue**: CORS error when loading templates
**Solution**: Use relative URLs to go through Vite proxy
