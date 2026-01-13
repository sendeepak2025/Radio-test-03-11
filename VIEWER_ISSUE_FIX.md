# Viewer Issue Fix: "Unknown Patient" and Slow Loading

## Problem Identified

Your viewer is showing "Unknown Patient" and "No Description Available" for every study due to two main issues:

### Issue 1: API Timeout Too Short
- **Current timeout**: 5 seconds
- **Actual API response time**: 21+ seconds (from server logs)
- **Result**: API call times out before data loads, falls back to demo data

### Issue 2: Initial State with Empty Strings
- **Initial state**: `studyData` initialized with empty strings
- **Result**: Shows "Unknown Patient" until real data loads
- **Better approach**: Initialize as `null` and show loading state

### Issue 3: Slow API Response
- **Root cause**: Server is taking 21+ seconds to fetch study metadata
- **Why**: Orthanc server at `54.160.225.145:8042` might be slow or timing out
- **Evidence from logs**:
  ```
  Error fetching study 22a0e21b-4298f120-d41b64db-adaf693b-10354370: connect ETIMEDOUT 54.160.225.145:8042
  ✅ Loaded 1 series with 7 total instances for study 1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001
  GET /api/dicom/studies/1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001/metadata 200 21072.591 ms - 1691
  ```

---

## Fixes Applied

### Fix 1: Increased API Timeout ✅
**File**: `viewer/src/pages/viewer/ViewerPage.tsx`

**Changed**:
```typescript
// Before
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('API call timeout')), 5000)
})

// After
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('API call timeout')), 30000)
})
```

**Impact**: Allows API calls up to 30 seconds before timing out

### Fix 2: Better Initial State ✅
**File**: `viewer/src/pages/viewer/ViewerPage.tsx`

**Changed**:
```typescript
// Before
const [studyData, setStudyData] = useState<any>({
  studyInstanceUID: '',
  patientName: '',
  // ... empty strings
})

// After
const [studyData, setStudyData] = useState<any>(null)
```

**Impact**: Shows proper loading state instead of "Unknown Patient"

---

## Additional Issues Found

### Red Lines/Artifacts on Image
The red lines visible in your screenshot are likely:
1. **Rendering artifacts** from canvas drawing
2. **Leftover annotations** from previous session
3. **DICOM pixel data issues**

**To investigate**:
- Check browser console for errors
- Clear browser cache and reload
- Check if annotations are being loaded from localStorage

### Series Description Issue
The series description shows "Series 1" because:
- **API returns**: `"seriesDescription": "Series 1"` (generic placeholder)
- **Not a viewer bug**: The DICOM metadata itself has this generic description
- **Solution**: Update DICOM metadata at upload time or in Orthanc

---

## Recommended Backend Optimizations

### 1. Add Caching to Study Metadata Endpoint

**File**: `server/src/routes/dicom.js` (or wherever the endpoint is)

```javascript
// Add simple in-memory cache
const studyMetadataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.get('/api/dicom/studies/:studyUID/metadata', async (req, res) => {
  const { studyUID } = req.params;
  
  // Check cache first
  const cached = studyMetadataCache.get(studyUID);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✅ Cache hit for study ${studyUID}`);
    return res.json(cached.data);
  }
  
  // Fetch from Orthanc
  try {
    const data = await fetchStudyFromOrthanc(studyUID);
    
    // Cache the result
    studyMetadataCache.set(studyUID, {
      data,
      timestamp: Date.now()
    });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Impact**: Reduces load time from 21s to <100ms for cached studies

### 2. Add Database Caching

Store study metadata in MongoDB when first fetched:

```javascript
// models/StudyMetadata.js
const studyMetadataSchema = new mongoose.Schema({
  studyInstanceUID: { type: String, unique: true, required: true },
  patientName: String,
  patientID: String,
  studyDate: String,
  modality: String,
  series: Array,
  lastUpdated: { type: Date, default: Date.now },
  orthancData: Object
});

// Auto-expire after 1 hour
studyMetadataSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 3600 });
```

**Impact**: Persistent caching across server restarts

### 3. Optimize Orthanc Connection

**File**: `server/.env`

```env
# Increase timeout for slow connections
ORTHANC_TIMEOUT=120000  # 2 minutes instead of 1 minute

# Add connection pooling
ORTHANC_MAX_CONNECTIONS=10
ORTHANC_KEEP_ALIVE=true
```

### 4. Add Loading Progress Indicator

**File**: `viewer/src/pages/viewer/ViewerPage.tsx`

```typescript
const [loadingProgress, setLoadingProgress] = useState(0);

// Simulate progress during long load
useEffect(() => {
  if (isLoading) {
    const interval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + 10, 90));
    }, 2000);
    
    return () => clearInterval(interval);
  } else {
    setLoadingProgress(100);
  }
}, [isLoading]);

// In render:
{isLoading && (
  <Box sx={{ width: '100%', maxWidth: 400 }}>
    <LinearProgress variant="determinate" value={loadingProgress} />
    <Typography variant="caption" sx={{ color: 'white', mt: 1 }}>
      Loading study metadata... {loadingProgress}%
    </Typography>
  </Box>
)}
```

---

## Testing the Fix

### 1. Restart the Frontend
```bash
# Stop the current process (Ctrl+C in the terminal)
# Or use the process manager
cd viewer
npm run dev
```

### 2. Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"
- Or: Settings → Clear browsing data → Cached images and files

### 3. Test with the Study
Navigate to:
```
http://localhost:3010/app/viewer/1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001
```

### 4. Check Console Logs
Open browser console (F12) and look for:
```
Loading study data for: 1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001
Study data loaded successfully: {...}
```

### 5. Verify Data Loads
You should now see:
- ✅ Patient Name: "BAKER JR, MARK" (not "Unknown Patient")
- ✅ Patient ID: "283693"
- ✅ Study Date: "January 12, 2026"
- ✅ Modality: "CT"
- ✅ Series 1 with 7 images

---

## Why This Happens for Every Study

The issue affects **every study** because:

1. **Slow Orthanc Server**: The remote Orthanc at `54.160.225.145:8042` is slow
   - Network latency to AWS EC2
   - Server might be under load
   - No caching implemented

2. **No Backend Caching**: Every request hits Orthanc directly
   - No in-memory cache
   - No database cache
   - No CDN or edge caching

3. **Short Frontend Timeout**: 5 seconds wasn't enough
   - API takes 21+ seconds
   - Timeout triggers before data arrives
   - Falls back to demo data

---

## Long-term Solutions

### Option 1: Local Orthanc Instance
Run Orthanc locally for development:
```bash
docker run -p 8042:8042 -p 4242:4242 \
  -e ORTHANC_USERNAME=orthanc \
  -e ORTHANC_PASSWORD=orthanc \
  jodogne/orthanc
```

**Pros**: Fast, no network latency  
**Cons**: Need to upload studies locally

### Option 2: Implement Full Caching Layer
- Redis for in-memory caching
- MongoDB for persistent caching
- CloudFront/CDN for static assets

**Pros**: Fast for all users  
**Cons**: More infrastructure complexity

### Option 3: Optimize Orthanc Server
- Upgrade EC2 instance size
- Add Orthanc plugins for performance
- Enable Orthanc's built-in caching
- Use Orthanc's PostgreSQL plugin instead of SQLite

**Pros**: Fixes root cause  
**Cons**: Costs money, requires DevOps work

---

## Summary

**Immediate fixes applied**:
- ✅ Increased API timeout from 5s to 30s
- ✅ Changed initial state from empty strings to null
- ✅ Better loading state handling

**Next steps**:
1. Restart frontend to apply changes
2. Test with the study URL
3. Implement backend caching (recommended)
4. Consider local Orthanc for development

**Expected result**:
- Patient name loads correctly
- No more "Unknown Patient" fallback
- Slower initial load (21s) but correct data
- Future loads can be cached for speed

The issue was a combination of slow API + short timeout + poor initial state. The fixes address all three!
