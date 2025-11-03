# Restart Orthanc Instructions

## Configuration Updated ✓
The `orthanc-config/orthanc.json` file has been updated with DICOMweb settings.

## Restart Orthanc (Run as Administrator)

### Option 1: Using Services
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find "Orthanc" service
4. Right-click → Restart

### Option 2: Using PowerShell (Run as Administrator)
```powershell
Restart-Service -Name "Orthanc" -Force
```

### Option 3: Using Command Prompt (Run as Administrator)
```cmd
net stop Orthanc
net start Orthanc
```

## Verify DICOMweb After Restart

Run these commands to verify:

```powershell
# Check DICOMweb studies endpoint
curl http://localhost:8042/dicom-web/studies

# Check WADO endpoint
curl http://localhost:8042/wado

# Check system status
curl http://localhost:8042/system
```

## Expected Results
- `/dicom-web/studies` should return JSON (200 OK)
- `/wado` should return WADO service info (not 404)
- `/system` should show Orthanc is running

## Current Status
- ✓ Configuration file updated
- ✓ DICOMweb endpoint already responding (partial)
- ⚠ Full restart needed to apply all settings
