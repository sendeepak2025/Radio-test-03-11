# CT Angiography Aorta - Report Schema & Guidelines

## 1. Sample CTA Aorta Report (Realistic Medical Language)

```json
{
  "reportId": "SR-CTA-2024-001234",
  "studyInstanceUID": "1.2.840.113619.2.55.3.604688119",
  "patientID": "PAT-2024-5678",
  "patientName": "Sharma, Rajesh Kumar",
  "modality": "CT",
  "templateName": "CT Angiography - Aorta",
  "reportStatus": "final",
  "reportDate": "2024-12-23T10:30:00Z",
  "referringPhysician": "Dr. Amit Verma",
  
  "sections": {
    "clinical_history": "65-year-old male with hypertension and chest pain. Known case of infrarenal abdominal aortic aneurysm on follow-up. Rule out dissection or aneurysm progression. History of smoking (30 pack-years).",
    
    "technique": "CT Angiography of the thoracic and abdominal aorta was performed on a 128-slice MDCT scanner (Siemens SOMATOM) following IV administration of 100ml non-ionic iodinated contrast (Omnipaque 350) at 4ml/sec via 18G right antecubital vein access. Arterial phase images acquired with ECG gating at 0.6mm slice thickness. Multiplanar reformations (MPR), Maximum Intensity Projections (MIP), and 3D Volume Rendered (VR) images were generated for comprehensive evaluation. No adverse reaction to contrast noted.",
    
    "findings": "THORACIC AORTA:\n• Ascending aorta measures 3.8 cm at the level of pulmonary artery bifurcation (upper limit of normal <4.0 cm).\n• Aortic root measures 3.4 cm at sinuses of Valsalva.\n• Aortic arch is normal in caliber measuring 2.8 cm with normal branching pattern.\n• Descending thoracic aorta measures 2.6 cm, within normal limits.\n• No evidence of intimal flap, dissection, or intramural hematoma.\n• Mild atherosclerotic calcification noted in the aortic arch and descending aorta.\n\nABDOMINAL AORTA:\n• Suprarenal abdominal aorta measures 2.4 cm, within normal limits.\n• Infrarenal abdominal aorta shows fusiform aneurysmal dilatation measuring 4.8 x 4.5 cm (previously 4.5 x 4.2 cm on CT dated 15-Jun-2024 - interval increase of 3mm).\n• Aneurysm extends from 2 cm below renal arteries to aortic bifurcation (length: 8.5 cm).\n• Eccentric mural thrombus noted along the posterior and left lateral wall, measuring up to 1.2 cm in thickness.\n• Patent lumen measures 3.2 cm.\n• No evidence of rupture, contained leak, or retroperitoneal hematoma.\n• Aneurysm neck diameter: 2.6 cm, neck length: 1.8 cm.\n\nBRANCH VESSELS:\n• Celiac trunk: Patent, normal origin at T12-L1 level.\n• Superior mesenteric artery (SMA): Patent, no significant stenosis.\n• Bilateral renal arteries: Patent with normal origins, no accessory renal arteries identified.\n• Inferior mesenteric artery (IMA): Patent, arising from aneurysm sac.\n• Bilateral common iliac arteries are mildly ectatic (Right: 1.4 cm, Left: 1.3 cm).\n• External and internal iliac arteries are patent bilaterally.\n\nINCIDENTAL FINDINGS:\n• Simple cortical cyst in right kidney measuring 2.1 cm - Bosniak Category I.\n• No significant mesenteric or retroperitoneal lymphadenopathy.\n• Visualized lung bases show no acute abnormality.",
    
    "impression": "1. INFRARENAL ABDOMINAL AORTIC ANEURYSM (AAA) measuring 4.8 cm with mild interval increase (3mm) from prior study dated 15-Jun-2024 - approaching threshold for elective repair. Recommend vascular surgery consultation.\n\n2. Ascending aorta at upper limit of normal (3.8 cm) - recommend follow-up CT in 12 months.\n\n3. Mild bilateral common iliac artery ectasia - to be monitored.\n\n4. NO evidence of aortic dissection, rupture, or contained leak.\n\n5. Incidental simple right renal cyst (Bosniak I) - benign, no follow-up needed.",
    
    "recommendations": "1. Vascular surgery consultation recommended for AAA management - consider elective EVAR/open repair.\n2. Follow-up CT Angiography in 6 months to monitor aneurysm progression if conservative management chosen.\n3. Strict blood pressure control (target <130/80 mmHg).\n4. Smoking cessation counseling strongly advised.\n5. Statin therapy for cardiovascular risk reduction.\n6. Follow-up CT chest in 12 months for ascending aorta surveillance.",
    
    "uiModule_Aorta_Checklist": "{\"selections\":{\"Aortic Root\":{\"status\":\"Normal\",\"measurement\":\"3.4 cm\",\"notes\":\"At sinuses of Valsalva\"},\"Ascending Aorta\":{\"status\":\"Normal\",\"measurement\":\"3.8 cm\",\"notes\":\"Upper limit of normal\"},\"Aortic Arch\":{\"status\":\"Normal\",\"measurement\":\"2.8 cm\",\"notes\":\"Normal branching\"},\"Descending Thoracic Aorta\":{\"status\":\"Normal\",\"measurement\":\"2.6 cm\",\"notes\":\"Mild calcification\"},\"Suprarenal Abdominal Aorta\":{\"status\":\"Normal\",\"measurement\":\"2.4 cm\",\"notes\":\"\"},\"Infrarenal Abdominal Aorta\":{\"status\":\"Abnormal\",\"measurement\":\"4.8 cm\",\"notes\":\"Fusiform AAA with mural thrombus\"},\"Celiac Trunk\":{\"status\":\"Normal\",\"measurement\":\"Patent\",\"notes\":\"Normal origin\"},\"SMA\":{\"status\":\"Normal\",\"measurement\":\"Patent\",\"notes\":\"No stenosis\"},\"Renal Arteries\":{\"status\":\"Normal\",\"measurement\":\"Patent bilateral\",\"notes\":\"No accessory arteries\"},\"IMA\":{\"status\":\"Normal\",\"measurement\":\"Patent\",\"notes\":\"Arises from sac\"},\"Right Common Iliac\":{\"status\":\"Abnormal\",\"measurement\":\"1.4 cm\",\"notes\":\"Mild ectasia\"},\"Left Common Iliac\":{\"status\":\"Abnormal\",\"measurement\":\"1.3 cm\",\"notes\":\"Mild ectasia\"}}}"
  },
  
  "keyImages": [
    {
      "id": "img-001",
      "dataUrl": "cta_aorta_axial_001.png",
      "caption": "Axial CT at level of infrarenal aorta showing fusiform AAA measuring 4.8 cm with eccentric mural thrombus along posterior wall"
    },
    {
      "id": "img-002", 
      "dataUrl": "cta_aorta_coronal_001.png",
      "caption": "Coronal MIP reformation demonstrating the extent of infrarenal AAA from renal arteries to aortic bifurcation"
    },
    {
      "id": "img-003",
      "dataUrl": "cta_aorta_3dvr_001.png",
      "caption": "3D Volume Rendered reconstruction showing AAA morphology and relationship to branch vessels"
    },
    {
      "id": "img-004",
      "dataUrl": "cta_aorta_sagittal_001.png",
      "caption": "Sagittal oblique reformation showing aneurysm neck (2.6 cm) and length (8.5 cm) for EVAR planning"
    }
  ],
  
  "signature": {
    "displayName": "Priya Sharma",
    "specialty": "Consultant Radiologist, MD, DNB (Radiodiagnosis)",
    "licenseNumber": "MCI-12345-MP"
  },
  "signedAt": "2024-12-23T11:45:00Z"
}
```

## 2. Structured JSON Schema for Storage

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CTA Aorta Report Schema",
  "type": "object",
  "required": ["reportId", "studyInstanceUID", "patientID", "modality", "sections"],
  "properties": {
    "reportId": { "type": "string", "pattern": "^SR-" },
    "studyInstanceUID": { "type": "string" },
    "patientID": { "type": "string" },
    "patientName": { "type": "string" },
    "modality": { "type": "string", "enum": ["CT", "MR", "US"] },
    "templateName": { "type": "string" },
    "reportStatus": { "type": "string", "enum": ["draft", "preliminary", "final", "amended"] },
    "reportDate": { "type": "string", "format": "date-time" },
    "referringPhysician": { "type": "string" },
    
    "sections": {
      "type": "object",
      "properties": {
        "clinical_history": { "type": "string", "minLength": 10 },
        "technique": { "type": "string", "minLength": 20 },
        "findings": { "type": "string", "minLength": 50 },
        "impression": { "type": "string", "minLength": 20 },
        "recommendations": { "type": "string" }
      },
      "required": ["clinical_history", "technique", "findings", "impression"]
    },
    
    "signature": {
      "type": "object",
      "properties": {
        "displayName": { "type": "string" },
        "specialty": { "type": "string" },
        "licenseNumber": { "type": "string" }
      }
    },
    "signedAt": { "type": "string", "format": "date-time" }
  }
}
```

## 3. Conditional Rendering Rules

```javascript
// RULE 1: Only render section if content exists and is meaningful
const shouldRenderSection = (content) => {
  if (!content) return false;
  const cleaned = content.trim().toLowerCase();
  if (cleaned.length < 3) return false;
  const placeholders = ['n/a', 'na', 'none', 'nil', '-', '--', '...', 'tbd', 'pending'];
  return !placeholders.includes(cleaned);
};

// RULE 2: Only render checklist table if has valid rows
const shouldRenderChecklist = (data) => {
  if (!data || !data.selections) return false;
  const rows = Object.entries(data.selections);
  return rows.length > 0 && rows.some(([k, v]) => k && k.trim().length > 0);
};

// RULE 3: Only add key images page if valid images exist
const shouldRenderKeyImages = (keyImages, getLocalPath) => {
  if (!keyImages || keyImages.length === 0) return false;
  return keyImages.some(img => getLocalPath(img.dataUrl));
};

// RULE 4: Keep impression + signature together on same page
const keepTogetherHeight = impressionHeight + signatureHeight + 20;
if (doc.y + keepTogetherHeight > pageHeight) {
  doc.addPage();
}
```

## 4. PDF Layout Best Practices (PDFKit)

```javascript
// LAYOUT CONSTANTS
const LAYOUT = {
  leftMargin: 40,
  rightMargin: 555,
  topMargin: 40,
  contentWidth: 515,
  pageHeight: 730,      // Safe area before footer
  footerY: 780,
  lineHeight: 14,
  sectionGap: 8
};

// PAGE OVERFLOW PREVENTION
const checkPageOverflow = (neededSpace, doc) => {
  const remaining = LAYOUT.pageHeight - doc.y;
  if (remaining < neededSpace) {
    doc.addPage();
    doc.y = LAYOUT.topMargin;
    return true;
  }
  return false;
};

// PREVENT TABLE ROW SPLITTING
const renderTableRow = (row, rowHeight, doc) => {
  // Check if row fits on current page
  if (doc.y + rowHeight > LAYOUT.pageHeight) {
    doc.addPage();
    doc.y = LAYOUT.topMargin;
    // Re-render table header on new page
    renderTableHeader(doc);
  }
  // Now render the row
  renderRow(row, doc);
};

// CALCULATE TEXT HEIGHT BEFORE RENDERING
const getTextHeight = (text, doc, options = {}) => {
  return doc.heightOfString(text, {
    width: options.width || LAYOUT.contentWidth,
    fontSize: options.fontSize || 9,
    lineGap: options.lineGap || 2
  });
};

// KEEP IMPRESSION + SIGNATURE TOGETHER
const renderImpressionAndSignature = (impression, doc) => {
  const impressionHeight = getTextHeight(impression, doc, { fontSize: 10 });
  const signatureHeight = 80;
  const totalHeight = impressionHeight + signatureHeight + 30;
  
  // If won't fit, start new page
  checkPageOverflow(totalHeight, doc);
  
  // Render impression
  renderImpression(impression, doc);
  
  // Render signature immediately after
  renderSignature(doc);
};
```

## 5. Aorta Checklist Structure (Standardized)

### Status Values (Only Two Options)
| Status | Description | Color Code |
|--------|-------------|------------|
| **Normal** | Within normal limits | Green (#276749) |
| **Abnormal** | Any pathology present | Red (#C53030) |

### Aortic Segments with Normal Ranges

| Segment | Normal Range | Abnormal Threshold | Measurement Location |
|---------|--------------|-------------------|---------------------|
| Aortic Root | 2.9-3.5 cm | >4.0 cm | Sinuses of Valsalva |
| Ascending Aorta | 2.5-3.5 cm | >4.0 cm | PA bifurcation level |
| Aortic Arch | 2.5-3.0 cm | >3.5 cm | Mid-arch |
| Descending Thoracic | 2.0-2.5 cm | >3.5 cm | Diaphragm level |
| Suprarenal Abdominal | 2.0-2.5 cm | >3.0 cm | Above renal arteries |
| Infrarenal Abdominal | 1.5-2.0 cm | >3.0 cm | Below renal arteries |
| Common Iliac | 1.0-1.2 cm | >1.8 cm | Proximal segment |

### Branch Vessels Checklist

| Vessel | Assessment | Normal Finding |
|--------|------------|----------------|
| Celiac Trunk | Patency, stenosis | Patent, normal origin |
| SMA | Patency, stenosis | Patent, no stenosis |
| Renal Arteries | Patency, accessory | Patent bilateral |
| IMA | Patency, origin | Patent |
| Iliac Arteries | Caliber, stenosis | Patent, normal caliber |

### Pathology Indicators (Abnormal Status)
- Aneurysm (fusiform/saccular)
- Dissection (Type A/B)
- Intramural hematoma
- Penetrating atherosclerotic ulcer
- Stenosis (>50%)
- Occlusion
- Ectasia (borderline dilatation)
- Mural thrombus
- Calcification (significant)

## 6. Key Images Best Practices

### Required Captions for CTA Aorta
Each key image MUST have an anatomical description including:
1. **Plane** - Axial, Coronal, Sagittal, 3D VR, MIP
2. **Level** - Anatomical landmark
3. **Finding** - What is being demonstrated
4. **Measurement** - If applicable

### Example Captions
```
Figure 1: Axial CT at level of infrarenal aorta showing fusiform AAA measuring 4.8 cm with eccentric mural thrombus
Figure 2: Coronal MIP reformation demonstrating extent of AAA from renal arteries to bifurcation
Figure 3: 3D Volume Rendered reconstruction showing AAA morphology and branch vessel relationship
Figure 4: Sagittal oblique reformation showing aneurysm neck (2.6 cm) for EVAR planning
```

### Image Layout Rules
- Maximum 4 images per page (2x2 grid)
- Each image: 235x155 pixels
- Figure number badge on each image
- Caption below each image (max 2 lines)
- Black background for medical images

## 6. Medico-Legal Compliance Checklist

- [ ] Patient identification on every page (header/footer)
- [ ] Report ID clearly visible
- [ ] Study date and report date documented
- [ ] Referring physician mentioned
- [ ] Clinical indication documented
- [ ] Technique section with contrast details
- [ ] Structured findings with measurements
- [ ] Clear impression with numbered points
- [ ] Recommendations for follow-up
- [ ] Digital signature with credentials
- [ ] License/registration number
- [ ] Timestamp of signing
- [ ] Page numbers (Page X of Y)
- [ ] Hospital/facility identification
