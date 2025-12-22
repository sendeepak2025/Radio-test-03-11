/**
 * Terminology API Routes
 * RadLex and SNOMED CT code lookup and auto-coding
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  findAnatomicalCode,
  findFindingCode,
  getSeverityCode,
  getSnomedCode,
  autoCodeFinding,
  searchCodes,
  RADLEX_ANATOMICAL_LOCATIONS,
  RADLEX_FINDINGS
} = require('../data/radlex-codes');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/terminology/search
 * Search for codes by text
 */
router.get('/search', (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }

    let results = searchCodes(q);

    // Filter by type if specified
    if (type === 'anatomical') {
      results = results.filter(r => r.type === 'anatomical');
    } else if (type === 'finding') {
      results = results.filter(r => r.type === 'finding');
    }

    res.json({
      success: true,
      query: q,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('❌ Error searching codes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/terminology/anatomical/:text
 * Get RadLex code for anatomical location
 */
router.get('/anatomical/:text', (req, res) => {
  try {
    const { text } = req.params;

    const code = findAnatomicalCode(text);

    if (!code) {
      return res.json({
        success: true,
        found: false,
        query: text,
        code: null
      });
    }

    res.json({
      success: true,
      found: true,
      query: text,
      code
    });

  } catch (error) {
    console.error('❌ Error finding anatomical code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/terminology/finding/:text
 * Get RadLex code for finding
 */
router.get('/finding/:text', (req, res) => {
  try {
    const { text } = req.params;

    const code = findFindingCode(text);

    if (!code) {
      return res.json({
        success: true,
        found: false,
        query: text,
        code: null
      });
    }

    res.json({
      success: true,
      found: true,
      query: text,
      code
    });

  } catch (error) {
    console.error('❌ Error finding code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/terminology/severity/:level
 * Get SNOMED CT code for severity
 */
router.get('/severity/:level', (req, res) => {
  try {
    const { level } = req.params;

    const code = getSeverityCode(level);

    if (!code) {
      return res.json({
        success: true,
        found: false,
        query: level,
        code: null
      });
    }

    res.json({
      success: true,
      found: true,
      query: level,
      code: {
        system: 'http://snomed.info/sct',
        ...code
      }
    });

  } catch (error) {
    console.error('❌ Error finding severity code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/terminology/auto-code
 * Auto-code a finding with RadLex and SNOMED
 */
router.post('/auto-code', (req, res) => {
  try {
    const { finding } = req.body;

    if (!finding) {
      return res.status(400).json({
        success: false,
        error: 'finding object is required'
      });
    }

    const codedFinding = autoCodeFinding(finding);

    res.json({
      success: true,
      original: finding,
      coded: codedFinding,
      codesFound: {
        location: !!codedFinding.locationCode,
        finding: !!codedFinding.findingCode,
        snomed: !!codedFinding.snomedCode,
        severity: !!codedFinding.severityCode
      }
    });

  } catch (error) {
    console.error('❌ Error auto-coding finding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/terminology/auto-code-batch
 * Auto-code multiple findings
 */
router.post('/auto-code-batch', (req, res) => {
  try {
    const { findings } = req.body;

    if (!findings || !Array.isArray(findings)) {
      return res.status(400).json({
        success: false,
        error: 'findings array is required'
      });
    }

    const codedFindings = findings.map(finding => autoCodeFinding(finding));

    const stats = {
      total: findings.length,
      withLocationCode: codedFindings.filter(f => f.locationCode).length,
      withFindingCode: codedFindings.filter(f => f.findingCode).length,
      withSnomedCode: codedFindings.filter(f => f.snomedCode).length,
      withSeverityCode: codedFindings.filter(f => f.severityCode).length
    };

    res.json({
      success: true,
      findings: codedFindings,
      stats
    });

  } catch (error) {
    console.error('❌ Error auto-coding findings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/terminology/categories
 * Get all available categories
 */
router.get('/categories', (req, res) => {
  try {
    const anatomicalCategories = new Set();
    const findingCategories = new Set();

    for (const data of Object.values(RADLEX_ANATOMICAL_LOCATIONS)) {
      if (data.category) anatomicalCategories.add(data.category);
    }

    for (const data of Object.values(RADLEX_FINDINGS)) {
      if (data.category) findingCategories.add(data.category);
    }

    res.json({
      success: true,
      anatomical: Array.from(anatomicalCategories).sort(),
      findings: Array.from(findingCategories).sort()
    });

  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/terminology/by-category/:category
 * Get all codes in a category
 */
router.get('/by-category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const { type } = req.query;

    const results = [];

    // Search anatomical locations
    if (!type || type === 'anatomical') {
      for (const [code, data] of Object.entries(RADLEX_ANATOMICAL_LOCATIONS)) {
        if (data.category === category) {
          results.push({
            code,
            system: 'RadLex',
            type: 'anatomical',
            ...data
          });
        }
      }
    }

    // Search findings
    if (!type || type === 'finding') {
      for (const [code, data] of Object.entries(RADLEX_FINDINGS)) {
        if (data.category === category) {
          results.push({
            code,
            system: 'RadLex',
            type: 'finding',
            ...data
          });
        }
      }
    }

    res.json({
      success: true,
      category,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('❌ Error fetching by category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
