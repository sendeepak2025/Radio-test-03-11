# 📤 Export & Canvas Annotation - Quick Reference

## What Was Added

### Export Functionality
- **Export as JSON** - Downloads complete frozen payload as JSON file
- **Print / Save as PDF** - Opens print-friendly preview with all content and images

### Canvas Annotation Composition
- Automatically merges base images with overlay annotations
- Supports PNG overlays, SVG overlays, and vector drawing operations
- Composited images appear in editor, exports, and prints

## How to Use

### For Users

#### Export Report as JSON
1. Open report in editor
2. Click **Export** button (top right toolbar)
3. Select **Export as JSON**
4. File downloads as `<reportId>-export.json`

#### Print or Save as PDF
1. Open report in editor
2. Click **Export** button (top right toolbar)
3. Select **Print / Save as PDF**
4. Print preview opens in new window
5. Use browser print dialog:
   - **Print** → Send to printer
   - **Save as PDF** → Choose PDF destination

#### Canvas Annotations in Reports
1. Mark findings on viewer canvas (AI overlays, manual annotations)
2. Click **Camera** button to capture image
3. Annotations automatically included in captured image
4. Composited images appear in:
   - Key Images section of editor
   - Exported JSON
   - Print/PDF output

### For Developers

#### Key Functions Added

**`composeImageWithAnnotations()`** - `viewer/src/utils/reportingUtils.ts`
```typescript
async function composeImageWithAnnotations(
  basePngDataUrl: string,
  overlayPngDataUrl?: string,
  overlaySvgText?: string,
  vectorOps?: Array<{ type: string; [key: string]: any }>
): Promise<string>
```

**`buildFrozenPayloadForExport()`** - `ProductionReportEditor.tsx`
```typescript
const buildFrozenPayloadForExport = () => {
  // Returns frozen payload with all report fields
}
```

**`handleExportJSON()`** - `ProductionReportEditor.tsx`
```typescript
const handleExportJSON = () => {
  // Downloads JSON export
}
```

**`handleExportPrint()`** - `ProductionReportEditor.tsx`
```typescript
const handleExportPrint = () => {
  // Opens print preview
}
```

#### Image Metadata Structure

```typescript
interface ImageMetadata {
  // Standard fields
  studyUID: string
  frameIndex: number
  hasAIOverlay: boolean
  hasAnnotations: boolean
  
  // ✅ COMPLIANCE UPDATE: New overlay fields
  overlayPng?: string        // PNG overlay as data URL
  overlaySvg?: string         // SVG markup as string
  vectorOps?: VectorOp[]      // Array of drawing operations
  composited?: boolean        // Flag indicating composition done
}
```

#### Vector Operation Types

```typescript
type VectorOp = 
  | { type: 'line', x1: number, y1: number, x2: number, y2: number, color?: string, width?: number }
  | { type: 'rect', x: number, y: number, w: number, h: number, color?: string, width?: number, fill?: boolean }
  | { type: 'circle', x: number, y: number, radius: number, color?: string, width?: number, fill?: boolean }
  | { type: 'polyline', points: Array<{x: number, y: number}>, color?: string, width?: number }
  | { type: 'text', text: string, x: number, y: number, color?: string, font?: string }
  | { type: 'arrow', x1: number, y1: number, x2: number, y2: number, color?: string, width?: number }
```

## Code Locations

### Export UI
- **Button:** `ProductionReportEditor.tsx` line ~1450
- **Menu:** `ProductionReportEditor.tsx` line ~1470
- **State:** `ProductionReportEditor.tsx` line ~320

### Export Handlers
- **JSON Export:** `ProductionReportEditor.tsx` line ~1100
- **Print Export:** `ProductionReportEditor.tsx` line ~1130
- **Frozen Payload:** `ProductionReportEditor.tsx` line ~1050

### Image Composition
- **Composition Function:** `reportingUtils.ts` line ~450
- **Image Loading:** `ProductionReportEditor.tsx` line ~320
- **Periodic Refresh:** `ProductionReportEditor.tsx` line ~360

### Server Integration
- **keyImages Acceptance:** `reports-unified.js` line ~420
- **Export JSON Storage:** `reports-unified.js` line ~750

## Frozen Payload Fields

```json
{
  "reportId": "SR-12345",
  "studyInstanceUID": "1.2.3.4.5",
  "patientID": "P12345",
  "patientName": "Doe, John",
  "modality": "CT",
  "templateId": "ct-head-trauma",
  "templateName": "CT Head - Trauma Protocol",
  "templateVersion": "2.1",
  "technique": "Non-contrast CT of the head...",
  "clinicalHistory": "Fall from height...",
  "findingsText": "No acute intracranial abnormality...",
  "impression": "Normal CT head...",
  "recommendations": "Clinical correlation...",
  "sections": { ... },
  "findings": [ ... ],
  "measurements": [ ... ],
  "aiDetections": [ ... ],
  "keyImages": [
    {
      "id": "img-123",
      "dataUrl": "data:image/png;base64,...",
      "caption": "Axial slice showing...",
      "timestamp": "2025-11-05T10:30:00Z",
      "metadata": { ... }
    }
  ],
  "reportStatus": "final",
  "createdAt": "2025-11-05T10:00:00Z",
  "updatedAt": "2025-11-05T10:30:00Z",
  "signedAt": "2025-11-05T10:35:00Z",
  "signedBy": "Dr. Smith",
  "version": 3,
  "exportedAt": "2025-11-05T10:40:00Z"
}
```

## Print Preview HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>Medical Report - SR-12345</title>
  <style>
    /* Print-friendly styles */
    body { font-family: Arial; margin: 20px; }
    h1 { text-align: center; border-bottom: 2px solid #333; }
    .section { margin: 20px 0; }
    .key-image { page-break-inside: avoid; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>MEDICAL REPORT</h1>
  <div class="header-info">...</div>
  <div class="section">
    <div class="section-title">FINDINGS</div>
    <div class="section-content">...</div>
  </div>
  <div class="key-images">
    <div class="key-image">
      <img src="data:image/png;base64,..." />
      <p class="image-caption">...</p>
    </div>
  </div>
  <div class="signature">...</div>
</body>
</html>
```

## Testing Commands

```bash
# Check TypeScript compilation
npm run type-check

# Run development server
npm run dev

# Build for production
npm run build

# Test export functionality
# 1. Open report editor
# 2. Click Export → Export as JSON
# 3. Verify JSON file downloads
# 4. Click Export → Print / Save as PDF
# 5. Verify print preview opens
```

## Troubleshooting

### Export button not visible
- Ensure report is loaded (`report` state is not null)
- Check toolbar rendering in ProductionReportEditor

### JSON export empty
- Verify `buildFrozenPayloadForExport()` is called
- Check browser console for errors
- Ensure report has required fields

### Print preview blank
- Check browser popup blocker settings
- Verify images are loaded (check data URLs)
- Look for console errors in print window

### Annotations not visible
- Verify metadata includes overlay fields
- Check `composeImageWithAnnotations()` is called
- Ensure canvas context is available
- Check browser console for composition errors

### Images not loading in print
- Data URLs may be too large (browser limit ~2MB)
- Try reducing image quality/size
- Check browser console for errors

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Export JSON | ✅ | ✅ | ✅ | ✅ |
| Print Preview | ✅ | ✅ | ✅ | ✅ |
| Canvas Composition | ✅ | ✅ | ✅ | ✅ |
| Data URLs | ✅ | ✅ | ✅ | ✅ |
| Blob Download | ✅ | ✅ | ✅ | ✅ |

## Performance Tips

- Image composition is async (non-blocking)
- Composition cached (only done once per image)
- Periodic refresh every 3 seconds
- Failed compositions fall back to original
- Large images may take longer to compose

## Security Notes

- All composition happens client-side
- No server-side image processing
- Data URLs stay in browser memory
- No external image loading (CORS safe)
- No PHI in console logs (production)

## API Endpoints Used

- `POST /api/reports` - Save report with keyImages
- `PUT /api/reports/:id` - Update report
- `POST /api/reports/:id/sign` - Sign report (stores exportedJSON)
- No new endpoints created ✅

## Comment Tags

All changes marked with:
```typescript
// ✅ COMPLIANCE UPDATE: <description>
```

Search for this tag to find all modifications.

## Related Files

- `EXPORT_COMPLIANCE_UPDATE_SUMMARY.md` - Detailed implementation summary
- `COMPLIANCE_CODE_COMMENTS_INDEX.md` - Index of all compliance comments
- `COMPLIANCE_WORKFLOW_DIAGRAM.md` - Workflow diagrams

---

**Last Updated:** 2025-11-05  
**Version:** 1.0  
**Status:** ✅ Production Ready
