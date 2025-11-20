/**
 * Telemetry Event Model
 * Tracks user actions and system events for analytics
 */

const mongoose = require('mongoose');

const telemetryEventSchema = new mongoose.Schema({
  // Event identification
  eventType: {
    type: String,
    required: true,
    index: true,
    enum: [
      // Report events
      'report.created',
      'report.updated',
      'report.signed',
      'report.exported',
      'report.deleted',
      
      // Template events
      'template.selected',
      'template.created',
      'template.updated',
      
      // AI events
      'ai.analyze',
      'ai.suggestion.applied',
      'ai.impression.generated',
      'ai.critical.detected',
      
      // Follow-up events
      'followup.created',
      'followup.scheduled',
      'followup.completed',
      
      // User events
      'user.login',
      'user.logout',
      'session.started',
      'session.ended',
      
      // Performance events
      'page.loaded',
      'action.completed',
      'error.occurred',
      
      // Voice dictation events
      'voice.started',
      'voice.stopped',
      'voice.command',
      
      // Other
      'system.event'
    ]
  },
  
  // User context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  userName: String, // Denormalized for faster queries
  userRole: String,
  
  // Session tracking
  sessionId: {
    type: String,
    index: true
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // Event metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Resource references
  resourceType: String, // 'report', 'template', 'followup', etc.
  resourceId: String,
  
  // Performance metrics
  duration: Number, // milliseconds
  
  // Error tracking
  error: {
    message: String,
    stack: String,
    code: String
  },
  
  // Client information
  clientInfo: {
    browser: String,
    os: String,
    device: String,
    screen: String,
    ip: String
  },
  
  // Hospital/Organization
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    index: true
  }
}, {
  timestamps: false, // Use custom timestamp field
  collection: 'telemetry_events'
});

// Indexes for efficient querying
telemetryEventSchema.index({ eventType: 1, timestamp: -1 });
telemetryEventSchema.index({ userId: 1, timestamp: -1 });
telemetryEventSchema.index({ sessionId: 1, timestamp: -1 });
telemetryEventSchema.index({ hospitalId: 1, timestamp: -1 });
telemetryEventSchema.index({ timestamp: -1 }); // For retention cleanup

// TTL Index - Auto-delete events older than 90 days
telemetryEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method: Log event
telemetryEventSchema.statics.logEvent = async function(eventData) {
  try {
    const event = new this(eventData);
    await event.save();
    return event;
  } catch (error) {
    console.error('Failed to log telemetry event:', error);
    return null;
  }
};

// Static method: Batch insert events
telemetryEventSchema.statics.logEventsBatch = async function(events) {
  try {
    return await this.insertMany(events, { ordered: false });
  } catch (error) {
    console.error('Failed to log batch telemetry events:', error);
    return null;
  }
};

// Static method: Get events by type
telemetryEventSchema.statics.getEventsByType = async function(eventType, startDate, endDate, limit = 1000) {
  const query = { eventType };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Static method: Get user activity
telemetryEventSchema.statics.getUserActivity = async function(userId, startDate, endDate) {
  const query = { userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .lean();
};

// Static method: Count events
telemetryEventSchema.statics.countEvents = async function(filter = {}) {
  return this.countDocuments(filter);
};

// Static method: Cleanup old events (manual cleanup beyond TTL)
telemetryEventSchema.statics.cleanupOldEvents = async function(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  console.log(`Cleaned up ${result.deletedCount} old telemetry events`);
  return result;
};

const TelemetryEvent = mongoose.model('TelemetryEvent', telemetryEventSchema);

module.exports = TelemetryEvent;
