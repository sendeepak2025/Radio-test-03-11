# Orthanc Connection Issue - Why Series Are Still Missing

## The Problem

Your viewer still shows only 1 series because:

1. **Your backend** tries to connect to: `54.160.225.145:8042` (AWS Orthanc)
2. **This Orthanc is timing out** - connection fails after 21+ seconds
3. **Falls back to MongoDB** - which only has 1 series with 7 images
4. **OHIF works** because it's connecting to a DIFFERENT Orthanc server

## Evidence from Logs

```
Error fetching study 22a0e21b-4298f120-d41b64db-adaf693b-10354370: connect ETIMEDOUT 54.160.225.145:8042
✅ Loaded 1 series with 7 total instances for study (from MongoDB fallback)
```

The new code I added IS running, but Orthanc times out, so it falls back to MongoDB.

## Where is OHIF Getting the Data?

OHIF is running at `http://35.172.184.138:3000` (remote server), and it's configured to connect to an Orthanc that HAS all 17 series.

**Possible scenarios**:
1. OHIF is using a different Orthanc server (not `54.160.225.145:8042`)
2. OHIF's Orthanc is on the same network/server as OHIF itself
3. There's a local Orthanc proxy or gateway

## Solutions

### Solution 1: Find the Correct Orthanc URL (Recommended)

We need to find which Orthanc server OHIF is using that has all 17 series.

**Steps**:
1. Check OHIF's network requests in browser DevTools
2. Look for DICOMweb requests (qido-rs, wado-rs)
3. Find the Orthanc URL that returns all series
4. Update your backend to use that URL

**How to check**:
1. Open OHIF in browser: `http://35.172.184.138:3000`
2. Open DevTools (F12) → Network tab
3. Load the study
4. Look for requests to `/dicom-web/studies/...`
5. Check the request URL - that's the Orthanc server with all the data

### Solution 2: Use DICOMweb Directly

Instead of using Orthanc's REST API, use DICOMweb (QIDO-RS/WADO-RS) like OHIF does.

**Modify the backend to use DICOMweb**:

```javascript
// In studyController.js
async function getStudyMetadata(req, res) {
  try {
    const { studyUid } = req.params;
    
    // Use DICOMweb QIDO-RS to search for study
    const dicomwebUrl = 'http://YOUR_ORTHANC_URL/dicom-web';
    const searchUrl = `${dicomwebUrl}/studies?StudyInstanceUID=${studyUid}&includefield=all`;
    
    const response = await axios.get(searchUrl, {
      auth: {
        username: 'orthanc',
        password: 'orthanc'
      },
      headers: {
        'Accept': 'application/dicom+json'
      }
    });
    
    // Parse DICOMweb response
    const studies = response.data;
    if (studies.length === 0) {
      return res.status(404).json({ success: false, message: 'Study not found' });
    }
    
    const study = studies[0];
    
    // Get all series for this study
    const seriesUrl = `${dicomwebUrl}/studies/${studyUid}/series?includefield=all`;
    const seriesResponse = await axios.get(seriesUrl, {
      auth: {
        username: 'orthanc',
        password: 'orthanc'
      },
      headers: {
        'Accept': 'application/dicom+json'
      }
    });
    
    const seriesData = seriesResponse.data.map(series => ({
      seriesInstanceUID: series['0020000E'].Value[0],
      seriesNumber: series['00200011']?.Value[0] || '',
      seriesDescription: series['0008103E']?.Value[0] || '',
      modality: series['00080060']?.Value[0] || '',
      numberOfInstances: parseInt(series['00201209']?.Value[0]) || 0
    }));
    
    // Return metadata
    const metadata = {
      studyInstanceUID: studyUid,
      patientName: study['00100010']?.Value[0]?.Alphabetic || 'Unknown',
      patientID: study['00100020']?.Value[0] || 'Unknown',
      studyDate: study['00080020']?.Value[0] || '',
      studyTime: study['00080030']?.Value[0] || '',
      studyDescription: study['00081030']?.Value[0] || '',
      modality: study['00080060']?.Value[0] || '',
      numberOfSeries: seriesData.length,
      numberOfInstances: seriesData.reduce((sum, s) => sum + s.numberOfInstances, 0),
      series: seriesData
    };
    
    res.json({ success: true, data: metadata });
  } catch (error) {
    console.error('Error fetching from DICOMweb:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}
```

### Solution 3: Configure Backend to Use OHIF's Orthanc

If OHIF is using a local or accessible Orthanc, configure your backend to use the same one.

**Update `.env` file**:
```env
# Find the correct Orthanc URL from OHIF's network requests
ORTHANC_URL=http://CORRECT_ORTHANC_URL:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
```

### Solution 4: Set Up Orthanc Proxy/Tunnel

If OHIF's Orthanc is not directly accessible, set up an SSH tunnel or proxy.

**SSH Tunnel Example**:
```bash
# If Orthanc is on the same server as OHIF
ssh -L 8042:localhost:8042 user@35.172.184.138

# Then update .env
ORTHANC_URL=http://localhost:8042
```

## Immediate Action Required

### Step 1: Find OHIF's Orthanc URL

1. Open OHIF: `http://35.172.184.138:3000`
2. Open DevTools (F12) → Network tab
3. Load the study with 17 series
4. Filter by "dicom-web" or "studies"
5. Find a request like: `GET /dicom-web/studies/1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001/series`
6. Copy the base URL (everything before `/dicom-web`)

### Step 2: Test the Orthanc URL

```bash
# Replace with the URL you found
curl http://FOUND_ORTHANC_URL/studies

# Should return a list of study IDs
```

### Step 3: Update Backend Configuration

**Option A: Update .env file**
```env
ORTHANC_URL=http://FOUND_ORTHANC_URL
```

**Option B: Update unified-orthanc-service.js**
```javascript
this.config = {
  orthancUrl: config.orthancUrl || process.env.ORTHANC_URL || 'http://FOUND_ORTHANC_URL',
  // ...
};
```

### Step 4: Restart Backend

```bash
# Stop current server
# Start with new configuration
cd server
npm start
```

### Step 5: Test Your Viewer

```
http://localhost:3010/app/viewer/1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001
```

Should now show all 17 series!

## Why This Happened

1. **Multiple Orthanc Instances**: You have at least 2 Orthanc servers:
   - `54.160.225.145:8042` (AWS - timing out, incomplete data)
   - Unknown Orthanc that OHIF uses (has all 17 series)

2. **Network Issues**: The AWS Orthanc is either:
   - Down or unreachable
   - Behind a firewall
   - Overloaded
   - Has network latency issues

3. **Data Sync Issues**: MongoDB only has data from one Orthanc, not the other

## Long-term Fix

1. **Consolidate Orthanc Instances**: Use one Orthanc as the source of truth
2. **Implement Caching**: Cache Orthanc responses to avoid repeated slow queries
3. **Background Sync**: Sync all Orthanc data to MongoDB regularly
4. **Health Monitoring**: Monitor Orthanc connectivity and alert on failures

## Summary

**Current State**:
- Your backend → `54.160.225.145:8042` (timing out) → MongoDB fallback (1 series)
- OHIF → Unknown Orthanc (working) → All 17 series

**Required Action**:
1. Find OHIF's Orthanc URL from browser DevTools
2. Update your backend to use that URL
3. Restart backend
4. Test viewer

Once you find the correct Orthanc URL, I can help you update the configuration!
