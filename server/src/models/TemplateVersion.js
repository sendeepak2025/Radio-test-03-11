const mongoose = require('mongoose');

const templateVersionSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReportTemplate',
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    min: 1
  },
  name: {
    type: String,
    required: true
  },
  modality: {
    type: String,
    required: true,
    index: true
  },
  bodyPart: String,
  structure: {
    sections: [{
      id: String,
      title: String,
      placeholder: String,
      required: Boolean,
      type: String,
      options: [String],
      subsections: [{
        id: String,
        title: String,
        placeholder: String,
        required: Boolean,
        type: String,
        options: [String]
      }]
    }]
  },
  changeType: {
    type: String,
    enum: ['major', 'minor', 'patch'],
    required: true
  },
  changeDescription: {
    type: String,
    maxlength: 2000
  },
  changeLog: [{
    section: String,
    field: String,
    action: String, // 'added', 'removed', 'modified'
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: String,
  isActive: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  deprecatedAt: Date,
  metadata: {
    totalSections: Number,
    requiredSections: Number,
    optionalSections: Number,
    hasAIAssist: Boolean,
    aiModelVersion: String
  },
  hospitalId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for version queries
templateVersionSchema.index({ templateId: 1, version: -1 });
templateVersionSchema.index({ templateId: 1, isActive: 1 });
templateVersionSchema.index({ hospitalId: 1, modality: 1, createdAt: -1 });
templateVersionSchema.index({ createdBy: 1, createdAt: -1 });

// Unique constraint: one version number per template
templateVersionSchema.index(
  { templateId: 1, version: 1 },
  { unique: true }
);

module.exports = mongoose.model('TemplateVersion', templateVersionSchema);
