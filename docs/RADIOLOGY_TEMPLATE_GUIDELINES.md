# 🏥 Radiology Report Template Guidelines

## Industry-Standard RIS/PACS Reporting System

This document defines the standardized template structure for all radiology reports across CT, MR, US, CR, MG, and PET/CT modalities.

---

## 1. Universal Report Structure

Every radiology report MUST follow this backbone:

### Mandatory Core Sections (ALL Templates)

| Section | Description | Required |
|---------|-------------|----------|
| **Patient & Study Details** | Demographics, Study Type, Date, Referring Physician | ✅ Yes |
| **Clinical History / Indication** | Reason for exam, relevant history | ✅ Yes |
| **Technique** | Protocol, contrast, equipment details | ✅ Yes |
| **Findings** | Template-specific observations | ✅ Yes |
| **Impression** | Diagnostic summary with scoring (if applicable) | ✅ Yes |
| **Signature & Metadata** | Radiologist name, credentials, timestamp | ✅ Yes |

### Optional Sections (Render only if data exists)

| Section | Description | Condition |
|---------|-------------|-----------|
| Structured Checklist | Template-specific assessment table | If checklist data exists |
| Measurements | Quantitative findings | If measurements recorded |
| Key Radiological Images | Annotated images | If images captured |
| Recommendations | Follow-up suggestions | If clinically indicated |

---

## 2. Supported Scoring Systems

### BI-RADS (Breast Imaging)

| Category | Label | Management |
|----------|-------|------------|
| 0 | Incomplete | Additional imaging needed |
| 1 | Negative | Routine screening |
| 2 | Benign | Routine screening |
| 3 | Probably Benign | 6-month follow-up |
| 4A | Low Suspicion | Consider biopsy |
| 4B | Moderate Suspicion | Biopsy recommended |
| 4C | High Suspicion | Biopsy strongly recommended |
| 5 | Highly Suggestive | Appropriate action |
| 6 | Known Malignancy | Surgical excision |

### Lung-RADS (Lung Cancer Screening)

| Category | Label | Management |
|----------|-------|------------|
| 0 | Incomplete | Prior CT needed |
| 1 | Negative | Annual screening |
| 2 | Benign | Annual screening |
| 3 | Probably Benign | 6-month follow-up |
| 4A | Suspicious | 3-month follow-up |
| 4B | Suspicious | PET/CT or biopsy |
| 4X | Suspicious + features | PET/CT and/or biopsy |

### CAD-RADS (Coronary CTA)

| Category | Stenosis | Management |
|----------|----------|------------|
| 0 | None | No workup |
| 1 | 1-24% | Preventive therapy |
| 2 | 25-49% | Preventive therapy |
| 3 | 50-69% | Functional assessment |
| 4A | 70-99% (1-2 vessels) | ICA consideration |
| 4B | 70-99% (3+ vessels/LM) | ICA recommended |
| 5 | Total occlusion | ICA + viability |
| N | Non-diagnostic | Repeat test |

### LI-RADS (Liver Imaging)

| Category | Label | Management |
|----------|-------|------------|
| LR-1 | Definitely Benign | Surveillance |
| LR-2 | Probably Benign | Surveillance |
| LR-3 | Intermediate | Follow-up/biopsy |
| LR-4 | Probably HCC | MDT discussion |
| LR-5 | Definitely HCC | Treatment |
| LR-M | Malignant (non-HCC) | Biopsy |
| LR-TIV | Tumor in Vein | Staging |

### PI-RADS (Prostate MRI)

| Score | Probability | Management |
|-------|-------------|------------|
| 1 | Very Low | Cancer highly unlikely |
| 2 | Low | Cancer unlikely |
| 3 | Intermediate | Consider biopsy |
| 4 | High | Biopsy recommended |
| 5 | Very High | Biopsy strongly recommended |

### TI-RADS (Thyroid US)

| Category | Label | FNA Threshold |
|----------|-------|---------------|
| TR1 | Benign | No FNA |
| TR2 | Not Suspicious | No FNA |
| TR3 | Mildly Suspicious | ≥2.5cm |
| TR4 | Moderately Suspicious | ≥1.5cm |
| TR5 | Highly Suspicious | ≥1cm |

### O-RADS (Ovarian/Adnexal)

| Score | Risk | Management |
|-------|------|------------|
| 0 | Incomplete | Additional imaging |
| 1 | Normal | Routine |
| 2 | Almost Certainly Benign | Routine |
| 3 | Low Risk | Follow-up/MRI |
| 4 | Intermediate Risk | MRI/surgery |
| 5 | High Risk | Surgery |

### ASPECTS (Stroke CT)

- Score: 0-10 (10 = normal)
- Each region with early ischemic changes = -1 point
- Score ≤7 generally indicates poor outcome

---

## 3. Controlled Vocabularies

### Status Values (Checklist Tables)

Only these values are permitted:

| Status | Description | Color |
|--------|-------------|-------|
| **Normal** | Within normal limits | Green |
| **Abnormal** | Pathology present | Red |
| **Not Visualized** | Structure not seen | Gray |
| **Indeterminate** | Cannot determine | Yellow |

### Invalid Status Values (REJECTED)

❌ "Degenerative"
❌ "Mild"
❌ "Moderate"
❌ "Severe"
❌ "Good"
❌ "Bad"
❌ Custom text

---

## 4. Content Validation Rules

### Junk Text Detection

The system automatically rejects:

```
❌ "asdf", "sdf", "test", "xxx"
❌ "n/a", "none", "nil", "tbd"
❌ Random keyboard mash
❌ Single characters
❌ Empty strings
```

### Section Rendering Rules

```javascript
// Section renders ONLY if:
1. Content exists AND
2. Content length > 3 characters AND
3. Content is NOT a placeholder AND
4. Content is NOT junk text
```

### Table Rendering Rules

```javascript
// Table row renders ONLY if:
1. Label exists AND is valid
2. Status is controlled vocabulary
3. Row is not empty
```

---

## 5. PDF Layout Rules

### Page Limits

| Template Type | Max Pages |
|---------------|-----------|
| Standard Reports | 2 pages |
| PET/CT Oncology | 3 pages |
| Complex Multi-organ | 3 pages |

### Layout Constraints

1. **No blank pages** - Never generate empty pages
2. **No orphaned headers** - Section title must have content
3. **No split tables** - Table rows stay together
4. **Impression + Signature** - Keep on same page if possible

### Margins & Spacing

```
Left Margin: 40pt
Right Margin: 40pt
Top Margin: 40pt
Bottom Margin: 60pt (for footer)
Section Gap: 8pt
Line Height: 14pt
```

### Font Standards

| Element | Font | Size |
|---------|------|------|
| Hospital Name | Helvetica-Bold | 16pt |
| Section Headers | Helvetica-Bold | 10pt |
| Body Text | Helvetica | 9pt |
| Table Headers | Helvetica-Bold | 7pt |
| Table Content | Helvetica | 8pt |
| Footer | Helvetica | 7pt |

---

## 6. Key Images Guidelines

### When to Include

- Only if images were captured during reporting
- Only if images have valid file paths
- Only if images have anatomical descriptions

### Image Requirements

| Attribute | Requirement |
|-----------|-------------|
| Figure Number | Unique, sequential (Fig 1, Fig 2...) |
| Caption | Anatomical description required |
| Resolution | Minimum 235x155 pixels |
| Format | PNG or JPEG |

### Caption Format

```
Figure [N]: [Plane] [Modality] at level of [Anatomy] showing [Finding]

Examples:
- Figure 1: Axial CT at level of infrarenal aorta showing fusiform AAA measuring 4.8 cm
- Figure 2: Coronal MIP reformation demonstrating extent of aneurysm
- Figure 3: 3D VR reconstruction showing branch vessel relationship
```

---

## 7. Impression Writing Guidelines

### Structure

1. **Numbered points** - Each finding as separate point
2. **Scoring first** - If scoring system used, state category first
3. **Actionable** - Include management recommendation
4. **Concise** - No repetition of findings section

### Examples

**BI-RADS Report:**
```
IMPRESSION:
BI-RADS Category 4B - Moderate Suspicion for Malignancy

1. 1.2 cm irregular hypoechoic mass at 2 o'clock position, right breast - BIOPSY RECOMMENDED
2. Benign-appearing cyst, left breast - no intervention needed
```

**CTA Aorta Report:**
```
IMPRESSION:
1. Infrarenal AAA measuring 4.8 cm with interval increase - VASCULAR SURGERY CONSULTATION RECOMMENDED
2. Ascending aorta at upper limit of normal (3.8 cm) - follow-up in 12 months
3. No evidence of dissection or rupture
```

---

## 8. Template-Specific Checklists

### CTA Aorta Checklist

| Structure | Normal Range | Unit |
|-----------|--------------|------|
| Aortic Root | 2.9-3.5 | cm |
| Ascending Aorta | 2.5-4.0 | cm |
| Aortic Arch | 2.5-3.0 | cm |
| Descending Thoracic | 2.0-2.5 | cm |
| Suprarenal Abdominal | 2.0-2.5 | cm |
| Infrarenal Abdominal | 1.5-2.0 | cm |
| Common Iliac | 1.0-1.2 | cm |

### Coronary CTA Checklist

| Vessel | Assessment |
|--------|------------|
| Left Main | Stenosis %, Plaque type |
| LAD (Prox/Mid/Distal) | Stenosis %, Plaque type |
| LCx (Prox/Distal) | Stenosis %, Plaque type |
| RCA (Prox/Mid/Distal) | Stenosis %, Plaque type |

---

## 9. Medico-Legal Compliance

### Required Elements

- [ ] Patient identification on every page
- [ ] Report ID clearly visible
- [ ] Study date and report date
- [ ] Referring physician documented
- [ ] Clinical indication stated
- [ ] Technique with contrast details
- [ ] Structured findings with measurements
- [ ] Clear impression with recommendations
- [ ] Digital signature with credentials
- [ ] License/registration number
- [ ] Timestamp of signing
- [ ] Page numbers (Page X of Y)
- [ ] Hospital/facility identification

---

## 10. Implementation Notes

### Backend (Node.js)

```javascript
const { detectTemplate, normalizeStatus, isValidContent } = require('./reportTemplateSchemas');

// Auto-detect template from report data
const template = detectTemplate(report);

// Normalize status values
const status = normalizeStatus(rawStatus); // Returns: Normal | Abnormal | Not Visualized

// Validate content before rendering
if (isValidContent(content)) {
  renderSection(content);
}
```

### Frontend (TypeScript)

```typescript
import { getTemplateSchema, validateMeasurement, STATUS_VALUES } from './reportTemplateSchemas';

// Get template schema
const schema = getTemplateSchema('CTA_AORTA');

// Validate measurement
const { isNormal, range } = validateMeasurement('CTA_AORTA', 'Ascending Aorta', 4.2);
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Compliance: NABH / International Hospital Standards*
