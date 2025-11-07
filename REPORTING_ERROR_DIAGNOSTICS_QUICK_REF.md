# 🔍 Reporting Error Diagnostics - Quick Reference

## Console Logs to Look For

### ✅ Success Indicators
```
🌐 Reports API Base URL: http://localhost:8001
🌐 First Request URL: http://localhost:8001/api/reports/study/123
✅ Found existing draft: report-abc123
✅ Created draft: report-xyz789
```

### ❌ Error Indicators
```
❌ API Request Failed:
  URL: http://localhost:8001/api/reports
  Method: POST
  Request Body: {...}
  Status: 500
  Response: {...}
  Stack: Error: Request failed...
```

### ⚠️ Offline Mode
```
🔄 Creating temporary fallback draft (local mode)...
⚠️ Using temporary draft (offline mode): temp-1699999999999
⚠️ Editor in OFFLINE MODE - changes will not be saved
⚠️ Skipping autosave for temporary draft (offline mode)
```

---

## UI Indicators

### 🔴 Offline Banner (Red Alert)
```
🔴 API DISCONNECTED — LOCAL MODE
The reporting server is unreachable. You can edit this report locally,
but changes will NOT be saved. Check your network connection and
console logs (F12) for details.
```

### 🟡 Error Toasts
```
Server unreachable - using local draft (changes will not be saved)
Details in console (F12)
```

### 🔵 Missing StudyUID Error Page
```
Unable to Load Reporting Page
Study UID is required. Please navigate from a study viewer
or provide studyUID parameter.
[Go Back Button]
```

---

## Quick Debugging Steps

### Problem: Blank Screen
1. Open console (F12)
2. Look for "Missing studyUID" error
3. Check URL has `?studyUID=...` parameter
4. If missing, navigate from study viewer

### Problem: "API DISCONNECTED" Banner
1. Check backend server is running
2. Verify `VITE_API_BASE_URL` in `.env`
3. Look for network errors in console
4. Test API manually: `curl http://localhost:8001/api/reports/templates`

### Problem: Cannot Save
1. Check for offline banner
2. Look for `temp-` prefix in reportId
3. Verify network connection
4. Check console for API errors

---

## Environment Variables

```bash
# .env file
VITE_API_BASE_URL=http://localhost:8001  # Primary
VITE_API_URL=http://localhost:8001       # Legacy fallback
```

---

## API Endpoint Verification

```bash
# Test reports API
curl http://localhost:8001/api/reports/templates

# Expected response:
{
  "success": true,
  "templates": [...]
}
```

---

## Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| Network Error | Server unreachable | Check if backend running |
| 401 | Unauthorized | Check auth token |
| 404 | Not found | Verify endpoint URL |
| 409 | Version conflict | Refresh page |
| 500 | Server error | Check backend logs |

---

## Temporary Draft Behavior

| Feature | Online Mode | Offline Mode (temp-*) |
|---------|-------------|----------------------|
| Editing | ✅ Allowed | ✅ Allowed |
| Autosave | ✅ Every 3s | ❌ Disabled |
| Manual Save | ✅ Works | ❌ Blocked |
| Finalize | ✅ Works | ❌ Blocked |
| Sign | ✅ Works | ❌ Blocked |
| Export | ✅ Works | ❌ Blocked |

---

## Files Modified

1. `viewer/src/services/ReportsApi.ts` - API client with error logging
2. `viewer/src/hooks/useReportState.ts` - Fallback draft creation
3. `viewer/src/pages/ReportingPage.tsx` - Early null checks
4. `viewer/src/components/reports/UnifiedReportEditor.enhanced.tsx` - Offline banner
5. `viewer/src/utils/reportingUtils.ts` - Enhanced toastError
6. `viewer/src/hooks/useAutosave.ts` - Skip temp draft autosave

---

## Testing Commands

```bash
# Start backend
cd server && npm start

# Start frontend
cd viewer && npm run dev

# Test with missing studyUID
http://localhost:5173/reporting

# Test with valid studyUID
http://localhost:5173/reporting?studyUID=1.2.3.4.5

# Test offline mode (stop backend first)
http://localhost:5173/reporting?studyUID=1.2.3.4.5
```

---

## Support Checklist

When reporting issues, provide:
- [ ] Console logs (F12 → Console tab)
- [ ] Network tab (F12 → Network tab)
- [ ] Screenshot of error UI
- [ ] URL with parameters
- [ ] Environment variables (VITE_API_BASE_URL)
- [ ] Backend server status

---

**Quick Help:** Press F12 → Look for 🌐, ✅, ❌, or ⚠️ emojis in console
