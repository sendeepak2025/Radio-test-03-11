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
const axios = require('axios');
const fs = require('fs');
const fsSync = require('fs'); // Sync fs for PDF generation
const User = require("../models/User");
const HospitalSetting = require("../models/HospitalSettings");
const { 
  isValidContent, 
  normalizeStatus, 
  detectTemplate, 
  getScoringCategory,
  STATUS_VALUES 
} = require('../utils/reportTemplateSchemas');

async function resolveHospitalId(req) {
  try {
    const loggedInUserId = req.user.sub;

    // Step 1: Find logged in user
    const loggedInUser = await User.findById(loggedInUserId).lean();
    if (!loggedInUser) throw new Error("User not found");

    const isAdmin =
      req.user.roles.includes("admin") ||
      req.user.roles.includes("superadmin");

    let finalHospitalId;

    // -------------------------------
    // CASE 1 : ADMIN / SUPERADMIN
    // -------------------------------
    if (isAdmin) {
      finalHospitalId = loggedInUser.hospitalId;
    }

    // -------------------------------
    // CASE 2 : NORMAL USER
    // -------------------------------
    else {
      const createdByUser = await User.findById(loggedInUser.createdBy).lean();

      if (!createdByUser) {
        throw new Error("Creator user not found");
      }

      finalHospitalId = createdByUser.hospitalId;
    }

    return finalHospitalId;
  } catch (error) {
    console.error("Error resolving hospitalId:", error);
    throw error;
  }
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
      // Template-based report: Check if template changed
      const templateChanged = report.templateId && report.templateId !== templateId;

      if (templateChanged) {
        console.log(`⚠️  Template changed from ${report.templateId} to ${templateId} - clearing old sections`);
        // Clear old template data when switching templates
        report.sections = {};
      } else if (!report.sections || typeof report.sections !== 'object') {
        // Initialize sections if needed
        report.sections = {};
      }

      // Merge incoming sections (this includes all UI module data)
      if (sections && typeof sections === 'object') {
        // Replace sections entirely to avoid stale data
        // Also decode any HTML entities that might have been encoded
        const cleanedSections = {};
        for (const [key, value] of Object.entries(sections)) {
          if (typeof value === 'string' && key.startsWith('uiModule_')) {
            // Decode HTML entities in UI module data
            cleanedSections[key] = value
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&#x2F;/g, '/');
          } else {
            cleanedSections[key] = value;
          }
        }
        report.sections = cleanedSections;
      }

      // Store narrative fields in sections with proper keys (if provided)
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
        report.sections.clinical_history = req.body.clinicalHistory; // Also store with underscore for compatibility
      }
      if (req.body.recommendations !== undefined) {
        report.sections.recommendations = req.body.recommendations;
      }

      // ✅ FIX: Always sync sections to top-level fields (even if empty)
      // This ensures preview and exports work correctly
      // Try all possible section keys for each field
      report.technique = report.sections.technique || '';
      report.findingsText = report.sections.findings || report.sections.findingsText || '';
      report.impression = report.sections.impression || '';
      report.clinicalHistory = report.sections.clinical_history || report.sections.clinical_indication || report.sections.clinicalHistory || report.sections.indication || '';
      report.recommendations = report.sections.recommendations || '';

      console.log('✅ Template report synced:', {
        sectionsKeys: Object.keys(report.sections).length,
        topLevelFields: {
          clinicalHistory: report.clinicalHistory ? 'SET' : 'EMPTY',
          technique: report.technique ? 'SET' : 'EMPTY',
          findingsText: report.findingsText ? 'SET' : 'EMPTY',
          impression: report.impression ? 'SET' : 'EMPTY'
        }
      });
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

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern || {})[0] || 'unknown';
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_KEY',
        message: `A report with this ${field} already exists. Please refresh and try again.`,
        field
      });
    }

    if (error.name === 'ValidationError') {
      // Mongoose validation error
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Report validation failed',
        errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATA',
        message: `Invalid value for field: ${error.path}`
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'An unexpected error occurred while saving the report'
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
// router.put('/:reportId', async (req, res) => {
//   try {
//     const { reportId } = req.params;
//     const updates = req.body;
//     const clientVersion = req.headers['if-match']; // ETag from client

//     const report = await StructuredReport.findOne({ reportId });

//     if (!report) {
//       return res.status(404).json({
//         success: false,
//         error: 'Report not found'
//       });
//     }

//     // Access control check
//     if (!canAccessReport(req, report)) {
//       return res.status(403).json({
//         success: false,
//         error: 'Access denied: You do not have permission to edit this report'
//       });
//     }

//     // ✅ COMPLIANCE UPDATE: Check if report is signed/final - reject modifications
//     if (report.reportStatus === 'final' || report.reportStatus === 'final_with_addendum') {
//       return res.status(409).json({
//         success: false,
//         error: 'SIGNED_IMMUTABLE',
//         message: 'Cannot edit signed report. Signed fields are immutable. Use addendum instead.'
//       });
//     }

//     // ✅ COMPLIANCE UPDATE: Optimistic locking - version conflict detection
//     if (clientVersion && String(report.version) !== String(clientVersion)) {
//       return res.status(409).json({
//         success: false,
//         error: 'VERSION_CONFLICT',
//         message: 'Report has been modified by another user',
//         serverVersion: report.version,
//         clientVersion: clientVersion
//       });
//     }

//     // Capture previous status before mutation
//     const previousStatus = report.reportStatus;

//     // ✅ TEMPLATE FIX: Check if template changed
//     const templateChanged = updates.templateId && String(updates.templateId) !== String(report.templateId);

//     if (templateChanged) {
//       console.log('🔄 Template changed:', report.templateId, '→', updates.templateId);

//       // ✅ TEMPLATE FIX: When template changes, replace sections entirely (do not merge)
//       if (updates.sections) {
//         report.sections = updates.sections; // Replace, not merge
//       }

//       // ✅ TEMPLATE FIX: Update template metadata
//       report.templateId = updates.templateId;
//       if (updates.templateName) report.templateName = updates.templateName;
//       if (updates.templateVersion) report.templateVersion = updates.templateVersion;
//     }

//     // Update allowed fields
//     const allowedFields = [
//       'findings', 'measurements', 'sections', 'templateId', 'templateName', 'templateVersion',
//       'technique', 'findingsText', 'impression', 'keyImages', 'tags',
//       'clinicalHistory', 'recommendations', 'criticalComms', 'moduleData', 'anatomicalMarkings'
//     ];

//     allowedFields.forEach(field => {
//       if (updates[field] !== undefined) {
//         report[field] = updates[field];
//       }
//     });

//     // ✅ TEMPLATE STRUCTURE FIX: Maintain data according to template structure
//     // If template is used, sections is the source of truth
//     // Top-level fields are derived for backward compatibility
//     if (report.templateId) {
//       console.log('📝 Processing template-based report update:', {
//         templateId: report.templateId,
//         incomingSectionsKeys: updates.sections ? Object.keys(updates.sections) : [],
//         hasTopLevelFields: {
//           technique: updates.technique !== undefined,
//           findingsText: updates.findingsText !== undefined,
//           impression: updates.impression !== undefined
//         }
//       });

//       // Template-based report: sections is source of truth
//       // Initialize sections if not exists
//       if (!report.sections || typeof report.sections !== 'object') {
//         report.sections = {};
//         console.log('  → Initialized empty sections object');
//       }

//       // Update sections from incoming data (sections object takes priority)
//       if (updates.sections && typeof updates.sections === 'object') {
//         // Merge sections
//         Object.assign(report.sections, updates.sections);
//         console.log('  → Merged incoming sections');
//       }

//       // Update sections from top-level fields (for backward compatibility)
//       if (updates.technique !== undefined) {
//         report.sections.technique = updates.technique;
//         console.log('  → Stored technique in sections');
//       }
//       if (updates.findingsText !== undefined) {
//         report.sections.findings = updates.findingsText;
//         console.log('  → Stored findingsText in sections.findings');
//       }
//       if (updates.impression !== undefined) {
//         report.sections.impression = updates.impression;
//         console.log('  → Stored impression in sections');
//       }
//       if (updates.clinicalHistory !== undefined) {
//         report.sections.clinical_indication = updates.clinicalHistory;
//         console.log('  → Stored clinicalHistory in sections.clinical_indication');
//       }
//       if (updates.recommendations !== undefined) {
//         report.sections.recommendations = updates.recommendations;
//         console.log('  → Stored recommendations in sections');
//       }

//       // Derive top-level fields from sections (for preview/export compatibility)
//       report.technique = report.sections.technique || '';
//       report.findingsText = report.sections.findings || report.sections.findingsText || '';
//       report.impression = report.sections.impression || '';
//       report.clinicalHistory = report.sections.clinical_indication || report.sections.clinicalHistory || report.sections.indication || '';
//       report.recommendations = report.sections.recommendations || '';

//       console.log('✅ Template report updated - sections keys:', Object.keys(report.sections));
//       console.log('✅ Top-level fields derived:', {
//         technique: report.technique.substring(0, 30) + '...',
//         findingsText: report.findingsText.substring(0, 30) + '...',
//         impression: report.impression.substring(0, 30) + '...'
//       });
//     } else {
//       // Non-template report: top-level fields are source of truth
//       if (updates.technique !== undefined) {
//         report.technique = updates.technique;
//       }
//       if (updates.findingsText !== undefined) {
//         report.findingsText = updates.findingsText;
//       }
//       if (updates.impression !== undefined) {
//         report.impression = updates.impression;
//       }
//       if (updates.clinicalHistory !== undefined) {
//         report.clinicalHistory = updates.clinicalHistory;
//       }
//       if (updates.recommendations !== undefined) {
//         report.recommendations = updates.recommendations;
//       }
//     }

//     // Bump version and add revision
//     bumpVersion(report);
//     pushRevision(report, req.user, 'Report updated', previousStatus);

//     await report.save();

//     // ✅ COMPLIANCE UPDATE: Return ETag header with new version
//     res.setHeader('ETag', String(report.version));

//     res.json({
//       success: true,
//       report: report.toObject(),
//       version: report.version // Include version in response
//     });

//   } catch (error) {
//     console.error('❌ Error updating report:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// NEW UPDATE REPORTS ROUTE

router.put('/:reportId', async (req, res) => {
  try {
    console.log("\n==============================");
    console.log("🔵 PUT REPORT (AS-IS STORE MODE)");
    console.log("==============================");

    const { reportId } = req.params;
    const updates = req.body;
    const clientVersion = req.headers["if-match"];

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    console.log("🧾 Found report version:", report.version);

    // Immutable final reports
    if (["final", "final_with_addendum"].includes(report.reportStatus)) {
      return res.status(409).json({
        success: false,
        error: "SIGNED_IMMUTABLE"
      });
    }

    // Optimistic locking check
    if (clientVersion && String(report.version) !== String(clientVersion)) {
      return res.status(409).json({
        success: false,
        error: "VERSION_CONFLICT",
        serverVersion: report.version,
        clientVersion
      });
    }

    console.log("➡ Incoming sections:", JSON.stringify(updates.sections, null, 2));

    //
    // ⭐⭐⭐ MAIN CHANGE: STORE EVERYTHING AS-IS ⭐⭐⭐
    //
    // Whatever comes in payload.sections → directly overwrite entire sections object
    //
    if (updates.sections && typeof updates.sections === "object") {
      report.sections = { ...updates.sections };
      console.log("✔ Stored SECTIONS (AS-IS)");
    }

    // Arrays stored directly
    if (updates.findings !== undefined) report.findings = updates.findings;
    if (updates.measurements !== undefined) report.measurements = updates.measurements;
    if (updates.annotations !== undefined) report.annotations = updates.annotations;
    if (updates.keyImages !== undefined) report.keyImages = updates.keyImages;
    if (updates.anatomicalMarkings !== undefined) report.anatomicalMarkings = updates.anatomicalMarkings;

    // Template metadata
    if (updates.templateId) report.templateId = updates.templateId;
    if (updates.templateName) report.templateName = updates.templateName;
    if (updates.templateVersion) report.templateVersion = updates.templateVersion;

    //
    // ⭐ No auto-sync to top-level narrative fields
    // ⭐ No blank ignore
    // ⭐ Only store AS-IS if user explicitly sends them
    //
    if (updates.technique !== undefined) report.technique = updates.technique;
    if (updates.findingsText !== undefined) report.findingsText = updates.findingsText;
    if (updates.impression !== undefined) report.impression = updates.impression;
    if (updates.clinicalHistory !== undefined) report.clinicalHistory = updates.clinicalHistory;
    if (updates.recommendations !== undefined) report.recommendations = updates.recommendations;

    // Version bump
    report.version += 1;
    pushRevision(report, req.user, "Report updated", report.reportStatus);

    await report.save();

    console.log("\n🔥 FINAL SAVED REPORT:", JSON.stringify(report.toObject(), null, 2));

    res.setHeader("ETag", String(report.version));

    return res.json({
      success: true,
      report: report.toObject(),
      version: report.version
    });

  } catch (err) {
    console.error("❌ PUT ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
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
      // Uploaded file - store full backend URL so frontend can access it
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      report.radiologistSignatureUrl = `${backendUrl}/uploads/signatures/${req.file.filename}`;
      report.radiologistSignaturePublicId = req.file.filename;
      console.log('✅ Signature file saved:', req.file.filename);
      console.log('✅ Signature URL:', report.radiologistSignatureUrl);
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
        // Get hospital ID for branding
        const hospitalId = await resolveHospitalId(req);
        console.log("HOSPITAL ID for PDF export:", hospitalId);

        const pdfBuffer = await generateReportPDF(report, hospitalId);
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
    const hospitalId = await resolveHospitalId(req);

    console.log("FINAL HOSPITAL ID:", hospitalId);
    console.log(req.user, "REQUSER")

    // Generate PDF (implement PDF generation service)
    const pdfBuffer = await generateReportPDF(report, hospitalId);

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

    // Get hospital ID for branding
    const hospitalId = await resolveHospitalId(req);
    console.log("HOSPITAL ID for PDF:", hospitalId);

    // ✅ DEBUG: Log report data to see what's available
    console.log('📋 Report data for PDF:');
    console.log('  - patientName:', report.patientName);
    console.log('  - patientID:', report.patientID);
    console.log('  - radiologistName:', report.radiologistName);
    console.log('  - signature.displayName:', report.signature?.displayName);
    console.log('  - findingsText:', report.findingsText ? `${report.findingsText.substring(0, 50)}...` : 'EMPTY');
    console.log('  - sections.findings:', report.sections?.findings ? `${report.sections.findings.substring(0, 50)}...` : 'EMPTY');
    console.log('  - clinicalHistory:', report.clinicalHistory ? `${report.clinicalHistory.substring(0, 50)}...` : 'EMPTY');
    console.log('  - sections.clinicalHistory:', report.sections?.clinicalHistory ? 'EXISTS' : 'EMPTY');

    const pdfBuffer = await generateReportPDF(report, hospitalId);

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
 * Generate Professional PDF Report
 * NABH/Medico-legal compliant, Hospital-grade layout
 * Supports all RADS scoring systems
 */
async function generateReportPDF(report, hospitalId) {
  try {
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const fs = require('fs');
    const axios = require('axios');

    // ============ TEMPLATE DETECTION ============
    const templateSchema = detectTemplate(report);
    const scoringSystem = templateSchema?.scoringSystem || null;
    const maxPages = templateSchema?.maxPages || 2;

    // ============ PDF CONFIGURATION ============
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `${templateSchema?.name || 'Radiology'} Report - ${report.reportId || 'Draft'}`,
        Author: report.radiologistName || 'Radiologist',
        Subject: `${report.modality || 'Radiology'} Report`,
        Creator: 'Medical Imaging RIS/PACS System',
        Keywords: scoringSystem ? `${scoringSystem}, Radiology, Medical Report` : 'Radiology, Medical Report'
      }
    });
    
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // ============ DESIGN CONSTANTS ============
    const COLORS = {
      primary: '#1A365D',
      secondary: '#4A5568',
      accent: '#E2E8F0',
      textMain: '#2D3748',
      textLight: '#718096',
      danger: '#C53030',
      success: '#276749',
      warning: '#C05621',
      impressionBg: '#EBF8FF',
      scoreBg: '#FEF3C7'
    };

    const leftMargin = 40;
    const rightMargin = 555;
    const contentWidth = rightMargin - leftMargin;
    const pageHeight = 730; // Safe content area - prevents extra pages

    // Helper: Local Path Resolver for snapshots
    const getLocalPath = (imgPath) => {
      if (!imgPath) return null;
      const fileName = path.basename(imgPath);
      const possiblePaths = [
        path.join(process.cwd(), 'uploads/snapshots', fileName),
        path.join(__dirname, '../../uploads/snapshots', fileName)
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
      }
      return null;
    };

    // Helper: Get signature image path
    const getSignaturePath = (sigUrl) => {
      if (!sigUrl) return null;
      const fileName = path.basename(sigUrl);
      const possiblePaths = [
        path.join(process.cwd(), 'uploads/signatures', fileName),
        path.join(__dirname, '../../uploads/signatures', fileName)
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
      }
      return null;
    };

    // Hospital Data Fetch
    let hospitalData = await HospitalSetting.findOne({ 
      $or: [{ hospitalId: hospitalId }, { hospitalId: report.hospitalId }] 
    }).lean() || {};

    const patientName = (report.patientName || 'N/A').replace(/\^+/g, ' ').trim();
    const studyDate = new Date(report.reportDate?.$date || report.reportDate || Date.now())
      .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

    const decodeHtml = (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, '/')
        .trim();
    };

    // Use imported isValidContent for junk text detection
    const hasContent = (content) => {
      const cleaned = decodeHtml(content);
      return isValidContent(cleaned);
    };

    const getSection = (key, ...fallbacks) => {
      let value = report.sections?.[key] || report[key];
      if (!value || (typeof value === 'string' && value.trim().length < 2)) {
        for (const fb of fallbacks) {
          value = report.sections?.[fb] || report[fb];
          if (value && typeof value === 'string' && value.trim().length >= 2) break;
        }
      }
      return decodeHtml(value || '');
    };

    // Extract scoring category from report if present
    const extractScore = () => {
      if (!scoringSystem) return null;
      
      // Look for score in various places
      const scoreFields = ['score', 'category', 'classification', 'grade'];
      for (const field of scoreFields) {
        const value = report.sections?.[field] || report[field];
        if (value) {
          const category = getScoringCategory(templateSchema?.name?.toUpperCase()?.replace(/[^A-Z]/g, '_'), value);
          if (category) return category;
        }
      }
      
      // Try to extract from impression
      const impression = getSection('impression');
      if (impression && scoringSystem) {
        const patterns = {
          'BI-RADS': /BI-?RADS\s*(?:Category\s*)?(\d[ABC]?)/i,
          'Lung-RADS': /Lung-?RADS\s*(?:Category\s*)?(\d[ABX]?)/i,
          'CAD-RADS': /CAD-?RADS\s*(?:Category\s*)?(\d[AB]?|N)/i,
          'LI-RADS': /LI-?RADS\s*(LR-?[1-5M]|LR-?TIV)/i,
          'PI-RADS': /PI-?RADS\s*(?:Score\s*)?([1-5])/i,
          'TI-RADS': /(?:ACR\s*)?TI-?RADS\s*(TR[1-5])/i,
          'O-RADS': /O-?RADS\s*(?:Score\s*)?([0-5])/i,
          'ASPECTS': /ASPECTS\s*(?:Score\s*)?:?\s*(\d+)/i
        };
        
        const pattern = patterns[scoringSystem];
        if (pattern) {
          const match = impression.match(pattern);
          if (match) return { code: match[1], extracted: true };
        }
      }
      
      return null;
    };

    // Page overflow check - prevents orphaned headers
    const checkPageOverflow = (needed = 50) => { 
      if (doc.y + needed > pageHeight) {
        doc.addPage();
        doc.y = 40;
        return true;
      }
      return false;
    };

    // Calculate text height before rendering
    const getTextHeight = (text, options = {}) => {
      if (!text) return 0;
      return doc.heightOfString(text, {
        width: options.width || contentWidth,
        fontSize: options.fontSize || 9,
        lineGap: options.lineGap || 2
      });
    };

    // ========== 1. HEADER ==========
    const headerY = 40;
    const logoWidth = 45;
    const logoHeight = 45;
    const textStartX = leftMargin + logoWidth + 12; // Text starts after logo with gap
    
    // Draw logo - vertically centered with text
    if (hospitalData?.logoUrl) {
      try {
        const response = await axios.get(hospitalData.logoUrl, { responseType: 'arraybuffer' });
        doc.image(Buffer.from(response.data), leftMargin, headerY, { width: logoWidth, height: logoHeight, fit: [logoWidth, logoHeight], align: 'center', valign: 'center' });
      } catch (e) { console.error("Logo fetch failed"); }
    }

    // Hospital name - aligned with logo top
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(16)
       .text(hospitalData?.name?.toUpperCase() || 'MEDICAL CENTER', textStartX, headerY, { width: 300 });
    
    // Address and contact info - below hospital name
    const addressLine = [
      hospitalData?.address?.street,
      hospitalData?.address?.city,
      hospitalData?.address?.state
    ].filter(Boolean).join(', ');
    
    const contactLine = [
      hospitalData?.contactPhone ? `Phone: ${hospitalData.contactPhone}` : '',
      hospitalData?.contactEmail ? `Email: ${hospitalData.contactEmail}` : ''
    ].filter(Boolean).join(' | ');
    
    doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(9)
       .text(addressLine, textStartX, headerY + 20, { width: 300 });
    doc.fillColor(COLORS.secondary).font('Helvetica').fontSize(8)
       .text(contactLine, textStartX, headerY + 32, { width: 300 });

    // Report badge - right aligned
    doc.rect(430, headerY + 5, 125, 25).fill(COLORS.primary);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text('RADIOLOGY REPORT', 430, headerY + 13, { width: 125, align: 'center' });
    
    // Header separator line
    const headerEndY = headerY + logoHeight + 10;
    doc.moveTo(leftMargin, headerEndY).lineTo(rightMargin, headerEndY).lineWidth(1).strokeColor(COLORS.accent).stroke();

    // ========== 2. PATIENT INFO GRID ==========
    const gridTop = headerEndY + 8;
    doc.rect(leftMargin, gridTop, contentWidth, 58).fill('#F7FAFC');
    doc.rect(leftMargin, gridTop, contentWidth, 58).strokeColor(COLORS.accent).lineWidth(0.5).stroke();
    
    // Grid layout - 2 columns, 3 rows with better spacing
    const col1Label = leftMargin + 8;
    const col1Value = leftMargin + 100;
    const col2Label = leftMargin + 275;
    const col2Value = leftMargin + 365;
    const rowHeight = 17;
    
    const drawLabel = (label, x, y) => doc.fillColor(COLORS.textLight).font('Helvetica-Bold').fontSize(7).text(label, x, y, { lineBreak: false });
    const drawVal = (val, x, y, maxWidth = 165) => doc.fillColor(COLORS.textMain).font('Helvetica').fontSize(9).text(val || 'N/A', x, y, { width: maxWidth, lineBreak: false });

    // Row 1
    drawLabel('PATIENT NAME', col1Label, gridTop + 8); 
    drawVal(patientName, col1Value, gridTop + 7, 165);
    drawLabel('PATIENT ID', col2Label, gridTop + 8);   
    drawVal(report.patientID, col2Value, gridTop + 7, 140);
    
    // Row 2
    const studyType = [report.modality, report.templateName].filter(Boolean).join(' - ') || 'N/A';
    drawLabel('STUDY TYPE', col1Label, gridTop + 8 + rowHeight);  
    drawVal(studyType, col1Value, gridTop + 7 + rowHeight, 165);
    drawLabel('STUDY DATE', col2Label, gridTop + 8 + rowHeight);  
    drawVal(studyDate, col2Value, gridTop + 7 + rowHeight, 140);
    
    // Row 3
    drawLabel('REF. PHYSICIAN', col1Label, gridTop + 8 + rowHeight * 2);
    drawVal(report.referringPhysician || 'N/A', col1Value, gridTop + 7 + rowHeight * 2, 165);
    drawLabel('STATUS', col2Label, gridTop + 8 + rowHeight * 2);
    
    // Status with color coding
    const statusColor = report.reportStatus === 'final' ? COLORS.success : 
                        report.reportStatus === 'preliminary' ? COLORS.warning : COLORS.danger;
    doc.fillColor(statusColor)
       .font('Helvetica-Bold')
       .fontSize(9)
       .text((report.reportStatus || 'DRAFT').toUpperCase(), col2Value, gridTop + 7 + rowHeight * 2, { lineBreak: false });

    // ========== 3. CLINICAL CONTENT ==========
    doc.y = gridTop + 68;

    // Section renderer - only renders if content exists
    const addSection = (title, content, options = {}) => {
      if (!hasContent(content)) return false;
      
      const cleanContent = decodeHtml(content);
      const contentHeight = getTextHeight(cleanContent, { fontSize: 9 });
      const totalHeight = 25 + contentHeight;
      
      checkPageOverflow(Math.min(totalHeight, 80));
      
      doc.moveDown(0.4);
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), leftMargin);
      doc.moveTo(leftMargin, doc.y + 2).lineTo(leftMargin + 120, doc.y + 2).lineWidth(0.5).strokeColor(COLORS.primary).stroke();
      doc.moveDown(0.3);
      doc.fillColor(options.color || COLORS.textMain)
         .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(9)
         .text(cleanContent, leftMargin, doc.y, { width: contentWidth, align: 'justify', lineGap: 2 });
      return true;
    };

    addSection('Clinical History / Indication', getSection('clinical_history', 'clinical_indication', 'clinicalHistory', 'indication'));
    addSection('Technique', getSection('technique'));
    addSection('Findings', getSection('findings', 'findingsText'));

    // ========== 4. MODULES / CHECKLISTS ==========
    const moduleKeys = Object.keys(report.sections || {}).filter(k => k.startsWith('uiModule_'));
    
    moduleKeys.forEach(key => {
      try {
        const rawData = report.sections[key];
        if (!rawData) return;
        
        const data = typeof rawData === 'string' ? JSON.parse(decodeHtml(rawData)) : rawData;
        
        // Parse rows from different data formats
        let rows = [];
        if (data.selections && typeof data.selections === 'object') {
          rows = Object.entries(data.selections).map(([k, v]) => ({ 
            label: k.replace(/_/g, ' '), 
            status: normalizeStatus(typeof v === 'string' ? v : (v?.status || 'Normal')),
            notes: v?.notes || data.notes?.[k] || '',
            measurement: v?.measurement || ''
          }));
        } else if (Array.isArray(data)) {
          rows = data.map(item => ({
            label: item.label || item.id || item.name || '',
            status: normalizeStatus(item.status || 'Normal'),
            notes: item.notes || '',
            measurement: item.measurement || item.value || ''
          }));
        }
        
        // Filter empty rows and rows with invalid labels
        rows = rows.filter(r => r.label && r.label.trim().length > 0 && isValidContent(r.label));
        if (rows.length === 0) return;
        
        // Calculate space needed - prevent table from splitting
        const headerHeight = 18;
        const rowHeight = 14;
        const tableHeight = headerHeight + (rows.length * rowHeight) + 10;
        
        // If table won't fit, move to next page
        if (doc.y + tableHeight > pageHeight && rows.length <= 15) {
          doc.addPage();
          doc.y = 40;
        } else {
          checkPageOverflow(Math.min(tableHeight, 100));
        }
        
        // Section Title
        doc.moveDown(0.5);
        const sectionTitle = key.replace('uiModule_', '').replace(/_/g, ' ').toUpperCase();
        doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10).text(sectionTitle, leftMargin);
        doc.moveDown(0.2);
        
        // Table Header
        const tableTop = doc.y;
        const colX = { 
          structure: leftMargin + 5, 
          status: leftMargin + 175, 
          measurement: leftMargin + 270,
          notes: leftMargin + 360 
        };
        
        doc.rect(leftMargin, tableTop, contentWidth, 16).fill(COLORS.accent);
        doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(7);
        doc.text('STRUCTURE', colX.structure, tableTop + 5);
        doc.text('STATUS', colX.status, tableTop + 5);
        doc.text('MEASUREMENT', colX.measurement, tableTop + 5);
        doc.text('NOTES', colX.notes, tableTop + 5);
        
        doc.y = tableTop + 18;

        // Draw rows - prevent row splitting across pages
        rows.forEach((row, idx) => {
          // Check if row will fit, if not move to next page with header
          if (doc.y + rowHeight > pageHeight) {
            doc.addPage();
            doc.y = 40;
            // Re-render table header on new page
            doc.rect(leftMargin, doc.y, contentWidth, 16).fill(COLORS.accent);
            doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(7);
            doc.text('STRUCTURE', colX.structure, doc.y + 5);
            doc.text('STATUS', colX.status, doc.y + 5);
            doc.text('MEASUREMENT', colX.measurement, doc.y + 5);
            doc.text('NOTES', colX.notes, doc.y + 5);
            doc.y += 18;
          }
          
          const rowY = doc.y;
          const isAbnormal = row.status === STATUS_VALUES.ABNORMAL;
          
          // Alternate row background
          if (idx % 2 === 0) {
            doc.rect(leftMargin, rowY - 1, contentWidth, rowHeight).fill('#FAFAFA');
          }
          
          // Structure column
          doc.fillColor(isAbnormal ? COLORS.danger : COLORS.textMain)
             .font(isAbnormal ? 'Helvetica-Bold' : 'Helvetica')
             .fontSize(8)
             .text(row.label, colX.structure, rowY, { width: 165 });
          
          // Status column - controlled vocabulary
          doc.fillColor(isAbnormal ? COLORS.danger : COLORS.success)
             .font('Helvetica')
             .fontSize(8)
             .text(row.status, colX.status, rowY, { width: 90 });
          
          // Measurement column
          doc.fillColor(COLORS.textMain)
             .font('Helvetica')
             .fontSize(8)
             .text(row.measurement || '-', colX.measurement, rowY, { width: 85 });
          
          // Notes column - only show if valid content
          const noteText = isValidContent(row.notes) ? row.notes : '-';
          doc.fillColor(COLORS.textLight)
             .font('Helvetica')
             .fontSize(8)
             .text(noteText, colX.notes, rowY, { width: 150 });
          
          doc.y = rowY + rowHeight;
        });
        
        // Table border
        doc.rect(leftMargin, tableTop, contentWidth, doc.y - tableTop).strokeColor(COLORS.accent).stroke();
        
      } catch (e) {
        console.error('Module parse error:', key, e.message);
      }
    });
    
    // Recommendations section (if exists and valid)
    addSection('Recommendations', getSection('recommendations'));

    // ========== 5. IMPRESSION (with Scoring System Badge) ==========
    const impression = getSection('impression');
    if (hasContent(impression)) {
      const cleanImpression = decodeHtml(impression);
      const impressionHeight = getTextHeight(cleanImpression, { width: contentWidth - 24, fontSize: 10 });
      
      // Extract score if scoring system is used
      const scoreInfo = extractScore();
      const hasScore = scoreInfo && scoringSystem;
      
      const boxHeight = impressionHeight + (hasScore ? 38 : 18);
      
      // Try to keep impression with signature
      checkPageOverflow(boxHeight + 100);
      
      doc.moveDown(0.6);
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11).text('IMPRESSION', leftMargin);
      doc.moveDown(0.2);
      
      const boxY = doc.y;
      
      // Box background with left accent bar
      doc.rect(leftMargin, boxY, contentWidth, boxHeight).fill(COLORS.impressionBg);
      doc.rect(leftMargin, boxY, contentWidth, boxHeight).strokeColor(COLORS.primary).lineWidth(0.5).stroke();
      doc.rect(leftMargin, boxY, 4, boxHeight).fill(COLORS.primary);
      
      // Scoring system badge (if applicable)
      if (hasScore) {
        const badgeY = boxY + 8;
        const badgeWidth = 140;
        doc.rect(leftMargin + 12, badgeY, badgeWidth, 22).fill(COLORS.scoreBg);
        doc.rect(leftMargin + 12, badgeY, badgeWidth, 22).strokeColor(COLORS.warning).lineWidth(0.5).stroke();
        
        doc.fillColor(COLORS.warning)
           .font('Helvetica-Bold')
           .fontSize(9)
           .text(`${scoringSystem}: ${scoreInfo.code}`, leftMargin + 18, badgeY + 6);
        
        // Impression text below badge
        doc.fillColor(COLORS.primary)
           .font('Helvetica-Bold')
           .fontSize(10)
           .text(cleanImpression, leftMargin + 12, badgeY + 28, { width: contentWidth - 24, lineGap: 3 });
      } else {
        // Impression text without badge
        doc.fillColor(COLORS.primary)
           .font('Helvetica-Bold')
           .fontSize(10)
           .text(cleanImpression, leftMargin + 12, boxY + 9, { width: contentWidth - 24, lineGap: 3 });
      }
      
      doc.y = boxY + boxHeight + 8;
    }

    // ========== 6. SIGNATURE (with image support) ==========
    checkPageOverflow(85);
    doc.moveDown(0.8);
    
    const sigX = rightMargin - 180;
    const sigStartY = doc.y;
    
    // Check if signature image exists
    const signatureImagePath = getSignaturePath(report.radiologistSignatureUrl);
    
    if (signatureImagePath) {
      try {
        doc.image(signatureImagePath, sigX, sigStartY, { width: 100, height: 35 });
        doc.y = sigStartY + 40;
      } catch (e) {
        console.error('Signature image load failed:', e.message);
      }
    }
    
    // Signature line
    doc.moveTo(sigX, doc.y).lineTo(rightMargin, doc.y).lineWidth(0.5).strokeColor(COLORS.secondary).stroke();
    
    // Doctor details
    const nameY = doc.y + 5;
    const doctorName = report.signature?.displayName || report.radiologistName || 'Radiologist';
    
    doc.fillColor(COLORS.textMain).font('Helvetica-Bold').fontSize(10)
       .text(`Dr. ${doctorName}`, sigX, nameY);
    
    let detailY = nameY + 13;
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.textLight);
    
    if (report.signature?.specialty) {
      doc.text(report.signature.specialty, sigX, detailY);
      detailY += 10;
    } else {
      doc.text('Consultant Radiologist', sigX, detailY);
      detailY += 10;
    }
    
    if (report.signature?.licenseNumber) {
      doc.text(`Reg. No: ${report.signature.licenseNumber}`, sigX, detailY);
      detailY += 10;
    }
    
    if (report.signedAt) {
      const signedDate = new Date(report.signedAt).toLocaleDateString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      doc.text(`Signed: ${signedDate}`, sigX, detailY);
    }

    doc.y = detailY + 15;

    // ========== 7. KEY IMAGES (Only if exists and has valid images) ==========
    if (report.keyImages && report.keyImages.length > 0) {
      // Check if any valid images exist before adding page
      const validImages = report.keyImages.filter(img => getLocalPath(img.dataUrl));
      
      if (validImages.length > 0) {
        doc.addPage();
        
        // Page 2 Header
        doc.fillColor(COLORS.primary)
           .font('Helvetica-Bold')
           .fontSize(14)
           .text('KEY RADIOLOGICAL IMAGES', leftMargin, 40, { align: 'center', width: contentWidth });
        
        doc.fillColor(COLORS.textLight)
           .font('Helvetica')
           .fontSize(8)
           .text(`${validImages.length} image(s) • ${report.modality || 'CT'} ${report.templateName || 'Study'}`, leftMargin, 58, { align: 'center', width: contentWidth });
        
        doc.moveTo(leftMargin, 72).lineTo(rightMargin, 72).lineWidth(0.5).strokeColor(COLORS.accent).stroke();
        
        doc.y = 85;
        
        const imgWidth = 235;
        const imgHeight = 155;
        const imgGap = 20;
        const captionHeight = 35;
        let curX = leftMargin;
        let curY = doc.y;
        let figureNum = 1;
        
        validImages.forEach((img, i) => {
          const imgPath = getLocalPath(img.dataUrl);
          if (!imgPath) return;
          
          // Check for page overflow - need space for image + caption
          if (curY + imgHeight + captionHeight > 720) {
            doc.addPage();
            curY = 50;
            curX = leftMargin;
          }
          
          try {
            // Image border/frame
            doc.rect(curX, curY, imgWidth, imgHeight).fill('#000000');
            
            // Actual image
            doc.image(imgPath, curX + 2, curY + 2, { 
              width: imgWidth - 4, 
              height: imgHeight - 4, 
              fit: [imgWidth - 4, imgHeight - 4],
              align: 'center',
              valign: 'center'
            });
            
            // Image border
            doc.rect(curX, curY, imgWidth, imgHeight).strokeColor(COLORS.accent).lineWidth(1).stroke();
            
            // Figure number badge
            doc.rect(curX + 5, curY + 5, 45, 18).fill(COLORS.primary);
            doc.fillColor('#FFFFFF')
               .font('Helvetica-Bold')
               .fontSize(9)
               .text(`Fig ${figureNum}`, curX + 8, curY + 10);
            
            // Caption box
            const captionY = curY + imgHeight + 5;
            const caption = img.caption || img.description || `Key image from ${report.modality || 'study'}`;
            
            doc.fillColor(COLORS.primary)
               .font('Helvetica-Bold')
               .fontSize(8)
               .text(`Figure ${figureNum}:`, curX, captionY);
            
            doc.fillColor(COLORS.textMain)
               .font('Helvetica')
               .fontSize(8)
               .text(caption, curX, captionY + 10, { 
                 width: imgWidth, 
                 height: 22,
                 ellipsis: true
               });
            
            figureNum++;
            
          } catch (imgErr) {
            console.error('Key image load failed:', imgErr.message);
          }
          
          // Position next image
          if (i % 2 === 0) {
            curX = leftMargin + imgWidth + imgGap;
          } else {
            curX = leftMargin;
            curY += imgHeight + captionHeight + 15;
          }
        });
      }
    }

    // ========== 8. FOOTER (on all pages) ==========
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    const footerY = 780;
    
    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i);
      
      // Footer separator line
      doc.moveTo(leftMargin, footerY - 12)
         .lineTo(rightMargin, footerY - 12)
         .lineWidth(0.3)
         .strokeColor(COLORS.accent)
         .stroke();
      
      doc.fillColor(COLORS.textLight).font('Helvetica').fontSize(7);
      
      // Left: Report ID
      doc.text(`Report ID: ${report.reportId || 'Draft'}`, leftMargin, footerY - 5, { continued: false });
      
      // Center: Hospital name
      doc.text(`© ${hospitalData?.name || 'Medical Center'}`, leftMargin, footerY - 5, { width: contentWidth, align: 'center' });
      
      // Right: Page number
      doc.text(`Page ${i - range.start + 1} of ${totalPages}`, leftMargin, footerY - 5, { width: contentWidth, align: 'right' });
    }

    doc.end();
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
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
