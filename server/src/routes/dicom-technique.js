/**
 * DICOM Technique Auto-Population API
 * Extracts technique information from DICOM metadata
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const Study = require('../models/Study');
const Instance = require('../models/Instance');

// All routes require authentication
router.use(authenticate);

/**
 * Modality-specific technique templates
 */
const TECHNIQUE_TEMPLATES = {
  CT: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.sliceThickness) {
        parts.push(`Slice thickness: ${data.sliceThickness} mm`);
      }
      
      if (data.pixelSpacing && data.pixelSpacing.length === 2) {
        parts.push(`Pixel spacing: ${data.pixelSpacing[0].toFixed(2)} x ${data.pixelSpacing[1].toFixed(2)} mm`);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Matrix: ${data.rows} x ${data.columns}`);
      }
      
      if (data.windowCenter && data.windowWidth) {
        const wc = Array.isArray(data.windowCenter) ? data.windowCenter[0] : data.windowCenter;
        const ww = Array.isArray(data.windowWidth) ? data.windowWidth[0] : data.windowWidth;
        parts.push(`Window: C${wc}/W${ww}`);
      }
      
      return parts.length > 0 
        ? `CT examination performed. ${parts.join('. ')}.`
        : 'CT examination performed with standard protocol.';
    }
  },
  
  MR: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.sliceThickness) {
        parts.push(`Slice thickness: ${data.sliceThickness} mm`);
      }
      
      if (data.pixelSpacing && data.pixelSpacing.length === 2) {
        parts.push(`In-plane resolution: ${data.pixelSpacing[0].toFixed(2)} x ${data.pixelSpacing[1].toFixed(2)} mm`);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Matrix: ${data.rows} x ${data.columns}`);
      }
      
      return parts.length > 0
        ? `MRI examination performed. ${parts.join('. ')}.`
        : 'MRI examination performed with standard protocol.';
    }
  },
  
  CR: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Image size: ${data.rows} x ${data.columns} pixels`);
      }
      
      if (data.pixelSpacing && data.pixelSpacing.length === 2) {
        parts.push(`Pixel spacing: ${data.pixelSpacing[0].toFixed(3)} x ${data.pixelSpacing[1].toFixed(3)} mm`);
      }
      
      return parts.length > 0
        ? `Computed radiography examination. ${parts.join('. ')}.`
        : 'Computed radiography examination performed.';
    }
  },
  
  DX: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Image size: ${data.rows} x ${data.columns} pixels`);
      }
      
      return parts.length > 0
        ? `Digital radiography examination. ${parts.join('. ')}.`
        : 'Digital radiography examination performed.';
    }
  },
  
  US: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.numberOfFrames && data.numberOfFrames > 1) {
        parts.push(`${data.numberOfFrames} frames acquired`);
      }
      
      return parts.length > 0
        ? `Ultrasound examination. ${parts.join('. ')}.`
        : 'Ultrasound examination performed with standard technique.';
    }
  },
  
  XA: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.numberOfFrames && data.numberOfFrames > 1) {
        parts.push(`${data.numberOfFrames} frames acquired`);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Image size: ${data.rows} x ${data.columns}`);
      }
      
      return parts.length > 0
        ? `X-ray angiography examination. ${parts.join('. ')}.`
        : 'X-ray angiography examination performed.';
    }
  },
  
  NM: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Matrix: ${data.rows} x ${data.columns}`);
      }
      
      return parts.length > 0
        ? `Nuclear medicine examination. ${parts.join('. ')}.`
        : 'Nuclear medicine examination performed with standard protocol.';
    }
  },
  
  PT: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.sliceThickness) {
        parts.push(`Slice thickness: ${data.sliceThickness} mm`);
      }
      
      return parts.length > 0
        ? `PET examination. ${parts.join('. ')}.`
        : 'PET examination performed with standard protocol.';
    }
  },
  
  MG: {
    template: (data) => {
      const parts = [];
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Image size: ${data.rows} x ${data.columns} pixels`);
      }
      
      if (data.pixelSpacing && data.pixelSpacing.length === 2) {
        parts.push(`Pixel spacing: ${data.pixelSpacing[0].toFixed(3)} x ${data.pixelSpacing[1].toFixed(3)} mm`);
      }
      
      return parts.length > 0
        ? `Mammography examination. ${parts.join('. ')}.`
        : 'Mammography examination performed with standard technique.';
    }
  },
  
  // Default template for unknown modalities
  DEFAULT: {
    template: (data) => {
      const parts = [];
      
      if (data.modality) {
        parts.push(`${data.modality} examination`);
      }
      
      if (data.studyDescription) {
        parts.push(data.studyDescription);
      }
      
      if (data.rows && data.columns) {
        parts.push(`Image size: ${data.rows} x ${data.columns}`);
      }
      
      return parts.length > 0
        ? `${parts.join('. ')}.`
        : 'Imaging examination performed with standard protocol.';
    }
  }
};

/**
 * GET /api/dicom-technique/:studyInstanceUID
 * Get auto-generated technique from DICOM metadata
 */
router.get('/:studyInstanceUID', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    
    // Get study info
    const study = await Study.findOne({ studyInstanceUID }).lean();
    
    if (!study) {
      return res.status(404).json({
        success: false,
        error: 'Study not found'
      });
    }
    
    // Get first instance for detailed metadata
    const instance = await Instance.findOne({ studyInstanceUID })
      .sort({ instanceNumber: 1 })
      .lean();
    
    // Combine study and instance metadata
    const metadata = {
      studyInstanceUID,
      modality: study.modality || instance?.modality || 'OT',
      studyDescription: study.studyDescription || '',
      studyDate: study.studyDate,
      studyTime: study.studyTime,
      patientName: study.patientName,
      patientID: study.patientID,
      // Instance-level metadata
      rows: instance?.rows,
      columns: instance?.columns,
      pixelSpacing: instance?.pixelSpacing,
      sliceThickness: instance?.sliceThickness,
      numberOfFrames: instance?.numberOfFrames,
      windowCenter: instance?.windowCenter,
      windowWidth: instance?.windowWidth,
      bitsAllocated: instance?.bitsAllocated,
      bitsStored: instance?.bitsStored,
      photometricInterpretation: instance?.photometricInterpretation,
      acquisitionDate: instance?.acquisitionDate,
      acquisitionTime: instance?.acquisitionTime
    };
    
    // Get modality-specific template
    const modality = metadata.modality?.toUpperCase() || 'DEFAULT';
    const templateConfig = TECHNIQUE_TEMPLATES[modality] || TECHNIQUE_TEMPLATES.DEFAULT;
    
    // Generate technique text
    const technique = templateConfig.template(metadata);
    
    res.json({
      success: true,
      studyInstanceUID,
      modality: metadata.modality,
      technique,
      metadata: {
        studyDescription: metadata.studyDescription,
        studyDate: metadata.studyDate,
        imageSize: metadata.rows && metadata.columns ? `${metadata.rows} x ${metadata.columns}` : null,
        pixelSpacing: metadata.pixelSpacing,
        sliceThickness: metadata.sliceThickness,
        numberOfFrames: metadata.numberOfFrames,
        windowSettings: metadata.windowCenter && metadata.windowWidth ? {
          center: Array.isArray(metadata.windowCenter) ? metadata.windowCenter[0] : metadata.windowCenter,
          width: Array.isArray(metadata.windowWidth) ? metadata.windowWidth[0] : metadata.windowWidth
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating technique:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/dicom-technique/:studyInstanceUID/full
 * Get full DICOM metadata for technique customization
 */
router.get('/:studyInstanceUID/full', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    
    // Get study info
    const study = await Study.findOne({ studyInstanceUID }).lean();
    
    if (!study) {
      return res.status(404).json({
        success: false,
        error: 'Study not found'
      });
    }
    
    // Get all instances for comprehensive metadata
    const instances = await Instance.find({ studyInstanceUID })
      .sort({ seriesInstanceUID: 1, instanceNumber: 1 })
      .lean();
    
    // Group by series
    const seriesMap = new Map();
    
    for (const inst of instances) {
      const seriesUID = inst.seriesInstanceUID;
      
      if (!seriesMap.has(seriesUID)) {
        seriesMap.set(seriesUID, {
          seriesInstanceUID: seriesUID,
          modality: inst.modality,
          seriesDescription: inst.seriesDescription,
          numberOfInstances: 0,
          firstInstance: inst
        });
      }
      
      seriesMap.get(seriesUID).numberOfInstances++;
    }
    
    const series = Array.from(seriesMap.values());
    
    res.json({
      success: true,
      study: {
        studyInstanceUID,
        studyDate: study.studyDate,
        studyTime: study.studyTime,
        studyDescription: study.studyDescription,
        modality: study.modality,
        patientName: study.patientName,
        patientID: study.patientID,
        numberOfSeries: series.length,
        numberOfInstances: instances.length
      },
      series: series.map(s => ({
        seriesInstanceUID: s.seriesInstanceUID,
        modality: s.modality,
        seriesDescription: s.seriesDescription,
        numberOfInstances: s.numberOfInstances,
        imageMetadata: {
          rows: s.firstInstance.rows,
          columns: s.firstInstance.columns,
          pixelSpacing: s.firstInstance.pixelSpacing,
          sliceThickness: s.firstInstance.sliceThickness,
          numberOfFrames: s.firstInstance.numberOfFrames,
          bitsAllocated: s.firstInstance.bitsAllocated,
          photometricInterpretation: s.firstInstance.photometricInterpretation
        }
      })),
      availableTemplates: Object.keys(TECHNIQUE_TEMPLATES).filter(k => k !== 'DEFAULT')
    });
    
  } catch (error) {
    console.error('❌ Error fetching full metadata:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/dicom-technique/generate
 * Generate custom technique text from provided metadata
 */
router.post('/generate', async (req, res) => {
  try {
    const { modality, metadata, customTemplate } = req.body;
    
    if (!modality) {
      return res.status(400).json({
        success: false,
        error: 'Modality is required'
      });
    }
    
    // Use custom template if provided, otherwise use default for modality
    let technique;
    
    if (customTemplate) {
      // Simple template replacement
      technique = customTemplate
        .replace(/{modality}/g, modality)
        .replace(/{studyDescription}/g, metadata?.studyDescription || '')
        .replace(/{rows}/g, metadata?.rows || '')
        .replace(/{columns}/g, metadata?.columns || '')
        .replace(/{sliceThickness}/g, metadata?.sliceThickness || '')
        .replace(/{pixelSpacing}/g, metadata?.pixelSpacing?.join(' x ') || '');
    } else {
      const templateConfig = TECHNIQUE_TEMPLATES[modality.toUpperCase()] || TECHNIQUE_TEMPLATES.DEFAULT;
      technique = templateConfig.template(metadata || {});
    }
    
    res.json({
      success: true,
      technique
    });
    
  } catch (error) {
    console.error('❌ Error generating custom technique:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
