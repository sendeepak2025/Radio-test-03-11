/**
 * Batch Operations Routes
 * Bulk operations on reports with job queue
 */

const express = require('express');
const router = express.Router();
const batchOperationsService = require('../services/batch-operations-service');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const fs = require('fs');

/**
 * POST /api/batch-operations/export/pdf
 * Queue batch PDF export
 */
router.post('/export/pdf', authenticate, async (req, res) => {
  try {
    const { reportIds, format = 'zip' } = req.body;

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'Report IDs array is required' });
    }

    if (reportIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 reports per batch' });
    }

    const result = await batchOperationsService.queueBatchExport(
      reportIds,
      req.user.userId,
      format
    );

    res.json({
      message: 'Batch export queued',
      ...result
    });

  } catch (error) {
    console.error('Error queuing batch export:', error);
    res.status(500).json({ error: 'Failed to queue batch export' });
  }
});

/**
 * POST /api/batch-operations/status/change
 * Queue batch status change
 */
router.post('/status/change', authenticate, async (req, res) => {
  try {
    const { reportIds, newStatus } = req.body;

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'Report IDs array is required' });
    }

    if (!newStatus) {
      return res.status(400).json({ error: 'New status is required' });
    }

    const result = await batchOperationsService.queueBatchStatusChange(
      reportIds,
      newStatus,
      req.user.userId
    );

    res.json({
      message: 'Batch status change queued',
      ...result
    });

  } catch (error) {
    console.error('Error queuing batch status change:', error);
    res.status(500).json({ error: 'Failed to queue batch status change' });
  }
});

/**
 * POST /api/batch-operations/assign
 * Queue batch assignment
 */
router.post('/assign', authenticate, async (req, res) => {
  try {
    const { reportIds, radiologistId } = req.body;

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'Report IDs array is required' });
    }

    if (!radiologistId) {
      return res.status(400).json({ error: 'Radiologist ID is required' });
    }

    const result = await batchOperationsService.queueBatchAssignment(
      reportIds,
      radiologistId,
      req.user.userId
    );

    res.json({
      message: 'Batch assignment queued',
      ...result
    });

  } catch (error) {
    console.error('Error queuing batch assignment:', error);
    res.status(500).json({ error: 'Failed to queue batch assignment' });
  }
});

/**
 * GET /api/batch-operations/jobs/:jobId
 * Get job status
 */
router.get('/jobs/:jobId', authenticate, async (req, res) => {
  try {
    const status = await batchOperationsService.getJobStatus(req.params.jobId);
    res.json(status);
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

/**
 * GET /api/batch-operations/download/:jobId
 * Download batch export ZIP
 */
router.get('/download/:jobId', authenticate, async (req, res) => {
  try {
    const filePath = await batchOperationsService.getDownloadFile(req.params.jobId);
    
    res.download(filePath, `batch_export_${req.params.jobId}.zip`, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });

  } catch (error) {
    console.error('Error getting download file:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/batch-operations/cleanup
 * Clean up old jobs (admin only)
 */
router.post('/cleanup', authenticate, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body;
    
    const result = await batchOperationsService.cleanup(olderThanHours * 60 * 60 * 1000);
    
    res.json({
      message: 'Cleanup completed',
      ...result
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup batch jobs' });
  }
});

module.exports = router;
