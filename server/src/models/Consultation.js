const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
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
  specialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  specialistName: String,
  specialistType: {
    type: String, // 'neuroradiology', 'musculoskeletal', 'cardiothoracic', etc.
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'declined'],
    default: 'pending',
    index: true
  },
  urgency: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine'
  },
  question: {
    type: String,
    required: true,
    maxlength: 2000
  },
  clinicalContext: {
    type: String,
    maxlength: 1000
  },
  specificFindings: [{
    type: String
  }],
  attachedImages: [{
    seriesInstanceUID: String,
    imageInstanceUID: String,
    description: String
  }],
  measurements: [{
    location: String,
    value: String,
    unit: String
  }],
  opinion: {
    type: String,
    maxlength: 5000
  },
  recommendations: [{
    type: String
  }],
  additionalImaging: [{
    modality: String,
    description: String,
    urgency: String
  }],
  references: [{
    title: String,
    url: String,
    citation: String
  }],
  respondedAt: Date,
  completedAt: Date,
  hospitalId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
consultationSchema.index({ reportId: 1, status: 1 });
consultationSchema.index({ specialist: 1, status: 1, createdAt: -1 });
consultationSchema.index({ requestedBy: 1, createdAt: -1 });
consultationSchema.index({ hospitalId: 1, status: 1 });
consultationSchema.index({ specialistType: 1, status: 1 });

module.exports = mongoose.model('Consultation', consultationSchema);
