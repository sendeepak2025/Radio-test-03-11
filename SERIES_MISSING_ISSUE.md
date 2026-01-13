# Series Missing Issue: Why Your Viewer Shows 1 Series Instead of 17

## Problem Summary

**OHIF Viewer**: Shows 17 series for patient BAKER JR^MARK  
**Your Viewer**: Shows only 1 series with 7 images

## Root Cause

Your backend's `getStudyMetadata` endpoint only queries the MongoDB `Instance` collection, which only has 7 instances stored. It's **not fetching all series from Orthanc**.

OHIF queries Orthanc directly via DICOMweb and gets all 17 series:
- OT 4DM-ACImages+Quant (S:1, 1 image)
- OT 4DM-MPISummary (S:1, 8 images)
- OT 4DM-ACFunc+Quant (S:1, 8 images)
- OT 4DM-ACImages (S:1, 1 image)
- OT 4DM-Dyssynchrony (S:1, 8 images)
- PT PET Statistics (S:4, 12 images)
- CT AC CT Rest 4.0 HD_FoV (S:2, 42 images)
- PT PET Rest Cardiac NAC (S:3, 42 images)
- CT AC CT Stress 4.0 HD_FoV (S:8, 42 images)
- PT PET Stress Cardiac AC (S:10, 42 images)
- PT PET Rest Cardiac AC St (S:6, 42 images)
- PT PET Rest Cardiac Gated (S:7, 336 images)
- CT Patient Protocol (S:501, 1 image)
- PT PET Stress Cardiac Gated (S:11, 336 images)
- PT PET Stress Cardiac NA (S:9, 42 images)
- PT PET Rest Cardiac Dyna (S:5, 1218 images)
- PT PET Stress Cardiac Dyn (S:12, 1218 images)

**Total**: 17 series, 3,399 images!

---

## Why This Happens

### Current Flow (Broken):

```
User opens study
    ↓
Frontend calls: GET /api/dicom/studies/{studyUID}/metadata
    ↓
Backend queries: MongoDB Instance collection
    ↓
MongoDB only has 7 instances (incomplete data)
    ↓
Returns: 1 series with 7 images
```

### What Should Happen:

```
User opens study
    ↓
Frontend calls: GET /api/dicom/studies/{studyUID}/metadata
    ↓
Backend queries: Orthanc PACS directly
    ↓
Orthanc has all 17 series with 3,399 images
    ↓
Returns: Complete study metadata
```

---

## The Fix

### Option 1: Query Orthanc Directly (Recommended)

Modify `server/src/controllers/studyController.js` to fetch series from Orthanc:

```javascript
async function getStudyMetadata(req, res) {
  try {
    const { studyUid } = req.params;
    
    // First try to get from Orthanc
    try {
      const { getUnifiedOrthancService } = require('../services/unified-orthanc-service');
      const orthancService = getUnifiedOrthancService();
      
      // Find study in Orthanc by StudyInstanceUID
      const studiesResponse = await orthancService.axiosInstance.get('/studies');
      const studyIds = studiesResponse.data;
      
      for (const orthancStudyId of studyIds) {
        const tagsResponse = await orthancService.axiosInstance.get(
          `/studies/${orthancStudyId}/simplified-tags`
        );
        const tags = tagsResponse.data;
        
        if (tags.StudyInstanceUID === studyUid) {
          // Found the study! Now get all series
          const studyResponse = await orthancService.axiosInstance.get(
            `/studies/${orthancStudyId}`
          );
          const studyData = studyResponse.data;
          
          // Get detailed series information
          const seriesData = [];
          
          for (const orthancSeriesId of studyData.Series || []) {
            const seriesResponse = await orthancService.axiosInstance.get(
              `/series/${orthancSeriesId}`
            );
            const seriesTags = await orthancService.axiosInstance.get(
              `/series/${orthancSeriesId}/simplified-tags`
            );
            
            const series = seriesResponse.data;
            const seriesTagsData = seriesTags.data;
            
            // Get instances for this series
            const instances = [];
            for (const orthancInstanceId of series.Instances || []) {
              const instanceTags = await orthancService.axiosInstance.get(
                `/instances/${orthancInstanceId}/simplified-tags`
              );
              
              instances.push({
                sopInstanceUID: instanceTags.data.SOPInstanceUID,
                instanceNumber: parseInt(instanceTags.data.InstanceNumber) || 1,
                orthancInstanceId: orthancInstanceId
              });
            }
            
            seriesData.push({
              seriesInstanceUID: seriesTagsData.SeriesInstanceUID,
              seriesNumber: seriesTagsData.SeriesNumber || '',
              seriesDescription: seriesTagsData.SeriesDescription || '',
              modality: seriesTagsData.Modality || tags.Modality || 'OT',
              numberOfInstances: instances.length,
              instances: instances,
              orthancSeriesId: orthancSeriesId
            });
          }
          
          // Sort series by series number
          seriesData.sort((a, b) => {
            const aNum = parseInt(a.seriesNumber) || 0;
            const bNum = parseInt(b.seriesNumber) || 0;
            return aNum - bNum;
          });
          
          const totalInstances = seriesData.reduce(
            (sum, s) => sum + s.numberOfInstances, 
            0
          );
          
          const metadata = {
            studyInstanceUID: studyUid,
            patientName: tags.PatientName || 'Unknown',
            patientID: tags.PatientID || 'Unknown',
            studyDate: tags.StudyDate || '',
            studyTime: tags.StudyTime || '',
            studyDescription: tags.StudyDescription || '',
            modality: tags.Modality || 'OT',
            accessionNumber: tags.AccessionNumber || '',
            numberOfSeries: seriesData.length,
            numberOfInstances: totalInstances,
            series: seriesData
          };
          
          console.log(`✅ Loaded ${seriesData.length} series with ${totalInstances} total instances from Orthanc`);
          
          return res.json({ success: true, data: metadata });
        }
      }
    } catch (orthancError) {
      console.warn('⚠️ Failed to fetch from Orthanc, falling back to database:', orthancError.message);
    }
    
    // Fallback to existing database logic
    let study = await Study.findOne({ studyInstanceUID: studyUid }).lean();
    if (!study) {
      return res.status(404).json({ success: false, message: 'Study not found' });
    }
    
    // ... rest of existing code for database fallback ...
    
  } catch (e) {
    console.error('❌ Error in getStudyMetadata:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}
```

### Option 2: Sync All Series to MongoDB

Create a background job that syncs all series from Orthanc to MongoDB:

```javascript
// server/src/services/orthanc-sync-service.js

async function syncStudyFromOrthanc(studyInstanceUID) {
  const orthancService = getUnifiedOrthancService();
  
  // Find study in Orthanc
  const studiesResponse = await orthancService.axiosInstance.get('/studies');
  const studyIds = studiesResponse.data;
  
  for (const orthancStudyId of studyIds) {
    const tagsResponse = await orthancService.axiosInstance.get(
      `/studies/${orthancStudyId}/simplified-tags`
    );
    const tags = tagsResponse.data;
    
    if (tags.StudyInstanceUID === studyInstanceUID) {
      const studyResponse = await orthancService.axiosInstance.get(
        `/studies/${orthancStudyId}`
      );
      const studyData = studyResponse.data;
      
      // Sync all series
      for (const orthancSeriesId of studyData.Series || []) {
        const seriesResponse = await orthancService.axiosInstance.get(
          `/series/${orthancSeriesId}`
        );
        const seriesTags = await orthancService.axiosInstance.get(
          `/series/${orthancSeriesId}/simplified-tags`
        );
        
        const series = seriesResponse.data;
        const seriesTagsData = seriesTags.data;
        
        // Sync all instances in this series
        for (const orthancInstanceId of series.Instances || []) {
          const instanceTags = await orthancService.axiosInstance.get(
            `/instances/${orthancInstanceId}/simplified-tags`
          );
          
          // Upsert instance to MongoDB
          await Instance.findOneAndUpdate(
            { 
              studyInstanceUID: studyInstanceUID,
              seriesInstanceUID: seriesTagsData.SeriesInstanceUID,
              sopInstanceUID: instanceTags.data.SOPInstanceUID
            },
            {
              studyInstanceUID: studyInstanceUID,
              seriesInstanceUID: seriesTagsData.SeriesInstanceUID,
              seriesNumber: seriesTagsData.SeriesNumber,
              seriesDescription: seriesTagsData.SeriesDescription,
              sopInstanceUID: instanceTags.data.SOPInstanceUID,
              instanceNumber: parseInt(instanceTags.data.InstanceNumber) || 1,
              modality: seriesTagsData.Modality,
              orthancInstanceId: orthancInstanceId,
              orthancSeriesId: orthancSeriesId,
              orthancStudyId: orthancStudyId
            },
            { upsert: true, new: true }
          );
        }
      }
      
      console.log(`✅ Synced all series for study ${studyInstanceUID}`);
      return true;
    }
  }
  
  return false;
}
```

---

## Immediate Action Required

### Step 1: Apply the Fix

I'll create a new version of the `getStudyMetadata` function that queries Orthanc directly.

### Step 2: Test with Your Study

```bash
# Test the endpoint directly
curl http://localhost:8001/api/dicom/studies/1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001/metadata
```

You should see all 17 series in the response.

### Step 3: Verify in Your Viewer

Navigate to:
```
http://localhost:3010/app/viewer/1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001
```

You should now see all 17 series in the series selector!

---

## Why MongoDB Only Has 7 Instances

The MongoDB database only has 7 instances because:

1. **Incomplete Upload**: When the study was uploaded, only 7 instances were saved to MongoDB
2. **Partial Sync**: The sync process didn't fetch all series from Orthanc
3. **Database Migration**: The study might have been uploaded directly to Orthanc, bypassing MongoDB

The solution is to always query Orthanc as the source of truth, or implement a complete sync process.

---

## Performance Considerations

Querying Orthanc directly for every request will be slow (21+ seconds as we saw). Here's the optimization strategy:

### 1. Cache Orthanc Responses

```javascript
const studyMetadataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check cache first
const cached = studyMetadataCache.get(studyUid);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return res.json(cached.data);
}

// Fetch from Orthanc and cache
const metadata = await fetchFromOrthanc(studyUid);
studyMetadataCache.set(studyUid, {
  data: metadata,
  timestamp: Date.now()
});
```

### 2. Background Sync Job

Run a cron job every hour to sync all studies from Orthanc to MongoDB:

```javascript
// server/src/jobs/orthanc-sync-job.js
const cron = require('node-cron');

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('🔄 Starting Orthanc sync job...');
  
  const orthancService = getUnifiedOrthancService();
  const studiesResponse = await orthancService.axiosInstance.get('/studies');
  
  for (const orthancStudyId of studiesResponse.data) {
    try {
      await syncStudyFromOrthanc(orthancStudyId);
    } catch (error) {
      console.error(`Failed to sync study ${orthancStudyId}:`, error.message);
    }
  }
  
  console.log('✅ Orthanc sync job completed');
});
```

### 3. Lazy Loading

Load series metadata on-demand as the user navigates:

```javascript
// Only load series list initially
GET /api/dicom/studies/{studyUID}/series

// Load series details when selected
GET /api/dicom/studies/{studyUID}/series/{seriesUID}/instances
```

---

## Summary

**Problem**: Your backend only queries MongoDB, which has incomplete data (7 instances instead of 3,399)

**Solution**: Query Orthanc directly to get all series

**Impact**: Your viewer will now show all 17 series just like OHIF

**Next Steps**:
1. Apply the fix to `getStudyMetadata`
2. Implement caching for performance
3. Add background sync job for MongoDB
4. Test with the study

Let me create the fixed version of the controller now!
