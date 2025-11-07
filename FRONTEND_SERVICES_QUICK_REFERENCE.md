# Frontend Services - Quick Reference Guide

## Import Services

```typescript
import { notificationService } from '@/services/notificationService'
import { signatureService } from '@/services/signatureService'
import { exportService } from '@/services/exportService'
import { sessionService } from '@/services/sessionService'
import { config } from '@/config/environment'
```

---

## Notification Service

### Get All Notifications
```typescript
const notifications = await notificationService.getNotifications()
```

### Get Single Notification
```typescript
const notification = await notificationService.getNotification(notificationId)
```

### Acknowledge Notification
```typescript
await notificationService.acknowledgeNotification(notificationId)
```

### Create Critical Notification
```typescript
const notification = await notificationService.createNotification({
  type: 'critical_finding',
  severity: 'critical',
  title: 'Critical Finding Detected',
  message: 'Urgent review required',
  patientId: 'P12345',
  studyId: 'S67890',
  findingDetails: {
    location: 'Chest',
    description: 'Pneumothorax detected',
    urgency: 'immediate'
  },
  recipients: [{ userId: 'U123', name: 'Dr. Smith', role: 'radiologist' }],
  channels: ['email', 'sms', 'in_app']
})
```

### Get Notification Settings
```typescript
const settings = await notificationService.getSettings()
```

### Update Notification Settings
```typescript
await notificationService.updateSettings({
  emailEnabled: true,
  smsEnabled: false,
  inAppEnabled: true,
  soundEnabled: true
})
```

---

## Signature Service

### Sign Report
```typescript
try {
  const signature = await signatureService.signReport(
    reportId,
    'author', // or 'reviewer' or 'approver'
    password
  )
  console.log('Report signed:', signature.id)
} catch (error) {
  console.error('Signing failed:', error.message)
}
```

### Verify Signature
```typescript
const verification = await signatureService.verifySignature(signatureId)
if (verification.valid) {
  console.log('Signature is valid')
} else {
  console.error('Signature invalid:', verification.errors)
}
```

### Revoke Signature
```typescript
await signatureService.revokeSignature(
  signatureId,
  'Report needs revision',
  password
)
```

### Get Audit Trail
```typescript
const auditEvents = await signatureService.getAuditTrail(reportId)
auditEvents.forEach(event => {
  console.log(`${event.action} by ${event.userName} at ${event.timestamp}`)
})
```

### Export Audit Trail
```typescript
const blob = await signatureService.exportAuditTrail(reportId, signatureId, 'pdf')
// Blob is automatically downloaded
```

---

## Export Service

### Initiate Export
```typescript
const session = await exportService.initiateExport(
  reportId,
  'pdf', // or 'dicom-sr', 'fhir', 'txt'
  {
    recipient: 'Dr. Smith',
    purpose: 'Patient consultation',
    includeImages: true,
    includeSignature: true
  }
)
```

### Poll Export Status with Progress
```typescript
try {
  const completedSession = await exportService.pollExportStatus(
    session.id,
    (progress, status) => {
      console.log(`Export ${status}: ${progress}%`)
      // Update UI progress bar
    },
    2000, // Poll every 2 seconds
    300000 // Timeout after 5 minutes
  )
  
  // Download when complete
  await exportService.downloadExport(completedSession.id)
} catch (error) {
  console.error('Export failed:', error.message)
}
```

### Manual Status Check
```typescript
const status = await exportService.getExportStatus(exportId)
console.log(`Status: ${status.status}, Progress: ${status.progress}%`)
```

### Cancel Export
```typescript
await exportService.cancelExport(exportId)
```

### Get Export History
```typescript
const history = await exportService.getExportHistory(reportId, userId, 10)
```

---

## Session Service

### Initialize Session Monitoring
```typescript
// Call once on app startup
sessionService.initializeSessionMonitoring()
```

### Get Session Status
```typescript
const status = await sessionService.getSessionStatus()
console.log(`Status: ${status.status}`)
console.log(`Expires in: ${status.expiresIn}ms`)
```

### Check Session State
```typescript
if (sessionService.isSessionExpiringSoon()) {
  // Show warning dialog
  console.warn('Session expiring soon!')
}

if (sessionService.isSessionExpired()) {
  // Force logout
  await sessionService.logout()
}
```

### Extend Session
```typescript
await sessionService.extendSession()
console.log('Session extended')
```

### Refresh Token
```typescript
try {
  const newToken = await sessionService.refreshToken()
  console.log('Token refreshed')
} catch (error) {
  console.error('Token refresh failed, logging out...')
  await sessionService.logout()
}
```

### Get All Sessions
```typescript
const sessions = await sessionService.getSessions()
sessions.forEach(session => {
  console.log(`Session ${session.id} from ${session.deviceInfo.ipAddress}`)
})
```

### Revoke Session
```typescript
await sessionService.revokeSession(sessionId)
```

### Logout
```typescript
await sessionService.logout()
```

---

## Configuration

### Access Configuration
```typescript
import { config } from '@/config/environment'

// Session settings
const timeout = config.sessionTimeout // 1800000 (30 minutes)
const warning = config.sessionWarningTime // 300000 (5 minutes)

// Notification settings
const soundEnabled = config.notificationSoundEnabled // true
const pollInterval = config.notificationPollInterval // 30000 (30 seconds)

// Export settings
const maxFileSize = config.exportMaxFileSize // 104857600 (100 MB)
const formats = config.exportSupportedFormats // ['pdf', 'dicom-sr', 'fhir', 'txt']

// Feature flags
if (config.enableCriticalNotifications) {
  // Enable notification features
}

if (config.enableFdaSignatures) {
  // Enable signature features
}
```

### Individual Imports
```typescript
import {
  sessionTimeout,
  notificationSoundEnabled,
  exportMaxFileSize,
  enableCriticalNotifications
} from '@/config/environment'
```

---

## Error Handling

All services throw errors that should be caught:

```typescript
try {
  await notificationService.acknowledgeNotification(id)
} catch (error) {
  if (error.message.includes('Failed to acknowledge')) {
    // Handle specific error
    toast.error('Could not acknowledge notification')
  } else {
    // Handle generic error
    toast.error('An error occurred')
  }
}
```

---

## React Hook Examples

### useNotifications Hook
```typescript
function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const data = await notificationService.getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const acknowledge = async (id: string) => {
    try {
      await notificationService.acknowledgeNotification(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, status: 'acknowledged' } : n)
      )
    } catch (error) {
      console.error('Failed to acknowledge:', error)
      throw error
    }
  }
  
  useEffect(() => {
    fetchNotifications()
  }, [])
  
  return { notifications, loading, acknowledge, refresh: fetchNotifications }
}
```

### useExport Hook
```typescript
function useExport(reportId: string) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  
  const exportReport = async (format: 'pdf' | 'dicom-sr' | 'fhir') => {
    setExporting(true)
    setProgress(0)
    
    try {
      const session = await exportService.initiateExport(reportId, format)
      
      await exportService.pollExportStatus(
        session.id,
        (prog) => setProgress(prog)
      )
      
      await exportService.downloadExport(session.id)
      toast.success('Export completed')
    } catch (error) {
      toast.error('Export failed: ' + error.message)
    } finally {
      setExporting(false)
      setProgress(0)
    }
  }
  
  return { exportReport, exporting, progress }
}
```

### useSession Hook
```typescript
function useSession() {
  const [status, setStatus] = useState<'active' | 'warning' | 'expired'>('active')
  const [timeRemaining, setTimeRemaining] = useState(0)
  
  useEffect(() => {
    sessionService.initializeSessionMonitoring()
    
    const interval = setInterval(async () => {
      const sessionStatus = await sessionService.getSessionStatus()
      setStatus(sessionStatus.status)
      setTimeRemaining(sessionStatus.expiresIn)
    }, 10000) // Check every 10 seconds
    
    return () => {
      clearInterval(interval)
      sessionService.stopSessionMonitoring()
    }
  }, [])
  
  const extendSession = async () => {
    await sessionService.extendSession()
    setStatus('active')
  }
  
  return { status, timeRemaining, extendSession }
}
```

---

## Component Examples

### Notification Bell
```typescript
function NotificationBell() {
  const { notifications, acknowledge } = useNotifications()
  const unreadCount = notifications.filter(n => n.status !== 'acknowledged').length
  
  return (
    <IconButton>
      <Badge badgeContent={unreadCount} color="error">
        <NotificationsIcon />
      </Badge>
    </IconButton>
  )
}
```

### Export Button
```typescript
function ExportButton({ reportId }: { reportId: string }) {
  const { exportReport, exporting, progress } = useExport(reportId)
  
  return (
    <Button
      onClick={() => exportReport('pdf')}
      disabled={exporting}
    >
      {exporting ? `Exporting... ${progress}%` : 'Export PDF'}
    </Button>
  )
}
```

### Session Timeout Warning
```typescript
function SessionTimeoutWarning() {
  const { status, timeRemaining, extendSession } = useSession()
  
  if (status !== 'warning') return null
  
  const minutes = Math.floor(timeRemaining / 60000)
  const seconds = Math.floor((timeRemaining % 60000) / 1000)
  
  return (
    <Dialog open>
      <DialogTitle>Session Expiring Soon</DialogTitle>
      <DialogContent>
        Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')}
      </DialogContent>
      <DialogActions>
        <Button onClick={extendSession}>Stay Logged In</Button>
      </DialogActions>
    </Dialog>
  )
}
```

---

## Best Practices

### 1. Always Handle Errors
```typescript
try {
  await service.operation()
} catch (error) {
  // Show user-friendly error message
  toast.error(error.message)
  // Log for debugging
  console.error('Operation failed:', error)
}
```

### 2. Use Loading States
```typescript
const [loading, setLoading] = useState(false)

const handleAction = async () => {
  setLoading(true)
  try {
    await service.operation()
  } finally {
    setLoading(false)
  }
}
```

### 3. Validate Before Calling
```typescript
if (!reportId || !password) {
  toast.error('Please fill all required fields')
  return
}

await signatureService.signReport(reportId, 'author', password)
```

### 4. Clean Up Resources
```typescript
useEffect(() => {
  sessionService.initializeSessionMonitoring()
  
  return () => {
    sessionService.stopSessionMonitoring()
  }
}, [])
```

### 5. Use Configuration
```typescript
import { config } from '@/config/environment'

// Don't hardcode values
const timeout = config.sessionTimeout

// Use feature flags
if (config.enableCriticalNotifications) {
  // Enable feature
}
```

---

## Troubleshooting

### Service Returns Empty Array
- Check backend API is running
- Verify authentication token is valid
- Check network tab for API errors

### Retry Logic Not Working
- Check console for retry attempt logs
- Verify backend returns proper HTTP status codes
- Ensure network connectivity

### Session Expires Too Quickly
- Check `VITE_SESSION_TIMEOUT` in `.env`
- Verify activity tracking is initialized
- Check backend session configuration

### Export Timeout
- Increase `VITE_EXPORT_TIMEOUT` in `.env`
- Check backend export processing time
- Verify file size is within limits

---

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify environment configuration in `.env`
3. Review backend API responses in network tab
4. Refer to full implementation guide: `FRONTEND_SERVICES_IMPLEMENTATION.md`
