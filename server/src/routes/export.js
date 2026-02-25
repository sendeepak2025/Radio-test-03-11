const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const directBurnController = require('../controllers/directBurnController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireMFA } = require('../middleware/mfa-middleware');
const { rateLimit } = require('../middleware/session-middleware');

// Track active burn operations to prevent concurrent burns
const activeBurns = new Map();
const activeIsoExports = new Map();
const isoStatusCleanupTimers = new Map();
const ISO_ACTIVE_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes
const ISO_STATUS_RETENTION_MS = 10 * 60 * 1000; // keep final status for UI polling

const getRequestPayload = (req) => (req.method === 'GET' ? req.query || {} : req.body || {});

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
};

const applyNoStoreHeaders = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Vary', 'Authorization, Cookie');
};

const noStoreResponse = (_req, res, next) => {
  applyNoStoreHeaders(res);
  next();
};

const stripConditionalRequestHeaders = (req, _res, next) => {
  // Prevent 304 responses on dynamic export/status endpoints.
  if (req.headers['if-none-match']) {
    delete req.headers['if-none-match'];
  }
  if (req.headers['if-modified-since']) {
    delete req.headers['if-modified-since'];
  }
  next();
};

const clearIsoStatusCleanup = (userId) => {
  const timer = isoStatusCleanupTimers.get(userId);
  if (!timer) return;
  clearTimeout(timer);
  isoStatusCleanupTimers.delete(userId);
};

const scheduleIsoStatusCleanup = (userId, delayMs = ISO_STATUS_RETENTION_MS) => {
  clearIsoStatusCleanup(userId);
  const timer = setTimeout(() => {
    const current = activeIsoExports.get(userId);
    if (current && current.inProgress === false) {
      activeIsoExports.delete(userId);
    }
    isoStatusCleanupTimers.delete(userId);
  }, delayMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  isoStatusCleanupTimers.set(userId, timer);
};

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

// Middleware to prevent concurrent ISO exports per user (except validate-only checks)
const preventConcurrentIsoExports = (req, res, next) => {
  const payload = getRequestPayload(req);
  const validateOnly = toBoolean(payload?.validateOnly, false);
  if (validateOnly) {
    return next();
  }

  const userId = req.user?.id || req.user?.username || 'anonymous';
  const existing = activeIsoExports.get(userId);

  if (existing?.inProgress) {
    return res.status(429).json({
      success: false,
      message:
        'An ISO export is already in progress. Please wait for the current export to finish before starting another.',
      inProgress: true,
    });
  }

  clearIsoStatusCleanup(userId);
  activeIsoExports.set(userId, {
    inProgress: true,
    startTime: Date.now(),
    targetType: payload?.targetType,
    targetId: payload?.targetId || payload?.orthancStudyId,
    orthancStudyId: payload?.orthancStudyId || null,
    phase: 'preparing',
    progress: 5,
    message: 'Initializing ISO export request...',
    updatedAt: new Date().toISOString(),
  });

  req.updateIsoState = (updates = {}) => {
    const current = activeIsoExports.get(userId);
    if (!current) {
      return;
    }

    activeIsoExports.set(userId, {
      ...current,
      ...updates,
      inProgress:
        updates.inProgress !== undefined ? Boolean(updates.inProgress) : current.inProgress !== false,
      updatedAt: new Date().toISOString(),
    });

    const latest = activeIsoExports.get(userId);
    if (latest && latest.inProgress === false) {
      scheduleIsoStatusCleanup(userId);
    }
  };

  let finalized = false;
  const timeoutId = setTimeout(() => {
    const current = activeIsoExports.get(userId);
    if (current?.inProgress) {
      console.warn(`ISO export timeout for user ${userId}`);
      activeIsoExports.set(userId, {
        ...current,
        inProgress: false,
        phase: 'failed',
        message: 'ISO export timed out on server.',
        progress: Math.max(0, Math.min(99, Number(current.progress) || 0)),
        statusCode: 504,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      scheduleIsoStatusCleanup(userId);
    }
  }, ISO_ACTIVE_TIMEOUT_MS);
  if (typeof timeoutId.unref === 'function') {
    timeoutId.unref();
  }

  const finalizeIsoState = (trigger) => {
    if (finalized) return;
    finalized = true;
    clearTimeout(timeoutId);

    const current = activeIsoExports.get(userId);
    if (!current) {
      return;
    }

    const statusCode = Number(res.statusCode) || 0;
    const responseOk = statusCode >= 200 && statusCode < 300;
    const closedEarly = trigger === 'close' && !res.writableEnded;
    const currentPhase = String(current.phase || '').toLowerCase();

    let nextPhase = currentPhase;
    let nextMessage = current.message || '';

    if (closedEarly) {
      nextPhase = 'aborted';
      nextMessage = 'ISO export connection closed before completion.';
    } else if (trigger === 'error') {
      nextPhase = 'failed';
      nextMessage = nextMessage || 'ISO export failed while sending response.';
    } else if (!responseOk) {
      nextPhase = currentPhase === 'failed' ? 'failed' : 'failed';
      nextMessage = nextMessage || `ISO export failed (${statusCode || 'unknown status'}).`;
    } else if (!['failed', 'aborted', 'cancelled'].includes(currentPhase)) {
      nextPhase = 'completed';
      nextMessage = 'ISO export response completed. Check browser downloads.';
    }

    activeIsoExports.set(userId, {
      ...current,
      inProgress: false,
      phase: nextPhase || 'completed',
      message: nextMessage,
      progress:
        nextPhase === 'completed'
          ? 100
          : Math.max(0, Math.min(99, Number(current.progress) || 0)),
      statusCode,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    scheduleIsoStatusCleanup(userId);
  };

  res.on('finish', () => finalizeIsoState('finish'));
  res.on('close', () => finalizeIsoState('close'));
  res.on('error', () => finalizeIsoState('error'));

  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const response = originalJson(data);
    finalizeIsoState('json');
    return response;
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
    activeIsoExports.delete(userId);
    clearIsoStatusCleanup(userId);
    res.json({ success: true, message: 'Active burns and ISO exports cleared' });
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

// Get active ISO export status for current user
router.get(
  '/iso-status',
  authenticate,
  rateLimit({ maxRequests: 60, windowMs: 60000 }),
  stripConditionalRequestHeaders,
  (req, res) => {
    applyNoStoreHeaders(res);
    const userId = req.user?.id || req.user?.username || 'anonymous';
    const iso = activeIsoExports.get(userId) || null;
    res.json({
      success: true,
      inProgress: Boolean(iso?.inProgress),
      iso,
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
// GET /api/export/create-iso?targetType=study&targetId=...&includeImages=true&includeViewer=true
// Direct Orthanc option:
// GET /api/export/create-iso?targetType=orthanc-study&targetId=<orthancStudyId>
// or GET /api/export/create-iso?targetType=study&targetId=<studyUID>&orthancStudyId=<orthancStudyId>
router.get(
  '/create-iso',
  authenticate,
  rateLimit({ maxRequests: 20, windowMs: 300000 }),
  stripConditionalRequestHeaders,
  noStoreResponse,
  preventConcurrentIsoExports,
  directBurnController.createIsoExport
);

// Create ISO image download from DICOM media layout
// POST /api/export/create-iso
// Direct Orthanc option body:
// { "targetType": "orthanc-study", "targetId": "<orthancStudyId>" }
router.post(
  '/create-iso',
  authenticate,
  rateLimit({ maxRequests: 20, windowMs: 300000 }),
  express.json(),
  stripConditionalRequestHeaders,
  noStoreResponse,
  preventConcurrentIsoExports,
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
