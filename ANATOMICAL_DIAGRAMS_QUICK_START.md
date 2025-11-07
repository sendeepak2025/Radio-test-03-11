# 🎨 Anatomical Diagrams - Quick Start Guide

## ✅ Setup Complete!

All anatomical diagrams are now ready to use in your reporting system!

## 📁 Available Diagrams

### Full Body (2 diagrams)
- ✅ Neutral frontal view
- ✅ Female frontal view

### Head & Brain (3 diagrams)
- ✅ Axial view (cross-section)
- ✅ Sagittal view (side)
- ✅ Coronal view (front)

### Chest (3 diagrams)
- ✅ Frontal view (rib cage)
- ✅ Lateral view (side)
- ✅ Axial view (cross-section)

### Abdomen (2 diagrams)
- ✅ Frontal view
- ✅ Quadrants (RUQ, LUQ, RLQ, LLQ)

### Spine (2 diagrams)
- ✅ Lateral view (side)
- ✅ Frontal view

### Pelvis (1 diagram)
- ✅ Frontal view

### Extremities (3 diagrams)
- ✅ Shoulder joint
- ✅ Hand bones
- ✅ Knee joint

**Total: 16 professional medical diagrams** 🎉

## 🚀 How to Use

### Option 1: Use the DiagramLibrary Component

```tsx
import { DiagramLibrary } from '@/components/reporting/DiagramLibrary';

function MyReportingComponent() {
  const [selectedDiagram, setSelectedDiagram] = useState(null);

  return (
    <DiagramLibrary
      onSelectDiagram={(diagram) => {
        setSelectedDiagram(diagram);
        console.log('Selected:', diagram.name);
      }}
      selectedDiagramId={selectedDiagram?.id}
    />
  );
}
```

### Option 2: Direct Access to Diagrams

```tsx
import { DIAGRAM_LIBRARY, getDiagramById } from '@/components/reporting/DiagramLibrary';

// Get all diagrams
const allDiagrams = DIAGRAM_LIBRARY;

// Get specific diagram
const chestDiagram = getDiagramById('chest-frontal');

// Use in your component
<img src={chestDiagram.path} alt={chestDiagram.name} />
```

### Option 3: Use in AnatomicalDiagramPanel

The diagrams are already integrated into your `AnatomicalDiagramPanel` component:

```tsx
import { AnatomicalDiagramPanel } from '@/components/reporting/panels/AnatomicalDiagramPanel';

<AnatomicalDiagramPanel
  selectedDiagram="chest-frontal"
  onDiagramChange={(diagramId) => console.log('Changed to:', diagramId)}
  annotations={[]}
  onAnnotationsChange={(annotations) => console.log('Annotations:', annotations)}
/>
```

## 📂 File Locations

- **Diagrams**: `viewer/public/diagrams/`
- **Component**: `viewer/src/components/reporting/DiagramLibrary.tsx`
- **Scripts**: 
  - `viewer/scripts/download-anatomical-diagrams.js` (downloads from Wikimedia)
  - `viewer/scripts/create-fallback-diagrams.js` (creates fallback SVGs)

## 🔧 Maintenance

### Re-download diagrams from Wikimedia:
```bash
node viewer/scripts/download-anatomical-diagrams.js
```

### Create missing fallback diagrams:
```bash
node viewer/scripts/create-fallback-diagrams.js
```

### Check what's missing:
```bash
cat viewer/public/diagrams/missing-files.json
```

## 🎯 Features

### Search & Filter
- Search by name or description
- Filter by category (Full Body, Head & Brain, Chest, etc.)
- Visual grid layout

### Diagram Information
Each diagram includes:
- Unique ID
- Display name
- Category
- File path
- Description

### Error Handling
- Automatic fallback if image fails to load
- Professional placeholder SVGs for missing diagrams
- Graceful degradation

## 💡 Tips

1. **For X-Ray Reports**: Use chest-frontal, chest-lateral
2. **For CT/MRI Brain**: Use brain-axial, brain-sagittal, brain-coronal
3. **For Abdominal Pain**: Use abdomen-quadrants to mark location
4. **For Orthopedic**: Use extremities diagrams (shoulder, hand, knee)
5. **For Spinal Issues**: Use spine-lateral, spine-frontal

## 🎨 Customization

### Add Your Own Diagrams

1. Add SVG file to `viewer/public/diagrams/`
2. Update `DIAGRAM_LIBRARY` in `DiagramLibrary.tsx`:

```tsx
{
  id: 'my-custom-diagram',
  name: 'My Custom Diagram',
  category: 'Custom',
  path: '/diagrams/my-custom-diagram.svg',
  description: 'Description here'
}
```

3. Add category to `DIAGRAM_CATEGORIES` if needed

## ✨ What's Next?

The diagrams are ready to use! They're already integrated into:
- ✅ AnatomicalDiagramPanel
- ✅ UnifiedReportEditor
- ✅ AdvancedReportingHub

Just start creating reports and select diagrams from the panel!

## 🆘 Troubleshooting

### Diagrams not showing?
1. Check browser console for errors
2. Verify files exist: `ls viewer/public/diagrams/`
3. Clear browser cache
4. Restart dev server

### Need more diagrams?
1. Edit `viewer/scripts/download-anatomical-diagrams.js`
2. Add new entries to `SVG_LINKS` object
3. Run: `node viewer/scripts/download-anatomical-diagrams.js`

### Want better quality?
1. Find SVG on Wikimedia Commons
2. Add exact filename to download script
3. Or create custom SVG and add to diagrams folder

---

**You're all set! 🎉 Start using professional medical diagrams in your reports!**
