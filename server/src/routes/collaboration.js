/**
 * Collaboration Routes
 * Peer review, consultations, and real-time collaboration
 */

const express = require('express');
const router = express.Router();
const PeerReview = require('../models/PeerReview');
const Consultation = require('../models/Consultation');
const Report = require('../models/Report');
const { authenticate } = require('../middleware/authMiddleware');
const collaborationService = require('../services/collaboration-service');

// ==================== PEER REVIEW ====================

/**
 * POST /api/collaboration/peer-review/request
 * Request peer review for a report
 */
router.post('/peer-review/request', authenticate, async (req, res) => {
  try {
    const {
      reportId,
      reviewerId,
      urgency,
      requestNotes,
      areasOfConcern
    } = req.body;

    // Validate report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check authorization
    if (req.user.hospitalId && report.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create peer review request
    const peerReview = new PeerReview({
      reportId,
      requestedBy: req.user.userId,
      requestedByName: req.user.name,
      reviewer: reviewerId,
      urgency,
      requestNotes,
      areasOfConcern,
      hospitalId: req.user.hospitalId
    });

    await peerReview.save();

    // TODO: Send notification to reviewer
    // collaborationService.notifyUser(reviewerId, 'peer-review-requested', {...});

    res.status(201).json({
      message: 'Peer review requested successfully',
      peerReview
    });

  } catch (error) {
    console.error('Error requesting peer review:', error);
    res.status(500).json({ error: 'Failed to request peer review' });
  }
});

/**
 * GET /api/collaboration/peer-review/my-requests
 * Get peer review requests for current user (as reviewer)
 */
router.get('/peer-review/my-requests', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    const query = { reviewer: req.user.userId };
    if (status) query.status = status;

    const peerReviews = await PeerReview.find(query)
      .populate('reportId', 'accessionNumber studyDescription patientName')
      .populate('requestedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ peerReviews });

  } catch (error) {
    console.error('Error fetching peer review requests:', error);
    res.status(500).json({ error: 'Failed to fetch peer review requests' });
  }
});

/**
 * PATCH /api/collaboration/peer-review/:id/respond
 * Respond to peer review request
 */
router.patch('/peer-review/:id/respond', authenticate, async (req, res) => {
  try {
    const {
      decision,
      reviewNotes,
      comments,
      suggestions
    } = req.body;

    const peerReview = await PeerReview.findById(req.params.id);
    if (!peerReview) {
      return res.status(404).json({ error: 'Peer review not found' });
    }

    // Check if user is the reviewer
    if (peerReview.reviewer.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update review
    peerReview.status = decision === 'approved' ? 'approved' : 'changes-requested';
    peerReview.decision = decision;
    peerReview.reviewNotes = reviewNotes;
    peerReview.reviewedAt = new Date();
    peerReview.completedAt = new Date();

    if (comments) {
      peerReview.comments.push(...comments.map(c => ({
        ...c,
        userId: req.user.userId,
        userName: req.user.name,
        timestamp: new Date()
      })));
    }

    if (suggestions) {
      peerReview.suggestions = suggestions;
    }

    await peerReview.save();

    // TODO: Notify original requester
    // collaborationService.notifyUser(peerReview.requestedBy, 'peer-review-completed', {...});

    res.json({
      message: 'Peer review response submitted',
      peerReview
    });

  } catch (error) {
    console.error('Error responding to peer review:', error);
    res.status(500).json({ error: 'Failed to respond to peer review' });
  }
});

// ==================== CONSULTATIONS ====================

/**
 * POST /api/collaboration/consultation/request
 * Request consultation from specialist
 */
router.post('/consultation/request', authenticate, async (req, res) => {
  try {
    const {
      reportId,
      specialistId,
      specialistType,
      urgency,
      question,
      clinicalContext,
      specificFindings,
      attachedImages,
      measurements
    } = req.body;

    // Validate report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Create consultation request
    const consultation = new Consultation({
      reportId,
      requestedBy: req.user.userId,
      requestedByName: req.user.name,
      specialist: specialistId,
      specialistType,
      urgency,
      question,
      clinicalContext,
      specificFindings,
      attachedImages,
      measurements,
      hospitalId: req.user.hospitalId
    });

    await consultation.save();

    // TODO: Send notification to specialist
    // collaborationService.notifyUser(specialistId, 'consultation-requested', {...});

    res.status(201).json({
      message: 'Consultation requested successfully',
      consultation
    });

  } catch (error) {
    console.error('Error requesting consultation:', error);
    res.status(500).json({ error: 'Failed to request consultation' });
  }
});

/**
 * GET /api/collaboration/consultation/my-requests
 * Get consultation requests for current user (as specialist)
 */
router.get('/consultation/my-requests', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    const query = { specialist: req.user.userId };
    if (status) query.status = status;

    const consultations = await Consultation.find(query)
      .populate('reportId', 'accessionNumber studyDescription patientName')
      .populate('requestedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ consultations });

  } catch (error) {
    console.error('Error fetching consultation requests:', error);
    res.status(500).json({ error: 'Failed to fetch consultation requests' });
  }
});

/**
 * PATCH /api/collaboration/consultation/:id/respond
 * Respond to consultation request
 */
router.patch('/consultation/:id/respond', authenticate, async (req, res) => {
  try {
    const {
      opinion,
      recommendations,
      additionalImaging,
      references
    } = req.body;

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Check if user is the specialist
    if (consultation.specialist.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update consultation
    consultation.status = 'completed';
    consultation.opinion = opinion;
    consultation.recommendations = recommendations;
    consultation.additionalImaging = additionalImaging;
    consultation.references = references;
    consultation.respondedAt = new Date();
    consultation.completedAt = new Date();

    await consultation.save();

    // TODO: Notify original requester
    // collaborationService.notifyUser(consultation.requestedBy, 'consultation-completed', {...});

    res.json({
      message: 'Consultation response submitted',
      consultation
    });

  } catch (error) {
    console.error('Error responding to consultation:', error);
    res.status(500).json({ error: 'Failed to respond to consultation' });
  }
});

// ==================== REAL-TIME STATUS ====================

/**
 * GET /api/collaboration/report/:reportId/active-users
 * Get active users editing a report
 */
router.get('/report/:reportId/active-users', authenticate, async (req, res) => {
  try {
    const activeUsers = collaborationService.getActiveUsers(req.params.reportId);
    res.json({ activeUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
});

module.exports = router;
