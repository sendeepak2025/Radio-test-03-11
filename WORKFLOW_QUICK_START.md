# Workflow Integration - Quick Start

## 🚀 Get Everything Connected in 5 Minutes

This guide helps you quickly connect Patients → Worklist → Viewer → Reporting → Follow-ups → Billing.

---

## ✅ What You Already Have

Your system already includes:
- ✅ Patients page (`/patients`)
- ✅ Worklist page (`/worklist`)
- ✅ Viewer page (`/viewer/:studyUID`)
- ✅ Reporting page (`/reporting`)
- ✅ Follow-ups page (`/followups`)
- ✅ Billing page (`/billing`)
- ✅ All backend APIs working

---

## 🎯 What We're Adding

**New Components Created**:
1. `WorkflowNavigation` - Smart navigation suggestions
2. `WorkflowContext` - Shared workflow state
3. `QuickActions` - Floating action button
4. `WorkflowStatusWidget` - Dashboard overview

**New Documentation**:
1. `UNIFIED_WORKFLOW_GUIDE.md` - Complete user guide
2. `WORKFLOW_INTEGRATION_IMPLEMENTATION.md` - Technical guide
3. `WORKFLOW_QUICK_START.md` - This file

---

## 📝 Implementation Steps

### Step 1: Add Workflow Context (2 minutes)

Edit `viewer/src/App.tsx`:

```tsx
// Add this import at the top
import { WorkflowProvider } from './contexts/WorkflowContext';

// Wrap your app content
function App() {
  return (
    <>
      <Helmet>...</Helmet>
      <CssBaseline />
      
      {/* ADD THIS WRAPPER */}
      <WorkflowProvider>
        <React.Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* All your existing routes */}
          </Routes>
        </React.Suspense>
      </WorkflowProvider>
      {/* END WRAPPER */}
    </>
  );
}
```

### Step 2: Add Navigation to Dashboard (1 minute)

Edit `viewer/src/pages/dashboard/EnhancedDashboard.tsx`:

```tsx
// Add import
import WorkflowStatusWidget from '../../components/dashboard/WorkflowStatusWidget';

// Add to your grid (find a good spot)
<Grid item xs={12} lg={8}>
  <WorkflowStatusWidget />
</Grid>
```

### Step 3: Add Navigation to Worklist (1 minute)

Edit `viewer/src/pages/worklist/EnhancedWorklistPage.tsx`:

```tsx
// Add imports at top
import WorkflowNavigation from '../../components/workflow/WorkflowNavigation';
import { useWorkflow } from '../../contexts/WorkflowContext';

// Inside component
const { setCurrentStudy } = useWorkflow();

// Add at the top of your return statement (after Box opening tag)
<WorkflowNavigation 
  currentPage="worklist"
  context={{ studyInstanceUID: selectedItem?.studyInstanceUID }}
/>

// When user clicks "View" button, update context:
const handleViewStudy = (item: WorklistItem) => {
  setCurrentStudy({
    studyInstanceUID: item.studyInstanceUID,
    patientName: item.study?.patientName || '',
    modality: item.study?.modality || '',
    studyDate: item.study?.studyDate || '',
  });
  navigate(`/viewer/${item.studyInstanceUID}`);
};
```

### Step 4: Add Navigation to Patients (1 minute)

Edit `viewer/src/pages/patients/PatientsPage.tsx`:

```tsx
// Add import
import WorkflowNavigation from '../../components/workflow/WorkflowNavigation';

// Add at the top of your return statement
<WorkflowNavigation currentPage="patients" />
```

### Step 5: Add Navigation to Follow-ups (30 seconds)

Edit `viewer/src/pages/followup/FollowUpPage.tsx`:

```tsx
// Add import
import WorkflowNavigation from '../../components/workflow/WorkflowNavigation';

// Add at the top of your return statement
<WorkflowNavigation currentPage="followups" />
```

### Step 6: Add Navigation to Reporting (30 seconds)

Edit `viewer/src/pages/ReportingPage.tsx`:

```tsx
// Add import
import WorkflowNavigation from '../components/workflow/WorkflowNavigation';

// Add at the top of your return statement (inside main Box)
<WorkflowNavigation currentPage="reporting" />
```

---

## 🎨 Optional Enhancements

### Add Quick Actions Floating Button

Add to any page where you want quick access:

```tsx
import QuickActions from '../../components/workflow/QuickActions';

// At the end of your component return
<QuickActions />
```

### Add API Methods for Stats

Edit `viewer/src/services/ApiService.ts` and add:

```typescript
// Worklist Stats
export const getWorklistStats = async () => {
  return api.get('/api/worklist/stats');
};

// Follow-up Stats  
export const getFollowUpStatistics = async () => {
  return api.get('/api/follow-ups/statistics');
};

// Upcoming Follow-ups
export const getUpcomingFollowUps = async (days: number = 7) => {
  return api.get(`/api/follow-ups/upcoming?days=${days}`);
};

// Overdue Follow-ups
export const getOverdueFollowUps = async () => {
  return api.get('/api/follow-ups/overdue');
};
```

---

## 🧪 Test Your Integration

### Test 1: Dashboard Widget
1. Go to `/dashboard`
2. You should see "Workflow Status" widget
3. Shows pending studies and follow-ups
4. Click "Open Worklist" button
5. Should navigate to worklist

### Test 2: Worklist Navigation
1. Go to `/worklist`
2. You should see purple "Next Steps" bar at top
3. Shows "View Study" and "Create Report" buttons
4. Click a study
5. Navigation suggestions update

### Test 3: Context Tracking
1. Open browser console
2. Go to `/worklist`
3. Click "View" on a study
4. Check console - should see workflow context updated
5. Go to `/reporting`
6. Study context should be available

### Test 4: Complete Flow
1. Start at `/patients`
2. Click "View Worklist" suggestion
3. Click "View" on a study
4. Click "Create Report" suggestion
5. Fill report
6. Click "Check Follow-ups" suggestion
7. Verify smooth navigation throughout

---

## 🎯 What Users Will See

### On Dashboard:
```
┌─────────────────────────────────────┐
│ Workflow Status          [On Track] │
├─────────────────────────────────────┤
│ Worklist          │ Follow-ups      │
│ • Pending: 5      │ • Total: 12     │
│ • In Progress: 2  │ • Overdue: 0    │
│ • STAT: 1         │ • Upcoming: 3   │
│ [Open Worklist]   │ [Manage]        │
└─────────────────────────────────────┘
```

### On Worklist:
```
┌─────────────────────────────────────┐
│ Next Steps                          │
│ Suggested workflow actions          │
│ [View Study] [Create Report]        │
└─────────────────────────────────────┘
```

### On Viewer:
```
┌─────────────────────────────────────┐
│ Next Steps                          │
│ Suggested workflow actions          │
│ [Create Report] [Back to Worklist]  │
└─────────────────────────────────────┘
```

---

## 📊 Expected Results

After implementation:

✅ **Seamless Navigation**: Users see next steps on every page  
✅ **Context Awareness**: System remembers patient/study info  
✅ **Dashboard Overview**: All urgent items visible  
✅ **Reduced Clicks**: Faster workflow completion  
✅ **Better UX**: Professional, guided experience  

---

## 🐛 Troubleshooting

### "WorkflowProvider not found"
- Make sure you added the import in App.tsx
- Check the file path is correct
- Restart dev server

### "Navigation not showing"
- Check component is imported correctly
- Verify it's inside the return statement
- Check browser console for errors

### "Context not updating"
- Make sure WorkflowProvider wraps your routes
- Check you're calling setCurrentStudy/setCurrentPatient
- Verify useWorkflow hook is used inside WorkflowProvider

### "Stats not loading"
- Check API endpoints are working
- Verify authentication token
- Check network tab in browser
- API methods might need to be added

---

## 📚 Next Steps

After basic integration:

1. **Read Full Guide**: `UNIFIED_WORKFLOW_GUIDE.md`
2. **Customize**: Adjust colors, positions, suggestions
3. **Add Features**: Notifications, breadcrumbs, etc.
4. **Test Thoroughly**: Try all workflows
5. **Train Users**: Share the user guide

---

## 🎓 User Training

Share this with your users:

**"Your New Workflow"**

1. **Start at Dashboard** - See what needs attention
2. **Check Worklist** - Review pending studies
3. **View Studies** - Click "View" to open images
4. **Create Reports** - Click "Create Report" when ready
5. **Manage Follow-ups** - System auto-creates when needed
6. **Follow Suggestions** - Purple bar shows next steps

**Key Features:**
- 🟣 Purple "Next Steps" bar guides you
- 🔴 Red badges = urgent items
- 🟡 Yellow badges = important items
- 🟢 Green badges = completed items

---

## ⏱️ Time Estimate

- **Basic Integration**: 5 minutes
- **Optional Features**: 10 minutes
- **Testing**: 5 minutes
- **Total**: ~20 minutes

---

## ✅ Completion Checklist

- [ ] WorkflowProvider added to App.tsx
- [ ] WorkflowStatusWidget added to dashboard
- [ ] WorkflowNavigation added to worklist
- [ ] WorkflowNavigation added to patients
- [ ] WorkflowNavigation added to follow-ups
- [ ] WorkflowNavigation added to reporting
- [ ] API methods added (optional)
- [ ] QuickActions added (optional)
- [ ] Tested dashboard widget
- [ ] Tested worklist navigation
- [ ] Tested complete flow
- [ ] Reviewed user guide

---

## 🎉 You're Done!

Your workflow is now fully integrated! Users can seamlessly navigate from patient registration through to follow-up management.

**Need Help?**
- Check `WORKFLOW_INTEGRATION_IMPLEMENTATION.md` for details
- Review `UNIFIED_WORKFLOW_GUIDE.md` for user instructions
- Check browser console for errors
- Verify all imports are correct

**Enjoy your connected workflow! 🚀**
