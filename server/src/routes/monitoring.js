/**
 * System Monitoring Routes
 * Production monitoring and health checks
 */

const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoring-service');
const backupService = require('../services/backup-service');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

/**
 * GET /api/monitoring/health
 * Get system health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    
    const statusCode = health.health.status === 'healthy' ? 200 : 
                       health.health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({
      health: { status: 'unhealthy' },
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * Get detailed system metrics (admin only)
 */
router.get('/metrics', authenticate, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const [system, database, cache, application] = await Promise.all([
      monitoringService.getSystemMetrics(),
      monitoringService.getDatabaseMetrics(),
      monitoringService.getCacheMetrics(),
      monitoringService.getApplicationMetrics()
    ]);

    res.json({
      system,
      database,
      cache,
      application
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get system alerts
 */
router.get('/alerts', authenticate, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const alerts = await monitoringService.getAlerts();
    res.json({ alerts });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * POST /api/monitoring/backups/create
 * Create manual backup (admin only)
 */
router.post('/backups/create', authenticate, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const result = await backupService.createBackup('manual');
    res.json(result);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

/**
 * GET /api/monitoring/backups
 * List all backups (admin only)
 */
router.get('/backups', authenticate, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

module.exports = router;
