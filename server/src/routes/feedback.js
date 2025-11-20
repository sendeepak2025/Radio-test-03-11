const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/submit', authenticate, async (req, res) => {
  try {
    const {
      type,
      rating,
      category,
      title,
      description,
      metadata
    } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({ 
        error: 'Type, title, and description are required' 
      });
    }

    if (type === 'rating' && (!rating || rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    const feedback = new Feedback({
      type,
      rating,
      category,
      title,
      description,
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      hospitalId: req.user.hospital,
      metadata: {
        ...metadata,
        timestamp: new Date()
      }
    });

    await feedback.save();

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId: feedback._id
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.get('/list', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { 
      status, 
      type, 
      priority, 
      limit = 50, 
      skip = 0 
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email role')
      .populate('resolvedBy', 'name email');

    const total = await Feedback.countDocuments(filter);

    res.json({
      feedbacks,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { status, adminNotes } = req.body;

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    feedback.status = status;
    if (adminNotes) {
      feedback.adminNotes = adminNotes;
    }

    if (status === 'resolved' || status === 'closed') {
      feedback.resolvedAt = new Date();
      feedback.resolvedBy = req.user.userId;
    }

    await feedback.save();

    res.json({ 
      message: 'Feedback status updated',
      feedback 
    });

  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const stats = await Feedback.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          avgRating: [
            { $match: { type: 'rating' } },
            { $group: { _id: null, avg: { $avg: '$rating' } } }
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { type: 1, title: 1, status: 1, createdAt: 1 } }
          ]
        }
      }
    ]);

    res.json(stats[0]);

  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch feedback stats' });
  }
});

module.exports = router;
