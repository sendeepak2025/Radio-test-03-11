const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const directBurnController = require('../controllers/directBurnController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireMFA } = require('../middleware/mfa-middleware');
const { rateLimit } = require('../middleware/session-middleware');

// Track active burn operations to prevent concurrent burns
const activeBurns = new Map();

// Middleware to prevent concurrent burns per user
const preventConcurrentBurns = (req, res, next) => {
  const userId = req.user?.id || req.user?.username || 'anonymous';
  
  if (activeBurns.has(userId)) {
    return res.status(429).json({
      success: false,
      message: 'A burn operation is already in progress. Please wait for it to complete.',
      inProgress: true,
    });
  }
  
  // Mark burn as active
  activeBurns.set(userId, {
    startTime: Date.now(),
    targetType: req.body?.targetType,
    targetId: req.body?.targetId,
    phase: 'preparing',
    progress: 5,
    message: 'Initializing burn request...',
    updatedAt: new Date().toISOString(),
  });

  req.updateBurnState = (updates = {}) => {
    const current = activeBurns.get(userId);
    if (!current) {
      return;
    }

    activeBurns.set(userId, {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  let cleanedUp = false;
  const timeoutId = setTimeout(() => {
    if (activeBurns.has(userId)) {
      console.warn(`Burn operation timeout for user ${userId}, cleaning up`);
      activeBurns.delete(userId);
    }
  }, 900000); // 15 minutes

  const cleanupBurnState = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearTimeout(timeoutId);
    activeBurns.delete(userId);
  };

  // Ensure cleanup also happens if client disconnects or response closes early
  res.on('finish', cleanupBurnState);
  res.on('close', cleanupBurnState);
  res.on('error', cleanupBurnState);
  
  // Cleanup after response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    cleanupBurnState();
    return originalJson(data);
  };
  
  next();
};

// Clear active burns for a user (for cleanup)
router.post(
  '/clear-burns',
  authenticate,
  express.json(),
  (req, res) => {
    const userId = req.user?.id || req.user?.username || 'anonymous';
    activeBurns.delete(userId);
    res.json({ success: true, message: 'Active burns cleared' });
  }
);

// Get active burn status for current user
router.get(
  '/burn-status',
  authenticate,
  (req, res) => {
    const userId = req.user?.id || req.user?.username || 'anonymous';
    const burn = activeBurns.get(userId) || null;
    res.json({
      success: true,
      inProgress: Boolean(burn),
      burn,
    });
  }
);

// Export patient data with all studies and DICOM files
// GET /api/export/patient/:patientID?includeImages=true&format=zip
// Requirements: 12.1-12.12
router.get(
  '/patient/:patientID',
  rateLimit({ maxRequests: 10, windowMs: 60000 }), // 10 exports per minute
  authenticate,
  exportController.exportPatientData
);

// Export single study data with DICOM files
// GET /api/export/study/:studyUID?includeImages=true&format=zip
// Requirements: 12.1-12.12
router.get(
  '/study/:studyUID',
  rateLimit({ maxRequests: 20, windowMs: 60000 }), // 20 exports per minute
  authenticate,
  exportController.exportStudyData
);

// Export all data (bulk export) - admin only
// GET /api/export/all?includeImages=false
// Requires MFA for sensitive bulk export
// Requirements: 12.1-12.12
router.get(
  '/all',
  rateLimit({ maxRequests: 2, windowMs: 300000 }), // 2 exports per 5 minutes
  authenticate,
  requireMFA(),
  exportController.exportAllData
);

// Build ZIP and attempt direct CD burn (Windows server host)
// POST /api/export/burn
router.post(
  '/burn',
  authenticate,
  rateLimit({ maxRequests: 20, windowMs: 300000 }), // 20 burns per 5 minutes per authenticated user
  preventConcurrentBurns,
  express.json(),
  exportController.burnExportToCD
);

// Check portable viewer availability for direct burn UI
// GET /api/export/viewer-status
router.get(
  '/viewer-status',
  authenticate,
  rateLimit({ maxRequests: 30, windowMs: 60000 }),
  directBurnController.getViewerStatus
);

// Download and install viewer package on server
// POST /api/export/viewer-install
router.post(
  '/viewer-install',
  authenticate,
  rateLimit({ maxRequests: 5, windowMs: 3600000 }),
  express.json(),
  directBurnController.installViewerOnServer
);

// Launch installed portable viewer on server host
// POST /api/export/viewer-run
router.post(
  '/viewer-run',
  authenticate,
  rateLimit({ maxRequests: 20, windowMs: 60000 }),
  express.json(),
  directBurnController.runViewerOnServer
);

// Create ISO image download from DICOM media layout
// POST /api/export/create-iso
router.post(
  '/create-iso',
  authenticate,
  rateLimit({ maxRequests: 20, windowMs: 300000 }),
  express.json(),
  directBurnController.createIsoExport
);

// Direct CD burn without ZIP (Windows server host)
// POST /api/export/direct-burn
router.post(
  '/direct-burn',
  authenticate,
  rateLimit({ maxRequests: 20, windowMs: 300000 }), // 20 burns per 5 minutes per authenticated user
  preventConcurrentBurns,
  express.json(),
  directBurnController.directBurnToCD
);

module.exports = router;
