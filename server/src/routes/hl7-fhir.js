/**
 * HL7/FHIR Integration Routes
 * Handles HL7 message processing and FHIR resource export
 */

const express = require('express');
const router = express.Router();
const hl7ADTService = require('../services/hl7-adt-service');
const fhirExportService = require('../services/fhir-export-service');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const Report = require('../models/Report');
const User = require('../models/User');

/**
 * POST /api/hl7/adt
 * Receive and process HL7 ADT message
 */
router.post('/adt', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'HL7 message is required' });
    }

    // Parse HL7 message
    const parsedData = hl7ADTService.parseADTMessage(message);

    // TODO: Create or update patient in database
    // This would integrate with your Patient model

    // Generate ACK
    const ack = hl7ADTService.generateACK(message, 'AA');

    res.status(200).send(ack);

  } catch (error) {
    console.error('Error processing HL7 ADT message:', error);
    
    // Generate NAK (negative acknowledgment)
    try {
      const nak = hl7ADTService.generateACK(req.body.message, 'AE');
      res.status(500).send(nak);
    } catch (nakError) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/fhir/DiagnosticReport/:id
 * Export single report as FHIR R4 DiagnosticReport
 */
router.get('/DiagnosticReport/:id', authenticate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('userId', 'firstName lastName fullName')
      .populate('patientId');

    if (!report) {
      return res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'not-found',
          diagnostics: 'DiagnosticReport not found'
        }]
      });
    }

    // Check authorization
    if (req.user.hospitalId && report.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'forbidden',
          diagnostics: 'Access denied'
        }]
      });
    }

    // Convert to FHIR
    const diagnosticReport = await fhirExportService.createDiagnosticReport(
      report,
      report.patientId,
      report.userId
    );

    // Validate
    const validation = fhirExportService.validateResource(diagnosticReport);
    if (!validation.valid) {
      console.warn('FHIR validation warnings:', validation.errors);
    }

    res.json(diagnosticReport);

  } catch (error) {
    console.error('Error exporting FHIR DiagnosticReport:', error);
    res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'exception',
        diagnostics: error.message
      }]
    });
  }
});

/**
 * POST /api/fhir/DiagnosticReport/$export
 * Bulk export reports as FHIR Bundle
 */
router.post('/DiagnosticReport/$export', authenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      patientId,
      limit = 100
    } = req.body;

    // Build query
    const query = {};
    if (req.user.hospitalId) {
      query.hospitalId = req.user.hospitalId;
    }
    if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      query.createdAt = { ...query.createdAt, $lte: new Date(endDate) };
    }
    if (status) {
      query.status = status;
    }
    if (patientId) {
      query.patientId = patientId;
    }

    // Fetch reports
    const reports = await Report.find(query)
      .limit(parseInt(limit))
      .populate('userId', 'firstName lastName fullName')
      .populate('patientId')
      .sort({ createdAt: -1 });

    // Convert to FHIR
    const diagnosticReports = await Promise.all(
      reports.map(report =>
        fhirExportService.createDiagnosticReport(
          report,
          report.patientId,
          report.userId
        )
      )
    );

    // Create bundle
    const bundle = fhirExportService.createBundle(diagnosticReports, 'searchset');

    res.json(bundle);

  } catch (error) {
    console.error('Error bulk exporting FHIR DiagnosticReports:', error);
    res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'exception',
        diagnostics: error.message
      }]
    });
  }
});

/**
 * GET /api/fhir/Patient/:id
 * Export patient as FHIR R4 Patient resource
 */
router.get('/Patient/:id', authenticate, async (req, res) => {
  try {
    // TODO: Fetch patient from your Patient model
    // This is a placeholder
    const patient = {
      _id: req.params.id,
      mrn: 'MRN123456',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'M'
    };

    const fhirPatient = fhirExportService.createPatient(patient);

    res.json(fhirPatient);

  } catch (error) {
    console.error('Error exporting FHIR Patient:', error);
    res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'error',
        code: 'exception',
        diagnostics: error.message
      }]
    });
  }
});

/**
 * GET /api/fhir/metadata
 * FHIR Capability Statement
 */
router.get('/metadata', (req, res) => {
  res.json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: {
      name: 'Radiology Reporting System',
      version: '1.0.0'
    },
    implementation: {
      description: 'Radiology Reporting FHIR Server',
      url: `${req.protocol}://${req.get('host')}/api/fhir`
    },
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [{
      mode: 'server',
      resource: [
        {
          type: 'DiagnosticReport',
          interaction: [
            { code: 'read' },
            { code: 'search-type' }
          ],
          searchParam: [
            { name: 'patient', type: 'reference' },
            { name: 'status', type: 'token' },
            { name: 'date', type: 'date' }
          ]
        },
        {
          type: 'Patient',
          interaction: [
            { code: 'read' }
          ]
        }
      ]
    }]
  });
});

module.exports = router;
