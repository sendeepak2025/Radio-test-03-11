/**
 * Diagram Annotation API Routes
 * RESTful endpoints for creating and managing anatomical diagram annotations
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { DiagramAnnotationService } = require('../services/diagram-annotation-service');

// ============================================================================
// ANNOTATION CRUD
// ============================================================================

/**
 * POST /api/annotations
 * Create a new diagram annotation
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      reportId,
      diagramType,
      annotationType,
      coordinates,
      label,
      description,
      measurement,
      severity,
      color,
      linkedFinding
    } = req.body;

    // Validation
    if (!reportId || !diagramType || !annotationType || !coordinates) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: reportId, diagramType, annotationType, coordinates'
      });
    }

    const annotation = await DiagramAnnotationService.createAnnotation({
      reportId,
      diagramType,
      annotationType,
      coordinates,
      label,
      description,
      measurement,
      severity,
      color,
      linkedFinding,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      annotation,
      message: 'Annotation created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating annotation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/annotations/report/:reportId
 * Get all annotations for a report
 */
router.get('/report/:reportId', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;

    const annotations = await DiagramAnnotationService.getAnnotationsForReport(reportId);

    res.json({
      success: true,
      annotations,
      count: annotations.length
    });

  } catch (error) {
    console.error('❌ Error fetching annotations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/annotations/report/:reportId/diagram/:diagramType
 * Get annotations for a specific diagram type
 */
router.get('/report/:reportId/diagram/:diagramType', authenticate, async (req, res) => {
  try {
    const { reportId, diagramType } = req.params;

    const annotations = await DiagramAnnotationService.getAnnotationsByDiagram(reportId, diagramType);

    res.json({
      success: true,
      diagramType,
      annotations,
      count: annotations.length
    });

  } catch (error) {
    console.error('❌ Error fetching diagram annotations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/annotations/:annotationId
 * Update an annotation
 */
router.put('/:annotationId', authenticate, async (req, res) => {
  try {
    const { annotationId } = req.params;

    const annotation = await DiagramAnnotationService.updateAnnotation(annotationId, req.body);

    res.json({
      success: true,
      annotation,
      message: 'Annotation updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating annotation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/annotations/:annotationId
 * Delete an annotation
 */
router.delete('/:annotationId', authenticate, async (req, res) => {
  try {
    const { annotationId } = req.params;

    await DiagramAnnotationService.deleteAnnotation(annotationId);

    res.json({
      success: true,
      message: 'Annotation deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting annotation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * POST /api/annotations/batch
 * Batch create annotations (for AI auto-annotations)
 */
router.post('/batch', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { reportId, annotations } = req.body;

    if (!reportId || !Array.isArray(annotations) || annotations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: reportId and annotations array required'
      });
    }

    const created = await DiagramAnnotationService.batchCreateAnnotations(
      reportId,
      annotations,
      userId
    );

    res.status(201).json({
      success: true,
      annotations: created,
      count: created.length,
      message: `${created.length} annotations created successfully`
    });

  } catch (error) {
    console.error('❌ Error batch creating annotations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * POST /api/annotations/calculate/distance
 * Calculate distance between two points
 */
router.post('/calculate/distance', authenticate, async (req, res) => {
  try {
    const { x1, y1, x2, y2, pixelsPerMM } = req.body;

    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing coordinates: x1, y1, x2, y2 required'
      });
    }

    const distance = DiagramAnnotationService.calculateDistance(
      x1, y1, x2, y2, pixelsPerMM || 1
    );

    res.json({
      success: true,
      distance
    });

  } catch (error) {
    console.error('❌ Error calculating distance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/annotations/calculate/angle
 * Calculate angle between three points
 */
router.post('/calculate/angle', authenticate, async (req, res) => {
  try {
    const { x1, y1, x2, y2, x3, y3 } = req.body;

    if (x1 === undefined || y1 === undefined || 
        x2 === undefined || y2 === undefined || 
        x3 === undefined || y3 === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing coordinates: x1, y1, x2, y2, x3, y3 required'
      });
    }

    const angle = DiagramAnnotationService.calculateAngle(x1, y1, x2, y2, x3, y3);

    res.json({
      success: true,
      angle: {
        degrees: angle,
        description: angle < 90 ? 'Acute' : angle === 90 ? 'Right' : angle < 180 ? 'Obtuse' : 'Reflex'
      }
    });

  } catch (error) {
    console.error('❌ Error calculating angle:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/annotations/export/:reportId
 * Export annotations to structured format
 */
router.get('/export/:reportId', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;

    const exported = await DiagramAnnotationService.exportAnnotations(reportId);

    res.json({
      success: true,
      data: exported
    });

  } catch (error) {
    console.error('❌ Error exporting annotations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/annotations/stats/:reportId
 * Get annotation statistics for a report
 */
router.get('/stats/:reportId', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;

    const stats = await DiagramAnnotationService.getAnnotationStats(reportId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting annotation stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
