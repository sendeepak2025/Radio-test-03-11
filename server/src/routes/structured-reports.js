const express = require('express');
const router = express.Router();
const StructuredReport = require('../models/StructuredReport');
// AI Analysis removed - no longer available
// const AIAnalysis = require('../models/AIAnalysis');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// Lazy import AI services to avoid requiring keys when disabled
let medGemmaService = null;
function getMedGemma() {
  if (!medGemmaService) medGemmaService = require('../services/medGemmaService');
  return medGemmaService;
}

// Configure multer for signature uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `signature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed for signatures'));
  }
});

// In-memory templates as industry-standard defaults (can be moved to DB later)
const DEFAULT_TEMPLATES = [
  {
    id: 'chest-xray',
    name: 'Chest X-Ray Report',
    modality: 'XA',
    sections: [
      { id: 'clinical-info', title: 'Clinical Information', content: '', required: true, suggestions: ['Chest pain','Shortness of breath','Cough','Fever','Follow-up study','Pre-operative evaluation'] },
      { id: 'technique', title: 'Technique', content: 'Frontal and lateral chest radiographs obtained in the upright position.', required: true, suggestions: ['Frontal and lateral chest radiographs','Single frontal view','Portable chest radiograph','Inspiration and expiration views'] },
      { id: 'findings', title: 'Findings', content: '', required: true, suggestions: ['Lungs are clear bilaterally','No acute cardiopulmonary process','Heart size is normal','Mediastinal contours are normal','No pleural effusion','Skeletal structures appear intact'] },
      { id: 'impression', title: 'Impression', content: '', required: true, suggestions: ['Normal chest radiograph','No acute cardiopulmonary process','Pneumonia','Pleural effusion','Pneumothorax'] }
    ]
  },
  {
    id: 'ct-chest',
    name: 'CT Chest Report',
    modality: 'CT',
    sections: [
      { id: 'clinical-history', title: 'Clinical History', content: '', required: true, suggestions: ['Chest pain','Dyspnea','Hemoptysis','Weight loss','Staging evaluation'] },
      { id: 'technique', title: 'Technique', content: 'Chest CT with/without IV contrast.', required: true, suggestions: ['Non-contrast chest CT','CT chest with IV contrast','CT pulmonary angiogram (CTPA)','High resolution CT (HRCT)'] },
      { id: 'findings', title: 'Findings', content: '', required: true, suggestions: ['Lungs: Clear bilaterally','Pleura: No effusion or pneumothorax','Mediastinum: Normal lymph nodes','Heart: Normal size and contour'] },
      { id: 'impression', title: 'Impression', content: '', required: true, suggestions: ['Normal CT chest','No acute pulmonary embolism','Pneumonia','Pulmonary nodule'] }
    ]
  }
];

/**
 * 🧪 Test route - Check if structured-reports routes are working
 * GET /api/structured-reports/test
 */
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Structured Reports API is working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * 📚 Get active report templates
 * GET /api/reports/templates?active=true
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const { active } = req.query;
    // For now return static templates. Later can be loaded from DB.
    return res.json({ success: true, active: active !== 'false', templates: DEFAULT_TEMPLATES });
  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 🔄 Sync DICOM SR data from OHIF/Orthanc to report
 * POST /api/reports/:reportId/sync-dicom-sr
 * Body: { studyInstanceUID: string, mergeStrategy?: 'replace' | 'append' }
 */
router.post('/:reportId/sync-dicom-sr', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { studyInstanceUID, mergeStrategy = 'append' } = req.body;

    if (!studyInstanceUID) {
      return res.status(400).json({ 
        success: false, 
        error: 'studyInstanceUID is required' 
      });
    }

    console.log(`🔄 Syncing DICOM SR for report ${reportId}, study ${studyInstanceUID}`);

    // Import sync service
    const { dicomSRSync } = require('../services/dicomSRSync');

    // Sync SR data from Orthanc
    const srData = await dicomSRSync.syncStudySR(studyInstanceUID);

    if (srData.measurements.length === 0 && srData.findings.length === 0) {
      return res.json({
        success: true,
        message: 'No DICOM SR data found for this study',
        data: {
          measurementsAdded: 0,
          findingsAdded: 0
        }
      });
    }

    // Find the report
    const report = await StructuredReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report not found' 
      });
    }

    // Update report with SR data
    if (mergeStrategy === 'replace') {
      report.measurements = srData.measurements;
      report.findings = srData.findings;
    } else {
      // Append mode - merge with existing
      report.measurements = [...(report.measurements || []), ...srData.measurements];
      report.findings = [...(report.findings || []), ...srData.findings];
    }

    // Add annotations to notes if any
    if (srData.annotations && srData.annotations.length > 0) {
      const annotationText = srData.annotations
        .map(a => `${a.type}: ${a.text}${a.location ? ` (${a.location})` : ''}`)
        .join('\n');
      
      report.notes = report.notes 
        ? `${report.notes}\n\n--- OHIF Annotations ---\n${annotationText}`
        : `--- OHIF Annotations ---\n${annotationText}`;
    }

    await report.save();

    console.log(`✅ Synced ${srData.measurements.length} measurements, ${srData.findings.length} findings`);

    res.json({
      success: true,
      message: 'DICOM SR data synced successfully',
      data: {
        measurementsAdded: srData.measurements.length,
        findingsAdded: srData.findings.length,
        annotationsAdded: srData.annotations.length,
        report
      }
    });

  } catch (error) {
    console.error('❌ Error syncing DICOM SR:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 🆕 Create draft report from AI analysis
 * POST /api/structured-reports/from-ai/:analysisId
 */
router.post('/from-ai/:analysisId', authenticate, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { radiologistName, studyInstanceUID, patientID, patientName, modality } = req.body;
    
    console.log(`📝 Creating draft report from AI analysis: ${analysisId}`);
    
    // Get AI analysis data from request body (frontend sends complete analysis)
    const { aiResults } = req.body;
    
    if (!aiResults) {
      return res.status(400).json({
        success: false,
        error: 'AI analysis results are required'
      });
    }
    
    console.log('✅ Processing AI analysis results...');
    
    // Extract AI data
    let findings = [];
    let findingsText = '';
    let impression = '';
    let technique = '';
    let aiMetadata = {};
    
    const results = aiResults;
    
    // Extract MedSigLIP classification data
    if (results.classification) {
      const classification = results.classification.label || results.classification;
      const confidence = results.classification.confidence || results.confidence || 0;
      
      findings.push({
        id: `ai-${Date.now()}-1`,
        type: 'finding',
        category: 'ai-classification',
        description: `Primary Finding: ${classification} (Confidence: ${(confidence * 100).toFixed(1)}%)`,
        severity: confidence > 0.8 ? 'moderate' : confidence > 0.5 ? 'mild' : 'normal',
        frameIndex: results.frameIndex || 0,
        timestamp: new Date()
      });
      
      // Add top predictions if available
      if (results.classification.topPredictions && Array.isArray(results.classification.topPredictions)) {
        const topPreds = results.classification.topPredictions
          .map(p => `${p.label}: ${(p.confidence * 100).toFixed(1)}%`)
          .join(', ');
        
        findings.push({
          id: `ai-${Date.now()}-2`,
          type: 'finding',
          category: 'ai-predictions',
          description: `Top Predictions: ${topPreds}`,
          severity: 'normal',
          frameIndex: results.frameIndex || 0,
          timestamp: new Date()
        });
      }
    }
    
    // Extract MedSigLIP detections (findings array)
    if (results.findings && Array.isArray(results.findings)) {
      results.findings.forEach((finding, idx) => {
        findings.push({
          id: `ai-${Date.now()}-finding-${idx}`,
          type: 'finding',
          category: 'ai-detection',
          description: `${finding.type}: ${finding.description}`,
          severity: finding.severity || 'normal',
          location: finding.location,
          confidence: finding.confidence,
          boundingBox: finding.boundingBox,
          frameIndex: results.frameIndex || 0,
          timestamp: new Date()
        });
      });
    }
    
    // Extract MedGemma clinical report
    if (results.report) {
      const reportText = typeof results.report === 'string' ? results.report : results.report.findings;
      
      findings.push({
        id: `ai-${Date.now()}-3`,
        type: 'finding',
        category: 'ai-clinical-report',
        description: reportText,
        severity: 'normal',
        frameIndex: results.frameIndex || 0,
        timestamp: new Date()
      });
    }
    
    // Build comprehensive findings text
    findingsText = `🏥 AI MEDICAL ANALYSIS REPORT\n`;
    findingsText += `Powered by MedSigLIP & MedGemma\n`;
    findingsText += `Generated: ${new Date().toLocaleString()}\n`;
    findingsText += `Analysis ID: ${analysisId}\n`;
    findingsText += `Frame Index: ${results.frameIndex || 0}\n\n`;
    
    // Classification section
    if (results.classification) {
      const classification = results.classification.label || results.classification;
      const confidence = results.classification.confidence || results.confidence || 0;
      
      findingsText += `📊 CLASSIFICATION (MedSigLIP)\n`;
      findingsText += `Primary Finding: ${classification}\n`;
      findingsText += `Confidence: ${(confidence * 100).toFixed(1)}%\n\n`;
      
      if (results.classification.topPredictions && Array.isArray(results.classification.topPredictions)) {
        findingsText += `Top Predictions:\n`;
        results.classification.topPredictions.forEach(p => {
          findingsText += `  • ${p.label}: ${(p.confidence * 100).toFixed(1)}%\n`;
        });
        findingsText += `\n`;
      }
    }
    
    // Detections section
    if (results.findings && Array.isArray(results.findings) && results.findings.length > 0) {
      findingsText += `🔍 DETECTIONS (MedSigLIP)\n`;
      findingsText += `Found ${results.findings.length} abnormality(ies):\n\n`;
      results.findings.forEach((finding, idx) => {
        findingsText += `${idx + 1}. ${finding.type}\n`;
        findingsText += `   Location: ${finding.location}\n`;
        findingsText += `   Confidence: ${(finding.confidence * 100).toFixed(1)}%\n`;
        findingsText += `   Description: ${finding.description}\n\n`;
      });
    }
    
    // Clinical report section
    if (results.report) {
      const reportText = typeof results.report === 'string' ? results.report : 
                        results.report.findings || JSON.stringify(results.report);
      
      findingsText += `📝 CLINICAL REPORT (MedGemma)\n`;
      findingsText += `${reportText}\n\n`;
      
      if (results.report.impression) {
        findingsText += `💡 IMPRESSION\n`;
        findingsText += `${results.report.impression}\n\n`;
      }
      
      if (results.report.recommendations && Array.isArray(results.report.recommendations)) {
        findingsText += `📋 RECOMMENDATIONS\n`;
        results.report.recommendations.forEach((rec, idx) => {
          findingsText += `${idx + 1}. ${rec}\n`;
        });
        findingsText += `\n`;
      }
    }
    
    // Technique
    technique = `${modality || 'XA'} imaging was performed using AI-assisted analysis with MedSigLIP (classification) and MedGemma (report generation) models.`;
    
    // Impression
    if (results.classification) {
      const classification = results.classification.label || results.classification;
      const confidence = results.classification.confidence || results.confidence || 0;
      
      impression = `AI Analysis Summary:\n`;
      impression += `Primary Finding: ${classification} (${(confidence * 100).toFixed(1)}% confidence)\n`;
      
      if (results.findings && results.findings.length > 0) {
        impression += `Detected ${results.findings.length} abnormality(ies)\n`;
      }
      
      impression += `\nThis is a preliminary AI-generated analysis. `;
      impression += `Radiologist review and clinical correlation are required for final diagnosis.`;
    } else {
      impression = `Preliminary AI analysis completed. Awaiting radiologist review and clinical correlation.`;
    }
    
    // Store AI metadata
    aiMetadata = {
      analysisId: analysisId,
      models: ['MedSigLIP', 'MedGemma'],
      servicesUsed: results.servicesUsed || ['MedSigLIP (Hugging Face)', 'MedGemma (Google Gemini)'],
      classification: results.classification,
      detectionsCount: results.findings?.length || 0,
      analyzedAt: results.analyzedAt || new Date(),
      frameIndex: results.frameIndex || 0
    };
    
    // Create draft report
    const report = new StructuredReport({
      studyInstanceUID: studyInstanceUID || 'UNKNOWN',
      patientID: patientID || 'UNKNOWN',
      patientName: patientName || 'Unknown Patient',
      modality: modality || 'XA',
      reportStatus: 'draft',
      radiologistId: req.user.userId || req.user._id,
      radiologistName: radiologistName || req.user.username || 'Radiologist',
      findings,
      findingsText,
      impression,
      technique,
      reportDate: new Date(),
      tags: ['AI-Generated', 'MedSigLIP', 'MedGemma']
    });
    
    await report.save();
    
    console.log(`✅ Draft report created: ${report.reportId}`);
    
    const reportObject = report.toObject();
    
    res.json({
      success: true,
      report: reportObject,
      aiMetadata,
      message: 'Draft report created from AI analysis'
    });
    
  } catch (error) {
    console.error('❌ Error creating draft report:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * 🧠 AI generate structured sections from study data (graceful with/without keys)
 * POST /api/reports/ai-generate
 */
router.post('/ai-generate', authenticate, async (req, res) => {
  try {
    const { templateId, studyData = {}, measurements = [], findings = [] } = req.body || {};

    // Build patient context for AI
    const patientContext = {
      age: studyData.patientAge,
      gender: studyData.patientSex,
      clinicalHistory: studyData.studyDescription || studyData.clinicalHistory || ''
    };

    // Create a simple blank image if we have GOOGLE_AI_API_KEY
    const canUseGemma = !!process.env.GOOGLE_AI_API_KEY;
    let aiFindingsText = '';

    if (canUseGemma) {
      const img = await sharp({
        create: { width: 256, height: 256, channels: 3, background: { r: 240, g: 240, b: 240 } }
      }).jpeg().toBuffer();

      // Convert high-level findings into minimal detection-like input
      const detections = findings.map(f => ({ label: f.category || 'finding', confidence: f.severity === 'critical' ? 0.95 : 0.7, x: 0, y: 0, width: 100, height: 100 }));

      const result = await getMedGemma().generateReport(img, detections, patientContext);
      aiFindingsText = result.report || '';
    } else {
      // Heuristic local generation when AI keys are not configured
      let parts = [];
      if (measurements?.length) {
        parts.push('MEASUREMENTS:\n' + measurements.map(m => `• ${m.type}: ${m.value} ${m.unit} (${m.location || 'unspecified'})`).join('\n'));
      }
      if (findings?.length) {
        parts.push('DOCUMENTED FINDINGS:\n' + findings.map(f => `• ${f.location || 'Region'}: ${f.description}`).join('\n'));
      }
      aiFindingsText = parts.join('\n\n') || 'No acute abnormalities identified.';
    }

    // Map into common template sections
    const sections = {};
    const modality = studyData.modality || 'Medical';

    if (templateId === 'chest-xray') {
      sections['clinical-info'] = patientContext.clinicalHistory || 'Clinical evaluation for diagnostic imaging.';
      sections['technique'] = 'Frontal and lateral chest radiographs obtained in the upright position.';
      sections['findings'] = aiFindingsText || 'No acute cardiopulmonary process.';
      sections['impression'] = findings.some(f => f.severity === 'critical') ? 'ABNORMAL STUDY - Significant findings identified.' : 'No significant abnormalities identified.';
    } else if (templateId === 'ct-chest') {
      sections['clinical-history'] = patientContext.clinicalHistory || 'Diagnostic evaluation.';
      sections['technique'] = 'Chest CT with/without IV contrast.';
      sections['findings'] = aiFindingsText || 'No acute findings.';
      sections['impression'] = findings.some(f => f.severity === 'critical') ? 'ABNORMAL STUDY - Significant findings identified.' : 'No significant abnormalities identified.';
    } else {
      // Generic mapping
      sections['technique'] = modality === 'CT' ? 'CT performed with IV contrast enhancement.' : 'Standard imaging technique utilized.';
      sections['findings'] = aiFindingsText || 'No acute findings.';
      sections['impression'] = findings.some(f => f.severity === 'critical') ? 'ABNORMAL STUDY - Significant findings identified.' : 'No significant abnormalities identified.';
    }

    return res.json({ success: true, sections, usedAI: canUseGemma ? 'gemini' : 'local' });
  } catch (error) {
    console.error('❌ AI generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📝 Create or update (upsert) draft report (autosave)
 * POST /api/reports
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { templateId, sections = {}, findings = [], measurements = [], status = 'draft', author, studyData = {} } = req.body || {};

    if (!studyData?.studyInstanceUID || !studyData?.patientID) {
      return res.status(400).json({ success: false, error: 'studyData.studyInstanceUID and studyData.patientID are required' });
    }

    const query = {
      studyInstanceUID: studyData.studyInstanceUID,
      patientID: studyData.patientID,
      reportStatus: { $in: ['draft', 'preliminary'] },
      radiologistId: (req.user && (req.user.userId || req.user._id)) || undefined
    };

    let report = await StructuredReport.findOne(query);
    if (!report) {
      report = new StructuredReport({
        studyInstanceUID: studyData.studyInstanceUID,
        patientID: studyData.patientID,
        patientName: studyData.patientName,
        modality: studyData.modality,
        studyDescription: studyData.studyDescription,
        radiologistId: (req.user && (req.user.userId || req.user._id)) || undefined,
        radiologistName: (req.user && req.user.username) || author || 'Radiologist',
      });
    }

    report.templateId = templateId || report.templateId;
    report.sections = sections || report.sections || {};
    report.findings = Array.isArray(findings) ? findings : report.findings;
    report.measurements = Array.isArray(measurements) ? measurements : report.measurements;

    // Join some sections into narrative fields to support legacy consumers and PDF
    report.technique = sections['technique'] || report.technique;
    // Build findingsText from sections + findings list
    const findingsTextParts = [];
    if (sections['findings']) findingsTextParts.push(sections['findings']);
    if (Array.isArray(findings) && findings.length) {
      findingsTextParts.push('\nDETAILED FINDINGS:\n' + findings.map((f, i) => `${i + 1}. ${f.location || 'Region'} - ${f.description}`).join('\n'));
    }
    report.findingsText = findingsTextParts.join('\n\n') || report.findingsText;
    report.impression = sections['impression'] || report.impression;

    report.reportStatus = status || report.reportStatus || 'draft';

    // Add revision entry
    report.revisionHistory = report.revisionHistory || [];
    report.revisionHistory.push({
      revisedBy: (req.user && req.user.username) || author || 'System',
      revisedAt: new Date(),
      changes: 'Auto-save/update via API',
      previousStatus: report.reportStatus
    });

    await report.save();

    return res.json({ success: true, report: report.toObject() });
  } catch (error) {
    console.error('❌ Error saving report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 📝 Update report (radiologist edits)
 * PUT /api/structured-reports/:reportId
 */
router.put('/:reportId', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    const updates = req.body;
    
    console.log(`📝 Updating report: ${reportId}`);
    
    const report = await StructuredReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Only allow updates if not final
    if (report.reportStatus === 'final') {
      return res.status(400).json({ error: 'Cannot edit finalized report' });
    }
    
    // Update allowed fields
    const allowedFields = [
      'findings', 'measurements', 'annotations',
      'clinicalHistory', 'technique', 'comparison',
      'findingsText', 'impression', 'recommendations',
      'keyImages', 'tags', 'priority', 'sections', 'templateId'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        report[field] = updates[field];
      }
    });
    
    // Add to revision history
    report.revisionHistory.push({
      revisedBy: req.user.username,
      revisedAt: new Date(),
      changes: 'Report updated',
      previousStatus: report.reportStatus
    });
    
    await report.save();
    
    console.log(`✅ Report updated: ${reportId}`);
    
    res.json({
      success: true,
      report: report.toObject()
    });
    
  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✍️ Sign and finalize report
 * POST /api/structured-reports/:reportId/sign
 */
router.post('/:reportId/sign', authenticate, upload.single('signature'), async (req, res) => {
  try {
    const { reportId } = req.params;
    const { signatureText } = req.body;
    
    console.log(`✍️ Signing report: ${reportId}`);
    
    const report = await StructuredReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Update signature
    if (req.file) {
      report.radiologistSignatureUrl = `/uploads/signatures/${req.file.filename}`;
      report.radiologistSignaturePublicId = req.file.filename;
    }
    
    if (signatureText) {
      report.radiologistSignature = signatureText;
    }
    
    // Finalize report
    report.reportStatus = 'final';
    report.signedAt = new Date();
    report.version += 1;
    
    // Add to revision history
    report.revisionHistory.push({
      revisedBy: req.user.username,
      revisedAt: new Date(),
      changes: 'Report signed and finalized',
      previousStatus: 'draft'
    });
    
    await report.save();
    
    console.log(`✅ Report signed: ${reportId}`);
    
    res.json({
      success: true,
      report: report.toObject(),
      message: 'Report signed and finalized'
    });
    
  } catch (error) {
    console.error('❌ Error signing report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📋 Get report history for a study
 * GET /api/structured-reports/study/:studyInstanceUID
 */
router.get('/study/:studyInstanceUID', authenticate, async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    
    console.log(`📋 Fetching report history for study: ${studyInstanceUID}`);
    
    const reports = await StructuredReport.find({ studyInstanceUID })
      .sort({ reportDate: -1 })
      .select('reportId reportDate reportStatus radiologistName signedAt modality studyDescription version');
    
    res.json({
      success: true,
      count: reports.length,
      reports
    });
    
  } catch (error) {
    console.error('❌ Error fetching report history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📄 Get single report
 * GET /api/structured-reports/:reportId
 */
router.get('/:reportId', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await StructuredReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({
      success: true,
      report: report.toObject()
    });
    
  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📊 Generate consolidated multi-frame report with complete data extraction
 * POST /api/structured-reports/consolidated
 */
router.post('/consolidated', authenticate, async (req, res) => {
  try {
    const { 
      studyInstanceUID, 
      patientID, 
      patientName, 
      modality,
      radiologistName,
      frames // Array of AI analysis results
    } = req.body;

    console.log(`📊 Generating consolidated report for study: ${studyInstanceUID}`);
    console.log(`   Frames provided: ${frames?.length || 0}`);

    // Import all utilities
    const { validateAndFilterFrames } = require('../utils/frameValidation');
    const { calculateAggregateStatistics, generateExecutiveSummary, generateDetailedStatistics } = require('../utils/reportStatistics');
    const { extractMultipleFrames, validateExtractedData } = require('../utils/dataExtraction');
    const { prepareImagesFromFrames } = require('../utils/imageEmbedding');
    const { performQualityAssurance, logQAResults } = require('../utils/qualityAssurance');
    const { ValidationError, handleMissingData } = require('../utils/errorHandling');
    const templateSelector = require('../services/templateSelector');

    // Validate request
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new ValidationError('Frames array is required and must not be empty');
    }

    if (!studyInstanceUID) {
      throw new ValidationError('studyInstanceUID is required');
    }

    // Step 0: Auto-select report template based on study characteristics
    console.log('🎯 Step 0: Auto-selecting report template...');
    const studyInfo = {
      modality,
      bodyPart: req.body.bodyPart,
      studyDescription: req.body.studyDescription,
      seriesDescription: req.body.seriesDescription,
      procedureType: req.body.procedureType
    };

    const templateResult = await templateSelector.selectTemplate(studyInfo);
    const selectedTemplate = templateResult.template;

    if (selectedTemplate) {
      console.log(`   ✅ Selected template: ${selectedTemplate.name}`);
      console.log(`   Match score: ${templateResult.matchScore}`);
    } else {
      console.log('   ℹ️  No template selected, using default structure');
    }

    // Step 1: Extract complete data from all frames
    console.log('📥 Step 1: Extracting complete data from frames...');
    const extractedFrames = extractMultipleFrames(frames);
    console.log(`   Extracted data from ${extractedFrames.length} frames`);

    // Step 2: Validate and filter frames
    console.log('🔍 Step 2: Validating frames...');
    const { validFrames, invalidFrames, stats: validationStats } = validateAndFilterFrames(extractedFrames);

    console.log(`   Valid frames: ${validFrames.length}`);
    console.log(`   Invalid frames: ${invalidFrames.length}`);
    console.log(`   Validation rate: ${validationStats.validPercentage}%`);

    if (validFrames.length === 0) {
      throw new ValidationError('No valid AI-processed frames found', {
        validationStats,
        invalidFrames: invalidFrames.map(f => ({ 
          frameIndex: f.frameIndex, 
          reason: f.reason 
        }))
      });
    }

    // Step 3: Validate extracted data quality
    console.log('✅ Step 3: Validating data quality...');
    const dataValidations = validFrames.map(frame => validateExtractedData(frame));
    const dataIssues = dataValidations.filter(v => !v.isValid);
    
    if (dataIssues.length > 0) {
      console.warn(`⚠️  ${dataIssues.length} frame(s) have data quality issues`);
      dataIssues.forEach(issue => {
        console.warn(`   Frame issues:`, issue.issues);
      });
    }

    // Step 4: Prepare images for embedding
    console.log('🖼️  Step 4: Preparing images for embedding...');
    const preparedImages = await prepareImagesFromFrames(validFrames);
    const imagesAvailable = preparedImages.filter(img => img.available).length;
    console.log(`   Images available: ${imagesAvailable}/${validFrames.length}`);

    // Step 5: Calculate aggregate statistics
    console.log('📊 Step 5: Calculating aggregate statistics...');
    const aggregateStats = calculateAggregateStatistics(validFrames);

    // Step 6: Generate summaries
    console.log('📝 Step 6: Generating summaries...');
    const executiveSummary = generateExecutiveSummary(aggregateStats);
    const detailedStatistics = generateDetailedStatistics(aggregateStats);

    // Step 7: Build comprehensive findings text with embedded images
    console.log('📄 Step 7: Building comprehensive report with images...');
    let findingsText = `🏥 CONSOLIDATED AI MEDICAL ANALYSIS REPORT\n`;
    findingsText += `Powered by MedSigLIP & MedGemma\n`;
    findingsText += `Generated: ${new Date().toLocaleString()}\n`;
    findingsText += `Study: ${studyInstanceUID}\n`;
    findingsText += `Total Frames Analyzed: ${validFrames.length}\n\n`;

    findingsText += `${executiveSummary}\n\n`;
    findingsText += `${detailedStatistics}\n\n`;

    // Add per-frame details with complete data extraction
    findingsText += `DETAILED FRAME ANALYSIS:\n\n`;
    validFrames.forEach((frame, idx) => {
      findingsText += `--- Frame ${frame.frameIndex} ---\n`;
      
      // Classification
      if (frame.classification) {
        const label = frame.classification.label || frame.classification;
        const confidence = frame.classification.confidence;
        findingsText += `Classification: ${label}`;
        if (confidence !== null) {
          findingsText += ` (${(confidence * 100).toFixed(1)}% confidence)`;
        }
        findingsText += `\n`;
      } else {
        findingsText += `Classification: Data unavailable\n`;
      }

      // Quality metrics
      if (frame.quality) {
        if (frame.quality.overallConfidence !== null) {
          findingsText += `Overall Confidence: ${(frame.quality.overallConfidence * 100).toFixed(1)}%\n`;
        }
        if (frame.quality.imageQuality !== null) {
          findingsText += `Image Quality: ${(frame.quality.imageQuality * 100).toFixed(1)}%\n`;
        }
        if (frame.quality.reliability !== null) {
          findingsText += `Reliability: ${(frame.quality.reliability * 100).toFixed(1)}%\n`;
        }
      }

      // Key findings
      if (frame.keyFindings && frame.keyFindings.length > 0) {
        findingsText += `\nKEY FINDINGS:\n`;
        frame.keyFindings.forEach((kf, kidx) => {
          findingsText += `  ${kidx + 1}. ${kf.finding} (${kf.significance})\n`;
          if (kf.location) findingsText += `     Location: ${kf.location}\n`;
        });
      }

      // Critical findings
      if (frame.criticalFindings && frame.criticalFindings.length > 0) {
        findingsText += `\n⚠️ CRITICAL FINDINGS:\n`;
        frame.criticalFindings.forEach((cf, cidx) => {
          findingsText += `  ${cidx + 1}. ${cf.finding} (Urgency: ${cf.urgency})\n`;
          findingsText += `     Action: ${cf.action}\n`;
        });
      }

      // Detections
      if (frame.findings && frame.findings.length > 0) {
        findingsText += `\nDetections: ${frame.findings.length}\n`;
        frame.findings.forEach((finding, fidx) => {
          findingsText += `  ${fidx + 1}. ${finding.type}: ${finding.description}\n`;
          if (finding.location) findingsText += `     Location: ${finding.location}\n`;
          if (finding.confidence !== undefined) {
            findingsText += `     Confidence: ${(finding.confidence * 100).toFixed(1)}%\n`;
          }
        });
      }

      // Detection summary
      if (frame.detectionSummary) {
        findingsText += `\nDetection Summary: ${frame.detectionSummary.summary}\n`;
      }

      // Image reference
      const imageInfo = preparedImages.find(img => img.frameIndex === frame.frameIndex);
      if (imageInfo && imageInfo.available) {
        findingsText += `\n[Image embedded: ${imageInfo.caption}]\n`;
      } else {
        findingsText += `\n[Image not available]`;
      }

      // Data completeness
      if (frame.dataCompleteness) {
        findingsText += `\nData Completeness: ${frame.dataCompleteness}%\n`;
      }

      findingsText += `\n`;
    });

    // Step 5: Build impression
    let impression = `CONSOLIDATED IMPRESSION:\n\n`;
    impression += `Analysis of ${validFrames.length} frames from this study reveals:\n\n`;
    
    if (aggregateStats.mostCommonFinding) {
      impression += `Primary Finding: ${aggregateStats.mostCommonFinding} identified in ${aggregateStats.mostCommonFindingCount} frames (${(aggregateStats.mostCommonFindingCount / validFrames.length * 100).toFixed(1)}%)\n\n`;
    }

    if (aggregateStats.criticalFindings.length > 0) {
      impression += `CRITICAL: ${aggregateStats.criticalFindings.length} critical finding(s) requiring immediate attention:\n`;
      aggregateStats.criticalFindings.forEach((finding, idx) => {
        impression += `${idx + 1}. Frame ${finding.frameIndex}: ${finding.type} - ${finding.description}\n`;
      });
      impression += `\n`;
    }

    impression += `Average diagnostic confidence: ${(aggregateStats.averageConfidence * 100).toFixed(1)}%\n\n`;
    impression += `This is a preliminary AI-generated consolidated analysis. `;
    impression += `Radiologist review and clinical correlation are required for final diagnosis.`;

    // Step 6: Build technique
    const technique = `${modality || 'Medical'} imaging study analyzed using AI-assisted analysis. `;
    const servicesText = aggregateStats.servicesUsed.join(' and ');
    const techniqueDetail = `${validFrames.length} frames were processed through ${servicesText} for comprehensive evaluation. `;
    const techniqueMethod = `MedSigLIP provided image classification and abnormality detection, while MedGemma generated detailed clinical reports for each frame.`;

    // Step 8: Perform quality assurance
    console.log('✅ Step 8: Performing quality assurance...');
    const reportDataForQA = {
      reportId: `SR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studyInstanceUID,
      patientID,
      patientName,
      modality,
      radiologistName,
      frames: validFrames,
      findingsText,
      impression,
      technique,
      reportDate: new Date()
    };

    const qaResults = performQualityAssurance(reportDataForQA);
    logQAResults(qaResults, reportDataForQA.reportId);

    if (!qaResults.passed) {
      console.warn('⚠️  Quality assurance did not pass, but continuing with report creation');
      console.warn(`   Score: ${qaResults.percentage}% (${qaResults.grade})`);
    }

    // Step 9: Create consolidated report with template
    console.log('💾 Step 9: Creating consolidated report...');
    
    // Apply template to report data if available
    let reportData = {
      studyInstanceUID: studyInstanceUID || 'UNKNOWN',
      patientID: patientID || 'UNKNOWN',
      patientName: patientName || 'Unknown Patient',
      modality: modality || 'XA',
      reportStatus: 'draft',
      radiologistId: req.user.userId || req.user._id,
      radiologistName: radiologistName || req.user.username || 'Radiologist',
      findings: [], // Will be populated from frames
      findingsText,
      impression,
      technique: technique + techniqueDetail + techniqueMethod,
      reportDate: new Date(),
      tags: ['AI-Generated', 'MedSigLIP', 'MedGemma', 'Consolidated', 'Multi-Frame'],
      imageCount: validFrames.filter(f => f.imageSnapshot).length
    };

    // Apply template if selected
    const appliedTemplate = (await templateSelector.selectTemplate({ modality })).template;
    if (appliedTemplate) {
      reportData = templateSelector.applyTemplate(appliedTemplate, reportData);
      reportData.tags.push(`Template:${appliedTemplate.name}`);
      console.log(`   ✅ Applied template: ${appliedTemplate.name}`);
    }

    const consolidatedReport = new StructuredReport(reportData);

    // Add findings from all frames with complete data
    validFrames.forEach(frame => {
      // Classification finding
      if (frame.classification) {
        consolidatedReport.findings.push({
          id: `frame-${frame.frameIndex}-classification`,
          type: 'finding',
          category: 'ai-classification',
          description: `Frame ${frame.frameIndex}: ${frame.classification.label || frame.classification}`,
          severity: frame.classification.confidence > 0.8 ? 'moderate' : 'mild',
          frameIndex: frame.frameIndex,
          timestamp: new Date()
        });
      }

      // Key findings
      if (frame.keyFindings && frame.keyFindings.length > 0) {
        frame.keyFindings.forEach((kf, kidx) => {
          consolidatedReport.findings.push({
            id: `frame-${frame.frameIndex}-key-${kidx}`,
            type: 'finding',
            category: 'key-finding',
            description: `Frame ${frame.frameIndex}: ${kf.finding}`,
            severity: kf.significance === 'high' ? 'moderate' : 'mild',
            location: kf.location,
            frameIndex: frame.frameIndex,
            timestamp: new Date()
          });
        });
      }

      // Critical findings
      if (frame.criticalFindings && frame.criticalFindings.length > 0) {
        frame.criticalFindings.forEach((cf, cidx) => {
          consolidatedReport.findings.push({
            id: `frame-${frame.frameIndex}-critical-${cidx}`,
            type: 'critical',
            category: 'critical-finding',
            description: `Frame ${frame.frameIndex}: ${cf.finding}`,
            severity: 'critical',
            frameIndex: frame.frameIndex,
            timestamp: new Date()
          });
        });
      }

      // Regular detections
      if (frame.findings && Array.isArray(frame.findings)) {
        frame.findings.forEach((finding, idx) => {
          consolidatedReport.findings.push({
            id: `frame-${frame.frameIndex}-finding-${idx}`,
            type: 'finding',
            category: 'ai-detection',
            description: `Frame ${frame.frameIndex}: ${finding.type} - ${finding.description}`,
            severity: finding.severity || 'normal',
            location: finding.location,
            confidence: finding.confidence,
            frameIndex: frame.frameIndex,
            timestamp: new Date()
          });
        });
      }
    });

    // Add key images with complete metadata
    preparedImages.forEach(img => {
      if (img.available) {
        const frame = validFrames.find(f => f.frameIndex === img.frameIndex);
        consolidatedReport.keyImages.push({
          id: `image-frame-${img.frameIndex}`,
          dataUrl: frame.imageSnapshot?.data || null,
          caption: img.caption,
          timestamp: new Date(),
          metadata: {
            frameIndex: img.frameIndex,
            ...img.metadata,
            hasAIOverlay: true,
            hasAnnotations: frame.findings?.length > 0
          }
        });
      }
    });

    await consolidatedReport.save();

    console.log(`✅ Consolidated report created: ${consolidatedReport.reportId}`);

    res.json({
      success: true,
      report: consolidatedReport.toObject(),
      // trimmed metadata for client UI
      message: `Consolidated report created from ${validFrames.length} valid frames${appliedTemplate ? ` using template: ${appliedTemplate.name}` : ''}`
    });

  } catch (error) {
    console.error('❌ Error creating consolidated report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📥 Download report as professional PDF
 * GET /api/structured-reports/:reportId/pdf
 */
router.get('/:reportId/pdf', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await StructuredReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    console.log(`📄 Generating professional PDF for report: ${reportId}`);

    // Use professional PDF generator
    const ProfessionalPDFGenerator = require('../utils/professionalPDFGenerator');
    const pdfGenerator = new ProfessionalPDFGenerator();

    // Prepare report data
    const reportData = {
      ...report.toObject(),
      frames: report.findings.map(f => ({
        frameIndex: f.frameIndex,
        classification: f.category === 'ai-classification' ? { label: f.description } : null,
        report: f.category === 'ai-clinical-report' ? { findings: f.description } : null,
        findingsText: f.description,
        timestamp: f.timestamp
      }))
    };

    // Generate PDF to temporary file
    const path = require('path');
    const fs = require('fs');
    const tmpDir = path.join(__dirname, '../../tmp');
    
    // Ensure tmp directory exists
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const pdfPath = path.join(tmpDir, `report-${reportId}.pdf`);

    await pdfGenerator.generateReport(reportData, pdfPath);

    console.log(`✅ PDF generated: ${pdfPath}`);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // Clean up temp file after sending
    fileStream.on('end', () => {
      fs.unlink(pdfPath, (err) => {
        if (err) console.error('Error deleting temp PDF:', err);
      });
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📥 Download consolidated report as professional PDF (legacy endpoint)
 * GET /api/structured-reports/:reportId/pdf-old
 */
router.get('/:reportId/pdf-old', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await StructuredReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Generate PDF (simplified version - you can enhance this)
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('Medical Report', { align: 'center' });
    doc.moveDown();
    
    // Patient Info
    doc.fontSize(12).text(`Patient: ${report.patientName}`);
    doc.text(`Patient ID: ${report.patientID}`);
    doc.text(`Study: ${report.studyDescription || 'N/A'}`);
    doc.text(`Date: ${report.reportDate.toLocaleDateString()}`);
    doc.moveDown();
    
    // Findings
    doc.fontSize(14).text('Findings:', { underline: true });
    doc.fontSize(11).text(report.findingsText || 'No findings documented');
    doc.moveDown();
    
    // Impression
    doc.fontSize(14).text('Impression:', { underline: true });
    doc.fontSize(11).text(report.impression || 'No impression documented');
    doc.moveDown();
    
    // Signature
    doc.fontSize(12).text(`Signed by: ${report.radiologistName}`);
    if (report.signedAt) {
      doc.text(`Date: ${report.signedAt.toLocaleDateString()}`);
    }
    
    if (report.radiologistSignature) {
      doc.text(`Signature: ${report.radiologistSignature}`);
    }
    
    doc.end();
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
