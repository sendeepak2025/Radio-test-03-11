# Professional PDF Generator Documentation

## 📄 Overview

The Professional PDF Generator creates clinical-grade medical reports with embedded images, professional styling, headers, footers, page numbers, and comprehensive legal disclaimers.

**File:** `server/src/utils/professionalPDFGenerator.js`

---

## ✨ Features

### 1. Clinical-Grade PDF Template
- ✅ Professional medical report layout
- ✅ A4 page size with proper margins
- ✅ Structured sections with clear hierarchy
- ✅ Color-coded elements for readability

### 2. Embedded Images with Captions
- ✅ Base64 image embedding
- ✅ Automatic image optimization
- ✅ Descriptive captions with timestamps
- ✅ Proper image sizing and alignment

### 3. Professional Styling
- ✅ Consistent typography (Helvetica family)
- ✅ Color scheme for different elements
- ✅ Section headers with accent lines
- ✅ Status badges and indicators

### 4. Headers, Footers, Page Numbers
- ✅ Page headers with patient info (pages 2+)
- ✅ Page footers with report ID and confidentiality notice
- ✅ Automatic page numbering
- ✅ Separator lines for visual clarity

### 5. Legal Disclaimers
- ✅ AI-assisted analysis disclaimer
- ✅ Clinical use disclaimer
- ✅ Legal notice (HIPAA compliance)
- ✅ Report metadata section
- ✅ Electronic signature section

---

## 🎨 Design Specifications

### Color Palette
```javascript
{
  primary: '#2C3E50',      // Dark blue-gray (headers)
  secondary: '#34495E',    // Medium blue-gray (subheaders)
  accent: '#3498DB',       // Bright blue (accents)
  critical: '#E74C3C',     // Red (critical findings)
  warning: '#F39C12',      // Orange (warnings)
  success: '#27AE60',      // Green (success indicators)
  text: '#2C3E50',         // Dark text
  lightGray: '#ECF0F1',    // Light backgrounds
  mediumGray: '#BDC3C7',   // Medium backgrounds
  darkGray: '#7F8C8D'      // Dark backgrounds/footers
}
```

### Typography
- **Title:** 28pt Helvetica-Bold
- **Section Headers:** 16pt Helvetica-Bold
- **Frame Headers:** 13pt Helvetica-Bold
- **Body Text:** 11pt Helvetica
- **Metadata:** 9pt Helvetica
- **Footers:** 9pt Helvetica

### Page Layout
- **Size:** A4 (595 x 842 points)
- **Margins:** 72pt (1 inch) all sides
- **Header Area:** Top 40pt
- **Footer Area:** Bottom 40pt
- **Content Area:** 451 x 698 points

---

## 📚 API Reference

### Class: ProfessionalPDFGenerator

#### Constructor
```javascript
const generator = new ProfessionalPDFGenerator();
```

#### Methods

##### generateReport(reportData, outputPath)
Generate standard medical report PDF.

**Parameters:**
- `reportData` (Object) - Complete report data
- `outputPath` (String) - Path to save PDF file

**Returns:** Promise<String> - Path to generated PDF

**Example:**
```javascript
const generator = new ProfessionalPDFGenerator();
await generator.generateReport(reportData, './report.pdf');
```

##### generateReportWithQA(reportData, qaResults, dataQuality, outputPath)
Generate report with QA and data quality sections.

**Parameters:**
- `reportData` (Object) - Complete report data
- `qaResults` (Object) - Quality assurance results
- `dataQuality` (Object) - Data quality metrics
- `outputPath` (String) - Path to save PDF file

**Returns:** Promise<String> - Path to generated PDF

**Example:**
```javascript
const generator = new ProfessionalPDFGenerator();
await generator.generateReportWithQA(
  reportData,
  qaResults,
  dataQuality,
  './report-with-qa.pdf'
);
```

---

## 📋 Report Data Structure

### Required Fields
```javascript
{
  reportId: "SR-...",              // Report identifier
  patientName: "John Doe",         // Patient name
  patientID: "P12345",             // Patient ID
  studyInstanceUID: "1.2.3...",    // DICOM study UID
  modality: "XA",                  // Imaging modality
  radiologistName: "Dr. Smith",    // Radiologist name
  reportDate: "2025-10-27T...",    // Report date
  reportStatus: "draft|final",     // Report status
  frames: [...]                    // Frame analysis data
}
```

### Optional Fields
```javascript
{
  studyDescription: "Coronary Angiography",
  studyDate: "2025-10-27",
  version: "1.0",
  signedAt: "2025-10-27T...",
  radiologistSignature: "Dr. Smith",
  executiveSummary: "...",
  comprehensiveSummary: "...",
  stats: {
    totalFrames: 8,
    averageConfidence: 0.85,
    mostCommonFinding: "Normal",
    mostCommonFindingCount: 5,
    criticalFindings: [],
    servicesUsed: ["MedSigLIP", "MedGemma"],
    classificationDistribution: [...],
    highestConfidence: { score: 0.95, frameIndex: 0 },
    lowestConfidence: { score: 0.72, frameIndex: 3 }
  }
}
```

### Frame Data Structure
```javascript
{
  frameIndex: 0,
  timestamp: "2025-10-27T...",
  classification: {
    label: "Normal coronary arteries",
    confidence: 0.92
  },
  report: {
    findings: "...",
    impression: "...",
    recommendations: ["...", "..."]
  },
  imageSnapshot: {
    data: "data:image/png;base64,...",
    caption: "Frame 0 - Normal"
  },
  findingsText: "...",
  impression: "..."
}
```

### QA Results Structure
```javascript
{
  passed: true,
  score: 85,
  maxScore: 100,
  percentage: "85.0",
  grade: "Good",
  checks: [
    {
      name: "Frame Processing",
      passed: true,
      points: 18,
      maxPoints: 20
    }
  ],
  errors: [],
  warnings: ["..."]
}
```

### Data Quality Structure
```javascript
{
  framesWithCompleteData: 8,
  averageCompleteness: "87.3",
  imagesAvailable: 8,
  qualityScore: "Good"
}
```

---

## 📖 Report Sections

### 1. Title Page
- Report title and branding
- Report metadata box with:
  - Report ID
  - Patient information
  - Study UID
  - Report date
  - Radiologist name
- Status badge (DRAFT/FINAL/PRELIMINARY)

### 2. Executive Summary
- High-level overview of findings
- Total frames analyzed
- Most common findings
- Average confidence
- Critical findings alert

### 3. Study Information
- Modality
- Study description
- Study date
- Total frames
- AI services used

### 4. Quality Assurance (Optional)
- QA score and grade
- Quality check results
- Warnings and errors
- Pass/fail status

### 5. Data Quality Metrics (Optional)
- Frames with complete data
- Average data completeness
- Images available
- Overall quality score

### 6. Detailed Frame Analysis
For each frame:
- Frame number header
- Classification with confidence
- Findings text
- Impression
- Recommendations
- Embedded image with caption
- Visual separator

### 7. Comprehensive Summary
- Classification distribution
- Confidence analysis (avg, highest, lowest)
- Critical findings summary
- Overall assessment

### 8. Important Notices & Disclaimers
- AI-assisted analysis disclaimer (5 points)
- Clinical use disclaimer (5 points)
- Legal notice (HIPAA compliance)
- Report metadata
- Electronic signature (if final)

---

## 🎯 Usage Examples

### Example 1: Basic Report Generation
```javascript
const ProfessionalPDFGenerator = require('./utils/professionalPDFGenerator');

const reportData = {
  reportId: 'SR-2025-001',
  patientName: 'John Doe',
  patientID: 'P12345',
  studyInstanceUID: '1.2.840.113619.2.55.3.12345',
  modality: 'XA',
  radiologistName: 'Dr. Smith',
  reportDate: new Date(),
  reportStatus: 'draft',
  frames: [
    {
      frameIndex: 0,
      classification: {
        label: 'Normal coronary arteries',
        confidence: 0.92
      },
      report: {
        findings: 'The coronary angiography demonstrates normal coronary arteries.',
        impression: 'Normal coronary angiography.',
        recommendations: ['Continue medical management']
      },
      imageSnapshot: {
        data: 'data:image/png;base64,...'
      }
    }
  ]
};

const generator = new ProfessionalPDFGenerator();
const pdfPath = await generator.generateReport(reportData, './report.pdf');
console.log('PDF generated:', pdfPath);
```

### Example 2: Report with QA
```javascript
const qaResults = {
  passed: true,
  score: 85,
  maxScore: 100,
  percentage: "85.0",
  grade: "Good",
  checks: [...],
  warnings: []
};

const dataQuality = {
  framesWithCompleteData: 8,
  averageCompleteness: "87.3",
  imagesAvailable: 8
};

const pdfPath = await generator.generateReportWithQA(
  reportData,
  qaResults,
  dataQuality,
  './report-with-qa.pdf'
);
```

### Example 3: Express Route Integration
```javascript
router.get('/:reportId/pdf', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Fetch report from database
    const report = await StructuredReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Generate PDF
    const generator = new ProfessionalPDFGenerator();
    const tmpPath = path.join(__dirname, '../../tmp', `${reportId}.pdf`);
    
    await generator.generateReport(report.toObject(), tmpPath);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
    
    const fileStream = fs.createReadStream(tmpPath);
    fileStream.pipe(res);

    // Cleanup
    fileStream.on('end', () => {
      fs.unlink(tmpPath, err => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔧 Customization

### Custom Colors
```javascript
const generator = new ProfessionalPDFGenerator();
generator.colors.primary = '#1A237E';  // Custom primary color
generator.colors.accent = '#00BCD4';   // Custom accent color
```

### Custom Margins
```javascript
generator.pageMargins = {
  top: 90,
  bottom: 90,
  left: 90,
  right: 90
};
```

### Custom Section
```javascript
class CustomPDFGenerator extends ProfessionalPDFGenerator {
  addCustomSection(doc, data) {
    this.addSectionHeader(doc, 'CUSTOM SECTION');
    doc.fontSize(11)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text('Custom content here...');
    doc.moveDown(2);
  }

  async generateReport(reportData, outputPath) {
    // ... existing code ...
    this.addCustomSection(doc, reportData);
    // ... rest of code ...
  }
}
```

---

## 🐛 Troubleshooting

### Issue: Images Not Embedding
**Cause:** Invalid base64 data or unsupported format

**Solution:**
```javascript
// Ensure proper base64 format
const imageData = frame.imageSnapshot.data.replace(/^data:image\/\w+;base64,/, '');
const imageBuffer = Buffer.from(imageData, 'base64');
```

### Issue: PDF Generation Fails
**Cause:** Missing required fields

**Solution:**
```javascript
// Validate required fields before generation
const requiredFields = ['reportId', 'patientName', 'patientID', 'studyInstanceUID'];
requiredFields.forEach(field => {
  if (!reportData[field]) {
    throw new Error(`Missing required field: ${field}`);
  }
});
```

### Issue: Text Overflow
**Cause:** Long text exceeding page boundaries

**Solution:**
```javascript
// Check page space before adding content
if (doc.y > doc.page.height - 200) {
  doc.addPage();
}
```

### Issue: Font Not Found
**Cause:** Custom font not available

**Solution:**
```javascript
// Use built-in fonts only
doc.font('Helvetica');        // Regular
doc.font('Helvetica-Bold');   // Bold
doc.font('Helvetica-Oblique'); // Italic
```

---

## 📊 Performance Considerations

### Image Optimization
- Optimize images before embedding
- Use JPEG for photos (smaller size)
- Limit image dimensions (max 800x600)
- Compress base64 data

### Memory Management
- Stream PDF to file (don't buffer in memory)
- Clean up temporary files after sending
- Process large reports in chunks

### Generation Time
- Typical report: 2-5 seconds
- With images: 5-10 seconds
- Large reports (20+ frames): 10-20 seconds

---

## ✅ Quality Checklist

Before deploying:
- [ ] All required fields present
- [ ] Images embed correctly
- [ ] Page numbers accurate
- [ ] Headers/footers on all pages
- [ ] Disclaimers complete
- [ ] QA section included (if applicable)
- [ ] Signature section (if final)
- [ ] PDF opens without errors
- [ ] Text readable and properly formatted
- [ ] Colors display correctly

---

## 🔒 Security & Compliance

### HIPAA Compliance
- ✅ Confidentiality notice on every page
- ✅ Patient information protected
- ✅ Secure file handling
- ✅ Audit trail in metadata

### Data Protection
- ✅ Temporary files cleaned up
- ✅ No sensitive data in logs
- ✅ Encrypted transmission (HTTPS)
- ✅ Access control (authentication required)

### Legal Requirements
- ✅ AI disclaimer clearly stated
- ✅ Clinical use limitations documented
- ✅ Professional review requirement stated
- ✅ Electronic signature support

---

## 📈 Future Enhancements

### Planned Features
1. Multi-language support
2. Custom templates
3. Watermarking
4. Digital signatures (PKI)
5. PDF/A compliance (archival)
6. Batch generation
7. Email delivery
8. Cloud storage integration

### Enhancement Ideas
- Interactive PDFs with links
- Embedded DICOM viewer
- 3D visualization support
- Comparison reports
- Trend analysis charts

---

## 📞 Support

### Common Questions

**Q: Can I customize the template?**
A: Yes, extend the class and override methods.

**Q: What image formats are supported?**
A: PNG, JPEG, GIF (as base64 data URLs).

**Q: How do I add custom sections?**
A: Create custom methods and call them in generateReport().

**Q: Can I generate PDFs without images?**
A: Yes, images are optional. The generator handles missing images gracefully.

**Q: Is the PDF searchable?**
A: Yes, all text is searchable and selectable.

---

## 📚 Additional Resources

- **PDFKit Documentation:** http://pdfkit.org/
- **HIPAA Guidelines:** https://www.hhs.gov/hipaa/
- **Medical Report Standards:** HL7 CDA, DICOM SR
- **Accessibility:** PDF/UA standards

---

**Status: Production Ready** ✅

**Version:** 1.0  
**Last Updated:** October 27, 2025  
**Maintainer:** Development Team
