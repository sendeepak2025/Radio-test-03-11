/**
 * Analytics Routes
 * Aggregated metrics and statistics
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analytics-service');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { cacheMiddleware } = require('../services/cache-service');

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['admin', 'super_admin']));

/**
 * GET /api/analytics/reports
 * Get report metrics (cached for 5 minutes)
 */
router.get('/reports', cacheMiddleware({ ttl: 300, keyPrefix: 'analytics:reports' }), async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      modality,
      hospitalId
    } = req.query;
    
    // Apply hospital filter for non-super-admins
    const filters = {};
    if (req.user.role !== 'super_admin' && req.user.hospitalId) {
      filters.hospitalId = req.user.hospitalId;
    } else if (hospitalId) {
      filters.hospitalId = hospitalId;
    }
    
    if (modality) filters.modality = modality;
    
    const metrics = await analyticsService.getReportMetrics(
      startDate,
      endDate,
      filters
    );
    
    res.json({
      success: true,
      data: metrics,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting report metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/users
 * Get user activity metrics
 */
router.get('/users', async (req, res) => {
  try {
    const {
      userId,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;
    
    const metrics = await analyticsService.getUserActivityMetrics(
      userId,
      startDate,
      endDate
    );
    
    res.json({
      success: true,
      data: metrics,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting user activity metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/templates
 * Get template usage statistics
 */
router.get('/templates', async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;
    
    const stats = await analyticsService.getTemplateUsageStats(
      startDate,
      endDate
    );
    
    res.json({
      success: true,
      data: stats,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting template usage stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/performance
 * Get turnaround time metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const {
      modality,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;
    
    const metrics = await analyticsService.getTurnaroundTimeMetrics(
      modality,
      startDate,
      endDate
    );
    
    res.json({
      success: true,
      data: metrics,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/ai
 * Get AI usage metrics
 */
router.get('/ai', async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;
    
    const metrics = await analyticsService.getAIUsageMetrics(
      startDate,
      endDate
    );
    
    res.json({
      success: true,
      data: metrics,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting AI usage metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/system
 * Get system performance metrics
 */
router.get('/system', async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;
    
    const metrics = await analyticsService.getPerformanceMetrics(
      startDate,
      endDate
    );
    
    res.json({
      success: true,
      data: metrics,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting system performance metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get combined dashboard metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;
    
    // Apply hospital filter for non-super-admins
    const filters = {};
    if (req.user.role !== 'super_admin' && req.user.hospitalId) {
      filters.hospitalId = req.user.hospitalId;
    }
    
    // Get all metrics in parallel
    const [
      reportMetrics,
      userMetrics,
      templateStats,
      performanceMetrics,
      aiMetrics
    ] = await Promise.all([
      analyticsService.getReportMetrics(startDate, endDate, filters),
      analyticsService.getUserActivityMetrics(null, startDate, endDate),
      analyticsService.getTemplateUsageStats(startDate, endDate),
      analyticsService.getTurnaroundTimeMetrics(null, startDate, endDate),
      analyticsService.getAIUsageMetrics(startDate, endDate)
    ]);
    
    res.json({
      success: true,
      data: {
        reports: reportMetrics,
        users: userMetrics,
        templates: templateStats,
        performance: performanceMetrics,
        ai: aiMetrics
      },
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
