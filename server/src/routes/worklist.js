const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const worklistService = require('../services/worklist-service');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/worklist
 * Get worklist items with filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      hasCriticalFindings,
      startDate,
      endDate,
      limit,
      skip
    } = req.query;
    
    const filters = {
      hospitalId: req.user.hospitalId || req.user._id,
      status,
      priority,
      assignedTo,
      hasCriticalFindings: hasCriticalFindings === 'true',
      startDate,
      endDate,
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0
    };
    
    const items = await worklistService.getWorklist(filters);
    
    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Error fetching worklist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch worklist',
      message: error.message
    });
  }
});

/**
 * GET /api/worklist/stats
 * Get worklist statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId || req.user._id;
    const stats = await worklistService.getStatistics(hospitalId);
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching worklist stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/worklist
 * Create worklist item
 */
router.post('/', async (req, res) => {
  try {
    const { studyInstanceUID, priority, assignedTo, scheduledFor } = req.body;
    
    if (!studyInstanceUID) {
      return res.status(400).json({
        success: false,
        error: 'studyInstanceUID is required'
      });
    }
    
    const hospitalId = req.user.hospitalId || req.user._id;
    
    const item = await worklistService.createWorklistItem(studyInstanceUID, {
      hospitalId,
      priority,
      assignedTo,
      scheduledFor
    });
    
    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error creating worklist item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create worklist item',
      message: error.message
    });
  }
});

/**
 * PUT /api/worklist/:studyInstanceUID/status
 * Update worklist item status
 */
router.put('/:studyInstanceUID/status', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }
    
    const item = await worklistService.updateStatus(
      studyInstanceUID,
      status,
      req.user._id
    );
    
    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error updating worklist status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      message: error.message
    });
  }
});

/**
 * PUT /api/worklist/:studyInstanceUID/assign
 * Assign study to radiologist
 */
router.put('/:studyInstanceUID/assign', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    const { userId } = req.body;
    
    const item = await worklistService.assignStudy(
      studyInstanceUID,
      userId || req.user._id
    );
    
    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error assigning study:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign study',
      message: error.message
    });
  }
});

/**
 * PUT /api/worklist/:studyInstanceUID/critical
 * Mark study as critical
 */
router.put('/:studyInstanceUID/critical', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    const { notifiedTo } = req.body;
    
    const item = await worklistService.markCritical(
      studyInstanceUID,
      notifiedTo || []
    );
    
    res.json({
      success: true,
      item
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
 * POST /api/worklist/sync
 * Sync worklist from studies
 */
router.post('/sync', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId || req.user._id;
    const result = await worklistService.syncFromStudies(hospitalId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error syncing worklist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync worklist',
      message: error.message
    });
  }
});

module.exports = router;
