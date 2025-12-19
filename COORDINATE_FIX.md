# Coordinate Calculation Fix

## Problem (समस्या)

### Issue 1: Wrong Coordinate Calculation ❌
```typescript
// BEFORE - Confusing and wrong!
const x = (e.clientX - rect.left) / (rect.width / (canvas.width / dpr))
const y = (e.clientY - rect.top) / (rect.height / (canvas.height / dpr))

const imageX = (x - pan.x) / zoom
const imageY = (y - pan.y) / zoom

// Problems:
// 1. Complex nested division - hard to understand
// 2. Wrong transformation - doesn't match draw logic
// 3. Doesn't account for image centering
```

### Issue 2: Debug Console Log
```typescript
// Spamming console
console.log('[MEDICALVIEWERPAGE] Coords:', {...})
```

## Root Cause (मूल कारण)

The coordinate transformation didn't match how the image is drawn:

```typescript
// In draw function:
const dx = vw / 2 - drawW / 2 + pan.x  // Image position
const dy = vh / 2 - drawH / 2 + pan.y

// But mouse handler was using wrong formula!
```

## Solution (समाधान)

### Correct Coordinate Transformation ✅

```typescript
// AFTER - Clear and correct!

// 1. Get mouse position in canvas coordinates
const canvasX = e.clientX - rect.left
const canvasY = e.clientY - rect.top

// 2. Calculate image offset (where image center is)
const vw = rect.width
const vh = rect.height
const dx = vw / 2 + pan.x  // Center + pan
const dy = vh / 2 + pan.y

// 3. Convert to image coordinates
const imageX = (canvasX - dx) / zoom
const imageY = (canvasY - dy) / zoom
```

### Why This Works

```
Canvas Coordinates → Image Coordinates

Step 1: Get mouse position relative to canvas
  canvasX = mouseX - canvasLeft

Step 2: Subtract image offset (where image center is)
  offsetX = canvasX - (canvasWidth/2 + pan.x)

Step 3: Divide by zoom to get image pixel
  imageX = offsetX / zoom

Combined:
  imageX = (canvasX - vw/2 - pan.x) / zoom
```

## Changes Made (किए गए परिवर्तन)

### 1. Fixed Mouse Down Handler ✅
```typescript
// Before
const x = (e.clientX - rect.left) / (rect.width / (canvas.width / dpr))
const imageX = (x - pan.x) / zoom

// After
const canvasX = e.clientX - rect.left
const dx = vw / 2 + pan.x
const imageX = (canvasX - dx) / zoom
```

### 2. Fixed Mouse Move Handler ✅
```typescript
// Same fix applied to mouse move
const canvasX = e.clientX - rect.left
const canvasY = e.clientY - rect.top

const vw = rect.width
const vh = rect.height
const dx = vw / 2 + pan.x
const dy = vh / 2 + pan.y

const imageX = (canvasX - dx) / zoom
const imageY = (canvasY - dy) / zoom
```

### 3. Fixed Mouse Up Handler ✅
```typescript
// Same fix applied to mouse up
```

### 4. Fixed Pan Tool ✅
```typescript
// Before - using undefined x, y
dragOffsetRef.current = { x, y }

// After - using canvasX, canvasY
dragOffsetRef.current = { x: canvasX, y: canvasY }
```

### 5. Removed Debug Log ✅
```typescript
// Removed console.log from MPR viewer
```

## Testing (परीक्षण)

### Test Scenarios

1. **Click on Image**
   ```
   Click center of image
   Expected: Annotation at center
   ```

2. **Pan and Click**
   ```
   Pan image, then click
   Expected: Annotation at correct position
   ```

3. **Zoom and Click**
   ```
   Zoom in, then click
   Expected: Annotation at correct position
   ```

4. **Pan Tool**
   ```
   Select pan tool, drag image
   Expected: Smooth panning
   ```

5. **Draw Annotation**
   ```
   Draw line/rect/circle
   Expected: Annotation follows mouse exactly
   ```

## Coordinate System Diagram

```
Canvas (0,0) ────────────────────► X
│
│     ┌─────────────────┐
│     │                 │
│     │   Image Center  │ ← (vw/2 + pan.x, vh/2 + pan.y)
│     │        •        │
│     │                 │
│     └─────────────────┘
│
▼ Y

Mouse Click at (mx, my)
↓
Canvas Coords: (mx - rect.left, my - rect.top)
↓
Relative to Image Center: (canvasX - dx, canvasY - dy)
↓
Image Pixel: ((canvasX - dx) / zoom, (canvasY - dy) / zoom)
```

## Common Coordinate Issues (सामान्य समस्याएं)

### ❌ Issue 1: Not Accounting for Pan
```typescript
// Wrong!
const imageX = canvasX / zoom
```

### ✅ Fix: Subtract pan offset
```typescript
// Correct!
const imageX = (canvasX - vw/2 - pan.x) / zoom
```

### ❌ Issue 2: Not Accounting for Zoom
```typescript
// Wrong!
const imageX = canvasX - dx
```

### ✅ Fix: Divide by zoom
```typescript
// Correct!
const imageX = (canvasX - dx) / zoom
```

### ❌ Issue 3: Not Centering Image
```typescript
// Wrong! Assumes image at (0,0)
const imageX = (canvasX - pan.x) / zoom
```

### ✅ Fix: Account for centering
```typescript
// Correct! Image centered at vw/2
const dx = vw / 2 + pan.x
const imageX = (canvasX - dx) / zoom
```

## Result (परिणाम)

✅ **Coordinates now correct!**
- Annotations appear at mouse position
- Pan tool works smoothly
- Zoom doesn't affect accuracy
- No console spam

## Files Modified

- `viewer/src/components/viewer/MedicalImageViewer.tsx`
  - Fixed coordinate calculation in mouse down
  - Fixed coordinate calculation in mouse move
  - Fixed coordinate calculation in mouse up
  - Fixed pan tool to use canvas coordinates
  - Removed debug console.log

**Test it - annotations should now appear exactly where you click!** 🎯
