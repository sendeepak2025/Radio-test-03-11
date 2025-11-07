# 📊 Feature 5: PHI Audit Log Viewer

## Location: New Admin Page

### Step 1: Create Audit Log Page
**New File**: `viewer/src/pages/admin/AuditLogPage.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Grid,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import { Download as DownloadIcon } from '@mui/icons-material'

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().subtract(7, 'day'))
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs())
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  
  useEffect(() => {
    fetchAuditLogs()
  }, [])
  
  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      if (actionFilter) params.append('action', actionFilter)
      if (userFilter) params.append('userId', userFilter)
      
      const response = await fetch(
        `/api/signatures/audit/search?${params.toString()}`,
        { credentials: 'include' }
      )
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data.entries)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const exportLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      
      const response = await fetch(
        `/api/signatures/audit/report?${params.toString()}`,
        { credentials: 'include' }
      )
      const data = await response.json()
      
      // Convert to CSV
      const csv = convertToCSV(data.data)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${dayjs().format('YYYY-MM-DD')}.csv`
      a.click()
    } catch (error) {
      console.error('Error exporting logs:', error)
    }
  }
  
  const convertToCSV = (data: any) => {
    // Simple CSV conversion
    const headers = ['Timestamp', 'Action', 'User', 'IP Address', 'Result']
    const rows = data.map((log: any) => [
      log.timestamp,
      log.action,
      log.userName,
      log.ipAddress,
      log.result
    ])
    
    return [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ].join('\n')
  }
  
  const getActionColor = (action: string) => {
    const colors: Record<string, any> = {
      sign: 'success',
      verify: 'info',
      revoke: 'error',
      view: 'default'
    }
    return colors[action] || 'default'
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        PHI Audit Logs
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    label="Action"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="sign">Sign</MenuItem>
                    <MenuItem value="verify">Verify</MenuItem>
                    <MenuItem value="revoke">Revoke</MenuItem>
                    <MenuItem value="view">View</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  label="User ID"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button 
                    variant="contained" 
                    onClick={fetchAuditLogs}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Search'}
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<DownloadIcon />}
                    onClick={exportLogs}
                  >
                    Export CSV
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Audit Log Entries ({logs.length})
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.action} 
                          size="small"
                          color={getActionColor(log.action)}
                        />
                      </TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.result} 
                          size="small"
                          color={log.result === 'success' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        {log.details && JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
```

### Step 2: Add Route
**File**: `viewer/src/App.tsx`

```typescript
// Add import
import { AuditLogPage } from './pages/admin/AuditLogPage'

// Add route in your Routes section:
<Route
  path="/admin/audit-logs"
  element={
    <SimpleProtectedRoute>
      <MainLayout>
        <AuditLogPage />
      </MainLayout>
    </SimpleProtectedRoute>
  }
/>
```

### Step 3: Add to Sidebar Menu
**File**: `viewer/src/components/layout/MainLayout.tsx`

```typescript
// Find the Administration section in menuItems and add:
{
  title: 'Administration',
  items: [
    // ... existing items
    { text: 'Audit Logs', icon: <AssessmentIcon />, path: '/admin/audit-logs' },
  ]
}
```

### Visual Location:
```
┌─────────────────────────────────────────────────────────┐
│ Sidebar Menu                                            │
├─────────────────────────────────────────────────────────┤
│ Administration                                          │
│ ├─ User Management                                      │
│ ├─ Settings                                             │
│ └─ Audit Logs  ⬅️ ADD HERE                             │
│                                                         │
└─────────────────────────────────────────────────────────┘

When clicked, opens:

┌─────────────────────────────────────────────────────────┐
│ PHI Audit Logs                                          │
├─────────────────────────────────────────────────────────┤
│ Filters:                                                │
│ [Start Date] [End Date] [Action] [User ID]             │
│ [Search] [Export CSV]                                   │
│                                                         │
│ Audit Log Entries (150):                               │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Time      | Action | User    | IP      | Result│   │
│ ├─────────────────────────────────────────────────┤   │
│ │ 10:30 AM  | Sign   | Dr.Smith| 192...  | ✅    │   │
│ │ 10:25 AM  | Verify | Admin   | 192...  | ✅    │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Required Package:
```bash
npm install @mui/x-date-pickers dayjs
```
