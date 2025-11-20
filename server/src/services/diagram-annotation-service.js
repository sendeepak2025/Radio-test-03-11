/**
 * Interactive Anatomical Diagram Annotation System
 * Allows marking, measuring, and annotating anatomical diagrams
 */

const mongoose = require('mongoose');

// Annotation Schema
const DiagramAnnotationSchema = new mongoose.Schema({
  annotationId: {
    type: String,
    required: true,
    unique: true
  },
  reportId: {
    type: String,
    required: true,
    index: true
  },
  diagramType: {
    type: String,
    required: true,
    enum: [
      'chest-anatomy', 'abdomen-organs', 'brain-axial', 'brain-sagittal',
      'spine-lateral', 'spine-coronal', 'pelvis-sagittal', 'extremity-bones',
      'breast-quadrants', 'pulmonary-vessels', 'knee-sagittal', 'multi-region'
    ]
  },
  annotationType: {
    type: String,
    required: true,
    enum: [
      'marker', 'measurement', 'outline', 'arrow', 'text-label',
      'nodule-marker', 'fracture-line', 'disc-level-marker', 'stenosis-grade',
      'herniation-arrow', 'pe-marker', 'mass-marker', 'calcification-marker',
      'clock-position', 'distance-from-nipple', 'angle-measurement',
      'displacement-arrow', 'weight-bearing-line', 'meniscal-tear-marker',
      'ligament-tear-marker', 'cartilage-defect', 'lesion-arrow',
      'region-outline', 'stone-marker', 'organ-marker', 'measurement-caliper',
      'cyst-marker', 'mass-outline', 'midline-shift', 'hemorrhage-marker',
      'lesion-outline', 'nerve-root-marker', 'rv-lv-ratio', 'vessel-measurement'
    ]
  },
  coordinates: {
    type: {
      x: Number,
      y: Number,
      width: Number,  // For outlines/measurements
      height: Number, // For outlines/measurements
      x2: Number,     // For lines/arrows
      y2: Number      // For lines/arrows
    },
    required: true
  },
  label: {
    type: String,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 500
  },
  measurement: {
    value: Number,
    unit: {
      type: String,
      enum: ['mm', 'cm', 'degrees', 'HU', 'percentage']
    }
  },
  severity: {
    type: String,
    enum: ['normal', 'mild', 'moderate', 'severe', 'critical']
  },
  color: {
    type: String,
    default: '#FF0000' // Red default
  },
  linkedFinding: {
    type: String, // Reference to finding in report
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
DiagramAnnotationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const DiagramAnnotation = mongoose.model('DiagramAnnotation', DiagramAnnotationSchema);

// ============================================================================
// ANNOTATION SERVICE
// ============================================================================

class DiagramAnnotationService {
  /**
   * Create a new annotation
   */
  async createAnnotation(annotationData) {
    try {
      const annotationId = `ANN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const annotation = new DiagramAnnotation({
        annotationId,
        ...annotationData
      });

      await annotation.save();

      console.log(`✅ Annotation created: ${annotationId} (${annotationData.annotationType})`);

      return annotation;

    } catch (error) {
      console.error('❌ Error creating annotation:', error);
      throw error;
    }
  }

  /**
   * Get all annotations for a report
   */
  async getAnnotationsForReport(reportId) {
    try {
      const annotations = await DiagramAnnotation.find({ reportId })
        .populate('createdBy', 'username email')
        .sort({ createdAt: 1 });

      return annotations;

    } catch (error) {
      console.error('❌ Error fetching annotations:', error);
      throw error;
    }
  }

  /**
   * Get annotations by diagram type
   */
  async getAnnotationsByDiagram(reportId, diagramType) {
    try {
      const annotations = await DiagramAnnotation.find({
        reportId,
        diagramType
      }).sort({ createdAt: 1 });

      return annotations;

    } catch (error) {
      console.error('❌ Error fetching diagram annotations:', error);
      throw error;
    }
  }

  /**
   * Update annotation
   */
  async updateAnnotation(annotationId, updates) {
    try {
      const annotation = await DiagramAnnotation.findOne({ annotationId });

      if (!annotation) {
        throw new Error('Annotation not found');
      }

      // Update allowed fields
      const allowedFields = ['coordinates', 'label', 'description', 'measurement', 'severity', 'color', 'linkedFinding'];

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          annotation[field] = updates[field];
        }
      });

      await annotation.save();

      console.log(`✅ Annotation updated: ${annotationId}`);

      return annotation;

    } catch (error) {
      console.error('❌ Error updating annotation:', error);
      throw error;
    }
  }

  /**
   * Delete annotation
   */
  async deleteAnnotation(annotationId) {
    try {
      const result = await DiagramAnnotation.deleteOne({ annotationId });

      if (result.deletedCount === 0) {
        throw new Error('Annotation not found');
      }

      console.log(`✅ Annotation deleted: ${annotationId}`);

      return { success: true, message: 'Annotation deleted' };

    } catch (error) {
      console.error('❌ Error deleting annotation:', error);
      throw error;
    }
  }

  /**
   * Calculate measurement between two points
   */
  calculateDistance(x1, y1, x2, y2, pixelsPerMM = 1) {
    const pixels = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const mm = pixels / pixelsPerMM;
    const cm = mm / 10;

    return {
      pixels,
      mm: parseFloat(mm.toFixed(2)),
      cm: parseFloat(cm.toFixed(2))
    };
  }

  /**
   * Calculate angle between three points
   */
  calculateAngle(x1, y1, x2, y2, x3, y3) {
    const angle1 = Math.atan2(y1 - y2, x1 - x2);
    const angle2 = Math.atan2(y3 - y2, x3 - x2);
    let angleDegrees = (angle2 - angle1) * (180 / Math.PI);

    // Normalize to 0-180 range
    angleDegrees = Math.abs(angleDegrees);
    if (angleDegrees > 180) {
      angleDegrees = 360 - angleDegrees;
    }

    return parseFloat(angleDegrees.toFixed(1));
  }

  /**
   * Batch create annotations (for AI auto-annotations)
   */
  async batchCreateAnnotations(reportId, annotationsData, createdBy) {
    try {
      const annotations = await Promise.all(
        annotationsData.map(data =>
          this.createAnnotation({
            reportId,
            createdBy,
            ...data
          })
        )
      );

      console.log(`✅ Batch created ${annotations.length} annotations`);

      return annotations;

    } catch (error) {
      console.error('❌ Error batch creating annotations:', error);
      throw error;
    }
  }

  /**
   * Export annotations to structured format
   */
  async exportAnnotations(reportId) {
    try {
      const annotations = await DiagramAnnotation.find({ reportId });

      const exported = {
        reportId,
        annotationCount: annotations.length,
        annotations: annotations.map(ann => ({
          type: ann.annotationType,
          diagram: ann.diagramType,
          label: ann.label,
          description: ann.description,
          coordinates: ann.coordinates,
          measurement: ann.measurement,
          severity: ann.severity,
          linkedFinding: ann.linkedFinding,
          createdAt: ann.createdAt
        }))
      };

      return exported;

    } catch (error) {
      console.error('❌ Error exporting annotations:', error);
      throw error;
    }
  }

  /**
   * Get annotation statistics
   */
  async getAnnotationStats(reportId) {
    try {
      const annotations = await DiagramAnnotation.find({ reportId });

      const stats = {
        total: annotations.length,
        byType: {},
        byDiagram: {},
        bySeverity: {},
        withMeasurements: 0,
        withLinkedFindings: 0
      };

      annotations.forEach(ann => {
        // By type
        stats.byType[ann.annotationType] = (stats.byType[ann.annotationType] || 0) + 1;

        // By diagram
        stats.byDiagram[ann.diagramType] = (stats.byDiagram[ann.diagramType] || 0) + 1;

        // By severity
        if (ann.severity) {
          stats.bySeverity[ann.severity] = (stats.bySeverity[ann.severity] || 0) + 1;
        }

        // With measurements
        if (ann.measurement && ann.measurement.value) {
          stats.withMeasurements++;
        }

        // With linked findings
        if (ann.linkedFinding) {
          stats.withLinkedFindings++;
        }
      });

      return stats;

    } catch (error) {
      console.error('❌ Error getting annotation stats:', error);
      throw error;
    }
  }
}

module.exports = {
  DiagramAnnotation,
  DiagramAnnotationService: new DiagramAnnotationService()
};
