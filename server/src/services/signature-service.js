const { v4: uuidv4 } = require('uuid');
const DigitalSignature = require('../models/DigitalSignature');
const Report = require('../models/Report');
const User = require('../models/User');
const cryptoService = require('./crypto-service');
const auditService = require('./audit-service');

/**
 * Signature Service for FDA 21 CFR Part 11 Compliant Digital Signatures
 * Handles report signing, verification, and revocation
 */

class SignatureService {
  /**
   * Sign a report with FDA-compliant digital signature
   * @param {string} reportId - Report ID to sign
   * @param {string} userId - User ID of signer
   * @param {string} meaning - Signature meaning (author, reviewer, approver)
   * @param {object} metadata - Additional metadata (IP address, user agent, etc.)
   * @returns {Promise<object>} Digital signature record
   */
  async signReport(reportId, userId, meaning, metadata = {}) {
    try {
      console.log('🔏 Starting report signing process...');
      console.log('📄 Report ID:', reportId);
      console.log('👤 User ID:', userId);
      console.log('📝 Meaning:', meaning);

      // 1. Fetch report data
      const report = await Report.findOne({ reportId });
      if (!report) {
        throw new Error('Report not found');
      }

      // 2. Validate report is ready for signing
      this.validateReportForSigning(report);

      // 3. Fetch user information
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 4. Check if report already has a valid signature with same meaning
      const existingSignature = await DigitalSignature.findOne({
        reportId,
        meaning,
        status: 'valid'
      });

      if (existingSignature) {
        throw new Error(`Report already has a valid ${meaning} signature`);
      }

      // 5. Serialize report for signing
      const reportData = this.serializeReport(report);

      // 6. Generate report hash
      const reportHash = cryptoService.hashData(reportData);
      console.log('🔐 Report hash generated:', reportHash.substring(0, 16) + '...');

      // 7. Generate cryptographic signature
      const signatureHash = cryptoService.generateSignature(reportHash);
      console.log('✅ Cryptographic signature generated');

      // 8. Create signature record with key version
      const signature = new DigitalSignature({
        reportId,
        signerId: userId,
        signerName: user.name || user.username,
        signerRole: user.role || 'radiologist',
        signatureHash,
        algorithm: 'RSA-SHA256',
        keySize: 2048,
        keyVersion: cryptoService.getKeyVersion(), // Store key version for future verification
        timestamp: new Date(),
        meaning,
        status: 'valid',
        metadata: {
          ipAddress: metadata.ipAddress || 'unknown',
          userAgent: metadata.userAgent || 'unknown',
          location: metadata.location,
          deviceId: metadata.deviceId
        },
        reportHash,
        auditTrail: []
      });

      // 9. Save signature
      await signature.save();
      console.log('💾 Signature saved to database');

      // 10. Update report status
      if (meaning === 'author' && report.status === 'draft') {
        report.status = 'preliminary';
      } else if (meaning === 'approver') {
        report.status = 'final';
      }

      // Add signature reference to report
      if (!report.signature) {
        report.signature = {};
      }
      report.signature.signedBy = user.name || user.username;
      report.signature.signedAt = new Date();
      report.signature.credentials = user.credentials || user.role;

      await report.save();
      console.log('📝 Report status updated');

      // 11. Log audit event
      await auditService.logSignature(signature, 'created', userId, metadata.ipAddress);

      console.log('✅ Report signed successfully');
      return signature;
    } catch (error) {
      console.error('❌ Error signing report:', error);
      throw error;
    }
  }

  /**
   * Verify a digital signature
   * @param {string} signatureId - Signature ID to verify
   * @param {string} userId - User ID performing verification
   * @param {string} ipAddress - IP address of verifier
   * @returns {Promise<object>} Verification result
   */
  async verifySignature(signatureId, userId = null, ipAddress = 'unknown') {
    try {
      console.log('🔍 Starting signature verification...');
      console.log('🆔 Signature ID:', signatureId);

      // 1. Fetch signature
      const signature = await DigitalSignature.findById(signatureId);
      if (!signature) {
        throw new Error('Signature not found');
      }

      // 2. Check if signature is revoked
      if (signature.status === 'revoked') {
        console.log('❌ Signature is revoked');
        return {
          valid: false,
          signature,
          reason: 'Signature has been revoked',
          verifiedAt: new Date()
        };
      }

      // 3. Fetch report
      const report = await Report.findOne({ reportId: signature.reportId });
      if (!report) {
        throw new Error('Report not found');
      }

      // 4. Serialize report
      const reportData = this.serializeReport(report);

      // 5. Generate current report hash
      const currentHash = cryptoService.hashData(reportData);

      // 6. Compare with stored hash
      if (currentHash !== signature.reportHash) {
        console.log('⚠️ Report hash mismatch - report may have been modified');
        
        // Mark signature as invalid
        await signature.invalidate(
          userId,
          ipAddress,
          'Report content has been modified after signing'
        );

        return {
          valid: false,
          signature,
          reason: 'Report has been modified after signing',
          verifiedAt: new Date(),
          currentHash,
          originalHash: signature.reportHash
        };
      }

      // 7. Verify cryptographic signature using stored key version
      const isValid = cryptoService.verifySignature(
        currentHash, 
        signature.signatureHash,
        signature.keyVersion // Use the key version that was used to create the signature
      );

      // 8. Log verification attempt
      if (userId) {
        await signature.addVerificationEvent(userId, ipAddress, isValid);
      }

      // 9. Log audit event
      if (userId) {
        await auditService.logSignature(
          signature,
          'verified',
          userId,
          ipAddress,
          isValid ? 'success' : 'failure'
        );
      }

      console.log('🔍 Verification result:', isValid ? '✅ VALID' : '❌ INVALID');

      return {
        valid: isValid,
        signature,
        reportHash: currentHash,
        verifiedAt: new Date(),
        reason: isValid ? 'Signature is valid' : 'Signature verification failed'
      };
    } catch (error) {
      console.error('❌ Error verifying signature:', error);
      throw error;
    }
  }

  /**
   * Revoke a digital signature
   * @param {string} signatureId - Signature ID to revoke
   * @param {string} reason - Reason for revocation
   * @param {string} userId - User ID performing revocation
   * @param {string} ipAddress - IP address of revoker
   * @returns {Promise<object>} Revoked signature
   */
  async revokeSignature(signatureId, reason, userId, ipAddress = 'unknown') {
    try {
      console.log('🚫 Starting signature revocation...');
      console.log('🆔 Signature ID:', signatureId);
      console.log('📝 Reason:', reason);

      // 1. Fetch signature
      const signature = await DigitalSignature.findById(signatureId);
      if (!signature) {
        throw new Error('Signature not found');
      }

      // 2. Check if already revoked
      if (signature.status === 'revoked') {
        throw new Error('Signature is already revoked');
      }

      // 3. Verify user has permission to revoke
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only the signer or an admin can revoke
      if (signature.signerId.toString() !== userId && user.role !== 'admin' && user.role !== 'superadmin') {
        throw new Error('Insufficient permissions to revoke signature');
      }

      // 4. Revoke signature
      await signature.revoke(reason, userId, ipAddress);

      // 5. Update report status
      const report = await Report.findOne({ reportId: signature.reportId });
      if (report) {
        // Revert to previous status
        if (signature.meaning === 'approver') {
          report.status = 'preliminary';
        } else if (signature.meaning === 'author') {
          report.status = 'draft';
        }
        await report.save();
      }

      // 6. Log audit event
      await auditService.logSignature(signature, 'revoked', userId, ipAddress, 'success', reason);

      console.log('✅ Signature revoked successfully');
      return signature;
    } catch (error) {
      console.error('❌ Error revoking signature:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for a report
   * @param {string} reportId - Report ID
   * @returns {Promise<Array>} Audit trail events
   */
  async getAuditTrail(reportId) {
    try {
      const signatures = await DigitalSignature.find({ reportId })
        .sort({ timestamp: -1 })
        .populate('signerId', 'name username email role');

      const auditTrail = [];

      for (const signature of signatures) {
        // Add signature creation event
        auditTrail.push({
          timestamp: signature.timestamp,
          action: 'signature_created',
          user: signature.signerName,
          userId: signature.signerId,
          meaning: signature.meaning,
          status: signature.status,
          details: `Report signed by ${signature.signerName} as ${signature.meaning}`
        });

        // Add all audit events from signature
        for (const event of signature.auditTrail) {
          auditTrail.push({
            timestamp: event.timestamp,
            action: event.action,
            user: event.userId,
            result: event.result,
            details: event.details,
            ipAddress: event.ipAddress
          });
        }
      }

      // Sort by timestamp descending
      auditTrail.sort((a, b) => b.timestamp - a.timestamp);

      return auditTrail;
    } catch (error) {
      console.error('❌ Error getting audit trail:', error);
      throw error;
    }
  }

  /**
   * Validate report is ready for signing
   * @param {object} report - Report object
   * @throws {Error} If report is not ready for signing
   */
  validateReportForSigning(report) {
    // Check report status
    if (report.status === 'cancelled') {
      throw new Error('Cannot sign a cancelled report');
    }

    // Check required fields
    if (!report.findings && !report.findingsText) {
      throw new Error('Report must have findings before signing');
    }

    if (!report.impression) {
      throw new Error('Report must have impression before signing');
    }

    // Check if report is already finalized
    if (report.status === 'final' || report.status === 'finalized') {
      // Allow additional signatures (reviewer, approver) on finalized reports
      console.log('⚠️ Report is already finalized, adding additional signature');
    }

    console.log('✅ Report validation passed');
  }

  /**
   * Serialize report for signing
   * Creates a canonical string representation of report data
   * @param {object} report - Report object
   * @returns {string} Serialized report data
   */
  serializeReport(report) {
    // Create a deterministic representation of the report
    const reportData = {
      reportId: report.reportId,
      studyInstanceUID: report.studyInstanceUID,
      patientID: report.patientID,
      patientName: report.patientName,
      studyDate: report.studyDate,
      modality: report.modality,
      clinicalHistory: report.clinicalHistory || '',
      technique: report.technique || '',
      comparison: report.comparison || '',
      findings: report.findings || report.findingsText || '',
      impression: report.impression || '',
      recommendations: report.recommendations || '',
      structuredFindings: report.structuredFindings || [],
      measurements: report.measurements || [],
      createdAt: report.createdAt,
      version: report.version || 1
    };

    // Convert to JSON with sorted keys for deterministic output
    const serialized = JSON.stringify(reportData, Object.keys(reportData).sort());
    
    console.log('📦 Report serialized for signing');
    return serialized;
  }

  /**
   * Get all signatures for a report
   * @param {string} reportId - Report ID
   * @returns {Promise<Array>} Array of signatures
   */
  async getReportSignatures(reportId) {
    try {
      const signatures = await DigitalSignature.find({ reportId })
        .sort({ timestamp: -1 })
        .populate('signerId', 'name username email role');

      return signatures;
    } catch (error) {
      console.error('❌ Error getting report signatures:', error);
      throw error;
    }
  }

  /**
   * Validate signature on report access
   * @param {string} reportId - Report ID
   * @returns {Promise<object>} Validation result
   */
  async validateReportSignatures(reportId) {
    try {
      const signatures = await this.getReportSignatures(reportId);
      
      if (signatures.length === 0) {
        return {
          valid: true,
          signed: false,
          message: 'Report is not signed'
        };
      }

      const validationResults = [];

      for (const signature of signatures) {
        const result = await this.verifySignature(signature._id.toString());
        validationResults.push({
          signatureId: signature._id,
          meaning: signature.meaning,
          signer: signature.signerName,
          valid: result.valid,
          reason: result.reason
        });
      }

      const allValid = validationResults.every(r => r.valid);

      return {
        valid: allValid,
        signed: true,
        signatures: validationResults,
        message: allValid ? 'All signatures are valid' : 'One or more signatures are invalid'
      };
    } catch (error) {
      console.error('❌ Error validating report signatures:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SignatureService();
