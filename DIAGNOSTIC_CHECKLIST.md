# Diagnostic Checklist - Why Fields Are Empty

## Current Database State ✅

Your database has the data correctly stored:
```json
{
  "sections": {
    "clinical_history": "tes",
    "technique": "tst", 
    "findings": "test",
    "impression": "test"
  },
  "clinicalHistory": "",  // ❌ EMPTY (backend not syncing)
  "technique": "",
  "findingsText": "",
  "impression": ""
}
```

## Problem

The top-level fields are empty because **the server is still running old code**.

## Step-by-Step Fix

### Step 1: Check Server Status

Open your server terminal and look for:
- ❌ If you see old logs from hours ago → Server needs restart
- ✅ If you see recent logs → Server is running

### Step 2: Restart Server

**In your server terminal:**

1. **Stop the server:**
   - Press `Ctrl + C` (Windows/Linux)
   - Or close the terminal

2. **Start the server:**
   ```bash
   cd server
   npm start
   ```

3. **Wait for this message:**
   ```
   ✅ Report indexes ensured
   Server running on port 5000
   ```

### Step 3: Verify Backend is Running New Code

**Make a test save:**

1. Open your report in browser
2. Type something in any field
3. Save (or wait for autosave)
4. **Check server console** for this NEW log:
   ```
   ✅ Template report synced: {
     sectionsKeys: 5,
     topLevelFields: {
       clinicalHistory: 'SET',
       technique: 'SET',
       findingsText: 'SET',
       impression: 'SET'
     }
   }
   ```

If you DON'T see this log → Server is still running old code

### Step 4: Fix Existing Report

After server restart, run the migration script:

```bash
cd server
node fix-existing-reports-sync.js
```

This will sync your existing report's sections to top-level fields.

### Step 5: Refresh Browser

**Hard refresh:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Step 6: Check Browser Console

You should see:
```
✅ ReportingContext initialized from sections: {
  templateId: "US-BREAST-01",
  clinicalHistory: "tes...",
  technique: "tst...",
  findingsText: "test...",
  impression: "test...",
  totalSectionKeys: 5
}
```

### Step 7: Verify Fields Display

All fields should now show your data:
- ✅ Clinical History: "tes"
- ✅ Technique: "tst"
- ✅ Findings: "test"
- ✅ Impression: "test"

## Quick Test

**To verify everything is working:**

1. ✅ Server restarted
2. ✅ Migration script run
3. ✅ Browser hard refreshed
4. ✅ Console shows initialization log
5. ✅ Fields display data

## If Still Not Working

### Check 1: Is the server actually restarted?

Run this in a NEW terminal:
```bash
cd server
Get-Content server.log -Tail 5
```

Look for recent timestamps (within last few minutes).

### Check 2: Is the frontend getting the data?

Open browser DevTools → Network tab → Find the request to `/api/reports/SR-1763637848996-5941arlfc`

Check the response - does it have data in `sections`?

### Check 3: Is ReportingContext initializing?

Open browser Console → Look for the log starting with "✅ ReportingContext initialized"

What does it show for each field?

## Common Issues

### Issue 1: Server Not Restarted
**Symptom:** Top-level fields in database are empty
**Fix:** Restart server, run migration script

### Issue 2: Browser Cache
**Symptom:** Old code still running in browser
**Fix:** Hard refresh (Ctrl+Shift+R)

### Issue 3: Wrong Section Keys
**Symptom:** Console shows fields as "(empty)"
**Fix:** Already fixed in code, just need restart

## Current Status

Based on your database:
- ✅ Data is stored in `sections` correctly
- ❌ Top-level fields are empty (server not synced)
- ❓ Frontend initialization unknown (check console)

**Next Action:** Restart server, then run migration script.

---

**Report:** SR-1763637848996-5941arlfc  
**Template:** US-BREAST-01  
**Last Updated:** 2025-11-20T12:01:50.915Z
