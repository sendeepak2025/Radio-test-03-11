/**
 * 🎯 UNIFIED REPORTING SYSTEM
 * Single consolidated route for all reporting functionality
 * 
 * Features:
 * - Report CRUD operations
 * - Template management
 * - AI-assisted generation
 * - Digital signatures
 * - Export (PDF, DICOM SR, FHIR)
 * - Audit trail
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const StructuredReport = require('../models/StructuredReport');
const ReportTemplate = require('../models/ReportTemplate');
const templateSelector = require('../services/templateSelector');
const exportService = require('../services/export-service');
const auditService = require('../services/audit-service');
const { validateReportForSigning, getModalityValidationPreview } = require('../utils/modalityValidationRules');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

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

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Log all incoming requests for diagnostics
 */
router.use((req, res, next) => {
  console.log(`[REPORTS API] ${req.method} ${req.originalUrl || req.url}`);
  next();
});

// ============================================================================
// HEALTH CHECK (No auth required for diagnostics)
// ============================================================================

/**
 * GET /api/reports/health
 * Health check endpoint for connectivity testing
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'unified-reporting',
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// All other routes require authentication
router.use(authenticate);

// ✅ COMPLIANCE UPDATE: Ensure database indexes are created
// This should be called once during app initialization
async function ensureIndexes() {
  try {
    const StructuredReport = require('../models/StructuredReport');
    
    // Create indexes for performance
    await StructuredReport.collection.createIndex({ reportId: 1 }, { unique: true });
    await StructuredReport.collection.createIndex({ studyInstanceUID: 1 });
    await StructuredReport.collection.createIndex({ patientID: 1, reportStatus: 1 });
    await StructuredReport.collection.createIndex({ updatedAt: -1 });
    await StructuredReport.collection.createIndex({ reportStatus: 1, reportDate: -1 });
    
    console.log('✅ Report indexes ensured');
  } catch (error) {
    console.error('⚠️ Failed to create indexes:', error.message);
  }
}

// Call on module load (idempotent)
ensureIndexes().catch(err => console.error('Index creation error:', err));

// ============================================================================
// HELPER FUNCTIONS - Authorization & Versioning
// ============================================================================

/**
 * Check if user can access report (RBAC + tenant scoping)
 */
function canAccessReport(req, report) {
  if (!report) return false;
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const userRole = req.user.role || req.user.roles?.[0];
  const userOrgId = req.user.hospitalId || req.user.orgId;
  
  // Same organization check
  const sameOrg = !report.hospitalId || String(report.hospitalId) === String(userOrgId);
  
  // Permitted roles
  const permittedRole = ['radiologist', 'admin', 'superadmin', 'qa', 'system:admin'].includes(userRole);
  
  // Is owner
  const isOwner = String(report.radiologistId) === String(userId);
  
  return sameOrg && (permittedRole || isOwner);
}

/**
 * Bump version safely
 */
function bumpVersion(report) {
  report.version = (report.version || 0) + 1;
}

/**
 * Push revision to history
 */
function pushRevision(report, user, changes, previousStatus) {
  report.revisionHistory = report.revisionHistory || [];
  report.revisionHistory.push({
    revisedBy: user?.username || 'System',
    revisedAt: new Date(),
    changes,
    previousStatus
  });
}

/**
 * Generate content hash for signature verification
 */
function contentHash(report) {
  const crypto = require('crypto');
  const payload = JSON.stringify({
    technique: report.technique,
    findingsText: report.findingsText,
    impression: report.impression,
    sections: report.sections,
    measurements: report.measurements,
    findings: report.findings,
    templateId: report.templateId
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Note: validateReportForSigning is now imported from modalityValidationRules.js
// which provides comprehensive modality-specific validation

// ============================================================================
// REPORT QUERIES (Must come BEFORE /:reportId to prevent shadowing)
// ============================================================================

/**
 * GET /api/reports/study/:studyInstanceUID
 * Get all reports for a study
 */
router.get('/study/:studyInstanceUID', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;

    const reports = await StructuredReport.find({ studyInstanceUID })
      .sort({ reportDate: -1 })
      .select('reportId reportDate reportStatus radiologistName signedAt modality version');

    res.json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {
    console.error('❌ Error fetching study reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/patient/:patientID
 * Get all reports for a patient (prior studies)
 */
router.get('/patient/:patientID', async (req, res) => {
  try {
    const { patientID } = req.params;
    const { limit } = req.query;

    const reports = await StructuredReport.find({ patientID })
      .sort({ reportDate: -1 })
      .limit(parseInt(limit) || 10)
      .select('reportId reportDate reportStatus radiologistName studyInstanceUID modality impression');

    res.json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {
    console.error('❌ Error fetching patient reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/templates
 * Get all active templates
 */
router.get('/templates', async (req, res) => {
  try {
    const { active = 'true' } = req.query;

    const templates = await ReportTemplate.find({ active: active === 'true' })
      .sort({ category: 1, name: 1 });

    res.json({
      success: true,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/templates/suggest
 * Auto-select best template for a study
 */
router.post('/templates/suggest', async (req, res) => {
  try {
    const study = req.body;

    const result = await templateSelector.selectTemplate(study);

    if (!result.template) {
      return res.json({
        success: true,
        template: null,
        message: 'No suitable template found',
        matchScore: result.matchScore
      });
    }

    res.json({
      success: true,
      template: result.template,
      matchScore: result.matchScore,
      matchDetails: result.matchDetails
    });

  } catch (error) {
    console.error('❌ Error suggesting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/templates/:templateId
 * Get single template by ID
 */
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('❌ Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/templates
 * Create new template
 */
router.post('/templates', async (req, res) => {
  try {
    // Generate unique template ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const templateId = `TPL-CUSTOM-${timestamp}-${random}`;

    const templateData = {
      ...req.body,
      templateId,
      isDefault: false,
      active: true,
      createdBy: req.user?.userId || req.user?._id,
      updatedBy: req.user?.userId || req.user?._id
    };

    const template = new ReportTemplate(templateData);
    await template.save();

    console.log('✅ Template created:', templateId);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/reports/templates/:templateId
 * Update existing template
 */
router.put('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Prevent editing default templates unless user is admin
    if (template.isDefault && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify default templates'
      });
    }

    // Update fields
    Object.assign(template, req.body);
    template.updatedBy = req.user?.userId || req.user?._id;

    await template.save();

    console.log('✅ Template updated:', templateId);

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/reports/templates/:templateId
 * Delete template (soft delete via active flag)
 */
router.delete('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Prevent deleting default templates
    if (template.isDefault) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete default templates'
      });
    }

    // Soft delete by setting active to false
    template.active = false;
    template.updatedBy = req.user?.userId || req.user?._id;
    await template.save();

    console.log('✅ Template deleted (soft):', templateId);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/templates/:templateId/clone
 * Clone existing template
 */
router.post('/templates/:templateId/clone', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name } = req.body;

    const sourceTemplate = await ReportTemplate.findOne({ templateId });

    if (!sourceTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Source template not found'
      });
    }

    // Generate new template ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const newTemplateId = `TPL-CLONE-${timestamp}-${random}`;

    // Clone template data
    const clonedData = sourceTemplate.toObject();
    delete clonedData._id;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;
    delete clonedData.usageStats;

    const newTemplate = new ReportTemplate({
      ...clonedData,
      templateId: newTemplateId,
      name: name || `${sourceTemplate.name} (Copy)`,
      isDefault: false,
      active: true,
      priority: sourceTemplate.priority - 1,
      createdBy: req.user?.userId || req.user?._id,
      updatedBy: req.user?.userId || req.user?._id
    });

    await newTemplate.save();

    console.log('✅ Template cloned:', templateId, '→', newTemplateId);

    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Template cloned successfully'
    });

  } catch (error) {
    console.error('❌ Error cloning template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/templates/:templateId/stats
 * Get template usage statistics
 */
router.get('/templates/:templateId/stats', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Get report count using this template
    const reportCount = await StructuredReport.countDocuments({ templateId });

    // Get recent reports
    const recentReports = await StructuredReport.find({ templateId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('reportStatus createdAt updatedAt');

    res.json({
      success: true,
      data: {
        templateId,
        timesUsed: template.usageStats?.timesUsed || reportCount,
        lastUsed: template.usageStats?.lastUsed,
        averageCompletionTime: template.usageStats?.averageCompletionTime,
        averageRating: template.averageRating,
        reportCount,
        recentReports
      }
    });

  } catch (error) {
    console.error('❌ Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// REPORT CRUD OPERATIONS
// ============================================================================

/**
 * POST /api/reports
 * Create new report or update draft (upsert)
 */
router.post('/', async (req, res) => {
  try {
    const {
      studyInstanceUID,
      patientID,
      patientName,
      modality,
      templateId,
      sections = {},
      findings = [],
      measurements = [],
      status = 'draft'
    } = req.body;

    if (!studyInstanceUID || !patientID) {
      return res.status(400).json({
        success: false,
        error: 'studyInstanceUID and patientID are required'
      });
    }

    const userId = req.user.userId || req.user._id || req.user.id;
    const userOrgId = req.user.hospitalId || req.user.orgId;

    // Check for existing draft
    const query = {
      studyInstanceUID,
      patientID,
      reportStatus: { $in: ['draft', 'preliminary'] },
      radiologistId: userId
    };

    let report = await StructuredReport.findOne(query);
    const isNew = !report;
    const previousStatus = report?.reportStatus;

    if (!report) {
      // Create new report with defaults
      report = new StructuredReport({
        studyInstanceUID,
        patientID,
        patientName,
        modality,
        templateId,
        radiologistId: userId,
        radiologistName: req.user.username || 'Radiologist',
        hospitalId: userOrgId,
        reportStatus: status,
        reportDate: new Date(), // Always set on create
        version: 1 // Start at version 1
      });
    }

    // Update fields
    report.findings = findings;
    report.measurements = measurements;
    report.templateId = templateId || report.templateId;
    
    // ✅ COMPLIANCE UPDATE: Accept keyImages from client
    if (req.body.keyImages !== undefined) {
      report.keyImages = req.body.keyImages;
    }

    // ✅ TEMPLATE STRUCTURE FIX: Store data according to template structure
    // If template is used, store ALL content in sections object
    // Top-level fields are ONLY for backward compatibility and preview
    if (templateId) {
      // Template-based report: Initialize sections if needed
      if (!report.sections || typeof report.sections !== 'object') {
        report.sections = {};
      }
      
      // Merge incoming sections
      if (sections && typeof sections === 'object') {
        Object.assign(report.sections, sections);
      }
      
      // Store narrative fields in sections with proper keys
      if (req.body.technique !== undefined) {
        report.sections.technique = req.body.technique;
      }
      if (req.body.findingsText !== undefined) {
        report.sections.findings = req.body.findingsText;
      }
      if (req.body.impression !== undefined) {
        report.sections.impression = req.body.impression;
      }
      if (req.body.clinicalHistory !== undefined) {
        report.sections.clinical_indication = req.body.clinicalHistory;
      }
      if (req.body.recommendations !== undefined) {
        report.sections.recommendations = req.body.recommendations;
      }
      
      // Derive top-level fields from sections for backward compatibility
      report.technique = report.sections.technique || '';
      report.findingsText = report.sections.findings || report.sections.findingsText || '';
      report.impression = report.sections.impression || '';
      report.clinicalHistory = report.sections.clinical_indication || report.sections.clinicalHistory || report.sections.indication || '';
      report.recommendations = report.sections.recommendations || '';
      
      console.log('✅ Template report created/updated - sections:', Object.keys(report.sections));
    } else {
      // Non-template report: Use top-level fields directly
      report.sections = sections || {};
      report.technique = req.body.technique ?? report.technique ?? '';
      report.findingsText = req.body.findingsText ?? report.findingsText ?? '';
      report.impression = req.body.impression ?? report.impression ?? '';
      report.clinicalHistory = req.body.clinicalHistory ?? report.clinicalHistory ?? '';
      report.recommendations = req.body.recommendations ?? report.recommendations ?? '';
    }
    
    // ✅ TEMPLATE FIX: Store template metadata
    if (req.body.templateName) report.templateName = req.body.templateName;
    if (req.body.templateVersion) report.templateVersion = req.body.templateVersion;

    // Add revision entry with proper versioning
    if (!isNew) {
      bumpVersion(report);
      pushRevision(report, req.user, 'Auto-save/update', previousStatus);
    } else {
      pushRevision(report, req.user, 'Report created', null);
    }

    await report.save();

    // ✅ WORKLIST EMPTY FIX: On create/update of report: upsert worklist row
    try {
      const WorklistItem = require('../models/WorklistItem');
      await WorklistItem.updateOne(
        { studyInstanceUID: studyInstanceUID },
        { 
          $set: {
            reportStatus: 'draft',
            reportId: report._id.toString(),
            status: 'in_progress' // ✅ WORKLIST EMPTY FIX: status=IN_PROGRESS, reportStatus='DRAFT'
          },
          $setOnInsert: {
            patientID: patientID,
            hospitalId: userOrgId,
            priority: 'routine',
            scheduledFor: new Date()
          }
        },
        { upsert: true }
      );
      console.log(`✅ Worklist updated for study: ${studyInstanceUID}`);
    } catch (worklistError) {
      console.error('Failed to update worklist:', worklistError.message);
      // Don't fail the request if worklist update fails
    }

    res.json({
      success: true,
      report: report.toObject(),
      message: isNew ? 'Report created' : 'Report updated'
    });

  } catch (error) {
    console.error('❌ Error creating/updating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/:reportId
 * Get report by ID (with access control)
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log('📋 Fetching report:', reportId);
    
    // Try to find by reportId field first (SR-xxx format)
    let report = await StructuredReport.findOne({ reportId });
    
    // Fallback: try MongoDB _id if reportId not found
    if (!report && reportId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('   Trying MongoDB _id fallback');
      report = await StructuredReport.findById(reportId);
    }
    
    if (!report) {
      console.error('❌ Report not found:', reportId);
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    console.log('✅ Report found:', report.reportId);

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to view this report'
      });
    }

    // Audit log (minimal PHI)
    await auditService.logAction({
      userId: req.user.userId || req.user._id,
      action: 'REPORT_READ',
      resourceType: 'Report',
      resourceId: reportId,
      details: {
        reportStatus: report.reportStatus
      },
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      report: report.toObject()
    });

  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/reports/:reportId
 * Update report (with access control and versioning)
 * ✅ COMPLIANCE UPDATE: Optimistic locking with ETag/version checking
 */
router.put('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const updates = req.body;
    const clientVersion = req.headers['if-match']; // ETag from client

    const report = await StructuredReport.findOne({ reportId });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to edit this report'
      });
    }

    // ✅ COMPLIANCE UPDATE: Check if report is signed/final - reject modifications
    if (report.reportStatus === 'final' || report.reportStatus === 'final_with_addendum') {
      return res.status(409).json({
        success: false,
        error: 'SIGNED_IMMUTABLE',
        message: 'Cannot edit signed report. Signed fields are immutable. Use addendum instead.'
      });
    }

    // ✅ COMPLIANCE UPDATE: Optimistic locking - version conflict detection
    if (clientVersion && String(report.version) !== String(clientVersion)) {
      return res.status(409).json({
        success: false,
        error: 'VERSION_CONFLICT',
        message: 'Report has been modified by another user',
        serverVersion: report.version,
        clientVersion: clientVersion
      });
    }

    // Capture previous status before mutation
    const previousStatus = report.reportStatus;

    // ✅ TEMPLATE FIX: Check if template changed
    const templateChanged = updates.templateId && String(updates.templateId) !== String(report.templateId);
    
    if (templateChanged) {
      console.log('🔄 Template changed:', report.templateId, '→', updates.templateId);
      
      // ✅ TEMPLATE FIX: When template changes, replace sections entirely (do not merge)
      if (updates.sections) {
        report.sections = updates.sections; // Replace, not merge
      }
      
      // ✅ TEMPLATE FIX: Update template metadata
      report.templateId = updates.templateId;
      if (updates.templateName) report.templateName = updates.templateName;
      if (updates.templateVersion) report.templateVersion = updates.templateVersion;
    }

    // Update allowed fields
    const allowedFields = [
      'findings', 'measurements', 'sections', 'templateId', 'templateName', 'templateVersion',
      'technique', 'findingsText', 'impression', 'keyImages', 'tags',
      'clinicalHistory', 'recommendations', 'criticalComms', 'moduleData', 'anatomicalMarkings'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        report[field] = updates[field];
      }
    });

    // ✅ TEMPLATE STRUCTURE FIX: Maintain data according to template structure
    // If template is used, sections is the source of truth
    // Top-level fields are derived for backward compatibility
    if (report.templateId) {
      console.log('📝 Processing template-based report update:', {
        templateId: report.templateId,
        incomingSectionsKeys: updates.sections ? Object.keys(updates.sections) : [],
        hasTopLevelFields: {
          technique: updates.technique !== undefined,
          findingsText: updates.findingsText !== undefined,
          impression: updates.impression !== undefined
        }
      });
      
      // Template-based report: sections is source of truth
      // Initialize sections if not exists
      if (!report.sections || typeof report.sections !== 'object') {
        report.sections = {};
        console.log('  → Initialized empty sections object');
      }
      
      // Update sections from incoming data (sections object takes priority)
      if (updates.sections && typeof updates.sections === 'object') {
        // Merge sections
        Object.assign(report.sections, updates.sections);
        console.log('  → Merged incoming sections');
      }
      
      // Update sections from top-level fields (for backward compatibility)
      if (updates.technique !== undefined) {
        report.sections.technique = updates.technique;
        console.log('  → Stored technique in sections');
      }
      if (updates.findingsText !== undefined) {
        report.sections.findings = updates.findingsText;
        console.log('  → Stored findingsText in sections.findings');
      }
      if (updates.impression !== undefined) {
        report.sections.impression = updates.impression;
        console.log('  → Stored impression in sections');
      }
      if (updates.clinicalHistory !== undefined) {
        report.sections.clinical_indication = updates.clinicalHistory;
        console.log('  → Stored clinicalHistory in sections.clinical_indication');
      }
      if (updates.recommendations !== undefined) {
        report.sections.recommendations = updates.recommendations;
        console.log('  → Stored recommendations in sections');
      }
      
      // Derive top-level fields from sections (for preview/export compatibility)
      report.technique = report.sections.technique || '';
      report.findingsText = report.sections.findings || report.sections.findingsText || '';
      report.impression = report.sections.impression || '';
      report.clinicalHistory = report.sections.clinical_indication || report.sections.clinicalHistory || report.sections.indication || '';
      report.recommendations = report.sections.recommendations || '';
      
      console.log('✅ Template report updated - sections keys:', Object.keys(report.sections));
      console.log('✅ Top-level fields derived:', {
        technique: report.technique.substring(0, 30) + '...',
        findingsText: report.findingsText.substring(0, 30) + '...',
        impression: report.impression.substring(0, 30) + '...'
      });
    } else {
      // Non-template report: top-level fields are source of truth
      if (updates.technique !== undefined) {
        report.technique = updates.technique;
      }
      if (updates.findingsText !== undefined) {
        report.findingsText = updates.findingsText;
      }
      if (updates.impression !== undefined) {
        report.impression = updates.impression;
      }
      if (updates.clinicalHistory !== undefined) {
        report.clinicalHistory = updates.clinicalHistory;
      }
      if (updates.recommendations !== undefined) {
        report.recommendations = updates.recommendations;
      }
    }

    // Bump version and add revision
    bumpVersion(report);
    pushRevision(report, req.user, 'Report updated', previousStatus);

    await report.save();

    // ✅ COMPLIANCE UPDATE: Return ETag header with new version
    res.setHeader('ETag', String(report.version));

    res.json({
      success: true,
      report: report.toObject(),
      version: report.version // Include version in response
    });

  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/reports/:reportId
 * Delete draft report (with access control)
 */
router.delete('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to delete this report'
      });
    }

    // Only allow deletion of drafts
    if (report.reportStatus !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft reports can be deleted'
      });
    }

    await report.deleteOne();

    // Audit log
    await auditService.logAction({
      userId: req.user.userId || req.user._id,
      action: 'REPORT_DELETED',
      resourceType: 'Report',
      resourceId: reportId,
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// REPORT FINALIZATION & SIGNING
// ============================================================================

/**
 * POST /api/reports/:reportId/finalize
 * Finalize report (make it preliminary) with access control
 */
router.post('/:reportId/finalize', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to finalize this report'
      });
    }

    const previousStatus = report.reportStatus;
    report.reportStatus = 'preliminary';
    
    bumpVersion(report);
    pushRevision(report, req.user, 'Report finalized', previousStatus);

    await report.save();

    // ✅ WORKLIST EMPTY FIX: On finalize: status=COMPLETED, reportStatus='FINALIZED'
    try {
      const WorklistItem = require('../models/WorklistItem');
      await WorklistItem.updateOne(
        { studyInstanceUID: report.studyInstanceUID },
        { 
          $set: {
            reportStatus: 'finalized',
            reportId: report._id.toString(),
            status: 'completed',
            completedAt: new Date()
          }
        }
      );
      console.log(`✅ Worklist updated for study: ${report.studyInstanceUID}`);
    } catch (worklistError) {
      console.error('Failed to update worklist:', worklistError.message);
      // Don't fail the request if worklist update fails
    }

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Report finalized'
    });

  } catch (error) {
    console.error('❌ Error finalizing report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/sign
 * Sign and finalize report with content hash verification
 * ✅ COMPLIANCE UPDATE: Enhanced FDA-compliant signature with validation
 */
router.post('/:reportId/sign', upload.single('signatureFile'), async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // ✅ FIX: Parse signatureData from request body
    let signatureData = {};
    if (req.body.signatureData) {
      try {
        signatureData = typeof req.body.signatureData === 'string' 
          ? JSON.parse(req.body.signatureData) 
          : req.body.signatureData;
      } catch (err) {
        console.error('Failed to parse signatureData:', err);
      }
    }
    
    const { 
      signatureText = signatureData.signatureText,
      signatureMeaning = signatureData.signatureMeaning || 'author',
      password = signatureData.password,
      reason = signatureData.reason
    } = signatureData;

    console.log('📝 Sign request received:', {
      reportId,
      hasSignatureText: !!signatureText,
      hasSignatureImage: !!req.file,
      hasFile: !!req.file,
      signatureMeaning
    });

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to sign this report'
      });
    }

    // ✅ SIGNATURE FIX: Require either signature file OR signature text
    if (!req.file && !signatureText) {
      return res.status(400).json({
        success: false,
        error: 'SIGNATURE_REQUIRED',
        message: 'Either signature image or signature text is required to sign the report'
      });
    }

    // ✅ PASSWORD VERIFICATION: Verify user password before signing
    if (password) {
      const User = require('../models/User');
      const bcrypt = require('bcryptjs');
      const userId = req.user.userId || req.user._id || req.user.id;
      const user = await User.findById(userId);
      
      if (user && user.passwordHash) {
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            error: 'INVALID_PASSWORD',
            message: 'Invalid password. Please enter your correct password to sign the report.'
          });
        }
      }
    }

    // ✅ VALIDATION: Pre-sign validation with template rules
    const reportValidator = require('../utils/reportValidator');
    const ReportTemplate = require('../models/ReportTemplate');
    
    const template = await ReportTemplate.findOne({ templateId: report.templateId });
    const validation = reportValidator.validateForSigning(report, template);
    
    if (!validation.valid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Report cannot be signed. Please complete all required fields.',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    // Log warnings (if any) but allow signing
    if (validation.warnings.length > 0) {
      console.log('⚠️ Signing with warnings:', validation.warnings);
    }

    const previousStatus = report.reportStatus;
    const userId = req.user.userId || req.user._id || req.user.id;

    // Generate content hash to bind signature to content
    const hash = contentHash(report);

    // ✅ COMPLIANCE UPDATE: Lock template version at signing
    if (report.templateId && !report.templateVersion) {
      // Fetch template version if not already set
      const template = await ReportTemplate.findOne({ id: report.templateId });
      if (template) {
        report.templateVersion = template.version || '1.0';
      }
    }

    // ✅ FIX: Get user info for signature
    const User = require('../models/User');
    const user = await User.findById(userId);
    const fullName = user?.fullName || user?.username || req.user.username || 'Radiologist';
    const licenseNumber = user?.licenseNumber || '';
    const specialty = user?.specialty || '';

    // ✅ COMPLIANCE UPDATE: Enhanced FDA-compliant signature block
    report.signature = {
      by: userId,
      displayName: fullName,
      licenseNumber: licenseNumber,
      specialty: specialty,
      at: new Date(),
      method: req.file ? 'image' : 'text',
      meaning: signatureMeaning || 'author',
      reason: reason,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || 'Unknown',
      contentHash: hash
    };

    // ✅ FIX: Store signature image file (uploaded to server)
    if (req.file) {
      // Uploaded file - store relative path
      report.radiologistSignatureUrl = `/uploads/signatures/${req.file.filename}`;
      report.radiologistSignaturePublicId = req.file.filename;
      console.log('✅ Signature file saved:', req.file.filename);
    }

    // Store text signaturere
    if (signatureText) {
      report.radiologistSignature = signatureText;
    }
    
    // Store full radiologist name
    report.radiologistName = fullName;

    // ✅ COMPLIANCE UPDATE: Set status based on context
    if (report.reportStatus === 'final' && reason) {
      // This is an addendum signature
      report.reportStatus = 'final_with_addendum';
    } else {
      report.reportStatus = 'final';
    }
    
    report.signedAt = new Date();
    
    bumpVersion(report);
    pushRevision(report, req.user, 'Report signed and finalized', previousStatus);

    // ✅ COMPLIANCE UPDATE: Generate and store JSON export on signing
    report.exportedJSON = {
      reportId: report.reportId,
      patientID: report.patientID,
      patientName: report.patientName,
      studyInstanceUID: report.studyInstanceUID,
      modality: report.modality,
      technique: report.technique,
      clinicalHistory: report.clinicalHistory, // ✅ COMPLIANCE UPDATE: Include clinical history
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations,
      sections: report.sections,
      findings: report.findings,
      measurements: report.measurements,
      aiDetections: report.aiDetections, // ✅ COMPLIANCE UPDATE: Include AI detections
      keyImages: report.keyImages, // ✅ COMPLIANCE UPDATE: Include key images
      signedAt: report.signedAt,
      signedBy: report.radiologistName,
      signature: report.signature,
      version: report.version,
      templateId: report.templateId,
      templateVersion: report.templateVersion, // ✅ COMPLIANCE UPDATE: Template version
      exportedAt: new Date()
    };

    await report.save();

    // ✅ WORKLIST EMPTY FIX: On sign: keep status=COMPLETED, reportStatus='SIGNED'
    try {
      const WorklistItem = require('../models/WorklistItem');
      await WorklistItem.updateOne(
        { studyInstanceUID: report.studyInstanceUID },
        { 
          $set: {
            reportStatus: 'finalized', // Keep as 'finalized' (signed is implicit)
            reportId: report._id.toString(),
            status: 'completed',
            completedAt: report.signedAt
          }
        }
      );
      console.log(`✅ Worklist updated for study: ${report.studyInstanceUID}`);
    } catch (worklistError) {
      console.error('Failed to update worklist:', worklistError.message);
      // Don't fail the request if worklist update fails
    }

    // Audit log
    await auditService.logAction({
      userId,
      action: 'REPORT_SIGNED',
      resourceType: 'Report',
      resourceId: reportId,
      details: {
        contentHash: hash,
        signatureMethod: req.file ? 'image' : 'text',
        meaning: signatureMeaning || 'author',
        templateVersion: report.templateVersion
      },
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Report signed and finalized'
    });

  } catch (error) {
    console.error('❌ Error signing report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/critical-comm
 * Document critical result communication
 * ✅ COMPLIANCE UPDATE: Critical finding notification tracking
 */
router.post('/:reportId/critical-comm', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { recipient, method, notes } = req.body;

    if (!recipient || !method) {
      return res.status(400).json({
        success: false,
        error: 'Recipient and communication method are required'
      });
    }

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const userId = req.user.userId || req.user._id || req.user.id;

    // Add critical communication record
    report.criticalComms = report.criticalComms || [];
    report.criticalComms.push({
      communicatedBy: req.user.username,
      communicatedById: userId,
      communicatedAt: new Date(),
      recipient: recipient,
      method: method, // phone, email, in-person, etc.
      notes: notes,
      acknowledged: true
    });

    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'CRITICAL_COMM_DOCUMENTED',
      resourceType: 'Report',
      resourceId: reportId,
      details: {
        recipient,
        method
      },
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Critical communication documented'
    });

  } catch (error) {
    console.error('❌ Error documenting critical communication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/addendum
 * Add addendum to finalized report (with access control)
 * ✅ COMPLIANCE UPDATE: Enhanced addendum with signature support
 */
router.post('/:reportId/addendum', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { content, reason } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Addendum content is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason for addendum is required'
      });
    }

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to add addendum to this report'
      });
    }

    // ✅ COMPLIANCE UPDATE: Only allow addendum on final reports
    if (report.reportStatus !== 'final' && report.reportStatus !== 'final_with_addendum') {
      return res.status(400).json({
        success: false,
        error: 'Addendum can only be added to finalized reports'
      });
    }

    const userId = req.user.userId || req.user._id || req.user.id;

    // ✅ COMPLIANCE UPDATE: Add addendum with signature metadata
    report.addenda = report.addenda || [];
    report.addenda.push({
      content,
      reason,
      addedBy: req.user.username,
      addedById: userId,
      addedAt: new Date(),
      // Signature metadata for addendum
      signature: {
        by: userId,
        displayName: req.user.username,
        at: new Date(),
        meaning: 'addendum',
        reason: reason,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || 'Unknown'
      }
    });

    // ✅ COMPLIANCE UPDATE: Update status to indicate addendum present
    report.reportStatus = 'final_with_addendum';

    bumpVersion(report);

    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'ADDENDUM_ADDED',
      resourceType: 'Report',
      resourceId: reportId,
      details: {
        reason,
        addendumCount: report.addenda.length
      },
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Addendum added successfully'
    });

  } catch (error) {
    console.error('❌ Error adding addendum:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// EXPORT FUNCTIONALITY (with format validation and access control)
// ============================================================================

/**
 * GET /api/reports/:reportId/export
 * Export report in various formats (with validation and access control)
 * Query param: ?format=pdf|dicom-sr|fhir|json
 */
router.get('/:reportId/export', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'pdf' } = req.query;

    // Strict format validation
    const validFormats = ['pdf', 'dicom-sr', 'fhir', 'json'];
    if (!validFormats.includes(format)) {
      console.error(`❌ Invalid export format: ${format}`);
      return res.status(400).json({
        success: false,
        error: `Invalid format: ${format}. Must be one of: ${validFormats.join(', ')}`
      });
    }

    console.log(`📤 Export request: reportId=${reportId}, format=${format}`);

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to export this report'
      });
    }

    // Audit log
    await auditService.logAction({
      userId: req.user.userId || req.user._id,
      action: 'REPORT_EXPORTED',
      resourceType: 'Report',
      resourceId: reportId,
      details: {
        format,
        reportStatus: report.reportStatus
      },
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    // Handle different export formats
    switch (format) {
      case 'pdf':
        const pdfBuffer = await generateReportPDF(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
        return res.send(pdfBuffer);

      case 'dicom-sr':
        const dicomSR = generateDICOMSR(report);
        res.setHeader('Content-Type', 'application/dicom');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.dcm"`);
        return res.send(dicomSR);

      case 'fhir':
        const fhirReport = generateFHIRReport(report);
        res.setHeader('Content-Type', 'application/fhir+json');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
        return res.json(fhirReport);

      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
        return res.json({
          success: true,
          report: report.toObject()
        });

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported format: ${format}. Use pdf, dicom-sr, fhir, or json`
        });
    }

  } catch (error) {
    console.error('❌ Error exporting report:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      code: 'EXPORT_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/reports/:reportId/pdf
 * Export report to PDF (legacy endpoint)
 */
router.get('/:reportId/pdf', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Generate PDF (implement PDF generation service)
    const pdfBuffer = await generateReportPDF(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/export/pdf
 * Export report to PDF (alternative endpoint for compatibility)
 */
router.post('/:reportId/export/pdf', async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log(`📤 PDF export request (POST): reportId=${reportId}`);

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const pdfBuffer = await generateReportPDF(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/export/dicom-sr
 * Export report to DICOM SR (alternative endpoint)
 */
router.post('/:reportId/export/dicom-sr', async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log(`📤 DICOM SR export request (POST): reportId=${reportId}`);

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const dicomSR = generateDICOMSR(report);

    res.setHeader('Content-Type', 'application/dicom');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.dcm"`);
    res.send(dicomSR);

  } catch (error) {
    console.error('❌ Error generating DICOM SR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/export/fhir
 * Export report to FHIR (alternative endpoint)
 */
router.post('/:reportId/export/fhir', async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log(`📤 FHIR export request (POST): reportId=${reportId}`);

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const fhirReport = generateFHIRReport(report);

    res.setHeader('Content-Type', 'application/fhir+json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
    res.json(fhirReport);

  } catch (error) {
    console.error('❌ Error generating FHIR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/export/txt
 * Export report to plain text (alternative endpoint)
 */
router.post('/:reportId/export/txt', async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log(`📤 Text export request (POST): reportId=${reportId}`);

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const text = `
MEDICAL REPORT
==============

Report ID: ${report.reportId}
Patient: ${report.patientName} (${report.patientID})
Study: ${report.studyInstanceUID}
Modality: ${report.modality}
Date: ${new Date(report.reportDate).toLocaleDateString()}
Radiologist: ${report.radiologistName}
Status: ${report.reportStatus.toUpperCase()}

TECHNIQUE
---------
${report.technique || 'N/A'}

FINDINGS
--------
${report.findingsText || 'N/A'}

IMPRESSION
----------
${report.impression || 'N/A'}

${report.signedAt ? `\nSigned by: ${report.radiologistName}\nDate: ${new Date(report.signedAt).toLocaleString()}` : ''}
    `;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.txt"`);
    res.send(text);

  } catch (error) {
    console.error('❌ Error generating text:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/export
 * Export report (async with export service)
 */
router.post('/:reportId/export', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'pdf' } = req.body;

    const userId = req.user._id || req.user.id;
    const metadata = {
      recipient: req.body.recipient,
      purpose: req.body.purpose,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      exportOptions: req.body.options || {}
    };

    const exportSession = await exportService.initiateExport(
      reportId,
      format,
      userId,
      metadata
    );

    // Log audit event
    await auditService.logAction({
      userId,
      action: 'EXPORT_INITIATED',
      resourceType: 'Report',
      resourceId: reportId,
      details: {
        format,
        exportId: exportSession._id.toString()
      },
      ipAddress: metadata.ipAddress
    });

    res.status(202).json({
      success: true,
      message: `${format.toUpperCase()} export initiated`,
      exportId: exportSession._id,
      status: exportSession.status
    });

  } catch (error) {
    console.error('❌ Error initiating export:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ✅ COMPLIANCE UPDATE (ADVANCED): PHI-SAFE SHARING
// ============================================================================

/**
 * POST /api/reports/:reportId/export/share
 * Create a PHI-safe shareable link for report export
 */
router.post('/:reportId/export/share', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { payload } = req.body;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to share this report'
      });
    }

    const userId = req.user.userId || req.user._id || req.user.id;

    // ✅ COMPLIANCE UPDATE (ADVANCED): Sanitize payload - remove PHI
    const sanitizedPayload = {
      reportId: report.reportId,
      caseCode: `SR-${report.reportId.substring(0, 8)}`, // Short case code
      studyInstanceUID: report.studyInstanceUID,
      modality: report.modality,
      templateId: report.templateId,
      templateName: report.templateName,
      templateVersion: report.templateVersion,
      technique: report.technique,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations,
      sections: report.sections || {},
      findings: report.findings || [],
      measurements: report.measurements || [],
      keyImages: payload?.keyImages || report.keyImages || [],
      legend: payload?.legend || [],
      measurementsTable: payload?.measurementsTable || [],
      reportStatus: report.reportStatus,
      createdAt: report.createdAt || report.metadata?.createdAt,
      signedAt: report.signedAt,
      version: report.version,
      exportedAt: new Date().toISOString()
      // ✅ COMPLIANCE UPDATE (ADVANCED): PHI fields explicitly excluded:
      // - patientName
      // - patientID
      // - aiAnalysisId
      // - radiologistName
      // - radiologistId
    };

    // Generate unique share ID
    const crypto = require('crypto');
    const shareId = crypto.randomBytes(16).toString('hex');

    // Set expiration (default 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store share record in report
    report.sharedExports = report.sharedExports || [];
    report.sharedExports.push({
      shareId,
      payload: sanitizedPayload,
      createdBy: userId,
      createdByName: req.user.username,
      createdAt: new Date(),
      expiresAt,
      accessCount: 0
    });

    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'SHARE_CREATED',
      resourceType: 'Report',
      resourceId: reportId,
      details: {
        shareId,
        expiresAt
      },
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    // Build share URL
    const baseUrl = process.env.PUBLIC_URL || req.protocol + '://' + req.get('host');
    const shareUrl = `${baseUrl}/share/${shareId}`;

    res.json({
      success: true,
      shareId,
      url: shareUrl,
      expiresAt: expiresAt.toISOString(),
      message: 'Shareable link created (PHI redacted)'
    });

  } catch (error) {
    console.error('❌ Error creating share:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/export/share/:shareId
 * Retrieve shared report export (PHI-safe)
 */
router.get('/export/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    // Find report with this share ID
    const report = await StructuredReport.findOne({
      'sharedExports.shareId': shareId
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Share not found or expired'
      });
    }

    // Find the specific share
    const share = report.sharedExports.find(s => s.shareId === shareId);

    if (!share) {
      return res.status(404).json({
        success: false,
        error: 'Share not found'
      });
    }

    // Check expiration
    if (new Date() > new Date(share.expiresAt)) {
      return res.status(410).json({
        success: false,
        error: 'Share link has expired'
      });
    }

    // Increment access count
    share.accessCount = (share.accessCount || 0) + 1;
    share.lastAccessedAt = new Date();
    await report.save();

    // Audit log (no user auth required for public share)
    await auditService.logAction({
      userId: 'anonymous',
      action: 'SHARE_ACCESSED',
      resourceType: 'Report',
      resourceId: report.reportId,
      details: {
        shareId,
        accessCount: share.accessCount
      },
      ipAddress: req.ip || req.connection.remoteAddress
    }).catch(err => console.error('Audit log failed:', err));

    res.json({
      success: true,
      payload: share.payload,
      expiresAt: share.expiresAt,
      accessCount: share.accessCount
    });

  } catch (error) {
    console.error('❌ Error retrieving share:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// VALIDATION ENDPOINTS
// ============================================================================

/**
 * Validate report before signing
 * POST /api/reports/:reportId/validate
 */
router.post('/:reportId/validate', async (req, res) => {
  try {
    const reportValidator = require('../utils/reportValidator');
    const ReportTemplate = require('../models/ReportTemplate');
    
    const report = await StructuredReport.findOne({ reportId: req.params.reportId });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    // Get template
    const template = await ReportTemplate.findOne({ templateId: report.templateId });
    
    // Validate
    const validation = reportValidator.validateReport(report, template);
    
    console.log(`✅ Validation for ${req.params.reportId}:`, {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length
    });
    
    res.json({
      success: true,
      ...validation
    });
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Pre-sign validation (strict mode)
 * POST /api/reports/:reportId/validate-sign
 */
router.post('/:reportId/validate-sign', async (req, res) => {
  try {
    const reportValidator = require('../utils/reportValidator');
    const ReportTemplate = require('../models/ReportTemplate');
    
    const report = await StructuredReport.findOne({ reportId: req.params.reportId });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    // Get template
    const template = await ReportTemplate.findOne({ templateId: report.templateId });
    
    // Strict validation for signing
    const validation = reportValidator.validateForSigning(report, template);
    
    console.log(`✅ Pre-sign validation for ${req.params.reportId}:`, {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length
    });
    
    res.json({
      success: true,
      ...validation
    });
    
  } catch (error) {
    console.error('❌ Pre-sign validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate PDF from report with hospital info and signature
 * ✅ PDF IMPROVEMENTS: BI-RADS box, critical findings, spine tables, smart page breaks
 */
async function generateReportPDF(report) {
  try {
    // Try to use PDFKit if available
    const PDFDocument = require('pdfkit');
    const Hospital = require('../models/Hospital');
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {});

    // Get hospital information
    let hospital = null;
    if (report.hospitalId) {
      hospital = await Hospital.findOne({ hospitalId: report.hospitalId });
    }

    // ===== HELPER: Smart page break =====
    const checkNewPage = (spaceNeeded = 50) => {
      const pageHeight = doc.page.height;
      const bottomMargin = 80;
      if (doc.y + spaceNeeded > pageHeight - bottomMargin) {
        doc.addPage();
        return true;
      }
      return false;
    };

    // ===== HEADER WITH HOSPITAL INFO =====
    const pageWidth = doc.page.width - 100; // Account for margins
    
    // Hospital Logo (if available)
    if (hospital && hospital.logoUrl) {
      try {
        doc.image(hospital.logoUrl, 50, 45, { width: 80 });
      } catch (err) {
        console.warn('Failed to load hospital logo:', err.message);
      }
    }

    // Hospital Name and Address
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(hospital?.name || 'Medical Center', hospital?.logoUrl ? 140 : 50, 50);
    
    doc.fontSize(9).font('Helvetica');
    if (hospital?.address) {
      const addr = hospital.address;
      const addressLine = [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
        .filter(Boolean).join(', ');
      doc.text(addressLine, hospital?.logoUrl ? 140 : 50, 70);
    }
    if (hospital?.contactPhone) {
      doc.text(`Phone: ${hospital.contactPhone}`, hospital?.logoUrl ? 140 : 50, 85);
    }
    if (hospital?.contactEmail) {
      doc.text(`Email: ${hospital.contactEmail}`, hospital?.logoUrl ? 140 : 50, 97);
    }

    // Horizontal line
    doc.moveTo(50, 120).lineTo(pageWidth + 50, 120).stroke();
    doc.moveDown(2);

    // ===== REPORT TITLE =====
    doc.fontSize(20).font('Helvetica-Bold').text('RADIOLOGY REPORT', { align: 'center' });
    doc.moveDown();

    // ✅ CRITICAL FINDINGS ALERT BOX (if present)
    if (report.criticalFindings && report.criticalFindings.length > 0) {
      checkNewPage(120);
      const alertY = doc.y;
      
      // Red background box
      doc.rect(50, alertY, pageWidth, 100).fillAndStroke('#FFEBEE', '#D32F2F');
      
      // Alert icon and title
      doc.fillColor('#D32F2F').fontSize(14).font('Helvetica-Bold');
      doc.text('⚠ CRITICAL FINDING - IMMEDIATE ATTENTION REQUIRED', 60, alertY + 10);
      
      // Critical findings list
      doc.fillColor('#000000').fontSize(10).font('Helvetica');
      let criticalY = alertY + 30;
      report.criticalFindings.forEach((finding, idx) => {
        doc.text(`${idx + 1}. ${finding}`, 60, criticalY);
        criticalY += 15;
      });
      
      // Communication timestamp
      if (report.criticalComms && report.criticalComms.length > 0) {
        const comm = report.criticalComms[0];
        doc.fontSize(8).fillColor('#666666');
        doc.text(`Communicated to: ${comm.recipient} via ${comm.method} on ${new Date(comm.communicatedAt).toLocaleString()}`, 60, criticalY + 5);
      }
      
      doc.fillColor('#000000');
      doc.y = alertY + 110;
      doc.moveDown();
    }

    // ===== PATIENT & STUDY INFO =====
    checkNewPage(80);
    doc.fontSize(10).font('Helvetica');
    const infoY = doc.y;
    
    // Left column
    doc.text(`Report ID: ${report.reportId}`, 50, infoY);
    doc.text(`Patient: ${report.patientName}`, 50, infoY + 15);
    doc.text(`Patient ID: ${report.patientID}`, 50, infoY + 30);
    doc.text(`Modality: ${report.modality}`, 50, infoY + 45);
    
    // Right column
    doc.text(`Date: ${new Date(report.reportDate).toLocaleDateString()}`, 320, infoY);
    doc.text(`Study UID: ${report.studyInstanceUID.substring(0, 30)}...`, 320, infoY + 15);
    doc.text(`Status: ${report.reportStatus.toUpperCase()}`, 320, infoY + 30);
    doc.text(`Radiologist: ${report.radiologistName}`, 320, infoY + 45);
    
    doc.moveDown(4);

    // ===== CLINICAL HISTORY =====
    if (report.clinicalHistory) {
      checkNewPage(60);
      doc.fontSize(12).font('Helvetica-Bold').text('CLINICAL HISTORY', { underline: true });
      doc.fontSize(10).font('Helvetica').text(report.clinicalHistory, { align: 'justify' });
      doc.moveDown();
    }

    // ===== TECHNIQUE =====
    if (report.technique) {
      checkNewPage(60);
      doc.fontSize(12).font('Helvetica-Bold').text('TECHNIQUE', { underline: true });
      doc.fontSize(10).font('Helvetica').text(report.technique, { align: 'justify' });
      doc.moveDown();
    }

    // ===== FINDINGS =====
    if (report.findingsText) {
      checkNewPage(100); // Keep section header with content
      doc.fontSize(12).font('Helvetica-Bold').text('FINDINGS', { underline: true });
      doc.moveDown(0.5);
      
      // ✅ SPINE LEVEL TABLES: Parse and format spine findings
      const isSpineReport = report.templateId && (
        report.templateId.includes('CSPINE') || 
        report.templateId.includes('LSPINE') ||
        report.templateId.includes('TSPINE')
      );
      
      if (isSpineReport) {
        // Parse level-by-level findings (e.g., "C2-C3:", "L4-L5:")
        const levelPattern = /([CTLS]\d+-[CTLS]\d+|[CTLS]\d+-[CTLS]\d+):\s*([^\n]+)/gi;
        const levels = [];
        let match;
        
        while ((match = levelPattern.exec(report.findingsText)) !== null) {
          levels.push({
            level: match[1],
            finding: match[2].trim()
          });
        }
        
        if (levels.length > 0) {
          // Render as table
          checkNewPage(levels.length * 25 + 40);
          
          const tableTop = doc.y;
          const rowHeight = 25;
          const col1Width = 80;
          const col2Width = pageWidth - col1Width;
          
          // Table header
          doc.rect(50, tableTop, col1Width, rowHeight).fillAndStroke('#E3F2FD', '#1976D2');
          doc.rect(50 + col1Width, tableTop, col2Width, rowHeight).fillAndStroke('#E3F2FD', '#1976D2');
          
          doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
          doc.text('Level', 55, tableTop + 8);
          doc.text('Findings', 55 + col1Width, tableTop + 8);
          
          // Table rows
          doc.font('Helvetica');
          levels.forEach((row, idx) => {
            const y = tableTop + (idx + 1) * rowHeight;
            
            // Alternate row colors
            if (idx % 2 === 0) {
              doc.rect(50, y, col1Width, rowHeight).fillAndStroke('#F5F5F5', '#CCCCCC');
              doc.rect(50 + col1Width, y, col2Width, rowHeight).fillAndStroke('#F5F5F5', '#CCCCCC');
            } else {
              doc.rect(50, y, col1Width, rowHeight).stroke('#CCCCCC');
              doc.rect(50 + col1Width, y, col2Width, rowHeight).stroke('#CCCCCC');
            }
            
            doc.fillColor('#000000').fontSize(9);
            doc.text(row.level, 55, y + 8, { width: col1Width - 10 });
            doc.text(row.finding, 55 + col1Width, y + 8, { width: col2Width - 10, lineGap: 2 });
          });
          
          doc.y = tableTop + (levels.length + 1) * rowHeight + 10;
          doc.moveDown();
          
          // Add remaining findings text (non-level findings)
          const remainingText = report.findingsText.replace(levelPattern, '').trim();
          if (remainingText) {
            doc.fontSize(10).font('Helvetica').text(remainingText, { align: 'justify' });
            doc.moveDown();
          }
        } else {
          // No level findings found, render as normal text
          doc.fontSize(10).font('Helvetica').text(report.findingsText, { align: 'justify' });
          doc.moveDown();
        }
      } else {
        // Non-spine report: render as normal text
        doc.fontSize(10).font('Helvetica').text(report.findingsText, { align: 'justify' });
        doc.moveDown();
      }
    }

    // ===== MEASUREMENTS =====
    if (report.measurements && report.measurements.length > 0) {
      checkNewPage(80);
      doc.fontSize(12).font('Helvetica-Bold').text('MEASUREMENTS', { underline: true });
      doc.fontSize(10).font('Helvetica');
      report.measurements.forEach(m => {
        doc.text(`• ${m.type}: ${m.value} ${m.unit}`);
      });
      doc.moveDown();
    }

    // ===== IMPRESSION =====
    if (report.impression) {
      checkNewPage(100); // Keep section header with content
      doc.fontSize(12).font('Helvetica-Bold').text('IMPRESSION', { underline: true });
      doc.moveDown(0.5);
      
      // ✅ BI-RADS HIGHLIGHT BOX: Extract and highlight BI-RADS category for mammography
      const isMammography = report.templateId && report.templateId.includes('MAMMO');
      
      if (isMammography) {
        // Extract BI-RADS category from impression text
        const biRadsPattern = /BI-?RADS\s+(?:Category\s+)?(\d|0)/i;
        const match = report.impression.match(biRadsPattern);
        
        if (match) {
          const category = match[1];
          checkNewPage(80);
          
          // Color-coded box based on category
          let boxColor, textColor, categoryText, recommendation;
          switch (category) {
            case '0':
              boxColor = '#FFF9C4'; textColor = '#F57C00'; 
              categoryText = 'BI-RADS 0 - Incomplete';
              recommendation = 'Additional imaging needed';
              break;
            case '1':
              boxColor = '#E8F5E9'; textColor = '#2E7D32'; 
              categoryText = 'BI-RADS 1 - Negative';
              recommendation = 'Routine screening in 1 year';
              break;
            case '2':
              boxColor = '#E8F5E9'; textColor = '#2E7D32'; 
              categoryText = 'BI-RADS 2 - Benign';
              recommendation = 'Routine screening in 1 year';
              break;
            case '3':
              boxColor = '#FFF9C4'; textColor = '#F57C00'; 
              categoryText = 'BI-RADS 3 - Probably Benign';
              recommendation = 'Short-term follow-up suggested';
              break;
            case '4':
              boxColor = '#FFEBEE'; textColor = '#C62828'; 
              categoryText = 'BI-RADS 4 - Suspicious';
              recommendation = 'Biopsy should be considered';
              break;
            case '5':
              boxColor = '#FFEBEE'; textColor = '#C62828'; 
              categoryText = 'BI-RADS 5 - Highly Suggestive of Malignancy';
              recommendation = 'Biopsy strongly recommended';
              break;
            case '6':
              boxColor = '#FFEBEE'; textColor = '#C62828'; 
              categoryText = 'BI-RADS 6 - Known Malignancy';
              recommendation = 'Appropriate action should be taken';
              break;
            default:
              boxColor = '#F5F5F5'; textColor = '#000000'; 
              categoryText = `BI-RADS ${category}`;
              recommendation = '';
          }
          
          const boxY = doc.y;
          
          // Colored highlight box
          doc.rect(50, boxY, pageWidth, 60).fillAndStroke(boxColor, textColor);
          
          // BI-RADS category text
          doc.fillColor(textColor).fontSize(16).font('Helvetica-Bold');
          doc.text(categoryText, 60, boxY + 12);
          
          // Recommendation
          if (recommendation) {
            doc.fontSize(11).font('Helvetica');
            doc.text(recommendation, 60, boxY + 35);
          }
          
          doc.fillColor('#000000');
          doc.y = boxY + 70;
          doc.moveDown();
        }
      }
      
      // Render impression text
      doc.fontSize(10).font('Helvetica').text(report.impression, { align: 'justify' });
      doc.moveDown();
    }

    // ===== RECOMMENDATIONS =====
    if (report.recommendations) {
      checkNewPage(60);
      doc.fontSize(12).font('Helvetica-Bold').text('RECOMMENDATIONS', { underline: true });
      doc.fontSize(10).font('Helvetica').text(report.recommendations, { align: 'justify' });
      doc.moveDown();
    }

    // ===== SIGNATURE SECTION =====
    if (report.signedAt) {
      checkNewPage(120); // Keep signature box together on one page
      doc.moveDown(2);
      
      // Signature box
      const sigBoxY = doc.y;
      doc.rect(50, sigBoxY, pageWidth, 100).stroke();
      
      doc.moveDown(0.5);
      
      // Signature image (if available)
      if (report.radiologistSignatureUrl) {
        try {
          // Check if it's a base64 image
          if (report.radiologistSignatureUrl.startsWith('data:image')) {
            const base64Data = report.radiologistSignatureUrl.split(',')[1];
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imgBuffer, 60, sigBoxY + 10, { width: 150, height: 40 });
          } else {
            // File path
            doc.image(report.radiologistSignatureUrl, 60, sigBoxY + 10, { width: 150, height: 40 });
          }
        } catch (err) {
          console.warn('Failed to load signature image:', err.message);
          // Fallback to text signature
          if (report.radiologistSignature) {
            doc.fontSize(14).font('Helvetica-Oblique').text(report.radiologistSignature, 60, sigBoxY + 20);
          }
        }
      } else if (report.radiologistSignature) {
        // Text signature
        doc.fontSize(14).font('Helvetica-Oblique').text(report.radiologistSignature, 60, sigBoxY + 20);
      }
      
      // Signature details
      doc.fontSize(9).font('Helvetica');
      doc.text(`Signed by: ${report.radiologistName}`, 60, sigBoxY + 60);
      if (report.signature?.licenseNumber) {
        doc.text(`License: ${report.signature.licenseNumber}`, 60, sigBoxY + 73);
      }
      if (report.signature?.specialty) {
        doc.text(`Specialty: ${report.signature.specialty}`, 60, sigBoxY + 86);
      }
      
      // Date and time
      doc.text(`Date: ${new Date(report.signedAt).toLocaleString()}`, 320, sigBoxY + 60);
      doc.text(`Status: Electronically Signed`, 320, sigBoxY + 73);
      if (report.signature?.contentHash) {
        doc.fontSize(7).text(`Hash: ${report.signature.contentHash.substring(0, 32)}...`, 320, sigBoxY + 86);
      }
    }

    // ===== DRAFT WATERMARK =====
    // Add watermark on every page if report is not final
    if (report.reportStatus !== 'final') {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Save graphics state
        doc.save();
        
        // Set transparency and rotation
        doc.opacity(0.1);
        doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
        
        // Draw watermark text
        doc.fontSize(100)
          .font('Helvetica-Bold')
          .fillColor('#FF0000')
          .text(
            'DRAFT',
            0,
            doc.page.height / 2 - 50,
            {
              width: doc.page.width,
              align: 'center'
            }
          );
        
        // Restore graphics state
        doc.restore();
      }
      
      // Return to last page
      doc.switchToPage(range.start + range.count - 1);
    }

    // ===== FOOTER =====
    doc.fontSize(8).font('Helvetica').text(
      report.reportStatus === 'final' 
        ? 'This report is electronically signed and legally binding.'
        : 'DRAFT REPORT - Not for clinical use. Pending radiologist signature.',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

  } catch (error) {
    console.warn('PDFKit not available, using simple text format:', error.message);
    // Fallback to simple text format
    const text = `
MEDICAL REPORT
==============

Report ID: ${report.reportId}
Patient: ${report.patientName} (${report.patientID})
Study: ${report.studyInstanceUID}
Modality: ${report.modality}
Date: ${new Date(report.reportDate).toLocaleDateString()}
Radiologist: ${report.radiologistName}
Status: ${report.reportStatus.toUpperCase()}

CLINICAL HISTORY
----------------
${report.clinicalHistory || 'N/A'}

TECHNIQUE
---------
${report.technique || 'N/A'}

FINDINGS
--------
${report.findingsText || 'N/A'}

IMPRESSION
----------
${report.impression || 'N/A'}

${report.recommendations ? `RECOMMENDATIONS\n---------------\n${report.recommendations}\n` : ''}

${report.signedAt ? `\nSigned by: ${report.radiologistName}\n${report.signature?.licenseNumber ? `License: ${report.signature.licenseNumber}\n` : ''}Date: ${new Date(report.signedAt).toLocaleString()}\nStatus: Electronically Signed` : ''}
    `;
    return Buffer.from(text);
  }
}

/**
 * Generate DICOM SR from report
 */
function generateDICOMSR(report) {
  // Simplified DICOM SR structure
  const dicomSR = {
    '00080005': { vr: 'CS', Value: ['ISO_IR 100'] }, // Specific Character Set
    '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.88.11'] }, // SOP Class UID (Basic Text SR)
    '00080018': { vr: 'UI', Value: [`1.2.840.10008.${Date.now()}`] }, // SOP Instance UID
    '00080020': { vr: 'DA', Value: [new Date().toISOString().split('T')[0].replace(/-/g, '')] }, // Study Date
    '00080030': { vr: 'TM', Value: [new Date().toTimeString().split(' ')[0].replace(/:/g, '')] }, // Study Time
    '00080060': { vr: 'CS', Value: [report.modality] }, // Modality
    '00100010': { vr: 'PN', Value: [report.patientName] }, // Patient Name
    '00100020': { vr: 'LO', Value: [report.patientID] }, // Patient ID
    '0020000D': { vr: 'UI', Value: [report.studyInstanceUID] }, // Study Instance UID
    '0020000E': { vr: 'UI', Value: [`1.2.840.10008.${Date.now()}.1`] }, // Series Instance UID
    '00400275': { // Request Attributes Sequence
      vr: 'SQ',
      Value: [{
        '00321060': { vr: 'LO', Value: [report.reportId] } // Report ID
      }]
    },
    '0040A730': { // Content Sequence
      vr: 'SQ',
      Value: [
        {
          '0040A010': { vr: 'CS', Value: ['HAS CONCEPT MOD'] },
          '0040A040': { vr: 'CS', Value: ['TEXT'] },
          '0040A043': { vr: 'SQ', Value: [{ '00080100': { vr: 'SH', Value: ['121111'] } }] },
          '0040A160': { vr: 'UT', Value: [report.findingsText || ''] }
        },
        {
          '0040A010': { vr: 'CS', Value: ['HAS CONCEPT MOD'] },
          '0040A040': { vr: 'CS', Value: ['TEXT'] },
          '0040A043': { vr: 'SQ', Value: [{ '00080100': { vr: 'SH', Value: ['121112'] } }] },
          '0040A160': { vr: 'UT', Value: [report.impression || ''] }
        }
      ]
    }
  };

  return Buffer.from(JSON.stringify(dicomSR, null, 2));
}

/**
 * Generate FHIR DiagnosticReport from report
 */
function generateFHIRReport(report) {
  return {
    resourceType: 'DiagnosticReport',
    id: report.reportId,
    status: report.reportStatus === 'final' ? 'final' : 'preliminary',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'RAD',
        display: 'Radiology'
      }]
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '18748-4',
        display: 'Diagnostic imaging study'
      }],
      text: report.modality
    },
    subject: {
      reference: `Patient/${report.patientID}`,
      display: report.patientName
    },
    effectiveDateTime: report.reportDate,
    issued: report.signedAt || report.reportDate,
    performer: [{
      reference: `Practitioner/${report.radiologistId}`,
      display: report.radiologistName
    }],
    resultsInterpreter: [{
      reference: `Practitioner/${report.radiologistId}`,
      display: report.radiologistName
    }],
    imagingStudy: [{
      reference: `ImagingStudy/${report.studyInstanceUID}`
    }],
    conclusion: report.impression,
    conclusionCode: [],
    presentedForm: [{
      contentType: 'text/plain',
      data: Buffer.from(`${report.technique}\n\n${report.findingsText}\n\n${report.impression}`).toString('base64'),
      title: 'Radiology Report'
    }]
  };
}

// ============================================================================
// AI ASSISTANT ENDPOINTS
// ============================================================================

const aiAssistant = require('../services/ai-assistant-service');

/**
 * POST /api/reports/:reportId/ai-analyze
 * Analyze report with AI and generate suggestions
 */
router.post('/:reportId/ai-analyze', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { analysisType = 'full' } = req.body;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Access control check
    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if AI service is available
    if (!aiAssistant.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not available. Please configure GEMINI_API_KEY.',
        message: 'AI features require Google Gemini API key to be configured'
      });
    }

    const context = {
      modality: report.modality,
      bodyPart: report.bodyPart,
      clinicalHistory: report.clinicalHistory
    };

    const results = {};

    // Analyze findings if present
    if (report.findingsText && analysisType === 'full') {
      results.findingsAnalysis = await aiAssistant.analyzeFindingsText(
        report.findingsText,
        context
      );
    }

    // Generate impression if findings exist but no impression
    if (report.findingsText && (!report.impression || analysisType === 'impression')) {
      results.impressionSuggestion = await aiAssistant.generateImpression(
        report.findingsText,
        context
      );
    }

    // Detect critical findings
    if (analysisType === 'full' || analysisType === 'critical') {
      results.criticalFindings = await aiAssistant.detectCriticalFindings(report);
    }

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/ai-impression
 * Generate impression from findings using AI
 */
router.post('/:reportId/ai-impression', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    if (!canAccessReport(req, report)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!aiAssistant.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not available'
      });
    }

    if (!report.findingsText) {
      return res.status(400).json({
        success: false,
        error: 'No findings text available to generate impression'
      });
    }

    const context = {
      modality: report.modality,
      bodyPart: report.bodyPart,
      clinicalHistory: report.clinicalHistory
    };

    const result = await aiAssistant.generateImpression(report.findingsText, context);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Impression generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/templates/:templateId/ai-suggest
 * Get AI suggestions for template field values
 */
router.post('/templates/:templateId/ai-suggest', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { studyMetadata } = req.body;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    if (!aiAssistant.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not available'
      });
    }

    const result = await aiAssistant.suggestTemplateFields(template, studyMetadata || {});

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Template field suggestion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/ai/health
 * Check AI service health
 */
router.get('/ai/health', (req, res) => {
  const available = aiAssistant.isAvailable();
  
  res.json({
    success: true,
    available,
    service: 'Google Gemini Pro',
    features: {
      findingsAnalysis: available,
      impressionGeneration: available,
      criticalFindingDetection: available,
      templateFieldSuggestions: available
    },
    message: available 
      ? 'AI service is operational' 
      : 'AI service not configured. Set GEMINI_API_KEY environment variable.'
  });
});

module.exports = router;
