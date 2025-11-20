# 🎨 UI/UX DESIGN PLAN: Anatomical Diagrams in Specialized Templates

## Executive Summary

**Goal:** Create an intuitive, seamless user experience for anatomical diagram integration in radiology reporting that feels natural, reduces clicks, and improves reporting speed.

**Design Philosophy:**
- **Zero Configuration** - Diagrams appear automatically based on template
- **Context-Aware** - Show only relevant tools and options
- **Inline Integration** - Diagrams embedded in workflow, not hidden in tabs
- **Visual Hierarchy** - Important actions prominent, advanced features accessible
- **Mobile-Responsive** - Works on tablets and touch devices

---

## Current State Analysis

### Current Problems ❌

1. **Hidden in Tabs** - Diagram panel buried in tabs, users forget it exists
2. **Manual Setup** - Users must manually select body part and view
3. **Too Many Options** - All drawing tools shown regardless of need
4. **Disconnected** - Diagrams separate from findings/measurements
5. **No Guidance** - Users don't know when to use diagrams
6. **Lost Work** - Markings not saved, lost on refresh

### Desired State ✅

1. **Visible by Default** - Diagrams prominently displayed in main workflow
2. **Auto-Configured** - Right diagram loads automatically
3. **Contextual Tools** - Only relevant tools shown (e.g., BI-RADS only needs point/circle)
4. **Integrated** - Markings linked to findings/measurements
5. **Guided Workflow** - Clear prompts when diagram needed
6. **Persistent** - Markings auto-save and restore

---

## UI/UX Approach: 3 Design Options

### Option A: Inline Diagram Module (Recommended) ⭐

**Concept:** Diagram appears as a specialized module in the main report content area, similar to BI-RADS calculator

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│ Report Content                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 🎯 Specialized Assessment Tools                        │
│ ─────────────────────────────────────────────────────  │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ 📍 Breast Localization Diagram                  ║  │ ◄── NEW!
│ ╟──────────────────────────────────────────────────╢  │
│ ║ ┌────────────┬─────────────────────────────────┐ ║  │
│ ║ │            │  🖱️ Tools                       │ ║  │
│ ║ │            │  ○ Point  ○ Circle  ○ Arrow     │ ║  │
│ ║ │            │  🎨 Red  🟢 Green  🔵 Blue      │ ║  │
│ ║ │            │  ───────────────────────────────│ ║  │
│ ║ │   DIAGRAM  │  📝 Markings (2)                │ ║  │
│ ║ │   (Canvas) │  • Lesion at 2 o'clock [Red]   │ ║  │
│ ║ │            │  • Mass boundary [Blue]         │ ║  │
│ ║ │  600x400px │  ───────────────────────────────│ ║  │
│ ║ │            │  [+ Add Finding from Marking]   │ ║  │
│ ║ └────────────┴─────────────────────────────────┘ ║  │
│ ║ ℹ️ Click to mark lesion location               ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ 🧮 BI-RADS Calculator                            ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ ╔══════════════════════════════════════════════════╗  │
│ ║ 📏 Lesion Measurements                           ║  │
│ ╚══════════════════════════════════════════════════╝  │
│                                                        │
│ ──────────────────────────────────────────────────── │
│                                                        │
│ Clinical History [text]                                │
│ Technique [text]                                       │
└────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Highly visible - users can't miss it
- ✅ Natural workflow - mark → calculate → measure → describe
- ✅ Context preserved - diagram next to related data entry
- ✅ No tab switching - everything in one scroll

**Cons:**
- ⚠️ Takes vertical space (can collapse/expand)
- ⚠️ Smaller canvas than full-screen

**Implementation:**
- New component: `DiagramInlineModule.tsx`
- Renders in `ReportContentPanel` alongside other modules
- Collapsible for space saving

---

### Option B: Side Panel (Persistent)

**Concept:** Diagram in persistent right sidebar, always visible while editing

**Layout:**
```
┌──────────────────────┬───────────────────────────────┐
│ Report Content       │ 📍 Diagram Panel              │
│                      │ ───────────────────────────── │
│ BI-RADS Calculator   │ 🖱️ Point  Circle  Arrow      │
│                      │ ───────────────────────────── │
│ Lesion Measurements  │                               │
│                      │   ┌─────────────────────┐     │
│ Clinical History     │   │                     │     │
│                      │   │     DIAGRAM         │     │
│ Technique            │   │     (Canvas)        │     │
│                      │   │                     │     │
│ Findings             │   │    400x400px        │     │
│                      │   │                     │     │
│ Impression           │   └─────────────────────┘     │
│                      │                               │
│                      │ 📝 Markings (2)               │
│                      │ • Lesion [Red]                │
│                      │ • Boundary [Blue]             │
└──────────────────────┴───────────────────────────────┘
```

**Pros:**
- ✅ Always visible - no scrolling needed
- ✅ More canvas space
- ✅ Can mark while reading text fields

**Cons:**
- ⚠️ Reduces text area width
- ⚠️ Mobile/tablet unfriendly
- ⚠️ May feel disconnected from workflow

**Implementation:**
- Update `UnifiedReportEditor` layout to 2-column
- Conditional rendering based on template config

---

### Option C: Modal/Overlay (On-Demand)

**Concept:** Diagram opens as modal when user clicks "Mark Anatomy" button

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│ Report Content                                         │
│ ─────────────────────────────────────────────────────  │
│                                                        │
│ BI-RADS Calculator                                     │
│                                                        │
│ Lesion Measurements                                    │
│ [📍 Mark on Diagram] ◄── Button                       │
│                                                        │
└────────────────────────────────────────────────────────┘
                          ↓ (click button)
┌────────────────────────────────────────────────────────┐
│ ╔══════════════════════════════════════════════════╗  │
│ ║ 📍 Breast Localization Diagram             [×]  ║  │
│ ╟──────────────────────────────────────────────────╢  │
│ ║                                                  ║  │
│ ║       ┌──────────────────────────────────┐       ║  │
│ ║       │                                  │       ║  │
│ ║       │        DIAGRAM (Full Size)       │       ║  │
│ ║       │         800x600px                │       ║  │
│ ║       │                                  │       ║  │
│ ║       └──────────────────────────────────┘       ║  │
│ ║                                                  ║  │
│ ║  🖱️ Point  Circle  Arrow  Freehand  Ruler       ║  │
│ ║  🎨 Red  Green  Blue  Yellow  Purple            ║  │
│ ║                                                  ║  │
│ ║  [Clear All] [Undo] [Save & Close]              ║  │
│ ╚══════════════════════════════════════════════════╝  │
└────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Maximum canvas space
- ✅ Focused task - no distractions
- ✅ Doesn't clutter main view

**Cons:**
- ⚠️ Hidden until clicked - users may forget
- ⚠️ Context switch - leaves main workflow
- ⚠️ Extra clicks required

**Implementation:**
- Dialog/Modal component
- Button in ReportContentPanel
- Full-screen on mobile

---

## Recommended Approach: Hybrid Design ⭐⭐⭐

**Combine Option A (Inline) + Option C (Modal)**

### Default View: Inline Compact
```
╔══════════════════════════════════════════════════════╗
║ 📍 Breast Localization Diagram              [Expand] ║
╟──────────────────────────────────────────────────────╢
║ ┌──────────┬────────────────────────────────────┐   ║
║ │ DIAGRAM  │ 🖱️ Point  Circle  Arrow           │   ║
║ │ 400x300  │ 📝 Markings (2)                    │   ║
║ │          │ • Lesion at 2 o'clock [Red]        │   ║
║ └──────────┴────────────────────────────────────┘   ║
║ ℹ️ Click diagram or [Expand] for full screen       ║
╚══════════════════════════════════════════════════════╝
```

### Expanded View: Full-Screen Modal (Click "Expand" or click canvas)
```
╔══════════════════════════════════════════════════════╗
║ 📍 Breast Localization Diagram         [Minimize][×] ║
╟──────────────────────────────────────────────────────╢
║               ┌────────────────────────┐              ║
║               │                        │              ║
║               │   DIAGRAM (Full Size)  │              ║
║               │      800x600px         │              ║
║               │                        │              ║
║               └────────────────────────┘              ║
║                                                       ║
║ 🖱️ Tools: ○ Point  ○ Circle  ○ Arrow  ○ Freehand    ║
║ 🎨 Color: ○ Red  ○ Green  ○ Blue  ○ Yellow          ║
║ 📏 Ruler: [Distance] [Angle]                         ║
║                                                       ║
║ 📝 Markings List:                                    ║
║ 1. [Red Point] Lesion at 2 o'clock upper outer  [×]  ║
║ 2. [Blue Circle] Mass boundary (12mm)           [×]  ║
║                                                       ║
║ [+ Add Finding] [Clear All] [Undo] [Save & Close]    ║
╚══════════════════════════════════════════════════════╝
```

**Why Hybrid?**
- ✅ Best of both worlds
- ✅ Compact by default (doesn't overwhelm)
- ✅ Expands for precision work
- ✅ Always accessible but not intrusive
- ✅ Mobile-friendly (full-screen on small screens)

---

## Detailed UI Components

### 1. Diagram Module Header

```
╔══════════════════════════════════════════════════════╗
║ 📍 Breast Localization Diagram    [?] [↕️] [↗️] [×]  ║
║ ─────────────────────────────────────────────────────║
```

**Elements:**
- 📍 **Icon** - Visual indicator of module type
- **Title** - From template config
- **[?]** - Help tooltip: "Click to mark lesion location"
- **[↕️]** - Collapse/Expand compact view
- **[↗️]** - Open full-screen mode
- **[×]** - Hide module (if optional)

### 2. Tool Palette (Context-Aware)

**Mammography (BI-RADS):**
```
🖱️ Tools: ● Point  ○ Circle  ○ Arrow
```
(Only point, circle, arrow - no freehand/ruler)

**MRI Spine:**
```
🖱️ Tools: ○ Point  ● Arrow  ○ Ruler  ○ Angle
```
(Arrow for herniation direction, ruler/angle for alignment)

**CT Chest:**
```
🖱️ Tools: ○ Point  ○ Circle  ● Freehand  ○ Ruler
```
(Freehand for complex consolidation shapes)

**Design:**
- Radio buttons (single selection)
- Icons + text labels
- Active tool highlighted (filled circle)
- Tooltips on hover
- Keyboard shortcuts (P=Point, C=Circle, A=Arrow, etc.)

### 3. Color Picker (Simplified)

```
🎨 Color: ● Red  ○ Green  ○ Blue  ○ Yellow  ○ Purple
```

**Colors by Use:**
- 🔴 Red - Primary lesion/abnormality
- 🟢 Green - Normal reference
- 🔵 Blue - Secondary finding
- 🟡 Yellow - Warning/attention
- 🟣 Purple - Vascular

**Design:**
- Radio buttons with color swatches
- Selected color has checkmark
- Large touch targets (40px)

### 4. Marking List (Live Updates)

```
📝 Markings (3)
┌─────────────────────────────────────────────────────┐
│ 1. [🔴] Point - Lesion at 2 o'clock UOQ        [×] │
│ 2. [🔵] Circle - Mass boundary (Ø 12mm)        [×] │
│ 3. [🟡] Arrow - Architectural distortion       [×] │
└─────────────────────────────────────────────────────┘
[+ Add to Findings]  [Clear All]
```

**Features:**
- Auto-numbered list
- Color-coded markers
- Descriptive labels (auto-generated or user-edited)
- Delete button per item
- Hover to highlight on canvas
- Click to edit label

### 5. Canvas Interaction

**Compact View (400x300):**
- Single click = place point/start shape
- Drag = draw circle/freehand
- Right click = context menu (edit, delete)
- Double click = open full-screen

**Full-Screen View (800x600):**
- Zoom controls (+/- buttons)
- Pan (drag with mouse wheel pressed)
- Grid overlay (toggle)
- Ruler scale (toggle)

### 6. Auto-Linking to Findings

**When user marks diagram:**
```
┌─────────────────────────────────────────────────────┐
│ 📍 New marking created                              │
│ "Lesion at 2 o'clock upper outer quadrant"         │
│                                                     │
│ [+ Add to Structured Findings]  [Dismiss]          │
└─────────────────────────────────────────────────────┘
```

**If user clicks "Add to Findings":**
- Auto-creates finding with location from diagram
- Links finding to marking (bidirectional)
- Updates finding description with anatomical location

---

## Responsive Design

### Desktop (>1200px)
```
┌─────────────────────────────────────────────────────┐
│ Report Content (70%)     │ Diagram Inline (30%)     │
│                          │ or                       │
│                          │ Full-Screen Modal        │
└─────────────────────────────────────────────────────┘
```

### Tablet (768px - 1200px)
```
┌─────────────────────────────────────────────────────┐
│ Report Content (100%)                               │
│ ─────────────────────────────────────────────────── │
│ Diagram Inline (Collapsed by default)               │
│ Click to expand → Full-Screen Modal                 │
└─────────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────────┐
│ Report Content       │
│ ──────────────────── │
│ [📍 Mark Diagram]    │ ◄── Button only
│ (Opens full-screen)  │
└──────────────────────┘
```

---

## Interaction Flows

### Flow 1: First-Time User (Mammography)

```
1. User clicks "Mammography BI-RADS" template
   ↓
2. Report editor loads
   ↓
3. 📍 Breast Diagram appears at TOP (collapsed, 400x300)
   ↓
4. Tooltip shows: "Click to mark lesion location"
   ↓
5. User clicks canvas
   ↓
6. Expands to full-screen modal
   ↓
7. Point tool selected by default (from template config)
   ↓
8. User clicks diagram at lesion location
   ↓
9. Marking appears with label: "Point 1 at 2 o'clock"
   ↓
10. Prompt: "Add to Findings?" → User clicks Yes
   ↓
11. Finding auto-created with location data
   ↓
12. User clicks "Save & Close"
   ↓
13. Returns to compact view with marking visible
```

### Flow 2: Experienced User (MRI Spine)

```
1. User creates MRI Spine report
   ↓
2. Spine diagram loads (frontal view, collapsed)
   ↓
3. User fills L4 in checklist: "Disc Herniation"
   ↓
4. User clicks diagram → Opens full-screen
   ↓
5. Arrow tool auto-selected (from template)
   ↓
6. User draws arrow at L4-L5 showing herniation direction
   ↓
7. Marking auto-linked to L4 checklist item
   ↓
8. User switches to "lateral" view (tab in full-screen)
   ↓
9. Marks same level on lateral view
   ↓
10. Both views saved together
```

### Flow 3: Editing Existing Report

```
1. User opens report with templateId=MAMMO-BIRADS-01
   ↓
2. Backend fetches diagram markings for this reportId
   ↓
3. Diagram loads with existing markings restored
   ↓
4. Markings list shows: "2 markings found"
   ↓
5. User adds new marking
   ↓
6. Auto-save updates backend
```

---

## Visual Design Tokens

### Colors
```css
/* Primary */
--diagram-primary: #1976d2;      /* Blue - tool active state */
--diagram-secondary: #dc004e;    /* Pink - markings */

/* Status */
--diagram-success: #4caf50;      /* Green - saved */
--diagram-warning: #ff9800;      /* Orange - unsaved */
--diagram-error: #f44336;        /* Red - error */

/* Backgrounds */
--diagram-bg: #ffffff;           /* Canvas background */
--diagram-panel-bg: #f5f5f5;     /* Panel background */
--diagram-border: #e0e0e0;       /* Borders */

/* Marking Colors */
--marking-red: #e53935;
--marking-green: #43a047;
--marking-blue: #1e88e5;
--marking-yellow: #fdd835;
--marking-purple: #8e24aa;
```

### Typography
```css
/* Module Title */
.diagram-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1976d2;
}

/* Marking Labels */
.marking-label {
  font-size: 0.875rem;
  font-weight: 400;
  color: #424242;
}

/* Help Text */
.diagram-hint {
  font-size: 0.75rem;
  font-style: italic;
  color: #757575;
}
```

### Spacing
```css
/* Module Padding */
--diagram-module-padding: 16px;

/* Tool Spacing */
--tool-button-size: 40px;
--tool-gap: 8px;

/* Canvas Margins */
--canvas-margin: 12px;
```

### Shadows
```css
/* Module Shadow */
--diagram-shadow: 0 2px 4px rgba(0,0,0,0.1);

/* Modal Shadow */
--diagram-modal-shadow: 0 8px 16px rgba(0,0,0,0.2);

/* Hover State */
--diagram-hover-shadow: 0 4px 8px rgba(0,0,0,0.15);
```

---

## Accessibility (a11y)

### Keyboard Navigation
- **Tab** - Navigate between tools
- **Enter/Space** - Activate tool
- **P** - Point tool
- **C** - Circle tool
- **A** - Arrow tool
- **F** - Freehand tool
- **R** - Ruler tool
- **Esc** - Close modal
- **Ctrl+Z** - Undo last marking
- **Del** - Delete selected marking

### Screen Reader Support
```html
<div role="region" aria-label="Anatomical Diagram">
  <button aria-label="Point tool" aria-pressed="true">
    <svg aria-hidden="true">...</svg>
    Point
  </button>
  <canvas aria-label="Breast diagram with 2 markings">
    <p>Diagram showing breast anatomy with markings at:</p>
    <ul>
      <li>Lesion at 2 o'clock upper outer quadrant (red point)</li>
      <li>Mass boundary 12mm diameter (blue circle)</li>
    </ul>
  </canvas>
</div>
```

### ARIA Attributes
- `role="toolbar"` - Tool palette
- `role="button"` - Tools
- `aria-pressed` - Active tool state
- `aria-label` - Descriptive labels
- `aria-describedby` - Help hints

### Focus Management
- Clear focus indicators (2px blue outline)
- Logical tab order
- Focus trap in modal
- Return focus on modal close

---

## Animations & Transitions

### Module Expand/Collapse
```css
.diagram-module {
  transition: height 0.3s ease-in-out;
}

/* Collapsed: 60px header only */
.diagram-module.collapsed {
  height: 60px;
  overflow: hidden;
}

/* Expanded: 400px with canvas */
.diagram-module.expanded {
  height: 400px;
}
```

### Modal Open/Close
```css
.diagram-modal {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### Marking Appear
```css
.diagram-marking {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
```

### Tool Selection
```css
.tool-button {
  transition: background-color 0.2s, transform 0.1s;
}

.tool-button:active {
  transform: scale(0.95);
}

.tool-button.selected {
  background-color: #1976d2;
  color: white;
}
```

---

## Performance Optimizations

### Canvas Rendering
```typescript
// Use requestAnimationFrame for smooth drawing
const drawMarkings = () => {
  requestAnimationFrame(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    markings.forEach(marking => {
      drawMarking(ctx, marking);
    });
  });
};

// Throttle mouse move events (60fps max)
const handleMouseMove = throttle((e) => {
  updateCursor(e);
}, 16); // ~60fps
```

### Image Loading
```typescript
// Preload diagrams based on template
useEffect(() => {
  const diagramSrc = getDiagramPath(bodyPart, view);
  const img = new Image();
  img.src = diagramSrc;
  // Cache in browser
}, [bodyPart, view]);
```

### State Management
```typescript
// Debounce auto-save (wait 1s after last change)
const debouncedSave = debounce(() => {
  saveMarkings(state.anatomicalMarkings);
}, 1000);

useEffect(() => {
  if (state.anatomicalMarkings.length > 0) {
    debouncedSave();
  }
}, [state.anatomicalMarkings]);
```

---

## Implementation Checklist

### Phase 1: Core UI Components (Week 1)

- [ ] Create `DiagramInlineModule.tsx` component
- [ ] Compact view layout (400x300 canvas)
- [ ] Tool palette with template-based filtering
- [ ] Color picker (5 colors)
- [ ] Marking list with live updates
- [ ] Canvas interaction (point, circle, arrow)
- [ ] Expand/collapse animation
- [ ] Integration with ReportContentPanel

### Phase 2: Full-Screen Modal (Week 1)

- [ ] Create `DiagramFullScreenModal.tsx`
- [ ] Large canvas (800x600)
- [ ] All drawing tools (point, circle, arrow, freehand, ruler, angle)
- [ ] Zoom controls
- [ ] View switcher (frontal, lateral, axial tabs)
- [ ] Marking editor (edit labels)
- [ ] Save & Close button
- [ ] Keyboard shortcuts

### Phase 3: Auto-Linking & Persistence (Week 2)

- [ ] "Add to Findings" prompt after marking
- [ ] Bidirectional linking (marking ↔ finding)
- [ ] Save markings to backend (POST /api/annotations/batch)
- [ ] Load markings on report open (GET /api/annotations/report/:id)
- [ ] Auto-save on changes (debounced)
- [ ] Conflict resolution (if marking changed externally)

### Phase 4: Template Configuration (Week 2)

- [ ] Update `seedEnhancedTemplatesWithModules.js`
- [ ] Add diagram config to MAMMO-BIRADS-01
- [ ] Add diagram config to MRI-SPINE-01
- [ ] Add diagram config to CT-CHEST-01
- [ ] Test auto-loading from template
- [ ] Test tool filtering based on config

### Phase 5: Polish & Testing (Week 3)

- [ ] Responsive design (desktop, tablet, mobile)
- [ ] Accessibility (keyboard nav, screen readers)
- [ ] Animations (expand/collapse, modal, markings)
- [ ] Error handling (diagram load fail, save fail)
- [ ] Loading states (skeleton, spinners)
- [ ] Empty states ("No markings yet")
- [ ] User testing with radiologists
- [ ] Bug fixes and refinements

---

## Success Metrics

### User Experience
- ✅ **Time to First Mark**: <30 seconds from report open
- ✅ **Clicks to Mark**: ≤2 clicks (open modal → mark)
- ✅ **Mark Accuracy**: Visual feedback confirms placement
- ✅ **Workflow Disruption**: Minimal (inline view)

### Technical
- ✅ **Load Time**: Diagram appears <500ms
- ✅ **Render Performance**: 60fps drawing on canvas
- ✅ **Save Latency**: <200ms to persist markings
- ✅ **Mobile Usability**: Full-screen on tablets works smoothly

### Clinical
- ✅ **Adoption Rate**: >70% of reports use diagrams when available
- ✅ **Completeness**: Reports with diagrams have fewer missing locations
- ✅ **Consistency**: Standardized anatomical terminology

---

## Mockup: Final Design

```
╔═══════════════════════════════════════════════════════════════════╗
║ Report Content                                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║ 🎯 Specialized Assessment Tools                                   ║
║ ───────────────────────────────────────────────────────────────── ║
║                                                                   ║
║ ╔═══════════════════════════════════════════════════════════╗     ║
║ ║ 📍 Breast Localization Diagram        [?] [↕️] [↗️] [×]  ║     ║
║ ╟───────────────────────────────────────────────────────────╢     ║
║ ║ ┌─────────────────────┬─────────────────────────────────┐ ║     ║
║ ║ │                     │ 🖱️ Tools:                      │ ║     ║
║ ║ │                     │ ● Point ○ Circle ○ Arrow       │ ║     ║
║ ║ │                     │ ───────────────────────────────│ ║     ║
║ ║ │     CHEST           │ 🎨 Color:                      │ ║     ║
║ ║ │     DIAGRAM         │ ● Red ○ Green ○ Blue          │ ║     ║
║ ║ │    (400x300)        │ ───────────────────────────────│ ║     ║
║ ║ │                     │ 📝 Markings (2):               │ ║     ║
║ ║ │    [Red Point]      │ 1. [🔴] Lesion 2 o'clock  [×] │ ║     ║
║ ║ │    [Blue Circle]    │ 2. [🔵] Mass Ø12mm        [×] │ ║     ║
║ ║ │                     │ ───────────────────────────────│ ║     ║
║ ║ └─────────────────────┴─────────────────────────────────┘ ║     ║
║ ║ ℹ️ Click diagram to mark lesion, double-click for full screen ║     ║
║ ╚═══════════════════════════════════════════════════════════╝     ║
║                                                                   ║
║ ╔═══════════════════════════════════════════════════════════╗     ║
║ ║ 🧮 BI-RADS Calculator                                 *   ║     ║
║ ╟───────────────────────────────────────────────────────────╢     ║
║ ║ Mass Characteristics: ⦿ Irregular shape [2]              ║     ║
║ ║ Calcifications: ⦿ Benign [1]                             ║     ║
║ ║ Assessment: 🟨 BI-RADS 3 - Probably benign               ║     ║
║ ╚═══════════════════════════════════════════════════════════╝     ║
║                                                                   ║
║ ╔═══════════════════════════════════════════════════════════╗     ║
║ ║ 📏 Lesion Measurements                                    ║     ║
║ ╟───────────────────────────────────────────────────────────╢     ║
║ ║ Quick: [Mass AP][Transverse]                              ║     ║
║ ║ | Label   | Value | Unit | Notes |                        ║     ║
║ ║ | Mass AP | 12.5  | mm   |       | [×]                    ║     ║
║ ║ [+ Add Measurement]                                        ║     ║
║ ╚═══════════════════════════════════════════════════════════╝     ║
║                                                                   ║
║ ──────────────────────────────────────────────────────────────── ║
║                                                                   ║
║ Clinical History                                                  ║
║ ┌─────────────────────────────────────────────────────────────┐   ║
║ │ Screening mammography                                       │   ║
║ └─────────────────────────────────────────────────────────────┘   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Summary

**UI/UX Approach:** Hybrid Inline + Modal  
**Default State:** Compact inline (400x300)  
**Expanded State:** Full-screen modal (800x600)  
**Context-Aware:** Tools filtered by template  
**Auto-Configured:** Diagram loads from template  
**Persistent:** Markings auto-save and restore  

**Timeline:** 3 weeks (Week 1: Core UI, Week 2: Persistence, Week 3: Polish)  
**Complexity:** Medium (reuses existing infrastructure)  
**Impact:** High (major UX improvement)  

**Ready to implement when approved!** 🚀
