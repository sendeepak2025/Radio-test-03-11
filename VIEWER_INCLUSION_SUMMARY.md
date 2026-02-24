# DICOM Viewer Inclusion - Quick Reference

## TL;DR

**"Include DICOM Viewer Software"** checkbox adds a portable DICOM viewer to exported DICOM media (ISO/disc) so recipients can view images immediately without installing software.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Is viewer installed on server?                             │
│  (server/resources/microdicom-portable/MicroDicom.exe)     │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
       YES               NO
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│ Copy viewer   │  │ Create detailed  │
│ to disc       │  │ instructions     │
│               │  │ with download    │
│ + Autorun     │  │ links            │
│ + Launch      │  │                  │
│   script      │  │ + HTML version   │
└───────────────┘  └──────────────────┘
        │                 │
        └────────┬────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Create ISO     │
        │ (download)     │
        └────────────────┘
```

## Setup (One-Time)

### Automated (Recommended)

```powershell
cd server
.\scripts\setup-dicom-viewer.ps1
```

**What it does:**
1. Downloads MicroDicom portable (~15 MB)
2. Extracts to `server/resources/microdicom-portable/`
3. Verifies installation
4. Tests viewer

**Time:** 2-3 minutes

### Manual

1. Download: http://www.microdicom.com/downloads.html
2. Extract to: `server/resources/microdicom-portable/`
3. Verify: `MicroDicom.exe` exists

**Time:** 5 minutes

## Usage

### In the UI

```
Export Dialog
├── Delivery Method
│   ├── ○ Download ZIP file
│   ├── ● Create ISO (Recommended)      ← Select this
│   └── ○ Export ZIP + Burn (Legacy)
│
└── ☑ Include DICOM Viewer Software  ← Check this
```

### Result

#### ✅ With Viewer Installed:

```
💿 CD/DVD Contents:
├── 📁 DICOM/              (Images)
├── 📁 VIEWER/             (MicroDicom portable)
│   ├── MicroDicom.exe
│   └── Launch_Viewer.bat
├── 📄 DICOMDIR            (Index)
├── 📄 autorun.inf         (Auto-launch)
├── 📄 README.txt
└── 📄 EXPORT_INFO.json

Size: Study size + 15 MB
```

**User Experience:**
1. Insert disc → Viewer launches automatically
2. Images display immediately
3. No installation needed

#### ❌ Without Viewer Installed:

```
💿 CD/DVD Contents:
├── 📁 DICOM/              (Images)
├── 📁 VIEWER/
│   ├── INSTRUCTIONS.html  (Download links)
│   └── VIEWER_INSTRUCTIONS.txt
├── 📄 DICOMDIR
├── 📄 autorun.inf         (Opens instructions)
├── 📄 README.txt
└── 📄 EXPORT_INFO.json

Size: Study size + 50 KB
```

**User Experience:**
1. Insert disc → Instructions open in browser
2. User downloads viewer (one-time)
3. User installs and opens viewer
4. User loads DICOMDIR from disc

## Comparison

| Aspect | With Viewer | Without Viewer |
|--------|-------------|----------------|
| **Setup Required** | Yes (one-time) | No |
| **Disc Space** | +15 MB | +50 KB |
| **User Experience** | ⭐⭐⭐⭐⭐ Instant | ⭐⭐⭐ Manual |
| **Installation** | None | Required |
| **Best For** | Patients, external | PACS, radiologists |

## When to Use

### ✅ Include Viewer:

- 👨‍⚕️ Giving disc to patients
- 🏥 Sending to referring physicians
- 🏢 External facilities without DICOM software
- 👴 Non-technical recipients
- ⚡ Quick review needed

### ❌ Don't Include Viewer:

- 🖥️ Sending to PACS systems
- 👨‍⚕️ Sending to radiologists (have their own)
- 💾 Disc space is limited
- 📋 Recipient specifically requests no viewer

## Technical Details

### Viewer Options

| Viewer | Platform | Size | Path |
|--------|----------|------|------|
| MicroDicom | Windows | 15 MB | `resources/microdicom-portable/` |
| Weasis | All | 80 MB | `resources/weasis-portable/` |

### Autorun Behavior

**With Viewer:**
```ini
[autorun]
open=VIEWER\MicroDicom.exe
icon=VIEWER\MicroDicom.exe
label=DICOM Medical Images
action=Open DICOM Viewer
```

**Without Viewer:**
```ini
[autorun]
open=VIEWER\INSTRUCTIONS.html
icon=%SystemRoot%\system32\SHELL32.dll,23
label=DICOM Medical Images
action=View Instructions
```

### Disc Space Calculation

```
Total Size = Study Size + Viewer Size + Overhead

Examples:
- 50 MB study + MicroDicom = 65 MB (fits on CD)
- 200 MB study + MicroDicom = 215 MB (fits on CD)
- 500 MB study + MicroDicom = 515 MB (needs DVD)
- 500 MB study + Weasis = 580 MB (needs DVD)
- 2 GB study + MicroDicom = 2.015 GB (needs DVD)
```

## Troubleshooting

### ❌ "Viewer not included - instructions provided instead"

**Cause:** Viewer not set up on server

**Fix:**
```powershell
cd server
.\scripts\setup-dicom-viewer.ps1
```

### ❌ "Not enough space on media"

**Cause:** Study + viewer > disc capacity

**Fix:**
- Use DVD instead of CD
- Uncheck "Include DICOM Viewer Software"
- Reduce study size

### ❌ Viewer won't launch

**Cause:** Autorun disabled or antivirus

**Fix:**
- Manually run `VIEWER/MicroDicom.exe`
- Or use `VIEWER/Launch_Viewer.bat`
- Whitelist in antivirus

## FAQ

**Q: Do I need to set this up for every burn?**
A: No, setup is one-time. After setup, just check the box.

**Q: Can I use a different viewer?**
A: Yes, place it in `resources/your-viewer/` and update the controller.

**Q: Does this work on Mac/Linux?**
A: MicroDicom is Windows-only. Use Weasis for cross-platform.

**Q: Is this legal to distribute?**
A: MicroDicom is freeware and allows non-commercial distribution.

**Q: What if recipient has antivirus issues?**
A: They can download viewer directly from official website.

**Q: Can I include multiple viewers?**
A: Yes, but it uses more disc space. System picks first available.

**Q: Does this slow down burning?**
A: Slightly (~30 seconds extra to copy viewer files).

## Quick Commands

```powershell
# Setup viewer (one-time)
cd server
.\scripts\setup-dicom-viewer.ps1

# Test viewer
cd server\resources\microdicom-portable
.\MicroDicom.exe

# Check if viewer is installed
Test-Path server\resources\microdicom-portable\MicroDicom.exe

# Remove viewer (if needed)
Remove-Item server\resources\microdicom-portable -Recurse -Force
```

## Summary

**Simple Answer:**

1. **Setup once**: Run `setup-dicom-viewer.ps1`
2. **Check box**: "Include DICOM Viewer Software"
3. **Result**: Disc has viewer, works immediately

**If you don't set up viewer:**
- Disc includes download instructions instead
- Still works, just requires extra step
- Saves disc space

## More Info

- Full setup guide: `server/resources/VIEWER_SETUP.md`
- How-to guide: `HOW_TO_INCLUDE_VIEWER.md`
- Direct burn guide: `DIRECT_CD_BURN_GUIDE.md`
- Troubleshooting: `CD_BURN_TROUBLESHOOTING.md`
