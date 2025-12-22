const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Report = require('../models/Report');
const Study = require('../models/Study');
const Patient = require('../models/Patient');
const DigitalSignature = require('../models/DigitalSignature');
const HospitalSettings = require('../models/HospitalSettings');

/**
 * PDF Service
 * Implements professional PDF report generation with hospital branding and signatures
 * Supports PDF/A format for long-term archival
 */

class PDFService {
  constructor() {
    this.pageWidth = 612; // Letter size width in points
    this.pageHeight = 792; // Letter size height in points
    this.margin = 50;
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  /**
   * Decode HTML entities in a string
   * @param {string} str - String with HTML entities
   * @returns {string} Decoded string
   */
  decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x2F;/g, '/')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }

  /**
   * Format module name for display
   * @param {string} moduleId - Module ID
   * @returns {string} Formatted name
   */
  formatModuleName(moduleId) {
    // Special cases
    const nameMap = {
      'birads_calculator': 'BI-RADS Assessment',
      'birads_us_calculator': 'BI-RADS Ultrasound Assessment',
      'birads_mammo_calculator': 'BI-RADS Mammography Assessment',
      'lung_rads_calculator': 'Lung-RADS Assessment',
      'li_rads_calculator': 'LI-RADS Assessment',
      'tirads_calculator': 'TI-RADS Thyroid Assessment',
      'cad_rads_calculator': 'CAD-RADS Assessment',
      'aspects_calculator': 'ASPECTS Score',
      'nodule_measurements': 'Nodule Measurements',
      'lesion_measurements': 'Lesion Measurements'
    };
    
    if (nameMap[moduleId]) return nameMap[moduleId];
    
    // Generic formatting
    return moduleId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format UI module data for PDF output
   * @param {PDFDocument} doc - PDF document
   * @param {string} moduleId - Module ID
   * @param {any} data - Parsed module data
   */
  formatUIModuleData(doc, moduleId, data) {
    if (!data) {
      doc.fontSize(10).text('  No data recorded', this.margin + 20, doc.y);
      return;
    }

    // BI-RADS type calculators
    if (moduleId.includes('birads') || moduleId.includes('rads')) {
      this.formatRADSData(doc, data);
      return;
    }

    // Measurements
    if (moduleId.includes('measurement') || moduleId.includes('nodule') || moduleId.includes('lesion')) {
      this.formatMeasurementData(doc, data);
      return;
    }

    // Checklist
    if (moduleId.includes('checklist')) {
      this.formatChecklistData(doc, data);
      return;
    }

    // Diagram
    if (moduleId.includes('diagram')) {
      this.formatDiagramData(doc, data);
      return;
    }

    // Generic object formatting
    if (typeof data === 'object') {
      this.formatGenericObjectData(doc, data);
      return;
    }

    // Fallback for simple values
    doc.fontSize(10).text(`  ${String(data)}`, this.margin + 20, doc.y);
  }

  /**
   * Format RADS assessment data (BI-RADS, Lung-RADS, etc.)
   */
  formatRADSData(doc, data) {
    const indent = this.margin + 20;
    doc.fontSize(10).fillColor('#000000');

    // Category
    if (data.category !== undefined) {
      doc.font('Helvetica-Bold')
        .text(`Category: ${data.category}`, indent, doc.y);
      doc.font('Helvetica');
    }

    // Score
    if (data.score !== undefined) {
      doc.text(`Score: ${data.score}`, indent, doc.y);
    }

    // Recommendation
    if (data.recommendation) {
      doc.text(`Recommendation: ${data.recommendation}`, indent, doc.y, { width: this.contentWidth - 40 });
    }

    // Selections/Findings
    if (data.selections && typeof data.selections === 'object') {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Findings:', indent, doc.y);
      doc.font('Helvetica');
      
      Object.entries(data.selections).forEach(([key, value]) => {
        if (value && value !== 'none' && value !== '') {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          doc.text(`  • ${label}: ${value}`, indent + 10, doc.y);
        }
      });
    }

    // Findings array
    if (data.findings && Array.isArray(data.findings) && data.findings.length > 0) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Additional Findings:', indent, doc.y);
      doc.font('Helvetica');
      data.findings.forEach(finding => {
        doc.text(`  • ${finding}`, indent + 10, doc.y);
      });
    }
  }

  /**
   * Format measurement data
   */
  formatMeasurementData(doc, data) {
    const indent = this.margin + 20;
    doc.fontSize(10).fillColor('#000000');

    if (Array.isArray(data)) {
      if (data.length === 0) {
        doc.text('  No measurements recorded', indent, doc.y);
        return;
      }
      
      data.forEach((measurement, idx) => {
        const label = measurement.label || measurement.type || `Measurement ${idx + 1}`;
        const value = measurement.value !== undefined ? measurement.value : 'N/A';
        const unit = measurement.unit || '';
        const notes = measurement.notes ? ` (${measurement.notes})` : '';
        
        doc.text(`  • ${label}: ${value} ${unit}${notes}`, indent, doc.y);
      });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.text(`  • ${label}: ${value}`, indent, doc.y);
      });
    }
  }

  /**
   * Format checklist data
   */
  formatChecklistData(doc, data) {
    const indent = this.margin + 20;
    doc.fontSize(10).fillColor('#000000');

    const items = data.items || data;
    
    if (typeof items === 'object') {
      Object.entries(items).forEach(([item, status]) => {
        const checkmark = status === true || status === 'checked' || status === 'yes' ? '✓' : '○';
        const label = item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.text(`  ${checkmark} ${label}`, indent, doc.y);
      });
    }
  }

  /**
   * Format diagram data
   */
  formatDiagramData(doc, data) {
    const indent = this.margin + 20;
    doc.fontSize(10).fillColor('#000000');

    if (Array.isArray(data)) {
      doc.text(`  ${data.length} anatomical marking(s) recorded`, indent, doc.y);
      
      // List marking types
      const types = {};
      data.forEach(marking => {
        const type = marking.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
      });
      
      Object.entries(types).forEach(([type, count]) => {
        doc.text(`    - ${type}: ${count}`, indent + 10, doc.y);
      });
    }
  }

  /**
   * Format generic object data in human-readable format
   */
  formatGenericObjectData(doc, data) {
    const indent = this.margin + 20;
    doc.fontSize(10).fillColor('#000000');

    const formatValue = (value) => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (Array.isArray(value)) {
        if (value.length === 0) return 'None';
        return value.join(', ');
      }
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };

    Object.entries(data).forEach(([key, value]) => {
      // Skip internal/technical fields
      if (key.startsWith('_') || key === 'id' || key === 'timestamp') return;
      
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const formattedValue = formatValue(value);
      
      // Skip empty values
      if (formattedValue === 'N/A' || formattedValue === 'None' || formattedValue === '') return;
      
      doc.text(`  • ${label}: ${formattedValue}`, indent, doc.y, { width: this.contentWidth - 40 });
    });
  }

  /**
   * Export report as PDF with hospital branding
   * @param {string} reportId - Report ID to export
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} PDF file as buffer
   */
  async exportReport(reportId, options = {}) {
    try {
      console.log(`📄 Starting PDF export for report: ${reportId}`);

      // 1. Fetch report data
      const report = await Report.findOne({ reportId })
        .populate('createdBy')
        .lean();
      
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // 2. Validate report completeness
      this.validateReportForExport(report);

      // 3. Fetch related data
      const study = await Study.findOne({ 
        studyInstanceUID: report.studyInstanceUID 
      }).lean();
      
      const patient = await Patient.findOne({ 
        patientID: report.patientID 
      }).lean();

      // 4. Fetch hospital settings for branding
      let hospitalSettings = null;
      if (report.hospitalId || options.hospitalId) {
        hospitalSettings = await HospitalSettings.findOne({ 
          hospitalId: report.hospitalId || options.hospitalId 
        }).lean();
      }

      // 5. Fetch signature if exists
      let signature = null;
      if (report.signedAt) {
        signature = await DigitalSignature.findOne({ 
          reportId: report.reportId 
        }).lean();
      }

      // 6. Generate PDF with branding
      const pdfBuffer = await this.generatePDF(report, study, patient, signature, hospitalSettings, options);

      console.log(`✅ PDF export completed for report: ${reportId}`);
      return pdfBuffer;

    } catch (error) {
      console.error(`❌ PDF export failed for report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Validate report is ready for export
   * @param {Object} report - Report document
   */
  validateReportForExport(report) {
    const errors = [];

    if (!report.patientID) {
      errors.push('Missing patientID');
    }

    if (!report.findings && !report.findingsText) {
      errors.push('Report must have findings');
    }

    if (!report.impression) {
      errors.push('Report must have impression');
    }

    if (errors.length > 0) {
      throw new Error(`Report validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Generate PDF document with hospital branding
   * @param {Object} report - Report document
   * @param {Object} study - Study document
   * @param {Object} patient - Patient document
   * @param {Object} signature - Digital signature document
   * @param {Object} hospitalSettings - Hospital settings for branding
   * @param {Object} options - Generation options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePDF(report, study, patient, signature, hospitalSettings, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: this.margin,
            bottom: this.margin,
            left: this.margin,
            right: this.margin
          },
          info: {
            Title: `Medical Imaging Report - ${report.reportId}`,
            Author: hospitalSettings?.name || report.radiologistName || 'Medical Imaging Center',
            Subject: 'Radiology Report',
            Keywords: `radiology, ${report.modality || 'imaging'}, medical report`,
            CreationDate: new Date(),
            ModDate: new Date()
          },
          pdfVersion: options.pdfA ? '1.4' : '1.7'
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add watermark for preliminary reports
        if (report.status === 'draft' || report.status === 'preliminary') {
          this.addWatermark(doc, 'PRELIMINARY');
        }

        // Header with hospital branding
        await this.addHeader(doc, report, study, patient, hospitalSettings);

        // Patient and Study Information
        this.addPatientInfo(doc, report, patient);
        this.addStudyInfo(doc, report, study);

        // Report Content
        doc.moveDown(1);
        this.addSection(doc, 'Clinical History', report.clinicalHistory);
        this.addSection(doc, 'Technique', report.technique);
        this.addSection(doc, 'Comparison', report.comparison);
        this.addSection(doc, 'Findings', report.findings || report.findingsText);
        this.addSection(doc, 'Impression', report.impression, true); // Highlighted
        this.addSection(doc, 'Recommendations', report.recommendations);
        
        // UI Module Results - Format for human readability
        if (report.templateId && report.sections) {
          const uiModules = Object.entries(report.sections).filter(([key]) => 
            key.startsWith('uiModule_')
          );
          
          if (uiModules.length > 0) {
            doc.moveDown(0.5);
            doc.fontSize(12)
              .fillColor('#1976d2')
              .font('Helvetica-Bold')
              .text('ASSESSMENT TOOLS RESULTS', this.margin, doc.y);
            doc.font('Helvetica');
            doc.moveDown(0.5);
            
            uiModules.forEach(([key, value]) => {
              const moduleId = key.replace('uiModule_', '');
              // Format module name nicely
              const moduleName = this.formatModuleName(moduleId);
              
              // Decode HTML entities and parse JSON
              let parsedData;
              try {
                // Decode HTML entities first
                const decodedValue = this.decodeHtmlEntities(String(value));
                parsedData = JSON.parse(decodedValue);
              } catch {
                parsedData = value;
              }
              
              doc.fontSize(11)
                .fillColor('#333333')
                .font('Helvetica-Bold')
                .text(moduleName + ':', this.margin, doc.y);
              doc.font('Helvetica');
              doc.moveDown(0.3);
              
              // Format the data based on module type
              this.formatUIModuleData(doc, moduleId, parsedData);
              
              doc.moveDown(0.5);
            });
          }
        }
        
        // Template-Specific Sections
        if (report.templateId && report.sections) {
          const standardFields = ['technique', 'findings', 'findingsText', 'impression', 'clinical_indication', 'clinicalHistory', 'indication', 'recommendations', 'comparison'];
          const templateSpecificSections = Object.entries(report.sections).filter(([key, value]) => 
            !standardFields.includes(key) && 
            !key.startsWith('uiModule_') &&
            value && 
            String(value).trim() !== ''
          );
          
          if (templateSpecificSections.length > 0) {
            doc.moveDown(0.5);
            doc.fontSize(12)
              .fillColor('#1976d2')
              .text('ADDITIONAL TEMPLATE FIELDS', this.margin, doc.y);
            doc.moveDown(0.5);
            
            templateSpecificSections.forEach(([key, value]) => {
              const title = key.replace(/_/g, ' ').toUpperCase();
              this.addSection(doc, title, value);
            });
          }
        }

        // Structured Findings Table
        if (report.structuredFindings && report.structuredFindings.length > 0) {
          this.addStructuredFindings(doc, report.structuredFindings);
        }

        // Measurements Table
        if (report.measurements && report.measurements.length > 0) {
          this.addMeasurements(doc, report.measurements);
        }

        // Anatomical Diagrams
        if (report.moduleData) {
          this.addAnatomicalDiagrams(doc, report.moduleData);
        }

        // Key Images
        if (report.keyImages && report.keyImages.length > 0 && options.includeImages) {
          this.addKeyImages(doc, report.keyImages);
        }

        // Signature Section
        if (signature || report.signedAt) {
          this.addSignature(doc, report, signature);
        }

        // Footer on all pages with hospital branding
        this.addFooter(doc, report, hospitalSettings);

        // Finalize PDF
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add watermark to document
   * @param {PDFDocument} doc - PDF document
   * @param {string} text - Watermark text
   */
  addWatermark(doc, text) {
    const centerX = this.pageWidth / 2;
    const centerY = this.pageHeight / 2;

    doc.save();
    doc.fontSize(60)
      .fillColor('red', 0.2)
      .rotate(-45, { origin: [centerX, centerY] })
      .text(text, centerX - 200, centerY, {
        width: 400,
        align: 'center'
      });
    doc.restore();
  }

  /**
   * Add header to document with hospital branding
   * @param {PDFDocument} doc - PDF document
   * @param {Object} report - Report document
   * @param {Object} study - Study document
   * @param {Object} patient - Patient document
   * @param {Object} hospitalSettings - Hospital settings for branding
   */
  async addHeader(doc, report, study, patient, hospitalSettings) {
    const hospitalName = hospitalSettings?.name || 'Medical Imaging Center';
    const hospitalAddress = hospitalSettings?.address;
    const hospitalPhone = hospitalSettings?.contactPhone;
    const hospitalEmail = hospitalSettings?.contactEmail;
    
    // Try to load hospital logo
    let logoLoaded = false;
    if (hospitalSettings?.logoUrl) {
      try {
        let logoBuffer = null;
        const logoUrl = hospitalSettings.logoUrl;
        
        if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
          // Fetch from URL
          const response = await axios.get(logoUrl, {
            responseType: 'arraybuffer',
            timeout: 5000
          });
          logoBuffer = Buffer.from(response.data);
        } else if (logoUrl.startsWith('/uploads/') || logoUrl.startsWith('uploads/')) {
          // Local file
          const localPath = path.join(__dirname, '../../', logoUrl);
          if (fs.existsSync(localPath)) {
            logoBuffer = fs.readFileSync(localPath);
          }
        }
        
        if (logoBuffer) {
          doc.image(logoBuffer, this.margin, this.margin, { width: 80, height: 80 });
          logoLoaded = true;
        }
      } catch (err) {
        console.warn('Failed to load hospital logo:', err.message);
      }
    }
    
    // Hospital Name and Contact Info
    const textX = logoLoaded ? this.margin + 100 : this.margin;
    const textWidth = logoLoaded ? this.contentWidth - 100 : this.contentWidth;
    
    doc.fontSize(18)
      .fillColor('#1976d2')
      .font('Helvetica-Bold')
      .text(hospitalName, textX, this.margin, {
        width: textWidth,
        align: logoLoaded ? 'left' : 'center'
      });

    doc.fontSize(10)
      .fillColor('#666666')
      .font('Helvetica')
      .text('Radiology Department', textX, doc.y, {
        width: textWidth,
        align: logoLoaded ? 'left' : 'center'
      });
    
    // Address line
    if (hospitalAddress) {
      const addressParts = [];
      if (hospitalAddress.street) addressParts.push(hospitalAddress.street);
      if (hospitalAddress.city) addressParts.push(hospitalAddress.city);
      if (hospitalAddress.state) addressParts.push(hospitalAddress.state);
      if (hospitalAddress.zipCode) addressParts.push(hospitalAddress.zipCode);
      
      if (addressParts.length > 0) {
        doc.fontSize(9)
          .text(addressParts.join(', '), textX, doc.y, {
            width: textWidth,
            align: logoLoaded ? 'left' : 'center'
          });
      }
    }
    
    // Contact info
    const contactParts = [];
    if (hospitalPhone) contactParts.push(`Tel: ${hospitalPhone}`);
    if (hospitalEmail) contactParts.push(`Email: ${hospitalEmail}`);
    
    if (contactParts.length > 0) {
      doc.fontSize(9)
        .text(contactParts.join(' | '), textX, doc.y, {
          width: textWidth,
          align: logoLoaded ? 'left' : 'center'
        });
    }

    // Horizontal line
    const lineY = Math.max(doc.y + 10, this.margin + 90);
    doc.moveTo(this.margin, lineY)
      .lineTo(this.pageWidth - this.margin, lineY)
      .strokeColor('#1976d2')
      .lineWidth(2)
      .stroke();

    doc.y = lineY + 15;

    // Report Title
    doc.fontSize(16)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('RADIOLOGY REPORT', this.margin, doc.y, {
        align: 'center',
        width: this.contentWidth
      });

    doc.moveDown(1);
    doc.font('Helvetica');
  }

  /**
   * Add patient information
   * @param {PDFDocument} doc - PDF document
   * @param {Object} report - Report document
   * @param {Object} patient - Patient document
   */
  addPatientInfo(doc, report, patient) {
    const startY = doc.y;
    const col1X = this.margin;
    const col2X = this.margin + (this.contentWidth / 2);

    doc.fontSize(12)
      .fillColor('#1976d2')
      .text('PATIENT INFORMATION', col1X, startY);

    doc.fontSize(10)
      .fillColor('#000000');

    const patientData = [
      ['Patient ID:', patient?.patientID || report.patientID],
      ['Patient Name:', patient?.patientName || report.patientName || 'Unknown'],
      ['Date of Birth:', patient?.birthDate || report.patientBirthDate || 'Unknown'],
      ['Sex:', patient?.sex || report.patientSex || 'Unknown'],
      ['Age:', report.patientAge || 'Unknown']
    ];

    let currentY = startY + 20;
    patientData.forEach(([label, value]) => {
      doc.text(label, col1X, currentY, { continued: true, width: 100 })
        .font('Helvetica-Bold')
        .text(value, { width: 200 })
        .font('Helvetica');
      currentY += 15;
    });

    doc.moveDown(1);
  }

  /**
   * Add study information
   * @param {PDFDocument} doc - PDF document
   * @param {Object} report - Report document
   * @param {Object} study - Study document
   */
  addStudyInfo(doc, report, study) {
    const startY = doc.y;
    const col1X = this.margin;

    doc.fontSize(12)
      .fillColor('#1976d2')
      .text('STUDY INFORMATION', col1X, startY);

    doc.fontSize(10)
      .fillColor('#000000');

    const studyData = [
      ['Report ID:', report.reportId],
      ['Study Date:', report.studyDate || study?.studyDate || 'Unknown'],
      ['Study Time:', report.studyTime || study?.studyTime || 'Unknown'],
      ['Modality:', report.modality || study?.modality || 'Unknown'],
      ['Study Description:', report.studyDescription || study?.studyDescription || 'N/A'],
      ['Accession Number:', study?.accessionNumber || 'N/A'],
      ['Report Status:', this.formatStatus(report.status)]
    ];

    let currentY = startY + 20;
    studyData.forEach(([label, value]) => {
      doc.text(label, col1X, currentY, { continued: true, width: 150 })
        .font('Helvetica-Bold')
        .text(value, { width: 350 })
        .font('Helvetica');
      currentY += 15;
    });

    doc.moveDown(1);
  }

  /**
   * Add report section
   * @param {PDFDocument} doc - PDF document
   * @param {string} title - Section title
   * @param {string} content - Section content
   * @param {boolean} highlight - Whether to highlight this section
   */
  addSection(doc, title, content, highlight = false) {
    if (!content) return;

    // Check if we need a new page
    if (doc.y > this.pageHeight - 150) {
      doc.addPage();
    }

    // Highlight box for important sections like Impression
    if (highlight) {
      const boxY = doc.y;
      doc.rect(this.margin - 5, boxY - 5, this.contentWidth + 10, 20)
        .fillColor('#e3f2fd')
        .fill();
    }

    doc.fontSize(12)
      .fillColor('#1976d2')
      .font('Helvetica-Bold')
      .text(title.toUpperCase(), this.margin, doc.y, {
        underline: true
      });

    doc.moveDown(0.5);

    doc.fontSize(10)
      .fillColor('#000000')
      .font(highlight ? 'Helvetica-Bold' : 'Helvetica')
      .text(content, this.margin, doc.y, {
        align: 'justify',
        lineGap: 2,
        width: this.contentWidth
      });

    doc.font('Helvetica');
    doc.moveDown(1);
  }

  /**
   * Add structured findings table
   * @param {PDFDocument} doc - PDF document
   * @param {Array} findings - Structured findings
   */
  addStructuredFindings(doc, findings) {
    if (doc.y > this.pageHeight - 200) {
      doc.addPage();
    }

    doc.fontSize(12)
      .fillColor('#1976d2')
      .text('STRUCTURED FINDINGS', {
        underline: true
      });

    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const col1 = this.margin;
    const col2 = this.margin + 100;
    const col3 = this.margin + 200;
    const col4 = this.margin + 350;

    doc.fontSize(9)
      .font('Helvetica-Bold')
      .text('Location', col1, tableTop)
      .text('Finding', col2, tableTop)
      .text('Severity', col3, tableTop)
      .text('Confidence', col4, tableTop);

    doc.moveTo(col1, tableTop + 12)
      .lineTo(this.pageWidth - this.margin, tableTop + 12)
      .stroke();

    // Table rows
    let rowY = tableTop + 20;
    doc.font('Helvetica').fontSize(8);

    findings.slice(0, 10).forEach(finding => {
      if (rowY > this.pageHeight - 100) {
        doc.addPage();
        rowY = this.margin;
      }

      doc.text(finding.location || 'N/A', col1, rowY, { width: 90 })
        .text(finding.description || finding.finding || 'N/A', col2, rowY, { width: 140 })
        .text(finding.severity || 'N/A', col3, rowY, { width: 140 })
        .text(finding.confidence ? `${(finding.confidence * 100).toFixed(0)}%` : 'N/A', col4, rowY);

      rowY += 25;
    });

    doc.moveDown(2);
  }

  /**
   * Add measurements table
   * @param {PDFDocument} doc - PDF document
   * @param {Array} measurements - Measurements
   */
  addMeasurements(doc, measurements) {
    if (doc.y > this.pageHeight - 200) {
      doc.addPage();
    }

    doc.fontSize(12)
      .fillColor('#1976d2')
      .text('MEASUREMENTS', {
        underline: true
      });

    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const col1 = this.margin;
    const col2 = this.margin + 150;
    const col3 = this.margin + 300;
    const col4 = this.margin + 400;

    doc.fontSize(9)
      .font('Helvetica-Bold')
      .text('Label', col1, tableTop)
      .text('Type', col2, tableTop)
      .text('Value', col3, tableTop)
      .text('Unit', col4, tableTop);

    doc.moveTo(col1, tableTop + 12)
      .lineTo(this.pageWidth - this.margin, tableTop + 12)
      .stroke();

    // Table rows
    let rowY = tableTop + 20;
    doc.font('Helvetica').fontSize(8);

    measurements.slice(0, 15).forEach(measurement => {
      if (rowY > this.pageHeight - 100) {
        doc.addPage();
        rowY = this.margin;
      }

      doc.text(measurement.label || measurement.type || 'N/A', col1, rowY, { width: 140 })
        .text(measurement.type || 'N/A', col2, rowY, { width: 140 })
        .text(measurement.value?.toFixed(2) || 'N/A', col3, rowY, { width: 90 })
        .text(measurement.unit || 'N/A', col4, rowY);

      rowY += 20;
    });

    doc.moveDown(2);
  }

  /**
   * Add key images
   * @param {PDFDocument} doc - PDF document
   * @param {Array} keyImages - Key images
   */
  addKeyImages(doc, keyImages) {
    doc.addPage();

    doc.fontSize(12)
      .fillColor('#1976d2')
      .text('KEY IMAGES', {
        underline: true
      });

    doc.moveDown(1);

    // Add up to 4 images per page
    keyImages.slice(0, 4).forEach((image, index) => {
      if (image.dataUrl) {
        try {
          // Extract base64 data
          const base64Data = image.dataUrl.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');

          const imageX = this.margin + (index % 2) * 250;
          const imageY = doc.y + Math.floor(index / 2) * 200;

          doc.image(imageBuffer, imageX, imageY, {
            width: 200,
            height: 150
          });

          if (image.caption) {
            doc.fontSize(8)
              .text(image.caption, imageX, imageY + 155, {
                width: 200,
                align: 'center'
              });
          }
        } catch (error) {
          console.warn('Failed to add image to PDF:', error.message);
        }
      }
    });

    doc.moveDown(2);
  }

  /**
   * Add anatomical diagrams with markings
   * @param {PDFDocument} doc - PDF document
   * @param {Object} moduleData - Module data containing diagram markings
   */
  addAnatomicalDiagrams(doc, moduleData) {
    if (!moduleData) return;

    // Find diagram modules
    const diagramModules = Object.entries(moduleData).filter(([key, value]) => 
      Array.isArray(value) && value.length > 0 && value[0].type && value[0].points
    );

    if (diagramModules.length === 0) return;

    doc.addPage();

    doc.fontSize(14)
      .fillColor('#1976d2')
      .font('Helvetica-Bold')
      .text('ANATOMICAL DIAGRAMS', {
        underline: true
      });

    doc.moveDown(1);

    diagramModules.forEach(([moduleId, markings], index) => {
      if (index > 0) doc.moveDown(2);

      // Module title
      const moduleName = moduleId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      doc.fontSize(11)
        .fillColor('#333')
        .font('Helvetica-Bold')
        .text(moduleName);

      doc.moveDown(0.5);

      // Markings summary
      doc.fontSize(9)
        .fillColor('#666')
        .font('Helvetica')
        .text(`Total markings: ${markings.length}`);

      // List markings
      markings.slice(0, 10).forEach((marking, idx) => {
        const markingType = marking.type || 'unknown';
        const color = marking.color || '#000000';
        const linkedText = marking.linkedFindingId ? ' (linked to finding)' : '';

        doc.fontSize(8)
          .fillColor('#333')
          .text(`  ${idx + 1}. ${markingType.toUpperCase()}${linkedText}`, {
            indent: 20
          });
      });

      if (markings.length > 10) {
        doc.fontSize(8)
          .fillColor('#999')
          .text(`  ... and ${markings.length - 10} more markings`, {
            indent: 20
          });
      }

      doc.moveDown(1);
    });

    doc.fontSize(8)
      .fillColor('#999')
      .text('Note: Diagram images are not included in this PDF export. Please refer to the DICOM images or web-based report viewer for visual diagram annotations.', {
        align: 'left',
        width: this.contentWidth
      });

    doc.moveDown(2);
  }

  /**
   * Add signature section
   * @param {PDFDocument} doc - PDF document
   * @param {Object} report - Report document
   * @param {Object} signature - Digital signature document
   */
  addSignature(doc, report, signature) {
    // Ensure we're on a new section
    if (doc.y > this.pageHeight - 200) {
      doc.addPage();
    }

    doc.moveDown(2);

    // Signature box
    const boxTop = doc.y;
    const boxHeight = 100;

    doc.rect(this.margin, boxTop, this.contentWidth, boxHeight)
      .strokeColor('#1976d2')
      .lineWidth(1)
      .stroke();

    doc.fontSize(10)
      .fillColor('#000000')
      .text('ELECTRONIC SIGNATURE', this.margin + 10, boxTop + 10, {
        underline: true
      });

    doc.moveDown(0.5);

    const signatureData = [
      ['Signed by:', report.radiologistName || 'Unknown'],
      ['Date:', report.signedAt ? new Date(report.signedAt).toLocaleString() : 'Unknown'],
      ['Status:', signature ? 'Verified' : 'Signed']
    ];

    if (signature) {
      signatureData.push(['Signature ID:', signature.id || 'N/A']);
      signatureData.push(['Algorithm:', signature.algorithm || 'RSA-SHA256']);
    }

    let currentY = boxTop + 30;
    signatureData.forEach(([label, value]) => {
      doc.fontSize(9)
        .text(label, this.margin + 10, currentY, { continued: true, width: 100 })
        .font('Helvetica-Bold')
        .text(value, { width: 400 })
        .font('Helvetica');
      currentY += 15;
    });

    doc.moveDown(2);
  }

  /**
   * Add footer to all pages with hospital branding
   * @param {PDFDocument} doc - PDF document
   * @param {Object} report - Report document
   * @param {Object} hospitalSettings - Hospital settings for branding
   */
  addFooter(doc, report, hospitalSettings) {
    const pages = doc.bufferedPageRange();
    const hospitalName = hospitalSettings?.name || 'Medical Imaging Center';
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      const footerY = this.pageHeight - 50;

      // Horizontal line
      doc.moveTo(this.margin, footerY)
        .lineTo(this.pageWidth - this.margin, footerY)
        .strokeColor('#cccccc')
        .lineWidth(1)
        .stroke();

      // Hospital name
      doc.fontSize(8)
        .fillColor('#1976d2')
        .font('Helvetica-Bold')
        .text(hospitalName, this.margin, footerY + 5, { 
          align: 'center',
          width: this.contentWidth
        });

      // Report info and page number
      doc.fontSize(7)
        .fillColor('#666666')
        .font('Helvetica')
        .text(
          `Report ID: ${report.reportId} | Generated: ${new Date().toLocaleString()}`,
          this.margin,
          footerY + 18,
          { align: 'left', width: this.contentWidth / 2 }
        )
        .text(
          `Page ${i + 1} of ${pages.count}`,
          this.margin + this.contentWidth / 2,
          footerY + 18,
          { align: 'right', width: this.contentWidth / 2 }
        );
      
      // Confidentiality notice
      doc.fontSize(6)
        .fillColor('#999999')
        .text(
          'CONFIDENTIAL: This report contains protected health information (PHI). Unauthorized disclosure is prohibited.',
          this.margin,
          footerY + 30,
          { align: 'center', width: this.contentWidth }
        );
    }
  }

  /**
   * Format report status for display
   * @param {string} status - Report status
   * @returns {string} Formatted status
   */
  formatStatus(status) {
    const statusMap = {
      'draft': 'Draft',
      'preliminary': 'Preliminary',
      'final': 'Final',
      'finalized': 'Final',
      'amended': 'Amended',
      'cancelled': 'Cancelled'
    };

    return statusMap[status] || status;
  }
}

module.exports = new PDFService();
