# Fix: "Too Many Requests" Error

## Problem

Getting "Too many requests" error when trying to burn CDs, even after previous burns complete.

## Root Causes

1. **No cleanup** - Temp files not deleted after burn
2. **No concurrency control** - Multiple burns can run simultaneously
3. **Rate limit too high** - 5 burns per minute was too many
4. **Resources not released** - Burn operations held resources

## Fixes Applied

### 1. Automatic Cleanup

**Before:**
- Temp files stayed on disk after burn
- Resources held indefinitely
- Disk filled up over time

**After:**
```javascript
// Always cleanup temp files
try {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
} finally {
  // Cleanup happens even if burn fails
}
```

### 2. Prevent Concurrent Burns

**New middleware prevents multiple burns per user:**

```javascript
// Only one burn at a time per user
if (activeBurns.has(userId)) {
  return res.status(429).json({
    message: 'A burn operation is already in progress.'
  });
}
```

**Features:**
- Tracks active burns per user
- Prevents clicking "Burn" multiple times
- Auto-cleanup after 15 minutes (timeout)
- Releases resources when done

### 3. Reduced Rate Limits

**Before:**
- 5 burns per minute (too many)

**After:**
- 3 burns per 5 minutes (more reasonable)
- Prevents server overload
- Allows time for cleanup

### 4. Better Error Messages

**Frontend now shows specific errors:**

```typescript
// "Too many requests" → Clear message
if (errorMsg.includes("already in progress")) {
  setError("A burn operation is already in progress. Please wait.");
}

if (errorMsg.includes("Too many requests")) {
  setError("Too many burn requests. Please wait a few minutes.");
}
```

## How It Works Now

### Burn Flow:

```
1. User clicks "Burn to CD/DVD"
   ↓
2. Check: Is another burn in progress?
   ├─ YES → Show error "Already in progress"
   └─ NO → Continue
   ↓
3. Mark burn as active
   ↓
4. Create temp files
   ↓
5. Burn to disc
   ↓
6. Cleanup temp files (always)
   ↓
7. Mark burn as complete
   ↓
8. Release resources
```

### Concurrency Control:

```
User A: Burn Study 1 → [IN PROGRESS]
User A: Burn Study 2 → ❌ "Already in progress"
User B: Burn Study 3 → ✅ Allowed (different user)

After User A completes:
User A: Burn Study 2 → ✅ Now allowed
```

### Rate Limiting:

```
Minute 0: Burn 1 ✅
Minute 1: Burn 2 ✅
Minute 2: Burn 3 ✅
Minute 3: Burn 4 ❌ "Too many requests, wait 2 minutes"
Minute 5: Burn 4 ✅ (rate limit reset)
```

## User Experience

### Before:
1. Click "Burn" → Works
2. Click "Burn" again → Works
3. Click "Burn" again → Works
4. Click "Burn" again → ❌ "Too many requests"
5. Wait... still getting errors
6. Temp files filling disk

### After:
1. Click "Burn" → Works, shows "Processing..."
2. Click "Burn" again → ❌ "Already in progress, please wait"
3. First burn completes → Temp files cleaned up
4. Click "Burn" again → ✅ Works
5. Resources properly released

## What Changed

### Backend (`server/src/routes/export.js`):
- ✅ Added `preventConcurrentBurns` middleware
- ✅ Reduced rate limit: 3 per 5 minutes
- ✅ Tracks active burns per user
- ✅ Auto-cleanup after 15 minutes

### Backend (`server/src/controllers/exportController.js`):
- ✅ Added `cleanupTempFiles()` function
- ✅ Cleanup in `finally` block (always runs)
- ✅ Cleanup on error
- ✅ Proper resource management

### Frontend (`viewer/src/pages/patients/PatientsPage.tsx`):
- ✅ Prevent multiple clicks while burning
- ✅ Better error messages
- ✅ Handle "already in progress" error
- ✅ Handle "too many requests" error

## Testing

### Test Scenario 1: Single Burn
```
1. Click "Burn to CD/DVD"
2. Wait for completion
3. Check: Temp files deleted ✅
4. Check: Can burn again ✅
```

### Test Scenario 2: Multiple Clicks
```
1. Click "Burn to CD/DVD"
2. Immediately click again
3. Should see: "Already in progress" ✅
4. Wait for first to complete
5. Click again
6. Should work ✅
```

### Test Scenario 3: Rate Limit
```
1. Burn 3 discs in 5 minutes ✅
2. Try 4th burn
3. Should see: "Too many requests" ✅
4. Wait 5 minutes
5. Try again
6. Should work ✅
```

### Test Scenario 4: Error Handling
```
1. Start burn
2. Remove disc mid-burn
3. Burn fails
4. Check: Temp files still cleaned up ✅
5. Check: Can burn again ✅
```

## Monitoring

### Check Active Burns:
```javascript
// In server console
console.log('Active burns:', activeBurns.size);
```

### Check Temp Files:
```bash
# Windows
dir %TEMP%\pacs-export-*

# Should be empty after burns complete
```

### Check Rate Limits:
```bash
# Try burning 4 times quickly
# 4th should fail with "Too many requests"
```

## Troubleshooting

### Still Getting "Too Many Requests"?

**Check 1: Wait 5 minutes**
- Rate limit resets every 5 minutes
- Just wait and try again

**Check 2: Check for stuck burns**
```javascript
// Restart server to clear stuck burns
npm restart
```

**Check 3: Check temp disk space**
```bash
# Windows
dir %TEMP%

# If full, manually delete old files
del %TEMP%\pacs-export-* /s /q
```

### "Already in Progress" Won't Clear?

**Auto-clears after 15 minutes**
- Timeout protection prevents stuck burns
- Or restart server

**Manual clear:**
```javascript
// Restart server
npm restart
```

## Configuration

### Adjust Rate Limits:

Edit `server/src/routes/export.js`:

```javascript
// More restrictive (1 per 10 minutes)
rateLimit({ maxRequests: 1, windowMs: 600000 })

// Less restrictive (5 per 5 minutes)
rateLimit({ maxRequests: 5, windowMs: 300000 })

// Current (3 per 5 minutes)
rateLimit({ maxRequests: 3, windowMs: 300000 })
```

### Adjust Timeout:

```javascript
// Change 15 minute timeout
setTimeout(() => {
  activeBurns.delete(userId);
}, 900000); // 900000ms = 15 minutes

// Shorter timeout (5 minutes)
}, 300000); // 300000ms = 5 minutes
```

## Best Practices

### For Users:
1. **Wait for completion** - Don't click multiple times
2. **One at a time** - Burn one disc, then next
3. **Check success** - Verify burn completed before next
4. **Be patient** - Burning takes 5-10 minutes

### For Admins:
1. **Monitor disk space** - Check temp folder regularly
2. **Monitor rate limits** - Adjust if needed
3. **Check logs** - Look for cleanup errors
4. **Restart if stuck** - Clears all active burns

## Summary

**Problem:** Too many requests, resources not released

**Solution:**
- ✅ Automatic cleanup of temp files
- ✅ Prevent concurrent burns per user
- ✅ Reduced rate limits (3 per 5 minutes)
- ✅ Better error messages
- ✅ Proper resource management

**Result:** Burn operations now properly clean up and release resources after completion or failure.
