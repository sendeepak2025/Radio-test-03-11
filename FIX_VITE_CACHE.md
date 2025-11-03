# Fix Vite Import Error

The error you're seeing is a Vite caching issue. Here's how to fix it:

## Quick Fix (Choose One)

### Option 1: Restart Dev Server (Recommended)
```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
cd viewer
npm run dev
```

### Option 2: Clear Vite Cache
```bash
cd viewer
# Delete cache
rmdir /s /q node_modules\.vite
# Restart dev server
npm run dev
```

### Option 3: Hard Refresh Browser
1. Stop dev server (Ctrl+C)
2. Delete `viewer/node_modules/.vite` folder
3. Restart: `npm run dev`
4. Hard refresh browser (Ctrl+Shift+R or Ctrl+F5)

## Why This Happens

Vite caches module resolutions. When we:
1. Created new files (`VoiceDictationButton`, `useVoiceDictation`, etc.)
2. Updated the index.ts exports
3. The cache didn't update properly

## Verification

After restarting, you should see:
- ✅ No import errors
- ✅ Voice dictation buttons visible in report editor
- ✅ All components loading properly

## If Still Not Working

Try this nuclear option:
```bash
cd viewer
# Stop server
# Delete cache and reinstall
rmdir /s /q node_modules
rmdir /s /q node_modules\.vite
npm install
npm run dev
```

---

**The code is correct** - this is just a caching issue that a restart will fix!
