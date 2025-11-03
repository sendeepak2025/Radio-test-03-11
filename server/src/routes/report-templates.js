/**
 * Report Template Management API Routes
 * CRUD operations for report templates
 */

const express = require('express');
const router = express.Router();
const ReportTemplate = require('../models/ReportTemplate');
const templateSelector = require('../services/templateSelector');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * 🧪 Test route
 * GET /api/report-templates/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Report Templates API is working!',
    timestamp: new Date().toISOString()
  });
});

/**
 * 🔍 Get template suggestions for a study
 * POST /api/report-templates/suggest
 */
router.post('/suggest', authenticate, async (req, res) => {
  try {
    const study = req.body;

    console.log('🔍 Getting template suggestions for study:', study);

    const suggestions = await templateSelector.getSuggestions(study);

    res.json({
      success: true,
      suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('❌ Error getting template suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🎯 Auto-select best template for a study
 * POST /api/report-templates/auto-select
 */
router.post('/auto-select', authenticate, async (req, res) => {
  try {
    const study = req.body;

    console.log('🎯 Auto-selecting template for study:', study);

    const result = await templateSelector.selectTemplate(study);

    if (!result.template) {
      return res.status(404).json({
        success: false,
        error: 'No suitable template found',
        matchScore: result.matchScore,
        matchDetails: result.matchDetails
      });
    }

    res.json({
      success: true,
      template: result.template,
      matchScore: result.matchScore,
      matchDetails: result.matchDetails
    });

  } catch (error) {
    console.error('❌ Error auto-selecting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📋 Get all active templates
 * GET /api/report-templates
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, search } = req.query;

    let templates;

    if (search) {
      templates = await templateSelector.searchTemplates(search);
    } else if (category) {
      templates = await templateSelector.getTemplatesByCategory(category);
    } else {
      templates = await ReportTemplate.findActive();
    }

    res.json({
      success: true,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📄 Get template by ID
 * GET /api/report-templates/:templateId
 */
router.get('/:templateId', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await templateSelector.getTemplateById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('❌ Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ➕ Create new template
 * POST /api/report-templates
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const templateData = req.body;

    // Add creator info
    templateData.createdBy = req.user.userId || req.user._id;

    const template = new ReportTemplate(templateData);
    await template.save();

    console.log(`✅ Created template: ${template.name} (${template.templateId})`);

    res.status(201).json({
      success: true,
      template,
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ✏️ Update template
 * PUT /api/report-templates/:templateId
 */
router.put('/:templateId', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    // Add updater info
    updates.updatedBy = req.user.userId || req.user._id;

    const template = await ReportTemplate.findOneAndUpdate(
      { templateId },
      updates,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    console.log(`✅ Updated template: ${template.name} (${template.templateId})`);

    res.json({
      success: true,
      template,
      message: 'Template updated successfully'
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
 * 🗑️ Delete template (soft delete - set inactive)
 * DELETE /api/report-templates/:templateId
 */
router.delete('/:templateId', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await ReportTemplate.findOneAndUpdate(
      { templateId },
      { active: false, updatedBy: req.user.userId || req.user._id },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    console.log(`🗑️  Deactivated template: ${template.name} (${template.templateId})`);

    res.json({
      success: true,
      message: 'Template deactivated successfully'
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
 * ⭐ Rate template
 * POST /api/report-templates/:templateId/rate
 */
router.post('/:templateId/rate', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    await template.addRating(req.user.userId || req.user._id, rating, comment);

    console.log(`⭐ Template ${templateId} rated: ${rating}/5`);

    res.json({
      success: true,
      averageRating: template.averageRating,
      message: 'Rating added successfully'
    });

  } catch (error) {
    console.error('❌ Error rating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📊 Get template statistics
 * GET /api/report-templates/:templateId/stats
 */
router.get('/:templateId/stats', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await ReportTemplate.findOne({ templateId });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const stats = {
      templateId: template.templateId,
      name: template.name,
      timesUsed: template.usageStats.timesUsed,
      lastUsed: template.usageStats.lastUsed,
      averageRating: template.averageRating,
      totalRatings: template.usageStats.userRatings.length,
      averageCompletionTime: template.usageStats.averageCompletionTime
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching template stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📈 Get usage analytics for all templates
 * GET /api/report-templates/analytics/usage
 */
router.get('/analytics/usage', authenticate, async (req, res) => {
  try {
    const templates = await ReportTemplate.find({ active: true })
      .select('templateId name category usageStats.timesUsed usageStats.lastUsed')
      .sort({ 'usageStats.timesUsed': -1 });

    const analytics = {
      totalTemplates: templates.length,
      mostUsed: templates[0],
      leastUsed: templates[templates.length - 1],
      byCategory: {}
    };

    // Group by category
    templates.forEach(t => {
      if (!analytics.byCategory[t.category]) {
        analytics.byCategory[t.category] = {
          count: 0,
          totalUsage: 0
        };
      }
      analytics.byCategory[t.category].count++;
      analytics.byCategory[t.category].totalUsage += t.usageStats.timesUsed;
    });

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
