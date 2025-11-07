# 🚀 Reporting Module - Quick Start Guide

## Overview

The refactored reporting module provides a clean, efficient architecture for medical report creation with advanced features like anatomical diagrams, voice dictation, AI assistance, and multi-format export.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ReportingPage                          │
│                    (Orchestrator)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ReportingContext                           │
│              (Centralized State)                            │
│  • Auto-save every 30s                                      │
│  • Version control                                          │
│  • Type-safe actions                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                UnifiedReportEditor                          │
│                 (Single Editor)                             │
├──────────────────────────┬──────────────────────────────────┤
│  ReportContentPanel      │    Feature Panels (Tabs)         │
│  (Left Side)             │    (Right Side)                  │
│                          │                                  │
│  • Clinical History      │  📍 Anatomical Diagram           │
│  • Technique             │  🎤 Voice Dictation              │
│  • Structured Findings   │  🤖 AI Assistant                 │
│  • Findings Text         │  📥 Export Options               │
│  • Impression            │                                  │
│  • Recommendations       │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Quick Start

### 1. Navigate to Reporting

```typescript
// New report
window.location.href = '/reporting?studyUID=1.2.3.4.5&patientID=P001&patientName=John%20Doe&modality=CT';

// With AI analysis
window.location.href = '/reporting?studyUID=1.2.3.4.5&analysisId=ai-123&modality=CT';

// Edit existing
window.location.href = '/reporting?reportId=RPT-123';
```

### 2. Use the Context

```typescript
import { useReporting } from '@/contexts/ReportingContext';

function MyComponent() {
  const { state, actions } = useReporting();
  
  // Read state
  console.log(state.findings);
  console.log(state.impression);
  
  // Update state
  actions.updateField('impression', 'No acute findings');
  actions.addFinding({
    id: 'f1',
    location: 'Right upper lobe',
    description: 'Small nodule',
    severity: 'mild'
  });
  
  // Save
  await actions.saveReport();
}
```

### 3. Add a New Feature Panel

```typescript
// 1. Create panel component
// viewer/src/components/reporting/panels/MyNewPanel.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useReporting } from '../../../contexts/ReportingContext';

const MyNewPanel: React.FC = () => {
  const { state, actions } = useReporting();
  
  return (
    <Box>
      <Typography variant="h6">My New Feature</Typography>
      {/* Your feature UI here */}
    </Box>
  );
};

export default MyNewPanel;

// 2. Add to UnifiedReportEditor.tsx
import MyNewPanel from './panels/MyNewPanel';

// Add tab
<Tab value="mynew" icon={<MyIcon />} label="My Feature" />

// Add panel
{state.activePanel === 'mynew' && <MyNewPanel />}

// 3. Update ReportingContext types
activePanel: 'content' | 'anatomical' | 'voice' | 'ai' | 'export' | 'mynew';
```

---

## Features

### 📍 Anatomical Diagram Panel

**Purpose**: Mark findings directly on body diagrams

**Usage**:
```typescript
// Markings are automatically created when user draws
// They auto-create linked findings

// Access markings
const { state } = useReporting();
console.log(state.anatomicalMarkings);

// Add marking programmatically
actions.addMarking({
  id: 'm1',
  type: 'point',
  anatomicalLocation: 'Right upper lobe',
  coordinates: { x: 100, y: 150 },
  view: 'frontal',
  color: '#ff0000',
  timestamp: new Date()
});
```

**Supported**:
- Body parts: Head/Brain, Chest, Abdomen, Spine, Pelvis, Extremities
- Views: Anterior, Posterior, Lateral, Axial, Sagittal, Coronal
- Tools: Point, Circle, Arrow, Freehand
- Colors: Red, Green, Blue, Yellow, Magenta

---

### 🎤 Voice Dictation Panel

**Purpose**: Hands-free report dictation

**Usage**:
```typescript
// Select target field
setTargetField('findingsText');

// Start listening
startListening();

// Pause/Resume
pauseListening();
resumeListening();

// Stop
stopListening();
```

**Tips**:
- Say "period" for punctuation
- Say "new line" for line breaks
- Speak clearly at normal pace
- Works in Chrome, Edge (Web Speech API)

---

### 🤖 AI Assistant Panel

**Purpose**: AI-powered suggestions and auto-population

**Usage**:
```typescript
// Load AI analysis
const { state } = useReporting();
if (state.analysisId) {
  // AI suggestions will load automatically
}

// Apply suggestion
applySuggestion(suggestion);

// Apply all
applyAllSuggestions();
```

**Features**:
- Auto-detects findings from AI analysis
- Confidence scores
- One-click apply
- Marks as AI-detected

---

### 📥 Export Panel

**Purpose**: Multi-format report export

**Formats**:
- **PDF**: Professional document with letterhead
- **DICOM SR**: For PACS integration
- **FHIR**: For EHR/EMR systems
- **JSON**: Structured data
- **TXT**: Plain text

**Usage**:
```typescript
// Select format
setSelectedFormat('pdf');

// Export
await handleExport();
// Downloads file automatically
```

---

## State Management

### State Structure

```typescript
interface ReportState {
  // Core
  reportId?: string;
  studyInstanceUID: string;
  patientInfo: {
    patientID: string;
    patientName: string;
    modality: string;
  };
  
  // Content
  sections: Record<string, string>;
  findings: Finding[];
  anatomicalMarkings: AnatomicalMarking[];
  keyImages: CapturedImage[];
  clinicalHistory: string;
  technique: string;
  findingsText: string;
  impression: string;
  recommendations: string;
  
  // Workflow
  workflowStep: 'template' | 'editing' | 'review' | 'signed';
  creationMode: 'manual' | 'ai-assisted';
  
  // UI
  activePanel: 'content' | 'anatomical' | 'voice' | 'ai' | 'export';
  hasUnsavedChanges: boolean;
  lastSaved?: Date;
  
  // Status
  loading: boolean;
  saving: boolean;
  error?: string;
  version: number;
  reportStatus: 'draft' | 'preliminary' | 'final';
}
```

### Actions

```typescript
// Update field
actions.updateField('impression', 'No acute findings');

// Update section
actions.updateSection('chest', 'Lungs are clear');

// Add finding
actions.addFinding({
  id: 'f1',
  location: 'Right lung',
  description: 'Small nodule',
  severity: 'mild'
});

// Update finding
actions.updateFinding('f1', { severity: 'moderate' });

// Delete finding
actions.deleteFinding('f1');

// Add marking
actions.addMarking(marking);

// Delete marking
actions.deleteMarking('m1');

// Add key image
actions.addKeyImage(image);

// Save
await actions.saveReport();

// Sign
await actions.signReport();

// Set active panel
actions.setActivePanel('anatomical');
```

---

## Auto-Save

Auto-save runs every 30 seconds if there are unsaved changes:

```typescript
// In ReportingContext
useEffect(() => {
  if (state.hasUnsavedChanges && state.reportId && !state.saving) {
    const timer = setTimeout(() => {
      actions.saveReport();
    }, 30000); // 30 seconds
    return () => clearTimeout(timer);
  }
}, [state.hasUnsavedChanges, state.reportId, state.saving]);
```

**Disable auto-save** (if needed):
```typescript
// Comment out the useEffect in ReportingContext.tsx
```

---

## API Integration

### Save Report
```
PUT /api/reports/:reportId
Body: { sections, findings, anatomicalMarkings, ... }
```

### Load Report
```
GET /api/reports/:reportId
```

### Load AI Analysis
```
GET /api/ai-analysis/:analysisId
```

### Export
```
GET /api/reports/:reportId/pdf
GET /api/reports/:reportId/export/dicom-sr
GET /api/reports/:reportId/export/fhir
```

---

## Keyboard Shortcuts (Coming Soon)

- `Ctrl+S`: Save report
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `Ctrl+Enter`: Sign report
- `Ctrl+E`: Export
- `Ctrl+1-4`: Switch panels

---

## Testing

```bash
# Run tests
npm test

# Test specific component
npm test ReportContentPanel

# Test context
npm test ReportingContext
```

---

## Troubleshooting

### Issue: Auto-save not working
**Solution**: Check console for errors, ensure reportId exists

### Issue: Voice dictation not working
**Solution**: Use Chrome/Edge, allow microphone permissions

### Issue: Anatomical diagram not showing
**Solution**: Check canvas rendering, ensure body part is selected

### Issue: State not updating
**Solution**: Ensure you're using actions from useReporting(), not direct state mutation

---

## Performance Tips

1. **Lazy load panels**: Only active panel is rendered
2. **Debounce text inputs**: Reduce re-renders
3. **Memoize expensive computations**: Use useMemo
4. **Optimize canvas**: Clear and redraw only when needed

---

## Migration from Old System

### Old Code
```typescript
// ❌ Old way
<ProductionReportEditor ... />
<AdvancedReportingHub ... />
```

### New Code
```typescript
// ✅ New way
<ReportingProvider initialData={reportData}>
  <UnifiedReportEditor />
</ReportingProvider>
```

---

## Support

For issues or questions:
1. Check console logs
2. Review REPORTING_REFACTORING_COMPLETE.md
3. Check component documentation
4. Contact development team

---

## Next Steps

1. ✅ Test the new system
2. ✅ Add real body diagram images
3. ✅ Implement report locking
4. ✅ Add comprehensive tests
5. ✅ Deploy to production

---

**Happy Reporting! 🎉**
