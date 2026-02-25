# Create ISO (Recommended) - User SOP

## 1) Purpose

This SOP explains exactly how to export DICOM data as an ISO from the app, download it on another device, and burn it to CD/DVD locally.

Use this method for Linux-hosted servers and cross-device delivery.

## 2) Scope

Applies to:

1. Exporting from `Patients` page using `Create ISO (Recommended)`.
2. Downloading ISO in browser.
3. Burning ISO on recipient workstation.

Does not apply to:

1. Playing files in VLC/Windows Media Player.
2. Legacy `Export ZIP + Burn` server-side flow.

## 3) Preconditions

Before user starts:

1. User is logged in and can open Patients/Studies.
2. Server ISO status is available.
3. Server has ISO toolchain (`xorriso`, `genisoimage`, or `mkisofs`).
4. For Linux server, verify `xorriso` exists (example: `/usr/bin/xorriso`).
5. Browser downloads are allowed for site (no blocked automatic downloads).
6. Enough free space:
   a. Client machine: at least ISO size + 2 GB buffer.
   b. Server `/tmp`: enough temporary space during generation.
7. For image export, prefer Study export if patient has multiple studies.

## 4) Export Steps (Operator)

1. Open `Patients` page.
2. Find patient or study.
3. Click `Export`.
4. In `Delivery Method`, select `Create ISO (Recommended)`.
5. Keep `Include DICOM images and previews` enabled (required for ISO mode).
6. Keep `Include DICOM Viewer Software` enabled for easiest Windows recipient use.
7. Confirm `Server ISO/Viewer Status`:
   a. `ISO export unavailable` must NOT be shown.
   b. If shown, stop and use `Download ZIP file`.
8. Click `Create ISO`.
9. Wait for browser download to start.
10. Do not close tab until download appears in browser downloads.
11. Verify file name pattern: `patient_<id>_dicom_media.iso` or `study_<uid>_dicom_media.iso`.

## 5) Recipient Steps (Open Files)

### Windows

1. Locate downloaded `.iso`.
2. Right-click ISO and choose `Mount`.
3. Open mounted drive.
4. Preferred: double-click `OPEN_DICOM_VIEWER.bat`.
5. If viewer not bundled, open `VIEWER/INSTRUCTIONS.html` and install a DICOM viewer.
6. In viewer, open `DICOMDIR` from disc root.

### Linux

1. Mount ISO (file manager or `mount -o loop`).
2. Install/open DICOM viewer (for example Weasis).
3. Open `DICOMDIR` from mounted ISO root.

### macOS

1. Double-click ISO to mount.
2. Open DICOM viewer (for example Horos/OsiriX).
3. Import/open `DICOMDIR`.

## 6) Burn to CD/DVD (Recipient Workstation)

### Windows 10/11

1. Insert blank CD/DVD.
2. Right-click `.iso`.
3. Click `Burn disc image`.
4. Select correct burner drive.
5. Enable `Verify disc after burning`.
6. Click `Burn`.

### Linux

1. Insert blank disc.
2. Use desktop burner tool or command:
   `growisofs -dvd-compat -Z /dev/sr0=/path/file.iso`
3. Wait for completion and verify.

### macOS

1. Insert blank disc.
2. Open Disk Utility.
3. Choose `Burn`, select ISO, start burn.
4. Verify completion.

## 7) Validation Checklist (After Burn)

1. Disc mounts on target machine.
2. Root contains `DICOMDIR`.
3. Root contains `IMAGES` folder.
4. `README.txt` and `EXPORT_INFO.json` are present.
5. DICOM viewer opens study via `DICOMDIR`.
6. At least one study image opens successfully.

## 8) Important Care Points

1. Do not use normal media players (VLC/Windows Media Player) for DICOM.
2. Always open `DICOMDIR`, not random files.
3. Keep PHI controls:
   a. Share only through authorized channels.
   b. Do not leave ISO files on shared/public desktop.
   c. Delete local ISO after successful burn and handoff, per policy.
4. If patient has multiple studies and ISO with images fails, export one study at a time.
5. Avoid parallel large exports from same user/session.
6. Server behavior: ISO and temp files are created in temp space during processing and cleaned up after stream completes.

## 9) Troubleshooting

### Error: `ENOSPC: no space left on device, mkdtemp '/tmp/dicom-iso-*'`

1. Server temporary disk is full.
2. Free space in `/tmp` (or configured temp path).
3. Remove stale temp folders matching `dicom-iso-*`, `dicom-burn-*`.
4. Retry export.

### Error: `ISO export unavailable on this server`

1. Install one ISO tool: `xorriso` (preferred), `genisoimage`, or `mkisofs`.
2. Reopen export dialog and click `Refresh` in `Server ISO/Viewer Status`.

### Browser shows failed/cancelled download

1. Check browser download permissions for the site.
2. Check network stability.
3. Retry with single study export.
4. If still failing, use `Download ZIP file` fallback.

### Viewer says no images found

1. Confirm user opened `DICOMDIR`.
2. Confirm `IMAGES` folder exists in mounted disc.
3. Try alternate DICOM viewer.

## 10) Support Data to Collect Before Escalation

1. Export target type (`patient` or `study`) and ID.
2. Timestamp with timezone.
3. Browser name/version.
4. Server platform and ISO toolchain status shown in UI.
5. Exact error message text.
6. Approximate study size/number of instances.
