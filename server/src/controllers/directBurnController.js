const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { pipeline } = require('stream');
const { promisify } = require('util');
const axios = require('axios');
const Study = require('../models/Study');
const Patient = require('../models/Patient');
const { getUnifiedOrthancService } = require('../services/unified-orthanc-service');
const AdmZip = require('adm-zip');

const execFileAsync = promisify(execFile);
const pipelineAsync = promisify(pipeline);
const MICRODICOM_DOWNLOADS_PAGE_URL = 'https://www.microdicom.com/downloads.html';
const MICRODICOM_SITE_ORIGIN = 'https://www.microdicom.com';

/**
 * Direct CD/DVD burn without creating ZIP file first
 * Creates DICOM media structure directly on disc with optional viewer software
 */

/**
 * Prepare DICOM media folder structure for burning
 * This creates a proper DICOM Part 10 media layout
 */
async function resolveOrthancStudyId(orthancService, study) {
  const directOrthancId =
    study.orthancStudyId ||
    study.orthancStudyID ||
    study.orthancId ||
    study.orthancID ||
    null;

  if (directOrthancId) {
    return directOrthancId;
  }

  const studyInstanceUID = study.studyInstanceUID || study.studyUID;
  if (!studyInstanceUID) {
    return null;
  }

  const resolvedStudy = await orthancService.findStudyByUID(studyInstanceUID, {
    allowScanFallback: true,
  });

  return resolvedStudy?.orthancStudyId || null;
}

function getStudyInstanceUID(study) {
  return study.studyInstanceUID || study.studyUID || null;
}

function getStoredOrthancStudyId(study) {
  return (
    study.orthancStudyId ||
    study.orthancStudyID ||
    study.orthancId ||
    study.orthancID ||
    null
  );
}

function getViewerOptions() {
  return [
    {
      name: 'MicroDicom',
      path: path.join(__dirname, '../../resources/microdicom-portable'),
      exe: 'MicroDicom.exe',
      size: '~15 MB',
    },
    {
      name: 'MicroDicom',
      path: path.join(__dirname, '../../resources/microdicom-portable'),
      exe: 'mDicom.exe',
      size: '~15 MB',
    },
    {
      name: 'Weasis',
      path: path.join(__dirname, '../../resources/weasis-portable'),
      exe: 'Weasis.exe',
      size: '~80 MB',
    },
  ];
}

function normalizeToAbsoluteUrl(candidateUrl) {
  try {
    return new URL(candidateUrl, MICRODICOM_SITE_ORIGIN).toString();
  } catch (_error) {
    return null;
  }
}

function resolvePreferredViewerOption() {
  return getViewerOptions().find((viewer) => {
    const exePath = path.join(viewer.path, viewer.exe);
    return fs.existsSync(exePath);
  }) || null;
}

function parseMicroDicomPortableZipUrl(downloadsHtml) {
  const hrefRegex = /href="([^"]+)"/gi;
  const candidateUrls = [];
  let match = hrefRegex.exec(downloadsHtml);

  while (match) {
    const href = String(match[1] || '').trim();
    const lower = href.toLowerCase();
    if (
      lower.includes('microdicom') &&
      lower.endsWith('.zip') &&
      !lower.includes('autorun') &&
      !lower.includes('wine')
    ) {
      const absoluteUrl = normalizeToAbsoluteUrl(href);
      if (absoluteUrl) {
        candidateUrls.push(absoluteUrl);
      }
    }
    match = hrefRegex.exec(downloadsHtml);
  }

  const preferred = candidateUrls.find((url) => /-x64\.zip$/i.test(url));
  return preferred || candidateUrls[0] || null;
}

async function resolveLatestMicroDicomPortableUrl() {
  const response = await axios.get(MICRODICOM_DOWNLOADS_PAGE_URL, {
    responseType: 'text',
    timeout: 60000,
  });
  const html = String(response.data || '');
  const downloadUrl = parseMicroDicomPortableZipUrl(html);
  if (!downloadUrl) {
    throw new Error('Unable to find a MicroDicom portable ZIP link from downloads page');
  }
  return downloadUrl;
}

async function findFileRecursively(startDir, fileName) {
  const queue = [startDir];
  const normalizedTargetName = String(fileName || '').toLowerCase();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase() === normalizedTargetName) {
        return fullPath;
      }
    }
  }

  return null;
}

function getViewerAvailability() {
  const viewers = getViewerOptions().map((viewer) => {
    const exePath = path.join(viewer.path, viewer.exe);
    return {
      ...viewer,
      exePath,
      available: fs.existsSync(exePath),
    };
  });

  const selectedViewer = viewers.find((viewer) => viewer.available) || null;

  return {
    viewerInstalled: Boolean(selectedViewer),
    selectedViewer: selectedViewer
      ? {
          name: selectedViewer.name,
          exe: selectedViewer.exe,
          size: selectedViewer.size,
        }
      : null,
    viewers: viewers.map((viewer) => ({
      name: viewer.name,
      exe: viewer.exe,
      size: viewer.size,
      available: viewer.available,
    })),
  };
}

async function prepareDicomMediaFolder(
  targetType,
  targetId,
  includeImages,
  includeViewer = false,
  progressCallback = null
) {
  const reportProgress = (state) => {
    if (typeof progressCallback === 'function') {
      progressCallback(state);
    }
  };

  const tempDir = await createManagedTempDir('dicom-burn-');
  const mediaRoot = path.join(tempDir, 'DISC_ROOT');
  await fs.promises.mkdir(mediaRoot, { recursive: true });

  try {
    // Get study data from Orthanc
    const orthancService = getUnifiedOrthancService();
    const shouldIncludeImages = includeImages !== false;
    let studies = [];

    if (targetType === 'patient') {
      const patient = await Patient.findOne({ patientID: targetId }).lean();
      if (!patient) {
        throw new Error(`Patient ${targetId} not found`);
      }
      studies = await Study.find({ patientID: targetId }).lean();
    } else {
      const study = await Study.findOne({
        $or: [{ studyInstanceUID: targetId }, { studyUID: targetId }],
      }).lean();
      if (!study) {
        throw new Error(`Study ${targetId} not found`);
      }
      studies = [study];
    }

    if (studies.length === 0) {
      throw new Error('No studies found for burning');
    }

    reportProgress({
      phase: 'preparing',
      progress: 15,
      message: `Preparing ${studies.length} study export(s)...`,
    });

    if (targetType === 'patient' && shouldIncludeImages && studies.length > 1) {
      throw new Error(
        'Direct burn currently supports one study per disc. Select a study export or use ZIP + Burn for multi-study exports.'
      );
    }

    let studiesWithMedia = 0;

    // For each study, get the DICOM media from Orthanc
    if (shouldIncludeImages) {
      let studyIndex = 0;
      for (const study of studies) {
        studyIndex += 1;
        const studyInstanceUID = getStudyInstanceUID(study) || 'unknown-study';
        const candidateOrthancStudyIds = [];
        const storedOrthancStudyId = getStoredOrthancStudyId(study);

        if (storedOrthancStudyId) {
          candidateOrthancStudyIds.push(storedOrthancStudyId);
        }

        const resolvedOrthancStudyId = await resolveOrthancStudyId(orthancService, study);
        if (
          resolvedOrthancStudyId &&
          !candidateOrthancStudyIds.includes(resolvedOrthancStudyId)
        ) {
          candidateOrthancStudyIds.push(resolvedOrthancStudyId);
        }

        if (candidateOrthancStudyIds.length === 0) {
          console.warn(`Study ${studyInstanceUID} has no resolvable Orthanc ID, skipping`);
          continue;
        }

        let mediaZip = null;
        let lastExportError = null;

        for (const orthancStudyId of candidateOrthancStudyIds) {
          try {
            reportProgress({
              phase: 'exporting_media',
              progress: Math.min(55, 20 + Math.floor((studyIndex / studies.length) * 30)),
              message: `Fetching DICOM media from PACS (${studyIndex}/${studies.length})...`,
              studyInstanceUID,
            });
            console.log(
              `Exporting media for study ${studyInstanceUID} from Orthanc study ${orthancStudyId}...`
            );
            // Use longer timeout for ISO export (5 minutes)
            const mediaBuffer = await orthancService.exportStudyMedia(orthancStudyId, {
              timeoutMs: 300000 // 5 minutes
            });
            const parsedZip = new AdmZip(Buffer.from(mediaBuffer));
            parsedZip.getEntries(); // validate ZIP structure
            mediaZip = parsedZip;
            break;
          } catch (error) {
            const normalizedErrorMessage =
              error?.code === 'ECONNABORTED' ||
              String(error?.message || '').toLowerCase().includes('timeout')
                ? 'PACS media export timed out. The study may be large or the PACS connection is slow.'
                : error.message;
            lastExportError = new Error(normalizedErrorMessage);
            console.warn(
              `Failed media export for study ${studyInstanceUID} with Orthanc study ${orthancStudyId}: ${normalizedErrorMessage}`
            );
          }
        }

        if (!mediaZip) {
          throw new Error(
            `Failed to export DICOM media for study ${studyInstanceUID}: ${
              lastExportError?.message || 'unknown error'
            }`
          );
        }

        mediaZip.extractAllTo(mediaRoot, studiesWithMedia > 0);
        studiesWithMedia++;
        reportProgress({
          phase: 'exporting_media',
          progress: Math.min(60, 25 + Math.floor((studiesWithMedia / studies.length) * 35)),
          message: `Prepared study ${studiesWithMedia}/${studies.length} for burn`,
          studyInstanceUID,
        });
      }

      if (studiesWithMedia === 0) {
        throw new Error('No study media could be exported from Orthanc');
      }
    }

    // Add metadata file
    const metadata = {
      exportDate: new Date().toISOString(),
      targetType,
      targetId,
      studyCount: studies.length,
      studiesWithMedia,
      includeImages: shouldIncludeImages,
      studies: studies.map(s => ({
        studyInstanceUID: s.studyInstanceUID || s.studyUID,
        studyDate: s.studyDate,
        studyDescription: s.studyDescription,
        modality: s.modality,
      })),
    };

    await fs.promises.writeFile(
      path.join(mediaRoot, 'EXPORT_INFO.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Add README file
    const readme = `DICOM Medical Imaging Export
=============================

Export Date: ${new Date().toISOString()}
Type: ${targetType}
ID: ${targetId}
Studies: ${studies.length}

This disc contains medical imaging data in DICOM format.

DICOM FILES:
${shouldIncludeImages ? '- DICOMDIR: Index file for PACS systems\n- DICOM/: Folder containing DICOM image files' : '- DICOM image export disabled (metadata-only burn)'}

VIEWING OPTIONS:
1. Import to PACS: Use your PACS system's "Import from Media" function
2. DICOM Viewer: Use software like OsiriX, Horos, RadiAnt, or MicroDicom
3. Included Viewer: ${includeViewer ? 'Double-click OPEN_DICOM_VIEWER.bat at disc root (or VIEWER\\\\Launch_Viewer.bat)' : 'No viewer included'}

IMPORTANT:
- This data is confidential medical information
- Handle according to HIPAA/privacy regulations
- Do not share without proper authorization

For technical support, contact your radiology department.
`;

    await fs.promises.writeFile(path.join(mediaRoot, 'README.txt'), readme);

    // Optionally add portable DICOM viewer
    if (includeViewer) {
      reportProgress({
        phase: 'preparing',
        progress: 65,
        message: 'Adding viewer files...',
      });
      await addPortableDicomViewer(mediaRoot);
    }

    return {
      mediaRoot,
      tempDir,
      studyCount: studies.length,
    };
  } catch (error) {
    // Cleanup on error
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to cleanup temp directory:', cleanupError);
    }
    throw error;
  }
}

/**
 * Add portable DICOM viewer to the disc
 * Supports multiple viewer options with fallback to instructions
 */
async function addPortableDicomViewer(mediaRoot) {
  const viewerDir = path.join(mediaRoot, 'VIEWER');
  await fs.promises.mkdir(viewerDir, { recursive: true });

  // Try different viewer options in order of preference
  const viewerOptions = getViewerOptions();

  let viewerIncluded = false;

  for (const viewer of viewerOptions) {
    const exePath = path.join(viewer.path, viewer.exe);
    if (fs.existsSync(exePath)) {
      console.log(`Including ${viewer.name} viewer from ${viewer.path}`);
      await copyDirectory(viewer.path, viewerDir);
      
      // Create launch script
      const launchScript = `@echo off
setlocal EnableExtensions
echo Starting ${viewer.name} DICOM Viewer...
echo.
echo Loading DICOM files from this disc...
echo.
set "VIEWER_DIR=%~dp0"
for %%I in ("%VIEWER_DIR%..") do set "DISC_ROOT=%%~fI"
set "DICOMDIR_PATH=%DISC_ROOT%\\DICOMDIR"
set "DICOM_FOLDER=%DISC_ROOT%\\DICOM"
set "EXE_PATH="

if exist "%VIEWER_DIR%${viewer.exe}" set "EXE_PATH=%VIEWER_DIR%${viewer.exe}"
if "%EXE_PATH%"=="" if exist "%VIEWER_DIR%MicroDicom.exe" set "EXE_PATH=%VIEWER_DIR%MicroDicom.exe"
if "%EXE_PATH%"=="" if exist "%VIEWER_DIR%mDicom.exe" set "EXE_PATH=%VIEWER_DIR%mDicom.exe"
if "%EXE_PATH%"=="" if exist "%VIEWER_DIR%Weasis.exe" set "EXE_PATH=%VIEWER_DIR%Weasis.exe"

if not exist "%DICOMDIR_PATH%" (
  for /f "delims=" %%F in ('dir /b /s /a:-d "%DISC_ROOT%\\DICOMDIR" 2^>nul') do (
    set "DICOMDIR_PATH=%%~fF"
    goto :dicomdir_found
  )
)

:dicomdir_found
if "%EXE_PATH%"=="" (
  echo ERROR: Viewer executable not found in VIEWER folder.
  if exist "%VIEWER_DIR%INSTRUCTIONS.html" (
    start "" "%VIEWER_DIR%INSTRUCTIONS.html"
  )
  echo.
  pause
  exit /b 1
)

if exist "%DICOMDIR_PATH%" (
  start "" "%EXE_PATH%" "%DICOMDIR_PATH%"
  exit /b 0
)

if exist "%DICOM_FOLDER%" (
  echo WARNING: DICOMDIR not found. Opening DICOM folder directly.
  start "" "%EXE_PATH%" "%DICOM_FOLDER%"
  exit /b 0
)

echo ERROR: Could not find DICOMDIR or DICOM folder on this disc.
if exist "%VIEWER_DIR%INSTRUCTIONS.html" (
  start "" "%VIEWER_DIR%INSTRUCTIONS.html"
)
echo.
pause
exit /b 1
`;
      await fs.promises.writeFile(path.join(viewerDir, 'Launch_Viewer.bat'), launchScript);

      // Create root launcher for easier "double-click to open" flow
      const rootLauncher = `@echo off
setlocal EnableExtensions
if exist "%~dp0VIEWER\\Launch_Viewer.bat" (
  call "%~dp0VIEWER\\Launch_Viewer.bat"
  if not errorlevel 1 exit /b 0
)

if exist "%~dp0VIEWER\\INSTRUCTIONS.html" (
  start "" "%~dp0VIEWER\\INSTRUCTIONS.html"
  exit /b 0
)

echo ERROR: Viewer launcher not found.
echo Tried:
echo   %~dp0VIEWER\\Launch_Viewer.bat
echo   %~dp0VIEWER\\INSTRUCTIONS.html
echo.
pause
exit /b 1
`;
      await fs.promises.writeFile(path.join(mediaRoot, 'OPEN_DICOM_VIEWER.bat'), rootLauncher);

      const startHere = `DICOM DISC QUICK START
======================

1. Open this disc and double-click OPEN_DICOM_VIEWER.bat
2. If blocked by Windows security, right-click and Run as administrator
3. If still not opening, run VIEWER\\Launch_Viewer.bat directly

If your system cannot run the included viewer, import DICOMDIR into your PACS
or local DICOM viewer application.
`;
      await fs.promises.writeFile(path.join(mediaRoot, 'START_HERE.txt'), startHere);
      
      // Update autorun to use this viewer
      const autorun = `[autorun]
open=OPEN_DICOM_VIEWER.bat
icon=VIEWER\\${viewer.exe}
label=DICOM Medical Images
action=Open ${viewer.name} DICOM Viewer
`;
      await fs.promises.writeFile(path.join(mediaRoot, 'autorun.inf'), autorun);
      
      viewerIncluded = true;
      console.log(`${viewer.name} viewer included successfully`);
      break;
    }
  }

  if (!viewerIncluded) {
    // No viewer available - create comprehensive instructions
    console.log('No portable viewer found, creating instructions');
    
    const instructions = `DICOM VIEWER INSTRUCTIONS
=========================

This disc contains medical imaging data in DICOM format.
To view the images, you need DICOM viewer software.

QUICK START:
1. Download and install a free DICOM viewer (see options below)
2. Open the viewer software
3. Use "Open" or "Import from Media" function
4. Select the DICOMDIR file from this disc
5. Images will be displayed

RECOMMENDED FREE VIEWERS:

1. MicroDicom (Windows) - EASIEST
   Website: http://www.microdicom.com/
   Download: http://www.microdicom.com/downloads.html
   Size: 15 MB
   Features: Simple interface, fast, portable version available
   Best for: Quick viewing, non-technical users

2. RadiAnt DICOM Viewer (Windows) - PROFESSIONAL
   Website: https://www.radiantviewer.com/
   Download: https://www.radiantviewer.com/dicom-viewer-download.php
   Size: 50 MB
   Features: Advanced tools, measurements, 3D reconstruction
   Best for: Detailed analysis, radiologists
   Note: Free for non-commercial use

3. Horos (Mac) - MAC USERS
   Website: https://horosproject.org/
   Download: https://horosproject.org/download/
   Size: 100 MB
   Features: Full-featured, based on OsiriX
   Best for: Mac users, advanced imaging

4. Weasis (Windows/Mac/Linux) - CROSS-PLATFORM
   Website: https://nroduit.github.io/
   Download: https://nroduit.github.io/en/getting-started/
   Size: 80 MB
   Features: Web-based, cross-platform, open source
   Best for: Any operating system, web integration

5. 3D Slicer (Windows/Mac/Linux) - RESEARCH
   Website: https://www.slicer.org/
   Download: https://download.slicer.org/
   Size: 500 MB
   Features: 3D visualization, research tools, AI integration
   Best for: Research, advanced 3D analysis

INSTALLATION STEPS:

For MicroDicom (Recommended):
1. Go to http://www.microdicom.com/downloads.html
2. Click "Download MicroDicom" (portable or installer)
3. Run the downloaded file
4. Open MicroDicom
5. Click File → Open → Select DICOMDIR from this disc
6. Images will appear

For RadiAnt:
1. Go to https://www.radiantviewer.com/dicom-viewer-download.php
2. Download the installer
3. Install and run RadiAnt
4. Drag and drop the DICOMDIR file into RadiAnt
5. Or use File → Open → Select DICOMDIR

PACS SYSTEM IMPORT:

If you have access to a PACS system:
1. Insert this disc into the PACS workstation
2. Use "Import from Media" or "Import from CD" function
3. PACS will automatically read the DICOMDIR
4. All studies will be imported

TECHNICAL INFORMATION:

File Format: DICOM (Digital Imaging and Communications in Medicine)
Standard: DICOM Part 10 Media Storage
File System: ISO 9660 + Joliet (universal compatibility)
Index File: DICOMDIR (at disc root)

DISC CONTENTS:

DICOMDIR - Index file for PACS systems and viewers
DICOM/ - Folder containing DICOM image files (.dcm)
EXPORT_INFO.json - Metadata about this export
README.txt - General information
VIEWER/ - This folder with instructions

TROUBLESHOOTING:

Q: Viewer says "No DICOM files found"
A: Make sure you opened the DICOMDIR file, not individual image files

Q: Images appear black or corrupted
A: Try a different viewer - some viewers handle certain formats better

Q: Can't install software on this computer
A: Use a web-based viewer like Weasis, or ask IT to install approved viewer

Q: Need to share with someone without DICOM software
A: Export images as JPEG/PNG from a viewer, or burn another disc with viewer included

PRIVACY & SECURITY:

⚠️ IMPORTANT: This disc contains confidential medical information
- Handle according to HIPAA and privacy regulations
- Do not share without proper authorization
- Store securely when not in use
- Destroy properly when no longer needed

SUPPORT:

For technical support with this disc:
- Contact your radiology department
- Or the facility that provided this disc

For viewer software support:
- Visit the viewer's website (links above)
- Check their documentation and support forums

WHY NO VIEWER INCLUDED?

To include a portable viewer on this disc, the system administrator
needs to set it up. See server/resources/VIEWER_SETUP.md for instructions.

This allows you to choose which viewer to use and keeps the disc size smaller.
`;

    await fs.promises.writeFile(path.join(viewerDir, 'VIEWER_INSTRUCTIONS.txt'), instructions);
    
    // Create a simple HTML version for better formatting
    const htmlInstructions = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DICOM Viewer Instructions</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .viewer { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; }
        .viewer h3 { margin-top: 0; color: #2980b9; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .step { background: #e8f5e9; padding: 10px; margin: 5px 0; border-radius: 4px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>📀 DICOM Viewer Instructions</h1>
    <p>This disc contains medical imaging data in DICOM format. To view the images, you need DICOM viewer software.</p>
    
    <h2>🚀 Quick Start</h2>
    <div class="step">1. Download and install a free DICOM viewer (see options below)</div>
    <div class="step">2. Open the viewer software</div>
    <div class="step">3. Use "Open" or "Import from Media" function</div>
    <div class="step">4. Select the <code>DICOMDIR</code> file from this disc</div>
    <div class="step">5. Images will be displayed</div>
    
    <h2>💻 Recommended Free Viewers</h2>
    
    <div class="viewer">
        <h3>MicroDicom (Windows) - EASIEST ⭐</h3>
        <p><strong>Website:</strong> <a href="http://www.microdicom.com/" target="_blank">microdicom.com</a></p>
        <p><strong>Best for:</strong> Quick viewing, non-technical users</p>
        <p><strong>Size:</strong> 15 MB</p>
    </div>
    
    <div class="viewer">
        <h3>RadiAnt DICOM Viewer (Windows) - PROFESSIONAL</h3>
        <p><strong>Website:</strong> <a href="https://www.radiantviewer.com/" target="_blank">radiantviewer.com</a></p>
        <p><strong>Best for:</strong> Detailed analysis, radiologists</p>
        <p><strong>Size:</strong> 50 MB</p>
    </div>
    
    <div class="viewer">
        <h3>Horos (Mac) - MAC USERS</h3>
        <p><strong>Website:</strong> <a href="https://horosproject.org/" target="_blank">horosproject.org</a></p>
        <p><strong>Best for:</strong> Mac users, advanced imaging</p>
        <p><strong>Size:</strong> 100 MB</p>
    </div>
    
    <div class="viewer">
        <h3>Weasis (All Platforms) - CROSS-PLATFORM</h3>
        <p><strong>Website:</strong> <a href="https://nroduit.github.io/" target="_blank">nroduit.github.io</a></p>
        <p><strong>Best for:</strong> Any operating system</p>
        <p><strong>Size:</strong> 80 MB</p>
    </div>
    
    <div class="warning">
        <strong>⚠️ PRIVACY NOTICE:</strong> This disc contains confidential medical information.
        Handle according to HIPAA and privacy regulations. Do not share without proper authorization.
    </div>
    
    <h2>📞 Support</h2>
    <p>For technical support, contact your radiology department or the facility that provided this disc.</p>
</body>
</html>`;

    await fs.promises.writeFile(path.join(viewerDir, 'INSTRUCTIONS.html'), htmlInstructions);

    const startHere = `DICOM DISC QUICK START
======================

No portable viewer is bundled on this disc.

1. Open VIEWER\\INSTRUCTIONS.html for download links
2. Install any DICOM viewer (MicroDicom, RadiAnt, Horos, Weasis)
3. Open DICOMDIR from disc root in that viewer
`;
    await fs.promises.writeFile(path.join(mediaRoot, 'START_HERE.txt'), startHere);

    // Root helper to open instructions with one click
    const openInstructions = `@echo off
setlocal EnableExtensions
if exist "%~dp0VIEWER\\INSTRUCTIONS.html" (
  start "" "%~dp0VIEWER\\INSTRUCTIONS.html"
  exit /b 0
)
echo ERROR: INSTRUCTIONS.html not found.
echo.
pause
exit /b 1
`;
    await fs.promises.writeFile(path.join(mediaRoot, 'OPEN_DICOM_VIEWER.bat'), openInstructions);
    
    // Create autorun that opens instructions
    const autorun = `[autorun]
open=OPEN_DICOM_VIEWER.bat
icon=%SystemRoot%\\system32\\SHELL32.dll,23
label=DICOM Medical Images
action=View Instructions
`;
    await fs.promises.writeFile(path.join(mediaRoot, 'autorun.inf'), autorun);
  }

  return viewerIncluded;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

function stripWrappingQuotes(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function getCommandExtensions(commandName) {
  const normalized = String(commandName || '').trim();
  if (!normalized) {
    return [];
  }

  if (process.platform !== 'win32') {
    return [normalized];
  }

  const hasExtension = Boolean(path.extname(normalized));
  if (hasExtension) {
    return [normalized];
  }

  const pathExt = String(process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((ext) => ext.trim())
    .filter(Boolean);

  return [normalized, ...pathExt.map((ext) => `${normalized}${ext}`)];
}

function isExecutablePath(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return false;
    }

    if (process.platform === 'win32') {
      return true;
    }

    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch (_error) {
    return false;
  }
}

function commandExistsInPath(commandName) {
  const normalized = String(commandName || '').trim();
  if (!normalized) {
    return false;
  }

  const hasPathSeparator = normalized.includes('/') || normalized.includes('\\');
  if (hasPathSeparator) {
    return isExecutablePath(path.resolve(normalized));
  }

  const pathValue = String(process.env.PATH || '');
  const pathEntries = pathValue
    .split(path.delimiter)
    .map((entry) => stripWrappingQuotes(entry))
    .filter(Boolean);

  if (pathEntries.length === 0) {
    return false;
  }

  const commandCandidates = getCommandExtensions(normalized);

  for (const dirPath of pathEntries) {
    for (const candidate of commandCandidates) {
      const candidatePath = path.join(dirPath, candidate);
      if (isExecutablePath(candidatePath)) {
        return true;
      }
    }
  }

  return false;
}

async function commandExists(commandName) {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  try {
    await execFileAsync(checker, [commandName], { timeout: 10000, windowsHide: true });
    return true;
  } catch (_error) {
    return commandExistsInPath(commandName);
  }
}

async function firstAvailableCommand(commandCandidates) {
  for (const candidate of commandCandidates) {
    if (await commandExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function toBoolean(value, defaultValue = true) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase() !== 'false';
}

function getPreferredTempBaseDirs() {
  const preferred = [
    process.env.DICOM_EXPORT_TEMP_DIR,
    process.env.EXPORT_TEMP_DIR,
    process.env.TMPDIR,
    path.join(__dirname, '../../tmp'),
    process.platform === 'linux' ? '/var/tmp' : null,
    os.tmpdir(),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const candidate of preferred) {
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

async function cleanupStaleTempFolders(baseDir, maxAgeMs = 12 * 60 * 60 * 1000) {
  const managedPrefixes = ['dicom-iso-', 'dicom-burn-', 'microdicom-install-'];
  let removedCount = 0;
  const now = Date.now();

  try {
    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!managedPrefixes.some((prefix) => entry.name.startsWith(prefix))) continue;

      const fullPath = path.join(baseDir, entry.name);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (now - stats.mtimeMs < maxAgeMs) continue;
        await fs.promises.rm(fullPath, { recursive: true, force: true });
        removedCount += 1;
      } catch (_entryError) {
        // Best effort cleanup only.
      }
    }
  } catch (_scanError) {
    // Best effort cleanup only.
  }

  return removedCount;
}

function buildNoSpaceTempError(baseDir, originalError) {
  const error = new Error(
    `Server temporary storage is full (${baseDir}). Free space on the server or set DICOM_EXPORT_TEMP_DIR to a larger volume, then retry.`
  );
  error.code = 'ENOSPC';
  error.statusCode = 507;
  error.cause = originalError;
  return error;
}

function isNoSpaceError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'ENOSPC' || message.includes('no space left on device');
}

async function createManagedTempDir(prefix) {
  const baseDirs = getPreferredTempBaseDirs();
  let firstNoSpaceError = null;

  for (const baseDir of baseDirs) {
    try {
      await fs.promises.mkdir(baseDir, { recursive: true });
      await cleanupStaleTempFolders(baseDir);
      return await fs.promises.mkdtemp(path.join(baseDir, prefix));
    } catch (error) {
      if (isNoSpaceError(error)) {
        firstNoSpaceError = firstNoSpaceError || buildNoSpaceTempError(baseDir, error);

        // Try one aggressive cleanup pass on this location, then retry once.
        try {
          await cleanupStaleTempFolders(baseDir, 60 * 1000);
          return await fs.promises.mkdtemp(path.join(baseDir, prefix));
        } catch (retryError) {
          if (!isNoSpaceError(retryError)) {
            throw retryError;
          }
        }
        continue;
      }

      // For permission or other filesystem errors, continue to next candidate dir.
      continue;
    }
  }

  if (firstNoSpaceError) {
    throw firstNoSpaceError;
  }

  throw new Error(
    `Unable to allocate temporary export directory. Checked: ${baseDirs.join(', ')}`
  );
}

function normalizeLinuxBurnDevice(deviceInput) {
  const raw = String(deviceInput || '').trim();
  if (!raw) {
    return '';
  }

  if (raw.startsWith('/dev/')) {
    return raw;
  }

  // Accept "sr0" style shorthand from UI and normalize.
  if (/^[a-zA-Z0-9_-]+$/.test(raw)) {
    return `/dev/${raw}`;
  }

  return raw;
}

function detectLinuxBurnDevice(preferredDevice = '') {
  const normalizedPreferred = normalizeLinuxBurnDevice(preferredDevice);
  if (normalizedPreferred) {
    return fs.existsSync(normalizedPreferred) ? normalizedPreferred : null;
  }

  const commonDevicePaths = ['/dev/sr0', '/dev/cdrom', '/dev/dvd'];
  for (const candidate of commonDevicePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const devEntries = fs.readdirSync('/dev');
    const srCandidate = devEntries.find((entry) => /^sr\d+$/i.test(entry));
    if (srCandidate) {
      const resolved = `/dev/${srCandidate}`;
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }
  } catch (_error) {
    // Best effort only.
  }

  return null;
}

function sanitizeFileSegment(value, fallback = 'export') {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

async function getIsoExportSupportStatus() {
  const isoBuilder = await firstAvailableCommand(['xorriso', 'genisoimage', 'mkisofs']);

  if (!isoBuilder) {
    return {
      isoExportSupported: false,
      isoExportMessage:
        'ISO export requires one of these tools on the server: xorriso, genisoimage, or mkisofs.',
      isoToolchain: null,
    };
  }

  return {
    isoExportSupported: true,
    isoExportMessage: `ISO export supported (${isoBuilder})`,
    isoToolchain: isoBuilder,
  };
}

async function getDirectBurnSupportStatus() {
  if (process.platform === 'win32') {
    return {
      directBurnSupported: true,
      directBurnMessage: 'Direct CD burn supported on Windows server',
      burnDeviceHint: null,
      burnToolchain: 'imapi2',
      viewerRunSupported: true,
      viewerRunMessage: 'Viewer launch supported on Windows server host',
    };
  }

  if (process.platform !== 'linux') {
    return {
      directBurnSupported: false,
      directBurnMessage: `Direct CD burn is not supported on platform ${process.platform}`,
      burnDeviceHint: null,
      burnToolchain: null,
      viewerRunSupported: false,
      viewerRunMessage: 'Viewer launch on server host is only supported on Windows servers',
    };
  }

  const isoBuilder = await firstAvailableCommand(['xorriso', 'genisoimage', 'mkisofs']);
  const burnTool = await firstAvailableCommand(['wodim', 'cdrecord', 'growisofs', 'xorriso']);
  const burnDevice = detectLinuxBurnDevice('');

  if (!isoBuilder) {
    return {
      directBurnSupported: false,
      directBurnMessage:
        'Direct CD burn requires Linux ISO tools. Install one of: xorriso, genisoimage, or mkisofs.',
      burnDeviceHint: burnDevice,
      burnToolchain: null,
      viewerRunSupported: false,
      viewerRunMessage: 'Viewer launch on server host is only supported on Windows servers',
    };
  }

  if (!burnTool) {
    return {
      directBurnSupported: false,
      directBurnMessage:
        'Direct CD burn requires Linux burner tools. Install one of: wodim, cdrecord, growisofs, or xorriso.',
      burnDeviceHint: burnDevice,
      burnToolchain: isoBuilder,
      viewerRunSupported: false,
      viewerRunMessage: 'Viewer launch on server host is only supported on Windows servers',
    };
  }

  if (!burnDevice) {
    return {
      directBurnSupported: false,
      directBurnMessage:
        'No Linux CD/DVD device found. Attach a burner and ensure /dev/sr0 (or /dev/cdrom) is available.',
      burnDeviceHint: null,
      burnToolchain: `${isoBuilder}+${burnTool}`,
      viewerRunSupported: false,
      viewerRunMessage: 'Viewer launch on server host is only supported on Windows servers',
    };
  }

  return {
    directBurnSupported: true,
    directBurnMessage: `Direct CD burn supported on Linux (${isoBuilder}+${burnTool})`,
    burnDeviceHint: burnDevice,
    burnToolchain: `${isoBuilder}+${burnTool}`,
    viewerRunSupported: false,
    viewerRunMessage: 'Viewer launch on server host is only supported on Windows servers',
  };
}

async function createIsoImageFromFolder(sourcePath, isoPath, volumeName = 'DICOM_MEDIA') {
  const isoBuilder = await firstAvailableCommand(['xorriso', 'genisoimage', 'mkisofs']);
  if (!isoBuilder) {
    throw new Error(
      'ISO export tool not found. Install xorriso, genisoimage, or mkisofs on the server.'
    );
  }

  const safeVolumeName = String(volumeName || 'DICOM_MEDIA')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 32);

  const args =
    isoBuilder === 'xorriso'
      ? ['-as', 'mkisofs', '-V', safeVolumeName, '-J', '-R', '-o', isoPath, sourcePath]
      : ['-V', safeVolumeName, '-J', '-R', '-o', isoPath, sourcePath];

  await execFileAsync(isoBuilder, args, { timeout: 600000 });

  if (!fs.existsSync(isoPath)) {
    throw new Error('Failed to create ISO file');
  }

  return isoBuilder;
}

function extractBurnErrorMessage(rawOutput) {
  const output = String(rawOutput || '');
  const burnErrorMatch = output.match(/BURN_ERROR:\s*([^\r\n]+)/i);
  if (burnErrorMatch?.[1]) {
    return burnErrorMatch[1].trim();
  }

  const psErrorMatch = output.match(/Error:\s*([^\r\n]+)/i);
  if (psErrorMatch?.[1]) {
    return psErrorMatch[1].trim();
  }

  const linuxToolErrorMatch = output.match(/(?:wodim|cdrecord|growisofs|xorriso):\s*([^\r\n]+)/i);
  if (linuxToolErrorMatch?.[1]) {
    return linuxToolErrorMatch[1].trim();
  }

  return output.trim();
}

function mapBurnErrorToUserMessage(rawMessage, targetDriveOrDevice) {
  const message = String(rawMessage || '').trim();
  const lower = message.toLowerCase();
  const driveDisplay = targetDriveOrDevice || 'the selected drive/device';

  if (!message) {
    return 'CD/DVD burn failed. Please try again with a blank disc.';
  }

  if (lower.includes('no writable media found')) {
    return `No writable disc detected in ${driveDisplay}. Insert a blank or rewritable CD/DVD and try again.`;
  }

  if (lower.includes('no disc found in drive')) {
    return `No disc detected in ${driveDisplay}. Insert a blank or rewritable CD/DVD and try again.`;
  }

  if (lower.includes('disc is full') || lower.includes('not enough space')) {
    return `The disc in ${driveDisplay} does not have enough free space. Use a blank DVD or a disc with more space.`;
  }

  if (lower.includes('drive') && lower.includes('not found')) {
    return `Drive ${driveDisplay} is not available for burning. Check the drive letter or leave it blank for auto-detect.`;
  }

  if (lower.includes('device') && lower.includes('not found')) {
    return `Burn device ${driveDisplay} was not found. Use a valid path like /dev/sr0 or leave blank for auto-detect.`;
  }

  if (lower.includes('no cd/dvd burner found')) {
    return 'No CD/DVD burner was detected on the server. Use ZIP download or check the burner connection.';
  }

  if (lower.includes('source folder not found')) {
    return 'Prepared burn files are no longer available. Please start the burn again.';
  }

  if (lower.includes('access is denied')) {
    return 'Burning was blocked by system permissions. Run the server with burner access and try again.';
  }

  if (
    lower.includes('permission denied') ||
    lower.includes('operation not permitted') ||
    lower.includes('cannot open scsi driver')
  ) {
    return 'Burning was blocked by Linux permissions. Add the server user to the optical drive group (for example cdrom) and retry.';
  }

  if (
    lower.includes('no medium found') ||
    lower.includes('medium not present') ||
    lower.includes('no disk /dev') ||
    lower.includes('cannot load medium')
  ) {
    return `No writable disc detected in ${driveDisplay}. Insert a blank disc and try again.`;
  }

  if (lower.includes('is not blank') || lower.includes('already carries isofs')) {
    return `The disc in ${driveDisplay} is not blank. Insert a blank/rewritable disc and retry.`;
  }

  if (lower.includes('input/output error') || lower.includes('write error')) {
    return `The burner reported a write error on ${driveDisplay}. Try another blank disc and retry.`;
  }

  if (lower.includes('0xc0aa') || lower.includes('imapi')) {
    return `The burner reported a media/hardware error on ${driveDisplay}. Try a different blank disc and retry.`;
  }

  return message;
}

/**
 * Burn folder directly to CD/DVD on Windows via IMAPI2.
 */
async function burnFolderToDiscWindows(sourcePath, driveLetter, volumeName = 'DICOM_MEDIA') {
  const normalizedDriveLetter = driveLetter
    ? `${String(driveLetter).trim().replace(':', '').toUpperCase()}:`
    : '';

  const powershellScript = `
$ErrorActionPreference = "Stop"
try {
  $sourcePath = "${sourcePath.replace(/\\/g, '\\\\')}"
  $targetDrive = "${normalizedDriveLetter}"
  $volumeName = "${volumeName}"
  
  Write-Host "Starting CD burn process..."
  Write-Host "Source: $sourcePath"
  
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source folder not found: $sourcePath"
  }
  
  Write-Host "Initializing disc master..."
  $discMaster = New-Object -ComObject IMAPI2.MsftDiscMaster2
  if ($discMaster.Count -eq 0) {
    throw "No CD/DVD burner found on this system."
  }
  
  Write-Host "Found $($discMaster.Count) burner(s)"
  
  $recorder = $null
  for ($i = 0; $i -lt $discMaster.Count; $i++) {
    $candidate = New-Object -ComObject IMAPI2.MsftDiscRecorder2
    $candidate.InitializeDiscRecorder($discMaster.Item($i))
    
    if ($targetDrive -eq "") {
      $recorder = $candidate
      Write-Host "Using first available drive: $($candidate.VolumePathNames[0])"
      break
    } else {
      $volumePaths = $candidate.VolumePathNames
      foreach ($volPath in $volumePaths) {
        if ($volPath -like "$targetDrive*") {
          $recorder = $candidate
          Write-Host "Using specified drive: $volPath"
          break
        }
      }
      if ($recorder) { break }
    }
  }
  
  if ($null -eq $recorder) {
    if ($targetDrive -eq "") {
      throw "No CD/DVD recorder could be initialized."
    } else {
      throw "Drive $targetDrive not found or not available for burning."
    }
  }
  
  Write-Host "Checking media..."
  $format = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
  $format.Recorder = $recorder
  $format.ForceOverwrite = $true
  
  if (-not $format.IsRecorderSupported($recorder)) {
    throw "The selected recorder does not support data burning."
  }
  if (-not $format.IsCurrentMediaSupported($recorder)) {
    throw "No writable media found in drive. Please insert a blank or rewritable CD/DVD."
  }
  
  Write-Host "Creating file system image..."
  $fileSystem = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
  $fileSystem.ChooseImageDefaults($recorder)
  $fileSystem.FileSystemsToCreate = 4
  $fileSystem.VolumeName = $volumeName
  $fileSystem.FreeMediaBlocks = $format.FreeSectorsOnMedia
  
  Write-Host "Adding files to image..."
  $fileSystem.Root.AddTree($sourcePath, $false)
  
  Write-Host "Creating result image..."
  $image = $fileSystem.CreateResultImage()
  
  Write-Host "Starting burn operation..."
  $burn = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
  $burn.Recorder = $recorder
  $burn.ClientName = "DICOM Medical Imaging"
  $burn.ForceOverwrite = $true
  
  # Write with progress
  $burn.Write($image.ImageStream)
  
  Write-Host "Burn completed successfully!"
  Write-Output "BURN_SUCCESS"
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  Write-Output "BURN_ERROR: $($_.Exception.Message)"
  exit 1
}
`.trim();

  let result;
  try {
    result = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powershellScript],
      { timeout: 900000, windowsHide: false }
    );
  } catch (execError) {
    const rawOutput = [
      execError?.stdout || '',
      execError?.stderr || '',
      execError?.message || '',
    ]
      .filter(Boolean)
      .join('\n');
    const parsedError = extractBurnErrorMessage(rawOutput);
    const userMessage = mapBurnErrorToUserMessage(parsedError, normalizedDriveLetter);
    throw new Error(userMessage);
  }

  if (!String(result.stdout || '').includes('BURN_SUCCESS')) {
    const rawOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
    const parsedError = extractBurnErrorMessage(rawOutput);
    const userMessage = mapBurnErrorToUserMessage(parsedError, normalizedDriveLetter);
    throw new Error(userMessage);
  }

  return result.stdout;
}

/**
 * Burn folder directly to CD/DVD on Linux using mkisofs/genisoimage/xorriso + burner tools.
 */
async function burnFolderToDiscLinux(sourcePath, drivePathInput, volumeName = 'DICOM_MEDIA') {
  const normalizedInput = normalizeLinuxBurnDevice(drivePathInput);
  const devicePath = detectLinuxBurnDevice(normalizedInput);
  const targetDisplay = normalizedInput || devicePath || '/dev/sr0';

  if (!devicePath) {
    if (normalizedInput) {
      throw new Error(
        `Burn device ${normalizedInput} was not found. Use a valid path like /dev/sr0 or leave blank for auto-detect.`
      );
    }
    throw new Error(
      'No Linux CD/DVD device found. Attach a burner and ensure /dev/sr0 (or /dev/cdrom) is available.'
    );
  }

  const isoBuilder = await firstAvailableCommand(['xorriso', 'genisoimage', 'mkisofs']);
  if (!isoBuilder) {
    throw new Error(
      'Missing Linux ISO tool. Install xorriso, genisoimage, or mkisofs to enable direct burn.'
    );
  }

  const burnTool = await firstAvailableCommand(['wodim', 'cdrecord', 'growisofs', 'xorriso']);
  if (!burnTool) {
    throw new Error(
      'Missing Linux burner tool. Install wodim, cdrecord, growisofs, or xorriso to enable direct burn.'
    );
  }

  const tempIsoDir = await createManagedTempDir('dicom-iso-');
  const isoPath = path.join(tempIsoDir, 'dicom_media.iso');
  const safeVolumeName = String(volumeName || 'DICOM_MEDIA')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 32);

  try {
    const isoArgs =
      isoBuilder === 'xorriso'
        ? ['-as', 'mkisofs', '-V', safeVolumeName, '-J', '-R', '-o', isoPath, sourcePath]
        : ['-V', safeVolumeName, '-J', '-R', '-o', isoPath, sourcePath];

    await execFileAsync(isoBuilder, isoArgs, { timeout: 600000 });

    if (!fs.existsSync(isoPath)) {
      throw new Error('Failed to create temporary ISO image for burning');
    }

    let burnResult;
    if (burnTool === 'growisofs') {
      burnResult = await execFileAsync(
        'growisofs',
        ['-dvd-compat', '-Z', `${devicePath}=${isoPath}`],
        { timeout: 900000 }
      );
    } else if (burnTool === 'xorriso') {
      burnResult = await execFileAsync(
        'xorriso',
        ['-as', 'cdrecord', `dev=${devicePath}`, '-v', isoPath],
        { timeout: 900000 }
      );
    } else {
      burnResult = await execFileAsync(
        burnTool,
        [`dev=${devicePath}`, '-v', '-eject', isoPath],
        { timeout: 900000 }
      );
    }

    return `${burnResult.stdout || ''}\n${burnResult.stderr || ''}`.trim();
  } catch (execError) {
    const rawOutput = [
      execError?.stdout || '',
      execError?.stderr || '',
      execError?.message || '',
    ]
      .filter(Boolean)
      .join('\n');
    const parsedError = extractBurnErrorMessage(rawOutput);
    const userMessage = mapBurnErrorToUserMessage(parsedError, targetDisplay);
    throw new Error(userMessage);
  } finally {
    try {
      await fs.promises.rm(tempIsoDir, { recursive: true, force: true });
    } catch (_cleanupError) {
      // Ignore cleanup failure.
    }
  }
}

/**
 * Burn folder directly to CD/DVD on supported server platforms.
 */
async function burnFolderToDisc(sourcePath, driveLetterOrDevice, volumeName = 'DICOM_MEDIA') {
  if (process.platform === 'win32') {
    return burnFolderToDiscWindows(sourcePath, driveLetterOrDevice, volumeName);
  }

  if (process.platform === 'linux') {
    return burnFolderToDiscLinux(sourcePath, driveLetterOrDevice, volumeName);
  }

  throw new Error(`Direct CD burn is not supported on platform ${process.platform}`);
}

/**
 * Return current portable viewer availability on the server.
 */
async function getViewerStatus(req, res) {
  try {
    const availability = getViewerAvailability();
    const isoExportStatus = await getIsoExportSupportStatus();
    const directBurnStatus = await getDirectBurnSupportStatus();
    return res.status(200).json({
      success: true,
      checkedAt: new Date().toISOString(),
      serverPlatform: process.platform,
      ...isoExportStatus,
      ...directBurnStatus,
      ...availability,
    });
  } catch (error) {
    console.error('Viewer status check error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check viewer status',
    });
  }
}

/**
 * Download and install latest MicroDicom portable package on the server.
 */
async function installViewerOnServer(req, res) {
  const forceReinstall = Boolean(req.body?.forceReinstall);
  const currentStatus = getViewerAvailability();

  if (currentStatus.viewerInstalled && !forceReinstall) {
    return res.status(200).json({
      success: true,
      alreadyInstalled: true,
      message: 'Portable viewer is already installed.',
      checkedAt: new Date().toISOString(),
      ...currentStatus,
    });
  }

  let tempDir = null;

  try {
    const viewerDir = path.join(__dirname, '../../resources/microdicom-portable');
    tempDir = await createManagedTempDir('microdicom-install-');
    const zipPath = path.join(tempDir, 'microdicom-portable.zip');

    const downloadUrl = await resolveLatestMicroDicomPortableUrl();
    const downloadResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 300000,
      maxContentLength: 200 * 1024 * 1024,
      maxBodyLength: 200 * 1024 * 1024,
    });

    const zipBuffer = Buffer.from(downloadResponse.data || []);
    if (zipBuffer.length < 1024 * 1024) {
      throw new Error('Downloaded viewer package is unexpectedly small');
    }

    await fs.promises.writeFile(zipPath, zipBuffer);
    await fs.promises.rm(viewerDir, { recursive: true, force: true });
    await fs.promises.mkdir(viewerDir, { recursive: true });

    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(viewerDir, true);

    const rootMicroDicomPath = path.join(viewerDir, 'MicroDicom.exe');
    const rootLegacyPath = path.join(viewerDir, 'mDicom.exe');

    let resolvedExePath = null;
    if (fs.existsSync(rootMicroDicomPath)) {
      resolvedExePath = rootMicroDicomPath;
    } else if (fs.existsSync(rootLegacyPath)) {
      resolvedExePath = rootLegacyPath;
    } else {
      resolvedExePath =
        (await findFileRecursively(viewerDir, 'MicroDicom.exe')) ||
        (await findFileRecursively(viewerDir, 'mDicom.exe'));
    }

    if (!resolvedExePath) {
      throw new Error('Installed package does not contain a MicroDicom executable');
    }

    if (path.resolve(resolvedExePath) !== path.resolve(rootMicroDicomPath)) {
      await fs.promises.copyFile(resolvedExePath, rootMicroDicomPath);
    }

    const installedStatus = getViewerAvailability();
    if (!installedStatus.viewerInstalled) {
      throw new Error('Viewer installation completed but executable was not detected');
    }

    return res.status(200).json({
      success: true,
      alreadyInstalled: false,
      message: 'Portable viewer installed successfully.',
      checkedAt: new Date().toISOString(),
      downloadUrl,
      ...installedStatus,
    });
  } catch (error) {
    console.error('Viewer installation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to install portable viewer',
    });
  } finally {
    if (tempDir) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup viewer install temp directory:', cleanupError.message);
      }
    }
  }
}

/**
 * Launch installed portable viewer on the server host.
 */
async function runViewerOnServer(req, res) {
  try {
    if (process.platform !== 'win32') {
      return res.status(400).json({
        success: false,
        message: 'Viewer launch is only supported on Windows servers',
      });
    }

    const selectedViewer = resolvePreferredViewerOption();
    if (!selectedViewer) {
      return res.status(400).json({
        success: false,
        message: 'No portable viewer is currently installed',
      });
    }

    const exePath = path.join(selectedViewer.path, selectedViewer.exe);
    if (!fs.existsSync(exePath)) {
      return res.status(400).json({
        success: false,
        message: `Viewer executable not found at ${exePath}`,
      });
    }

    if (req.body?.dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        message: `Viewer launch check passed for ${selectedViewer.name}`,
        viewer: {
          name: selectedViewer.name,
          exe: selectedViewer.exe,
        },
      });
    }

    const child = execFile(exePath, [], {
      windowsHide: false,
      detached: true,
    });
    child.unref();

    return res.status(200).json({
      success: true,
      message: `Launched ${selectedViewer.name} on server host`,
      viewer: {
        name: selectedViewer.name,
        exe: selectedViewer.exe,
      },
    });
  } catch (error) {
    console.error('Viewer launch error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to launch viewer',
    });
  }
}

/**
 * Main controller function for direct CD burn
 */
async function directBurnToCD(req, res) {
  let tempDir = null;

  try {
    const { targetType, targetId, includeImages = true, includeViewer = true, driveLetter } = req.body || {};
    
    if (!['patient', 'study'].includes(targetType)) {
      return res.status(400).json({ success: false, message: 'targetType must be patient or study' });
    }
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'targetId is required' });
    }

    const directBurnStatus = await getDirectBurnSupportStatus();
    if (!directBurnStatus.directBurnSupported) {
      return res.status(400).json({
        success: false,
        message:
          directBurnStatus.directBurnMessage ||
          'Direct CD burn is not available on this server configuration',
      });
    }

    req.updateBurnState?.({
      phase: 'preparing',
      progress: 10,
      message: 'Preparing DICOM media files...',
      targetType,
      targetId,
    });

    // Prepare DICOM media folder
    console.log(`Preparing DICOM media for ${targetType} ${targetId}...`);
    const { mediaRoot, tempDir: tmpDir, studyCount } = await prepareDicomMediaFolder(
      targetType,
      targetId,
      includeImages,
      includeViewer,
      (state) => req.updateBurnState?.(state)
    );
    tempDir = tmpDir;

    // Burn to disc
    console.log(`Burning to CD/DVD...`);
    req.updateBurnState?.({
      phase: 'burning',
      progress: 70,
      message: 'Writing files to disc...',
    });
    const burnOutput = await burnFolderToDisc(mediaRoot, driveLetter, 'DICOM_MEDIA');
    req.updateBurnState?.({
      phase: 'finalizing',
      progress: 95,
      message: 'Finalizing disc...',
    });

    // Cleanup temp directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to cleanup temp directory:', cleanupError);
    }

    req.updateBurnState?.({
      phase: 'completed',
      progress: 100,
      message: 'Burn completed successfully',
    });

    return res.status(200).json({
      success: true,
      message: 'CD burn completed successfully',
      details: {
        targetType,
        targetId,
        studyCount,
        includeViewer,
        burnOutput: burnOutput.split('\n').filter(line => line.trim()),
      },
    });
  } catch (error) {
    console.error('Direct CD burn error:', error);
    req.updateBurnState?.({
      phase: 'failed',
      progress: 0,
      message: error.message || 'CD burn failed',
    });

    // Cleanup on error
    if (tempDir) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Failed to cleanup temp directory:', cleanupError);
      }
    }

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'CD burn failed',
    });
  }
}

/**
 * Create ISO image from DICOM media layout and stream to client for download.
 * OPTIMIZED: Streams Orthanc media directly without buffering entire ZIP in memory
 */
async function createIsoExport(req, res) {
  let tempDir = null;
  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (!tempDir) return;
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to cleanup ISO temp directory:', cleanupError);
    }
  };

  try {
    const payload = req.method === 'GET' ? req.query || {} : req.body || {};
    const targetType = payload.targetType;
    const targetId = payload.targetId;
    const includeImages = toBoolean(payload.includeImages, true);
    const includeViewer = toBoolean(payload.includeViewer, true);
    const validateOnly = toBoolean(payload.validateOnly, false);
    const shouldIncludeImages = includeImages !== false;

    if (!['patient', 'study'].includes(targetType)) {
      return res.status(400).json({ success: false, message: 'targetType must be patient or study' });
    }
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'targetId is required' });
    }

    const isoSupport = await getIsoExportSupportStatus();
    if (!isoSupport.isoExportSupported) {
      return res.status(400).json({
        success: false,
        message:
          isoSupport.isoExportMessage ||
          'ISO export is not available on this server configuration',
      });
    }

    // Create temp directory
    tempDir = await createManagedTempDir('dicom-iso-');
    const mediaRoot = path.join(tempDir, 'DISC_ROOT');
    await fs.promises.mkdir(mediaRoot, { recursive: true });

    console.log(`Creating ISO for ${targetType} ${targetId}...`);

    // Get study data
    let studies = [];

    if (targetType === 'patient') {
      const patient = await Patient.findOne({ patientID: targetId }).lean();
      if (!patient) {
        throw new Error(`Patient ${targetId} not found`);
      }
      studies = await Study.find({ patientID: targetId }).lean();
    } else {
      const study = await Study.findOne({
        $or: [{ studyInstanceUID: targetId }, { studyUID: targetId }],
      }).lean();
      if (!study) {
        throw new Error(`Study ${targetId} not found`);
      }
      studies = [study];
    }

    if (studies.length === 0) {
      throw new Error('No studies found');
    }

    if (targetType === 'patient' && shouldIncludeImages && studies.length > 1) {
      throw new Error(
        'ISO export currently supports one study per image export. Select a study export or use ZIP download for multi-study exports.'
      );
    }

    if (validateOnly) {
      return res.status(200).json({
        success: true,
        message: 'ISO export validation passed',
        targetType,
        targetId,
        includeImages: shouldIncludeImages,
        includeViewer,
        studyCount: studies.length,
      });
    }

    let studiesWithMedia = 0;

    // Export DICOM media from Orthanc directly to disc root
    if (shouldIncludeImages) {
      const orthancService = getUnifiedOrthancService();

      for (const study of studies) {
        const studyInstanceUID = getStudyInstanceUID(study) || 'unknown-study';
        const candidateOrthancStudyIds = [];
        const storedOrthancStudyId = getStoredOrthancStudyId(study);

        if (storedOrthancStudyId) {
          candidateOrthancStudyIds.push(storedOrthancStudyId);
        }

        const resolvedOrthancStudyId = await resolveOrthancStudyId(orthancService, study);
        if (
          resolvedOrthancStudyId &&
          !candidateOrthancStudyIds.includes(resolvedOrthancStudyId)
        ) {
          candidateOrthancStudyIds.push(resolvedOrthancStudyId);
        }

        if (candidateOrthancStudyIds.length === 0) {
          throw new Error(`Study ${studyInstanceUID} has no resolvable Orthanc ID`);
        }

        let studyExported = false;
        let lastExportError = null;

        for (const orthancStudyId of candidateOrthancStudyIds) {
          const safeStudySegment = sanitizeFileSegment(studyInstanceUID, 'study');
          const safeOrthancSegment = sanitizeFileSegment(orthancStudyId, 'orthanc');
          const tempMediaZip = path.join(tempDir, `media_${safeStudySegment}_${safeOrthancSegment}.zip`);

          try {
            console.log(
              `Exporting media for study ${studyInstanceUID} from Orthanc study ${orthancStudyId}...`
            );

            // Prefer streaming media export; fall back to buffered export if stream fails.
            try {
              const mediaStream = await orthancService.exportStudyMediaStream(orthancStudyId, {
                timeoutMs: 300000,
              });
              await pipelineAsync(mediaStream, fs.createWriteStream(tempMediaZip));

              const mediaZip = new AdmZip(tempMediaZip);
              mediaZip.getEntries(); // validate ZIP structure
              mediaZip.extractAllTo(mediaRoot, studiesWithMedia > 0);
            } catch (streamError) {
              console.warn(
                `Stream media export failed for study ${studyInstanceUID} (${orthancStudyId}), retrying buffered export: ${streamError.message}`
              );
              const mediaBuffer = await orthancService.exportStudyMedia(orthancStudyId, {
                timeoutMs: 300000,
              });
              const mediaZip = new AdmZip(Buffer.from(mediaBuffer));
              mediaZip.getEntries(); // validate ZIP structure
              mediaZip.extractAllTo(mediaRoot, studiesWithMedia > 0);
            }

            studiesWithMedia += 1;
            studyExported = true;
            console.log(`Prepared study media ${studiesWithMedia}/${studies.length} for ISO`);
            break;
          } catch (error) {
            const normalizedErrorMessage =
              error?.code === 'ECONNABORTED' ||
              String(error?.message || '').toLowerCase().includes('timeout')
                ? 'PACS media export timed out. The study may be large or the PACS connection is slow.'
                : error.message;
            lastExportError = new Error(normalizedErrorMessage);
            console.warn(
              `Failed ISO media export for study ${studyInstanceUID} with Orthanc study ${orthancStudyId}: ${normalizedErrorMessage}`
            );
          } finally {
            if (fs.existsSync(tempMediaZip)) {
              await fs.promises.unlink(tempMediaZip).catch(() => {});
            }
          }
        }

        if (!studyExported) {
          throw new Error(
            `Failed to export DICOM media for study ${studyInstanceUID}: ${
              lastExportError?.message || 'unknown error'
            }`
          );
        }
      }

      if (studiesWithMedia === 0) {
        throw new Error('No study media could be exported from Orthanc');
      }
    }

    // Add metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      targetType,
      targetId,
      studyCount: studies.length,
      studiesWithMedia,
      includeImages: shouldIncludeImages,
      studies: studies.map(s => ({
        studyInstanceUID: s.studyInstanceUID || s.studyUID,
        studyDate: s.studyDate,
        studyDescription: s.studyDescription,
        modality: s.modality,
      })),
    };

    await fs.promises.writeFile(
      path.join(mediaRoot, 'EXPORT_INFO.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Add README
    const readme = `DICOM Medical Imaging Export
=============================

Export Date: ${new Date().toISOString()}
Type: ${targetType}
Studies: ${studies.length}

This disc contains medical imaging data in DICOM format.

DICOM FILES:
${shouldIncludeImages ? '- DICOMDIR: Index file for PACS systems\n- DICOM/: Folder containing DICOM image files' : '- DICOM image export disabled (metadata-only export)'}

VIEWING:
- Import to PACS using "Import from Media"
- Use DICOM viewer software (OsiriX, Horos, RadiAnt, MicroDicom)

IMPORTANT: Confidential medical information - handle per HIPAA regulations.
`;

    await fs.promises.writeFile(path.join(mediaRoot, 'README.txt'), readme);

    // Add viewer if requested
    if (includeViewer) {
      console.log('Adding viewer files...');
      await addPortableDicomViewer(mediaRoot);
    }

    // Create ISO image
    const isoName = `${targetType}_${sanitizeFileSegment(targetId)}_dicom_media.iso`;
    const isoPath = path.join(tempDir, isoName);

    console.log(`Creating ISO image: ${isoName}`);
    await createIsoImageFromFolder(mediaRoot, isoPath, 'DICOM_MEDIA');

    const fileStat = await fs.promises.stat(isoPath);
    console.log(`ISO created: ${(fileStat.size / 1024 / 1024).toFixed(2)} MB`);

    // Stream ISO to client
    res.setHeader('Content-Type', 'application/x-iso9660-image');
    res.setHeader('Content-Disposition', `attachment; filename="${isoName}"`);
    res.setHeader('Content-Length', String(fileStat.size));

    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    const readStream = fs.createReadStream(isoPath);
    let isoFileUnlinked = false;
    const unlinkIsoFile = async () => {
      if (isoFileUnlinked) return;
      isoFileUnlinked = true;
      try {
        await fs.promises.unlink(isoPath);
      } catch (_unlinkError) {
        // Best effort only; temp directory cleanup still runs.
      }
    };

    // On Linux/Unix, unlinking an open file keeps stream alive while avoiding disk leftovers.
    readStream.on('open', async () => {
      if (process.platform !== 'win32') {
        await unlinkIsoFile();
      }
    });

    readStream.on('error', async (streamError) => {
      console.error('ISO stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream ISO file' });
      } else {
        res.destroy(streamError);
      }
      await cleanup();
    });

    readStream.on('close', async () => {
      // For Windows, delete ISO once stream handle closes.
      await unlinkIsoFile();
    });

    readStream.pipe(res);
    console.log('Streaming ISO to client...');

  } catch (error) {
    await cleanup();
    console.error('ISO export error:', error);
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.destroy(error);
      }
      return;
    }
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'ISO export failed',
    });
  }
}

module.exports = {
  getViewerStatus,
  installViewerOnServer,
  runViewerOnServer,
  createIsoExport,
  directBurnToCD,
  prepareDicomMediaFolder,
  burnFolderToDisc,
};
