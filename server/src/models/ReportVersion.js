/**
 * Report Version Model
 * Full audit trail for report versioning
 * 
 * Tracks:
 * - Original report snapshots
 * - Addenda (new information added)
 * - Amendments (corrections to existing content)
 * - Corrections (error fixes)
 */

const mongoose = require('mongoose');

const ReportVersionSchema = new mongoose.Schema({
  // Report Reference
  reportId: { type: String, required: true, index: true },
  studyInstanceUID: { type: String, required: true },
  
  // Version Information
  version: { type: Number, required: true },
  versionType: {
    type: String,
    enum: [
      'original',    // First signed version
      'addendum',    // New information added after signing
      'amendment',   // Correction to existing content
      'correction',  // Error fix (typo, etc.)
      'draft'        // Draft save (not signed)
    ],
    required: true
  },
  
  // Parent Version (for tracking lineage)
  parentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportVersion' },
  parentVersion: Number,
  
  // Full Report Snapshot at this version
  snapshot: {
    // Patient Info
    patientID: String,
    patientName: String,
    
    // Report Content
    clinicalHistory: String,
    technique: String,
    comparison: String,
    findingsText: String,
    impression: String,
    recommendations: String,
    
    // Template Data
    templateId: String,
    templateName: String,
    sections: mongoose.Schema.Types.Mixed,
    
    // Structured Data
    findings: [{
      id: String,
      type: String,
      category: String,
      description: String,
      location: String,
      severity: String,
      clinicalCode: String,
      locationCode: mongoose.Schema.Types.Mixed,
      findingCode: mongoose.Schema.Types.Mixed,
      snomedCode: mongoose.Schema.Types.Mixed,
      severityCode: mongoose.Schema.Types.Mixed
    }],
    measurements: [mongoose.Schema.Types.Mixed],
    annotations: [mongoose.Schema.Types.Mixed],
    keyImages: [mongoose.Schema.Types.Mixed],
    
    // Status at snapshot
    reportStatus: String
  },
  
  // Change Details (for addendum/amendment/correction)
  changeDetails: {
    reason: { type: String, required: true }, // Why the change was made
    summary: String, // Brief summary of changes
    
    // Specific changes (for amendments/corrections)
    fieldsChanged: [String], // Which fields were modified
    
    // Diff information
    diff: {
      clinicalHistory: { old: String, new: String },
      technique: { old: String, new: String },
      findingsText: { old: String, new: String },
      impression: { old: String, new: String },
      recommendations: { old: String, new: String }
    },
    
    // For addenda - the new content added
    addendumContent: String
  },
  
  // Signature Information
  signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signedByName: String,
  signedByCredentials: String,
  signedAt: Date,
  signatureMethod: {
    type: String,
    enum: ['typed', 'drawn', 'certificate'],
    default: 'typed'
  },
  signatureImageUrl: String,
  
  // Content Hash (for integrity verification)
  contentHash: String,
  
  // Attestation (for co-signatures)
  attestations: [{
    attestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attestedByName: String,
    attestedByRole: String, // 'attending', 'supervisor'
    attestedAt: Date,
    attestationType: {
      type: String,
      enum: ['agree', 'reviewed', 'supervised', 'cosigned']
    },
    notes: String
  }],
  
  // Hospital Reference
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  
  // Audit Information
  ipAddress: String,
  userAgent: String
}, {
  timestamps: false, // We manage createdAt manually
  collection: 'report_versions'
});

// Indexes
ReportVersionSchema.index({ reportId: 1, version: -1 });
ReportVersionSchema.index({ reportId: 1, versionType: 1 });
ReportVersionSchema.index({ studyInstanceUID: 1, createdAt: -1 });
ReportVersionSchema.index({ signedBy: 1, createdAt: -1 });
ReportVersionSchema.index({ hospitalId: 1, createdAt: -1 });

// Pre-save hook to generate content hash
ReportVersionSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('snapshot')) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      clinicalHistory: this.snapshot?.clinicalHistory,
      technique: this.snapshot?.technique,
      findingsText: this.snapshot?.findingsText,
      impression: this.snapshot?.impression,
      recommendations: this.snapshot?.recommendations,
      sections: this.snapshot?.sections
    });
    this.contentHash = crypto.createHash('sha256').update(content).digest('hex');
  }
  next();
});

// Static Methods

/**
 * Create original version when report is first signed
 */
ReportVersionSchema.statics.createOriginal = async function(report, signatureData, metadata = {}) {
  const version = new this({
    reportId: report.reportId,
    studyInstanceUID: report.studyInstanceUID,
    version: 1,
    versionType: 'original',
    snapshot: {
      patientID: report.patientID,
      patientName: report.patientName,
      clinicalHistory: report.clinicalHistory,
      technique: report.technique,
      comparison: report.comparison,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations,
      templateId: report.templateId,
      templateName: report.templateName,
      sections: report.sections,
      findings: report.findings,
      measurements: report.measurements,
      annotations: report.annotations,
      keyImages: report.keyImages,
      reportStatus: 'final'
    },
    changeDetails: {
      reason: 'Original signed report'
    },
    signedBy: signatureData.userId,
    signedByName: signatureData.name,
    signedByCredentials: signatureData.credentials,
    signedAt: new Date(),
    signatureMethod: signatureData.method || 'typed',
    signatureImageUrl: signatureData.imageUrl,
    hospitalId: report.hospitalId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });
  
  return version.save();
};

/**
 * Create addendum version
 */
ReportVersionSchema.statics.createAddendum = async function(report, addendumContent, signatureData, metadata = {}) {
  // Get latest version number
  const latestVersion = await this.findOne({ reportId: report.reportId })
    .sort({ version: -1 })
    .select('version');
  
  const newVersionNum = (latestVersion?.version || 0) + 1;
  
  const version = new this({
    reportId: report.reportId,
    studyInstanceUID: report.studyInstanceUID,
    version: newVersionNum,
    versionType: 'addendum',
    parentVersionId: latestVersion?._id,
    parentVersion: latestVersion?.version,
    snapshot: {
      patientID: report.patientID,
      patientName: report.patientName,
      clinicalHistory: report.clinicalHistory,
      technique: report.technique,
      comparison: report.comparison,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations,
      templateId: report.templateId,
      templateName: report.templateName,
      sections: report.sections,
      findings: report.findings,
      measurements: report.measurements,
      annotations: report.annotations,
      keyImages: report.keyImages,
      reportStatus: 'final'
    },
    changeDetails: {
      reason: addendumContent.reason || 'Additional information',
      summary: 'Addendum added to report',
      addendumContent: addendumContent.content
    },
    signedBy: signatureData.userId,
    signedByName: signatureData.name,
    signedByCredentials: signatureData.credentials,
    signedAt: new Date(),
    signatureMethod: signatureData.method || 'typed',
    signatureImageUrl: signatureData.imageUrl,
    hospitalId: report.hospitalId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });
  
  return version.save();
};

/**
 * Create amendment version
 */
ReportVersionSchema.statics.createAmendment = async function(report, previousSnapshot, amendmentData, signatureData, metadata = {}) {
  // Get latest version number
  const latestVersion = await this.findOne({ reportId: report.reportId })
    .sort({ version: -1 })
    .select('version');
  
  const newVersionNum = (latestVersion?.version || 0) + 1;
  
  // Calculate diff
  const diff = {};
  const fieldsChanged = [];
  
  const fieldsToCompare = ['clinicalHistory', 'technique', 'findingsText', 'impression', 'recommendations'];
  for (const field of fieldsToCompare) {
    if (previousSnapshot[field] !== report[field]) {
      diff[field] = {
        old: previousSnapshot[field] || '',
        new: report[field] || ''
      };
      fieldsChanged.push(field);
    }
  }
  
  const version = new this({
    reportId: report.reportId,
    studyInstanceUID: report.studyInstanceUID,
    version: newVersionNum,
    versionType: 'amendment',
    parentVersionId: latestVersion?._id,
    parentVersion: latestVersion?.version,
    snapshot: {
      patientID: report.patientID,
      patientName: report.patientName,
      clinicalHistory: report.clinicalHistory,
      technique: report.technique,
      comparison: report.comparison,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations,
      templateId: report.templateId,
      templateName: report.templateName,
      sections: report.sections,
      findings: report.findings,
      measurements: report.measurements,
      annotations: report.annotations,
      keyImages: report.keyImages,
      reportStatus: 'amended'
    },
    changeDetails: {
      reason: amendmentData.reason,
      summary: amendmentData.summary || `Amended fields: ${fieldsChanged.join(', ')}`,
      fieldsChanged,
      diff
    },
    signedBy: signatureData.userId,
    signedByName: signatureData.name,
    signedByCredentials: signatureData.credentials,
    signedAt: new Date(),
    signatureMethod: signatureData.method || 'typed',
    signatureImageUrl: signatureData.imageUrl,
    hospitalId: report.hospitalId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });
  
  return version.save();
};

/**
 * Create correction version
 */
ReportVersionSchema.statics.createCorrection = async function(report, previousSnapshot, correctionData, signatureData, metadata = {}) {
  // Get latest version number
  const latestVersion = await this.findOne({ reportId: report.reportId })
    .sort({ version: -1 })
    .select('version');
  
  const newVersionNum = (latestVersion?.version || 0) + 1;
  
  // Calculate diff
  const diff = {};
  const fieldsChanged = [];
  
  const fieldsToCompare = ['clinicalHistory', 'technique', 'findingsText', 'impression', 'recommendations'];
  for (const field of fieldsToCompare) {
    if (previousSnapshot[field] !== report[field]) {
      diff[field] = {
        old: previousSnapshot[field] || '',
        new: report[field] || ''
      };
      fieldsChanged.push(field);
    }
  }
  
  const version = new this({
    reportId: report.reportId,
    studyInstanceUID: report.studyInstanceUID,
    version: newVersionNum,
    versionType: 'correction',
    parentVersionId: latestVersion?._id,
    parentVersion: latestVersion?.version,
    snapshot: {
      patientID: report.patientID,
      patientName: report.patientName,
      clinicalHistory: report.clinicalHistory,
      technique: report.technique,
      comparison: report.comparison,
      findingsText: report.findingsText,
      impression: report.impression,
      recommendations: report.recommendations,
      templateId: report.templateId,
      templateName: report.templateName,
      sections: report.sections,
      findings: report.findings,
      measurements: report.measurements,
      annotations: report.annotations,
      keyImages: report.keyImages,
      reportStatus: 'final'
    },
    changeDetails: {
      reason: correctionData.reason,
      summary: correctionData.summary || `Corrected fields: ${fieldsChanged.join(', ')}`,
      fieldsChanged,
      diff
    },
    signedBy: signatureData.userId,
    signedByName: signatureData.name,
    signedByCredentials: signatureData.credentials,
    signedAt: new Date(),
    signatureMethod: signatureData.method || 'typed',
    signatureImageUrl: signatureData.imageUrl,
    hospitalId: report.hospitalId,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });
  
  return version.save();
};

/**
 * Get version history for a report
 */
ReportVersionSchema.statics.getHistory = function(reportId) {
  return this.find({ reportId })
    .sort({ version: -1 })
    .populate('signedBy', 'name email')
    .populate('attestations.attestedBy', 'name email');
};

/**
 * Get specific version
 */
ReportVersionSchema.statics.getVersion = function(reportId, version) {
  return this.findOne({ reportId, version })
    .populate('signedBy', 'name email')
    .populate('attestations.attestedBy', 'name email');
};

/**
 * Verify content integrity
 */
ReportVersionSchema.methods.verifyIntegrity = function() {
  const crypto = require('crypto');
  const content = JSON.stringify({
    clinicalHistory: this.snapshot?.clinicalHistory,
    technique: this.snapshot?.technique,
    findingsText: this.snapshot?.findingsText,
    impression: this.snapshot?.impression,
    recommendations: this.snapshot?.recommendations,
    sections: this.snapshot?.sections
  });
  const calculatedHash = crypto.createHash('sha256').update(content).digest('hex');
  return calculatedHash === this.contentHash;
};

/**
 * Add attestation (co-signature)
 */
ReportVersionSchema.methods.addAttestation = function(attestationData) {
  this.attestations.push({
    attestedBy: attestationData.userId,
    attestedByName: attestationData.name,
    attestedByRole: attestationData.role,
    attestedAt: new Date(),
    attestationType: attestationData.type || 'reviewed',
    notes: attestationData.notes
  });
  return this.save();
};

module.exports = mongoose.model('ReportVersion', ReportVersionSchema);
