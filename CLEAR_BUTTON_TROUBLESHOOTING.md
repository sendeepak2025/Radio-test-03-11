# Clear Button Not Working - Troubleshooting

## Problem

Clicking "Clear All" or the ✕ button doesn't remove the failed task showing "Too many requests".

## Quick Fixes

### Fix 1: Use the Individual ✕ Button

Click the ✕ button on the right side of the failed task:

```
┌─────────────────────────────────────┐
│ ✗ Patient 316080                   ✕│ ← Click this X
│ Too many requests                   │
│ Duration: 0:00                      │
└─────────────────────────────────────┘
```

### Fix 2: Use "Clear Completed" Button

In the Completed section header:

```
Completed (1)  [Clear Completed] ← Click this
```

### Fix 3: Use "Clear All" Button

In the panel header:

```
CD Burn Operations  ▼ [Clear All] ← Click this
```

### Fix 4: Refresh the Page

If buttons don't work:
1. Press F5 or Ctrl+R
2. Panel will disappear
3. Backend state cleared after 15 minutes

### Fix 5: Open Browser Console

1. Press F12
2. Click "Console" tab
3. Click "Clear All" button
4. Look for console logs:
   ```
   Clearing all burns, current tasks: 1
   Clearing backend tracking...
   Backend cleared successfully
   Clearing UI tasks
   All burns cleared
   ```

5. If you see errors, report them

## Why It Might Not Work

### Reason 1: JavaScript Error

**Check console for errors:**
```
Uncaught TypeError: Cannot read property...
```

**Solution:** Refresh page (F5)

### Reason 2: State Not Updating

**Check React DevTools:**
- Install React DevTools extension
- Check `burnTasks` state
- Should be empty array after clear

**Solution:** Force refresh (Ctrl+Shift+R)

### Reason 3: Event Handler Not Firing

**Test:**
1. Open console (F12)
2. Click button
3. Should see: "Clearing all burns..."

**If no log:** Button not connected properly
**Solution:** Refresh page

### Reason 4: Backend Not Responding

**Check Network tab:**
1. Open DevTools (F12)
2. Go to Network tab
3. Click "Clear All"
4. Look for: POST /api/export/clear-burns
5. Check response

**If 401/403:** Authentication issue
**If 500:** Server error
**Solution:** Re-login or restart server

## Step-by-Step Debug

### Step 1: Check Console

```bash
1. Press F12
2. Click Console tab
3. Click "Clear All"
4. Look for logs
```

**Expected output:**
```
Clearing all burns, current tasks: 1
Clearing backend tracking...
Backend cleared successfully
Clearing UI tasks
All burns cleared
```

**If you see this:** It's working, but UI not updating
**Solution:** Refresh page

### Step 2: Check Network

```bash
1. Press F12
2. Click Network tab
3. Click "Clear All"
4. Look for POST request
```

**Expected:**
```
POST /api/export/clear-burns
Status: 200 OK
Response: {"success": true, "message": "Active burns cleared"}
```

**If 429:** Still rate limited, wait 5 minutes
**If 401:** Need to re-login

### Step 3: Check React State

```bash
1. Install React DevTools
2. Open Components tab
3. Find PatientsPage component
4. Look at burnTasks state
5. Click "Clear All"
6. burnTasks should become []
```

**If still has items:** State not updating
**Solution:** Check console for errors

### Step 4: Force Clear

```javascript
// Open console (F12) and run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

This will:
- Clear all local storage
- Clear session storage
- Reload page
- Reset all state

## Manual Workarounds

### Workaround 1: Refresh Page

```
Press F5 or Ctrl+R
```

Pros: Simple, always works
Cons: Loses current page state

### Workaround 2: Close and Reopen

```
1. Navigate away from Patients page
2. Navigate back
3. Panel should be gone
```

### Workaround 3: Wait 15 Minutes

Backend auto-clears after 15 minutes:
```
1. Leave it alone
2. Wait 15 minutes
3. Backend timeout clears tracking
4. Try new burn
```

### Workaround 4: Restart Server

```bash
# Stop server
Ctrl+C

# Start server
npm start
```

This clears all backend state.

## Prevention

### Prevent "Too Many Requests"

1. **Wait between burns**
   - Don't click "Burn" multiple times
   - Wait for completion

2. **Use rate limits**
   - Max 3 burns per 5 minutes
   - Wait if you hit limit

3. **Clear completed tasks**
   - Click "Clear Completed" regularly
   - Keep panel tidy

4. **Monitor progress**
   - Watch the progress bar
   - Don't start new burn until done

## Testing the Fix

### Test 1: Single Task Clear

```bash
1. Have 1 failed task
2. Click ✕ on the task
3. Console should show: "Dismissing task: burn-123..."
4. Task should disappear
5. ✓ Pass if task removed
```

### Test 2: Clear All

```bash
1. Have 2-3 completed tasks
2. Click "Clear All"
3. Console should show clearing logs
4. All tasks should disappear
5. Panel should disappear
6. ✓ Pass if all cleared
```

### Test 3: Clear Completed

```bash
1. Have 1 active + 2 completed
2. Click "Clear Completed"
3. Only completed should disappear
4. Active should remain
5. ✓ Pass if only completed cleared
```

## Updated Features

### New Buttons

1. **Clear All** (header)
   - Clears everything
   - Cancels active burns
   - Asks confirmation if active

2. **Clear Completed** (completed section)
   - Only clears completed/failed
   - No confirmation
   - Keeps active burns

3. **✕ Individual** (each task)
   - Removes single task
   - Works on any status
   - No confirmation

### Console Logging

All buttons now log to console:
```javascript
// Clear All
"Clearing all burns, current tasks: 3"
"Aborting 1 active burns"
"Clearing backend tracking..."
"Backend cleared successfully"
"Clearing UI tasks"
"All burns cleared"

// Dismiss
"Dismissing burn task: burn-1234567890"
"Tasks after dismiss: 2"

// Clear Completed
"Clearing completed tasks"
```

## If Still Not Working

### Report Issue

Include:
1. **Console logs** (F12 → Console)
2. **Network requests** (F12 → Network)
3. **React state** (React DevTools)
4. **Steps to reproduce**
5. **Browser and version**

### Temporary Solution

```javascript
// Emergency clear (paste in console)
window.location.reload();
```

Or just refresh the page (F5).

## Summary

**Quick fixes:**
1. Click ✕ on individual task
2. Click "Clear Completed"
3. Click "Clear All"
4. Refresh page (F5)

**Debug:**
1. Check console logs
2. Check network requests
3. Check React state
4. Try manual workarounds

**Prevent:**
1. Don't spam burn button
2. Wait between burns
3. Clear completed regularly
4. Monitor progress

The buttons should now work with proper logging for debugging!
