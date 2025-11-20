# Enhanced Reporting System - Quick Reference

## 🚀 Quick Start

### 1. Seed Templates
```bash
cd server
node src/seed/seedEnhancedTemplates.js
```

### 2. Test API
```bash
# Get all templates
curl http://localhost:5000/api/reports/templates

# Suggest template
curl -X POST http://localhost:5000/api/reports/templates/suggest \
  -H "Content-Type: application/json" \
  -d '{"modality": "CT", "bodyPart": "CHEST"}'
```

---

## 📋 Template Library (17 Total)

| Modality | Template | Priority | Diagram |
|----------|----------|----------|---------|
| **CT** | CT Chest | 95 | ✅ chest-anatomy |
| **CT** | CT Abdomen/Pelvis | 80 | ✅ abdomen-organs |
| **CT** | CT Head/Brain | 95 | ✅ brain-axial |
| **CT** | CT Pulmonary Angiogram | 100 | ✅ pulmonary-vessels |
| **MRI** | Brain MRI | 85 | ✅ brain-axial |
| **MRI** | MRI C-Spine | 90 | ✅ spine-lateral |
| **MRI** | MRI L-Spine | 90 | ✅ spine-lateral |
| **MRI** | MRI Knee | 90 | ✅ knee-sagittal |
| **X-Ray** | Chest X-Ray | 90 | ✅ chest-anatomy |
| **X-Ray** | Upper Extremity | 80 | ✅ extremity-bones |
| **X-Ray** | Lower Extremity | 80 | ✅ extremity-bones |
| **Angiography** | Coronary Angio | 100 | ❌ |
| **Ultrasound** | US Abdomen | 85 | ✅ abdomen-organs |
| **Ultrasound** | US Pelvis (Gyn) | 85 | ✅ pelvis-sagittal |
| **Mammography** | Mammography | 95 | ✅ breast-quadrants |
| **Fluoroscopy** | Upper GI | 75 | ❌ |
| **General** | General Radiology | 0 | ❌ |

---

## ✅ Validation Rules by Modality

### CT
- ✓ Contrast in technique → must be in findings
- ✓ Slice thickness recommended
- ✓ Multi-phase documentation

### MRI
- ✓ T1 + T2 sequences required
- ✓ Gadolinium in technique → must be in findings
- ✓ Field strength (1.5T/3.0T) recommended

### X-Ray
- ✓ Views required (AP, PA, lateral, oblique)
- ✓ Extremities: minimum 2 orthogonal views
- ✓ Position documentation

### Angiography
- ✓ Access site required
- ✓ Fluoroscopy time required
- ✓ Closure method for interventions

### Ultrasound
- ✓ Probe frequency recommended
- ✓ Abdominal: fasting status
- ✓ Pelvic: approach (transabdominal/transvaginal)

### Mammography
- ✓ BI-RADS density required (A/B/C/D)
- ✓ Views required (CC, MLO)
- ✓ BI-RADS category required (0-6)

---

## 🎨 Diagram Annotation Types

**General:**
marker, measurement, outline, arrow, text-label

**Chest:**
nodule-marker, lesion-arrow, region-outline

**Spine:**
disc-level-marker, stenosis-grade, herniation-arrow, nerve-root-marker

**Extremities:**
fracture-line, displacement-arrow, angle-measurement

**Brain:**
hemorrhage-marker, midline-shift, lesion-outline

**Breast:**
mass-marker, calcification-marker, clock-position, distance-from-nipple

**Knee:**
meniscal-tear-marker, ligament-tear-marker, cartilage-defect

**CTPA:**
pe-marker, vessel-measurement, rv-lv-ratio

---

## 🔌 Key API Endpoints

### Templates
```
POST   /api/templates/custom                 Create custom template
GET    /api/templates/user                   Get user templates
POST   /api/templates/clone/:id              Clone template
POST   /api/templates/suggest-multi-region   Multi-region suggestions
POST   /api/templates/create-combined        Create combined template
```

### Annotations
```
POST   /api/annotations                      Create annotation
GET    /api/annotations/report/:reportId     Get annotations
POST   /api/annotations/batch                Batch create
POST   /api/annotations/calculate/distance   Calculate distance
POST   /api/annotations/calculate/angle      Calculate angle
GET    /api/annotations/stats/:reportId      Get statistics
```

### Reports (Enhanced)
```
POST   /api/reports/templates/suggest        Get template suggestion
POST   /api/reports/:reportId/sign           Sign with validation
GET    /api/reports/:reportId/validation     Preview validation
```

---

## 💡 Usage Examples

### Create Custom Template
```javascript
const response = await fetch('/api/templates/custom', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Custom CT Template',
    category: 'radiology',
    scope: 'personal',
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['CHEST'],
      keywords: ['cardiac']
    },
    sections: [...],
    priority: 85
  })
});
```

### Add Diagram Annotation
```javascript
const annotation = await fetch('/api/annotations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportId: 'RPT-123',
    diagramType: 'chest-anatomy',
    annotationType: 'nodule-marker',
    coordinates: { x: 250, y: 180 },
    label: 'RLL nodule',
    measurement: { value: 6, unit: 'mm' },
    severity: 'mild'
  })
});
```

### Calculate Measurement
```javascript
const distance = await fetch('/api/annotations/calculate/distance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    x1: 100, y1: 150,
    x2: 200, y2: 300,
    pixelsPerMM: 2.5
  })
});
// Returns: { pixels: 180.28, mm: 72.11, cm: 7.21 }
```

---

## 📊 Adaptive Learning Flow

```
1. Study opened
   ↓
2. System suggests template (based on weights)
   ↓
3. User accepts or changes template
   ↓
4. Learning service records decision
   ↓
5. If changed → adjust weights
   - Decrease incorrect template weights
   - Increase correct template weights
   ↓
6. Future suggestions improved
```

### Check Accuracy
```javascript
const stats = await fetch('/api/templates/accuracy-stats', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Returns:
{
  templates: [
    {
      templateId: 'TPL-CT-CHEST-001',
      accuracy: '94.00%',
      totalSelections: 250,
      correctSelections: 235
    }
  ]
}
```

---

## 🔍 Validation Preview

```javascript
import { getModalityValidationPreview } from './modalityValidationRules';

const preview = getModalityValidationPreview('CT');

console.log(preview);
// {
//   modality: 'CT',
//   requiredFields: ['impression', 'findings', 'technique'],
//   specialRules: ['If contrast used, must document enhancement pattern'],
//   warnings: ['Slice thickness and contrast phase recommended']
// }
```

---

## 🎯 Frontend TODO

### High Priority
1. [ ] Template selection UI with auto-suggest
2. [ ] Diagram annotation canvas (SVG/Canvas)
3. [ ] Validation error display
4. [ ] Custom template builder form

### Medium Priority
5. [ ] Multi-region template selector
6. [ ] Annotation export to PDF
7. [ ] Template cloning UI
8. [ ] Learning analytics dashboard

### Low Priority
9. [ ] Template version comparison
10. [ ] Annotation import/export
11. [ ] User preference settings
12. [ ] Template sharing UI

---

## ⚙️ Configuration

### Environment Variables (Optional)
```env
# Adaptive learning
ENABLE_ADAPTIVE_LEARNING=true
LEARNING_ADJUSTMENT_RATE=5  # Weight adjustment per correction

# Template selection
DEFAULT_TEMPLATE_PRIORITY=50
CACHE_TEMPLATE_SUGGESTIONS=300  # seconds

# Diagram annotations
MAX_ANNOTATIONS_PER_REPORT=100
ANNOTATION_EXPORT_FORMAT=json  # or svg, pdf
```

---

## 🐛 Troubleshooting

### Template not suggesting
```bash
# Check template matching criteria
GET /api/reports/templates?modality=CT

# Check template weights
# Ensure modalityWeight (50) > bodyPartWeight (30) > keywordWeight (5)
```

### Validation blocking signing
```bash
# Preview validation rules
GET /api/reports/:reportId/validation

# Check modality-specific requirements
import { getModalityValidationPreview } from './modalityValidationRules';
```

### Annotations not appearing
```bash
# Verify diagram type matches
GET /api/annotations/report/:reportId/diagram/chest-anatomy

# Check coordinates within bounds
# X: 0-500, Y: 0-500 (typical diagram size)
```

---

## 📚 Documentation Files

1. **ENHANCED_REPORTING_GUIDE.md** - Complete implementation guide
2. **IMPLEMENTATION_SUMMARY.md** - High-level overview
3. **QUICK_REFERENCE.md** - This file (cheat sheet)

---

## 🎓 Training Tips

### For Radiologists
1. Template auto-selects based on study metadata
2. Override if needed (system learns from corrections)
3. Use diagram annotations for measurements
4. Validation errors show before signing

### For Administrators
1. Create hospital-wide templates with scope='hospital'
2. Monitor template accuracy via /api/templates/accuracy-stats
3. Review user patterns for workflow optimization
4. Customize validation rules per department

### For Developers
1. Backend is 100% complete and ready
2. Focus frontend effort on template UI and diagram canvas
3. Use provided API endpoints (no backend changes needed)
4. Reference ENHANCED_REPORTING_GUIDE.md for integration

---

**System Status:** ✅ Backend Complete | ⚠️ Frontend Pending  
**API Status:** ✅ Fully Functional  
**Documentation:** ✅ Comprehensive

**Ready for frontend integration!**
