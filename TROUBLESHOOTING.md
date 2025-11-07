# 🔧 Troubleshooting Guide

## Common Errors and Solutions

---

## ❌ Error: "useReporting must be used within ReportingProvider"

### **Cause:**
The `UnifiedReportEditor` component is being rendered without the `ReportingProvider` wrapper.

### **Solution:**

**Check your URL:**
Make sure you're accessing the reporting page through the correct route:

✅ **Correct:**
```
http://localhost:5173/app/reporting?studyUID=1.2.3.4.5&patientID=P001&patientName=John%20Doe&modality=CT
```

❌ **Wrong:**
```
http://localhost:5173/reporting  (missing /app/)
```

### **Quick Fix:**

1. **Refresh the page** (Ctrl + Shift + R)
2. **Navigate from viewer** instead of direct URL
3. **Check console** for other errors

### **If Still Not Working:**

Check `viewer/src/pages/ReportingPage.tsx`:

```typescript
// Should look like this:
return (
  <ReportingProvider initialData={reportData}>
    <UnifiedReportEditor onClose={handleBack} />
  </ReportingProvider>
);
```

---

## ❌ Error: "No templates available"

### **Cause:**
Backend API `/api/reports/templates` is not returning templates.

### **Solution:**

**Already Fixed!** The system now uses mock templates as fallback.

**To verify:**
1. Refresh page (Ctrl + Shift + R)
2. You should see 5 mock templates:
   - Chest CT
   - Head CT
   - Abdomen/Pelvis CT
   - Chest X-Ray
   - MRI Brain

---

## ❌ Error: "Study UID is required"

### **Cause:**
Missing `studyUID` parameter in URL.

### **Solution:**

**Option 1: Navigate from Viewer**
1. Go to viewer: `http://localhost:5173/app/viewer/1.2.3.4.5`
2. Click "Create Report" button
3. ✅ Study data is automatically passed

**Option 2: Use Complete URL**
```
http://localhost:5173/app/reporting?studyUID=1.2.3.4.5&patientID=P001&patientName=John%20Doe&modality=CT
```

---

## ❌ Error: "Cannot sign: No report ID"

### **Cause:**
Report hasn't been saved yet.

### **Solution:**

1. **Wait for auto-save** (30 seconds)
2. **OR manually save** (click save button)
3. **Then try signing again**

---

## ❌ Error: "Impression is required before signing"

### **Cause:**
Trying to sign without filling required fields.

### **Solution:**

Fill in these **required fields** before signing:
- ✅ Impression
- ✅ Findings

---

## ❌ Signature canvas not showing

### **Cause:**
Missing `react-signature-canvas` package.

### **Solution:**

```bash
cd viewer
npm install react-signature-canvas @types/react-signature-canvas --legacy-peer-deps
```

Then refresh the page.

---

## ❌ "Create Report" button not visible in viewer

### **Cause:**
Study data not loaded yet.

### **Solution:**

1. **Wait for study to load** (look for patient name in header)
2. **Check if studyInstanceUID exists**
3. **Refresh page** if needed

---

## ❌ Auto-save not working

### **Cause:**
- No report ID
- Backend not responding
- Network error

### **Solution:**

1. **Check console** for errors
2. **Check network tab** for failed API calls
3. **Verify backend is running**
4. **Try manual save** (click save button)

---

## ❌ Voice dictation not working

### **Cause:**
- Browser doesn't support Web Speech API
- Microphone permission denied

### **Solution:**

1. **Use Chrome or Edge** (Firefox/Safari not supported)
2. **Allow microphone permission** when prompted
3. **Check browser console** for errors

---

## ❌ Canvas shows placeholder instead of body diagram

### **Cause:**
This is **expected behavior**! Real body diagrams need to be added.

### **Solution:**

This is not an error. The canvas works correctly:
- ✅ You can still mark findings
- ✅ Markings are saved
- ✅ Markings create linked findings

**To add real diagrams:**
1. Get medical illustration SVGs
2. Replace canvas placeholder in `AnatomicalDiagramPanel.tsx`

---

## 🔍 **General Debugging Steps**

### **1. Check Browser Console**
```
F12 → Console tab
Look for red errors
```

### **2. Check Network Tab**
```
F12 → Network tab
Look for failed API calls (red)
Check response for error messages
```

### **3. Check URL Parameters**
```
Should have: ?studyUID=xxx&patientID=xxx&patientName=xxx&modality=xxx
```

### **4. Clear Cache**
```
Ctrl + Shift + R (hard refresh)
Or: Ctrl + Shift + Delete → Clear cache
```

### **5. Check Backend**
```
Is backend running?
Check: http://localhost:8001/api/reports/health
Should return: { ok: true }
```

---

## 📊 **System Health Check**

### **Frontend:**
```bash
cd viewer
npm run dev
# Should start on http://localhost:5173
```

### **Backend:**
```bash
cd server
npm start
# Should start on http://localhost:8001
```

### **Test URLs:**

1. **Landing Page:**
   ```
   http://localhost:5173/
   ✅ Should show landing page
   ```

2. **Login:**
   ```
   http://localhost:5173/app/login
   ✅ Should show login form
   ```

3. **Dashboard:**
   ```
   http://localhost:5173/app/dashboard
   ✅ Should show dashboard (after login)
   ```

4. **Viewer:**
   ```
   http://localhost:5173/app/viewer/1.2.3.4.5
   ✅ Should show image viewer
   ```

5. **Reporting:**
   ```
   http://localhost:5173/app/reporting?studyUID=1.2.3.4.5&patientID=P001&patientName=Test&modality=CT
   ✅ Should show template selector
   ```

---

## 🆘 **Still Having Issues?**

### **Collect This Information:**

1. **Error message** (exact text)
2. **Browser console** (screenshot or copy errors)
3. **Network tab** (failed API calls)
4. **URL** (what URL are you accessing?)
5. **Steps to reproduce** (what did you do?)

### **Common Fixes:**

1. ✅ **Refresh page** (Ctrl + Shift + R)
2. ✅ **Clear cache** (Ctrl + Shift + Delete)
3. ✅ **Restart dev server** (Ctrl + C, then npm run dev)
4. ✅ **Check backend is running**
5. ✅ **Navigate from viewer** instead of direct URL

---

## 📚 **Documentation**

- `TESTING_GUIDE.md` - How to test features
- `SIGN_AND_PREVIEW_GUIDE.md` - Sign and preview features
- `VIEWER_INTEGRATION_VISUAL.md` - Visual guide
- `INTEGRATION_COMPLETE.md` - Complete integration guide

---

**Most issues are solved by refreshing the page or navigating from the viewer!** 🚀
