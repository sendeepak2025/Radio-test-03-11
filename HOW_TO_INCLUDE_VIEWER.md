# How to Include DICOM Viewer on Burned CDs

## Quick Answer

When you check "Include DICOM Viewer Software" during CD burning, the system will:

1. **If viewer is installed**: Copy the portable viewer to the disc
2. **If viewer is NOT installed**: Create detailed instructions for downloading viewers

## Setup (One-Time)

### Option 1: Automated Setup (Recommended)

Run this PowerShell script from the `server` directory:

```powershell
.\scripts\setup-dicom-viewer.ps1
```

This will:
- Download MicroDicom portable (~15 MB)
- Extract to `server/resources/microdicom-portable/`
- Verify installation
- Test the viewer

### Option 2: Manual Setup

1. **Download MicroDicom Portable**
   - Visit: http://www.microdicom.com/downloads.html
   - Download the portable/standalone version
   - File: `MicroDicom_Portable.zip` (~15 MB)

2. **Extract to Resources Folder**
   ```
   server/
   └── resources/
       └── microdicom-portable/
           ├── MicroDicom.exe      ← Main executable
           ├── MicroDicom.ini
           └── [other files]
   ```

3. **Verify**
   - Check that `server/resources/microdicom-portable/MicroDicom.exe` exists
   - Test by running it

## Usage

### From the UI

1. Go to **Patients** page
2. Click **Export** on any patient or study
3. Select **"Direct CD Burn (Recommended)"**
4. ✅ Check **"Include DICOM Viewer Software"**
5. Insert blank CD/DVD
6. Click **"Burn to CD/DVD"**

### What Gets Burned

#### With Viewer Installed:

```
CD/DVD Root:
├── DICOMDIR                    ← PACS index file
├── DICOM/                      ← DICOM images
│   ├── IM000001
│   ├── IM000002
│   └── ...
├── VIEWER/                     ← Portable viewer
│   ├── MicroDicom.exe         ← Viewer executable
│   ├── Launch_Viewer.bat      ← Quick launch script
│   └── [dependencies]
├── autorun.inf                 ← Auto-launches viewer
├── README.txt                  ← Instructions
└── EXPORT_INFO.json           ← Metadata
```

#### Without Viewer Installed:

```
CD/DVD Root:
├── DICOMDIR
├── DICOM/
├── VIEWER/
│   ├── VIEWER_INSTRUCTIONS.txt  ← Download links (text)
│   └── INSTRUCTIONS.html        ← Download links (HTML)
├── autorun.inf                  ← Opens instructions
├── README.txt
└── EXPORT_INFO.json
```

## How Recipients Use the Disc

### If Viewer is Included:

**Windows (Autorun Enabled):**
1. Insert disc
2. Viewer launches automatically
3. Images display immediately

**Windows (Autorun Disabled):**
1. Insert disc
2. Open disc in Explorer
3. Double-click `VIEWER/MicroDicom.exe`
4. Or double-click `VIEWER/Launch_Viewer.bat`

**Manual Method:**
1. Navigate to `VIEWER` folder
2. Run `MicroDicom.exe`
3. File → Open → Select `DICOMDIR` from disc root

### If Viewer is NOT Included:

**Windows:**
1. Insert disc
2. `INSTRUCTIONS.html` opens in browser
3. Click link to download viewer
4. Install and open viewer
5. Load `DICOMDIR` from disc

**Manual:**
1. Open `VIEWER/INSTRUCTIONS.html` in browser
2. Or read `VIEWER/VIEWER_INSTRUCTIONS.txt`
3. Follow download and installation instructions

## Supported Viewers

The system can include any of these viewers (if you set them up):

| Viewer | Platform | Size | Setup Path |
|--------|----------|------|------------|
| MicroDicom | Windows | 15 MB | `resources/microdicom-portable/` |
| Weasis | All | 80 MB | `resources/weasis-portable/` |
| Custom | Any | Varies | `resources/your-viewer/` |

## Disc Space Considerations

| Study Size | Viewer | Total | Media Needed |
|------------|--------|-------|--------------|
| 50 MB | None | 50 MB | CD (700 MB) |
| 50 MB | MicroDicom | 65 MB | CD (700 MB) |
| 200 MB | None | 200 MB | CD (700 MB) |
| 200 MB | MicroDicom | 215 MB | CD (700 MB) |
| 500 MB | None | 500 MB | DVD (4.7 GB) |
| 500 MB | MicroDicom | 515 MB | DVD (4.7 GB) |
| 500 MB | Weasis | 580 MB | DVD (4.7 GB) |

## Benefits of Including Viewer

### ✅ Advantages:
- **Immediate viewing** - No software installation needed
- **User-friendly** - Non-technical users can view images
- **Portable** - Works on any Windows computer
- **Professional** - Better experience for patients/referring physicians
- **Self-contained** - Everything needed is on the disc

### ❌ Disadvantages:
- **Disc space** - Uses 15-80 MB depending on viewer
- **Windows only** - MicroDicom only works on Windows
- **Setup required** - Admin must set up viewer once
- **Updates** - Need to update viewer periodically

## When to Include Viewer

### ✅ Include Viewer When:
- Giving disc to patients
- Sending to referring physicians
- External facilities without DICOM software
- Non-technical recipients
- Quick review needed

### ❌ Don't Include Viewer When:
- Sending to PACS systems (they don't need it)
- Sending to radiologists (they have their own software)
- Disc space is limited
- Recipient specifically requests no viewer

## Troubleshooting

### "Viewer not included - instructions provided instead"

**Cause**: Viewer software not set up on server

**Solution**:
```powershell
cd server
.\scripts\setup-dicom-viewer.ps1
```

### "Not enough space on media"

**Cause**: Study + viewer exceeds disc capacity

**Solutions**:
1. Use DVD instead of CD
2. Uncheck "Include DICOM Viewer Software"
3. Reduce study size (uncheck "Include DICOM images")

### Viewer won't launch from disc

**Cause**: Windows autorun disabled or antivirus blocking

**Solutions**:
1. Manually run `VIEWER/MicroDicom.exe`
2. Or use `VIEWER/Launch_Viewer.bat`
3. Add viewer to antivirus exceptions

### Antivirus flags viewer as suspicious

**Cause**: Portable executables sometimes trigger false positives

**Solutions**:
1. Whitelist the viewer in antivirus
2. Download viewer directly from official website
3. Use instructions-only mode (don't include viewer)

## Advanced: Custom Viewer

To use a different viewer:

1. **Place viewer in resources folder**:
   ```
   server/resources/your-viewer/
   └── YourViewer.exe
   ```

2. **Update controller** (`server/src/controllers/directBurnController.js`):
   ```javascript
   const viewerOptions = [
     {
       name: 'YourViewer',
       path: path.join(__dirname, '../../resources/your-viewer'),
       exe: 'YourViewer.exe',
       size: '~XX MB',
     },
     // ... other options
   ];
   ```

3. **Test**:
   ```bash
   node scripts/test-viewer-setup.js
   ```

## Licensing

### MicroDicom
- **License**: Freeware
- **Distribution**: Allowed for non-commercial use
- **Source**: http://www.microdicom.com/

### Weasis
- **License**: Eclipse Public License 2.0
- **Distribution**: Freely distributable
- **Source**: https://github.com/nroduit/Weasis

**Important**: Verify licensing terms before distributing any viewer software.

## Best Practices

1. **Test First**: Burn a test disc and verify viewer works
2. **Update Regularly**: Keep viewer software up to date
3. **Document**: Include clear instructions on disc
4. **Check Size**: Ensure study + viewer fits on media
5. **Verify Compatibility**: Test on different Windows versions
6. **Backup Plan**: Always include instructions even with viewer

## Summary

**To include viewer on burned CDs:**

1. **One-time setup**: Run `.\scripts\setup-dicom-viewer.ps1`
2. **When burning**: Check "Include DICOM Viewer Software"
3. **Result**: Disc contains viewer + images, ready to use

**If you don't set up viewer:**
- Disc will include detailed download instructions instead
- Recipients can download and install viewer themselves
- Still fully functional, just requires extra step

## Questions?

- Setup issues: See `server/resources/VIEWER_SETUP.md`
- Burning issues: See `CD_BURN_TROUBLESHOOTING.md`
- Direct burn guide: See `DIRECT_CD_BURN_GUIDE.md`
