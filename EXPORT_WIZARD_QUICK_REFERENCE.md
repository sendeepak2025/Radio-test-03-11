# 🚀 Export Wizard - Quick Reference

## For Developers

### Opening the Export Wizard
```typescript
// In ProductionReportEditor.tsx
<Button onClick={handleOpenExportWizard}>Export</Button>
```

### Export Wizard State
```typescript
const [exportOpen, setExportOpen] = useState(false);
const [exportStep, setExportStep] = useState<1 | 2 | 3>(1);
const [exportFormat, setExportFormat] = useState<'json' | 'print' | 'images'>('json');
const [exportLayout, setExportLayout] = useState<'clinical' | 'research' | 'patient'>('clinical');
const [exportOptions, setExportOptions] = useState({
  pageSize: 'A4' as 'A4' | 'Letter' | 'Legal',
  dpi: 1 as 1 | 2 | 3,
  imageType: 'png' as 'png' | 'jpeg',
  jpegQuality: 0.9,
  showScaleBar: false,
  showOrientation: false,
  redactPHI: false,
  colorSafe: false
});
```

### Key Functions

#### Build Export Payload
```typescript
const payload = await buildFrozenPayloadForExportAdvanced(exportLayout, exportOptions);
// Returns: { reportId, studyInstanceUID, keyImages, measurements, legend, ... }
```

#### Compose Images with Advanced Options
```typescript
const composedImages = await composeAllKeyImagesAdvanced(exportOptions);
// Returns: Array of images with DPI scaling, color-safe palette, scale bars, etc.
```

#### Export Handlers
```typescript
await doExportJSON(payload);           // Download JSON file
doExportPrint(payload, html);          // Open print dialog
await doExportImages(payload, options); // Download sequential images
```

#### Create Share Link
```typescript
const result = await reportsApi.createSharedExport(reportId, payload);
// Returns: { shareId, url, expiresAt }
```

---

## For Users

### Step 1: Choose Format & Layout

**Formats:**
- **JSON**: Complete data export with all metadata
- **Print/PDF**: Formatted document (use browser's "Save as PDF")
- **Images**: Individual image files

**Layouts:**
- **Clinical**: Full detail with all sections
- **Research**: Minimal PHI, focus on findings
- **Patient-Friendly**: Simple language, larger text

### Step 2: Configure Options

**Image Quality:**
- 1x = Standard (original size)
- 2x = High (double resolution)
- 3x = Ultra (triple resolution)

**Image Type:**
- PNG = Lossless (larger files)
- JPEG = High quality 90% (smaller files)

**Privacy:**
- ☑️ Redact PHI = Remove patient name/ID

**Accessibility:**
- ☑️ Color-Blind Safe = Use Okabe-Ito palette
- ☑️ Scale Bar = Add 10mm measurement bar
- ☑️ Orientation Tags = Add R/L/A/P markers

### Step 3: Preview & Export

- Review the formatted preview
- Click "Export" to download
- (Optional) Create a share link for final reports

---

## API Endpoints

### Create Share Link
```http
POST /api/reports/:reportId/export/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "payload": { /* sanitized report data */ }
}

Response:
{
  "success": true,
  "shareId": "abc123...",
  "url": "https://example.com/share/abc123...",
  "expiresAt": "2025-11-06T16:00:00Z"
}
```

### Access Share Link
```http
GET /api/reports/export/share/:shareId

Response:
{
  "success": true,
  "payload": { /* sanitized report data */ },
  "expiresAt": "2025-11-06T16:00:00Z",
  "accessCount": 3
}
```

---

## Utility Functions

### Extract Measurements
```typescript
import { extractMeasurementsFromVectorOps } from '../../utils/reportingUtils';

const measurements = extractMeasurementsFromVectorOps(vectorOps);
// Returns: [{ type, value, unit, location, figureNo }, ...]
```

### Build Legend
```typescript
import { buildLegendFromOpsAndDetections } from '../../utils/reportingUtils';

const legend = buildLegendFromOpsAndDetections(vectorOps, aiDetections);
// Returns: [{ figureNo, label, color }, ...]
```

### Compose Image with Options
```typescript
import { composeImageWithAnnotations } from '../../utils/reportingUtils';

const composedDataUrl = await composeImageWithAnnotations(
  basePngDataUrl,
  overlayPngDataUrl,
  overlaySvgText,
  vectorOps,
  {
    dpi: 2,
    imageType: 'png',
    colorSafe: true,
    showScaleBar: true,
    showOrientation: true,
    scaleInfo: { pxPerMm: 0.5, orientation: 'R' }
  }
);
```

---

## Color-Blind Safe Palette (Okabe-Ito)

| Original | Color-Safe | Name |
|----------|------------|------|
| #FF0000 (Red) | #E69F00 | Orange |
| #00FF00 (Green) | #009E73 | Bluish Green |
| #0000FF (Blue) | #0072B2 | Blue |
| #FFFF00 (Yellow) | #F0E442 | Yellow |
| #FF00FF (Magenta) | #CC79A7 | Reddish Purple |
| #00FFFF (Cyan) | #56B4E9 | Sky Blue |
| #FFA500 (Orange) | #D55E00 | Vermillion |
| #800080 (Purple) | #CC79A7 | Reddish Purple |

---

## Performance Tips

1. **Use requestIdleCallback**: Heavy work runs during browser idle time
2. **Max Dimension**: Images >3000px are automatically downscaled
3. **Abort Controller**: Cancel exports with ESC or Cancel button
4. **URL Revocation**: Object URLs are cleaned up after download
5. **Sequential Downloads**: Images download one at a time to avoid throttling

---

## Keyboard Shortcuts

- **ESC**: Close wizard
- **ENTER**: Advance to next step
- **TAB**: Cycle through controls
- **SHIFT+TAB**: Cycle backwards

---

## Troubleshooting

### Export fails with OOM error
- Reduce DPI from 3x to 2x or 1x
- Use JPEG instead of PNG
- Images >3000px are auto-downscaled

### Share link returns 404
- Check if link has expired (24h)
- Verify shareId is correct
- Ensure report exists

### Images not compositing
- Check if vectorOps are present in metadata
- Verify overlayPng/overlaySvg are valid data URLs
- Check browser console for errors

### Color-blind palette not applying
- Ensure colorSafe option is enabled
- Check if vector ops have color property
- Verify colors are in hex format

---

## Testing Commands

```bash
# Check for COMPLIANCE UPDATE markers
Select-String -Path "viewer/src/**/*.tsx","viewer/src/**/*.ts","server/src/**/*.js" -Pattern "COMPLIANCE UPDATE \(ADVANCED\)"

# Count markers
(Select-String -Path "viewer/src/**/*.tsx","viewer/src/**/*.ts","server/src/**/*.js" -Pattern "COMPLIANCE UPDATE \(ADVANCED\)" | Measure-Object).Count

# Check diagnostics
npm run type-check
```

---

## Support

For issues or questions:
1. Check console for error messages (F12)
2. Review EXPORT_WIZARD_ADVANCED_COMPLETE.md
3. Check network tab for API errors
4. Verify authentication token is valid

---

**Last Updated**: November 5, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
