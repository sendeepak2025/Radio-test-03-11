# Screenshot Capture from DICOM Viewer to Report - Complete Fix

## Problem Description

**User Issue**: "After capturing snap from DICOM viewer, this not coming in report"

When users capture screenshots in the DICOM viewer and then create a report, the captured images are not transferred to the report.

---

## Root Cause Analysis

### The Data Flow

**Working Part** ✅:
```
User clicks screenshot button in viewer
  ↓
MedicalImageViewer.tsx captures canvas (line 4343-4366)
  ↓
screenshotService.saveCapturedImage() stores in memory
  ↓
screenshotService.capturedImages array populated
```

**Broken Part** ❌:
```
User clicks "Create Report" button
  ↓
TemplateSelectorUnified.tsx creates new report
  ↓
reportData initialized with keyImages: []  ← EMPTY ARRAY!
  ↓
POST /api/reports with empty keyImages
  ↓
Report saved to database without screenshots
  ↓
Screenshots lost!
```

### Why It Happened

**File**: `viewer/src/components/reporting/TemplateSelectorUnified.tsx`  
**Line**: 316 (before fix)

```typescript
const reportData = {
  studyInstanceUID: studyUID,
  patientID: patientInfo?.patientID || 'Unknown',
  // ... other fields ...
  keyImages: [],  // ❌ Always empty array!
  reportStatus: 'draft'
};
```

The template selector was initializing `keyImages` as an empty array instead of fetching screenshots from `screenshotService`.

---

## Fix Applied

### Change 1: Import and Use Screenshot Service

**File**: `viewer/src/components/reporting/TemplateSelectorUnified.tsx`  
**Lines**: 305-321

**Before**:
```typescript
const reportData = {
  // ... other fields ...
  keyImages: [],  // ❌ Empty
  reportStatus: 'draft'
};
```

**After**:
```typescript
// ✅ FIX: Include captured screenshots from DICOM viewer
const screenshotService = (await import('@/services/screenshotService')).default;
const viewerScreenshots = screenshotService.exportForReport();
console.log('📸 Including viewer screenshots in new report:', viewerScreenshots.length);

const reportData = {
  // ... other fields ...
  keyImages: viewerScreenshots,  // ✅ Include viewer screenshots
  reportStatus: 'draft'
};
```

### What This Does

1. **Dynamically imports** screenshotService (singleton instance)
2. **Calls `exportForReport()`** which returns all captured images with metadata
3. **Assigns** to `keyImages` field in report data
4. **Logs** the count for debugging

---

## How Screenshot Service Works

### Screenshot Capture Process

**File**: `viewer/src/services/screenshotService.ts`

**1. Canvas Capture** (Line 39-73):
```typescript
async captureCanvas(canvas: HTMLCanvasElement, options?: CaptureOptions) {
  const quality = options?.quality || 0.95;
  const format = options?.format || 'image/png';
  
  // Capture canvas to base64 data URL
  const dataUrl = canvas.toDataURL(format, quality);
  
  return {
    dataUrl,
    timestamp: new Date(),
    ...metadata
  };
}
```

**2. Storage** (Line 115-132):
```typescript
saveCapturedImage(image: CapturedImage): void {
  this.capturedImages.push(image);  // In-memory array
  console.log(`📸 Screenshot saved. Total: ${this.capturedImages.length}`);
}
```

**3. Export for Report** (Line 178-184):
```typescript
exportForReport(): CapturedImage[] {
  return this.capturedImages.map(img => ({
    id: img.id,
    dataUrl: img.dataUrl,
    caption: img.caption,
    timestamp: img.timestamp,
    metadata: img.metadata
  }));
}
```

---

## Complete Data Flow (After Fix)

### Scenario: Capture Screenshots → Create Report

```
1. User in DICOM Viewer (MedicalImageViewer.tsx)
   - Clicks screenshot button (🖼️ icon)
   
2. Canvas Capture (line 4343-4366)
   - canvas.toDataURL('image/png', 0.95)
   - Creates base64 image data
   
3. Save to Service (line 4359)
   - screenshotService.saveCapturedImage({
       id: crypto.randomUUID(),
       dataUrl: base64Data,
       caption: `Frame ${frameIndex}`,
       timestamp: new Date(),
       metadata: { windowLevel, zoom, hasAnnotations, ... }
     })
   
4. Visual Feedback (line 4368-4387)
   - Flash animation on canvas
   - Update screenshot count badge
   - screenshotService.getImageCount() → "3" badge
   
5. User Clicks "Create Report"
   
6. TemplateSelectorUnified.tsx (line 306-308)
   ✅ NEW: Fetch screenshots from service
   - screenshotService.exportForReport()
   - Returns: [{ id, dataUrl, caption, timestamp, metadata }, ...]
   
7. Create Report with Screenshots (line 310-325)
   - reportData.keyImages = viewerScreenshots
   - POST /api/reports with keyImages array
   
8. Server Saves Report (reports-unified.js line 636-638)
   - report.keyImages = req.body.keyImages
   - MongoDB stores base64 images in report document
   
9. Report Editor Opens (UnifiedReportEditor.tsx)
   - state.keyImages populated from database
   
10. Preview Shows Images (ReportPreviewDialog.tsx line 439-468)
    - Grid layout with all captured images
    - Shows caption and image number
    
11. PDF Export Includes Images (ReportExportService.ts line 263-272)
    - Embeds base64 images in PDF
    - Generated PDF contains all screenshots
```

---

## Testing the Fix

### Step 1: Capture Screenshots in Viewer

1. Open DICOM viewer with a study:
   ```
   http://localhost:5173/viewer?studyUID=1.2.3.4.5...
   ```

2. Click the **🖼️ Screenshot** button (in toolbar)
   - Flash animation should appear
   - Badge count should increment (e.g., "3")

3. Repeat 2-3 times to capture multiple images

4. Check console log:
   ```
   📸 Screenshot saved. Total: 3
   ```

### Step 2: Create Report

1. Click **"Create Report"** button in viewer

2. Select a template

3. **Check console log for new message**:
   ```
   📸 Including viewer screenshots in new report: 3
   ```
   ✅ If you see this, the fix is working!

4. Wait for report editor to load

### Step 3: Verify Screenshots in Report

1. In report editor, click **"Preview"** button

2. Scroll down to **"Key Images"** section

3. **Verify**:
   - ✅ Should show 3 images in grid layout
   - ✅ Each image shows "Image 1 of 3", "Image 2 of 3", etc.
   - ✅ Images are the ones you captured in viewer

### Step 4: Verify Screenshots in PDF

1. Save the report (if draft)

2. Click **"Export"** → **"PDF"**

3. Open generated PDF

4. **Verify**:
   - ✅ PDF includes a "Key Images" section
   - ✅ All 3 screenshots are embedded in PDF
   - ✅ Images maintain their quality

---

## Screenshot Metadata

Each captured screenshot includes rich metadata:

```typescript
interface CapturedImage {
  id: string;                    // Unique ID (UUID)
  dataUrl: string;                // Base64 image data
  caption?: string;               // "Frame 5" or custom caption
  timestamp: Date;                // Capture time
  metadata?: {
    studyInstanceUID?: string;
    seriesInstanceUID?: string;
    instanceUID?: string;
    frameIndex?: number;          // Which frame was captured
    windowLevel?: {
      width: number;              // WW/WL settings
      center: number;
    };
    zoom?: number;                // Zoom level at capture
    hasAIOverlay?: boolean;       // AI detections visible?
    hasAnnotations?: boolean;     // User annotations visible?
    toolsUsed?: string[];         // Measurement tools visible
  };
}
```

This metadata is:
- ✅ Stored in MongoDB with the report
- ✅ Available in report preview
- ✅ Can be used for advanced PDF rendering
- ✅ Helps track which frame/settings were captured

---

## Additional Features Already Working

### 1. Captured Images Gallery (in Viewer)

**File**: `viewer/src/components/viewer/CapturedImagesGallery.tsx`

**Features**:
- Shows all captured screenshots in grid
- Download individual images
- Delete individual images
- Clear all screenshots
- Shows metadata (frame number, timestamp, AI overlay status)

**Location**: Bottom panel in DICOM viewer

### 2. Anatomical Diagram Snapshots

**File**: `viewer/src/components/reporting/panels/AnatomicalDiagramPanel.tsx` (Line 873-886)

**Already working**! Diagram snapshots use the same `keyImages` system:
```typescript
const handleSaveSnapshot = () => {
  const dataUrl = canvasRef.current.toDataURL('image/png');
  actions.addKeyImage({
    id: crypto.randomUUID(),
    dataUrl,
    caption: 'Anatomical diagram',
    timestamp: new Date()
  });
};
```

### 3. Report Preview

**File**: `viewer/src/components/reporting/ReportPreviewDialog.tsx` (Line 439-468)

**Shows**:
- Grid layout of all key images
- Image captions
- Image counter (1 of 3, 2 of 3, etc.)
- Responsive layout (auto-fits to screen)

### 4. PDF Export

**File**: `viewer/src/services/ReportExportService.ts` (Line 263-272)

**Embeds** all key images in PDF with:
- Proper sizing
- Page breaks between images
- Caption text below each image

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **In-Memory Storage**: 
   - Screenshots only live in `screenshotService` singleton
   - Lost if user refreshes page before creating report
   - **Workaround**: Save to IndexedDB for persistence

2. **No Redux State**:
   - Screenshots not in Redux store (viewerSlice)
   - Only in screenshotService singleton
   - **Future**: Add Redux actions for screenshots

3. **No Post-Creation Import**:
   - Can't add viewer screenshots after report is created
   - **Future**: Add "Import Screenshots from Viewer" button in report editor

4. **Size Limits**:
   - Base64 images can be large (500KB - 2MB each)
   - MongoDB document size limit: 16MB total
   - **Recommendation**: Limit to 10-15 screenshots per report

### Future Enhancements

**Priority 1 - Persistence**:
```typescript
// Save to IndexedDB before page unload
window.addEventListener('beforeunload', () => {
  const screenshots = screenshotService.exportForReport();
  localStorage.setItem('pendingScreenshots', JSON.stringify(screenshots));
});

// Restore on page load
const pending = localStorage.getItem('pendingScreenshots');
if (pending) {
  const screenshots = JSON.parse(pending);
  screenshots.forEach(img => screenshotService.saveCapturedImage(img));
  localStorage.removeItem('pendingScreenshots');
}
```

**Priority 2 - Redux Integration**:
```typescript
// Add to viewerSlice.ts
keyImages: [],

// Add action
addKeyImage(state, action) {
  state.keyImages.push(action.payload);
},

// Sync with screenshotService
screenshotService.saveCapturedImage(image);
dispatch(addKeyImage(image));
```

**Priority 3 - Post-Creation Import**:
```typescript
// Add button in UnifiedReportEditor
<Button onClick={handleImportViewerScreenshots}>
  Import Screenshots from Viewer ({screenshotService.getImageCount()})
</Button>

// Handler
const handleImportViewerScreenshots = () => {
  const screenshots = screenshotService.exportForReport();
  screenshots.forEach(img => actions.addKeyImage(img));
  toast(`Imported ${screenshots.length} screenshots`);
};
```

---

## Troubleshooting

### Issue 1: Screenshots Not Showing in Report

**Check**:
```typescript
// In browser console (viewer page)
screenshotService.getImageCount()
// Should return: 3 (or number of screenshots captured)

screenshotService.exportForReport()
// Should return: Array(3) with image objects
```

**If count is 0**:
- Screenshots weren't captured (check screenshot button works)
- screenshotService was cleared or reset

**If count is > 0 but report has no images**:
- Server not restarted after fix
- Console should show "📸 Including viewer screenshots in new report: 0"
- This means the fix isn't active yet

### Issue 2: Console Shows "Including 0 screenshots"

**Possible causes**:
1. No screenshots captured before creating report
2. screenshotService cleared between capture and report creation
3. Different browser tab/window (screenshotService is per-tab)

**Solution**: Capture screenshots first, then immediately create report

### Issue 3: "Module not found" Error

**Error**: `Cannot find module '@/services/screenshotService'`

**Solution**: 
```typescript
// Change import from:
import('@/services/screenshotService')

// To:
import('../../services/screenshotService')
```

Then rebuild frontend:
```bash
cd viewer
npm run build
```

---

## File Summary

**Modified (1 file)**:
- ✅ `viewer/src/components/reporting/TemplateSelectorUnified.tsx`
  - Lines 305-321: Import screenshotService and fetch screenshots
  - Added debug logging for screenshot count

**Verified Working (no changes needed)**:
- ✅ `viewer/src/services/screenshotService.ts` - Capture & storage
- ✅ `viewer/src/components/viewer/MedicalImageViewer.tsx` - Screenshot button
- ✅ `viewer/src/components/reporting/ReportPreviewDialog.tsx` - Display images
- ✅ `viewer/src/services/ReportExportService.ts` - PDF export
- ✅ `server/src/models/StructuredReport.js` - Database schema
- ✅ `server/src/routes/reports-unified.js` - API save/retrieve

---

## Summary

✅ **Root cause identified**: Empty `keyImages: []` in template selector  
✅ **Fix applied**: Import and use `screenshotService.exportForReport()`  
✅ **Screenshots now transfer**: From viewer to report automatically  
✅ **Backward compatible**: Existing reports still work  
✅ **Debug logging added**: Easy to verify screenshots are transferred  
✅ **All downstream working**: Preview, PDF export, database storage  

**The fix is complete and ready for testing!** 🎉

After restarting the frontend build, captured screenshots will automatically appear in newly created reports.
