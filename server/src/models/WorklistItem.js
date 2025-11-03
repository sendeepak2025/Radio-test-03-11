const mongoose = require('mongoose');

const WorklistItemSchema = new mongoose.Schema({
  // Study Reference
  studyInstanceUID: { type: String, required: true, index: true },
  patientID: { type: String, required: true, index: true },
  
  // Workflow Status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'stat'],
    default: 'routine',
    index: true
  },
  
  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  assignedAt: Date,
  
  // Timing
  scheduledFor: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Report Reference
  reportId: String,
  reportStatus: {
    type: String,
    enum: ['none', 'draft', 'finalized'],
    default: 'none'
  },
  
  // Critical Results
  hasCriticalFindings: { type: Boolean, default: false },
  criticalFindingsNotified: { type: Boolean, default: false },
  
  // Notes
  notes: String,
  
  // Hospital Reference
  hospitalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    index: true,
    required: true
  }
}, { timestamps: true });

// Compound indexes for efficient worklist queries
WorklistItemSchema.index({ hospitalId: 1, status: 1, priority: -1, scheduledFor: 1 });
WorklistItemSchema.index({ assignedTo: 1, status: 1, priority: -1 });
WorklistItemSchema.index({ hospitalId: 1, hasCriticalFindings: 1, criticalFindingsNotified: 1 });

module.exports = mongoose.model('WorklistItem', WorklistItemSchema);
