# 🔄 Complete System Restart Guide

## 📋 Pre-Restart Checklist

Before restarting, ensure:
- [ ] All code changes saved
- [ ] No unsaved work in editors
- [ ] Terminal windows ready

---

## 🛑 Step 1: Stop All Running Processes

### Stop Backend (if running)
```bash
# In the terminal running backend
# Press: Ctrl+C (Windows/Linux) or Cmd+C (Mac)
```

### Stop Frontend (if running)
```bash
# In the terminal running frontend
# Press: Ctrl+C (Windows/Linux) or Cmd+C (Mac)
```

---

## 🚀 Step 2: Start Backend

### Terminal 1: Backend Server

```bash
# Navigate to server directory
cd server

# Start the backend
npm start
```

**Expected Output:**
```
Node DICOM API running on http://0.0.0.0:8001

📍 MOUNTED ROUTES:
  ✅ /api/reports          → Unified Reporting System
  ✅ /api/reports/health   → Health check endpoint
  ✅ /api/reports/templates → Template management
  ✅ /api/reports/:id/export → Export functionality

🌐 Base URL: http://localhost:8001
   Test health: curl http://localhost:8001/api/reports/health
```

**Verify Backend is Running:**
```bash
# In a new terminal
curl http://localhost:8001/api/reports/health
```

**Expected Response:**
```json
{
  "ok": true,
  "service": "unified-reporting",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

---

## 🎨 Step 3: Start Frontend

### Terminal 2: Frontend Dev Server

```bash
# Navigate to viewer directory
cd viewer

# Start the frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:3010/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Verify Frontend is Running:**
Open browser and navigate to:
```
http://localhost:3010
```

---

## ✅ Step 4: Verify Everything Works

### Test 1: Health Check
```bash
curl http://localhost:8001/api/reports/health
```
✅ Should return: `{"ok":true,...}`

### Test 2: Templates Endpoint (with auth)
Open browser console (F12) and run:
```javascript
fetch('/api/reports/templates')
  .then(r => r.json())
  .then(d => console.log('Templates:', d))
```
✅ Should return: `{"success":true,"templates":[...]}`

### Test 3: Navigate to Reporting
1. Log in to the application
2. Open a study in the viewer
3. Click "Create Report" or "Structured Reporting" tab
4. Should navigate to: `/reporting?studyUID=xxx&mode=manual`

**Expected Console Output:**
```
🌐 Using relative URLs (Vite proxy)
🌐 ReportsApi initialized with baseURL: /api/reports
🌐 Reports API Configuration:
   Base URL: (relative - using Vite proxy)
   Full Path: /api/reports
   First Request: /api/reports/templates
   Using Proxy: true
📋 Reporting Page initialized with: { studyUID: '...', mode: 'manual' }
✅ Study UID found: ...
📋 StructuredReporting initialized: { studyUID: '...', mode: 'manual' }
🔄 Workflow: selection → template (manual mode)
📋 Loading templates from /api/reports/templates...
✅ Templates loaded: N
```

### Test 4: Check Network Tab
Open DevTools (F12) → Network tab:
- ✅ Request URL should be: `http://localhost:3010/api/reports/templates`
- ✅ Status should be: `200 OK`
- ✅ NO CORS errors

### Test 5: Check Vite Proxy Logs
In the terminal running frontend, you should see:
```
🔄 Proxying: GET /api/reports/templates → http://localhost:8001/api/reports/templates
✅ Response: 200 /api/reports/templates
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: Port 8001 already in use**
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8001 | xargs kill -9
```

**Error: MongoDB connection failed**
```bash
# Check if MongoDB is running
# Windows: Check Services
# Mac/Linux: 
sudo systemctl status mongodb
# or
brew services list | grep mongodb
```

**Solution:** Start MongoDB or update `.env` to use correct MongoDB URI

### Frontend Won't Start

**Error: Port 3010 already in use**
```bash
# Windows
netstat -ano | findstr :3010
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3010 | xargs kill -9
```

**Error: Module not found**
```bash
cd viewer
rm -rf node_modules
npm install
npm run dev
```

### CORS Errors Persist

1. **Hard refresh browser:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

3. **Verify .env.development:**
   ```bash
   cat viewer/.env.development
   ```
   Should show:
   ```
   VITE_API_BASE_URL=
   ```
   (Empty value is correct!)

4. **Restart Vite:**
   ```bash
   # Stop Vite (Ctrl+C)
   npm run dev
   ```

### Templates Not Loading

1. **Check backend health:**
   ```bash
   curl http://localhost:8001/api/reports/health
   ```

2. **Check templates exist:**
   ```bash
   curl http://localhost:8001/api/reports/templates \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Check authentication:**
   - Open DevTools → Application → Local Storage
   - Look for `accessToken` or `token`
   - If missing, log in again

4. **Check console for errors:**
   - Open DevTools (F12) → Console tab
   - Look for detailed error messages

### Blank Screen Issues

1. **Check console for errors:**
   - Open DevTools (F12) → Console tab
   - Look for red error messages

2. **Check studyUID in URL:**
   ```
   /reporting?studyUID=xxx&mode=manual
   ```
   studyUID must be present!

3. **Check workflow logs:**
   Console should show:
   ```
   📋 StructuredReporting initialized
   🔄 Workflow: selection → template
   ```

---

## 🎯 Quick Restart Commands

### Full Restart (Both Services)

**Terminal 1 (Backend):**
```bash
cd server && npm start
```

**Terminal 2 (Frontend):**
```bash
cd viewer && npm run dev
```

### Restart Only Frontend
```bash
# Stop: Ctrl+C
cd viewer && npm run dev
```

### Restart Only Backend
```bash
# Stop: Ctrl+C
cd server && npm start
```

---

## 📊 System Status Check

Run this to verify everything:

```bash
# Check backend
curl http://localhost:8001/api/reports/health

# Check frontend (should see HTML)
curl http://localhost:3010

# Check if ports are listening
# Windows
netstat -ano | findstr :8001
netstat -ano | findstr :3010

# Mac/Linux
lsof -i :8001
lsof -i :3010
```

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Backend shows "Node DICOM API running on http://0.0.0.0:8001"
2. ✅ Frontend shows "Local: http://localhost:3010/"
3. ✅ Health check returns `{"ok":true}`
4. ✅ Browser console shows "Using Proxy: true"
5. ✅ Templates load without CORS errors
6. ✅ Network tab shows requests to `localhost:3010` (not `localhost:8001`)
7. ✅ No red errors in console
8. ✅ Reporting page loads with template selector

---

## 📞 Still Having Issues?

If problems persist after restart:

1. **Check all files were saved:**
   - `viewer/src/services/ReportsApi.ts`
   - `viewer/.env.development`
   - `server/src/routes/reports-unified.js`
   - `server/src/index.js`

2. **Check git status:**
   ```bash
   git status
   git diff
   ```

3. **Review recent changes:**
   - See `_NETWORK_ERROR_FIX_SUMMARY.md`
   - See `_CORS_ERROR_FIX.md`
   - See `_STRUCTURED_REPORTING_FIX_SUMMARY.md`

4. **Check logs:**
   - Backend terminal for errors
   - Frontend terminal for errors
   - Browser console for errors

---

**Last Updated:** 2025-11-05
**Status:** Ready for restart
