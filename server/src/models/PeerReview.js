const mongoose = require('mongoose');

const peerReviewSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true,
    index: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedByName: String,
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewerName: String,
  status: {
    type: String,
    enum: ['pending', 'in-review', 'approved', 'changes-requested', 'rejected'],
    default: 'pending',
    index: true
  },
  urgency: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine'
  },
  requestNotes: {
    type: String,
    maxlength: 2000
  },
  areasOfConcern: [{
    type: String
  }],
  reviewNotes: {
    type: String,
    maxlength: 5000
  },
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    text: String,
    field: String, // 'findings', 'impression', 'general'
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  suggestions: [{
    field: String,
    originalText: String,
    suggestedText: String,
    reason: String,
    accepted: Boolean
  }],
  decision: {
    type: String,
    enum: ['approved', 'approved-with-changes', 'changes-required', 'rejected']
  },
  reviewedAt: Date,
  completedAt: Date,
  hospitalId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
peerReviewSchema.index({ reportId: 1, status: 1 });
peerReviewSchema.index({ reviewer: 1, status: 1, createdAt: -1 });
peerReviewSchema.index({ requestedBy: 1, createdAt: -1 });
peerReviewSchema.index({ hospitalId: 1, status: 1 });

module.exports = mongoose.model('PeerReview', peerReviewSchema);
