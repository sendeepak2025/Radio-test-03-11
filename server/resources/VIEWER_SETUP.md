# DICOM Viewer Setup for CD Burning

## Overview

When burning DICOM studies to CD/DVD, you can optionally include a portable DICOM viewer on the disc. This allows recipients to view the images immediately without installing software.

## Option 1: MicroDicom Portable (Recommended)

### Manual Setup

1. **Download MicroDicom Portable**
   - Visit: http://www.microdicom.com/downloads.html
   - Download the portable/standalone version (not installer)
   - File size: ~15 MB

2. **Extract to Resources Folder**
   ```
   server/resources/microdicom-portable/
   ├── MicroDicom.exe
   ├── MicroDicom.ini
   └── [other files]
   ```

3. **Verify Structure**
   - The main executable should be at: `server/resources/microdicom-portable/MicroDicom.exe`
   - Test by running it locally

### Automated Setup (PowerShell)

Run this script from the `server` directory:

```powershell
.\scripts\setup-dicom-viewer.ps1
```

This will:
- Download MicroDicom portable
- Extract to correct location
- Verify installation

## Option 2: Weasis Portable (Cross-platform)

### Manual Setup

1. **Download Weasis Portable**
   - Visit: https://nroduit.github.io/en/getting-started/
   - Download portable version for Windows
   - File size: ~80 MB

2. **Extract to Resources Folder**
   ```
   server/resources/weasis-portable/
   ├── Weasis.exe
   └── [other files]
   ```

## Option 3: No Viewer (Instructions Only)

If no viewer is available, the system automatically creates a `VIEWER_INSTRUCTIONS.txt` file on the disc with download links for:
- MicroDicom (Windows)
- RadiAnt DICOM Viewer (Windows)
- Horos (Mac)
- Weasis (Cross-platform)

## What Gets Burned to Disc

### With Viewer Included

```
CD/DVD Root:
├── DICOMDIR
├── DICOM/
├── VIEWER/
│   ├── MicroDicom.exe       ← Portable viewer
│   ├── MicroDicom.ini
│   └── [dependencies]
├── autorun.inf              ← Auto-launches viewer on Windows
├── README.txt
└── EXPORT_INFO.json
```

### Without Viewer

```
CD/DVD Root:
├── DICOMDIR
├── DICOM/
├── VIEWER/
│   └── VIEWER_INSTRUCTIONS.txt  ← Download links
├── README.txt
└── EXPORT_INFO.json
```

## Disc Space Requirements

| Content | Size | Media |
|---------|------|-------|
| Small study (50 images) | 50 MB | CD (700 MB) |
| + MicroDicom viewer | +15 MB | CD (700 MB) |
| Medium study (200 images) | 200 MB | CD (700 MB) |
| + MicroDicom viewer | +15 MB | CD (700 MB) |
| Large study (500 images) | 500 MB | DVD (4.7 GB) |
| + MicroDicom viewer | +15 MB | DVD (4.7 GB) |
| + Weasis viewer | +80 MB | DVD (4.7 GB) |

## Testing the Viewer

After setup:

1. Create test disc structure:
   ```bash
   node scripts/test-viewer-setup.js
   ```

2. Verify viewer launches:
   ```bash
   cd server/resources/microdicom-portable
   ./MicroDicom.exe
   ```

3. Test with sample DICOM:
   - Open MicroDicom
   - File → Open → Select DICOMDIR
   - Verify images display

## Licensing Considerations

### MicroDicom
- **License**: Freeware for personal and commercial use
- **Distribution**: Allowed for non-commercial purposes
- **Website**: http://www.microdicom.com/

### Weasis
- **License**: Eclipse Public License 2.0 (EPL-2.0)
- **Distribution**: Freely distributable
- **Website**: https://github.com/nroduit/Weasis

### RadiAnt
- **License**: Free for non-commercial use
- **Distribution**: Not allowed (provide download link only)
- **Website**: https://www.radiantviewer.com/

## Autorun Configuration

The system creates an `autorun.inf` file that automatically launches the viewer when the disc is inserted on Windows:

```ini
[autorun]
open=VIEWER\MicroDicom.exe
icon=VIEWER\MicroDicom.exe
label=DICOM Medical Images
action=Open DICOM Viewer
```

**Note**: Windows 7+ may block autorun for security. Users may need to manually run the viewer.

## Alternative: Web-based Viewer

For a lighter option, you can include a web-based viewer:

1. **OHIF Viewer** (static HTML)
   - Download: https://github.com/OHIF/Viewers
   - Size: ~5 MB
   - Opens in browser

2. **Cornerstone Standalone**
   - Download: https://github.com/cornerstonejs/cornerstone
   - Size: ~2 MB
   - Opens in browser

## Troubleshooting

### Viewer Not Found

**Error**: "Viewer not included - instructions provided instead"

**Solution**:
1. Check path: `server/resources/microdicom-portable/MicroDicom.exe`
2. Verify file permissions
3. Run setup script

### Viewer Won't Launch from Disc

**Issue**: Autorun doesn't work

**Solution**:
1. Manually navigate to `VIEWER` folder on disc
2. Double-click `MicroDicom.exe`
3. Or use "Open with" → Select viewer

### Disc Space Error

**Error**: "Not enough space on media"

**Solution**:
1. Use DVD instead of CD
2. Uncheck "Include DICOM Viewer Software"
3. Reduce image count

## Security Considerations

### Antivirus False Positives

Some antivirus software may flag portable executables:
- **Solution**: Digitally sign the viewer executable
- **Alternative**: Provide instructions only

### Corporate Policies

Some organizations block portable executables:
- **Solution**: Provide web-based viewer instead
- **Alternative**: Include instructions for approved viewers

## Customization

### Custom Viewer

To use a different viewer:

1. Edit `server/src/controllers/directBurnController.js`
2. Update `addPortableDicomViewer()` function:
   ```javascript
   const cachedViewerPath = path.join(__dirname, '../../resources/your-viewer');
   ```

3. Update autorun.inf:
   ```javascript
   const autorun = `[autorun]
   open=VIEWER\\YourViewer.exe
   ...`;
   ```

### Viewer Configuration

Pre-configure viewer settings:

1. Run viewer locally
2. Configure preferences (window layout, tools, etc.)
3. Copy configuration file to resources folder
4. It will be included on every disc

## Best Practices

1. **Test First**: Burn a test disc and verify viewer works
2. **Check Size**: Ensure study + viewer fits on media
3. **Update Regularly**: Keep viewer software up to date
4. **Document**: Include README with viewer instructions
5. **Compliance**: Verify licensing allows distribution

## Support

For viewer-specific issues:
- **MicroDicom**: http://www.microdicom.com/support.html
- **Weasis**: https://github.com/nroduit/Weasis/issues
- **General**: Check `DIRECT_CD_BURN_GUIDE.md`
