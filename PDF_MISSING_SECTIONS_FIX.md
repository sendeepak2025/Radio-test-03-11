# PDF Missing Sections Fix - Complete

## Issues Fixed ✅

### 1. **Assessment Tools Results Section Missing**
- **Problem**: Custom sections like "Assessment Tools Results" were not appearing in exported PDF
- **Root Cause**: PDF generation code only rendered hardcoded sections (Findings, Impression, etc.)
- **Solution**: Added logic to extract and render all custom sections from `report.sections` object

### 2. **Key Images (Screenshots) Missing**
- **Problem**: Screenshots captured in DICOM viewer were not appearing in PDF
- **Root Cause**: PDF generation code did not include a "Key Images" section
- **Solution**: Added complete Key Images rendering with base64 image support

---

## Technical Changes

### File: `server/src/routes/reports-unified.js`

#### **Change 1: Assessment Tools Results Section** (Lines 2753-2783)
```javascript
// ===== ASSESSMENT TOOLS RESULTS =====
// Extract custom sections (excluding standard sections)
const standardSections = ['findings', 'clinicalHistory', 'clinical_history', 'clinical_indication', 
                          'technique', 'impression', 'recommendations', 'Findings', 'Technique', 
                          'Impression', 'Recommendations'];

if (report.sections && typeof report.sections === 'object') {
  const customSections = Object.entries(report.sections)
    .filter(([key]) => !standardSections.includes(key))
    .filter(([_, value]) => value && value.toString().trim().length > 0);
  
  if (customSections.length > 0) {
    checkNewPage(80);
    doc.fontSize(12).font('Helvetica-Bold').text('ASSESSMENT TOOLS RESULTS', { underline: true });
    doc.moveDown(0.5);
    
    customSections.forEach(([key, value]) => {
      // Format section title (convert snake_case to Title Case)
      const title = key.replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      doc.fontSize(11).font('Helvetica-Bold').text(`${title}:`, { continued: false });
      doc.fontSize(10).font('Helvetica').text(value.toString(), { align: 'justify' });
      doc.moveDown(0.5);
    });
    
    doc.moveDown();
  }
}
```

**What it does:**
- Scans `report.sections` object for any non-standard sections
- Formats section titles from `snake_case` to `Title Case`
- Renders each custom section with title and content
- Examples: "Assessment Tools Results", "Additional Notes", etc.

#### **Change 2: Key Images Section** (Lines 2785-2850)
```javascript
// ===== KEY IMAGES =====
if (report.keyImages && report.keyImages.length > 0) {
  checkNewPage(100);
  doc.fontSize(12).font('Helvetica-Bold').text('KEY IMAGES', { underline: true });
  doc.moveDown();
  
  for (let i = 0; i < report.keyImages.length; i++) {
    const img = report.keyImages[i];
    
    if (!img.dataUrl) continue; // Skip if no image data
    
    try {
      // Check if we need a new page (image + caption ~200px)
      checkNewPage(220);
      
      const imgY = doc.y;
      
      // Extract base64 data
      let imgBuffer;
      if (img.dataUrl.startsWith('data:image')) {
        const base64Data = img.dataUrl.split(',')[1];
        imgBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // Handle file path
        const path = require('path');
        const fs = require('fs');
        const fullPath = path.join(__dirname, '../../', img.dataUrl);
        if (fs.existsSync(fullPath)) {
          imgBuffer = fs.readFileSync(fullPath);
        } else {
          console.warn(`Key image file not found: ${fullPath}`);
          continue;
        }
      }
      
      // Render image (max width: 400px to fit on page)
      doc.image(imgBuffer, 50, imgY, { 
        fit: [400, 300], 
        align: 'center' 
      });
      
      // Add caption
      doc.moveDown(12); // Move below image
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text(
        `Image ${i + 1} of ${report.keyImages.length}${img.caption ? `: ${img.caption}` : ''}`,
        50,
        doc.y,
        { align: 'center' }
      );
      
      doc.fillColor('#000000'); // Reset color
      doc.moveDown(2);
      
    } catch (err) {
      console.warn(`Failed to render key image ${i + 1}:`, err.message);
      // Add placeholder text
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#999999');
      doc.text(`[Image ${i + 1} could not be loaded]`, { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown();
    }
  }
  
  doc.moveDown();
}
```

**What it does:**
- Iterates through `report.keyImages` array
- Handles both base64 image data and file paths
- Renders each image with max width 400px to fit on PDF page
- Adds numbered captions below each image
- Graceful error handling with placeholder text if image fails to load

---

## PDF Section Order (After Fix)

1. ✅ Header (Hospital Info)
2. ✅ Report Title
3. ✅ Critical Findings Alert (if present)
4. ✅ Patient & Study Info
5. ✅ Clinical History
6. ✅ Technique
7. ✅ Findings
8. ✅ Measurements
9. ✅ Impression
10. ✅ Recommendations
11. ✅ **Assessment Tools Results** ⬅️ NEW
12. ✅ **Key Images** ⬅️ NEW
13. ✅ Digital Signature
14. ✅ Footer

---

## Testing Instructions

### Test Workflow:
1. **Open DICOM Viewer** → Load a study
2. **Capture Screenshots** → Use snapshot button (at least 1-2 images)
3. **Create Report** → Select template with custom sections
4. **Fill Assessment Tools** → Complete any assessment tool fields (e.g., "Assessment Tools Results")
5. **Sign Report** → Add digital signature
6. **Export to PDF** → Click export PDF button
7. **Verify PDF Contains**:
   - ✅ "Assessment Tools Results" section with your entered data
   - ✅ "Key Images" section with all captured screenshots
   - ✅ Proper image captions (e.g., "Image 1 of 2")

---

## Data Flow

### Assessment Tools Results:
```
Template → Custom Section → report.sections.assessment_tools_results → PDF "Assessment Tools Results"
```

### Key Images:
```
DICOM Viewer Screenshot → screenshotService → report.keyImages[] → PDF "Key Images"
```

---

## Error Handling

### Assessment Tools:
- Filters out empty/null values
- Handles various section naming conventions (snake_case, camelCase)
- Only renders if at least one custom section has content

### Key Images:
- Skips images without dataUrl
- Try/catch for image loading failures
- Fallback placeholder text if image can't be rendered
- Supports both base64 and file path formats

---

## Status: ✅ COMPLETE

All missing sections have been added to PDF generation. Ready for testing!

### Modified Files:
- `server/src/routes/reports-unified.js` (PDF generation logic)

### Restart Required:
- ✅ **Server** - Restart to apply PDF generation changes
- ❌ Frontend - No changes needed
