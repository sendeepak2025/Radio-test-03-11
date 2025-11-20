const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['rating', 'bug', 'feature', 'general'],
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: function() { return this.type === 'rating'; }
  },
  category: {
    type: String,
    enum: ['ui', 'performance', 'reporting', 'ai', 'templates', 'analytics', 'other'],
    default: 'other'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: String,
  userName: String,
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  status: {
    type: String,
    enum: ['new', 'reviewing', 'planned', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  metadata: {
    browser: String,
    os: String,
    screenSize: String,
    url: String,
    timestamp: Date
  },
  adminNotes: String,
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priority: -1 });
feedbackSchema.index({ type: 1, createdAt: -1 });
feedbackSchema.index({ hospitalId: 1, status: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
