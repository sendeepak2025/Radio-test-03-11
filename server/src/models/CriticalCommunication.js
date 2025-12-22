/**
 * Critical Communication Log Model
 * ACR Practice Parameter compliant critical findings communication tracking
 * 
 * Tracks:
 * - Verbal communication attempts
 * - Recipient acknowledgment
 * - Time-stamped communication log
 * - Escalation workflow
 */

const mongoose = require('mongoose');

const CommunicationAttemptSchema = new mongoose.Schema({
  attemptNumber: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  method: { 
    type: String, 
    enum: ['phone', 'page', 'secure_message', 'in_person', 'email', 'fax'],
    required: true 
  },
  recipientName: { type: String, required: true },
  recipientRole: String, // 'attending', 'resident', 'nurse', 'pa', 'np'
  recipientPhone: String,
  recipientEmail: String,
  outcome: { 
    type: String, 
    enum: ['reached', 'voicemail', 'no_answer', 'busy', 'wrong_number', 'callback_requested'],
    required: true 
  },
  notes: String,
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  initiatedByName: String
}, { _id: true });

const AcknowledgmentSchema = new mongoose.Schema({
  acknowledgedAt: { type: Date, required: true },
  acknowledgedBy: { type: String, required: true }, // Name of person who acknowledged
  acknowledgedByRole: String,
  acknowledgedByPhone: String,
  method: { 
    type: String, 
    enum: ['verbal', 'read_back', 'electronic', 'signature'],
    required: true 
  },
  readBackConfirmed: { type: Boolean, default: false }, // ACR requires read-back
  verbatimReadBack: String, // What was read back
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: String,
  notes: String
}, { _id: false });

const EscalationSchema = new mongoose.Schema({
  level: { type: Number, required: true }, // 1, 2, 3...
  escalatedAt: { type: Date, default: Date.now },
  escalatedTo: { type: String, required: true }, // Name/role
  escalatedToPhone: String,
  reason: { 
    type: String, 
    enum: ['no_response', 'unavailable', 'requested', 'severity_upgrade'],
    required: true 
  },
  escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  escalatedByName: String,
  resolved: { type: Boolean, default: false },
  resolvedAt: Date
}, { _id: true });

const CriticalCommunicationSchema = new mongoose.Schema({
  // Report Reference
  reportId: { type: String, required: true, index: true },
  studyInstanceUID: { type: String, required: true, index: true },
  
  // Patient Information (for quick reference)
  patientID: { type: String, required: true },
  patientName: String,
  
  // Finding Details
  finding: {
    description: { type: String, required: true },
    location: String,
    severity: { 
      type: String, 
      enum: ['critical', 'urgent', 'significant'],
      required: true 
    },
    category: String, // 'vascular', 'trauma', 'infection', etc.
    radlexCode: String,
    snomedCode: String
  },
  
  // Communication Status
  status: {
    type: String,
    enum: [
      'pending',           // Not yet communicated
      'in_progress',       // Communication attempts ongoing
      'acknowledged',      // Successfully communicated and acknowledged
      'escalated',         // Escalated to higher level
      'failed',            // All attempts failed
      'closed'             // Administratively closed
    ],
    default: 'pending',
    index: true
  },
  
  // Timing (ACR requires documentation of timing)
  findingIdentifiedAt: { type: Date, required: true },
  firstAttemptAt: Date,
  acknowledgedAt: Date,
  closedAt: Date,
  
  // Time to communication (in minutes)
  timeToFirstAttempt: Number,
  timeToAcknowledgment: Number,
  
  // Communication Attempts
  attempts: [CommunicationAttemptSchema],
  totalAttempts: { type: Number, default: 0 },
  
  // Acknowledgment
  acknowledgment: AcknowledgmentSchema,
  
  // Escalation History
  escalations: [EscalationSchema],
  currentEscalationLevel: { type: Number, default: 0 },
  
  // Intended Recipients (from ordering physician, care team)
  intendedRecipients: [{
    name: String,
    role: String,
    phone: String,
    email: String,
    priority: { type: Number, default: 1 } // 1 = primary, 2 = secondary, etc.
  }],
  
  // Radiologist who identified the finding
  identifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  identifiedByName: String,
  
  // Hospital/Organization
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  
  // Compliance Flags
  compliance: {
    withinTimeLimit: Boolean, // Was communication within required time?
    timeLimitMinutes: Number, // What was the required time limit?
    readBackObtained: Boolean,
    documentationComplete: Boolean
  },
  
  // Notes and Comments
  notes: String,
  
  // Audit Trail
  auditLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    details: mongoose.Schema.Types.Mixed
  }]
}, { 
  timestamps: true,
  collection: 'critical_communications'
});

// Indexes
CriticalCommunicationSchema.index({ status: 1, findingIdentifiedAt: -1 });
CriticalCommunicationSchema.index({ hospitalId: 1, status: 1 });
CriticalCommunicationSchema.index({ patientID: 1, createdAt: -1 });
CriticalCommunicationSchema.index({ 'finding.severity': 1, status: 1 });

// Pre-save hook to calculate timing
CriticalCommunicationSchema.pre('save', function(next) {
  // Calculate time to first attempt
  if (this.firstAttemptAt && this.findingIdentifiedAt) {
    this.timeToFirstAttempt = Math.round(
      (this.firstAttemptAt - this.findingIdentifiedAt) / (1000 * 60)
    );
  }
  
  // Calculate time to acknowledgment
  if (this.acknowledgedAt && this.findingIdentifiedAt) {
    this.timeToAcknowledgment = Math.round(
      (this.acknowledgedAt - this.findingIdentifiedAt) / (1000 * 60)
    );
    
    // Check compliance (default 60 minutes for critical, 4 hours for urgent)
    const timeLimit = this.finding.severity === 'critical' ? 60 : 240;
    this.compliance = this.compliance || {};
    this.compliance.timeLimitMinutes = timeLimit;
    this.compliance.withinTimeLimit = this.timeToAcknowledgment <= timeLimit;
  }
  
  // Update total attempts
  this.totalAttempts = this.attempts?.length || 0;
  
  next();
});

// Instance Methods
CriticalCommunicationSchema.methods.addAttempt = function(attemptData) {
  const attemptNumber = (this.attempts?.length || 0) + 1;
  
  this.attempts.push({
    attemptNumber,
    ...attemptData
  });
  
  if (!this.firstAttemptAt) {
    this.firstAttemptAt = new Date();
  }
  
  if (this.status === 'pending') {
    this.status = 'in_progress';
  }
  
  this.auditLog.push({
    action: 'ATTEMPT_ADDED',
    timestamp: new Date(),
    userId: attemptData.initiatedBy,
    userName: attemptData.initiatedByName,
    details: { attemptNumber, method: attemptData.method, outcome: attemptData.outcome }
  });
  
  return this.save();
};

CriticalCommunicationSchema.methods.recordAcknowledgment = function(ackData) {
  this.acknowledgment = {
    acknowledgedAt: new Date(),
    ...ackData
  };
  
  this.acknowledgedAt = new Date();
  this.status = 'acknowledged';
  
  // Update compliance
  this.compliance = this.compliance || {};
  this.compliance.readBackObtained = ackData.readBackConfirmed || false;
  this.compliance.documentationComplete = true;
  
  this.auditLog.push({
    action: 'ACKNOWLEDGED',
    timestamp: new Date(),
    userId: ackData.recordedBy,
    userName: ackData.recordedByName,
    details: { acknowledgedBy: ackData.acknowledgedBy, method: ackData.method }
  });
  
  return this.save();
};

CriticalCommunicationSchema.methods.escalate = function(escalationData) {
  const level = (this.currentEscalationLevel || 0) + 1;
  
  this.escalations.push({
    level,
    ...escalationData
  });
  
  this.currentEscalationLevel = level;
  this.status = 'escalated';
  
  this.auditLog.push({
    action: 'ESCALATED',
    timestamp: new Date(),
    userId: escalationData.escalatedBy,
    userName: escalationData.escalatedByName,
    details: { level, escalatedTo: escalationData.escalatedTo, reason: escalationData.reason }
  });
  
  return this.save();
};

CriticalCommunicationSchema.methods.close = function(userId, userName, reason) {
  this.status = 'closed';
  this.closedAt = new Date();
  
  this.auditLog.push({
    action: 'CLOSED',
    timestamp: new Date(),
    userId,
    userName,
    details: { reason }
  });
  
  return this.save();
};

// Static Methods
CriticalCommunicationSchema.statics.findPending = function(hospitalId) {
  const query = { status: { $in: ['pending', 'in_progress', 'escalated'] } };
  if (hospitalId) query.hospitalId = hospitalId;
  return this.find(query).sort({ findingIdentifiedAt: 1 });
};

CriticalCommunicationSchema.statics.findOverdue = function(hospitalId) {
  const criticalCutoff = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago
  const urgentCutoff = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago
  
  const query = {
    status: { $in: ['pending', 'in_progress'] },
    $or: [
      { 'finding.severity': 'critical', findingIdentifiedAt: { $lt: criticalCutoff } },
      { 'finding.severity': 'urgent', findingIdentifiedAt: { $lt: urgentCutoff } }
    ]
  };
  
  if (hospitalId) query.hospitalId = hospitalId;
  return this.find(query).sort({ findingIdentifiedAt: 1 });
};

CriticalCommunicationSchema.statics.getComplianceStats = async function(hospitalId, startDate, endDate) {
  const match = {
    status: 'acknowledged',
    acknowledgedAt: { $gte: startDate, $lte: endDate }
  };
  if (hospitalId) match.hospitalId = mongoose.Types.ObjectId(hospitalId);
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$finding.severity',
        total: { $sum: 1 },
        withinTimeLimit: { 
          $sum: { $cond: ['$compliance.withinTimeLimit', 1, 0] } 
        },
        avgTimeToAck: { $avg: '$timeToAcknowledgment' },
        readBackObtained: {
          $sum: { $cond: ['$compliance.readBackObtained', 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('CriticalCommunication', CriticalCommunicationSchema);
