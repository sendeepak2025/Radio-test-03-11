/**
 * Comparison Studies API Routes
 * Link prior studies for comparison in reports
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const StructuredReport = require('../models/StructuredReport');
const Study = require('../models/Study');
const auditService = require('../services/audit-service');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/comparison-studies/:patientID
 * Get available prior studies for a patient
 */
router.get('/:patientID', async (req, res) => {
  try {
    const { patientID } = req.params;
    const { modality, excludeStudyUID, limit = 10 } = req.query;

    // Build query for prior studies
    const query = { patientID };
    
    if (modality) {
      query.modality = modality;
    }
    
    if (excludeStudyUID) {
      query.studyInstanceUID = { $ne: excludeStudyUID };
    }

    // Find studies from database
    const studies = await Study.find(query)
      .sort({ studyDate: -1 })
      .limit(parseInt(limit))
      .select('studyInstanceUID studyDate studyDescription modality accessionNumber');

    // Also check for existing reports for these studies
    const studyUIDs = studies.map(s => s.studyInstanceUID);
    const reports = await StructuredReport.find({
      studyInstanceUID: { $in: studyUIDs },
      reportStatus: { $in: ['final', 'amended'] }
    }).select('studyInstanceUID reportId reportDate impression');

    // Create a map of reports by study UID
    const reportMap = {};
    reports.forEach(r => {
      reportMap[r.studyInstanceUID] = {
        reportId: r.reportId,
        reportDate: r.reportDate,
        impression: r.impression?.substring(0, 200) // Truncate for preview
      };
    });

    // Combine study info with report info
    const priorStudies = studies.map(study => ({
      studyInstanceUID: study.studyInstanceUID,
      studyDate: study.studyDate,
      studyDescription: study.studyDescription,
      modality: study.modality,
      accessionNumber: study.accessionNumber,
      hasReport: !!reportMap[study.studyInstanceUID],
      report: reportMap[study.studyInstanceUID] || null
    }));

    res.json({
      success: true,
      patientID,
      count: priorStudies.length,
      priorStudies
    });

  } catch (error) {
    console.error('❌ Error fetching prior studies:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/comparison-studies/suggest/:studyInstanceUID
 * Auto-suggest comparison studies based on current study
 */
router.get('/suggest/:studyInstanceUID', async (req, res) => {
  try {
    const { studyInstanceUID } = req.params;
    const { limit = 5 } = req.query;

    // Get current study info
    const currentStudy = await Study.findOne({ studyInstanceUID });
    
    if (!currentStudy) {
      return res.status(404).json({
        success: false,
        error: 'Study not found'
      });
    }

    // Find similar prior studies
    const query = {
      patientID: currentStudy.patientID,
      studyInstanceUID: { $ne: studyInstanceUID },
      studyDate: { $lt: currentStudy.studyDate || new Date() }
    };

    // Prefer same modality
    const sameModalityStudies = await Study.find({
      ...query,
      modality: currentStudy.modality
    })
      .sort({ studyDate: -1 })
      .limit(parseInt(limit))
      .select('studyInstanceUID studyDate studyDescription modality');

    // Also get studies with different modality if not enough
    let otherModalityStudies = [];
    if (sameModalityStudies.length < limit) {
      otherModalityStudies = await Study.find({
        ...query,
        modality: { $ne: currentStudy.modality }
      })
        .sort({ studyDate: -1 })
        .limit(parseInt(limit) - sameModalityStudies.length)
        .select('studyInstanceUID studyDate studyDescription modality');
    }

    const allStudies = [...sameModalityStudies, ...otherModalityStudies];

    // Get reports for these studies
    const studyUIDs = allStudies.map(s => s.studyInstanceUID);
    const reports = await StructuredReport.find({
      studyInstanceUID: { $in: studyUIDs },
      reportStatus: { $in: ['final', 'amended'] }
    }).select('studyInstanceUID reportId impression');

    const reportMap = {};
    reports.forEach(r => {
      reportMap[r.studyInstanceUID] = {
        reportId: r.reportId,
        impression: r.impression?.substring(0, 200)
      };
    });

    // Score and rank suggestions
    const suggestions = allStudies.map(study => {
      let score = 0;
      
      // Same modality gets higher score
      if (study.modality === currentStudy.modality) score += 10;
      
      // Has report gets higher score
      if (reportMap[study.studyInstanceUID]) score += 5;
      
      // More recent gets higher score (within last year)
      const daysDiff = Math.floor((new Date() - new Date(study.studyDate)) / (1000 * 60 * 60 * 24));
      if (daysDiff < 30) score += 5;
      else if (daysDiff < 90) score += 3;
      else if (daysDiff < 365) score += 1;
      
      // Similar description gets higher score
      if (study.studyDescription && currentStudy.studyDescription) {
        const currentWords = currentStudy.studyDescription.toLowerCase().split(/\s+/);
        const priorWords = study.studyDescription.toLowerCase().split(/\s+/);
        const commonWords = currentWords.filter(w => priorWords.includes(w) && w.length > 3);
        score += commonWords.length * 2;
      }

      return {
        studyInstanceUID: study.studyInstanceUID,
        studyDate: study.studyDate,
        studyDescription: study.studyDescription,
        modality: study.modality,
        hasReport: !!reportMap[study.studyInstanceUID],
        report: reportMap[study.studyInstanceUID] || null,
        relevanceScore: score,
        autoSuggested: true
      };
    });

    // Sort by score
    suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

    res.json({
      success: true,
      currentStudy: {
        studyInstanceUID: currentStudy.studyInstanceUID,
        patientID: currentStudy.patientID,
        modality: currentStudy.modality,
        studyDate: currentStudy.studyDate
      },
      suggestions: suggestions.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('❌ Error suggesting comparison studies:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/comparison-studies/:reportId/add
 * Add comparison study to a report
 */
router.post('/:reportId/add', async (req, res) => {
  try {
    const { reportId } = req.params;
    const {
      studyInstanceUID,
      studyDate,
      studyDescription,
      modality,
      priorReportId,
      comparisonNotes,
      autoSuggested = false
    } = req.body;

    if (!studyInstanceUID) {
      return res.status(400).json({
        success: false,
        error: 'studyInstanceUID is required'
      });
    }

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Initialize comparison studies array if not exists
    if (!report.comparisonStudies) {
      report.comparisonStudies = [];
    }

    // Check if already added
    const existing = report.comparisonStudies.find(
      cs => cs.studyInstanceUID === studyInstanceUID
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'This study is already added as a comparison'
      });
    }

    // Add comparison study
    report.comparisonStudies.push({
      studyInstanceUID,
      studyDate,
      studyDescription,
      modality,
      reportId: priorReportId,
      comparisonNotes,
      selectedByUser: !autoSuggested,
      autoSuggested
    });

    // Update comparison text field if notes provided
    if (comparisonNotes) {
      const existingComparison = report.comparison || '';
      const newComparison = existingComparison 
        ? `${existingComparison}\n\nComparison with ${studyDate || 'prior'} ${modality || ''}: ${comparisonNotes}`
        : `Comparison with ${studyDate || 'prior'} ${modality || ''}: ${comparisonNotes}`;
      report.comparison = newComparison;
    }

    await report.save();

    const userId = req.user.userId || req.user._id;
    
    // Audit log
    await auditService.logAction({
      userId,
      action: 'COMPARISON_STUDY_ADDED',
      resourceType: 'Report',
      resourceId: reportId,
      details: { comparisonStudyUID: studyInstanceUID },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Comparison study added'
    });

  } catch (error) {
    console.error('❌ Error adding comparison study:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/comparison-studies/:reportId/remove/:studyInstanceUID
 * Remove comparison study from a report
 */
router.delete('/:reportId/remove/:studyInstanceUID', async (req, res) => {
  try {
    const { reportId, studyInstanceUID } = req.params;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    if (!report.comparisonStudies || report.comparisonStudies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No comparison studies to remove'
      });
    }

    // Remove the comparison study
    report.comparisonStudies = report.comparisonStudies.filter(
      cs => cs.studyInstanceUID !== studyInstanceUID
    );

    await report.save();

    const userId = req.user.userId || req.user._id;
    
    // Audit log
    await auditService.logAction({
      userId,
      action: 'COMPARISON_STUDY_REMOVED',
      resourceType: 'Report',
      resourceId: reportId,
      details: { comparisonStudyUID: studyInstanceUID },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Comparison study removed'
    });

  } catch (error) {
    console.error('❌ Error removing comparison study:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/comparison-studies/:reportId/prior-report/:priorReportId
 * Get prior report details for side-by-side comparison
 */
router.get('/:reportId/prior-report/:priorReportId', async (req, res) => {
  try {
    const { reportId, priorReportId } = req.params;

    // Get current report
    const currentReport = await StructuredReport.findOne({ reportId })
      .select('reportId patientID clinicalHistory technique findingsText impression recommendations');

    if (!currentReport) {
      return res.status(404).json({
        success: false,
        error: 'Current report not found'
      });
    }

    // Get prior report
    const priorReport = await StructuredReport.findOne({ reportId: priorReportId })
      .select('reportId studyDate modality clinicalHistory technique findingsText impression recommendations');

    if (!priorReport) {
      return res.status(404).json({
        success: false,
        error: 'Prior report not found'
      });
    }

    // Verify same patient
    if (currentReport.patientID !== priorReport.patientID) {
      return res.status(403).json({
        success: false,
        error: 'Reports are for different patients'
      });
    }

    res.json({
      success: true,
      currentReport: {
        reportId: currentReport.reportId,
        clinicalHistory: currentReport.clinicalHistory,
        technique: currentReport.technique,
        findingsText: currentReport.findingsText,
        impression: currentReport.impression,
        recommendations: currentReport.recommendations
      },
      priorReport: {
        reportId: priorReport.reportId,
        studyDate: priorReport.studyDate,
        modality: priorReport.modality,
        clinicalHistory: priorReport.clinicalHistory,
        technique: priorReport.technique,
        findingsText: priorReport.findingsText,
        impression: priorReport.impression,
        recommendations: priorReport.recommendations
      }
    });

  } catch (error) {
    console.error('❌ Error fetching prior report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/comparison-studies/:reportId/notes/:studyInstanceUID
 * Update comparison notes for a study
 */
router.put('/:reportId/notes/:studyInstanceUID', async (req, res) => {
  try {
    const { reportId, studyInstanceUID } = req.params;
    const { comparisonNotes } = req.body;

    const report = await StructuredReport.findOne({ reportId });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Find and update the comparison study
    const compStudy = report.comparisonStudies?.find(
      cs => cs.studyInstanceUID === studyInstanceUID
    );

    if (!compStudy) {
      return res.status(404).json({
        success: false,
        error: 'Comparison study not found'
      });
    }

    compStudy.comparisonNotes = comparisonNotes;

    await report.save();

    res.json({
      success: true,
      report: report.toObject(),
      message: 'Comparison notes updated'
    });

  } catch (error) {
    console.error('❌ Error updating comparison notes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
