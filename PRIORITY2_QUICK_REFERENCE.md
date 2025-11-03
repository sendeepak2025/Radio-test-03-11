# Priority 2 Implementation - Quick Reference Guide

## 🚀 Quick Start

### Run Tests
```bash
node test-priority2-implementation.js
```

### Create Consolidated Report
```javascript
const response = await fetch('/api/structured-reports/consolidated', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studyInstanceUID: '1.2.3.4.5',
    patientID: 'P12345',
    patientName: 'John Doe',
    modality: 'XA',
    radiologistName: 'Dr. Smith',
    frames: aiAnalysisResults
  })
});
```

---

## 📦 Utility Modules

### 1. Data Extraction (`dataExtraction.js`)

```javascript
const { extractCompleteData, validateExtractedData } = require('./utils/dataExtraction');

// Extract data from single frame
const extracted = extractCompleteData(frame);
console.log('Completeness:', extracted.dataCompleteness);

// Validate extracted data
const validation = validateExtractedData(extracted);
console.log('Valid:', validation.isValid);
console.log('Issues:', validation.issues);
console.log('Warnings:', validation.warnings);
```

**Key Functions:**
- `extractCompleteData(frame)` - Extract all data from frame
- `extractMultipleFrames(frames)` - Process multiple frames
- `validateExtractedData(extracted)` - Validate data quality

**Data Completeness Scoring:**
- Classification: 20 points
- Findings: 20 points
- Report: 30 points
- Quality: 15 points
- Image: 10 points
- Metadata: 5 points

---

### 2. Image Embedding (`imageEmbedding.js`)

```javascript
const { prepareImagesFromFrames, generateCaption } = require('./utils/imageEmbedding');

// Prepare images from frames
const images = await prepareImagesFromFrames(frames);

// Generate caption
const caption = generateCaption(frame, {
  includeFrameIndex: true,
  includeClassification: true,
  includeConfidence: true
});
```

**Key Functions:**
- `processImageData(imageData)` - Validate and process
- `optimizeImage(buffer, options)` - Optimize for size
- `generateCaption(frame, options)` - Create caption
- `prepareImagesFromFrames(frames)` - Batch process

**Image Optimization:**
- Max width: 800px
- Max height: 600px
- Quality: 85%
- Format: JPEG/PNG

---

### 3. Quality Assurance (`qualityAssurance.js`)

```javascript
const { performQualityAssurance, logQAResults } = require('./utils/qualityAssurance');

// Perform QA
const qaResults = performQualityAssurance(reportData);

// Log results
logQAResults(qaResults, reportId);

// Check if passed
if (qaResults.passed) {
  console.log('QA Passed:', qaResults.grade);
} else {
  console.log('QA Failed:', qaResults.errors);
}
```

**QA Checks (100 points total):**
1. Frame Processing (20 pts)
2. Required Fields (20 pts)
3. Confidence Scores (15 pts)
4. Timestamps (10 pts)
5. Image Data (15 pts)
6. Clinical Data (15 pts)
7. Metadata (5 pts)

**Grading:**
- 90-100: Excellent ⭐⭐⭐⭐⭐
- 75-89: Good ⭐⭐⭐⭐
- 60-74: Acceptable ⭐⭐⭐
- 40-59: Poor ⭐⭐
- 0-39: Failed ⭐

**Pass Criteria:**
- Score ≥ 60 points
- Zero critical errors

---

### 4. Error Handling (`errorHandling.js`)

```javascript
const {
  ValidationError,
  handleError,
  validateRequest,
  asyncHandler
} = require('./utils/errorHandling');

// Validate request
try {
  validateRequest(data, {
    studyUID: { required: true, type: 'string' },
    patientID: { required: true, type: 'string' }
  });
} catch (error) {
  console.error('Validation failed:', error.details);
}

// Wrap async route
router.post('/endpoint', asyncHandler(async (req, res) => {
  // Your code here
}));

// Handle missing data
const value = handleMissingData('field', 'default');

// Safe extraction
const result = safeExtract(
  () => data.nested.field,
  'fallback',
  'context'
);
```

**Custom Errors:**
- `ValidationError` (400) - Invalid input
- `DataExtractionError` (422) - Extraction failed
- `PDFGenerationError` (500) - PDF failed
- `ImageProcessingError` (422) - Image failed

---

## 🔄 Complete Workflow

### Step-by-Step Process

```javascript
// 1. Extract data from frames
const extractedFrames = extractMultipleFrames(frames);

// 2. Validate and filter
const { validFrames, invalidFrames } = validateAndFilterFrames(extractedFrames);

// 3. Validate data quality
const validations = validFrames.map(f => validateExtractedData(f));

// 4. Prepare images
const images = await prepareImagesFromFrames(validFrames);

// 5. Calculate statistics
const stats = calculateAggregateStatistics(validFrames);

// 6. Generate summaries
const summary = generateExecutiveSummary(stats);

// 7. Build report
const report = buildComprehensiveReport(validFrames, stats, images);

// 8. Perform QA
const qaResults = performQualityAssurance(report);

// 9. Save to database
await report.save();
```

---

## 📊 Response Structure

```javascript
{
  success: true,
  report: {
    reportId: "SR-...",
    studyInstanceUID: "1.2.3.4.5",
    patientID: "P12345",
    patientName: "John Doe",
    modality: "XA",
    reportStatus: "draft",
    radiologistName: "Dr. Smith",
    findings: [...],
    findingsText: "...",
    impression: "...",
    technique: "...",
    keyImages: [...],
    reportDate: "2025-10-27T..."
  },
  stats: {
    totalFrames: 8,
    averageConfidence: 0.85,
    mostCommonFinding: "Normal",
    criticalFindings: []
  },
  validationStats: {
    validFrames: 8,
    invalidFrames: 0,
    validPercentage: 100
  },
  qaResults: {
    passed: true,
    score: 85.5,
    grade: "Good",
    errors: [],
    warnings: []
  },
  dataQuality: {
    framesWithCompleteData: 8,
    averageCompleteness: "87.3",
    imagesAvailable: 8
  },
  message: "Consolidated report created from 8 valid frames"
}
```

---

## 🧪 Testing Examples

### Test Data Extraction
```javascript
const frame = {
  frameIndex: 0,
  classification: { label: 'Normal', confidence: 0.92 },
  findings: [...],
  report: { findings: '...', impression: '...' },
  imageSnapshot: { data: 'base64...' }
};

const extracted = extractCompleteData(frame);
console.log('Completeness:', extracted.dataCompleteness);
```

### Test Image Processing
```javascript
const images = await prepareImagesFromFrames(frames);
console.log('Available:', images.filter(i => i.available).length);
```

### Test QA
```javascript
const qaResults = performQualityAssurance(reportData);
console.log('Score:', qaResults.percentage);
console.log('Grade:', qaResults.grade);
```

### Test Error Handling
```javascript
try {
  validateRequest(data, schema);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.details.errors);
  }
}
```

---

## 🐛 Common Issues

### Issue: Low Data Completeness
**Solution:** Check if all required fields are present in AI analysis results
```javascript
const validation = validateExtractedData(extracted);
console.log('Issues:', validation.issues);
console.log('Warnings:', validation.warnings);
```

### Issue: QA Not Passing
**Solution:** Review QA results to identify specific problems
```javascript
console.log('Errors:', qaResults.errors);
console.log('Warnings:', qaResults.warnings);
console.log('Failed checks:', qaResults.checks.filter(c => !c.passed));
```

### Issue: Images Not Embedding
**Solution:** Validate image data format
```javascript
const validation = await validateImageForEmbedding(imageData);
console.log('Valid:', validation.isValid);
console.log('Errors:', validation.errors);
```

### Issue: Validation Errors
**Solution:** Check request data against schema
```javascript
try {
  validateRequest(data, schema);
} catch (error) {
  console.log('Validation errors:', error.details.errors);
}
```

---

## 📈 Performance Tips

### 1. Batch Processing
Process multiple frames at once:
```javascript
const extractedFrames = extractMultipleFrames(frames);
const images = await prepareImagesFromFrames(frames);
```

### 2. Image Optimization
Optimize images before embedding:
```javascript
const optimized = await optimizeImage(buffer, {
  maxWidth: 800,
  maxHeight: 600,
  quality: 85
});
```

### 3. Error Recovery
Use retry logic for transient errors:
```javascript
const result = await retryOperation(
  () => processData(),
  { maxRetries: 3, initialDelay: 1000 }
);
```

### 4. Safe Extraction
Use safe extraction to prevent crashes:
```javascript
const value = safeExtract(
  () => data.nested.field,
  'fallback'
);
```

---

## 🔍 Debugging

### Enable Detailed Logging
```javascript
console.log('Extracted data:', JSON.stringify(extracted, null, 2));
console.log('QA results:', JSON.stringify(qaResults, null, 2));
console.log('Validation:', JSON.stringify(validation, null, 2));
```

### Check Data Completeness
```javascript
validFrames.forEach(frame => {
  console.log(`Frame ${frame.frameIndex}: ${frame.dataCompleteness}%`);
});
```

### Review QA Checks
```javascript
qaResults.checks.forEach(check => {
  console.log(`${check.name}: ${check.points}/${check.maxPoints}`);
  check.details.forEach(d => console.log(`  ${d}`));
});
```

---

## 📚 Additional Resources

- **Full Documentation:** `PRIORITY2_IMPLEMENTATION_COMPLETE.md`
- **Test Suite:** `test-priority2-implementation.js`
- **API Endpoint:** `POST /api/structured-reports/consolidated`

---

## ✅ Checklist

Before deploying:
- [ ] Run test suite: `node test-priority2-implementation.js`
- [ ] Verify QA scores are ≥60%
- [ ] Check data completeness is ≥80%
- [ ] Test with real AI analysis data
- [ ] Verify image embedding works
- [ ] Test error handling scenarios
- [ ] Review console logs for warnings
- [ ] Validate PDF generation

---

## 🎯 Key Metrics to Monitor

- **Data Completeness:** Target ≥80%
- **QA Score:** Target ≥75%
- **Valid Frames:** Target 100%
- **Images Available:** Target 100%
- **Processing Time:** Monitor per frame
- **Error Rate:** Target <5%

---

**Status: Production Ready** ✅
