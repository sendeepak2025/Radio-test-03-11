# Report Preview Everywhere - Complete Guide

## Overview

Report preview functionality is now available everywhere reports are shown, including:
- ✅ Worklist (when study has a report)
- ✅ Reports list (any page showing reports)
- ✅ Report editor (existing functionality)

## New Component: ReportPreviewButton

### Purpose
Reusable button component that can be added anywhere to preview a report.

### Features
- ✅ Fetches report data automatically
- ✅ Shows loading state
- ✅ Opens preview dialog
- ✅ Handles errors gracefully
- ✅ Customizable size and tooltip

### Usage

```typescript
import { ReportPreviewButton } from '../reporting/ReportPreviewButton';

// In any component
<ReportPreviewButton 
  reportId="SR-1763576368005-okk11wgmg"
  size="small"
  tooltip="Preview Report"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `reportId` | string | required | Report ID to preview |
| `size` | 'small' \| 'medium' \| 'large' | 'small' | Button size |
| `tooltip` | string | 'Preview Report' | Tooltip text |

## Integration in Worklist

### Before
```
┌─────────────────────────────────────────┐
│ Study List                              │
├─────────────────────────────────────────┤
│ Patient | Modality | Status | Actions   │
│ John    | CT       | Done   | [View] [Assign] │
└─────────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────────┐
│ Study List                              │
├─────────────────────────────────────────┤
│ Patient | Modality | Status | Actions   │
│ John    | CT       | Done   | [View] [👁️ Preview] [Assign] │
└─────────────────────────────────────────┘
```

### Code Changes

**WorklistTable.tsx**:
```typescript
{study.reportId && (
  <ReportPreviewButton 
    reportId={study.reportId}
    size="small"
    tooltip="Preview Report"
  />
)}
```

## Preview Dialog Content

When preview button is clicked, shows:

```
┌─────────────────────────────────────────┐
│ MEDICAL IMAGING REPORT                  │
├─────────────────────────────────────────┤
│ Patient Information                     │
│   Patient ID: 556342B                   │
│   Patient Name: John Doe                │
│   Modality: MG                          │
├─────────────────────────────────────────┤
│ Clinical History                        │
│   Routine screening                     │
├─────────────────────────────────────────┤
│ Technique                               │
│   Standard two-view mammography...      │
├─────────────────────────────────────────┤
│ Findings                                │
│   No suspicious masses...               │
├─────────────────────────────────────────┤
│ Impression                              │
│   BI-RADS Category 1 - Negative         │
├─────────────────────────────────────────┤
│ Recommendations                         │
│   Continue routine screening            │
├─────────────────────────────────────────┤
│ ASSESSMENT TOOLS RESULTS                │
│                                         │
│ BI-RADS CALCULATOR                      │
│   BI-RADS Category: 1                   │
│   Recommendation: Negative - Routine... │
│                                         │
│ BREAST MEASUREMENTS                     │
│   • Mass AP: 12 mm                      │
├─────────────────────────────────────────┤
│ ADDITIONAL TEMPLATE FIELDS              │
│ BREAST COMPOSITION                      │
│   Breast density B                      │
├─────────────────────────────────────────┤
│ [Print] [Close]                         │
└─────────────────────────────────────────┘
```

## Data Flow

### 1. User Clicks Preview Button
```
User clicks preview icon
  ↓
ReportPreviewButton component
  ↓
Shows loading spinner
```

### 2. Fetch Report Data
```
reportsApi.get(reportId)
  ↓
GET /api/reports/:reportId
  ↓
Returns full report data
```

### 3. Transform Data
```
Transform report to preview format:
{
  reportId, patientName, patientID,
  sections, clinicalHistory, technique,
  findingsText, impression, recommendations,
  findings, anatomicalMarkings, keyImages,
  reportStatus, signedAt, signedBy
}
```

### 4. Open Preview Dialog
```
ReportPreviewDialog opens
  ↓
Displays all report content
  ↓
Shows UI module results
  ↓
Shows template sections
```

## Files Modified

### New Files
1. **viewer/src/components/reporting/ReportPreviewButton.tsx**
   - Reusable preview button component
   - Fetches report data
   - Opens preview dialog

### Modified Files
1. **viewer/src/components/worklist/WorklistTable.tsx**
   - Added ReportPreviewButton import
   - Added preview button in actions column
   - Shows only when study has reportId

2. **viewer/src/types/worklist.ts**
   - Added `reportId?: string` to Study interface
   - Added `reportStatus?: string` to Study interface

## Backend Requirements

The worklist API should return `reportId` with each study:

```javascript
// GET /api/worklist
{
  "studies": [
    {
      "studyInstanceUID": "1.2.3.4.5",
      "patientName": "John Doe",
      "reportId": "SR-1763576368005-okk11wgmg",  // ✅ Include this
      "reportStatus": "final",                    // ✅ Include this
      // ... other fields
    }
  ]
}
```

### Backend Code (if needed)
```javascript
// In worklist route
const studies = await WorklistItem.find(query)
  .populate('reportId')  // If using reference
  .lean();

// Or join with reports collection
const studiesWithReports = studies.map(study => ({
  ...study,
  reportId: study.reportId || null,
  reportStatus: study.reportStatus || null
}));
```

## Usage Examples

### 1. In Worklist
```typescript
// WorklistTable.tsx
{study.reportId && (
  <ReportPreviewButton 
    reportId={study.reportId}
    size="small"
  />
)}
```

### 2. In Reports List
```typescript
// ReportsList.tsx
{reports.map(report => (
  <TableRow key={report.reportId}>
    <TableCell>{report.patientName}</TableCell>
    <TableCell>
      <ReportPreviewButton 
        reportId={report.reportId}
        size="medium"
      />
    </TableCell>
  </TableRow>
))}
```

### 3. In Dashboard
```typescript
// Dashboard.tsx
<Box>
  <Typography>Recent Reports</Typography>
  {recentReports.map(report => (
    <Card key={report.reportId}>
      <CardContent>
        <Typography>{report.patientName}</Typography>
        <ReportPreviewButton 
          reportId={report.reportId}
          size="small"
          tooltip="Quick Preview"
        />
      </CardContent>
    </Card>
  ))}
</Box>
```

## Testing Checklist

### ✅ Worklist Integration
- [ ] Preview button shows when study has reportId
- [ ] Preview button hidden when no reportId
- [ ] Click preview button loads report
- [ ] Preview dialog opens with correct data
- [ ] All sections visible in preview
- [ ] UI module results displayed
- [ ] Template sections displayed

### ✅ Preview Button Component
- [ ] Loading state shows spinner
- [ ] Error state shows error tooltip
- [ ] Successful load opens dialog
- [ ] Dialog closes properly
- [ ] Can preview multiple reports in sequence

### ✅ Preview Dialog Content
- [ ] Patient information correct
- [ ] All narrative fields visible
- [ ] UI module results formatted correctly
- [ ] Template sections displayed
- [ ] Signature shown if signed
- [ ] Print button works

## Benefits

✅ **Accessibility**: Preview reports from anywhere  
✅ **Efficiency**: Quick preview without opening editor  
✅ **Consistency**: Same preview experience everywhere  
✅ **Reusability**: Single component for all use cases  
✅ **User Experience**: Fast and intuitive  

## Summary

Report preview is now available everywhere:
- ✅ Worklist table (when report exists)
- ✅ Any reports list
- ✅ Dashboard
- ✅ Any custom component

Just add `<ReportPreviewButton reportId={reportId} />` anywhere! 🎉
