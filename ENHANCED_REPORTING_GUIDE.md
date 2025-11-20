# Enhanced Reporting System - Implementation Guide

## Overview

This guide documents the comprehensive enhancements made to the reporting system, including expanded template library, modality-specific validation, user template creation, multi-region support, adaptive learning, and interactive diagram annotations.

---

## Table of Contents

1. [New Features Summary](#new-features-summary)
2. [Template Library Expansion](#template-library-expansion)
3. [Modality-Specific Validation](#modality-specific-validation)
4. [User Template Creation](#user-template-creation)
5. [Multi-Region Support](#multi-region-support)
6. [Adaptive Learning System](#adaptive-learning-system)
7. [Interactive Diagram Annotations](#interactive-diagram-annotations)
8. [API Endpoints](#api-endpoints)
9. [Frontend Integration Guide](#frontend-integration-guide)
10. [Testing and Deployment](#testing-and-deployment)

---

## New Features Summary

### ✅ Completed Features

1. **Expanded Template Library** (12 new templates)
   - CT Chest, CT Head/Brain, CT Pulmonary Angiogram
   - MRI Cervical Spine, MRI Lumbar Spine, MRI Knee
   - X-Ray Upper/Lower Extremities
   - Ultrasound Abdomen, Ultrasound Pelvis (Gynecologic)
   - Mammography (BI-RADS compliant)
   - Fluoroscopy Upper GI

2. **Comprehensive Validation Rules**
   - CT: Contrast documentation, slice thickness, multi-phase protocols
   - MRI: Sequence documentation, gadolinium tracking, field strength
   - X-Ray: View specification, orthogonal views for extremities
   - Angiography: Access site, fluoroscopy time, closure method
   - Ultrasound: Probe frequency, fasting status, approach documentation
   - Mammography: BI-RADS density, category, view documentation

3. **User Template Creation System**
   - Create custom templates (personal or hospital-wide)
   - Clone existing templates for customization
   - Update and version templates
   - Template sharing and scope management

4. **Multi-Region Support**
   - Combined template creation (e.g., CT Chest+Abdomen)
   - Multi-region template suggestions
   - Automatic section merging

5. **Adaptive Learning**
   - Tracks template selection accuracy
   - Auto-adjusts matching weights based on corrections
   - User behavior pattern analysis
   - Template performance analytics

6. **Interactive Diagram Annotations**
   - 13 diagram types (chest, brain, spine, extremities, etc.)
   - 30+ annotation types (markers, measurements, outlines, arrows)
   - Measurement calculations (distance, angles)
   - Severity grading and color coding
   - Link annotations to report findings

---

## Template Library Expansion

### New Templates Added

#### 1. CT Chest (TPL-CT-CHEST-001)
**Modalities:** CT  
**Body Parts:** CHEST, THORAX, LUNG, MEDIASTINUM  
**Priority:** 95

**Sections:**
- Clinical Indication (required)
- Technique (required) - Contrast, slice thickness
- Comparison (optional)
- Findings (required) - Lungs, Airways, Mediastinum, Heart, Vessels, Pleura, Chest Wall, Bones
- Impression (required)
- Recommendations (optional)

**Special Validation:**
- Requires contrast documentation if used
- Requires slice thickness
- Contrast enhancement must be described in findings

**Diagram Support:** chest-anatomy with nodule markers, measurements, region outlines

---

#### 2. MRI Cervical Spine (TPL-MRI-CSPINE-001)
**Modalities:** MR, MRI  
**Body Parts:** CSPINE, C-SPINE, CERVICAL, NECK  
**Priority:** 90

**Sections:**
- Clinical Indication (required)
- Technique (required) - Sequences, field strength, gadolinium
- Comparison (optional)
- Findings (required) - Level-by-level (C2-C3 through C7-T1)
- Impression (required)

**Special Validation:**
- Requires T1 and T2 sequences
- Gadolinium documentation if used
- Level-by-level assessment required (C2-C3, C3-C4, C4-C5, C5-C6, C6-C7, C7-T1)

**Diagram Support:** spine-lateral with disc markers, stenosis grading, herniation arrows

---

#### 3. Mammography (TPL-MAMMO-001)
**Modalities:** MG, DM  
**Body Parts:** BREAST, CHEST  
**Priority:** 95

**Sections:**
- Clinical Indication (required)
- Technique (required) - 2D/3D, views
- Comparison (required for screening)
- Breast Composition (required) - BI-RADS A/B/C/D
- Findings (required)
- Impression (required) - Must include BI-RADS category

**Special Validation:**
- BI-RADS breast density required (A, B, C, or D)
- Views must be documented (CC, MLO)
- BI-RADS category 0-6 required in impression
- Management recommendation required

**Diagram Support:** breast-quadrants with mass markers, calcification markers, clock position

---

### Full Template List (17 Total)

| Template ID | Name | Modality | Priority | Diagram Support |
|-------------|------|----------|----------|-----------------|
| TPL-CORONARY-ANGIO-001 | Coronary Angiography | XA, RF | 100 | No |
| TPL-CHEST-XRAY-001 | Chest X-Ray | CR, DX, RF | 90 | chest-anatomy |
| TPL-BRAIN-MRI-001 | Brain MRI | MR, MRI | 85 | brain-axial |
| TPL-CT-ABDOMEN-001 | CT Abdomen/Pelvis | CT | 80 | abdomen-organs |
| TPL-GENERAL-RAD-001 | General Radiology | ALL | 0 | No |
| **TPL-CT-CHEST-001** | **CT Chest** | **CT** | **95** | **chest-anatomy** |
| **TPL-MRI-CSPINE-001** | **MRI Cervical Spine** | **MR, MRI** | **90** | **spine-lateral** |
| **TPL-MRI-LSPINE-001** | **MRI Lumbar Spine** | **MR, MRI** | **90** | **spine-lateral** |
| **TPL-US-ABDOMEN-001** | **Ultrasound Abdomen** | **US** | **85** | **abdomen-organs** |
| **TPL-MAMMO-001** | **Mammography (BI-RADS)** | **MG, DM** | **95** | **breast-quadrants** |
| **TPL-XRAY-EXTREMITY-UPPER-001** | **X-Ray Upper Extremity** | **CR, DX** | **80** | **extremity-bones** |
| **TPL-XRAY-EXTREMITY-LOWER-001** | **X-Ray Lower Extremity** | **CR, DX** | **80** | **extremity-bones** |
| **TPL-CT-BRAIN-001** | **CT Head/Brain** | **CT** | **95** | **brain-axial** |
| **TPL-US-PELVIS-GYN-001** | **Ultrasound Pelvis (Gyn)** | **US** | **85** | **pelvis-sagittal** |
| **TPL-FLUORO-UGI-001** | **Fluoroscopy Upper GI** | **RF, XA** | **75** | No |
| **TPL-CTPA-001** | **CT Pulmonary Angiogram** | **CT** | **100** | **pulmonary-vessels** |
| **TPL-MRI-KNEE-001** | **MRI Knee** | **MR, MRI** | **90** | **knee-sagittal** |

---

## Modality-Specific Validation

### Implementation

**File:** `server/src/utils/modalityValidationRules.js`

### Validation Rules by Modality

#### CT Validation
```javascript
Rules:
1. Contrast consistency: If "contrast" in technique → must appear in findings
2. Slice thickness: Recommended documentation
3. Multi-phase: Arterial, venous, delayed phase documentation
4. Radiation dose: DLP, CTDI documentation (recommended)

Error Example:
❌ Technique: "CT with IV contrast"
   Findings: "Liver appears normal"
   ERROR: "Contrast mentioned but enhancement pattern not documented"

✅ Technique: "CT with IV contrast"
   Findings: "Liver shows homogeneous contrast enhancement"
   PASS
```

#### MRI Validation
```javascript
Rules:
1. Sequences: T1 and T2 required minimum
2. Gadolinium: If used in technique → must describe enhancement in findings
3. Field strength: 1.5T or 3.0T recommended
4. STIR sequence: Recommended for spine studies

Error Example:
❌ Technique: "MRI with gadolinium"
   Findings: "Brain appears normal"
   ERROR: "Gadolinium mentioned but enhancement not documented"

✅ Technique: "MRI sequences: T1, T2, T1+C (gadolinium)"
   Findings: "Lesion shows ring enhancement on post-gadolinium T1"
   PASS
```

#### X-Ray Validation
```javascript
Rules:
1. Views: Must specify (AP, PA, lateral, oblique)
2. Extremities: Minimum 2 orthogonal views
3. Position: Portable, upright, supine documentation

Error Example:
❌ Technique: "X-ray obtained"
   ERROR: "Views not specified (AP, PA, lateral required)"

✅ Technique: "AP and lateral views"
   PASS
```

#### Angiography Validation
```javascript
Rules:
1. Access site: Required (radial, femoral, brachial)
2. Fluoroscopy time: Required for radiation safety
3. Closure method: Required for interventional procedures
4. Contrast agent: Type and volume (recommended)

Error Example:
❌ Technique: "Angiography performed"
   ERROR: "Access site not documented"
   ERROR: "Fluoroscopy time not documented"

✅ Technique: "Right radial access, fluoroscopy time 8.5 minutes, manual compression hemostasis"
   PASS
```

#### Ultrasound Validation
```javascript
Rules:
1. Probe frequency: MHz documentation (recommended)
2. Abdominal US: Fasting status required
3. Pelvic US: Approach required (transabdominal/transvaginal), bladder status
4. Doppler: If used, flow characteristics in findings

Error Example:
❌ Technique: "Pelvic ultrasound"
   ERROR: "Approach not specified (transabdominal/transvaginal)"

✅ Technique: "Transabdominal and transvaginal approach, full bladder"
   PASS
```

#### Mammography Validation
```javascript
Rules:
1. Breast density: BI-RADS A/B/C/D required
2. Views: CC and MLO required
3. BI-RADS category: 0-6 required in impression
4. Comparison: Required for screening
5. Management recommendation: Required

Error Example:
❌ Impression: "No masses seen"
   ERROR: "BI-RADS category not specified"
   ERROR: "Breast density not documented"

✅ Breast Composition: "BI-RADS C - Heterogeneously dense"
   Impression: "BI-RADS 1 - Negative. Routine screening in 1 year."
   PASS
```

---

## User Template Creation

### API Endpoints

#### Create Custom Template
```http
POST /api/templates/custom
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Custom CT Chest with Cardiac Emphasis",
  "description": "Modified CT chest template focusing on cardiac structures",
  "category": "radiology",
  "scope": "personal", // or "hospital"
  "matchingCriteria": {
    "modalities": ["CT"],
    "bodyParts": ["CHEST", "HEART"],
    "keywords": ["cardiac", "coronary", "heart"],
    "procedureTypes": ["diagnostic"]
  },
  "sections": [
    {
      "id": "clinical-indication",
      "title": "Clinical Indication",
      "order": 1,
      "required": true
    },
    {
      "id": "cardiac-function",
      "title": "Cardiac Function Assessment",
      "order": 5,
      "required": true
    }
  ],
  "fieldOptions": {
    "lv": ["Normal", "Hypertrophy", "Dilated", "Dysfunction"],
    "rv": ["Normal", "Enlargement", "Dysfunction"]
  },
  "priority": 85
}
```

#### Clone Template
```http
POST /api/templates/clone/TPL-CT-CHEST-001
Authorization: Bearer <token>
Content-Type: application/json

{
  "scope": "personal" // or "hospital"
}

Response:
{
  "success": true,
  "template": {
    "templateId": "TPL-CLONE-1234567890-ABC123",
    "name": "CT Chest Report (Copy)",
    "customizable": true,
    ...
  }
}
```

#### Update Template
```http
PUT /api/templates/custom/TPL-CLONE-1234567890-ABC123
Authorization: Bearer <token>

{
  "name": "My Custom CT Chest Template",
  "priority": 90,
  "changeDescription": "Added cardiac function section"
}
```

#### Get User Templates
```http
GET /api/templates/user
Authorization: Bearer <token>

Response:
{
  "success": true,
  "templates": [...],
  "count": 5
}
```

---

## Multi-Region Support

### Combined Template Creation

#### Suggest Multi-Region Templates
```http
POST /api/templates/suggest-multi-region
Authorization: Bearer <token>

{
  "regions": [
    {
      "modality": "CT",
      "bodyPart": "CHEST",
      "studyDescription": "CT chest"
    },
    {
      "modality": "CT",
      "bodyPart": "ABDOMEN",
      "studyDescription": "CT abdomen"
    }
  ]
}

Response:
{
  "success": true,
  "suggestions": [
    {
      "region": "CHEST",
      "template": {...},
      "matchScore": 100
    },
    {
      "region": "ABDOMEN",
      "template": {...},
      "matchScore": 100
    }
  ],
  "combinedTemplate": null,
  "recommendation": "Use individual templates for each region"
}
```

#### Create Combined Template
```http
POST /api/templates/create-combined
Authorization: Bearer <token>

{
  "templateIds": ["TPL-CT-CHEST-001", "TPL-CT-ABDOMEN-001"],
  "combinedName": "CT Chest and Abdomen"
}

Response:
{
  "success": true,
  "template": {
    "templateId": "TPL-COMBINED-1234567890-XYZ789",
    "name": "CT Chest and Abdomen",
    "sections": [
      { "id": "clinical-indication", ... },
      { "id": "technique", ... },
      { "id": "findings-chest", ... },
      { "id": "findings-abdomen", ... },
      { "id": "impression", ... }
    ],
    ...
  }
}
```

---

## Adaptive Learning System

### How It Works

1. **Track Selections**: When radiologist creates a report, system records suggested template vs. actual template used
2. **Detect Corrections**: If radiologist changes template, system analyzes why
3. **Adjust Weights**: Automatically decreases weights for incorrect suggestion, increases for correct template
4. **Learn Patterns**: Analyzes user behavior to personalize template suggestions

### API Endpoints

#### Get Accuracy Statistics
```http
GET /api/templates/accuracy-stats
Authorization: Bearer <token>

Response:
{
  "templates": [
    {
      "templateId": "TPL-CT-CHEST-001",
      "name": "CT Chest Report",
      "totalSelections": 250,
      "correctSelections": 235,
      "incorrectSelections": 15,
      "accuracy": "94.00%",
      "currentWeights": {
        "modalityWeight": 50,
        "bodyPartWeight": 30,
        "keywordWeight": 5,
        "procedureTypeWeight": 15
      }
    }
  ],
  "overall": {
    "totalTemplates": 17,
    "averageAccuracy": 92.5
  }
}
```

#### Get User Patterns
```http
GET /api/templates/user-patterns/:userId
Authorization: Bearer <token>

Response:
{
  "userId": "user123",
  "reportCount": 150,
  "patterns": {
    "mostUsedTemplate": {
      "templateId": "TPL-CT-CHEST-001",
      "count": 75,
      "percentage": "50.00%"
    },
    "primaryModality": {
      "modality": "CT",
      "count": 100,
      "percentage": "66.67%"
    },
    "templateDistribution": {...},
    "modalityDistribution": {...}
  }
}
```

---

## Interactive Diagram Annotations

### Supported Diagram Types

1. **chest-anatomy** - Chest CT/X-ray
2. **abdomen-organs** - Abdominal imaging
3. **brain-axial** - Brain CT/MRI axial
4. **brain-sagittal** - Brain sagittal views
5. **spine-lateral** - Spine lateral views
6. **spine-coronal** - Spine coronal views
7. **pelvis-sagittal** - Pelvic imaging
8. **extremity-bones** - Extremity X-rays
9. **breast-quadrants** - Mammography
10. **pulmonary-vessels** - CTPA
11. **knee-sagittal** - Knee MRI
12. **multi-region** - Combined studies

### Annotation Types (30+)

- **marker** - Simple location marker
- **measurement** - Distance measurement
- **outline** - Region outline
- **arrow** - Directional arrow
- **text-label** - Text annotation
- **nodule-marker** - Lung nodule marker
- **fracture-line** - Fracture location
- **disc-level-marker** - Spine disc level
- **stenosis-grade** - Stenosis severity
- **herniation-arrow** - Disc herniation
- **pe-marker** - Pulmonary embolism
- **mass-marker** - Mass location
- **calcification-marker** - Calcification
- **clock-position** - Breast clock position
- **distance-from-nipple** - Breast measurement
- **angle-measurement** - Angular measurement
- **displacement-arrow** - Fracture displacement
- **meniscal-tear-marker** - Meniscal tear
- **ligament-tear-marker** - Ligament injury
- ... and more

### API Usage

#### Create Annotation
```http
POST /api/annotations
Authorization: Bearer <token>

{
  "reportId": "RPT-1234567890",
  "diagramType": "chest-anatomy",
  "annotationType": "nodule-marker",
  "coordinates": {
    "x": 250,
    "y": 180
  },
  "label": "RLL nodule",
  "description": "6mm ground-glass nodule in right lower lobe",
  "measurement": {
    "value": 6,
    "unit": "mm"
  },
  "severity": "mild",
  "color": "#FFFF00",
  "linkedFinding": "finding-nodule-1"
}
```

#### Get Annotations for Report
```http
GET /api/annotations/report/RPT-1234567890
Authorization: Bearer <token>

Response:
{
  "success": true,
  "annotations": [
    {
      "annotationId": "ANN-1234567890-ABC123",
      "diagramType": "chest-anatomy",
      "annotationType": "nodule-marker",
      "coordinates": {...},
      "label": "RLL nodule",
      ...
    }
  ],
  "count": 1
}
```

#### Calculate Distance
```http
POST /api/annotations/calculate/distance
Authorization: Bearer <token>

{
  "x1": 100,
  "y1": 150,
  "x2": 200,
  "y2": 300,
  "pixelsPerMM": 2.5
}

Response:
{
  "success": true,
  "distance": {
    "pixels": 180.28,
    "mm": 72.11,
    "cm": 7.21
  }
}
```

#### Calculate Angle
```http
POST /api/annotations/calculate/angle
Authorization: Bearer <token>

{
  "x1": 100, "y1": 100,  // Point 1
  "x2": 150, "y2": 150,  // Vertex (Point 2)
  "x3": 200, "y3": 100   // Point 3
}

Response:
{
  "success": true,
  "angle": {
    "degrees": 90.0,
    "description": "Right"
  }
}
```

---

## API Endpoints Summary

### Template Management
- `GET /api/templates/user` - Get user's custom templates
- `POST /api/templates/custom` - Create custom template
- `PUT /api/templates/custom/:templateId` - Update template
- `DELETE /api/templates/custom/:templateId` - Delete template
- `POST /api/templates/clone/:templateId` - Clone template
- `POST /api/templates/suggest-multi-region` - Multi-region suggestions
- `POST /api/templates/create-combined` - Create combined template

### Diagram Annotations
- `POST /api/annotations` - Create annotation
- `GET /api/annotations/report/:reportId` - Get report annotations
- `GET /api/annotations/report/:reportId/diagram/:diagramType` - Get by diagram
- `PUT /api/annotations/:annotationId` - Update annotation
- `DELETE /api/annotations/:annotationId` - Delete annotation
- `POST /api/annotations/batch` - Batch create (for AI)
- `POST /api/annotations/calculate/distance` - Calculate distance
- `POST /api/annotations/calculate/angle` - Calculate angle
- `GET /api/annotations/export/:reportId` - Export annotations
- `GET /api/annotations/stats/:reportId` - Get statistics

---

## Frontend Integration Guide

### Template Selection

```typescript
// Auto-select template on study open
const selectTemplate = async (studyMetadata) => {
  const response = await fetch('/api/reports/templates/suggest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      modality: studyMetadata.modality,
      bodyPart: studyMetadata.bodyPart,
      studyDescription: studyMetadata.studyDescription,
      procedureType: 'diagnostic'
    })
  });

  const { template, matchScore } = await response.json();
  
  // Record selection for adaptive learning
  recordTemplateSelection(studyMetadata.studyInstanceUID, template.templateId);
  
  return template;
};
```

### Diagram Annotations

```typescript
// Create annotation on diagram click
const createAnnotation = async (reportId, diagramType, coordinates, type) => {
  const response = await fetch('/api/annotations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reportId,
      diagramType,
      annotationType: type,
      coordinates,
      label: 'User annotation'
    })
  });

  return await response.json();
};

// Load annotations on diagram render
const loadAnnotations = async (reportId, diagramType) => {
  const response = await fetch(
    `/api/annotations/report/${reportId}/diagram/${diagramType}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { annotations } = await response.json();
  
  // Render annotations on canvas
  annotations.forEach(ann => {
    renderAnnotationOnDiagram(ann);
  });
};
```

### Validation Preview

```typescript
// Show validation requirements before report creation
const showValidationPreview = async (modality) => {
  const preview = getModalityValidationPreview(modality);
  
  // Display to user
  alert(`
    Required fields: ${preview.requiredFields.join(', ')}
    Special rules: ${preview.specialRules.join('; ')}
  `);
};
```

---

## Testing and Deployment

### 1. Seed Enhanced Templates

```bash
cd server
node src/seed/seedEnhancedTemplates.js
```

Expected output:
```
✅ Connected to MongoDB
✅ Created template: CT Chest Report (TPL-CT-CHEST-001)
✅ Created template: MRI Cervical Spine Report (TPL-MRI-CSPINE-001)
...
🎉 Enhanced template seeding completed!
📊 New templates added: 12
```

### 2. Test Validation Rules

```javascript
// Test CT contrast validation
const report = {
  modality: 'CT',
  technique: 'CT with IV contrast',
  findingsText: 'Liver appears normal', // Missing contrast enhancement
  impression: 'Normal study'
};

const validation = validateReportForSigning(report);
// Expected: validation.errors = ['Contrast mentioned but not documented in findings']
```

### 3. Test Template Selection

```bash
# Test auto-selection
curl -X POST http://localhost:5000/api/reports/templates/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "modality": "CT",
    "bodyPart": "CHEST",
    "studyDescription": "CT chest with contrast"
  }'
```

### 4. Test Diagram Annotations

```bash
# Create annotation
curl -X POST http://localhost:5000/api/annotations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "RPT-123",
    "diagramType": "chest-anatomy",
    "annotationType": "nodule-marker",
    "coordinates": {"x": 250, "y": 180},
    "label": "RLL nodule"
  }'
```

---

## Migration Notes

### Database Migration

No migration required - new collections will be created automatically:
- `diagram_annotations` - Stores diagram annotations
- `report_templates` - Enhanced with new fields (diagramAnnotations, validationRules)

### Backward Compatibility

All new features are backward compatible:
- Existing reports continue to work
- Old templates remain functional
- Validation is only enforced at signing (not creation)
- Diagram annotations are optional

---

## Performance Considerations

1. **Template Selection**: Cached for 5 minutes per study
2. **Validation**: Runs only at sign time, not on every save
3. **Annotations**: Indexed by reportId for fast retrieval
4. **Adaptive Learning**: Runs asynchronously, doesn't block report creation

---

## Support and Troubleshooting

### Common Issues

**Q: Template not suggesting correctly**  
A: Check matching criteria weights. Modality weight (50) > Body Part (30) > Keywords (5)

**Q: Validation errors blocking signing**  
A: Review modality-specific rules. Use `getModalityValidationPreview(modality)` to see requirements

**Q: Annotations not appearing**  
A: Verify diagramType matches between creation and retrieval. Check coordinates are within diagram bounds.

**Q: Adaptive learning not adjusting weights**  
A: Ensure recordTemplateSelection is called after template application. Check usageStats.selections array.

---

## Next Steps

1. **Frontend UI**: Build React components for template selection and diagram annotations
2. **AI Integration**: Connect MedSigClip/MedGemma to auto-create annotations
3. **Analytics Dashboard**: Visualize template accuracy and user patterns
4. **Mobile Support**: Optimize diagram annotations for touch devices
5. **Export Enhancement**: Include diagram annotations in PDF exports

---

**Version:** 1.0  
**Last Updated:** 2025-01-18  
**Author:** Enhanced Reporting System Team
