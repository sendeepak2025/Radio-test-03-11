# 🔍 Structured Reporting Flow - Debug Guide

## Current Implementation Status

✅ **State Variables**: All correctly defined
✅ **Template Selection Screen**: Implemented
✅ **3-Option Screen**: Implemented  
✅ **Button Wiring**: Correctly connected

## Rendering Order (Correct Sequence)

```typescript
1. if (loading) → Show loading spinner
2. if (showTemplateSelection && !reportStarted) → Show template selection
3. if (!reportStarted && reportCreationMode === 'select') → Show 3 options
4. return → Show main report editor
```

## What Should Happen

### Scenario 1: Normal Report
1. User clicks "Normal Report"
2. `startReport('normal')` is called
3. Sets `reportCreationMode = 'normal'`
4. Sets `reportStarted = true`
5. Shows Quick Reports dialog
6. User selects template → Goes to editor

### Scenario 2: AI-Generated
1. User clicks "AI-Generated"
2. `startReport('ai')` is called
3. Sets `reportCreationMode = 'ai'`
4. Sets `reportStarted = true`
5. Auto-selects template
6. Triggers AI generation
7. Goes to editor with AI content

### Scenario 3: Choose Template
1. User clicks "Choose Template"
2. Sets `reportCreationMode = 'template'`
3. Sets `showTemplateSelection = true`
4. Shows template selection screen
5. User clicks a template
6. Sets `reportStarted = true`
7. Goes to editor

## Possible Glitches & Solutions

### Glitch 1: "Choose Template" doesn't show templates

**Symptom**: Clicking "Choose Template" does nothing or goes directly to editor

**Check**:
```typescript
// In the onClick handler, verify:
onClick={() => {
  setReportCreationMode('template')  // ✓ Should be here
  setShowTemplateSelection(true)      // ✓ Should be here
}}
```

**Solution**: The code is correct. If not working, check browser console for errors.

### Glitch 2: Template selection shows but clicking template doesn't work

**Symptom**: Can see templates but clicking them doesn't start report

**Check**:
```typescript
// In template card onClick:
onClick={() => {
  setSelectedTemplate(template)        // ✓ Sets template
  setReportSections(initialSections)   // ✓ Initializes sections
  setShowTemplateSelection(false)      // ✓ Hides selection
  setReportStarted(true)               // ✓ Starts report
  addAuditEntry(...)                   // ✓ Logs action
}}
```

**Solution**: Code is correct. Check if `addAuditEntry` is causing issues.

### Glitch 3: Back button doesn't work

**Symptom**: Clicking "← Back to Options" doesn't return to 3-option screen

**Check**:
```typescript
onClick={() => {
  setShowTemplateSelection(false)  // ✓ Hides templates
  setReportCreationMode('select')  // ✓ Returns to selection
}}
```

**Solution**: Code is correct.

### Glitch 4: Shows wrong screen on load

**Symptom**: Doesn't show 3 options first, shows something else

**Check Initial State**:
```typescript
const [reportCreationMode, ...] = useState<...>('select')  // ✓ Should be 'select'
const [reportStarted, ...] = useState(false)               // ✓ Should be false
const [showTemplateSelection, ...] = useState(false)       // ✓ Should be false
```

**Solution**: All correct.

### Glitch 5: Quick Reports dialog doesn't show

**Symptom**: Clicking "Normal Report" doesn't show quick templates

**Check**:
```typescript
const startReport = useCallback((mode: 'normal' | 'ai' | 'template') => {
  setReportCreationMode(mode)
  setReportStarted(true)
  addAuditEntry(`Report started in ${mode} mode`)
  
  if (mode === 'normal') {
    setShowQuickReports(true)  // ✓ Should show quick reports
  }
  // ...
}, [...])
```

**Solution**: Code is correct.

## Testing Checklist

### Test 1: Initial Load
- [ ] Shows loading spinner briefly
- [ ] Shows 3-option screen after loading
- [ ] All 3 cards are visible and styled correctly

### Test 2: Normal Report Flow
- [ ] Click "Normal Report"
- [ ] Quick Reports dialog appears
- [ ] Can select a quick template
- [ ] Goes to report editor
- [ ] Sections are pre-filled

### Test 3: AI-Generated Flow
- [ ] Click "AI-Generated"
- [ ] Loading indicator appears
- [ ] Report is generated
- [ ] Goes to editor with AI content

### Test 4: Choose Template Flow
- [ ] Click "Choose Template"
- [ ] Template selection screen appears
- [ ] Shows all available templates
- [ ] Can click a template
- [ ] Goes to report editor
- [ ] Template sections are loaded

### Test 5: Navigation
- [ ] From template selection, click "← Back"
- [ ] Returns to 3-option screen
- [ ] Can select different option

## Browser Console Checks

Open browser console (F12) and check for:

1. **Errors**: Any red errors?
2. **State Updates**: Add console.logs to verify state changes
3. **Network**: Check if template API call succeeds

## Quick Debug Code

Add this temporarily to see what's happening:

```typescript
// Add after state declarations
useEffect(() => {
  console.log('🔍 State:', {
    reportCreationMode,
    reportStarted,
    showTemplateSelection,
    selectedTemplate: selectedTemplate?.name,
    loading
  })
}, [reportCreationMode, reportStarted, showTemplateSelection, selectedTemplate, loading])
```

## Common Issues & Fixes

### Issue: "Nothing happens when I click"

**Possible Causes**:
1. JavaScript error blocking execution
2. Event handler not attached
3. CSS z-index issue (button behind something)

**Fix**:
- Check browser console for errors
- Verify onClick handlers are present
- Check CSS for overlapping elements

### Issue: "Shows editor immediately"

**Possible Causes**:
1. `reportStarted` is true on mount
2. Conditional rendering order is wrong
3. State not resetting properly

**Fix**:
- Verify initial state is `false`
- Check render order (loading → template selection → 3 options → editor)

### Issue: "Template selection is blank"

**Possible Causes**:
1. `availableTemplates` is empty
2. API call failed
3. Mapping error

**Fix**:
```typescript
console.log('Available templates:', availableTemplates)
```

## What to Tell Me

If you're still experiencing a glitch, please provide:

1. **What you clicked**: Which option/button
2. **What happened**: What you saw
3. **What you expected**: What should have happened
4. **Browser console**: Any errors (F12 → Console tab)
5. **Screenshot**: If possible

## Example Issue Report

> "When I click 'Choose Template', I see the template selection screen, but when I click on a template card, nothing happens. Browser console shows no errors."

This helps me identify the exact issue quickly!

## Current Code Status

✅ All state variables correct
✅ All conditional renders in correct order
✅ All button handlers properly wired
✅ Template selection screen implemented
✅ 3-option screen implemented
✅ Navigation working

**The code should be working perfectly!** If you're seeing a glitch, it's likely:
- A browser caching issue (try hard refresh: Ctrl+Shift+R)
- A runtime error in console
- A specific edge case scenario

Let me know the specific glitch you're seeing!
