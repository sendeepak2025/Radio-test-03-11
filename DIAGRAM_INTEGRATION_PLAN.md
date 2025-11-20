# 📋 PLAN: Adding Anatomical Diagrams to Specialized Templates

## Executive Summary

**Goal:** Enable anatomical diagram support for specialized reporting templates so different modalities automatically show relevant body diagrams for marking and annotation.

**Current State:**
- ✅ Diagram infrastructure EXISTS (AnatomicalDiagramPanel component)
- ✅ Backend diagram annotation service EXISTS
- ✅ Drawing tools EXIST (point, circle, arrow, freehand, ruler, angle)
- ❌ No templates currently USE diagrams
- ❌ Diagram panel always shows same default view
- ❌ No template-based diagram auto-selection

**Desired State:**
- ✅ Mammography template → Automatically shows BREAST diagram
- ✅ MRI Spine template → Automatically shows SPINE (frontal + lateral)
- ✅ CT Chest template → Automatically shows CHEST diagram
- ✅ Other templates → Automatically show appropriate diagrams

---

## Phase 1: Template Configuration (Backend) 🔧

### Step 1.1: Add Diagram Module to Templates

**File:** `server/src/seed/seedEnhancedTemplatesWithModules.js`

**Action:** Add `diagram` uiModule to each specialized template

**Example for Mammography:**
```javascript
{
  templateId: 'MAMMO-BIRADS-01',
  name: 'Mammography BI-RADS Assessment',
  uiModules: [
    // Existing modules...
    {
      id: 'anatomical_diagram',
      type: 'diagram',
      title: 'Breast Diagram',
      order: 0,  // Show FIRST (before calculator)
      required: false,
      config: {
        bodyPart: 'Chest',  // Map to existing BODY_DIAGRAMS
        defaultView: 'frontal',
        allowedTools: ['point', 'circle', 'arrow', 'freehand'],
        showMeasurements: true,
        autoLinkFindings: true  // Auto-create findings from markings
      }
    }
  ]
}
```

**Templates to Update:**
| Template ID | Body Part Config | Views | Tools |
|-------------|------------------|-------|-------|
| MAMMO-BIRADS-01 | Chest | frontal | point, circle, arrow, freehand |
| MRI-SPINE-01 | Spine | frontal, lateral | point, arrow, ruler, angle |
| CT-CHEST-01 | Chest | frontal, axial | point, circle, freehand, ruler |

### Step 1.2: Verify Backend Support

**Files to Check:**
- `server/src/models/ReportTemplate.js` - Already has diagram type in enum ✅
- `server/src/services/diagram-annotation-service.js` - Already exists ✅
- `server/src/routes/annotations.js` - API routes exist ✅

**No backend changes needed!** ✅

---

## Phase 2: Frontend Integration (UI) 🎨

### Step 2.1: Update AnatomicalDiagramPanel to Read Template Config

**File:** `viewer/src/components/reporting/panels/AnatomicalDiagramPanel.tsx`

**Current Behavior:**
```typescript
// Currently hard-coded initial state
const [selectedBodyPart, setSelectedBodyPart] = useState('Chest');
const [selectedView, setSelectedView] = useState('frontal');
```

**New Behavior:**
```typescript
// Read from template uiModules
const diagramModule = state.selectedTemplate?.uiModules?.find(m => m.type === 'diagram');

const [selectedBodyPart, setSelectedBodyPart] = useState(
  diagramModule?.config?.bodyPart || 'Chest'
);
const [selectedView, setSelectedView] = useState(
  diagramModule?.config?.defaultView || 'frontal'
);
```

**Changes Needed:**
1. Check if template has diagram module
2. Use config values for initial state
3. Filter available tools based on config
4. Show/hide measurement tools based on config

### Step 2.2: Conditionally Show Diagram Panel

**File:** `viewer/src/components/reporting/UnifiedReportEditor.tsx`

**Current Behavior:**
```typescript
// Diagram tab always shown
<Tab label="Body Diagram" ... />
```

**New Behavior:**
```typescript
// Only show if template has diagram module
{state.selectedTemplate?.uiModules?.some(m => m.type === 'diagram') && (
  <Tab label="Body Diagram" icon={<DiagramIcon />} />
)}
```

**Alternative (Better UX):**
Show diagram INLINE in report content (not as tab) for templates that require it:

```typescript
// In ReportContentPanel.tsx
{state.selectedTemplate?.uiModules
  ?.filter(m => m.type === 'diagram')
  .map(module => (
    <DiagramInlineModule key={module.id} config={module.config} />
  ))
}
```

### Step 2.3: Save Diagram Markings with Report

**File:** `viewer/src/contexts/ReportingContext.tsx`

**Current State:**
- Markings stored in `state.anatomicalMarkings` ✅
- But NOT saved to backend when report saved ❌

**Changes Needed:**
1. Add `anatomicalMarkings` to save payload
2. Add API call to save markings to DiagramAnnotation collection
3. Load markings when report opened

**Code Addition:**
```typescript
// In actions.saveReport
const reportData = {
  // ... existing fields
  anatomicalMarkings: state.anatomicalMarkings  // Add this
};

// After saving report, save diagram annotations
if (state.anatomicalMarkings.length > 0) {
  await fetch('/api/annotations/batch', {
    method: 'POST',
    body: JSON.stringify({
      reportId: state.reportId,
      annotations: state.anatomicalMarkings.map(marking => ({
        diagramType: marking.bodyPart,
        annotationType: marking.type,
        coordinates: marking.coordinates,
        label: marking.label,
        color: marking.color
      }))
    })
  });
}
```

---

## Phase 3: Diagram Configuration per Template 🗺️

### Recommended Diagram Mappings

#### 1. Mammography BI-RADS (MAMMO-BIRADS-01)

**Config:**
```javascript
{
  id: 'breast_diagram',
  type: 'diagram',
  title: 'Breast Localization',
  order: 0,
  required: false,
  config: {
    bodyPart: 'Chest',
    defaultView: 'frontal',
    allowedTools: ['point', 'circle'],
    showQuadrants: true,  // Custom for breast
    autoLinkFindings: true
  }
}
```

**Rationale:**
- Breast imaging requires precise localization (clock position, quadrant)
- Point markers for lesion location
- Circle for lesion boundaries
- Auto-link to BI-RADS findings

#### 2. MRI Spine (MRI-SPINE-01)

**Config:**
```javascript
{
  id: 'spine_diagram',
  type: 'diagram',
  title: 'Spine Anatomy',
  order: 0,
  required: false,
  config: {
    bodyPart: 'Spine',
    defaultView: 'frontal',
    views: ['frontal', 'lateral'],
    allowedTools: ['point', 'arrow', 'ruler', 'angle'],
    highlightLevels: ['L1', 'L2', 'L3', 'L4', 'L5', 'S1'],  // Match checklist
    autoLinkFindings: true
  }
}
```

**Rationale:**
- Spine imaging needs both frontal and lateral views
- Arrow for directional pathology (herniation direction)
- Ruler for disc height measurements
- Angle for alignment/scoliosis
- Sync with L1-S1 checklist module

#### 3. CT Chest (CT-CHEST-01)

**Config:**
```javascript
{
  id: 'chest_diagram',
  type: 'diagram',
  title: 'Chest Anatomy',
  order: 0,
  required: false,
  config: {
    bodyPart: 'Chest',
    defaultView: 'frontal',
    views: ['frontal', 'lateral', 'axial'],
    allowedTools: ['point', 'circle', 'freehand', 'ruler'],
    showLobes: true,  // Lung lobes
    autoLinkFindings: true
  }
}
```

**Rationale:**
- Nodule localization requires multiple views
- Circle for nodule boundaries
- Freehand for complex shapes (consolidation)
- Ruler for size measurements
- Sync with nodule measurement module

#### 4. CT Head/Brain (NEW Template to Create)

**Template:**
```javascript
{
  templateId: 'CT-HEAD-01',
  name: 'CT Head/Brain',
  matchingCriteria: {
    modalities: ['CT'],
    bodyParts: ['HEAD', 'BRAIN', 'SKULL'],
    keywords: ['head', 'brain', 'stroke', 'hemorrhage']
  },
  uiModules: [
    {
      id: 'brain_diagram',
      type: 'diagram',
      title: 'Brain Anatomy',
      order: 0,
      required: false,
      config: {
        bodyPart: 'Head',
        defaultView: 'axial',
        views: ['axial', 'sagittal', 'coronal'],
        allowedTools: ['point', 'circle', 'freehand', 'ruler'],
        showVascularTerritories: true,
        autoLinkFindings: true
      }
    }
  ]
}
```

#### 5. CT/MRI Abdomen (NEW Template to Create)

**Template:**
```javascript
{
  templateId: 'CT-ABDOMEN-01',
  name: 'CT/MRI Abdomen & Pelvis',
  matchingCriteria: {
    modalities: ['CT', 'MR', 'MRI'],
    bodyParts: ['ABDOMEN', 'ABD', 'PELVIS'],
    keywords: ['abdomen', 'liver', 'kidney', 'pancreas']
  },
  uiModules: [
    {
      id: 'abdomen_diagram',
      type: 'diagram',
      title: 'Abdominal Anatomy',
      order: 0,
      required: false,
      config: {
        bodyPart: 'Abdomen',
        defaultView: 'frontal',
        views: ['frontal', 'quadrants'],
        allowedTools: ['point', 'circle', 'freehand', 'ruler'],
        showOrgans: true,
        autoLinkFindings: true
      }
    }
  ]
}
```

---

## Phase 4: Implementation Steps ⚡

### Priority 1: Core Integration (Day 1) 🔥

**Task 1.1:** Update existing templates with diagram modules
- File: `server/src/seed/seedEnhancedTemplatesWithModules.js`
- Add diagram config to MAMMO-BIRADS-01, MRI-SPINE-01, CT-CHEST-01
- Run seed script to update MongoDB Atlas

**Task 1.2:** Update AnatomicalDiagramPanel to read template config
- File: `viewer/src/components/reporting/panels/AnatomicalDiagramPanel.tsx`
- Read `state.selectedTemplate?.uiModules` for diagram config
- Set initial bodyPart and view from config
- Filter tools based on `allowedTools` config

**Task 1.3:** Test integration
- Create Mammography report → Verify Chest diagram loads
- Create MRI Spine report → Verify Spine diagram loads
- Create CT Chest report → Verify Chest diagram loads

### Priority 2: Save/Load Markings (Day 2) 📁

**Task 2.1:** Update Report model to include anatomicalMarkings
- File: `server/src/models/Report.js`
- Add anatomicalMarkings field (array of objects)

**Task 2.2:** Save markings when report saved
- File: `viewer/src/contexts/ReportingContext.tsx`
- Add anatomicalMarkings to save payload
- Call `/api/annotations/batch` to save to DiagramAnnotation collection

**Task 2.3:** Load markings when report opened
- File: `viewer/src/pages/ReportingPage.tsx`
- Fetch markings: `GET /api/annotations/report/{reportId}`
- Pass to ReportingProvider in initialData

### Priority 3: New Templates (Day 3) 🆕

**Task 3.1:** Create CT Head/Brain template
**Task 3.2:** Create CT/MRI Abdomen template
**Task 3.3:** Create X-Ray Extremity templates

### Priority 4: Advanced Features (Optional) ⭐

**Task 4.1:** Auto-link diagram markings to findings
- When user marks lesion → Auto-create structured finding
- Populate location from diagram coordinates

**Task 4.2:** Sync checklist with diagram
- MRI Spine: Clicking L4 in checklist → Highlights L4 in diagram
- Clicking L4 in diagram → Opens L4 in checklist

**Task 4.3:** Custom breast quadrant overlay
- Create breast-specific diagram with clock positions
- Quadrant grid overlay

---

## Phase 5: Testing Plan 🧪

### Test Case 1: Mammography with Breast Diagram

1. Navigate to reporting with `modality=MG`, `bodyPart=BREAST`
2. Click "Mammography BI-RADS Assessment" template
3. **Verify:**
   - Diagram panel shows Chest (breast) view automatically ✅
   - Only point and circle tools available ✅
   - Can mark lesion location ✅
   - Marking auto-creates finding ✅
4. Save report
5. Reopen report
6. **Verify:**
   - Diagram markings restored ✅

### Test Case 2: MRI Spine with Spine Diagram

1. Navigate with `modality=MR`, `bodyPart=L-SPINE`
2. Click "MRI Spine" template
3. **Verify:**
   - Diagram shows Spine (frontal) view automatically ✅
   - Can switch to lateral view ✅
   - Ruler and angle tools available ✅
   - Can mark disc herniation with arrow ✅
4. Fill L1-S1 checklist
5. **Verify:**
   - Diagram levels sync with checklist ✅

### Test Case 3: CT Chest with Lung Diagram

1. Navigate with `modality=CT`, `bodyPart=CHEST`
2. Click "CT Chest" template
3. **Verify:**
   - Diagram shows Chest (frontal) view ✅
   - Can mark nodule with circle ✅
   - Ruler measures nodule size ✅
   - Marking syncs with measurement module ✅

---

## File Changes Summary 📝

### Backend (2 files)
1. `server/src/seed/seedEnhancedTemplatesWithModules.js` - Add diagram modules to templates
2. `server/src/models/Report.js` - Add anatomicalMarkings field (optional)

### Frontend (4 files)
1. `viewer/src/components/reporting/panels/AnatomicalDiagramPanel.tsx` - Read template config
2. `viewer/src/components/reporting/UnifiedReportEditor.tsx` - Conditional diagram tab
3. `viewer/src/contexts/ReportingContext.tsx` - Save/load markings
4. `viewer/src/pages/ReportingPage.tsx` - Load markings on init

### Optional (New Templates)
1. Create CT-HEAD-01 template
2. Create CT-ABDOMEN-01 template
3. Create XRAY-EXTREMITY templates

---

## Benefits of This Approach ✨

### For Radiologists
- ✅ Automatic diagram selection (no manual switching)
- ✅ Right tools for each modality
- ✅ Faster lesion localization
- ✅ Consistent anatomical terminology
- ✅ Visual + text documentation

### For System
- ✅ Template-driven (no hard-coding)
- ✅ Reuses existing diagram infrastructure
- ✅ Backward compatible
- ✅ Scalable to new modalities

### For Reporting Quality
- ✅ Standardized lesion localization
- ✅ Precise measurements
- ✅ Better communication with referring physicians
- ✅ Visual documentation for follow-up

---

## Risks & Mitigations ⚠️

### Risk 1: Diagram Library Limitations
**Issue:** Existing diagrams may not match all body parts  
**Mitigation:** Use closest match (e.g., Chest for Breast), add custom diagrams later

### Risk 2: Performance with Many Markings
**Issue:** Large canvas with 50+ markings may slow down  
**Mitigation:** Implement virtualization, lazy loading of markings

### Risk 3: Mobile Support
**Issue:** Touch-based marking may be difficult  
**Mitigation:** Test on tablets, add larger touch targets

---

## Recommended Implementation Order 🔢

1. **Week 1:** Phase 1 + Phase 2 Priority 1 (Core Integration)
   - Add diagram modules to existing 3 templates
   - Update AnatomicalDiagramPanel to read config
   - Test with Mammography, Spine, Chest

2. **Week 2:** Phase 2 Priority 2 (Save/Load)
   - Implement marking persistence
   - Test save and reload

3. **Week 3:** Phase 3 (New Templates)
   - Create Head, Abdomen templates
   - Test with multiple modalities

4. **Week 4:** Phase 4 (Advanced Features)
   - Auto-linking
   - Checklist sync
   - Custom overlays

---

## Success Criteria ✅

1. Clicking Mammography template → Chest diagram loads automatically
2. Clicking MRI Spine template → Spine diagram loads automatically
3. Clicking CT Chest template → Chest diagram loads automatically
4. Diagram markings save with report
5. Diagram markings restore when report reopened
6. Only appropriate tools shown for each template
7. Backward compatible with templates without diagram modules

---

## Conclusion 🎯

**Complexity:** Medium (mostly configuration, infrastructure exists)  
**Time Estimate:** 2-3 weeks for full implementation  
**Impact:** High (major UX improvement for radiologists)  
**Risk:** Low (uses existing proven components)  

**Recommendation:** Start with Priority 1 (Core Integration) to get immediate value, then iterate on save/load and advanced features.

**Next Step:** Get approval on this plan, then I'll implement Phase 1 Priority 1 (update templates + integrate diagram panel).

---

**Do you approve this plan? Should I proceed with implementation?** 🚀
