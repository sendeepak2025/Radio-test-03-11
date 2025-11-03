const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const reportService = require('../services/report-service');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/reports
 * Create new report with mode support (manual, ai-assisted, ai-only)
 */
router.post('/', async (req, res) => {
  try {
    const {
      studyInstanceUID,
      patientID,
      patientName,
      templateId,
      templateName,
      modality,
      creationMode = 'manual', // NEW: manual, ai-assisted, ai-only
      aiAnalysisId = null
    } = req.body;
    
    if (!studyInstanceUID || !patientID) {
      return res.status(400).json({
        success: false,
        error: 'studyInstanceUID and patientID are required'
      });
    }
    
    // Validate creation mode
    const validModes = ['manual', 'ai-assisted', 'ai-only'];
    if (!validModes.includes(creationMode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid creationMode. Must be one of: ${validModes.join(', ')}`
      });
    }
    
    // AI modes disabled - AI feature removed
    if (creationMode === 'ai-assisted' || creationMode === 'ai-only') {
      return res.status(404).json({
        success: false,
        error: 'AI-assisted and AI-only modes have been removed'
      });
    }
    
    const report = await reportService.createReport({
      studyInstanceUID,
      patientID,
      patientName,
      templateId,
      templateName,
      modality,
      createdBy: req.user.sub || req.user._id,
      hospitalId: req.user.hospitalId || req.user.sub || req.user._id,
      creationMode,
      aiAnalysisId
    });
    
    res.json({
      success: true,
      report,
      mode: creationMode
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/:reportId
 * Get report by ID
 */
router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await reportService.getReport(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      message: error.message
    });
  }
});

/**
 * PUT /api/reports/:reportId
 * Update report content
 */
router.put('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const updates = req.body;
    
    const report = await reportService.updateReport(reportId, updates);
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update report',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/images
 * Add key image to report
 */
router.post('/:reportId/images', async (req, res) => {
  try {
    const { reportId } = req.params;
    const imageData = req.body;
    
    const report = await reportService.addKeyImage(reportId, imageData);
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error adding key image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add key image',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/finalize
 * Finalize report
 */
router.post('/:reportId/finalize', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { signature } = req.body;
    
    const report = await reportService.finalizeReport(
      reportId,
      signature,
      req.user.sub || req.user._id
    );
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error finalizing report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize report',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/addendum
 * Add addendum to finalized report
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
    
    const report = await reportService.addAddendum(
      reportId,
      { content, reason },
      req.user.sub || req.user._id
    );
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error adding addendum:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add addendum',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/:reportId/critical
 * Mark report as critical
 */
router.post('/:reportId/critical', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { notifyTo } = req.body;
    
    const report = await reportService.markCritical(reportId, notifyTo || []);
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error marking critical:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as critical',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/study/:studyInstanceUID
 * Get reports for study
 */
router.get('/study/:studyInstanceUID', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    const reports = await reportService.getReportsByStudy(studyInstanceUID);
    
    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Error fetching study reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/patient/:patientID
 * Get reports for patient (prior studies)
 */
router.get('/patient/:patientID', async (req, res) => {
  try {
    const { patientID } = req.params;
    const { limit } = req.query;
    
    const reports = await reportService.getReportsByPatient(
      patientID,
      parseInt(limit) || 10
    );
    
    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Error fetching patient reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      message: error.message
    });
  }
});

/**
 * DELETE /api/reports/:reportId
 * Delete draft report
 */
router.delete('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const result = await reportService.deleteDraft(reportId, req.user._id);
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/stats
 * Get report statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId || req.user._id;
    const { startDate, endDate } = req.query;
    
    const stats = await reportService.getStatistics(hospitalId, {
      start: startDate,
      end: endDate
    });
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/:reportId/pdf
 * Render report to industry-standard PDF
 */
router.get('/:reportId/pdf', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const pdfPath = await reportService.renderToPDF(reportId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
    
    const fs = require('fs');
    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
    
    stream.on('end', () => {
      // Clean up PDF file after sending
      fs.unlink(pdfPath, (err) => {
        if (err) console.error('Failed to delete PDF:', err);
      });
    });
  } catch (error) {
    console.error('Error rendering PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to render PDF',
      message: error.message
    });
  }
});

module.exports = router;
