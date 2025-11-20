# Architecture Diagram: Specialized Reporting Modules

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          RADIOLOGY PACS VIEWER                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Study Viewer │ │  Worklist    │ │   Reporting  │
        │  (OHIF 3.x)  │ │  Management  │ │    Module    │ ◄── THIS
        └──────────────┘ └──────────────┘ └──────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────┐
                    │                             │                         │
                    ▼                             ▼                         ▼
        ┌────────────────────┐       ┌────────────────────┐   ┌────────────────────┐
        │ Template Selector  │       │ Unified Report     │   │ Feature Panels     │
        │ (Smart Matching)   │       │ Editor             │   │ (Diagrams, AI, etc)│
        └────────────────────┘       └────────────────────┘   └────────────────────┘
                    │                             │
                    │ selectedTemplate            │
                    ▼                             ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │              ReportContentPanel (Main Editor)                   │
        ├─────────────────────────────────────────────────────────────────┤
        │  IF template.uiModules exists:                                  │
        │  ┌───────────────────────────────────────────────────────────┐  │
        │  │ 🎯 Specialized Assessment Tools                           │  │
        │  ├───────────────────────────────────────────────────────────┤  │
        │  │ FOR EACH module in template.uiModules:                    │  │
        │  │   SWITCH module.type:                                     │  │
        │  │     CASE 'calculator':   render <CalculatorModule />      │  │
        │  │     CASE 'checklist':    render <ChecklistModule />       │  │
        │  │     CASE 'measurements': render <MeasurementModule />     │  │
        │  └───────────────────────────────────────────────────────────┘  │
        │                                                                 │
        │  Standard Sections (always present):                            │
        │  ┌───────────────────────────────────────────────────────────┐  │
        │  │ Clinical History [text]                                   │  │
        │  │ Technique [text]                                          │  │
        │  │ Findings [text]                                           │  │
        │  │ Impression [text]                                         │  │
        │  └───────────────────────────────────────────────────────────┘  │
        └─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Auto-save (30s)
                                    ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                    Backend API (Node.js)                        │
        ├─────────────────────────────────────────────────────────────────┤
        │  POST /api/reports              → Save report                   │
        │  GET  /api/templates            → List templates                │
        │  POST /api/templates/match      → Find best template            │
        └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                    MongoDB Database                             │
        ├─────────────────────────────────────────────────────────────────┤
        │  Collection: reporttemplates                                    │
        │  {                                                              │
        │    templateId: "MAMMO-BIRADS-01",                               │
        │    matchingCriteria: { modalities: ["MG"], ... },               │
        │    uiModules: [                                                 │
        │      {                                                          │
        │        id: "birads_calculator",                                 │
        │        type: "calculator",                                      │
        │        config: { criteria: [...] }                              │
        │      }                                                          │
        │    ]                                                            │
        │  }                                                              │
        │                                                                 │
        │  Collection: reports                                            │
        │  {                                                              │
        │    sections: {                                                  │
        │      "uiModule_birads_calculator": "{...JSON...}",              │
        │      "clinicalHistory": "Screening...",                         │
        │      ...                                                        │
        │    }                                                            │
        │  }                                                              │
        └─────────────────────────────────────────────────────────────────┘
```

## Component Flow Diagram

```
User Action: Create Report (Modality: MG, Body Part: BREAST)
│
├─▶ TemplateSelectorUnified
│   │
│   ├─▶ Calculate match scores for all templates
│   │   ├─ MAMMO-BIRADS-01: 95 (modality=50, bodyPart=40, keywords=5)
│   │   ├─ MRI-SPINE-01: 0 (no match)
│   │   └─ CT-CHEST-01: 0 (no match)
│   │
│   └─▶ Select best match: MAMMO-BIRADS-01
│       └─▶ actions.setSelectedTemplate(template)
│
└─▶ ReportContentPanel
    │
    ├─▶ Read state.selectedTemplate.uiModules
    │   └─▶ [
    │         { id: "birads_calculator", type: "calculator", ... },
    │         { id: "breast_measurements", type: "measurements", ... }
    │       ]
    │
    ├─▶ Render UI Modules
    │   │
    │   ├─▶ CalculatorModule
    │   │   │ Props: config={criteria: [...]}
    │   │   │       onChange={(data) => handleModuleChange("birads_calculator", data)}
    │   │   │
    │   │   ├─▶ User selects: Mass=irregular [2], Calc=benign [1]
    │   │   ├─▶ Calculate: score=3, category=3
    │   │   └─▶ onChange({ selections, score, category, recommendation })
    │   │       └─▶ actions.updateSection("uiModule_birads_calculator", JSON.stringify(data))
    │   │
    │   └─▶ MeasurementModule
    │       │ Props: config={units: ["mm", "cm"], ...}
    │       │       onChange={(data) => handleModuleChange("breast_measurements", data)}
    │       │
    │       ├─▶ User adds: Mass AP = 12.5 mm
    │       └─▶ onChange([{ id: "...", label: "Mass AP", value: 12.5, unit: "mm" }])
    │           └─▶ actions.updateSection("uiModule_breast_measurements", JSON.stringify(data))
    │
    ├─▶ Render Standard Fields
    │   ├─▶ Clinical History [TextField]
    │   ├─▶ Technique [TextField]
    │   ├─▶ Findings [TextField]
    │   └─▶ Impression [TextField]
    │
    └─▶ Auto-save Timer (every 30s)
        └─▶ POST /api/reports
            Body: {
              sections: {
                "uiModule_birads_calculator": "{\"score\":3,\"category\":3,...}",
                "uiModule_breast_measurements": "[{\"label\":\"Mass AP\",...}]",
                "clinicalHistory": "Screening mammography",
                ...
              }
            }
```

## Data Flow: Module to Database

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION (Frontend)                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CalculatorModule Component                                            │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ User clicks: Mass = "irregular" (score: 2)                    │     │
│  │ State: { selections: { mass: "irregular" }, score: 2 }        │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                           │                                             │
│                           │ onChange() callback                         │
│                           ▼                                             │
│  ReportContentPanel                                                    │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ handleModuleChange("birads_calculator", data)                 │     │
│  │   → actions.updateSection(                                    │     │
│  │       "uiModule_birads_calculator",                           │     │
│  │       JSON.stringify(data)                                    │     │
│  │     )                                                          │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                           │                                             │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────┐
│ 2. STATE MANAGEMENT                                                     │
├───────────────────────────┼─────────────────────────────────────────────┤
│                           ▼                                             │
│  ReportingContext                                                      │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ state.sections = {                                            │     │
│  │   "uiModule_birads_calculator": '{"score":2,"category":3}',   │     │
│  │   "uiModule_breast_measurements": '[{...}]',                  │     │
│  │   "clinicalHistory": "Screening mammography",                 │     │
│  │   ...                                                          │     │
│  │ }                                                              │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                           │                                             │
│                           │ Auto-save hook (30s interval)               │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────┐
│ 3. API REQUEST (Network)                                                │
├───────────────────────────┼─────────────────────────────────────────────┤
│                           ▼                                             │
│  POST /api/reports/:id                                                 │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Body: {                                                       │     │
│  │   sections: {                                                 │     │
│  │     "uiModule_birads_calculator": '{"score":2,...}',          │     │
│  │     "uiModule_breast_measurements": '[{...}]',                │     │
│  │     "clinicalHistory": "Screening..."                         │     │
│  │   },                                                          │     │
│  │   status: "draft"                                             │     │
│  │ }                                                              │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                           │                                             │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────┐
│ 4. BACKEND PROCESSING (Node.js)                                         │
├───────────────────────────┼─────────────────────────────────────────────┤
│                           ▼                                             │
│  routes/reports-unified.js                                             │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ router.put('/:id', async (req, res) => {                     │     │
│  │   const report = await Report.findById(req.params.id);       │     │
│  │   report.sections = req.body.sections;                       │     │
│  │   await report.save();                                        │     │
│  │ });                                                           │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                           │                                             │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────┐
│ 5. DATABASE STORAGE (MongoDB)                                           │
├───────────────────────────┼─────────────────────────────────────────────┤
│                           ▼                                             │
│  Collection: reports                                                   │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ {                                                             │     │
│  │   _id: ObjectId("..."),                                       │     │
│  │   sections: {                                                 │     │
│  │     uiModule_birads_calculator: "{                            │     │
│  │       \"selections\": {\"mass\":\"irregular\"},               │     │
│  │       \"score\": 2,                                           │     │
│  │       \"category\": 3,                                        │     │
│  │       \"recommendation\": \"Probably benign...\"              │     │
│  │     }",                                                       │     │
│  │     uiModule_breast_measurements: "[                          │     │
│  │       {\"id\":\"...\",\"label\":\"Mass AP\",\"value\":12.5}   │     │
│  │     ]",                                                       │     │
│  │     clinicalHistory: "Screening mammography"                 │     │
│  │   },                                                          │     │
│  │   status: "draft",                                            │     │
│  │   updatedAt: ISODate("...")                                  │     │
│  │ }                                                             │     │
│  └───────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Module Type Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UI Module Interface                             │
├─────────────────────────────────────────────────────────────────────────┤
│  interface UIModuleProps {                                              │
│    config?: any;              // Module-specific configuration          │
│    value?: any;               // Current module data                    │
│    onChange?: (data) => void; // Callback when data changes             │
│    required?: boolean;        // Validation flag                        │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
        │ Calculator     │ │ Checklist      │ │ Measurement    │
        │ Module         │ │ Module         │ │ Module         │
        └────────────────┘ └────────────────┘ └────────────────┘
                │                   │                   │
    ┌───────────┴─────────┐   ┌─────┴──────┐   ┌────────┴────────┐
    │ BI-RADS             │   │ Spine      │   │ Lesion Size     │
    │ TI-RADS             │   │ Joint      │   │ Nodule Diameter │
    │ PI-RADS             │   │ Lymph Node │   │ Volume          │
    │ Lung-RADS           │   │ BI-RADS    │   │ Distance        │
    └─────────────────────┘   └────────────┘   └─────────────────┘
```

## Template Matching Algorithm

```
Input: { modality: "MG", bodyPart: "BREAST", description: "screening" }
│
├─▶ Fetch all active templates from database
│   └─▶ [MAMMO-BIRADS-01, MRI-SPINE-01, CT-CHEST-01, ...]
│
└─▶ FOR EACH template:
    │
    ├─▶ Calculate match scores:
    │   │
    │   ├─ Modality Match:
    │   │  IF "MG" in template.matchingCriteria.modalities
    │   │    → score += template.matchingWeights.modalityWeight (50)
    │   │
    │   ├─ Body Part Match:
    │   │  IF "BREAST" in template.matchingCriteria.bodyParts
    │   │    → score += template.matchingWeights.bodyPartWeight (40)
    │   │
    │   ├─ Keyword Match:
    │   │  FOR EACH keyword in description.toLowerCase().split()
    │   │    IF keyword in template.matchingCriteria.keywords
    │   │      → score += template.matchingWeights.keywordWeight (5)
    │   │
    │   └─ Procedure Type Match:
    │      IF "screening" in template.matchingCriteria.procedureTypes
    │        → score += template.matchingWeights.procedureTypeWeight (15)
    │
    └─▶ Total Score: 0-100
        │
        └─▶ MAMMO-BIRADS-01: 95 (50+40+5)      ◄── BEST MATCH
            MRI-SPINE-01: 0
            CT-CHEST-01: 0
```

## Extension Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Future Module Types (Easy to Add)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. DiagramModule (Interactive Anatomy)                                 │
│     ┌───────────────────────────────────────────────────────────┐      │
│     │ type: 'diagram'                                           │      │
│     │ config: { bodyPart: 'spine', allowMarkings: true }        │      │
│     │ → Renders anatomical diagram with annotation tools        │      │
│     └───────────────────────────────────────────────────────────┘      │
│                                                                         │
│  2. FindingsToggle (Checkbox Grid)                                      │
│     ┌───────────────────────────────────────────────────────────┐      │
│     │ type: 'findings_toggle'                                   │      │
│     │ config: { items: ['Edema', 'Hemorrhage', 'Mass'] }        │      │
│     │ → Renders checkbox grid: Present / Absent / Not Assessed  │      │
│     └───────────────────────────────────────────────────────────┘      │
│                                                                         │
│  3. ComparisonModule (Prior vs Current)                                 │
│     ┌───────────────────────────────────────────────────────────┐      │
│     │ type: 'comparison'                                        │      │
│     │ config: { fields: ['Size', 'Density', 'Location'] }       │      │
│     │ → Renders side-by-side comparison table                   │      │
│     └───────────────────────────────────────────────────────────┘      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

To add new module:
1. Create component in /modules/NewModule.tsx
2. Add case to ReportContentPanel.tsx switch statement
3. Export from /modules/index.ts
4. Configure in template seed script
5. No database schema changes needed!
```

---

**Summary:** The architecture is designed for extensibility. Adding new module types requires only creating a new React component and adding it to the switch statement. Templates drive everything else through configuration.
