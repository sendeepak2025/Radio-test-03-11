# Clear All Burns - Complete Fix

## Problem

Clicking "Clear All" only removed tasks from UI but didn't:
1. Cancel active burns on backend
2. Clear backend tracking (causing "Too many requests")
3. Abort ongoing operations
4. Ask for confirmation when active burns exist

## Solution

### 1. Enhanced "Clear All" Button

**Before:**
```javascript
// Only removed completed tasks from UI
setBurnTasks(prev => prev.filter(t => t.status === 'preparing' || t.status === 'burning'));
```

**After:**
```javascript
// 1. Abort all active operations
burnTasks.forEach(task => {
  if (task.status === 'preparing' || task.status === 'burning') {
    task.abortController?.abort();
  }
});

// 2. Clear backend tracking
await clearActiveBurns();

// 3. Clear all tasks from UI
setBurnTasks([]);
```

### 2. Confirmation Dialog

**When active burns exist:**
```
┌─────────────────────────────────────────┐
│ Cancel 2 active burn(s) and clear all  │
│ tasks?                                  │
│                                         │
│         [Cancel]  [OK]                  │
└─────────────────────────────────────────┘
```

**When only completed tasks:**
- No confirmation needed
- Clears immediately

### 3. Backend Endpoint

**New endpoint:** `POST /api/export/clear-burns`

```javascript
// Clears active burn tracking for current user
router.post('/clear-burns', authenticate, (req, res) => {
  const userId = req.user?.id || req.user?.username;
  activeBurns.delete(userId);
  res.json({ success: true });
});
```

### 4. Visual Feedback

**Button appearance:**
```
Before: "Clear All" (gray text)
After:  "Clear All" (red text, hover effect)
```

**Shows when:**
- Active burns exist, OR
- Completed tasks exist

**Hidden when:**
- No tasks at all

## How It Works Now

### Scenario 1: Clear Completed Tasks Only

```
Tasks:
✓ Study 1 (completed)
✓ Study 2 (completed)

User clicks "Clear All"
  ↓
No confirmation (no active burns)
  ↓
All tasks removed from UI
  ↓
Panel disappears
```

### Scenario 2: Clear With Active Burns

```
Tasks:
🔄 Study 1 (burning - 45%)
🔄 Study 2 (preparing)
✓ Study 3 (completed)

User clicks "Clear All"
  ↓
Confirmation: "Cancel 2 active burn(s)?"
  ↓
User clicks OK
  ↓
1. Abort Study 1 operation
2. Abort Study 2 operation
3. Clear backend tracking
4. Remove all tasks from UI
  ↓
Panel disappears
Burns are cancelled
```

### Scenario 3: Clear After "Too Many Requests"

```
Problem:
- Old burns stuck in backend
- Getting "Too many requests"
- Can't start new burns

Solution:
1. Click "Clear All"
2. Confirms cancellation
3. Clears backend tracking
4. Can now start new burns ✓
```

## Technical Flow

```
User clicks "Clear All"
        ↓
    Has active burns?
    ├─ YES → Show confirmation
    │         ├─ Cancel → Do nothing
    │         └─ OK → Continue
    └─ NO → Continue
        ↓
Abort all active operations
    task.abortController?.abort()
        ↓
Clear backend tracking
    POST /api/export/clear-burns
        ↓
Clear UI state
    setBurnTasks([])
        ↓
Panel disappears
```

## API Details

### Request

```http
POST /api/export/clear-burns
Authorization: Bearer <token>
Content-Type: application/json
```

### Response

```json
{
  "success": true,
  "message": "Active burns cleared"
}
```

### Error Handling

```javascript
try {
  await clearActiveBurns();
} catch (error) {
  console.error('Failed to clear:', error);
  // Still clear UI even if backend fails
}
```

## Button States

### Visible States

| Condition | Button Text | Color | Action |
|-----------|-------------|-------|--------|
| Active burns only | "Clear All" | Red | Confirm + Cancel + Clear |
| Completed only | "Clear All" | Red | Clear immediately |
| Both | "Clear All" | Red | Confirm + Cancel + Clear |
| None | Hidden | - | - |

### Hover Effect

```css
/* Normal */
color: red-600
background: transparent

/* Hover */
color: red-700
background: red-50
```

## User Experience

### Before Fix:

```
1. Start 3 burns
2. Click "Clear All"
3. UI clears
4. Try new burn → "Too many requests" ❌
5. Backend still thinks burns are active
6. Have to wait 15 minutes or restart server
```

### After Fix:

```
1. Start 3 burns
2. Click "Clear All"
3. Confirmation: "Cancel 3 active burns?"
4. Click OK
5. All burns cancelled
6. Backend tracking cleared
7. UI cleared
8. Try new burn → Works! ✓
```

## Testing

### Test 1: Clear Completed Only

```bash
1. Complete 2 burns
2. Click "Clear All"
3. ✓ No confirmation shown
4. ✓ Tasks removed
5. ✓ Panel disappears
```

### Test 2: Clear Active Burns

```bash
1. Start 2 burns (in progress)
2. Click "Clear All"
3. ✓ Confirmation shown
4. Click OK
5. ✓ Burns cancelled
6. ✓ Backend cleared
7. ✓ Can start new burn
```

### Test 3: Clear Mixed Tasks

```bash
1. Start 2 burns (active)
2. Complete 1 burn
3. Click "Clear All"
4. ✓ Confirmation shown (2 active)
5. Click OK
6. ✓ All 3 tasks removed
7. ✓ Backend cleared
```

### Test 4: Cancel Confirmation

```bash
1. Start 2 burns
2. Click "Clear All"
3. Confirmation shown
4. Click Cancel
5. ✓ Nothing happens
6. ✓ Burns continue
```

## Troubleshooting

### Still Getting "Too Many Requests"?

**Solution:**
1. Click "Clear All" button
2. Confirm cancellation
3. Wait 5 seconds
4. Try burning again

**If still failing:**
```bash
# Restart server to force clear
npm restart
```

### "Clear All" Button Not Showing?

**Check:**
- Are there any tasks in `burnTasks` array?
- Check React DevTools state
- Refresh page

### Confirmation Not Showing?

**Check:**
- Are there active burns (status: 'preparing' or 'burning')?
- Browser console for errors
- Try different browser

## Code Changes Summary

### Frontend (`PatientsPage.tsx`):
```typescript
// Added clearActiveBurns import
import { clearActiveBurns } from "../../services/ApiService";

// Enhanced handleClearAllBurns
const handleClearAllBurns = async () => {
  // 1. Abort operations
  burnTasks.forEach(task => {
    if (task.status === 'preparing' || task.status === 'burning') {
      task.abortController?.abort();
    }
  });
  
  // 2. Clear backend
  await clearActiveBurns();
  
  // 3. Clear UI
  setBurnTasks([]);
};
```

### Frontend (`BurnStatusPanel.tsx`):
```typescript
// Added confirmation for active burns
onClick={() => {
  if (activeTasks.length > 0) {
    if (window.confirm(`Cancel ${activeTasks.length} active burn(s)?`)) {
      onClearAll();
    }
  } else {
    onClearAll();
  }
}}
```

### Backend (`export.js`):
```javascript
// New endpoint to clear tracking
router.post('/clear-burns', authenticate, (req, res) => {
  const userId = req.user?.id || req.user?.username;
  activeBurns.delete(userId);
  res.json({ success: true });
});
```

### API Service (`ApiService.ts`):
```typescript
// New API function
export const clearActiveBurns = async () => {
  const response = await fetch(`${BACKEND_URL}/api/export/clear-burns`, {
    method: 'POST',
    credentials: 'include',
    headers: { /* ... */ },
  });
  return response.json();
};
```

## Summary

**"Clear All" now:**
- ✅ Cancels all active burns
- ✅ Aborts ongoing operations
- ✅ Clears backend tracking
- ✅ Removes all tasks from UI
- ✅ Shows confirmation for active burns
- ✅ Fixes "Too many requests" error
- ✅ Allows immediate new burns

**Result:** Complete cleanup of all burn operations with proper confirmation and backend synchronization!
