/**
 * Template Builder/Creator Backend API
 * Allows users to create, edit, and manage custom report templates
 */

const express = require('express');
const router = express.Router();
const ReportTemplate = require('../models/ReportTemplate');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

/**
 * GET /api/templates/builder/presets
 * Get preset module configurations for template builder
 */
router.get('/builder/presets', authenticate, async (req, res) => {
  try {
    const presets = {
      modules: {
        calculator: [
          {
            id: 'birads',
            name: 'BI-RADS Calculator',
            description: 'Breast Imaging Reporting and Data System',
            config: {
              type: 'birads',
              title: 'BI-RADS Assessment',
              criteria: [
                {
                  id: 'composition',
                  label: 'Breast Composition',
                  type: 'select',
                  options: [
                    { value: 'a', label: 'Almost entirely fatty' },
                    { value: 'b', label: 'Scattered fibroglandular' },
                    { value: 'c', label: 'Heterogeneously dense' },
                    { value: 'd', label: 'Extremely dense' }
                  ]
                }
              ],
              result: 'BI-RADS Category: [0-6]'
            }
          },
          {
            id: 'custom',
            name: 'Custom Calculator',
            description: 'Build your own scoring system',
            config: {
              type: 'custom',
              title: 'Custom Assessment',
              criteria: [],
              result: 'Custom Result'
            }
          }
        ],
        measurements: [
          {
            id: 'generic',
            name: 'Generic Measurements',
            description: 'Standard measurement fields',
            config: {
              measurements: [
                { id: 'm1', label: 'Measurement 1', unit: 'mm', value: null },
                { id: 'm2', label: 'Measurement 2', unit: 'mm', value: null },
                { id: 'm3', label: 'Measurement 3', unit: 'mm', value: null }
              ]
            }
          },
          {
            id: 'lesion',
            name: 'Lesion Measurements',
            description: 'Three-dimensional lesion measurements',
            config: {
              measurements: [
                { id: 'ap', label: 'Anteroposterior (AP)', unit: 'mm', value: null },
                { id: 'transverse', label: 'Transverse', unit: 'mm', value: null },
                { id: 'longitudinal', label: 'Longitudinal', unit: 'mm', value: null },
                { id: 'volume', label: 'Volume (calculated)', unit: 'cc', value: null }
              ]
            }
          }
        ],
        checklist: [
          {
            id: 'generic',
            name: 'Generic Checklist',
            description: 'Standard checklist template',
            config: {
              items: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
              statusOptions: ['Normal', 'Abnormal', 'Not Visualized'],
              columns: ['Item', 'Status', 'Findings']
            }
          },
          {
            id: 'systematic_review',
            name: 'Systematic Review',
            description: 'Comprehensive organ/system review',
            config: {
              items: [
                'Structure 1 - normal',
                'Structure 2 - normal',
                'Structure 3 - normal',
                'Structure 4 - normal',
                'Structure 5 - normal'
              ],
              statusOptions: ['Normal', 'Abnormal', 'Degenerative', 'Not Visualized'],
              columns: ['Anatomical Structure', 'Status', 'Additional Findings']
            }
          }
        ],
        diagram: [
          {
            id: 'chest',
            name: 'Chest Diagram',
            description: 'Chest/thorax anatomical diagram',
            config: {
              bodyPart: 'chest',
              view: 'frontal',
              allowedTools: ['point', 'circle', 'arrow', 'ruler'],
              width: 400,
              height: 300
            }
          },
          {
            id: 'abdomen',
            name: 'Abdomen Diagram',
            description: 'Abdominal anatomical diagram',
            config: {
              bodyPart: 'abdomen',
              view: 'frontal',
              allowedTools: ['point', 'circle', 'arrow', 'ruler'],
              width: 400,
              height: 300
            }
          },
          {
            id: 'brain',
            name: 'Brain Diagram',
            description: 'Brain/head anatomical diagram',
            config: {
              bodyPart: 'brain',
              view: 'axial',
              allowedTools: ['point', 'circle', 'arrow', 'freehand'],
              width: 400,
              height: 300
            }
          },
          {
            id: 'spine',
            name: 'Spine Diagram',
            description: 'Spinal column diagram',
            config: {
              bodyPart: 'spine',
              view: 'lateral',
              allowedTools: ['point', 'circle', 'arrow', 'ruler'],
              width: 400,
              height: 300
            }
          },
          {
            id: 'breast',
            name: 'Breast Diagram',
            description: 'Breast anatomy diagram',
            config: {
              bodyPart: 'breast',
              view: 'bilateral',
              allowedTools: ['point', 'circle', 'ruler'],
              width: 400,
              height: 300
            }
          }
        ]
      },
      sections: [
        { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
        { id: 'technique', title: 'Technique', order: 2, required: false, content: '' },
        { id: 'comparison', title: 'Comparison', order: 3, required: false, content: '' },
        { id: 'findings', title: 'Findings', order: 4, required: true, content: '' },
        { id: 'impression', title: 'Impression', order: 5, required: true, content: '' }
      ],
      modalities: ['CT', 'MR', 'MRI', 'US', 'ULTRASOUND', 'XRAY', 'CR', 'DX', 'MG', 'MAMMO', 'PT', 'PET', 'NM'],
      bodyParts: [
        'HEAD', 'BRAIN', 'NECK', 'CHEST', 'THORAX', 'ABDOMEN', 'PELVIS',
        'SPINE', 'C-SPINE', 'T-SPINE', 'L-SPINE',
        'SHOULDER', 'ELBOW', 'HAND', 'WRIST', 'HIP', 'KNEE', 'ANKLE', 'FOOT',
        'BREAST', 'HEART', 'LIVER', 'KIDNEY', 'PROSTATE'
      ],
      procedureTypes: ['diagnostic', 'interventional', 'screening', 'follow-up']
    };

    res.json({ success: true, data: presets });
  } catch (error) {
    console.error('Error fetching builder presets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/templates/builder/create
 * Create a new custom template
 */
router.post('/builder/create', authenticate, requireRole(['admin', 'physician']), async (req, res) => {
  try {
    const {
      templateId,
      name,
      description,
      category,
      matchingCriteria,
      matchingWeights,
      uiModules,
      sections,
      isActive,
      isCustom
    } = req.body;

    // Validation
    if (!templateId || !name) {
      return res.status(400).json({ success: false, error: 'templateId and name are required' });
    }

    // Check for duplicate templateId
    const existing = await ReportTemplate.findOne({ templateId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Template ID already exists' });
    }

    // Create template
    const template = await ReportTemplate.create({
      templateId,
      name,
      description: description || `Custom template: ${name}`,
      category: category || 'custom',
      matchingCriteria: matchingCriteria || {
        modalities: [],
        bodyParts: [],
        keywords: [],
        procedureTypes: []
      },
      matchingWeights: matchingWeights || {
        modalityWeight: 50,
        bodyPartWeight: 40,
        keywordWeight: 5,
        procedureTypeWeight: 5
      },
      uiModules: uiModules || [],
      sections: sections || [
        { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
        { id: 'findings', title: 'Findings', order: 2, required: true, content: '' },
        { id: 'impression', title: 'Impression', order: 3, required: true, content: '' }
      ],
      isActive: isActive !== undefined ? isActive : true,
      isCustom: true, // Mark as custom template
      createdBy: req.user.userId,
      customizableFields: {
        sections: true,
        modules: true,
        matching: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Custom template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating custom template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/templates/builder/:templateId
 * Update an existing custom template
 */
router.put('/builder/:templateId', authenticate, requireRole(['admin', 'physician']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    // Find template
    const template = await ReportTemplate.findOne({ templateId });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Check if user owns this template or is admin
    if (template.createdBy && template.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this template' });
    }

    // Update template
    Object.assign(template, updates);
    template.updatedAt = new Date();
    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/templates/builder/:templateId
 * Delete a custom template
 */
router.delete('/builder/:templateId', authenticate, requireRole(['admin', 'physician']), async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await ReportTemplate.findOne({ templateId });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Check ownership
    if (template.createdBy && template.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this template' });
    }

    await ReportTemplate.deleteOne({ templateId });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/templates/builder/:templateId/duplicate
 * Duplicate an existing template
 */
router.post('/builder/:templateId/duplicate', authenticate, requireRole(['admin', 'physician']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const { newTemplateId, newName } = req.body;

    if (!newTemplateId || !newName) {
      return res.status(400).json({ success: false, error: 'newTemplateId and newName are required' });
    }

    // Find source template
    const sourceTemplate = await ReportTemplate.findOne({ templateId });
    if (!sourceTemplate) {
      return res.status(404).json({ success: false, error: 'Source template not found' });
    }

    // Check if new ID exists
    const existing = await ReportTemplate.findOne({ templateId: newTemplateId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'New template ID already exists' });
    }

    // Create duplicate
    const duplicateData = sourceTemplate.toObject();
    delete duplicateData._id;
    delete duplicateData.__v;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    const duplicate = await ReportTemplate.create({
      ...duplicateData,
      templateId: newTemplateId,
      name: newName,
      description: `Copy of ${sourceTemplate.name}`,
      isCustom: true,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: duplicate
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/templates/builder/my-templates
 * Get templates created by current user
 */
router.get('/builder/my-templates', authenticate, async (req, res) => {
  try {
    const templates = await ReportTemplate.find({
      createdBy: req.user.userId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching user templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
