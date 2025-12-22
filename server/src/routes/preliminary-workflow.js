/**
 * Preliminary Report Workflow API Routes
 * Trainee/Attending co-signature workflow
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const StructuredReport = require('../models/StructuredReport');
const ReportVersion = require('../models/ReportVersion');
const auditService = require('../services/audit-service');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/preliminary-workflow/:reportId/trainee-sign
 * Trainee signs preliminary report
 */
router.post('/:reportId/trainee-sign', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { signatureText, signatureImageUrl, role } = req.body;

    if (!signatureText) {
      return res.status(400).json({
        success: false,
        error: 'signatureText is required'
      });
    }

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Verify report is in draft status
    if (report.reportStatus !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Report must be in draft status for trainee signature'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    // Initialize preliminary workflow if not exists
    if (!report.preliminaryWorkflow) {
      report.preliminaryWorkflow = {};
    }

    // Set trainee signature
    report.preliminaryWorkflow.trainee = {
      userId,
      name: userName,
      role: role || 'resident',
      signedAt: new Date(),
      signatureText,
      signatureImageUrl
    };

    // Update workflow status
    report.preliminaryWorkflow.status = 'pending_attending';
    report.preliminaryWorkflow.traineeSubmittedAt = new Date();

    // Update report status to preliminary
    report.reportStatus = 'preliminary';

    // Add to revision history
    report.revisionHistory = report.revisionHistory || [];
    report.revisionHistory.push({
      revisedBy: userName,
      revisedAt: new Date(),
      changes: 'Trainee signed preliminary report',
      previousStatus: 'draft'
    });

    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'TRAINEE_SIGNED_PRELIMINARY',
      resourceType: 'Report',
      resourceId: reportId,
      details: { role, trainee: userName },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Preliminary report signed by trainee, pending attending review'
    });

  } catch (error) {
    console.error('❌ Error in trainee sign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/preliminary-workflow/:reportId/attending-attest
 * Attending physician attests/co-signs the report
 */
router.post('/:reportId/attending-attest', async (req, res) => {
  try {
    const { reportId } = req.params;
    const {
      signatureText,
      signatureImageUrl,
      attestationType,
      attestationNotes,
      changesRequired,
      changesSummary,
      updatedContent // Optional: if attending makes changes
    } = req.body;

    if (!signatureText || !attestationType) {
      return res.status(400).json({
        success: false,
        error: 'signatureText and attestationType are required'
      });
    }

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Verify report is in preliminary status
    if (report.reportStatus !== 'preliminary') {
      return res.status(400).json({
        success: false,
        error: 'Report must be in preliminary status for attending attestation'
      });
    }

    // Verify trainee has signed
    if (!report.preliminaryWorkflow?.trainee?.signedAt) {
      return res.status(400).json({
        success: false,
        error: 'Trainee must sign before attending attestation'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;
    const credentials = req.user.credentials || 'MD';

    // Capture previous state for version history
    const previousSnapshot = {
      clinicalHistory: report.clinicalHistory,
      technique: report.technique,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations
    };

    // Apply any changes from attending
    if (updatedContent) {
      if (updatedContent.clinicalHistory !== undefined) report.clinicalHistory = updatedContent.clinicalHistory;
      if (updatedContent.technique !== undefined) report.technique = updatedContent.technique;
      if (updatedContent.findingsText !== undefined) report.findingsText = updatedContent.findingsText;
      if (updatedContent.impression !== undefined) report.impression = updatedContent.impression;
      if (updatedContent.recommendations !== undefined) report.recommendations = updatedContent.recommendations;
    }

    // Set attending attestation
    report.preliminaryWorkflow.attending = {
      userId,
      name: userName,
      credentials,
      signedAt: new Date(),
      signatureText,
      signatureImageUrl,
      attestationType,
      attestationNotes,
      changesRequired: changesRequired || false,
      changesSummary
    };

    // Update workflow status
    if (changesRequired) {
      report.preliminaryWorkflow.status = 'changes_requested';
      report.reportStatus = 'preliminary'; // Stay in preliminary
    } else {
      report.preliminaryWorkflow.status = 'finalized';
      report.preliminaryWorkflow.finalizedAt = new Date();
      report.reportStatus = 'final';
      report.signedAt = new Date();
      report.radiologistName = userName;
      report.radiologistSignature = signatureText;
      report.radiologistSignatureUrl = signatureImageUrl;
    }

    report.preliminaryWorkflow.attendingReviewedAt = new Date();

    // Add to revision history
    report.revisionHistory.push({
      revisedBy: userName,
      revisedAt: new Date(),
      changes: changesRequired 
        ? `Attending requested changes: ${changesSummary || 'See notes'}`
        : `Attending attested (${attestationType})`,
      previousStatus: 'preliminary'
    });

    await report.save();

    // Create version record if finalized
    if (!changesRequired) {
      try {
        await ReportVersion.createOriginal(
          report,
          {
            userId,
            name: userName,
            credentials,
            method: signatureImageUrl ? 'drawn' : 'typed',
            imageUrl: signatureImageUrl
          },
          { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        );
      } catch (versionError) {
        console.error('Failed to create version record:', versionError);
      }
    }

    // Audit log
    await auditService.logAction({
      userId,
      action: changesRequired ? 'ATTENDING_REQUESTED_CHANGES' : 'ATTENDING_ATTESTED',
      resourceType: 'Report',
      resourceId: reportId,
      details: { attestationType, changesRequired, attending: userName },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      report: report.toObject(),
      message: changesRequired 
        ? 'Changes requested by attending'
        : 'Report finalized with attending attestation'
    });

  } catch (error) {
    console.error('❌ Error in attending attest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/preliminary-workflow/:reportId/trainee-revise
 * Trainee revises report after attending requests changes
 */
router.post('/:reportId/trainee-revise', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { updatedContent, revisionNotes } = req.body;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Verify changes were requested
    if (report.preliminaryWorkflow?.status !== 'changes_requested') {
      return res.status(400).json({
        success: false,
        error: 'No changes were requested for this report'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    // Apply updates
    if (updatedContent) {
      if (updatedContent.clinicalHistory !== undefined) report.clinicalHistory = updatedContent.clinicalHistory;
      if (updatedContent.technique !== undefined) report.technique = updatedContent.technique;
      if (updatedContent.findingsText !== undefined) report.findingsText = updatedContent.findingsText;
      if (updatedContent.impression !== undefined) report.impression = updatedContent.impression;
      if (updatedContent.recommendations !== undefined) report.recommendations = updatedContent.recommendations;
    }

    // Update workflow status back to pending attending
    report.preliminaryWorkflow.status = 'pending_attending';

    // Add to revision history
    report.revisionHistory.push({
      revisedBy: userName,
      revisedAt: new Date(),
      changes: `Trainee revised report: ${revisionNotes || 'Addressed attending feedback'}`,
      previousStatus: 'changes_requested'
    });

    await report.save();

    // Audit log
    await auditService.logAction({
      userId,
      action: 'TRAINEE_REVISED_REPORT',
      resourceType: 'Report',
      resourceId: reportId,
      details: { revisionNotes },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Report revised, pending attending review'
    });

  } catch (error) {
    console.error('❌ Error in trainee revise:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/preliminary-workflow/:reportId/status
 * Get preliminary workflow status
 */
router.get('/:reportId/status', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await StructuredReport.findOne({ reportId })
      .select('reportId reportStatus preliminaryWorkflow');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      reportId: report.reportId,
      reportStatus: report.reportStatus,
      workflow: report.preliminaryWorkflow || null
    });

  } catch (error) {
    console.error('❌ Error getting workflow status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/preliminary-workflow/pending-review
 * Get all reports pending attending review
 */
router.get('/pending-review', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;

    const query = {
      reportStatus: 'preliminary',
      'preliminaryWorkflow.status': { $in: ['pending_attending', 'changes_requested'] }
    };

    if (hospitalId) {
      query.hospitalId = hospitalId;
    }

    const reports = await StructuredReport.find(query)
      .select('reportId patientID patientName modality studyDate preliminaryWorkflow createdAt')
      .sort({ 'preliminaryWorkflow.traineeSubmittedAt': -1 })
      .limit(50);

    res.json({
      success: true,
      count: reports.length,
      reports
    });

  } catch (error) {
    console.error('❌ Error getting pending reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
