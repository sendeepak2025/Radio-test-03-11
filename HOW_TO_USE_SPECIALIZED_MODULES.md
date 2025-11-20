# How to Use Specialized Reporting Modules

## Quick Start Guide

### Step 1: Seed the Templates
```bash
# Make sure MongoDB is running first
cd server
node src/seed/seedEnhancedTemplatesWithModules.js
```

Expected output:
```
🌱 Seeding enhanced report templates with UI modules...
✅ Created template: Mammography BI-RADS Assessment
✅ Created template: MRI Spine - Comprehensive Assessment
✅ Created template: CT Chest - Lung Nodule Assessment
✅ Enhanced templates seeded successfully!
📊 Total templates: 3
```

### Step 2: Start the Application
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
cd viewer
npm run dev
```

### Step 3: Test Each Template

---

## Test Case 1: Mammography BI-RADS

### Create Report
1. Click **New Report** or open study from worklist
2. Enter patient info:
   - **Modality:** MG (or MAMMO)
   - **Body Part:** BREAST
   - **Procedure:** Screening mammography
3. Click **Next** to template selection

### Expected Result
Template selector should show **"Mammography BI-RADS Assessment"** as top match.

### Use BI-RADS Calculator
1. In report editor, you'll see **"Specialized Assessment Tools"** section at top
2. **BI-RADS Calculator** appears first:
   ```
   ╔════════════════════════════════╗
   ║ BI-RADS Assessment        *    ║
   ╚════════════════════════════════╝
   ```
3. Select mass characteristics:
   - Click radio button: **"Irregular shape"** (score: 2)
4. Select calcifications:
   - Click radio button: **"Benign (coarse, popcorn)"** (score: 1)
5. Select asymmetry:
   - Click radio button: **"None"** (score: 0)

### See Auto-Calculation
Immediately after selection, you'll see:
```
┌──────────────────────────────┐
│ ✅ Assessment Result         │
│ 🟨 BI-RADS 3  │ Score: 3     │
│                              │
│ ⚠️ Probably benign -        │
│ Short-term follow-up        │
│ suggested (6 months)        │
│                              │
│ Key Findings:               │
│ • Mass: Irregular shape     │
│ • Calc: Benign (coarse)     │
└──────────────────────────────┘
```

### Add Measurements
1. Scroll down to **"Lesion Measurements"** module
2. Click **[+]** button to add measurement
3. Click quick label: **"Mass AP"** (auto-fills label field)
4. Enter value: **12.5**
5. Select unit: **mm** (default)
6. Click **[+]** again for second measurement
7. Quick label: **"Mass Transverse"**
8. Value: **8.3**

### Fill Standard Fields
1. Scroll to **Clinical History** (standard field)
2. Type: "Screening mammography"
3. Fill **Findings** (free text):
   ```
   Right breast at 2 o'clock position, irregular mass 
   measuring 12.5 x 8.3 mm with benign-appearing coarse 
   calcifications.
   ```
4. Fill **Impression**:
   ```
   BI-RADS 3: Probably benign finding in right breast.
   Recommend short-term follow-up mammogram in 6 months.
   ```

### Save Report
- Report auto-saves every 30 seconds
- Or click **Save Draft**
- Module data (BI-RADS selections + measurements) saved as JSON

---

## Test Case 2: MRI Spine

### Create Report
1. **New Report**
2. Patient info:
   - **Modality:** MR (or MRI)
   - **Body Part:** L-SPINE (or LUMBAR)
   - **Procedure:** MRI lumbar spine without contrast
3. Template selected: **"MRI Spine - Comprehensive Assessment"**

### Use Vertebral Level Checklist
1. See **"Lumbar Spine Assessment"** table at top
2. Progress tracker shows: **0/6 Completed**

#### Assess Each Level
For **L1**:
- Click dropdown under "Status"
- Select: **Normal**
- Findings field: (leave empty for normal)

For **L2**:
- Status: **Normal**

For **L3**:
- Status: **Degenerative**
- Findings: "Mild disc space narrowing, small anterior osteophytes"

For **L4**:
- Status: **Disc Herniation**
- Findings: "Central disc herniation, 4mm, mild thecal sac effacement"

For **L5**:
- Status: **Normal**

For **S1**:
- Status: **Normal**

#### See Progress Update
```
┌──────────────────────────┐
│ ✅ 6/6 Completed         │
│ ⚠️ 2 Abnormal            │
└──────────────────────────┘
```

### Add Disc Measurements
1. Scroll to **"Disc and Canal Measurements"**
2. Click **[+]** to add measurement
3. Quick label: **"Disc Height"** or type "L4-L5 Disc"
4. Value: **4.2**
5. Unit: **mm**
6. Add another:
   - Label: **"Canal AP Diameter"** or "L4 Canal AP"
   - Value: **11.5**
   - Unit: **mm**

### Fill Standard Sections
- **Clinical Indication:** "Low back pain, radiculopathy"
- **Technique:** (pre-filled) "MRI of the lumbar spine without contrast..."
- **Detailed Findings:** (Expand on checklist data)
  ```
  Vertebral body alignment is maintained. Multilevel 
  degenerative changes noted at L3-L4 and L4-L5 as detailed 
  in the level-by-level assessment above.
  ```
- **Impression:**
  ```
  1. L4-L5 central disc herniation with mild thecal sac 
     effacement.
  2. Multilevel degenerative changes, most pronounced at 
     L3-L4 and L4-L5.
  ```

---

## Test Case 3: CT Chest

### Create Report
1. **New Report**
2. Patient info:
   - **Modality:** CT
   - **Body Part:** CHEST (or LUNG or THORAX)
   - **Procedure:** CT chest without contrast
3. Template: **"CT Chest - Lung Nodule Assessment"**

### Add Nodule Measurements
1. See **"Pulmonary Nodule Measurements"** at top
2. Click **[+]** to add measurement
3. Quick label: **"RUL"** (Right Upper Lobe)
4. Value: **6.2**
5. Unit: **mm**
6. Notes: **"Solid nodule"**

7. Add second nodule:
   - Quick label: **"LLL"**
   - Value: **3.8**
   - Notes: **"Ground glass opacity"**

### Fill Sections
- **Lungs:**
  ```
  6mm solid nodule in right upper lobe. 
  4mm ground glass opacity in left lower lobe.
  No consolidation, pleural effusion, or pneumothorax.
  ```
- **Mediastinum:**
  ```
  Mediastinal structures are unremarkable. 
  No lymphadenopathy.
  ```
- **Impression:**
  ```
  1. 6mm solid nodule RUL - recommend follow-up CT in 6 months.
  2. 4mm ground glass opacity LLL - recommend annual follow-up.
  ```

---

## Data Export

### View Module Data in Report Object
Module data is stored in `report.sections`:
```json
{
  "uiModule_birads_calculator": {
    "selections": { "mass": "irregular", "calcifications": "benign" },
    "score": 3,
    "category": 3,
    "recommendation": "Probably benign..."
  },
  "uiModule_breast_measurements": [
    { "label": "Mass AP", "value": "12.5", "unit": "mm" },
    { "label": "Transverse", "value": "8.3", "unit": "mm" }
  ],
  "clinicalHistory": "Screening mammography",
  "findings": "Right breast at 2 o'clock..."
}
```

### PDF Export
Click **Export → PDF**
- Module data appears in report body
- BI-RADS category displayed prominently
- Measurements formatted as table

### FHIR Export
Click **Export → FHIR**
- Structured measurements exported as Observations
- BI-RADS category as CodeableConcept
- Checklist items as Observation components

---

## Customization: Create Your Own Template

### Example: TI-RADS for Thyroid Ultrasound

```javascript
// server/src/seed/seedMyCustomTemplate.js
const customTemplate = {
  templateId: 'US-THYROID-TIRADS-01',
  name: 'Thyroid Ultrasound - TI-RADS',
  category: 'radiology',
  
  matchingCriteria: {
    modalities: ['US'],
    bodyParts: ['THYROID', 'NECK'],
    keywords: ['thyroid', 'nodule'],
    procedureTypes: ['diagnostic']
  },
  
  // Add TI-RADS calculator module
  uiModules: [
    {
      id: 'tirads_calculator',
      type: 'calculator',
      title: 'TI-RADS Score',
      order: 1,
      required: true,
      config: {
        type: 'custom',
        title: 'TI-RADS Assessment',
        criteria: [
          {
            id: 'composition',
            label: 'Composition',
            options: [
              { value: 'cystic', label: 'Cystic/almost cystic', score: 0 },
              { value: 'spongiform', label: 'Spongiform', score: 0 },
              { value: 'mixed', label: 'Mixed cystic/solid', score: 1 },
              { value: 'solid', label: 'Solid', score: 2 }
            ]
          },
          {
            id: 'echogenicity',
            label: 'Echogenicity',
            options: [
              { value: 'anechoic', label: 'Anechoic', score: 0 },
              { value: 'hyperechoic', label: 'Hyperechoic/isoechoic', score: 1 },
              { value: 'hypoechoic', label: 'Hypoechoic', score: 2 },
              { value: 'very_hypo', label: 'Very hypoechoic', score: 3 }
            ]
          },
          // Add more criteria...
        ]
      }
    },
    {
      id: 'nodule_measurements',
      type: 'measurements',
      title: 'Nodule Measurements',
      order: 2,
      config: {
        predefinedLabels: ['AP', 'Transverse', 'Length', 'Volume'],
        allowedUnits: ['mm', 'cm', 'ml']
      }
    }
  ],
  
  sections: [
    { id: 'indication', title: 'Clinical Indication', order: 1, required: true },
    { id: 'findings', title: 'Findings', order: 2, required: true },
    { id: 'impression', title: 'Impression', order: 3, required: true }
  ]
};

// Save to database
ReportTemplate.create(customTemplate);
```

### Use Your Custom Template
1. Seed the template: `node seedMyCustomTemplate.js`
2. Create report with Modality: **US**, Body Part: **THYROID**
3. TI-RADS calculator automatically appears
4. Fill criteria → auto-calculates TI-RADS score
5. Add nodule measurements

---

## Troubleshooting

### Modules Not Appearing
**Problem:** Report shows only standard text fields, no modules

**Solutions:**
1. Check template was seeded:
   ```bash
   # In MongoDB shell or Compass
   db.reporttemplates.find({ templateId: 'MAMMO-BIRADS-01' })
   ```
2. Check template matching:
   - Verify modality exactly matches (case-sensitive)
   - Check body part is in template's `matchingCriteria.bodyParts`
3. Check browser console for errors
4. Verify `state.selectedTemplate` has `uiModules` array populated

### Module Data Not Saving
**Problem:** Fill module, save report, reopen → data is gone

**Solutions:**
1. Check `actions.updateSection` is called on module change
2. Verify data format:
   ```javascript
   // Correct
   actions.updateSection('uiModule_birads', JSON.stringify({...}))
   
   // Wrong
   actions.updateSection('uiModule_birads', {...}) // Must be string
   ```
3. Check network tab for save API errors

### TypeScript Errors
**Problem:** `Property 'uiModules' does not exist on type 'ReportTemplate'`

**Solution:**
Update `viewer/src/types/reporting.ts` (already done):
```typescript
export interface ReportTemplate {
  // ... existing fields
  uiModules?: Array<{
    id: string;
    type: string;
    config?: any;
    // ... etc
  }>;
}
```

---

## Summary

✅ **3 Specialized Templates** ready to use  
✅ **3 Module Types** built (Measurement, Checklist, Calculator)  
✅ **Configuration-Driven** - add templates without code changes  
✅ **Backward Compatible** - old templates still work  
✅ **Auto-Save** - module data persists automatically  

**Next:** Start MongoDB, run seed script, create report with new modules!
