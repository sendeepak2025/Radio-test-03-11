# 🔄 Complete Flow: AI Findings → Canvas → Screenshots → Report

## Current Status

### ✅ What Works:
1. AI analysis runs and completes
2. AI overlay service can render detections
3. Screenshot service can capture canvas
4. Toolbar buttons exist

### ❌ What's Missing:
1. AI detections NOT loaded into overlay service
2. Screenshots NOT shown in report editor
3. No connection between viewer and report

## Complete Implementation Plan

### Phase 1: Load AI Detections into Overlay

**File:** `viewer/src/components/ai/AutoAnalysisPopup.tsx`

Add after analysis completes:

```typescript
import { aiOverlayService } from '../../services/aiOverlayService';

// When analysis completes, load detections
useEffect(() => {
  if (allComplete && analyses.size > 0) {
    // Get first analysis (or combine all)
    const firstAnalysis = Array.from(analyses.values())[0];
    
    if (firstAnalysis?.results) {
      loadAIDetectionsIntoOverlay(firstAnalysis.results);
    }
  }
}, [allComplete, analyses]);

const loadAIDetectionsIntoOverlay = (results: any) => {
  if (!results.detections || results.detections.length === 0) {
    console.log('⚠️ No AI detections found');
    return;
  }
  
  const detections = results.detections.map((d: any, idx: number) => {
    // Normalize bbox coordinates (0-1)
    let bbox = d.bbox || d.boundingBox || [0.3, 0.3, 0.2, 0.2];
    
    // If bbox is in pixel coordinates, normalize
    if (bbox[0] > 1) {
      const imageWidth = results.imageWidth || 512;
      const imageHeight = results.imageHeight || 512;
      bbox = [
        bbox[0] / imageWidth,
        bbox[1] / imageHeight,
        bbox[2] / imageWidth,
        bbox[3] / imageHeight
      ];
    }
    
    return {
      id: `ai-det-${idx}`,
      label: d.label || d.type || 'Finding',
      bbox: bbox,
      confidence: d.confidence || d.score || 0.5,
      severity: d.severity || determineSeverity(d.confidence),
      description: d.description || `${d.label || 'Finding'} detected`
    };
  });
  
  aiOverlayService.setDetections(detections);
  console.log('🎯 Loaded', detections.length, 'AI detections into overlay');
};

const determineSeverity = (confidence: number): string => {
  if (confidence > 0.9) return 'severe';
  if (confidence > 0.7) return 'moderate';
  if (confidence > 0.5) return 'mild';
  return 'normal';
};
```

### Phase 2: Add Key Images to Report Editor

**File:** `viewer/src/components/reports/ProductionReportEditor.tsx`

Add imports:

```typescript
import { screenshotService, type CapturedImage } from '../../services/screenshotService';
import {
  Image as ImageIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon
} from '@mui/icons-material';
```

Add state:

```typescript
const [keyImages, setKeyImages] = useState<CapturedImage[]>([]);
const [activeTab, setActiveTab] = useState(0); // If not already there
```

Load images:

```typescript
useEffect(() => {
  // Load captured images
  const images = screenshotService.getCapturedImages();
  setKeyImages(images);
  console.log('📸 Loaded', images.length, 'captured images');
}, []);

// Refresh images periodically or on focus
useEffect(() => {
  const interval = setInterval(() => {
    setKeyImages([...screenshotService.getCapturedImages()]);
  }, 2000);
  
  return () => clearInterval(interval);
}, []);
```

Add new tab (find the Tabs component):

```typescript
<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
  <Tab label="Report Content" icon={<ReportIcon />} />
  <Tab label="Structured Findings" icon={<AssignmentIcon />} />
  <Tab label="Key Images" icon={<ImageIcon />} /> {/* NEW */}
  <Tab label="Signature" icon={<CheckIcon />} />
</Tabs>
```

Add tab content (after other tab panels):

```typescript
{/* Key Images Tab */}
{activeTab === 2 && (
  <Box sx={{ p: 3 }}>
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h6">
        Key Images ({keyImages.length})
      </Typography>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ImageIcon />}
        onClick={() => {
          alert('Switch to viewer and click the Camera button to capture images');
        }}
      >
        Capture More Images
      </Button>
    </Box>
    
    {keyImages.length === 0 ? (
      <Alert severity="info">
        <Typography variant="body2" gutterBottom>
          <strong>No images captured yet</strong>
        </Typography>
        <Typography variant="body2">
          1. Open the medical image viewer<br />
          2. Navigate to the frame showing the finding<br />
          3. Click the <strong>Camera</strong> button in the toolbar<br />
          4. Images will appear here automatically
        </Typography>
      </Alert>
    ) : (
      <Grid container spacing={2}>
        {keyImages.map((image, index) => (
          <Grid item xs={12} md={6} key={image.id}>
            <Card variant="outlined">
              <CardMedia
                component="img"
                image={image.dataUrl}
                alt={image.caption}
                sx={{
                  maxHeight: 300,
                  objectFit: 'contain',
                  bgcolor: 'black',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  // Open in new window for full view
                  const win = window.open();
                  if (win) {
                    win.document.write(`<img src="${image.dataUrl}" style="max-width:100%"/>`);
                  }
                }}
              />
              <CardContent>
                <TextField
                  fullWidth
                  label={`Image ${index + 1} Caption`}
                  value={image.caption}
                  onChange={(e) => {
                    screenshotService.updateCaption(image.id, e.target.value);
                    setKeyImages([...screenshotService.getCapturedImages()]);
                  }}
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Describe what this image shows..."
                />
                
                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  <Chip 
                    label={`Frame ${image.metadata.frameIndex + 1}`} 
                    size="small" 
                    variant="outlined"
                  />
                  {image.metadata.hasAIOverlay && (
                    <Chip 
                      label="AI Overlay" 
                      size="small" 
                      color="primary" 
                    />
                  )}
                  {image.metadata.hasAnnotations && (
                    <Chip 
                      label="Annotations" 
                      size="small" 
                      color="secondary" 
                    />
                  )}
                  <Chip 
                    label={new Date(image.timestamp).toLocaleTimeString()} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
                
                <Box mt={2} display="flex" gap={1}>
                  <Tooltip title="Download Image">
                    <IconButton
                      size="small"
                      onClick={() => screenshotService.downloadImage(image.id, `finding-${index + 1}.png`)}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Remove Image">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm('Remove this image?')) {
                          screenshotService.removeImage(image.id);
                          setKeyImages([...screenshotService.getCapturedImages()]);
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    )}
    
    {keyImages.length > 0 && (
      <Box mt={3}>
        <Alert severity="success">
          <Typography variant="body2">
            ✅ {keyImages.length} image(s) will be included in the final report
          </Typography>
        </Alert>
      </Box>
    )}
  </Box>
)}
```

### Phase 3: Include Images in Report Save

When saving report, include images:

```typescript
const handleSaveReport = async () => {
  try {
    setSaving(true);
    
    // Get captured images
    const images = screenshotService.exportForReport();
    
    const reportData = {
      studyInstanceUID,
      patientInfo,
      sections: reportSections,
      findings: findingsText,
      impression,
      recommendations,
      structuredFindings,
      keyImages: images, // Include images
      aiDetections: aiDetections,
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    
    const response = await axios.post(`${API_URL}/api/reports`, reportData, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    
    console.log('✅ Report saved with', images.length, 'images');
    onReportCreated?.(response.data.reportId);
    
  } catch (error) {
    console.error('❌ Save failed:', error);
  } finally {
    setSaving(false);
  }
};
```

### Phase 4: Backend - Store Images

**File:** `server/src/models/Report.js` (or wherever reports are stored)

Add to schema:

```javascript
const reportSchema = new mongoose.Schema({
  // ... existing fields
  keyImages: [{
    id: String,
    dataUrl: String, // Base64 image data
    caption: String,
    timestamp: Date,
    metadata: {
      studyUID: String,
      frameIndex: Number,
      hasAIOverlay: Boolean,
      hasAnnotations: Boolean
    }
  }],
  aiDetections: [{
    id: String,
    label: String,
    bbox: [Number], // [x, y, w, h]
    confidence: Number,
    severity: String
  }]
});
```

## Complete User Flow

### 1. Run AI Analysis
```
User opens study → Clicks "Auto Analysis" → AI runs → Detections found
```

### 2. View AI Overlays
```
AI completes → Detections loaded into overlay service → Viewer shows colored boxes
```

### 3. Capture Key Images
```
User navigates to important frames → Clicks Camera button → Screenshots saved
```

### 4. Create Report
```
User clicks "Create Structured Report" → Opens reporting page
```

### 5. Review Images
```
Report editor → Key Images tab → Shows all captured screenshots
```

### 6. Edit Captions
```
User adds descriptions to each image → "Axial view showing 3cm mass"
```

### 7. Save Report
```
User saves → Report includes findings + images → Stored in database
```

### 8. Sign Report
```
User reviews → Signs → Report finalized with embedded images
```

## Testing Checklist

- [ ] AI analysis completes successfully
- [ ] Detections appear as colored boxes on canvas
- [ ] AI toggle button shows/hides overlays
- [ ] Camera button captures screenshot
- [ ] Screenshot includes AI overlays when visible
- [ ] Images appear in report editor Key Images tab
- [ ] Can edit image captions
- [ ] Can remove unwanted images
- [ ] Can download individual images
- [ ] Report saves with images included
- [ ] Signed report includes all images

## Quick Test Commands

```javascript
// Test AI overlay
aiOverlayService.setDetections([
  {id:'1', label:'Mass', bbox:[0.3,0.4,0.2,0.15], confidence:0.92, severity:'severe'}
]);

// Check captured images
console.log(screenshotService.getCapturedImages());

// Clear all images
screenshotService.clearAllImages();

// Clear AI detections
aiOverlayService.clearDetections();
```

## Summary

✅ **AI Overlay** - Renders detections on canvas  
✅ **Screenshot** - Captures with overlays  
⏳ **Load Detections** - Need to implement  
⏳ **Key Images Tab** - Need to add to report  
⏳ **Save with Images** - Need to include in API  

The services are ready, just need to wire up the UI! 🎯
