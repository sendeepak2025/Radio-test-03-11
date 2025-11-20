/**
 * User Template Creation and Management API
 * Allows radiologists to create, update, and manage custom report templates
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const ReportTemplate = require('../models/ReportTemplate');

// ============================================================================
// TEMPLATE CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/templates/user
 * Get all user-created templates (personal or hospital-wide)
 */
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const hospitalId = req.user.hospitalId;

    // Get user's personal templates + hospital templates
    const templates = await ReportTemplate.find({
      $or: [
        { createdBy: userId, customizable: true },
        { hospitalSpecific: hospitalId, active: true },
        { isDefault: false, createdBy: userId }
      ],
      active: true
    }).sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('❌ Error fetching user templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates/custom
 * Create a new custom template
 */
router.post('/custom', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const hospitalId = req.user.hospitalId;

    const {
      name,
      description,
      category,
      matchingCriteria,
      matchingWeights,
      sections,
      fieldOptions,
      diagramAnnotations,
      aiIntegration,
      priority,
      scope // 'personal' or 'hospital'
    } = req.body;

    // Validation
    if (!name || !category || !matchingCriteria || !sections) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category, matchingCriteria, sections'
      });
    }

    // Generate unique template ID
    const templateId = `TPL-CUSTOM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create template
    const template = new ReportTemplate({
      templateId,
      name,
      description,
      category,
      matchingCriteria,
      matchingWeights: matchingWeights || {
        modalityWeight: 50,
        bodyPartWeight: 30,
        keywordWeight: 5,
        procedureTypeWeight: 15
      },
      sections,
      fields: new Map(Object.entries(req.body.fields || {})),
      fieldOptions: new Map(Object.entries(fieldOptions || {})),
      diagramAnnotations: diagramAnnotations || { enabled: false },
      aiIntegration: aiIntegration || { enabled: false, autoFillFields: [], suggestedFindings: [] },
      priority: priority || 50,
      active: true,
      isDefault: false,
      customizable: true,
      hospitalSpecific: scope === 'hospital' ? hospitalId : null,
      createdBy: userId,
      version: '1.0'
    });

    await template.save();

    console.log(`✅ Custom template created: ${template.name} by user ${userId}`);

    res.status(201).json({
      success: true,
      template,
      message: `Custom template "${name}" created successfully`
    });

  } catch (error) {
    console.error('❌ Error creating custom template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/templates/custom/:templateId
 * Update a custom template
 */
router.put('/custom/:templateId', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user._id;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Authorization: Only creator or admin can update
    if (template.createdBy.toString() !== userId.toString() && 
        !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this template'
      });
    }

    // Prevent editing default templates
    if (template.isDefault) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify default system templates. Clone it to create a custom version.'
      });
    }

    // Update fields
    const updateFields = [
      'name', 'description', 'category', 'matchingCriteria', 'matchingWeights',
      'sections', 'fieldOptions', 'diagramAnnotations', 'aiIntegration', 'priority'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'fieldOptions' && req.body[field]) {
          template[field] = new Map(Object.entries(req.body[field]));
        } else {
          template[field] = req.body[field];
        }
      }
    });

    // Version bump
    const currentVersion = parseFloat(template.version);
    template.version = (currentVersion + 0.1).toFixed(1);

    // Changelog entry
    template.changelog.push({
      version: template.version,
      changes: req.body.changeDescription || 'Template updated',
      changedBy: userId,
      changedAt: new Date()
    });

    template.updatedBy = userId;
    await template.save();

    console.log(`✅ Template updated: ${template.name} (v${template.version})`);

    res.json({
      success: true,
      template,
      message: `Template updated to version ${template.version}`
    });

  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/templates/custom/:templateId
 * Delete (deactivate) a custom template
 */
router.delete('/custom/:templateId', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user._id;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Authorization
    if (template.createdBy.toString() !== userId.toString() && 
        !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this template'
      });
    }

    // Prevent deleting default templates
    if (template.isDefault) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete default system templates'
      });
    }

    // Soft delete
    template.active = false;
    template.updatedBy = userId;
    await template.save();

    console.log(`✅ Template deactivated: ${template.name}`);

    res.json({
      success: true,
      message: `Template "${template.name}" deactivated successfully`
    });

  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates/clone/:templateId
 * Clone an existing template to create a custom version
 */
router.post('/clone/:templateId', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user._id;
    const hospitalId = req.user.hospitalId;

    const original = await ReportTemplate.findOne({ templateId });

    if (!original) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Generate new template ID
    const newTemplateId = `TPL-CLONE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Clone template
    const clonedData = original.toObject();
    delete clonedData._id;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;
    delete clonedData.usageStats;

    const cloned = new ReportTemplate({
      ...clonedData,
      templateId: newTemplateId,
      name: `${original.name} (Copy)`,
      isDefault: false,
      customizable: true,
      createdBy: userId,
      hospitalSpecific: req.body.scope === 'hospital' ? hospitalId : null,
      version: '1.0',
      changelog: [{
        version: '1.0',
        changes: `Cloned from ${original.templateId}`,
        changedBy: userId,
        changedAt: new Date()
      }]
    });

    await cloned.save();

    console.log(`✅ Template cloned: ${original.name} -> ${cloned.name}`);

    res.status(201).json({
      success: true,
      template: cloned,
      message: `Template cloned successfully. You can now customize it.`
    });

  } catch (error) {
    console.error('❌ Error cloning template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// MULTI-REGION TEMPLATE SUPPORT
// ============================================================================

/**
 * POST /api/templates/suggest-multi-region
 * Suggest templates for multi-region studies (e.g., CT Chest+Abdomen)
 */
router.post('/suggest-multi-region', authenticate, async (req, res) => {
  try {
    const { regions } = req.body; // Array of region objects

    if (!Array.isArray(regions) || regions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'regions must be a non-empty array'
      });
    }

    const suggestions = [];

    // Get best template for each region
    for (const region of regions) {
      const result = await templateSelector.selectTemplate(region);
      if (result.template) {
        suggestions.push({
          region: region.bodyPart,
          template: result.template,
          matchScore: result.matchScore,
          matchDetails: result.matchDetails
        });
      }
    }

    // Check if there's a combined template
    const combinedBodyParts = regions.map(r => r.bodyPart).join('+');
    const combinedTemplate = await ReportTemplate.findOne({
      'matchingCriteria.bodyParts': { $all: regions.map(r => r.bodyPart) },
      active: true
    }).sort({ priority: -1 });

    res.json({
      success: true,
      suggestions,
      combinedTemplate: combinedTemplate || null,
      recommendation: combinedTemplate ? 
        'Use combined template for integrated reporting' :
        'Use individual templates for each region'
    });

  } catch (error) {
    console.error('❌ Error suggesting multi-region templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates/create-combined
 * Create a combined template for multi-region studies
 */
router.post('/create-combined', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { templateIds, combinedName } = req.body;

    if (!Array.isArray(templateIds) || templateIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Must combine at least 2 templates'
      });
    }

    // Fetch all templates
    const templates = await ReportTemplate.find({
      templateId: { $in: templateIds },
      active: true
    });

    if (templates.length !== templateIds.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more templates not found'
      });
    }

    // Combine modalities, body parts, keywords
    const combinedModalities = [...new Set(templates.flatMap(t => t.matchingCriteria.modalities))];
    const combinedBodyParts = [...new Set(templates.flatMap(t => t.matchingCriteria.bodyParts))];
    const combinedKeywords = [...new Set(templates.flatMap(t => t.matchingCriteria.keywords))];

    // Merge sections (numbered by region)
    const combinedSections = [];
    let order = 1;

    // Add universal sections first
    combinedSections.push({
      id: 'clinical-indication',
      title: 'Clinical Indication',
      order: order++,
      required: true,
      placeholder: 'Clinical indication for examination'
    });

    combinedSections.push({
      id: 'technique',
      title: 'Technique',
      order: order++,
      required: true,
      placeholder: 'Imaging protocol and technical parameters'
    });

    combinedSections.push({
      id: 'comparison',
      title: 'Comparison',
      order: order++,
      required: false,
      placeholder: 'Prior studies'
    });

    // Add region-specific findings sections
    templates.forEach((template, index) => {
      const regionName = template.name.split(' ')[0]; // e.g., "Chest" from "Chest CT"
      
      combinedSections.push({
        id: `findings-${regionName.toLowerCase()}`,
        title: `Findings - ${regionName}`,
        order: order++,
        required: true,
        placeholder: `Detailed findings for ${regionName}`
      });
    });

    // Add universal impression
    combinedSections.push({
      id: 'impression',
      title: 'Impression',
      order: order++,
      required: true,
      placeholder: 'Summary of all findings'
    });

    // Merge field options
    const combinedFieldOptions = new Map();
    templates.forEach(template => {
      template.fieldOptions.forEach((value, key) => {
        combinedFieldOptions.set(key, value);
      });
    });

    // Create combined template
    const combinedTemplateId = `TPL-COMBINED-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const combinedTemplate = new ReportTemplate({
      templateId: combinedTemplateId,
      name: combinedName || `Combined: ${templates.map(t => t.name).join(' + ')}`,
      description: `Multi-region template combining: ${templates.map(t => t.name).join(', ')}`,
      category: templates[0].category,
      matchingCriteria: {
        modalities: combinedModalities,
        bodyParts: combinedBodyParts,
        keywords: combinedKeywords,
        procedureTypes: ['diagnostic']
      },
      matchingWeights: {
        modalityWeight: 50,
        bodyPartWeight: 35,
        keywordWeight: 5,
        procedureTypeWeight: 10
      },
      sections: combinedSections,
      fields: new Map(),
      fieldOptions: combinedFieldOptions,
      diagramAnnotations: {
        enabled: true,
        diagramType: 'multi-region',
        annotationTypes: ['region-marker', 'measurement', 'lesion-outline']
      },
      aiIntegration: {
        enabled: true,
        autoFillFields: [],
        suggestedFindings: []
      },
      priority: 75,
      active: true,
      isDefault: false,
      customizable: true,
      createdBy: userId,
      version: '1.0'
    });

    await combinedTemplate.save();

    console.log(`✅ Combined template created: ${combinedTemplate.name}`);

    res.status(201).json({
      success: true,
      template: combinedTemplate,
      message: 'Combined template created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating combined template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
