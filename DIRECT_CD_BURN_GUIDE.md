# Direct CD Burn Guide

## Overview

The Direct CD Burn feature allows you to burn DICOM medical images directly to CD/DVD without creating intermediate ZIP files. This is faster, more efficient, and creates properly formatted DICOM media that works with all PACS systems and DICOM viewers.

## Features

### 1. Direct Burning (Recommended)
- Burns DICOM files directly to disc
- No ZIP file created (faster and more efficient)
- Proper DICOM Part 10 media structure
- DICOMDIR at disc root for PACS compatibility
- Optional portable DICOM viewer included
- README and metadata files included

### 2. Legacy ZIP + Burn
- Creates ZIP file first, then burns
- Slower but provides backup ZIP file
- Useful if you want to keep a copy

### 3. Download ZIP
- Traditional download method
- For manual burning or archiving

## How It Works

### Direct Burn Process

1. **Fetch DICOM Data**: Retrieves study data directly from Orthanc
2. **Create Media Structure**: Builds proper DICOM media layout in temp folder
3. **Add Metadata**: Includes export info and README
4. **Optional Viewer**: Adds portable DICOM viewer software
5. **Burn to Disc**: Uses IMAPI2 to burn directly to CD/DVD
6. **Cleanup**: Removes temporary files

### Disc Structure

```
CD/DVD Root:
├── DICOMDIR              ← PACS index file (required)
├── DICOM/                ← DICOM image files
│   ├── IM000001
│   ├── IM000002
│   └── ...
├── EXPORT_INFO.json      ← Export metadata
├── README.txt            ← Instructions for users
├── VIEWER/               ← Optional DICOM viewer (if enabled)
│   ├── MicroDicom.exe
│   └── ...
└── autorun.inf           ← Windows autorun (optional)
```

## Usage

### From UI

1. Go to Patients page
2. Click "Export" on any patient or study
3. Select "Direct CD Burn (Recommended)"
4. Optional: Check "Include DICOM Viewer Software"
5. Optional: Specify drive letter (or leave blank for auto-detect)
6. Click "Burn to CD/DVD"
7. Wait for burn to complete

### API Endpoint

```http
POST /api/export/direct-burn
Content-Type: application/json
Authorization: Bearer <token>

{
  "targetType": "study",
  "targetId": "1.2.840.113619.2.358.3.2831219201.601.1763642645.429",
  "includeImages": true,
  "includeViewer": false,
  "driveLetter": "D"
}
```

### Response

```json
{
  "success": true,
  "message": "CD burn completed successfully",
  "details": {
    "targetType": "study",
    "targetId": "1.2.840.113619.2.358.3.2831219201.601.1763642645.429",
    "studyCount": 1,
    "includeViewer": false,
    "burnOutput": [
      "Starting CD burn process...",
      "Found 1 burner(s)",
      "Using first available drive: D:\\",
      "Checking media...",
      "Creating file system image...",
      "Adding files to image...",
      "Starting burn operation...",
      "Burn completed successfully!"
    ]
  }
}
```

## DICOM Viewer Software

### Included Viewer Options

The system can include a portable DICOM viewer on the disc. Currently supported:

1. **MicroDicom Portable** (if available in `server/resources/microdicom-portable/`)
2. **Viewer Instructions** (if viewer not available)

### Adding Viewer Software

To include MicroDicom portable viewer:

1. Download MicroDicom portable from http://www.microdicom.com/
2. Extract to `server/resources/microdicom-portable/`
3. Enable "Include DICOM Viewer Software" when burning

### Alternative Viewers

If MicroDicom is not available, the disc includes instructions for downloading:
- MicroDicom (Windows)
- RadiAnt DICOM Viewer (Windows)
- Horos (Mac)
- Weasis (Cross-platform)

## Advantages Over ZIP Method

| Feature | Direct Burn | ZIP + Burn |
|---------|-------------|------------|
| Speed | ✅ Fast | ❌ Slower (2x time) |
| Disc Space | ✅ Efficient | ❌ Wastes space |
| PACS Compatible | ✅ Yes | ✅ Yes |
| Backup Copy | ❌ No | ✅ Yes (ZIP file) |
| Viewer Software | ✅ Optional | ❌ No |
| Temp Storage | ✅ Minimal | ❌ Large |

## Technical Details

### DICOM Media Format

The disc follows DICOM Part 10 Media Storage specification:
- **File System**: ISO 9660 + Joliet (universal compatibility)
- **DICOMDIR**: Index file at root level
- **File Structure**: Proper DICOM directory hierarchy
- **Volume Name**: DICOM_MEDIA

### Supported Media Types

- CD-R (700 MB, write once)
- CD-RW (700 MB, rewritable)
- DVD-R (4.7 GB, write once)
- DVD-RW (4.7 GB, rewritable)
- DVD+R (4.7 GB, write once)
- DVD+RW (4.7 GB, rewritable)

### Platform Requirements

- **Server OS**: Windows Server 2016+ or Windows 10/11
- **CD/DVD Drive**: Physical burner required
- **IMAPI2**: Built into Windows Vista and later
- **Permissions**: User must have burn permissions

## Troubleshooting

### "No CD/DVD burner found"
- Verify physical drive is connected
- Check Device Manager
- Try restarting the server

### "No writable media found"
- Insert blank or rewritable disc
- Ensure disc is not write-protected
- Try different media brand

### "Burn failed" or timeout
- Reduce data size (uncheck "Include DICOM images" for metadata only)
- Use faster media (CD-RW)
- Check disc quality
- Try slower burn speed

### Viewer not included
- Download MicroDicom portable
- Place in `server/resources/microdicom-portable/`
- Or use viewer instructions on disc

## Performance

### Typical Burn Times

| Study Size | Media Type | Time |
|------------|------------|------|
| 50 MB (50 images) | CD-R | 2-3 min |
| 200 MB (200 images) | CD-R | 5-7 min |
| 500 MB (500 images) | DVD-R | 3-5 min |
| 2 GB (2000 images) | DVD-R | 8-12 min |

### Comparison: Direct vs ZIP+Burn

For a 200 MB study:
- **Direct Burn**: ~5 minutes total
- **ZIP + Burn**: ~10 minutes total (5 min ZIP creation + 5 min burn)

## Security & Compliance

### HIPAA Compliance
- Audit logging of all burn operations
- User authentication required
- Rate limiting (5 burns per minute)
- Encrypted data in transit

### Audit Trail
All burns are logged with:
- User who performed burn
- Timestamp
- Target type and ID
- Success/failure status
- Drive used

### Data Cleanup
- Temporary files automatically deleted after burn
- No data left on server
- Secure deletion of temp directories

## Best Practices

1. **Use Direct Burn** for routine exports (faster, cleaner)
2. **Use ZIP + Burn** if you need backup copies
3. **Include Viewer** for discs given to patients or external facilities
4. **Test Disc** after burning by importing to PACS or opening in viewer
5. **Label Discs** with patient info, date, and study description
6. **Store Properly** in jewel cases away from heat and sunlight

## API Integration

### Node.js Example

```javascript
const axios = require('axios');

async function burnStudyToCD(studyUID, driveLetter = '') {
  const response = await axios.post(
    'http://localhost:5000/api/export/direct-burn',
    {
      targetType: 'study',
      targetId: studyUID,
      includeImages: true,
      includeViewer: true,
      driveLetter: driveLetter
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

### Python Example

```python
import requests

def burn_study_to_cd(study_uid, drive_letter=''):
    response = requests.post(
        'http://localhost:5000/api/export/direct-burn',
        json={
            'targetType': 'study',
            'targetId': study_uid,
            'includeImages': True,
            'includeViewer': True,
            'driveLetter': drive_letter
        },
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    )
    
    return response.json()
```

## Future Enhancements

Planned features:
- [ ] Multi-session burning (add studies to existing disc)
- [ ] Blu-ray support (25 GB / 50 GB)
- [ ] Custom viewer selection
- [ ] Burn queue for multiple discs
- [ ] Email notification on completion
- [ ] Disc label printing integration

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review `CD_BURN_TROUBLESHOOTING.md`
3. Run `test-cd-burn.ps1` to verify system
4. Check server logs: `logs/audit.log`
5. Contact IT support

## References

- DICOM Part 10: Media Storage - https://dicom.nema.org/medical/dicom/current/output/chtml/part10/chapter_7.html
- IMAPI2 Documentation - https://docs.microsoft.com/en-us/windows/win32/imapi/
- ISO 9660 Standard - https://en.wikipedia.org/wiki/ISO_9660
