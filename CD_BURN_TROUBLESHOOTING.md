# CD Burn Troubleshooting Guide

## Overview
The CD burn feature allows direct burning of DICOM exports to CD/DVD media on Windows servers using IMAPI2 COM objects.

## Prerequisites

1. **Windows Server**: CD burn only works on Windows hosts
2. **CD/DVD Burner**: Physical CD/DVD drive must be present
3. **Blank Media**: Insert a blank CD or DVD before burning
4. **IMAPI2**: Windows Image Mastering API v2 (built into Windows Vista+)

## Testing CD Burn Capability

Run the test script to verify your system supports CD burning:

```powershell
.\test-cd-burn.ps1
```

This will check:
- IMAPI2 availability
- CD/DVD burner detection
- Drive letters and capabilities
- Media presence
- ADODB Stream support

## Common Issues and Solutions

### 1. "No CD/DVD burner found"
**Cause**: No physical CD/DVD drive detected on the server

**Solutions**:
- Verify a CD/DVD drive is physically connected
- Check Device Manager to ensure the drive is recognized
- Use "Download ZIP" mode instead and burn manually

### 2. "No writable media found in drive"
**Cause**: No blank CD/DVD inserted or media is not writable

**Solutions**:
- Insert a blank CD-R, CD-RW, DVD-R, or DVD-RW disc
- Ensure the disc is not finalized or write-protected
- Try a different blank disc

### 3. "Overwriting non-blank media is not allowed"
**Cause**: The disc already has data and ForceOverwrite was not enabled

**Solution**: This is now fixed! The system automatically enables ForceOverwrite to support:
- ✅ Rewritable media (CD-RW, DVD-RW, DVD+RW)
- ✅ Overwriting existing data
- ✅ Blank media (CD-R, DVD-R)

**Note**: For write-once media (CD-R, DVD-R), use a blank disc. For rewritable media (CD-RW, DVD-RW), the system will automatically erase and rewrite.

### 4. "Drive [X]: not found or not available"
**Cause**: Specified drive letter doesn't match the CD/DVD drive

**Solutions**:
- Leave the drive letter field blank for auto-detection
- Check the correct drive letter in Windows Explorer
- Use the test script to see available drive letters

### 5. "The selected recorder does not support data burning"
**Cause**: Drive doesn't support burning or is read-only

**Solutions**:
- Verify the drive is a burner, not just a reader
- Update the drive firmware
- Try a different CD/DVD drive

### 6. "Direct burn failed" with timeout
**Cause**: Burning process took too long (>10 minutes)

**Solutions**:
- Reduce export size by unchecking "Include DICOM images"
- Use faster media (CD-RW instead of CD-R)
- Burn manually using the prepared ZIP file

## Manual Burn Fallback

If direct burn fails, the system still prepares a ZIP file that you can burn manually:

1. Locate the generated ZIP file (path shown in error message)
2. Use Windows built-in burn utility:
   - Right-click the ZIP file
   - Select "Burn disc image" or "Send to > DVD RW Drive"
3. Or use third-party software like ImgBurn, CDBurnerXP, etc.

## Drive Letter Detection

The system auto-detects CD/DVD drives by:
1. Enumerating all IMAPI2 recorders
2. Checking volume path names
3. Selecting the first available burner if no drive letter specified

**Recommendation**: Leave drive letter blank unless you have multiple CD/DVD drives.

## Supported Media Types

- CD-R (write once)
- CD-RW (rewritable)
- DVD-R (write once)
- DVD-RW (rewritable)
- DVD+R (write once)
- DVD+RW (rewritable)

## File System

The burn process uses:
- **File System**: ISO 9660 + Joliet (FileSystemsToCreate = 4)
- **Volume Name**: PACS_EXPORT
- **Layout**: DICOMDIR at disc root for PACS compatibility

## Performance Tips

1. **Faster Burns**: Use CD-RW media (faster write speeds)
2. **Smaller Files**: Uncheck "Include DICOM images" for metadata-only export
3. **Reliable Media**: Use quality brand-name discs
4. **Drive Speed**: Slower burn speeds are more reliable (but IMAPI2 auto-selects)

## Logs and Debugging

Check server logs for detailed error messages:
```bash
# View recent export errors
tail -f logs/audit.log | grep "CD burn"
```

PowerShell errors are captured and returned to the frontend with specific messages.

## API Endpoint

```
POST /api/export/burn
Content-Type: application/json

{
  "targetType": "study",
  "targetId": "1.2.840.113619.2.358.3.2831219201.601.1763642645.429",
  "includeImages": true,
  "driveLetter": "D"  // optional, leave blank for auto-detect
}
```

## Response Format

```json
{
  "success": true,
  "export": {
    "targetType": "study",
    "targetId": "...",
    "zipPath": "C:\\temp\\export_12345.zip",
    "zipFileName": "study_export.zip"
  },
  "cdBurn": {
    "attempted": true,
    "status": "completed",  // or "manual_required", "unsupported"
    "message": "CD burn completed successfully."
  }
}
```

## Security Notes

- CD burn requires authentication
- Rate limited to 5 burns per minute per user
- Audit logged with user, timestamp, and target
- Temporary files cleaned up after burn

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Windows Server 2016+ | ✅ Full | IMAPI2 built-in |
| Windows 10/11 | ✅ Full | IMAPI2 built-in |
| Linux | ❌ None | Use Download ZIP |
| macOS | ❌ None | Use Download ZIP |

## Contact

For issues not covered here, check:
- Server logs: `logs/audit.log`
- Windows Event Viewer: Application logs
- IMAPI2 documentation: https://docs.microsoft.com/en-us/windows/win32/imapi/
