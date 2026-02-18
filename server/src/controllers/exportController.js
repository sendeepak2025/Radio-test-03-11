const fs = require('fs');
const os = require('os');
const path = require('path');
const archiver = require('archiver');
const { execFile } = require('child_process');
const { promisify } = require('util');
const Study = require('../models/Study');
const Patient = require('../models/Patient');
const Instance = require('../models/Instance');
const { getUnifiedOrthancService } = require('../services/unified-orthanc-service');

const execFileAsync = promisify(execFile);
const ORTHANC_FETCH_TIMEOUT_MS = Number(process.env.EXPORT_ORTHANC_TIMEOUT_MS || 12000);
const MAX_PREVIEW_FRAMES_PER_STUDY = Number(process.env.EXPORT_MAX_PREVIEW_FRAMES || 10);
// Keep fallback enabled by default so exports still include DICOM when study-archive path is unavailable.
const EXPORT_FALLBACK_PER_INSTANCE = process.env.EXPORT_FALLBACK_PER_INSTANCE !== 'false';

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
        orthancService.findStudyByUID(study.studyInstanceUID),
        ORTHANC_FETCH_TIMEOUT_MS,
        'Orthanc study lookup'
      );

      if (foundStudy?.orthancStudyId) {
        const archiveBuffer = await withTimeout(
          orthancService.exportStudy(foundStudy.orthancStudyId),
          ORTHANC_FETCH_TIMEOUT_MS,
          'Orthanc study archive export'
        );

        if (archiveBuffer) {
          const archiveName = studyFolder
            ? `${studyFolder}/orthanc_study_archive.zip`
            : 'orthanc_study_archive.zip';
          archive.append(archiveBuffer, { name: archiveName });
          continue;
        }
      }
    } catch (err) {
      console.warn(
        `Orthanc archive export failed for ${study.studyInstanceUID}, falling back to per-instance export:`,
        err.message
      );
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

    const zip = await buildZipOnDisk({
      targetType: 'patient',
      targetId: patientID,
      includeImages,
      exportedBy,
    });
    return sendZipDownload(res, zip.zipName, zip.zipPath);
  } catch (error) {
    console.error('Patient export error:', error);
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

    const zip = await buildZipOnDisk({
      targetType: 'study',
      targetId: studyUID,
      includeImages,
      exportedBy,
    });
    return sendZipDownload(res, zip.zipName, zip.zipPath);
  } catch (error) {
    console.error('Study export error:', error);
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
      await tryBurnZipToCdOnWindows(zip.zipPath, driveLetter);
      result.cdBurn.status = 'completed';
      result.cdBurn.message = 'CD burn completed successfully.';
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
