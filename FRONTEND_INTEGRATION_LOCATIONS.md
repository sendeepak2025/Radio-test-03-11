# 📍 Frontend Integration Locations - Exact Instructions

## Overview
This guide shows you EXACTLY where to add each feature in your frontend.

---

## 🔐 Feature 1: FDA Digital Signatures

### Location: Reporting Page
**File**: `viewer/src/pages/ReportingPage.tsx` OR `viewer/src/pages/reporting/ReportingPage.tsx`

### Step-by-Step Instructions:

#### Step 1: Add Imports (Top of file)
```typescript
// Add these imports after your existing imports
import { SignatureButton } from '../components/signatures/SignatureButton'
import { SignatureStatus } from '../components/signatures/SignatureStatus'
```

#### Step 2: Find the Report Display Section
Look for where you display the report content. It might look like:
```typescript
<Paper>
  <Typography variant="h5">Report</Typography>
  {/* Report content here */}
</Paper>
```

#### Step 3: Add Signature Section AFTER Report Content
```typescript
{/* Your existing report display */}
<Paper sx={{ p: 3, mb: 2 }}>
  <Typography variant="h5">Report</Typography>
  {/* Your report content */}
</Paper>

{/* ADD THIS NEW SECTION */}
<Paper sx={{ p: 3, mb: 2 }}>
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
    <Typography variant="h6">Digital Signatures</Typography>
    <SignatureButton 
      reportId={currentReport?._id}
      onSigned={() => {
        alert('Report signed successfully!')
        // Reload report if needed
      }}
    />
  </Box>
  
  <Divider sx={{ my: 2 }} />
  
  <SignatureStatus reportId={currentReport?._id} />
</Paper>
```

### Visual Location:
```
┌─────────────────────────────────────┐
│ Report Viewer Page                  │
├─────────────────────────────────────┤
│                                     │
│ [Report Header]                     │
│                                     │
│ Report Content:                     │
│ - Findings                          │
│ - Impression                        │
│ - etc.                              │
│                                     │
├─────────────────────────────────────┤
│ ⬇️ ADD SIGNATURE SECTION HERE ⬇️    │
├─────────────────────────────────────┤
│ Digital Signatures    [Sign Report] │
│ ─────────────────────────────────── │
│ ✅ Dr. Smith - Author - Valid       │
│    Signed: 2024-01-15 10:30 AM     │
└─────────────────────────────────────┘
```

---

## 🔒 Feature 2: Multi-Factor Authentication (MFA)

### Location: Settings Page
**File**: `viewer/src/pages/settings/SettingsPage.tsx`

### Step 1: Create MFA Component
**New File**: `viewer/src/components/settings/MFASettings.tsx`


```typescript
import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress
} from '@mui/material'
import QRCode from 'qrcode.react'

export const MFASettings: React.FC = () => {
  const [mfaStatus, setMfaStatus] = useState<any>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchMFAStatus()
  }, [])
  
  const fetchMFAStatus = async () => {
    try {
      const response = await fetch('/api/mfa/status', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setMfaStatus(data.data)
      }
    } catch (err: any) {
      console.error('Error fetching MFA status:', err)
    }
  }
  
  const setupMFA = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/mfa/totp/setup', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setQrCode(data.data.qrCode)
      } else {
        setError(data.message)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const verifySetup = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/mfa/totp/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: verificationCode })
      })
      const data = await response.json()
      if (data.success) {
        alert('MFA enabled successfully!')
        fetchMFAStatus()
        setQrCode(null)
        setVerificationCode('')
      } else {
        setError(data.message)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Multi-Factor Authentication
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Add an extra layer of security to your account
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!mfaStatus?.enabled && !qrCode && (
          <Button 
            variant="contained" 
            onClick={setupMFA}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enable MFA'}
          </Button>
        )}
        
        {qrCode && (
          <Box>
            <Typography variant="body2" gutterBottom>
              1. Scan this QR code with Google Authenticator or similar app:
            </Typography>
            <Box display="flex" justifyContent="center" my={2}>
              <QRCode value={qrCode} size={200} />
            </Box>
            
            <Typography variant="body2" gutterBottom>
              2. Enter the 6-digit code from your app:
            </Typography>
            <TextField 
              label="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              fullWidth
              sx={{ mt: 1, mb: 2 }}
              placeholder="000000"
            />
            <Button 
              variant="contained" 
              onClick={verifySetup}
              disabled={loading || verificationCode.length !== 6}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Verify & Enable'}
            </Button>
          </Box>
        )}
        
        {mfaStatus?.enabled && (
          <Alert severity="success">
            ✅ MFA is enabled and active
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
```

### Step 2: Install Required Package
```bash
npm install qrcode.react
npm install --save-dev @types/qrcode.react
```

### Step 3: Add to Settings Page
**File**: `viewer/src/pages/settings/SettingsPage.tsx`

```typescript
// Add import
import { MFASettings } from '../../components/settings/MFASettings'

// Find your settings sections and add:
<Grid container spacing={3}>
  {/* Your existing settings sections */}
  
  {/* ADD THIS NEW SECTION */}
  <Grid item xs={12} md={6}>
    <MFASettings />
  </Grid>
</Grid>
```

### Visual Location:
```
┌─────────────────────────────────────┐
│ Settings Page                       │
├─────────────────────────────────────┤
│                                     │
│ [Profile Settings]                  │
│ [Password Settings]                 │
│                                     │
│ ⬇️ ADD MFA SECTION HERE ⬇️          │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Multi-Factor Authentication │   │
│ │                             │   │
│ │ [Enable MFA] Button         │   │
│ │                             │   │
│ │ OR                          │   │
│ │                             │   │
│ │ [QR Code Display]           │   │
│ │ [Verification Input]        │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 📤 Feature 3: Data Export Buttons

### Location 1: Patient Page
**File**: `viewer/src/pages/patients/PatientsPage.tsx`

### Step 1: Create Export Component
**New File**: `viewer/src/components/export/ExportButton.tsx`


```typescript
import React, { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Download as DownloadIcon,
  FolderZip as ZipIcon,
  Code as JsonIcon
} from '@mui/icons-material'

interface ExportButtonProps {
  type: 'patient' | 'study'
  id: string
  label?: string
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  id,
  label = 'Export'
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [exporting, setExporting] = useState(false)
  
  const handleExport = async (format: 'zip' | 'json') => {
    setExporting(true)
    setAnchorEl(null)
    
    try {
      const endpoint = type === 'patient' 
        ? `/api/export/patient/${id}`
        : `/api/export/study/${id}`
      
      const response = await fetch(
        `${endpoint}?format=${format}&includeImages=true`,
        { credentials: 'include' }
      )
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      alert('Export completed successfully!')
    } catch (error: any) {
      alert(`Export failed: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }
  
  return (
    <>
      <Button 
        startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={exporting}
        variant="outlined"
        size="small"
      >
        {label}
      </Button>
      
      <Menu 
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleExport('zip')}>
          <ListItemIcon>
            <ZipIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>ZIP Archive (with DICOM)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('json')}>
          <ListItemIcon>
            <JsonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>JSON Data Only</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
```

### Step 2: Add to Patient Page
**File**: `viewer/src/pages/patients/PatientsPage.tsx`

```typescript
// Add import
import { ExportButton } from '../../components/export/ExportButton'

// Find where you display patient actions (usually in a table row or card)
// Add the export button:

<TableRow>
  <TableCell>{patient.name}</TableCell>
  <TableCell>{patient.patientID}</TableCell>
  <TableCell>
    {/* Your existing action buttons */}
    <Button onClick={() => viewPatient(patient)}>View</Button>
    
    {/* ADD THIS */}
    <ExportButton 
      type="patient" 
      id={patient.patientID}
      label="Export"
    />
  </TableCell>
</TableRow>
```

### Visual Location:
```
┌─────────────────────────────────────────────────────────┐
│ Patients Page                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Patient List:                                           │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Name      | ID      | DOB      | Actions        │   │
│ ├─────────────────────────────────────────────────┤   │
│ │ John Doe  | P001    | 1980-01  | [View] [Export]│   │
│ │                                    ⬆️ ADD HERE   │   │
│ │ Jane Smith| P002    | 1975-05  | [View] [Export]│   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ When clicked: [ZIP Archive] [JSON Data]                │
└─────────────────────────────────────────────────────────┘
```

### Location 2: Study/Worklist Page
**File**: `viewer/src/pages/worklist/EnhancedWorklistPage.tsx`

```typescript
// Add import
import { ExportButton } from '../../components/export/ExportButton'

// Find study actions and add:
<ExportButton 
  type="study" 
  id={study.studyInstanceUID}
  label="Export Study"
/>
```

---

## 📄 Feature 4: Report Export Menu

### Location: Reporting Page (Same as Signatures)
**File**: `viewer/src/pages/ReportingPage.tsx`

### Step 1: Create Report Export Component
**New File**: `viewer/src/components/reporting/ReportExportMenu.tsx`


```typescript
import React, { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Typography
} from '@mui/material'
import {
  Download as DownloadIcon,
  Description as DicomIcon,
  DataObject as FhirIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material'

interface ReportExportMenuProps {
  reportId: string
}

export const ReportExportMenu: React.FC<ReportExportMenuProps> = ({ reportId }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  
  const handleExport = async (format: 'dicom-sr' | 'fhir' | 'pdf') => {
    setAnchorEl(null)
    setExporting(true)
    setExportDialogOpen(true)
    setExportProgress(0)
    
    try {
      // Initiate export
      const response = await fetch(`/api/reports/${reportId}/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          includeImages: format === 'pdf',
          pdfA: format === 'pdf'
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      const exportId = data.exportId
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(
          `/api/reports/export/status/${exportId}`,
          { credentials: 'include' }
        )
        const statusData = await statusResponse.json()
        
        if (statusData.success) {
          setExportProgress(statusData.export.progress || 0)
          
          if (statusData.export.status === 'completed') {
            clearInterval(pollInterval)
            
            // Download file
            const downloadResponse = await fetch(
              `/api/reports/export/download/${exportId}`,
              { credentials: 'include' }
            )
            
            const blob = await downloadResponse.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `report-${reportId}.${format === 'dicom-sr' ? 'dcm' : format === 'fhir' ? 'json' : 'pdf'}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
            
            setExporting(false)
            setExportDialogOpen(false)
            alert('Export completed successfully!')
          } else if (statusData.export.status === 'failed') {
            clearInterval(pollInterval)
            throw new Error(statusData.export.error || 'Export failed')
          }
        }
      }, 1000)
      
    } catch (error: any) {
      setExporting(false)
      setExportDialogOpen(false)
      alert(`Export failed: ${error.message}`)
    }
  }
  
  return (
    <>
      <Button 
        startIcon={<DownloadIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={exporting}
        variant="outlined"
      >
        Export Report
      </Button>
      
      <Menu 
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleExport('dicom-sr')}>
          <ListItemIcon>
            <DicomIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>DICOM Structured Report</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('fhir')}>
          <ListItemIcon>
            <FhirIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>FHIR DiagnosticReport</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <PdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>PDF Document</ListItemText>
        </MenuItem>
      </Menu>
      
      <Dialog open={exportDialogOpen}>
        <DialogTitle>Exporting Report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Please wait while we prepare your export...
          </Typography>
          <LinearProgress variant="determinate" value={exportProgress} />
          <Typography variant="caption" color="text.secondary">
            {exportProgress}% complete
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Step 2: Add to Reporting Page
**File**: `viewer/src/pages/ReportingPage.tsx`

```typescript
// Add import
import { ReportExportMenu } from '../components/reporting/ReportExportMenu'

// Add next to signature button in report actions:
<Box display="flex" gap={2}>
  <SignatureButton reportId={reportId} onSigned={handleSigned} />
  
  {/* ADD THIS */}
  <ReportExportMenu reportId={reportId} />
</Box>
```

### Visual Location:
```
┌─────────────────────────────────────────────────────────┐
│ Report Viewer                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Report Content...                                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Actions:                                                │
│ [Sign Report] [Export Report] ⬅️ ADD HERE              │
│                                                         │
│ When clicked:                                           │
│ ┌─────────────────────────┐                           │
│ │ • DICOM Structured Report│                           │
│ │ • FHIR DiagnosticReport │                           │
│ │ • PDF Document          │                           │
│ └─────────────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Feature 5: PHI Audit Log Viewer

### Location: New Admin Page
**New File**: `viewer/src/pages/admin/AuditLogPage.tsx`
