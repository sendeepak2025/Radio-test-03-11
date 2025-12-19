# Medical Image Viewer - Performance Optimization

## Problem (समस्या)
Viewer में बहुत ज्यादा lag हो रहा था क्योंकि:
1. **Har mouse move pe full redraw** - हर cursor movement पर पूरा canvas फिर से draw हो रहा था
2. **Unnecessary re-renders** - cursorPos हर बार state update कर रहा था
3. **No throttling** - Mouse events throttle नहीं थे
4. **Canvas resize har frame** - Canvas हर draw पर resize हो रहा था

## Solutions Applied (लागू किए गए समाधान)

### 1. RequestAnimationFrame Throttling
```typescript
// Mouse move को throttle किया
const mouseMoveRafRef = useRef<number | null>(null)

const handleCanvasMouseMove = useCallback((e) => {
  if (mouseMoveRafRef.current) return // Already scheduled
  
  mouseMoveRafRef.current = requestAnimationFrame(() => {
    mouseMoveRafRef.current = null
    // Process mouse move
  })
}, [dependencies])
```

**Benefit**: Mouse events अब 60fps से ज्यादा नहीं fire होंगे

### 2. Conditional Canvas Resize
```typescript
// Only resize if dimensions actually changed
const needsResize = canvas.width !== Math.floor(vw * dpr) || 
                    canvas.height !== Math.floor(vh * dpr)
if (needsResize) {
  canvas.width = Math.floor(vw * dpr)
  canvas.height = Math.floor(vh * dpr)
}
```

**Benefit**: Unnecessary canvas clears और memory allocations नहीं होंगे

### 3. Optimized Draw Dependencies
```typescript
// Removed cursorPos from draw dependencies
// Cursor drawing अब separate function में है
const drawCursor = useCallback(() => {
  // Only draws cursor overlay
}, [cursorPos, tool])
```

**Benefit**: Cursor move करने पर पूरा canvas redraw नहीं होगा

### 4. Scheduled Draw with RAF
```typescript
useEffect(() => {
  let rafId: number | null = null
  
  const scheduleDraw = () => {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      draw()
      rafId = null
    })
  }
  
  scheduleDraw()
  // ...
}, [draw])
```

**Benefit**: Multiple rapid changes एक ही frame में batch होंगे

### 5. Cursor Position Conditional Update
```typescript
// Only update cursor position for drawing tools
if (tool !== "pan" && tool !== "zoom" && tool !== "wl") {
  setCursorPos({ x, y })
}
```

**Benefit**: Pan/zoom करते समय unnecessary state updates नहीं होंगे

## Performance Improvements (प्रदर्शन सुधार)

### Before (पहले):
- ❌ Mouse move: ~200-300 events/second → Full redraws
- ❌ Canvas resize: Every frame
- ❌ State updates: Unthrottled
- ❌ Draw calls: 60+ per second during interaction

### After (बाद में):
- ✅ Mouse move: Max 60 events/second (RAF throttled)
- ✅ Canvas resize: Only when dimensions change
- ✅ State updates: Throttled and conditional
- ✅ Draw calls: Optimized and batched

## Expected Results (अपेक्षित परिणाम)

1. **Smooth panning/zooming** - कोई lag नहीं
2. **Responsive drawing tools** - Instant feedback
3. **Lower CPU usage** - 50-70% reduction
4. **Better frame rate** - Consistent 60fps
5. **Reduced memory churn** - Less GC pressure

## Testing Checklist (परीक्षण सूची)

- [ ] Pan करते समय smooth movement
- [ ] Zoom करते समय no lag
- [ ] Drawing tools responsive हैं
- [ ] Annotations draw करते समय smooth preview
- [ ] Multiple annotations के साथ performance अच्छा है
- [ ] Browser console में कोई errors नहीं
- [ ] CPU usage reasonable है (DevTools Performance tab)

## Additional Optimizations (अतिरिक्त अनुकूलन)

अगर अभी भी lag है तो:

1. **Annotation rendering को optimize करें**:
   - Visible annotations only draw करें
   - Annotation complexity reduce करें

2. **Image caching improve करें**:
   - LRU cache implement करें
   - Preload adjacent frames

3. **WebGL rendering use करें**:
   - Large images के लिए
   - Complex transformations के लिए

4. **Web Workers use करें**:
   - Image processing के लिए
   - Annotation calculations के लिए
