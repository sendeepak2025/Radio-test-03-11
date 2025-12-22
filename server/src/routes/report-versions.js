/**
 * Report Versions API Routes
 * Full audit trail for report versioning
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const ReportVersion = require('../models/ReportVersion');
const StructuredReport = require('../models/StructuredReport');
const auditService = require('../services/audit-service');
const { autoCodeFinding } = require('../data/radlex-codes');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/report-versions/:reportId
 * Get version history for a report
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    const versions = await ReportVersion.getHistory(reportId);

    res.json({
      success: true,
      count: versions.length,
      versions
    });

  } catch (error) {
    console.error('❌ Error fetching version history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/report-versions/:reportId/:version
 * Get specific version of a report
 */
router.get('/:reportId/:version', async (req, res) => {
  try {
    const { reportId, version } = req.params;

    const reportVersion = await ReportVersion.getVersion(reportId, parseInt(version));

    if (!reportVersion) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }

    // Verify integrity
    const integrityValid = reportVersion.verifyIntegrity();

    res.json({
      success: true,
      version: reportVersion.toObject(),
      integrityValid
    });

  } catch (error) {
    console.error('❌ Error fetching version:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/report-versions/:reportId/addendum
 * Create an addendum to a signed report
 */
router.post('/:reportId/addendum', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { content, reason, signatureData } = req.body;

    // Validate required fields
    if (!content || !reason) {
      return res.status(400).json({
        success: false,
        error: 'content and reason are required'
      });
    }

    // Get the report
    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Verify report is signed
    if (report.reportStatus !== 'final' && report.reportStatus !== 'amended') {
      return res.status(400).json({
        success: false,
        error: 'Can only add addendum to signed reports'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    // Create addendum version
    const version = await ReportVersion.createAddendum(
      report,
      { content, reason },
      {
        userId,
        name: userName,
        credentials: req.user.credentials || 'MD',
        method: signatureData?.method || 'typed',
        imageUrl: signatureData?.imageUrl
      },
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    // Update report with addendum
    report.addenda = report.addenda || [];
    report.addenda.push({
      content,
      reason,
      addedBy: userId,
      addedByName: userName,
      addedAt: new Date(),
      versionId: version._id
    });
    report.reportStatus = 'final'; // Remains final with addendum
    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'REPORT_ADDENDUM_CREATED',
      resourceType: 'Report',
      resourceId: reportId,
      details: { versionNumber: version.version, reason },
      ipAddress: req.ip
    }).catch(console.error);

    res.status(201).json({
      success: true,
      version: version.toObject(),
      message: 'Addendum created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating addendum:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/report-versions/:reportId/amendment
 * Create an amendment to a signed report (correction to existing content)
 */
router.post('/:reportId/amendment', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { updates, reason, summary, signatureData } = req.body;

    // Validate required fields
    if (!updates || !reason) {
      return res.status(400).json({
        success: false,
        error: 'updates and reason are required'
      });
    }

    // Get the report
    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Verify report is signed
    if (report.reportStatus !== 'final' && report.reportStatus !== 'amended') {
      return res.status(400).json({
        success: false,
        error: 'Can only amend signed reports'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    // Capture previous state
    const previousSnapshot = {
      clinicalHistory: report.clinicalHistory,
      technique: report.technique,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations
    };

    // Apply updates
    const allowedFields = ['clinicalHistory', 'technique', 'findingsText', 'impression', 'recommendations'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        report[field] = updates[field];
      }
    }

    // Create amendment version
    const version = await ReportVersion.createAmendment(
      report,
      previousSnapshot,
      { reason, summary },
      {
        userId,
        name: userName,
        credentials: req.user.credentials || 'MD',
        method: signatureData?.method || 'typed',
        imageUrl: signatureData?.imageUrl
      },
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    // Update report status
    report.reportStatus = 'amended';
    report.revisionHistory = report.revisionHistory || [];
    report.revisionHistory.push({
      revisedBy: userName,
      revisedAt: new Date(),
      changes: `Amendment: ${reason}`,
      previousStatus: 'final'
    });
    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'REPORT_AMENDED',
      resourceType: 'Report',
      resourceId: reportId,
      details: { 
        versionNumber: version.version, 
        reason,
        fieldsChanged: version.changeDetails.fieldsChanged
      },
      ipAddress: req.ip
    }).catch(console.error);

    res.status(201).json({
      success: true,
      version: version.toObject(),
      report: report.toObject(),
      message: 'Amendment created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating amendment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/report-versions/:reportId/correction
 * Create a correction to a signed report (error fix)
 */
router.post('/:reportId/correction', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { updates, reason, summary, signatureData } = req.body;

    // Validate required fields
    if (!updates || !reason) {
      return res.status(400).json({
        success: false,
        error: 'updates and reason are required'
      });
    }

    // Get the report
    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Verify report is signed
    if (report.reportStatus !== 'final' && report.reportStatus !== 'amended') {
      return res.status(400).json({
        success: false,
        error: 'Can only correct signed reports'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    // Capture previous state
    const previousSnapshot = {
      clinicalHistory: report.clinicalHistory,
      technique: report.technique,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations
    };

    // Apply updates
    const allowedFields = ['clinicalHistory', 'technique', 'findingsText', 'impression', 'recommendations'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        report[field] = updates[field];
      }
    }

    // Create correction version
    const version = await ReportVersion.createCorrection(
      report,
      previousSnapshot,
      { reason, summary },
      {
        userId,
        name: userName,
        credentials: req.user.credentials || 'MD',
        method: signatureData?.method || 'typed',
        imageUrl: signatureData?.imageUrl
      },
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    // Update report
    report.revisionHistory = report.revisionHistory || [];
    report.revisionHistory.push({
      revisedBy: userName,
      revisedAt: new Date(),
      changes: `Correction: ${reason}`,
      previousStatus: report.reportStatus
    });
    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'REPORT_CORRECTED',
      resourceType: 'Report',
      resourceId: reportId,
      details: { 
        versionNumber: version.version, 
        reason,
        fieldsChanged: version.changeDetails.fieldsChanged
      },
      ipAddress: req.ip
    }).catch(console.error);

    res.status(201).json({
      success: true,
      version: version.toObject(),
      report: report.toObject(),
      message: 'Correction created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating correction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/report-versions/:reportId/:version/attest
 * Add attestation (co-signature) to a version
 */
router.post('/:reportId/:version/attest', async (req, res) => {
  try {
    const { reportId, version } = req.params;
    const { type, notes } = req.body;

    const reportVersion = await ReportVersion.getVersion(reportId, parseInt(version));

    if (!reportVersion) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    await reportVersion.addAttestation({
      userId,
      name: userName,
      role: req.user.role || 'attending',
      type: type || 'reviewed',
      notes
    });

    // Audit log
    await auditService.logAction({
      userId,
      action: 'REPORT_ATTESTED',
      resourceType: 'ReportVersion',
      resourceId: reportVersion._id.toString(),
      details: { reportId, version: parseInt(version), type },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      version: reportVersion.toObject(),
      message: 'Attestation added successfully'
    });

  } catch (error) {
    console.error('❌ Error adding attestation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/report-versions/:reportId/compare/:v1/:v2
 * Compare two versions of a report
 */
router.get('/:reportId/compare/:v1/:v2', async (req, res) => {
  try {
    const { reportId, v1, v2 } = req.params;

    const version1 = await ReportVersion.getVersion(reportId, parseInt(v1));
    const version2 = await ReportVersion.getVersion(reportId, parseInt(v2));

    if (!version1 || !version2) {
      return res.status(404).json({
        success: false,
        error: 'One or both versions not found'
      });
    }

    // Calculate diff
    const diff = {};
    const fieldsToCompare = ['clinicalHistory', 'technique', 'findingsText', 'impression', 'recommendations'];
    
    for (const field of fieldsToCompare) {
      const val1 = version1.snapshot?.[field] || '';
      const val2 = version2.snapshot?.[field] || '';
      
      if (val1 !== val2) {
        diff[field] = {
          version1: val1,
          version2: val2
        };
      }
    }

    res.json({
      success: true,
      comparison: {
        version1: {
          version: version1.version,
          versionType: version1.versionType,
          signedAt: version1.signedAt,
          signedByName: version1.signedByName
        },
        version2: {
          version: version2.version,
          versionType: version2.versionType,
          signedAt: version2.signedAt,
          signedByName: version2.signedByName
        },
        diff,
        fieldsChanged: Object.keys(diff)
      }
    });

  } catch (error) {
    console.error('❌ Error comparing versions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
