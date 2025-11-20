/**
 * Telemetry Routes
 * Event ingestion and tracking
 */

const express = require('express');
const router = express.Router();
const TelemetryEvent = require('../models/TelemetryEvent');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/telemetry/events
 * Log a single telemetry event
 */
router.post('/events', async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      userId: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      hospitalId: req.user.hospitalId,
      timestamp: new Date()
    };
    
    const event = await TelemetryEvent.logEvent(eventData);
    
    res.status(201).json({
      success: true,
      eventId: event?._id
    });
  } catch (error) {
    console.error('Error logging telemetry event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/telemetry/events/batch
 * Log multiple telemetry events in batch
 */
router.post('/events/batch', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Events must be an array'
      });
    }
    
    // Enrich events with user context
    const enrichedEvents = events.map(event => ({
      ...event,
      userId: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userRole: req.user.role,
      hospitalId: req.user.hospitalId,
      timestamp: event.timestamp || new Date()
    }));
    
    const result = await TelemetryEvent.logEventsBatch(enrichedEvents);
    
    res.status(201).json({
      success: true,
      count: result?.length || 0
    });
  } catch (error) {
    console.error('Error logging batch telemetry events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/telemetry/events
 * Get telemetry events (admin only)
 */
router.get('/events', async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const {
      eventType,
      userId,
      startDate,
      endDate,
      limit = 100,
      page = 1
    } = req.query;
    
    const query = {};
    
    if (eventType) query.eventType = eventType;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Hospital filtering for non-super-admins
    if (req.user.role !== 'super_admin' && req.user.hospitalId) {
      query.hospitalId = req.user.hospitalId;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [events, total] = await Promise.all([
      TelemetryEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      TelemetryEvent.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting telemetry events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/telemetry/cleanup
 * Cleanup old telemetry events (admin only)
 */
router.delete('/cleanup', async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const { daysToKeep = 90 } = req.body;
    
    const result = await TelemetryEvent.cleanupOldEvents(parseInt(daysToKeep));
    
    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up telemetry events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
