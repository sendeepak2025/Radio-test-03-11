# Professional PDF Generator - Quick Start Guide

## 🚀 5-Minute Quick Start

### 1. Import the Generator
```javascript
const ProfessionalPDFGenerator = require('./server/src/utils/professionalPDFGenerator');
```

### 2. Prepare Report Data
```javascript
const reportData = {
  reportId: 'SR-2025-001',
  patientName: 'John Doe',
  patientID: 'P12345',
  studyInstanceUID: '1.2.3.4.5',
  modality: 'XA',
  radiologistName: 'Dr. Smith',
  reportDate: new Date(),
  reportStatus: 'draft',
  frames: [/* frame data */]
};
```

### 3. Generate PDF
```javascript
const generator = new ProfessionalPDFGenerator();
await generator.generateReport(reportData, './report.pdf');
```

### 4. Done! 🎉
Your professional medical report PDF is ready.

---

## 📦 What's Included

✅ **Title Page** - Report metadata and patient info  
✅ **Executive Summary** - High-level overview  
✅ **Study Information** - Modality, date, AI services  
✅ **Frame Analysis** - Detailed per-frame breakdown with images  
✅ **Comprehensive Summary** - Overall findings and statistics  
✅ **Legal Disclaimers** - AI, clinical, and HIPAA notices  
✅ **Headers & Footers** - Page numbers and confidentiality  

---

## 🎨 Features

- **Professional Layout** - Clinical-grade template
- **Embedded Images** - Base64 images with captions
- **Color-Coded** - Visual hierarchy and readability
- **Page Management** - Automatic headers, footers, numbering
- **Legal Compliance** - HIPAA-compliant disclaimers

---

## 🧪 Test It

```bash
node test-pdf-generator.js
```

Generates 4 sample PDFs:
- `test-report-basic.pdf` - Standard report
- `test-report-with-qa.pdf` - With QA sections
- `test-report-final.pdf` - Final signed report
- `test-report-critical.pdf` - With critical findings

---

## 📖 Full Documentation

See `PDF_GENERATOR_DOCUMENTATION.md` for:
- Complete API reference
- Customization options
- Troubleshooting guide
- Security & compliance details

---

## 🔗 API Integration

Already integrated in your API:

```
GET /api/structured-reports/:reportId/pdf
Authorization: Bearer <token>
```

Returns PDF file for download.

---

## ✅ Status

**Production Ready** ✅  
**All Tests Passing** ✅  
**Fully Documented** ✅  
**HIPAA Compliant** ✅

---

**Need Help?** Check `PDF_GENERATOR_DOCUMENTATION.md`
