/**
 * Advanced Search Routes
 * Full-text search with Elasticsearch and saved searches
 */

const express = require('express');
const router = express.Router();
const elasticsearchService = require('../services/elasticsearch-service');
const SavedSearch = require('../models/SavedSearch');
const Report = require('../models/Report');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * POST /api/search/reports
 * Advanced report search
 */
router.post('/reports', authenticate, async (req, res) => {
  try {
    const {
      query = '',
      filters = {},
      from = 0,
      size = 20,
      sort = '_score'
    } = req.body;

    // Try Elasticsearch first
    if (elasticsearchService.isConnected) {
      const results = await elasticsearchService.searchReports(
        query,
        filters,
        { from, size, sort }
      );

      return res.json({
        results: results.hits,
        total: results.total,
        maxScore: results.maxScore,
        from,
        size,
        source: 'elasticsearch'
      });
    }

    // Fallback to MongoDB
    const mongoQuery = {};
    
    if (query) {
      mongoQuery.$or = [
        { 'content.findings': new RegExp(query, 'i') },
        { 'content.impression': new RegExp(query, 'i') }
      ];
    }

    if (filters.modality) mongoQuery.modality = filters.modality;
    if (filters.status) {
      mongoQuery.status = Array.isArray(filters.status)
        ? { $in: filters.status }
        : filters.status;
    }
    if (filters.priority) mongoQuery.priority = filters.priority;
    if (filters.radiologistId) mongoQuery.userId = filters.radiologistId;
    if (filters.bodyPart) mongoQuery.bodyPart = new RegExp(filters.bodyPart, 'i');
    
    if (filters.dateFrom || filters.dateTo) {
      mongoQuery.createdAt = {};
      if (filters.dateFrom) mongoQuery.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) mongoQuery.createdAt.$lte = new Date(filters.dateTo);
    }

    const [results, total] = await Promise.all([
      Report.find(mongoQuery)
        .populate('patientId', 'firstName lastName mrn')
        .populate('userId', 'firstName lastName')
        .skip(from)
        .limit(size)
        .sort({ createdAt: -1 }),
      Report.countDocuments(mongoQuery)
    ]);

    res.json({
      results,
      total,
      from,
      size,
      source: 'mongodb'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/search/suggestions
 * Autocomplete suggestions
 */
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { q, field = 'patientName' } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    if (elasticsearchService.isConnected) {
      const suggestions = await elasticsearchService.getSuggestions(q, field);
      return res.json({ suggestions });
    }

    // Fallback: simple MongoDB query
    const regex = new RegExp('^' + q, 'i');
    let suggestions = [];

    if (field === 'patientName') {
      const reports = await Report.find()
        .populate('patientId', 'firstName lastName')
        .limit(10);
      
      suggestions = reports
        .map(r => r.patientId ? `${r.patientId.firstName} ${r.patientId.lastName}` : '')
        .filter(name => regex.test(name))
        .slice(0, 5);
    }

    res.json({ suggestions: [...new Set(suggestions)] });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * GET /api/search/aggregations
 * Get filter aggregations
 */
router.get('/aggregations', authenticate, async (req, res) => {
  try {
    const { q = '' } = req.query;

    if (elasticsearchService.isConnected) {
      const aggs = await elasticsearchService.getAggregations(q);
      return res.json({ aggregations: aggs });
    }

    // Fallback: MongoDB aggregation
    const aggs = await Report.aggregate([
      {
        $facet: {
          modalities: [
            { $group: { _id: '$modality', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          statuses: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          priorities: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    res.json({
      aggregations: {
        modalities: aggs[0].modalities.map(m => ({ key: m._id, doc_count: m.count })),
        statuses: aggs[0].statuses.map(s => ({ key: s._id, doc_count: s.count })),
        priorities: aggs[0].priorities.map(p => ({ key: p._id, doc_count: p.count }))
      }
    });

  } catch (error) {
    console.error('Aggregations error:', error);
    res.status(500).json({ error: 'Failed to get aggregations' });
  }
});

/**
 * POST /api/search/saved
 * Save a search
 */
router.post('/saved', authenticate, async (req, res) => {
  try {
    const { name, description, query, filters, isPublic = false } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Search name is required' });
    }

    const savedSearch = new SavedSearch({
      name,
      description,
      query,
      filters,
      userId: req.user.userId,
      isPublic
    });

    await savedSearch.save();

    res.status(201).json({
      message: 'Search saved',
      savedSearch
    });

  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

/**
 * GET /api/search/saved
 * Get saved searches
 */
router.get('/saved', authenticate, async (req, res) => {
  try {
    const savedSearches = await SavedSearch.find({
      $or: [
        { userId: req.user.userId },
        { isPublic: true }
      ]
    }).sort({ lastUsedAt: -1, createdAt: -1 });

    res.json({ savedSearches });

  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

/**
 * GET /api/search/saved/:id
 * Get specific saved search
 */
router.get('/saved/:id', authenticate, async (req, res) => {
  try {
    const savedSearch = await SavedSearch.findById(req.params.id);

    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    // Check access
    if (savedSearch.userId.toString() !== req.user.userId && !savedSearch.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update usage stats
    savedSearch.usageCount++;
    savedSearch.lastUsedAt = new Date();
    await savedSearch.save();

    res.json({ savedSearch });

  } catch (error) {
    console.error('Error fetching saved search:', error);
    res.status(500).json({ error: 'Failed to fetch saved search' });
  }
});

/**
 * PUT /api/search/saved/:id
 * Update saved search
 */
router.put('/saved/:id', authenticate, async (req, res) => {
  try {
    const savedSearch = await SavedSearch.findById(req.params.id);

    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    // Check ownership
    if (savedSearch.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, query, filters, isPublic } = req.body;

    if (name) savedSearch.name = name;
    if (description !== undefined) savedSearch.description = description;
    if (query !== undefined) savedSearch.query = query;
    if (filters) savedSearch.filters = filters;
    if (isPublic !== undefined) savedSearch.isPublic = isPublic;

    await savedSearch.save();

    res.json({
      message: 'Saved search updated',
      savedSearch
    });

  } catch (error) {
    console.error('Error updating saved search:', error);
    res.status(500).json({ error: 'Failed to update saved search' });
  }
});

/**
 * DELETE /api/search/saved/:id
 * Delete saved search
 */
router.delete('/saved/:id', authenticate, async (req, res) => {
  try {
    const savedSearch = await SavedSearch.findById(req.params.id);

    if (!savedSearch) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    // Check ownership
    if (savedSearch.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await savedSearch.deleteOne();

    res.json({ message: 'Saved search deleted' });

  } catch (error) {
    console.error('Error deleting saved search:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

/**
 * POST /api/search/reindex
 * Reindex all reports (admin only)
 */
router.post('/reindex', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles || !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!elasticsearchService.isConnected) {
      return res.status(503).json({ error: 'Elasticsearch not available' });
    }

    await elasticsearchService.reindexReports();

    res.json({ message: 'Reindexing started' });

  } catch (error) {
    console.error('Reindex error:', error);
    res.status(500).json({ error: 'Reindex failed' });
  }
});

module.exports = router;
