/**
 * FHIR R4 DiagnosticReport Export Service
 * Converts radiology reports to FHIR R4 DiagnosticReport resources
 */

class FHIRExportService {
  /**
   * Convert report to FHIR R4 DiagnosticReport
   * @param {Object} report - Report from database
   * @param {Object} patient - Patient information
   * @param {Object} radiologist - Radiologist/performer information
   * @returns {Object} FHIR R4 DiagnosticReport resource
   */
  async createDiagnosticReport(report, patient, radiologist) {
    const diagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: report._id.toString(),
      meta: {
        versionId: '1',
        lastUpdated: report.updatedAt?.toISOString() || new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport']
      },
      
      // Identifiers
      identifier: this.createIdentifiers(report),
      
      // Report status
      status: this.mapReportStatus(report.status),
      
      // Category (Radiology)
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          code: 'RAD',
          display: 'Radiology'
        }]
      }],
      
      // Code (procedure/study type)
      code: this.createCode(report),
      
      // Subject (patient)
      subject: this.createPatientReference(patient),
      
      // Encounter
      encounter: report.encounterId ? {
        reference: `Encounter/${report.encounterId}`
      } : undefined,
      
      // Effective date/time
      effectiveDateTime: report.studyDate?.toISOString() || report.createdAt?.toISOString(),
      
      // Issued (report finalized)
      issued: report.signedAt?.toISOString(),
      
      // Performer (radiologist)
      performer: this.createPerformerReferences(radiologist),
      
      // Results (observations)
      result: this.createResultReferences(report),
      
      // Imaging study reference
      imagingStudy: report.studyInstanceUID ? [{
        reference: `ImagingStudy/${report.studyInstanceUID}`
      }] : undefined,
      
      // Media (key images)
      media: this.createMediaReferences(report),
      
      // Conclusion (impression)
      conclusion: report.impression,
      
      // Conclusion code (diagnoses)
      conclusionCode: this.createConclusionCodes(report),
      
      // Presented form (PDF)
      presentedForm: this.createPresentedForm(report)
    };

    // Remove undefined fields
    return this.cleanResource(diagnosticReport);
  }

  /**
   * Create identifiers
   */
  createIdentifiers(report) {
    const identifiers = [];

    // Accession number
    if (report.accessionNumber) {
      identifiers.push({
        use: 'official',
        system: 'urn:oid:2.16.840.1.113883.19.5',
        value: report.accessionNumber,
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'ACSN',
            display: 'Accession Number'
          }]
        }
      });
    }

    // Report ID
    identifiers.push({
      use: 'secondary',
      system: 'urn:oid:2.16.840.1.113883.19.5.1',
      value: report._id.toString()
    });

    return identifiers;
  }

  /**
   * Map report status to FHIR status
   */
  mapReportStatus(status) {
    const statusMap = {
      'draft': 'preliminary',
      'pending': 'preliminary',
      'in-progress': 'preliminary',
      'final': 'final',
      'signed': 'final',
      'amended': 'amended',
      'corrected': 'corrected',
      'cancelled': 'cancelled'
    };

    return statusMap[status] || 'unknown';
  }

  /**
   * Create procedure/study code
   */
  createCode(report) {
    const codings = [];

    // LOINC code
    if (report.loincCode) {
      codings.push({
        system: 'http://loinc.org',
        code: report.loincCode,
        display: report.studyDescription
      });
    }

    // CPT code
    if (report.cptCode) {
      codings.push({
        system: 'http://www.ama-assn.org/go/cpt',
        code: report.cptCode,
        display: report.procedureName
      });
    }

    // SNOMED CT code
    if (report.snomedCode) {
      codings.push({
        system: 'http://snomed.info/sct',
        code: report.snomedCode,
        display: report.studyDescription
      });
    }

    // Default to modality + body part
    if (codings.length === 0) {
      codings.push({
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: report.modality || 'RAD',
        display: `${report.modality || 'Radiology'} - ${report.bodyPart || 'Unknown'}`
      });
    }

    return {
      coding: codings,
      text: report.studyDescription || `${report.modality} ${report.bodyPart}`
    };
  }

  /**
   * Create patient reference
   */
  createPatientReference(patient) {
    if (!patient) return undefined;

    return {
      reference: `Patient/${patient._id || patient.patientId}`,
      display: patient.name || `${patient.firstName} ${patient.lastName}`,
      identifier: patient.mrn ? {
        system: 'urn:oid:2.16.840.1.113883.19.5',
        value: patient.mrn
      } : undefined
    };
  }

  /**
   * Create performer references (radiologist)
   */
  createPerformerReferences(radiologist) {
    if (!radiologist) return [];

    return [{
      reference: `Practitioner/${radiologist._id || radiologist.userId}`,
      display: radiologist.fullName || `${radiologist.firstName} ${radiologist.lastName}`,
      type: 'Practitioner'
    }];
  }

  /**
   * Create result references (findings as observations)
   */
  createResultReferences(report) {
    const results = [];

    // Create observation for findings
    if (report.findings) {
      results.push({
        reference: `Observation/${report._id}-findings`,
        display: 'Radiology Findings'
      });
    }

    // Critical findings as separate observations
    if (report.criticalFindings && report.criticalFindings.length > 0) {
      report.criticalFindings.forEach((finding, index) => {
        results.push({
          reference: `Observation/${report._id}-critical-${index}`,
          display: `Critical Finding: ${finding}`
        });
      });
    }

    return results.length > 0 ? results : undefined;
  }

  /**
   * Create media references (key images)
   */
  createMediaReferences(report) {
    if (!report.keyImages || report.keyImages.length === 0) {
      return undefined;
    }

    return report.keyImages.map((image, index) => ({
      comment: image.annotation || `Key Image ${index + 1}`,
      link: {
        reference: `Media/${report._id}-image-${index}`,
        display: image.filename || `Image ${index + 1}`
      }
    }));
  }

  /**
   * Create conclusion codes (diagnoses)
   */
  createConclusionCodes(report) {
    if (!report.diagnoses || report.diagnoses.length === 0) {
      return undefined;
    }

    return report.diagnoses.map(diagnosis => ({
      coding: [{
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: diagnosis.code,
        display: diagnosis.description
      }]
    }));
  }

  /**
   * Create presented form (PDF attachment)
   */
  createPresentedForm(report) {
    if (!report.pdfUrl) return undefined;

    return [{
      contentType: 'application/pdf',
      language: 'en-US',
      url: report.pdfUrl,
      title: `Radiology Report - ${report.accessionNumber}`,
      creation: report.signedAt?.toISOString() || report.createdAt?.toISOString()
    }];
  }

  /**
   * Create FHIR Bundle for multiple reports
   */
  createBundle(diagnosticReports, bundleType = 'collection') {
    return {
      resourceType: 'Bundle',
      id: `bundle-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString()
      },
      type: bundleType,
      total: diagnosticReports.length,
      entry: diagnosticReports.map(report => ({
        fullUrl: `DiagnosticReport/${report.id}`,
        resource: report
      }))
    };
  }

  /**
   * Create FHIR Patient resource
   */
  createPatient(patient) {
    return {
      resourceType: 'Patient',
      id: patient._id?.toString() || patient.patientId,
      meta: {
        lastUpdated: patient.updatedAt?.toISOString() || new Date().toISOString()
      },
      
      identifier: [{
        use: 'official',
        system: 'urn:oid:2.16.840.1.113883.19.5',
        value: patient.mrn
      }],
      
      active: true,
      
      name: [{
        use: 'official',
        family: patient.lastName,
        given: [patient.firstName, patient.middleName].filter(Boolean)
      }],
      
      telecom: patient.phone ? [{
        system: 'phone',
        value: patient.phone,
        use: 'home'
      }] : undefined,
      
      gender: this.mapGender(patient.gender),
      
      birthDate: patient.dateOfBirth ? patient.dateOfBirth.toISOString().split('T')[0] : undefined,
      
      address: patient.address ? [{
        use: 'home',
        line: [patient.address.street, patient.address.street2].filter(Boolean),
        city: patient.address.city,
        state: patient.address.state,
        postalCode: patient.address.zip,
        country: patient.address.country
      }] : undefined
    };
  }

  /**
   * Map gender to FHIR code
   */
  mapGender(gender) {
    if (!gender) return 'unknown';
    
    const genderMap = {
      'M': 'male',
      'F': 'female',
      'O': 'other',
      'U': 'unknown'
    };

    return genderMap[gender.toUpperCase()] || 'unknown';
  }

  /**
   * Remove undefined fields from resource
   */
  cleanResource(resource) {
    return JSON.parse(JSON.stringify(resource, (key, value) => {
      return value === undefined ? null : value;
    }));
  }

  /**
   * Validate FHIR resource (basic validation)
   */
  validateResource(resource) {
    const errors = [];

    if (!resource.resourceType) {
      errors.push('Missing resourceType');
    }

    if (resource.resourceType === 'DiagnosticReport') {
      if (!resource.status) errors.push('Missing status');
      if (!resource.code) errors.push('Missing code');
      if (!resource.subject) errors.push('Missing subject (patient)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new FHIRExportService();
