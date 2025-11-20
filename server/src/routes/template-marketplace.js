/**
 * Template Marketplace Routes
 * Template sharing, version control, and AI generation
 */

const express = require('express');
const router = express.Router();
const ReportTemplate = require('../models/ReportTemplate');
const TemplateVersion = require('../models/TemplateVersion');
const templateAIGenerator = require('../services/template-ai-generator');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// ==================== VERSION CONTROL ====================

/**
 * POST /api/template-marketplace/templates/:id/versions
 * Create new version of existing template
 */
router.post('/templates/:id/versions', authenticate, async (req, res) => {
  try {
    const {
      changeType,
      changeDescription,
      structure
    } = req.body;

    const template = await ReportTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get latest version number
    const latestVersion = await TemplateVersion.findOne({ templateId: template._id })
      .sort({ version: -1 })
      .select('version');

    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Calculate change log by comparing structures
    const changeLog = this.calculateChangeLog(template.structure, structure);

    // Create version
    const version = new TemplateVersion({
      templateId: template._id,
      version: newVersionNumber,
      name: template.name,
      modality: template.modality,
      bodyPart: template.bodyPart,
      structure: structure || template.structure,
      changeType,
      changeDescription,
      changeLog,
      createdBy: req.user.userId,
      createdByName: req.user.name,
      hospitalId: req.user.hospitalId,
      metadata: {
        totalSections: structure?.sections?.length || template.structure?.sections?.length || 0,
        requiredSections: (structure?.sections || template.structure?.sections || []).filter(s => s.required).length,
        optionalSections: (structure?.sections || template.structure?.sections || []).filter(s => !s.required).length,
        hasAIAssist: template.aiAssisted || false
      }
    });

    await version.save();

    // Update template if this is the active version
    if (structure) {
      template.structure = structure;
      template.version = newVersionNumber;
      await template.save();
    }

    res.status(201).json({
      message: 'Template version created',
      version
    });

  } catch (error) {
    console.error('Error creating template version:', error);
    res.status(500).json({ error: 'Failed to create template version' });
  }
});

/**
 * Calculate change log between two template structures
 */
function calculateChangeLog(oldStructure, newStructure) {
  const changeLog = [];
  
  if (!oldStructure || !newStructure) return changeLog;

  const oldSections = oldStructure.sections || [];
  const newSections = newStructure.sections || [];

  // Detect added sections
  newSections.forEach(newSection => {
    const oldSection = oldSections.find(s => s.id === newSection.id);
    if (!oldSection) {
      changeLog.push({
        section: newSection.title,
        action: 'added',
        newValue: newSection
      });
    } else if (JSON.stringify(oldSection) !== JSON.stringify(newSection)) {
      changeLog.push({
        section: newSection.title,
        action: 'modified',
        oldValue: oldSection,
        newValue: newSection
      });
    }
  });

  // Detect removed sections
  oldSections.forEach(oldSection => {
    const newSection = newSections.find(s => s.id === oldSection.id);
    if (!newSection) {
      changeLog.push({
        section: oldSection.title,
        action: 'removed',
        oldValue: oldSection
      });
    }
  });

  return changeLog;
}

/**
 * GET /api/template-marketplace/templates/:id/versions
 * Get version history for template
 */
router.get('/templates/:id/versions', authenticate, async (req, res) => {
  try {
    const versions = await TemplateVersion.find({ templateId: req.params.id })
      .populate('createdBy', 'firstName lastName')
      .sort({ version: -1 })
      .limit(50);

    res.json({ versions });

  } catch (error) {
    console.error('Error fetching template versions:', error);
    res.status(500).json({ error: 'Failed to fetch template versions' });
  }
});

/**
 * GET /api/template-marketplace/templates/:templateId/versions/:versionNumber
 * Get specific version
 */
router.get('/templates/:templateId/versions/:versionNumber', authenticate, async (req, res) => {
  try {
    const version = await TemplateVersion.findOne({
      templateId: req.params.templateId,
      version: parseInt(req.params.versionNumber)
    }).populate('createdBy', 'firstName lastName');

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ version });

  } catch (error) {
    console.error('Error fetching template version:', error);
    res.status(500).json({ error: 'Failed to fetch template version' });
  }
});

/**
 * POST /api/template-marketplace/templates/:templateId/versions/:versionNumber/restore
 * Restore template to specific version
 */
router.post('/templates/:templateId/versions/:versionNumber/restore', authenticate, async (req, res) => {
  try {
    const version = await TemplateVersion.findOne({
      templateId: req.params.templateId,
      version: parseInt(req.params.versionNumber)
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const template = await ReportTemplate.findById(req.params.templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create new version for current state before restoring
    const currentVersion = new TemplateVersion({
      templateId: template._id,
      version: version.version + 1,
      name: template.name,
      modality: template.modality,
      bodyPart: template.bodyPart,
      structure: template.structure,
      changeType: 'major',
      changeDescription: `Restored to version ${version.version}`,
      createdBy: req.user.userId,
      createdByName: req.user.name,
      hospitalId: req.user.hospitalId
    });
    await currentVersion.save();

    // Restore template
    template.structure = version.structure;
    template.version = currentVersion.version;
    await template.save();

    res.json({
      message: `Template restored to version ${version.version}`,
      template
    });

  } catch (error) {
    console.error('Error restoring template version:', error);
    res.status(500).json({ error: 'Failed to restore template version' });
  }
});

/**
 * GET /api/template-marketplace/templates/:templateId/versions/compare
 * Compare two versions
 */
router.get('/templates/:templateId/versions/compare', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;

    const [fromVersion, toVersion] = await Promise.all([
      TemplateVersion.findOne({ templateId: req.params.templateId, version: parseInt(from) }),
      TemplateVersion.findOne({ templateId: req.params.templateId, version: parseInt(to) })
    ]);

    if (!fromVersion || !toVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const diff = calculateChangeLog(fromVersion.structure, toVersion.structure);

    res.json({
      from: fromVersion,
      to: toVersion,
      diff
    });

  } catch (error) {
    console.error('Error comparing template versions:', error);
    res.status(500).json({ error: 'Failed to compare template versions' });
  }
});

// ==================== AI GENERATION ====================

/**
 * POST /api/template-marketplace/generate
 * Generate template using AI
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    const {
      modality,
      bodyPart,
      includeTechnique,
      includeComparison,
      customSections,
      aiEnhanced
    } = req.body;

    if (!modality || !bodyPart) {
      return res.status(400).json({ error: 'Modality and body part are required' });
    }

    const generated = await templateAIGenerator.generateTemplate({
      modality,
      bodyPart,
      includeTechnique,
      includeComparison,
      customSections,
      aiEnhanced
    });

    const validation = templateAIGenerator.validateTemplate(generated);

    res.json({
      template: generated,
      validation
    });

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

/**
 * POST /api/template-marketplace/generate/save
 * Generate and save template
 */
router.post('/generate/save', authenticate, async (req, res) => {
  try {
    const {
      name,
      modality,
      bodyPart,
      includeTechnique,
      includeComparison,
      customSections,
      aiEnhanced
    } = req.body;

    // Generate template
    const generated = await templateAIGenerator.generateTemplate({
      modality,
      bodyPart,
      includeTechnique,
      includeComparison,
      customSections,
      aiEnhanced
    });

    // Create template
    const template = new ReportTemplate({
      name: name || `${modality} ${bodyPart} Template`,
      modality,
      bodyPart,
      structure: { sections: generated.sections },
      createdBy: req.user.userId,
      hospitalId: req.user.hospitalId,
      isActive: true,
      isShared: false,
      version: 1,
      aiAssisted: true,
      metadata: generated.metadata
    });

    await template.save();

    // Create initial version
    const version = new TemplateVersion({
      templateId: template._id,
      version: 1,
      name: template.name,
      modality: template.modality,
      bodyPart: template.bodyPart,
      structure: template.structure,
      changeType: 'major',
      changeDescription: 'Initial AI-generated version',
      createdBy: req.user.userId,
      createdByName: req.user.name,
      isActive: true,
      publishedAt: new Date(),
      hospitalId: req.user.hospitalId,
      metadata: generated.metadata
    });

    await version.save();

    res.status(201).json({
      message: 'AI-generated template created',
      template,
      suggestions: generated.suggestions
    });

  } catch (error) {
    console.error('Error creating AI-generated template:', error);
    res.status(500).json({ error: 'Failed to create AI-generated template' });
  }
});

/**
 * GET /api/template-marketplace/suggestions
 * Get AI suggestions for modality/body part
 */
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { modality, bodyPart } = req.query;

    if (!modality || !bodyPart) {
      return res.status(400).json({ error: 'Modality and body part are required' });
    }

    const suggestions = templateAIGenerator.generateSuggestions(modality, bodyPart);

    res.json({ suggestions });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// ==================== MARKETPLACE ====================

/**
 * GET /api/template-marketplace/marketplace
 * Browse shared templates
 */
router.get('/marketplace', authenticate, async (req, res) => {
  try {
    const {
      modality,
      bodyPart,
      search,
      sort = 'popular',
      page = 1,
      limit = 20
    } = req.query;

    const query = { isShared: true, isActive: true };

    if (modality) query.modality = modality;
    if (bodyPart) query.bodyPart = new RegExp(bodyPart, 'i');
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    let sortCriteria = {};
    switch (sort) {
      case 'popular':
        sortCriteria = { usageCount: -1 };
        break;
      case 'recent':
        sortCriteria = { createdAt: -1 };
        break;
      case 'rating':
        sortCriteria = { 'ratings.average': -1 };
        break;
      default:
        sortCriteria = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [templates, total] = await Promise.all([
      ReportTemplate.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort(sortCriteria)
        .skip(skip)
        .limit(parseInt(limit)),
      ReportTemplate.countDocuments(query)
    ]);

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching marketplace templates:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace templates' });
  }
});

/**
 * POST /api/template-marketplace/templates/:id/clone
 * Clone shared template to your hospital
 */
router.post('/templates/:id/clone', authenticate, async (req, res) => {
  try {
    const sourceTemplate = await ReportTemplate.findById(req.params.id);
    if (!sourceTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!sourceTemplate.isShared) {
      return res.status(403).json({ error: 'Template is not shared' });
    }

    // Create cloned template
    const clonedTemplate = new ReportTemplate({
      name: `${sourceTemplate.name} (Cloned)`,
      modality: sourceTemplate.modality,
      bodyPart: sourceTemplate.bodyPart,
      structure: sourceTemplate.structure,
      createdBy: req.user.userId,
      hospitalId: req.user.hospitalId,
      isActive: true,
      isShared: false,
      version: 1,
      clonedFrom: sourceTemplate._id,
      metadata: sourceTemplate.metadata
    });

    await clonedTemplate.save();

    // Increment usage count of source
    sourceTemplate.usageCount = (sourceTemplate.usageCount || 0) + 1;
    await sourceTemplate.save();

    res.status(201).json({
      message: 'Template cloned successfully',
      template: clonedTemplate
    });

  } catch (error) {
    console.error('Error cloning template:', error);
    res.status(500).json({ error: 'Failed to clone template' });
  }
});

/**
 * POST /api/template-marketplace/templates/:id/share
 * Share template to marketplace
 */
router.post('/templates/:id/share', authenticate, async (req, res) => {
  try {
    const template = await ReportTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check ownership
    if (template.createdBy.toString() !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    template.isShared = true;
    await template.save();

    res.json({
      message: 'Template shared to marketplace',
      template
    });

  } catch (error) {
    console.error('Error sharing template:', error);
    res.status(500).json({ error: 'Failed to share template' });
  }
});

/**
 * POST /api/template-marketplace/templates/:id/unshare
 * Remove template from marketplace
 */
router.post('/templates/:id/unshare', authenticate, async (req, res) => {
  try {
    const template = await ReportTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check ownership
    if (template.createdBy.toString() !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    template.isShared = false;
    await template.save();

    res.json({
      message: 'Template removed from marketplace',
      template
    });

  } catch (error) {
    console.error('Error unsharing template:', error);
    res.status(500).json({ error: 'Failed to unshare template' });
  }
});

module.exports = router;
