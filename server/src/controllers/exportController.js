const fs = require('fs');
const os = require('os');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { execFile } = require('child_process');
const { promisify } = require('util');
const Study = require('../models/Study');
const Patient = require('../models/Patient');
const Instance = require('../models/Instance');
const { getUnifiedOrthancService } = require('../services/unified-orthanc-service');

const execFileAsync = promisify(execFile);
const ORTHANC_FETCH_TIMEOUT_MS = Number(process.env.EXPORT_ORTHANC_TIMEOUT_MS || 12000);
const ORTHANC_MEDIA_TIMEOUT_MS = Number(process.env.EXPORT_ORTHANC_MEDIA_TIMEOUT_MS || 180000);
const ORTHANC_MEDIA_TIMEOUT_PER_INSTANCE_MS = Number(
  process.env.EXPORT_ORTHANC_MEDIA_TIMEOUT_PER_INSTANCE_MS || 120
);
const ORTHANC_MEDIA_TIMEOUT_MAX_MS = Number(process.env.EXPORT_ORTHANC_MEDIA_TIMEOUT_MAX_MS || 900000);
const ORTHANC_MEDIA_RETRY_TIMEOUT_MS = Number(
  process.env.EXPORT_ORTHANC_MEDIA_RETRY_TIMEOUT_MS || Math.max(ORTHANC_MEDIA_TIMEOUT_MS * 3, 300000)
);
const MAX_PREVIEW_FRAMES_PER_STUDY = Number(process.env.EXPORT_MAX_PREVIEW_FRAMES || 10);
// Keep fallback disabled by default for speed/reliability in production.
const EXPORT_FALLBACK_PER_INSTANCE = process.env.EXPORT_FALLBACK_PER_INSTANCE === 'true';
const EXPORT_PREFER_MEDIA_ARCHIVE = process.env.EXPORT_PREFER_MEDIA_ARCHIVE !== 'false';
const EXPORT_REQUIRE_DICOMDIR = process.env.EXPORT_REQUIRE_DICOMDIR === 'true';
const EXPORT_MEDIA_TIMEOUT_RETRY = process.env.EXPORT_MEDIA_TIMEOUT_RETRY !== 'false';

function toBoolean(value, defaultValue = true) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() !== 'false';
}

function safeSegment(value, fallback = 'export') {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function getDownloadFilename(type, id, extension = 'zip') {
  return `${type}_${safeSegment(id)}_export.${extension}`;
}

function waitForFileWrite(stream) {
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function withTimeout(promise, timeoutMs, label) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${label || 'operation'} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function zipHasDicomDir(zipBuffer) {
  try {
    const zip = new AdmZip(Buffer.from(zipBuffer));
    return zip.getEntries().some((entry) => {
      const name = String(entry.entryName || '').toUpperCase();
      return name === 'DICOMDIR' || name.endsWith('/DICOMDIR');
    });
  } catch (err) {
    console.warn('Failed to inspect media ZIP for DICOMDIR:', err.message);
    return false;
  }
}

function normalizeExportError(error) {
  const msg = error?.message || String(error);
  if (msg.startsWith('DICOMDIR-required export failed for study')) {
    return error;
  }
  const wrapped = new Error(msg);
  wrapped.name = error?.name || 'Error';
  return wrapped;
}

function isTimeoutLikeError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('econnaborted')
  );
}

function getAdaptiveMediaTimeoutMs(study, baseTimeoutMs) {
  const studyInstances = Number(study?.numberOfInstances || 0);
  if (!Number.isFinite(studyInstances) || studyInstances <= 0) {
    return baseTimeoutMs;
  }

  const adaptiveTimeout = Math.round(
    baseTimeoutMs + studyInstances * ORTHANC_MEDIA_TIMEOUT_PER_INSTANCE_MS
  );
  return Math.min(Math.max(baseTimeoutMs, adaptiveTimeout), ORTHANC_MEDIA_TIMEOUT_MAX_MS);
}

async function getPatientExportData(patientID, includeImages, exportedBy) {
  const patient = await Patient.findOne({ patientID }).lean();
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  const studies = await Study.find({ patientID }).lean();
  const studyUIDs = studies.map((s) => s.studyInstanceUID);
  const instances = studyUIDs.length
    ? await Instance.find({ studyInstanceUID: { $in: studyUIDs } }).lean()
    : [];

  return {
    metadataJsonName: 'patient_data.json',
    zipName: getDownloadFilename('patient', patientID, 'zip'),
    exportData: {
      patient: {
        patientID: patient.patientID,
        patientName: patient.patientName,
        birthDate: patient.birthDate,
        sex: patient.sex,
        exportDate: new Date().toISOString(),
        studyCount: studies.length,
      },
      studies: studies.map((study) => ({
        studyInstanceUID: study.studyInstanceUID,
        studyDate: study.studyDate,
        studyTime: study.studyTime,
        modality: study.modality,
        studyDescription: study.studyDescription,
        numberOfSeries: study.numberOfSeries,
        numberOfInstances: study.numberOfInstances,
        aiAnalysis: study.aiAnalysis,
        aiAnalyzedAt: study.aiAnalyzedAt,
        aiModels: study.aiModels,
      })),
      instances: instances.map((inst) => ({
        sopInstanceUID: inst.sopInstanceUID,
        studyInstanceUID: inst.studyInstanceUID,
        seriesInstanceUID: inst.seriesInstanceUID,
        instanceNumber: inst.instanceNumber,
        numberOfFrames: inst.numberOfFrames,
        orthancInstanceId: inst.orthancInstanceId,
      })),
      metadata: {
        exportedBy,
        exportedAt: new Date().toISOString(),
        version: '1.1',
        includesImages: includeImages,
      },
    },
    includeImages,
    studies,
    instances,
  };
}

async function getStudyExportData(studyUID, includeImages, exportedBy) {
  const study = await Study.findOne({ studyInstanceUID: studyUID }).lean();
  if (!study) {
    const error = new Error('Study not found');
    error.statusCode = 404;
    throw error;
  }

  const patient = await Patient.findOne({ patientID: study.patientID }).lean();
  const instances = await Instance.find({ studyInstanceUID: studyUID }).lean();

  return {
    metadataJsonName: 'study_data.json',
    zipName: getDownloadFilename('study', studyUID, 'zip'),
    exportData: {
      study: {
        studyInstanceUID: study.studyInstanceUID,
        studyDate: study.studyDate,
        studyTime: study.studyTime,
        modality: study.modality,
        studyDescription: study.studyDescription,
        numberOfSeries: study.numberOfSeries,
        numberOfInstances: study.numberOfInstances,
        aiAnalysis: study.aiAnalysis,
        aiAnalyzedAt: study.aiAnalyzedAt,
        aiModels: study.aiModels,
      },
      patient: patient
        ? {
            patientID: patient.patientID,
            patientName: patient.patientName,
            birthDate: patient.birthDate,
            sex: patient.sex,
          }
        : null,
      instances: instances.map((inst) => ({
        sopInstanceUID: inst.sopInstanceUID,
        seriesInstanceUID: inst.seriesInstanceUID,
        instanceNumber: inst.instanceNumber,
        numberOfFrames: inst.numberOfFrames,
        orthancInstanceId: inst.orthancInstanceId,
      })),
      metadata: {
        exportedBy,
        exportedAt: new Date().toISOString(),
        version: '1.1',
        includesImages: includeImages,
      },
    },
    includeImages,
    studies: [study],
    instances,
  };
}

async function appendStudyAssetsToArchive(archive, studies, instances, includeImages) {
  if (!includeImages) return;

  const orthancService = getUnifiedOrthancService();
  for (const study of studies) {
    const studyInstances = instances.filter((i) => i.studyInstanceUID === study.studyInstanceUID);
    const studyFolder = studies.length > 1 ? `studies/${study.studyInstanceUID}` : '';

    // Fast path: use Orthanc native study archive export (PACS-direct).
    try {
      const foundStudy = await withTimeout(
        orthancService.findStudyByUID(study.studyInstanceUID, {
          allowScanFallback: false,
          timeoutMs: ORTHANC_FETCH_TIMEOUT_MS,
        }),
        ORTHANC_FETCH_TIMEOUT_MS,
        'Orthanc study lookup'
      );

      if (foundStudy?.orthancStudyId) {
        let archiveBuffer = null;
        let archiveName = studyFolder
          ? `${studyFolder}/orthanc_study_archive.zip`
          : 'orthanc_study_archive.zip';
        const mediaTimeoutMs = getAdaptiveMediaTimeoutMs(study, ORTHANC_MEDIA_TIMEOUT_MS);
        const mediaRetryTimeoutMs = Math.min(
          ORTHANC_MEDIA_TIMEOUT_MAX_MS,
          Math.max(ORTHANC_MEDIA_RETRY_TIMEOUT_MS, Math.round(mediaTimeoutMs * 1.75))
        );

        if (EXPORT_PREFER_MEDIA_ARCHIVE) {
          try {
            archiveBuffer = await withTimeout(
              orthancService.exportStudyMedia(foundStudy.orthancStudyId, {
                timeoutMs: mediaTimeoutMs,
              }),
              mediaTimeoutMs,
              'Orthanc study media export'
            );
            archiveName = studyFolder
              ? `${studyFolder}/orthanc_study_media.zip`
              : 'orthanc_study_media.zip';

            if (EXPORT_REQUIRE_DICOMDIR && !zipHasDicomDir(archiveBuffer)) {
              throw new Error('Orthanc media export returned ZIP without DICOMDIR');
            }
          } catch (mediaErr) {
            // In strict DICOMDIR mode, a single timeout is too brittle for large studies.
            // Retry once with a longer timeout before failing.
            if (EXPORT_REQUIRE_DICOMDIR && EXPORT_MEDIA_TIMEOUT_RETRY && isTimeoutLikeError(mediaErr)) {
              console.warn(
                `Orthanc media export timed out for ${study.studyInstanceUID}; retrying with extended timeout ${mediaRetryTimeoutMs}ms`
              );
              archiveBuffer = await withTimeout(
                orthancService.exportStudyMedia(foundStudy.orthancStudyId, {
                  timeoutMs: mediaRetryTimeoutMs,
                }),
                mediaRetryTimeoutMs,
                'Orthanc study media export retry'
              );
              archiveName = studyFolder
                ? `${studyFolder}/orthanc_study_media.zip`
                : 'orthanc_study_media.zip';

              if (EXPORT_REQUIRE_DICOMDIR && !zipHasDicomDir(archiveBuffer)) {
                throw new Error('Orthanc media export retry returned ZIP without DICOMDIR');
              }
            } else if (EXPORT_REQUIRE_DICOMDIR) {
              throw new Error(
                `DICOMDIR-required export failed for study ${study.studyInstanceUID}: ${mediaErr.message}. ` +
                `Increase EXPORT_ORTHANC_MEDIA_TIMEOUT_MS or set EXPORT_REQUIRE_DICOMDIR=false to allow non-DICOMDIR archive export.`
              );
            } else {
              console.warn(
                `Orthanc media export failed for ${study.studyInstanceUID}; fallback to archive export:`,
                mediaErr.message
              );
            }
          }
        }

        if (!archiveBuffer) {
          archiveBuffer = await withTimeout(
            orthancService.exportStudy(foundStudy.orthancStudyId, {
              timeoutMs: ORTHANC_FETCH_TIMEOUT_MS,
            }),
            ORTHANC_FETCH_TIMEOUT_MS,
            'Orthanc study archive export'
          );
        }

        if (archiveBuffer) {
          archive.append(archiveBuffer, { name: archiveName });
          continue;
        }
      }
    } catch (err) {
      const normalizedError = normalizeExportError(err);
      if (EXPORT_REQUIRE_DICOMDIR) {
        if (normalizedError.message.startsWith('DICOMDIR-required export failed for study')) {
          throw normalizedError;
        }
        throw new Error(
          `DICOMDIR-required export failed for study ${study.studyInstanceUID}: ${normalizedError.message}`
        );
      }

      if (EXPORT_FALLBACK_PER_INSTANCE) {
        console.warn(
          `Orthanc archive/media export failed for ${study.studyInstanceUID}; per-instance fallback enabled:`,
          normalizedError.message
        );
      } else {
        console.warn(
          `Orthanc archive/media export failed for ${study.studyInstanceUID}; per-instance fallback disabled:`,
          normalizedError.message
        );
      }
    }

    if (!EXPORT_FALLBACK_PER_INSTANCE) {
      const folder = studyFolder || '.';
      archive.append(
        `Orthanc direct archive export was unavailable for study ${study.studyInstanceUID}.`,
        { name: `${folder}/export_warning.txt` }
      );
      continue;
    }

    for (const instance of studyInstances) {
      if (!instance.orthancInstanceId) continue;
      try {
        const dicomBuffer = await withTimeout(
          orthancService.getInstanceFile(instance.orthancInstanceId),
          ORTHANC_FETCH_TIMEOUT_MS,
          'DICOM fetch'
        );
        if (dicomBuffer) {
          const filename = `${instance.instanceNumber || 'instance'}.dcm`;
          const folder = studyFolder ? `${studyFolder}/dicom` : 'dicom';
          archive.append(dicomBuffer, { name: `${folder}/${filename}` });
        }
      } catch (err) {
        console.warn(`Failed DICOM export for ${instance.orthancInstanceId}:`, err.message);
      }
    }

    if (studyInstances.length > 0 && studyInstances[0].orthancInstanceId) {
      try {
        const frameCount = await withTimeout(
          orthancService.getFrameCount(studyInstances[0].orthancInstanceId),
          ORTHANC_FETCH_TIMEOUT_MS,
          'Frame count fetch'
        );
        const limitedFrameCount = Math.min(frameCount, MAX_PREVIEW_FRAMES_PER_STUDY);
        for (let i = 0; i < limitedFrameCount; i++) {
          try {
            const frameBuffer = await withTimeout(
              orthancService.getFrameAsPng(studyInstances[0].orthancInstanceId, i),
              ORTHANC_FETCH_TIMEOUT_MS,
              'Preview frame fetch'
            );
            if (frameBuffer) {
              const folder = studyFolder ? `${studyFolder}/previews` : 'previews';
              archive.append(frameBuffer, { name: `${folder}/frame_${i}.png` });
            }
          } catch (err) {
            console.warn(`Failed frame ${i} export:`, err.message);
          }
        }
      } catch (err) {
        console.warn('Failed to export preview frames:', err.message);
      }
    }
  }
}

async function finalizeArchiveToTarget({ archive, output, metadataJsonName, exportData, studies, instances, includeImages }) {
  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') {
      console.warn('Archive warning:', err.message);
    }
  });

  archive.append(JSON.stringify(exportData, null, 2), { name: metadataJsonName });
  await appendStudyAssetsToArchive(archive, studies, instances, includeImages);
  await archive.finalize();
  await waitForFileWrite(output);
}

async function buildZipOnDisk({ targetType, targetId, includeImages, exportedBy }) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pacs-export-'));
  const zipName = getDownloadFilename(targetType, targetId, 'zip');
  const zipPath = path.join(tempDir, zipName);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);

  const payload =
    targetType === 'patient'
      ? await getPatientExportData(targetId, includeImages, exportedBy)
      : await getStudyExportData(targetId, includeImages, exportedBy);

  await finalizeArchiveToTarget({
    archive,
    output,
    metadataJsonName: payload.metadataJsonName,
    exportData: payload.exportData,
    studies: payload.studies,
    instances: payload.instances,
    includeImages,
  });

  return {
    zipPath,
    zipName,
    tempDir,
    payload,
  };
}

async function tryBurnZipToCdOnWindows(zipPath, driveLetter) {
  const normalizedDriveLetter = driveLetter
    ? `${String(driveLetter).trim().replace(':', '').toUpperCase()}:`
    : '';

  const powershellScript = `
$ErrorActionPreference = "Stop"
$zipPath = "${zipPath.replace(/\\/g, '\\\\')}"
$targetDrive = "${normalizedDriveLetter}"
$discMaster = New-Object -ComObject IMAPI2.MsftDiscMaster2
if ($discMaster.Count -eq 0) { throw "No CD/DVD burner found." }
$recorder = $null
for ($i = 0; $i -lt $discMaster.Count; $i++) {
  $candidate = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $candidate.InitializeDiscRecorder($discMaster.Item($i))
  if ($targetDrive -eq "" -or ($candidate.VolumePathNames -contains $targetDrive)) {
    $recorder = $candidate
    break
  }
}
if ($null -eq $recorder) { throw "Requested drive not available: $targetDrive" }
$fileSystem = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
$fileSystem.ChooseImageDefaults($recorder)
$fileSystem.FileSystemsToCreate = 4
$fileSystem.VolumeName = "PACS_EXPORT"
$adodb = New-Object -ComObject ADODB.Stream
$adodb.Type = 1
$adodb.Open()
$adodb.LoadFromFile($zipPath)
$fileSystem.Root.AddFile([System.IO.Path]::GetFileName($zipPath), $adodb)
$image = $fileSystem.CreateResultImage()
$burn = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
$burn.Recorder = $recorder
$burn.ClientName = "ScanFlowAI"
$burn.Write($image.ImageStream)
$adodb.Close()
Write-Output "BURN_SUCCESS"
`.trim();

  const result = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powershellScript],
    { timeout: 600000, windowsHide: true }
  );

  if (!String(result.stdout || '').includes('BURN_SUCCESS')) {
    throw new Error((result.stderr || result.stdout || 'CD burn command failed').trim());
  }
}

function sendZipDownload(res, zipName, zipPath) {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  const readStream = fs.createReadStream(zipPath);
  readStream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to stream export' });
    }
  });
  readStream.pipe(res);
}

async function tryBurnFolderToCdOnWindows(sourceFolderPath, driveLetter, volumeName = 'PACS_EXPORT') {
  const normalizedDriveLetter = driveLetter
    ? `${String(driveLetter).trim().replace(':', '').toUpperCase()}:`
    : '';

  const powershellScript = `
$ErrorActionPreference = "Stop"
$sourcePath = "${sourceFolderPath.replace(/\\/g, '\\\\')}"
$targetDrive = "${normalizedDriveLetter}"
$volumeName = "${String(volumeName).replace(/[^A-Za-z0-9_\\-]/g, '').slice(0, 32) || 'PACS_EXPORT'}"
if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Source folder not found: $sourcePath" }
$discMaster = New-Object -ComObject IMAPI2.MsftDiscMaster2
if ($discMaster.Count -eq 0) { throw "No CD/DVD burner found." }
$recorder = $null
for ($i = 0; $i -lt $discMaster.Count; $i++) {
  $candidate = New-Object -ComObject IMAPI2.MsftDiscRecorder2
  $candidate.InitializeDiscRecorder($discMaster.Item($i))
  if ($targetDrive -eq "" -or ($candidate.VolumePathNames -contains $targetDrive)) {
    $recorder = $candidate
    break
  }
}
if ($null -eq $recorder) { throw "Requested drive not available: $targetDrive" }
$fileSystem = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
$fileSystem.ChooseImageDefaults($recorder)
$fileSystem.FileSystemsToCreate = 4
$fileSystem.VolumeName = $volumeName
$fileSystem.Root.AddTree($sourcePath, $false)
$image = $fileSystem.CreateResultImage()
$burn = New-Object -ComObject IMAPI2.MsftDiscFormat2Data
$burn.Recorder = $recorder
$burn.ClientName = "ScanFlowAI"
$burn.Write($image.ImageStream)
Write-Output "BURN_SUCCESS"
`.trim();

  const result = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powershellScript],
    { timeout: 600000, windowsHide: true }
  );

  if (!String(result.stdout || '').includes('BURN_SUCCESS')) {
    throw new Error((result.stderr || result.stdout || 'CD burn command failed').trim());
  }
}

async function prepareBurnSourceFromExportZip(zipPath, tempDir) {
  const burnRoot = path.join(tempDir, 'burn-source');
  await fs.promises.mkdir(burnRoot, { recursive: true });

  const outerZip = new AdmZip(zipPath);
  const mediaEntries = outerZip
    .getEntries()
    .filter((entry) => !entry.isDirectory && /orthanc_study_media\.zip$/i.test(entry.entryName || ''));

  // PACS media burn expects DICOMDIR at disc root. Support only unambiguous media source.
  if (mediaEntries.length !== 1) {
    return {
      type: 'zip_file',
      sourcePath: zipPath,
      message:
        mediaEntries.length === 0
          ? 'No orthanc_study_media.zip found in export ZIP.'
          : 'Multiple study media archives found; cannot build single-root DICOMDIR CD layout.',
    };
  }

  const mediaBuffer = mediaEntries[0].getData();
  const mediaZip = new AdmZip(Buffer.from(mediaBuffer));
  const hasDicomDir = mediaZip.getEntries().some((entry) => {
    const name = String(entry.entryName || '').toUpperCase();
    return name === 'DICOMDIR' || name.endsWith('/DICOMDIR');
  });

  if (!hasDicomDir) {
    return {
      type: 'zip_file',
      sourcePath: zipPath,
      message: 'orthanc_study_media.zip does not contain DICOMDIR.',
    };
  }

  mediaZip.extractAllTo(burnRoot, true);

  const patientMetadata = outerZip.getEntry('patient_data.json') || outerZip.getEntry('study_data.json');
  if (patientMetadata) {
    const metadataPath = path.join(burnRoot, 'EXPORT_METADATA.json');
    await fs.promises.writeFile(metadataPath, patientMetadata.getData());
  }

  return {
    type: 'dicom_media_folder',
    sourcePath: burnRoot,
    message: 'Prepared PACS media layout with DICOMDIR at disc root.',
  };
}

async function streamZipDownload(res, zipName, payload) {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  // Helpful when reverse proxies buffer long responses.
  res.setHeader('X-Accel-Buffering', 'no');

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') {
      console.warn('Archive warning:', err.message);
    }
  });

  archive.on('error', (err) => {
    console.error('Streaming archive error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to stream export' });
      return;
    }
    if (!res.writableEnded) {
      res.destroy(err);
    }
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      try {
        archive.abort();
      } catch (e) {
        // no-op
      }
    }
  });

  archive.pipe(res);
  archive.append(JSON.stringify(payload.exportData, null, 2), { name: payload.metadataJsonName });
  await appendStudyAssetsToArchive(
    archive,
    payload.studies,
    payload.instances,
    payload.includeImages
  );
  await archive.finalize();
}

/**
 * Export patient data with all studies and DICOM files
 */
async function exportPatientData(req, res) {
  try {
    const { patientID } = req.params;
    const includeImages = toBoolean(req.query.includeImages, true);
    const format = req.query.format || 'zip';
    const exportedBy = req.user?.username || 'system';

    const payload = await getPatientExportData(patientID, includeImages, exportedBy);
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${getDownloadFilename('patient', patientID, 'json')}"`
      );
      return res.status(200).json(payload.exportData);
    }

    const zipName = getDownloadFilename('patient', patientID, 'zip');
    await streamZipDownload(res, zipName, payload);
    return;
  } catch (error) {
    console.error('Patient export error:', error);
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.destroy(error);
      }
      return;
    }
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Export failed',
    });
  }
}

/**
 * Export study data with DICOM files
 */
async function exportStudyData(req, res) {
  try {
    const { studyUID } = req.params;
    const includeImages = toBoolean(req.query.includeImages, true);
    const format = req.query.format || 'zip';
    const exportedBy = req.user?.username || 'system';

    const payload = await getStudyExportData(studyUID, includeImages, exportedBy);
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${getDownloadFilename('study', studyUID, 'json')}"`
      );
      return res.status(200).json(payload.exportData);
    }

    const zipName = getDownloadFilename('study', studyUID, 'zip');
    await streamZipDownload(res, zipName, payload);
    return;
  } catch (error) {
    console.error('Study export error:', error);
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.destroy(error);
      }
      return;
    }
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Export failed',
    });
  }
}

/**
 * Export all data (bulk export)
 */
async function exportAllData(req, res) {
  try {
    const includeImages = toBoolean(req.query.includeImages, false);
    const patients = await Patient.find({}).lean();
    const studies = await Study.find({}).lean();
    const instances = await Instance.find({}).lean();

    const exportData = {
      patients: patients.map((p) => ({
        patientID: p.patientID,
        patientName: p.patientName,
        birthDate: p.birthDate,
        sex: p.sex,
        studyIds: p.studyIds,
      })),
      studies: studies.map((s) => ({
        studyInstanceUID: s.studyInstanceUID,
        studyDate: s.studyDate,
        studyTime: s.studyTime,
        patientID: s.patientID,
        modality: s.modality,
        studyDescription: s.studyDescription,
        numberOfSeries: s.numberOfSeries,
        numberOfInstances: s.numberOfInstances,
        aiAnalysis: s.aiAnalysis,
      })),
      instances: instances.map((i) => ({
        sopInstanceUID: i.sopInstanceUID,
        studyInstanceUID: i.studyInstanceUID,
        seriesInstanceUID: i.seriesInstanceUID,
        instanceNumber: i.instanceNumber,
        numberOfFrames: i.numberOfFrames,
        orthancInstanceId: i.orthancInstanceId,
      })),
      metadata: {
        exportedBy: req.user?.username || 'system',
        exportedAt: new Date().toISOString(),
        version: '1.1',
        totalPatients: patients.length,
        totalStudies: studies.length,
        totalInstances: instances.length,
        includesImages: includeImages,
      },
    };

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pacs-export-all-'));
    const zipPath = path.join(tempDir, 'complete_export.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.append(JSON.stringify(exportData, null, 2), { name: 'complete_data.json' });
    await archive.finalize();
    await waitForFileWrite(output);
    return sendZipDownload(res, 'complete_export.zip', zipPath);
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Export failed',
    });
  }
}

/**
 * Build ZIP and attempt direct CD burn (Windows only).
 */
async function burnExportToCD(req, res) {
  try {
    const { targetType, targetId, includeImages = true, driveLetter } = req.body || {};
    if (!['patient', 'study'].includes(targetType)) {
      return res.status(400).json({ success: false, message: 'targetType must be patient or study' });
    }
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'targetId is required' });
    }

    const zip = await buildZipOnDisk({
      targetType,
      targetId,
      includeImages: toBoolean(includeImages, true),
      exportedBy: req.user?.username || 'system',
    });

    const result = {
      success: true,
      export: {
        targetType,
        targetId,
        zipPath: zip.zipPath,
        zipFileName: zip.zipName,
      },
      cdBurn: {
        attempted: true,
        status: 'manual_required',
        message:
          'Direct burn was not executed. Use your OS burn utility and select the generated ZIP file.',
      },
    };

    if (process.platform !== 'win32') {
      result.cdBurn.status = 'unsupported';
      result.cdBurn.message = 'Direct CD burn is currently supported only on Windows hosts.';
      return res.status(200).json(result);
    }

    try {
      const burnSource = await prepareBurnSourceFromExportZip(zip.zipPath, zip.tempDir);
      if (burnSource.type === 'dicom_media_folder') {
        await tryBurnFolderToCdOnWindows(burnSource.sourcePath, driveLetter, 'PACS_EXPORT');
        result.cdBurn.status = 'completed';
        result.cdBurn.message = `CD burn completed successfully. ${burnSource.message}`;
      } else {
        await tryBurnZipToCdOnWindows(zip.zipPath, driveLetter);
        result.cdBurn.status = 'completed';
        result.cdBurn.message =
          `CD burn completed using ZIP file fallback. ${burnSource.message} ` +
          'For strict PACS import, use Download ZIP and extract orthanc_study_media.zip before burning.';
      }
    } catch (error) {
      result.cdBurn.status = 'manual_required';
      result.cdBurn.message = `Direct burn failed: ${error.message}`;
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('CD burn export error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'CD export failed',
    });
  }
}

module.exports = {
  exportPatientData,
  exportStudyData,
  exportAllData,
  burnExportToCD,
};
