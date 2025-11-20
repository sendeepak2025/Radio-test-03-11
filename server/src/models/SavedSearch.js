const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: String,
  query: String,
  filters: {
    modality: String,
    status: [String],
    priority: String,
    radiologistId: String,
    bodyPart: String,
    dateFrom: Date,
    dateTo: Date
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date
}, {
  timestamps: true
});

savedSearchSchema.index({ userId: 1, name: 1 });
savedSearchSchema.index({ isPublic: 1, usageCount: -1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
