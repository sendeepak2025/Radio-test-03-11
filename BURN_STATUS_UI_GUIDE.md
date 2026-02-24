# Burn Status UI Guide

## Overview

The new Burn Status Panel provides real-time tracking of CD/DVD burn operations with the ability to monitor progress and cancel ongoing burns.

## Features

### 1. Real-Time Progress Tracking
- Shows current status (Preparing, Burning, Completed, Failed, Cancelled)
- Progress bar with percentage
- Elapsed time counter
- Estimated time remaining

### 2. Multiple Task Management
- Track multiple burn operations simultaneously
- Separate sections for active and completed tasks
- Clear visual indicators for each status

### 3. Cancel Functionality
- Cancel button for active burns
- Immediate abort of ongoing operation
- Cleanup of resources

### 4. Minimize/Expand
- Minimize panel to save screen space
- Shows count of active burns when minimized
- Quick expand to see details

### 5. Task History
- Keep completed/failed tasks visible
- Dismiss individual tasks
- Clear all completed tasks at once

## UI Components

### Status Panel Location
```
Fixed position: Bottom-right corner
Size: 384px wide (w-96)
Z-index: 50 (above most content)
```

### Status Icons

| Status | Icon | Color |
|--------|------|-------|
| Preparing | Spinning loader | Blue |
| Burning | Pulsing disc | Orange |
| Completed | Check circle | Green |
| Failed | X circle | Red |
| Cancelled | Alert circle | Gray |

### Progress Indicators

**Active Task:**
```
┌─────────────────────────────────────┐
│ 🔄 Patient 316106                   │ ✕
│ Burning to disc...                  │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50%          │
│ Elapsed: 2:34        Est. 5-10 min │
└─────────────────────────────────────┘
```

**Completed Task:**
```
┌─────────────────────────────────────┐
│ ✓ Study ABC123                      │ ✕
│ Burn completed successfully         │
│ Duration: 5:23                      │
└─────────────────────────────────────┘
```

## User Interactions

### Starting a Burn

1. Click "Export" on patient/study
2. Select "Direct CD Burn"
3. Click "Burn to CD/DVD"
4. Dialog closes
5. Burn Status Panel appears
6. Shows progress in real-time

### Cancelling a Burn

1. Click ✕ button on active task
2. Confirmation (optional)
3. Task status changes to "Cancelled"
4. Resources cleaned up
5. Can start new burn

### Dismissing Completed Tasks

1. Click ✕ button on completed task
2. Task removed from panel
3. Or click "Clear All" to remove all completed

### Minimizing Panel

1. Click ▼ button in header
2. Panel collapses to show only header
3. Shows count: "2 active"
4. Click ▲ to expand again

## Status Flow

```
User clicks "Burn"
        ↓
    PREPARING (0%)
    "Preparing export..."
        ↓
    BURNING (25-99%)
    "Burning to disc..."
        ↓
    ┌─────────┬──────────┐
    ↓         ↓          ↓
COMPLETED  FAILED   CANCELLED
  (100%)    (0%)      (0%)
```

## Example Scenarios

### Scenario 1: Successful Burn

```
1. Start burn
   Status: PREPARING (0%)
   Message: "Preparing export..."
   Time: 0:00

2. Files ready
   Status: BURNING (25%)
   Message: "Burning to disc..."
   Time: 0:15

3. Burning in progress
   Status: BURNING (75%)
   Message: "Burning to disc..."
   Time: 3:45

4. Complete
   Status: COMPLETED (100%)
   Message: "Burn completed successfully"
   Duration: 5:23
```

### Scenario 2: User Cancels

```
1. Start burn
   Status: BURNING (45%)
   Time: 2:10

2. User clicks ✕
   Status: CANCELLED (0%)
   Message: "Cancelled by user"
   Duration: 2:10

3. Resources cleaned up
   Can start new burn immediately
```

### Scenario 3: Burn Fails

```
1. Start burn
   Status: BURNING (60%)
   Time: 3:20

2. Error occurs (disc full, drive error, etc.)
   Status: FAILED (0%)
   Message: "Disc is full or finalized"
   Duration: 3:20

3. User can:
   - Dismiss task
   - Try again with different disc
```

### Scenario 4: Multiple Burns

```
User A: Burn Study 1
  Status: BURNING (30%)
  Time: 1:45

User A: Burn Study 2
  Status: PREPARING (0%)
  Message: "Waiting for previous burn..."

User B: Burn Study 3
  Status: BURNING (50%)
  Time: 2:30
  (Different user, runs in parallel)
```

## Technical Details

### State Management

```typescript
interface BurnTask {
  id: string;                    // Unique task ID
  targetType: 'patient' | 'study';
  targetId: string;
  targetName?: string;           // Display name
  status: 'preparing' | 'burning' | 'completed' | 'failed' | 'cancelled';
  progress: number;              // 0-100
  message: string;               // Status message
  startTime: number;             // Timestamp
  endTime?: number;              // Timestamp when done
  error?: string;                // Error message if failed
  abortController?: AbortController; // For cancellation
}
```

### Progress Updates

```typescript
// Initial state
{ status: 'preparing', progress: 0, message: 'Preparing export...' }

// Burning started
{ status: 'burning', progress: 25, message: 'Burning to disc...' }

// Completed
{ status: 'completed', progress: 100, message: 'Burn completed successfully', endTime: Date.now() }
```

### Cancellation

```typescript
// User clicks cancel
handleCancelBurn(taskId) {
  // Abort HTTP request
  task.abortController?.abort();
  
  // Update status
  setBurnTasks(prev => prev.map(t => 
    t.id === taskId 
      ? { ...t, status: 'cancelled', endTime: Date.now() }
      : t
  ));
}
```

## Styling

### Colors

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Preparing | Blue | `bg-blue-50 border-blue-200` |
| Burning | Orange | `bg-orange-50 border-orange-200` |
| Completed | Green | `bg-green-50 border-green-200` |
| Failed | Red | `bg-red-50 border-red-200` |
| Cancelled | Gray | `bg-gray-50 border-gray-200` |

### Animations

- **Spinning loader**: `animate-spin` (preparing)
- **Pulsing disc**: `animate-pulse` (burning)
- **Progress bar**: `transition-all duration-300` (smooth)

## Accessibility

- **Keyboard navigation**: Tab through buttons
- **Screen readers**: Status announcements
- **Color contrast**: WCAG AA compliant
- **Focus indicators**: Visible focus rings

## Mobile Responsiveness

```css
/* Desktop */
width: 384px (w-96)
position: fixed bottom-6 right-6

/* Tablet */
width: 320px
position: fixed bottom-4 right-4

/* Mobile */
width: calc(100vw - 32px)
position: fixed bottom-2 right-2
```

## Best Practices

### For Users:
1. **Monitor progress** - Watch the panel for status updates
2. **Don't close browser** - Keep page open during burn
3. **Cancel if needed** - Use ✕ button to stop
4. **Clear completed** - Keep panel tidy

### For Developers:
1. **Update progress** - Keep users informed
2. **Handle errors** - Show clear error messages
3. **Cleanup resources** - Always cleanup on complete/cancel
4. **Test cancellation** - Ensure proper abort handling

## Future Enhancements

Planned features:
- [ ] Sound notification on completion
- [ ] Desktop notification support
- [ ] Burn queue management
- [ ] Retry failed burns
- [ ] Export burn history
- [ ] Batch burn operations

## Troubleshooting

### Panel Not Showing

**Check:**
- Is burn operation started?
- Is `burnTasks` array populated?
- Check browser console for errors

### Cancel Not Working

**Check:**
- Is AbortController supported?
- Is backend handling abort signal?
- Check network tab for cancelled requests

### Progress Not Updating

**Check:**
- Is state being updated?
- Are progress values correct (0-100)?
- Check React DevTools

## Summary

The Burn Status Panel provides:
- ✅ Real-time progress tracking
- ✅ Multiple task management
- ✅ Cancel functionality
- ✅ Task history
- ✅ Minimize/expand
- ✅ Clear visual feedback
- ✅ Professional UI/UX

Users can now monitor and control burn operations with full visibility and control!
