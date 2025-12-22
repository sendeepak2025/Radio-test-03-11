/**
 * Critical Communications API Routes
 * ACR Practice Parameter compliant critical findings communication
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const CriticalCommunication = require('../models/CriticalCommunication');
const StructuredReport = require('../models/StructuredReport');
const auditService = require('../services/audit-service');

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/critical-communications
 * Create a new critical communication record
 */
router.post('/', async (req, res) => {
  try {
    const {
      reportId,
      studyInstanceUID,
      patientID,
      patientName,
      finding,
      intendedRecipients
    } = req.body;

    // Validate required fields
    if (!reportId || !finding?.description || !finding?.severity) {
      return res.status(400).json({
        success: false,
        error: 'reportId, finding.description, and finding.severity are required'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    const communication = new CriticalCommunication({
      reportId,
      studyInstanceUID,
      patientID,
      patientName,
      finding,
      intendedRecipients: intendedRecipients || [],
      findingIdentifiedAt: new Date(),
      identifiedBy: userId,
      identifiedByName: userName,
      hospitalId: req.user.hospitalId,
      status: 'pending',
      auditLog: [{
        action: 'CREATED',
        timestamp: new Date(),
        userId,
        userName,
        details: { finding: finding.description }
      }]
    });

    await communication.save();

    // Update report to mark as critical
    await StructuredReport.updateOne(
      { reportId },
      { 
        $set: { priority: 'stat' },
        $push: { 
          criticalComms: {
            communicationId: communication._id,
            finding: finding.description,
            severity: finding.severity,
            createdAt: new Date()
          }
        }
      }
    );

    // Audit log
    await auditService.logAction({
      userId,
      action: 'CRITICAL_COMM_CREATED',
      resourceType: 'CriticalCommunication',
      resourceId: communication._id.toString(),
      details: { reportId, severity: finding.severity },
      ipAddress: req.ip
    }).catch(console.error);

    res.status(201).json({
      success: true,
      communication: communication.toObject(),
      message: 'Critical communication record created'
    });

  } catch (error) {
    console.error('❌ Error creating critical communication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/critical-communications/pending
 * Get all pending critical communications
 */
router.get('/pending', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const communications = await CriticalCommunication.findPending(hospitalId);

    res.json({
      success: true,
      count: communications.length,
      communications
    });

  } catch (error) {
    console.error('❌ Error fetching pending communications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/critical-communications/overdue
 * Get overdue critical communications (past time limit)
 */
router.get('/overdue', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const communications = await CriticalCommunication.findOverdue(hospitalId);

    res.json({
      success: true,
      count: communications.length,
      communications
    });

  } catch (error) {
    console.error('❌ Error fetching overdue communications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/critical-communications/report/:reportId
 * Get critical communications for a specific report
 */
router.get('/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    const communications = await CriticalCommunication.find({ reportId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: communications.length,
      communications
    });

  } catch (error) {
    console.error('❌ Error fetching report communications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/critical-communications/:id
 * Get a specific critical communication
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const communication = await CriticalCommunication.findById(id)
      .populate('identifiedBy', 'name email')
      .populate('attempts.initiatedBy', 'name email')
      .populate('acknowledgment.recordedBy', 'name email');

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Critical communication not found'
      });
    }

    res.json({
      success: true,
      communication
    });

  } catch (error) {
    console.error('❌ Error fetching communication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/critical-communications/:id/attempt
 * Record a communication attempt
 */
router.post('/:id/attempt', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      method,
      recipientName,
      recipientRole,
      recipientPhone,
      recipientEmail,
      outcome,
      notes
    } = req.body;

    // Validate required fields
    if (!method || !recipientName || !outcome) {
      return res.status(400).json({
        success: false,
        error: 'method, recipientName, and outcome are required'
      });
    }

    const communication = await CriticalCommunication.findById(id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Critical communication not found'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    await communication.addAttempt({
      method,
      recipientName,
      recipientRole,
      recipientPhone,
      recipientEmail,
      outcome,
      notes,
      initiatedBy: userId,
      initiatedByName: userName
    });

    // Audit log
    await auditService.logAction({
      userId,
      action: 'CRITICAL_COMM_ATTEMPT',
      resourceType: 'CriticalCommunication',
      resourceId: id,
      details: { method, outcome, recipientName },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      communication: communication.toObject(),
      message: 'Communication attempt recorded'
    });

  } catch (error) {
    console.error('❌ Error recording attempt:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/critical-communications/:id/acknowledge
 * Record acknowledgment of critical finding
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      acknowledgedBy,
      acknowledgedByRole,
      acknowledgedByPhone,
      method,
      readBackConfirmed,
      verbatimReadBack,
      notes
    } = req.body;

    // Validate required fields
    if (!acknowledgedBy || !method) {
      return res.status(400).json({
        success: false,
        error: 'acknowledgedBy and method are required'
      });
    }

    const communication = await CriticalCommunication.findById(id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Critical communication not found'
      });
    }

    if (communication.status === 'acknowledged') {
      return res.status(400).json({
        success: false,
        error: 'Communication already acknowledged'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    await communication.recordAcknowledgment({
      acknowledgedBy,
      acknowledgedByRole,
      acknowledgedByPhone,
      method,
      readBackConfirmed: readBackConfirmed || false,
      verbatimReadBack,
      recordedBy: userId,
      recordedByName: userName,
      notes
    });

    // Update report
    await StructuredReport.updateOne(
      { reportId: communication.reportId },
      { 
        $set: { 
          criticalNotifiedAt: new Date(),
          criticalNotifiedTo: [acknowledgedBy]
        }
      }
    );

    // Audit log
    await auditService.logAction({
      userId,
      action: 'CRITICAL_COMM_ACKNOWLEDGED',
      resourceType: 'CriticalCommunication',
      resourceId: id,
      details: { acknowledgedBy, method, readBackConfirmed },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      communication: communication.toObject(),
      message: 'Critical finding acknowledged',
      compliance: communication.compliance
    });

  } catch (error) {
    console.error('❌ Error recording acknowledgment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/critical-communications/:id/escalate
 * Escalate communication to next level
 */
router.post('/:id/escalate', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      escalatedTo,
      escalatedToPhone,
      reason
    } = req.body;

    // Validate required fields
    if (!escalatedTo || !reason) {
      return res.status(400).json({
        success: false,
        error: 'escalatedTo and reason are required'
      });
    }

    const communication = await CriticalCommunication.findById(id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: 'Critical communication not found'
      });
    }

    const userId = req.user.userId || req.user._id;
    const userName = req.user.username || req.user.name;

    await communication.escalate({
      escalatedTo,
      escalatedToPhone,
      reason,
      escalatedBy: userId,
      escalatedByName: userName
    });

    // Audit log
    await auditService.logAction({
      userId,
      action: 'CRITICAL_COMM_ESCALATED',
      resourceType: 'CriticalCommunication',
      resourceId: id,
      details: { escalatedTo, reason, level: communication.currentEscalationLevel },
      ipAddress: req.ip
    }).catch(console.error);

    res.json({
      success: true,
      communication: communication.toObject(),
      message: `Escalated to level ${communication.currentEscalationLevel}`
    });

  } catch (error) {
    console.error('❌ Error escalating communication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/critical-communications/stats
 * Get compliance statistics
 */
router.get('/stats/compliance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const hospitalId = req.user.hospitalId;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await CriticalCommunication.getComplianceStats(hospitalId, start, end);

    res.json({
      success: true,
      period: { start, end },
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching compliance stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
